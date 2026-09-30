import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const cyan = '#0891b2';

const MOCK_ENQUIRIES = [
  { id: 1, contactId: 'e1', name: 'Rohit Sharma',  mobile: '+91 9876543210', message: 'Looking for a single room with AC. Budget around ₹10,000.', date: '28 Jun 2025', status: 'New',       source: 'WhatsApp' },
  { id: 2, contactId: 'e2', name: 'Priya Mehta',   mobile: '+91 9123456789', message: 'Do you have double sharing available near metro station?', date: '27 Jun 2025', status: 'Contacted', source: 'NoBroker' },
  { id: 3, contactId: 'e3', name: 'Arun Verma',    mobile: '+91 9012345678', message: 'What is the security deposit for triple sharing?', date: '25 Jun 2025', status: 'Closed',    source: 'MagicBricks' },
  { id: 4, contactId: 'e4', name: 'Kavya Singh',   mobile: '+91 9444556677', message: 'Need a working girls PG with food. Any availability?', date: '29 Jun 2025', status: 'New',       source: 'Instagram' },
  { id: 5, contactId: 'e5', name: 'Deepak Rathi',  mobile: '+91 9777888001', message: 'Looking for long stay of 12 months. Any discount?', date: '28 Jun 2025', status: 'Contacted', source: 'Walk-in' },
];

const STATUS_CONFIG = {
  New:       { bg: '#ecfeff', text: '#0891b2', border: '#a5f3fc', icon: 'mark_chat_unread' },
  Contacted: { bg: '#fffbeb', text: '#d97706', border: '#fde68a', icon: 'call_made' },
  Closed:    { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0', icon: 'check_circle' },
};

const SOURCE_CONFIG = {
  WhatsApp:   { color: '#25d366', icon: 'chat' },
  NoBroker:   { color: '#e11d48', icon: 'home' },
  MagicBricks:{ color: '#f59e0b', icon: 'apartment' },
  Instagram:  { color: '#c026d3', icon: 'photo_camera' },
  'Walk-in':  { color: '#0891b2', icon: 'directions_walk' },
};

export default function Enquiry() {
  const navigate = useNavigate();
  const [enquiries, setEnquiries] = useState(MOCK_ENQUIRIES);
  const [filter, setFilter] = useState('All');

  const tabs = ['All', 'New', 'Contacted', 'Closed'];
  const counts = { All: enquiries.length, New: enquiries.filter(e => e.status === 'New').length, Contacted: enquiries.filter(e => e.status === 'Contacted').length, Closed: enquiries.filter(e => e.status === 'Closed').length };
  const filtered = filter === 'All' ? enquiries : enquiries.filter(e => e.status === filter);

  const openChatForEnquiry = (enq) => {
    navigate('/chat', { state: { contactId: enq.contactId, name: enq.name } });
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk', sans-serif", paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0c1a2e, #0f2847)', padding: '0 16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, height: 64 }}>
          <button onClick={() => navigate('/admin-dashboard')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back_ios_new</span>
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'white' }}>Enquiries</h1>
            <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{counts.New} new leads today</p>
          </div>
          <div style={{ background: '#ecfeff', borderRadius: 10, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: cyan }}>mark_chat_unread</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: cyan }}>{counts.New}</span>
          </div>
        </div>

        {/* Stats strip */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
          {[{ label: 'New', val: counts.New, c: '#38bdf8' }, { label: 'Contacted', val: counts.Contacted, c: '#fbbf24' }, { label: 'Closed', val: counts.Closed, c: '#4ade80' }].map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '10px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontWeight: 900, fontSize: 22, color: s.c }}>{s.val}</p>
              <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 6 }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setFilter(t)}
              style={{ flex: 1, padding: '7px 4px', border: 'none', borderRadius: 10, background: filter === t ? 'rgba(255,255,255,0.18)' : 'transparent', color: filter === t ? 'white' : '#64748b', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {filtered.map(enq => {
          const sc = STATUS_CONFIG[enq.status];
          const src = SOURCE_CONFIG[enq.source] || { color: '#64748b', icon: 'link' };
          return (
            <div 
              key={enq.id} 
              onClick={() => openChatForEnquiry(enq)}
              style={{ background: 'white', borderRadius: 16, border: `1px solid ${sc.border}`, marginBottom: 12, overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.05)', borderLeft: `4px solid ${sc.text}`, cursor: 'pointer', transition: 'transform 0.15s' }}>
              <div style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{enq.name}</p>
                    <span style={{ fontSize: 12, color: cyan, fontWeight: 600 }}>{enq.mobile}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 8, background: sc.bg, color: sc.text, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 12 }}>{sc.icon}</span>
                      {enq.status}
                    </span>
                    <span style={{ fontSize: 10, color: src.color, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 11 }}>{src.icon}</span>
                      {enq.source}
                    </span>
                  </div>
                </div>
                <p style={{ margin: '0 0 12px', fontSize: 13, color: '#475569' }}>{enq.message}</p>
                <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => openChatForEnquiry(enq)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#ecfeff', color: cyan, border: '1px solid #a5f3fc', borderRadius: 9, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>chat</span>
                    Open Chat
                  </button>
                  <a href={`tel:${enq.mobile}`} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f8fafc', color: '#334155', border: '1px solid #e2e8f0', borderRadius: 9, padding: '7px 10px', textDecoration: 'none', fontSize: 12, fontWeight: 700 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>call</span>
                    Call
                  </a>
                  {enq.status === 'New' && (
                    <button onClick={() => setEnquiries(p => p.map(e => e.id === enq.id ? { ...e, status: 'Contacted' } : e))}
                      style={{ flex: 1, background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', borderRadius: 9, padding: '7px 8px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Mark Contacted
                    </button>
                  )}
                  {enq.status !== 'Closed' && (
                    <button onClick={() => setEnquiries(p => p.map(e => e.id === enq.id ? { ...e, status: 'Closed' } : e))}
                      style={{ flex: 1, background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: 9, padding: '7px 8px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Close Lead
                    </button>
                  )}
                  {enq.status === 'Closed' && (
                    <span style={{ flex: 1, textAlign: 'center', fontSize: 12, color: '#059669', fontWeight: 700, paddingTop: 6 }}>✓ Closed</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 56, color: '#e2e8f0' }}>contact_support</span>
            <p style={{ color: '#94a3b8', fontSize: 15, fontWeight: 600 }}>No enquiries in this category.</p>
          </div>
        )}
      </div>
    </div>
  );
}
