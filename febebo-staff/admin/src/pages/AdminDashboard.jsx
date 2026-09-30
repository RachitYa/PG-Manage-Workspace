import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DetailedReceiptModal, { CollectPaymentModal } from '../components/DetailedReceiptModal';

export default function AdminDashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAllModules, setShowAllModules] = useState(false);
  const [isEditingModules, setIsEditingModules] = useState(false);
  const [visibleModuleIds, setVisibleModuleIds] = useState([
    'account', 'inventory', 'vendor', 'room', 'user', 'staff', 'work', 'enquiry'
  ]);
  const [duesSheet, setDuesSheet] = useState(null); // selected dues person
  const [activeReceipt, setActiveReceipt] = useState(null);
  const [collectModalData, setCollectModalData] = useState(null);

  const MODULES = [
    { id: 'account',        label: 'Account',        desc: 'Ledgers',       icon: 'account_balance_wallet', gradient: 'linear-gradient(135deg,#0ea5e9,#0891b2)' },
    { id: 'inventory',      label: 'Inventory',      desc: 'Stock',          icon: 'inventory_2',            gradient: 'linear-gradient(135deg,#6366f1,#4f46e5)' },
    { id: 'vendor',         label: 'Vendor',         desc: 'Suppliers',      icon: 'local_shipping',         gradient: 'linear-gradient(135deg,#8b5cf6,#7c3aed)' },
    { id: 'room',           label: 'Seats',          desc: 'Spaces',         icon: 'meeting_room',           gradient: 'linear-gradient(135deg,#10b981,#059669)' },
    { id: 'user',           label: 'Users',          desc: 'Tenants',        icon: 'groups',                 gradient: 'linear-gradient(135deg,#f59e0b,#d97706)' },
    { id: 'staff',          label: 'Staff',          desc: 'HR & Pay',       icon: 'badge',                  gradient: 'linear-gradient(135deg,#f43f5e,#e11d48)' },
    { id: 'work',           label: 'Tasks',          desc: 'Maintenance',    icon: 'task_alt',               gradient: 'linear-gradient(135deg,#64748b,#475569)' },
    { id: 'enquiry',        label: 'Enquiry',        desc: '12 New',         icon: 'contact_support',        gradient: 'linear-gradient(135deg,#06b6d4,#0891b2)' },
    { id: 'visitor',        label: 'Visitors',       desc: 'Gate Log',       icon: 'recent_actors',          gradient: 'linear-gradient(135deg,#10b981,#047857)' },
    { id: 'mess',           label: 'Mess',           desc: 'Headcount',      icon: 'restaurant',             gradient: 'linear-gradient(135deg,#ec4899,#be185d)' },
    { id: 'transportation', label: 'Transport',      desc: 'Drivers',        icon: 'directions_car',         gradient: 'linear-gradient(135deg,#16a34a,#15803d)' },
    { id: 'chat',           label: 'Chat',           desc: 'Messages',       icon: 'chat',                   gradient: 'linear-gradient(135deg,#ec4899,#db2777)' },
    { id: 'approvals',      label: 'Approvals',      desc: 'Room changes',   icon: 'verified',               gradient: 'linear-gradient(135deg,#eab308,#ca8a04)' },
    { id: 'hired_workers',  label: 'Workers',        desc: 'Shared Pool',    icon: 'engineering',            gradient: 'linear-gradient(135deg,#0ea5e9,#2563eb)' },
    { id: 'reports',        label: 'Reports',        desc: 'Analytics',      icon: 'bar_chart',              gradient: 'linear-gradient(135deg,#7c3aed,#6d28d9)' },
    { id: 'leave',          label: 'Leave',          desc: 'Requests',       icon: 'event_busy',             gradient: 'linear-gradient(135deg,#0891b2,#0e7490)' },
    { id: 'complain',       label: 'Complaints',     desc: '4 Critical',     icon: 'report',                 gradient: 'linear-gradient(135deg,#dc2626,#b91c1c)' },
    { id: 'price',          label: 'Pricing',        desc: 'Rates',          icon: 'receipt_long',           gradient: 'linear-gradient(135deg,#059669,#047857)' },
    { id: 'subscription',   label: 'Subscription',   desc: 'Plan',           icon: 'workspace_premium',      gradient: 'linear-gradient(135deg,#f59e0b,#b45309)' },
  ];

  const routes = {
    room: '/manage-rooms', user: '/manage-tenants', staff: '/manage-staff',
    work: '/staff-work', account: '/manage-account', vendor: '/vendor-transactions',
    inventory: '/inventory', enquiry: '/enquiry', transportation: '/transportation', chat: '/chat',
    approvals: '/approvals', hired_workers: '/hired-workers', reports: '/reports',
    leave: '/leave', complain: '/complain', price: '/price-menu', subscription: '/subscription',
    visitor: '/visitor-log', meter: '/meter-reading', mess: '/mess-headcount', staff_app: '/staff-app',
  };

  const STAT_ROUTES = {
    'Rooms Occupied': '/manage-rooms',
    'Pending Dues': '/manage-account',
    'Staff Present': '/manage-staff',
    'Open Tasks': '/staff-work',
  };

  const DUES = [
    {
      id: 1, name: 'Raj Verma', room: '104', amount: '10,000', due: '10 Jul',
      initials: 'RV', color: '#6366f1',
      img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop&crop=face',
      phone: '+91 9876543210', joinDate: 'Jan 2024', plan: 'AC Double',
      payHistory: [
        { month: 'Jun 2025', amount: '10,000', status: 'Paid', date: '5 Jun', mode: 'UPI' },
        { month: 'May 2025', amount: '10,000', status: 'Paid', date: '3 May', mode: 'Cash' },
        { month: 'Apr 2025', amount: '10,000', status: 'Paid', date: '1 Apr', mode: 'UPI' },
      ]
    },
    {
      id: 2, name: 'Priya Sharma', room: '202', amount: '8,500', due: '12 Jul',
      initials: 'PS', color: '#f43f5e', img: null,
      phone: '+91 9988776655', joinDate: 'Mar 2024', plan: 'Non-AC Single',
      payHistory: [
        { month: 'Jun 2025', amount: '8,500', status: 'Late', date: '18 Jun', mode: 'UPI' },
        { month: 'May 2025', amount: '8,500', status: 'Paid', date: '6 May', mode: 'UPI' },
        { month: 'Apr 2025', amount: '8,500', status: 'Paid', date: '4 Apr', mode: 'Cash' },
      ]
    },
    {
      id: 3, name: 'Amit Bose', room: '107', amount: '12,000', due: '15 Jul',
      initials: 'AB', color: '#10b981', img: null,
      phone: '+91 9111223344', joinDate: 'Nov 2023', plan: 'AC Triple',
      payHistory: [
        { month: 'Jun 2025', amount: '12,000', status: 'Paid', date: '2 Jun', mode: 'Bank Transfer' },
        { month: 'May 2025', amount: '12,000', status: 'Paid', date: '1 May', mode: 'UPI' },
        { month: 'Apr 2025', amount: '11,500', status: 'Paid', date: '5 Apr', mode: 'UPI' },
      ]
    },
  ];

  const STATS = [
    { label: 'Rooms Occupied', value: '92%',  sub: '118 / 128', icon: 'meeting_room',     color: '#0891b2', bg: '#ecfeff' },
    { label: 'Pending Dues',   value: '₹31K', sub: '3 tenants',  icon: 'payments',         color: '#e11d48', bg: '#fff1f2' },
    { label: 'Staff Present',  value: '8/10', sub: 'Today',      icon: 'badge',            color: '#059669', bg: '#ecfdf5' },
    { label: 'Open Tasks',     value: '5',    sub: 'This Week',  icon: 'pending_actions',  color: '#d97706', bg: '#fffbeb' },
  ];

  // First 8 modules shown in grid; rest in "See All" drawer
  const VISIBLE_MODULES = visibleModuleIds.map(id => MODULES.find(m => m.id === id)).filter(Boolean).slice(0, 8);

  const payStatusColor = (s) => s === 'Paid' ? '#059669' : s === 'Late' ? '#d97706' : '#e11d48';

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
          { icon: 'dashboard',              label: 'Dashboard',      path: '/admin-dashboard' },
          { icon: 'people',                 label: 'Tenants',        path: '/manage-tenants' },
          { icon: 'meeting_room',           label: 'Seats',          path: '/manage-rooms' },
          { icon: 'badge',                  label: 'Staff',          path: '/manage-staff' },
          { icon: 'account_balance_wallet', label: 'Accounts',       path: '/manage-account' },
          { icon: 'directions_car',         label: 'Transportation', path: '/transportation' },
          { icon: 'chat',                   label: 'Messages',       path: '/chat' },
          { icon: 'pending_actions',        label: 'Request Box',    path: '/request-box' },
          { icon: 'verified',               label: 'Approvals',      path: '/approvals' },
          { icon: 'engineering',            label: 'Hired Workers',  path: '/hired-workers' },
          { icon: 'event_busy',             label: 'Leave',          path: '/leave' },
          { icon: 'bar_chart',              label: 'Reports',        path: '/reports' },
          { icon: 'workspace_premium',      label: 'Subscription',   path: '/subscription' },
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

      {/* ── "See All" Modules Drawer ── */}
      {showAllModules && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div onClick={() => { setShowAllModules(false); setIsEditingModules(false); }} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)' }} />
          <div style={{ position: 'relative', background: 'white', borderRadius: '24px 24px 0 0', maxHeight: '80vh', overflowY: 'auto', padding: '0 0 40px' }}>
            <div style={{ position: 'sticky', top: 0, background: 'white', padding: '16px 20px 12px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 2 }}>
              <div>
                <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>All Modules</p>
                {isEditingModules && <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Select up to 8 modules ({visibleModuleIds.length}/8)</p>}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setIsEditingModules(!isEditingModules)} style={{ background: isEditingModules ? '#0891b2' : '#f8fafc', color: isEditingModules ? 'white' : '#0891b2', border: isEditingModules ? 'none' : '1px solid #0891b2', borderRadius: 10, padding: '6px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {isEditingModules ? 'Done' : 'Edit'}
                </button>
                <button onClick={() => { setShowAllModules(false); setIsEditingModules(false); }} style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#475569' }}>close</span>
                </button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, padding: '16px 16px' }}>
              {MODULES.map(mod => {
                const isSelected = visibleModuleIds.includes(mod.id);
                return (
                  <button key={mod.id} onClick={() => {
                    if (isEditingModules) {
                      if (isSelected) {
                        setVisibleModuleIds(prev => prev.filter(id => id !== mod.id));
                      } else if (visibleModuleIds.length < 8) {
                        setVisibleModuleIds(prev => [...prev, mod.id]);
                      }
                    } else {
                      if (routes[mod.id]) { navigate(routes[mod.id]); setShowAllModules(false); }
                    }
                  }}
                    style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: '#f8fafc', border: `1px solid ${isEditingModules && isSelected ? '#0891b2' : '#e2e8f0'}`, borderRadius: 16, padding: '14px 6px', cursor: 'pointer', transition: 'all 0.2s', opacity: isEditingModules && !isSelected && visibleModuleIds.length >= 8 ? 0.5 : 1 }}>
                    {isEditingModules && isSelected && (
                      <div style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#0891b2', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check</span>
                      </div>
                    )}
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: mod.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'white' }}>{mod.icon}</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#1e293b', textAlign: 'center', lineHeight: 1.3 }}>{mod.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Payment Bottom Sheet ── */}
      {duesSheet && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div onClick={() => setDuesSheet(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)' }} />
          <div style={{ position: 'relative', background: 'white', borderRadius: '24px 24px 0 0', maxHeight: '85vh', overflowY: 'auto', paddingBottom: 40 }}>
            {/* Sheet Header */}
            <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: duesSheet.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: 'white', flexShrink: 0, overflow: 'hidden' }}>
                {duesSheet.img ? <img src={duesSheet.img} alt={duesSheet.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : duesSheet.initials}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 800, fontSize: 17, color: '#0f172a', margin: '0 0 2px' }}>{duesSheet.name}</p>
                <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Room {duesSheet.room} · {duesSheet.plan}</p>
              </div>
              <button onClick={() => setDuesSheet(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#475569' }}>close</span>
              </button>
            </div>

            <div style={{ padding: '16px 20px' }}>
              {/* Due Amount Banner */}
              <div style={{ background: 'linear-gradient(135deg, #e11d48, #be123c)', borderRadius: 16, padding: '18px 20px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 1 }}>Outstanding Due</p>
                  <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 32, fontWeight: 800, color: 'white', margin: 0 }}>₹{duesSheet.amount}</p>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: '4px 0 0' }}>Due by {duesSheet.due}</p>
                </div>
                <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'rgba(255,255,255,0.15)' }}>payments</span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
                <button onClick={() => setCollectModalData(duesSheet)} style={{ background: '#0891b2', color: 'white', border: 'none', borderRadius: 12, padding: '13px 0', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
                  Mark as Paid
                </button>
                <a href={`tel:${duesSheet.phone}`} style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: 12, padding: '13px 0', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>call</span>
                  Call Tenant
                </a>
              </div>

              {/* Payment History */}
              <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: 15, color: '#0f172a', margin: '0 0 12px' }}>Payment History</p>
              <div style={{ background: '#f8fafc', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                {duesSheet.payHistory.map((ph, i) => {
                  const amtVal = typeof ph.amount === 'number' ? ph.amount : parseInt(String(ph.amount).replace(/,/g, '')) || 10000;
                  return (
                    <div key={i} onClick={() => setActiveReceipt({
                      tenantName: duesSheet.name,
                      room: duesSheet.room || 'Room 104 - AC Double',
                      month: ph.month,
                      date: ph.date,
                      paymentMode: ph.mode,
                      receivedBy: 'Ravi Kumar (Manager)',
                      items: [
                        { label: 'Room Rent', amount: Math.round(amtVal * 0.6) },
                        { label: 'Amenities', amount: Math.round(amtVal * 0.1) },
                        { label: 'Food Charge', amount: Math.round(amtVal * 0.1) },
                        { label: 'Meter Unit', amount: Math.round(amtVal * 0.1) },
                        { label: 'Laundry', amount: Math.round(amtVal * 0.05) },
                        { label: 'House Keeping', amount: Math.round(amtVal * 0.05) },
                        { label: 'Other Charges', amount: 0 },
                      ],
                      totalAmount: amtVal,
                      pendingAmount: 0,
                    })} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 16px', borderBottom: i < duesSheet.payHistory.length - 1 ? '1px solid #e2e8f0' : 'none', cursor: 'pointer' }}>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>{ph.month}</p>
                        <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{ph.date} · {ph.mode}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: '0 0 2px' }}>₹{ph.amount}</p>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: ph.status === 'Paid' ? '#ecfdf5' : '#fffbeb', color: payStatusColor(ph.status) }}>{ph.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Info Row */}
              <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
                <div style={{ flex: 1, background: '#f8fafc', borderRadius: 12, padding: '12px 14px', border: '1px solid #e2e8f0' }}>
                  <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 4px', fontWeight: 700, textTransform: 'uppercase' }}>Phone</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>{duesSheet.phone}</p>
                </div>
                <div style={{ flex: 1, background: '#f8fafc', borderRadius: 12, padding: '12px 14px', border: '1px solid #e2e8f0' }}>
                  <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 4px', fontWeight: 700, textTransform: 'uppercase' }}>Member Since</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>{duesSheet.joinDate}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── HERO HEADER ── */}
      <div style={{ background: 'linear-gradient(160deg, #0c1a2e 0%, #0f2847 60%, #0c3461 100%)', padding: '0 20px 28px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(56,189,248,0.12)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -20, left: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(99,102,241,0.1)', pointerEvents: 'none' }} />

        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16 }}>
          <button onClick={() => setSidebarOpen(true)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>menu</span>
          </button>
          <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 22, fontWeight: 800, color: '#38bdf8', margin: 0 }}>Febebo</p>
          <button onClick={() => navigate('/request-box')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white', position: 'relative' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>notifications</span>
            <span style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, background: '#f43f5e', borderRadius: '50%', border: '2px solid #0f2847' }} />
          </button>
        </div>

        {/* Welcome */}
        <div style={{ marginTop: 24, marginBottom: 28 }}>
          <p style={{ color: '#94a3b8', fontSize: 13, margin: '0 0 4px' }}>Good Morning 👋</p>
          <h2 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", color: 'white', fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
            Admin <span style={{ color: '#38bdf8' }}>Pawan</span>
          </h2>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>Here's what's happening today</p>
        </div>

        {/* 4 Stat Pills — all clickable */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {STATS.map((s, i) => (
            <div key={i} onClick={() => navigate(STAT_ROUTES[s.label])}
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', transition: 'background 0.2s', WebkitTapHighlightColor: 'transparent' }}
              onTouchStart={e => e.currentTarget.style.background = 'rgba(255,255,255,0.14)'}
              onTouchEnd={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}>
              <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: s.color }}>{s.icon}</span>
              </div>
              <div>
                <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", color: 'white', fontSize: 17, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>{s.value}</p>
                <p style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>{s.label}</p>
              </div>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>chevron_right</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── SCROLLABLE BODY ── */}
      <div style={{ padding: '20px 16px' }}>

        {/* Management Modules */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: 18, color: '#0f172a', margin: 0 }}>Modules</p>
          <span onClick={() => setShowAllModules(true)} style={{ fontSize: 12, color: '#0891b2', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}>
            See all <span className="material-symbols-outlined" style={{ fontSize: 14 }}>expand_more</span>
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 28 }}>
          {VISIBLE_MODULES.map(mod => (
            <button key={mod.id} onClick={() => routes[mod.id] && navigate(routes[mod.id])}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'white', border: '1px solid #e2e8f0', borderRadius: 16, padding: '14px 6px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              onTouchStart={e => e.currentTarget.style.transform = 'scale(0.95)'}
              onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}>
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
            <div key={i} onClick={() => setDuesSheet(d)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', borderBottom: i < DUES.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', background: d.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 15, fontWeight: 700, color: 'white' }}>
                  {d.img ? <img src={d.img} alt={d.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : d.initials}
                </div>
                <div>
                  <p style={{ fontWeight: 700, color: '#0f172a', fontSize: 14, margin: 0 }}>{d.name}</p>
                  <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0' }}>Room {d.room} · {d.plan}</p>
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

      {/* ── Chat FAB only (+ button removed) ── */}
      <button onClick={() => navigate('/chat')}
        style={{ position: 'fixed', right: 20, bottom: 80, width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,#ec4899,#db2777)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(236,72,153,0.4)', cursor: 'pointer', zIndex: 40 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 24 }}>chat</span>
      </button>

      {/* ── BOTTOM NAV ── */}
      <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '8px 0 20px', zIndex: 50 }}>
        {[
          { tab: 'home',    icon: 'home',            label: 'Dashboard', path: '/admin-dashboard' },
          { tab: 'pending', icon: 'pending_actions', label: 'Pending',   path: '/staff-work' },
          { tab: 'review',  icon: 'rate_review',     label: 'Review',    path: '/complain' },
          { tab: 'profile', icon: 'person',          label: 'Profile',   path: '/admin-profile' },
        ].map(item => (
          <div key={item.tab} onClick={() => { setActiveTab(item.tab); if (item.path) navigate(item.path); }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '4px 16px', cursor: 'pointer', color: activeTab === item.tab ? '#0891b2' : '#94a3b8', transition: 'color 0.2s' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 24, fontVariationSettings: activeTab === item.tab ? "'FILL' 1" : "'FILL' 0" }}>
              {item.icon}
            </span>
            <span style={{ fontSize: 10, fontWeight: activeTab === item.tab ? 700 : 500 }}>{item.label}</span>
          </div>
        ))}
      </nav>

      {/* Modals for Detailed Receipt Breakdown */}
      {activeReceipt && (
        <DetailedReceiptModal receipt={activeReceipt} onClose={() => setActiveReceipt(null)} />
      )}

      {collectModalData && (
        <CollectPaymentModal
          dueData={collectModalData}
          onClose={() => setCollectModalData(null)}
          onConfirm={(newReceipt) => {
            setCollectModalData(null);
            if (duesSheet) {
              setDuesSheet(prev => ({
                ...prev,
                amount: newReceipt.pendingAmount,
                payHistory: [
                  { month: newReceipt.month, date: newReceipt.date, amount: newReceipt.totalAmount, mode: newReceipt.paymentMode, status: 'Paid' },
                  ...prev.payHistory
                ]
              }));
            }
            setActiveReceipt(newReceipt);
          }}
        />
      )}
    </div>
  );
}
