import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function ManageStaff() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('list');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Real data state
  const [staffList, setStaffList] = useState([]);
  
  // Form State
  const [newStaff, setNewStaff] = useState({ name: '', role: '', phone: '' });
  const [generatedToken, setGeneratedToken] = useState(null);

  useEffect(() => {
    if (user) {
      fetchStaff();
    }
  }, [user]);

  const fetchStaff = async () => {
    try {
      const q = query(collection(db, 'staff_tokens'), where('ownerUid', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const staffs = [];
      querySnapshot.forEach((doc) => {
        staffs.push({ id: doc.id, ...doc.data() });
      });
      setStaffList(staffs);
    } catch (err) {
      console.error("Error fetching staff:", err);
    }
  };

  const filteredStaff = staffList.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.role.toLowerCase().includes(search.toLowerCase()) ||
    s.phone.includes(search)
  );

  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      // Generate a random 6-digit token
      const token = Math.floor(100000 + Math.random() * 900000).toString();
      
      const staffData = {
        name: newStaff.name,
        role: newStaff.role,
        phone: newStaff.phone,
        token: token,
        ownerUid: user.uid,
        createdAt: new Date().toISOString()
      };

      // Save to staff_tokens collection using the generated token as Document ID
      await setDoc(doc(db, 'staff_tokens', token), staffData);
      
      setGeneratedToken(token);
      fetchStaff(); // Refresh list
    } catch (err) {
      console.error(err);
      alert("Error generating staff key: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setGeneratedToken(null);
    setNewStaff({ name: '', role: '', phone: '' });
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 32 }}>
      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => navigate('/admin-dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#0891b2' }}>
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <p style={{ fontWeight: 700, fontSize: 20, color: '#0891b2', margin: 0, flex: 1, textAlign: 'center' }}>Staff Listing</p>
        <div style={{ width: 24 }} />
      </div>

      <div style={{ padding: '16px' }}>
        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <span className="material-symbols-outlined" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#0891b2', fontSize: 20, pointerEvents: 'none' }}>search</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search Staff Name or Role" style={{ width: '100%', paddingLeft: 40, paddingRight: 16, paddingTop: 12, paddingBottom: 12, border: '1.5px solid #0891b2', borderRadius: 8, fontSize: 15, fontFamily: 'inherit', background: 'white', color: '#1e293b', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {/* Tab Pills */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { id: 'list', label: 'Staff\nList', icon: 'group' },
            { id: 'incomplete', label: 'Incomplete\nProfile', icon: 'person_off' },
            { id: 'attendance', label: 'Staff\nAttendance', icon: 'fingerprint' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'attendance') { navigate('/staff-attendance'); return; }
                setActiveTab(tab.id);
              }}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                background: activeTab === tab.id ? '#ecfeff' : 'white',
                border: activeTab === tab.id ? '1.5px solid #0891b2' : '1px solid #e2e8f0',
                borderRadius: 12, padding: '14px 8px', cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)', transition: 'all 0.2s',
              }}
            >
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ color: '#0891b2', fontSize: 22 }}>{tab.icon}</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#1e293b', textAlign: 'center', whiteSpace: 'pre-line', lineHeight: 1.3 }}>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Staff Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filteredStaff.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 48, display: 'block', marginBottom: 8 }}>search_off</span>
              No staff found. Generate a Staff Key to add staff.
            </div>
          ) : (
            filteredStaff.map(s => (
              <div 
                key={s.id} 
                onClick={() => navigate(`/staff/${s.id}`, { state: { staff: s } })}
                style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px', display: 'flex', gap: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontWeight: 700, fontSize: 18, color: '#000', margin: 0 }}>{s.name}</p>
                    <span style={{ background: '#ecfeff', color: '#0891b2', padding: '4px 8px', borderRadius: '8px', fontSize: 12, fontWeight: 'bold' }}>
                      Token: {s.token}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#475569', fontSize: 14 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#38bdf8' }}>person</span> {s.role}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#475569', fontSize: 14 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#38bdf8' }}>phone_in_talk</span> {s.phone}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Floating Add Button */}
      <button onClick={() => setShowAddModal(true)} style={{ position: 'fixed', right: 20, bottom: 24, width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,#0891b2,#0e7490)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(8,145,178,0.4)', cursor: 'pointer', zIndex: 40 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 24 }}>vpn_key</span>
      </button>

      {/* Add Staff Modal / Generate Key Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
          <div style={{ background: 'white', width: '100%', maxWidth: 480, borderRadius: '20px 20px 0 0', padding: '24px 20px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <p style={{ fontWeight: 700, fontSize: 18, color: '#0f172a', margin: 0 }}>Generate Staff Key</p>
              <button onClick={closeAddModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {generatedToken ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#dcfce7', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 32 }}>check_circle</span>
                </div>
                <h3 style={{ margin: '0 0 8px', color: '#0f172a' }}>Key Generated Successfully!</h3>
                <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>Share this 6-digit key with {newStaff.name}. They will use it to log into the Staff App.</p>
                
                <div style={{ background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: 12, padding: '24px', marginBottom: 24 }}>
                  <span style={{ fontSize: 42, fontWeight: 800, color: '#0891b2', letterSpacing: '4px' }}>{generatedToken}</span>
                </div>

                <button onClick={closeAddModal} style={{ width: '100%', padding: '16px', background: '#0891b2', color: 'white', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleAddStaff}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 6 }}>Staff Name <span style={{ color: '#e11d48' }}>*</span></label>
                  <input type="text" placeholder="Enter staff full name" required value={newStaff.name} onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })} style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 15, fontFamily: 'inherit', background: 'white', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 6 }}>Role <span style={{ color: '#e11d48' }}>*</span></label>
                  <select required value={newStaff.role} onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })} style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 15, fontFamily: 'inherit', background: 'white', outline: 'none', boxSizing: 'border-box' }}>
                    <option value="">Select a role...</option>
                    <option value="House Keeping">House Keeping</option>
                    <option value="Kitchen Staff">Kitchen Staff</option>
                    <option value="Cleaner">Cleaner</option>
                    <option value="Painter">Painter</option>
                    <option value="Laundry">Laundry</option>
                    <option value="Sales">Sales</option>
                    <option value="Carpenter">Carpenter</option>
                    <option value="Sweeper">Sweeper</option>
                  </select>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 6 }}>Phone <span style={{ color: '#e11d48' }}>*</span></label>
                  <input type="tel" placeholder="+91 XXXXXXXXXX" required value={newStaff.phone} onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })} style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 15, fontFamily: 'inherit', background: 'white', outline: 'none', boxSizing: 'border-box' }} />
                </div>

                <button type="submit" disabled={loading} style={{ width: '100%', padding: '16px', background: '#0891b2', color: 'white', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {loading ? 'Generating Key...' : 'Generate 6-Digit Key'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
