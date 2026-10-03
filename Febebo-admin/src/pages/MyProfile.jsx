import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  MapPin, LogOut, ExternalLink, CheckCircle,
  Bed, Layers, Shirt, Package, Tag, Armchair, LampDesk, AirVent, Refrigerator,
  Wifi, WashingMachine, Flame, Zap, Droplets, Cctv, Sparkles
} from 'lucide-react';
import AdminBottomNav from '../components/AdminBottomNav';
import LoadingSpinner from '../components/LoadingSpinner';

const AMENITIES_MAP = {
  'bed':             { label: 'Bed',             icon: Bed },
  'mattress':        { label: 'Mattress',         icon: Layers },
  'bedsheet':        { label: 'Bedsheet',         icon: Shirt },
  'pillow':          { label: 'Pillow',           icon: Package },
  'pillow-cover':    { label: 'Pillow Cover',     icon: Tag },
  'chair':           { label: 'Chair',            icon: Armchair },
  'table':           { label: 'Study Table',      icon: LampDesk },
  'ac':              { label: 'AC',               icon: AirVent },
  'fridge':          { label: 'Fridge',           icon: Refrigerator },
  'wifi':            { label: 'Wi-Fi',            icon: Wifi },
  'washing-machine': { label: 'Washing Machine',  icon: WashingMachine },
  'geyser':          { label: 'Geyser',           icon: Flame },
  'power-backup':    { label: 'Power Backup',     icon: Zap },
  'ro-water':        { label: 'RO Water',         icon: Droplets },
  'cctv':            { label: 'CCTV Security',    icon: Cctv },
};

function InfoRow({ label, value, accent }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '16px 0',
      borderBottom: '1px solid var(--border-color)',
    }}>
      <span style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 600 }}>{label}</span>
      <span style={{
        fontSize: 14, fontWeight: 700,
        color: accent ? 'var(--primary)' : 'var(--text-color)',
        background: accent ? 'var(--primary-light)' : 'transparent',
        padding: accent ? '4px 12px' : 0,
        borderRadius: accent ? 20 : 0,
        border: accent ? '1px solid #a5f3fc' : 'none',
      }}>
        {value}
      </span>
    </div>
  );
}

export default function MyProfile() {
  const navigate = useNavigate();
  const { user, logout, activePgId } = useAuth();
  const [pgData, setPgData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPGData = async () => {
      if (user?.uid) {
        try {
          const docSnap = await getDoc(activePgId === 'primary' ? doc(db, 'pg_owners', user.uid) : doc(db, 'pg_owners', activePgId));
          if (docSnap.exists()) setPgData(docSnap.data());
        } catch (err) {
          console.error('Error fetching PG data:', err);
        }
      }
      setLoading(false);
    };
    fetchPGData();
  }, [user]);

  const { location, propertyDetails, amenities, image, pgName, registrationNumber, totalRooms } = pgData || {};

  const cardStyle = {
    background: 'white',
    border: '1px solid var(--border-color)',
    borderRadius: 24,
    padding: '24px',
    marginBottom: 20,
    boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
  };

  const sectionTitle = {
    fontSize: 12, fontWeight: 800, color: 'var(--text-muted)',
    letterSpacing: 1, textTransform: 'uppercase',
    margin: '0 0 12px',
  };

  return (
    <div className="app-container" style={{ paddingBottom: '100px', minHeight: '100vh', background: 'var(--bg-color)', fontFamily: "'Inter', sans-serif" }}>
      {/* Inline header matching app style */}
      <div style={{
        background: 'white', borderBottom: '1px solid #e2e8f0',
        padding: '0 20px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 20
      , paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))'}}>
        <span style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>My Profile</span>
        <button onClick={logout} style={{
          background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10,
          width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#dc2626'
        }}>
          <LogOut size={16} />
        </button>
      </div>
      
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <LoadingSpinner />
        </div>
      ) : !pgData ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16 }}>
          <p style={{ color: 'var(--text-muted)' }}>No PG Profile found.</p>
          <button onClick={logout} className="btn-primary" style={{ background: '#fee2e2', color: '#dc2626', width: 'auto' }}>Sign Out</button>
        </div>
      ) : (
        <div style={{ padding: '32px 20px', maxWidth: 520, margin: '0 auto' }}>
          
          {/* Avatar + Name */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              width: 90, height: 90, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary), #0e7490)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 36, fontWeight: 800, color: 'white',
              margin: '0 auto 16px',
              boxShadow: '0 8px 24px rgba(8, 145, 178, 0.25)',
              border: '4px solid white',
            }}>
              {user?.name?.[0]?.toUpperCase() || 'O'}
            </div>
            <h2 style={{ color: 'var(--text-color)', fontSize: 24, fontWeight: 800, margin: '0 0 8px' }}>
              {user?.name || 'Owner'}
            </h2>
            <span style={{
              background: 'var(--primary-light)', color: 'var(--primary)', 
              padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700,
            }}>
              PG Owner
            </span>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '12px 0 0', fontWeight: 500 }}>
              {user?.email}
            </p>
          </div>

          {/* PG Image */}
          {image && (
            <div style={{ borderRadius: 24, overflow: 'hidden', marginBottom: 20, border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <img src={image} alt="PG" style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }} />
            </div>
          )}

          {/* PG Details */}
          <div style={cardStyle}>
            <p style={sectionTitle}>PG Details</p>
            <InfoRow label="PG Name" value={pgName} />
            <InfoRow label="Total Rooms" value={totalRooms} />
            <InfoRow label="Registration No." value={registrationNumber || 'N/A'} />
            <div style={{ padding: '16px 0 0' }}>
              <InfoRow
                label="Ownership"
                value={propertyDetails?.isLeased
                  ? `Lease · ₹${Number(propertyDetails.leaseAmount).toLocaleString('en-IN')}/mo`
                  : 'Owned Property'}
                accent
              />
            </div>
          </div>

          {/* Location */}
          <div style={cardStyle}>
            <p style={sectionTitle}>Location</p>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginTop: 16 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                background: 'var(--primary-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <MapPin size={24} color="var(--primary)" />
              </div>
              <div>
                <p style={{ color: 'var(--text-color)', fontSize: 15, fontWeight: 700, margin: '0 0 6px', lineHeight: 1.4 }}>
                  {location?.fullAddress}
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0, fontWeight: 500 }}>
                  {[location?.street, location?.city, location?.state, location?.pincode].filter(Boolean).join(', ')}
                </p>
              </div>
            </div>
            {location?.mapLink && (
              <a href={location.mapLink} target="_blank" rel="noreferrer" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                marginTop: 20, padding: '14px',
                background: 'var(--primary-light)', border: '1px solid #a5f3fc',
                borderRadius: 14, textDecoration: 'none',
                color: 'var(--primary)', fontWeight: 700, fontSize: 14, transition: 'all 0.2s'
              }}>
                <ExternalLink size={16} />
                View on Google Maps
              </a>
            )}
          </div>

          {/* Amenities */}
          {amenities?.length > 0 && (
            <div style={cardStyle}>
              <p style={sectionTitle}>Amenities</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
                {amenities.map((amId, idx) => {
                  const am = AMENITIES_MAP[amId] || { label: amId.replace('custom-', '').replace(/-/g, ' '), icon: Sparkles };
                  const IconComp = am.icon || Sparkles;
                  return (
                    <div key={idx} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: '#f8fafc', border: '1px solid #e2e8f0',
                      borderRadius: 14, padding: '8px 14px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                    }}>
                      <div style={{ color: '#0891b2', display: 'flex', alignItems: 'center' }}>
                        <IconComp size={16} strokeWidth={2} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#334155', textTransform: 'capitalize' }}>
                        {am.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sign out */}
          <button onClick={logout} style={{
            width: '100%', padding: '16px',
            background: '#fee2e2', border: '1px solid #fca5a5',
            borderRadius: 16, color: '#dc2626',
            fontWeight: 800, fontSize: 16, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            marginTop: 32, boxShadow: '0 4px 12px rgba(220,38,38,0.1)'
          }}>
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      )}

      <AdminBottomNav activeTab="profile" />
    </div>
  );
}
