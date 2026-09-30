import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const MOCK_COMPLAINTS = [
  { id: 1, tenant: 'Rahul Rastogi', room: '103', phone: '+91 9876543210', title: 'Washing Machine Not Working', desc: 'The washing machine on 2nd floor has been broken for 3 days. Very inconvenient.', date: '28 Jun 2025', status: 'Active', priority: 'High', assignedTo: '' },
  { id: 2, tenant: 'Amit Sachdeva', room: '205', phone: '+91 9988776655', title: 'Water Leakage in Bathroom', desc: 'There is a water leakage near the sink in the attached bathroom. The floor is always wet.', date: '26 Jun 2025', status: 'Pending', priority: 'Medium', assignedTo: '' },
  { id: 3, tenant: 'Ravi Kumar', room: '102', phone: '+91 9111223344', title: 'WiFi Not Working', desc: 'Internet has been down since yesterday evening. Need it for work from home.', date: '24 Jun 2025', status: 'Closed', priority: 'Low', assignedTo: 'Suresh (Tech)' },
  { id: 4, tenant: 'Sneha Kapoor', room: '108', phone: '+91 9444556677', title: 'Room Heater Not Functional', desc: 'Room heater stopped working. Nights are very cold.', date: '27 Jun 2025', status: 'Active', priority: 'High', assignedTo: 'Raj Electricals' },
  { id: 5, tenant: 'Priya Sharma', room: '202', phone: '+91 9666778899', title: 'Cockroach Problem in Kitchen', desc: 'Cockroaches seen in the kitchen area near sink. Need pest control immediately.', date: '25 Jun 2025', status: 'Pending', priority: 'High', assignedTo: '' },
];

const STAFF_OPTIONS = ['Unassigned', 'Suresh Kumar (Electrician)', 'Dinesh Patel (Plumber)', 'Mohan Das (Cleaner)', 'Raj Electricals', 'Balram Singh (Carpenter)'];

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

export default function Complain() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState(MOCK_COMPLAINTS);
  const [activeTab, setActiveTab] = useState('All');
  const [expanded, setExpanded] = useState(null);

  const TABS = ['All', 'Active', 'Pending', 'Closed'];
  const filtered = activeTab === 'All' ? complaints : complaints.filter(c => c.status === activeTab);

  const counts = {
    All: complaints.length,
    Active: complaints.filter(c => c.status === 'Active').length,
    Pending: complaints.filter(c => c.status === 'Pending').length,
    Closed: complaints.filter(c => c.status === 'Closed').length,
  };

  const advanceStatus = (id, e) => {
    e.stopPropagation();
    setComplaints(prev => prev.map(c => c.id === id ? { ...c, status: STATUS_FLOW[c.status] } : c));
  };

  const assignStaff = (id, staff) => {
    setComplaints(prev => prev.map(c => c.id === id ? { ...c, assignedTo: staff === 'Unassigned' ? '' : staff } : c));
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk', sans-serif", paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0c1a2e, #1a0a2e)', padding: '0 16px 0' }}>
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
            <span style={{ fontSize: 13, fontWeight: 800, color: '#f87171' }}>{counts.Active}</span>
          </div>
        </div>

        {/* Summary Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, padding: '0 0 16px' }}>
          {TABS.map(tab => {
            const sc = tab === 'All' ? null : STATUS_CONFIG[tab];
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
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 56, color: '#e2e8f0' }}>check_circle</span>
            <p style={{ color: '#94a3b8', fontSize: 15, fontWeight: 600, marginTop: 12 }}>No {activeTab.toLowerCase()} complaints!</p>
          </div>
        )}

        {filtered.map((comp, idx) => {
          const sc = STATUS_CONFIG[comp.status];
          const pc = PRIORITY_CONFIG[comp.priority];
          const isExpanded = expanded === comp.id;
          const initColor = INITIALS_COLORS[comp.id % INITIALS_COLORS.length];
          const initials = comp.tenant.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

          return (
            <div key={comp.id} style={{ marginBottom: 14, borderRadius: 18, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: `1px solid ${sc.border}`, background: 'white' }}>
              {/* Card Top */}
              <div onClick={() => setExpanded(isExpanded ? null : comp.id)}
                style={{ padding: '14px 16px', cursor: 'pointer', borderLeft: `4px solid ${sc.text}` }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  {/* Avatar */}
                  <div style={{ width: 42, height: 42, borderRadius: '50%', background: initColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: 'white', flexShrink: 0 }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
                      <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: '#0f172a', lineHeight: 1.3 }}>{comp.title}</p>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 6, background: pc.bg, color: pc.color, display: 'flex', alignItems: 'center', gap: 2 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 11 }}>{PRIORITY_ICON[comp.priority]}</span>
                          {comp.priority}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>{comp.tenant}</span>
                      <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#cbd5e1', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: '#64748b' }}>Room {comp.room}</span>
                      <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#cbd5e1', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>{comp.date}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Bar */}
              <div style={{ background: sc.bg, padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${sc.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14, color: sc.text }}>{sc.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: sc.text }}>{comp.status}</span>
                  {comp.assignedTo && <span style={{ fontSize: 11, color: '#94a3b8' }}>· {comp.assignedTo}</span>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <a href={`tel:${comp.phone}`} onClick={e => e.stopPropagation()}
                    style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: '#ecfdf5', color: '#059669', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3, border: '1px solid #a7f3d0' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 12 }}>call</span>
                    Call
                  </a>
                  <button onClick={e => advanceStatus(comp.id, e)}
                    style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: sc.text, color: 'white', border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 12 }}>arrow_forward</span>
                    {STATUS_FLOW[comp.status]}
                  </button>
                </div>
              </div>

              {/* Expanded Section */}
              {isExpanded && (
                <div style={{ padding: '14px 16px', borderTop: '1px solid #f1f5f9', background: '#fafafa' }}>
                  <p style={{ fontSize: 14, color: '#334155', lineHeight: 1.6, margin: '0 0 14px' }}>{comp.desc}</p>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 8px' }}>Assign To Staff</p>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {STAFF_OPTIONS.map(s => (
                        <button key={s} onClick={() => assignStaff(comp.id, s)}
                          style={{ fontSize: 11, fontWeight: 700, padding: '5px 10px', borderRadius: 8, border: '1px solid', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                            background: comp.assignedTo === s || (s === 'Unassigned' && !comp.assignedTo) ? '#0891b2' : 'white',
                            color: comp.assignedTo === s || (s === 'Unassigned' && !comp.assignedTo) ? 'white' : '#475569',
                            borderColor: comp.assignedTo === s || (s === 'Unassigned' && !comp.assignedTo) ? '#0891b2' : '#e2e8f0',
                          }}>
                          {s}
                        </button>
                      ))}
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
