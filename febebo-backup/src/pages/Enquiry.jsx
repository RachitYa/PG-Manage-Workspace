import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';

const MOCK_ENQUIRIES = [
  { id: 1, name: 'Rohit Sharma', mobile: '+91 9876543210', message: 'Looking for a single room with AC. Budget around ₹10,000.', date: '28 Jun 2025', status: 'New' },
  { id: 2, name: 'Priya Mehta', mobile: '+91 9123456789', message: 'Do you have double sharing available near metro station?', date: '27 Jun 2025', status: 'Contacted' },
  { id: 3, name: 'Arun Verma', mobile: '+91 9012345678', message: 'What is the security deposit for triple sharing?', date: '25 Jun 2025', status: 'Closed' },
];

const STATUS_COLOR = {
  New: { bg: 'rgba(14,165,233,0.1)', text: 'var(--primary)' },
  Contacted: { bg: 'rgba(245,158,11,0.1)', text: 'var(--warning)' },
  Closed: { bg: 'rgba(16,185,129,0.1)', text: 'var(--success)' },
};

export default function Enquiry() {
  const navigate = useNavigate();
  const [enquiries, setEnquiries] = useState(MOCK_ENQUIRIES);

  return (
    <div className="app-container">
      <div className="top-nav">
        <div className="flex items-center gap-4">
          <button className="icon-btn" onClick={() => navigate('/admin-dashboard')}><ArrowLeft size={24} /></button>
          <div className="nav-title">Enquiries</div>
        </div>
      </div>
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          {[
            { label: 'New', count: enquiries.filter(e => e.status === 'New').length, color: 'var(--primary)' },
            { label: 'Contacted', count: enquiries.filter(e => e.status === 'Contacted').length, color: 'var(--warning)' },
            { label: 'Closed', count: enquiries.filter(e => e.status === 'Closed').length, color: 'var(--success)' },
          ].map((s, i) => (
            <div key={i} className="card text-center" style={{ padding: '12px', marginBottom: 0 }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: s.color }}>{s.count}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {enquiries.map((enq, idx) => (
          <div key={enq.id} className="card" style={{ marginBottom: '12px' }}>
            <div className="flex justify-between items-start mb-2">
              <div>
                <div style={{ fontWeight: '600' }}>{enq.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '2px' }}>{enq.mobile}</div>
              </div>
              <span style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: 'var(--radius-full)', backgroundColor: STATUS_COLOR[enq.status].bg, color: STATUS_COLOR[enq.status].text, fontWeight: '600' }}>
                {enq.status}
              </span>
            </div>
            <p style={{ fontSize: '0.875rem', marginBottom: '12px' }}>{enq.message}</p>
            <div className="flex justify-between items-center">
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{enq.date}</div>
              <div className="flex gap-2">
                <button className="btn-outline" style={{ padding: '6px 12px', width: 'auto', fontSize: '0.75rem' }}
                  onClick={() => setEnquiries(prev => prev.map(e => e.id === enq.id ? { ...e, status: 'Contacted' } : e))}>
                  Mark Contacted
                </button>
                <button className="btn-primary" style={{ padding: '6px 12px', width: 'auto', fontSize: '0.75rem' }}
                  onClick={() => setEnquiries(prev => prev.map(e => e.id === enq.id ? { ...e, status: 'Closed' } : e))}>
                  Close
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
