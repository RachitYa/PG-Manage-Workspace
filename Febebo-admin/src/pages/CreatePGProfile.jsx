import React, { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  MapPin, Image as ImageIcon, Check, ChevronDown, Navigation, Building2, Hash, 
  IndianRupee, User, Phone, Mail, Calendar, Trash2, X, Plus,
  Bed, Layers, Shirt, Package, Armchair, LampDesk, AirVent, Refrigerator, 
  Wifi, WashingMachine, Flame, Zap, Droplets, Cctv, ShieldCheck, Dumbbell, 
  Car, Bike, Tv, Utensils, Bath, Sun, DoorClosed, Sparkles, Tag
} from 'lucide-react';
import { Geolocation } from '@capacitor/geolocation';
import { doc, getDoc, setDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { fetchAllAdminPgs } from '../utils/pgUtils';

function cleanPhone(raw) {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}


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

const ICON_MAP = {
  Bed,
  Layers,
  Shirt,
  Package,
  Armchair,
  LampDesk,
  AirVent,
  Refrigerator,
  Wifi,
  WashingMachine,
  Flame,
  Zap,
  Droplets,
  Cctv,
  ShieldCheck,
  Dumbbell,
  Car,
  Bike,
  Tv,
  Utensils,
  Bath,
  Sun,
  DoorClosed,
  Sparkles,
  Tag
};

const AMENITIES = [
  { id: 'bed', label: 'Bed', iconName: 'Bed' },
  { id: 'mattress', label: 'Mattress', iconName: 'Layers' },
  { id: 'bedsheet', label: 'Bedsheet', iconName: 'Shirt' },
  { id: 'pillow', label: 'Pillow', iconName: 'Package' },
  { id: 'pillow-cover', label: 'Pillow Cover', iconName: 'Tag' },
  { id: 'chair', label: 'Chair', iconName: 'Armchair' },
  { id: 'table', label: 'Study Table', iconName: 'LampDesk' },
  { id: 'ac', label: 'AC', iconName: 'AirVent' },
  { id: 'fridge', label: 'Fridge', iconName: 'Refrigerator' },
  { id: 'wifi', label: 'Wi-Fi', iconName: 'Wifi' },
  { id: 'washing-machine', label: 'Washing Machine', iconName: 'WashingMachine' },
  { id: 'geyser', label: 'Geyser', iconName: 'Flame' },
  { id: 'power-backup', label: 'Power Backup', iconName: 'Zap' },
  { id: 'ro-water', label: 'RO Water', iconName: 'Droplets' },
  { id: 'cctv', label: 'CCTV Security', iconName: 'Cctv' },
];

const CUSTOM_ICON_PRESETS = [
  { name: 'Dumbbell', label: 'Gym / Fitness' },
  { name: 'Droplets', label: 'RO Purifier' },
  { name: 'Flame', label: 'Geyser / Heater' },
  { name: 'Zap', label: 'Power Backup' },
  { name: 'Cctv', label: 'CCTV Camera' },
  { name: 'ShieldCheck', label: 'Security Guard' },
  { name: 'Tv', label: 'Television' },
  { name: 'Utensils', label: 'Mess / Meals' },
  { name: 'Car', label: 'Car Parking' },
  { name: 'Bike', label: 'Bike Parking' },
  { name: 'Bath', label: 'Washroom' },
  { name: 'Sun', label: 'Balcony' },
  { name: 'DoorClosed', label: 'Wardrobe' },
  { name: 'Sparkles', label: 'Housekeeping' },
  { name: 'Tag', label: 'General / Other' },
];

function detectAmenityIcon(text) {
  const t = (text || '').toLowerCase();
  if (t.includes('gym') || t.includes('fit') || t.includes('workout')) return 'Dumbbell';
  if (t.includes('water') || t.includes('ro') || t.includes('purifier') || t.includes('aqua')) return 'Droplets';
  if (t.includes('geyser') || t.includes('heat') || t.includes('hot') || t.includes('boiler')) return 'Flame';
  if (t.includes('power') || t.includes('backup') || t.includes('inverter') || t.includes('gen')) return 'Zap';
  if (t.includes('cctv') || t.includes('cam')) return 'Cctv';
  if (t.includes('sec') || t.includes('guard')) return 'ShieldCheck';
  if (t.includes('tv') || t.includes('tele')) return 'Tv';
  if (t.includes('food') || t.includes('mess') || t.includes('cook') || t.includes('kitchen') || t.includes('meal')) return 'Utensils';
  if (t.includes('car')) return 'Car';
  if (t.includes('bike') || t.includes('cycle') || t.includes('park')) return 'Bike';
  if (t.includes('bath') || t.includes('toilet') || t.includes('washroom') || t.includes('shower')) return 'Bath';
  if (t.includes('balcony') || t.includes('terrace')) return 'Sun';
  if (t.includes('cupboard') || t.includes('almirah') || t.includes('wardrobe') || t.includes('closet')) return 'DoorClosed';
  if (t.includes('clean') || t.includes('maid') || t.includes('housekeep')) return 'Sparkles';
  return 'Tag';
}

function AmenityIcon({ iconName, isSelected, size = 22 }) {
  const Comp = ICON_MAP[iconName] || Tag;
  return <Comp size={size} strokeWidth={isSelected ? 2.2 : 1.8} color={isSelected ? '#0891b2' : '#64748b'} />;
}

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
  const isAdditionalPg = isNewPgMode || Boolean(user?.hasProfile);

  const [isOnLease, setIsOnLease] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [images, setImages] = useState([]);
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPgSuccess, setShowPgSuccess] = useState(false);
  const [customAmenities, setCustomAmenities] = useState([]);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customInputName, setCustomInputName] = useState('');
  const [selectedCustomIcon, setSelectedCustomIcon] = useState('Tag');
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

  // Admin Personal Info (Pre-filled from old data)
  const [adminName, setAdminName] = useState(user?.name && user.name !== 'Admin User' ? user.name : '');
  const [profileImage, setProfileImage] = useState(user?.photoURL || null);
  const [adminPhone, setAdminPhone] = useState(cleanPhone(user?.phone || user?.phoneNumber || ''));
  const [adminEmail, setAdminEmail] = useState(user?.email || '');
  const [adminDob, setAdminDob] = useState(user?.dob || '');
  const [showEditPersonalDetails, setShowEditPersonalDetails] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [locState, setLocState]   = useState('');
  const [locCity, setLocCity]     = useState('');
  const [locStreet, setLocStreet] = useState('');
  const [locPin, setLocPin]       = useState('');
  const [locFull, setLocFull]     = useState('');
  const [mapLink, setMapLink]     = useState('');

  // Auto-fill existing admin personal details from previous registrations/profile
  React.useEffect(() => {
    let isMounted = true;

    const loadAdminDetails = async () => {
      if (!user?.uid) return;
      try {
        let foundName = '';
        let foundPhone = '';
        let foundEmail = '';
        let foundDob = '';
        let foundPhoto = null;

        const ingest = (d) => {
          if (!d) return;
          const candidateName = d.adminName || d.name || d.ownerName || d.fullName;
          if (candidateName && candidateName.trim() && candidateName.trim() !== 'Admin User') {
            if (!foundName || foundName === 'Admin User') {
              foundName = candidateName.trim();
            }
          } else if (!foundName && candidateName) {
            foundName = candidateName.trim();
          }

          const rawPhone = d.phone || d.adminPhone || d.phoneNumber || d.contact || d.mobile;
          const cleaned = cleanPhone(rawPhone);
          if (cleaned && cleaned.length === 10) {
            foundPhone = cleaned;
          } else if (!foundPhone && cleaned) {
            foundPhone = cleaned;
          }

          if (d.email || d.adminEmail) {
            foundEmail = foundEmail || d.email || d.adminEmail;
          }
          if (d.dob || d.adminDob || d.dateOfBirth) {
            foundDob = foundDob || d.dob || d.adminDob || d.dateOfBirth;
          }
          if (d.profileImage || d.photoURL) {
            foundPhoto = foundPhoto || d.profileImage || d.photoURL;
          }
        };

        // 1. Try active PG document if available
        if (activePgId && activePgId !== 'primary') {
          try {
            const activeSnap = await getDoc(doc(db, 'pg_owners', activePgId));
            if (activeSnap.exists()) ingest(activeSnap.data());
          } catch (e) {}
        }

        // 2. Try primary pg_owners document
        try {
          const pgSnap = await getDoc(doc(db, 'pg_owners', user.uid));
          if (pgSnap.exists()) ingest(pgSnap.data());
        } catch (e) {}

        // 3. Try admins collection document
        try {
          const adminSnap = await getDoc(doc(db, 'admins', user.uid));
          if (adminSnap.exists()) ingest(adminSnap.data());
        } catch (e) {}

        // 4. Try pg_profiles document
        try {
          const profSnap = await getDoc(doc(db, 'pg_profiles', user.uid));
          if (profSnap.exists()) ingest(profSnap.data());
        } catch (e) {}

        // 5. Try all registered PGs by this admin via fetchAllAdminPgs
        try {
          const allPgs = await fetchAllAdminPgs(user);
          for (const p of allPgs) {
            if (p.raw) ingest(p.raw);
          }
        } catch (e) {}

        // 6. Ingest auth user object
        ingest({
          name: user.name || user.displayName,
          phone: user.phone || user.phoneNumber,
          email: user.email,
          dob: user.dob,
          profileImage: user.photoURL || user.profileImage
        });

        if (!isMounted) return;

        if (foundName) setAdminName(foundName);
        if (foundPhone) setAdminPhone(foundPhone);
        if (foundEmail) setAdminEmail(foundEmail);
        if (foundDob) setAdminDob(foundDob);
        if (foundPhoto) setProfileImage(foundPhoto);
      } catch (err) {
        console.warn("Could not auto-fill admin details:", err);
      }
    };

    loadAdminDetails();
    return () => { isMounted = false; };
  }, [user, activePgId]);

  const handleGetLocation = async () => {
    try {
      if (window.Capacitor?.isNativePlatform()) {
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
        return;
      }

      // Web browser fallback
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setLat(pos.coords.latitude);
            setLng(pos.coords.longitude);
            setMapLink(`https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`);
          },
          (err) => {
            console.error('Web geolocation error:', err);
            alert('Unable to get location. Please allow location access in your browser.');
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      } else {
        alert('Geolocation is not supported by your browser.');
      }
    } catch (err) {
      // Fallback if Capacitor throws unimplemented on web
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setLat(pos.coords.latitude);
            setLng(pos.coords.longitude);
            setMapLink(`https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`);
          },
          (webErr) => {
            console.error('Geolocation fallback error:', webErr);
            alert('Unable to get location. Please ensure location is enabled.');
          }
        );
      } else {
        alert('Unable to get location. Please ensure GPS/location is enabled.');
      }
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

  const handleOpenCustomModal = () => {
    setCustomInputName('');
    setSelectedCustomIcon('Tag');
    setShowCustomModal(true);
  };

  const handleCustomNameChange = (val) => {
    setCustomInputName(val);
    const matched = detectAmenityIcon(val);
    if (matched) setSelectedCustomIcon(matched);
  };

  const handleSaveCustomAmenity = () => {
    const trimmed = customInputName.trim();
    if (!trimmed) return;
    const id = 'custom-' + trimmed.toLowerCase().replace(/\s+/g, '-');
    if (!allAmenities.some(a => a.id === id)) {
      setCustomAmenities(prev => [...prev, { id, label: trimmed, iconName: selectedCustomIcon }]);
      setSelectedAmenities(prev => [...prev, id]);
    } else {
      if (!selectedAmenities.includes(id)) {
        setSelectedAmenities(prev => [...prev, id]);
      }
    }
    setShowCustomModal(false);
    setCustomInputName('');
  };

  const handleDeleteCustomAmenity = (e, customId) => {
    e.stopPropagation();
    setCustomAmenities(prev => prev.filter(a => a.id !== customId));
    setSelectedAmenities(prev => prev.filter(id => id !== customId));
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
    const cleanedPhone = cleanPhone(adminPhone);
    if (!cleanedPhone || cleanedPhone.length !== 10) {
       setShowEditPersonalDetails(true);
       setErrorMsg("Please provide a valid 10-digit phone number.");
       setTimeout(() => setErrorMsg(''), 4000);
       window.scrollTo({ top: 0, behavior: 'smooth' });
       return;
    }

    const validRents = rents
      .filter(r => r.rent && Number(r.rent) > 0)
      .sort((a, b) => a.seater - b.seater);

    if (validRents.length === 0) {
       setErrorMsg("Please enter a rent price for at least one seater type you offer.");
       setTimeout(() => setErrorMsg(''), 4000);
       window.scrollTo({ top: 0, behavior: 'smooth' });
       return;
    }

    setIsSaving(true);
    try {
      const effectiveAdminName = adminName?.trim() || (user?.name !== 'Admin User' ? user?.name : '') || user?.displayName || 'Admin';
      const effectiveEmail = adminEmail?.trim() || user?.email || '';

      const pgData = {
        adminId: user.uid,
        ownerUid: user.uid,
        userId: user.uid,
        adminName: effectiveAdminName,
        profileImage: profileImage || null,
        phone: cleanedPhone,
        email: effectiveEmail,
        dob: adminDob || '',
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
          rents: validRents,
          registrationNumber: registrationNumber,
          isOnLease: isOnLease,
          leaseAmount: isOnLease ? leaseAmount : 0
        },
        amenities: selectedAmenities,
        images: images.length > 0 ? images : null,
        status: 'Pending',
        createdAt: new Date().toISOString()
      };

      // Safeguard: Check if primary doc already exists in Firestore
      const primaryDocSnap = await getDoc(doc(db, 'pg_owners', user.uid)).catch(() => null);
      const isActuallyAdditional = isAdditionalPg || (primaryDocSnap && primaryDocSnap.exists());

      if (isActuallyAdditional) {
        // Adding a new additional PG → save to top-level collection so Student App can see it
        await addDoc(collection(db, 'pg_owners'), pgData);
        setShowPgSuccess(true); // Show themed success screen instead of browser alert
      } else {
        // First-time PG setup → save primary doc
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
        display: 'flex', alignItems: 'center', gap: 12,
        paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))'}}>
        {isAdditionalPg && (
          <button type="button" onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 26, color: '#0891b2' }}>arrow_back</span>
          </button>
        )}
        <h1 style={{
          fontFamily: "'Bricolage Grotesque',sans-serif",
          fontSize: 24, fontWeight: 900, color: '#0891b2',
          margin: 0, letterSpacing: -0.5
        }}>{isAdditionalPg ? 'Add New PG' : 'Profile Setup'}</h1>
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
          {isAdditionalPg ? (
            <div className="card-container" style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #f0fdfa 100%)',
              border: '1.5px solid #ccfbf1',
              boxShadow: '0 4px 16px rgba(13,148,136,0.06)',
              marginBottom: 24
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  {profileImage ? (
                    <img 
                      src={profileImage} 
                      alt={adminName} 
                      style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid #0891b2' }} 
                    />
                  ) : (
                    <div style={{ 
                      width: 48, height: 48, borderRadius: '50%', 
                      background: 'linear-gradient(135deg, #0891b2, #0e7490)', 
                      color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      fontWeight: 800, fontSize: 18, boxShadow: '0 4px 12px rgba(8,145,178,0.25)' 
                    }}>
                      {(adminName || 'A')[0]?.toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                        {adminName || 'Admin'}
                      </span>
                      <span style={{ 
                        fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, 
                        background: '#dcfce7', color: '#15803d', display: 'inline-flex', alignItems: 'center', gap: 4 
                      }}>
                        <Check size={12} strokeWidth={3} /> Pre-filled from profile
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b', fontWeight: 500 }}>
                      {[adminPhone ? `+91 ${cleanPhone(adminPhone)}` : '', adminEmail].filter(Boolean).join(' • ')}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowEditPersonalDetails(prev => !prev)}
                  style={{
                    background: showEditPersonalDetails ? '#e2e8f0' : '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    color: '#166534',
                    padding: '6px 12px',
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    flexShrink: 0
                  }}
                >
                  {showEditPersonalDetails ? 'Hide' : 'Edit'}
                </button>
              </div>

              {showEditPersonalDetails && (
                <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px dashed #cbd5e1' }}>
                  <div style={{ marginBottom: 16 }}>
                    <label className="label">Admin Name</label>
                    <div className="input-icon-wrapper">
                      <input type="text" className="aesthetic-input" placeholder="Your Full Name" value={adminName} onChange={e => setAdminName(e.target.value)} />
                      <User size={20} className="icon" />
                    </div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label className="label">Phone Number</label>
                    <div className="input-icon-wrapper">
                      <input type="tel" className="aesthetic-input" placeholder="10-digit mobile number" value={adminPhone} onChange={e => setAdminPhone(e.target.value)} />
                      <Phone size={20} className="icon" />
                    </div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label className="label">Email Address (Read-Only)</label>
                    <div className="input-icon-wrapper">
                      <input type="email" className="aesthetic-input" value={adminEmail} readOnly style={{ background: '#f1f5f9', color: '#94a3b8', cursor: 'not-allowed' }} />
                      <Mail size={20} className="icon" style={{ color: '#cbd5e1' }} />
                    </div>
                  </div>
                  <div>
                    <label className="label">Date of Birth</label>
                    <div className="input-icon-wrapper">
                      <input type="date" className="aesthetic-input" value={adminDob} onChange={e => setAdminDob(e.target.value)} />
                      <Calendar size={20} className="icon" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
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
          )}

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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
                <label className="label" style={{ marginBottom: 0 }}>Rent Pricing <span style={{color: '#ef4444'}}>*</span></label>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Only enter prices for seaters your PG offers</span>
              </div>
              <div style={{ display: 'grid', gap: '12px' }}>
                {rents.map((r, idx) => (
                  <div key={r.seater} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div className="input-icon-wrapper" style={{ position: 'relative', flex: 1, marginBottom: 0 }}>
                      <select
                        value={r.seater}
                        onChange={e => {
                          const newSeater = Number(e.target.value);
                          const newRents = rents.map((item, i) => i === idx ? { ...item, seater: newSeater } : item);
                          setRents(newRents.sort((a, b) => a.seater - b.seater));
                        }}
                        style={{
                          position: 'absolute',
                          left: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#0f172a',
                          fontSize: '13px',
                          fontWeight: 700,
                          zIndex: 2,
                          background: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          padding: '6px 8px',
                          cursor: 'pointer',
                          outline: 'none'
                        }}
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                          <option 
                            key={num} 
                            value={num} 
                            disabled={rents.some((item, i) => i !== idx && item.seater === num)}
                          >
                            {num} Seater
                          </option>
                        ))}
                      </select>
                      <input 
                        type="text" 
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="aesthetic-input" 
                        style={{ paddingLeft: '115px', paddingRight: '16px' }}
                        placeholder="Rent amount (₹/month)" 
                        value={r.rent} 
                        onChange={e => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          const newRents = [...rents];
                          newRents[idx].rent = val;
                          setRents(newRents);
                        }} 
                        required
                      />
                    </div>
                    {rents.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => {
                           const newRents = rents.filter((_, i) => i !== idx);
                           setRents(newRents);
                        }}
                        title={`Remove ${r.seater} Seater`}
                        style={{
                          background: 'transparent',
                          border: '1px solid #fecaca',
                          borderRadius: '12px',
                          width: '52px',
                          height: '48px',
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
                onClick={() => {
                  const allSeaters = [1, 2, 3, 4, 5, 6, 7, 8];
                  const nextSeater = allSeaters.find(s => !rents.some(r => r.seater === s)) || (Math.max(...rents.map(r => r.seater), 0) + 1);
                  setRents([...rents, { seater: nextSeater, rent: '' }].sort((a, b) => a.seater - b.seater));
                }}
                disabled={rents.length >= 8}
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
                  cursor: rents.length >= 8 ? 'not-allowed' : 'pointer',
                  opacity: rents.length >= 8 ? 0.5 : 1
                }}
              >
                + Add Another Seater Rent
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 className="section-title" style={{ marginBottom: 2 }}>Amenities</h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Select amenities provided in your PG</span>
              </div>
              <button 
                type="button" 
                onClick={handleOpenCustomModal}
                style={{ 
                  background: '#ecfeff', 
                  border: '1px solid #a5f3fc', 
                  color: '#0891b2', 
                  fontWeight: 700, 
                  padding: '8px 14px', 
                  borderRadius: 12, 
                  fontSize: 13, 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#cffafe'}
                onMouseLeave={e => e.currentTarget.style.background = '#ecfeff'}
              >
                <Plus size={16} strokeWidth={2.5} /> Custom
              </button>
            </div>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', 
              gap: 12 
            }}>
              {allAmenities.map(amenity => {
                const isSelected = selectedAmenities.includes(amenity.id);
                const isCustom = amenity.id.startsWith('custom-');
                return (
                  <div 
                    key={amenity.id}
                    onClick={() => toggleAmenity(amenity.id)}
                    style={{
                      border: isSelected ? '1.5px solid #0891b2' : '1.5px solid #e2e8f0',
                      borderRadius: 16,
                      padding: '14px 6px 12px',
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      cursor: 'pointer',
                      background: isSelected ? '#f0fdfa' : '#ffffff',
                      position: 'relative',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: isSelected 
                        ? '0 4px 14px rgba(8,145,178,0.12)' 
                        : '0 1px 3px rgba(0,0,0,0.02)',
                      userSelect: 'none'
                    }}
                    onMouseEnter={e => { 
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = '#cbd5e1';
                        e.currentTarget.style.background = '#f8fafc';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)';
                      } else {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }
                    }}
                    onMouseLeave={e => { 
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = '#e2e8f0';
                        e.currentTarget.style.background = '#ffffff';
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)';
                      } else {
                        e.currentTarget.style.transform = 'none';
                      }
                    }}
                  >
                    {/* Selected Check Badge */}
                    {isSelected && (
                      <div style={{ 
                        position: 'absolute', 
                        top: 6, 
                        right: 6, 
                        background: '#0891b2', 
                        color: 'white', 
                        borderRadius: '50%', 
                        width: 18, 
                        height: 18, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        boxShadow: '0 2px 4px rgba(8,145,178,0.3)' 
                      }}>
                        <Check size={11} strokeWidth={3.5} />
                      </div>
                    )}

                    {/* Custom Amenity Delete Button */}
                    {isCustom && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteCustomAmenity(e, amenity.id)}
                        title="Delete custom amenity"
                        style={{
                          position: 'absolute',
                          top: 6,
                          left: 6,
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          background: '#fee2e2',
                          border: 'none',
                          color: '#ef4444',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          padding: 0,
                          transition: 'background 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fecaca'}
                        onMouseLeave={e => e.currentTarget.style.background = '#fee2e2'}
                      >
                        <X size={11} strokeWidth={3} />
                      </button>
                    )}

                    {/* Icon Container */}
                    <div style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      background: isSelected ? '#ccfbf1' : '#f8fafc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 8,
                      transition: 'all 0.2s ease'
                    }}>
                      <AmenityIcon iconName={amenity.iconName || amenity.icon} isSelected={isSelected} size={22} />
                    </div>

                    {/* Label */}
                    <span style={{ 
                      fontSize: 12, 
                      textAlign: 'center', 
                      fontWeight: isSelected ? 700 : 600, 
                      color: isSelected ? '#0e7490' : '#475569',
                      lineHeight: 1.25,
                      padding: '0 2px'
                    }}>
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

      {showCustomModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.55)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 16
        }}>
          <div style={{
            background: 'white',
            borderRadius: 24,
            width: '100%',
            maxWidth: 440,
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            overflow: 'hidden',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            {/* Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: '#ecfeff', color: '#0891b2',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Plus size={22} strokeWidth={2.5} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Add Custom Amenity</h4>
                  <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Custom service or facility for your PG</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                style={{ 
                  background: '#f1f5f9', 
                  border: 'none', 
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  cursor: 'pointer', 
                  color: '#64748b', 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '20px 24px' }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 8 }}>
                Amenity Name
              </label>
              <input
                type="text"
                placeholder="e.g. Gym, RO Water, Balcony, CCTV..."
                value={customInputName}
                onChange={(e) => handleCustomNameChange(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 12,
                  border: '1.5px solid #cbd5e1',
                  fontSize: 14,
                  fontWeight: 600,
                  outline: 'none',
                  boxSizing: 'border-box',
                  marginBottom: 18,
                  transition: 'border 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = '#0891b2'}
                onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSaveCustomAmenity();
                  }
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#334155', margin: 0 }}>
                  Select an Icon
                </label>
                <span style={{ fontSize: 11, color: '#0891b2', fontWeight: 600 }}>Auto-detected from name</span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: 8,
                maxHeight: 180,
                overflowY: 'auto',
                padding: '4px 2px'
              }}>
                {CUSTOM_ICON_PRESETS.map((item) => {
                  const IconComp = ICON_MAP[item.name] || Tag;
                  const isCurrentIcon = selectedCustomIcon === item.name;
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => setSelectedCustomIcon(item.name)}
                      title={item.label}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '10px 4px',
                        borderRadius: 12,
                        border: isCurrentIcon ? '2px solid #0891b2' : '1px solid #e2e8f0',
                        background: isCurrentIcon ? '#ecfeff' : '#f8fafc',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      <IconComp size={20} strokeWidth={isCurrentIcon ? 2.5 : 2} color={isCurrentIcon ? '#0891b2' : '#64748b'} />
                      <span style={{
                        fontSize: 10,
                        marginTop: 4,
                        color: isCurrentIcon ? '#0891b2' : '#64748b',
                        fontWeight: isCurrentIcon ? 700 : 500,
                        textAlign: 'center',
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {item.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '16px 24px',
              background: '#f8fafc',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10
            }}>
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                style={{
                  padding: '10px 18px',
                  borderRadius: 10,
                  border: '1px solid #cbd5e1',
                  background: 'white',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCustomAmenity}
                disabled={!customInputName.trim()}
                style={{
                  padding: '10px 20px',
                  borderRadius: 10,
                  border: 'none',
                  background: customInputName.trim() ? '#0891b2' : '#94a3b8',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: customInputName.trim() ? 'pointer' : 'not-allowed',
                  boxShadow: customInputName.trim() ? '0 4px 12px rgba(8,145,178,0.25)' : 'none'
                }}
              >
                Add Amenity
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
