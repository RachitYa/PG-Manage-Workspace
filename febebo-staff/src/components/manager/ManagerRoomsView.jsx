import React, { useState, useEffect, useMemo, useRef } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const FACILITIES_LIST = [
  'AC', 'WiFi', 'Attached Washroom', 'Hot Water', 'Balcony', 'TV', 
  'Fridge', 'Study Table', 'Chair', 'Wardrobe', 'Bed', 'Mattress', 'Geyser'
];

const INVENTORY_OPTIONS = [
  'Mattress', 'Pillow', 'Bedsheet', 'Bucket', 'Chair', 'Table'
];

const compressImage = (file, maxWidth = 800) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.65));
      };
      img.onerror = () => resolve(null);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
};

export default function ManagerRoomsView({
  adminId,
  activePgId,
  assignedProperties = [],
  onBack,
  showToast
}) {
  // Target PG State
  const [selectedPgId, setSelectedPgId] = useState(() => {
    return activePgId || (assignedProperties[0]?.id) || 'primary';
  });

  const selectedPgName = useMemo(() => {
    const found = assignedProperties.find(p => p.id === selectedPgId);
    return found ? found.name : 'Primary PG';
  }, [assignedProperties, selectedPgId]);

  const [rooms, setRooms] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFloor, setSelectedFloor] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // ── ADD ROOM FORM STATE (FULL PARITY WITH ADMIN) ──
  const [targetPgForRoom, setTargetPgForRoom] = useState(selectedPgId);
  const [newRoomNo, setNewRoomNo] = useState('');
  const [newFloor, setNewFloor] = useState('Ground Floor');
  const [newBedsCount, setNewBedsCount] = useState('2');
  const [newRoomType, setNewRoomType] = useState('Non AC Room');
  const [newLeaseType, setNewLeaseType] = useState('bed_sharing'); // 'bed_sharing' | 'entire_room'
  const [newRoomRent, setNewRoomRent] = useState('');
  const [newFoodIncluded, setNewFoodIncluded] = useState(true);
  const [newIncludedFoodPersons, setNewIncludedFoodPersons] = useState(1);
  const [selectedFacilities, setSelectedFacilities] = useState(['WiFi', 'Bed', 'Mattress']);
  const [selectedInventory, setSelectedInventory] = useState(['Mattress', 'Chair', 'Table']);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  // Sync target PG when modal opens
  useEffect(() => {
    if (showAddModal) {
      setTargetPgForRoom(selectedPgId);
    }
  }, [showAddModal, selectedPgId]);

  // Real-time listener for rooms & tenants of the selected PG
  useEffect(() => {
    if (!adminId) return;
    setLoading(true);

    const qRooms = query(collection(db, 'rooms'), where('adminId', '==', adminId));
    const unsubRooms = onSnapshot(qRooms, (snap) => {
      const allR = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Filter by selected PG
      const filtered = allR.filter(r => {
        if (!r.pgId || r.pgId === 'primary') return selectedPgId === 'primary';
        return r.pgId === selectedPgId;
      });
      filtered.sort((a, b) => (String(a.roomNo || '')).localeCompare(String(b.roomNo || ''), undefined, { numeric: true, sensitivity: 'base' }));
      setRooms(filtered);
      setLoading(false);
    }, (err) => {
      console.error('Rooms fetch error:', err);
      setLoading(false);
    });

    const qTenants = query(collection(db, 'tenants'), where('adminId', '==', adminId));
    const unsubTenants = onSnapshot(qTenants, (snap) => {
      const allT = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const activeT = allT.filter(t => {
        if (t.status === 'Moved Out' || t.status === 'Exited') return false;
        if (!t.pgId || t.pgId === 'primary') return selectedPgId === 'primary';
        return t.pgId === selectedPgId;
      });
      setTenants(activeT);
    }, (err) => {
      console.error('Tenants fetch error in rooms:', err);
    });

    return () => {
      unsubRooms();
      unsubTenants();
    };
  }, [adminId, selectedPgId]);

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

  // Filtered rooms by floor
  const filteredRooms = useMemo(() => {
    if (selectedFloor === 'All') return rooms;
    return rooms.filter(r => r.floor === selectedFloor);
  }, [rooms, selectedFloor]);

  // Image upload
  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await compressImage(file);
    if (base64) {
      setImagePreview(base64);
    }
  };

  const toggleFacility = (f) => {
    setSelectedFacilities(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  };

  const toggleInventory = (i) => {
    setSelectedInventory(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  };

  // Handle Add Room (Full parity with Admin ManageRooms.jsx)
  const handleAddRoom = async (e) => {
    e.preventDefault();
    const cleanRoomNo = newRoomNo.trim();
    if (!cleanRoomNo) {
      showToast?.('Please enter a room number', 'warning');
      return;
    }

    // Check duplicate room number in this PG
    if (rooms.some(r => String(r.roomNo).trim() === cleanRoomNo)) {
      showToast?.(`Room No. ${cleanRoomNo} is already registered in ${selectedPgName}!`, 'error');
      return;
    }

    setActionLoading(true);
    try {
      const beds = parseInt(newBedsCount) || 1;
      const seaterLabel = `${beds} Seater`;
      const price = Number(newRoomRent) || 0;
      const includedFoodPersons = newFoodIncluded ? (parseInt(newIncludedFoodPersons) || beds || 1) : 0;

      await addDoc(collection(db, 'rooms'), {
        adminId,
        pgId: targetPgForRoom,
        name: cleanRoomNo,
        roomNo: cleanRoomNo,
        floor: newFloor,
        beds: beds,
        seaterLabel: seaterLabel,
        price: price,
        roomType: newRoomType,
        leaseType: newLeaseType,
        foodIncluded: newFoodIncluded,
        includedFoodPersons: includedFoodPersons,
        facilities: selectedFacilities,
        inventory: selectedInventory,
        image: imagePreview || null,
        status: 'Active',
        createdAt: new Date().toISOString()
      });

      showToast?.(`Room ${cleanRoomNo} added successfully to ${selectedPgName}!`, 'success');
      setShowAddModal(false);

      // Reset form
      setNewRoomNo('');
      setNewRoomRent('');
      setImagePreview(null);
      setNewBedsCount('2');
      setNewRoomType('Non AC Room');
      setNewLeaseType('bed_sharing');
      setNewFoodIncluded(true);
      setNewIncludedFoodPersons(1);
      setSelectedFacilities(['WiFi', 'Bed', 'Mattress']);
      setSelectedInventory(['Mattress', 'Chair', 'Table']);
    } catch (err) {
      console.error('Error adding room:', err);
      showToast?.(`Failed to create room: ${err.message}`, 'error');
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
    <div style={{ minHeight: '100%', background: '#ffffff', display: 'flex', flexDirection: 'column', fontFamily: "'Hanken Grotesk', sans-serif", paddingBottom: 'calc(32px + env(safe-area-inset-bottom, 0px))' }}>
      
      {/* ── HEADER (APPLE BRIGHT) ── */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '16px 16px', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={onBack}
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#0f172a' }}>arrow_back</span>
            </button>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>Manage Rooms & Beds</h2>
              <p style={{ margin: 0, fontSize: 11, color: '#64748b', fontWeight: 600 }}>Capacity & Bed Allotment · {selectedPgName}</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Multi-PG Selector Pill */}
            {assignedProperties && assignedProperties.length > 1 && (
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedPgId}
                  onChange={e => setSelectedPgId(e.target.value)}
                  style={{
                    background: '#f8fafc',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: 20,
                    padding: '6px 28px 6px 10px',
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
                <span className="material-symbols-outlined" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: '#64748b', pointerEvents: 'none' }}>
                  expand_more
                </span>
              </div>
            )}

            <button
              onClick={() => setShowAddModal(true)}
              style={{
                background: '#0891b2',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '8px 12px',
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
        </div>

        {/* ── CAPACITY STATS (APPLE CLEAN CARDS) ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {[
            { l: 'Total Rooms', v: totalRooms, c: '#0f172a', bg: '#f8fafc' },
            { l: 'Total Beds', v: totalBeds, c: '#0284c7', bg: '#e0f2fe' },
            { l: 'Occupied', v: occupiedBedsCount, c: '#16a34a', bg: '#dcfce7' },
            { l: 'Vacant', v: vacantBedsCount, c: '#d97706', bg: '#fef3c7' }
          ].map(k => (
            <div key={k.l} style={{ background: k.bg, borderRadius: 12, padding: '8px 6px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
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

      {/* ── ROOMS LIST ── */}
      <div style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTop: '3px solid #0891b2', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Loading Rooms...</p>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div style={{ background: '#ffffff', border: '1px dashed #cbd5e1', borderRadius: 16, padding: '36px 20px', textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#cbd5e1', marginBottom: 8 }}>meeting_room</span>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#64748b' }}>No rooms configured for {selectedPgName}</p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>Tap "Add Room" above to set up rooms and bed capacity</p>
          </div>
        ) : (
          filteredRooms.map(room => {
            const bedCount = parseInt(room.beds || room.capacity || 1) || 1;
            const roomTenants = tenants.filter(t => (String(t.roomNo) === String(room.roomNo) || String(t.room) === String(room.roomNo)));
            const isMaintenance = room.status === 'Maintenance';
            const occupiedCount = roomTenants.length;
            const isFull = occupiedCount >= bedCount;
            const isEntireRoom = room.leaseType === 'entire_room';

            return (
              <div
                key={room.id}
                style={{
                  background: '#ffffff',
                  border: `1.5px solid ${isMaintenance ? '#fde68a' : isFull ? '#e2e8f0' : '#bbf7d0'}`,
                  borderRadius: 18,
                  padding: 14,
                  boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12
                }}
              >
                {/* Header of Room Card */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {room.image ? (
                      <img src={room.image} alt={room.roomNo} style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 56, height: 56, borderRadius: 12, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 26, color: '#94a3b8' }}>door_front</span>
                      </div>
                    )}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#0f172a' }}>Room {room.roomNo}</h3>
                        {room.floor && (
                          <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: '#f1f5f9', color: '#475569' }}>
                            {room.floor}
                          </span>
                        )}
                        {room.price ? (
                          <span style={{ fontSize: 11, fontWeight: 800, color: '#059669', background: '#dcfce7', padding: '2px 6px', borderRadius: 6 }}>
                            ₹{room.price}/mo
                          </span>
                        ) : null}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                          {room.seaterLabel || `${bedCount} Seater`} · {room.roomType || 'Standard'}
                        </span>
                        {isEntireRoom && (
                          <span style={{ fontSize: 10, fontWeight: 800, background: '#ede9fe', color: '#7c3aed', padding: '1px 6px', borderRadius: 4 }}>
                            🏢 Flat
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

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
                    {isMaintenance ? 'Maint.' : 'Active'}
                  </button>
                </div>

                {/* Facilities & Food info */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {room.foodIncluded !== false && (
                    <span style={{ fontSize: 10.5, fontWeight: 700, background: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 12 }}>restaurant</span>
                      Food Included
                    </span>
                  )}
                  {room.facilities?.slice(0, 4).map((f, i) => (
                    <span key={i} style={{ fontSize: 10.5, fontWeight: 600, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', padding: '2px 6px', borderRadius: 6 }}>
                      {f}
                    </span>
                  ))}
                  {room.facilities && room.facilities.length > 4 && (
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: '#94a3b8', padding: '2px 4px' }}>
                      +{room.facilities.length - 4} more
                    </span>
                  )}
                </div>

                {/* Bed Allocation Slots Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(bedCount, 4)}, 1fr)`, gap: 8 }}>
                  {Array.from({ length: bedCount }).map((_, idx) => {
                    const bedLetter = String.fromCharCode(65 + idx); // A, B, C...
                    const tenantInBed = roomTenants.find(t => (
                      String(t.bedNo).toUpperCase() === bedLetter || 
                      String(t.bed).toUpperCase() === bedLetter || 
                      String(t.bedNo) === String(idx + 1)
                    ));

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

      {/* ── ADD ROOM MODAL (FULL PARITY WITH ADMIN) ── */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <form
            onSubmit={handleAddRoom}
            style={{
              background: '#ffffff',
              borderRadius: 24,
              padding: '20px 20px 24px',
              width: '100%',
              maxWidth: 440,
              maxHeight: '90vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>Add Room</h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>Configure room specifications & beds</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: 10,
                  width: 32,
                  height: 32,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#475569'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>

            {/* Target PG Selector */}
            {assignedProperties && assignedProperties.length > 1 && (
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Target PG Property</label>
                <select
                  value={targetPgForRoom}
                  onChange={e => setTargetPgForRoom(e.target.value)}
                  style={{ width: '100%', marginTop: 4, padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700, background: '#fff', color: '#0f172a' }}
                >
                  {assignedProperties.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Room Number & Floor */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Room Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 101, 201"
                  value={newRoomNo}
                  onChange={e => setNewRoomNo(e.target.value)}
                  style={{ width: '100%', marginTop: 4, padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 14, fontWeight: 700, color: '#0f172a', background: '#fff', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Floor</label>
                <select
                  value={newFloor}
                  onChange={e => setNewFloor(e.target.value)}
                  style={{ width: '100%', marginTop: 4, padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700, background: '#fff', color: '#0f172a', boxSizing: 'border-box' }}
                >
                  <option value="Ground Floor">Ground Floor</option>
                  <option value="1st Floor">1st Floor</option>
                  <option value="2nd Floor">2nd Floor</option>
                  <option value="3rd Floor">3rd Floor</option>
                  <option value="4th Floor">4th Floor</option>
                  <option value="5th Floor">5th Floor</option>
                </select>
              </div>
            </div>

            {/* Beds Capacity & Room Rent */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Beds Capacity</label>
                <select
                  value={newBedsCount}
                  onChange={e => {
                    setNewBedsCount(e.target.value);
                    if (newFoodIncluded) setNewIncludedFoodPersons(parseInt(e.target.value) || 1);
                  }}
                  style={{ width: '100%', marginTop: 4, padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700, background: '#fff', color: '#0f172a', boxSizing: 'border-box' }}
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
                <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Monthly Rent (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 7500"
                  value={newRoomRent}
                  onChange={e => setNewRoomRent(e.target.value)}
                  style={{ width: '100%', marginTop: 4, padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700, color: '#0f172a', background: '#fff', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Room Type & Occupancy Model */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Room Type</label>
                <select
                  value={newRoomType}
                  onChange={e => setNewRoomType(e.target.value)}
                  style={{ width: '100%', marginTop: 4, padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700, background: '#fff', color: '#0f172a', boxSizing: 'border-box' }}
                >
                  <option value="Non AC Room">Non AC Room</option>
                  <option value="AC Room">AC Room</option>
                  <option value="Deluxe AC">Deluxe AC</option>
                  <option value="Standard Room">Standard Room</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Lease Model</label>
                <select
                  value={newLeaseType}
                  onChange={e => setNewLeaseType(e.target.value)}
                  style={{ width: '100%', marginTop: 4, padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700, background: '#fff', color: '#0f172a', boxSizing: 'border-box' }}
                >
                  <option value="bed_sharing">Bed Sharing</option>
                  <option value="entire_room">Entire Flat / Single Payer</option>
                </select>
              </div>
            </div>

            {/* Food Plan Toggle */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: newFoodIncluded ? '#059669' : '#94a3b8' }}>restaurant</span>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#0f172a' }}>Food / Mess Included</p>
                  <p style={{ margin: 0, fontSize: 10.5, color: '#64748b' }}>Counted in daily mess preparation</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={newFoodIncluded}
                onChange={e => setNewFoodIncluded(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: '#0891b2', cursor: 'pointer' }}
              />
            </div>

            {/* Facilities Selection Chips */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Facilities & Amenities</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6, maxHeight: 100, overflowY: 'auto' }}>
                {FACILITIES_LIST.map(f => {
                  const sel = selectedFacilities.includes(f);
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => toggleFacility(f)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 8,
                        border: `1px solid ${sel ? '#0891b2' : '#cbd5e1'}`,
                        background: sel ? '#ecfeff' : '#ffffff',
                        color: sel ? '#0e7490' : '#475569',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {sel ? '✓ ' : '+ '}{f}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Room Photo */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Room Photo</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                {imagePreview ? (
                  <div style={{ position: 'relative', width: 64, height: 64, borderRadius: 10, overflow: 'hidden' }}>
                    <img src={imagePreview} alt="Room" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => setImagePreview(null)}
                      style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', borderRadius: '50%', width: 18, height: 18, fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >✕</button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 10,
                      border: '1px dashed #cbd5e1',
                      background: '#f8fafc',
                      color: '#475569',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add_a_photo</span>
                    Upload Room Photo
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  fontWeight: 800,
                  color: '#64748b',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 12,
                  border: 'none',
                  background: '#0891b2',
                  color: '#ffffff',
                  fontWeight: 800,
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  opacity: actionLoading ? 0.7 : 1,
                  boxShadow: '0 2px 8px rgba(8,145,178,0.25)'
                }}
              >
                {actionLoading ? 'Creating Room...' : 'Create Room'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
