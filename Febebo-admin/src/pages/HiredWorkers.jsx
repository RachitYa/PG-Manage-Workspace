import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection, query, where, getDocs,
  addDoc, doc, updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const cyan = '#0891b2';

const ROLES_LIST = [
  'Plumber', 'Electrician', 'Carpenter', 'Cook', 'Cleaner',
  'Painter', 'Security Guard', 'Driver', 'Helper', 'Other',
];

const EMPTY_FORM = {
  name: '', role: 'Plumber', workDone: '', charges: '',
  phone: '', rating: 4, review: '', isVisible: true,
};

export default function HiredWorkers() {
  const navigate = useNavigate();
  const { user, activePgId } = useAuth();

  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  /* --- Fetch workers --- */
  useEffect(() => {
    if (!user?.uid) return;
    (async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'hired_workers'),
          where('adminId', '==', user.uid), where('pgId', '==', activePgId),
        );
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setWorkers(data);
      } catch (err) {
        console.error('Error fetching hired workers:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  /* --- Toggle visibility --- */
  const toggleVisibility = async (worker) => {
    const newVal = !worker.isVisible;
    setWorkers(prev => prev.map(w => w.id === worker.id ? { ...w, isVisible: newVal } : w));
    try {
      await updateDoc(doc(db, 'hired_workers', worker.id), { isVisible: newVal });
    } catch (err) {
      console.error('Error updating visibility:', err);
      setWorkers(prev => prev.map(w => w.id === worker.id ? { ...w, isVisible: !newVal } : w));
    }
  };

  /* --- Add worker --- */
  const handleAddWorker = async () => {
    if (!form.name.trim()) { setFormError('Worker name is required.'); return; }
    if (!form.phone.trim()) { setFormError('Phone number is required.'); return; }
    if (!form.charges.trim()) { setFormError('Charges are required.'); return; }
    setFormError('');
    setSaving(true);
    try {
      const payload = {
        adminId: user.uid, pgId: activePgId, 
        name: form.name.trim(),
        role: form.role,
        phone: form.phone.trim(),
        charges: form.charges.trim(),
        workDone: form.workDone.trim(),
        review: form.review.trim(),
        rating: form.rating,
        isVisible: form.isVisible,
        createdAt: Date.now(),
      };
      const ref = await addDoc(collection(db, 'hired_workers'), payload);
      setWorkers(prev => [{ id: ref.id, ...payload }, ...prev]);
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch (err) {
      console.error('Error adding worker:', err);
      setFormError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const allRoles = ['All', ...new Set(workers.map(w => w.role))];

  const filteredWorkers = workers.filter(w => {
    if (filterRole !== 'All' && w.role !== filterRole) return false;
    if (search &&
      !w.name.toLowerCase().includes(search.toLowerCase()) &&
      !w.role.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const StarPicker = ({ value, onChange }) => (
    <div style={{ display: 'flex', gap: 6 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <button key={s} type="button" onClick={() => onChange(s)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
          <span className="material-symbols-outlined"
            style={{ fontSize: 28, color: s <= value ? '#f59e0b' : '#e2e8f0', fontVariationSettings: s <= value ? "'FILL' 1" : "'FILL' 0" }}>
            star
          </span>
        </button>
      ))}
    </div>
  );

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk', sans-serif", paddingBottom: 40 }}>

      {/* Add Worker Bottom Sheet */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div onClick={() => setShowForm(false)}
            style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)' }} />
          <div style={{ position: 'relative', background: 'white', borderRadius: '24px 24px 0 0', maxHeight: '92vh', overflowY: 'auto', paddingBottom: 40 }}>

            <div style={{ position: 'sticky', top: 0, background: 'white', padding: '18px 20px 14px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 , paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))'}}>
              <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>Add Hired Worker</p>
              <button onClick={() => setShowForm(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#475569' }}>close</span>
              </button>
            </div>

            <div style={{ padding: '16px 20px' }}>
              {formError && (
                <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 12, padding: '10px 14px', marginBottom: 14 }}>
                  <p style={{ fontSize: 13, color: '#e11d48', fontWeight: 700, margin: 0 }}>{formError}</p>
                </div>
              )}

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Worker Name *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Rajesh Kumar"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: '#f8fafc' }} />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Role / Trade *</label>
                <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#f8fafc', color: '#0f172a', boxSizing: 'border-box' }}>
                  {ROLES_LIST.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Phone Number *</label>
                <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+91 9xxxxxxxxx" type="tel"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: '#f8fafc' }} />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Charges *</label>
                <input value={form.charges} onChange={e => setForm(p => ({ ...p, charges: e.target.value }))} placeholder="e.g. ₹500 / visit"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: '#f8fafc' }} />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Type of Work Done</label>
                <input value={form.workDone} onChange={e => setForm(p => ({ ...p, workDone: e.target.value }))} placeholder="e.g. Pipe Leakage Fix, Full Wiring"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: '#f8fafc' }} />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Review</label>
                <textarea value={form.review} onChange={e => setForm(p => ({ ...p, review: e.target.value }))} placeholder="Write a short review about their work..."
                  rows={3} style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: '#f8fafc', resize: 'vertical' }} />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 8 }}>Rating</label>
                <StarPicker value={form.rating} onChange={v => setForm(p => ({ ...p, rating: v }))} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, padding: '12px 14px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>Visible to PG Owners</p>
                  <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>Show this worker in the shared pool</p>
                </div>
                <button onClick={() => setForm(p => ({ ...p, isVisible: !p.isVisible }))}
                  style={{ width: 48, height: 26, borderRadius: 13, background: form.isVisible ? cyan : '#cbd5e1', border: 'none', position: 'relative', cursor: 'pointer', transition: 'background 0.3s', flexShrink: 0 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'white', position: 'absolute', top: 3, left: form.isVisible ? 25 : 3, transition: 'left 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </button>
              </div>

              <button onClick={handleAddWorker} disabled={saving}
                style={{ width: '100%', padding: '15px 0', background: saving ? '#94a3b8' : 'linear-gradient(135deg, #0891b2, #0e7490)', color: 'white', border: 'none', borderRadius: 14, fontWeight: 800, fontSize: 15, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>person_add</span>
                {saving ? 'Saving...' : 'Add Worker'}
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
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'white' }}>Hired Workers</h1>
            <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>{workers.length} workers in pool</p>
          </div>
          <button onClick={() => setShowForm(true)}
            style={{ background: cyan, border: 'none', borderRadius: 12, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white', boxShadow: '0 4px 12px rgba(8,145,178,0.4)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>add</span>
          </button>
        </div>

        <div style={{ position: 'relative' }}>
          <span className="material-symbols-outlined" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: '#64748b' }}>search</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search workers..."
            style={{ width: '100%', padding: '10px 12px 10px 40px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.08)', color: 'white', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
          {allRoles.map(role => (
            <button key={role} onClick={() => setFilterRole(role)}
              style={{ padding: '6px 12px', border: 'none', borderRadius: 20, background: filterRole === role ? cyan : 'rgba(255,255,255,0.1)', color: filterRole === role ? 'white' : '#cbd5e1', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s', fontFamily: 'inherit' }}>
              {role}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: 16 }}>

        {loading && (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#cbd5e1', display: 'block', marginBottom: 12 }}>sync</span>
            <p style={{ color: '#94a3b8', fontSize: 14, fontWeight: 600 }}>Loading workers...</p>
          </div>
        )}

        {!loading && workers.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 56, color: '#e2e8f0', display: 'block', marginBottom: 12 }}>engineering</span>
            <p style={{ color: '#94a3b8', fontSize: 15, fontWeight: 600 }}>No hired workers yet.</p>
            <p style={{ color: '#cbd5e1', fontSize: 13 }}>Add your first worker using the + button.</p>
          </div>
        )}

        {!loading && workers.length > 0 && filteredWorkers.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 56, color: '#e2e8f0', display: 'block', marginBottom: 12 }}>search_off</span>
            <p style={{ color: '#94a3b8', fontSize: 15, fontWeight: 600 }}>No workers match your search.</p>
          </div>
        )}

        {!loading && filteredWorkers.map(w => (
          <div key={w.id} style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', marginBottom: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', opacity: w.isVisible ? 1 : 0.65 }}>
            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontWeight: 800, fontSize: 18, flexShrink: 0 }}>
                  {w.name.substring(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ margin: '0 0 2px', fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{w.name}</h3>
                      <span style={{ display: 'inline-block', background: '#e0f2fe', color: '#0284c7', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 800 }}>{w.role}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, background: '#fef9c3', padding: '4px 8px', borderRadius: 8 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 13, color: '#ca8a04', fontVariationSettings: "'FILL' 1" }}>star</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#ca8a04' }}>{w.rating}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 7 }}>
                {w.workDone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#94a3b8' }}>task_alt</span>
                    <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>{w.workDone}</span>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#94a3b8' }}>payments</span>
                  <span style={{ fontSize: 14, color: '#475569', fontWeight: 700 }}>{w.charges}</span>
                </div>
                {w.review && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#94a3b8', marginTop: 2 }}>format_quote</span>
                    <span style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic', lineHeight: 1.4 }}>"{w.review}"</span>
                  </div>
                )}
              </div>
            </div>

            <div style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <a href={`tel:${w.phone}`}
                style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#ecfdf5', color: '#059669', padding: '6px 12px', borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 700, border: '1px solid #a7f3d0' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>call</span>
                {w.phone}
              </a>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: w.isVisible ? cyan : '#94a3b8' }}>
                  {w.isVisible ? 'Visible' : 'Hidden'}
                </span>
                <button onClick={() => toggleVisibility(w)}
                  style={{ width: 44, height: 24, borderRadius: 12, background: w.isVisible ? cyan : '#cbd5e1', border: 'none', position: 'relative', cursor: 'pointer', transition: 'background 0.3s', flexShrink: 0 }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'white', position: 'absolute', top: 3, left: w.isVisible ? 23 : 3, transition: 'left 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
