import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MapPin, Image as ImageIcon, Check, Plus, UploadCloud, ChevronDown } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const AMENITIES = [
  { id: 'bed', label: 'Bed', icon: '🛏️' },
  { id: 'mattress', label: 'Mattress', icon: '🔲' },
  { id: 'bedsheet', label: 'Bedsheet', icon: '📜' },
  { id: 'pillow', label: 'Pillow', icon: '☁️' },
  { id: 'pillow-cover', label: 'Pillow Cover', icon: '📨' },
  { id: 'chair', label: 'Chair', icon: '🪑' },
  { id: 'table', label: 'Study Table', icon: '📚' },
  { id: 'ac', label: 'AC', icon: '❄️' },
  { id: 'fridge', label: 'Fridge', icon: '🧊' },
  { id: 'wifi', label: 'Wi-Fi', icon: '📶' },
  { id: 'washing-machine', label: 'Washing Machine', icon: '🧺' },
];

const InputField = (props) => (
  <input 
    {...props} 
    style={{
      width: '100%', padding: '14px 16px', borderRadius: '12px',
      border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
      fontSize: '15px', color: 'white', outline: 'none', transition: 'border-color 0.2s',
      boxSizing: 'border-box', ...props.style
    }} 
    onFocus={e => e.target.style.borderColor = '#38bdf8'}
    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
  />
);

const CustomDropdown = ({ options, value, onChange, placeholder }) => {
  const [isOpen, React_useState] = React.useState(false);
  const dropdownRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) React_useState(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      <div 
        onClick={() => React_useState(!isOpen)}
        style={{
          width: '100%', padding: '14px 16px', borderRadius: '12px',
          border: isOpen ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s', boxSizing: 'border-box'
        }}
      >
        <span style={{ fontSize: '15px', color: selectedOption ? 'white' : 'rgba(255,255,255,0.5)' }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={18} color="rgba(255,255,255,0.5)" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: '0.3s cubic-bezier(0.4, 0, 0.2, 1)' }} />
      </div>
      
      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px',
          background: '#0c1a2e', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '16px', padding: '8px', zIndex: 50,
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          maxHeight: '220px', overflowY: 'auto'
        }}>
          {options.map(opt => (
            <div 
              key={opt.value}
              onClick={() => { onChange(opt.value); React_useState(false); }}
              style={{
                padding: '12px 16px', borderRadius: '10px',
                background: value === opt.value ? 'rgba(56,189,248,0.1)' : 'transparent',
                color: value === opt.value ? '#38bdf8' : 'white',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                cursor: 'pointer', fontSize: '15px', fontWeight: value === opt.value ? 600 : 400,
                transition: 'background 0.2s'
              }}
              onMouseEnter={e => { if(value !== opt.value) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
              onMouseLeave={e => { if(value !== opt.value) e.currentTarget.style.background = 'transparent' }}
            >
              {opt.label}
              {value === opt.value && <Check size={16} strokeWidth={3} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Label = ({ children }) => (
  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>
    {children}
  </label>
);

const Card = ({ children, title, action }) => (
  <div style={{ 
    background: 'rgba(255,255,255,0.06)', borderRadius: '24px', padding: '24px', 
    border: '1px solid rgba(255,255,255,0.1)', marginBottom: '20px', backdropFilter: 'blur(10px)'
  }}>
    {title && (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', color: 'white', fontWeight: 700 }}>{title}</h3>
        {action}
      </div>
    )}
    {children}
  </div>
);

export default function CreatePGProfile() {
  const navigate = useNavigate();
  const { user, completeProfile } = useAuth();
  const [isOnLease, setIsOnLease] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [imagePreview, setImagePreview] = useState(null);
  const [customAmenities, setCustomAmenities] = useState([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const [pgName, setPgName] = useState('');
  const [totalRooms, setTotalRooms] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [street, setStreet] = useState('');
  const [pincode, setPincode] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [mapLink, setMapLink] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [leaseAmount, setLeaseAmount] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleAddCustomAmenity = () => {
    const name = window.prompt('Enter custom amenity name:');
    if (name && name.trim()) {
      const id = 'custom-' + name.trim().toLowerCase().replace(/\s+/g, '-');
      setCustomAmenities(prev => [...prev, { id, label: name.trim(), icon: '✨' }]);
      setSelectedAmenities(prev => [...prev, id]);
    }
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setMapLink(`https://maps.google.com/?q=${lat},${lng}`);
        },
        (error) => {
          console.error("Error getting location: ", error);
          alert("Unable to retrieve your location. Please check your permissions.");
        }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

  const allAmenities = [...AMENITIES, ...customAmenities];

  const toggleAmenity = (id) => {
    setSelectedAmenities(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) return alert("You must be logged in!");

    setLoading(true);
    try {
      const pgData = {
        ownerUid: user.uid,
        ownerEmail: user.email,
        pgName,
        totalRooms: Number(totalRooms),
        location: { state, city, street, pincode, fullAddress, mapLink },
        registrationNumber: regNumber,
        propertyDetails: { isLeased: isOnLease, leaseAmount: isOnLease ? Number(leaseAmount) : 0 },
        amenities: selectedAmenities,
        image: imagePreview,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, "pg_owners", user.uid), pgData);

      if (completeProfile) {
        await completeProfile();
      }

      navigate('/admin-dashboard');
    } catch (err) {
      console.error(err);
      alert("Error saving PG Profile: " + err.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div style={{ 
      background: 'linear-gradient(160deg, #0c1a2e 0%, #0f2847 50%, #0c3461 100%)', 
      minHeight: '100vh', paddingBottom: '100px', fontFamily: "'Inter', sans-serif",
      position: 'relative', overflow: 'hidden'
    }}>
      {/* Decorative Blobs */}
      <div style={{ position: 'absolute', top: -80, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(56,189,248,0.08)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -60, left: -50, width: 180, height: 180, borderRadius: '50%', background: 'rgba(74,153,140,0.08)', pointerEvents: 'none' }} />

      <div style={{ padding: '60px 20px 40px', color: 'white', textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: 'white' }}>Set Up Your PG</h1>
        <p style={{ margin: '8px 0 0 0', color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>Let's get the basic details of your property.</p>
      </div>

      <div style={{ padding: '0 20px', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
        <form onSubmit={handleSave}>
          
          <Card title="Basic Details">
            <div style={{ marginBottom: '16px' }}>
              <Label>PG Name *</Label>
              <InputField placeholder="e.g. Sunrise PG" value={pgName} onChange={e => setPgName(e.target.value)} required />
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <Label>Total Rooms *</Label>
              <InputField type="number" placeholder="e.g. 10" value={totalRooms} onChange={e => setTotalRooms(e.target.value)} required />
            </div>

            <div>
              <Label>PG Registration Number</Label>
              <InputField placeholder="Optional" value={regNumber} onChange={e => setRegNumber(e.target.value)} />
            </div>
          </Card>

          <Card title="Location Details">
            <div style={{ marginBottom: '16px', position: 'relative', zIndex: 10 }}>
              <CustomDropdown 
                placeholder="Select State *"
                value={state}
                onChange={(val) => setState(val)}
                options={[
                  { value: 'Delhi', label: 'Delhi' },
                  { value: 'Haryana', label: 'Haryana' },
                  { value: 'UP', label: 'Uttar Pradesh' }
                ]}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <InputField placeholder="City Name *" value={city} onChange={e => setCity(e.target.value)} required />
            </div>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <InputField placeholder="Street No. *" value={street} onChange={e => setStreet(e.target.value)} required />
              <InputField placeholder="Pincode *" value={pincode} onChange={e => setPincode(e.target.value)} required />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <InputField placeholder="Full Address *" value={fullAddress} onChange={e => setFullAddress(e.target.value)} required />
            </div>

            <div style={{ position: 'relative' }}>
              <Label>Google Map Location</Label>
              <InputField type="url" placeholder="Paste Maps Link" value={mapLink} onChange={e => setMapLink(e.target.value)} style={{ paddingRight: '50px' }} />
              <div 
                onClick={handleGetLocation}
                style={{ 
                  position: 'absolute', right: '6px', top: '28px', 
                  background: 'rgba(56,189,248,0.15)', padding: '10px', borderRadius: '10px', 
                  cursor: 'pointer', display: 'flex', border: '1px solid rgba(56,189,248,0.3)'
                }}
                title="Use Current Location"
              >
                <MapPin size={16} color="#38bdf8" />
              </div>
            </div>
          </Card>

          <Card title="Ownership">
            <div style={{ marginBottom: isOnLease ? '16px' : 0 }}>
              <Label>Is This Your Property Or On a Lease? *</Label>
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', padding: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div 
                  onClick={() => setIsOnLease(false)}
                  style={{ flex: 1, textAlign: 'center', padding: '12px', borderRadius: '10px', cursor: 'pointer',
                           background: !isOnLease ? 'linear-gradient(135deg, #0891b2, #38bdf8)' : 'transparent',
                           color: !isOnLease ? 'white' : 'rgba(255,255,255,0.6)',
                           fontWeight: 600, fontSize: '14px', transition: 'all 0.3s ease',
                           boxShadow: !isOnLease ? '0 4px 12px rgba(8,145,178,0.3)' : 'none' }}>
                  Owned Property
                </div>
                <div 
                  onClick={() => setIsOnLease(true)}
                  style={{ flex: 1, textAlign: 'center', padding: '12px', borderRadius: '10px', cursor: 'pointer',
                           background: isOnLease ? 'linear-gradient(135deg, #0891b2, #38bdf8)' : 'transparent',
                           color: isOnLease ? 'white' : 'rgba(255,255,255,0.6)',
                           fontWeight: 600, fontSize: '14px', transition: 'all 0.3s ease',
                           boxShadow: isOnLease ? '0 4px 12px rgba(8,145,178,0.3)' : 'none' }}>
                  On Lease
                </div>
              </div>
            </div>
            {isOnLease && (
              <div>
                <Label>Lease Amount (Monthly) *</Label>
                <InputField type="number" placeholder="₹ Enter Amount" value={leaseAmount} onChange={e => setLeaseAmount(e.target.value)} required={isOnLease} />
              </div>
            )}
          </Card>

          <Card 
            title="Amenities" 
            action={
              <button type="button" onClick={handleAddCustomAmenity} style={{ 
                background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', 
                color: '#38bdf8', padding: '6px 12px', borderRadius: '12px',
                fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' 
              }}>
                <Plus size={14} /> Add Custom
              </button>
            }
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {allAmenities.map(amenity => {
                const isSelected = selectedAmenities.includes(amenity.id);
                return (
                  <div 
                    key={amenity.id}
                    onClick={() => toggleAmenity(amenity.id)}
                    style={{
                      border: isSelected ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                      background: isSelected ? 'rgba(56,189,248,0.1)' : 'rgba(255,255,255,0.05)',
                      borderRadius: '12px', padding: '12px 8px',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', transition: 'all 0.2s', position: 'relative'
                    }}
                  >
                    <span style={{ fontSize: '20px', marginBottom: '6px' }}>{amenity.icon}</span>
                    <span style={{ 
                      fontSize: '11px', fontWeight: 600, textAlign: 'center',
                      color: isSelected ? '#38bdf8' : 'rgba(255,255,255,0.6)'
                    }}>{amenity.label}</span>
                    
                    {isSelected && (
                      <div style={{ position: 'absolute', top: -4, right: -4, background: '#38bdf8', borderRadius: '50%', padding: '2px', color: '#0c1a2e' }}>
                        <Check size={12} strokeWidth={4} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          <Card title="Upload PG Cover Image">
            <div 
              style={{
                border: '2px dashed rgba(255,255,255,0.2)', borderRadius: '16px',
                padding: '30px 20px', textAlign: 'center', background: 'rgba(255,255,255,0.02)',
                cursor: 'pointer', transition: 'all 0.2s', position: 'relative'
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              {imagePreview ? (
                <div>
                  <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '12px' }} />
                  <div style={{ marginTop: '12px', color: '#38bdf8', fontSize: '13px', fontWeight: 600 }}>Tap to change image</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: 'rgba(56,189,248,0.1)', padding: '12px', borderRadius: '50%', color: '#38bdf8' }}>
                    <UploadCloud size={24} />
                  </div>
                  <div>
                    <div style={{ color: 'white', fontWeight: 600, fontSize: '15px' }}>Upload Cover Photo</div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginTop: '4px' }}>PNG, JPG up to 5MB</div>
                  </div>
                </div>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                style={{ display: 'none' }} 
              />
            </div>
          </Card>

          <button 
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '16px', borderRadius: '16px',
              background: loading ? 'rgba(56,189,248,0.5)' : 'linear-gradient(135deg, #0891b2, #38bdf8)',
              color: 'white', border: 'none', fontSize: '16px', fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 20px rgba(8,145,178,0.4)',
              display: 'flex', justifyContent: 'center', alignItems: 'center'
            }}
          >
            {loading ? 'Saving Profile...' : 'Complete Profile & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
