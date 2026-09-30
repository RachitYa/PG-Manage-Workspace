import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const cyan = '#0891b2';

const Field = ({ icon, placeholder, type = 'text', value, onChange, disabled, maxLength }) => (
  <div style={{ position: 'relative', marginBottom: 16 }}>
    <span className="material-symbols-outlined" style={{
      position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
      color: cyan, fontSize: 20, pointerEvents: 'none'
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
        border: `1.5px solid ${disabled ? '#e2e8f0' : cyan}`,
        borderRadius: 12, fontSize: 15, fontFamily: "'Hanken Grotesk',sans-serif",
        background: disabled ? '#f8fafc' : 'white', color: '#1e293b',
        outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s'
      }}
    />
  </div>
);

const STAFF_ROLES = [
  { id: 'Cook', label: '👨‍🍳 Cook / Kitchen Staff', icon: 'restaurant', color: '#8b5cf6' },
  { id: 'Cleaner', label: '🧹 Cleaner / Housekeeping', icon: 'mop', color: '#06b6d4' },
  { id: 'Maintenance', label: '🛠️ Maintenance / Technician', icon: 'build', color: '#ef4444' },
  { id: 'Purchase Manager', label: '🛒 Purchase / Store Manager', icon: 'shopping_bag', color: '#64748b' },
  { id: 'Security Guard', label: '🛡️ Security / Gate Guard', icon: 'security', color: '#059669' },
];

export default function Login() {
  const [staffUsername, setStaffUsername] = useState('ramesh_cook');
  const [staffPasskey, setStaffPasskey] = useState('123456');
  const [selectedRole, setSelectedRole] = useState('Cook');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleStaffLoginSubmit = (e) => {
    e.preventDefault();
    if (!staffUsername.trim() || !staffPasskey.trim()) {
      alert('Please enter your Staff Username & Passkey');
      return;
    }

    const nameMap = {
      'Cook': 'Ramesh Yadav',
      'Cleaner': 'Lakshmi B.',
      'Maintenance': 'Dinesh Patel',
      'Purchase Manager': 'Vikram Sharma',
      'Security Guard': 'Bahadur Singh'
    };

    login(staffUsername, 'staff', {
      staffRole: selectedRole,
      name: nameMap[selectedRole] || staffUsername
    });
    navigate('/staff-app');
  };

  const handleQuickStaffLogin = (role, name, username) => {
    setSelectedRole(role);
    setStaffUsername(username);
    setStaffPasskey('123456');
    login(username, 'staff', {
      staffRole: role,
      name: name
    });
    navigate('/staff-app');
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(160deg, #ecfeff 0%, #f0f9ff 40%, #e0f2fe 100%)',
      fontFamily: "'Hanken Grotesk',sans-serif", padding: '0 0 40px'
    }}>
      {/* Top branding */}
      <div style={{ textAlign: 'center', padding: '40px 24px 20px' }}>
        <div style={{
          width: 68, height: 68, borderRadius: 20,
          background: 'linear-gradient(135deg, #0891b2, #0e7490)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px', boxShadow: '0 12px 32px rgba(8,145,178,0.3)'
        }}>
          <span className="material-symbols-outlined" style={{ color: 'white', fontSize: 36 }}>badge</span>
        </div>
        <h1 style={{
          fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800,
          fontSize: 30, color: cyan, margin: '0 0 4px', letterSpacing: -1
        }}>febebo staff</h1>
        <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>
          Staff Work & Operation Portal
        </p>
      </div>

      {/* Main Container Card */}
      <div style={{
        margin: '0 20px', background: 'white',
        borderRadius: 24, padding: '24px 20px',
        boxShadow: '0 8px 40px rgba(8,145,178,0.1)',
        border: '1px solid rgba(8,145,178,0.1)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#ecfeff', borderRadius: 12, padding: '12px 14px', marginBottom: 18, border: '1px solid #a5f3fc' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#0891b2,#0e7490)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ color: 'white', fontSize: 20 }}>passkey</span>
            </div>
            <div>
              <p style={{ fontWeight: 800, fontSize: 14, color: '#0f172a', margin: 0 }}>Staff App Portal</p>
              <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Log in with Passkey & Role</p>
            </div>
          </div>

          <form onSubmit={handleStaffLoginSubmit}>
            {/* Role Selection Dropdown */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase' }}>Select Your Staff Role</label>
              <div style={{ position: 'relative' }}>
                <span className="material-symbols-outlined" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: cyan, fontSize: 20, pointerEvents: 'none' }}>work</span>
                <select
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value)}
                  style={{
                    width: '100%', padding: '14px 14px 14px 44px',
                    border: `1.5px solid ${cyan}`, borderRadius: 12, fontSize: 15,
                    fontFamily: "'Hanken Grotesk',sans-serif", background: 'white',
                    color: '#1e293b', outline: 'none', boxSizing: 'border-box', fontWeight: 600
                  }}>
                  {STAFF_ROLES.map(r => (
                    <option key={r.id} value={r.id}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Username Field */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase' }}>Staff Username or ID</label>
              <Field
                icon="person"
                placeholder="e.g. ramesh_cook or phone number"
                value={staffUsername}
                onChange={e => setStaffUsername(e.target.value)}
              />
            </div>

            {/* Passkey Field */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase' }}>Staff Passkey / PIN</label>
              <Field
                icon="key"
                type="password"
                placeholder="Enter 6-digit staff passkey"
                value={staffPasskey}
                onChange={e => setStaffPasskey(e.target.value)}
              />
            </div>

            <button type="submit" style={{
              width: '100%', padding: '16px', borderRadius: 14,
              background: 'linear-gradient(135deg, #0891b2, #0e7490)',
              color: 'white', border: 'none', fontSize: 16, fontWeight: 800,
              cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 8px 20px rgba(8,145,178,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>login</span>
              Sign In to Staff App
            </button>
          </form>

          {/* Quick Demo Staff Login presets */}
          <div style={{ marginTop: 22, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 10px', textAlign: 'center' }}>
              ⚡ Quick Demo Login As (1-Click)
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button type="button" onClick={() => handleQuickStaffLogin('Cook', 'Ramesh Yadav', 'ramesh_cook')} style={{ background: '#f3e8ff', border: '1px solid #c084fc', borderRadius: 10, padding: '8px 10px', fontSize: 12, fontWeight: 800, color: '#7e22ce', cursor: 'pointer', textAlign: 'left' }}>
                👨‍🍳 Cook (Ramesh)
              </button>
              <button type="button" onClick={() => handleQuickStaffLogin('Cleaner', 'Lakshmi B.', 'lakshmi_clean')} style={{ background: '#ecfeff', border: '1px solid #67e8f9', borderRadius: 10, padding: '8px 10px', fontSize: 12, fontWeight: 800, color: '#0e7490', cursor: 'pointer', textAlign: 'left' }}>
                🧹 Cleaner (Lakshmi)
              </button>
              <button type="button" onClick={() => handleQuickStaffLogin('Maintenance', 'Dinesh Patel', 'dinesh_tech')} style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '8px 10px', fontSize: 12, fontWeight: 800, color: '#b91c1c', cursor: 'pointer', textAlign: 'left' }}>
                🛠️ Maintenance (Dinesh)
              </button>
              <button type="button" onClick={() => handleQuickStaffLogin('Purchase Manager', 'Vikram Sharma', 'vikram_store')} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 10, padding: '8px 10px', fontSize: 12, fontWeight: 800, color: '#334155', cursor: 'pointer', textAlign: 'left' }}>
                🛒 Store (Vikram)
              </button>
              <button type="button" onClick={() => handleQuickStaffLogin('Security Guard', 'Bahadur Singh', 'bahadur_sec')} style={{ gridColumn: 'span 2', background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 10, padding: '8px 10px', fontSize: 12, fontWeight: 800, color: '#047857', cursor: 'pointer', textAlign: 'center' }}>
                🛡️ Security Guard (Bahadur Singh)
              </button>
            </div>
          </div>
        </div>
      </div>

      <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 24, padding: '0 24px' }}>
        Demo Passkey for Staff: <strong style={{ color: cyan }}>123456</strong>
      </p>
    </div>
  );
}
