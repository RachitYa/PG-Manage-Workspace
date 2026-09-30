import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

const cyanDark = '#083344'; // Deep cyan-slate for the card
const cyanPrimary = '#06b6d4'; // Vibrant cyan for accents

const Field = ({ icon, placeholder, type = 'text', value, onChange }) => (
  <div style={{ position: 'relative', marginBottom: 12 }}>
    <span className="material-symbols-outlined" style={{
      position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
      color: 'rgba(255,255,255,0.5)', fontSize: 22, pointerEvents: 'none', transition: 'color 0.2s'
    }}>{icon}</span>
    <input
      className="cool-input"
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      style={{
        width: '100%', paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))', padding: '16px 16px 16px 50px',
        border: '1.5px solid rgba(255,255,255,0.1)',
        borderRadius: 16, fontSize: 15, fontWeight: 500, fontFamily: "'Hanken Grotesk',sans-serif",
        background: 'rgba(255,255,255,0.03)', color: 'white',
        outline: 'none', boxSizing: 'border-box', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    />
  </div>
);

export default function Login() {
  const [isLogin, setIsLogin] = useState(false); // Default to sign up
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const { user, loginWithEmail, signupWithEmail, loginWithGoogle, activePgId } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleForgotPasswordAction = async () => {
    if (!email) {
      alert('Please enter your email address first.');
      return;
    }
    setIsProcessing(true);
    try {
      await sendPasswordResetEmail(auth, email);
      alert('A password reset link has been sent to your email.');
      setIsForgotPassword(false);
    } catch (error) {
      console.error(error);
      alert('Failed to send reset link: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      alert('Please enter your email and password');
      return;
    }
    setIsProcessing(true);
    try {
      if (isLogin) {
        await loginWithEmail(email, password);
      } else {
        await signupWithEmail(email, password, firstName, lastName);
      }
      // Redirect is handled by useEffect
    } catch (error) {
      setIsProcessing(false);
      alert(error.message);
    }
  };

  const handleGoogleAuth = async () => {
    setIsProcessing(true);
    try {
      await loginWithGoogle();
      // Redirect is handled by useEffect
    } catch (error) {
      setIsProcessing(false);
      console.error("Google Auth Error", error);
      alert("Failed to login with Google: " + error.message);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setFirstName('');
    setLastName('');
    setEmail('');
    setPassword('');
  };

  return (
    <div style={{
      minHeight: '100dvh', overflowY: 'auto', display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(135deg, #f0f9ff 0%, #cffafe 50%, #e0f2fe 100%)',
      fontFamily: "'Hanken Grotesk',sans-serif", alignItems: 'center', justifyContent: 'center',
      padding: '16px'
    }}>
      <style>
        {`
          .cool-input::placeholder {
            color: rgba(255,255,255,0.4);
            font-weight: 500;
          }
          .cool-input:focus {
            border-color: ${cyanPrimary} !important;
            background: rgba(255,255,255,0.06) !important;
            box-shadow: 0 0 0 4px rgba(6,182,212,0.15) !important;
          }
          .cool-input:focus + span, .cool-input:not(:placeholder-shown) + span {
            color: ${cyanPrimary} !important;
          }
          .google-btn {
            transition: all 0.2s;
          }
          .google-btn:hover {
            background: rgba(255,255,255,0.08) !important;
            border-color: rgba(255,255,255,0.6) !important;
          }
          .action-btn {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .action-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 24px rgba(6,182,212,0.4) !important;
            background: linear-gradient(135deg, ${cyanPrimary}, #0891b2) !important;
            color: white !important;
          }
          .link-btn {
            transition: color 0.2s;
          }
          .link-btn:hover {
            color: ${cyanPrimary} !important;
          }
          .spinner {
            width: 48px;
            height: 48px;
            border: 5px solid rgba(255, 255, 255, 0.2);
            border-bottom-color: ${cyanPrimary};
            border-radius: 50%;
            display: inline-block;
            box-sizing: border-box;
            animation: rotation 1s linear infinite;
          }
          @keyframes rotation {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>

      {/* Top branding */}
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <img 
          src="/admin_logo.png" 
          alt="Febebo Admin" 
          style={{ width: 150, height: 'auto' }} 
        />
      </div>

      {/* Glassmorphic Card */}
      <div style={{
        width: '100%', maxWidth: 440,
        margin: '0 20px', background: cyanDark,
        borderRadius: 36, padding: '28px 24px',
        boxShadow: '0 24px 48px rgba(8,51,68,0.25), inset 0 1px 1px rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.1)',
        color: 'white',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle gradient glow behind the card content */}
        <div style={{
          position: 'absolute', top: -100, left: -100, width: 300, height: 300,
          background: 'radial-gradient(circle, rgba(6,182,212,0.15) 0%, rgba(0,0,0,0) 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ textAlign: 'center', marginBottom: 20, position: 'relative', zIndex: 10 }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>Welcome</h2>
          <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
            {isLogin ? 'Sign in to your account' : 'Create a new account'}
          </p>
        </div>

        {/* Fields */}
        <div style={{ position: 'relative', zIndex: 10 }}>
          {isForgotPassword ? (
             <div style={{ marginBottom: 12 }}>
               <p style={{ margin: '0 0 16px', fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>
                 Enter your email address to receive a password reset link.
               </p>
               <Field icon="mail" type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} />
               
               <button type="button" className="action-btn" onClick={handleForgotPasswordAction} style={{
                 width: '100%', padding: '16px', borderRadius: 16,
                 background: 'white', color: cyanDark, border: 'none', 
                 fontSize: 16, fontWeight: 800, cursor: 'pointer', 
                 fontFamily: 'inherit', marginTop: 4,
                 boxShadow: '0 8px 16px rgba(0,0,0,0.15)'
               }}>
                 Send Reset Link
               </button>
               
               <button type="button" className="link-btn" onClick={() => setIsForgotPassword(false)} style={{
                 width: '100%', padding: '12px', background: 'transparent', border: 'none', color: 'white',
                 fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 8
               }}>
                 Back to Login
               </button>
             </div>
          ) : (
            <>
              {!isLogin && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field icon="person" placeholder="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} />
                  <Field icon="person" placeholder="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} />
                </div>
              )}
              
              <Field icon="mail" type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} />
              <Field icon="lock" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />

              {isLogin && (
                <div style={{ textAlign: 'right', marginBottom: 12 }}>
                  <button type="button" className="link-btn" onClick={() => setIsForgotPassword(true)} style={{ 
                    background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', 
                    fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', padding: '0 4px'
                  }}>
                    Forgot Password?
                  </button>
                </div>
              )}

              {/* Action Button */}
              <button type="button" className="action-btn" onClick={handleAuth} style={{
                width: '100%', padding: '16px', borderRadius: 16,
                background: 'white', color: cyanDark, border: 'none', 
                fontSize: 16, fontWeight: 800, cursor: 'pointer', 
                fontFamily: 'inherit', marginTop: isLogin ? 0 : 12,
                boxShadow: '0 8px 16px rgba(0,0,0,0.15)'
              }}>
                {isLogin ? 'Sign In' : 'Create Account'}
              </button>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', opacity: 0.4 }}>
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 100%)' }} />
                <span style={{ padding: '0 16px', fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>OR</span>
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%)' }} />
              </div>

              {/* Google Button */}
              <button type="button" className="google-btn" onClick={handleGoogleAuth} style={{
                width: '100%', padding: '16px', borderRadius: 16,
                background: 'rgba(255,255,255,0.03)', color: 'white', 
                border: '1.5px solid rgba(255,255,255,0.2)', 
                fontSize: 15, fontWeight: 700, cursor: 'pointer', 
                fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>
            </>
          )}
        </div>

        {/* Switch Mode */}
        <div style={{ textAlign: 'center', marginTop: 24, position: 'relative', zIndex: 10 }}>
          <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
          </span>
          <button type="button" className="link-btn" onClick={switchMode} style={{ 
            background: 'none', border: 'none', color: 'white', 
            fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
            textDecoration: 'none', padding: '0 4px'
          }}>
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </div>

        {/* Processing Overlay */}
        {isProcessing && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(8,51,68,0.85)', backdropFilter: 'blur(4px)',
            zIndex: 50, display: 'flex', flexDirection: 'column', 
            alignItems: 'center', justifyContent: 'center', borderRadius: 36
          }}>
            <span className="spinner"></span>
            <p style={{ marginTop: 20, color: 'white', fontWeight: 700, fontSize: 16, letterSpacing: 0.5 }}>
              Authenticating...
            </p>
          </div>
        )}
      </div>
      
    </div>
  );
}
