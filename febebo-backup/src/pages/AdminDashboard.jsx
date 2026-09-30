import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminBottomNav from '../components/AdminBottomNav';

export default function AdminDashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const MODULES = [
    { id: 'account',   label: 'Account',   desc: 'Ledgers',       icon: 'account_balance_wallet', gradient: 'linear-gradient(135deg,#0ea5e9,#0891b2)' },
    { id: 'inventory', label: 'Inventory', desc: 'Stock',          icon: 'inventory_2',            gradient: 'linear-gradient(135deg,#6366f1,#4f46e5)' },
    { id: 'vendor',    label: 'Vendor',    desc: 'Suppliers',      icon: 'local_shipping',         gradient: 'linear-gradient(135deg,#8b5cf6,#7c3aed)' },
    { id: 'room',      label: 'Seats',     desc: 'Spaces',         icon: 'meeting_room',           gradient: 'linear-gradient(135deg,#10b981,#059669)' },
    { id: 'user',      label: 'Users',     desc: 'Tenants',        icon: 'groups',                 gradient: 'linear-gradient(135deg,#f59e0b,#d97706)' },
    { id: 'staff',     label: 'Staff',     desc: 'HR & Pay',       icon: 'badge',                  gradient: 'linear-gradient(135deg,#f43f5e,#e11d48)' },
    { id: 'work',      label: 'Tasks',     desc: 'Maintenance',    icon: 'task_alt',               gradient: 'linear-gradient(135deg,#64748b,#475569)' },
    { id: 'enquiry',   label: 'Enquiry',   desc: '12 New',         icon: 'contact_support',        gradient: 'linear-gradient(135deg,#06b6d4,#0891b2)' },
  ];

  const routes = {
    room: '/manage-rooms', user: '/manage-tenants', staff: '/manage-staff',
    work: '/staff-work', account: '/manage-account', vendor: '/vendor-transactions',
    inventory: '/inventory', enquiry: '/enquiry',
  };

  const DUES = [
    { name: 'Raj Verma',    room: '104', amount: '10,000', due: '10 Jul', initials: 'RV', color: '#6366f1', img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop&crop=face' },
    { name: 'Priya Sharma', room: '202', amount: '8,500',  due: '12 Jul', initials: 'PS', color: '#f43f5e', img: null },
    { name: 'Amit Bose',    room: '107', amount: '12,000', due: '15 Jul', initials: 'AB', color: '#10b981', img: null },
  ];

  const STATS = [
    { label: 'Rooms Occupied', value: '92%',  sub: '118 / 128', icon: 'meeting_room',     color: '#0891b2', bg: '#ecfeff' },
    { label: 'Pending Dues',   value: '₹31K', sub: '3 tenants',  icon: 'payments',         color: '#e11d48', bg: '#fff1f2' },
    { label: 'Staff Present',  value: '8/10', sub: 'Today',      icon: 'badge',            color: '#059669', bg: '#ecfdf5' },
    { label: 'Open Tasks',     value: '5',    sub: 'This Week',  icon: 'pending_actions',  color: '#d97706', bg: '#fffbeb' },
  ];

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk', sans-serif", position: 'relative', overflowX: 'hidden', paddingBottom: 90 }}>

      {/* ── Sidebar Overlay ── */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 60, backdropFilter: 'blur(2px)' }} />
      )}

      {/* ── Sidebar ── */}
      <aside style={{
        position: 'fixed', top: 0, left: sidebarOpen ? 0 : '-300px', width: 280, height: '100vh',
        background: '#0f172a', zIndex: 70, transition: 'left 0.3s cubic-bezier(.4,0,.2,1)',
        display: 'flex', flexDirection: 'column', boxShadow: '8px 0 32px rgba(0,0,0,0.3)'
      }}>
        <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 24, fontWeight: 800, color: '#38bdf8', margin: 0 }}>Febebo</p>
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Admin Panel</p>
        </div>
        {[
          { icon: 'dashboard',           label: 'Dashboard',    path: '/admin-dashboard' },
          { icon: 'people',              label: 'Tenants',      path: '/manage-tenants' },
          { icon: 'meeting_room',        label: 'Seats',        path: '/manage-rooms' },
          { icon: 'badge',               label: 'Staff',        path: '/manage-staff' },
          { icon: 'account_balance_wallet', label: 'Accounts',  path: '/manage-account' },
          { icon: 'pending_actions',     label: 'Request Box',  path: '/request-box' },
          { icon: 'event_busy',          label: 'Leave',        path: '/leave' },
          { icon: 'bar_chart',           label: 'Reports',      path: '/reports' },
          { icon: 'workspace_premium',   label: 'Subscription', path: '/subscription' },
        ].map((item, i) => (
          <div key={i} onClick={() => { navigate(item.path); setSidebarOpen(false); }}
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', cursor: 'pointer', color: item.path === '/admin-dashboard' ? '#38bdf8' : '#94a3b8', background: item.path === '/admin-dashboard' ? 'rgba(56,189,248,0.08)' : 'transparent', borderLeft: item.path === '/admin-dashboard' ? '3px solid #38bdf8' : '3px solid transparent', transition: 'all 0.15s' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{item.icon}</span>
            <span style={{ fontSize: 14, fontWeight: 500 }}>{item.label}</span>
          </div>
        ))}
        <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '16px 20px' }}>
          <div onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 14, color: '#f87171', cursor: 'pointer' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>logout</span>
            <span style={{ fontSize: 14, fontWeight: 500 }}>Sign Out</span>
          </div>
        </div>
      </aside>

      {/* ── HERO HEADER ── */}
      <div style={{ background: 'linear-gradient(160deg, #0c1a2e 0%, #0f2847 60%, #0c3461 100%)', padding: '0 20px 28px', position: 'relative', overflow: 'hidden' }}>
        {/* Decorative blobs */}
        <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(56,189,248,0.12)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -20, left: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(99,102,241,0.1)', pointerEvents: 'none' }} />

        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16 }}>
          <button onClick={() => setSidebarOpen(true)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>menu</span>
          </button>
          <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 22, fontWeight: 800, color: '#38bdf8', margin: 0 }}>Febebo</p>
          <div style={{ position: 'relative' }}>
            <button onClick={() => navigate('/request-box')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>notifications</span>
            </button>
            <span style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, background: '#f43f5e', borderRadius: '50%', border: '2px solid #0f2847' }} />
          </div>
        </div>

        {/* Welcome */}
        <div style={{ marginTop: 24, marginBottom: 28 }}>
          <p style={{ color: '#94a3b8', fontSize: 13, margin: '0 0 4px' }}>Good Morning 👋</p>
          <h2 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", color: 'white', fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
            Admin <span style={{ color: '#38bdf8' }}>Pawan</span>
          </h2>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>Here's what's happening today</p>
        </div>

        {/* 4 Stat Pills */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {STATS.map((s, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: s.color }}>
                  {s.icon}
                </span>
              </div>
              <div>
                <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", color: 'white', fontSize: 17, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>{s.value}</p>
                <p style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SCROLLABLE BODY ── */}
      <div style={{ padding: '20px 16px' }}>

        {/* Management Modules */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: 18, color: '#0f172a', margin: 0 }}>Modules</p>
          <span style={{ fontSize: 12, color: '#0891b2', fontWeight: 600, cursor: 'pointer' }}>See all</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 28 }}>
          {MODULES.map(mod => (
            <button key={mod.id} onClick={() => routes[mod.id] && navigate(routes[mod.id])}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'white', border: '1px solid #e2e8f0', borderRadius: 16, padding: '14px 6px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              onTouchStart={e => e.currentTarget.style.transform = 'scale(0.95)'}
              onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{ width: 40, height: 40, borderRadius: 12, background: mod.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'white' }}>{mod.icon}</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#1e293b', textAlign: 'center', lineHeight: 1.3 }}>{mod.label}</span>
              <span style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center' }}>{mod.desc}</span>
            </button>
          ))}
        </div>

        {/* Quick Actions Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 28 }}>
          <button onClick={() => navigate('/complain')} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 14, padding: '14px 16px', cursor: 'pointer', textAlign: 'left' }}>
            <span className="material-symbols-outlined" style={{ color: '#e11d48', fontSize: 22 }}>report</span>
            <div>
              <p style={{ fontWeight: 700, color: '#0f172a', fontSize: 13, margin: 0 }}>Complaints</p>
              <p style={{ fontSize: 11, color: '#e11d48', fontWeight: 600, margin: 0 }}>4 Critical</p>
            </div>
          </button>
          <button onClick={() => navigate('/price-menu')} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: '14px 16px', cursor: 'pointer', textAlign: 'left' }}>
            <span className="material-symbols-outlined" style={{ color: '#059669', fontSize: 22 }}>receipt_long</span>
            <div>
              <p style={{ fontWeight: 700, color: '#0f172a', fontSize: 13, margin: 0 }}>Price Menu</p>
              <p style={{ fontSize: 11, color: '#059669', fontWeight: 600, margin: 0 }}>View Rates</p>
            </div>
          </button>
        </div>


        {/* Outstanding Dues */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: 18, color: '#0f172a', margin: 0 }}>Outstanding Dues</p>
          <span style={{ fontSize: 12, color: '#0891b2', fontWeight: 600, cursor: 'pointer' }} onClick={() => navigate('/manage-tenants')}>See all</span>
        </div>

        <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 28 }}>
          {DUES.map((d, i) => (
            <div key={i} onClick={() => navigate(`/user/${d.id || i+1}`, { state: { user: { id: d.id || i+1, name: d.name, room: d.room, img: d.img, pending: parseInt((d.amount || '0').replace(/,/g, '')) } } })} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', borderBottom: i < DUES.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', background: d.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 15, fontWeight: 700, color: 'white' }}>
                  {d.img ? <img src={d.img} alt={d.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : d.initials}
                </div>
                <div>
                  <p style={{ fontWeight: 700, color: '#0f172a', fontSize: 14, margin: 0 }}>{d.name}</p>
                  <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0' }}>Room {d.room}</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, color: '#e11d48', fontSize: 16, margin: 0 }}>₹{d.amount}</p>
                <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500, margin: '2px 0 0', fontFamily: "'JetBrains Mono',monospace" }}>DUE {d.due.toUpperCase()}</p>
              </div>
            </div>
          ))}
          <button onClick={() => navigate('/manage-account')} style={{ width: '100%', background: '#f8fafc', border: 'none', borderTop: '1px solid #f1f5f9', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#0891b2', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            Send All Reminders
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_right</span>
          </button>
        </div>
      </div>

      {/* ── FAB ── */}
      <button style={{ position: 'fixed', right: 20, bottom: 80, width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,#0891b2,#0e7490)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(8,145,178,0.4)', cursor: 'pointer', zIndex: 40 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 24 }}>add</span>
      </button>

      {/* ── BOTTOM NAV ── */}
      <AdminBottomNav activeTab="home" />
    </div>
  );
}
