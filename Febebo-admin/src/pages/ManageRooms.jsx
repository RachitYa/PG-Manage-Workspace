import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, getDoc, doc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

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
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 12, fontWeight: 700, background: roomTenants.length > 0 ? '#dcfce7' : '#f1f5f9', color: roomTenants.length > 0 ? '#059669' : '#64748b', padding: '4px 12px', borderRadius: 20 }}>
                {roomTenants.length > 0 ? 'Occupied' : 'Vacant'}
              </span>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0' }}>{room.beds} beds · {roomTenants.length} residents</p>
            </div>
          </div>
        </div>

        <p style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', margin: '0 0 12px' }}>Residents ({roomTenants.length})</p>
        
        {roomTenants.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e2e8f0', padding: '36px', textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 44, color: '#cbd5e1', display: 'block', marginBottom: 8 }}>person_off</span>
            <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>No residents in this room</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {roomTenants.map(user => (
              <div key={user.id} onClick={() => navigate(`/user/${user.id}`, { state: { user } })}
                style={{ background: 'white', borderRadius: 14, border: '1px solid #e2e8f0', padding: 12, display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <img src={user.kyc?.profilePhoto || user.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=0891b2&color=fff&size=150`} alt={user.name} style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', margin: '0 0 4px' }}>{user.name}</p>
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
  const [selectedFacilities, setSelectedFacilities] = useState([]);
  const [selectedInventory, setSelectedInventory] = useState([]);
  const [showFacilityDrop, setShowFacilityDrop] = useState(false);
  const [showInventoryDrop, setShowInventoryDrop] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [customFacilityInput, setCustomFacilityInput] = useState('');
  const [showCustomFacilityInput, setShowCustomFacilityInput] = useState(false);
  const facilityDropRef = useRef(null);
  
  const fetchData = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      // Get PG Stats
      const pgDoc = await getDoc(doc(db, 'pg_owners', user.uid));
      if (pgDoc.exists()) {
        const pd = pgDoc.data().propertyDetails || {};
        setPgStats({
          totalSeats: parseInt(pd.totalSeats) || 0,
          totalRooms: parseInt(pd.totalRooms) || 0
        });
        if (pd.rents) setPgRents(pd.rents);
      }

      // Get Rooms
      const rSnap = await getDocs(query(collection(db, 'rooms'), where('adminId', '==', user.uid), where('pgId', '==', activePgId)));
      let fetchedRooms = rSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Sort rooms by roomNo (numeric + alphabetic)
      fetchedRooms.sort((a, b) => {
        const roomA = a.roomNo || '';
        const roomB = b.roomNo || '';
        return roomA.localeCompare(roomB, undefined, { numeric: true, sensitivity: 'base' });
      });

      setRooms(fetchedRooms);

      // Get Tenants (Active)
      const tSnap = await getDocs(query(collection(db, 'tenants'), where('adminId', '==', user.uid), where('pgId', '==', activePgId)));
      const fetchedTenants = tSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(t => t.status === 'Approved' || t.status === 'Current User' || t.status === 'Notice' || t.status === 'On Notice Period' || t.status === 'Upcoming User');
      setTenants(fetchedTenants);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

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

    if (rooms.some(r => String(r.roomNo).trim() === String(roomNo).trim())) {
      setErrorMsg(`Room No. ${roomNo} is already registered!`);
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
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Seater Type <span style={{ color: '#e11d48' }}>*</span></label>
              <select value={seaterType} onChange={e => {
                const val = e.target.value;
                setSeaterType(val);
                const selectedRentObj = pgRents.find(r => String(r.seater) === String(val));
                if (selectedRentObj) {
                  setRoomRent(selectedRentObj.rent);
                } else {
                  setRoomRent('');
                }
              }} required style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 15, fontFamily: 'inherit', background: 'white', outline: 'none', boxSizing: 'border-box' }}>
                <option value="">Select Seater Type</option>
                {pgRents.map((r, i) => (
                  <option key={i} value={r.seater}>{r.seater} Seater</option>
                ))}
              </select>
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Price <span style={{ color: '#e11d48' }}>*</span></label>
              <input type="number" value={roomRent} readOnly placeholder="Auto-filled from PG Registration" style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 15, fontFamily: 'inherit', background: '#f8fafc', color: '#475569', outline: 'none', boxSizing: 'border-box', cursor: 'not-allowed' }} />
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

  // Dynamic calculations based on live data
  const occupiedSeatsTotal = tenants.length;
  // If the admin has defined rooms, we can calculate true vacant seats across defined rooms
  // If not, we just show global stats from the profile.
  const definedCapacity = rooms.reduce((acc, r) => acc + (r.beds || 0), 0);
  const displayTotalSeats = Math.max(pgStats.totalSeats, definedCapacity);
  const vacantSeatsTotal = displayTotalSeats - occupiedSeatsTotal;

  // Enhance rooms with live tenant counts
  const liveRooms = rooms.map(r => {
    const occ = tenants.filter(t => t.roomNo === r.roomNo || t.room === r.roomNo).length;
    return { ...r, occupied_count: occ, vacant_count: (r.beds || 0) - occ };
  });

  const filtered = liveRooms.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = r.roomNo.includes(q) || r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q);
    
    if (filter === 'occupied') return matchSearch && r.occupied_count > 0;
    if (filter === 'vacant') return matchSearch && r.vacant_count > 0;
    return matchSearch;
  });

  return (
    <div style={BASE}>
      <Header title="Seats & Rooms" onBack={() => navigate('/admin-dashboard')} action={<div style={{ width: 32 }} />} />
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
                      <p style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', margin: '0 0 2px' }}>{room.name}</p>
                      <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{room.roomType || "Standard Room"} · {room.beds} beds total</p>
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
          position: 'fixed', bottom: 24, right: 24, width: 56, height: 56, borderRadius: '50%',
          background: cyan, color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(8, 145, 178, 0.4)', cursor: 'pointer', zIndex: 50
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 28 }}>add</span>
        </button>
      </div>
    </div>
  );
}
