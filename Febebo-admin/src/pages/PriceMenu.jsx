import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const cyan = '#0891b2';

const DEFAULT_CATEGORIES = [
  { category: 'Accommodation', icon: 'hotel', color: '#6366f1', items: [] },
  { category: 'Food (Optional)', icon: 'restaurant', color: '#ef4444', items: [] },
  { category: 'Services', icon: 'build', color: '#10b981', items: [] },
  { category: 'Transportation', icon: 'directions_car', color: '#f59e0b', items: [] },
];

const EMPTY_ITEM = { name: '', price: '', per: '', desc: '' };

export default function PriceMenu() {
  const navigate = useNavigate();
  const { user, activePgId } = useAuth();

  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [activeSection, setActiveSection] = useState(null);

  // Add-item modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingToCat, setAddingToCat] = useState(null); // category string
  const [newItem, setNewItem] = useState(EMPTY_ITEM);
  const [addError, setAddError] = useState('');

  // Inline price edit state
  const [editKey, setEditKey] = useState(null); // `${catIdx}-${itemIdx}`
  const [editPrice, setEditPrice] = useState('');

  /* --- Load from Firestore --- */
  useEffect(() => {
    if (!user?.uid) return;
    (async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, 'pg_profiles', user.uid));
        if (snap.exists() && snap.data().priceMenu && snap.data().priceMenu.length > 0) {
          setMenu(snap.data().priceMenu);
        } else {
          setMenu(DEFAULT_CATEGORIES);
        }
      } catch (err) {
        console.error('Error loading price menu:', err);
        setMenu(DEFAULT_CATEGORIES);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  /* --- Save to Firestore --- */
  const handleSave = async (menuToSave) => {
    const target = menuToSave || menu;
    setSaving(true);
    try {
      await setDoc(doc(db, 'pg_profiles', user.uid), { priceMenu: target }, { merge: true });
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2500);
    } catch (err) {
      console.error('Error saving price menu:', err);
    } finally {
      setSaving(false);
    }
  };

  /* --- Add item --- */
  const openAddModal = (catName) => {
    setAddingToCat(catName);
    setNewItem(EMPTY_ITEM);
    setAddError('');
    setShowAddModal(true);
  };

  const confirmAddItem = async () => {
    if (!newItem.name.trim()) { setAddError('Item name is required.'); return; }
    if (!newItem.price.trim()) { setAddError('Price is required.'); return; }
    const updated = menu.map(cat =>
      cat.category === addingToCat
        ? { ...cat, items: [...cat.items, { ...newItem, name: newItem.name.trim(), price: newItem.price.trim(), per: newItem.per.trim(), desc: newItem.desc.trim() }] }
        : cat
    );
    setMenu(updated);
    setShowAddModal(false);
    await handleSave(updated);
  };

  /* --- Inline price save --- */
  const saveInlinePrice = async (catIdx, itemIdx) => {
    const updated = menu.map((cat, ci) =>
      ci === catIdx
        ? { ...cat, items: cat.items.map((it, ii) => ii === itemIdx ? { ...it, price: editPrice.trim() } : it) }
        : cat
    );
    setMenu(updated);
    setEditKey(null);
    await handleSave(updated);
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk', sans-serif", paddingBottom: 80 }}>

      {/* Add-Item Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div onClick={() => setShowAddModal(false)}
            style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)' }} />
          <div style={{ position: 'relative', background: 'white', borderRadius: '24px 24px 0 0', maxHeight: '90vh', overflowY: 'auto', paddingBottom: 40 }}>

            <div style={{ position: 'sticky', top: 0, background: 'white', padding: '18px 20px 14px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 , paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))'}}>
              <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>Add Item to {addingToCat}</p>
              <button onClick={() => setShowAddModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#475569' }}>close</span>
              </button>
            </div>

            <div style={{ padding: '16px 20px' }}>
              {addError && (
                <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 12, padding: '10px 14px', marginBottom: 14 }}>
                  <p style={{ fontSize: 13, color: '#e11d48', fontWeight: 700, margin: 0 }}>{addError}</p>
                </div>
              )}

              {[
                { key: 'name', label: 'Item Name *', placeholder: 'e.g. Single Sharing Bed' },
                { key: 'price', label: 'Price *', placeholder: 'e.g. ₹8,000' },
                { key: 'per', label: 'Per', placeholder: 'e.g. /month, /meal' },
                { key: 'desc', label: 'Description', placeholder: 'Short description...' },
              ].map(({ key, label, placeholder }) => (
                <div key={key} style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>{label}</label>
                  <input value={newItem[key]} onChange={e => setNewItem(p => ({ ...p, [key]: e.target.value }))} placeholder={placeholder}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: '#f8fafc' }} />
                </div>
              ))}

              <button onClick={confirmAddItem} disabled={saving}
                style={{ width: '100%', padding: '15px 0', background: saving ? '#94a3b8' : 'linear-gradient(135deg, #0891b2, #0e7490)', color: 'white', border: 'none', borderRadius: 14, fontWeight: 800, fontSize: 15, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add_circle</span>
                {saving ? 'Saving...' : 'Add & Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0c1a2e, #0f2847)', padding: '0 16px 20px', paddingTop: 'max(env(safe-area-inset-top), 40px)', position: 'sticky', top: 0, zIndex: 10 , paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))'}}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, height: 64 }}>
          <button onClick={() => navigate(-1)}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back_ios_new</span>
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'white' }}>Price Menu</h1>
            <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>All charges &amp; packages</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {savedMsg && (
              <span style={{ fontSize: 11, fontWeight: 700, color: '#34d399', background: 'rgba(52,211,153,0.1)', padding: '4px 10px', borderRadius: 20 }}>Saved!</span>
            )}
            <button onClick={() => handleSave()} disabled={saving}
              style={{ background: saving ? '#94a3b8' : cyan, border: 'none', borderRadius: 10, padding: '8px 14px', color: 'white', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>cloud_upload</span>
              {saving ? 'Saving' : 'Save'}
            </button>
          </div>
        </div>

        {/* Info banner */}
        <div style={{ background: 'rgba(8,145,178,0.15)', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, border: '1px solid rgba(8,145,178,0.25)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#38bdf8' }}>info</span>
          <p style={{ fontSize: 12, color: '#7dd3fc', margin: 0, lineHeight: 1.4 }}>Changes here are visible to students in the student app instantly after saving.</p>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', paddingTop: 80 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#cbd5e1', display: 'block', marginBottom: 12 }}>sync</span>
          <p style={{ color: '#94a3b8', fontSize: 14, fontWeight: 600 }}>Loading price menu...</p>
        </div>
      )}

      {/* Categories */}
      {!loading && (
        <div style={{ padding: 16 }}>
          {menu.map((section, catIdx) => (
            <div key={section.category} style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', marginBottom: 14, overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>

              {/* Section header */}
              <div onClick={() => setActiveSection(activeSection === section.category ? null : section.category)}
                style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', borderBottom: activeSection === section.category ? '1px solid #f1f5f9' : 'none' }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: section.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 22, color: section.color }}>{section.icon}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{section.category}</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>{section.items.length} item{section.items.length !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={e => { e.stopPropagation(); openAddModal(section.category); }}
                  style={{ width: 30, height: 30, borderRadius: 8, background: section.color + '18', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginRight: 4 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: section.color }}>add</span>
                </button>
                <span className="material-symbols-outlined"
                  style={{ fontSize: 22, color: '#94a3b8', transform: activeSection === section.category ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                  expand_more
                </span>
              </div>

              {/* Items — expanded */}
              {activeSection === section.category && (
                <div>
                  {section.items.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '20px 16px', color: '#94a3b8', fontSize: 13 }}>
                      No items yet. Tap <strong>+</strong> to add one.
                    </div>
                  )}
                  {section.items.map((item, itemIdx) => {
                    const key = `${catIdx}-${itemIdx}`;
                    const isEditing = editKey === key;
                    return (
                      <div key={itemIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: itemIdx < section.items.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{item.name}</p>
                          <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>{item.desc}</p>
                        </div>
                        <div style={{ textAlign: 'right', marginLeft: 12 }}>
                          {isEditing ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <input value={editPrice} onChange={e => setEditPrice(e.target.value)}
                                autoFocus
                                style={{ width: 90, padding: '4px 8px', borderRadius: 8, border: `1px solid ${section.color}`, fontSize: 14, fontWeight: 800, color: section.color, outline: 'none', textAlign: 'right', fontFamily: 'inherit' }} />
                              <button onClick={() => saveInlinePrice(catIdx, itemIdx)}
                                style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 7, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#059669' }}>check</span>
                              </button>
                              <button onClick={() => setEditKey(null)}
                                style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 7, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#e11d48' }}>close</span>
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => { setEditKey(key); setEditPrice(item.price); }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'right', padding: 0 }}>
                              <span style={{ fontSize: 16, fontWeight: 800, color: section.color }}>{item.price}</span>
                              <span style={{ fontSize: 11, color: '#94a3b8', display: 'block' }}>{item.per}</span>
                              <span style={{ fontSize: 10, color: '#cbd5e1', display: 'block' }}>tap to edit</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Add item row */}
                  <button onClick={() => openAddModal(section.category)}
                    style={{ width: '100%', padding: '12px 16px', background: section.color + '08', border: 'none', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: section.color }}>add_circle</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: section.color }}>Add item to {section.category}</span>
                  </button>
                </div>
              )}

              {/* Preview when collapsed */}
              {activeSection !== section.category && (
                <div style={{ padding: '8px 16px 12px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {section.items.length === 0 && (
                    <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>No items — tap + to add</span>
                  )}
                  {section.items.slice(0, 3).map((item, idx) => (
                    <span key={idx} style={{ fontSize: 11, color: '#64748b', background: '#f8fafc', padding: '3px 8px', borderRadius: 6 }}>{item.name}</span>
                  ))}
                  {section.items.length > 3 && (
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>+{section.items.length - 3} more</span>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Bottom save button */}
          <button onClick={() => handleSave()} disabled={saving}
            style={{ width: '100%', padding: '15px 0', background: saving ? '#94a3b8' : 'linear-gradient(135deg, #0891b2, #0e7490)', color: 'white', border: 'none', borderRadius: 14, fontWeight: 800, fontSize: 15, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>cloud_upload</span>
            {saving ? 'Saving to Firestore...' : 'Save Price Menu'}
          </button>
        </div>
      )}
    </div>
  );
}
