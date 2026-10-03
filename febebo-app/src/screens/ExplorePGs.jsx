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
import { logAppEvent } from '../analytics';
import './ExplorePGs.css'; // New dedicated premium CSS

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

const ExplorePGs = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { startLoading, stopLoading } = useLoading();
  const [allPGs, setAllPGs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [isLocationAccurate, setIsLocationAccurate] = useState(false);
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [sortOption, setSortOption] = useState('distance'); 
  const [priceRange, setPriceRange] = useState({ min: 0, max: 20000 });
  const filters = ['All', 'Boys', 'Girls', 'Unisex'];

  // Analytics Debounce Timer
  useEffect(() => {
    if (searchQuery.trim().length > 2) {
      const timer = setTimeout(() => {
        logAppEvent('search', { search_term: searchQuery });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [searchQuery]);

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

  let filteredPGs = allPGs.filter(pg => {
    const matchSearch = searchQuery === '' ||
      (pg.pgName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (pg.location?.city || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchFilter = activeFilter === 'All' ||
      (pg.pgType || '').toLowerCase() === activeFilter.toLowerCase();
    
        const getStartingPrice = (details) => {
      if (!details?.rents || !Array.isArray(details.rents) || details.rents.length === 0) return 0;
      const validRents = details.rents.map(r => Number(r.rent)).filter(v => v > 0);
      return validRents.length > 0 ? Math.min(...validRents) : 0;
    };
    const price = getStartingPrice(pg.propertyDetails);
    const matchPrice = price === 0 || (price >= priceRange.min && price <= priceRange.max);

    return matchSearch && matchFilter && matchPrice;
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
    // Default: distance
    if (a.distanceKm === null && b.distanceKm === null) return 0;
    if (a.distanceKm === null) return 1;
    if (b.distanceKm === null) return -1;
    return a.distanceKm - b.distanceKm;
  });

  return (
    <div className="explore-container">
      <TopBar title="Explore PGs" showBack={false} />

      <div className="explore-header">
        <div className="explore-search-wrapper">
          <Search size={20} color="#64748b" />
          <input
            type="text"
            placeholder="Search by name or city..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <button className="explore-filter-btn" onClick={() => setIsFilterModalOpen(true)}>
            <SlidersHorizontal size={20} color="#166534" />
          </button>
        </div>

        <div className="explore-chips-scroll">
          {filters.map(f => (
            <button
              key={f}
              className={`explore-chip ${activeFilter === f ? 'active' : ''}`}
              onClick={() => setActiveFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="explore-list-container">
        {loading ? (
          <div className="explore-empty">
            <p>Finding nearby PGs...</p>
          </div>
        ) : filteredPGs.length === 0 ? (
          <div className="explore-empty">
            <Search size={48} color="#cbd5e1" />
            <h3>No PGs Found</h3>
            <p>Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="explore-grid">
            {filteredPGs.map(pg => (
              <div 
                key={pg.id} 
                className="explore-card"
                onClick={() => navigate('/room-description', { state: { pg } })}
              >
                <div className="explore-card-img-wrap">
                  <ImageSlider
                    images={pg.images || pg.propertyDetails?.images}
                    fallback={pg.image || 'https://images.unsplash.com/photo-1522771731478-44633239c878?auto=format&fit=crop&q=80&w=400'}
                    className="explore-card-img"
                  />
                  <div className="explore-type-badge">{pg.pgType?.toUpperCase() || 'UNISEX'}</div>
                  <div className="explore-rating-badge">
                    <Star size={14} fill="#fbbf24" color="#fbbf24" />
                    <span>{pg.rating || '4.5'}</span>
                  </div>
                </div>
                
                <div className="explore-card-content">
                  <div className="explore-card-header">
                    <h3 className="explore-card-title">{pg.pgName || 'Febebo PG'}</h3>
                    <div className="explore-card-price">
                      <span className="explore-price-val">
                        {pg.propertyDetails?.rents?.length ? `Starts ₹${Math.min(...pg.propertyDetails.rents.map(r=>Number(r.rent)).filter(v=>v>0)).toLocaleString()}` : '₹ —'}
                      </span>
                      <span className="explore-price-unit">/month</span>
                    </div>
                  </div>
                  
                  <div className="explore-card-details">
                    <div className="explore-detail-row">
                      <MapPin size={14} color="#94a3b8" />
                      <span>{pg.location?.city || 'New Delhi'}</span>
                    </div>

                    {pg.distanceKm !== null && (
                      <div className="explore-detail-row">
                        <Navigation size={14} color="#166534" />
                        <span style={{ color: '#166534', fontWeight: '600' }}>{pg.distanceKm} km away</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PREMIUM FILTER MODAL */}
      {isFilterModalOpen && (
        <>
          <div className="premium-filter-modal-backdrop" onClick={() => setIsFilterModalOpen(false)} />
          <div className="premium-filter-modal">
            <div className="filter-modal-header" style={{ marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800' }}>Filters & Sort</h3>
              <button onClick={() => setIsFilterModalOpen(false)} className="close-btn"><X size={24}/></button>
            </div>
            
            <div className="filter-section" style={{ marginBottom: '24px' }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#64748b' }}>Sort By</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button 
                  style={{ padding: '12px', borderRadius: '12px', border: sortOption === 'distance' ? '1.5px solid #166534' : '1px solid #e2e8f0', background: sortOption === 'distance' ? '#dcfce7' : 'white', fontWeight: '600', color: sortOption === 'distance' ? '#166534' : '#334155', textAlign: 'left' }} 
                  onClick={() => setSortOption('distance')}
                >Nearest to me</button>
                <button 
                  style={{ padding: '12px', borderRadius: '12px', border: sortOption === 'price_low' ? '1.5px solid #166534' : '1px solid #e2e8f0', background: sortOption === 'price_low' ? '#dcfce7' : 'white', fontWeight: '600', color: sortOption === 'price_low' ? '#166534' : '#334155', textAlign: 'left' }} 
                  onClick={() => setSortOption('price_low')}
                >Price: Low to High</button>
                <button 
                  style={{ padding: '12px', borderRadius: '12px', border: sortOption === 'price_high' ? '1.5px solid #166534' : '1px solid #e2e8f0', background: sortOption === 'price_high' ? '#dcfce7' : 'white', fontWeight: '600', color: sortOption === 'price_high' ? '#166534' : '#334155', textAlign: 'left' }} 
                  onClick={() => setSortOption('price_high')}
                >Price: High to Low</button>
                <button 
                  style={{ padding: '12px', borderRadius: '12px', border: sortOption === 'rating' ? '1.5px solid #166534' : '1px solid #e2e8f0', background: sortOption === 'rating' ? '#dcfce7' : 'white', fontWeight: '600', color: sortOption === 'rating' ? '#166534' : '#334155', textAlign: 'left' }} 
                  onClick={() => setSortOption('rating')}
                >Highest Rated</button>
              </div>
            </div>

            <div className="filter-section" style={{ marginBottom: '32px' }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#64748b' }}>Price Range (₹)</h4>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Min</label>
                  <input 
                    type="number" 
                    value={priceRange.min} 
                    onChange={e => setPriceRange({...priceRange, min: Number(e.target.value) || 0})} 
                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontWeight: '600' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Max</label>
                  <input 
                    type="number" 
                    value={priceRange.max} 
                    onChange={e => setPriceRange({...priceRange, max: Number(e.target.value) || 0})} 
                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontWeight: '600' }}
                  />
                </div>
              </div>
            </div>

            <button 
              style={{ width: '100%', padding: '16px', background: '#0f172a', color: 'white', borderRadius: '16px', fontWeight: '700', fontSize: '16px', border: 'none', cursor: 'pointer' }} 
              onClick={() => setIsFilterModalOpen(false)}
            >
              Show {filteredPGs.length} Results
            </button>
          </div>
        </>
      )}

      <BottomNav activeNav="explore" />
    </div>
  );
};

export default ExplorePGs;
