import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const cyan = '#0891b2';

const MOCK_REQUESTS = [
  { id: 1, tenant: 'Rahul Rastogi', room: '103', phone: '+91 9876543210', type: 'Rent Receipt', desc: 'Need rent receipt for month of February 2025 for income tax filing.', date: '28 Jun 2025', resolved: false, category: 'document' },
  { id: 2, tenant: 'Amit Sachdeva', room: '103', phone: '+91 9988776655', type: 'Extra Blanket', desc: 'Requesting one extra blanket. Nights are getting cold.', date: '26 Jun 2025', resolved: false, category: 'amenity' },
  { id: 3, tenant: 'Ravi Kumar', room: '102', phone: '+91 9111223344', type: 'Key Duplicate', desc: 'Lost room key, need a duplicate copy urgently.', date: '20 Jun 2025', resolved: true, category: 'maintenance' },
  { id: 4, tenant: 'Sneha Kapoor', room: '108', phone: '+91 9444556677', type: 'Room Change', desc: 'Want to shift to a single occupancy room on floor 2 if available.', date: '27 Jun 2025', resolved: false, category: 'room' },
  { id: 5, tenant: 'Priya Sharma', room: '202', phone: '+91 9666778899', type: 'NOC Letter', desc: 'Need NOC letter from PG for university records submission.', date: '25 Jun 2025', resolved: true, category: 'document' },
];

const CATEGORY_CONFIG = {
  document:    { icon: 'description',  color: '#6366f1', bg: '#eef2ff' },
  amenity:     { icon: 'bed',          color: '#0891b2', bg: '#ecfeff' },
  maintenance: { icon: 'build',        color: '#d97706', bg: '#fffbeb' },
  room:        { icon: 'meeting_room', color: '#10b981', bg: '#ecfdf5' },
};

export default function RequestBox() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState(MOCK_REQUESTS);
  const [activeTab, setActiveTab] = useState('Pending');

  const pending = requests.filter(r => !r.resolved);
  const resolved = requests.filter(r => r.resolved);
  const shown = activeTab === 'Pending' ? pending : resolved;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk', sans-serif", paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0c1a2e, #0f2847)', padding: '0 16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, height: 64 }}>
          <button onClick={() => navigate('/admin-dashboard')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back_ios_new</span>
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'white' }}>Request Box</h1>
            <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{pending.length} pending requests</p>
          </div>
          {pending.length > 0 && (
            <div style={{ background: '#fef3c7', borderRadius: 10, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#d97706' }}>inbox</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#d97706' }}>{pending.length}</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 4 }}>
          {['Pending', 'Resolved'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ flex: 1, padding: '9px 0', border: 'none', borderRadius: 9, background: activeTab === tab ? 'white' : 'transparent', color: activeTab === tab ? '#0f172a' : '#64748b', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}>
              {tab} ({tab === 'Pending' ? pending.length : resolved.length})
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {shown.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 56, color: '#e2e8f0' }}>inbox</span>
            <p style={{ color: '#94a3b8', fontSize: 15, fontWeight: 600 }}>
              {activeTab === 'Pending' ? 'All requests resolved!' : 'No resolved requests yet.'}
            </p>
          </div>
        )}

        {shown.map(req => {
          const cat = CATEGORY_CONFIG[req.category] || CATEGORY_CONFIG.amenity;
          return (
            <div key={req.id} style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', marginBottom: 12, overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.05)', borderLeft: `4px solid ${cat.color}` }}>
              <div style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: cat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 17, color: cat.color }}>{cat.icon}</span>
                    </div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{req.type}</p>
                  </div>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>{req.date}</span>
                </div>
                <p style={{ margin: '0 0 6px', fontSize: 12, color: '#64748b' }}>{req.tenant} · Room {req.room}</p>
                <p style={{ margin: '0 0 12px', fontSize: 13, color: '#475569' }}>{req.desc}</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <a href={`tel:${req.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#ecfeff', color: cyan, border: '1px solid #a5f3fc', borderRadius: 9, padding: '7px 12px', textDecoration: 'none', fontSize: 12, fontWeight: 700 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>call</span>
                    Call
                  </a>
                  {!req.resolved && (
                    <button
                      onClick={() => setRequests(prev => prev.map(r => r.id === req.id ? { ...r, resolved: true } : r))}
                      style={{ flex: 1, background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: 9, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 15 }}>check_circle</span>
                      Mark Resolved
                    </button>
                  )}
                  {req.resolved && (
                    <span style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, color: '#059669', fontSize: 12, fontWeight: 700 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 15 }}>task_alt</span>
                      Resolved
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
