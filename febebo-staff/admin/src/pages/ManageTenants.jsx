import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DetailedReceiptModal, { CollectPaymentModal } from '../components/DetailedReceiptModal';

const BASE = { backgroundColor: '#f8fafc', minHeight: '100vh', position: 'relative', paddingBottom: 80, fontFamily: "'Hanken Grotesk', sans-serif" };
const cyan = '#0ea5e9';

// ─── MOCK DATA ──────────────────────────────────────────────
const MOCK_USERS = [
  { id: 1, name: 'Rajeev Kumar', studentId: '#1234567', phone: '+91 9234567681', date: '25 Feb 2025', image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop', type: 'Upcoming User', room: 15, bed: 3 },
  { id: 2, name: 'Ravi Kumar', studentId: '#1234567', phone: '+91 9234567681', date: '25 Feb 2025', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop', type: 'Current User', room: 12, bed: 1 },
  { id: 3, name: 'Ravi Kumar', studentId: '#1234567', phone: '+91 9234567681', date: '25 Feb 2025', image: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&h=150&fit=crop', type: 'On Notice Period', room: 10, bed: 2 },
  { id: 4, name: 'Ravi Kumar', studentId: '#1234567', phone: '+91 9234567681', date: '25 Feb 2025', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop', type: 'Upcoming User', room: 14, bed: 1 },
];

const AMENITIES_DATA = [
  { id: 'ac', label: 'AC', icon: '❄️' },
  { id: 'fridge', label: 'Fridge', icon: '🧊' },
  { id: 'washing-machine', label: 'Washing Machine', icon: '🧺' },
  { id: 'study-table', label: 'Study Table', icon: '🪚' },
  { id: 'cooler', label: 'Cooler', icon: '🌬️' },
  { id: 'geyser', label: 'Geyser', icon: '♨️' },
];

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

  const goBack = () => {
    navigate('/admin-dashboard');
  };

  const openDetails = (u) => {
    navigate(`/user/${u.id}`, { state: { user: u } });
  };

  return (
    <div style={BASE}>
      <UserListView onBack={goBack} onAdd={() => navigate('/add-tenant')} onSelect={openDetails} />
    </div>
  );
}

// ─── VIEW 1: USER LIST ────────────────────────────────────
function UserListView({ onBack, onAdd, onSelect }) {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('Upcoming User');
  const [activeReceipt, setActiveReceipt] = useState(null);
  const [collectModalData, setCollectModalData] = useState(null);

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
            <div key={u.id} onClick={() => onSelect(u)} style={{ background: 'white', borderRadius: 14, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, border: '1px solid #f1f5f9', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1 }}>
                <img src={u.image} alt={u.name} style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover' }} />
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3 }}>
                  <p style={{ fontWeight: 800, fontSize: 15, color: '#0f172a', margin: 0 }}>{u.name}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14, color: cyan }}>badge</span>
                    <span style={{ fontSize: 12, color: '#64748b' }}>{u.studentId} · Room {u.room}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14, color: cyan }}>call</span>
                    <a href={`tel:${u.phone}`} style={{ fontSize: 12, color: '#64748b', textDecoration: 'none' }}>{u.phone}</a>
                  </div>
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

      {activeReceipt && (
        <DetailedReceiptModal receipt={activeReceipt} onClose={() => setActiveReceipt(null)} />
      )}

      {collectModalData && (
        <CollectPaymentModal
          dueData={collectModalData}
          onClose={() => setCollectModalData(null)}
          onConfirm={(newReceipt) => {
            setCollectModalData(null);
            setActiveReceipt(newReceipt);
          }}
        />
      )}
    </>
  );
}

// ─── VIEW 2: ADD USER ─────────────────────────────────────
function AddUserView({ onBack }) {
  const [userType, setUserType] = useState('upcoming'); // upcoming | current
  const [career, setCareer] = useState('student'); // student | working
  const [payment, setPayment] = useState('cash'); // cash | online
  const [paymentType, setPaymentType] = useState('token'); // token | full
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [parentsAlive, setParentsAlive] = useState(true);
  const [paymentReceiver, setPaymentReceiver] = useState('admin'); // admin | manager | other
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [customAmenities, setCustomAmenities] = useState([]);
  const [lockInPeriod, setLockInPeriod] = useState('6 Months');
  const fileInputRef = useRef(null);

  const Label = ({ children, req }) => <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>{children} {req && <span style={{ color: '#ef4444' }}>*</span>}</label>;
  const Input = ({ placeholder, type = 'text', value, onChange }) => <input type={type} placeholder={placeholder} value={value} onChange={onChange} style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: `1px solid ${cyan}`, fontSize: 14, marginBottom: 16, outline: 'none' }} />;

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleAddCustomAmenity = () => {
    const name = window.prompt('Enter custom amenity name:');
    if (name && name.trim()) {
      const id = 'custom-' + name.trim().toLowerCase().replace(/\s+/g, '-');
      setCustomAmenities(prev => [...prev, { id, label: name.trim(), icon: '✨' }]);
      setSelectedAmenities(prev => [...prev, id]);
    }
  };

  const toggleAmenity = (id) => {
    setSelectedAmenities(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const allAmenities = [...AMENITIES_DATA, ...customAmenities];
  
  const todayObj = new Date();
  const today = todayObj.toISOString().split('T')[0];
  const dayAfterTomorrowObj = new Date(todayObj);
  dayAfterTomorrowObj.setDate(dayAfterTomorrowObj.getDate() + 2);
  const dayAfterTomorrow = dayAfterTomorrowObj.toISOString().split('T')[0];
  
  const showFullAmount = userType === 'current' || joiningDate <= dayAfterTomorrow;

  return (
    <>
      <Header title="Add User" onBack={onBack} />
      <div style={{ padding: '20px 16px' }}>
        
        <Label req>User Type</Label>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <button onClick={() => setUserType('upcoming')} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${cyan}`, background: userType === 'upcoming' ? 'rgba(14,165,233,0.1)' : 'white', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', border: `4px solid ${userType === 'upcoming' ? cyan : '#e2e8f0'}`, background: 'white' }} />
            <span style={{ fontSize: 14, color: '#334155' }}>Upcoming User</span>
          </button>
          <button onClick={() => setUserType('current')} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${cyan}`, background: userType === 'current' ? 'rgba(14,165,233,0.1)' : 'white', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', border: `4px solid ${userType === 'current' ? cyan : '#e2e8f0'}`, background: 'white' }} />
            <span style={{ fontSize: 14, color: '#334155' }}>Current User</span>
          </button>
        </div>

        {userType === 'upcoming' && (
          <>
            <Label req>Lock-in Period</Label>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16 }}>
              {['1 Month', '3 Months', '6 Months', '12 Months'].map(period => (
                <button key={period} onClick={() => setLockInPeriod(period)} style={{ padding: '8px 16px', borderRadius: 20, border: `1px solid ${cyan}`, background: lockInPeriod === period ? cyan : 'white', color: lockInPeriod === period ? 'white' : cyan, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {period}
                </button>
              ))}
            </div>
          </>
        )}

        <Label req>Joining Date</Label>
        <Input type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} />

        <Label req>Name</Label><Input placeholder="Enter User Name" />
        <Label req>Mobile Number</Label><Input placeholder="Enter Mobile Number" type="tel" />
        <Label req>Email Id</Label><Input placeholder="Enter Email Id" type="email" />

        <Label req>Upload User Image</Label>
        <div onClick={handleUploadClick} style={{ border: `1.5px dashed ${cyan}`, borderRadius: 12, padding: '24px 16px', textAlign: 'center', background: 'white', marginBottom: 16, cursor: 'pointer' }}>
          <input type="file" ref={fileInputRef} style={{ display: 'none' }} />
          <span style={{ fontSize: 13, color: '#94a3b8' }}>Tap here to upload image</span>
          <span className="material-symbols-outlined" style={{ display: 'block', marginTop: 8, color: '#94a3b8' }}>cloud_upload</span>
        </div>

        <Label req>Parents Alive?</Label>
        <select value={parentsAlive ? 'yes' : 'no'} onChange={e => setParentsAlive(e.target.value === 'yes')} style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: `1px solid ${cyan}`, fontSize: 14, marginBottom: 16, outline: 'none', background: 'white' }}>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>

        {parentsAlive ? (
          <>
            <Label req>Father Name</Label><Input placeholder="Enter Father Name" />
            <Label req>Father Mobile Number</Label><Input placeholder="Enter Mobile Number" type="tel" />
          </>
        ) : (
          <>
            <Label req>Guardian/Relative Name</Label><Input placeholder="Enter Guardian Name" />
            <Label req>Guardian Mobile Number</Label><Input placeholder="Enter Mobile Number" type="tel" />
            <Label req>Relation</Label><Input placeholder="e.g. Uncle, Brother" />
          </>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><Label req>Bed Number</Label><Input placeholder="Enter Bed Number" /></div>
          <div><Label req>Room Number</Label><Input placeholder="Enter Room Number" /></div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <Label req>Amenities</Label>
          <span onClick={handleAddCustomAmenity} style={{ fontSize: '0.875rem', color: cyan, cursor: 'pointer', fontWeight: 600 }}>+ Add Custom</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: 16 }}>
          {allAmenities.map(amenity => {
            const isSelected = selectedAmenities.includes(amenity.id);
            return (
              <div 
                key={amenity.id} onClick={() => toggleAmenity(amenity.id)}
                style={{ border: `1px solid ${isSelected ? cyan : '#e2e8f0'}`, borderRadius: 8, padding: '10px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backgroundColor: isSelected ? 'rgba(14, 165, 233, 0.05)' : 'white', position: 'relative' }}
              >
                {isSelected && (
                  <div style={{ position: 'absolute', top: '-6px', right: '-6px', backgroundColor: cyan, color: 'white', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 12 }}>check</span>
                  </div>
                )}
                <span style={{ fontSize: '1.4rem', marginBottom: '4px' }}>{amenity.icon}</span>
                <span style={{ fontSize: '0.65rem', textAlign: 'center', fontWeight: '600', color: isSelected ? cyan : '#64748b' }}>{amenity.label}</span>
              </div>
            );
          })}
        </div>

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

        {showFullAmount ? (
          <>
            <Label req>Full Amount Paid</Label><Input placeholder="Enter Full Amount" type="number" />
          </>
        ) : (
          <>
            <Label req>Payment Type</Label>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <button onClick={() => setPaymentType('token')} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${cyan}`, background: paymentType === 'token' ? 'rgba(14,165,233,0.1)' : 'white', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', border: `4px solid ${paymentType === 'token' ? cyan : '#e2e8f0'}`, background: 'white' }} />
                <span style={{ fontSize: 14, color: '#334155' }}>Token Amount</span>
              </button>
              <button onClick={() => setPaymentType('full')} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${cyan}`, background: paymentType === 'full' ? 'rgba(14,165,233,0.1)' : 'white', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', border: `4px solid ${paymentType === 'full' ? cyan : '#e2e8f0'}`, background: 'white' }} />
                <span style={{ fontSize: 14, color: '#334155' }}>Full Amount</span>
              </button>
            </div>
            
            {paymentType === 'token' ? (
              <>
                <Label req>Token Amount</Label><Input placeholder="Enter Token Amount" type="number" />
                <Label req>Pending Amount</Label><Input placeholder="Enter Pending Amount" type="number" />
              </>
            ) : (
              <>
                <Label req>Full Amount Paid</Label><Input placeholder="Enter Full Amount" type="number" />
              </>
            )}
          </>
        )}

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

        <Label req>Payment Handled By</Label>
        <select value={paymentReceiver} onChange={e => setPaymentReceiver(e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: `1px solid ${cyan}`, fontSize: 14, marginBottom: 16, outline: 'none', background: 'white' }}>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="other">Other</option>
        </select>
        
        {paymentReceiver === 'other' && (
          <>
            <Label req>Receiver Name</Label><Input placeholder="Enter Name of Receiver" />
          </>
        )}

        {payment === 'online' && (
          <>
            <Label req>Sender Phone / UPI ID</Label><Input placeholder="e.g. 9876543210 or user@upi" />
            <Label req>Receiver Phone / UPI ID</Label><Input placeholder="e.g. 9876543210 or pg@upi" />
          </>
        )}

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
