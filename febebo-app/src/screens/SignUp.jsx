import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLoading } from '../context/LoadingContext';
import { Eye, EyeOff, Mail, Lock, User, AlertCircle, Phone, CheckCircle } from 'lucide-react';
import logoImg from '../assets/logo.png';
import './SignUp.css';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';

const SignUp = () => {
  const { loginWithGoogle, signupWithEmail, loginWithEmail } = useAuth();
  const { startLoading, stopLoading } = useLoading();
  
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleForgotPasswordAction = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    setLoading(true);
    startLoading();
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMsg('A password reset link has been sent to your email.');
      setIsForgotPassword(false);
    } catch (err) {
      console.error(err);
      setError('Failed to send reset link: ' + err.message);
    } finally {
      setLoading(false);
      stopLoading();
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError('');
    setLoading(true);
    startLoading();

    try {
      if (!email.toLowerCase().endsWith('@gmail.com')) {
        setError('Please use a valid @gmail.com email address.');
        stopLoading();
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        stopLoading();
        setLoading(false);
        return;
      }
      if (!isLoginMode && phone.length !== 10) {
        setError('Please enter a valid 10-digit phone number.');
        stopLoading();
        setLoading(false);
        return;
      }
      if (isLoginMode) {
        await loginWithEmail(email, password);
      } else {
        await signupWithEmail(email, password, firstName, lastName, phone);
      }
    } catch (err) {
      console.error(err);
      setError(
        err.code === 'auth/email-already-in-use' ? 'This email is already registered. Please log in.' :
        err.code === 'auth/wrong-password' ? 'Incorrect password. Please try again.' :
        err.code === 'auth/user-not-found' ? 'No account found with this email.' :
        err.code === 'auth/weak-password' ? 'Password should be at least 6 characters.' :
        err.message || 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
      stopLoading();
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    startLoading();
    try {
      await loginWithGoogle();
    } catch (err) {
      setError('Google sign-in failed. Please use email & password instead.');
    } finally {
      stopLoading();
    }
  };

  return (
    <div className="signup-container-new">
      <div className="signup-top">
        <img src={logoImg} alt="febebo" className="signup-logo-main" />
      </div>

      <div className="signup-bottom">
        <div className="signup-header">
          <h1 className="brand-title">Welcome</h1>
          <p className="brand-subtitle">{isLoginMode ? 'Log in to continue' : 'Create a new account'}</p>
        </div>

        {error && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '24px', padding: '32px 24px', width: '100%', maxWidth: '320px', textAlign: 'center', position: 'relative', boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <AlertCircle size={32} color="#ef4444" />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: '900', color: '#0f172a' }}>Error</h3>
            <p style={{ margin: '0 0 24px', fontSize: '15px', color: '#64748b', fontWeight: '500', lineHeight: 1.5 }}>{error}</p>
            <button 
              onClick={() => setError('')} 
              style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: 'white', border: 'none', width: '100%', padding: '14px', borderRadius: '14px', fontWeight: '800', fontSize: '16px', cursor: 'pointer', boxShadow: '0 8px 16px rgba(239,68,68,0.25)' }}
            >
              Okay
            </button>
          </div>
        </div>
      )}

        {successMsg && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '24px', padding: '32px 24px', width: '100%', maxWidth: '320px', textAlign: 'center', position: 'relative', boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <CheckCircle size={32} color="#22c55e" />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: '900', color: '#0f172a' }}>Success</h3>
            <p style={{ margin: '0 0 24px', fontSize: '15px', color: '#64748b', fontWeight: '500', lineHeight: 1.5 }}>{successMsg}</p>
            <button 
              onClick={() => setSuccessMsg('')} 
              style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: 'white', border: 'none', width: '100%', padding: '14px', borderRadius: '14px', fontWeight: '800', fontSize: '16px', cursor: 'pointer', boxShadow: '0 8px 16px rgba(34,197,94,0.25)' }}
            >
              Okay
            </button>
          </div>
        </div>
      )}

        <form onSubmit={handleSubmit} className="signup-form">
          {isForgotPassword ? (
            <>
              <p style={{ textAlign: 'center', marginBottom: '16px', fontSize: '14px', color: '#64748b', fontWeight: '500' }}>
                Enter your email address to receive a password reset link.
              </p>
              <div className="form-group full-width">
                <div className="input-wrapper">
                  <Mail size={18} className="input-icon" />
                  <input 
                    type="email" 
                    className="brand-input full-width-input" 
                    placeholder="Email Address" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                  />
                </div>
              </div>
              <button type="button" onClick={handleForgotPasswordAction} className="btn-create-account" disabled={loading}>
                {loading ? 'Please wait...' : 'Send Reset Link'}
              </button>
              <button type="button" onClick={() => setIsForgotPassword(false)} style={{
                background: 'transparent', border: 'none', color: '#0f172a', fontWeight: '600',
                width: '100%', marginTop: '12px', fontSize: '14px', cursor: 'pointer'
              }}>
                Back to Login
              </button>
            </>
          ) : (
            <>
              {!isLoginMode && (
                <div className="form-row">
                  <div className="input-wrapper">
                    <User size={18} className="input-icon" />
                    <input 
                      type="text" 
                      className="brand-input" 
                      placeholder="First Name" 
                      value={firstName} 
                      onChange={e => setFirstName(e.target.value)} 
                    />
                  </div>
                  <div className="input-wrapper">
                    <User size={18} className="input-icon" />
                    <input 
                      type="text" 
                      className="brand-input" 
                      placeholder="Last Name" 
                      value={lastName} 
                      onChange={e => setLastName(e.target.value)} 
                    />
                  </div>
                </div>
              )}
              
              {!isLoginMode && (
                <div className="form-group full-width">
                  <div className="input-wrapper">
                    <Phone size={18} className="input-icon" />
                    <input 
                      type="tel" 
                      className="brand-input full-width-input" 
                      placeholder="Phone Number" 
                      value={phone} 
                      onChange={e => setPhone(e.target.value)} 
                    />
                  </div>
                </div>
              )}
              
              <div className="form-group full-width">
                <div className="input-wrapper">
                  <Mail size={18} className="input-icon" />
                  <input 
                    type="email" 
                    className="brand-input full-width-input" 
                    placeholder="Email Address" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                  />
                </div>
              </div>
              
              <div className="form-group full-width">
                <div className="input-wrapper">
                  <Lock size={18} className="input-icon" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    className="brand-input full-width-input" 
                    placeholder="Password" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                  />
                  <div className="eye-icon" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </div>
                </div>
              </div>

              {isLoginMode && (
                <div style={{ textAlign: 'right', marginBottom: '16px' }}>
                  <span 
                    onClick={() => setIsForgotPassword(true)}
                    style={{ fontSize: '13px', fontWeight: '600', color: '#0ea5e9', cursor: 'pointer' }}
                  >
                    Forgot Password?
                  </span>
                </div>
              )}

              <button type="submit" className="btn-create-account" disabled={loading}>
                {loading ? 'Please wait...' : isLoginMode ? 'Log In' : 'Create Account'}
              </button>
            </>
          )}
        </form>

        <div className="or-divider-container">
          <div className="divider-line"></div>
          <span className="or-divider">OR</span>
          <div className="divider-line"></div>
        </div>

        <button className="btn-google-auth-new" onClick={handleGoogleLogin} disabled={loading}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="google-icon" />
          Continue with Google
        </button>

        <p className="login-toggle">
          {isLoginMode ? "Don't have an account? " : "Already have an account? "}
          <span onClick={() => {
            setIsLoginMode(!isLoginMode);
            setError('');
          }}>
            {isLoginMode ? 'Sign up' : 'Log in'}
          </span>
        </p>
      </div>
    </div>
  );
};

export default SignUp;
