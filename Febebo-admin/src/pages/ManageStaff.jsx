import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { fetchAllAdminPgs } from '../utils/pgUtils';

const ROLE_GROUPS = [
  {
    label: 'Management',
    roles: [
      { value: 'HR',               icon: 'manage_accounts',        color: '#6366f1', bg: '#eef2ff' },
      { value: 'Manager',          icon: 'supervisor_account',     color: '#0891b2', bg: '#e0f2fe' },
      { value: 'Sales Manager',    icon: 'query_stats',            color: '#ca8a04', bg: '#fef9c3' },
      { value: 'Purchase Manager', icon: 'shopping_bag',           color: '#8b5cf6', bg: '#ede9fe' },
    ]
  },
  {
    label: 'Daily Services',
    roles: [
      { value: 'Cook',             icon: 'restaurant',             color: '#d97706', bg: '#fef3c7' },
      { value: 'Cleaner',          icon: 'mop',                    color: '#059669', bg: '#d1fae5' },
      { value: 'House Keeping',    icon: 'cleaning_services',      color: '#0284c7', bg: '#dbeafe' },
      { value: 'Laundry',          icon: 'local_laundry_service',  color: '#0891b2', bg: '#e0f2fe' },
      { value: 'Sweeper',          icon: 'cleaning',               color: '#64748b', bg: '#f1f5f9' },
      { value: 'Helper',           icon: 'volunteer_activism',     color: '#10b981', bg: '#d1fae5' },
    ]
  },
  {
    label: 'Technical',
    roles: [
      { value: 'Plumber',          icon: 'plumbing',               color: '#06b6d4', bg: '#cffafe' },
      { value: 'Electrician',      icon: 'electric_bolt',          color: '#f59e0b', bg: '#fef3c7' },
      { value: 'Carpenter',        icon: 'carpenter',              color: '#a16207', bg: '#fef3c7' },
      { value: 'Painter',          icon: 'format_paint',           color: '#7c3aed', bg: '#ede9fe' },
    ]
  },
  {
    label: 'Other',
    roles: [
      { value: 'Driver',           icon: 'directions_car',         color: '#16a34a', bg: '#dcfce7' },
      { value: 'Security Guard',   icon: 'security',               color: '#dc2626', bg: '#fee2e2' },
      { value: 'Receptionist',     icon: 'support_agent',          color: '#0891b2', bg: '#e0f2fe' },
      { value: 'Gardener',         icon: 'yard',                   color: '#65a30d', bg: '#f0fdf4' },
      { value: 'Sales',            icon: 'storefront',             color: '#ca8a04', bg: '#fef9c3' },
      { value: 'Other',            icon: 'more_horiz',             color: '#94a3b8', bg: '#f1f5f9' },
    ]
  },
];

export default function ManageStaff() {
  const navigate = useNavigate();
  const { user, activePgId } = useAuth();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('list');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Real data state
  const [staffList, setStaffList] = useState([]);
  const [pgList, setPgList] = useState([]);
  
  // Extra Property Assignment State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedStaffForAssign, setSelectedStaffForAssign] = useState(null);
  const [assignedPgsSelection, setAssignedPgsSelection] = useState([]);
  const [savingAssign, setSavingAssign] = useState(false);

  // Form State
  const [newStaff, setNewStaff] = useState({ name: '', role: '', phone: '', salary: '', payDate: '1', joinDate: new Date().toISOString().split('T')[0] });
  const [generatedToken, setGeneratedToken] = useState(null);

  useEffect(() => {
    if (user?.uid) {
      fetchStaff();
      fetchAllAdminPgs(user.uid).then(pgs => setPgList(pgs));
    }
  }, [user]);

  const fetchStaff = async () => {
    try {
      const ownerId = user.uid || user.id || 'admin';
      const q = query(collection(db, 'staff_tokens'), where('ownerUid', '==', ownerId));
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
    (s.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.role || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.phone || '').includes(search)
  );

  const handleSelectStaffForAssign = (staff) => {
    setSelectedStaffForAssign(staff);
    const existing = Array.isArray(staff.assignedPgs) && staff.assignedPgs.length > 0 
      ? staff.assignedPgs 
      : [staff.pgId || 'primary'];
    setAssignedPgsSelection(existing);
  };

  const togglePgSelection = (pgId) => {
    setAssignedPgsSelection(prev => {
      if (prev.includes(pgId)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter(id => id !== pgId);
      } else {
        return [...prev, pgId];
      }
    });
  };

  const handleSavePropertyAssignment = async () => {
    if (!selectedStaffForAssign) return;
    setSavingAssign(true);
    try {
      const selectedPgObjs = pgList.filter(p => assignedPgsSelection.includes(p.id));
      const selectedPgNames = selectedPgObjs.map(p => p.pgName || 'PG');
      const primaryPgId = assignedPgsSelection[0] || 'primary';

      const updatePayload = {
        assignedPgs: assignedPgsSelection,
        assignedPgNames: selectedPgNames,
        pgId: primaryPgId,
        pgName: selectedPgNames[0] || 'PG'
      };

      // Update in staff_tokens
      await updateDoc(doc(db, 'staff_tokens', selectedStaffForAssign.id), updatePayload);

      // Refresh list
      setStaffList(prev => prev.map(s => s.id === selectedStaffForAssign.id ? { ...s, ...updatePayload } : s));
      alert(`Updated property assignments for ${selectedStaffForAssign.name}!`);
      setShowAssignModal(false);
      setSelectedStaffForAssign(null);
    } catch (err) {
      console.error("Error saving property assignment:", err);
      alert("Failed to save property assignment: " + err.message);
    } finally {
      setSavingAssign(false);
    }
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      // Generate a random 6-digit token
      const token = Math.floor(100000 + Math.random() * 900000).toString();
      const defaultPgId = activePgId || 'primary';
      const defaultPgObj = pgList.find(p => p.id === defaultPgId) || pgList[0];
      const defaultPgName = defaultPgObj?.pgName || 'Primary PG';

      const staffData = {
        name: newStaff.name,
        role: newStaff.role,
        phone: newStaff.phone,
        salary: Number(newStaff.salary) || 0,
        payDate: Number(newStaff.payDate) || 1,
        token: token,
        ownerUid: user.uid || user.id || 'admin',
        pgId: defaultPgId,
        pgName: defaultPgName,
        assignedPgs: [defaultPgId],
        assignedPgNames: [defaultPgName],
        createdAt: new Date(newStaff.joinDate || Date.now()).toISOString()
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
    setNewStaff({ name: '', role: '', phone: '', salary: '' });
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 32 }}>
      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 , paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))'}}>
        <button onClick={() => navigate('/admin-dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#0891b2' }}>
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <p style={{ fontWeight: 700, fontSize: 20, color: '#0891b2', margin: 0, flex: 1, textAlign: 'center' }}>Staff Listing</p>
        <div style={{ width: 24 }} />
      </div>

      <div style={{ padding: '16px' }}>
        {/* Actions Bar: Search + Assign to Extra Property */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <span className="material-symbols-outlined" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#0891b2', fontSize: 20, pointerEvents: 'none' }}>search</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search Staff Name or Role" style={{ width: '100%', paddingLeft: 40, paddingRight: 16, paddingTop: 12, paddingBottom: 12, border: '1.5px solid #0891b2', borderRadius: 12, fontSize: 15, fontFamily: 'inherit', background: 'white', color: '#1e293b', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {/* Assign to Extra Property Action Banner */}
        <div style={{ marginBottom: 16 }}>
          <button 
            onClick={() => {
              setSelectedStaffForAssign(null);
              setAssignedPgsSelection([]);
              setShowAssignModal(true);
            }}
            style={{
              width: '100%', padding: '12px 16px', background: 'linear-gradient(135deg, #0891b2, #0e7490)',
              color: 'white', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 12px rgba(8,145,178,0.25)'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>domain_add</span>
            Assign Staff to Extra Property
          </button>
        </div>

        {/* Staff Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filteredStaff.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 48, display: 'block', marginBottom: 8 }}>search_off</span>
              No staff found. Generate a Staff Key to add staff.
            </div>
          ) : (
            filteredStaff.map(s => {
              const assignedCount = Array.isArray(s.assignedPgs) ? s.assignedPgs.length : 1;
              return (
                <div 
                  key={s.id} 
                  style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, padding: '16px', display: 'flex', flexDirection: 'column', gap: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Profile Picture */}
                    {s.profileData?.profilePictureUrl ? (
                      <img
                        src={s.profileData.profilePictureUrl}
                        alt={s.name}
                        onClick={() => navigate(`/staff/${s.id}`, { state: { staff: s } })}
                        style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e8f0', flexShrink: 0, cursor: 'pointer' }}
                      />
                    ) : (
                      <div
                        onClick={() => navigate(`/staff/${s.id}`, { state: { staff: s } })}
                        style={{ width: 50, height: 50, borderRadius: '50%', background: '#ecfeff', border: '2px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 26, color: '#0891b2' }}>person</span>
                      </div>
                    )}
                    <div
                      onClick={() => navigate(`/staff/${s.id}`, { state: { staff: s } })}
                      style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <p style={{ fontWeight: 800, fontSize: 17, color: '#0f172a', margin: 0 }}>{s.name}</p>
                        <span style={{ background: '#ecfeff', color: '#0891b2', padding: '3px 8px', borderRadius: '6px', fontSize: 11, fontWeight: '700', flexShrink: 0 }}>
                          Token: {s.token}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#475569', fontSize: 13, fontWeight: 600 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 17, color: '#0891b2' }}>badge</span> {s.role}
                        <span style={{ color: '#cbd5e1' }}>•</span>
                        <span className="material-symbols-outlined" style={{ fontSize: 17, color: '#0891b2' }}>phone</span>
                        <a
                          href={`tel:${s.phone}`}
                          onClick={e => e.stopPropagation()}
                          style={{ color: '#0891b2', fontWeight: 700, textDecoration: 'none', background: '#ecfeff', padding: '2px 8px', borderRadius: 12, border: '1px solid #a5f3fc' }}
                        >
                          {s.phone}
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Assigned Properties Badges & Quick Assign */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, flex: 1, minWidth: 0 }}>
                      {(Array.isArray(s.assignedPgNames) && s.assignedPgNames.length > 0) ? (
                        s.assignedPgNames.map((pgN, idx) => (
                          <span key={idx} style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>domain</span>
                            {pgN}
                          </span>
                        ))
                      ) : (
                        <span style={{ background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                          {s.pgName || 'Primary PG'}
                        </span>
                      )}
                    </div>
                    
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectStaffForAssign(s);
                        setShowAssignModal(true);
                      }}
                      style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: '4px 10px', color: '#0891b2', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>tune</span>
                      {assignedCount > 1 ? `${assignedCount} PGs` : 'Assign PGs'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Floating Add Button */}
      <button onClick={() => setShowAddModal(true)} style={{ position: 'fixed', right: 20, bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))', width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,#0891b2,#0e7490)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(8,145,178,0.4)', cursor: 'pointer', zIndex: 40 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 24 }}>vpn_key</span>
      </button>

      {/* ── ASSIGN TO EXTRA PROPERTY MODAL ── */}
      {showAssignModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 65, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(3px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowAssignModal(false); }}>
          <div style={{ background: 'white', width: '100%', maxWidth: 440, borderRadius: 20, padding: 22, maxHeight: '90vh', overflowY: 'auto', fontFamily: "'Hanken Grotesk',sans-serif", boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Assign to Extra Property</h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>Allow staff/managers to manage multiple PGs</p>
              </div>
              <button onClick={() => setShowAssignModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#64748b' }}>close</span>
              </button>
            </div>

            {/* STEP 1: SELECT STAFF (If not yet selected) */}
            {!selectedStaffForAssign ? (
              <div>
                <p style={{ fontSize: 12, fontWeight: 800, color: '#0891b2', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
                  1. Select Staff Member by Role / Department
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {ROLE_GROUPS.map(group => {
                    const groupStaff = staffList.filter(s => group.roles.some(r => r.value.toLowerCase() === (s.role || '').toLowerCase()));
                    if (groupStaff.length === 0) return null;
                    return (
                      <div key={group.label} style={{ background: '#f8fafc', borderRadius: 14, padding: 12, border: '1px solid #e2e8f0' }}>
                        <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>{group.label}</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {groupStaff.map(s => {
                            const pgsCount = Array.isArray(s.assignedPgs) ? s.assignedPgs.length : 1;
                            return (
                              <div
                                key={s.id}
                                onClick={() => handleSelectStaffForAssign(s)}
                                style={{
                                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                  padding: '10px 12px', background: 'white', borderRadius: 10,
                                  border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.15s'
                                }}
                              >
                                <div>
                                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{s.name}</p>
                                  <p style={{ margin: '1px 0 0', fontSize: 11, color: '#64748b' }}>{s.role} · Token {s.token}</p>
                                </div>
                                <span style={{ background: '#ecfeff', color: '#0891b2', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                                  {pgsCount} {pgsCount === 1 ? 'PG' : 'PGs'} →
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div>
                {/* Selected Staff Info Header */}
                <div style={{ background: '#ecfeff', border: '1px solid #a5f3fc', borderRadius: 14, padding: '12px 14px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0891b2' }}>{selectedStaffForAssign.name}</h4>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#0e7490' }}>Role: <strong>{selectedStaffForAssign.role}</strong> · Phone: {selectedStaffForAssign.phone}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedStaffForAssign(null)}
                    style={{ background: 'white', border: '1px solid #a5f3fc', borderRadius: 8, padding: '4px 8px', fontSize: 11, fontWeight: 700, color: '#0891b2', cursor: 'pointer' }}
                  >
                    Change
                  </button>
                </div>

                <p style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                  2. Select Assigned PG Properties (One or Multiple)
                </p>

                {/* PG Properties Checkboxes */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                  {pgList.map(pg => {
                    const isChecked = assignedPgsSelection.includes(pg.id);
                    return (
                      <div 
                        key={pg.id}
                        onClick={() => togglePgSelection(pg.id)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
                          border: isChecked ? '1.5px solid #0891b2' : '1px solid #e2e8f0',
                          background: isChecked ? '#ecfeff' : '#f8fafc',
                          transition: 'all 0.15s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 22, color: isChecked ? '#0891b2' : '#94a3b8' }}>domain</span>
                          <div>
                            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{pg.pgName}</p>
                            <p style={{ margin: '1px 0 0', fontSize: 11, color: '#64748b' }}>{pg.location || 'Property'}</p>
                          </div>
                        </div>

                        <div style={{ width: 22, height: 22, borderRadius: 6, border: isChecked ? 'none' : '2px solid #cbd5e1', background: isChecked ? '#0891b2' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {isChecked && <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'white' }}>check</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button 
                    type="button" 
                    onClick={() => setSelectedStaffForAssign(null)}
                    style={{ flex: 1, padding: '14px', background: '#f1f5f9', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, color: '#475569', cursor: 'pointer' }}
                  >
                    Back
                  </button>
                  <button 
                    type="button" 
                    onClick={handleSavePropertyAssignment}
                    disabled={savingAssign || assignedPgsSelection.length === 0}
                    style={{ flex: 2, padding: '14px', background: 'linear-gradient(135deg, #0891b2, #0e7490)', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 800, color: 'white', cursor: 'pointer', boxShadow: '0 4px 12px rgba(8,145,178,0.3)', opacity: savingAssign ? 0.7 : 1 }}
                  >
                    {savingAssign ? 'Saving...' : `Save (${assignedPgsSelection.length} Selected)`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 10 }}>Role <span style={{ color: '#e11d48' }}>*</span></label>
                  {!newStaff.role && <p style={{ fontSize: 12, color: '#e11d48', marginTop: -6, marginBottom: 8 }}>Please select a role</p>}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {ROLE_GROUPS.map(group => (
                      <div key={group.label}>
                        <p style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, margin: '0 0 8px' }}>{group.label}</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                          {group.roles.map(r => {
                            const active = newStaff.role === r.value;
                            return (
                              <div
                                key={r.value}
                                onClick={() => setNewStaff({ ...newStaff, role: r.value })}
                                style={{
                                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                                  justifyContent: 'center', gap: 6,
                                  padding: '12px 4px', borderRadius: 14, cursor: 'pointer',
                                  border: active ? `2px solid ${r.color}` : '2px solid #e2e8f0',
                                  background: active ? r.bg : '#f8fafc',
                                  transition: 'all 0.18s ease',
                                  boxShadow: active ? `0 4px 12px ${r.color}30` : 'none',
                                }}
                              >
                                <div style={{
                                  width: 36, height: 36, borderRadius: 10,
                                  background: active ? r.color : '#e2e8f0',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  transition: 'background 0.18s'
                                }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: active ? 'white' : '#94a3b8' }}>{r.icon}</span>
                                </div>
                                <span style={{
                                  fontSize: 10, fontWeight: active ? 700 : 500, textAlign: 'center',
                                  color: active ? r.color : '#64748b', lineHeight: 1.2
                                }}>{r.value}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>


                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 6 }}>Phone <span style={{ color: '#e11d48' }}>*</span></label>
                  <input type="tel" placeholder="+91 XXXXXXXXXX" required value={newStaff.phone} onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })} style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 15, fontFamily: 'inherit', background: 'white', outline: 'none', boxSizing: 'border-box' }} />
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 6 }}>Monthly Base Salary (₹) <span style={{ color: '#e11d48' }}>*</span></label>
                  <input type="number" placeholder="e.g. 15000" required value={newStaff.salary} onChange={(e) => setNewStaff({ ...newStaff, salary: e.target.value })} style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 15, fontFamily: 'inherit', background: 'white', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 6 }}>Join Date <span style={{ color: '#e11d48' }}>*</span></label>
                  <input type="date" required value={newStaff.joinDate} onChange={(e) => setNewStaff({ ...newStaff, joinDate: e.target.value })} style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 15, fontFamily: 'inherit', background: 'white', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 6 }}>Pay Date (1-31) <span style={{ color: '#e11d48' }}>*</span></label>
                  <input type="number" min="1" max="31" placeholder="e.g. 1" required value={newStaff.payDate} onChange={(e) => setNewStaff({ ...newStaff, payDate: e.target.value })} style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 15, fontFamily: 'inherit', background: 'white', outline: 'none', boxSizing: 'border-box' }} />
                </div>

                <button type="submit" disabled={loading || !newStaff.role} style={{ width: '100%', padding: '16px', background: !newStaff.role ? '#94a3b8' : '#0891b2', color: 'white', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: !newStaff.role ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
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
