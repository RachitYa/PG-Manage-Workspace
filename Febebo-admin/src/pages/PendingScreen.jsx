import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PendingScreen() {
  const { user, logout, activePgId } = useAuth();
  const navigate = useNavigate();

  // Automatically redirect if the superadmin approves them while they are waiting on this screen
  useEffect(() => {
    if (user?.isApproved) {
      navigate('/admin-dashboard', { replace: true });
    }
  }, [user?.isApproved, navigate]);

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      background: '#f1f5f9',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Hanken Grotesk', sans-serif",
      paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))', padding: '24px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '24px',
        padding: '40px 32px',
        maxWidth: '400px',
        width: '100%',
        boxShadow: '0 12px 40px rgba(0,0,0,0.06)',
        textAlign: 'center'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'rgba(8,145,178,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px'
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '40px', color: '#0891b2' }}>
            pending_actions
          </span>
        </div>

        <h1 style={{
          fontSize: '24px',
          fontWeight: 800,
          color: '#0f172a',
          margin: '0 0 16px',
          letterSpacing: '-0.5px'
        }}>
          Approval Pending
        </h1>

        <p style={{
          fontSize: '15px',
          color: '#64748b',
          lineHeight: '1.6',
          margin: '0 0 32px',
          fontWeight: 500
        }}>
          Your PG is under request and we will notify you once your PG gets approved.
        </p>

        <button 
          onClick={logout}
          style={{
            background: 'transparent',
            border: '1.5px solid #e2e8f0',
            color: '#64748b',
            padding: '12px 24px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s',
            width: '100%'
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          Logout
        </button>
      </div>
    </div>
  );
}
