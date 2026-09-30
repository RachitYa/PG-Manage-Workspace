import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function StaffPinEntry() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handlePinPress = (val) => {
    if (val === 'del') {
      setPin(p => p.slice(0, -1));
    } else if (pin.length < 6) {
      setPin(p => p + val);
    }
    setError('');
  };

  const handleVerify = async () => {
    if (pin.length < 4) {
      setError('Please enter at least a 4-digit PIN');
      return;
    }
    setLoading(true);
    try {
      const q = query(collection(db, 'staff'), where('pin', '==', pin));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const staffDoc = querySnapshot.docs[0].data();
        localStorage.setItem('febebo_staff_role', staffDoc.role || 'staff');
        localStorage.setItem('febebo_staff_name', staffDoc.name || 'Staff Member');
        navigate('/staff-dashboard');
      } else {
        setError('Invalid PIN. Please ask your PG Admin for the correct PIN.');
      }
    } catch (err) {
      setError('Error verifying PIN. Please try again.');
    }
    setLoading(false);
  };

  const KEYS = ['1','2','3','4','5','6','7','8','9','','0','del'];

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(160deg, #0c1a2e 0%, #0f2847 50%, #0c3461 100%)',
      fontFamily: "'Inter', sans-serif",
      justifyContent: 'center',
      alignItems: 'center',
      padding: '24px 20px',
      boxSizing: 'border-box',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Decorative blobs */}
      <div style={{ position: 'absolute', top: -80, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(56,189,248,0.10)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -60, left: -50, width: 180, height: 180, borderRadius: '50%', background: 'rgba(74,153,140,0.12)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 360, textAlign: 'center' }}>

        {/* Icon */}
        <div style={{
          width: 72, height: 72, borderRadius: 20,
          background: 'linear-gradient(135deg, #0891b2, #38bdf8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
          boxShadow: '0 8px 28px rgba(8,145,178,0.4)',
        }}>
          <span style={{ fontSize: 32 }}>🔐</span>
        </div>

        <h1 style={{ color: 'white', fontSize: 24, fontWeight: 800, margin: '0 0 6px' }}>Staff Login</h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, margin: '0 0 32px' }}>
          Enter the PIN provided by your PG Admin
        </p>

        {/* PIN dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginBottom: 12 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{
              width: 14, height: 14, borderRadius: '50%',
              background: i < pin.length ? '#38bdf8' : 'rgba(255,255,255,0.15)',
              border: '2px solid ' + (i < pin.length ? '#38bdf8' : 'rgba(255,255,255,0.25)'),
              transition: 'all 0.15s ease',
              boxShadow: i < pin.length ? '0 0 10px rgba(56,189,248,0.5)' : 'none',
            }} />
          ))}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 10, padding: '10px 14px', marginBottom: 16,
            color: '#fca5a5', fontSize: 13,
          }}>
            {error}
          </div>
        )}

        {/* Numpad */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12, marginBottom: 20,
        }}>
          {KEYS.map((key, i) => {
            if (key === '') return <div key={i} />;
            const isDel = key === 'del';
            return (
              <button key={i} onClick={() => handlePinPress(key)} style={{
                padding: '18px 0',
                borderRadius: 14,
                border: '1px solid rgba(255,255,255,0.1)',
                background: isDel ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.08)',
                color: isDel ? '#f87171' : 'white',
                fontSize: isDel ? 13 : 22,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
                fontFamily: "'Inter', sans-serif",
                backdropFilter: 'blur(10px)',
              }}>
                {isDel ? '⌫' : key}
              </button>
            );
          })}
        </div>

        {/* Verify Button */}
        <button onClick={handleVerify} disabled={loading || pin.length < 4} style={{
          width: '100%', padding: '15px',
          borderRadius: 14,
          background: pin.length >= 4 ? 'linear-gradient(135deg, #0891b2, #38bdf8)' : 'rgba(255,255,255,0.1)',
          color: pin.length >= 4 ? 'white' : 'rgba(255,255,255,0.3)',
          border: 'none', fontSize: 15, fontWeight: 700,
          cursor: pin.length >= 4 ? 'pointer' : 'not-allowed',
          boxShadow: pin.length >= 4 ? '0 4px 20px rgba(8,145,178,0.4)' : 'none',
          transition: 'all 0.2s',
          fontFamily: "'Inter', sans-serif",
        }}>
          {loading ? 'Verifying...' : 'Verify & Login'}
        </button>

        {/* Logout link */}
        <p style={{ marginTop: 24, color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
          Not staff?{' '}
          <span onClick={logout} style={{ color: '#f87171', fontWeight: 600, cursor: 'pointer' }}>
            Sign out
          </span>
        </p>
      </div>
    </div>
  );
}
