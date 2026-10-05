import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export default function ManagerRoomsView({ adminId, onBack, showToast }) {
  const [rooms, setRooms] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFloor, setSelectedFloor] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Add Room Form State
  const [newRoomNo, setNewRoomNo] = useState('');
  const [newFloor, setNewFloor] = useState('Ground Floor');
  const [newBedsCount, setNewBedsCount] = useState('2');
  const [newSharingType, setNewSharingType] = useState('Double Sharing');
  const [newRoomStatus, setNewRoomStatus] = useState('Active');

  // Real-time listener for rooms & tenants
  useEffect(() => {
    if (!adminId) return;
    setLoading(true);

    const qRooms = query(collection(db, 'rooms'), where('adminId', '==', adminId));
    const unsubRooms = onSnapshot(qRooms, (snap) => {
      const rList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      rList.sort((a, b) => (a.roomNo || '').localeCompare(b.roomNo || '', undefined, { numeric: true, sensitivity: 'base' }));
      setRooms(rList);
      setLoading(false);
    }, (err) => {
      console.error('Rooms fetch error:', err);
      setLoading(false);
    });

    const qTenants = query(collection(db, 'tenants'), where('adminId', '==', adminId));
    const unsubTenants = onSnapshot(qTenants, (snap) => {
      const tList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTenants(tList.filter(t => t.status === 'Approved' || t.status === 'Current User' || t.status === 'Notice' || t.status === 'On Notice Period' || !t.status));
    }, (err) => {
      console.error('Tenants fetch error in rooms:', err);
    });

    return () => {
      unsubRooms();
      unsubTenants();
    };
  }, [adminId]);

  // Aggregate stats
  const totalRooms = rooms.length;
  const totalBeds = useMemo(() => {
    return rooms.reduce((acc, r) => acc + (parseInt(r.beds || r.capacity || 1) || 1), 0);
  }, [rooms]);

  const occupiedBedsCount = tenants.length;
  const vacantBedsCount = Math.max(0, totalBeds - occupiedBedsCount);

  // Distinct floors
  const floors = useMemo(() => {
    const set = new Set();
    rooms.forEach(r => {
      if (r.floor) set.add(r.floor);
    });
    return ['All', ...Array.from(set)];
  }, [rooms]);

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    if (selectedFloor === 'All') return rooms;
    return rooms.filter(r => r.floor === selectedFloor);
  }, [rooms, selectedFloor]);

  // Handle Add Room
  const handleAddRoom = async (e) => {
    e.preventDefault();
    if (!newRoomNo.trim()) {
      showToast?.('Please enter a room number', 'warning');
      return;
    }
    setActionLoading(true);
    try {
      await addDoc(collection(db, 'rooms'), {
        adminId,
        roomNo: newRoomNo.trim(),
        name: newRoomNo.trim(),
        floor: newFloor,
        beds: parseInt(newBedsCount) || 1,
        sharingType: newSharingType,
        status: newRoomStatus,
        createdAt: new Date().toISOString()
      });

      showToast?.(`Room ${newRoomNo} added successfully!`, 'success');
      setShowAddModal(false);
      setNewRoomNo('');
    } catch (err) {
      console.error('Error adding room:', err);
      showToast?.('Failed to create room', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Edit Room Status
  const handleToggleRoomStatus = async (room) => {
    const nextStatus = room.status === 'Maintenance' ? 'Active' : 'Maintenance';
    try {
      await updateDoc(doc(db, 'rooms', room.id), { status: nextStatus });
      showToast?.(`Room ${room.roomNo} marked as ${nextStatus}`, 'success');
    } catch (err) {
      console.error('Error updating status:', err);
      showToast?.('Failed to update room status', 'error');
    }
  };

  return (
    <div style={{ padding: '0 0 calc(32px + env(safe-area-inset-bottom, 0px))', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '16px 16px', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={onBack} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#0f172a' }}>arrow_back</span>
            </button>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>Manage Rooms & Beds</h2>
              <p style={{ margin: 0, fontSize: 11, color: '#64748b', fontWeight: 600 }}>Capacity, Bed Allotment & Status</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
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
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
            Add Room
          </button>
        </div>

        {/* Capacity Stats Card */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {[
            { l: 'Total Rooms', v: totalRooms, c: '#0f172a', bg: '#f8fafc' },
            { l: 'Total Beds', v: totalBeds, c: '#0284c7', bg: '#e0f2fe' },
            { l: 'Occupied', v: occupiedBedsCount, c: '#16a34a', bg: '#dcfce7' },
            { l: 'Vacant', v: vacantBedsCount, c: '#d97706', bg: '#fef3c7' }
          ].map(k => (
            <div key={k.l} style={{ background: k.bg, borderRadius: 12, padding: '8px 10px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: k.c }}>{k.v}</p>
              <p style={{ margin: '2px 0 0', fontSize: 10, fontWeight: 800, color: k.c, textTransform: 'uppercase', opacity: 0.85 }}>{k.l}</p>
            </div>
          ))}
        </div>

        {/* Floor Filter Tabs */}
        {floors.length > 2 && (
          <div style={{ display: 'flex', gap: 6, marginTop: 12, overflowX: 'auto', paddingBottom: 2 }}>
            {floors.map(f => (
              <button
                key={f}
                onClick={() => setSelectedFloor(f)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 10,
                  border: 'none',
                  background: selectedFloor === f ? '#0891b2' : '#f1f5f9',
                  color: selectedFloor === f ? '#fff' : '#475569',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Rooms List */}
      <div style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTop: '3px solid #0891b2', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Loading Rooms...</p>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div style={{ background: '#fff', border: '1px dashed #cbd5e1', borderRadius: 16, padding: '36px 20px', textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#cbd5e1', marginBottom: 8 }}>meeting_room</span>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#64748b' }}>No rooms configured</p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>Tap "Add Room" above to set up rooms and beds</p>
          </div>
        ) : (
          filteredRooms.map(room => {
            const bedCount = parseInt(room.beds || room.capacity || 1) || 1;
            const roomTenants = tenants.filter(t => (t.roomNo === room.roomNo || t.room === room.roomNo));
            const isMaintenance = room.status === 'Maintenance';
            const occupiedCount = roomTenants.length;
            const isFull = occupiedCount >= bedCount;

            return (
              <div
                key={room.id}
                style={{
                  background: '#fff',
                  border: `1.5px solid ${isMaintenance ? '#fde68a' : isFull ? '#e2e8f0' : '#bbf7d0'}`,
                  borderRadius: 16,
                  padding: 14,
                  boxShadow: '0 3px 10px rgba(15,23,42,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#0f172a' }}>Room {room.roomNo}</h3>
                      {room.floor && (
                        <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: '#f1f5f9', color: '#475569' }}>
                          {room.floor}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '3px 0 0', fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                      {room.sharingType || `${bedCount} Bed Sharing`} · {occupiedCount}/{bedCount} Occupied
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      onClick={() => handleToggleRoomStatus(room)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 12,
                        border: 'none',
                        background: isMaintenance ? '#fef3c7' : '#dcfce7',
                        color: isMaintenance ? '#92400e' : '#166534',
                        fontSize: 11,
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                        {isMaintenance ? 'build' : 'check_circle'}
                      </span>
                      {isMaintenance ? 'Under Maint.' : 'Active'}
                    </button>
                  </div>
                </div>

                {/* Bed Allocation Slots Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(bedCount, 4)}, 1fr)`, gap: 8 }}>
                  {Array.from({ length: bedCount }).map((_, idx) => {
                    const bedLetter = String.fromCharCode(65 + idx); // A, B, C...
                    const tenantInBed = roomTenants.find(t => (t.bedNo === bedLetter || t.bed === bedLetter || t.bedNo === String(idx + 1)));

                    return (
                      <div
                        key={idx}
                        style={{
                          background: tenantInBed ? '#f0fdf4' : '#fffbeb',
                          border: `1px solid ${tenantInBed ? '#bbf7d0' : '#fde68a'}`,
                          borderRadius: 10,
                          padding: '8px 6px',
                          textAlign: 'center',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 2
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 14, color: tenantInBed ? '#16a34a' : '#d97706' }}>
                            single_bed
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 900, color: tenantInBed ? '#166534' : '#92400e' }}>
                            Bed {bedLetter}
                          </span>
                        </div>
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: tenantInBed ? '#0f172a' : '#b45309', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                          {tenantInBed ? tenantInBed.name.split(' ')[0] : 'Vacant'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Add Room Modal ── */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <form onSubmit={handleAddRoom} style={{ background: '#fff', borderRadius: 20, padding: 20, width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: '#0f172a' }}>Add New Room</h3>
              <button type="button" onClick={() => setShowAddModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, width: 30, height: 30, cursor: 'pointer' }}>✕</button>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Room Number *</label>
              <input
                type="text"
                required
                placeholder="e.g. 101, 201, G1"
                value={newRoomNo}
                onChange={e => setNewRoomNo(e.target.value)}
                style={{ width: '100%', marginTop: 4, padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Floor</label>
              <select
                value={newFloor}
                onChange={e => setNewFloor(e.target.value)}
                style={{ width: '100%', marginTop: 4, padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700, background: '#fff' }}
              >
                <option value="Ground Floor">Ground Floor</option>
                <option value="1st Floor">1st Floor</option>
                <option value="2nd Floor">2nd Floor</option>
                <option value="3rd Floor">3rd Floor</option>
                <option value="4th Floor">4th Floor</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Beds (Capacity)</label>
                <select
                  value={newBedsCount}
                  onChange={e => {
                    setNewBedsCount(e.target.value);
                    const b = e.target.value;
                    setNewSharingType(b === '1' ? 'Single' : b === '2' ? 'Double Sharing' : b === '3' ? 'Triple Sharing' : `${b} Sharing`);
                  }}
                  style={{ width: '100%', marginTop: 4, padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700, background: '#fff' }}
                >
                  <option value="1">1 Bed (Single)</option>
                  <option value="2">2 Beds (Double)</option>
                  <option value="3">3 Beds (Triple)</option>
                  <option value="4">4 Beds (4-Share)</option>
                  <option value="5">5 Beds</option>
                  <option value="6">6 Beds</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Initial Status</label>
                <select
                  value={newRoomStatus}
                  onChange={e => setNewRoomStatus(e.target.value)}
                  style={{ width: '100%', marginTop: 4, padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700, background: '#fff' }}
                >
                  <option value="Active">Active</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button type="button" onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', fontWeight: 800, color: '#64748b', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={actionLoading} style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: '#0891b2', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
                {actionLoading ? 'Creating...' : 'Create Room'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
