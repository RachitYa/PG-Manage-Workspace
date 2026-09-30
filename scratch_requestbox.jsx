import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import ReviewDetailsModal from '../components/ReviewDetailsModal';

const cyan = '#0891b2';

const CATEGORY_CONFIG = {
  document:    { icon: 'description',  color: '#6366f1', bg: '#eef2ff' },
  amenity:     { icon: 'bed',          color: '#0891b2', bg: '#ecfeff' },
  maintenance: { icon: 'build',        color: '#d97706', bg: '#fffbeb' },
  room:        { icon: 'meeting_room', color: '#10b981', bg: '#ecfdf5' },
  user:        { icon: 'person_add',   color: '#3b82f6', bg: '#eff6ff' },
  staff:       { icon: 'badge',        color: '#f59e0b', bg: '#fffbeb' },
  rent:        { icon: 'payments',     color: '#ef4444', bg: '#fef2f2' },
};

export default function RequestBox() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewModalData, setReviewModalData] = useState(null);
  const [approveLoading, setApproveLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('Pending');
  const [payReviewModal, setPayReviewModal] = useState(null);
  const [customPayAmount, setCustomPayAmount] = useState('');

  useEffect(() => {
    if (!user?.uid) return;
    
    const fetchAllNotifications = async () => {
      setLoading(true);
      try {
        const results = [];
        
        // 1. Fetch from 'notifications' collection (Standard)
        const qNotif = query(collection(db, 'notifications'), where('adminId', '==', user.uid));
        const snapNotif = await getDocs(qNotif);
        snapNotif.forEach(d => {
          results.push({ id: d.id, ...d.data(), source: 'notification' });
        });

        // 2. Fetch Pending Users
        const qUsers = query(collection(db, 'tenants'), where('adminId', '==', user.uid));
        const snapUsers = await getDocs(qUsers);
        snapUsers.forEach(d => {
          const data = d.data();
          if (data.status === 'Pending' || data.status === 'Upcoming User' || !data.status) {
            results.push({
              id: 'user_' + d.id,
              tenant: data.name,
              room: data.room || 'N/A',
              phone: data.phone,
              type: 'New User Approval',
              desc: `New student ${data.name} has signed up and needs approval.`,
              date: new Date().toLocaleDateString(),
              resolved: false,
              category: 'user',
              source: 'tenant',
              originalId: d.id
            });
          }
        });

        // 3. Fetch Pending Staff Requisitions
        const qReqs = query(collection(db, 'staff_requisitions'), where('adminId', '==', user.uid), where('status', '==', 'Pending Rate'));
        const snapReqs = await getDocs(qReqs);
        snapReqs.forEach(d => {
          const data = d.data();
          results.push({
            id: 'req_' + d.id,
            tenant: data.staffName || 'Staff',
            room: 'N/A',
            phone: '',
            type: 'Staff Requisition',
            desc: `Requested ${data.qty}x ${data.item}. Pending rate approval.`,
            date: data.date || new Date().toLocaleDateString(),
            resolved: false,
            category: 'staff',
            source: 'requisition',
            originalId: d.id
          });
        });

        // Sort by date (mocking latest first, though Date parsing here is basic)
        results.sort((a, b) => new Date(b.date) - new Date(a.date));
        setRequests(results);
      } catch (err) {
        console.error("Error fetching notifications:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllNotifications();
  }, [user]);

  const handleResolve = async (req) => {
    if (req.source === 'notification') {
      if (req.action === 'VIEW_TENANTS') {
        try {
          await updateDoc(doc(db, 'notifications', req.id), { resolved: true });
        } catch (e) { console.error(e); }
        navigate('/manage-tenants', { state: { tab: 'Upcoming User' } });
      } else {
        try {
          await updateDoc(doc(db, 'notifications', req.id), { resolved: true });
          setRequests(prev => prev.map(r => r.id === req.id ? { ...r, resolved: true } : r));
        } catch (e) { console.error(e); }
      }
    } else if (req.source === 'tenant') {
      // Direct them to Manage Tenants to approve
      navigate('/manage-tenants');
    } else if (req.source === 'requisition') {
      // Direct them to manage account -> staff to approve
      navigate('/manage-account');
    }
  };

  const handleAttendanceReview = async (req, newStatus) => {
    if (newStatus === 'present') {
      setPayReviewModal(req);
      setCustomPayAmount('');
      return;
    }
    try {
      if (req.attDocId) {
        await updateDoc(doc(db, 'staff_attendance', req.attDocId), { status: newStatus });
      }
      await updateDoc(doc(db, 'notifications', req.id), { resolved: true });
      setRequests(prev => prev.map(r => r.id === req.id ? { ...r, resolved: true } : r));
    } catch (e) { console.error('Failed to review attendance:', e); }
  };

  const submitPayReview = async (amount) => {
    if (!payReviewModal) return;
    try {
      if (payReviewModal.attDocId) {
        await updateDoc(doc(db, 'staff_attendance', payReviewModal.attDocId), { 
           status: 'present', 
           dailyPay: Number(amount)
        });
      }
      await updateDoc(doc(db, 'notifications', payReviewModal.id), { resolved: true });
      
      // Notify staff
      if (payReviewModal.staffId) {
        await addDoc(collection(db, 'notifications'), {
           staffId: payReviewModal.staffId,
           adminId: payReviewModal.adminId,
           title: 'Payment Received',
           desc: `You were marked present and paid ₹${amount} for your partial work today.`,
           type: 'Attendance',
           date: new Date().toISOString(),
           resolved: false
        });
      }

      setRequests(prev => prev.map(r => r.id === payReviewModal.id ? { ...r, resolved: true } : r));
      setPayReviewModal(null);
    } catch (e) {
      console.error(e);
      alert('Failed to save pay.');
    }
  };

  const handleApproveDetails = async () => {
    if (!reviewModalData || !reviewModalData.tenantId) return;
    setApproveLoading(true);
    try {
      await updateDoc(doc(db, 'users', reviewModalData.tenantId), {
        isApproved: true,
        status: 'Approved',
        pgStatus: 'Approved'
      });
      await updateDoc(doc(db, 'notifications', reviewModalData.id), {
        resolved: true
      });
      setRequests(prev => prev.map(r => r.id === reviewModalData.id ? { ...r, resolved: true } : r));
      setReviewModalData(null);
    } catch (e) {
      console.error(e);
      alert("Error approving student details.");
    } finally {
      setApproveLoading(false);
    }
  };

  const pending = requests.filter(r => !r.resolved);
  const resolved = requests.filter(r => r.resolved);
  const shown = activeTab === 'Pending' ? pending : resolved;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk', sans-serif", paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0c1a2e, #0f2847)', paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))', padding: '0 16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, height: 64 }}>
          <button onClick={() => navigate('/admin-dashboard')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back_ios_new</span>
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'white' }}>Notifications</h1>
            <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{pending.length} pending requests</p>
          </div>
          {pending.length > 0 && (
            <div style={{ background: '#fef3c7', borderRadius: 10, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#d97706' }}>inbox</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#d97706' }}>{pending.length}</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 4 }}>
          {['Pending', 'Resolved'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ flex: 1, padding: '9px 0', border: 'none', borderRadius: 9, background: activeTab === tab ? 'white' : 'transparent', color: activeTab === tab ? '#0f172a' : '#64748b', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}>
              {tab} ({tab === 'Pending' ? pending.length : resolved.length})
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ display: 'inline-block', width: 30, height: 30, border: '3px solid #e2e8f0', borderTopColor: cyan, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          </div>
        ) : shown.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 56, color: '#e2e8f0' }}>notifications_off</span>
            <p style={{ color: '#94a3b8', fontSize: 15, fontWeight: 600 }}>
              {activeTab === 'Pending' ? 'You are all caught up!' : 'No resolved notifications yet.'}
            </p>
          </div>
        ) : (
          shown.map(req => {
            const cat = CATEGORY_CONFIG[req.category] || CATEGORY_CONFIG.amenity;
            return (
              <div key={req.id} style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', marginBottom: 12, overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.05)', borderLeft: `4px solid ${cat.color}` }}>
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 9, background: cat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 17, color: cat.color }}>{cat.icon}</span>
                      </div>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{req.type}</p>
                    </div>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>{req.date}</span>
                  </div>
                  <p style={{ margin: '0 0 6px', fontSize: 12, color: '#64748b' }}>{req.tenant} {req.room !== 'N/A' && `· Room ${req.room}`}</p>
                  <p style={{ margin: '0 0 12px', fontSize: 13, color: '#475569' }}>{req.desc}</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {req.phone && (
                      <a href={`tel:${req.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#ecfeff', color: cyan, border: '1px solid #a5f3fc', borderRadius: 9, padding: '7px 12px', textDecoration: 'none', fontSize: 12, fontWeight: 700 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 15 }}>call</span>
                        Call
                      </a>
                    )}
                    {!req.resolved && req.type === 'Attendance_Review' && (
                      <>
                        <button
                          onClick={() => handleAttendanceReview(req, 'present')}
                          style={{ flex: 1, background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: 9, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>check_circle</span>
                          Mark Present
                        </button>
                        <button
                          onClick={() => handleAttendanceReview(req, 'absent')}
                          style={{ flex: 1, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 9, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>cancel</span>
                          Mark Absent
                        </button>
                      </>
                    )}
                    {!req.resolved && req.type === 'Student Details Review' && (
                      <button
                        onClick={() => setReviewModalData(req)}
                        style={{ flex: 1, background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: 9, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 15 }}>visibility</span>
                        Review Details
                      </button>
                    )}
                    {!req.resolved && req.type !== 'Attendance_Review' && req.type !== 'Student Details Review' && (
                      <button
                        onClick={() => handleResolve(req)}
                        style={{ flex: 1, background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: 9, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
                          {req.source === 'notification' ? (req.action === 'VIEW_TENANTS' ? 'open_in_new' : 'check_circle') : 'open_in_new'}
                        </span>
                        {req.source === 'notification' ? (req.action === 'VIEW_TENANTS' ? 'View Upcoming User' : 'Mark Resolved') : 'Review & Action'}
                      </button>
                    )}
                    {req.resolved && req.source === 'notification' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#059669', fontSize: 12, fontWeight: 700 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                        Resolved
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <ReviewDetailsModal
        isOpen={!!reviewModalData}
        onClose={() => setReviewModalData(null)}
        userId={reviewModalData?.tenantId}
        onApprove={handleApproveDetails}
        approveLoading={approveLoading}
      />

      {/* Pay Review Modal */}
      {payReviewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
          <div style={{ background: 'white', width: '100%', maxWidth: 480, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: '24px 20px', animation: 'slideUp 0.3s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Pay Staff (Partial Day)</h3>
              <span className="material-symbols-outlined" onClick={() => setPayReviewModal(null)} style={{ cursor: 'pointer', color: '#94a3b8' }}>close</span>
            </div>
            
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
              This staff member logged fewer hours than a full shift. You are marking them Present. Please specify their pay for today.
            </p>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 6 }}>Custom Pay Amount (₹)</label>
              <input type="number" placeholder="Enter amount..." value={customPayAmount} onChange={e => setCustomPayAmount(e.target.value)} style={{ width: '100%', padding: '14px', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 16, fontFamily: 'inherit', background: 'white', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                onClick={() => submitPayReview(Number(customPayAmount))}
                disabled={!customPayAmount}
                style={{ flex: 1, padding: '16px', background: customPayAmount ? '#0891b2' : '#cbd5e1', color: 'white', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: customPayAmount ? 'pointer' : 'not-allowed' }}
              >
                Pay Custom Amount
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}