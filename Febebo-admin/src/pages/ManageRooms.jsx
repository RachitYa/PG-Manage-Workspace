import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, getDoc, doc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { swapTenantsBetweenRooms } from '../utils/roomAllocationUtils';

const cyan = '#0891b2';
const DEFAULT_IMG = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=400&fit=crop';
const ROOM_TYPES = ['Single Bed', 'Double Bed', 'Triple Bed', 'Four Sharing'];
const FACILITIES = ['AC', 'WiFi', 'Attached Washroom', 'Hot Water', 'Balcony', 'TV', 'Fridge', 'Study Table', 'Chair', 'Wardrobe', 'Bed', 'Mattress', 'Geyser'];
const INVENTORY_OPTIONS = ['Mattress', 'Pillow', 'Bedsheet', 'Bucket', 'Chair', 'Table'];

function Header({ title, onBack, action }) {
  return (
    <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 , paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))'}}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: cyan, display: 'flex' }}>
        <span className="material-symbols-outlined">arrow_back</span>
      </button>
      <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: 18, color: '#0f172a', margin: 0, flex: 1, textAlign: 'center' }}>{title}</p>
      {action || <div style={{ width: 32 }} />}
    </div>
  );
}

const BASE = { maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 40 };

function RoomDetailView({ room, tenants, onBack }) {
  const navigate = useNavigate();
  const roomTenants = tenants.filter(t => t.roomNo === room.roomNo || t.room === room.roomNo);
  const primaryTenant = roomTenants.find(t => t.isPrimaryPayer || t.leaseType === 'entire_room') || roomTenants[0];
  const isEntireRoomLease = room.leaseType === 'entire_room' || roomTenants.some(t => t.isPrimaryPayer || t.leaseType === 'entire_room');
  const coResidents = primaryTenant?.coResidents || room.coResidents || [];
  const foodIncluded = room.foodIncluded !== undefined ? room.foodIncluded : (primaryTenant?.foodIncluded !== false);
  const foodPersons = room.includedFoodPersons || primaryTenant?.includedFoodPersons || (coResidents.length + 1);

  return (
    <div style={BASE}>
      <Header title={`Room No. ${room.roomNo}`} onBack={onBack} />
      <div style={{ padding: 16 }}>
        {/* Room photo + info */}
        <div style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
          <img src={room.image || DEFAULT_IMG} alt={room.name} style={{ width: '100%', height: 190, objectFit: 'cover', display: 'block' }}
            onError={e => { e.target.src = DEFAULT_IMG; }} />
          <div style={{ background: 'white', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', margin: 0 }}>{room.name}</p>
              <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>{room.roomType || "Standard Room"}</p>
              {isEntireRoomLease && (
                <span style={{ display: 'inline-block', marginTop: 4, fontSize: 11, fontWeight: 800, background: '#ede9fe', color: '#6d28d9', padding: '2px 8px', borderRadius: 6 }}>
                  🏢 Entire Flat / Single Payer
                </span>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 12, fontWeight: 700, background: roomTenants.length > 0 ? '#dcfce7' : '#f1f5f9', color: roomTenants.length > 0 ? '#059669' : '#64748b', padding: '4px 12px', borderRadius: 20 }}>
                {roomTenants.length > 0 ? 'Occupied' : 'Vacant'}
              </span>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0' }}>
                {isEntireRoomLease ? `${coResidents.length + 1} Total Occupants` : `${room.beds} beds · ${roomTenants.length} residents`}
              </p>
            </div>
          </div>
        </div>

        {/* Food Plan Badge */}
        <div style={{ background: foodIncluded ? '#ecfdf5' : '#fffbeb', border: `1px solid ${foodIncluded ? '#a7f3d0' : '#fde68a'}`, borderRadius: 12, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: foodIncluded ? '#059669' : '#d97706' }}>
              {foodIncluded ? 'restaurant' : 'no_meals'}
            </span>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: foodIncluded ? '#065f46' : '#92400e' }}>
                {foodIncluded ? `Food / Mess Included (${foodPersons} Person${foodPersons > 1 ? 's' : ''})` : 'Self Cooking / Mess Excluded'}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: foodIncluded ? '#047857' : '#b45309' }}>
                {foodIncluded ? 'Counted in kitchen meal preparation' : 'No food headcount counted for this room'}
              </p>
            </div>
          </div>
        </div>

        <p style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', margin: '0 0 12px' }}>
          {isEntireRoomLease ? 'Primary Payer (Main Resident)' : `Residents (${roomTenants.length})`}
        </p>
        
        {roomTenants.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e2e8f0', padding: '36px', textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 44, color: '#cbd5e1', display: 'block', marginBottom: 8 }}>person_off</span>
            <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>No residents in this room</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {roomTenants.map(user => (
              <div key={user.id} onClick={() => navigate(`/user/${user.id}`, { state: { user } })}
                style={{ background: 'white', borderRadius: 14, border: user.isPrimaryPayer || isEntireRoomLease ? '1.5px solid #8b5cf6' : '1px solid #e2e8f0', padding: 12, display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <img src={user.kyc?.profilePhoto || user.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=0891b2&color=fff&size=150`} alt={user.name} style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <p style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', margin: '0 0 4px' }}>{user.name}</p>
                    {(user.isPrimaryPayer || isEntireRoomLease) && (
                      <span style={{ fontSize: 10, fontWeight: 800, background: '#7c3aed', color: 'white', padding: '2px 6px', borderRadius: 4 }}>PRIMARY PAYER</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 13, color: cyan }}>badge</span>
                    <span style={{ fontSize: 12, color: '#475569' }}>{user.studentId || 'No ID'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 13, color: cyan }}>phone</span>
                    <span style={{ fontSize: 12, color: '#475569' }}>{user.phone || 'No Phone'}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button onClick={(e) => { e.stopPropagation(); navigate('/chat', { state: { contactId: user.id, name: user.name } }); }} style={{ background: '#ecfeff', border: '1px solid #a5f3fc', color: cyan, borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chat</span>
                  </button>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#94a3b8' }}>chevron_right</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── CO-RESIDENTS / ROOMMATES SECTION (For Entire Room Lease) ── */}
        {isEntireRoomLease && (
          <div style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <p style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', margin: 0 }}>
                Co-Residents / Roommates ({coResidents.length})
              </p>
              <span style={{ fontSize: 11, color: '#64748b' }}>Non-paying co-occupants</span>
            </div>

            {coResidents.length === 0 ? (
              <div style={{ background: '#f8fafc', border: '1.5px dashed #cbd5e1', borderRadius: 14, padding: '20px', textAlign: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#94a3b8', display: 'block', marginBottom: 6 }}>group_add</span>
                <p style={{ color: '#64748b', fontSize: 13, margin: 0, fontWeight: 600 }}>No co-residents listed yet</p>
                <p style={{ color: '#94a3b8', fontSize: 11, margin: '4px 0 0' }}>Primary resident can register roommates via student app, or admin can update in tenant profile.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {coResidents.map((cr, idx) => (
                  <div key={idx} style={{ background: 'white', borderRadius: 14, border: '1px solid #e2e8f0', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 42, height: 42, borderRadius: 10, background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16 }}>
                        {cr.name ? cr.name.charAt(0).toUpperCase() : 'R'}
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{cr.name}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
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

export default function ManageRooms() {
  const navigate = useNavigate();
  const { user, activePgId } = useAuth();
  
  const [view, setView] = useState('listing'); // 'listing' | 'add'
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'occupied' | 'vacant'
  const [selectedRoom, setSelectedRoom] = useState(null);
  
  const [rooms, setRooms] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [pgStats, setPgStats] = useState({ totalSeats: 0, totalRooms: 0 });
  const [loading, setLoading] = useState(true);
  const [pgRents, setPgRents] = useState([]);

  // Add Room State
  const [roomNo, setRoomNo] = useState('');
  const [seaterType, setSeaterType] = useState('');
  const [roomRent, setRoomRent] = useState('');
  const [roomType, setRoomType] = useState('Non AC Room');
  const [leaseType, setLeaseType] = useState('bed_sharing'); // 'bed_sharing' | 'entire_room'
  const [foodIncluded, setFoodIncluded] = useState(true);
  const [includedFoodPersons, setIncludedFoodPersons] = useState(1);
  const [selectedFacilities, setSelectedFacilities] = useState([]);
  const [selectedInventory, setSelectedInventory] = useState([]);
  const [showFacilityDrop, setShowFacilityDrop] = useState(false);
  const [showInventoryDrop, setShowInventoryDrop] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const facilityDropRef = useRef(null);
  const inventoryDropRef = useRef(null);
  // Swap Residents State
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapTenantAId, setSwapTenantAId] = useState('');
  const [swapTenantBId, setSwapTenantBId] = useState('');
  const [isSwappingResidents, setIsSwappingResidents] = useState(false);

  const handleExecuteSwap = async (e) => {
    e.preventDefault();
    if (!swapTenantAId || !swapTenantBId) {
      alert('Please select both residents to swap');
      return;
    }
    if (swapTenantAId === swapTenantBId) {
      alert('Please select two different residents');
      return;
    }

    const tenantA = tenants.find(t => t.id === swapTenantAId || t.tenantId === swapTenantAId);
    const tenantB = tenants.find(t => t.id === swapTenantBId || t.tenantId === swapTenantBId);

    if (!tenantA || !tenantB) {
      alert('One or both selected residents could not be found');
      return;
    }

    setIsSwappingResidents(true);
    try {
      await swapTenantsBetweenRooms({
        tenantA,
        tenantB,
        adminId: user.uid,
        pgId: activePgId,
        adminName: user?.displayName || user?.name || 'Admin'
      });

      alert(`Successfully swapped rooms between ${tenantA.name} and ${tenantB.name}!`);
      setShowSwapModal(false);
      setSwapTenantAId('');
      setSwapTenantBId('');
      fetchData();
    } catch (err) {
      console.error('Error swapping residents:', err);
      alert('Failed to swap residents: ' + err.message);
    } finally {
      setIsSwappingResidents(false);
    }
  };

  const fetchData = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const matchesPg = (itemPgId) => {
        if (!activePgId || activePgId === 'primary') return !itemPgId || itemPgId === 'primary' || itemPgId === user.uid;
        return itemPgId === activePgId;
      };

      // Get PG Stats
      const targetPgOwnerId = (!activePgId || activePgId === 'primary') ? user.uid : activePgId;
      const pgDoc = await getDoc(doc(db, 'pg_owners', targetPgOwnerId));
      if (pgDoc.exists()) {
        const pd = pgDoc.data().propertyDetails || {};
        setPgStats({
          totalSeats: parseInt(pd.totalSeats) || 0,
          totalRooms: parseInt(pd.totalRooms) || 0
        });
        if (pd.rents) setPgRents(pd.rents);
      }

      // Get Rooms
      const rSnap = await getDocs(query(collection(db, 'rooms'), where('adminId', '==', user.uid)));
      let fetchedRooms = rSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(d => matchesPg(d.pgId));
      
      // Sort rooms by roomNo (numeric + alphabetic)
      fetchedRooms.sort((a, b) => {
        const roomA = a.roomNo || '';
        const roomB = b.roomNo || '';
        return roomA.localeCompare(roomB, undefined, { numeric: true, sensitivity: 'base' });
      });

      setRooms(fetchedRooms);

      // Get Tenants (Active)
      const tSnap = await getDocs(query(collection(db, 'tenants'), where('adminId', '==', user.uid)));
      const fetchedTenants = tSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(d => matchesPg(d.pgId))
        .filter(t => t.status === 'Approved' || t.status === 'Current User' || t.status === 'Notice' || t.status === 'On Notice Period' || t.status === 'Upcoming User');
      setTenants(fetchedTenants);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, activePgId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (facilityDropRef.current && !facilityDropRef.current.contains(event.target)) {
        setShowFacilityDrop(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleAddRoom = async (e) => {
    e.preventDefault();
    if (!roomNo) return;
    setErrorMsg('');

    const isMatchPg = (rPgId) => {
      if (!activePgId || activePgId === 'primary') return !rPgId || rPgId === 'primary' || rPgId === user.uid;
      return rPgId === activePgId;
    };

    if (rooms.filter(r => isMatchPg(r.pgId)).some(r => String(r.roomNo).trim() === String(roomNo).trim())) {
      setErrorMsg(`Room No. ${roomNo} is already registered in this PG!`);
      return;
    }

    const existingSeats = rooms.reduce((acc, r) => acc + (parseInt(r.beds || r.roomBeds) || 0), 0);
    const addingSeats = parseInt(seaterType) || 1;
    if (existingSeats + addingSeats > pgStats.totalSeats) {
        setErrorMsg(`Cannot add room! Total seats will exceed registered capacity (${pgStats.totalSeats}). Currently configured seats: ${existingSeats}.`);
        return;
    }



    setIsSaving(true);
    try {
      await addDoc(collection(db, 'rooms'), {
        adminId: user.uid, pgId: activePgId, 
        name: roomNo,
        roomNo: roomNo,
        beds: parseInt(seaterType) || 1,
        seaterLabel: `${seaterType} Seater`,
        price: Number(roomRent) || 0,
        roomType: roomType,
        leaseType: leaseType, // 'bed_sharing' | 'entire_room'
        foodIncluded: foodIncluded,
        includedFoodPersons: foodIncluded ? (parseInt(includedFoodPersons) || parseInt(seaterType) || 1) : 0,
        facilities: selectedFacilities,
        inventory: selectedInventory,
        image: imagePreview || null,
        createdAt: new Date().toISOString()
      });
      setView('listing');
      setImagePreview(null);
      setRoomNo('');
      setSeaterType('');
      setRoomRent('');
      setRoomType('Non AC Room');
      setLeaseType('bed_sharing');
      setFoodIncluded(true);
      setIncludedFoodPersons(1);
      setSelectedFacilities([]);
      setSelectedInventory([]);
      fetchData(); // Refresh list
    } catch (err) {
      console.error(err);
      alert('Failed to add room: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleFacility = f => setSelectedFacilities(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  const toggleInventory = f => setSelectedInventory(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);

  const compressDataUrl = (dataUrl) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6)); // 60% quality JPEG
      };
      img.src = dataUrl;
    });
  };

  const handleImageUpload = async (sourceType) => {
    setShowImageOptions(false);
    try {
      const image = await Camera.getPhoto({
        quality: 40,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: sourceType === 'camera' ? CameraSource.Camera : CameraSource.Photos,
        width: 600,
        height: 600
      });

      if (image.dataUrl) {
        // Double-compress using Canvas in case Capacitor ignores width/height on Web PWA
        const compressedDataUrl = await compressDataUrl(image.dataUrl);
        setImagePreview(compressedDataUrl);
      }
    } catch (err) {
      console.log('User cancelled or camera error', err);
    }
  };

  if (view === 'add') {
    return (
      <div style={{ ...BASE, paddingBottom: 80 }}>
        <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 , paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))'}}>
          <button onClick={() => { setView('listing'); setImagePreview(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: cyan }}>
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: 18, color: '#0f172a', margin: 0, flex: 1, textAlign: 'center' }}>Add Room</p>
          <div style={{ width: 32 }} />
        </div>
        <div style={{ padding: 16 }}>
          {errorMsg && (
            <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#e11d48', padding: '12px 16px', borderRadius: 12, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 600 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>error</span>
              {errorMsg}
            </div>
          )}
          <form onSubmit={handleAddRoom}>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Room Number <span style={{ color: '#e11d48' }}>*</span></label>
              <input value={roomNo} onChange={e => setRoomNo(e.target.value)} required placeholder="e.g. 101" style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 15, fontFamily: 'inherit', background: 'white', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            {/* Lease Model (Single Payer vs Individual Bed) */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Occupancy / Lease Model <span style={{ color: '#e11d48' }}>*</span></label>
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

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Capacity (Max Beds / Persons) <span style={{ color: '#e11d48' }}>*</span></label>
              <select value={seaterType} onChange={e => {
                const val = e.target.value;
                setSeaterType(val);
                setIncludedFoodPersons(parseInt(val) || 1);
                const selectedRentObj = pgRents.find(r => String(r.seater) === String(val));
                if (selectedRentObj) {
                  setRoomRent(selectedRentObj.rent);
                } else {
                  setRoomRent('');
                }
              }} required style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 15, fontFamily: 'inherit', background: 'white', outline: 'none', boxSizing: 'border-box' }}>
                <option value="">Select Seater Type</option>
                {pgRents.map((r, i) => (
                  <option key={i} value={r.seater}>{r.seater} Seater / Occupants</option>
                ))}
              </select>
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Price <span style={{ color: '#e11d48' }}>*</span></label>
              <input type="number" value={roomRent} onChange={e => setRoomRent(e.target.value)} placeholder="Rent amount per month" style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 15, fontFamily: 'inherit', background: 'white', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Room Type (e.g. AC / Non-AC) <span style={{ color: '#e11d48' }}>*</span></label>
              <select value={roomType} onChange={e => setRoomType(e.target.value)} required style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 15, fontFamily: 'inherit', background: 'white', outline: 'none', boxSizing: 'border-box' }}>
                <option value="Non AC Room">Non AC Room</option>
                <option value="AC Room">AC Room</option>
                <option value="Cooler Room">Cooler Room</option>
                <option value="Standard Room">Standard Room</option>
              </select>
            </div>

            {/* Food Plan Inclusion */}
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
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, background: 'white' }}
                  />
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: '#059669' }}>✓ Kitchen mess headcount will automatically include {includedFoodPersons} meal portion(s).</p>
                </div>
              )}
            </div>


            {/* Room Image Upload */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Room Image</label>
              <div onClick={() => setShowImageOptions(true)} style={{ width: '100%', height: 160, border: '2px dashed #cbd5e1', borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#f8fafc', overflow: 'hidden' }}>
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

            <button type="submit" disabled={isSaving} style={{ width: '100%', marginTop: 24, padding: '14px 0', background: cyan, color: 'white', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>
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
              
              <button onClick={() => handleImageUpload('camera')} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, marginBottom: 12, cursor: 'pointer', fontFamily: 'inherit', boxSizing: 'border-box' }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ color: cyan }}>photo_camera</span>
                </div>
                <span style={{ fontSize: 16, fontWeight: 600, color: '#334155' }}>Take a Photo</span>
              </button>

              <button onClick={() => handleImageUpload('gallery')} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, marginBottom: 16, cursor: 'pointer', fontFamily: 'inherit', boxSizing: 'border-box' }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ color: '#16a34a' }}>photo_library</span>
                </div>
                <span style={{ fontSize: 16, fontWeight: 600, color: '#334155' }}>Choose from Folder</span>
              </button>

              <button onClick={() => setShowImageOptions(false)} style={{ width: '100%', padding: '16px', background: 'white', border: '1px solid #e2e8f0', color: '#64748b', borderRadius: 16, fontWeight: 700, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (selectedRoom) return <RoomDetailView room={selectedRoom} tenants={tenants} onBack={() => setSelectedRoom(null)} />;

  // Enhance rooms with live tenant counts
  const liveRooms = rooms.map(r => {
    const occ = tenants.filter(t => t.roomNo === r.roomNo || t.room === r.roomNo).length;
    return { ...r, occupied_count: occ, vacant_count: Math.max(0, (r.beds || 0) - occ) };
  });

  // Dynamic calculations based on live data
  const occupiedSeatsTotal = liveRooms.reduce((acc, r) => acc + r.occupied_count, 0);
  // If the admin has defined rooms, calculate capacity across defined rooms
  const definedCapacity = rooms.reduce((acc, r) => acc + (r.beds || 0), 0);
  const displayTotalSeats = Math.max(pgStats.totalSeats, definedCapacity);
  const vacantSeatsTotal = Math.max(0, displayTotalSeats - occupiedSeatsTotal);

  const filtered = liveRooms.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = r.roomNo.includes(q) || r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q);
    
    if (filter === 'occupied') return matchSearch && r.occupied_count > 0;
    if (filter === 'vacant') return matchSearch && r.vacant_count > 0;
    return matchSearch;
  });

  return (
    <div style={BASE}>
      <Header 
        title="Seats & Rooms" 
        onBack={() => navigate('/admin-dashboard')} 
        action={
          <button 
            onClick={() => setShowSwapModal(true)} 
            style={{ 
              background: '#f5f3ff', 
              border: '1.5px solid #c4b5fd', 
              color: '#7c3aed', 
              borderRadius: 10, 
              padding: '6px 10px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 4, 
              cursor: 'pointer', 
              fontWeight: 700, 
              fontSize: 12 
            }}
            title="Swap two residents across rooms"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>sync_alt</span>
            <span>Swap</span>
          </button>
        } 
      />
      <div style={{ padding: 16 }}>
        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <span className="material-symbols-outlined" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: cyan, fontSize: 20, pointerEvents: 'none' }}>search</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by room no / type"
            style={{ width: '100%', paddingLeft: 40, paddingRight: 16, paddingTop: 12, paddingBottom: 12, border: `1.5px solid ${cyan}`, borderRadius: 12, fontSize: 15, fontFamily: 'inherit', background: 'white', color: '#1e293b', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { id: 'all', label: 'Total Seats', val: displayTotalSeats, color: cyan }, 
            { id: 'occupied', label: 'Occupied', val: occupiedSeatsTotal, color: '#059669' }, 
            { id: 'vacant', label: 'Vacant', val: vacantSeatsTotal > 0 ? vacantSeatsTotal : 0, color: '#e11d48' }
          ].map((s, i) => (
            <div key={i} onClick={() => setFilter(s.id)} style={{ background: 'white', border: `1.5px solid ${filter === s.id ? s.color : '#e2e8f0'}`, borderRadius: 12, padding: '12px 8px', textAlign: 'center', cursor: 'pointer', boxShadow: filter === s.id ? `0 4px 12px ${s.color}33` : 'none', transition: 'all 0.2s', opacity: filter === s.id ? 1 : 0.7 }}>
              <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 4px', fontWeight: 500 }}>{s.label}</p>
              <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 24, fontWeight: 800, color: s.color, margin: 0 }}>{s.val}</p>
            </div>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ display: 'inline-block', width: 30, height: 30, border: '3px solid #e2e8f0', borderTopColor: cyan, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 48, display: 'block', marginBottom: 8 }}>search_off</span>
            No rooms match your filter.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(room => (
              <div key={room.id} style={{ background: 'white', borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                {/* Room image */}
                <div style={{ position: 'relative' }}>
                  {room.image && (
                    <img src={room.image} alt={room.name} style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
                  )}
                  {filter === 'vacant' ? (
                    <span style={{ position: 'absolute', top: 10, right: 10, background: '#e11d48', color: 'white', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20 }}>
                      {room.vacant_count} Vacant
                    </span>
                  ) : filter === 'occupied' ? (
                    <span style={{ position: 'absolute', top: 10, right: 10, background: '#059669', color: 'white', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20 }}>
                      {room.occupied_count}/{room.beds} Occupied
                    </span>
                  ) : (
                    <span style={{ position: 'absolute', top: 10, right: 10, background: room.occupied_count > 0 ? '#059669' : '#64748b', color: 'white', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20 }}>
                      {room.occupied_count}/{room.beds} Occupied
                    </span>
                  )}
                  <div style={{ position: 'absolute', bottom: 10, left: 12, background: 'rgba(0,0,0,0.55)', borderRadius: 8, padding: '4px 10px' }}>
                    <span style={{ color: 'white', fontWeight: 700, fontSize: 13 }}>Room No. {room.roomNo}</span>
                  </div>
                </div>
                {/* Room info */}
                <div style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <p style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', margin: 0 }}>{room.name}</p>
                        {room.leaseType === 'entire_room' && (
                          <span style={{ fontSize: 10, fontWeight: 800, background: '#ede9fe', color: '#6d28d9', padding: '2px 6px', borderRadius: 4 }}>
                            🏢 Entire Flat
                          </span>
                        )}
                        {room.foodIncluded === false ? (
                          <span style={{ fontSize: 10, fontWeight: 800, background: '#fffbeb', color: '#b45309', padding: '2px 6px', borderRadius: 4 }}>
                            🚫 No Food
                          </span>
                        ) : (
                          <span style={{ fontSize: 10, fontWeight: 800, background: '#ecfdf5', color: '#059669', padding: '2px 6px', borderRadius: 4 }}>
                            🍽️ Food Inc.
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>{room.roomType || "Standard Room"} · {room.beds} {room.leaseType === 'entire_room' ? 'occupants max' : 'beds total'}</p>
                    </div>
                  </div>
                  
                  {room.occupied_count === 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#94a3b8' }}>person_off</span>
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>No residents assigned</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button onClick={() => setSelectedRoom(room)} style={{ flex: 1, padding: '8px 0', background: '#ecfeff', color: cyan, border: `1px solid ${cyan}`, borderRadius: 10, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {/* Floating Add Button */}
        <button onClick={() => setView('add')} style={{
          position: 'fixed', bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))', right: 24, width: 56, height: 56, borderRadius: '50%',
          background: cyan, color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(8, 145, 178, 0.4)', cursor: 'pointer', zIndex: 50
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 28 }}>add</span>
        </button>

        {/* ── SWAP RESIDENTS MODAL ── */}
        {showSwapModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <div onClick={() => setShowSwapModal(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)' }} />
            <div style={{ position: 'relative', background: 'white', borderRadius: '24px 24px 0 0', padding: '24px 20px 40px', maxHeight: '85vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-symbols-outlined" style={{ color: '#7c3aed', fontSize: 22 }}>sync_alt</span>
                  </div>
                  <div>
                    <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>Swap Residents</p>
                    <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Directly exchange rooms between two students</p>
                  </div>
                </div>
                <button onClick={() => setShowSwapModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#475569' }}>close</span>
                </button>
              </div>

              <form onSubmit={handleExecuteSwap} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase' }}>Resident A <span style={{ color: '#e11d48' }}>*</span></label>
                  <select
                    value={swapTenantAId}
                    onChange={e => setSwapTenantAId(e.target.value)}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                    required
                  >
                    <option value="">Select first resident...</option>
                    {tenants.filter(t => (t.roomNo || t.room)).map(t => (
                      <option key={t.id || t.tenantId} value={t.id || t.tenantId}>
                        {t.name} (Room {t.roomNo || t.room} · Bed {t.bedNo || '1'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase' }}>Resident B <span style={{ color: '#e11d48' }}>*</span></label>
                  <select
                    value={swapTenantBId}
                    onChange={e => setSwapTenantBId(e.target.value)}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                    required
                  >
                    <option value="">Select second resident...</option>
                    {tenants
                      .filter(t => (t.id !== swapTenantAId && t.tenantId !== swapTenantAId) && (t.roomNo || t.room))
                      .map(t => (
                        <option key={t.id || t.tenantId} value={t.id || t.tenantId}>
                          {t.name} (Room {t.roomNo || t.room} · Bed {t.bedNo || '1'})
                        </option>
                      ))}
                  </select>
                </div>

                {/* Swap Preview Box */}
                {swapTenantAId && swapTenantBId && (() => {
                  const tA = tenants.find(t => t.id === swapTenantAId || t.tenantId === swapTenantAId);
                  const tB = tenants.find(t => t.id === swapTenantBId || t.tenantId === swapTenantBId);
                  if (!tA || !tB) return null;
                  return (
                    <div style={{ background: '#f5f3ff', border: '1.5px dashed #c4b5fd', borderRadius: 14, padding: 14 }}>
                      <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 800, color: '#6d28d9', textAlign: 'center', textTransform: 'uppercase' }}>
                        ⚡ Live Swap Preview
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                        <div>
                          <strong>{tA.name}</strong> ➜ Room {tB.roomNo || tB.room}
                        </div>
                        <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#7c3aed' }}>sync_alt</span>
                        <div>
                          <strong>{tB.name}</strong> ➜ Room {tA.roomNo || tA.room}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <button
                  type="submit"
                  disabled={isSwappingResidents || !swapTenantAId || !swapTenantBId}
                  style={{
                    background: isSwappingResidents ? '#94a3b8' : '#7c3aed',
                    color: 'white',
                    border: 'none',
                    borderRadius: 12,
                    padding: '14px',
                    fontSize: 15,
                    fontWeight: 800,
                    cursor: isSwappingResidents ? 'not-allowed' : 'pointer',
                    marginTop: 6
                  }}
                >
                  {isSwappingResidents ? 'Swapping Residents...' : 'Confirm & Execute Swap'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
