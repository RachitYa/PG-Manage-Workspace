import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const STATUS_FLOW = { Active: 'Pending', Pending: 'Closed', Closed: 'Active' };

const STATUS_CONFIG = {
  Active:  { bg: '#fff1f2', text: '#e11d48', border: '#fecaca', icon: 'error',    badgeBg: '#e11d48' },
  Pending: { bg: '#fffbeb', text: '#d97706', border: '#fde68a', icon: 'schedule', badgeBg: '#d97706' },
  Closed:  { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0', icon: 'task_alt', badgeBg: '#059669' },
};

const PRIORITY_CONFIG = {
  High:   { color: '#e11d48', bg: '#fff1f2' },
  Medium: { color: '#d97706', bg: '#fffbeb' },
  Low:    { color: '#059669', bg: '#ecfdf5' },
};

const PRIORITY_ICON = { High: 'priority_high', Medium: 'remove', Low: 'south' };
const INITIALS_COLORS = ['#6366f1','#f43f5e','#0891b2','#10b981','#f59e0b','#8b5cf6'];
const TABS = ['Open', 'Active', 'Pending', 'Closed'];

export default function Complain() {
  const navigate = useNavigate();
  const { user, activePgId } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Open');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!user?.uid) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [compSnap, staffSnap, tenantsSnap] = await Promise.all([
        getDocs(query(collection(db, 'complaints'), where('adminId', '==', user.uid), where('pgId', '==', activePgId))),
        getDocs(query(collection(db, 'staff'), where('adminId', '==', user.uid), where('pgId', '==', activePgId))),
        getDocs(query(collection(db, 'tenants'), where('adminId', '==', user.uid), where('pgId', '==', activePgId)))
      ]);
      
      const tenantsData = {};
      tenantsSnap.docs.forEach(d => { tenantsData[d.id] = d.data(); });

      setComplaints(compSnap.docs.map(d => {
        const c = d.data();
        const t = tenantsData[c.tenantId];
        return { 
          id: d.id, 
          ...c,
          tenantName: t?.name || c.tenantName || 'Unknown',
          room: t?.room || t?.roomNo || c.room || 'Unassigned',
          phone: t?.phone || c.phone || ''
        };
      }));
      const names = staffSnap.docs.map(d => d.data().name || d.data().staffName || '').filter(Boolean);
      setStaffList(['Unassigned', ...names]);
    } catch (err) {
      console.error('Error fetching complaints/staff:', err);
    } finally {
      setLoading(false);
    }
  };

  const advanceStatus = async (id, currentStatus, e) => {
    e.stopPropagation();
    const nextStatus = STATUS_FLOW[currentStatus];
    try {
      await updateDoc(doc(db, 'complaints', id), { status: nextStatus });
      setComplaints(prev => prev.map(c => c.id === id ? { ...c, status: nextStatus } : c));
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const assignStaff = async (id, staff) => {
    const assignedTo = staff === 'Unassigned' ? '' : staff;
    try {
      await updateDoc(doc(db, 'complaints', id), { assignedTo });
      setComplaints(prev => prev.map(c => c.id === id ? { ...c, assignedTo } : c));
    } catch (err) {
      console.error('Error assigning staff:', err);
    }
  };

  const getField = (comp, ...keys) => {
    for (const k of keys) { if (comp[k] !== undefined && comp[k] !== null) return comp[k]; }
    return '';
  };

  const filtered = activeTab === 'Open' ? complaints.filter(c => c.status !== 'Closed') : complaints.filter(c => c.status === activeTab);

  const counts = {
    Open: complaints.filter(c => c.status !== 'Closed').length,
    Active: complaints.filter(c => c.status === 'Active').length,
    Pending: complaints.filter(c => c.status === 'Pending').length,
    Closed: complaints.filter(c => c.status === 'Closed').length,
  };

  const staffOptions = staffList.length > 1 ? staffList : ['Unassigned'];

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk', sans-serif", paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0c1a2e, #1a0a2e)', paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))', padding: '0 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, height: 64 }}>
          <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back_ios_new</span>
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'white' }}>Complaints</h1>
            <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>{counts.Active} active · {counts.Pending} pending</p>
          </div>
          <div style={{ background: 'rgba(225,29,72,0.2)', border: '1px solid rgba(225,29,72,0.4)', borderRadius: 10, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#f87171' }}>error</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#f87171' }}>{counts.Active + counts.Pending}</span>
          </div>
        </div>

        {/* Stats / Tab Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, padding: '0 0 16px' }}>
          {TABS.map(tab => {
            const sc = tab === 'Open' ? null : STATUS_CONFIG[tab];
            return (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{ background: activeTab === tab ? (sc ? sc.badgeBg : '#0891b2') : 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 12, padding: '10px 6px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}>
                <p style={{ margin: '0 0 2px', fontSize: 20, fontWeight: 900, color: 'white', lineHeight: 1 }}>{counts[tab]}</p>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: activeTab === tab ? 'rgba(255,255,255,0.9)' : '#64748b' }}>{tab}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#94a3b8', display: 'block', marginBottom: 12 }}>sync</span>
            <p style={{ color: '#94a3b8', fontSize: 14, fontWeight: 600 }}>Loading complaints...</p>
          </div>
        )}

        {/* Empty */}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 56, color: '#e2e8f0' }}>check_circle</span>
            <p style={{ color: '#94a3b8', fontSize: 15, fontWeight: 600, marginTop: 12 }}>No {activeTab.toLowerCase()} complaints!</p>
          </div>
        )}

        {/* Cards */}
        {!loading && filtered.map((comp, idx) => {
          const sc = STATUS_CONFIG[comp.status] || STATUS_CONFIG['Pending'];
          const priority = comp.priority || 'Medium';
          const pc = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG['Medium'];
          const isExpanded = expanded === comp.id;
          const initColor = INITIALS_COLORS[idx % INITIALS_COLORS.length];
          const tenantName = getField(comp, 'tenantName', 'tenant') || 'Unknown';
          const initials = tenantName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
          const description = getField(comp, 'description', 'desc');
          const phone = getField(comp, 'phone');
          const dateStr = getField(comp, 'date');
          const assignedTo = getField(comp, 'assignedTo');

          return (
            <div key={comp.id} style={{ marginBottom: 14, borderRadius: 18, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: `1px solid ${sc.border}`, background: 'white' }}>

              {/* Card Top */}
              <div onClick={() => setExpanded(isExpanded ? null : comp.id)}
                style={{ padding: '14px 16px', cursor: 'pointer', borderLeft: `4px solid ${sc.text}` }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 42, height: 42, borderRadius: '50%', background: initColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: 'white', flexShrink: 0 }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
                      <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: '#0f172a', lineHeight: 1.3 }}>{comp.title || 'No Title'}</p>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 6, background: pc.bg, color: pc.color, display: 'flex', alignItems: 'center', gap: 2 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 11 }}>{PRIORITY_ICON[priority] || 'remove'}</span>
                          {priority}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>{tenantName}</span>
                      <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#cbd5e1', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: '#64748b' }}>Room {comp.room}</span>
                      <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#cbd5e1', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>{dateStr}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Bar */}
              <div style={{ background: sc.bg, padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${sc.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14, color: sc.text }}>{sc.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: sc.text }}>{comp.status}</span>
                  {assignedTo && <span style={{ fontSize: 11, color: '#94a3b8' }}>· {assignedTo}</span>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {phone && (
                    <a href={`tel:${phone}`} onClick={e => e.stopPropagation()}
                      style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: '#ecfdf5', color: '#059669', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3, border: '1px solid #a7f3d0' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 12 }}>call</span>
                      Call
                    </a>
                  )}
                  <button onClick={e => advanceStatus(comp.id, comp.status, e)}
                    style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: sc.text, color: 'white', border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 12 }}>arrow_forward</span>
                    {STATUS_FLOW[comp.status]}
                  </button>
                </div>
              </div>

              {/* Expanded Section */}
              {isExpanded && (
                <div style={{ padding: '14px 16px', borderTop: '1px solid #f1f5f9', background: '#fafafa' }}>
                  
                  {/* Tenant Details Inline */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px', padding: '10px', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div><span style={{fontSize: 10, color: '#94a3b8', display: 'block', textTransform: 'uppercase', fontWeight: 700}}>Student Name</span><span style={{fontSize: 13, color: '#1e293b', fontWeight: 600}}>{tenantName}</span></div>
                    <div><span style={{fontSize: 10, color: '#94a3b8', display: 'block', textTransform: 'uppercase', fontWeight: 700}}>Room Number</span><span style={{fontSize: 13, color: '#1e293b', fontWeight: 600}}>{comp.room || 'Unassigned'}</span></div>
                    <div style={{ gridColumn: '1 / -1' }}><span style={{fontSize: 10, color: '#94a3b8', display: 'block', textTransform: 'uppercase', fontWeight: 700}}>Phone Number</span><span style={{fontSize: 13, color: '#1e293b', fontWeight: 600}}>{phone || 'Not Provided'}</span></div>
                  </div>

                  {description ? (
                    <p style={{ fontSize: 14, color: '#334155', lineHeight: 1.6, margin: '0 0 14px' }}>{description}</p>
                  ) : (
                    <p style={{ fontSize: 14, color: '#94a3b8', fontStyle: 'italic', margin: '0 0 14px' }}>No description provided.</p>
                  )}
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 8px' }}>Assign To Staff</p>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {staffOptions.map(s => {
                        const isSelected = assignedTo === s || (s === 'Unassigned' && !assignedTo);
                        return (
                          <button key={s} onClick={() => assignStaff(comp.id, s)}
                            style={{ fontSize: 11, fontWeight: 700, padding: '5px 10px', borderRadius: 8, border: '1px solid', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                              background: isSelected ? '#0891b2' : 'white',
                              color: isSelected ? 'white' : '#475569',
                              borderColor: isSelected ? '#0891b2' : '#e2e8f0',
                            }}>
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
