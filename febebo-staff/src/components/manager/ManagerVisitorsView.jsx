import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export default function ManagerVisitorsView({ adminId, activePgId, assignedProperties = [], onBack, showToast }) {
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

  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Inside'); // 'Inside' | 'History'
  const [showLogModal, setShowLogModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const [visName, setVisName] = useState('');
  const [visPhone, setVisPhone] = useState('');
  const [visRoom, setVisRoom] = useState('');
  const [visPurpose, setVisPurpose] = useState('Meeting Student');
  const [visVehicle, setVisVehicle] = useState('');

  // Real-time listener for visitors
  useEffect(() => {
    if (!adminId) return;
    setLoading(true);

    const qVis = query(collection(db, 'visitors'), where('adminId', '==', adminId));
    const unsub = onSnapshot(qVis, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(v => matchesPg(v.pgId));
      list.sort((a, b) => new Date(b.createdAt || b.checkInTime || 0) - new Date(a.createdAt || a.checkInTime || 0));
      setVisitors(list);
      setLoading(false);
    }, (err) => {
      console.error('Visitors fetch error:', err);
      setLoading(false);
    });

    return () => unsub();
  }, [adminId, selectedPgId]);

  // Counts
  const insideCount = useMemo(() => visitors.filter(v => v.status === 'Inside').length, [visitors]);
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTotalCount = useMemo(() => visitors.filter(v => String(v.createdAt || v.checkInTime || '').startsWith(todayStr)).length, [visitors, todayStr]);

  // Filtered
  const filteredVisitors = useMemo(() => {
    if (activeTab === 'Inside') {
      return visitors.filter(v => v.status === 'Inside');
    }
    return visitors;
  }, [visitors, activeTab]);

  // Handle Log Visitor
  const handleLogVisitor = async (e) => {
    e.preventDefault();
    if (!visName.trim() || !visPhone.trim()) {
      showToast?.('Please enter visitor name and phone', 'warning');
      return;
    }
    setActionLoading(true);
    try {
      const nowIso = new Date().toISOString();
      await addDoc(collection(db, 'visitors'), {
        adminId,
        pgId: selectedPgId || 'primary',
        name: visName.trim(),
        phone: visPhone.trim(),
        roomNo: visRoom.trim(),
        purpose: visPurpose,
        vehicleNo: visVehicle.trim(),
        status: 'Inside',
        checkInTime: nowIso,
        createdAt: nowIso
      });

      showToast?.(`Visitor ${visName} logged in!`, 'success');
      setShowLogModal(false);
      setVisName('');
      setVisPhone('');
      setVisRoom('');
      setVisVehicle('');
    } catch (err) {
      console.error('Error logging visitor:', err);
      showToast?.('Failed to log visitor', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Mark Out
  const handleMarkOut = async (visitor) => {
    try {
      await updateDoc(doc(db, 'visitors', visitor.id), {
        status: 'Checked Out',
        checkOutTime: new Date().toISOString()
      });
      showToast?.(`${visitor.name} marked as Checked Out`, 'success');
    } catch (err) {
      console.error('Error marking out:', err);
      showToast?.('Failed to check out visitor', 'error');
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
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Visitors</h2>
            </div>
          </div>
          <button
            onClick={() => setShowLogModal(true)}
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
            Log Visitor
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div style={{ background: '#ecfdf5', borderRadius: 12, padding: '10px 14px', border: '1px solid #a7f3d0' }}>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#047857' }}>{insideCount}</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 800, color: '#047857', textTransform: 'uppercase' }}>Currently Inside</p>
          </div>
          <div style={{ background: '#f8fafc', borderRadius: 12, padding: '10px 14px', border: '1px solid #e2e8f0' }}>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#334155' }}>{todayTotalCount}</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Total Today</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { id: 'Inside', label: `Inside PG (${insideCount})` },
            { id: 'History', label: `All History (${visitors.length})` }
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

      {/* Visitor List */}
      <div style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTop: '3px solid #0891b2', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Loading Visitors...</p>
          </div>
        ) : filteredVisitors.length === 0 ? (
          <div style={{ background: '#fff', border: '1px dashed #cbd5e1', borderRadius: 16, padding: '36px 20px', textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#cbd5e1', marginBottom: 8 }}>door_front</span>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#64748b' }}>No visitors found</p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>{activeTab === 'Inside' ? 'No guests are currently registered inside' : 'No visitor records logged'}</p>
          </div>
        ) : (
          filteredVisitors.map(vis => {
            const isInside = vis.status === 'Inside';
            const inTimeStr = vis.checkInTime ? new Date(vis.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            const outTimeStr = vis.checkOutTime ? new Date(vis.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            const dateStr = vis.checkInTime ? new Date(vis.checkInTime).toLocaleDateString([], { day: 'numeric', month: 'short' }) : '';

            return (
              <div
                key={vis.id}
                style={{
                  background: '#fff',
                  border: `1.5px solid ${isInside ? '#bbf7d0' : '#e2e8f0'}`,
                  borderRadius: 16,
                  padding: 14,
                  boxShadow: '0 3px 10px rgba(15,23,42,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: isInside ? '#ecfdf5' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 22, color: isInside ? '#059669' : '#64748b' }}>
                        {isInside ? 'person_pin' : 'person'}
                      </span>
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: '#0f172a' }}>{vis.name}</h4>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                        Visiting Room: <b>{vis.roomNo || 'N/A'}</b> {vis.purpose ? `· ${vis.purpose}` : ''}
                      </p>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: 8,
                      background: isInside ? '#dcfce7' : '#f1f5f9',
                      color: isInside ? '#166534' : '#64748b'
                    }}
                  >
                    {isInside ? '🟢 Inside' : '⚪ Out'}
                  </span>
                </div>

                {/* Details */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 11.5, color: '#475569' }}>
                  <span style={{ background: '#f8fafc', padding: '4px 8px', borderRadius: 6 }}>
                    🕒 In: {dateStr} {inTimeStr}
                  </span>
                  {outTimeStr && (
                    <span style={{ background: '#f8fafc', padding: '4px 8px', borderRadius: 6 }}>
                      🚪 Out: {outTimeStr}
                    </span>
                  )}
                  {vis.vehicleNo && (
                    <span style={{ background: '#f8fafc', padding: '4px 8px', borderRadius: 6 }}>
                      🚗 {vis.vehicleNo}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, paddingTop: 6, borderTop: '1px solid #f1f5f9' }}>
                  {vis.phone && (
                    <a
                      href={`tel:${vis.phone}`}
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
                      <span className="material-symbols-outlined" style={{ fontSize: 15 }}>call</span> Call ({vis.phone})
                    </a>
                  )}

                  {isInside && (
                    <button
                      onClick={() => handleMarkOut(vis)}
                      style={{
                        flex: 1,
                        padding: '7px 12px',
                        borderRadius: 8,
                        background: '#fee2e2',
                        color: '#991b1b',
                        border: 'none',
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 15 }}>logout</span>
                      Mark Exit / Out
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Log Visitor Modal ── */}
      {showLogModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <form onSubmit={handleLogVisitor} style={{ background: '#fff', borderRadius: 20, padding: 20, width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: '#0f172a' }}>Log New Gate Entry</h3>
              <button type="button" onClick={() => setShowLogModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, width: 30, height: 30, cursor: 'pointer' }}>✕</button>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Visitor Name *</label>
              <input
                type="text"
                required
                placeholder="Full Name"
                value={visName}
                onChange={e => setVisName(e.target.value)}
                style={{ width: '100%', marginTop: 4, padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Phone Number *</label>
              <input
                type="tel"
                required
                placeholder="10-digit mobile"
                value={visPhone}
                onChange={e => setVisPhone(e.target.value)}
                style={{ width: '100%', marginTop: 4, padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700 }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Visiting Room</label>
                <input
                  type="text"
                  placeholder="e.g. 102"
                  value={visRoom}
                  onChange={e => setVisRoom(e.target.value)}
                  style={{ width: '100%', marginTop: 4, padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Purpose</label>
                <select
                  value={visPurpose}
                  onChange={e => setVisPurpose(e.target.value)}
                  style={{ width: '100%', marginTop: 4, padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 12, fontWeight: 700, background: '#fff' }}
                >
                  <option value="Meeting Student">Meeting Student</option>
                  <option value="Delivery / Courier">Delivery / Courier</option>
                  <option value="Parent / Family">Parent / Family</option>
                  <option value="Maintenance / Service">Maintenance</option>
                  <option value="Enquiry / Visit">New Enquiry</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Vehicle Number (Optional)</label>
              <input
                type="text"
                placeholder="e.g. DL 01 AB 1234"
                value={visVehicle}
                onChange={e => setVisVehicle(e.target.value)}
                style={{ width: '100%', marginTop: 4, padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 13 }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button type="button" onClick={() => setShowLogModal(false)} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', fontWeight: 800, color: '#64748b', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={actionLoading} style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: '#0891b2', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
                {actionLoading ? 'Logging...' : 'Check In Visitor'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
