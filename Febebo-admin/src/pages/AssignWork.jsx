import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

export default function AssignWork() {
  const navigate = useNavigate();
  const { user, activePgId } = useAuth();
  const [staffList, setStaffList] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    const fetchStaff = async () => {
      const q = query(collection(db, 'staff_tokens'), where('ownerUid', '==', user.uid), where('pgId', '==', activePgId));
      const qs = await getDocs(q);
      const staff = [];
      qs.forEach(d => {
        staff.push({ id: d.id, ...d.data() });
      });
      setStaffList(staff);
    };
    fetchStaff();
  }, [user]);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, 'staff_tasks'), where('adminId', '==', user.uid), where('pgId', '==', activePgId));
    const unsub = onSnapshot(q, (snap) => {
      const t = [];
      snap.forEach(doc => {
        t.push({ id: doc.id, ...doc.data() });
      });
      // Sort by date descending
      t.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setTasks(t);
    });
    return () => unsub();
  }, [user]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!title.trim() || !selectedStaff || isSending) return;
    setIsSending(true);
    try {
      await addDoc(collection(db, 'staff_tasks'), {
        adminId: user.uid,
        ownerUid: user.uid,
        pgId: activePgId || selectedStaff.pgId || 'primary', 
        staffId: selectedStaff.id,
        assignedTo: selectedStaff.id,
        staffName: selectedStaff.name,
        role: selectedStaff.role,
        staffRole: selectedStaff.role,
        staffPhone: selectedStaff.phone || '',
        title: title.trim(),
        description: description.trim(),
        status: 'Pending',
        assignedDate: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });
      setShowModal(false);
      setTitle('');
      setDescription('');
    } catch (err) {
      console.error('Error assigning work:', err);
    } finally {
      setIsSending(false);
    }
  };

  const getStaffTasks = (staffId) => tasks.filter(t => t.staffId === staffId);

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0c1a2e, #0f2847)', padding: '0 16px 20px', paddingTop: 'max(env(safe-area-inset-top), 16px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, height: 64 }}>
          <button onClick={() => navigate('/admin-dashboard')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back_ios_new</span>
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'white' }}>Assign Work</h1>
            <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>Assign and track staff tasks</p>
          </div>
        </div>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {staffList.map(staff => {
          const initials = (staff.name || 'S').substring(0, 2).toUpperCase();
          const staffTasks = getStaffTasks(staff.id);
          const pendingCount = staffTasks.filter(t => t.status === 'Pending').length;
          
          return (
            <div key={staff.id} style={{ background: 'white', borderRadius: 16, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #0891b2, #0e7490)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16 }}>
                  {initials}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{staff.name}</h3>
                  <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>{staff.role}</p>
                </div>
                <button onClick={() => { setSelectedStaff(staff); setShowModal(true); }} style={{ background: '#ecfeff', color: '#0891b2', border: '1px solid #a5f3fc', borderRadius: 10, padding: '8px 12px', fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add_task</span> Assign
                </button>
              </div>

              {/* Tasks preview */}
              {staffTasks.length > 0 && (
                <div style={{ background: '#f8fafc', borderRadius: 12, padding: 12, border: '1px solid #f1f5f9' }}>
                  <p style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', margin: '0 0 8px' }}>Recent Tasks ({pendingCount} Pending)</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {staffTasks.slice(0, 3).map(task => (
                      <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ flex: 1, paddingRight: 8 }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title}</p>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 12, background: task.status === 'Completed' ? '#ecfdf5' : '#fffbeb', color: task.status === 'Completed' ? '#059669' : '#d97706' }}>
                          {task.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {staffList.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 48, marginBottom: 12 }}>group_off</span>
            <p style={{ margin: 0 }}>No staff members found.</p>
          </div>
        )}
      </div>

      {showModal && selectedStaff && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: 400, padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Assign Work</h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>To {selectedStaff.name}</p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 24, color: '#94a3b8', cursor: 'pointer', padding: 0 }}>&times;</button>
            </div>

            <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Heading *</label>
                <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Clean the terrace" style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Descriptive Text</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Provide task details here..." style={{ width: '100%', minHeight: 80, padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: 13, background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                <button type="submit" disabled={isSending} style={{ flex: 1, padding: 13, background: isSending ? '#94a3b8' : '#0891b2', color: 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: isSending ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {isSending ? (
                    <>
                      <style>
                        {`
                          @keyframes spin { 100% { transform: rotate(360deg); } }
                        `}
                      </style>
                      <span className="material-symbols-outlined" style={{ fontSize: 18, animation: 'spin 1s linear infinite' }}>progress_activity</span>
                      Sending...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span> Send
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
