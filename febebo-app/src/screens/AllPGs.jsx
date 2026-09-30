import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopBar } from '../App';
import BottomNav from '../components/BottomNav';
import { Star, MapPin, Navigation, Search, SlidersHorizontal, X } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useLoading } from '../context/LoadingContext';
import ImageSlider from '../components/ImageSlider';
import './LikedPGs.css';
import './StudentDashboard.css'; // Reusing styles from Liked PGs for the grid

const getDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return parseFloat((R * c).toFixed(1));
};

const AllPGs = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { startLoading, stopLoading } = useLoading();
  const [allPGs, setAllPGs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [isLocating, setIsLocating] = useState(false);
  const [isLocationAccurate, setIsLocationAccurate] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [sortOption, setSortOption] = useState('distance'); 
  const [priceRange, setPriceRange] = useState({ min: 0, max: 20000 });


  useEffect(() => {
    const fetchAllPGs = async () => {
      startLoading();
      try {
        const querySnapshot = await getDocs(collection(db, 'pg_owners'));
        let pgs = [];
        querySnapshot.forEach((doc) => {
          const pgData = doc.data();
          if ((pgData.status !== 'Approved' && pgData.status !== 'Active') || pgData.visibility === 'private') return;
          const distanceKm = getDistance(
            user?.locationData?.lat,
            user?.locationData?.lng,
            pgData.location?.lat,
            pgData.location?.lng
          );
          pgs.push({ id: doc.id, ...pgData, distanceKm });
        });

        // Sort by distance (Nearby first)
        pgs.sort((a, b) => {
          if (a.distanceKm === null) return 1;
          if (b.distanceKm === null) return -1;
          return a.distanceKm - b.distanceKm;
        });

        setAllPGs(pgs);
      } catch (error) {
        console.error('Error fetching all PGs: ', error);
      } finally {
        setLoading(false);
        stopLoading();
      }
    };
    fetchAllPGs();
  }, [user]);


  const handleUpdateLocation = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      setIsLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition((position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      
      const updatedPGs = allPGs.map(pg => {
        const dist = getDistance(lat, lng, pg.location?.lat, pg.location?.lng);
        return { ...pg, distanceKm: dist };
      });
      
      updatedPGs.sort((a, b) => {
        if (a.distanceKm === null) return 1;
        if (b.distanceKm === null) return -1;
        return a.distanceKm - b.distanceKm;
      });
      
      setAllPGs(updatedPGs);
      setIsLocating(false);
      setIsLocationAccurate(true);
      setTimeout(() => setIsLocationAccurate(false), 4000);
    }, (error) => {
      console.error(error);
      alert("Unable to retrieve your location");
      setIsLocating(false);
    });
  };


  let filteredPGs = allPGs.filter(pg => {
    const matchSearch = searchQuery === '' ||
      (pg.pgName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (pg.location?.city || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const getStartingPrice = (details) => {
      if (!details?.rents || !Array.isArray(details.rents) || details.rents.length === 0) return 0;
      const validRents = details.rents.map(r => Number(r.rent)).filter(v => v > 0);
      return validRents.length > 0 ? Math.min(...validRents) : 0;
    };
    const price = getStartingPrice(pg.propertyDetails);
    const matchPrice = price === 0 || (price >= priceRange.min && price <= priceRange.max);

    return matchSearch && matchPrice;
  });

  filteredPGs.sort((a, b) => {
    if (sortOption === 'price_low') {
      const pA = a.propertyDetails?.rents ? Math.min(...a.propertyDetails.rents.map(r=>Number(r.rent)).filter(v=>v>0)) : 0;
      const pB = b.propertyDetails?.rents ? Math.min(...b.propertyDetails.rents.map(r=>Number(r.rent)).filter(v=>v>0)) : 0;
      return pA - pB;
    }
    if (sortOption === 'price_high') {
      const pA = a.propertyDetails?.rents ? Math.min(...a.propertyDetails.rents.map(r=>Number(r.rent)).filter(v=>v>0)) : 0;
      const pB = b.propertyDetails?.rents ? Math.min(...b.propertyDetails.rents.map(r=>Number(r.rent)).filter(v=>v>0)) : 0;
      return pB - pA;
    }
    if (sortOption === 'rating') {
      return (b.rating || 4.5) - (a.rating || 4.5);
    }
    // distance
    if (a.distanceKm === null) return 1;
    if (b.distanceKm === null) return -1;
    return a.distanceKm - b.distanceKm;
  });


  return (
    <div className="dashboard-root" style={{ background: '#f8fafc' }}>
      <TopBar title="All PGs" showBack={true} />
      
      
      <div style={{ padding: '16px 16px 0', background: 'white' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '10px 14px' }}>
            <Search size={18} color="#94a3b8" />
            <input 
              type="text" 
              placeholder="Search by name or city..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', flex: 1, marginLeft: '10px', fontSize: '14px' }}
            />
          </div>
          <button 
            onClick={handleUpdateLocation}
            disabled={isLocating}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: 'white',
              padding: '14px 20px', borderRadius: '24px', fontSize: '14px', fontWeight: '800',
              cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', width: '100%',
              boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
              marginTop: '4px'
            }}
          >
            <Navigation size={18} />
            {isLocating ? 'Getting accurate location...' : 'Find PGs near me accurately'}
          </button>

            {isLocationAccurate && (
              <div style={{ padding: '8px 12px', background: '#ecfdf5', border: '1px solid #10b981', borderRadius: '12px', color: '#047857', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                <Navigation size={14} /> Showing PGs nearest to your accurate location
              </div>
            )}

        </div>
      </div>

      <div className="dashboard-scroll-content" style={{ padding: '16px', paddingBottom: '100px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', marginTop: '40px', color: '#94a3b8' }}>Loading...</div>
        ) : (
          <div className="liked-pg-grid">
            {filteredPGs.map(pg => (
                    <div
                      key={pg.id}
                      className="pg-card-v"
                      onClick={() => navigate('/room-description', { state: { pg } })}
                    >
                      <div className="pg-v-img-wrap">
                        <ImageSlider
                          images={pg.images || pg.propertyDetails?.images}
                          fallback={pg.image || 'https://images.unsplash.com/photo-1522771731478-44633239c878?auto=format&fit=crop&q=80&w=400'}
                        />
                      </div>
                      <div className="pg-v-info">
                        <div className="pg-v-header-row">
                          <h4 className="pg-v-name">{pg.pgName || 'Febebo PG'}</h4>
                          <span className="pg-v-rating-pill"><Star size={10} fill="currentColor" /> {pg.rating || '4.5'}</span>
                        </div>
                        <p className="pg-v-loc"><MapPin size={12} /> {pg.location?.city || 'New Delhi'}</p>
                        
                        <div className="pg-v-footer-row">
                          <div className="pg-v-price-block">
                            <span className="pg-v-price-label">Starting at</span>
                            <p className="pg-v-price">
                              {pg.propertyDetails?.rents?.length ? `₹${Math.min(...pg.propertyDetails.rents.map(r=>Number(r.rent)).filter(v=>v>0)).toLocaleString()}` : '—'}
                              <span>/mo</span>
                            </p>
                          </div>
                          {pg.distanceKm !== null && (
                            <div className="pg-v-dist-pill">
                              <Navigation size={12} /> {pg.distanceKm} km
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
            ))}
          </div>
        )}
      </div>

      {isFilterModalOpen && (
        <>
          <div className="filter-modal-backdrop" onClick={() => setIsFilterModalOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.4)', zIndex: 999 }} />
          <div className="filter-modal" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: '24px', zIndex: 1000, boxShadow: '0 -4px 24px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>Filters & Sort</h3>
              <button onClick={() => setIsFilterModalOpen(false)} style={{ background: '#f1f5f9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={20}/></button>
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#64748b' }}>Sort By</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button style={{ padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', border: '1px solid', background: sortOption === 'distance' ? '#ecfeff' : 'white', borderColor: sortOption === 'distance' ? '#0891b2' : '#e2e8f0', color: sortOption === 'distance' ? '#0891b2' : '#475569' }} onClick={() => setSortOption('distance')}>Nearest</button>
                <button style={{ padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', border: '1px solid', background: sortOption === 'price_low' ? '#ecfeff' : 'white', borderColor: sortOption === 'price_low' ? '#0891b2' : '#e2e8f0', color: sortOption === 'price_low' ? '#0891b2' : '#475569' }} onClick={() => setSortOption('price_low')}>Price: Low to High</button>
                <button style={{ padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', border: '1px solid', background: sortOption === 'price_high' ? '#ecfeff' : 'white', borderColor: sortOption === 'price_high' ? '#0891b2' : '#e2e8f0', color: sortOption === 'price_high' ? '#0891b2' : '#475569' }} onClick={() => setSortOption('price_high')}>Price: High to Low</button>
                <button style={{ padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', border: '1px solid', background: sortOption === 'rating' ? '#ecfeff' : 'white', borderColor: sortOption === 'rating' ? '#0891b2' : '#e2e8f0', color: sortOption === 'rating' ? '#0891b2' : '#475569' }} onClick={() => setSortOption('rating')}>Highest Rated</button>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#64748b' }}>Price Range (₹)</h4>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Min</span>
                  <input 
                    type="number" 
                    value={priceRange.min} 
                    onChange={e => setPriceRange({...priceRange, min: Number(e.target.value) || 0})} 
                    style={{ padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '14px', background: '#f8fafc' }}
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Max</span>
                  <input 
                    type="number" 
                    value={priceRange.max} 
                    onChange={e => setPriceRange({...priceRange, max: Number(e.target.value) || 0})} 
                    style={{ padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '14px', background: '#f8fafc' }}
                  />
                </div>
              </div>
            </div>

            <button style={{ width: '100%', padding: '14px', borderRadius: '12px', background: '#0891b2', color: 'white', fontSize: '15px', fontWeight: '800', border: 'none', cursor: 'pointer' }} onClick={() => setIsFilterModalOpen(false)}>Show {filteredPGs.length} Results</button>
          </div>
        </>
      )}

    </div>
  );
};

export default AllPGs;
