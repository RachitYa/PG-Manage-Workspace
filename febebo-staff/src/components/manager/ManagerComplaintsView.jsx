import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const CATEGORIES = ['All', 'Plumbing', 'Electrical', 'Cleaning', 'Food', 'Internet / Wifi', 'Carpentry', 'Others'];

export default function ManagerComplaintsView({ adminId, activePgId, assignedProperties = [], onBack, showToast }) {
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

  const matchesPgStaff = (s) => {
    const cur = selectedPgId || 'primary';
    const assigned = Array.isArray(s.assignedPgs) && s.assignedPgs.length > 0 
      ? s.assignedPgs 
      : [s.pgId || 'primary'];
    if (cur === 'primary') {
      return assigned.includes('primary') || assigned.includes(adminId) || (!s.pgId && (!s.assignedPgs || s.assignedPgs.length === 0));
    }
    return assigned.includes(cur);
  };

  const [complaints, setComplaints] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Active'); // 'Active' | 'Pending' | 'Resolved' | 'All'
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [assigningTicket, setAssigningTicket] = useState(null); // ticket being assigned
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [lightboxImg, setLightboxImg] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [resolutionModalTicket, setResolutionModalTicket] = useState(null);
  const [resolutionRemarks, setResolutionRemarks] = useState('');

  // Real-time listener for complaints & staff
  useEffect(() => {
    if (!adminId) return;
    setLoading(true);

    const qComplaints = query(collection(db, 'complaints'), where('adminId', '==', adminId));
    const unsubComplaints = onSnapshot(qComplaints, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(c => matchesPg(c.pgId));
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setComplaints(list);
      setLoading(false);
    }, (err) => {
      console.error('Complaints fetch error:', err);
      setLoading(false);
    });

    const qStaff = query(collection(db, 'staff_tokens'), where('ownerUid', '==', adminId));
    const unsubStaff = onSnapshot(qStaff, (snap) => {
      setStaffList(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(matchesPgStaff));
    }, (err) => {
      console.error('Staff fetch error:', err);
    });

    return () => {
      unsubComplaints();
      unsubStaff();
    };
  }, [adminId, selectedPgId]);

  // Tab counts
  const activeCount = useMemo(() => complaints.filter(c => c.status === 'Active' || c.status === 'Open' || !c.status).length, [complaints]);
  const pendingCount = useMemo(() => complaints.filter(c => c.status === 'Pending' || c.status === 'In Progress').length, [complaints]);
  const resolvedCount = useMemo(() => complaints.filter(c => c.status === 'Resolved' || c.status === 'Closed').length, [complaints]);

  // Filtered complaints
  const filteredComplaints = useMemo(() => {
    return complaints.filter(c => {
      const st = c.status || 'Active';
      if (activeTab === 'Active') {
        if (st !== 'Active' && st !== 'Open') return false;
      } else if (activeTab === 'Pending') {
        if (st !== 'Pending' && st !== 'In Progress') return false;
      } else if (activeTab === 'Resolved') {
        if (st !== 'Resolved' && st !== 'Closed') return false;
      }

      if (selectedCategory !== 'All') {
        const cat = c.category || c.subCategory || 'Others';
        if (!cat.toLowerCase().includes(selectedCategory.toLowerCase())) return false;
      }
      return true;
    });
  }, [complaints, activeTab, selectedCategory]);

  // Handle Assign Staff
  const handleAssignStaff = async () => {
    if (!assigningTicket || !selectedStaffId) return;
    setActionLoading(true);
    try {
      const staffMember = staffList.find(s => s.id === selectedStaffId);
      const staffName = staffMember?.name || 'Staff Member';
      const staffRole = staffMember?.role || 'Technician';

      await updateDoc(doc(db, 'complaints', assigningTicket.id), {
        assignedTo: selectedStaffId,
        assignedToName: staffName,
        assignedToRole: staffRole,
        assignedAt: new Date().toISOString(),
        status: 'In Progress'
      });

      // Also create a staff_task for the assigned staff
      await addDoc(collection(db, 'staff_tasks'), {
        adminId,
        ownerUid: adminId,
        pgId: selectedPgId || assigningTicket.pgId || 'primary',
        staffId: selectedStaffId,
        assignedTo: selectedStaffId,
        staffName,
        staffRole,
        title: `Repair: ${assigningTicket.title || assigningTicket.category || 'Maintenance'} (Room ${assigningTicket.roomNumber || assigningTicket.roomNo || 'N/A'})`,
        description: assigningTicket.description || '',
        complaintId: assigningTicket.id,
        status: 'Pending',
        priority: assigningTicket.priority || 'Medium',
        assignedDate: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });

      showToast?.(`Ticket assigned to ${staffName} (${staffRole})`, 'success');
      setAssigningTicket(null);
      setSelectedStaffId('');
    } catch (err) {
      console.error('Error assigning staff:', err);
      showToast?.('Failed to assign ticket', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Update Status to Resolved
  const handleResolveTicket = async () => {
    if (!resolutionModalTicket) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'complaints', resolutionModalTicket.id), {
        status: 'Resolved',
        resolvedAt: new Date().toISOString(),
        resolutionRemarks: resolutionRemarks || 'Resolved by Manager'
      });

      showToast?.('Complaint marked as Resolved ✅', 'success');
      setResolutionModalTicket(null);
      setResolutionRemarks('');
    } catch (err) {
      console.error('Error resolving complaint:', err);
      showToast?.('Failed to resolve complaint', 'error');
    } finally {
      setActionLoading(false);
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
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Complaints</h2>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {[
            { id: 'Active', label: `Active (${activeCount})`, color: '#e11d48' },
            { id: 'Pending', label: `In Progress (${pendingCount})`, color: '#d97706' },
            { id: 'Resolved', label: `Resolved (${resolvedCount})`, color: '#16a34a' },
            { id: 'All', label: `All (${complaints.length})`, color: '#475569' }
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

        {/* Category Filters */}
        <div style={{ display: 'flex', gap: 6, marginTop: 10, overflowX: 'auto', paddingBottom: 2 }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '5px 10px',
                borderRadius: 8,
                border: 'none',
                background: selectedCategory === cat ? '#e0f2fe' : '#f8fafc',
                color: selectedCategory === cat ? '#0369a1' : '#64748b',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Complaints List */}
      <div style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTop: '3px solid #0891b2', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Loading Complaints...</p>
          </div>
        ) : filteredComplaints.length === 0 ? (
          <div style={{ background: '#fff', border: '1px dashed #cbd5e1', borderRadius: 16, padding: '36px 20px', textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#cbd5e1', marginBottom: 8 }}>task_alt</span>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#64748b' }}>No complaints here</p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>All maintenance requests for this view are clear</p>
          </div>
        ) : (
          filteredComplaints.map(item => {
            const isResolved = item.status === 'Resolved' || item.status === 'Closed';
            const isProgress = item.status === 'In Progress' || item.status === 'Pending';
            const isHighPriority = item.priority === 'High';

            return (
              <div
                key={item.id}
                style={{
                  background: '#fff',
                  border: `1.5px solid ${isResolved ? '#bbf7d0' : isHighPriority ? '#fecaca' : '#e2e8f0'}`,
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          padding: '2px 6px',
                          borderRadius: 6,
                          background: item.category === 'Plumbing' ? '#cffafe' : item.category === 'Electrical' ? '#fef3c7' : '#ede9fe',
                          color: item.category === 'Plumbing' ? '#0891b2' : item.category === 'Electrical' ? '#92400e' : '#6d28d9',
                          textTransform: 'uppercase'
                        }}
                      >
                        {item.category || item.subCategory || 'General'}
                      </span>
                      {isHighPriority && (
                        <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 6, background: '#fee2e2', color: '#b91c1c' }}>
                          ⚡ High Priority
                        </span>
                      )}
                    </div>
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: '#0f172a' }}>
                      {item.title || item.issue || 'Maintenance Request'}
                    </h4>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                      By {item.studentName || item.userName || 'Student'} · Room {item.roomNumber || item.roomNo || 'N/A'}
                    </p>
                  </div>

                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: 8,
                      background: isResolved ? '#dcfce7' : isProgress ? '#fef3c7' : '#fee2e2',
                      color: isResolved ? '#166534' : isProgress ? '#92400e' : '#b91c1c'
                    }}
                  >
                    {item.status || 'Active'}
                  </span>
                </div>

                {item.description && (
                  <p style={{ margin: 0, fontSize: 13, color: '#334155', background: '#f8fafc', padding: '8px 10px', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                    {item.description}
                  </p>
                )}

                {/* Photo if attached */}
                {item.photo && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <img
                      src={item.photo}
                      alt="Complaint attachment"
                      onClick={() => setLightboxImg(item.photo)}
                      style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover', cursor: 'pointer', border: '1px solid #e2e8f0' }}
                    />
                    <span style={{ fontSize: 11, color: '#64748b' }}>Tap photo to expand</span>
                  </div>
                )}

                {/* Assigned Staff Notice */}
                {item.assignedToName && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#475569', background: '#f1f5f9', padding: '5px 8px', borderRadius: 6 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#0891b2' }}>engineering</span>
                    <span>Assigned to: <b>{item.assignedToName}</b> ({item.assignedToRole || 'Staff'})</span>
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, paddingTop: 4, borderTop: '1px solid #f1f5f9' }}>
                  {item.studentPhone && (
                    <a
                      href={`tel:${item.studentPhone}`}
                      style={{
                        padding: '7px 12px',
                        borderRadius: 8,
                        background: '#ecfeff',
                        color: '#0891b2',
                        fontSize: 12,
                        fontWeight: 800,
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 15 }}>call</span> Call
                    </a>
                  )}

                  {!isResolved && (
                    <>
                      <button
                        onClick={() => {
                          setAssigningTicket(item);
                          setSelectedStaffId(item.assignedTo || '');
                        }}
                        style={{
                          flex: 1,
                          padding: '7px 0',
                          borderRadius: 8,
                          background: '#f8fafc',
                          color: '#334155',
                          border: '1px solid #cbd5e1',
                          fontSize: 12,
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 15 }}>person_add</span>
                        {item.assignedTo ? 'Reassign' : 'Assign Staff'}
                      </button>

                      <button
                        onClick={() => setResolutionModalTicket(item)}
                        style={{
                          flex: 1,
                          padding: '7px 0',
                          borderRadius: 8,
                          background: '#dcfce7',
                          color: '#166534',
                          border: '1px solid #bbf7d0',
                          fontSize: 12,
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 15 }}>check_circle</span>
                        Resolve
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Assign Staff Modal ── */}
      {assigningTicket && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 110, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 20, width: '100%', maxWidth: 380 }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 900, color: '#0f172a' }}>Assign Maintenance Staff</h3>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: '#64748b' }}>
              Assign ticket for <b>Room {assigningTicket.roomNumber || assigningTicket.roomNo || 'N/A'}</b>
            </p>

            <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Select Available Staff Member</label>
            <select
              value={selectedStaffId}
              onChange={e => setSelectedStaffId(e.target.value)}
              style={{ width: '100%', marginTop: 6, marginBottom: 16, padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700, background: '#fff' }}
            >
              <option value="">-- Choose Staff Member --</option>
              {staffList.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.role || 'Staff'}) {s.phone ? `· ${s.phone}` : ''}
                </option>
              ))}
            </select>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setAssigningTicket(null)} style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', fontWeight: 800, color: '#64748b', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleAssignStaff} disabled={!selectedStaffId || actionLoading} style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: '#0891b2', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
                {actionLoading ? 'Assigning...' : 'Assign & Notify'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Resolve Modal ── */}
      {resolutionModalTicket && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 110, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 20, width: '100%', maxWidth: 380 }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 900, color: '#0f172a' }}>Complete & Resolve Issue</h3>
            <p style={{ margin: '0 0 14px', fontSize: 12, color: '#64748b' }}>
              Mark complaint for <b>Room {resolutionModalTicket.roomNumber || resolutionModalTicket.roomNo || 'N/A'}</b> as resolved.
            </p>

            <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Resolution Notes / Remarks</label>
            <textarea
              rows={3}
              placeholder="e.g. Tap repaired, pipe replaced, power switch fixed..."
              value={resolutionRemarks}
              onChange={e => setResolutionRemarks(e.target.value)}
              style={{ width: '100%', marginTop: 6, marginBottom: 16, padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 13, resize: 'none' }}
            />

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setResolutionModalTicket(null)} style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', fontWeight: 800, color: '#64748b', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleResolveTicket} disabled={actionLoading} style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
                {actionLoading ? 'Saving...' : 'Confirm Resolved ✅'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Photo Lightbox ── */}
      {lightboxImg && (
        <div onClick={() => setLightboxImg(null)} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <img src={lightboxImg} alt="Attachment Fullscreen" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 12, objectFit: 'contain' }} />
        </div>
      )}
    </div>
  );
}
