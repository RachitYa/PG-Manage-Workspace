import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, Users, ChevronRight } from 'lucide-react';

export default function RoleSelection() {
  const { setRole, user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(null);

  const handleRoleSelect = async (role) => {
    setLoading(role);
    await setRole(role);
    if (role === 'admin') {
      navigate('/create-pg-profile');
    } else {
      navigate('/staff-pin');
    }
    setLoading(null);
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

      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18, overflow: 'hidden',
            margin: '0 auto 16px',
            boxShadow: '0 8px 24px rgba(56,189,248,0.25)',
            border: '2px solid rgba(56,189,248,0.25)',
          }}>
            <img src="/Admin-app-logo.png" alt="Febebo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <h1 style={{ color: '#38bdf8', fontSize: 26, fontWeight: 800, margin: '0 0 8px' }}>
            Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! 👋
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: 0 }}>
            How would you like to use Febebo?
          </p>
        </div>

        {/* Role Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Owner Card */}
          <button onClick={() => handleRoleSelect('admin')} disabled={!!loading} style={{
            width: '100%',
            padding: '20px 20px',
            borderRadius: 18,
            border: '1px solid rgba(56,189,248,0.25)',
            background: 'rgba(56,189,248,0.08)',
            cursor: loading ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 16,
            transition: 'all 0.2s',
            textAlign: 'left',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, flexShrink: 0,
              background: 'linear-gradient(135deg, #0891b2, #38bdf8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(8,145,178,0.4)',
            }}>
              <Building2 size={26} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700, color: 'white' }}>PG Owner</h3>
              <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
                Manage your PG, tenants, rooms & staff
              </p>
            </div>
            <ChevronRight size={20} color="rgba(255,255,255,0.3)" />
          </button>

          {/* Staff Card */}
          <button onClick={() => handleRoleSelect('staff')} disabled={!!loading} style={{
            width: '100%',
            padding: '20px 20px',
            borderRadius: 18,
            border: '1px solid rgba(74,153,140,0.3)',
            background: 'rgba(74,153,140,0.1)',
            cursor: loading ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 16,
            transition: 'all 0.2s',
            textAlign: 'left',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, flexShrink: 0,
              background: 'linear-gradient(135deg, #4a998c, #10b981)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(74,153,140,0.4)',
            }}>
              <Users size={26} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700, color: 'white' }}>Staff Member</h3>
              <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
                Access daily tasks, attendance & duties
              </p>
            </div>
            <ChevronRight size={20} color="rgba(255,255,255,0.3)" />
          </button>

        </div>

        {/* Logout link */}
        <p style={{ textAlign: 'center', marginTop: 28, color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
          Wrong account?{' '}
          <span onClick={logout} style={{ color: '#f87171', fontWeight: 600, cursor: 'pointer' }}>
            Sign out
          </span>
        </p>

      </div>
    </div>
  );
}
