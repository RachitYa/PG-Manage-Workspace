import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const MOCK_APPROVALS = [
  { id: 1, tenant: 'Ramesh Patel', currentRoom: '104', requestedRoom: '201', reason: 'Need a quieter room for studying', date: '18 Jul 2026', status: 'pending', img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face' },
  { id: 2, tenant: 'Suresh Kumar', currentRoom: '302', requestedRoom: '102', reason: 'Difficulty climbing stairs due to injury', date: '17 Jul 2026', status: 'pending', img: null },
  { id: 3, tenant: 'Anjali Sharma', currentRoom: '205', requestedRoom: '206', reason: 'Want to move in with a friend', date: '15 Jul 2026', status: 'approved', img: null },
  { id: 4, tenant: 'Vikram Singh', currentRoom: '108', requestedRoom: '301', reason: 'Prefer top floor view', date: '12 Jul 2026', status: 'rejected', img: null },
];

export default function Approvals() {
  const navigate = useNavigate();
  const [approvals, setApprovals] = useState(MOCK_APPROVALS);
  const [activeTab, setActiveTab] = useState('Pending');

  const pending = approvals.filter(a => a.status === 'pending');
  const history = approvals.filter(a => a.status !== 'pending');
  const shown = activeTab === 'Pending' ? pending : history;

  const handleAction = (id, action) => {
    setApprovals(prev => prev.map(a => a.id === id ? { ...a, status: action } : a));
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Hanken Grotesk', sans-serif", paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0c1a2e, #0f2847)', padding: '0 16px 20px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, height: 64 }}>
          <button onClick={() => navigate('/admin-dashboard')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back_ios_new</span>
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'white' }}>Approvals</h1>
            <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>Room changes & requests</p>
          </div>
          {pending.length > 0 && (
            <div style={{ background: '#fef3c7', borderRadius: 10, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#d97706' }}>pending_actions</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#d97706' }}>{pending.length}</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 4 }}>
          {['Pending', 'History'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ flex: 1, padding: '9px 0', border: 'none', borderRadius: 9, background: activeTab === tab ? 'white' : 'transparent', color: activeTab === tab ? '#0f172a' : '#94a3b8', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}>
              {tab} ({tab === 'Pending' ? pending.length : history.length})
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {shown.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 56, color: '#e2e8f0' }}>verified</span>
            <p style={{ color: '#94a3b8', fontSize: 15, fontWeight: 600 }}>
              {activeTab === 'Pending' ? 'All caught up! No pending approvals.' : 'No approval history yet.'}
            </p>
          </div>
        )}

        {shown.map(app => (
          <div key={app.id} style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', marginBottom: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  {app.img ? (
                    <img src={app.img} alt={app.tenant} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontWeight: 800, fontSize: 16 }}>
                      {app.tenant.substring(0,2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 style={{ margin: '0 0 2px', fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{app.tenant}</h3>
                    <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Requested on {app.date}</p>
                  </div>
                </div>
                {app.status === 'approved' && (
                  <span style={{ background: '#ecfdf5', color: '#059669', padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>Approved</span>
                )}
                {app.status === 'rejected' && (
                  <span style={{ background: '#fef2f2', color: '#ef4444', padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>Rejected</span>
                )}
              </div>

              <div style={{ background: '#f8fafc', borderRadius: 12, padding: 12, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 2px', fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Current</p>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Room {app.currentRoom}</p>
                </div>
                <span className="material-symbols-outlined" style={{ color: '#cbd5e1' }}>arrow_forward</span>
                <div style={{ flex: 1, textAlign: 'right' }}>
                  <p style={{ margin: '0 0 2px', fontSize: 11, color: '#0891b2', textTransform: 'uppercase', fontWeight: 700 }}>Requested</p>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0891b2' }}>Room {app.requestedRoom}</p>
                </div>
              </div>

              <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>Reason:</span> {app.reason}
              </p>

              {app.status === 'pending' && (
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <button onClick={() => handleAction(app.id, 'rejected')}
                    style={{ flex: 1, background: 'white', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}>
                    Reject
                  </button>
                  <button onClick={() => handleAction(app.id, 'approved')}
                    style={{ flex: 1, background: '#0891b2', color: 'white', border: 'none', borderRadius: 10, padding: '10px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(8,145,178,0.25)' }}>
                    Approve
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
