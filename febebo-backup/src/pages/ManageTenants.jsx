import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const BASE = { backgroundColor: '#f8fafc', minHeight: '100vh', position: 'relative', paddingBottom: 80, fontFamily: "'Hanken Grotesk', sans-serif" };
const cyan = '#0ea5e9';

// ─── MOCK DATA ──────────────────────────────────────────────
const MOCK_USERS = [
  { id: 1, name: 'Rajeev Kumar', studentId: '#1234567', phone: '+91 9234567681', date: '25 Feb 2025', image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop', type: 'Upcoming User', room: 15, bed: 3 },
  { id: 2, name: 'Ravi Kumar', studentId: '#1234567', phone: '+91 9234567681', date: '25 Feb 2025', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop', type: 'Current User', room: 12, bed: 1 },
  { id: 3, name: 'Ravi Kumar', studentId: '#1234567', phone: '+91 9234567681', date: '25 Feb 2025', image: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&h=150&fit=crop', type: 'On Notice Period', room: 10, bed: 2 },
  { id: 4, name: 'Ravi Kumar', studentId: '#1234567', phone: '+91 9234567681', date: '25 Feb 2025', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop', type: 'Upcoming User', room: 14, bed: 1 },
];

const AMENITIES = ['AC', 'Fridge', 'Washing Machine', 'Study Table', 'Cooler', 'Geyser'];

// ─── REUSABLE HEADER ──────────────────────────────────────
function Header({ title, onBack, action, center = true, dark = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', background: dark ? cyan : 'white', borderBottom: dark ? 'none' : '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 50 }}>
      <button onClick={onBack} style={{ position: 'relative', zIndex: 10, background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', color: dark ? 'white' : cyan }}>
        <span className="material-symbols-outlined" style={{ fontSize: 24, fontWeight: 300 }}>arrow_back_ios_new</span>
      </button>
      <h1 style={{ flex: 1, textAlign: center ? 'center' : 'left', margin: center ? '0 0 0 -24px' : '0 0 0 16px', fontSize: 18, fontWeight: 700, color: dark ? 'white' : cyan }}>{title}</h1>
      {action && <div style={{ position: 'relative', zIndex: 10 }}>{action}</div>}
    </div>
  );
}

// ─── MAIN COMPONENT: MANAGE TENANTS ───────────────────────
export default function ManageTenants() {
  const navigate = useNavigate();
  // Navigation State: 'list' | 'add'
  const [view, setView] = useState('list');

  const goBack = () => {
    if (view === 'list') navigate('/admin-dashboard');
    else if (view === 'add') setView('list');
  };

  const openDetails = (u) => {
    navigate(`/user/${u.id}`, { state: { user: u } });
  };

  return (
    <div style={BASE}>
      {view === 'list' && <UserListView onBack={goBack} onAdd={() => setView('add')} onSelect={openDetails} />}
      {view === 'add' && <AddUserView onBack={goBack} />}
    </div>
  );
}

// ─── VIEW 1: USER LIST ────────────────────────────────────
function UserListView({ onBack, onAdd, onSelect }) {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('Upcoming User');

  const TABS = [
    { id: 'Upcoming User', label: 'Upcoming\nUser', icon: 'person_add' },
    { id: 'Current User', label: 'Current\nUser', icon: 'person' },
    { id: 'On Notice Period', label: 'On Notice\nPeriod', icon: 'person_remove' },
  ];

  return (
    <>
      <Header title="User" onBack={onBack} />
      <div style={{ padding: 16 }}>
        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <span className="material-symbols-outlined" style={{ position: 'absolute', left: 14, top: 12, color: cyan, fontSize: 20 }}>search</span>
          <input type="text" placeholder="Search Product" value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '12px 12px 12px 42px', borderRadius: 8, border: `1px solid ${cyan}`, fontSize: 14, outline: 'none' }} />
        </div>

        {/* Tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 8px', borderRadius: 12, border: tab === t.id ? `1.5px solid ${cyan}` : '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(14,165,233,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ color: cyan, fontSize: 22 }}>{t.icon}</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#334155', whiteSpace: 'pre-line', textAlign: 'center', lineHeight: 1.2 }}>{t.label}</span>
            </button>
          ))}
        </div>

        {/* List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {MOCK_USERS.filter(u => u.type === tab && u.name.toLowerCase().includes(search.toLowerCase())).map(u => (
            <div key={u.id} onClick={() => onSelect(u)} style={{ background: 'white', borderRadius: 12, padding: 12, display: 'flex', gap: 12, border: '1px solid #f1f5f9', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <img src={u.image} alt={u.name} style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover' }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
                <p style={{ fontWeight: 600, fontSize: 14, color: '#0f172a', margin: 0 }}>{u.name}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14, color: cyan }}>badge</span>
                  <span style={{ fontSize: 12, color: '#64748b' }}>{u.studentId}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14, color: cyan }}>call</span>
                  <span style={{ fontSize: 12, color: '#64748b' }}>{u.phone}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14, color: cyan }}>calendar_month</span>
                  <span style={{ fontSize: 12, color: '#64748b' }}>{u.date}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* FAB */}
        <button onClick={onAdd} style={{ position: 'fixed', bottom: 24, right: 24, width: 56, height: 56, borderRadius: '50%', background: cyan, color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(14,165,233,0.4)', cursor: 'pointer', zIndex: 10 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 28 }}>add</span>
        </button>
      </div>
    </>
  );
}

// ─── VIEW 2: ADD USER ─────────────────────────────────────
function AddUserView({ onBack }) {
  const [career, setCareer] = useState('student'); // student | working
  const [payment, setPayment] = useState('cash'); // cash | online
  const fileInputRef = useRef(null);

  const Label = ({ children, req }) => <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>{children} {req && <span style={{ color: '#ef4444' }}>*</span>}</label>;
  const Input = ({ placeholder, type = 'text' }) => <input type={type} placeholder={placeholder} style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: `1px solid ${cyan}`, fontSize: 14, marginBottom: 16, outline: 'none' }} />;

  const handleUploadClick = () => fileInputRef.current?.click();

  return (
    <>
      <Header title="Add User" onBack={onBack} />
      <div style={{ padding: '20px 16px' }}>
        <Label req>Name</Label><Input placeholder="Enter User Name" />
        <Label req>Mobile Number</Label><Input placeholder="Enter Mobile Number" type="tel" />
        <Label req>Email Id</Label><Input placeholder="Enter Email Id" type="email" />

        <Label req>Upload User Image</Label>
        <div onClick={handleUploadClick} style={{ border: `1.5px dashed ${cyan}`, borderRadius: 12, padding: '24px 16px', textAlign: 'center', background: 'white', marginBottom: 16, cursor: 'pointer' }}>
          <input type="file" ref={fileInputRef} style={{ display: 'none' }} />
          <span style={{ fontSize: 13, color: '#94a3b8' }}>Tap here to upload image</span>
          <span className="material-symbols-outlined" style={{ display: 'block', marginTop: 8, color: '#94a3b8' }}>cloud_upload</span>
        </div>

        <Label req>Father Name</Label><Input placeholder="Enter Father Name" />
        <Label req>Father Mobile Number</Label><Input placeholder="Enter Mobile Number" type="tel" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><Label req>Bed Number</Label><Input placeholder="Enter Bed Number" /></div>
          <div><Label req>Room Number</Label><Input placeholder="Enter Room Number" /></div>
        </div>

        <Label req>Amenities</Label>
        <select style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: `1px solid ${cyan}`, fontSize: 14, marginBottom: 16, outline: 'none', background: 'white', color: '#94a3b8' }}>
          <option>Select Amenities</option>
          {AMENITIES.map(a => <option key={a}>{a}</option>)}
        </select>

        <Label req>Career Status</Label>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <button onClick={() => setCareer('student')} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${cyan}`, background: career === 'student' ? 'rgba(14,165,233,0.1)' : 'white', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', border: `4px solid ${career === 'student' ? cyan : '#e2e8f0'}`, background: 'white' }} />
            <span style={{ fontSize: 14, color: '#334155' }}>Student</span>
          </button>
          <button onClick={() => setCareer('working')} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${cyan}`, background: career === 'working' ? 'rgba(14,165,233,0.1)' : 'white', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', border: `4px solid ${career === 'working' ? cyan : '#e2e8f0'}`, background: 'white' }} />
            <span style={{ fontSize: 14, color: '#334155' }}>Working</span>
          </button>
        </div>

        {career === 'working' ? (
          <>
            <Label req>Company Name</Label><Input placeholder="Enter Company Name" />
            <Label req>Company Address</Label><Input placeholder="Enter Company Address" />
          </>
        ) : (
          <>
            <Label req>College Name</Label><Input placeholder="Enter College Name" />
            <Label req>College Address</Label><Input placeholder="Enter College Address" />
          </>
        )}

        <Label req>Upload ID Card Image</Label>
        <div onClick={handleUploadClick} style={{ border: `1.5px dashed ${cyan}`, borderRadius: 12, padding: '24px 16px', textAlign: 'center', background: 'white', marginBottom: 16, cursor: 'pointer' }}>
          <span style={{ fontSize: 13, color: '#94a3b8' }}>Tap here to upload Front & Back File</span>
          <span className="material-symbols-outlined" style={{ display: 'block', marginTop: 8, color: '#94a3b8' }}>cloud_upload</span>
        </div>

        <Label req>Token Amount</Label><Input placeholder="Enter Token Amount" type="number" />
        <Label req>Pending Amount</Label><Input placeholder="Enter Pending Amount" type="number" />

        <Label req>Payment Mode</Label>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <button onClick={() => setPayment('cash')} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${cyan}`, background: payment === 'cash' ? 'rgba(14,165,233,0.1)' : 'white', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', border: `4px solid ${payment === 'cash' ? cyan : '#e2e8f0'}`, background: 'white' }} />
            <span style={{ fontSize: 14, color: '#334155' }}>CASH</span>
          </button>
          <button onClick={() => setPayment('online')} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${cyan}`, background: payment === 'online' ? 'rgba(14,165,233,0.1)' : 'white', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', border: `4px solid ${payment === 'online' ? cyan : '#e2e8f0'}`, background: 'white' }} />
            <span style={{ fontSize: 14, color: '#334155' }}>ONLINE</span>
          </button>
        </div>

        <Label req>Meter Unit</Label><Input placeholder="1000 Unit" />
        
        <Label req>Complete Address</Label>
        <Input placeholder="Enter City Name" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input placeholder="Street No." />
          <Input placeholder="Pincode" />
        </div>
        <Input placeholder="Full Address" />

        <button onClick={onBack} style={{ width: '100%', padding: '16px', borderRadius: 8, background: cyan, color: 'white', fontWeight: 700, fontSize: 15, border: 'none', marginTop: 10, cursor: 'pointer' }}>
          Save & Next
        </button>
      </div>
    </>
  );
}
