import React, { useState, useEffect, useMemo, useRef } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const cyan = '#0891b2';
const DEFAULT_IMG = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=400&fit=crop';
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

function RoomDetailView({ room, tenants, onBack, onOpenChat }) {
  const roomTenants = tenants.filter(t => String(t.roomNo) === String(room.roomNo) || String(t.room) === String(room.roomNo));
  const primaryTenant = roomTenants.find(t => t.isPrimaryPayer || t.leaseType === 'entire_room') || roomTenants[0];
  const isEntireRoomLease = room.leaseType === 'entire_room' || roomTenants.some(t => t.isPrimaryPayer || t.leaseType === 'entire_room');
  const coResidents = primaryTenant?.coResidents || room.coResidents || [];
  const foodIncluded = room.foodIncluded !== undefined ? room.foodIncluded : (primaryTenant?.foodIncluded !== false);
  const foodPersons = room.includedFoodPersons || primaryTenant?.includedFoodPersons || (coResidents.length + 1);

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100%', background: '#f8fafc', fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 20 }}>
        <button onClick={onBack} style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, width: 36, height: 36, cursor: 'pointer', color: cyan, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
        </button>
        <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 18, color: '#0f172a', margin: 0, flex: 1, textAlign: 'center' }}>
          Room No. {room.roomNo}
        </p>
        <div style={{ width: 36 }} />
      </div>

      <div style={{ padding: 16 }}>
        {/* Room Photo & Basic Info */}
        <div style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 16, background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 4px 14px rgba(15,23,42,0.06)' }}>
          <img
            src={room.image || DEFAULT_IMG}
            alt={room.name || `Room ${room.roomNo}`}
            style={{ width: '100%', height: 190, objectFit: 'cover', display: 'block' }}
            onError={e => { e.target.src = DEFAULT_IMG; }}
          />
          <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontWeight: 800, fontSize: 16, color: '#0f172a', margin: 0 }}>Room {room.roomNo}</p>
              <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0', fontWeight: 600 }}>{room.roomType || 'Standard Room'} · {room.seaterLabel || `${room.beds} Seater`}</p>
              {isEntireRoomLease && (
                <span style={{ display: 'inline-block', marginTop: 4, fontSize: 11, fontWeight: 800, background: '#ede9fe', color: '#6d28d9', padding: '2px 8px', borderRadius: 6 }}>
                  🏢 Entire Flat / Single Payer
                </span>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 12, fontWeight: 800, background: roomTenants.length > 0 ? '#dcfce7' : '#f1f5f9', color: roomTenants.length > 0 ? '#059669' : '#64748b', padding: '4px 12px', borderRadius: 20 }}>
                {roomTenants.length > 0 ? 'Occupied' : 'Vacant'}
              </span>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0', fontWeight: 600 }}>
                {isEntireRoomLease ? `${coResidents.length + 1} Total Occupants` : `${room.beds || 1} beds · ${roomTenants.length} residents`}
              </p>
            </div>
          </div>
        </div>

        {/* Food Plan Badge */}
        <div style={{ background: foodIncluded ? '#ecfdf5' : '#fffbeb', border: `1px solid ${foodIncluded ? '#a7f3d0' : '#fde68a'}`, borderRadius: 14, padding: '12px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: foodIncluded ? '#d1fae5' : '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: foodIncluded ? '#059669' : '#d97706' }}>
                {foodIncluded ? 'restaurant' : 'no_meals'}
              </span>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: foodIncluded ? '#065f46' : '#92400e' }}>
                {foodIncluded ? `Food / Mess Included (${foodPersons} Person${foodPersons > 1 ? 's' : ''})` : 'Self Cooking / Mess Excluded'}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: foodIncluded ? '#047857' : '#b45309' }}>
                {foodIncluded ? 'Counted in kitchen daily meal preparation' : 'No food headcount counted for this room'}
              </p>
            </div>
          </div>
        </div>

        {/* Residents List */}
        <p style={{ fontWeight: 800, fontSize: 15, color: '#0f172a', margin: '0 0 12px' }}>
          {isEntireRoomLease ? 'Primary Payer (Main Resident)' : `Residents (${roomTenants.length})`}
        </p>
        
        {roomTenants.length === 0 ? (
          <div style={{ background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '36px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 44, color: '#cbd5e1', display: 'block', marginBottom: 8 }}>person_off</span>
            <p style={{ color: '#94a3b8', fontSize: 14, margin: 0, fontWeight: 600 }}>No residents in this room yet</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {roomTenants.map(user => (
              <div
                key={user.id || user.tenantId}
                style={{
                  background: '#ffffff',
                  borderRadius: 14,
                  border: user.isPrimaryPayer || isEntireRoomLease ? '1.5px solid #8b5cf6' : '1px solid #e2e8f0',
                  padding: 12,
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}
              >
                <img
                  src={user.kyc?.profilePhoto || user.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=0891b2&color=fff&size=150`}
                  alt={user.name}
                  style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <p style={{ fontWeight: 800, fontSize: 15, color: '#0f172a', margin: '0 0 2px' }}>{user.name}</p>
                    {(user.isPrimaryPayer || isEntireRoomLease) && (
                      <span style={{ fontSize: 9.5, fontWeight: 800, background: '#7c3aed', color: 'white', padding: '2px 6px', borderRadius: 4 }}>PRIMARY PAYER</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 13, color: cyan }}>badge</span>
                    <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>{user.studentId || user.id?.slice(0, 8) || 'No ID'} · Bed {user.bedNo || user.bed || 'A'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 13, color: cyan }}>phone</span>
                    <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>{user.phone || 'No Phone'}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {user.phone && (
                    <a
                      href={`tel:${user.phone}`}
                      style={{
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        color: '#16a34a',
                        borderRadius: 10,
                        width: 36,
                        height: 36,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textDecoration: 'none'
                      }}
                      title={`Call ${user.name}`}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>call</span>
                    </a>
                  )}
                  <button
                    onClick={() => {
                      if (onOpenChat) onOpenChat(user);
                      else window.location.href = `tel:${user.phone}`;
                    }}
                    style={{
                      background: '#ecfeff',
                      border: '1px solid #a5f3fc',
                      color: cyan,
                      borderRadius: 10,
                      width: 36,
                      height: 36,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                    title={`Chat with ${user.name}`}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chat</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Co-Residents / Roommates Section */}
        {isEntireRoomLease && (
          <div style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <p style={{ fontWeight: 800, fontSize: 15, color: '#0f172a', margin: 0 }}>
                Co-Residents / Roommates ({coResidents.length})
              </p>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Non-paying co-occupants</span>
            </div>

            {coResidents.length === 0 ? (
              <div style={{ background: '#ffffff', border: '1.5px dashed #cbd5e1', borderRadius: 14, padding: '20px', textAlign: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#94a3b8', display: 'block', marginBottom: 6 }}>group_add</span>
                <p style={{ color: '#64748b', fontSize: 13, margin: 0, fontWeight: 700 }}>No co-residents listed yet</p>
                <p style={{ color: '#94a3b8', fontSize: 11, margin: '4px 0 0' }}>Primary resident can register roommates via student app.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {coResidents.map((cr, idx) => (
                  <div key={idx} style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 42, height: 42, borderRadius: 10, background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16 }}>
                        {cr.name ? cr.name.charAt(0).toUpperCase() : 'R'}
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{cr.name}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                          {cr.relation || 'Roommate'}{cr.phone ? ` · ${cr.phone}` : ''}
                        </p>
                        {cr.aadhar && (
                          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>ID: {cr.aadhar}</p>
                        )}
                      </div>
                    </div>
                    {cr.phone && (
                      <a href={`tel:${cr.phone}`} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }} title={`Call ${cr.name}`}>
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>call</span>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ManagerRoomsView({
  adminId,
  activePgId,
  assignedProperties = [],
  onBack,
  onOpenChat,
  showToast
}) {
  // Target PG State
  const [selectedPgId, setSelectedPgId] = useState(() => {
    return activePgId || (assignedProperties[0]?.id) || 'primary';
  });

  useEffect(() => {
    if (activePgId) setSelectedPgId(activePgId);
  }, [activePgId]);

  const selectedPgName = useMemo(() => {
    const found = assignedProperties.find(p => p.id === selectedPgId);
    return found ? found.name : 'Primary PG';
  }, [assignedProperties, selectedPgId]);

  const [view, setView] = useState('listing'); // 'listing' | 'add'
  const [allRoomsList, setAllRoomsList] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFloor, setSelectedFloor] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedRoom, setSelectedRoom] = useState(null);

  // ── ADD ROOM FORM STATE (EXACT PARITY WITH ADMIN MANAGEROOMS.JSX) ──
  const [targetPgForRoom, setTargetPgForRoom] = useState(selectedPgId);
  const [roomNo, setRoomNo] = useState('');
  const [seaterType, setSeaterType] = useState('');
  const [roomRent, setRoomRent] = useState('');
  const [roomType, setRoomType] = useState('Non AC Room');
  const [leaseType, setLeaseType] = useState('bed_sharing'); // 'bed_sharing' | 'entire_room'
  const [foodIncluded, setFoodIncluded] = useState(true);
  const [includedFoodPersons, setIncludedFoodPersons] = useState(1);
  const [imagePreview, setImagePreview] = useState(null);
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [pgStats, setPgStats] = useState({ totalSeats: 0, totalRooms: 0 });
  const [pgRents, setPgRents] = useState([]);

  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  // Fetch PG Stats and Rents for capacity & rent auto-fill (identical to Admin)
  useEffect(() => {
    if (!adminId) return;
    const fetchPgData = async () => {
      try {
        const targetPgOwnerId = (!selectedPgId || selectedPgId === 'primary') ? adminId : selectedPgId;
        let pgDoc = await getDoc(doc(db, 'pg_owners', targetPgOwnerId));
        if (!pgDoc.exists()) {
          pgDoc = await getDoc(doc(db, 'pg_owners', adminId));
        }
        if (pgDoc.exists()) {
          const data = pgDoc.data();
          const pd = data.propertyDetails || {};
          if (data.branches && selectedPgId && selectedPgId !== 'primary' && selectedPgId !== adminId) {
            const branch = data.branches.find(b => b.id === selectedPgId || b.pgId === selectedPgId);
            if (branch) {
              setPgStats({
                totalSeats: parseInt(branch.totalSeats) || parseInt(pd.totalSeats) || 0,
                totalRooms: parseInt(branch.totalRooms) || parseInt(pd.totalRooms) || 0
              });
              if (branch.rents) {
                setPgRents(branch.rents);
                return;
              }
            }
          }
          setPgStats({
            totalSeats: parseInt(pd.totalSeats) || 0,
            totalRooms: parseInt(pd.totalRooms) || 0
          });
          if (pd.rents) setPgRents(pd.rents);
        }
      } catch (err) {
        console.error('Error fetching PG data:', err);
      }
    };
    fetchPgData();
  }, [adminId, selectedPgId]);

  // Real-time listener for rooms & tenants of the selected PG
  useEffect(() => {
    if (!adminId) return;
    setLoading(true);

    const isMatchPg = (rPgId, pgTarget) => {
      if (!pgTarget || pgTarget === 'primary') return !rPgId || rPgId === 'primary' || rPgId === adminId;
      return rPgId === pgTarget;
    };

    const qRooms = query(collection(db, 'rooms'), where('adminId', '==', adminId));
    const unsubRooms = onSnapshot(qRooms, (snap) => {
      const allR = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllRoomsList(allR);

      // Filter by selected PG
      const filtered = allR.filter(r => isMatchPg(r.pgId, selectedPgId));
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
        return isMatchPg(t.pgId, selectedPgId);
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
  const totalBeds = useMemo(() => rooms.reduce((acc, r) => acc + (parseInt(r.beds) || 1), 0), [rooms]);
  const occupiedBeds = useMemo(() => tenants.length, [tenants]);
  const vacantBeds = Math.max(0, totalBeds - occupiedBeds);

  // Filtered rooms by floor and search
  const filteredRooms = useMemo(() => {
    return rooms.filter(r => {
      if (selectedFloor !== 'All' && r.floor !== selectedFloor) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const rNo = String(r.roomNo || '').toLowerCase();
        const rType = String(r.roomType || '').toLowerCase();
        return rNo.includes(q) || rType.includes(q);
      }
      return true;
    });
  }, [rooms, selectedFloor, search]);

  const uniqueFloors = useMemo(() => {
    const set = new Set();
    rooms.forEach(r => { if (r.floor) set.add(r.floor); });
    return ['All', ...Array.from(set)];
  }, [rooms]);

  // Photo change handler
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await compressImage(file);
      setImagePreview(base64);
    }
  };

  // Handle Add Room (Identical to Admin ManageRooms.jsx)
  const handleAddRoom = async (e) => {
    e.preventDefault();
    const cleanRoomNo = String(roomNo).trim();
    if (!cleanRoomNo) return;
    setErrorMsg('');

    const targetPg = targetPgForRoom || selectedPgId || 'primary';
    const isMatchTargetPg = (rPgId) => {
      if (!targetPg || targetPg === 'primary') return !rPgId || rPgId === 'primary' || rPgId === adminId;
      return rPgId === targetPg;
    };

    const targetPgName = assignedProperties.find(p => p.id === targetPg)?.name || selectedPgName;
    if (allRoomsList.filter(r => isMatchTargetPg(r.pgId)).some(r => String(r.roomNo).trim() === cleanRoomNo)) {
      setErrorMsg(`Room No. ${cleanRoomNo} is already registered in ${targetPgName}!`);
      return;
    }

    if (pgStats.totalSeats > 0) {
      const existingSeats = allRoomsList.filter(r => isMatchTargetPg(r.pgId)).reduce((acc, r) => acc + (parseInt(r.beds || r.roomBeds) || 0), 0);
      const addingSeats = parseInt(seaterType) || 1;
      if (existingSeats + addingSeats > pgStats.totalSeats) {
        setErrorMsg(`Cannot add room! Total seats will exceed registered capacity (${pgStats.totalSeats}). Currently configured seats: ${existingSeats}.`);
        return;
      }
    }

    setIsSaving(true);
    try {
      const beds = parseInt(seaterType) || 1;
      const seaterLabel = `${beds} Seater`;
      const price = Number(roomRent) || 0;
      const incFood = foodIncluded ? (parseInt(includedFoodPersons) || beds || 1) : 0;

      await addDoc(collection(db, 'rooms'), {
        adminId,
        pgId: targetPg,
        name: cleanRoomNo,
        roomNo: cleanRoomNo,
        beds: beds,
        seaterLabel: seaterLabel,
        price: price,
        roomType: roomType,
        leaseType: leaseType, // 'bed_sharing' | 'entire_room'
        foodIncluded: foodIncluded,
        includedFoodPersons: incFood,
        facilities: [],
        inventory: [],
        image: imagePreview || null,
        status: 'Active',
        createdAt: new Date().toISOString()
      });

      showToast?.(`Room ${cleanRoomNo} added successfully to ${targetPgName}! ✅`, 'success');
      setView('listing');
      setImagePreview(null);
      setRoomNo('');
      setSeaterType('');
      setRoomRent('');
      setRoomType('Non AC Room');
      setLeaseType('bed_sharing');
      setFoodIncluded(true);
      setIncludedFoodPersons(1);

      if (selectedPgId !== targetPg) {
        setSelectedPgId(targetPg);
      }
    } catch (err) {
      console.error('Error adding room:', err);
      setErrorMsg('Failed to add room: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle Room Maintenance status
  const handleToggleMaintenance = async (room, e) => {
    e.stopPropagation();
    const nextStatus = room.status === 'Maintenance' ? 'Active' : 'Maintenance';
    try {
      await updateDoc(doc(db, 'rooms', room.id), { status: nextStatus });
      showToast?.(`Room ${room.roomNo} marked as ${nextStatus}`, 'success');
    } catch (err) {
      console.error('Error updating status:', err);
      showToast?.('Failed to update room status', 'error');
    }
  };

  // ── ADD ROOM VIEW (100% IDENTICAL DETAILING TO ADMIN'S MANAGEROOMS.JSX) ──
  if (view === 'add') {
    return (
      <div style={{ minHeight: '100%', background: '#f8fafc', display: 'flex', flexDirection: 'column', fontFamily: "'Hanken Grotesk', sans-serif", paddingBottom: 80 }}>
        {/* Top Header */}
        <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10, paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))' }}>
          <button
            onClick={() => { setView('listing'); setImagePreview(null); setErrorMsg(''); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: cyan }}
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 18, color: '#0f172a', margin: 0, flex: 1, textAlign: 'center' }}>Add Room</p>
          <div style={{ width: 32 }} />
        </div>

        <div style={{ padding: 16, maxWidth: 500, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
          {errorMsg && (
            <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#e11d48', padding: '12px 16px', borderRadius: 12, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 600 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>error</span>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleAddRoom}>
            {/* Target PG Selector (for managers managing multiple branches) */}
            {assignedProperties && assignedProperties.length > 1 && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                  Target PG Property <span style={{ color: '#e11d48' }}>*</span>
                </label>
                <select
                  value={targetPgForRoom}
                  onChange={e => setTargetPgForRoom(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 15, fontFamily: 'inherit', background: 'white', outline: 'none', boxSizing: 'border-box' }}
                >
                  {assignedProperties.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Room Number */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                Room Number <span style={{ color: '#e11d48' }}>*</span>
              </label>
              <input
                value={roomNo}
                onChange={e => setRoomNo(e.target.value)}
                required
                placeholder="e.g. 101"
                style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 15, fontFamily: 'inherit', background: 'white', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {/* Occupancy / Lease Model (Single Payer vs Individual Bed) */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                Occupancy / Lease Model <span style={{ color: '#e11d48' }}>*</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setLeaseType('bed_sharing')}
                  style={{
                    padding: '12px 10px',
                    borderRadius: 12,
                    border: `1.5px solid ${leaseType === 'bed_sharing' ? cyan : '#e2e8f0'}`,
                    background: leaseType === 'bed_sharing' ? '#ecfeff' : 'white',
                    color: leaseType === 'bed_sharing' ? '#0e7490' : '#475569',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>bed</span>
                  <span>Bed Sharing</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLeaseType('entire_room')}
                  style={{
                    padding: '12px 10px',
                    borderRadius: 12,
                    border: `1.5px solid ${leaseType === 'entire_room' ? '#7c3aed' : '#e2e8f0'}`,
                    background: leaseType === 'entire_room' ? '#f5f3ff' : 'white',
                    color: leaseType === 'entire_room' ? '#6d28d9' : '#475569',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>home_work</span>
                  <span>Entire Flat (Single Payer)</span>
                </button>
              </div>
            </div>

            {/* Capacity (Max Beds / Persons) */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                Capacity (Max Beds / Persons) <span style={{ color: '#e11d48' }}>*</span>
              </label>
              <select
                value={seaterType}
                onChange={e => {
                  const val = e.target.value;
                  setSeaterType(val);
                  setIncludedFoodPersons(parseInt(val) || 1);
                  const selectedRentObj = pgRents.find(r => String(r.seater) === String(val));
                  if (selectedRentObj) {
                    setRoomRent(selectedRentObj.rent);
                  } else {
                    setRoomRent('');
                  }
                }}
                required
                style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 15, fontFamily: 'inherit', background: 'white', outline: 'none', boxSizing: 'border-box' }}
              >
                <option value="">Select Seater Type</option>
                {pgRents && pgRents.length > 0 ? (
                  pgRents.map((r, i) => (
                    <option key={i} value={r.seater}>{r.seater} Seater / Occupants</option>
                  ))
                ) : (
                  [1, 2, 3, 4, 5, 6].map(num => (
                    <option key={num} value={num}>{num} Seater / Occupants</option>
                  ))
                )}
              </select>
            </div>

            {/* Price */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                Price <span style={{ color: '#e11d48' }}>*</span>
              </label>
              <input
                type="number"
                value={roomRent}
                onChange={e => setRoomRent(e.target.value)}
                placeholder="Rent amount per month"
                style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 15, fontFamily: 'inherit', background: 'white', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {/* Room Type */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                Room Type (e.g. AC / Non-AC) <span style={{ color: '#e11d48' }}>*</span>
              </label>
              <select
                value={roomType}
                onChange={e => setRoomType(e.target.value)}
                required
                style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 15, fontFamily: 'inherit', background: 'white', outline: 'none', boxSizing: 'border-box' }}
              >
                <option value="Non AC Room">Non AC Room</option>
                <option value="AC Room">AC Room</option>
                <option value="Cooler Room">Cooler Room</option>
                <option value="Standard Room">Standard Room</option>
              </select>
            </div>

            {/* Mess / Food Facility */}
            <div style={{ marginBottom: 16, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Mess / Food Facility</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>Include meal plan in room rent</p>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' }}>
                  <input type="checkbox" checked={foodIncluded} onChange={e => setFoodIncluded(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                  <span style={{ position: 'absolute', inset: 0, background: foodIncluded ? '#059669' : '#cbd5e1', borderRadius: 24, transition: '0.2s' }}>
                    <span style={{ position: 'absolute', height: 18, width: 18, left: foodIncluded ? 22 : 3, bottom: 3, background: 'white', borderRadius: '50%', transition: '0.2s' }} />
                  </span>
                </label>
              </div>

              {foodIncluded && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Included Food Eaters (Headcount count)</label>
                  <input
                    type="number"
                    min="1"
                    value={includedFoodPersons}
                    onChange={e => setIncludedFoodPersons(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, background: 'white', boxSizing: 'border-box' }}
                  />
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: '#059669' }}>✓ Kitchen mess headcount will automatically include {includedFoodPersons} meal portion(s).</p>
                </div>
              )}
            </div>

            {/* Room Image Upload */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Room Image</label>
              <div
                onClick={() => setShowImageOptions(true)}
                style={{ width: '100%', height: 160, border: '2px dashed #cbd5e1', borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#f8fafc', overflow: 'hidden' }}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                      <span className="material-symbols-outlined" style={{ color: cyan, fontSize: 24 }}>add_a_photo</span>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#475569' }}>Tap to upload image</span>
                  </>
                )}
              </div>
            </div>

            {/* Save Room Submit */}
            <button
              type="submit"
              disabled={isSaving}
              style={{ width: '100%', marginTop: 24, padding: '14px 0', background: cyan, color: 'white', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {isSaving ? 'Saving...' : 'Save Room'}
            </button>
          </form>
        </div>

        {/* Action Sheet for Image Selection */}
        {showImageOptions && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <div onClick={() => setShowImageOptions(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
            <div style={{ position: 'relative', background: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: '24px 20px', paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
              <p style={{ fontWeight: 700, fontSize: 18, color: '#0f172a', margin: '0 0 20px' }}>Upload Room Image</p>

              <button
                type="button"
                onClick={() => {
                  setShowImageOptions(false);
                  cameraInputRef.current?.click();
                }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, marginBottom: 12, cursor: 'pointer', fontFamily: 'inherit', boxSizing: 'border-box' }}
              >
                <div style={{ width: 40, height: 40, borderRadius: 12, background: '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ color: cyan }}>photo_camera</span>
                </div>
                <span style={{ fontSize: 16, fontWeight: 600, color: '#334155' }}>Take a Photo</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowImageOptions(false);
                  galleryInputRef.current?.click();
                }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, marginBottom: 16, cursor: 'pointer', fontFamily: 'inherit', boxSizing: 'border-box' }}
              >
                <div style={{ width: 40, height: 40, borderRadius: 12, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ color: '#16a34a' }}>photo_library</span>
                </div>
                <span style={{ fontSize: 16, fontWeight: 600, color: '#334155' }}>Choose from Folder</span>
              </button>

              <button
                type="button"
                onClick={() => setShowImageOptions(false)}
                style={{ width: '100%', padding: '16px', background: 'white', border: '1px solid #e2e8f0', color: '#64748b', borderRadius: 16, fontWeight: 700, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Hidden Camera & Gallery Inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoUpload}
          style={{ display: 'none' }}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoUpload}
          style={{ display: 'none' }}
        />
      </div>
    );
  }

  // If a room is selected, render the dedicated Room Detail View
  if (selectedRoom) {
    return (
      <RoomDetailView
        room={selectedRoom}
        tenants={tenants}
        onBack={() => setSelectedRoom(null)}
        onOpenChat={onOpenChat}
      />
    );
  }

  return (
    <div style={{ minHeight: '100%', background: '#f8fafc', display: 'flex', flexDirection: 'column', fontFamily: "'Hanken Grotesk', sans-serif", paddingBottom: 'calc(32px + env(safe-area-inset-bottom, 0px))' }}>
      
      {/* ── HEADER ── */}
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
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Rooms</h2>
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

            {/* + Add Room Button */}
            <button
              onClick={() => { setView('add'); setErrorMsg(''); setImagePreview(null); setTargetPgForRoom(selectedPgId); }}
              style={{
                background: cyan,
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
        </div>

        {/* ── KPI METRICS CARDS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Rooms</span>
            <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 900, color: '#0f172a' }}>{rooms.length}</p>
          </div>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Total Beds</span>
            <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 900, color: '#0891b2' }}>{totalBeds}</p>
          </div>
          <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#047857', textTransform: 'uppercase' }}>Occupied</span>
            <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 900, color: '#059669' }}>{occupiedBeds}</p>
          </div>
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#b45309', textTransform: 'uppercase' }}>Vacant</span>
            <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 900, color: '#d97706' }}>{vacantBeds}</p>
          </div>
        </div>
      </div>

      {/* ── FILTERS & SEARCH ── */}
      <div style={{ padding: '12px 16px', background: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              placeholder="Search by room no. or type..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 34px',
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            <span className="material-symbols-outlined" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: '#94a3b8' }}>
              search
            </span>
          </div>
        </div>

        {/* Floor Pills */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
          {uniqueFloors.map(floor => (
            <button
              key={floor}
              onClick={() => setSelectedFloor(floor)}
              style={{
                padding: '5px 12px',
                borderRadius: 20,
                border: `1.5px solid ${selectedFloor === floor ? '#0891b2' : '#e2e8f0'}`,
                background: selectedFloor === floor ? '#ecfeff' : '#ffffff',
                color: selectedFloor === floor ? '#0891b2' : '#64748b',
                fontSize: 11.5,
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {floor}
            </button>
          ))}
        </div>
      </div>

      {/* ── ROOMS LIST CARDS ── */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 36, animation: 'spin 1s infinite' }}>progress_activity</span>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Loading Rooms...</p>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 44, color: '#cbd5e1' }}>hotel</span>
            <p style={{ margin: '8px 0 2px', fontSize: 15, fontWeight: 900, color: '#0f172a' }}>No Rooms Found</p>
            <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>No rooms registered for {selectedPgName} matching this filter.</p>
            <button
              onClick={() => { setView('add'); setErrorMsg(''); setImagePreview(null); setTargetPgForRoom(selectedPgId); }}
              style={{
                marginTop: 14,
                background: cyan,
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '9px 18px',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              + Add Room Now
            </button>
          </div>
        ) : (
          filteredRooms.map(room => {
            const bedCount = parseInt(room.beds) || 1;
            const roomTenants = tenants.filter(t => String(t.roomNo) === String(room.roomNo) || String(t.room) === String(room.roomNo));
            const occupiedCount = roomTenants.length;
            const isFull = occupiedCount >= bedCount;
            const isMaintenance = room.status === 'Maintenance';

            return (
              <div
                key={room.id}
                onClick={() => setSelectedRoom(room)}
                style={{
                  background: '#ffffff',
                  borderRadius: 16,
                  border: '1px solid #e2e8f0',
                  padding: '16px',
                  boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                {/* Top: Room Number & Rent */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: '#f1f5f9' }}>
                      <img
                        src={room.image || DEFAULT_IMG}
                        alt={room.roomNo}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={e => { e.target.src = DEFAULT_IMG; }}
                      />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#0f172a' }}>
                          Room {room.roomNo}
                        </h3>
                        <span style={{ fontSize: 10, fontWeight: 800, background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: 4 }}>
                          {room.floor || 'Ground'}
                        </span>
                      </div>
                      <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 600, color: '#64748b' }}>
                        {room.roomType || 'Non AC'} · {room.seaterLabel || `${bedCount} Seater`}
                      </p>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 15, fontWeight: 900, color: '#0f172a' }}>
                      ₹{room.price || 0}<span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8' }}>/mo</span>
                    </span>
                    <div style={{ marginTop: 2 }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: 12,
                          background: isFull ? '#fee2e2' : '#dcfce7',
                          color: isFull ? '#991b1b' : '#166534'
                        }}
                      >
                        {isFull ? 'Full' : `${bedCount - occupiedCount} Vacant`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status Toggle & Details Prompt */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: '#f8fafc', borderRadius: 10, border: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: cyan }}>info</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: cyan }}>Click to view details & residents</span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleToggleMaintenance(room, e)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 8,
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

    </div>
  );
}
