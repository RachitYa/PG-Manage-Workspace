import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopBar } from '../App';
import BottomNav from '../components/BottomNav';
import { Heart, Home, Star, MapPin, Navigation } from 'lucide-react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useLoading } from '../context/LoadingContext';
import './LikedPGs.css'; // We'll just reuse some dashboard classes and add specifics

const LikedPGs = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { startLoading, stopLoading } = useLoading();
  const [likedList, setLikedList] = useState([]);
  const [loading, setLoading] = useState(true);

  const likedPGIds = user?.profileData?.likedPGs || [];

  useEffect(() => {
    const fetchLikedPGs = async () => {
      const currentLikedIds = user?.profileData?.likedPGs || [];
      if (!user?.uid || currentLikedIds.length === 0) {
        setLikedList([]);
        setLoading(false);
        return;
      }
      
      startLoading();
      try {
        const querySnapshot = await getDocs(collection(db, 'pg_owners'));
        let pgs = [];
        querySnapshot.forEach((doc) => {
          const pgData = doc.data();
          if ((pgData.status !== 'Approved' && pgData.status !== 'Active') || pgData.visibility === 'private') return;
          if (currentLikedIds.includes(doc.id)) {
            pgs.push({ id: doc.id, ...pgData });
          }
        });
        setLikedList(pgs);
      } catch (error) {
        console.error('Error fetching liked PGs: ', error);
      } finally {
        setLoading(false);
        stopLoading();
      }
    };
    fetchLikedPGs();
  }, [user]);

  const toggleLike = async (e, pgId) => {
    e.stopPropagation();
    if (!user?.uid) return;
    const userRef = doc(db, 'users', user.uid);
    const newLiked = likedPGIds.filter(id => id !== pgId);
    try {
      await updateDoc(userRef, { likedPGs: newLiked });
      // The local list will automatically update via AuthContext listener updating likedPGIds and triggering the useEffect
    } catch (err) {
      console.error("Error unliking PG:", err);
    }
  };

  return (
    <div className="dashboard-root" style={{ background: '#f8fafc' }}>
      <TopBar title="Liked PGs" showBack={false} />
      
      <div className="dashboard-scroll-content" style={{ padding: '16px', paddingBottom: '100px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', marginTop: '40px', color: '#94a3b8' }}>Loading...</div>
        ) : likedList.length === 0 ? (
          <div className="empty-pg-state" style={{ marginTop: '40px', padding: '40px 20px', background: 'white', borderRadius: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <Heart size={48} color="#cbd5e1" strokeWidth={1.5} style={{ marginBottom: '16px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px' }}>No Liked PGs</h3>
            <p style={{ margin: 0 }}>You haven't liked any PGs yet. Explore the home screen and tap the heart icon to save your favorites!</p>
            <button 
              onClick={() => navigate('/student-dashboard')}
              style={{ marginTop: '24px', padding: '12px 24px', background: '#064e3b', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '14px' }}
            >
              Explore PGs
            </button>
          </div>
        ) : (
          <div className="liked-pg-grid">
            {likedList.map(pg => (
              <div
                key={pg.id}
                className="pg-card-v"
                onClick={() => navigate('/room-description', { state: { pg } })}
                style={{ marginBottom: '16px', background: 'white', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.05)', position: 'relative' }}
              >
                <div className="pg-card-accent-line" />
                <div style={{ display: 'flex', gap: '16px', padding: '16px' }}>
                  <div className="pg-card-img-wrap" style={{ width: '100px', height: '100px', borderRadius: '12px', overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
                    <img
                      src={(Array.isArray(pg.images) ? pg.images[0] : (typeof pg.images === 'string' ? pg.images : null)) || (Array.isArray(pg.propertyDetails?.images) ? pg.propertyDetails.images[0] : (typeof pg.propertyDetails?.images === 'string' ? pg.propertyDetails.images : null)) || pg.image || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&q=80&w=800'}
                      alt={pg.pgName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <button 
                      className="pg-like-btn" 
                      onClick={(e) => toggleLike(e, pg.id)}
                      style={{ top: '6px', right: '6px', width: '28px', height: '28px' }}
                    >
                      <Heart size={14} fill="#ef4444" color="#ef4444" />
                    </button>
                  </div>
                  
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0 }}>{pg.pgName || 'Febebo PG'}</h3>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '700', color: '#b45309', background: 'linear-gradient(135deg, #fef3c7, #fde68a)', padding: '2px 6px', borderRadius: '6px' }}>
                        <Star size={10} fill="currentColor" /> 4.5
                      </span>
                    </div>
                    
                    <p style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#64748b', margin: '0 0 10px' }}>
                      <MapPin size={11} /> {pg.location?.city || 'New Delhi'}
                    </p>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '16px', fontWeight: '800', color: '#166534' }}>
                        {pg.propertyDetails?.rents?.length ? `Starts ₹${Math.min(...pg.propertyDetails.rents.map(r=>Number(r.rent)).filter(v=>v>0)).toLocaleString()}` : '₹ —'}
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>/mo</span>
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: '700', padding: '4px 8px', borderRadius: '8px', background: '#f1f5f9', color: '#475569' }}>
                        {pg.pgType || 'UNISEX'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav activeNav="liked" />
    </div>
  );
};

export default LikedPGs;
