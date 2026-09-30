import React, { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MapPin, Image as ImageIcon, Check, ChevronDown, Navigation, Building2, Hash, IndianRupee, User, Phone, Mail, Calendar, Trash2 } from 'lucide-react';
import { Geolocation } from '@capacitor/geolocation';
import { doc, setDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';

// ── Custom Dropdown ────────────────────────────────────────────────────────────
function CustomSelect({ options, value, onChange, placeholder }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const selected = options.find(o => o === value);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderRadius: 16,
          border: open ? '2px solid #0891b2' : '2px solid transparent',
          background: open ? '#ffffff' : '#f8fafc', cursor: 'pointer',
          boxShadow: open ? '0 8px 24px rgba(8,145,178,0.15)' : 'none',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', userSelect: 'none'
        }}
      >
        <span style={{ fontSize: 15, color: selected ? '#0f172a' : '#94a3b8', fontWeight: selected ? 600 : 500 }}>
          {selected || placeholder}
        </span>
        <ChevronDown size={20} color="#64748b" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s ease' }} />
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 99,
          background: 'white', borderRadius: 16, border: '1px solid #e2e8f0',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)', overflow: 'hidden', padding: 8
        }}>
          {options.map(opt => (
            <div
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              style={{
                padding: '14px 16px', borderRadius: 12, cursor: 'pointer', fontSize: 15,
                fontWeight: value === opt ? 700 : 500,
                color: value === opt ? '#0891b2' : '#334155',
                background: value === opt ? '#ecfeff' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => { if (value !== opt) e.currentTarget.style.background = '#f8fafc'; }}
              onMouseLeave={e => { if (value !== opt) e.currentTarget.style.background = 'transparent'; }}
            >
              {opt}
              {value === opt && <Check size={18} strokeWidth={3} color="#0891b2" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const AMENITIES = [
  { id: 'bed', label: 'Bed', icon: '🛏️' },
  { id: 'mattress', label: 'Mattress', icon: '🔲' },
  { id: 'bedsheet', label: 'Bedsheet', icon: '📜' },
  { id: 'pillow', label: 'Pillow', icon: '☁️' },
  { id: 'pillow-cover', label: 'Pillow Cover', icon: '📨' },
  { id: 'chair', label: 'Chair', icon: '🪑' },
  { id: 'table', label: 'Study Table', icon: '🪚' },
  { id: 'ac', label: 'AC', icon: '❄️' },
  { id: 'fridge', label: 'Fridge', icon: '🧊' },
  { id: 'wifi', label: 'Wi-Fi', icon: '📶' },
  { id: 'washing-machine', label: 'Washing Machine', icon: '🧺' },
];

export default function CreatePGProfile() {

  const handleProfileImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setProfileImage(event.target.result);
    reader.readAsDataURL(file);
  };

  const navigate = useNavigate();
  const { user, completeProfile, activePgId } = useAuth();
  const [searchParams] = useSearchParams();
  const isNewPgMode = searchParams.get('mode') === 'new'; // Adding a 2nd/3rd PG, not first-time setup

  const [isOnLease, setIsOnLease] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [images, setImages] = useState([]);
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPgSuccess, setShowPgSuccess] = useState(false);
  const [customAmenities, setCustomAmenities] = useState([]);
  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  
  const [pgName, setPgName] = useState('');
  const [totalRooms, setTotalRooms] = useState('');
  const [totalSeats, setTotalSeats] = useState('');
  const [rents, setRents] = useState([
    { seater: 1, rent: '' },
    { seater: 2, rent: '' },
    { seater: 3, rent: '' },
    { seater: 4, rent: '' }
  ]);
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [leaseAmount, setLeaseAmount] = useState('');
  const [pgType, setPgType] = useState('Unisex');
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState('');

  // Admin Personal Info
  const [adminName, setAdminName] = useState(user?.name || '');
  const [profileImage, setProfileImage] = useState(null);
  const [adminPhone, setAdminPhone] = useState('');
  const [adminEmail, setAdminEmail] = useState(user?.email || '');
  const [adminDob, setAdminDob] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [locState, setLocState]   = useState('');
  const [locCity, setLocCity]     = useState('');
  const [locStreet, setLocStreet] = useState('');
  const [locPin, setLocPin]       = useState('');
  const [locFull, setLocFull]     = useState('');
  const [mapLink, setMapLink]     = useState('');

  const handleGetLocation = async () => {
    try {
      const permission = await Geolocation.checkPermissions();
      if (permission.location !== 'granted') {
        const request = await Geolocation.requestPermissions();
        if (request.location !== 'granted') {
          return alert('Location permission denied. Please enable it in app settings.');
        }
      }
      
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });
      setLat(position.coords.latitude);
      setLng(position.coords.longitude);
      setMapLink(`https://maps.google.com/?q=${position.coords.latitude},${position.coords.longitude}`);
    } catch (err) {
      alert('Unable to get location. Please ensure GPS is turned on.');
      console.error(err);
    }
  };


  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
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
          resolve(canvas.toDataURL('image/jpeg', 0.6)); // 60% quality JPEG compression
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleGalleryChange = async (e) => {
    const files = Array.from(e.target.files);
    setShowPhotoPicker(false);
    for (let file of files) {
      if (file) {
        const compressed = await compressImage(file);
        setImages(prev => [...prev, compressed]);
      }
    }
  };

  const handleCameraChange = async (e) => {
    const file = e.target.files[0];
    setShowPhotoPicker(false);
    if (file) {
      const compressed = await compressImage(file);
      setImages(prev => [...prev, compressed]);
    }
  };
  
  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddCustomAmenity = () => {
    const name = window.prompt('Enter custom amenity name:');
    if (name && name.trim()) {
      const id = 'custom-' + name.trim().toLowerCase().replace(/\s+/g, '-');
      setCustomAmenities(prev => [...prev, { id, label: name.trim(), icon: '✨' }]);
      setSelectedAmenities(prev => [...prev, id]);
    }
  };

  const allAmenities = [...AMENITIES, ...customAmenities];

  const toggleAmenity = (id) => {
    setSelectedAmenities(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handlePinChange = async (e) => {
    const pin = e.target.value;
    setLocPin(pin);
    if (pin.length === 6) {
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        const data = await res.json();
        if (data && data[0].Status === 'Success') {
          const postOffice = data[0].PostOffice[0];
          setLocState(postOffice.State);
          setLocCity(postOffice.District);
        } else {
          setErrorMsg("Invalid Pincode. Please check again.");
          setTimeout(() => setErrorMsg(''), 4000);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (adminPhone.replace(/\D/g, '').length !== 10) {
       setErrorMsg("Phone number must be exactly 10 digits.");
       setTimeout(() => setErrorMsg(''), 4000);
       window.scrollTo({ top: 0, behavior: 'smooth' });
       return;
    }
    setIsSaving(true);
    try {
      const pgData = {
        adminId: user.uid,
        adminName: adminName,
        profileImage: profileImage,
        phone: adminPhone,
        email: adminEmail,
        dob: adminDob,
        pgName: pgName,
        pgType: pgType,
        description: description,
        rules: rules,
        rating: 5.0,
        location: {
          lat: lat,
          lng: lng,
          city: locCity,
          state: locState,
          address: locFull,
          pin: locPin,
          street: locStreet,
          mapLink: mapLink
        },
        propertyDetails: {
          totalRooms: totalRooms,
          totalSeats: totalSeats,
          rents: rents,
          registrationNumber: registrationNumber,
          isOnLease: isOnLease,
          leaseAmount: isOnLease ? leaseAmount : 0
        },
        amenities: selectedAmenities,
        images: images.length > 0 ? images : null,
        status: 'Pending',
        createdAt: new Date().toISOString()
      };

      if (isNewPgMode) {
        // Adding a new additional PG → save to top-level collection so Student App can see it
        await addDoc(collection(db, 'pg_owners'), pgData);
        setShowPgSuccess(true); // Show themed success screen instead of browser alert
      } else {
        // First-time PG setup → overwrite primary doc as before
        await setDoc(doc(db, 'pg_owners', user.uid), pgData);
        if (completeProfile) {
          completeProfile();
        }
        navigate('/admin-dashboard');
      }
    } catch (error) {
      console.error(error);
      alert("Error saving profile: " + error.message);
      setIsSaving(false);
    }
  };

  // ── Themed Success Screen for New PG registration ──
  if (showPgSuccess) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #0c1a2e 0%, #0f2847 50%, #0e3a6e 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '32px 28px', fontFamily: "'Hanken Grotesk', sans-serif", textAlign: 'center'
      }}>
        {/* Animated ring + check */}
        <div style={{ position: 'relative', width: 110, height: 110, marginBottom: 32 }}>
          <div style={{
            width: 110, height: 110, borderRadius: '50%',
            border: '3px solid rgba(8,145,178,0.25)',
            position: 'absolute', top: 0, left: 0
          }} />
          <div style={{
            width: 110, height: 110, borderRadius: '50%',
            border: '3px solid #0891b2',
            borderTopColor: 'transparent',
            position: 'absolute', top: 0, left: 0,
            animation: 'spin 1.2s linear infinite'
          }} />
          <div style={{
            width: 84, height: 84, borderRadius: '50%',
            background: 'linear-gradient(135deg, #0891b2, #0e7490)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'absolute', top: 13, left: 13,
            boxShadow: '0 8px 32px rgba(8,145,178,0.45)'
          }}>
            <span className="material-symbols-outlined" style={{ color: 'white', fontSize: 42, fontVariationSettings: "'FILL' 1" }}>
              domain_add
            </span>
          </div>
        </div>

        {/* Title */}
        <h1 style={{
          margin: '0 0 10px',
          fontSize: 26, fontWeight: 900,
          color: 'white', letterSpacing: -0.5,
          fontFamily: "'Bricolage Grotesque', sans-serif"
        }}>
          PG Registered!
        </h1>
        <p style={{ margin: '0 0 28px', fontSize: 15, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
          <strong style={{ color: '#38bdf8' }}>{pgName}</strong> has been submitted successfully.
        </p>

        {/* Status card */}
        <div style={{
          width: '100%', maxWidth: 340,
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(8,145,178,0.35)',
          borderRadius: 20, padding: '20px 22px',
          marginBottom: 32, textAlign: 'left'
        }}>
          {[
            { icon: 'hourglass_top', color: '#fbbf24', text: 'Pending superadmin approval' },
            { icon: 'swap_horiz',    color: '#0891b2', text: 'Will appear in PG Switcher once approved' },
            { icon: 'info',          color: '#94a3b8', text: 'Long-press the Profile tab to switch PGs' },
          ].map(({ icon, color, text }) => (
            <div key={icon} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
              <span className="material-symbols-outlined"
                style={{ fontSize: 20, color, flexShrink: 0, marginTop: 1, fontVariationSettings: "'FILL' 1" }}>
                {icon}
              </span>
              <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>{text}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate('/admin-dashboard')}
          style={{
            width: '100%', maxWidth: 340, padding: '16px',
            background: 'linear-gradient(135deg, #0891b2, #0e7490)',
            color: 'white', border: 'none', borderRadius: 16,
            fontSize: 15, fontWeight: 800, cursor: 'pointer',
            fontFamily: 'inherit',
            boxShadow: '0 8px 24px rgba(8,145,178,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
          }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>home</span>
          Go to Dashboard
        </button>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
      fontFamily: "'Hanken Grotesk',sans-serif",
      paddingBottom: 100
    }}>
      <style>
        {`
          .aesthetic-input {
            width: 100%;
            padding: 16px 20px;
            border-radius: 16px;
            border: 2px solid transparent;
            background: #f8fafc;
            font-size: 15px;
            font-weight: 500;
            color: #0f172a;
            outline: none;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .aesthetic-input::placeholder {
            color: #94a3b8;
          }
          .aesthetic-input:focus {
            background: #ffffff;
            border-color: #0891b2;
            box-shadow: 0 8px 24px rgba(8,145,178,0.15);
          }
          .input-icon-wrapper {
            position: relative;
          }
          .input-icon-wrapper .aesthetic-input {
            padding-left: 48px;
          }
          .input-icon-wrapper .icon {
            position: absolute;
            left: 16px;
            top: 50%;
            transform: translateY(-50%);
            color: #94a3b8;
            transition: color 0.3s;
          }
          .input-icon-wrapper .aesthetic-input:focus + .icon {
            color: #0891b2;
          }
          .card-container {
            background: white;
            border-radius: 28px;
            padding: 32px 24px;
            margin-bottom: 24px;
            box-shadow: 0 12px 40px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.02);
            border: 1px solid rgba(255,255,255,0.8);
          }
          .section-title {
            font-family: 'Bricolage Grotesque', sans-serif;
            font-size: 22px;
            font-weight: 800;
            color: #0f172a;
            margin-bottom: 24px;
            letter-spacing: -0.5px;
          }
          .label {
            display: block;
            font-size: 14px;
            font-weight: 700;
            color: #334155;
            margin-bottom: 8px;
          }
          .save-btn {
            background: linear-gradient(135deg, #0891b2, #0e7490);
            color: white;
            border: none;
            border-radius: 20px;
            padding: 18px;
            font-size: 16px;
            font-weight: 800;
            width: 100%;
            cursor: pointer;
            box-shadow: 0 12px 24px rgba(8,145,178,0.25);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .save-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 16px 32px rgba(8,145,178,0.35);
          }
        `}
      </style>

      {/* Glassmorphic Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.8)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.3)',
        padding: '20px 24px',
         display: 'flex', alignItems: 'center', gap: 12
      , paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))'}}>
        {isNewPgMode && (
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 26, color: '#0891b2' }}>arrow_back</span>
          </button>
        )}
        <h1 style={{
          fontFamily: "'Bricolage Grotesque',sans-serif",
          fontSize: 24, fontWeight: 900, color: '#0891b2',
          margin: 0, letterSpacing: -0.5
        }}>{isNewPgMode ? 'Add New PG' : 'Profile Setup'}</h1>
      </div>

      {errorMsg && (
        <div style={{
          background: '#fee2e2',
          border: '1px solid #f87171',
          borderRadius: 16,
          padding: '12px 16px',
          margin: '16px 20px',
          maxWidth: 600,
          marginLeft: 'auto',
          marginRight: 'auto',
          color: '#991b1b',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          animation: 'fadeIn 0.3s ease'
        }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          {errorMsg}
        </div>
      )}

      <div style={{ padding: '24px 20px', maxWidth: 600, margin: '0 auto' }}>
        <form onSubmit={handleSave}>

          {/* 0. Personal Information */}
          <div className="card-container">
            <h2 className="section-title">Personal Information</h2>

            <div style={{ marginBottom: 20 }}>
              <label className="label">Admin Name <span style={{color: '#ef4444'}}>*</span></label>
              <div className="input-icon-wrapper">
                <input type="text" className="aesthetic-input" placeholder="Your Full Name" value={adminName} onChange={e => setAdminName(e.target.value)} required />
                <User size={20} className="icon" />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label className="label">Phone Number <span style={{color: '#ef4444'}}>*</span></label>
              <div className="input-icon-wrapper">
                <input type="tel" className="aesthetic-input" placeholder="+91 XXXXX XXXXX" value={adminPhone} onChange={e => setAdminPhone(e.target.value)} required />
                <Phone size={20} className="icon" />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label className="label">Email Address (Read-Only)</label>
              <div className="input-icon-wrapper">
                <input type="email" className="aesthetic-input" value={adminEmail} readOnly style={{ background: '#f1f5f9', color: '#94a3b8', cursor: 'not-allowed' }} />
                <Mail size={20} className="icon" style={{ color: '#cbd5e1' }} />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label className="label">Date of Birth</label>
              <div className="input-icon-wrapper">
                <input type="date" className="aesthetic-input" value={adminDob} onChange={e => setAdminDob(e.target.value)} />
                <Calendar size={20} className="icon" />
              </div>
            </div>
          </div>

          {/* PG DETAILS CARD */}
          <div className="card-container">
            <h3 className="section-title">Property Essentials</h3>
            
            <div style={{ marginBottom: 20 }}>
              <label className="label">PG Name <span style={{color: '#ef4444'}}>*</span></label>
              <div className="input-icon-wrapper">
                <input type="text" className="aesthetic-input" placeholder="e.g. Sunrise Luxury PG" value={pgName} onChange={e => setPgName(e.target.value)} required />
                <Building2 size={20} className="icon" />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label className="label">PG Type <span style={{color: '#ef4444'}}>*</span></label>
              <CustomSelect
                placeholder="Select PG Type"
                value={pgType}
                onChange={setPgType}
                options={['Boys', 'Girls', 'Unisex']}
              />
            </div>
            
            <div style={{ marginBottom: 20 }}>
              <label className="label">Description <span style={{color: '#ef4444'}}>*</span></label>
              <div className="input-icon-wrapper">
                <textarea className="aesthetic-input" placeholder="e.g. A luxurious PG with all amenities..." value={description} onChange={e => setDescription(e.target.value)} required style={{ minHeight: '80px', paddingTop: '12px' }} />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label className="label">PG Rules</label>
              <div className="input-icon-wrapper">
                <textarea className="aesthetic-input" placeholder="e.g. No smoking, Curfew at 10 PM..." value={rules} onChange={e => setRules(e.target.value)} style={{ minHeight: '80px', paddingTop: '12px' }} />
              </div>
            </div>
            
            <div style={{ marginBottom: 20 }}>
              <label className="label">Total Rooms <span style={{color: '#ef4444'}}>*</span></label>
              <div className="input-icon-wrapper">
                <input type="number" className="aesthetic-input" placeholder="e.g. 15" value={totalRooms} onChange={e => setTotalRooms(e.target.value)} required />
                <Hash size={20} className="icon" />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label className="label">Total Seats (Capacity) <span style={{color: '#ef4444'}}>*</span></label>
              <div className="input-icon-wrapper">
                <input type="number" className="aesthetic-input" placeholder="e.g. 30" value={totalSeats} onChange={e => setTotalSeats(e.target.value)} required />
                <User size={20} className="icon" />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label className="label">Rent Pricing <span style={{color: '#ef4444'}}>*</span></label>
              <div style={{ display: 'grid', gap: '12px' }}>
                {rents.map((r, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '8px' }}>
                    <div className="input-icon-wrapper" style={{ position: 'relative', flex: 1, marginBottom: 0 }}>
                      <span style={{
                        position: 'absolute',
                        left: '16px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#64748b',
                        fontSize: '14px',
                        fontWeight: 600,
                        zIndex: 2
                      }}>{r.seater} Seater</span>
                      <input 
                        type="text" 
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="aesthetic-input" 
                        style={{ paddingLeft: '95px', paddingRight: '16px' }}
                        placeholder="Rent amount" 
                        value={r.rent} 
                        onChange={e => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          const newRents = [...rents];
                          newRents[idx].rent = val;
                          setRents(newRents);
                        }} 
                        required={idx === 0}
                      />
                    </div>
                    {rents.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => {
                           const newRents = rents.filter((_, i) => i !== idx);
                           const updatedRents = newRents.map((item, i) => ({ ...item, seater: i + 1 }));
                           setRents(updatedRents);
                        }}
                        style={{
                          background: 'transparent',
                          border: '1px solid #fecaca',
                          borderRadius: '12px',
                          width: '52px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ef4444',
                          cursor: 'pointer',
                          flexShrink: 0,
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = '#fef2f2';
                          e.currentTarget.style.borderColor = '#ef4444';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.borderColor = '#fecaca';
                        }}
                      >
                        <Trash2 size={18} strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button 
                type="button" 
                onClick={() => setRents([...rents, { seater: rents.length + 1, rent: '' }])}
                style={{
                  marginTop: '12px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px dashed #0891b2',
                  color: '#0891b2',
                  background: '#ecfeff',
                  fontWeight: 600,
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                + Add {rents.length + 1} Seater Rent
              </button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label className="label">PG Registration Number</label>
              <input type="text" className="aesthetic-input" placeholder="Optional" value={registrationNumber} onChange={e => setRegistrationNumber(e.target.value)} />
            </div>
            
            <div style={{ marginTop: 28 }}>
              <label className="label">Upload Property Images <span style={{color: '#ef4444'}}>*</span></label>
              
              <input type="file" multiple accept="image/*" ref={galleryInputRef} onChange={handleGalleryChange} style={{ display: 'none' }} />
              <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={handleCameraChange} style={{ display: 'none' }} />
              
              <div
                onClick={() => setShowPhotoPicker(true)}
                style={{ 
                  border: '2px dashed #bae6fd', 
                  borderRadius: 20, 
                  padding: '24px 20px', 
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: '#f0f9ff',
                  transition: 'all 0.3s',
                  marginBottom: 16
                }}
              >
                <div style={{ width: 50, height: 50, background: '#e0f2fe', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                  <ImageIcon size={24} color="#0891b2" />
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0891b2', marginBottom: 4 }}>Tap to upload photos</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>PNG, JPG up to 5MB (Multiple allowed)</div>
              </div>

              {images.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {images.map((img, idx) => (
                    <div key={idx} style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0', aspectRatio: '4/3' }}>
                      <img src={img} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      <button type="button" onClick={() => removeImage(idx)} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* LOCATION CARD */}
          <div className="card-container">
            <h3 className="section-title">Location Details</h3>
            
            <div style={{ marginBottom: 16 }}>
              <CustomSelect
                placeholder="Select State *"
                value={locState}
                onChange={setLocState}
                options={['Delhi', 'Haryana', 'Uttar Pradesh', 'Maharashtra', 'Karnataka', 'Gujarat', 'Rajasthan', 'Punjab', 'Tamil Nadu', 'Telangana']}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <input type="text" className="aesthetic-input" placeholder="City Name *" value={locCity} onChange={e => setLocCity(e.target.value)} required />
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <input type="text" className="aesthetic-input" placeholder="Street / Area *" value={locStreet} onChange={e => setLocStreet(e.target.value)} style={{ flex: 1 }} required />
              <input type="text" className="aesthetic-input" placeholder="Pincode *" value={locPin} onChange={handlePinChange} style={{ width: 120 }} required />
            </div>

            <div style={{ marginBottom: 24 }}>
              <input type="text" className="aesthetic-input" placeholder="Full Address *" value={locFull} onChange={e => setLocFull(e.target.value)} required />
            </div>

            <label className="label">Google Map Location</label>
            <div style={{
              background: '#ecfeff', border: '1px solid #cffafe', borderRadius: 20, padding: 16
            }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <input
                  type="url"
                  className="aesthetic-input"
                  placeholder="Paste Maps link..."
                  value={mapLink}
                  onChange={e => setMapLink(e.target.value)}
                  style={{ background: 'white', border: '1px solid #bae6fd' }}
                />
                <button
                  type="button"
                  onClick={handleGetLocation}
                  title="Use current location"
                  style={{
                    flexShrink: 0, width: 52, height: 52, borderRadius: 16,
                    background: '#0891b2', border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', boxShadow: '0 8px 16px rgba(8,145,178,0.25)',
                    transition: 'transform 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <Navigation size={22} color="white" fill="white" />
                </button>
              </div>
              {mapLink && (
                <div style={{ marginTop: 12, paddingLeft: 4 }}>
                  <a
                    href={mapLink} target="_blank" rel="noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      fontSize: 14, fontWeight: 700, color: '#0891b2', textDecoration: 'none'
                    }}
                  >
                    <MapPin size={16} /> Open in Maps →
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* OWNERSHIP CARD */}
          <div className="card-container">
            <h3 className="section-title">Ownership</h3>
            
            <div style={{ display: 'flex', gap: 12, marginBottom: isOnLease ? 20 : 0 }}>
              <div 
                onClick={() => setIsOnLease(false)}
                style={{
                  flex: 1, padding: '16px', borderRadius: 16, border: !isOnLease ? '2px solid #0891b2' : '2px solid transparent',
                  background: !isOnLease ? '#ecfeff' : '#f8fafc', cursor: 'pointer', textAlign: 'center',
                  fontWeight: !isOnLease ? 700 : 500, color: !isOnLease ? '#0891b2' : '#64748b',
                  transition: 'all 0.2s'
                }}
              >
                Owned Property
              </div>
              <div 
                onClick={() => setIsOnLease(true)}
                style={{
                  flex: 1, padding: '16px', borderRadius: 16, border: isOnLease ? '2px solid #0891b2' : '2px solid transparent',
                  background: isOnLease ? '#ecfeff' : '#f8fafc', cursor: 'pointer', textAlign: 'center',
                  fontWeight: isOnLease ? 700 : 500, color: isOnLease ? '#0891b2' : '#64748b',
                  transition: 'all 0.2s'
                }}
              >
                On Lease
              </div>
            </div>

            {isOnLease && (
              <div className="input-icon-wrapper" style={{ animation: 'fadeIn 0.3s ease' }}>
                <input type="number" className="aesthetic-input" placeholder="Monthly Lease Amount *" value={leaseAmount} onChange={e => setLeaseAmount(e.target.value)} required />
                <IndianRupee size={20} className="icon" />
              </div>
            )}
          </div>

          {/* AMENITIES CARD */}
          <div className="card-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 className="section-title" style={{ marginBottom: 0 }}>Amenities</h3>
              <button 
                type="button" 
                onClick={handleAddCustomAmenity}
                style={{ background: '#ecfeff', border: 'none', color: '#0891b2', fontWeight: 700, padding: '8px 16px', borderRadius: 12, fontSize: 13, cursor: 'pointer' }}
              >
                + Custom
              </button>
            </div>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', 
              gap: 12 
            }}>
              {allAmenities.map(amenity => {
                const isSelected = selectedAmenities.includes(amenity.id);
                return (
                  <div 
                    key={amenity.id}
                    onClick={() => toggleAmenity(amenity.id)}
                    style={{
                      border: isSelected ? '2px solid #0891b2' : '2px solid transparent',
                      borderRadius: 16,
                      padding: '16px 8px',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer',
                      background: isSelected ? '#ecfeff' : '#f8fafc',
                      position: 'relative',
                      transition: 'all 0.2s',
                      boxShadow: isSelected ? '0 4px 12px rgba(8,145,178,0.1)' : 'none'
                    }}
                    onMouseEnter={e => { if(!isSelected) e.currentTarget.style.background = '#f1f5f9' }}
                    onMouseLeave={e => { if(!isSelected) e.currentTarget.style.background = '#f8fafc' }}
                  >
                    {isSelected && (
                      <div style={{ position: 'absolute', top: -6, right: -6, background: '#0891b2', color: 'white', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                        <Check size={12} strokeWidth={4} />
                      </div>
                    )}
                    <span style={{ fontSize: 24, marginBottom: 8, filter: isSelected ? 'drop-shadow(0 2px 4px rgba(8,145,178,0.3))' : 'none' }}>{amenity.icon}</span>
                    <span style={{ fontSize: 11, textAlign: 'center', fontWeight: isSelected ? 700 : 600, color: isSelected ? '#0891b2' : '#64748b' }}>
                      {amenity.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <style>{`
            @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          `}</style>

          {/* Sticky Bottom Bar */}
          <div style={{ 
            position: 'fixed', bottom: 0, left: 0, right: 0, 
            background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)',
            padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.5)',
            zIndex: 100
          }}>
            <div style={{ maxWidth: 600, margin: '0 auto' }}>
              <button type="submit" className="save-btn" disabled={isSaving} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: isSaving ? 0.7 : 1 }}>
                {isSaving ? (
                  <>
                    <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite' }}>sync</span>
                    Setting up...
                  </>
                ) : (
                  'Complete Setup ✨'
                )}
              </button>
            </div>
          </div>

        </form>
      </div>
      
      {showPhotoPicker && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div onClick={() => setShowPhotoPicker(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)' }} />
          <div style={{ position: 'relative', background: 'white', borderRadius: '24px 24px 0 0', padding: '24px 20px 40px' }}>
            <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 20px' }}>Upload Photo</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button type="button" onClick={() => cameraInputRef.current && cameraInputRef.current.click()} style={{ width: '100%', padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                <div style={{ width: 40, height: 40, background: '#e0f2fe', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageIcon size={20} color="#0891b2" /></div>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>Camera</p>
                  <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Take a new photo</p>
                </div>
              </button>
              <button type="button" onClick={() => galleryInputRef.current && galleryInputRef.current.click()} style={{ width: '100%', padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                <div style={{ width: 40, height: 40, background: '#fce7f3', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageIcon size={20} color="#db2777" /></div>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>Gallery</p>
                  <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Choose from device</p>
                </div>
              </button>
            </div>
            <button type="button" onClick={() => setShowPhotoPicker(false)} style={{ width: '100%', padding: '16px', background: 'transparent', color: '#64748b', border: 'none', fontWeight: 700, fontSize: 15, cursor: 'pointer', marginTop: 12 }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
