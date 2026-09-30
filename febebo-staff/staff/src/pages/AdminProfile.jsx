import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const cyan = '#0891b2';
const dark = '#0f172a';

const STATS = [
  { label: 'Total Tenants', value: '118', icon: 'groups',        color: '#f59e0b', bg: '#fffbeb' },
  { label: 'Staff Count',   value: '10',  icon: 'badge',         color: '#e11d48', bg: '#fff1f2' },
  { label: 'Total Rooms',   value: '128', icon: 'meeting_room',  color: '#0891b2', bg: '#ecfeff' },
  { label: 'Monthly Rev.',  value: '₹4.2L', icon: 'payments',   color: '#059669', bg: '#ecfdf5' },
];

const QUICK_LINKS = [
  { icon: 'manage_accounts', label: 'Edit Profile',       action: 'edit' },
  { icon: 'lock',            label: 'Change Password',    action: 'password' },
  { icon: 'notifications',   label: 'Notifications',      action: 'notif' },
  { icon: 'bar_chart',       label: 'Reports & Analytics',action: 'reports' },
  { icon: 'workspace_premium',label: 'Subscription Plan', action: 'sub' },
  { icon: 'help',            label: 'Help & Support',     action: 'help' },
];

export default function AdminProfile() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: 'Pawan Sharma',
    phone: '+91 9876543210',
    email: 'pawan@febebo.com',
    pgName: 'Sunshine PG',
    pgAddress: 'Sector 18, Noida, UP',
    joined: 'January 2023',
  });
  const [draft, setDraft] = useState(profile);

  const handleSave = () => {
    setProfile(draft);
    setEditing(false);
  };

  const handleQuickLink = (action) => {
    if (action === 'edit') { setEditing(true); return; }
    if (action === 'reports') { navigate('/reports'); return; }
    if (action === 'sub') { navigate('/subscription'); return; }
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk', sans-serif", paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(160deg, #0c1a2e 0%, #0f2847 60%, #0c3461 100%)', padding: '0 20px 32px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(56,189,248,0.1)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, height: 64 }}>
          <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back_ios_new</span>
          </button>
          <h1 style={{ flex: 1, margin: 0, fontSize: 20, fontWeight: 800, color: 'white' }}>My Profile</h1>
          <button onClick={() => setEditing(!editing)} style={{ background: editing ? '#0891b2' : 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'white', fontWeight: 700, fontSize: 13, fontFamily: 'inherit' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{editing ? 'close' : 'edit'}</span>
            {editing ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {/* Avatar & Name */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 8 }}>
          <div style={{ width: 90, height: 90, borderRadius: '50%', background: 'linear-gradient(135deg, #0891b2, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, fontWeight: 800, color: 'white', border: '4px solid rgba(255,255,255,0.15)', marginBottom: 12 }}>
            {profile.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
          </div>
          <p style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: 'white', fontFamily: "'Bricolage Grotesque',sans-serif" }}>{profile.name}</p>
          <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>{profile.pgName} · Admin</p>
          <div style={{ marginTop: 10, background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: 20, padding: '4px 14px' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8' }}>✓ Verified Admin</span>
          </div>
        </div>
      </div>

      {/* Stats Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, background: 'white', borderBottom: '1px solid #e2e8f0', margin: '0' }}>
        {STATS.map((s, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 6px', borderRight: i < 3 ? '1px solid #f1f5f9' : 'none' }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 17, color: s.color }}>{s.icon}</span>
            </div>
            <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 16, fontWeight: 800, color: dark, margin: '0 0 2px' }}>{s.value}</p>
            <p style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600, margin: 0, textAlign: 'center', lineHeight: 1.2 }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div style={{ padding: 16 }}>

        {/* Edit Form */}
        {editing && (
          <div style={{ background: 'white', borderRadius: 20, border: '1px solid #bfdbfe', padding: 20, marginBottom: 16, boxShadow: '0 4px 20px rgba(8,145,178,0.1)' }}>
            <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 16, fontWeight: 800, color: dark, margin: '0 0 16px' }}>Edit Profile</p>
            {[
              { label: 'Full Name', key: 'name', type: 'text' },
              { label: 'Phone Number', key: 'phone', type: 'tel' },
              { label: 'Email', key: 'email', type: 'email' },
              { label: 'PG Name', key: 'pgName', type: 'text' },
              { label: 'PG Address', key: 'pgAddress', type: 'text' },
            ].map(field => (
              <div key={field.key} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>{field.label}</label>
                <input
                  type={field.type}
                  value={draft[field.key]}
                  onChange={e => setDraft(prev => ({ ...prev, [field.key]: e.target.value }))}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#f8fafc', color: dark, boxSizing: 'border-box' }}
                />
              </div>
            ))}
            <button onClick={handleSave} style={{ width: '100%', padding: '13px 0', background: 'linear-gradient(135deg,#0891b2,#0e7490)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', marginTop: 4 }}>
              Save Changes
            </button>
          </div>
        )}

        {/* Info Card */}
        {!editing && (
          <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e2e8f0', marginBottom: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ padding: '14px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 14, fontWeight: 800, color: '#64748b', margin: 0, textTransform: 'uppercase', letterSpacing: 0.5 }}>Personal Info</p>
            </div>
            {[
              { icon: 'person', label: 'Full Name', value: profile.name },
              { icon: 'call', label: 'Phone', value: profile.phone },
              { icon: 'mail', label: 'Email', value: profile.email },
              { icon: 'home_work', label: 'PG Name', value: profile.pgName },
              { icon: 'location_on', label: 'Address', value: profile.pgAddress },
              { icon: 'calendar_today', label: 'Admin Since', value: profile.joined },
            ].map((row, i, arr) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderBottom: i < arr.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 17, color: cyan }}>{row.icon}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 0.3 }}>{row.label}</p>
                  <p style={{ fontSize: 14, color: dark, fontWeight: 700, margin: 0 }}>{row.value}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Links */}
        <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e2e8f0', marginBottom: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '14px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 14, fontWeight: 800, color: '#64748b', margin: 0, textTransform: 'uppercase', letterSpacing: 0.5 }}>Quick Links</p>
          </div>
          {QUICK_LINKS.map((link, i) => (
            <div key={i} onClick={() => handleQuickLink(link.action)}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderBottom: i < QUICK_LINKS.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer' }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 17, color: '#475569' }}>{link.icon}</span>
              </div>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: dark }}>{link.label}</span>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#cbd5e1' }}>chevron_right</span>
            </div>
          ))}
        </div>

        {/* App Info */}
        <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e2e8f0', marginBottom: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          {[
            { label: 'App Version', value: 'Febebo v1.4.0' },
            { label: 'Build', value: 'Production' },
            { label: 'Platform', value: 'Android (Capacitor)' },
          ].map((row, i, arr) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 18px', borderBottom: i < arr.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>{row.label}</span>
              <span style={{ fontSize: 13, color: dark, fontWeight: 700 }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* Logout */}
        <button onClick={logout} style={{ width: '100%', padding: '15px 0', background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3', borderRadius: 16, fontWeight: 800, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>logout</span>
          Sign Out
        </button>
      </div>
    </div>
  );
}
