import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, doc, setDoc, getDoc, deleteDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { syncItemsToKitchenInventory, calculateItemTotal, isKitchenRelatedCategory } from '../utils/inventorySync';

const BASE = { maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 40 };
const cyan = '#0891b2';
const DEFAULT_IMG = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=260&fit=crop';

const MODULES = [
  { id: 'user-inventory',    label: 'User\nInventory',    icon: 'groups',       gradient: 'linear-gradient(135deg,#0ea5e9,#0891b2)' },
  { id: 'kitchen-inventory', label: 'Kitchen\nInventory', icon: 'kitchen',      gradient: 'linear-gradient(135deg,#6366f1,#4f46e5)' },
  { id: 'pg-inventory',      label: 'PG\nInventory',      icon: 'apartment',    gradient: 'linear-gradient(135deg,#8b5cf6,#7c3aed)' },
  { id: 'room-inventory',    label: 'Room\nInventory',    icon: 'meeting_room', gradient: 'linear-gradient(135deg,#10b981,#059669)' },
  { id: 'staff-inventory',   label: 'Staff\nInventory',   icon: 'badge',        gradient: 'linear-gradient(135deg,#f59e0b,#d97706)' },
];

function Header({ title, onBack, action }) {
  return (
    <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 , paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))'}}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: cyan, padding: 0 }}>
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <p style={{ fontWeight: 700, fontSize: 18, color: cyan, margin: 0 }}>{title}</p>
      </div>
      {action && action}
    </div>
  );
}

function SaveBtn({ onClick, loading }) {
  return (
    <button onClick={onClick} disabled={loading} style={{ background: '#ecfeff', border: 'none', borderRadius: 8, padding: '6px 14px', color: cyan, fontWeight: 700, fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer' }}>
      {loading ? 'Saving...' : 'Save'}
    </button>
  );
}

function SearchBar({ value, onChange, placeholder }) {
  return (
    <div style={{ position: 'relative', marginBottom: 16 }}>
      <span className="material-symbols-outlined" style={{ position: 'absolute', left: 14, top: 12, color: '#94a3b8', fontSize: 20 }}>search</span>
      <input value={value} onChange={onChange} placeholder={placeholder}
        style={{ width: '100%', padding: '12px 14px 12px 42px', borderRadius: 14, border: '1px solid #e2e8f0', fontSize: 15, outline: 'none', boxSizing: 'border-box', background: 'white' }} />
    </div>
  );
}

function Fab({ onClick }) {
  return (
    <button onClick={onClick} style={{ position: 'fixed', bottom: 30, right: 'calc(50% - 220px)', width: 56, height: 56, borderRadius: 28, background: cyan, color: 'white', border: 'none', boxShadow: '0 4px 12px rgba(8,145,178,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, '@media (max-width: 480px)': { right: 20 } }}>
      <span className="material-symbols-outlined" style={{ fontSize: 28 }}>add</span>
    </button>
  );
}

function ItemRow({ item, onQtyChange, onRemove, onRestore, readOnlyQty = false, onClick }) {
  const [showImg, setShowImg] = React.useState(false);
  return (
    <div style={{ borderBottom: '1px solid #f1f5f9', cursor: readOnlyQty ? 'pointer' : 'default', transition: 'background 0.15s' }}
      onClick={(e) => {
        if (readOnlyQty && onClick) {
          // If clicked on button or photo expander, ignore row click
          if (e.target.closest('button') || e.target.closest('.photo-expander')) return;
          onClick(item);
        }
      }}
      onMouseEnter={(e) => { if (readOnlyQty) e.currentTarget.style.background = '#f8fafc'; }}
      onMouseLeave={(e) => { if (readOnlyQty) e.currentTarget.style.background = 'transparent'; }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
          {item.conditionImage ? (
            <img
              src={item.conditionImage}
              alt="Condition"
              onClick={(e) => { e.stopPropagation(); setShowImg(s => !s); }}
              style={{ width: 42, height: 42, borderRadius: 12, objectFit: 'cover', border: `2px solid ${cyan}`, cursor: 'pointer', flexShrink: 0 }}
            />
          ) : (
            <div style={{ width: 42, height: 42, borderRadius: 12, background: item.isUsed ? '#fef3c7' : '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ color: item.isUsed ? '#b45309' : cyan, fontSize: 22 }}>
                {item.isUsed ? 'history_toggle_off' : (item.icon || 'inventory_2')}
              </span>
            </div>
          )}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <p style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.itemName} {item.unit ? <span style={{ fontSize: 12, fontWeight: 700, color: cyan }}>({item.unit})</span> : ''}
              </p>
              {item.isUsed && (
                <span style={{ fontSize: 10, fontWeight: 800, background: '#fef3c7', color: '#b45309', padding: '2px 6px', borderRadius: 6 }}>
                  USED
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 3 }}>
              {item.isUsed && item.usedAt ? (
                <span style={{ fontSize: 11, color: '#b45309', fontWeight: 600 }}>
                  🗂️ Moved to used: {new Date(item.usedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  {item.usedBy ? ` · ${item.usedBy}` : ''}
                </span>
              ) : item.lastPurchasedDate ? (
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  🕒 {new Date(item.lastPurchasedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  {item.lastUpdatedBy ? ` · ${item.lastUpdatedBy}` : ''}
                </span>
              ) : item.lastUpdatedBy ? (
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  Updated by: {item.lastUpdatedBy}
                </span>
              ) : (
                <span style={{ fontSize: 11, color: '#94a3b8' }}>Tap to view purchase details</span>
              )}
            </div>
            {item.conditionImage && (
              <p className="photo-expander" onClick={(e) => { e.stopPropagation(); setShowImg(s => !s); }} style={{ margin: '3px 0 0', fontSize: 11, color: cyan, fontWeight: 600, cursor: 'pointer' }}>
                {showImg ? 'Hide photo ▲' : 'View condition photo ▼'}
              </p>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {readOnlyQty ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ background: item.isUsed ? '#fef3c7' : '#ecfeff', border: `1px solid ${item.isUsed ? '#fde68a' : '#cffafe'}`, padding: '6px 12px', borderRadius: 10, textAlign: 'right', display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 16, fontWeight: 900, color: item.isUsed ? '#b45309' : cyan }}>{item.qty}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: item.isUsed ? '#92400e' : '#0e7490' }}>{item.unit || ''}</span>
              </div>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#94a3b8' }}>chevron_right</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: 8, overflow: 'hidden' }}>
              <button onClick={() => onQtyChange(item.qty - 1)} style={{ width: 32, height: 32, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 18, color: '#64748b' }}>-</button>
              <span style={{ width: 30, textAlign: 'center', fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{item.qty}</span>
              <button onClick={() => onQtyChange(item.qty + 1)} style={{ width: 32, height: 32, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 16, color: '#64748b' }}>+</button>
            </div>
          )}

          {onRestore && (
            <button
              title="Restore to Current inventory"
              onClick={(e) => { e.stopPropagation(); onRestore(); }}
              style={{ background: '#ecfeff', border: '1px solid #cffafe', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: cyan }}>settings_backup_restore</span>
            </button>
          )}

          {onRemove && (
            <button
              title={item.isUsed ? "Delete from archive" : "Move to Used inventory"}
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              style={{ background: '#fee2e2', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#ef4444' }}>delete</span>
            </button>
          )}
        </div>
      </div>
      {showImg && item.conditionImage && (
        <div style={{ padding: '0 16px 14px' }}>
          <img src={item.conditionImage} alt="Condition" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 12, border: '1px solid #e2e8f0' }} />
        </div>
      )}
    </div>
  );
}

function PersonCard({ person, isUser }) {
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', background: 'white', padding: 16, borderRadius: 16, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <img src={person.img || DEFAULT_IMG} alt={person.name} style={{ width: 70, height: 70, borderRadius: 35, objectFit: 'cover' }} />
      <div>
        <p style={{ fontWeight: 800, fontSize: 18, color: '#0f172a', margin: '0 0 4px' }}>{person.name}</p>
        <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{isUser ? `${person.room || 'No Room'} · ${person.bed || 'No Bed'}` : person.role}</p>
      </div>
    </div>
  );
}

function Loader() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
      <div style={{ width: 30, height: 30, border: `3px solid #e2e8f0`, borderTopColor: cyan, borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── ALLOCATION VIEWS (User, Staff, Room) ──────────────────────────
function AllocationView({ targetId, targetType, personData, title, onBack }) {
  const { user, activePgId } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    const fetchAllocations = async () => {
      try {
        const q = query(collection(db, 'inventory_allocations'), where('adminId', '==', user.uid), where('pgId', '==', activePgId), where('targetId', '==', targetId));
        const snap = await getDocs(q);
        setItems(snap.docs.map(d => ({ docId: d.id, ...d.data() })));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAllocations();
  }, [user, targetId]);

  const saveAllocations = async () => {
    setSaving(true);
    try {
      // For simplicity, delete old and write new
      const q = query(collection(db, 'inventory_allocations'), where('adminId', '==', user.uid), where('pgId', '==', activePgId), where('targetId', '==', targetId));
      const snap = await getDocs(q);
      const batch = snap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(batch);

      const adds = items.map(it => addDoc(collection(db, 'inventory_allocations'), {
        adminId: user.uid, pgId: activePgId, 
        targetId,
        targetType,
        itemName: it.itemName,
        qty: it.qty,
        icon: it.icon || 'inventory_2'
      }));
      await Promise.all(adds);
      alert('Allocations saved!');
    } catch (e) {
      console.error(e);
      alert('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const updateQty = (idx, val) => setItems(p => p.map((it, i) => i === idx ? { ...it, qty: Math.max(0, val) } : it));

  return (
    <div style={BASE}>
      <Header title={title} onBack={onBack} action={<SaveBtn onClick={saveAllocations} loading={saving} />} />
      <div style={{ padding: 16 }}>
        {personData && <PersonCard person={personData} isUser={targetType === 'tenant'} />}

        {loading ? <Loader /> : (
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            {items.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>No items allotted.</div>
            ) : (
              items.map((item, idx) => (
                <ItemRow key={idx} item={item} 
                  onQtyChange={val => updateQty(idx, val)}
                  onRemove={() => setItems(p => p.filter((_, i) => i !== idx))} />
              ))
            )}
          </div>
        )}

        <Fab onClick={() => {
          const name = window.prompt("Enter new item name:");
          if (name && name.trim()) {
            setItems(p => [...p, { itemName: name.trim(), qty: 1, icon: 'inventory_2' }]);
          }
        }} />
      </div>
    </div>
  );
}

// ─── DEDICATED ITEM DETAIL VIEW ────────────────────────────────────
function ItemDetailView({ item, onBack, onRestock, onRestore, onMoveToUsed, onPermanentDelete }) {
  if (!item) return null;
  const history = Array.isArray(item.purchaseHistory) ? item.purchaseHistory : [];
  const totalSpent = history.reduce((sum, h) => sum + (parseFloat(h.price) || 0), 0);
  const totalPurchasedQty = history.reduce((sum, h) => sum + (parseFloat(h.qty) || 0), 0);
  const avgRate = totalPurchasedQty > 0 ? (totalSpent / totalPurchasedQty) : 0;

  return (
    <div style={BASE}>
      <Header
        title={item.itemName}
        onBack={onBack}
        action={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {item.isUsed ? (
              <>
                <button
                  onClick={() => onRestore?.(item)}
                  style={{ background: '#ecfeff', border: `1px solid ${cyan}`, borderRadius: 8, padding: '6px 12px', color: cyan, fontWeight: 800, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>settings_backup_restore</span>
                  Restore
                </button>
                <button
                  onClick={() => onPermanentDelete?.(item)}
                  style={{ background: '#fee2e2', border: 'none', borderRadius: 8, padding: '6px 10px', color: '#ef4444', fontWeight: 800, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => onMoveToUsed?.(item)}
                style={{ background: '#fee2e2', border: 'none', borderRadius: 8, padding: '6px 12px', color: '#ef4444', fontWeight: 800, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                Move to Used
              </button>
            )}
          </div>
        }
      />

      <div style={{ padding: '16px 16px 80px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Used Status Banner if item is archived */}
        {item.isUsed && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, color: '#92400e' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#b45309' }}>history_toggle_off</span>
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.4 }}>
              <strong style={{ fontSize: 14 }}>Archived in Used Inventory</strong>
              <div style={{ color: '#78350f', marginTop: 2 }}>
                {item.usedAt ? `Moved to used on ${new Date(item.usedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Marked as completed stock.'}
                {item.usedBy ? ` by ${item.usedBy}` : ''}
              </div>
            </div>
          </div>
        )}

        {/* Hero Stock Banner */}
        <div style={{ background: item.isUsed ? 'linear-gradient(135deg, #b45309, #78350f)' : 'linear-gradient(135deg, #0891b2, #0e7490)', borderRadius: 20, padding: '20px 22px', color: 'white', boxShadow: '0 8px 24px rgba(8,145,178,0.15)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, opacity: 0.9 }}>
              {item.isUsed ? 'Recorded Used Quantity' : 'Current Available Stock'}
            </span>
            <span style={{ background: 'rgba(255,255,255,0.22)', padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 800, letterSpacing: 0.5 }}>
              {(item.unit || 'units').toUpperCase()}
            </span>
          </div>
          <p style={{ fontSize: 34, fontWeight: 900, margin: '0 0 6px', letterSpacing: -0.5 }}>
            {item.qty} <span style={{ fontSize: 18, fontWeight: 600, opacity: 0.9 }}>{item.unit || ''}</span>
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, opacity: 0.88 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>schedule</span>
            <span>
              {item.lastPurchasedDate ? `Last purchased ${new Date(item.lastPurchasedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Direct stock entry'}
              {item.lastUpdatedBy ? ` · ${item.lastUpdatedBy}` : ''}
            </span>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 16, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Spend</span>
            <p style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: '6px 0 0' }}>₹{Math.round(totalSpent).toLocaleString('en-IN')}</p>
          </div>
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 16, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Purchased Qty</span>
            <p style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: '6px 0 0' }}>{totalPurchasedQty || item.qty} {item.unit || ''}</p>
          </div>
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 16, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Refill Orders</span>
            <p style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: '6px 0 0' }}>{history.length || 1} logged</p>
          </div>
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 16, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Avg. Rate</span>
            <p style={{ fontSize: 20, fontWeight: 900, color: cyan, margin: '6px 0 0' }}>
              {avgRate > 0 ? `₹${Math.round(avgRate)}/${item.unit || 'unit'}` : 'N/A'}
            </p>
          </div>
        </div>

        {/* Item Specification Card */}
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 16, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>Item Details</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
              <span style={{ color: '#64748b', fontWeight: 600 }}>Item Name</span>
              <span style={{ color: '#0f172a', fontWeight: 800 }}>{item.itemName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
              <span style={{ color: '#64748b', fontWeight: 600 }}>Category</span>
              <span style={{ color: '#0f172a', fontWeight: 800, textTransform: 'capitalize' }}>{item.category || 'General'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
              <span style={{ color: '#64748b', fontWeight: 600 }}>Standard Unit</span>
              <span style={{ color: '#0f172a', fontWeight: 800 }}>{item.unit || 'N/A'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
              <span style={{ color: '#64748b', fontWeight: 600 }}>Last Vendor / Store</span>
              <span style={{ color: '#0f172a', fontWeight: 800 }}>{item.lastVendorName || 'Local Store / Vendor'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: '#64748b', fontWeight: 600 }}>Status</span>
              <span style={{ color: item.isUsed ? '#b45309' : '#16a34a', fontWeight: 800 }}>
                {item.isUsed ? 'Archived / Used' : 'Active In Stock'}
              </span>
            </div>
          </div>
        </div>

        {/* Purchase History Ledger */}
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 16, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <p style={{ fontWeight: 800, fontSize: 15, color: '#0f172a', margin: 0 }}>Purchase & Refill Ledger</p>
              <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>Complete audit trail of all restocks</p>
            </div>
            <span style={{ background: '#f1f5f9', color: '#475569', fontSize: 11, fontWeight: 800, padding: '4px 8px', borderRadius: 8 }}>
              {history.length} records
            </span>
          </div>

          {history.length === 0 ? (
            <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 14, padding: 24, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 36, color: '#94a3b8', display: 'block', margin: '0 auto 8px' }}>receipt_long</span>
              No individual refill entry recorded yet for this item.<br />
              <span style={{ fontSize: 11, color: '#94a3b8' }}>Future purchases logged via vendors or restock will appear here automatically!</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {history.map((h, i) => (
                <div key={h.id || i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div>
                      <p style={{ fontWeight: 800, fontSize: 15, color: '#0f172a', margin: 0 }}>
                        +{h.qty} {h.unit || item.unit || ''}
                        {h.rate ? <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginLeft: 6 }}>@ ₹{h.rate}/{h.unit || item.unit || 'unit'}</span> : null}
                      </p>
                      <p style={{ fontSize: 13, color: cyan, fontWeight: 800, margin: '2px 0 0' }}>
                        ₹{Math.round(h.price || (h.qty * (h.rate || 0))).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <span style={{ background: 'white', border: '1px solid #e2e8f0', color: '#475569', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6 }}>
                      {h.date ? new Date(h.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Logged'}
                    </span>
                  </div>

                  <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: 8, marginTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#64748b' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#94a3b8' }}>person</span>
                      {h.purchasedBy || 'Admin'}
                    </span>
                    {h.vendorName && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#94a3b8' }}>store</span>
                        {h.vendorName}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating Bottom Quick Action Bar */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', borderTop: '1px solid #e2e8f0', padding: '12px 20px', zIndex: 40 }}>
        <div style={{ maxWidth: 480, margin: '0 auto', display: 'flex', gap: 10 }}>
          {item.isUsed ? (
            <button
              onClick={() => onRestore?.(item)}
              style={{ flex: 1, padding: '14px', background: '#ecfeff', color: cyan, border: `1px solid ${cyan}`, borderRadius: 14, fontWeight: 800, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>settings_backup_restore</span>
              Restore to Current
            </button>
          ) : (
            <button
              onClick={() => onMoveToUsed?.(item)}
              style={{ padding: '14px 18px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: 14, fontWeight: 800, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
              Move to Used
            </button>
          )}
          <button
            onClick={() => onRestock?.(item)}
            style={{ flex: 2, padding: '14px', background: cyan, color: 'white', border: 'none', borderRadius: 14, fontWeight: 800, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 12px rgba(8,145,178,0.25)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>shopping_cart</span>
            Purchase / Restock
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PURCHASE / RESTOCK MODAL ──────────────────────────────────────
function PurchaseItemModal({ defaultCategory, defaultItemName = '', defaultUnit = 'kg', onClose, onSaved }) {
  const { user, activePgId } = useAuth();
  const [name, setName] = useState(defaultItemName);
  const [category, setCategory] = useState(defaultCategory || 'kitchen');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState(defaultUnit || 'kg');
  const [rate, setRate] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [purchasedBy, setPurchasedBy] = useState('Admin');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  const calculatedTotal = (parseFloat(qty) || 0) * (parseFloat(rate) || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return alert('Please enter item name');
    const parsedQty = parseFloat(qty);
    if (!parsedQty || parsedQty <= 0) return alert('Please enter a valid quantity');

    setSubmitting(true);
    try {
      const items = [{
        item: name.trim(),
        qty: parsedQty,
        unit: unit.trim().toLowerCase(),
        rate: parseFloat(rate) || 0,
        price: calculatedTotal
      }];

      await syncItemsToKitchenInventory(db, {
        adminId: user.uid,
        pgId: activePgId || 'primary',
        items,
        source: 'Direct Purchase Entry',
        actorName: purchasedBy || 'Admin',
        vendorName: vendorName.trim() || 'Vendor / Store',
        date,
        monthKey: date.slice(0, 7),
        category: category || 'kitchen'
      });

      onSaved?.();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to save purchase: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 110, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(3px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: 'white', width: '100%', maxWidth: 480, borderRadius: '24px 24px 0 0', maxHeight: '90vh', overflowY: 'auto', padding: '20px 20px 32px' }}>
        <div style={{ width: 44, height: 4, background: '#cbd5e1', borderRadius: 99, margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <p style={{ fontWeight: 800, fontSize: 18, color: '#0f172a', margin: 0 }}>Record Item Purchase</p>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#64748b' }}>close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Item Name *</label>
            <input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Milk, Rice, Potato, Floor Cleaner"
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Quantity *</label>
              <input required type="number" step="any" min="0.01" value={qty} onChange={e => setQty(e.target.value)} placeholder="e.g. 5"
                style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Unit *</label>
              <select value={unit} onChange={e => setUnit(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none', background: 'white', boxSizing: 'border-box' }}>
                <option value="kg">kg</option>
                <option value="g">grams (g)</option>
                <option value="litre">litre (L)</option>
                <option value="ml">ml</option>
                <option value="packet">packet / pack</option>
                <option value="piece">piece / pcs</option>
                <option value="box">box</option>
                <option value="cylinder">cylinder</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Rate per unit (₹)</label>
              <input type="number" step="any" min="0" value={rate} onChange={e => setRate(e.target.value)} placeholder="e.g. 60"
                style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Total Cost</label>
              <div style={{ padding: '12px 14px', borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: 14, fontWeight: 800, color: cyan }}>
                ₹{Math.round(calculatedTotal).toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Vendor / Store</label>
              <input value={vendorName} onChange={e => setVendorName(e.target.value)} placeholder="e.g. Sharma Kirana"
                style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Purchased By</label>
              <input value={purchasedBy} onChange={e => setPurchasedBy(e.target.value)} placeholder="e.g. Admin, Manager"
                style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Purchase Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <button type="submit" disabled={submitting}
            style={{ width: '100%', padding: '14px', background: cyan, color: 'white', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: submitting ? 'not-allowed' : 'pointer', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>done</span>
            {submitting ? 'Recording Purchase...' : 'Save & Update Inventory'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── MASTER INVENTORY VIEWS (PG, Kitchen) ──────────────────────────
function MasterInventoryView({ category, title, onBack }) {
  const { user, activePgId } = useAuth();
  const [items, setItems] = useState([]);
  const [vendorTxns, setVendorTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('current'); // 'current' | 'used'
  const [selectedMonth, setSelectedMonth] = useState('');
  const [detailItem, setDetailItem] = useState(null);
  const [purchaseModal, setPurchaseModal] = useState({ open: false, defaultItemName: '', defaultUnit: 'kg' });
  const [search, setSearch] = useState('');

  const currentMonthKey = new Date().toISOString().slice(0, 7); // e.g. "2026-10"

  // 1. Listen to pg_inventory_master & vendor_transactions
  useEffect(() => {
    if (!user?.uid) return;

    // Listen to inventory master
    const qInv = query(
      collection(db, 'pg_inventory_master'), 
      where('adminId', '==', user.uid), 
      where('category', '==', category)
    );
    const unsubInv = onSnapshot(qInv, (snap) => {
      let mapped = snap.docs.map(d => ({
        docId: d.id,
        itemName: d.data().name,
        qty: d.data().totalQty,
        unit: d.data().unit || '',
        icon: d.data().icon || (category === 'kitchen' ? 'kitchen' : 'inventory_2'),
        pgId: d.data().pgId,
        category: d.data().category || category,
        lastUpdatedBy: d.data().lastUpdatedBy,
        lastPurchasedDate: d.data().lastPurchasedDate || d.data().lastUpdated,
        lastVendorName: d.data().lastVendorName,
        monthKey: d.data().monthKey || (d.data().createdAt ? d.data().createdAt.slice(0, 7) : currentMonthKey),
        purchaseHistory: d.data().purchaseHistory || [],
        isUsed: d.data().isUsed === true,
        usedMonth: d.data().usedMonth || (d.data().usedAt ? d.data().usedAt.slice(0, 7) : null),
        usedAt: d.data().usedAt || null,
        usedBy: d.data().usedBy || null
      }));
      if (activePgId && activePgId !== 'all') {
        mapped = mapped.filter(d => !d.pgId || d.pgId === activePgId || d.pgId === 'primary');
      }
      setItems(mapped);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });

    // Listen to vendor_transactions to cross-reference any older or external purchases
    const qTxns = query(
      collection(db, 'vendor_transactions'),
      where('adminId', '==', user.uid)
    );
    const unsubTxns = onSnapshot(qTxns, (snap) => {
      const txns = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setVendorTxns(txns);
    });

    return () => {
      unsubInv();
      unsubTxns();
    };
  }, [user?.uid, category, activePgId]);

  // 2. Merge vendor_transactions into each item's purchase history if not already present
  const enrichedItems = React.useMemo(() => {
    return items.map(it => {
      const existingHistory = [...(it.purchaseHistory || [])];
      const itNameLower = (it.itemName || '').trim().toLowerCase();

      // Find any purchases from vendor_transactions that mention this item
      vendorTxns.forEach(tx => {
        if (!Array.isArray(tx.items)) return;
        const txDate = tx.date || tx.createdAt || '';
        const txMonthKey = typeof txDate === 'string' ? txDate.slice(0, 7) : '';

        tx.items.forEach(row => {
          const rowName = (row.item || row.name || row.itemName || '').trim().toLowerCase();
          if (rowName === itNameLower) {
            // Check if already in history
            const alreadyExists = existingHistory.some(h => 
              (h.date && h.date === txDate) || (h.id && h.id === tx.id)
            );
            if (!alreadyExists) {
              existingHistory.push({
                id: tx.id,
                date: txDate,
                monthKey: txMonthKey || currentMonthKey,
                qty: row.qty || row.quantity || 1,
                unit: row.unit || it.unit || 'kg',
                rate: row.rate || 0,
                price: row.price || ((row.qty || 1) * (row.rate || 0)),
                purchasedBy: tx.purchasedBy || tx.actorName || 'Admin',
                vendorName: tx.vendorName || tx.vendorStore || '',
                source: tx.source || 'Vendor Purchase',
                createdAt: tx.createdAt
              });
            }
          }
        });
      });

      // Sort history newest first
      existingHistory.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

      return {
        ...it,
        purchaseHistory: existingHistory
      };
    });
  }, [items, vendorTxns, currentMonthKey]);

  // 3. Derive months available in Used history (both past months and any month where items were moved to used)
  const usedMonthsList = React.useMemo(() => {
    const monthsSet = new Set();
    enrichedItems.forEach(it => {
      if (it.isUsed) {
        const uMonth = it.usedMonth || (it.usedAt ? it.usedAt.slice(0, 7) : it.monthKey) || currentMonthKey;
        if (uMonth) monthsSet.add(uMonth);
      }
      if (it.monthKey && it.monthKey < currentMonthKey) {
        monthsSet.add(it.monthKey);
      }
      (it.purchaseHistory || []).forEach(h => {
        if (h.monthKey && h.monthKey < currentMonthKey) {
          monthsSet.add(h.monthKey);
        }
      });
    });
    const sorted = Array.from(monthsSet).sort().reverse();
    return sorted;
  }, [enrichedItems, currentMonthKey]);

  // Set default selected used month
  useEffect(() => {
    if (!selectedMonth) {
      if (usedMonthsList.length > 0) {
        setSelectedMonth(usedMonthsList[0]);
      } else {
        setSelectedMonth(currentMonthKey);
      }
    }
  }, [usedMonthsList, selectedMonth, currentMonthKey]);

  // 4. Split into CURRENT vs USED
  // - CURRENT: Items with purchases / activity in current calendar month and NOT marked as used
  // - USED: Items marked as used or archived from past months
  const currentItems = React.useMemo(() => {
    return enrichedItems.filter(it => {
      if (it.isUsed) return false; // Moved to used
      const hasThisMonthPurchase = (it.purchaseHistory || []).some(h => (h.monthKey || '').slice(0, 7) === currentMonthKey);
      return hasThisMonthPurchase || it.monthKey === currentMonthKey || (!it.monthKey && (it.purchaseHistory || []).length === 0);
    });
  }, [enrichedItems, currentMonthKey]);

  const usedItemsForSelectedMonth = React.useMemo(() => {
    const list = [];
    enrichedItems.forEach(it => {
      const itemUsedMonth = it.usedMonth || (it.usedAt ? it.usedAt.slice(0, 7) : it.monthKey) || currentMonthKey;

      if (selectedMonth === 'all') {
        if (it.isUsed) {
          list.push({ ...it, isUsed: true });
        } else if (it.monthKey < currentMonthKey) {
          list.push({ ...it, isUsed: true });
        }
        return;
      }

      // 1. Explicitly moved to used in this selected month
      if (it.isUsed && itemUsedMonth === selectedMonth) {
        list.push({ ...it, isUsed: true });
        return;
      }

      // 2. Past month purchases archive for this selected month
      if (selectedMonth && selectedMonth < currentMonthKey) {
        const monthPurchases = (it.purchaseHistory || []).filter(h => (h.monthKey || '').slice(0, 7) === selectedMonth);
        if (monthPurchases.length > 0) {
          const monthQty = monthPurchases.reduce((s, p) => s + (parseFloat(p.qty) || 0), 0);
          list.push({
            ...it,
            qty: monthQty,
            isUsed: true,
            purchaseHistory: monthPurchases,
            lastPurchasedDate: monthPurchases[0]?.date || it.lastPurchasedDate
          });
        } else if (it.monthKey === selectedMonth && !it.isUsed) {
          list.push({
            ...it,
            isUsed: true
          });
        }
      }
    });
    return list;
  }, [enrichedItems, selectedMonth, currentMonthKey]);

  // Display items based on activeTab
  const displayedItems = activeTab === 'current' ? currentItems : usedItemsForSelectedMonth;
  const filteredItems = displayedItems.filter(it => 
    (it.itemName || '').toLowerCase().includes(search.toLowerCase())
  );

  // Month totals
  const currentMonthTotalSpend = currentItems.reduce((sum, it) => {
    const mPurchases = (it.purchaseHistory || []).filter(h => (h.monthKey || '').slice(0, 7) === currentMonthKey);
    return sum + mPurchases.reduce((s, p) => s + (parseFloat(p.price) || 0), 0);
  }, 0);

  const usedMonthTotalSpend = usedItemsForSelectedMonth.reduce((sum, it) => {
    return sum + (it.purchaseHistory || []).reduce((s, p) => s + (parseFloat(p.price) || 0), 0);
  }, 0);

  // When clicking delete: in Current tab, move to Used; in Used tab, prompt permanent removal
  const handleRemove = async (target) => {
    if (!target) return;
    if (activeTab === 'current' || !target.isUsed) {
      if (window.confirm(`Move "${target.itemName}" to Used inventory?`)) {
        if (target.docId) {
          try {
            await updateDoc(doc(db, 'pg_inventory_master', target.docId), {
              isUsed: true,
              usedMonth: currentMonthKey,
              usedAt: new Date().toISOString(),
              usedBy: user?.displayName || user?.email || 'Admin',
              lastUpdated: new Date().toISOString(),
              lastUpdatedBy: user?.displayName || user?.email || 'Admin'
            });
            if (detailItem && detailItem.docId === target.docId) {
              setDetailItem(prev => ({ ...prev, isUsed: true, usedMonth: currentMonthKey, usedAt: new Date().toISOString() }));
            }
          } catch (e) {
            console.error('Error moving item to used:', e);
            alert('Failed to move item to used: ' + e.message);
          }
        }
      }
    } else {
      if (window.confirm(`Permanently delete "${target.itemName}" from archive?`)) {
        if (target.docId) {
          try {
            await deleteDoc(doc(db, 'pg_inventory_master', target.docId));
            if (detailItem && detailItem.docId === target.docId) {
              setDetailItem(null);
            }
          } catch (e) {
            console.error('Error deleting inventory item:', e);
          }
        }
      }
    }
  };

  const handleRestore = async (target) => {
    if (!target) return;
    if (window.confirm(`Restore "${target.itemName}" back to Current inventory?`)) {
      if (target.docId) {
        try {
          await updateDoc(doc(db, 'pg_inventory_master', target.docId), {
            isUsed: false,
            usedMonth: null,
            usedAt: null,
            monthKey: currentMonthKey,
            lastUpdated: new Date().toISOString(),
            lastUpdatedBy: user?.displayName || user?.email || 'Admin'
          });
          if (detailItem && detailItem.docId === target.docId) {
            setDetailItem(prev => ({ ...prev, isUsed: false, usedMonth: null, usedAt: null }));
          }
        } catch (e) {
          console.error('Error restoring inventory item:', e);
          alert('Failed to restore item: ' + e.message);
        }
      }
    }
  };

  const formatMonthName = (mKey) => {
    if (!mKey || mKey === 'all') return 'All Months';
    const [y, m] = mKey.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 1, 1);
    return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  };

  // Full dedicated section for Item Detailings (instead of bottom slider popup)
  if (detailItem) {
    const liveDetailItem = enrichedItems.find(it => it.docId === detailItem.docId) || detailItem;
    return (
      <>
        <ItemDetailView
          item={liveDetailItem}
          onBack={() => setDetailItem(null)}
          onRestore={async (it) => {
            await handleRestore(it);
            setDetailItem(prev => ({ ...prev, isUsed: false, usedMonth: null, usedAt: null }));
          }}
          onMoveToUsed={async (it) => {
            await handleRemove(it);
            setDetailItem(prev => ({ ...prev, isUsed: true, usedMonth: currentMonthKey, usedAt: new Date().toISOString() }));
          }}
          onPermanentDelete={async (it) => {
            await handleRemove(it);
            setDetailItem(null);
          }}
          onRestock={(it) => setPurchaseModal({ open: true, defaultItemName: it.itemName, defaultUnit: it.unit || 'kg' })}
        />
        {purchaseModal.open && (
          <PurchaseItemModal
            defaultCategory={category}
            defaultItemName={purchaseModal.defaultItemName}
            defaultUnit={purchaseModal.defaultUnit}
            onClose={() => setPurchaseModal({ open: false, defaultItemName: '', defaultUnit: 'kg' })}
            onSaved={() => {}}
          />
        )}
      </>
    );
  }

  return (
    <div style={BASE}>
      <Header title={title} onBack={onBack} action={<span style={{ fontSize: 12, fontWeight: 800, color: cyan }}>✓ Live Synced</span>} />

      <div style={{ padding: '16px 16px 24px' }}>
        {/* iOS-Style Segmented Control: Current vs Used */}
        <div style={{ background: '#e2e8f0', borderRadius: 12, padding: 4, display: 'flex', gap: 4, marginBottom: 16 }}>
          <button
            onClick={() => setActiveTab('current')}
            style={{
              flex: 1, padding: '10px 12px', border: 'none', borderRadius: 9,
              fontWeight: 800, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s',
              background: activeTab === 'current' ? 'white' : 'transparent',
              color: activeTab === 'current' ? cyan : '#64748b',
              boxShadow: activeTab === 'current' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
            }}>
            📦 Current ({currentItems.length})
          </button>
          <button
            onClick={() => setActiveTab('used')}
            style={{
              flex: 1, padding: '10px 12px', border: 'none', borderRadius: 9,
              fontWeight: 800, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s',
              background: activeTab === 'used' ? 'white' : 'transparent',
              color: activeTab === 'used' ? cyan : '#64748b',
              boxShadow: activeTab === 'used' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
            }}>
            🗂️ Used ({enrichedItems.filter(it => it.isUsed || it.monthKey < currentMonthKey).length})
          </button>
        </div>

        {/* If in 'used' tab: Month selector chips */}
        {activeTab === 'used' && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, margin: 0 }}>
                Filter Used by Month
              </p>
              {usedMonthsList.length > 1 && (
                <button
                  onClick={() => setSelectedMonth('all')}
                  style={{
                    background: selectedMonth === 'all' ? '#ecfeff' : 'transparent',
                    color: selectedMonth === 'all' ? cyan : '#64748b',
                    border: 'none', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer'
                  }}>
                  View All
                </button>
              )}
            </div>
            {usedMonthsList.length === 0 ? (
              <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 12, padding: '12px 14px', fontSize: 12, color: '#64748b', textAlign: 'center' }}>
                No items marked as used yet. Deleting an item from Current inventory moves it here.
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6 }}>
                {usedMonthsList.map(mKey => (
                  <button key={mKey}
                    onClick={() => setSelectedMonth(mKey)}
                    style={{
                      padding: '8px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', flexShrink: 0,
                      fontWeight: 700, fontSize: 12, transition: 'all 0.2s',
                      background: selectedMonth === mKey ? cyan : '#e2e8f0',
                      color: selectedMonth === mKey ? 'white' : '#475569'
                    }}>
                    {formatMonthName(mKey)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Month Summary Bar */}
        <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e2e8f0', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', margin: '0 0 2px' }}>
              {activeTab === 'current' ? `This Month (${formatMonthName(currentMonthKey)})` : `Used Archive (${formatMonthName(selectedMonth)})`}
            </p>
            <p style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>
              {displayedItems.length} Items Listed
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', margin: '0 0 2px' }}>Total Spend</p>
            <p style={{ fontSize: 16, fontWeight: 900, color: cyan, margin: 0 }}>
              ₹{Math.round(activeTab === 'current' ? currentMonthTotalSpend : usedMonthTotalSpend).toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* Search */}
        <SearchBar value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${activeTab === 'current' ? 'current' : 'used'} items...`} />

        {/* Inventory List */}
        {loading ? <Loader /> : (
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            {filteredItems.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 36, color: '#cbd5e1', display: 'block', margin: '0 auto 8px' }}>
                  {activeTab === 'current' ? 'inventory_2' : 'history_toggle_off'}
                </span>
                <p style={{ fontWeight: 700, fontSize: 14, color: '#475569', margin: '0 0 4px' }}>
                  {activeTab === 'current' ? 'No items in Current Inventory' : 'No used items for this selection'}
                </p>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
                  {activeTab === 'current' ? 'Record a purchase below or purchase from vendors to auto-sync!' : 'Items moved to used will appear here.'}
                </p>
              </div>
            ) : (
              filteredItems.map((item, idx) => (
                <ItemRow key={item.docId || idx} item={item} 
                  readOnlyQty={true}
                  onClick={() => setDetailItem(item)}
                  onRestore={item.isUsed ? () => handleRestore(item) : undefined}
                  onRemove={() => handleRemove(item)} />
              ))
            )}
          </div>
        )}

        {/* Floating Add Purchase Button */}
        <Fab onClick={() => setPurchaseModal({ open: true, defaultItemName: '', defaultUnit: 'kg' })} />
      </div>

      {/* Record Purchase Modal */}
      {purchaseModal.open && (
        <PurchaseItemModal
          defaultCategory={category}
          defaultItemName={purchaseModal.defaultItemName}
          defaultUnit={purchaseModal.defaultUnit}
          onClose={() => setPurchaseModal({ open: false, defaultItemName: '', defaultUnit: 'kg' })}
          onSaved={() => {}}
        />
      )}
    </div>
  );
}
// ─── LIST VIEWS ────────────────────────────────────────────────────
function UserListView({ onBack }) {
  const { user, activePgId } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!user?.uid) return;
    const fetchUsers = async () => {
      try {
        const q = query(collection(db, 'tenants'), where('adminId', '==', user.uid), where('pgId', '==', activePgId));
        const snap = await getDocs(q);
        setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [user]);

  if (selected) return <AllocationView targetId={selected.id} targetType="tenant" personData={selected} title="User Allocation" onBack={() => setSelected(null)} />;

  const filtered = users.filter(u => u.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={BASE}>
      <Header title="User List" onBack={onBack} />
      <div style={{ padding: 16 }}>
        <SearchBar value={search} onChange={e => setSearch(e.target.value)} placeholder="Search User" />
        {loading ? <Loader /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(u => (
              <div key={u.id} onClick={() => setSelected(u)} style={{ background: 'white', borderRadius: 14, border: '1px solid #e2e8f0', padding: 12, display: 'flex', gap: 14, alignItems: 'center', cursor: 'pointer' }}>
                <img src={u.img || DEFAULT_IMG} alt={u.name} style={{ width: 60, height: 60, borderRadius: 30, objectFit: 'cover' }} />
                <div>
                  <p style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', margin: '0 0 4px' }}>{u.name}</p>
                  <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{u.phone || 'No Phone'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StaffListView({ onBack }) {
  const { user, activePgId } = useAuth();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!user?.uid) return;
    const fetchStaff = async () => {
      try {
        const q = query(collection(db, 'staff_tokens'), where('ownerUid', '==', user.uid), where('pgId', '==', activePgId));
        const snap = await getDocs(q);
        setStaff(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchStaff();
  }, [user]);

  if (selected) return <AllocationView targetId={selected.id} targetType="staff" personData={selected} title="Staff Allocation" onBack={() => setSelected(null)} />;

  const filtered = staff.filter(u => u.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={BASE}>
      <Header title="Staff List" onBack={onBack} />
      <div style={{ padding: 16 }}>
        <SearchBar value={search} onChange={e => setSearch(e.target.value)} placeholder="Search Staff" />
        {loading ? <Loader /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(u => (
              <div key={u.id} onClick={() => setSelected(u)} style={{ background: 'white', borderRadius: 14, border: '1px solid #e2e8f0', padding: 12, display: 'flex', gap: 14, alignItems: 'center', cursor: 'pointer' }}>
                <img src={u.img || DEFAULT_IMG} alt={u.name} style={{ width: 60, height: 60, borderRadius: 30, objectFit: 'cover' }} />
                <div>
                  <p style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', margin: '0 0 4px' }}>{u.name}</p>
                  <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{u.role || 'Staff'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RoomListView({ onBack }) {
  const { user, activePgId } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!user?.uid) return;
    const fetchRooms = async () => {
      try {
        // Since ManageRooms uses dummy data, the rooms collection might be empty.
        // We'll fetch it just in case, or let the user add rooms here.
        const q = query(collection(db, 'rooms'), where('adminId', '==', user.uid), where('pgId', '==', activePgId));
        const snap = await getDocs(q);
        setRooms(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchRooms();
  }, [user]);

  if (selected) return <AllocationView targetId={selected.id} targetType="room" title={`Room ${selected.roomNo} Inventory`} onBack={() => setSelected(null)} />;

  const filtered = rooms.filter(u => u.roomNo?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={BASE}>
      <Header title="Room List" onBack={onBack} />
      <div style={{ padding: 16 }}>
        <SearchBar value={search} onChange={e => setSearch(e.target.value)} placeholder="Search Room" />
        {loading ? <Loader /> : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map(u => (
                <div key={u.id} onClick={() => setSelected(u)} style={{ background: 'white', borderRadius: 14, border: '1px solid #e2e8f0', padding: 16, cursor: 'pointer' }}>
                  <p style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', margin: 0 }}>Room No. {u.roomNo}</p>
                </div>
              ))}
              {rooms.length === 0 && (
                <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>No rooms found. Add one below.</div>
              )}
            </div>
            <Fab onClick={async () => {
              const rNo = window.prompt("Enter Room Number:");
              if (rNo && rNo.trim()) {
                try {
                  const payload = { roomNo: rNo.trim(), adminId: user.uid };
                  const docRef = await addDoc(collection(db, 'rooms'), payload);
                  setRooms(p => [...p, { id: docRef.id, ...payload }]);
                } catch(e) { console.error(e); }
              }
            }} />
          </>
        )}
      </div>
    </div>
  );
}

// ─── MAIN INVENTORY ────────────────────────────────────────────────
export default function Inventory() {
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState(null);

  if (activeModule === 'user-inventory') return <UserListView onBack={() => setActiveModule(null)} />;
  if (activeModule === 'staff-inventory') return <StaffListView onBack={() => setActiveModule(null)} />;
  if (activeModule === 'room-inventory') return <RoomListView onBack={() => setActiveModule(null)} />;
  if (activeModule === 'pg-inventory') return <MasterInventoryView category="pg" title="PG Inventory" onBack={() => setActiveModule(null)} />;
  if (activeModule === 'kitchen-inventory') return <MasterInventoryView category="kitchen" title="Kitchen Inventory" onBack={() => setActiveModule(null)} />;

  return (
    <div style={BASE}>
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: cyan, padding: 0 }}>
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <p style={{ fontWeight: 800, fontSize: 20, color: '#0f172a', margin: 0 }}>Inventory</p>
      </div>

      <div style={{ padding: '24px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {MODULES.map(mod => (
            <div key={mod.id} onClick={() => setActiveModule(mod.id)}
              style={{ background: 'white', borderRadius: 20, padding: 20, border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.03)', transition: 'transform 0.2s', ':active': { transform: 'scale(0.96)' } }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: mod.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <span className="material-symbols-outlined" style={{ color: 'white', fontSize: 22 }}>{mod.icon}</span>
              </div>
              <p style={{ fontWeight: 800, fontSize: 16, color: '#0f172a', margin: 0, whiteSpace: 'pre-line', lineHeight: 1.3 }}>
                {mod.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
