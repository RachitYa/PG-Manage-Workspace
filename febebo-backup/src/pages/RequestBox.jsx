import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Inbox } from 'lucide-react';

const MOCK_REQUESTS = [
  { id: 1, tenant: 'Rahul Rastogi', room: '103', type: 'Rent Receipt', desc: 'Need rent receipt for month of February 2025.', date: '28 Jun 2025', resolved: false },
  { id: 2, tenant: 'Amit Sachdeva', room: '103', type: 'Extra Blanket', desc: 'Requesting one extra blanket for winter.', date: '26 Jun 2025', resolved: false },
  { id: 3, tenant: 'Ravi Kumar', room: '102', type: 'Key Duplicate', desc: 'Lost room key, need a duplicate copy.', date: '20 Jun 2025', resolved: true },
];

export default function RequestBox() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState(MOCK_REQUESTS);

  const pending = requests.filter(r => !r.resolved);
  const resolved = requests.filter(r => r.resolved);

  return (
    <div className="app-container">
      <div className="top-nav">
        <div className="flex items-center gap-4">
          <button className="icon-btn" onClick={() => navigate('/admin-dashboard')}><ArrowLeft size={24} /></button>
          <div className="nav-title">Request Box</div>
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        <h3 className="mb-4">Pending Requests ({pending.length})</h3>
        {pending.length === 0 && (
          <div className="text-center card" style={{ paddingTop: '32px', paddingBottom: '32px' }}>
            <Inbox size={40} style={{ margin: '0 auto 12px', color: 'var(--text-muted)' }} />
            <p>All requests resolved!</p>
          </div>
        )}
        {pending.map(req => (
          <div key={req.id} className="card" style={{ borderLeft: '4px solid var(--primary)', marginBottom: '12px' }}>
            <div className="flex justify-between items-start mb-1">
              <div style={{ fontWeight: '600' }}>{req.type}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{req.date}</div>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
              {req.tenant} · Room {req.room}
            </div>
            <p style={{ fontSize: '0.875rem', marginBottom: '12px' }}>{req.desc}</p>
            <button className="btn-primary flex items-center gap-2" style={{ width: 'auto', padding: '8px 16px', fontSize: '0.875rem' }}
              onClick={() => setRequests(prev => prev.map(r => r.id === req.id ? { ...r, resolved: true } : r))}>
              <Check size={16} /> Mark Resolved
            </button>
          </div>
        ))}

        {resolved.length > 0 && (
          <>
            <h3 style={{ margin: '24px 0 16px' }}>Resolved ({resolved.length})</h3>
            {resolved.map(req => (
              <div key={req.id} className="card" style={{ borderLeft: '4px solid var(--success)', marginBottom: '12px', opacity: 0.7 }}>
                <div className="flex justify-between items-start mb-1">
                  <div style={{ fontWeight: '600' }}>{req.type}</div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: '600' }}>✓ Resolved</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{req.tenant} · Room {req.room}</div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
