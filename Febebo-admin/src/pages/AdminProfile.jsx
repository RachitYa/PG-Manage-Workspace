import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { getAuth, updatePassword, reauthenticateWithCredential, EmailAuthProvider, sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../firebase';

const cyan = '#0891b2';
const dark = '#0f172a';

// Stats will be managed by state

const QUICK_LINKS = [
  { icon: 'manage_accounts', label: 'Edit Profile',       action: 'edit' },
  { icon: 'lock',            label: 'Change Password',    action: 'password' },
  { icon: 'bar_chart',       label: 'Reports & Analytics',action: 'reports' },
  { icon: 'workspace_premium',label: 'Subscription Plan', action: 'sub' },
  { icon: 'help',            label: 'Help & Support',     action: 'help' },
];

export default function AdminProfile() {
  const navigate = useNavigate();
  const { user, logout, activePgId } = useAuth();

  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Password Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  const [profile, setProfile] = useState({
    name: user?.name || 'Admin User',
    phone: '',
    email: user?.email || '',
    dob: '',
    pgName: 'Loading...',
    pgAddress: 'Loading...',
    joined: 'Recently',
    profileImage: null,
    images: [],
  });
  const [draft, setDraft] = useState(profile);
  const [currentSlide, setCurrentSlide] = useState(0);

  React.useEffect(() => {
    if (profile.images?.length > 1) {
      const interval = setInterval(() => setCurrentSlide(s => (s + 1) % profile.images.length), 3000);
      return () => clearInterval(interval);
    }
  }, [profile.images]);
  
  const [stats, setStats] = useState([
    { label: 'Total Tenants', value: '...', icon: 'groups',        color: '#f59e0b', bg: '#fffbeb' },
    { label: 'Staff Count',   value: '...', icon: 'badge',         color: '#e11d48', bg: '#fff1f2' },
    { label: 'Total Rooms',   value: '...', icon: 'meeting_room',  color: '#0891b2', bg: '#ecfeff' },
    { label: 'Monthly Rev.',  value: '...', icon: 'payments',      color: '#059669', bg: '#ecfdf5' },
  ]);

  React.useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.uid) return;
      try {
        const docRef = activePgId === 'primary' ? doc(db, 'pg_owners', user.uid) : doc(db, 'pg_owners', activePgId);
        const docSnap = await getDoc(docRef);
        
        let rooms = '0';
        if (docSnap.exists()) {
          const data = docSnap.data();
          rooms = data.propertyDetails?.totalRooms?.toString() || '0';
          const loadedProfile = {
            name: data.adminName || user.name || 'Admin User',
            phone: data.phone || '',
            email: data.email || user?.email || '',
            dob: data.dob || '',
            pgName: data.pgName || 'Unnamed PG',
            pgAddress: data.location?.address || data.location?.city || '',
            profileImage: data.profileImage || null,
            images: data.images || [],
            joined: data.createdAt ? new Date(data.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Recently',
          };
          setProfile(loadedProfile);
          setDraft(loadedProfile);
        }

        // Fetch Stats
        const [qTenants, qStaff, qReceipts] = await Promise.all([
          getDocs(query(collection(db, 'tenants'), where('adminId', '==', user.uid), where('pgId', '==', activePgId), where('status', '==', 'Approved'))),
          getDocs(query(collection(db, 'staff'), where('adminId', '==', user.uid), where('pgId', '==', activePgId))),
          getDocs(query(collection(db, 'rent_receipts'), where('adminId', '==', user.uid), where('pgId', '==', activePgId), where('status', '==', 'Paid')))
        ]);

        let revenue = 0;
        qReceipts.forEach(d => revenue += Number(d.data().totalAmount) || 0);
        let revDisplay = revenue >= 100000 ? `₹${(revenue/100000).toFixed(1)}L` : `₹${revenue.toLocaleString()}`;

        setStats([
          { label: 'Total Tenants', value: qTenants.size.toString(), icon: 'groups', color: '#f59e0b', bg: '#fffbeb' },
          { label: 'Staff Count', value: qStaff.size.toString(), icon: 'badge', color: '#e11d48', bg: '#fff1f2' },
          { label: 'Total Rooms', value: rooms, icon: 'meeting_room', color: '#0891b2', bg: '#ecfeff' },
          { label: 'Monthly Rev.', value: revDisplay, icon: 'payments', color: '#059669', bg: '#ecfdf5' },
        ]);
        
      } catch (err) {
        console.error("Failed to fetch profile", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    try {
      setEditing(false);
      if (user?.uid) {
        const docRef = activePgId === 'primary' ? doc(db, 'pg_owners', user.uid) : doc(db, 'pg_owners', activePgId);
        await updateDoc(docRef, {
          adminName: draft.name,
          phone: draft.phone,
          dob: draft.dob,
          pgName: draft.pgName,
          'location.address': draft.pgAddress
        });
      }
      setProfile(draft);
    } catch(err) {
      console.error(err);
      alert("Failed to save changes: " + err.message);
      setEditing(true);
    }
  };

  const handleQuickLink = (action) => {
    if (action === 'edit') { setEditing(true); return; }
    if (action === 'password') {
      setPwError('');
      setPwSuccess('');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordModal(true);
      return;
    }
    if (action === 'reports') { navigate('/reports'); return; }
    if (action === 'sub') { navigate('/subscription'); return; }
    if (action === 'help') { navigate('/help'); return; }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');

    if (!currentPassword) {
      return setPwError("Please enter your current password.");
    }
    if (!newPassword || newPassword.length < 6) {
      return setPwError("New password must be at least 6 characters long.");
    }
    if (newPassword !== confirmPassword) {
      return setPwError("New password and confirm password do not match.");
    }

    setPwLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.email) {
        throw new Error("No active authenticated user found. Please re-login.");
      }

      // Re-authenticate user first
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);

      // Update password
      await updatePassword(currentUser, newPassword);

      setPwSuccess("Password successfully updated! Use your new password on your next login.");
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowPasswordModal(false);
        setPwSuccess('');
      }, 2500);
    } catch (err) {
      console.error("Password update error:", err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setPwError("Current password is incorrect.");
      } else if (err.code === 'auth/requires-recent-login') {
        setPwError("For security, please log out and log back in before changing password.");
      } else {
        setPwError(err.message || "Failed to update password. Please try again.");
      }
    } finally {
      setPwLoading(false);
    }
  };

  const handleSendResetEmail = async () => {
    setPwError('');
    setPwSuccess('');
    const emailToSend = profile.email || auth.currentUser?.email || user?.email;
    if (!emailToSend) {
      return setPwError("No email address found to send reset link.");
    }
    setPwLoading(true);
    try {
      await sendPasswordResetEmail(auth, emailToSend);
      setPwSuccess(`Password reset link has been sent to ${emailToSend}. Please check your inbox/spam folder.`);
    } catch (err) {
      console.error("Reset email error:", err);
      setPwError(err.message || "Failed to send password reset email.");
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk', sans-serif", paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ background: profile.images?.length > 0 
          ? `linear-gradient(rgba(12, 26, 46, 0.7), rgba(12, 52, 97, 0.9)), url(${profile.images[currentSlide]}) center/cover`
          : 'linear-gradient(160deg, #0c1a2e 0%, #0f2847 60%, #0c3461 100%)', 
        padding: '0 20px 32px', paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))', 
        transition: 'background 1s ease-in-out', position: 'relative', overflow: 'hidden' }}>
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
          <div style={{ width: 90, height: 90, borderRadius: '50%', background: 'linear-gradient(135deg, #0891b2, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, fontWeight: 800, color: 'white', border: '4px solid rgba(255,255,255,0.15)', marginBottom: 12, overflow: 'hidden' }}>
            {profile.profileImage ? (
              <img src={profile.profileImage} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              profile.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
            )}
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
        {stats.map((s, i) => (
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
              { label: 'Date of Birth', key: 'dob', type: 'date' },
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
            {loading ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Loading profile...</div>
            ) : (
              [
                { icon: 'person', label: 'Full Name', value: profile.name },
                { icon: 'call', label: 'Phone', value: profile.phone || 'Not set' },
                { icon: 'cake', label: 'Date of Birth', value: profile.dob ? new Date(profile.dob).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Not set' },
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
              ))
            )}
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

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(6px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#ffffff', width: '100%', maxWidth: 420, borderRadius: 24, padding: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.2)', position: 'relative', animation: 'fadeIn 0.2s ease-out' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ color: cyan, fontSize: 22 }}>lock</span>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: dark, fontFamily: "'Bricolage Grotesque', sans-serif" }}>Change Password</h3>
                  <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Update credentials for {profile.email}</p>
                </div>
              </div>
              <button
                onClick={() => { setShowPasswordModal(false); setPwError(''); setPwSuccess(''); }}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>

            {/* Error & Success Alerts */}
            {pwError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-symbols-outlined" style={{ color: '#ef4444', fontSize: 18 }}>error</span>
                <span style={{ fontSize: 12.5, color: '#b91c1c', fontWeight: 600 }}>{pwError}</span>
              </div>
            )}

            {pwSuccess && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-symbols-outlined" style={{ color: '#16a34a', fontSize: 18 }}>check_circle</span>
                <span style={{ fontSize: 12.5, color: '#15803d', fontWeight: 600 }}>{pwSuccess}</span>
              </div>
            )}

            {/* Password Form */}
            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              
              {/* Current Password */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>
                  Current Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    required
                    style={{ width: '100%', padding: '11px 40px 11px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none', background: '#f8fafc', color: dark, boxSizing: 'border-box' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{showCurrentPw ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>
                  New Password (Min 6 Characters) *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    style={{ width: '100%', padding: '11px 40px 11px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none', background: '#f8fafc', color: dark, boxSizing: 'border-box' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{showNewPw ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>
                  Confirm New Password *
                </label>
                <input
                  type={showNewPw ? 'text' : 'password'}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none', background: '#f8fafc', color: dark, boxSizing: 'border-box' }}
                />
              </div>

              {/* Action Buttons */}
              <button
                type="submit"
                disabled={pwLoading}
                style={{
                  width: '100%',
                  padding: '13px 0',
                  background: 'linear-gradient(135deg, #0891b2, #0e7490)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  fontWeight: 800,
                  fontSize: 15,
                  cursor: pwLoading ? 'not-allowed' : 'pointer',
                  opacity: pwLoading ? 0.7 : 1,
                  fontFamily: 'inherit',
                  marginTop: 6,
                  boxShadow: '0 4px 12px rgba(8, 145, 178, 0.25)'
                }}
              >
                {pwLoading ? 'Updating Password...' : 'Update Password'}
              </button>

              <div style={{ textAlign: 'center', marginTop: 8 }}>
                <p style={{ margin: '0 0 6px', fontSize: 12, color: '#94a3b8' }}>Forgot your current password?</p>
                <button
                  type="button"
                  onClick={handleSendResetEmail}
                  disabled={pwLoading}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: cyan,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: pwLoading ? 'not-allowed' : 'pointer',
                    textDecoration: 'underline',
                    padding: '4px 8px'
                  }}
                >
                  ✉️ Send Reset Link to My Email
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

