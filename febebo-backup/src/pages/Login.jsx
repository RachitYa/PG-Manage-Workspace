import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';


export default function Login() {
  const { loginWithGoogle, loginWithEmail, signupWithEmail, user } = useAuth();
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (user) {
      if (!user.role) {
        navigate('/role-selection');
      } else if (user.role === 'admin') {
        navigate(user.hasProfile ? '/' : '/create-pg-profile');
      } else if (user.role === 'staff') {
        navigate('/staff-pin');
      } else {
        navigate('/');
      }
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await loginWithEmail(email, password);
      } else {
        await signupWithEmail(email, password, `${firstName} ${lastName}`.trim());
      }
    } catch (err) {
      setError(
        err.code === 'auth/email-already-in-use' ? 'This email is already registered. Please log in.' :
        err.code === 'auth/wrong-password' ? 'Incorrect password. Please try again.' :
        err.code === 'auth/user-not-found' ? 'No account found with this email.' :
        err.code === 'auth/weak-password' ? 'Password should be at least 6 characters.' :
        err.code === 'auth/invalid-email' ? 'Please enter a valid email address.' :
        'Something went wrong. Please try again.'
      );
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setError('Google sign-in failed. Please use email & password instead.');
    }
    setLoading(false);
  };

  const inputStyle = {
    width: '100%',
    padding: '14px 16px 14px 46px',
    borderRadius: '14px',
    border: '1.5px solid rgba(255,255,255,0.25)',
    background: 'rgba(255,255,255,0.15)',
    color: 'white',
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    fontFamily: "'Inter', sans-serif",
  };

  const iconStyle = {
    position: 'absolute',
    left: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'rgba(255,255,255,0.7)',
    pointerEvents: 'none',
    display: 'flex',
  };

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
      <div style={{ position: 'absolute', top: '40%', left: -40, width: 120, height: 120, borderRadius: '50%', background: 'rgba(99,102,241,0.08)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo / Brand */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20, overflow: 'hidden',
            margin: '0 auto 16px',
            boxShadow: '0 8px 32px rgba(56,189,248,0.3)',
            border: '2px solid rgba(56,189,248,0.3)',
          }}>
            <img src="/Admin-app-logo.png" alt="Febebo Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <h1 style={{
            fontWeight: 800, fontSize: 32, color: '#38bdf8',
            margin: '0 0 6px', letterSpacing: -0.5,
            fontFamily: "'Inter', sans-serif",
          }}>Febebo</h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, margin: 0 }}>
            PG Management Platform
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 24,
          padding: '28px 24px',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}>

          {/* Tab Switch */}
          <div style={{
            display: 'flex', background: 'rgba(255,255,255,0.08)',
            borderRadius: 12, padding: 4, marginBottom: 24,
          }}>
            {['Sign Up', 'Log In'].map((label, idx) => {
              const active = isLogin === (idx === 1);
              return (
                <button key={label} onClick={() => { setIsLogin(idx === 1); setError(''); }}
                  style={{
                    flex: 1, padding: '10px', borderRadius: 9, border: 'none',
                    background: active ? 'rgba(56,189,248,0.25)' : 'transparent',
                    color: active ? '#38bdf8' : 'rgba(255,255,255,0.45)',
                    fontWeight: active ? 700 : 500, fontSize: 14,
                    cursor: 'pointer', transition: 'all 0.2s',
                    fontFamily: "'Inter', sans-serif",
                  }}>
                  {label}
                </button>
              );
            })}
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 10, padding: '10px 14px', marginBottom: 16,
              color: '#fca5a5', fontSize: 13, lineHeight: 1.4,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Name Fields (signup only) */}
            {!isLogin && (
              <div style={{ display: 'flex', gap: 10 }}>
                {[
                  { placeholder: 'First Name', value: firstName, set: setFirstName },
                  { placeholder: 'Last Name', value: lastName, set: setLastName },
                ].map(f => (
                  <div key={f.placeholder} style={{ flex: 1, position: 'relative' }}>
                    <span style={iconStyle}><User size={16} /></span>
                    <input
                      type="text"
                      placeholder={f.placeholder}
                      value={f.value}
                      onChange={e => f.set(e.target.value)}
                      required
                      style={{ ...inputStyle, padding: '14px 10px 14px 36px', fontSize: 13 }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Email */}
            <div style={{ position: 'relative' }}>
              <span style={iconStyle}><Mail size={17} /></span>
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={inputStyle}
              />
            </div>

            {/* Password */}
            <div style={{ position: 'relative' }}>
              <span style={iconStyle}><Lock size={17} /></span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ ...inputStyle, paddingRight: 46 }}
              />
              <button type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.6)', display: 'flex', padding: 0,
                }}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '15px', borderRadius: 14, marginTop: 4,
              background: loading ? 'rgba(56,189,248,0.5)' : 'linear-gradient(135deg, #0891b2, #38bdf8)',
              color: 'white', border: 'none',
              fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 20px rgba(8,145,178,0.4)',
              fontFamily: "'Inter', sans-serif",
              letterSpacing: 0.3,
            }}>
              {loading ? 'Please wait...' : isLogin ? 'Log In' : 'Create Account'}
            </button>
          </form>

          {/* Divider + Google */}
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.12)' }} />
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: 600 }}>OR</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.12)' }} />
            </div>

            <button onClick={handleGoogleLogin} disabled={loading} style={{
              width: '100%', padding: '14px', borderRadius: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.2)',
              fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: "'Inter', sans-serif",
              transition: 'background 0.2s',
            }}>
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: 18, height: 18 }} />
              Continue with Google
            </button>
          </>


          {/* Switch mode link */}
          <p style={{ textAlign: 'center', marginTop: 20, marginBottom: 0, color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <span onClick={() => { setIsLogin(!isLogin); setError(''); }}
              style={{ color: '#38bdf8', fontWeight: 700, cursor: 'pointer' }}>
              {isLogin ? 'Sign up' : 'Log in'}
            </span>
          </p>

        </div>
      </div>
    </div>
  );
}
