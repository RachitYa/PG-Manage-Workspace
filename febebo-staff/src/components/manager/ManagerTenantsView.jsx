import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export default function ManagerTenantsView({ adminId, activePgId, assignedProperties = [], onBack, onAddTenant, showToast }) {
  const [selectedPgId, setSelectedPgId] = useState(() => activePgId || assignedProperties[0]?.id || 'primary');
  const [showAddOptionsModal, setShowAddOptionsModal] = useState(false);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Current'); // 'Current' | 'Notice' | 'MovedOut' | 'All'
  const [search, setSearch] = useState('');
  const [selectedTenant, setSelectedTenant] = useState(null); // Detail modal
  const [noticeModalTenant, setNoticeModalTenant] = useState(null); // Notice modal
  const [noticeDate, setNoticeDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [noticeRemarks, setNoticeRemarks] = useState('');
  const [editRoomModalTenant, setEditRoomModalTenant] = useState(null);
  const [editRoomVal, setEditRoomVal] = useState('');
  const [editBedVal, setEditBedVal] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Real-time listener for tenants
  useEffect(() => {
    if (!adminId) return;
    setLoading(true);
    const qTenants = query(collection(db, 'tenants'), where('adminId', '==', adminId));
    const unsub = onSnapshot(qTenants, async (snap) => {
      const rawList = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Enrich with user profile data if available
      const enriched = await Promise.all(rawList.map(async (t) => {
        try {
          const uid = t.tenantId || t.id;
          if (uid) {
            const uDoc = await getDoc(doc(db, 'users', uid));
            if (uDoc.exists()) {
              const uData = uDoc.data();
              return {
                ...t,
                name: uData.name || uData.displayName || t.name || 'Tenant',
                phone: uData.phone || t.phone || '',
                email: uData.email || t.email || '',
                image: uData.kyc?.profilePhoto || uData.photoURL || t.image || null,
                roomNo: uData.subscribedPG?.roomNo || t.roomNo || t.room || '',
                bedNo: uData.subscribedPG?.bedNo || t.bedNo || t.bed || 'A',
                guardianName: uData.guardianName || uData.parentName || t.guardianName || '',
                guardianPhone: uData.guardianPhone || uData.parentPhone || t.guardianPhone || '',
                college: uData.college || uData.workplace || t.college || '',
                joiningDate: uData.subscribedPG?.joiningDate || t.joiningDate || t.createdAt || '',
                serviceType: uData.subscribedPG?.serviceType || t.serviceType || 'all_services',
                foodIncluded: uData.subscribedPG?.foodIncluded !== false && t.foodIncluded !== false,
              };
            }
          }
        } catch (e) {
          // silently fallback
        }
        return t;
      }));

      const pgFiltered = enriched.filter(t => {
        if (!t.pgId || t.pgId === 'primary') return selectedPgId === 'primary';
        return t.pgId === selectedPgId;
      });

      setTenants(pgFiltered);
      setLoading(false);
    }, (err) => {
      console.error('ManagerTenantsView error:', err);
      setLoading(false);
    });

    return () => unsub();
  }, [adminId, selectedPgId]);

  // Tab counts
  const currentCount = useMemo(() => tenants.filter(t => t.status === 'Approved' || t.status === 'Current User' || !t.status).length, [tenants]);
  const noticeCount = useMemo(() => tenants.filter(t => t.status === 'Notice' || t.status === 'On Notice Period').length, [tenants]);
  const movedOutCount = useMemo(() => tenants.filter(t => t.status === 'Moved Out' || t.status === 'Exited').length, [tenants]);

  // Filtered tenants
  const filteredTenants = useMemo(() => {
    return tenants.filter(t => {
      const s = t.status;
      if (activeTab === 'Current') {
        if (s === 'Moved Out' || s === 'Exited' || s === 'Notice' || s === 'On Notice Period') return false;
      } else if (activeTab === 'Notice') {
        if (s !== 'Notice' && s !== 'On Notice Period') return false;
      } else if (activeTab === 'MovedOut') {
        if (s !== 'Moved Out' && s !== 'Exited') return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = (t.name || '').toLowerCase().includes(q);
        const matchesRoom = (t.roomNo || t.room || '').toLowerCase().includes(q);
        const matchesPhone = (t.phone || '').includes(q);
        return matchesName || matchesRoom || matchesPhone;
      }
      return true;
    });
  }, [tenants, activeTab, search]);

  // Handle Mark Notice
  const handleMarkNotice = async () => {
    if (!noticeModalTenant) return;
    setActionLoading(true);
    try {
      const tId = noticeModalTenant.id;
      const uid = noticeModalTenant.tenantId || tId;

      await updateDoc(doc(db, 'tenants', tId), {
        status: 'Notice',
        noticeDate: noticeDate,
        noticeRemarks: noticeRemarks,
        noticeGivenAt: new Date().toISOString()
      });

      if (uid) {
        try {
          await updateDoc(doc(db, 'users', uid), {
            'subscribedPG.status': 'Notice',
            'subscribedPG.noticeDate': noticeDate
          });
        } catch (e) {}
      }

      showToast?.(`Tenant ${noticeModalTenant.name} is now on Notice until ${noticeDate}`, 'success');
      setNoticeModalTenant(null);
    } catch (err) {
      console.error('Error marking notice:', err);
      showToast?.('Failed to update notice status', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Move Out
  const handleMoveOut = async (t) => {
    if (!window.confirm(`Are you sure you want to mark ${t.name || 'this tenant'} as Moved Out?`)) return;
    setActionLoading(true);
    try {
      const tId = t.id;
      const uid = t.tenantId || tId;
      const moveOutDate = new Date().toISOString().split('T')[0];

      await updateDoc(doc(db, 'tenants', tId), {
        status: 'Moved Out',
        moveOutDate: moveOutDate
      });

      if (uid) {
        try {
          await updateDoc(doc(db, 'users', uid), {
            'subscribedPG.status': 'Moved Out',
            'subscribedPG.moveOutDate': moveOutDate
          });
        } catch (e) {}
      }

      showToast?.(`${t.name} moved out successfully`, 'success');
      if (selectedTenant?.id === tId) setSelectedTenant(null);
    } catch (err) {
      console.error('Move out error:', err);
      showToast?.('Failed to mark move out', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Room / Bed Shift
  const handleSaveRoomBed = async () => {
    if (!editRoomModalTenant) return;
    setActionLoading(true);
    try {
      const tId = editRoomModalTenant.id;
      const uid = editRoomModalTenant.tenantId || tId;

      await updateDoc(doc(db, 'tenants', tId), {
        roomNo: editRoomVal,
        room: editRoomVal,
        bedNo: editBedVal,
        bed: editBedVal
      });

      if (uid) {
        try {
          await updateDoc(doc(db, 'users', uid), {
            'subscribedPG.roomNo': editRoomVal,
            'subscribedPG.bedNo': editBedVal
          });
        } catch (e) {}
      }

      showToast?.(`Room updated to ${editRoomVal} (Bed ${editBedVal})`, 'success');
      setEditRoomModalTenant(null);
    } catch (err) {
      console.error('Error updating room:', err);
      showToast?.('Failed to update room details', 'error');
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
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>Manage Tenants</h2>
              <p style={{ margin: 0, fontSize: 11, color: '#64748b', fontWeight: 600 }}>Directory · {assignedProperties.find(p => p.id === selectedPgId)?.name || 'Primary PG'}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {assignedProperties && assignedProperties.length > 1 && (
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedPgId}
                  onChange={e => setSelectedPgId(e.target.value)}
                  style={{
                    background: '#f8fafc',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: 20,
                    padding: '6px 26px 6px 10px',
                    fontSize: 11.5,
                    fontWeight: 800,
                    color: '#0f172a',
                    outline: 'none',
                    appearance: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {assignedProperties.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined" style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: '#64748b', pointerEvents: 'none' }}>
                  expand_more
                </span>
              </div>
            )}
            {onAddTenant && (
              <button
                onClick={() => setShowAddOptionsModal(true)}
                style={{
                  background: '#0891b2',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '8px 14px',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  boxShadow: '0 2px 6px rgba(8,145,178,0.25)'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>person_add</span>
                Add Student
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '8px 12px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#94a3b8' }}>search</span>
          <input
            type="text"
            placeholder="Search tenant by name, room, phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: 13, fontWeight: 600, color: '#0f172a' }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#94a3b8' }}>close</span>
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginTop: 12, overflowX: 'auto', paddingBottom: 2 }}>
          {[
            { id: 'Current', label: `Active (${currentCount})` },
            { id: 'Notice', label: `Notice (${noticeCount})` },
            { id: 'MovedOut', label: `Moved Out (${movedOutCount})` },
            { id: 'All', label: `All (${tenants.length})` }
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

      {/* Tenant List */}
      <div style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTop: '3px solid #0891b2', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Loading Tenants...</p>
          </div>
        ) : filteredTenants.length === 0 ? (
          <div style={{ background: '#fff', border: '1px dashed #cbd5e1', borderRadius: 16, padding: '36px 20px', textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#cbd5e1', marginBottom: 8 }}>group_off</span>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#64748b' }}>No tenants found</p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>{search ? 'Try clearing your search query' : 'Add your first tenant to get started'}</p>
          </div>
        ) : (
          filteredTenants.map(t => {
            const isNotice = t.status === 'Notice' || t.status === 'On Notice Period';
            const isMovedOut = t.status === 'Moved Out' || t.status === 'Exited';
            const isRoomOnly = t.serviceType === 'only_room';

            return (
              <div
                key={t.id}
                style={{
                  background: '#fff',
                  border: `1.5px solid ${isNotice ? '#fecaca' : isMovedOut ? '#e2e8f0' : '#f1f5f9'}`,
                  borderRadius: 16,
                  padding: 14,
                  boxShadow: '0 3px 10px rgba(15,23,42,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 14, background: '#f1f5f9', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {t.image ? (
                        <img src={t.image} alt={t.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span className="material-symbols-outlined" style={{ fontSize: 26, color: '#94a3b8' }}>person</span>
                      )}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <h4 style={{ margin: 0, fontSize: 14.5, fontWeight: 900, color: '#0f172a' }}>{t.name || 'Tenant'}</h4>
                        {isNotice && (
                          <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 6, background: '#fee2e2', color: '#b91c1c' }}>Notice</span>
                        )}
                        {isMovedOut && (
                          <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 6, background: '#f1f5f9', color: '#64748b' }}>Exited</span>
                        )}
                      </div>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                        Room {t.roomNo || t.room || 'N/A'} · Bed {t.bedNo || t.bed || 'A'}
                      </p>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: 8,
                        background: isRoomOnly ? '#fef3c7' : '#ecfdf5',
                        color: isRoomOnly ? '#92400e' : '#065f46',
                        display: 'inline-block'
                      }}
                    >
                      {isRoomOnly ? 'Room Only' : 'All PG Services'}
                    </span>
                  </div>
                </div>

                {/* Info row */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 11, color: '#64748b' }}>
                  {t.phone && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f8fafc', padding: '3px 8px', borderRadius: 6 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 13 }}>phone</span> {t.phone}
                    </span>
                  )}
                  {t.foodIncluded !== undefined && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f8fafc', padding: '3px 8px', borderRadius: 6 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 13 }}>restaurant</span> {t.foodIncluded ? 'Mess Included' : 'No Food'}
                    </span>
                  )}
                  {t.joiningDate && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f8fafc', padding: '3px 8px', borderRadius: 6 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 13 }}>calendar_today</span> Joined {String(t.joiningDate).split('T')[0]}
                    </span>
                  )}
                </div>

                {/* Action Bar */}
                <div style={{ display: 'flex', gap: 8, paddingTop: 6, borderTop: '1px solid #f1f5f9' }}>
                  {t.phone && (
                    <a
                      href={`tel:${t.phone}`}
                      style={{
                        flex: 1,
                        padding: '7px 0',
                        borderRadius: 8,
                        background: '#ecfeff',
                        color: '#0891b2',
                        border: '1px solid #cffafe',
                        fontSize: 12,
                        fontWeight: 800,
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 15 }}>call</span> Call
                    </a>
                  )}
                  {t.phone && (
                    <a
                      href={`https://wa.me/${t.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        flex: 1,
                        padding: '7px 0',
                        borderRadius: 8,
                        background: '#f0fdf4',
                        color: '#16a34a',
                        border: '1px solid #bbf7d0',
                        fontSize: 12,
                        fontWeight: 800,
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 15 }}>chat</span> WhatsApp
                    </a>
                  )}

                  <button
                    onClick={() => setSelectedTenant(t)}
                    style={{
                      flex: 1,
                      padding: '7px 0',
                      borderRadius: 8,
                      background: '#f8fafc',
                      color: '#334155',
                      border: '1px solid #e2e8f0',
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>info</span> Details
                  </button>

                  {!isMovedOut && (
                    <button
                      onClick={() => {
                        setEditRoomModalTenant(t);
                        setEditRoomVal(t.roomNo || t.room || '');
                        setEditBedVal(t.bedNo || t.bed || 'A');
                      }}
                      style={{
                        padding: '7px 10px',
                        borderRadius: 8,
                        background: '#fdf4ff',
                        color: '#c026d3',
                        border: '1px solid #f5d0fe',
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 15 }}>sync_alt</span> Shift
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Detail Modal ── */}
      {selectedTenant && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: 480, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: '20px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: '#0f172a' }}>Tenant Profile</h3>
              <button onClick={() => setSelectedTenant(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: '#f1f5f9', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {selectedTenant.image ? (
                  <img src={selectedTenant.image} alt={selectedTenant.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#94a3b8' }}>person</span>
                )}
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: '#0f172a' }}>{selectedTenant.name}</h4>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b', fontWeight: 600 }}>
                  Room {selectedTenant.roomNo || selectedTenant.room || 'N/A'} · Bed {selectedTenant.bedNo || selectedTenant.bed || 'A'}
                </p>
                <span style={{ fontSize: 11, fontWeight: 800, color: selectedTenant.serviceType === 'only_room' ? '#d97706' : '#059669' }}>
                  {selectedTenant.serviceType === 'only_room' ? 'Room Only Service' : 'All PG Services Included'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>
                <span style={{ color: '#64748b' }}>Phone</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{selectedTenant.phone || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>
                <span style={{ color: '#64748b' }}>Guardian Phone</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{selectedTenant.guardianPhone || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>
                <span style={{ color: '#64748b' }}>College / Workplace</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{selectedTenant.college || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>
                <span style={{ color: '#64748b' }}>Food / Mess</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{selectedTenant.foodIncluded ? 'Included' : 'Self-Cooking / Not Included'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>
                <span style={{ color: '#64748b' }}>Joining Date</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{String(selectedTenant.joiningDate || 'N/A').split('T')[0]}</span>
              </div>
              {selectedTenant.noticeDate && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>
                  <span style={{ color: '#b91c1c' }}>Notice End Date</span>
                  <span style={{ fontWeight: 800, color: '#b91c1c' }}>{selectedTenant.noticeDate}</span>
                </div>
              )}
            </div>

            {/* Operational Actions */}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              {selectedTenant.status !== 'Moved Out' && selectedTenant.status !== 'Exited' && (
                <>
                  <button
                    onClick={() => {
                      setNoticeModalTenant(selectedTenant);
                      setSelectedTenant(null);
                    }}
                    style={{ flex: 1, padding: '12px', background: '#fff1f2', color: '#e11d48', border: '1px solid #fecaca', borderRadius: 12, fontSize: 13, fontWeight: 800, cursor: 'pointer' }}
                  >
                    Mark Notice
                  </button>
                  <button
                    onClick={() => handleMoveOut(selectedTenant)}
                    style={{ flex: 1, padding: '12px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 800, cursor: 'pointer' }}
                  >
                    Move Out
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Notice Modal ── */}
      {noticeModalTenant && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 110, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 20, width: '100%', maxWidth: 380 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 900, color: '#0f172a' }}>Put Tenant on Notice</h3>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: '#64748b' }}>
              Setting notice for <b>{noticeModalTenant.name}</b> (Room {noticeModalTenant.roomNo}).
            </p>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Notice End Date</label>
              <input
                type="date"
                value={noticeDate}
                onChange={e => setNoticeDate(e.target.value)}
                style={{ width: '100%', marginTop: 4, padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700 }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Remarks (Optional)</label>
              <input
                type="text"
                placeholder="Reason or notes..."
                value={noticeRemarks}
                onChange={e => setNoticeRemarks(e.target.value)}
                style={{ width: '100%', marginTop: 4, padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 13 }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setNoticeModalTenant(null)} style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', fontWeight: 800, color: '#64748b', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleMarkNotice} disabled={actionLoading} style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: '#e11d48', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
                {actionLoading ? 'Saving...' : 'Confirm Notice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Room & Bed Modal ── */}
      {editRoomModalTenant && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 110, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 20, width: '100%', maxWidth: 380 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 900, color: '#0f172a' }}>Shift Room & Bed</h3>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: '#64748b' }}>
              Assign new room or bed for <b>{editRoomModalTenant.name}</b>.
            </p>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Room Number</label>
              <input
                type="text"
                placeholder="e.g. 101, 204"
                value={editRoomVal}
                onChange={e => setEditRoomVal(e.target.value)}
                style={{ width: '100%', marginTop: 4, padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700 }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Bed Designation</label>
              <input
                type="text"
                placeholder="e.g. A, B, 1, 2"
                value={editBedVal}
                onChange={e => setEditBedVal(e.target.value)}
                style={{ width: '100%', marginTop: 4, padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700 }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setEditRoomModalTenant(null)} style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', fontWeight: 800, color: '#64748b', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSaveRoomBed} disabled={actionLoading} style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: '#0891b2', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
                {actionLoading ? 'Saving...' : 'Save Shift'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Add Student Options Modal (Apple Style) */}
      {showAddOptionsModal && (
        <div
          onClick={() => setShowAddOptionsModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: 0
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#ffffff',
              width: '100%',
              maxWidth: 480,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: '24px 20px 36px',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>Add Student</h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Choose enrollment type for {assignedProperties.find(p => p.id === selectedPgId)?.name || 'Primary PG'}</p>
              </div>
              <button
                onClick={() => setShowAddOptionsModal(false)}
                style={{
                  border: 'none',
                  background: '#f1f5f9',
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#475569'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => {
                  setShowAddOptionsModal(false);
                  onAddTenant && onAddTenant('new');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '16px',
                  borderRadius: 16,
                  border: '1.5px solid #e2e8f0',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#ecfeff', color: '#0891b2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 24 }}>person_add</span>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>New Admission</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>New student onboarding with advance / token payment</p>
                </div>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#94a3b8' }}>chevron_right</span>
              </button>

              <button
                onClick={() => {
                  setShowAddOptionsModal(false);
                  onAddTenant && onAddTenant('already');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '16px',
                  borderRadius: 16,
                  border: '1.5px solid #e2e8f0',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#ede9fe', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 24 }}>home_work</span>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Already a Resident</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>Existing tenant living in PG with past dues & inventory</p>
                </div>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#94a3b8' }}>chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
