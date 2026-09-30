import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, updateDoc, onSnapshot, getDoc, addDoc, setDoc , orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const cyan = '#0891b2';


const STATUS_CONFIG = {
  New:       { bg: '#ecfeff', text: '#0891b2', border: '#a5f3fc', icon: 'mark_chat_unread' },
  Seen:      { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0', icon: 'visibility' },
  Contacted: { bg: '#fffbeb', text: '#d97706', border: '#fde68a', icon: 'call_made' },
  Closed:    { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0', icon: 'check_circle' },
};

const SOURCE_CONFIG = {
  WhatsApp:   { color: '#25d366', icon: 'chat' },
  NoBroker:   { color: '#e11d48', icon: 'home' },
  MagicBricks:{ color: '#f59e0b', icon: 'apartment' },
  Instagram:  { color: '#c026d3', icon: 'photo_camera' },
  'Walk-in':  { color: '#0891b2', icon: 'directions_walk' },
};

export default function Enquiry() {
  const navigate = useNavigate();
  const { user, activePgId } = useAuth();
  const [enquiries, setEnquiries] = useState([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentLoading, setStudentLoading] = useState(false);
  const [viewMode, setViewMode] = useState('leads'); // 'leads' | 'applications'
  const [applications, setApplications] = useState([]);
  const [appLoading, setAppLoading] = useState(true);
      const [availableRooms, setAvailableRooms] = useState([]);
    
  useEffect(() => {
    if (!user?.uid) return;
    setLoading(true);
    let initialLoad = true;

    const q = query(collection(db, 'enquiries'), where('adminId', '==', user.uid), where('pgId', '==', activePgId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = [];
      snapshot.forEach(d => {
        const data = d.data();
        fetched.push({
          id: d.id,
          contactId: data.tenantId || d.id,
          name: data.tenantName || 'Unknown',
          mobile: data.tenantPhone || 'N/A',
          message: data.message || 'No message provided',
          date: data.date ? new Date(data.date).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          timestamp: data.date ? new Date(data.date).getTime() : 0,
          status: data.enquiryStatus || 'New',
          source: data.source || 'App',
          originalData: data
        });
      });
      
      // Sort by New first, then by date (newest first)
      fetched.sort((a, b) => {
        if (a.status === 'New' && b.status !== 'New') return -1;
        if (a.status !== 'New' && b.status === 'New') return 1;
        return b.timestamp - a.timestamp;
      });
      setEnquiries(fetched);
      setLoading(false);

      // Notification logic removed to prevent duplicates with GlobalEnquiryListener
      initialLoad = false;
    }, (error) => {
      console.error("Error fetching enquiries:", error);
      setLoading(false);
    });

    // Request notification permission
    if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user?.uid) return;
    setAppLoading(true);
    const q = query(collection(db, 'pg_applications'), where('adminId', '==', user.uid), where('pgId', '==', activePgId));
    const unsub = onSnapshot(q, (snap) => {
      const apps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      apps.sort((a, b) => new Date(b.date) - new Date(a.date));
      setApplications(apps);
      setAppLoading(false);
    });
    // fetch rooms too
    getDocs(query(collection(db, 'rooms'), where('adminId', '==', user.uid), where('pgId', '==', activePgId))).then(snap => {
      setAvailableRooms(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user]);

  const viewStudentProfile = async (enq) => {
    if (!enq.contactId) return;
    setStudentLoading(true);
    setSelectedStudent({ name: enq.name, mobile: enq.mobile }); // Temporary basic data
    try {
      const docRef = doc(db, 'users', enq.contactId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setSelectedStudent({ id: docSnap.id, ...docSnap.data() });
      }
    } catch (err) {
      console.error("Error fetching student profile:", err);
    } finally {
      setStudentLoading(false);
    }
  };

  
  
  const updateEnquiryStatus = async (enqId, newStatus) => {
    try {
      await updateDoc(doc(db, 'enquiries', enqId), { enquiryStatus: newStatus });
      setEnquiries(prev => prev.map(e => e.id === enqId ? { ...e, status: newStatus } : e));
    } catch (err) {
      console.error("Error updating enquiry status:", err);
      alert("Failed to update status.");
    }
  };

  const tabs = ['All', 'New', 'Seen', 'Contacted', 'Closed'];
  const counts = { All: enquiries.length, New: enquiries.filter(e => e.status === 'New').length, Seen: enquiries.filter(e => e.status === 'Seen').length, Contacted: enquiries.filter(e => e.status === 'Contacted').length, Closed: enquiries.filter(e => e.status === 'Closed').length };
  const filtered = filter === 'All' ? enquiries : enquiries.filter(e => e.status === filter);

  const openChatForEnquiry = async (enq) => {
    if (enq.status === 'New' || enq.status === 'Seen') {
      await updateEnquiryStatus(enq.id, 'Contacted');
    }
    navigate('/chat', { state: { contactId: enq.contactId, name: enq.name } });
  };

    
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk', sans-serif", paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0c1a2e, #0f2847)', padding: '0 16px 20px', paddingTop: 'max(env(safe-area-inset-top), 40px)', paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, height: 64 }}>
          <button onClick={() => navigate('/admin-dashboard')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back_ios_new</span>
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'white' }}>Enquiries</h1>
            <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{counts.New} new leads today</p>
          </div>
          <div style={{ background: '#ecfeff', borderRadius: 10, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: cyan }}>mark_chat_unread</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: cyan }}>{counts.New}</span>
          </div>
        </div>

        {/* Stats strip */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
          {[{ label: 'New', val: counts.New, c: '#38bdf8' }, { label: 'Seen', val: counts.Seen, c: '#94a3b8' }, { label: 'Contacted', val: counts.Contacted, c: '#fbbf24' }, { label: 'Closed', val: counts.Closed, c: '#4ade80' }].map(s => (
            <button key={s.label} onClick={() => setFilter(filter === s.label ? 'All' : s.label)} style={{ background: filter === s.label ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)', border: filter === s.label ? `1px solid ${s.c}` : '1px solid transparent', borderRadius: 12, padding: '10px', textAlign: 'center', cursor: 'pointer', outline: 'none', transition: 'all 0.2s', fontFamily: 'inherit' }}>
              <p style={{ margin: 0, fontWeight: 900, fontSize: 22, color: s.c }}>{s.val}</p>
              <p style={{ margin: 0, fontSize: 11, color: filter === s.label ? 'white' : '#94a3b8' }}>{s.label}</p>
            </button>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 6 }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setFilter(t)}
              style={{ flex: 1, padding: '7px 4px', border: 'none', borderRadius: 10, background: filter === t ? 'rgba(255,255,255,0.18)' : 'transparent', color: filter === t ? 'white' : '#64748b', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {t}
            </button>
          ))}
        </div>
        {/* View Mode Toggle: Leads vs Applications */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 4, marginTop: 10 }}>
          {[['leads', '📋 Leads'], ['applications', '🏠 Bookings']].map(([val, label]) => (
            <button key={val} onClick={() => setViewMode(val)}
              style={{ flex: 1, padding: '9px 0', border: 'none', borderRadius: 9, background: viewMode === val ? '#0891b2' : 'transparent', color: viewMode === val ? 'white' : '#94a3b8', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {viewMode === 'leads' && (
          <>
            {filtered.map(enq => {
              const sc = STATUS_CONFIG[enq.status] || STATUS_CONFIG['New'];
              const src = SOURCE_CONFIG[enq.source] || { color: '#64748b', icon: 'link' };
              return (
                <div 
                  key={enq.id} 
                  onClick={() => viewStudentProfile(enq)}
                  style={{ background: 'white', borderRadius: 16, border: `1px solid ${sc.border}`, marginBottom: 12, overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.05)', borderLeft: `4px solid ${sc.text}`, cursor: 'pointer', transition: 'transform 0.15s' }}>
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{enq.name}</p>
                        <span style={{ fontSize: 12, color: cyan, fontWeight: 600 }}>{enq.mobile}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 8, background: sc.bg, color: sc.text, display: 'flex', alignItems: 'center', gap: 3 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 12 }}>{sc.icon}</span>
                          {enq.status}
                        </span>
                        <span style={{ fontSize: 10, color: src.color, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 11 }}>{src.icon}</span>
                          {enq.source}
                        </span>
                      </div>
                    </div>
                    <p style={{ margin: '0 0 4px', fontSize: 13, color: '#475569' }}>{enq.message}</p>
                    <p style={{ margin: '0 0 12px', fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}><span className="material-symbols-outlined" style={{ fontSize: 14 }}>schedule</span> {enq.date}</p>
                    <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
                      {enq.status === 'New' && (
                        <button onClick={(e) => { e.stopPropagation(); updateEnquiryStatus(enq.id, 'Seen'); }} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 9, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>visibility</span>
                          Mark Seen
                        </button>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); openChatForEnquiry(enq); }} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#ecfeff', color: cyan, border: '1px solid #a5f3fc', borderRadius: 9, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 15 }}>chat</span>
                        Open Chat
                      </button>
                      <a href={`tel:${enq.mobile}`} onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f8fafc', color: '#334155', border: '1px solid #e2e8f0', borderRadius: 9, padding: '7px 10px', textDecoration: 'none', fontSize: 12, fontWeight: 700 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 15 }}>call</span>
                        Call
                      </a>
                      
                                            
                      
                      
                    </div>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', paddingTop: 60 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 56, color: '#e2e8f0' }}>contact_support</span>
                <p style={{ color: '#94a3b8', fontSize: 15, fontWeight: 600 }}>No enquiries in this category.</p>
              </div>
            )}
          </>
        )}
        
        {viewMode === 'applications' && (
          <div>
            {appLoading ? (
              <div style={{ textAlign: 'center', paddingTop: 60 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#94a3b8', animation: 'spin 1s linear infinite', display: 'block' }}>sync</span>
                <p style={{ color: '#94a3b8', marginTop: 12 }}>Loading applications...</p>
              </div>
            ) : applications.length === 0 ? (
              <div style={{ textAlign: 'center', paddingTop: 60 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 56, color: '#e2e8f0' }}>home_work</span>
                <p style={{ color: '#94a3b8', fontSize: 15, fontWeight: 600, marginTop: 12 }}>No applications yet.</p>
              </div>
            ) : applications.map(app => (
              <div key={app.id} style={{ background: 'white', borderRadius: 16, border: app.status === 'pending' ? '1px solid #fde68a' : '1px solid #e2e8f0', marginBottom: 12, overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.05)', borderLeft: `4px solid ${app.status === 'approved' ? '#059669' : app.status === 'rejected' ? '#ef4444' : '#d97706'}` }}>
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{app.tenantName}</p>
                      <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{app.tenantPhone}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>Applied: {app.date ? new Date(app.date).toLocaleDateString() : '-'}</p>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: app.status === 'approved' ? '#ecfdf5' : app.status === 'rejected' ? '#fef2f2' : '#fffbeb', color: app.status === 'approved' ? '#059669' : app.status === 'rejected' ? '#ef4444' : '#d97706', textTransform: 'uppercase' }}>
                      {app.status}
                    </span>
                  </div>
                  {app.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button onClick={() => navigate('/chat', { state: { contactId: app.tenantId, name: app.tenantName, phone: app.tenantPhone } })} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, background: '#ecfeff', color: '#0891b2', border: '1px solid #a5f3fc', borderRadius: 9, padding: '9px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 15 }}>chat</span> Chat
                      </button>
                      <button onClick={() => { openAllotModal(app); }} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, background: '#0891b2', color: 'white', border: 'none', borderRadius: 9, padding: '9px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 15 }}>check_circle</span> Approve
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Student Profile Modal */}
      {selectedStudent && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div onClick={() => setSelectedStudent(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)' }} />
          <div style={{ position: 'relative', background: 'white', borderRadius: '24px 24px 0 0', padding: '24px 20px 40px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0 }}>Student Profile</p>
              <button onClick={() => setSelectedStudent(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#475569' }}>close</span>
              </button>
            </div>
            
            {studentLoading && !selectedStudent.createdAt ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite', fontSize: 32, color: cyan }}>sync</span>
                <p style={{ margin: '8px 0 0', fontSize: 13, color: '#64748b' }}>Fetching profile...</p>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 24, padding: 16, background: '#f8fafc', borderRadius: 16 }}>
                  {selectedStudent.kyc?.profilePhoto || selectedStudent.photoURL ? (
                     <img src={selectedStudent.kyc?.profilePhoto || selectedStudent.photoURL} alt="Profile" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                     <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: cyan, fontSize: 24, fontWeight: 800 }}>
                       {selectedStudent.name?.charAt(0)?.toUpperCase()}
                     </div>
                  )}
                  <div>
                    <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{selectedStudent.name || 'Unknown'}</h2>
                    <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>{selectedStudent.mobile || selectedStudent.phone || 'No phone number'}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>{selectedStudent.email || 'No email provided'}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                   <a href={`tel:${selectedStudent.phone || selectedStudent.mobile}`} style={{ flex: 1, textAlign: 'center', background: cyan, color: 'white', border: 'none', borderRadius: 12, padding: '14px 0', textDecoration: 'none', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                     <span className="material-symbols-outlined" style={{ fontSize: 20 }}>call</span>
                     Call
                   </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
