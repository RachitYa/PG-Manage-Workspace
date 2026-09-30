import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';
import AdminBottomNav from '../components/AdminBottomNav';

const MOCK_COMPLAINTS = [
  { id: 1, tenant: 'Rahul Rastogi', room: '103', title: 'Washing Machine Not Working', desc: 'The washing machine on 2nd floor has been broken for 3 days.', date: '28 Jun 2025', status: 'Active' },
  { id: 2, tenant: 'Amit Sachdeva', room: '103', title: 'Water Leakage in Bathroom', desc: 'There is a water leakage near the sink in the attached bathroom.', date: '26 Jun 2025', status: 'Pending' },
  { id: 3, tenant: 'Ravi Kumar', room: '102', title: 'WiFi Not Working', desc: 'Internet has been down since yesterday evening.', date: '24 Jun 2025', status: 'Closed' },
];

const STATUS_ICON = {
  Active: <AlertCircle size={16} style={{ color: 'var(--danger)' }} />,
  Pending: <Clock size={16} style={{ color: 'var(--warning)' }} />,
  Closed: <CheckCircle size={16} style={{ color: 'var(--success)' }} />,
};
const STATUS_COLOR = {
  Active: { bg: 'rgba(239,68,68,0.1)', text: 'var(--danger)', border: 'var(--danger)' },
  Pending: { bg: 'rgba(245,158,11,0.1)', text: 'var(--warning)', border: 'var(--warning)' },
  Closed: { bg: 'rgba(16,185,129,0.1)', text: 'var(--success)', border: 'var(--success)' },
};

export default function Complain() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState(MOCK_COMPLAINTS);
  const [activeTab, setActiveTab] = useState('All');
  const TABS = ['All', 'Active', 'Pending', 'Closed'];

  const filtered = activeTab === 'All' ? complaints : complaints.filter(c => c.status === activeTab);

  return (
    <div className="app-container" style={{ paddingBottom: '100px' }}>
      <div className="top-nav">
        <div className="flex items-center gap-4">
          <div className="nav-title">Complaints</div>
        </div>
      </div>
      <div style={{ padding: '0 16px' }}>
        {/* Tabs */}
        <div className="flex" style={{ borderBottom: '1px solid var(--border-color)', marginBottom: '16px', overflowX: 'auto' }}>
          {TABS.map(tab => (
            <div key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === tab ? 'var(--primary)' : 'var(--text-muted)', fontWeight: activeTab === tab ? '600' : '400', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
              {tab}
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '0 16px 16px' }}>
        {filtered.map(comp => (
          <div key={comp.id} className="card" style={{ borderLeft: `4px solid ${STATUS_COLOR[comp.status].border}`, marginBottom: '12px' }}>
            <div className="flex justify-between items-start mb-2">
              <div style={{ fontWeight: '600', flex: 1 }}>{comp.title}</div>
              <span className="flex items-center gap-1" style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: 'var(--radius-full)', backgroundColor: STATUS_COLOR[comp.status].bg, color: STATUS_COLOR[comp.status].text, fontWeight: '600', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                {STATUS_ICON[comp.status]} {comp.status}
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
              {comp.tenant} · Room {comp.room} · {comp.date}
            </div>
            <p style={{ fontSize: '0.875rem', marginBottom: '12px' }}>{comp.desc}</p>
            {comp.status !== 'Closed' && (
              <div className="flex gap-2">
                {comp.status === 'Active' && (
                  <button className="btn-outline" style={{ padding: '6px 12px', width: 'auto', fontSize: '0.75rem' }}
                    onClick={() => setComplaints(prev => prev.map(c => c.id === comp.id ? { ...c, status: 'Pending' } : c))}>
                    Assign Staff
                  </button>
                )}
                <button className="btn-primary" style={{ padding: '6px 12px', width: 'auto', fontSize: '0.75rem' }}
                  onClick={() => setComplaints(prev => prev.map(c => c.id === comp.id ? { ...c, status: 'Closed' } : c))}>
                  Mark Resolved
                </button>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center" style={{ paddingTop: '48px', color: 'var(--text-muted)' }}>
            <CheckCircle size={48} style={{ margin: '0 auto 12px', color: 'var(--success)' }} />
            <p>No complaints in this category!</p>
          </div>
        )}
      </div>
      <AdminBottomNav activeTab="review" />
    </div>
  );
}
