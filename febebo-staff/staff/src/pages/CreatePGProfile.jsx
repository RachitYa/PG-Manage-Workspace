import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MapPin, Image as ImageIcon, Check } from 'lucide-react';

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
  const navigate = useNavigate();
  const { user, completeProfile } = useAuth();
  const [isOnLease, setIsOnLease] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [imagePreview, setImagePreview] = useState(null);
  const [customAmenities, setCustomAmenities] = useState([]);
  const fileInputRef = useRef(null);

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

  const allAmenities = [...AMENITIES, ...customAmenities];

  const toggleAmenity = (id) => {
    setSelectedAmenities(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleSave = (e) => {
    e.preventDefault();
    if(completeProfile) {
      completeProfile();
    }
    navigate('/admin-dashboard');
  };

  return (
    <div className="app-container">
      <div className="top-nav">
        <div className="nav-title">Create PG Profile</div>
      </div>

      <div style={{ padding: '16px' }}>
        <form onSubmit={handleSave}>
          <div className="card">
            <h3 className="mb-4">PG Details</h3>
            <div className="input-group">
              <label className="input-label">PG Name *</label>
              <input type="text" className="input-field" placeholder="Enter PG Name" required />
            </div>
            
            <div className="input-group">
              <label className="input-label">Total Rooms *</label>
              <input type="number" className="input-field" placeholder="e.g. 10" required />
            </div>

            <div className="input-group">
              <label className="input-label">PG Location *</label>
              <select className="input-field mb-2">
                <option>Select State</option>
                <option>Delhi</option>
                <option>Haryana</option>
              </select>
              <input type="text" className="input-field mb-2" placeholder="Enter City Name" />
              <div className="flex gap-2 mb-2">
                <input type="text" className="input-field" placeholder="Street No." style={{ flex: 1 }} />
                <input type="text" className="input-field" placeholder="Pincode" style={{ flex: 1 }} />
              </div>
              <input type="text" className="input-field" placeholder="Full Address" />
            </div>

            <div className="input-group">
              <label className="input-label">Google Map Location</label>
              <div style={{ position: 'relative' }}>
                <input type="text" className="input-field" placeholder="Google Map Location Link" />
                <MapPin size={20} style={{ position: 'absolute', right: '12px', top: '12px', color: 'var(--primary)' }} />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">PG Registration Number</label>
              <input type="text" className="input-field" placeholder="Enter Registration Number" />
            </div>
            
            <div className="input-group mt-4">
              <label className="input-label">Upload PG Image *</label>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <div
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                style={{ 
                  border: '2px dashed var(--border-color)', 
                  borderRadius: 'var(--radius-md)', 
                  padding: imagePreview ? '8px' : '32px', 
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: 'var(--bg-main)',
                  overflow: 'hidden'
                }}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="PG Preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px' }} />
                ) : (
                  <>
                    <ImageIcon size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 8px' }} />
                    <div style={{ fontSize: '0.875rem', color: 'var(--primary)' }}>Tap here to upload file</div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="mb-4">Property Details</h3>
            <div className="input-group">
              <label className="input-label">Is This Your Property Or On a Lease? *</label>
              <select 
                className="input-field" 
                value={isOnLease ? "lease" : "owned"}
                onChange={(e) => setIsOnLease(e.target.value === 'lease')}
              >
                <option value="owned">Owned Property</option>
                <option value="lease">On Lease</option>
              </select>
            </div>

            {isOnLease && (
              <div className="input-group">
                <label className="input-label">Lease Amount (Monthly) *</label>
                <input type="number" className="input-field" placeholder="₹ Enter Amount" required />
              </div>
            )}
          </div>

          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ margin: 0 }}>Amenities</h3>
              <span onClick={handleAddCustomAmenity} style={{ fontSize: '0.875rem', color: 'var(--primary)', cursor: 'pointer' }}>+ Add Custom</span>
            </div>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(4, 1fr)', 
              gap: '12px' 
            }}>
              {allAmenities.map(amenity => {
                const isSelected = selectedAmenities.includes(amenity.id);
                return (
                  <div 
                    key={amenity.id}
                    onClick={() => toggleAmenity(amenity.id)}
                    style={{
                      border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'}`,
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 4px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? 'rgba(14, 165, 233, 0.05)' : 'white',
                      position: 'relative'
                    }}
                  >
                    {isSelected && (
                      <div style={{ position: 'absolute', top: '-6px', right: '-6px', backgroundColor: 'var(--primary)', color: 'white', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Check size={10} />
                      </div>
                    )}
                    <span style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{amenity.icon}</span>
                    <span style={{ fontSize: '0.65rem', textAlign: 'center', fontWeight: '500', color: isSelected ? 'var(--primary)' : 'inherit' }}>
                      {amenity.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ position: 'sticky', bottom: 0, padding: '16px 0', backgroundColor: 'var(--bg-main)' }}>
            <button type="submit" className="btn-primary" style={{ padding: '16px' }}>
              Save & Next
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
