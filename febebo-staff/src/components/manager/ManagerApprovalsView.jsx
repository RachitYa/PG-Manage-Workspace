import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export default function ManagerApprovalsView({ adminId, activePgId, assignedProperties = [], onBack, showToast }) {
  const [selectedPgId, setSelectedPgId] = useState(() => activePgId || assignedProperties[0]?.id || 'primary');

  useEffect(() => {
    if (activePgId) setSelectedPgId(activePgId);
  }, [activePgId]);

  const matchesPg = (itemPgId) => {
    if (!selectedPgId || selectedPgId === 'primary') {
      return !itemPgId || itemPgId === 'primary' || itemPgId === adminId;
    }
    return itemPgId === selectedPgId;
  };

  const [roomChanges, setRoomChanges] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('RoomChanges'); // 'RoomChanges' | 'Applications'
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Real-time listeners
  useEffect(() => {
    if (!adminId) return;
    setLoading(true);

    const qRoom = query(collection(db, 'room_change_requests'), where('adminId', '==', adminId));
    const unsubRoom = onSnapshot(qRoom, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(r => matchesPg(r.pgId));
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setRoomChanges(list);
      setLoading(false);
    }, (err) => {
      console.error('Room changes fetch error:', err);
      setLoading(false);
    });

    const qApps = query(collection(db, 'pg_applications'), where('adminId', '==', adminId));
    const unsubApps = onSnapshot(qApps, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(a => matchesPg(a.pgId));
      list.sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0));
      setApplications(list);
    }, (err) => {
      console.error('PG applications fetch error:', err);
    });

    return () => {
      unsubRoom();
      unsubApps();
    };
  }, [adminId, selectedPgId]);

  // Handle Approve Room Change
  const handleApproveRoomChange = async (req) => {
    setActionLoadingId(req.id);
    try {
      await updateDoc(doc(db, 'room_change_requests', req.id), {
        status: 'Approved',
        approvedAt: new Date().toISOString()
      });

      // Update tenant doc if tenantId exists
      const tId = req.tenantId || req.userId;
      if (tId && req.requestedRoom) {
        try {
          await updateDoc(doc(db, 'tenants', tId), {
            roomNo: req.requestedRoom,
            room: req.requestedRoom,
            bedNo: req.requestedBed || 'A',
            bed: req.requestedBed || 'A'
          });
        } catch (e) {}

        try {
          await updateDoc(doc(db, 'users', tId), {
            'subscribedPG.roomNo': req.requestedRoom,
            'subscribedPG.bedNo': req.requestedBed || 'A'
          });
        } catch (e) {}
      }

      showToast?.(`Room change approved! Student moved to Room ${req.requestedRoom}`, 'success');
    } catch (err) {
      console.error('Room change approval error:', err);
      showToast?.('Failed to approve room change', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Reject Room Change
  const handleRejectRoomChange = async (req) => {
    setActionLoadingId(req.id);
    try {
      await updateDoc(doc(db, 'room_change_requests', req.id), {
        status: 'Rejected',
        rejectedAt: new Date().toISOString()
      });
      showToast?.('Room change request rejected', 'success');
    } catch (err) {
      console.error('Room change rejection error:', err);
      showToast?.('Failed to reject room change', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Application Status
  const handleAppStatus = async (app, status) => {
    setActionLoadingId(app.id);
    try {
      await updateDoc(doc(db, 'pg_applications', app.id), {
        status: status,
        reviewedAt: new Date().toISOString()
      });
      showToast?.(`Application marked as ${status}`, 'success');
    } catch (err) {
      console.error('App status error:', err);
      showToast?.('Failed to update application', 'error');
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
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Approvals</h2>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { id: 'RoomChanges', label: `Room Shifts (${roomChanges.filter(r => r.status === 'Pending' || !r.status).length})` },
            { id: 'Applications', label: `Applications (${applications.filter(a => a.status === 'Pending' || !a.status).length})` }
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
                cursor: 'pointer'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTop: '3px solid #0891b2', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Loading Approvals...</p>
          </div>
        ) : activeTab === 'RoomChanges' ? (
          roomChanges.length === 0 ? (
            <div style={{ background: '#fff', border: '1px dashed #cbd5e1', borderRadius: 16, padding: '36px 20px', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#cbd5e1', marginBottom: 8 }}>check_circle</span>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#64748b' }}>No room shift requests</p>
            </div>
          ) : (
            roomChanges.map(r => {
              const isPending = !r.status || r.status === 'Pending';
              return (
                <div
                  key={r.id}
                  style={{
                    background: '#fff',
                    border: '1px solid #e2e8f0',
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
                        {r.studentName || r.name || 'Tenant'}
                      </h4>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                        Current Room: <b>{r.currentRoom || 'N/A'}</b>
                      </p>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: 8,
                        background: isPending ? '#fef3c7' : r.status === 'Approved' ? '#dcfce7' : '#fee2e2',
                        color: isPending ? '#92400e' : r.status === 'Approved' ? '#166534' : '#b91c1c'
                      }}
                    >
                      {r.status || 'Pending'}
                    </span>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 10, border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ fontSize: 10.5, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Requested Room</span>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: '#0891b2' }}>Room {r.requestedRoom || 'N/A'} {r.requestedBed ? `(Bed ${r.requestedBed})` : ''}</p>
                    </div>
                    <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#0891b2' }}>swap_horiz</span>
                  </div>

                  {r.reason && (
                    <p style={{ margin: 0, fontSize: 12.5, color: '#475569' }}>
                      <b>Reason:</b> "{r.reason}"
                    </p>
                  )}

                  {isPending && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <button
                        onClick={() => handleRejectRoomChange(r)}
                        disabled={actionLoadingId === r.id}
                        style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid #fecaca', background: '#fff1f2', color: '#e11d48', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => handleApproveRoomChange(r)}
                        disabled={actionLoadingId === r.id}
                        style={{ flex: 1.2, padding: 10, borderRadius: 10, border: 'none', background: '#16a34a', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
                      >
                        Approve Shift
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )
        ) : (
          applications.length === 0 ? (
            <div style={{ background: '#fff', border: '1px dashed #cbd5e1', borderRadius: 16, padding: '36px 20px', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#cbd5e1', marginBottom: 8 }}>how_to_reg</span>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#64748b' }}>No pending applications</p>
            </div>
          ) : (
            applications.map(app => {
              const isPending = !app.status || app.status === 'Pending';
              return (
                <div
                  key={app.id}
                  style={{
                    background: '#fff',
                    border: '1px solid #e2e8f0',
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
                      <h4 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: '#0f172a' }}>{app.name}</h4>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                        Phone: <b>{app.phone}</b> {app.roomNo ? `· Room ${app.roomNo}` : ''}
                      </p>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: 8,
                        background: isPending ? '#fef3c7' : app.status === 'Approved' ? '#dcfce7' : '#fee2e2',
                        color: isPending ? '#92400e' : app.status === 'Approved' ? '#166534' : '#b91c1c'
                      }}
                    >
                      {app.status || 'Pending'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 8, paddingTop: 4, borderTop: '1px solid #f1f5f9' }}>
                    {app.phone && (
                      <a
                        href={`tel:${app.phone}`}
                        style={{ padding: '7px 12px', borderRadius: 8, background: '#ecfeff', color: '#0891b2', fontSize: 12, fontWeight: 800, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 15 }}>call</span> Call
                      </a>
                    )}
                    {isPending && (
                      <>
                        <button
                          onClick={() => handleAppStatus(app, 'Rejected')}
                          disabled={actionLoadingId === app.id}
                          style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid #fecaca', background: '#fff1f2', color: '#e11d48', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleAppStatus(app, 'Approved')}
                          disabled={actionLoadingId === app.id}
                          style={{ flex: 1.2, padding: 8, borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
                        >
                          Accept
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )
        )}
      </div>
    </div>
  );
}
