import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!token) return;
    
    setLoading(true);
    setError('');

    try {
      // Query Firestore for the staff token
      const docRef = doc(db, 'staff_tokens', token);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const staffData = docSnap.data();
        
        // Save staff info and role to local storage
        localStorage.setItem('febebo_staff_token', token);
        localStorage.setItem('febebo_staff_role', staffData.role);
        localStorage.setItem('febebo_staff_name', staffData.name);
        
        // Navigate straight to dashboard, skipping role selection!
        navigate('/');
      } else {
        setError('Invalid Staff Pass Key. Please ask your Admin.');
      }
    } catch (err) {
      console.error(err);
      setError('Error connecting to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container bg-white login-page">
      <div className="login-header bg-primary-light">
        <div className="logo-box">
          <span className="logo-text text-primary" style={{ fontSize: '32px' }}>febebo</span>
          <p className="text-muted" style={{ fontSize: '14px', marginTop: '8px' }}>Staff Portal</p>
        </div>
      </div>

      <div className="login-form-container">
        <h2 style={{ marginBottom: '24px', textAlign: 'center', color: 'var(--text-dark)' }}>Sign In</h2>
        
        {error && (
          <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label className="input-label">6-Digit Staff Pass Key</label>
            <div className="input-with-icon">
              <KeyRound size={20} className="input-icon text-muted" />
              <input 
                type="text" 
                className="form-control" 
                placeholder="e.g. 123456" 
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
              />
            </div>
          </div>

          <div style={{ marginTop: '40px' }}>
            <button type="submit" className="btn-primary" style={{ borderRadius: '30px' }} disabled={loading}>
              {loading ? 'Verifying...' : 'Login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
