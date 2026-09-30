import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, X } from 'lucide-react';

const MOCK_LEAVES = [
  { id: 1, name: 'Sachin Kumar', role: 'House Keeping', from: '01 Jul 2025', to: '03 Jul 2025', reason: 'Family function', status: 'Pending' },
  { id: 2, name: 'Rajeev Kumar', role: 'Manager', from: '05 Jul 2025', to: '05 Jul 2025', reason: 'Doctor appointment', status: 'Approved' },
  { id: 3, name: 'Amit Singh', role: 'Security', from: '10 Jul 2025', to: '12 Jul 2025', reason: 'Home visit', status: 'Rejected' },
];

export default function Leave() {
  const navigate = useNavigate();
  const [leaves, setLeaves] = useState(MOCK_LEAVES);

  const updateStatus = (id, status) => setLeaves(prev => prev.map(l => l.id === id ? { ...l, status } : l));

  return (
    <div className="app-container">
      <div className="top-nav">
        <div className="flex items-center gap-4">
          <button className="icon-btn" onClick={() => navigate('/admin-dashboard')}><ArrowLeft size={24} /></button>
          <div className="nav-title">Leave Requests</div>
        </div>
      </div>
      <div style={{ padding: '16px' }}>
        {leaves.map(leave => (
          <div key={leave.id} className="card" style={{ marginBottom: '12px', borderLeft: `4px solid ${leave.status === 'Approved' ? 'var(--success)' : leave.status === 'Rejected' ? 'var(--danger)' : 'var(--warning)'}` }}>
            <div className="flex justify-between items-start mb-2">
              <div>
                <div style={{ fontWeight: '600' }}>{leave.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{leave.role}</div>
              </div>
              <span style={{
                fontSize: '0.75rem', fontWeight: '600', padding: '3px 10px', borderRadius: 'var(--radius-full)',
                backgroundColor: leave.status === 'Approved' ? 'rgba(16,185,129,0.1)' : leave.status === 'Rejected' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                color: leave.status === 'Approved' ? 'var(--success)' : leave.status === 'Rejected' ? 'var(--danger)' : 'var(--warning)'
              }}>
                {leave.status}
              </span>
            </div>
            <div style={{ fontSize: '0.875rem', marginBottom: '4px' }}>
              📅 {leave.from} — {leave.to}
            </div>
            <p style={{ fontSize: '0.875rem', marginBottom: '12px' }}>Reason: {leave.reason}</p>
            {leave.status === 'Pending' && (
              <div className="flex gap-2">
                <button className="btn-primary flex items-center gap-1" style={{ width: 'auto', padding: '8px 16px', fontSize: '0.875rem' }}
                  onClick={() => updateStatus(leave.id, 'Approved')}>
                  <Check size={16} /> Approve
                </button>
                <button className="btn-outline flex items-center gap-1" style={{ width: 'auto', padding: '8px 16px', fontSize: '0.875rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                  onClick={() => updateStatus(leave.id, 'Rejected')}>
                  <X size={16} /> Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
