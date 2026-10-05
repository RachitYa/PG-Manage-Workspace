import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export default function ManagerLeavesView({ adminId, onBack, showToast }) {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Pending'); // 'Pending' | 'Approved' | 'Rejected' | 'All'
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Real-time listener for leave_requests
  useEffect(() => {
    if (!adminId) return;
    setLoading(true);

    const qLeaves = query(collection(db, 'leave_requests'), where('adminId', '==', adminId));
    const unsub = onSnapshot(qLeaves, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0));
      setLeaves(list);
      setLoading(false);
    }, (err) => {
      console.error('Leave requests fetch error:', err);
      setLoading(false);
    });

    return () => unsub();
  }, [adminId]);

  // Tab counts
  const pendingCount = useMemo(() => leaves.filter(l => l.status === 'Pending' || !l.status).length, [leaves]);
  const approvedCount = useMemo(() => leaves.filter(l => l.status === 'Approved').length, [leaves]);
  const rejectedCount = useMemo(() => leaves.filter(l => l.status === 'Rejected').length, [leaves]);

  // Filtered leaves
  const filteredLeaves = useMemo(() => {
    return leaves.filter(l => {
      const st = l.status || 'Pending';
      if (activeTab === 'Pending') return st === 'Pending';
      if (activeTab === 'Approved') return st === 'Approved';
      if (activeTab === 'Rejected') return st === 'Rejected';
      return true;
    });
  }, [leaves, activeTab]);

  // Status updater
  const handleUpdateStatus = async (leaveId, newStatus) => {
    setActionLoadingId(leaveId);
    try {
      await updateDoc(doc(db, 'leave_requests', leaveId), {
        status: newStatus,
        reviewedAt: new Date().toISOString()
      });
      showToast?.(`Leave request ${newStatus.toLowerCase()} successfully`, 'success');
    } catch (err) {
      console.error('Leave status update error:', err);
      showToast?.('Failed to update leave request', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div style={{ padding: '0 0 calc(32px + env(safe-area-inset-bottom, 0px))', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '16px 16px', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={onBack} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#0f172a' }}>arrow_back</span>
            </button>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>Student Leaves</h2>
              <p style={{ margin: 0, fontSize: 11, color: '#64748b', fontWeight: 600 }}>Review & approve gate passes</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {[
            { id: 'Pending', label: `Pending (${pendingCount})` },
            { id: 'Approved', label: `Approved (${approvedCount})` },
            { id: 'Rejected', label: `Rejected (${rejectedCount})` },
            { id: 'All', label: `All (${leaves.length})` }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 10,
                border: 'none',
                background: activeTab === t.id ? '#0f172a' : '#f1f5f9',
                color: activeTab === t.id ? '#fff' : '#475569',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Leaves List */}
      <div style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTop: '3px solid #0891b2', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Loading Leaves...</p>
          </div>
        ) : filteredLeaves.length === 0 ? (
          <div style={{ background: '#fff', border: '1px dashed #cbd5e1', borderRadius: 16, padding: '36px 20px', textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#cbd5e1', marginBottom: 8 }}>event_available</span>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#64748b' }}>No leave requests</p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>All student leaves in this filter have been processed</p>
          </div>
        ) : (
          filteredLeaves.map(item => {
            const isApproved = item.status === 'Approved';
            const isRejected = item.status === 'Rejected';
            const isPending = !isApproved && !isRejected;

            const fromStr = item.startDate || item.fromDate || item.from || 'N/A';
            const toStr = item.endDate || item.toDate || item.to || 'N/A';

            return (
              <div
                key={item.id}
                style={{
                  background: '#fff',
                  border: `1.5px solid ${isApproved ? '#bbf7d0' : isRejected ? '#fecaca' : '#fed7aa'}`,
                  borderRadius: 16,
                  padding: 14,
                  boxShadow: '0 3px 10px rgba(15,23,42,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: '#0f172a' }}>
                      {item.studentName || item.name || 'Student'}
                    </h4>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                      Room {item.roomNo || item.room || 'N/A'} · Bed {item.bedNo || item.bed || 'A'}
                    </p>
                  </div>

                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: 8,
                      background: isApproved ? '#dcfce7' : isRejected ? '#fee2e2' : '#ffedd5',
                      color: isApproved ? '#166534' : isRejected ? '#b91c1c' : '#c2410c'
                    }}
                  >
                    {item.status || 'Pending'}
                  </span>
                </div>

                {/* Date range badge */}
                <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#0891b2' }}>flight_takeoff</span>
                    <div>
                      <p style={{ margin: 0, fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>Departure</p>
                      <p style={{ margin: 0, fontSize: 12.5, fontWeight: 800, color: '#0f172a' }}>{String(fromStr).split('T')[0]}</p>
                    </div>
                  </div>

                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#94a3b8' }}>arrow_forward</span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, textAlign: 'right' }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>Return</p>
                      <p style={{ margin: 0, fontSize: 12.5, fontWeight: 800, color: '#0f172a' }}>{String(toStr).split('T')[0]}</p>
                    </div>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#16a34a' }}>flight_land</span>
                  </div>
                </div>

                {item.reason && (
                  <p style={{ margin: 0, fontSize: 13, color: '#334155' }}>
                    <b>Reason:</b> {item.reason}
                  </p>
                )}

                {/* Emergency Contact */}
                {(item.parentPhone || item.emergencyPhone || item.guardianPhone) && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fefce8', padding: '6px 10px', borderRadius: 8, border: '1px solid #fef08a' }}>
                    <span style={{ fontSize: 11.5, color: '#854d0e', fontWeight: 700 }}>
                      Parent Contact: {item.parentPhone || item.emergencyPhone || item.guardianPhone}
                    </span>
                    <a
                      href={`tel:${item.parentPhone || item.emergencyPhone || item.guardianPhone}`}
                      style={{ fontSize: 11, fontWeight: 800, color: '#16a34a', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2 }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>call</span> Call
                    </a>
                  </div>
                )}

                {/* Action Buttons for Pending */}
                {isPending && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button
                      onClick={() => handleUpdateStatus(item.id, 'Rejected')}
                      disabled={actionLoadingId === item.id}
                      style={{
                        flex: 1,
                        padding: '10px 0',
                        borderRadius: 10,
                        border: '1px solid #fecaca',
                        background: '#fff1f2',
                        color: '#e11d48',
                        fontSize: 12.5,
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                      Reject
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(item.id, 'Approved')}
                      disabled={actionLoadingId === item.id}
                      style={{
                        flex: 1.2,
                        padding: '10px 0',
                        borderRadius: 10,
                        border: 'none',
                        background: '#16a34a',
                        color: '#fff',
                        fontSize: 12.5,
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        boxShadow: '0 2px 6px rgba(22,163,74,0.3)'
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check</span>
                      Approve Leave
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
