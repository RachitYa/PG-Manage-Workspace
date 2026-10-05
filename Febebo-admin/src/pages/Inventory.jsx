import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, doc, setDoc, getDoc, deleteDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

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

function ItemRow({ item, onQtyChange, onRemove }) {
  const [showImg, setShowImg] = React.useState(false);
  return (
    <div style={{ borderBottom: '1px solid #f1f5f9' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {item.conditionImage ? (
            <img
              src={item.conditionImage}
              alt="Condition"
              onClick={() => setShowImg(s => !s)}
              style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover', border: `2px solid ${cyan}`, cursor: 'pointer' }}
            />
          ) : (
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ color: cyan }}>{item.icon || 'inventory_2'}</span>
            </div>
          )}
          <div>
            <p style={{ fontWeight: 600, fontSize: 15, color: '#0f172a', margin: 0 }}>
              {item.itemName} {item.unit ? <span style={{ fontSize: 12, fontWeight: 700, color: cyan }}>({item.unit})</span> : ''}
            </p>
            {item.lastUpdatedBy && (
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b' }}>
                Updated by: {item.lastUpdatedBy}
              </p>
            )}
            {item.conditionImage && (
              <p onClick={() => setShowImg(s => !s)} style={{ margin: '2px 0 0', fontSize: 11, color: cyan, fontWeight: 600, cursor: 'pointer' }}>
                {showImg ? 'Hide photo ▲' : 'View condition photo ▼'}
              </p>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: 8, overflow: 'hidden' }}>
            <button onClick={() => onQtyChange(item.qty - 1)} style={{ width: 32, height: 32, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 18, color: '#64748b' }}>-</button>
            <span style={{ width: 30, textAlign: 'center', fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{item.qty}</span>
            <button onClick={() => onQtyChange(item.qty + 1)} style={{ width: 32, height: 32, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 16, color: '#64748b' }}>+</button>
          </div>
          <button onClick={onRemove} style={{ background: '#fee2e2', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#ef4444' }}>delete</span>
          </button>
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

// ─── MASTER INVENTORY VIEWS (PG, Kitchen) ──────────────────────────
function MasterInventoryView({ category, title, onBack }) {
  const { user, activePgId } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, 'pg_inventory_master'), 
      where('adminId', '==', user.uid), 
      where('category', '==', category)
    );
    const unsub = onSnapshot(q, (snap) => {
      let mapped = snap.docs.map(d => ({
        docId: d.id,
        itemName: d.data().name,
        qty: d.data().totalQty,
        unit: d.data().unit || '',
        icon: d.data().icon || (category === 'kitchen' ? 'kitchen' : 'inventory_2'),
        pgId: d.data().pgId,
        lastUpdatedBy: d.data().lastUpdatedBy
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
    return () => unsub();
  }, [user?.uid, category, activePgId]);

  const updateQty = async (idx, val) => {
    const target = items[idx];
    if (!target) return;
    const newQty = Math.max(0, val);
    setItems(p => p.map((it, i) => i === idx ? { ...it, qty: newQty } : it));
    if (target.docId) {
      try {
        await updateDoc(doc(db, 'pg_inventory_master', target.docId), {
          totalQty: newQty,
          lastUpdated: new Date().toISOString(),
          lastUpdatedBy: 'Admin'
        });
      } catch (e) {
        console.error('Error updating inventory item qty:', e);
      }
    }
  };

  const handleRemove = async (idx) => {
    const target = items[idx];
    if (!target) return;
    if (window.confirm(`Delete ${target.itemName} from inventory?`)) {
      setItems(p => p.filter((_, i) => i !== idx));
      if (target.docId) {
        try {
          await deleteDoc(doc(db, 'pg_inventory_master', target.docId));
        } catch (e) {
          console.error('Error deleting inventory item:', e);
        }
      }
    }
  };

  const handleAddItem = async () => {
    const name = window.prompt("Enter new item name:");
    if (!name || !name.trim()) return;
    const unit = window.prompt("Enter unit (e.g. kg, litre, pack, piece):", "kg") || "kg";
    const qtyStr = window.prompt("Enter initial quantity:", "1") || "1";
    const qty = parseFloat(qtyStr) || 1;
    try {
      await addDoc(collection(db, 'pg_inventory_master'), {
        adminId: user.uid,
        pgId: activePgId || 'primary',
        category,
        name: name.trim(),
        totalQty: qty,
        unit: unit.trim(),
        icon: category === 'kitchen' ? 'kitchen' : 'inventory_2',
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        lastUpdatedBy: 'Admin'
      });
    } catch (e) {
      console.error('Error adding inventory item:', e);
    }
  };

  return (
    <div style={BASE}>
      <Header title={title} onBack={onBack} action={<span style={{fontSize:12, fontWeight:800, color:cyan}}>✓ Live Synced</span>} />
      <div style={{ padding: 16 }}>
        {loading ? <Loader /> : (
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            {items.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>No items in inventory. Add an item or purchase kitchen supplies to see them here!</div>
            ) : (
              items.map((item, idx) => (
                <ItemRow key={item.docId || idx} item={item} 
                  onQtyChange={val => updateQty(idx, val)}
                  onRemove={() => handleRemove(idx)} />
              ))
            )}
          </div>
        )}
        <Fab onClick={handleAddItem} />
      </div>
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
