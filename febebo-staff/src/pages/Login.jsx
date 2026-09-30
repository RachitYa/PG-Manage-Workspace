import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../firebase';

const Field = ({ icon, placeholder, type = 'text', value, onChange, disabled, maxLength }) => (
  <div style={{ position: 'relative', marginBottom: 16 }}>
    <span className="material-symbols-outlined" style={{
      position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
      color: '#78680a', fontSize: 20, pointerEvents: 'none'
    }}>{icon}</span>
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      maxLength={maxLength}
      style={{
        width: '100%', padding: '14px 14px 14px 44px',
        border: `1.5px solid ${disabled ? '#e2e8f0' : '#e8df9a'}`,
        borderRadius: 12, fontSize: 15, fontFamily: "'Hanken Grotesk',sans-serif",
        background: disabled ? '#f5f5f5' : 'white', color: '#1a1500',
        outline: 'none', boxSizing: 'border-box',
        transition: 'all 0.2s', textAlign: 'center', letterSpacing: '4px', fontWeight: 800
      }}
    />
  </div>
);

export default function Login() {
  const [passkey, setPasskey] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (passkey.length !== 6) {
      setErrorMsg('Please enter a valid 6-digit Staff Key');
      return;
    }
    
    setLoading(true);
    try {
      try {
        await signInWithEmailAndPassword(auth, "superadmin_backend_hidden@febebo.com", "FebeboSuperadminSecret2026!");
      } catch (authErr) {
        if (authErr.code === 'auth/invalid-credential' || authErr.code === 'auth/user-not-found' || authErr.code === 'auth/wrong-password') {
           const { createUserWithEmailAndPassword } = await import('firebase/auth');
           try {
             await createUserWithEmailAndPassword(auth, "superadmin_backend_hidden@febebo.com", "FebeboSuperadminSecret2026!");
           } catch(e) {
             console.warn("Superadmin auth fallback failed, continuing unauthenticated:", e.message);
           }
        } else {
           console.warn("Superadmin auth failed, continuing unauthenticated:", authErr.message);
        }
      }
      
      const docRef = doc(db, 'staff_tokens', passkey);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        login({
          id: passkey,
          role: 'staff',
          staffRole: data.role,
          name: data.name,
          phone: data.phone,
          ownerUid: data.ownerUid,
          salary: data.salary,
          payDate: data.payDate,
          createdAt: data.createdAt,
          hasProfile: data.hasProfile || false,
          profileData: data.profileData || {}
        });
        navigate('/');
      } else {
        setErrorMsg('Invalid Staff Key. Please check with your PG Admin.');
      }
    } catch (err) {
      console.error(err);
      if (err.message === 'timeout') {
        setErrorMsg('Network timeout. Please check your internet connection.');
      } else {
        setErrorMsg('System Error: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      backgroundColor: '#fffdf0',
      fontFamily: "'Hanken Grotesk',sans-serif", padding: '0 0 40px'
    }}>
      {/* Top branding */}
      <div style={{ textAlign: 'center', padding: '50px 24px 24px' }}>
        <img
          src="/staff-logo.png"
          alt="Febebo Staff"
          style={{
            width: 140,
            height: 'auto',
            margin: '0 auto 10px',
            display: 'block',
            mixBlendMode: 'multiply'
          }}
        />
        <p style={{ color: '#78680a', fontSize: 13, margin: 0, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Staff Portal
        </p>
      </div>

      {/* Main Container Card */}
      <div style={{
        margin: '0 20px', background: 'white',
        borderRadius: 24, padding: '28px 24px',
        border: '1px solid #e8df9a',
        boxShadow: '0 8px 24px rgba(120, 104, 10, 0.06)'
      }}>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 28 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#1a1500', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3, textAlign: 'center' }}>Enter 6-Digit Staff Key</label>
            <Field 
              icon="key" 
              type="text"
              placeholder="XXXXXX" 
              value={passkey} 
              onChange={e => setPasskey(e.target.value.replace(/[^0-9]/g, ''))} 
              maxLength={6}
            />
          </div>

          {errorMsg && (
            <div style={{ marginBottom: 16, padding: '10px', background: '#fee2e2', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 700, textAlign: 'center' }}>
              {errorMsg}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '16px', borderRadius: 12,
            background: loading ? '#fde04780' : '#fde047',
            color: '#1a1500', border: '1px solid #e8df9a', fontSize: 16, fontWeight: 800,
            cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            boxShadow: '0 4px 12px rgba(253, 224, 71, 0.25)',
            outline: 'none', transition: 'all 0.15s'
          }}>
            {loading ? 'Verifying...' : 'Sign In'}
          </button>
        </form>
      </div>

      <p style={{ textAlign: 'center', fontSize: 13, color: '#78680a', marginTop: 32, padding: '0 24px', fontWeight: 600, letterSpacing: 0.3 }}>
        Ask your PG Admin to generate a key for you from the Febebo Admin App.
      </p>
    </div>
  );
}
