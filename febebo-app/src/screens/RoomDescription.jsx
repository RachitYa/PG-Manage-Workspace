import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { TopBar } from '../App';
import { 
  Users, Star, Heart, BedDouble, Refrigerator, BookOpen, Armchair, Wifi, Shield, 
  CheckCircle, MapPin, Navigation, ChevronLeft, ChevronRight, MessageSquare,
  AirVent, WashingMachine, Flame, Zap, Droplets, Cctv, Bed, Layers, Shirt, Tag, Sparkles
} from 'lucide-react';
import { doc, updateDoc, collection, addDoc, query, where, getDocs } from 'firebase/firestore';

const AMENITY_CONFIG = {
  'bed':             { label: 'Bed',             icon: <Bed size={22} /> },
  'mattress':        { label: 'Mattress',         icon: <Layers size={22} /> },
  'bedsheet':        { label: 'Bedsheet',         icon: <Shirt size={22} /> },
  'pillow':          { label: 'Pillow',           icon: <BedDouble size={22} /> },
  'pillow-cover':    { label: 'Pillow Cover',     icon: <Tag size={22} /> },
  'chair':           { label: 'Chair',            icon: <Armchair size={22} /> },
  'table':           { label: 'Study Table',      icon: <BookOpen size={22} /> },
  'study-table':     { label: 'Study Table',      icon: <BookOpen size={22} /> },
  'ac':              { label: 'AC',               icon: <AirVent size={22} /> },
  'fridge':          { label: 'Fridge',           icon: <Refrigerator size={22} /> },
  'wifi':            { label: 'Wi-Fi',            icon: <Wifi size={22} /> },
  'washing-machine': { label: 'Washing Machine',  icon: <WashingMachine size={22} /> },
  'geyser':          { label: 'Geyser',           icon: <Flame size={22} /> },
  'power-backup':    { label: 'Power Backup',     icon: <Zap size={22} /> },
  'ro-water':        { label: 'RO Water',         icon: <Droplets size={22} /> },
  'cctv':            { label: 'CCTV Security',    icon: <Cctv size={22} /> },
  'security':        { label: 'Security',         icon: <Shield size={22} /> },
};

const getAmenityDetails = (raw) => {
  if (!raw) return { label: 'Amenity', icon: <Tag size={22} /> };
  const key = String(raw).toLowerCase().trim();
  if (AMENITY_CONFIG[key]) return AMENITY_CONFIG[key];
  if (key.startsWith('custom-')) {
    const formatted = key.replace('custom-', '').replace(/-/g, ' ');
    return { label: formatted.charAt(0).toUpperCase() + formatted.slice(1), icon: <Sparkles size={22} /> };
  }
  return { label: raw, icon: <Sparkles size={22} /> };
};
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import './RoomDescription.css';

const RoomDescription = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { user, subscribeToPG } = useAuth();
  const pg = state?.pg || {};

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [enquirySent, setEnquirySent] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  useEffect(() => {
    // Check if there is already a pending application for this PG
    const checkPendingStatus = async () => {
      if (!user?.uid || !pg?.id) return;
      try {

        const enquiryQuery = query(
          collection(db, 'enquiries'),
          where('tenantId', '==', user.uid),
          where('adminId', '==', pg.id)
        );
        const enquirySnapshot = await getDocs(enquiryQuery);
        if (!enquirySnapshot.empty) {
          setEnquirySent(true);
        }
      } catch (err) {
        console.error("Error checking pending status:", err);
      }
    };
    checkPendingStatus();
  }, [user?.uid, pg?.id]);

  useEffect(() => {
    if (user?.profileData?.likedPGs) {
      setIsFavorite(user.profileData.likedPGs.includes(pg.id));
    }
  }, [user?.profileData?.likedPGs, pg.id]);

  const toggleFavorite = async (e) => {
    e.stopPropagation();
    if (!user?.uid) return;

    const newIsFavorite = !isFavorite;
    setIsFavorite(newIsFavorite); // Optimistic UI

    try {
      const userRef = doc(db, 'users', user.uid);
      let currentLiked = user?.profileData?.likedPGs || [];
      let newLiked = [...currentLiked];
      
      if (newIsFavorite) {
        if (!newLiked.includes(pg.id)) newLiked.push(pg.id);
      } else {
        newLiked = newLiked.filter(id => id !== pg.id);
      }
      
      await updateDoc(userRef, { likedPGs: newLiked });
    } catch (err) {
      console.error("Error updating liked PGs:", err);
      // Revert on error
      setIsFavorite(!newIsFavorite);
    }
  };

  // Only use uploaded images, no dummy images
  const uploadedImages = [];
  const rawImages = pg.images || pg.propertyDetails?.images;
  if (Array.isArray(rawImages) && rawImages.length > 0) {
    uploadedImages.push(...rawImages);
  } else if (typeof rawImages === 'string' && rawImages.trim() !== '') {
    uploadedImages.push(rawImages);
  } else if (pg.image) {
    uploadedImages.push(pg.image);
  }
  const images = uploadedImages;

  const pgName = pg.pgName || 'Febebo PG House';
  const pgCity = pg.location?.city || 'New Delhi';
  const pgStreet = pg.location?.street || '';
  const pgAddress = pgStreet ? `${pgStreet}, ${pgCity}` : pgCity;
  const getStartingRent = (details) => {
    if (!details?.rents || !Array.isArray(details.rents) || details.rents.length === 0) return 0;
    const validRents = details.rents.map(r => Number(r.rent)).filter(v => v > 0);
    return validRents.length > 0 ? Math.min(...validRents) : 0;
  };
  const startingRent = getStartingRent(pg.propertyDetails);
  const pgPrice = startingRent > 0 ? `Starts ₹ ${startingRent.toLocaleString('en-IN')} /mo` : '₹ — /mo';
  const pgType = pg.pgType || 'UNISEX';
  const pgDesc = pg.description || 'A modern and welcoming hostel designed for comfort and community, offering well-equipped rooms, clean shared spaces, and a serene ambiance. Ideal for students or working professionals.';

  // Amenities: use real data from PG if available, else show defaults
  const amenities = pg.amenities?.length > 0
    ? pg.amenities
    : ['Mattress', 'Fridge', 'Study Table', 'Chair', 'WiFi', 'Security'];

  const handleEnquiry = async () => {
    if (!user?.uid) return alert('Please login to send an enquiry');
    try {
      await addDoc(collection(db, 'enquiries'), {
        adminId: pg.adminId || pg.id,
        pgId: pg.adminId ? pg.id : 'primary',
        tenantId: user.uid,
        tenantName: user.name || 'Student',
        tenantPhone: user.phone || '',
        pgName: pgName,
        message: 'I am interested in your PG and would like to know more details.',
        date: new Date().toISOString()
      });
      setEnquirySent(true);
    } catch (err) {
      console.error('Error sending enquiry', err);
      alert('Failed to send enquiry. Please try again.');
    }
  };



  const handleVisitPG = () => {
    let origin = '';
    if (user?.location?.lat && user?.location?.lng) {
      origin = `${user.location.lat},${user.location.lng}`;
    }

    let destination = '';

    // 1. Direct coordinates if available in pg.location
    if (pg.location?.lat && pg.location?.lng) {
      destination = `${pg.location.lat},${pg.location.lng}`;
    } 
    // 2. Extract coordinates if mapLink was stored
    else if (pg.location?.mapLink) {
      const link = String(pg.location.mapLink).trim();
      const qMatch = link.match(/[?&]q=([0-9.-]+,[0-9.-]+)/);
      const atMatch = link.match(/@([0-9.-]+,[0-9.-]+)/);
      if (qMatch) {
        destination = qMatch[1];
      } else if (atMatch) {
        destination = atMatch[1];
      } else if (!link.startsWith('http://') && !link.startsWith('https://')) {
        destination = link;
      }
    }

    // 3. Fallback to full address string
    if (!destination) {
      const loc = pg.location || {};
      const fullAddr = loc.address || loc.fullAddress || [loc.street, loc.city, loc.state, loc.pin].filter(Boolean).join(', ');
      destination = fullAddr || pgAddress || pgName;
    }

    let mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
    if (origin) {
      mapsUrl += `&origin=${encodeURIComponent(origin)}`;
    }
    
    window.open(mapsUrl, '_blank');
  };

  return (
    <div className="page-content bg-white pb-bottom">
      <TopBar title="Room Description" />

      {/* Image Slider */}
      {images.length > 0 ? (
        <div className="room-slider" style={{ position: 'relative' }}>
          <img 
            src={images[currentImageIndex]} 
            alt="Room" 
            className="slider-image" 
            onClick={() => setShowImageModal(true)} 
            style={{ cursor: 'pointer' }}
          />

        {!user?.hasPG && (
          <button
            className="favorite-btn"
            onClick={toggleFavorite}
            style={{ background: isFavorite ? '#ef4444' : 'rgba(0,0,0,0.4)' }}
          >
            <Heart size={20} fill={isFavorite ? '#fff' : 'none'} color="#fff" />
          </button>
        )}
        
        {images.length > 1 && (
          <div className="slider-dots">
            {images.map((_, index) => (
              <div
                key={index}
                className={`dot ${currentImageIndex === index ? 'active-dot' : ''}`}
                onClick={() => setCurrentImageIndex(index)}
              />
            ))}
          </div>
        )}
      </div>
      ) : (
        <div className="room-slider" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', color: '#94a3b8', fontSize: '14px', fontWeight: 'bold' }}>
          No images uploaded
        </div>
      )}

      <div className="room-details-container">
        {/* Title and Price */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
            <h2 className="room-title" style={{ margin: 0, flex: 1, lineHeight: 1.2, alignSelf: 'center' }}>{pgName}</h2>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <span className="text-primary font-bold" style={{ fontFamily: 'var(--font-price)', fontSize: '18px', fontWeight: 900, color: '#166534' }}>{pgPrice.replace(' /mo', '')}</span>
              <span className="text-muted text-sm" style={{ fontSize: '12px' }}>/mo</span>
            </div>
          </div>
          <p className="room-location text-muted" style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', margin: 0 }}>
            <MapPin size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{pgAddress}</span>
          </p>
        </div>

        {/* Tags */}
        <div className="room-tags mt-2">
          <span
            className="tag-box"
            style={{
              background: pgType === 'BOYS' ? '#eff6ff' : pgType === 'GIRLS' ? '#fdf2f8' : '#fffbeb',
              color: pgType === 'BOYS' ? '#2563eb' : pgType === 'GIRLS' ? '#db2777' : '#d97706',
              borderColor: pgType === 'BOYS' ? '#bfdbfe' : pgType === 'GIRLS' ? '#fbcfe8' : '#fde68a',
            }}
          >
            {pgType}
          </span>
          <span className="tag-box" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#d97706' }}>
            <Star size={12} fill="currentColor" /> 4.5
          </span>
        </div>

        {/* Description */}
        <div className="mt-4">
          <h3 className="section-title">Description</h3>
          <p className="text-muted text-sm line-height-lg mt-2">{pgDesc}</p>
        </div>

        {pg.rules && (
          <div className="mt-4">
            <h3 className="section-title">PG Rules</h3>
            <p className="text-muted text-sm line-height-lg mt-2" style={{ whiteSpace: 'pre-line' }}>{pg.rules}</p>
          </div>
        )}

        {/* Price Listing */}
        {pg.propertyDetails?.rents && pg.propertyDetails.rents.length > 0 && (
          <div className="mt-4">
            <h3 className="section-title">Rent & Pricing</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
              {pg.propertyDetails.rents.map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, color: '#334155' }}>{r.seater} Seater Room</span>
                  </div>
                  <span style={{ fontWeight: 900, fontFamily: 'var(--font-price)', color: '#0891b2', fontSize: '15px' }}>
                    ₹{Number(r.rent).toLocaleString()}/mo
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Amenities */}
        <div className="mt-4">
          <h3 className="section-title">Amenities</h3>
          <div className="amenities-grid mt-2">
            {amenities.map((item) => {
              const { label, icon } = getAmenityDetails(item);
              return (
                <div className="amenity-item" key={item}>
                  <div className="amenity-icon">
                    {icon}
                  </div>
                  <span>{label}</span>
                </div>
              );
            })}
          </div>
        </div>
                {/* Action Buttons */}
        <div className="mt-4" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {user?.hasPG && user?.subscribedPG?.pgId === pg.id ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ padding: '16px', borderRadius: '12px', background: '#eff6ff', border: '1px solid #93c5fd', color: '#1d4ed8', textAlign: 'center', fontWeight: '700', fontSize: '15px' }}>
                🎉 You are already registered to this PG.
              </div>
              <button 
                onClick={() => navigate('/')} 
                style={{ 
                  width: '100%', padding: '16px', borderRadius: '14px', border: 'none', 
                  background: 'linear-gradient(135deg, #064e3b, #166534)', color: '#fff', fontSize: '15px', fontWeight: '800', 
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                Go to Dashboard
              </button>
            </div>
          ) : enquirySent ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ padding: '16px', borderRadius: '12px', background: '#f0fdf4', border: '1px solid #86efac', color: '#16a34a', textAlign: 'center', fontWeight: '700', fontSize: '15px' }}>
                ✅ Enquiry sent! We will notify you shortly.
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => navigate('/chat')} 
                  style={{ 
                    flex: 1, padding: '16px', borderRadius: '14px', border: '1px solid #3b82f6', 
                    background: '#eff6ff', color: '#1d4ed8', fontSize: '15px', fontWeight: '800', 
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' 
                  }}
                >
                  <MessageSquare size={18} /> Chat
                </button>
                <button 
                  onClick={handleVisitPG} 
                  style={{ 
                    flex: 1, padding: '16px', borderRadius: '14px', border: '1px solid #d3a429', 
                    background: '#fffbeb', color: '#b45309', fontSize: '15px', fontWeight: '800', 
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' 
                  }}
                >
                  <Navigation size={18} /> Visit PG
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-enquiry" onClick={handleEnquiry} style={{ flex: 1 }}>Send Enquiry</button>
              <button 
                onClick={handleVisitPG} 
                style={{ 
                  flex: 1, padding: '16px', borderRadius: '14px', border: '1px solid #d3a429', 
                  background: '#fffbeb', color: '#b45309', fontSize: '15px', fontWeight: '800', 
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' 
                }}
              >
                <Navigation size={18} /> Visit PG
              </button>
            </div>
          )}
        </div>



        {/* Nearby PG */}
        <div className="mt-4">
          <h3 className="section-title">Nearby PG</h3>
          <div className="nearby-scroll mt-2">
            {[1, 2].map(id => (
              <div key={id} className="nearby-card">
                <img src={images[0] || 'https://images.unsplash.com/photo-1522771731478-44633239c878?auto=format&fit=crop&q=80&w=400'} alt="Nearby PG" className="nearby-img" />
                <div className="nearby-details">
                  <h4 className="nearby-title">{pgName}</h4>
                  <div className="nearby-rating"><Star size={12} fill="currentColor" color="var(--warning)"/> 4.3</div>
                  <p className="nearby-loc">{pgCity}</p>
                  <div className="nearby-price-row">
                    <span className="font-bold">{pgPrice}</span>
                    <button className="btn-view-small">View All</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>



      {/* Fullscreen Image Modal */}
      {showImageModal && images.length > 0 && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.95)', zIndex: 9999,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center'
        }}>
          <button 
            onClick={() => setShowImageModal(false)}
            style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', zIndex: 10000 }}
          >
            <span className="material-symbols-outlined">close</span>
          </button>

          <img 
            src={images[currentImageIndex]} 
            alt="Room Fullscreen" 
            style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain' }} 
          />

          {images.length > 1 && (
            <>
              <button
                onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
                style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}
              >
                <ChevronLeft size={32} />
              </button>
              <button
                onClick={() => setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
                style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}
              >
                <ChevronRight size={32} />
              </button>
              
              <div style={{ position: 'absolute', bottom: 40, display: 'flex', gap: 8 }}>
                {images.map((_, index) => (
                  <div
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    style={{ width: 10, height: 10, borderRadius: '50%', background: currentImageIndex === index ? '#fff' : 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default RoomDescription;
