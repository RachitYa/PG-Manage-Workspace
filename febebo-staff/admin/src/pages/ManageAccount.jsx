import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DetailedReceiptModal, { CollectPaymentModal } from '../components/DetailedReceiptModal';

const MODULES = [
  { id: 'total-rents',   label: 'Total\nRents',         icon: 'account_balance_wallet', gradient: 'linear-gradient(135deg,#0ea5e9,#0891b2)' },
  { id: 'vendor',        label: 'Vendor\nAccount',       icon: 'local_shipping',         gradient: 'linear-gradient(135deg,#8b5cf6,#7c3aed)' },
  { id: 'profit-loss',   label: 'Profit-Loss\nAccount', icon: 'trending_up',            gradient: 'linear-gradient(135deg,#10b981,#059669)' },
  { id: 'user-account',  label: 'User\nAccount',         icon: 'groups',                 gradient: 'linear-gradient(135deg,#f59e0b,#d97706)' },
  { id: 'staff-account', label: 'Staff\nAccount',        icon: 'badge',                  gradient: 'linear-gradient(135deg,#f43f5e,#e11d48)' },
  { id: 'lease-account', label: 'Lease\nAccount',        icon: 'receipt_long',           gradient: 'linear-gradient(135deg,#64748b,#475569)' },
  { id: 'petty-cash',    label: 'Petty\nCash',           icon: 'payments',               gradient: 'linear-gradient(135deg,#d97706,#b45309)' },
];

const RENT_DATA = {
  upcoming: [
    { name: 'Rahul Rastogi',  room: '103', amount: '8,000',  date: 'Due: 10 Jul 2025', initials: 'RR', color: '#6366f1' },
    { name: 'Priya Sharma',   room: '202', amount: '6,500',  date: 'Due: 12 Jul 2025', initials: 'PS', color: '#0891b2' },
    { name: 'Ravi Mehta',     room: '301', amount: '7,000',  date: 'Due: 15 Jul 2025', initials: 'RM', color: '#059669' },
    { name: 'Sneha Kapoor',   room: '205', amount: '9,000',  date: 'Due: 18 Jul 2025', initials: 'SK', color: '#d97706' },
  ],
  pending: [
    { name: 'Amit Sachdeva',  room: '104', amount: '10,000', date: 'Was Due: 5 Jun 2025',  initials: 'AS', color: '#e11d48' },
    { name: 'Nikhil Bose',    room: '108', amount: '8,000',  date: 'Was Due: 10 Jun 2025', initials: 'NB', color: '#dc2626' },
    { name: 'Karan Singh',    room: '201', amount: '7,500',  date: 'Was Due: 15 Jun 2025', initials: 'KS', color: '#b91c1c' },
  ],
  collected: [
    { name: 'Deepak Verma',   room: '102', amount: '8,000',  date: 'Paid: 2 Jun 2025',  initials: 'DV', color: '#059669' },
    { name: 'Anjali Rao',     room: '106', amount: '6,000',  date: 'Paid: 5 Jun 2025',  initials: 'AR', color: '#10b981' },
    { name: 'Suresh Nair',    room: '304', amount: '9,500',  date: 'Paid: 8 Jun 2025',  initials: 'SN', color: '#34d399' },
    { name: 'Meena Joshi',    room: '401', amount: '7,000',  date: 'Paid: 10 Jun 2025', initials: 'MJ', color: '#059669' },
  ],
};

const TABS = [
  { key: 'upcoming',  label: 'Upcoming Rent',  color: '#0891b2' },
  { key: 'pending',   label: 'Pending',         color: '#e11d48' },
  { key: 'collected', label: 'Collected',        color: '#059669' },
];

const PROFIT_LOSS_DATA = [
  { id: 'jul25', month: 'July 2025', net: 5000, type: 'profit', details: { rent: 25000, staff: 10000, inventory: 5000, maintenance: 5000 } },
  { id: 'aug25', month: 'August 2025', net: -2000, type: 'loss', details: { rent: 20000, staff: 10000, inventory: 8000, maintenance: 4000 } },
  { id: 'sep25', month: 'September 2025', net: 8000, type: 'profit', details: { rent: 28000, staff: 10000, inventory: 6000, maintenance: 4000 } },
];

const USER_DATA = [
  { id: 1, name: 'Ravi Kumar',   room: '102', bed: '2', phone: '+91 9234567681', img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop' },
  { id: 2, name: 'Priya Sharma', room: '103', bed: '3', phone: '+91 9212345671', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop' },
  { id: 3, name: 'Amit Verma',   room: '102', bed: '1', phone: '+91 9198765432', img: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=100&h=100&fit=crop' },
];

const STAFF_DATA = [
  { id: 1, name: 'Sachin Kumar',  empId: '#1234567', role: 'House Keeping', email: 'sachin@gmail.com',  phone: '+91 9234567681', img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop', salary: 25000 },
  { id: 2, name: 'Ramesh Gupta',  empId: '#1234568', role: 'Security',      email: 'ramesh@gmail.com',  phone: '+91 9234567682', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop', salary: 22000 },
  { id: 3, name: 'Sunita Devi',   empId: '#1234569', role: 'Cook',          email: 'sunita@gmail.com',  phone: '+91 9234567683', img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop', salary: 20000 },
  { id: 4, name: 'Mohan Lal',     empId: '#1234570', role: 'Maintenance',   email: 'mohan@gmail.com',   phone: '+91 9234567684', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop', salary: 18000 },
];

const LEASE_DATA = [
  { month: 'January 2025',   amount: '25,000' },
  { month: 'February 2025',  amount: '25,000' },
  { month: 'March 2025',     amount: '25,000' },
  { month: 'April 2025',     amount: '25,000' },
  { month: 'May 2025',       amount: '25,000' },
  { month: 'June 2025',      amount: '25,000' },
  { month: 'July 2025',      amount: '25,000' },
  { month: 'August 2025',    amount: '25,000' },
  { month: 'September 2025', amount: '25,000' },
  { month: 'October 2025',   amount: '25,000' },
  { month: 'November 2025',  amount: '25,000' },
];

// User payment months dummy data
const USER_MONTHS = [
  { month: 'January 2025',   amount: 10000, paid: true  },
  { month: 'February 2025',  amount: 10000, paid: true  },
  { month: 'March 2025',     amount: 10000, paid: true  },
  { month: 'April 2025',     amount: 10000, paid: true  },
  { month: 'May 2025',       amount: 10000, paid: true  },
  { month: 'June 2025',      amount: 10000, paid: true  },
  { month: 'July 2025',      amount: 10000, paid: false },
  { month: 'August 2025',    amount: 10000, paid: false },
  { month: 'September 2025', amount: 10000, paid: false },
  { month: 'October 2025',   amount: 10000, paid: false },
  { month: 'November 2025',  amount: 10000, paid: false },
  { month: 'December 2025',  amount: 10000, paid: false },
];

// User receipt breakdown
const USER_RECEIPT_ITEMS = [
  { label: 'Amenities',     amount: 1000 },
  { label: 'Food Charge',   amount: 25 },
  { label: 'Meter Unit',    amount: 1000 },
  { label: 'Laundry',       amount: 1500 },
  { label: 'House Keeping', amount: 1000 },
  { label: 'Other Charges', amount: 3000 },
];

// Staff calendar data
const STAFF_CALENDAR = {
  year: 2025,
  monthIndex: 1, // February
  present: 22,
  absent: 6,
  days: {
    3: 'present', 4: 'present', 5: 'present', 6: 'present', 7: 'present',
    10: 'present', 11: 'present', 12: 'present', 13: 'present', 14: 'absent',
    17: 'present', 18: 'present', 19: 'present', 20: 'absent', 21: 'present',
    24: 'present', 25: 'present', 26: 'absent', 27: 'present', 28: 'present',
  }
};

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_FULL  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_FULL    = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

// ─── Small reusable header ─────────────────────────────────────────────────────
function SubHeader({ title, onBack, color = '#0891b2' }) {
  return (
    <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color, position: 'relative', zIndex: 10 }}>
        <span className="material-symbols-outlined">arrow_back_ios_new</span>
      </button>
      <p style={{ fontWeight: 700, fontSize: 18, color, margin: 0, flex: 1, textAlign: 'center', marginLeft: -24 }}>{title}</p>
      <div style={{ width: 24 }} />
    </div>
  );
}

// ─── Calendar component ────────────────────────────────────────────────────────
function AttendanceCalendar({ year, monthIndex, days }) {
  const [cur, setCur] = useState({ y: year, m: monthIndex });
  const firstDay = new Date(cur.y, cur.m, 1).getDay(); // 0=Sun
  // Convert Sunday=0 to Mon-first grid
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(cur.y, cur.m + 1, 0).getDate();

  const prev = () => setCur(c => c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 });
  const next = () => setCur(c => c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 });

  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 16, padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button onClick={prev} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, padding: '4px 8px', cursor: 'pointer', display: 'flex' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#64748b' }}>chevron_left</span>
        </button>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{MONTHS_FULL[cur.m]} {cur.y}</span>
        <button onClick={next} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, padding: '4px 8px', cursor: 'pointer', display: 'flex' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#64748b' }}>chevron_right</span>
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {DAYS_FULL.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#94a3b8', paddingBottom: 4 }}>{d}</div>
        ))}
        {cells.map((day, i) => {
          const status = day ? days[day] : null;
          const isPresent = status === 'present';
          const isAbsent  = status === 'absent';
          return (
            <div key={i} style={{ textAlign: 'center', padding: '4px 2px' }}>
              {day ? (
                <div style={{
                  width: 26, height: 26, margin: '0 auto', borderRadius: '50%',
                  background: isPresent ? '#0891b2' : isAbsent ? '#fee2e2' : 'transparent',
                  color: isPresent ? 'white' : isAbsent ? '#e11d48' : '#475569',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: isPresent || isAbsent ? 700 : 400,
                }}>
                  {day}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── PETTY CASH VIEW ─────────────────────────────────────────────────────────
const EXPENSE_CATS = ['Maintenance', 'Groceries', 'Utilities', 'Cleaning', 'Stationery', 'Other'];
const INIT_EXPENSES = [
  { id: 1, desc: 'Lock repair - Room 103', amount: 200, cat: 'Maintenance', date: '20 Jul 2025' },
  { id: 2, desc: 'Cleaning supplies', amount: 450, cat: 'Cleaning', date: '19 Jul 2025' },
  { id: 3, desc: 'Electricity top-up', amount: 1000, cat: 'Utilities', date: '18 Jul 2025' },
];

function PettyCashView({ onBack }) {
  const [expenses, setExpenses] = useState(INIT_EXPENSES);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ desc: '', amount: '', cat: 'Maintenance', date: new Date().toISOString().split('T')[0] });

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  const addExpense = () => {
    if (!form.desc || !form.amount) return;
    setExpenses(prev => [{ id: Date.now(), ...form }, ...prev]);
    setForm({ desc: '', amount: '', cat: 'Maintenance', date: new Date().toISOString().split('T')[0] });
    setShowForm(false);
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 40 }}>
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div onClick={() => setShowForm(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)' }} />
          <div style={{ position: 'relative', background: 'white', borderRadius: '24px 24px 0 0', padding: '20px 20px 40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>Add Expense</p>
              <button onClick={() => setShowForm(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#475569' }}>close</span>
              </button>
            </div>
            {[{ label: 'Description', key: 'desc', type: 'text', placeholder: 'e.g. Lock repair Room 103' },
              { label: 'Amount (₹)', key: 'amount', type: 'number', placeholder: 'e.g. 200' }
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>{f.label}</label>
                <input value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} type={f.type}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: '#f8fafc' }} />
              </div>
            ))}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Category</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {EXPENSE_CATS.map(c => (
                  <button key={c} onClick={() => setForm(p => ({ ...p, cat: c }))}
                    style={{ padding: '6px 12px', borderRadius: 20, border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', background: form.cat === c ? '#0891b2' : '#f1f5f9', color: form.cat === c ? 'white' : '#475569' }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Date</label>
              <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: '#f8fafc' }} />
            </div>
            <button onClick={addExpense} style={{ width: '100%', padding: '14px 0', background: 'linear-gradient(135deg,#d97706,#b45309)', color: 'white', border: 'none', borderRadius: 14, fontWeight: 800, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>
              Add Expense
            </button>
          </div>
        </div>
      )}

      <SubHeader title="Petty Cash" onBack={onBack} />
      <div style={{ background: 'linear-gradient(135deg,#d97706,#b45309)', margin: '16px 16px 0', borderRadius: 16, padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600, margin: '0 0 4px', textTransform: 'uppercase' }}>Total This Month</p>
          <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 30, fontWeight: 800, color: 'white', margin: 0 }}>₹{total.toLocaleString('en-IN')}</p>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: '4px 0 0' }}>{expenses.length} expenses logged</p>
        </div>
        <button onClick={() => setShowForm(true)} style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 12, padding: '10px 16px', color: 'white', fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span> Add
        </button>
      </div>

      <div style={{ padding: '16px 16px' }}>
        <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: 16, color: '#0f172a', margin: '0 0 12px' }}>Recent Expenses</p>
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {expenses.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#e2e8f0' }}>receipt</span>
              <p style={{ color: '#94a3b8', fontSize: 14, margin: '8px 0 0' }}>No expenses yet. Tap Add to log one.</p>
            </div>
          )}
          {expenses.map((exp, i) => (
            <div key={exp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: i < expenses.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fef9c3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#d97706' }}>receipt</span>
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>{exp.desc}</p>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{exp.cat} · {exp.date}</p>
                </div>
              </div>
              <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 16, fontWeight: 800, color: '#e11d48', margin: 0 }}>-₹{Number(exp.amount).toLocaleString('en-IN')}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ManageAccount() {
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState(null);
  const [rentTab, setRentTab] = useState('upcoming');
  const [search, setSearch] = useState('');
  const [activeReceipt, setActiveReceipt] = useState(null);
  const [collectModalData, setCollectModalData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);

  // User Account drill-down state
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserMonth, setSelectedUserMonth] = useState(null);

  // Staff Account drill-down state
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedStaffMonth, setSelectedStaffMonth] = useState(null);
  const [selectedStaffTransaction, setSelectedStaffTransaction] = useState(null);

  // User filters
  const [fromDate, setFromDate] = useState('2025-01-01');
  const [toDate,   setToDate]   = useState('2025-12-31');

  const handleModule = (id) => {
    if (id === 'vendor') { navigate('/vendor-transactions'); return; }
    if (id === 'meter-reading') { navigate('/meter-reading'); return; }
    if (['total-rents', 'profit-loss', 'user-account', 'staff-account', 'lease-account', 'petty-cash'].includes(id)) {
      setActiveModule(id);
      setSearch('');
      setSelectedMonth(null);
      setSelectedUser(null);
      setSelectedUserMonth(null);
      setSelectedStaff(null);
      setSelectedStaffMonth(null);
      setSelectedStaffTransaction(null);
      return;
    }
  };

  const currentData = (RENT_DATA[rentTab] || []).filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.room.includes(search)
  );

  const activeTab = TABS.find(t => t.key === rentTab) || TABS[0];

  const renderModuleContent = () => {
    // ── USER ACCOUNT: Receipt / Day view ──────────────────────────────────────
    if (activeModule === 'user-account' && selectedUser && selectedUserMonth) {
    const total = USER_RECEIPT_ITEMS.reduce((s, i) => s + i.amount, 0);
    const pendingAmt = selectedUserMonth.paid ? 0 : 5000;
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 32 }}>
        <SubHeader title="Paid Successfully" onBack={() => setSelectedUserMonth(null)} color="#0891b2" />
        <div style={{ padding: '16px' }}>
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* User info */}
            <div>
              <p style={{ fontWeight: 700, fontSize: 20, margin: '0 0 8px', color: '#0f172a' }}>{selectedUser.name}</p>
              <p style={{ fontSize: 14, color: '#0f172a', margin: 0, fontWeight: 500 }}>Payment: Cash</p>
            </div>
            
            <div style={{ borderTop: '1px solid #cbd5e1' }} />
            
            {/* Received By */}
            <div>
              <p style={{ fontSize: 13, color: '#0f172a', margin: '0 0 6px', fontWeight: 600 }}>Received by</p>
              <p style={{ fontWeight: 700, fontSize: 18, color: '#0f172a', margin: '0 0 6px', display: 'flex', alignItems: 'baseline', gap: 6 }}>
                Ravi Kumar <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>Manager</span>
              </p>
              <p style={{ fontSize: 14, color: '#0f172a', margin: 0, fontWeight: 500 }}>Payment: Cash</p>
            </div>

            <div style={{ borderTop: '1px solid #cbd5e1' }} />
            
            {/* Items list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 0' }}>
              {USER_RECEIPT_ITEMS.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 15, color: '#334155', fontWeight: 500 }}>{item.label} :</span>
                  <span style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>₹ {item.amount.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid #cbd5e1' }} />
            
            {/* Total + pending */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 18, color: '#0f172a' }}>Total</span>
                <span style={{ fontWeight: 700, fontSize: 18, color: '#0f172a' }}>₹ {total.toLocaleString('en-IN')}</span>
              </div>
              {pendingAmt > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: 16, color: '#ef4444' }}>Pending</span>
                  <span style={{ fontWeight: 600, fontSize: 16, color: '#ef4444' }}>₹ {pendingAmt.toLocaleString('en-IN')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── USER ACCOUNT: Monthly Payment List ────────────────────────────────────
  if (activeModule === 'user-account' && selectedUser) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 32 }}>
        <SubHeader title="Monthly Payment List" onBack={() => setSelectedUser(null)} />
        <div style={{ padding: '16px' }}>
          {/* Filter by dates */}
          <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>Filter By</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {[{ label: 'From Date', key: 'from', val: fromDate, set: setFromDate }, { label: 'To Date', key: 'to', val: toDate, set: setToDate }].map(f => (
              <label key={f.key} style={{ display: 'block', background: 'white', border: '1.5px solid #0891b2', borderRadius: 8, padding: '10px 12px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="material-symbols-outlined" style={{ color: '#0891b2', fontSize: 20 }}>calendar_month</span>
                  <div>
                    <p style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}>{f.label}</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0891b2', margin: 0 }}>
                      {new Date(f.val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <input type="date" value={f.val} onChange={e => f.set(e.target.value)} style={{ opacity: 0, position: 'absolute', pointerEvents: 'none' }} />
              </label>
            ))}
          </div>

          {/* Month list */}
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            {USER_MONTHS.map((m, i) => (
              <div key={i} onClick={() => setSelectedUserMonth(m)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: i < USER_MONTHS.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#0891b2' }}>calendar_month</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#0f172a' }}>{m.month}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>₹ {m.amount.toLocaleString('en-IN')}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, background: m.paid ? '#dcfce7' : '#fee2e2', color: m.paid ? '#16a34a' : '#e11d48', padding: '2px 8px', borderRadius: 10 }}>
                    {m.paid ? 'Paid' : 'Due'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── STAFF ACCOUNT: Receipt / Day view ──────────────────────────────────────
  if (activeModule === 'staff-account' && selectedStaff && selectedStaffMonth && selectedStaffTransaction) {
    const total = selectedStaffTransaction.amount;
    const pendingAmt = 0;
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 32 }}>
        <SubHeader title="Paid Successfully" onBack={() => setSelectedStaffTransaction(null)} color="#0891b2" />
        <div style={{ padding: '16px' }}>
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* User info */}
            <div>
              <p style={{ fontWeight: 700, fontSize: 20, margin: '0 0 8px', color: '#0f172a' }}>{selectedStaff.name}</p>
              <p style={{ fontSize: 14, color: '#0f172a', margin: 0, fontWeight: 500 }}>Payment: {selectedStaffTransaction.payMode}</p>
            </div>
            
            <div style={{ borderTop: '1px solid #cbd5e1' }} />
            
            {/* Received By */}
            <div>
              <p style={{ fontSize: 13, color: '#0f172a', margin: '0 0 6px', fontWeight: 600 }}>Payment by</p>
              <p style={{ fontWeight: 700, fontSize: 18, color: '#0f172a', margin: '0 0 6px', display: 'flex', alignItems: 'baseline', gap: 6 }}>
                {selectedStaffTransaction.payer} <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>Manager</span>
              </p>
              <p style={{ fontSize: 14, color: '#0f172a', margin: 0, fontWeight: 500 }}>Payment: {selectedStaffTransaction.payMode}</p>
            </div>

            <div style={{ borderTop: '1px solid #cbd5e1' }} />
            
            {/* Items list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 15, color: '#334155', fontWeight: 500 }}>{selectedStaffTransaction.type.split(',')[0].replace('/Paid', '')} :</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>₹ {selectedStaffTransaction.amount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #cbd5e1' }} />
            
            {/* Total + pending */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 18, color: '#0f172a' }}>Total</span>
                <span style={{ fontWeight: 700, fontSize: 18, color: '#0f172a' }}>₹ {total.toLocaleString('en-IN')}</span>
              </div>
              {pendingAmt > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: 16, color: '#ef4444' }}>Pending</span>
                  <span style={{ fontWeight: 600, fontSize: 16, color: '#ef4444' }}>₹ {pendingAmt.toLocaleString('en-IN')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── STAFF ACCOUNT: Day-wise transaction view ───────────────────────────────
  if (activeModule === 'staff-account' && selectedStaff && selectedStaffMonth) {
    const days = [
      { date: '1 Jan 2025', payMode: 'Cash', payer: 'Diwan Kumar', type: 'Advance/Paid', amount: 25000, label: 'Payment Moor Cash' },
      { date: '1 Jan 2025', payMode: 'Cash', payer: 'Diwan Kumar', type: 'Salary, Paid',  amount: 25000, label: 'Payment Moor Cash' },
      { date: '5 Jan 2025', payMode: 'UPI',  payer: 'Ravi Manager', type: 'Salary, Paid', amount: 25000, label: 'Payment via UPI' },
    ];
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 32 }}>
        <SubHeader title="Staff Transaction" onBack={() => setSelectedStaffMonth(null)} color="#0891b2" />
        <div style={{ padding: '16px' }}>
          {days.map((d, i) => (
            <div key={i} onClick={() => setSelectedStaffTransaction(d)} style={{ cursor: 'pointer', background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: '12px 14px', marginBottom: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#0891b2' }}>calendar_today</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{d.date}</span>
                  </div>
                  <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 2px' }}>🏧 {d.label}</p>
                  <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 12, verticalAlign: 'middle' }}>person</span> Payment By: {d.payer}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', margin: '0 0 4px' }}>₹ {d.amount.toLocaleString('en-IN')}</p>
                  <span style={{ fontSize: 11, fontWeight: 700, background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: 10 }}>{d.type}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── STAFF ACCOUNT: Calendar + Monthly list ────────────────────────────────
  if (activeModule === 'staff-account' && selectedStaff) {
    const staffMonths = [
      { month: 'January 2025',   amount: selectedStaff.salary },
      { month: 'February 2025',  amount: selectedStaff.salary },
      { month: 'March 2025',     amount: selectedStaff.salary },
      { month: 'April 2025',     amount: selectedStaff.salary },
      { month: 'May 2025',       amount: selectedStaff.salary },
      { month: 'June 2025',      amount: selectedStaff.salary },
      { month: 'July 2025',      amount: selectedStaff.salary },
      { month: 'August 2025',    amount: selectedStaff.salary },
      { month: 'September 2025', amount: selectedStaff.salary },
      { month: 'October 2025',   amount: selectedStaff.salary },
      { month: 'November 2025',  amount: selectedStaff.salary },
      { month: 'December 2025',  amount: selectedStaff.salary },
    ];
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 32 }}>
        <SubHeader title="Staff Transaction" onBack={() => setSelectedStaff(null)} color="#0891b2" />
        <div style={{ padding: '16px' }}>
          {/* Monthly salary banner */}
          <div style={{ background: 'white', borderRadius: 12, padding: '14px 16px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>Monthly Salary</span>
            <span style={{ fontSize: 17, fontWeight: 800, color: '#0891b2' }}>₹ {selectedStaff.salary.toLocaleString('en-IN')}</span>
          </div>

          {/* Present / Absent pills */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div style={{ background: '#ecfeff', border: '1px solid #a5f3fc', borderRadius: 12, padding: '12px', textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: '#0891b2', fontWeight: 600, margin: '0 0 4px' }}>Present</p>
              <p style={{ fontSize: 24, fontWeight: 800, color: '#0891b2', margin: 0 }}>{STAFF_CALENDAR.present}</p>
            </div>
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px', textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: '#e11d48', fontWeight: 600, margin: '0 0 4px' }}>Absent</p>
              <p style={{ fontSize: 24, fontWeight: 800, color: '#e11d48', margin: 0 }}>{STAFF_CALENDAR.absent}</p>
            </div>
          </div>

{/* Calendar */}
          <AttendanceCalendar year={STAFF_CALENDAR.year} monthIndex={STAFF_CALENDAR.monthIndex} days={STAFF_CALENDAR.days} />

          {/* Monthly list */}
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            {staffMonths.map((m, i) => (
              <div key={i} onClick={() => setSelectedStaffMonth(m)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 16px', borderBottom: i < staffMonths.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#0891b2' }}>calendar_month</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#0f172a' }}>{m.month}</span>
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>₹ {m.amount.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
    // ── USER ACCOUNT: Receipt / Day view ──────────────────────────────────────
    if (activeModule === 'user-account' && selectedUser && selectedUserMonth) {
      const total = USER_RECEIPT_ITEMS.reduce((s, i) => s + i.amount, 0);
      const pendingAmt = selectedUserMonth.paid ? 0 : 5000;
      return (
        <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 32 }}>
          <SubHeader title="Paid Successfully" onBack={() => setSelectedUserMonth(null)} color="#0891b2" />
          <div style={{ padding: '16px' }}>
            <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* User info */}
              <div>
                <p style={{ fontWeight: 700, fontSize: 20, margin: '0 0 8px', color: '#0f172a' }}>{selectedUser.name}</p>
                <p style={{ fontSize: 14, color: '#0f172a', margin: 0, fontWeight: 500 }}>Payment: Cash</p>
              </div>
              
              <div style={{ borderTop: '1px solid #cbd5e1' }} />
              
              {/* Received By */}
              <div>
                <p style={{ fontSize: 13, color: '#0f172a', margin: '0 0 6px', fontWeight: 600 }}>Received by</p>
                <p style={{ fontWeight: 700, fontSize: 18, color: '#0f172a', margin: '0 0 6px', display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  Ravi Kumar <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>Manager</span>
                </p>
                <p style={{ fontSize: 14, color: '#0f172a', margin: 0, fontWeight: 500 }}>Payment: Cash</p>
              </div>

              <div style={{ borderTop: '1px solid #cbd5e1' }} />
              
              {/* Items list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 0' }}>
                {USER_RECEIPT_ITEMS.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 15, color: '#334155', fontWeight: 500 }}>{item.label} :</span>
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>₹ {item.amount.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px solid #cbd5e1' }} />
              
              {/* Total + pending */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 17, color: '#0f172a', fontWeight: 700 }}>Total</span>
                  <span style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>₹ {total.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 15, color: '#059669', fontWeight: 600 }}>Remaining Dues Balance</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#059669' }}>
                    {pendingAmt === 0 ? '✓ Paid' : `₹ ${pendingAmt.toLocaleString('en-IN')}`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // ── USER ACCOUNT: Months view ─────────────────────────────────────────────
    if (activeModule === 'user-account' && selectedUser) {
      return (
        <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 32 }}>
          <SubHeader title="User Account" onBack={() => setSelectedUser(null)} color="#0891b2" />
          <div style={{ padding: '16px' }}>
            <p style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: '0 0 16px' }}>{selectedUser.name}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {USER_MONTHS.map(m => (
                <div key={m.id} onClick={() => setSelectedUserMonth(m)}
                  style={{ background: 'white', border: '1.5px solid #0891b2', borderRadius: 12, padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className="material-symbols-outlined" style={{ color: '#0891b2', fontSize: 20 }}>calendar_month</span>
                    <span style={{ fontWeight: 600, fontSize: 16, color: '#0f172a' }}>{m.month}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: m.paid ? '#059669' : '#e11d48', background: m.paid ? '#ecfdf5' : '#fff1f2', padding: '4px 12px', borderRadius: 20 }}>
                    {m.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // ── STAFF ACCOUNT: Individual ledger ──────────────────────────────────────
    if (activeModule === 'staff-account' && selectedStaff) {
      const activeTabStaff = selectedStaffTab;
      const historyItems = selectedStaff.history[activeTabStaff] || [];
      return (
        <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 32 }}>
          <SubHeader title="Staff Account" onBack={() => setSelectedStaff(null)} color="#f43f5e" />
          <div style={{ padding: '16px' }}>
            <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', padding: 16, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <p style={{ fontWeight: 700, fontSize: 18, color: '#0f172a', margin: '0 0 4px' }}>{selectedStaff.name}</p>
              <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{selectedStaff.role} · Emp ID: {selectedStaff.empId}</p>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {[['salary', 'Salary History'], ['advances', 'Advances / Loans'], ['deductions', 'Deductions']].map(([key, label]) => (
                <button key={key} onClick={() => setSelectedStaffTab(key)}
                  style={{ flex: 1, padding: '10px 4px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, background: activeTabStaff === key ? '#f43f5e' : 'white', color: activeTabStaff === key ? 'white' : '#64748b', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                  {label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {historyItems.map((item, i) => (
                <div key={i} style={{ background: 'white', borderRadius: 12, padding: '14px 16px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', margin: '0 0 2px' }}>{item.month || item.reason}</p>
                    <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>{item.date || item.mode}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 16, color: '#f43f5e', margin: 0 }}>₹{item.amount}</p>
                    <span style={{ fontSize: 11, fontWeight: 700, color: item.status === 'Paid' ? '#059669' : '#d97706' }}>{item.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // ── VENDOR ACCOUNT MODULE ──────────────────────────────────────────────────
    if (activeModule === 'vendor') {
      return (
        <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 32 }}>
          <SubHeader title="Vendor Account" onBack={() => setActiveModule(null)} color="#8b5cf6" />
          <div style={{ padding: '16px' }}>
            <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 16px' }}>Vendor management moved to Dedicated Vendor Portal.</p>
            <button onClick={() => navigate('/vendor-transactions')}
              style={{ width: '100%', padding: 14, background: '#8b5cf6', color: 'white', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
              Open Vendor Transactions Portal →
            </button>
          </div>
        </div>
      );
    }

    // ── USER ACCOUNT: User list view ──────────────────────────────────────────
    if (activeModule === 'user-account') {
      return (
        <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 32 }}>
          <SubHeader title="User Account" onBack={() => setActiveModule(null)} />
          <div style={{ padding: '16px' }}>
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <span className="material-symbols-outlined" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#0891b2', fontSize: 20, pointerEvents: 'none' }}>search</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search Product" style={{ width: '100%', paddingLeft: 40, paddingRight: 16, paddingTop: 12, paddingBottom: 12, border: '1.5px solid #0891b2', borderRadius: 8, fontSize: 15, fontFamily: 'inherit', background: 'white', color: '#1e293b', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {USER_DATA.filter(u => u.name.toLowerCase().includes(search.toLowerCase())).map(u => (
                <div key={u.id} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div onClick={() => setSelectedUser(u)} style={{ display: 'flex', gap: 14, cursor: 'pointer', flex: 1 }}>
                    <img src={u.img} alt={u.name} style={{ width: 80, height: 80, borderRadius: 12, objectFit: 'cover' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 2 }}>
                      <p style={{ fontWeight: 800, fontSize: 15, color: '#0f172a', margin: 0 }}>{u.name}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#475569' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#38bdf8' }}>door_front</span> Room {u.room} · Bed {u.bed}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#475569' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#38bdf8' }}>phone</span> {u.phone}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setCollectModalData({ name: u.name, room: `Room ${u.room}`, amount: 8500, month: 'June 2025' })}
                    style={{ padding: '8px 12px', background: '#0891b2', color: 'white', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, boxShadow: '0 2px 6px rgba(8,145,178,0.2)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>payments</span>
                    Mark Paid
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // ── STAFF ACCOUNT: Staff list view ────────────────────────────────────────
    if (activeModule === 'staff-account') {
      return (
        <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 32 }}>
          <SubHeader title="Staff Account" onBack={() => setActiveModule(null)} color="#f43f5e" />
          <div style={{ padding: '16px' }}>
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <span className="material-symbols-outlined" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#f43f5e', fontSize: 20, pointerEvents: 'none' }}>search</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search Staff..." style={{ width: '100%', paddingLeft: 40, paddingRight: 16, paddingTop: 12, paddingBottom: 12, border: '1.5px solid #f43f5e', borderRadius: 8, fontSize: 15, fontFamily: 'inherit', background: 'white', color: '#1e293b', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {STAFF_DATA.filter(u => u.name.toLowerCase().includes(search.toLowerCase())).map(u => (
                <div key={u.id} onClick={() => setSelectedStaff(u)} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '12px', display: 'flex', gap: 14, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', cursor: 'pointer' }}>
                  <img src={u.img} alt={u.name} style={{ width: 80, height: 80, borderRadius: 12, objectFit: 'cover' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, paddingTop: 2 }}>
                    <p style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', margin: 0 }}>{u.name}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#475569' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#38bdf8' }}>badge</span> {u.empId}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#475569' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#38bdf8' }}>work</span> {u.role}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // ── TOTAL RENTS MODULE ─────────────────────────────────────────────────────
    if (activeModule === 'total-rents') {
      return (
        <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 32 }}>
          <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
            <button onClick={() => setActiveModule(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#0891b2' }}>
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: 18, color: '#0f172a', margin: 0, flex: 1, textAlign: 'center' }}>Total Rents</p>
            <div style={{ width: 32 }} />
          </div>

          <div style={{ padding: '16px' }}>
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <span className="material-symbols-outlined" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#0891b2', fontSize: 20, pointerEvents: 'none' }}>search</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search tenant or room..."
                style={{ width: '100%', paddingLeft: 40, paddingRight: 16, paddingTop: 12, paddingBottom: 12, border: '1.5px solid #0891b2', borderRadius: 12, fontSize: 15, fontFamily: 'inherit', background: 'white', color: '#1e293b', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {TABS.map(tab => (
                <button key={tab.key} onClick={() => setRentTab(tab.key)}
                  style={{ flex: 1, padding: '10px 8px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, background: rentTab === tab.key ? tab.color : 'white', color: rentTab === tab.key ? 'white' : '#64748b', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                  {tab.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {currentData.map((t, i) => {
                const amtVal = parseInt(String(t.amount).replace(/,/g, '')) || 8000;
                const isCollected = rentTab === 'collected';
                return (
                  <div key={i} style={{ background: 'white', borderRadius: 14, padding: '14px 16px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                      <div style={{ width: 42, height: 42, borderRadius: 12, background: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{t.initials}</div>
                      <div>
                        <p style={{ fontWeight: 800, fontSize: 15, color: '#0f172a', margin: '0 0 2px' }}>{t.name}</p>
                        <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 2px' }}>Room {t.room} · {t.date}</p>
                        <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 15, color: activeTab.color }}>₹{t.amount}</span>
                      </div>
                    </div>
                    {isCollected ? (
                      <button onClick={() => setActiveReceipt({ tenantName: t.name, roomNo: `Room ${t.room}`, month: 'June 2025', date: t.date, totalPaid: amtVal, collector: 'Admin', paymentMode: 'UPI', roomRent: amtVal, meterCharge: 0, foodCharge: 0, amenitiesCharge: 0, laundryCharge: 0, housekeepingCharge: 0, otherCharge: 0, remainingDues: 0 })}
                        style={{ padding: '8px 12px', background: '#ecfeff', color: '#0891b2', border: '1px solid #0891b2', borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>receipt_long</span>
                        Receipt
                      </button>
                    ) : (
                      <button onClick={() => setCollectModalData({ name: t.name, room: `Room ${t.room}`, amount: amtVal, month: 'June 2025' })}
                        style={{ padding: '8px 14px', background: '#0891b2', color: 'white', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, boxShadow: '0 2px 6px rgba(8,145,178,0.2)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>payments</span>
                        Mark Paid
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    // ── PROFIT-LOSS MODULE ─────────────────────────────────────────────────────
    if (activeModule === 'profit-loss') {
      return (
        <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 32 }}>
          <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
            <button onClick={() => { setActiveModule(null); setSelectedMonth(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#0891b2' }}>
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: 18, color: '#0f172a', margin: 0, flex: 1, textAlign: 'center' }}>Profit-Loss Account</p>
            <div style={{ width: 32 }} />
          </div>
          <div style={{ padding: '16px' }}>
            {selectedMonth ? (
              <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ padding: '20px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', background: selectedMonth.type === 'profit' ? '#f0fdf4' : '#fff1f2' }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: selectedMonth.type === 'profit' ? '#059669' : '#e11d48', marginBottom: 4 }}>Net {selectedMonth.type === 'profit' ? 'Profit' : 'Loss'}</p>
                  <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 28, fontWeight: 800, color: selectedMonth.type === 'profit' ? '#059669' : '#e11d48', margin: 0 }}>₹{Math.abs(selectedMonth.net).toLocaleString('en-IN')}</p>
                </div>
                <div style={{ padding: '16px' }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Breakdown</p>
                  {[['Rent Collected', selectedMonth.details.rent, '+', '#059669'], ['Paid to Staff', selectedMonth.details.staff, '-', '#e11d48'], ['Inventory', selectedMonth.details.inventory, '-', '#e11d48'], ['Maintenance', selectedMonth.details.maintenance, '-', '#e11d48']].map(([label, val, sign, color]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <span style={{ fontSize: 14, color: '#64748b' }}>{label}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color }}>{sign} ₹{val.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
                <div style={{ padding: '0 16px 16px' }}>
                  <button onClick={() => setSelectedMonth(null)} style={{ width: '100%', padding: 12, background: '#f1f5f9', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', color: '#475569' }}>← Back to List</button>
                </div>
              </div>
            ) : (
              <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                {PROFIT_LOSS_DATA.map((item, i) => (
                  <div key={item.id} onClick={() => setSelectedMonth(item)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: i < PROFIT_LOSS_DATA.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: item.type === 'profit' ? '#ecfdf5' : '#fff1f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="material-symbols-outlined" style={{ color: item.type === 'profit' ? '#059669' : '#e11d48' }}>{item.type === 'profit' ? 'trending_up' : 'trending_down'}</span>
                      </div>
                      <span style={{ fontWeight: 600, color: '#0f172a', fontSize: 15 }}>{item.month}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: 16, margin: 0, color: item.type === 'profit' ? '#059669' : '#e11d48' }}>₹{Math.abs(item.net).toLocaleString('en-IN')}</p>
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0', textTransform: 'capitalize' }}>{item.type}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    // ── PETTY CASH MODULE ─────────────────────────────────────────────────────
    if (activeModule === 'petty-cash') {
      return <PettyCashView onBack={() => setActiveModule(null)} />;
    }

    // ── LEASE ACCOUNT MODULE ───────────────────────────────────────────────────
    if (activeModule === 'lease-account') {
      return (
        <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 32 }}>
          <SubHeader title="Lease Amount" onBack={() => setActiveModule(null)} />
          <div style={{ padding: '16px' }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>Filter By</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[{ label: 'From Date', val: '2025-02-02' }, { label: 'To Date', val: '2025-02-02' }].map((f, idx) => (
                <label key={idx} style={{ display: 'block', background: 'white', border: '1.5px solid #0891b2', borderRadius: 8, padding: '10px 12px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="material-symbols-outlined" style={{ color: '#0891b2', fontSize: 22, fontWeight: 300 }}>calendar_month</span>
                    <div>
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{f.label}</p>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#0891b2', margin: 0 }}>2 Feb 2025</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <div style={{ background: 'white', border: '1.5px solid #0891b2', borderRadius: 8, padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#0891b2', margin: 0 }}>Total Amount</p>
              <p style={{ fontSize: 20, fontWeight: 600, color: '#333', margin: 0 }}>₹ 2,000,000</p>
            </div>
            <div style={{ background: 'white', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              {LEASE_DATA.map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: i < LEASE_DATA.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="material-symbols-outlined" style={{ color: '#0891b2', fontSize: 18, fontWeight: 300 }}>calendar_month</span>
                    <span style={{ fontSize: 15, color: '#000', fontWeight: 500 }}>{row.month}</span>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#000' }}>₹ {row.amount}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // ── Main Account Overview ──────────────────────────────────────────────────
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk',sans-serif" }}>
        <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
          <button onClick={() => navigate('/admin-dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#0891b2' }}>
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: 18, color: '#0f172a', margin: 0, flex: 1, textAlign: 'center' }}>Account</p>
          <div style={{ width: 32 }} />
        </div>

        <div style={{ padding: '20px 16px' }}>
          <div style={{ position: 'relative', marginBottom: 20 }}>
            <span className="material-symbols-outlined" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#0891b2', fontSize: 20, pointerEvents: 'none' }}>search</span>
            <input
              placeholder="Search accounts..."
              style={{ width: '100%', paddingLeft: 40, paddingRight: 16, paddingTop: 12, paddingBottom: 12, border: '1.5px solid #0891b2', borderRadius: 12, fontSize: 15, fontFamily: 'inherit', background: 'white', color: '#1e293b', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {MODULES.map(mod => (
              <button
                key={mod.id}
                onClick={() => handleModule(mod.id)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, padding: '16px 8px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', transition: 'all 0.2s' }}
                onTouchStart={e => e.currentTarget.style.transform = 'scale(0.96)'}
                onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: mod.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'white' }}>{mod.icon}</span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#1e293b', textAlign: 'center', whiteSpace: 'pre-line', lineHeight: 1.3 }}>{mod.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {renderModuleContent()}

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
            setActiveReceipt(newReceipt);
          }}
        />
      )}
    </>
  );
}
