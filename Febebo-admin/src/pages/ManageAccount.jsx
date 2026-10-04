import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs, addDoc, doc, getDoc, updateDoc, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import DetailedReceiptModal, { CollectPaymentModal } from '../components/DetailedReceiptModal';
import PayStaffModal from '../components/PayStaffModal';
import OutstandingDuesModal from '../components/OutstandingDuesModal';
import { aggregateTenantDues, formatCurrency } from '../utils/duesUtils';

const MODULES = [
  { id: 'total-rents',   label: 'Total\nRents',         icon: 'account_balance_wallet', gradient: 'linear-gradient(135deg,#0ea5e9,#0891b2)' },
  { id: 'vendor',        label: 'Vendor\nAccount',       icon: 'local_shipping',         gradient: 'linear-gradient(135deg,#8b5cf6,#7c3aed)' },
  { id: 'profit-loss',   label: 'Profit-Loss\nAccount', icon: 'trending_up',            gradient: 'linear-gradient(135deg,#10b981,#059669)' },
  { id: 'staff-account', label: 'Staff\nAccount',        icon: 'badge',                  gradient: 'linear-gradient(135deg,#f43f5e,#e11d48)' },
  { id: 'lease-account', label: 'Lease\nAccount',        icon: 'receipt_long',           gradient: 'linear-gradient(135deg,#64748b,#475569)' },
  { id: 'petty-cash',    label: 'Petty\nCash',           icon: 'payments',               gradient: 'linear-gradient(135deg,#d97706,#b45309)' },
  { id: 'security-deposits', label: 'Security\nDeposits', icon: 'shield',           gradient: 'linear-gradient(135deg,#3b82f6,#2563eb)' },
];

// RENT_DATA removed - now dynamically fetched

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

// User Dummy Data Removed (USER_DATA, USER_MONTHS, USER_RECEIPT_ITEMS)

const STAFF_DATA = [
  { id: 1, name: 'Sachin Kumar',  empId: '#1234567', role: 'House Keeping', email: 'sachin@gmail.com',  phone: '+91 9234567681', img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop', salary: 25000 },
  { id: 2, name: 'Ramesh Gupta',  empId: '#1234568', role: 'Security',      email: 'ramesh@gmail.com',  phone: '+91 9234567682', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop', salary: 22000 },
  { id: 3, name: 'Sunita Devi',   empId: '#1234569', role: 'Cook',          email: 'sunita@gmail.com',  phone: '+91 9234567683', img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop', salary: 20000 },
  { id: 4, name: 'Mohan Lal',     empId: '#1234570', role: 'Maintenance',   email: 'mohan@gmail.com',   phone: '+91 9234567684', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop', salary: 18000 },
];

// LEASE_DATA removed - now dynamically fetched

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
    <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 , paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))'}}>
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
function PettyCashView({ onBack }) {
  const { user, activePgId } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  // form for allocating cash
  const [form, setForm] = useState({ staffId: '', amount: '', desc: 'Petty Cash Allocation', date: new Date().toISOString().split('T')[0] });
  const [isAllocating, setIsAllocating] = useState(false);
  const [showStaffBalances, setShowStaffBalances] = useState(false);

  // detailed view modal
  const [selectedExpense, setSelectedExpense] = useState(null);

  useEffect(() => {
    if (!user?.uid) return;
    
    const matchesPg = (itemPgId) => {
      if (!activePgId || activePgId === 'primary') return true;
      return !itemPgId || itemPgId === activePgId || itemPgId === user.uid;
    };

    // Fetch Staff List
    const unsubStaff = onSnapshot(query(collection(db, 'staff_tokens'), where('ownerUid', '==', user.uid)), snap => {
      const list = snap.docs
        .map(d => ({
          id: d.data().uid || d.id,
          ...d.data(),
          name: d.data().name || 'Staff'
        }))
        .filter(s => matchesPg(s.pgId));
      setStaffList(list);
      if (list.length > 0 && !form.staffId) {
        setForm(p => ({ ...p, staffId: list[0].id }));
      }
    });

    // Fetch Transactions
    const unsubTx = onSnapshot(query(collection(db, 'petty_cash_transactions'), where('adminId', '==', user.uid)), snap => {
      const txs = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(t => matchesPg(t.pgId));
      setTransactions(txs.sort((a, b) => new Date(b.date) - new Date(a.date)));
      setLoading(false);
    });

    return () => { unsubStaff(); unsubTx(); };
  }, [user, activePgId]);

  // Compute total available petty cash across ALL staff members
  // Sum of allocations - Sum of expenses
  const totalAllocated = transactions.filter(t => t.type === 'allocation').reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalSpent = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalCurrentBalance = totalAllocated - totalSpent;

  // Filter only expenses to show in the list
  const expensesList = transactions.filter(t => t.type === 'expense');

  const getStaffBalance = (staffId) => {
    const sTx = transactions.filter(t => t.staffId === staffId);
    const allocs = sTx.filter(t => t.type === 'allocation').reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const exps = sTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount || 0), 0);
    return allocs - exps;
  };

  const allocateCash = async () => {
    if (!form.staffId || !form.amount) return;
    const selectedStaff = staffList.find(s => s.id === form.staffId);
    if (!selectedStaff) return;
    setIsAllocating(true);

    try {
      await addDoc(collection(db, 'petty_cash_transactions'), {
        type: 'allocation',
        adminId: user.uid, pgId: activePgId, 
        staffId: form.staffId,
        staffName: selectedStaff.name,
        amount: Number(form.amount),
        desc: form.desc,
        date: form.date,
        createdAt: new Date().toISOString()
      });
      setForm({ ...form, amount: '', desc: 'Petty Cash Allocation' });
      setShowForm(false);
    } catch (e) {
      console.error("Error allocating cash:", e);
      alert("Failed to allocate cash");
    } finally {
      setIsAllocating(false);
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 40 }}>
      {/* Allocation Form Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div onClick={() => setShowForm(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)' }} />
          <div style={{ position: 'relative', background: 'white', borderRadius: '24px 24px 0 0', padding: '20px 20px 40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>Allocate Petty Cash</p>
              <button onClick={() => setShowForm(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#475569' }}>close</span>
              </button>
            </div>
            
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Select Staff *</label>
              <select value={form.staffId} onChange={e => setForm(p => ({ ...p, staffId: e.target.value }))}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: '#f8fafc' }}>
                {staffList.length === 0 && <option value="">No staff found</option>}
                {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            
            {[{ label: 'Amount (₹) *', key: 'amount', type: 'number', placeholder: 'e.g. 2000' },
              { label: 'Description', key: 'desc', type: 'text', placeholder: 'e.g. Petty Cash Allocation' }
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>{f.label}</label>
                <input value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} type={f.type}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: '#f8fafc' }} />
              </div>
            ))}
            
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Date</label>
              <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: '#f8fafc' }} />
            </div>
            <button onClick={allocateCash} disabled={isAllocating} style={{ width: '100%', padding: '14px 0', background: 'linear-gradient(135deg,#d97706,#b45309)', color: 'white', border: 'none', borderRadius: 14, fontWeight: 800, fontSize: 15, cursor: isAllocating ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: isAllocating ? 0.7 : 1 }}>
              {isAllocating ? (
                <>
                  <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                  Processing...
                </>
              ) : 'Allocate Cash'}
            </button>
          </div>
        </div>
      )}

      {/* Expense Details Modal */}
      {selectedExpense && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div onClick={() => setSelectedExpense(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)' }} />
          <div style={{ position: 'relative', background: 'white', borderRadius: '24px 24px 0 0', padding: '20px 20px 40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>Expense Details</p>
              <button onClick={() => setSelectedExpense(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#475569' }}>close</span>
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{color:'#64748b'}}>Staff Name</span><span style={{fontWeight:700}}>{selectedExpense.staffName}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{color:'#64748b'}}>Description</span><span style={{fontWeight:700}}>{selectedExpense.desc}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{color:'#64748b'}}>Amount Spent</span><span style={{fontWeight:800, color:'#e11d48'}}>₹{Number(selectedExpense.amount).toLocaleString()}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{color:'#64748b'}}>Date</span><span style={{fontWeight:700}}>{new Date(selectedExpense.date).toLocaleDateString()}</span></div>
              {selectedExpense.paidTo && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{color:'#64748b'}}>Paid To</span><span style={{fontWeight:700}}>{selectedExpense.paidTo}</span></div>}
              {selectedExpense.paymentMode && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{color:'#64748b'}}>Payment Mode</span><span style={{fontWeight:700}}>{selectedExpense.paymentMode}</span></div>}
              {selectedExpense.receiverUpi && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{color:'#64748b'}}>Receiver UPI</span><span style={{fontWeight:700}}>{selectedExpense.receiverUpi}</span></div>}
              <hr style={{ border: 'none', borderTop: '1px dashed #e2e8f0', margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{color:'#0f172a', fontWeight:700}}>Staff's Remaining Balance</span><span style={{fontWeight:800, color:'#0891b2'}}>₹{getStaffBalance(selectedExpense.staffId).toLocaleString()}</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Staff Balances Modal */}
      {showStaffBalances && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div onClick={() => setShowStaffBalances(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)' }} />
          <div style={{ position: 'relative', background: 'white', borderRadius: '24px 24px 0 0', padding: '20px 20px 40px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>Staff Petty Cash Balances</p>
              <button onClick={() => setShowStaffBalances(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#475569' }}>close</span>
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {staffList.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: 14, textAlign: 'center', margin: '20px 0' }}>No staff found.</p>
              ) : (
                staffList.map(s => {
                  const bal = getStaffBalance(s.id);
                  return (
                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#0ea5e9', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16 }}>
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{s.name}</span>
                      </div>
                      <span style={{ fontWeight: 800, color: bal > 0 ? '#10b981' : '#64748b', fontSize: 16 }}>₹{bal.toLocaleString('en-IN')}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      <SubHeader title="Petty Cash" onBack={onBack} />
      <div onClick={() => setShowStaffBalances(true)} style={{ cursor: 'pointer', background: 'linear-gradient(135deg,#d97706,#b45309)', margin: '16px 16px 0', borderRadius: 16, padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600, margin: '0 0 4px', textTransform: 'uppercase' }}>Total Available Balance</p>
          <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 30, fontWeight: 800, color: 'white', margin: 0 }}>₹{totalCurrentBalance.toLocaleString('en-IN')}</p>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: '4px 0 0' }}>Across all staff members</p>
        </div>
        <button onClick={(e) => { e.stopPropagation(); setShowForm(true); }} style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 12, padding: '10px 16px', color: 'white', fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span> Send
        </button>
      </div>

      <div style={{ padding: '16px 16px' }}>
        <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: 16, color: '#0f172a', margin: '0 0 12px' }}>Recent Expenses</p>
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: 30, height: 30, border: '3px solid #e2e8f0', borderTopColor: '#d97706', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            </div>
          ) : expensesList.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#e2e8f0' }}>receipt</span>
              <p style={{ color: '#94a3b8', fontSize: 14, margin: '8px 0 0' }}>No expenses logged by staff yet.</p>
            </div>
          ) : (
            expensesList.map((exp, i) => (
              <div key={exp.id} onClick={() => setSelectedExpense(exp)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: i < expensesList.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fef9c3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#d97706' }}>receipt</span>
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>{exp.desc}</p>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{exp.staffName} · {new Date(exp.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 16, fontWeight: 800, color: '#e11d48', margin: 0 }}>-₹{Number(exp.amount).toLocaleString('en-IN')}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function ManageAccount() {
  const { user, activePgId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeModule, setActiveModule] = useState(location.state?.activeModule || null);
  const [rentTab, setRentTab] = useState(location.state?.rentTab || 'upcoming');
  const [search, setSearch] = useState('');
  const [activeReceipt, setActiveReceipt] = useState(null);
  const [collectModalData, setCollectModalData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);

  // Dynamic Rent Data State
  const [rentData, setRentData] = useState({ upcoming: [], pending: [], collected: [] });
  const [loadingRents, setLoadingRents] = useState(false);
  const [rentRefreshKey, setRentRefreshKey] = useState(0);

  const [pgDetails, setPgDetails] = useState(null);
  const [leasePayments, setLeasePayments] = useState([]);
  const [loadingLease, setLoadingLease] = useState(false);
  const [showAddLeaseModal, setShowAddLeaseModal] = useState(false);

  useEffect(() => {
    if (location.state?.activeModule) {
      setActiveModule(location.state.activeModule);
    }
    if (location.state?.rentTab) {
      setRentTab(location.state.rentTab);
    }
  }, [location.state]);

  useEffect(() => {
    if (activeModule === 'lease-account' && user?.uid) {
      const fetchLeaseData = async () => {
        setLoadingLease(true);
        try {
          // Fetch PG Owner Details
          const pgDoc = await getDoc(activePgId === 'primary' ? doc(db, 'pg_owners', user.uid) : doc(db, 'pg_owners', activePgId));
          if (pgDoc.exists()) {
            const data = pgDoc.data();
            setPgDetails({
              isOnLease: data.propertyDetails?.isOnLease,
              leaseAmount: data.propertyDetails?.leaseAmount
            });
          }

          // Fetch Lease Payments
          const q = query(collection(db, 'lease_payments'), where('adminId', '==', user.uid));
          const snap = await getDocs(q);
          const payments = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(item => {
              if (!activePgId || activePgId === 'primary') return true;
              return !item.pgId || item.pgId === activePgId || item.pgId === user.uid;
            });
          // Sort by date descending
          payments.sort((a, b) => new Date(b.date) - new Date(a.date));
          setLeasePayments(payments);
        } catch (e) {
          console.error("Error fetching lease data:", e);
        } finally {
          setLoadingLease(false);
        }
      };
      fetchLeaseData();
    }
  }, [activeModule, user]);

  useEffect(() => {
    if (activeModule === 'total-rents' && user?.uid) {
      const fetchRentData = async () => {
        setLoadingRents(true);
        try {
          const matchesPg = (itemPgId) => {
            if (!activePgId || activePgId === 'primary') return true;
            return !itemPgId || itemPgId === activePgId || itemPgId === user.uid;
          };

          const now = new Date();
          const currentMonthName = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
          const currentMonthVal = now.toISOString().slice(0, 7);

          // 1. Fetch Registered Tenants for this admin
          const tenantsQ = query(collection(db, 'tenants'), where('adminId', '==', user.uid));
          const tenantsSnap = await getDocs(tenantsQ);
          const tenants = tenantsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(t => matchesPg(t.pgId));

          // Index registered tenants for fast validation and lookup
          const registeredTenantIds = new Set();
          const registeredTenantPhones = new Set();
          const registeredTenantEmails = new Set();
          const registeredTenantNames = new Set();
          const tenantMap = new Map();

          tenants.forEach(t => {
            if (t.id) {
              const tid = String(t.id).trim();
              registeredTenantIds.add(tid);
              tenantMap.set(tid, t);
            }
            if (t.tenantId) {
              const tid = String(t.tenantId).trim();
              registeredTenantIds.add(tid);
              tenantMap.set(tid, t);
            }
            if (t.phone) {
              const digits = String(t.phone).replace(/\D/g, '');
              if (digits.length >= 10) {
                const last10 = digits.slice(-10);
                registeredTenantPhones.add(last10);
                tenantMap.set(`p_${last10}`, t);
              }
            }
            if (t.email) {
              const em = String(t.email).trim().toLowerCase();
              registeredTenantEmails.add(em);
              tenantMap.set(`e_${em}`, t);
            }
            if (t.name) {
              const nm = String(t.name).trim().toLowerCase();
              registeredTenantNames.add(nm);
              if (!tenantMap.has(`n_${nm}`)) {
                tenantMap.set(`n_${nm}`, t);
              }
            }
          });

          // 2. Fetch Receipts (rent_receipts where adminId == user.uid)
          const receiptsQ = query(collection(db, 'rent_receipts'), where('adminId', '==', user.uid));
          const receiptsSnap = await getDocs(receiptsQ);
          const receipts = receiptsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(r => matchesPg(r.pgId));

          // Helper to extract timestamp
          const getTimestamp = (item) => {
            if (item.datePaid) {
              const d = new Date(item.datePaid).getTime();
              if (!isNaN(d)) return d;
            }
            if (item.date) {
              const d = new Date(item.date).getTime();
              if (!isNaN(d)) return d;
            }
            if (item.createdAt?.toDate) return item.createdAt.toDate().getTime();
            if (item.createdAt) {
              const d = new Date(item.createdAt).getTime();
              if (!isNaN(d)) return d;
            }
            if (item.timestamp?.toDate) return item.timestamp.toDate().getTime();
            if (item.timestamp) {
              const d = new Date(item.timestamp).getTime();
              if (!isNaN(d)) return d;
            }
            return 0;
          };

          // Helper to extract month string (e.g. "August 2026")
          const getMonthStr = (item) => {
            if (item.rentMonth && String(item.rentMonth).trim()) return String(item.rentMonth).trim();
            if (item.month && String(item.month).trim()) return String(item.month).trim();
            const ts = getTimestamp(item);
            if (ts > 0) {
              return new Date(ts).toLocaleString('en-US', { month: 'long', year: 'numeric' });
            }
            return '';
          };

          const candidatePayments = [];

          // [SOURCE 1]: Official Rent Receipts
          receipts.forEach(r => {
            const amt = Number(r.totalAmount || r.amountPaid || r.amount || 0);
            if (amt <= 0 || isNaN(amt)) return;

            const rTenantId = String(r.tenantId || r.userId || r.uid || '').trim();
            let matched = null;
            if (rTenantId && registeredTenantIds.has(rTenantId)) {
              matched = tenantMap.get(rTenantId);
            } else if (r.phone || r.tenantPhone) {
              const digits = String(r.phone || r.tenantPhone).replace(/\D/g, '');
              if (digits.length >= 10 && registeredTenantPhones.has(digits.slice(-10))) {
                matched = tenantMap.get(`p_${digits.slice(-10)}`);
              }
            } else if (r.email || r.tenantEmail) {
              const em = String(r.email || r.tenantEmail).trim().toLowerCase();
              if (registeredTenantEmails.has(em)) {
                matched = tenantMap.get(`e_${em}`);
              }
            } else if (r.tenantName || r.name) {
              const nm = String(r.tenantName || r.name).trim().toLowerCase();
              if (registeredTenantNames.has(nm)) {
                matched = tenantMap.get(`n_${nm}`);
              }
            }

            if (!matched) return; // Exclude non-registered payments

            candidatePayments.push({
              priority: 1, // Highest priority
              tenant: matched,
              tenantId: matched.tenantId || matched.id,
              amount: amt,
              rentMonth: getMonthStr(r),
              timestamp: getTimestamp(r),
              transactionId: (r.transactionId && r.transactionId !== '-' && r.transactionId !== 'Paid during admission' && r.transactionId !== 'N/A') ? String(r.transactionId).trim() : '',
              paymentMode: r.paymentMode || 'Online',
              receivedBy: r.receivedBy || 'Admin',
              senderUPI: r.senderUPI || '',
              receiverUPI: r.receiverUPI || '',
              items: r.items || [{ label: 'Room Rent', amount: amt }],
              source: 'receipt',
              raw: r
            });
          });

          // [SOURCE 2]: Payments made by students in the student app (users/{uid}/payments)
          const userPaymentPromises = tenants.map(async (t) => {
            try {
              const uid = t.tenantId || t.id;
              if (!uid) return [];
              const pSnap = await getDocs(collection(db, 'users', uid, 'payments'));
              return pSnap.docs.map(pDoc => ({ id: pDoc.id, tenant: t, ...pDoc.data() }));
            } catch (err) {
              return [];
            }
          });

          const userPaymentResults = await Promise.allSettled(userPaymentPromises);
          userPaymentResults.forEach(res => {
            if (res.status === 'fulfilled' && Array.isArray(res.value)) {
              res.value.forEach(p => {
                const amt = Number(p.amount || p.totalAmount || 0);
                if (amt <= 0 || isNaN(amt)) return;
                const t = p.tenant;
                if (!t) return;

                candidatePayments.push({
                  priority: 2, // Second priority
                  tenant: t,
                  tenantId: t.tenantId || t.id,
                  amount: amt,
                  rentMonth: getMonthStr(p),
                  timestamp: getTimestamp(p),
                  transactionId: (p.transactionId && p.transactionId !== '-' && p.transactionId !== 'Paid during admission' && p.transactionId !== 'N/A') ? String(p.transactionId).trim() : '',
                  paymentMode: p.paymentMode || 'UPI',
                  receivedBy: p.receivedBy || 'Admin',
                  senderUPI: p.senderUPI || p.transactionId || '',
                  receiverUPI: p.receiverUPI || '',
                  items: p.items || [{ label: p.name || 'Room Rent', amount: amt }],
                  source: 'student_payment',
                  raw: p
                });
              });
            }
          });

          // [SOURCE 3]: Registration / Already Resident paid records
          tenants.forEach(t => {
            const amt = Number(t.rentAmount || t.rent || 0);
            if (amt <= 0 || isNaN(amt)) return;

            let dojTs = 0;
            let dojMonth = '';
            if (t.dateOfJoining) {
              const d = new Date(t.dateOfJoining);
              if (!isNaN(d.getTime())) {
                dojTs = d.getTime();
                dojMonth = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
              }
            }

            const currentMonthVal = now.toISOString().slice(0, 7);
            const paidTill = t.paidTillMonth || t.subscribedPG?.paidTillMonth;
            const isCoveredByPaidTill = Boolean(paidTill && paidTill >= (t.dateOfJoining || currentMonthVal).slice(0, 7));

            // Only synthesize admission payment if explicitly covered by paidTillMonth or already resident with no remaining balance
            if (isCoveredByPaidTill || (t.isAlreadyResident && !t.paymentVerificationPending && Number(t.remainingAmount || 0) <= 0)) {
              candidatePayments.push({
                priority: 3, // Registration fallback
                tenant: t,
                tenantId: t.tenantId || t.id,
                amount: amt,
                rentMonth: dojMonth || currentMonthName,
                timestamp: dojTs || Date.now(),
                transactionId: '',
                paymentMode: 'Cash / Registration',
                receivedBy: 'Admin (Registration)',
                senderUPI: 'Paid during admission',
                receiverUPI: '-',
                items: [
                  { label: 'Room Rent', amount: amt },
                  ...(Number(t.securityDeposit || 0) > 0 ? [{ label: 'Security Deposit', amount: Number(t.securityDeposit) }] : [])
                ],
                source: 'registration',
                raw: {
                  tenantId: t.tenantId || t.id,
                  tenantName: t.name,
                  roomNo: t.roomNo,
                  rentMonth: dojMonth || currentMonthName,
                  datePaid: t.dateOfJoining || new Date().toISOString(),
                  paymentMode: 'Cash / Registration',
                  receivedBy: 'Admin (Registration)',
                  senderUPI: 'Paid during admission',
                  receiverUPI: '-',
                  items: [{ label: 'Room Rent', amount: amt }],
                  totalAmount: amt,
                  amountPaid: amt,
                  pendingAmount: 0
                }
              });
            }
          });

          // Sort candidates by priority (receipts first, then student payments, then registration), then by timestamp descending
          candidatePayments.sort((a, b) => {
            if (a.priority !== b.priority) return a.priority - b.priority;
            return b.timestamp - a.timestamp;
          });

          const seenKeys = new Set();
          const collected = [];

          candidatePayments.forEach(p => {
            // Deduplication checks (Prevents repeated payments)
            // 1. By Transaction ID
            if (p.transactionId && seenKeys.has(`txn_${p.transactionId}`)) return;

            // 2. By Tenant + Rent Month + Amount
            if (p.rentMonth && seenKeys.has(`m_${p.tenantId}_${p.rentMonth.toLowerCase().trim()}_${p.amount}`)) return;

            // 3. By Tenant + Date (Day) + Amount
            let dayStr = '';
            if (p.timestamp > 0) {
              dayStr = new Date(p.timestamp).toISOString().split('T')[0];
              if (seenKeys.has(`d_${p.tenantId}_${dayStr}_${p.amount}`)) return;
            }

            // 4. For registration payments: skip if tenant already has ANY payment recorded for this month
            if (p.source === 'registration' && p.rentMonth && seenKeys.has(`tm_${p.tenantId}_${p.rentMonth.toLowerCase().trim()}`)) {
              return;
            }

            // Mark keys as seen
            if (p.transactionId) seenKeys.add(`txn_${p.transactionId}`);
            if (p.rentMonth) {
              seenKeys.add(`m_${p.tenantId}_${p.rentMonth.toLowerCase().trim()}_${p.amount}`);
              seenKeys.add(`tm_${p.tenantId}_${p.rentMonth.toLowerCase().trim()}`);
            }
            if (dayStr) seenKeys.add(`d_${p.tenantId}_${dayStr}_${p.amount}`);

            // Format date for display
            let dateFormatted = 'Paid';
            if (p.timestamp > 0) {
              dateFormatted = `Paid: ${new Date(p.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
            } else if (p.rentMonth) {
              dateFormatted = `Paid for: ${p.rentMonth}`;
            }

            const initials = p.tenant.name
              ? p.tenant.name.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase()
              : '??';

            collected.push({
              name: p.tenant.name || 'Unknown',
              room: p.tenant.roomNo || 'N/A',
              amount: p.amount.toLocaleString('en-IN'),
              date: dateFormatted,
              initials: initials,
              color: '#059669',
              rawReceipt: {
                tenantId: p.tenantId,
                tenantName: p.tenant.name,
                roomNo: p.tenant.roomNo,
                room: p.tenant.roomNo,
                month: p.rentMonth,
                rentMonth: p.rentMonth,
                datePaid: p.timestamp > 0 ? new Date(p.timestamp).toISOString() : (p.raw?.date || new Date().toISOString()),
                date: dateFormatted,
                paymentMode: p.paymentMode,
                receivedBy: p.receivedBy,
                senderUPI: p.senderUPI,
                receiverUPI: p.receiverUPI,
                items: p.items,
                totalAmount: p.amount,
                amountPaid: p.amount,
                pendingAmount: 0
              }
            });
          });

          // Sort collected array by date descending
          collected.sort((a, b) => {
            const timeA = new Date(a.rawReceipt?.datePaid || 0).getTime();
            const timeB = new Date(b.rawReceipt?.datePaid || 0).getTime();
            return timeB - timeA;
          });

          // 4. Process Upcoming and Pending dues for active registered tenants
          const upcoming = [];
          const pending = [];

          tenants.forEach(t => {
            // Exclude tenants who have officially moved out, left, or kicked
            const st = String(t.status || '').toLowerCase().trim();
            if (st === 'removed' || st === 'moved out' || st === 'left' || st === 'kicked') return;

            // Resolve joining date robustly across multiple possible field names
            const joinRaw = t.joiningDate || t.dateOfJoining || t.subscribedPG?.joiningDate || t.subscribedPG?.dateOfJoining || t.createdAt;
            let doj = null;
            if (joinRaw) {
              const parsed = new Date(joinRaw);
              if (!isNaN(parsed.getTime())) doj = parsed;
            }
            if (!doj) doj = new Date(now.getFullYear(), now.getMonth(), 1);

            const tenantKey = t.tenantId || t.id;

            // Check if tenant has remaining unpaid balance from admission / registration
            const remBal = Number(t.remainingAmount || t.subscribedPG?.remainingAmount || 0);
            if (remBal > 0) {
              const remInitials = t.name ? t.name.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() : '??';
              pending.push({
                tenantId: tenantKey,
                month: 'Admission Balance',
                name: t.name || 'Unknown',
                room: t.roomNo || t.room || 'N/A',
                amount: remBal.toLocaleString('en-IN'),
                rent: remBal,
                security: 0,
                date: `Pending Admission Balance`,
                daysOverdue: 1,
                initials: remInitials,
                color: '#e11d48'
              });
            }

            // Check if tenant already has a payment for current month
            const paidTill = t.paidTillMonth || t.subscribedPG?.paidTillMonth;
            const isPaidTillCurrent = Boolean(paidTill && paidTill >= currentMonthVal);

            // Check if this is the tenant's joining month — if so, skip auto-rent
            // (they paid at admission; the rent_receipt for this month is already in collected)
            const joinRawVal = t.joiningDate || t.dateOfJoining || t.subscribedPG?.joiningDate || t.subscribedPG?.dateOfJoining;
            let isJoiningMonth = false;
            if (joinRawVal) {
              // Use ISO slice to avoid timezone issues: "2026-10-01T..." → "2026-10"
              const joinMonthVal = String(joinRawVal).slice(0, 7);
              if (joinMonthVal >= currentMonthVal) isJoiningMonth = true;
            }
            if (isJoiningMonth) return; // First-month tenants: no pending/upcoming rent generated

            const hasPaidThisMonth = isPaidTillCurrent || collected.some(c => {
              const cr = c.rawReceipt;
              const crTenantKey = cr.tenantId || cr.id;
              const isSameTenant = (crTenantKey && tenantKey && crTenantKey === tenantKey) || 
                                   (cr.tenantName && t.name && cr.tenantName.trim().toLowerCase() === t.name.trim().toLowerCase());
              if (!isSameTenant) return false;
              if (cr.rentMonth && cr.rentMonth.toLowerCase() === currentMonthName.toLowerCase()) return true;
              return false;
            });

            // Use t.rent (monthly recurring rent) first; t.rentAmount is the full lease package (includes security etc.)
            const rentAmt = Number(t.rent || t.roomRent || t.monthlyRent || t.subscribedPG?.rent || t.price || t.rentAmount || t.leaseAmount || 0);
            if (rentAmt <= 0) return;
            const amtStr = rentAmt.toLocaleString('en-IN');
            const initials = t.name ? t.name.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() : '??';

            if (hasPaidThisMonth) {
              // Tenant has already paid for the current month -> they appear in Collected!
              // Do NOT push them into Upcoming for next month.
              return;
            }

            // Tenant has NOT paid current month yet
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth();
            const lastDayOfCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
            const dueDay = Math.min(doj.getDate(), lastDayOfCurrentMonth);
            const dueDate = new Date(currentYear, currentMonth, dueDay);
            const todayMidnight = new Date(currentYear, currentMonth, now.getDate());
            const daysDiff = Math.ceil((dueDate.getTime() - todayMidnight.getTime()) / (1000 * 3600 * 24));
            const dueStr = dueDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

            if (daysDiff < 0) {
              // Due date has already passed this month -> Pending
              pending.push({
                tenantId: tenantKey,
                month: currentMonthName,
                name: t.name || 'Unknown',
                room: t.roomNo || t.room || 'N/A',
                amount: amtStr,
                rent: rentAmt,
                security: t.securityDeposit || 0,
                date: `Was Due: ${dueStr}`,
                daysOverdue: Math.abs(daysDiff),
                initials: initials,
                color: '#e11d48'
              });
            } else {
              // Due date is today or coming up later in the current month -> Upcoming
              upcoming.push({
                tenantId: tenantKey,
                month: currentMonthName,
                name: t.name || 'Unknown',
                room: t.roomNo || t.room || 'N/A',
                amount: amtStr,
                rent: rentAmt,
                security: t.securityDeposit || 0,
                date: daysDiff === 0 ? `Due Today (${dueStr})` : `Due: ${dueStr}`,
                daysLeft: daysDiff,
                initials: initials,
                color: daysDiff === 0 ? '#f59e0b' : '#0891b2'
              });
            }
          });

          // Sort Upcoming by soonest due date first; Pending by most overdue first
          upcoming.sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));
          pending.sort((a, b) => (b.daysOverdue ?? 0) - (a.daysOverdue ?? 0));

          setRentData({ upcoming, pending, collected });
        } catch (error) {
          console.error("Error fetching rent data:", error);
        } finally {
          setLoadingRents(false);
        }
      };
      fetchRentData();
    }
  }, [activeModule, user, rentRefreshKey]);

  // User Account drill-down state
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserMonth, setSelectedUserMonth] = useState(null);

  // Staff Account drill-down state
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedStaffMonth, setSelectedStaffMonth] = useState(null);
  const [selectedStaffTransaction, setSelectedStaffTransaction] = useState(null);

  // User Account Dynamic State
  const [usersList, setUsersList] = useState([]);
  const [userReceipts, setUserReceipts] = useState([]);
  const [txSearch, setTxSearch] = useState('');
  const [txSort, setTxSort] = useState('recent');
  const [txMonth, setTxMonth] = useState('');

  const [loadingUsers, setLoadingUsers] = useState(false);
  const [securityRefundModal, setSecurityRefundModal] = useState(null);

  // Outstanding Dues Dynamic State
  const [outstandingDuesList, setOutstandingDuesList] = useState([]);
  const [meterBillsList, setMeterBillsList] = useState([]);
  const [duesRentReceipts, setDuesRentReceipts] = useState([]);
  const [selectedDuesTenant, setSelectedDuesTenant] = useState(null);
  const [duesRefreshKey, setDuesRefreshKey] = useState(0);

  useEffect(() => {
    if ((activeModule === 'user-account' || activeModule === 'security-deposits' || activeModule === 'outstanding-dues') && user?.uid && !selectedUser) {
      const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
          const matchesPg = (itemPgId) => {
            if (!activePgId || activePgId === 'primary') return true;
            return !itemPgId || itemPgId === activePgId || itemPgId === user.uid;
          };
          const q = query(collection(db, 'tenants'), where('adminId', '==', user.uid));
          const snap = await getDocs(q);
          setUsersList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(t => matchesPg(t.pgId)));

          // Also fetch all dues, meter bills, and rent receipts for live dues calculation
          const [dSnap, mSnap, rSnap] = await Promise.all([
            getDocs(query(collection(db, 'outstanding_dues'), where('adminId', '==', user.uid))),
            getDocs(query(collection(db, 'meter_bills'), where('adminId', '==', user.uid))),
            getDocs(query(collection(db, 'rent_receipts'), where('adminId', '==', user.uid)))
          ]);

          setOutstandingDuesList(dSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(d => matchesPg(d.pgId)));
          setMeterBillsList(mSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(m => matchesPg(m.pgId)));
          setDuesRentReceipts(rSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(r => matchesPg(r.pgId)));
        } catch (e) {
          console.error("Error fetching tenants/dues:", e);
        } finally {
          setLoadingUsers(false);
        }
      };
      fetchUsers();
    }
  }, [activeModule, user, selectedUser, activePgId, duesRefreshKey]);

  useEffect(() => {
    if (activeModule === 'user-account' && selectedUser && user?.uid) {
      const fetchReceipts = async () => {
        try {
          const tenantUid = selectedUser.tenantId || selectedUser.id || selectedUser.uid;
          const q = query(collection(db, 'users', tenantUid, 'payments'));
          const snap = await getDocs(q);
          const receipts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          // Sort descending by timestamp or date string
          receipts.sort((a, b) => {
            const dateA = a.createdAt ? (a.createdAt.toMillis ? a.createdAt.toMillis() : a.createdAt) : new Date(a.date).getTime();
            const dateB = b.createdAt ? (b.createdAt.toMillis ? b.createdAt.toMillis() : b.createdAt) : new Date(b.date).getTime();
            return dateB - dateA;
          });
          setUserReceipts(receipts);
        } catch (e) {
          console.error("Error fetching receipts:", e);
        }
      };
      fetchReceipts();
    }
  }, [selectedUser, activeModule, user]);

  // Staff Account Dynamic State
  const [staffList, setStaffList] = useState([]);
  const [staffSalaries, setStaffSalaries] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [staffAttendance, setStaffAttendance] = useState([]); // Attendance for selected staff
  const [payStaffModalData, setPayStaffModalData] = useState(null);

  // Fetch Staff List
  useEffect(() => {
    if (activeModule === 'staff-account' && user?.uid && !selectedStaff) {
      const fetchStaff = async () => {
        setLoadingStaff(true);
        try {
          const matchesPg = (itemPgId) => {
            if (!activePgId || activePgId === 'primary') return true;
            return !itemPgId || itemPgId === activePgId || itemPgId === user.uid;
          };
          const q = query(collection(db, 'staff_tokens'), where('ownerUid', '==', user.uid));
          const snap = await getDocs(q);
          setStaffList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(s => matchesPg(s.pgId)));
        } catch (e) {
          console.error("Error fetching staff:", e);
        } finally {
          setLoadingStaff(false);
        }
      };
      fetchStaff();
    }
  }, [activeModule, user, selectedStaff, activePgId]);

  // Fetch Staff Salaries and Attendance
  useEffect(() => {
    if (activeModule === 'staff-account' && selectedStaff && user?.uid) {
      const fetchData = async () => {
        try {
          const matchesPg = (itemPgId) => {
            if (!activePgId || activePgId === 'primary') return true;
            return !itemPgId || itemPgId === activePgId || itemPgId === user.uid;
          };
          // Fetch Salaries
          const qSalaries = query(collection(db, 'staff_salaries'), where('adminId', '==', user.uid), where('staffId', '==', selectedStaff.id));
          const snapSalaries = await getDocs(qSalaries);
          const salaries = snapSalaries.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(s => matchesPg(s.pgId));
          salaries.sort((a, b) => new Date(b.datePaid) - new Date(a.datePaid));
          setStaffSalaries(salaries);

          // Fetch Attendance
          const qAttendance = query(collection(db, 'staff_attendance'), where('ownerUid', '==', user.uid), where('staffId', '==', selectedStaff.id));
          const snapAttendance = await getDocs(qAttendance);
          const attendance = snapAttendance.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(a => matchesPg(a.pgId));
          setStaffAttendance(attendance);
        } catch (e) {
          console.error("Error fetching staff data:", e);
        }
      };
      fetchData();
    }
  }, [selectedStaff, activeModule, user, activePgId]);

  // Profit-Loss Dynamic State (Live Real-Time)
  const [profitLossData, setProfitLossData] = useState([]);
  const [loadingProfitLoss, setLoadingProfitLoss] = useState(false);

  // Live Profit-Loss Data Calculation with onSnapshot
  useEffect(() => {
    if (activeModule !== 'profit-loss' || !user?.uid) return;
    setLoadingProfitLoss(true);

    const matchesPgItem = (itemPgId) => {
      if (!activePgId || activePgId === 'primary') return true;
      return !itemPgId || itemPgId === activePgId || itemPgId === user.uid;
    };

    let rentDocs = [];
    let staffDocs = [];
    let pettyDocs = [];
    let leaseDocs = [];
    let vendorDocs = [];
    let meterDocs = [];
    let studentPaymentDocs = [];

    const recalculateProfitLoss = () => {
      const monthlyData = {}; // Format: { "June 2026": { rent: 0, meter: 0, staff: 0, petty: 0, pettyDetails: [], lease: 0, vendor: 0, timestamp: 0 } }

      const initMonth = (monthStr, dateObj) => {
        if (!monthlyData[monthStr]) {
          monthlyData[monthStr] = {
            rent: 0,
            meter: 0,
            staff: 0,
            petty: 0,
            pettyDetails: [],
            lease: 0,
            vendor: 0,
            timestamp: dateObj ? dateObj.getTime() : Date.now()
          };
        }
      };

      const seenKeys = new Set();

      // 1. Rent Receipts (Income)
      rentDocs.forEach(r => {
        if (!matchesPgItem(r.pgId)) return;
        const amt = Number(r.totalAmount || r.amountPaid || r.amount || 0);
        if (amt <= 0 || isNaN(amt)) return;

        const dateObj = r.datePaid ? new Date(r.datePaid) : (r.date ? new Date(r.date) : new Date(r.createdAt?.toDate ? r.createdAt.toDate() : (r.createdAt || Date.now())));
        const monthStr = r.rentMonth || (dateObj && !isNaN(dateObj.getTime()) ? dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' }) : 'General');
        initMonth(monthStr, dateObj);

        const key = r.transactionId ? `txn_${r.transactionId}` : `rcpt_${r.id || r.tenantId}_${monthStr}_${amt}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          monthlyData[monthStr].rent += amt;
        }
      });

      // 2. Student app chat payments (Income)
      studentPaymentDocs.forEach(p => {
        if (!matchesPgItem(p.pgId)) return;
        const amt = Number(p.amount || p.amountPaid || p.totalAmount || 0);
        if (amt <= 0 || isNaN(amt)) return;

        const dateObj = p.datePaid ? new Date(p.datePaid) : (p.date ? new Date(p.date) : new Date(p.createdAt?.toDate ? p.createdAt.toDate() : (p.createdAt || Date.now())));
        const monthStr = p.rentMonth || p.month || (dateObj && !isNaN(dateObj.getTime()) ? dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' }) : 'General');
        initMonth(monthStr, dateObj);

        const key = p.transactionId ? `txn_${p.transactionId}` : `pay_${p.tenantId || p.userId}_${monthStr}_${amt}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          if (p.paymentType === 'meter' || (p.name && p.name.toLowerCase().includes('electricity'))) {
            monthlyData[monthStr].meter += amt;
          } else {
            monthlyData[monthStr].rent += amt;
          }
        }
      });

      // 3. Paid Meter Bills (Income)
      meterDocs.forEach(m => {
        if (!matchesPgItem(m.pgId)) return;
        if (m.status !== 'Paid') return;
        const amt = Number(m.totalAmount || m.amount || 0);
        if (amt <= 0 || isNaN(amt)) return;

        const dateObj = m.paidDate ? new Date(m.paidDate) : (m.date ? new Date(m.date) : new Date());
        const monthStr = m.billMonth || (dateObj && !isNaN(dateObj.getTime()) ? dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' }) : 'General');
        initMonth(monthStr, dateObj);

        const key = `meter_${m.id}_${monthStr}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          monthlyData[monthStr].meter += amt;
        }
      });

      // 4. Staff Salaries (Expense)
      staffDocs.forEach(s => {
        if (!matchesPgItem(s.pgId)) return;
        const amt = Number(s.amountPaid || s.amount || 0);
        if (amt <= 0 || isNaN(amt)) return;

        const dateObj = s.datePaid ? new Date(s.datePaid) : (s.date ? new Date(s.date) : new Date());
        const monthStr = s.month || (dateObj && !isNaN(dateObj.getTime()) ? dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' }) : 'General');
        initMonth(monthStr, dateObj);
        monthlyData[monthStr].staff += amt;
      });

      // 5. Petty Cash (Expense)
      pettyDocs.forEach(pt => {
        if (!matchesPgItem(pt.pgId)) return;
        if (pt.type === 'debit') return; // Debit is staff spending from already-allocated cash
        if (pt.type === 'credit' || pt.type === 'allocation' || !pt.type) {
          const amt = Number(pt.amount || 0);
          if (amt <= 0 || isNaN(amt)) return;

          const dateObj = pt.date ? new Date(pt.date) : (pt.createdAt?.toDate ? pt.createdAt.toDate() : new Date());
          const monthStr = dateObj && !isNaN(dateObj.getTime()) ? dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' }) : 'General';
          initMonth(monthStr, dateObj);
          monthlyData[monthStr].petty += amt;
          monthlyData[monthStr].pettyDetails.push({
            staffName: pt.staffName || 'Staff',
            amount: amt,
            date: dateObj
          });
        }
      });

      // 6. PG Property Lease (Expense)
      leaseDocs.forEach(l => {
        if (!matchesPgItem(l.pgId)) return;
        const amt = Number(l.amount || 0);
        if (amt <= 0 || isNaN(amt)) return;

        const dateObj = l.datePaid ? new Date(l.datePaid) : (l.date ? new Date(l.date) : new Date());
        const monthStr = l.month || (dateObj && !isNaN(dateObj.getTime()) ? dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' }) : 'General');
        initMonth(monthStr, dateObj);
        monthlyData[monthStr].lease += amt;
      });

      // 7. Vendor Transactions & PG Maintenance (Expense)
      vendorDocs.forEach(v => {
        if (!matchesPgItem(v.pgId)) return;
        let amt = 0;
        if (v.type === 'payment_out') {
          amt = Number(v.amount || 0);
        } else if (v.isClearing) {
          amt = Number(v.clearedAmount || 0);
        } else if (v.payInfo && v.payInfo.amtNow) {
          amt = Number(v.payInfo.amtNow || 0);
        } else {
          amt = Number(v.amount || 0);
        }
        if (amt <= 0 || isNaN(amt)) return;

        const dateObj = v.date ? new Date(v.date) : (v.createdAt?.toDate ? v.createdAt.toDate() : new Date());
        const monthStr = dateObj && !isNaN(dateObj.getTime()) ? dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' }) : 'General';
        initMonth(monthStr, dateObj);
        monthlyData[monthStr].vendor += amt;
      });

      // Convert to array and calculate Live Net Profit / Loss
      const processedData = Object.keys(monthlyData).map(monthStr => {
        const details = monthlyData[monthStr];
        const totalIncome = details.rent + (details.meter || 0);
        const totalExpenses = details.staff + details.petty + details.lease + details.vendor;
        const net = totalIncome - totalExpenses;
        return {
          id: monthStr,
          month: monthStr,
          type: net >= 0 ? 'profit' : 'loss',
          net: net,
          totalIncome: totalIncome,
          expenses: totalExpenses,
          details: {
            ...details,
            totalIncome
          },
          timestamp: details.timestamp
        };
      });

      processedData.sort((a, b) => b.timestamp - a.timestamp);
      setProfitLossData(processedData);
      setLoadingProfitLoss(false);
    };

    // Set up Real-time Snapshot Listeners
    const unsubRent = onSnapshot(query(collection(db, 'rent_receipts'), where('adminId', '==', user.uid)), (snap) => {
      rentDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      recalculateProfitLoss();
    }, () => setLoadingProfitLoss(false));

    const unsubStaff = onSnapshot(query(collection(db, 'staff_salaries'), where('adminId', '==', user.uid)), (snap) => {
      staffDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      recalculateProfitLoss();
    }, () => setLoadingProfitLoss(false));

    const unsubPetty = onSnapshot(query(collection(db, 'petty_cash_transactions'), where('adminId', '==', user.uid)), (snap) => {
      pettyDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      recalculateProfitLoss();
    }, () => setLoadingProfitLoss(false));

    const unsubLease = onSnapshot(query(collection(db, 'lease_payments'), where('adminId', '==', user.uid)), (snap) => {
      leaseDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      recalculateProfitLoss();
    }, () => setLoadingProfitLoss(false));

    const unsubVendor = onSnapshot(query(collection(db, 'vendor_transactions'), where('adminId', '==', user.uid)), (snap) => {
      vendorDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      recalculateProfitLoss();
    }, () => setLoadingProfitLoss(false));

    const unsubMeter = onSnapshot(query(collection(db, 'meter_bills'), where('adminId', '==', user.uid)), (snap) => {
      meterDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      recalculateProfitLoss();
    }, () => setLoadingProfitLoss(false));

    // Also fetch student app payments
    getDocs(query(collection(db, 'tenants'), where('adminId', '==', user.uid))).then(tSnap => {
      const tenantUids = tSnap.docs.map(d => d.data().tenantId || d.id);
      Promise.all(tenantUids.map(uid => getDocs(collection(db, 'users', uid, 'payments')))).then(allPayments => {
        studentPaymentDocs = allPayments.flatMap(snap => snap.docs.map(d => ({ id: d.id, ...d.data() })));
        recalculateProfitLoss();
      }).catch(() => {});
    }).catch(() => {});

    return () => {
      unsubRent();
      unsubStaff();
      unsubPetty();
      unsubLease();
      unsubVendor();
      unsubMeter();
    };
  }, [activeModule, user, activePgId]);

  const fromDate = '2025-02-02';
  const toDate = '2025-02-02';
  const setFromDate = () => {};
  const setToDate = () => {};

  const handleModule = (id) => {
    if (id === 'vendor') { navigate('/vendor-transactions'); return; }
    if (id === 'meter-reading') { navigate('/meter-reading'); return; }
    if (['total-rents', 'profit-loss', 'user-account', 'staff-account', 'lease-account', 'petty-cash', 'security-deposits'].includes(id)) {
      setActiveModule(id);
      setSearch('');
      setTxSearch('');
      setTxMonth('');
      setTxSort('recent');
      setSelectedMonth(null);
      setSelectedUser(null);
      setSelectedUserMonth(null);
      setSelectedStaff(null);
      setSelectedStaffMonth(null);
      setSelectedStaffTransaction(null);
      return;
    }
  };


  const activeTab = TABS.find(t => t.key === rentTab) || TABS[0];

  const renderModuleContent = () => {
    // ── USER ACCOUNT: Receipt / Day view ──────────────────────────────────────
    if (activeModule === 'user-account' && selectedUser && selectedUserMonth) {
    const receipt = selectedUserMonth; // We pass the actual receipt document to selectedUserMonth
    const items = [
      { label: 'Room Rent', amount: receipt.roomRent || receipt.amountPaid || 0 },
      { label: 'Amenities', amount: receipt.amenitiesCharge || 0 },
      { label: 'Food Charge', amount: receipt.foodCharge || 0 },
      { label: 'Meter Unit', amount: receipt.meterCharge || 0 },
      { label: 'Laundry', amount: receipt.laundryCharge || 0 },
      { label: 'House Keeping', amount: receipt.housekeepingCharge || 0 },
      { label: 'Other Charges', amount: receipt.otherCharge || 0 },
    ].filter(i => i.amount > 0);

    const total = Number(receipt.amount || receipt.amountPaid || receipt.totalAmount || 0);
    const pendingAmt = receipt.remainingDues || 0;
    
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 32 }}>
        <SubHeader title="Paid Successfully" onBack={() => setSelectedUserMonth(null)} color="#0891b2" />
        <div style={{ padding: '16px' }}>
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* User info */}
            <div>
              <p style={{ fontWeight: 700, fontSize: 20, margin: '0 0 8px', color: '#0f172a' }}>{receipt.tenantName || selectedUser.name}</p>
              <p style={{ fontSize: 14, color: '#0f172a', margin: 0, fontWeight: 500 }}>Payment: {receipt.paymentMode || 'N/A'}</p>
            </div>
            
            <div style={{ borderTop: '1px solid #cbd5e1' }} />
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 18, color: '#0f172a' }}>Total Paid</span>
                <span style={{ fontWeight: 700, fontSize: 18, color: '#0f172a' }}>₹ {Number(receipt.amount || receipt.amountPaid || receipt.totalAmount || 0).toLocaleString('en-IN')}</span>
                {receipt.remainingAmount !== undefined && (
                  <span style={{ fontSize: 12, color: '#f59e0b', display: 'block', textAlign: 'right' }}>
                    Bal: ₹ {receipt.remainingAmount}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: 15, color: '#64748b' }}>Date</span>
                <span style={{ fontWeight: 600, fontSize: 15, color: '#0f172a' }}>{receipt.date || (receipt.datePaid ? new Date(receipt.datePaid).toLocaleDateString('en-IN') : 'N/A')}</span>
              </div>
            </div>

            {/* Student Payment Details & Screenshot */}
            {(receipt.screenshot || receipt.remarks || receipt.transactionId) && (
              <>
                <div style={{ borderTop: '1px solid #cbd5e1', marginTop: 8 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 8 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>Student Uploaded Details</p>
                  
                  {receipt.transactionId && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, color: '#64748b' }}>Transaction ID:</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{receipt.transactionId}</span>
                    </div>
                  )}

                  {receipt.remarks && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 13, color: '#64748b', whiteSpace: 'nowrap' }}>Remarks:</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', textAlign: 'right', marginLeft: 16 }}>{receipt.remarks}</span>
                    </div>
                  )}

                  {receipt.screenshot && (
                    <div style={{ marginTop: 8 }}>
                      <p style={{ margin: '0 0 8px', fontSize: 12, color: '#64748b' }}>Payment Screenshot:</p>
                      <img src={receipt.screenshot} alt="Payment Proof" style={{ width: '100%', borderRadius: 12, border: '1px solid #e2e8f0', objectFit: 'contain', maxHeight: 300, background: '#f8fafc' }} />
                    </div>
                  )}
                </div>
              </>
            )}
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
          {/* User Profile Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'white', borderRadius: 16, padding: '16px', marginBottom: 24, boxShadow: '0 4px 16px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9' }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: '#0891b2', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, overflow: 'hidden', flexShrink: 0 }}>
              <img 
                src={selectedUser.kyc?.profilePhoto || selectedUser.image || selectedUser.profilePhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.name || 'User')}&background=0891b2&color=fff&size=150`} 
                alt={selectedUser.name} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: 18, color: '#0f172a', margin: '0 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedUser.name}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#64748b', fontSize: 13, fontWeight: 500 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span className="material-symbols-outlined" style={{ fontSize: 16, color: '#38bdf8' }}>door_front</span> {selectedUser.roomNo ? `Room ${selectedUser.roomNo}` : 'N/A'}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span className="material-symbols-outlined" style={{ fontSize: 16, color: '#38bdf8' }}>call</span> {selectedUser.phone || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Premium Search & Filter Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            {/* Search Bar */}
            <div style={{ display: 'flex', alignItems: 'center', background: 'white', borderRadius: 16, padding: '14px 18px', boxShadow: '0 4px 16px rgba(14, 165, 233, 0.06)', border: '1px solid #bae6fd' }}>
              <span className="material-symbols-outlined" style={{ color: '#0891b2', fontSize: 24, marginRight: 12 }}>search</span>
              <input 
                type="text" 
                placeholder="Search amount or payment method..." 
                value={txSearch} 
                onChange={e => setTxSearch(e.target.value)} 
                style={{ flex: 1, minWidth: 0, padding: 0, border: 'none', outline: 'none', fontSize: 15, background: 'transparent', color: '#0f172a', fontFamily: 'inherit' }}
              />
            </div>
            
            {/* Filters Row */}
            <div style={{ display: 'flex', gap: 10 }}>
              {/* Month Picker - Icon Only */}
              <div title="Filter by Month" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: txMonth ? '#ecfeff' : 'white', borderRadius: 12, width: 44, height: 44, boxShadow: '0 2px 8px rgba(0,0,0,0.03)', border: `1px solid ${txMonth ? '#bae6fd' : '#e2e8f0'}`, flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ color: txMonth ? '#0891b2' : '#64748b', fontSize: 22, pointerEvents: 'none', zIndex: 1 }}>calendar_month</span>
                
                {/* The actual native input, stretched over the entire button, made effectively invisible but fully clickable */}
                <input 
                  type="month" 
                  value={txMonth} 
                  onChange={e => setTxMonth(e.target.value)} 
                  onClick={e => {
                    try {
                      if (e.currentTarget.showPicker) e.currentTarget.showPicker();
                    } catch (err) {}
                  }}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.01, cursor: 'pointer', zIndex: 10, margin: 0, padding: 0 }}
                />

                {txMonth && (
                  <div style={{ position: 'absolute', top: -4, right: -4, background: '#f8fafc', borderRadius: 12, padding: '2px 6px', fontSize: 10, fontWeight: 800, color: '#0891b2', border: '1px solid #bae6fd', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', pointerEvents: 'none', zIndex: 5 }}>
                    {new Date(txMonth + '-01').toLocaleDateString('en-US', { month: 'short' })}
                  </div>
                )}
              </div>

              {/* Sort Picker */}
              <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', background: 'white', borderRadius: 12, padding: '10px 14px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0' }}>
                <span className="material-symbols-outlined" style={{ color: '#64748b', fontSize: 18, marginRight: 8 }}>sort</span>
                <select 
                  value={txSort} 
                  onChange={e => setTxSort(e.target.value)} 
                  style={{ flex: 1, width: '100%', border: 'none', outline: 'none', fontSize: 14, background: 'transparent', color: '#0f172a', fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer', appearance: 'none', zIndex: 1 }}
                >
                  <option value="recent">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
                <span className="material-symbols-outlined" style={{ color: '#94a3b8', fontSize: 16, position: 'absolute', right: 14, pointerEvents: 'none' }}>expand_more</span>
              </div>
            </div>
          </div>

          {/* Month list */}
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            {(() => {
              const filteredReceipts = userReceipts.filter(r => {
                const searchStr = txSearch.toLowerCase();
                const amountStr = (r.amount || r.amountPaid || '').toString();
                const nameStr = (r.name || r.rentMonth || r.paymentType || 'payment').toLowerCase();
                if (searchStr && !amountStr.includes(searchStr) && !nameStr.includes(searchStr)) return false;
                
                if (txMonth) {
                  let rDateObj = null;
                  if (r.datePaid) rDateObj = new Date(r.datePaid);
                  else if (r.date) rDateObj = new Date(r.date);
                  else if (r.createdAt) rDateObj = new Date(r.createdAt.toMillis ? r.createdAt.toMillis() : r.createdAt);
                  
                  if (rDateObj && !isNaN(rDateObj.getTime())) {
                    const rMonth = `${rDateObj.getFullYear()}-${String(rDateObj.getMonth() + 1).padStart(2, '0')}`;
                    if (rMonth !== txMonth) return false;
                  } else {
                    return false;
                  }
                }
                return true;
              }).sort((a, b) => {
                const getMs = (item) => {
                  if (item.createdAt) return item.createdAt.toMillis ? item.createdAt.toMillis() : new Date(item.createdAt).getTime();
                  if (item.datePaid) return new Date(item.datePaid).getTime();
                  if (item.date) return new Date(item.date).getTime();
                  return 0;
                };
                const dateA = getMs(a);
                const dateB = getMs(b);
                return txSort === 'oldest' ? dateA - dateB : dateB - dateA;
              });

              if (filteredReceipts.length === 0) {
                return <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No payment history found.</div>;
              }

              return filteredReceipts.map((r, i) => (
              <div key={r.id} onClick={() => setSelectedUserMonth(r)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: i < userReceipts.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#0891b2' }}>{r.paymentType === 'token' ? 'monetization_on' : 'receipt_long'}</span>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 500, color: '#0f172a' }}>{r.name || r.rentMonth || 'Payment'}</span>
                      {r.paymentType === 'token' && <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: '#fef3c7', color: '#b45309' }}>TOKEN</span>}
                    </div>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>{r.date || (r.datePaid ? new Date(r.datePaid).toLocaleDateString('en-IN') : '')}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>₹ {Number(r.amount || r.amountPaid || 0).toLocaleString('en-IN')}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: 10 }}>
                    Paid
                  </span>
                </div>
              </div>
            ));
            })()}
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


    // ── USER ACCOUNT: Receipt / Day view ──────────────────────────────────────
    if (activeModule === 'user-account' && selectedUser && selectedUserMonth) {
      const pendingAmt = selectedUserMonth.remainingAmount || 0;
      const amountPaid = Number(selectedUserMonth.amount || selectedUserMonth.amountPaid || 0);
      const isToken = selectedUserMonth.paymentType === 'token';
      
      return (
        <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 32 }}>
          <SubHeader title="Paid Successfully" onBack={() => setSelectedUserMonth(null)} color="#0891b2" />
          <div style={{ padding: '16px' }}>
            <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* User info */}
              <div>
                <p style={{ fontWeight: 700, fontSize: 20, margin: '0 0 8px', color: '#0f172a' }}>{selectedUser.name}</p>
                <p style={{ fontSize: 14, color: '#0f172a', margin: 0, fontWeight: 500 }}>
                  Payment: {selectedUserMonth.paymentMode || 'Cash/Online'} 
                  {selectedUserMonth.transactionId && ` (Txn ID: ${selectedUserMonth.transactionId})`}
                </p>
              </div>
              
              <div style={{ borderTop: '1px solid #cbd5e1' }} />
              
              {/* Received By */}
              <div>
                <p style={{ fontSize: 13, color: '#0f172a', margin: '0 0 6px', fontWeight: 600 }}>Received by</p>
                <p style={{ fontWeight: 700, fontSize: 18, color: '#0f172a', margin: '0 0 6px', display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  {selectedUserMonth.receivedBy || 'Not specified'}
                </p>
              </div>

              <div style={{ borderTop: '1px solid #cbd5e1' }} />
              
              {/* Items list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 15, color: '#334155', fontWeight: 500 }}>{isToken ? 'Token Amount' : 'Amount Paid'} :</span>
                  <span style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>₹ {amountPaid.toLocaleString('en-IN')}</span>
                </div>
                {isToken && selectedUserMonth.rent && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 15, color: '#334155', fontWeight: 500 }}>Monthly Rent :</span>
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>₹ {Number(selectedUserMonth.rent).toLocaleString('en-IN')}</span>
                  </div>
                )}
                {isToken && selectedUserMonth.security && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 15, color: '#334155', fontWeight: 500 }}>Security Deposit :</span>
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>₹ {Number(selectedUserMonth.security).toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px solid #cbd5e1' }} />
              
              {/* Total + pending */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 17, color: '#0f172a', fontWeight: 700 }}>{isToken ? 'Total First Month' : 'Total Paid'}</span>
                  <span style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>₹ {(selectedUserMonth.totalAmount || amountPaid).toLocaleString('en-IN')}</span>
                </div>
                {isToken && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 15, color: '#059669', fontWeight: 600 }}>Remaining Balance</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#059669' }}>
                      ₹ {pendingAmt.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
              </div>

              {/* Screenshot */}
              {selectedUserMonth.screenshot && (
                <>
                  <div style={{ borderTop: '1px solid #cbd5e1' }} />
                  <div>
                    <p style={{ fontSize: 13, color: '#0f172a', margin: '0 0 8px', fontWeight: 600 }}>Payment Screenshot</p>
                    <img src={selectedUserMonth.screenshot} alt="Payment Screenshot" style={{ width: '100%', borderRadius: 12, border: '1px solid #e2e8f0' }} />
                  </div>
                </>
              )}
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
              {userReceipts.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No payment history found.</div>
              ) : userReceipts.map(r => (
                <div key={r.id} onClick={() => setSelectedUserMonth(r)}
                  style={{ background: 'white', border: '1.5px solid #0891b2', borderRadius: 12, padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className="material-symbols-outlined" style={{ color: '#0891b2', fontSize: 20 }}>{r.paymentType === 'token' ? 'monetization_on' : 'calendar_month'}</span>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: 16, color: '#0f172a' }}>{r.name || r.rentMonth || 'Payment'}</span>
                        {r.paymentType === 'token' && <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: '#fef3c7', color: '#b45309' }}>TOKEN</span>}
                      </div>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>{r.date || (r.datePaid ? new Date(r.datePaid).toLocaleDateString('en-IN') : '')}</span>
                    </div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '4px 12px', borderRadius: 20 }}>
                    Paid: ₹{Number(r.amount || r.amountPaid || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // ── STAFF ACCOUNT: Day-wise transaction view ───────────────────────────────
    if (activeModule === 'staff-account' && selectedStaff && selectedStaffMonth) {
      // If we have actual staffSalaries, we could filter by month.
      // For now, if the user clicked a real payment record, we can just show it.
      const days = [
        { 
          date: new Date(selectedStaffMonth.datePaid || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }), 
          payMode: selectedStaffMonth.paymentMode || 'Cash', 
          payer: 'Admin', 
          type: 'Salary, Paid',  
          amount: selectedStaffMonth.amountPaid || 0, 
          label: `Payment via ${selectedStaffMonth.paymentMode || 'Cash'}` 
        }
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
      const currentDate = new Date();
      const currentMonthStr = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      
      // Calculate present/absent days and build calendar data for the current month
      let presentDays = 0;
      let absentDays = 0;
      const attendanceDays = {};
      
      staffAttendance.forEach(a => {
        if (a.date) {
          const d = new Date(a.date);
          if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
            attendanceDays[d.getDate()] = a.status;
            if (a.status === 'present') presentDays++;
            if (a.status === 'absent') absentDays++;
          }
        } else if (a.status === 'present') {
          presentDays++;
        } else if (a.status === 'absent') {
          absentDays++;
        }
      });

      return (
        <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 32 }}>
          <SubHeader title="Staff Transaction" onBack={() => setSelectedStaff(null)} color="#0891b2" />
          <div style={{ padding: '16px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: 18, color: '#0f172a', margin: '0 0 4px' }}>{selectedStaff.name}</p>
                <p style={{ fontSize: 13, color: '#64748b', margin: '0' }}>{selectedStaff.role} · Token: #{selectedStaff.id}</p>
              </div>
              <button 
                onClick={() => setPayStaffModalData({
                  staffId: selectedStaff.id,
                  name: selectedStaff.name,
                  baseSalary: selectedStaff.salary || 0,
                  presentDays,
                  absentDays,
                  month: currentMonthStr
                })}
                style={{ padding: '8px 12px', background: '#0891b2', color: 'white', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>payments</span>
                Pay Salary
              </button>
            </div>

            {/* Monthly salary banner */}
            <div style={{ background: 'white', borderRadius: 12, padding: '14px 16px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>Monthly Salary</span>
              <span style={{ fontSize: 17, fontWeight: 800, color: '#0891b2' }}>₹ {(selectedStaff.salary || 0).toLocaleString('en-IN')}</span>
            </div>

            {/* Present / Absent pills */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div style={{ background: '#ecfeff', border: '1px solid #a5f3fc', borderRadius: 12, padding: '12px', textAlign: 'center' }}>
                <p style={{ fontSize: 11, color: '#0891b2', fontWeight: 600, margin: '0 0 4px' }}>Present</p>
                <p style={{ fontSize: 24, fontWeight: 800, color: '#0891b2', margin: 0 }}>{presentDays}</p>
              </div>
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px', textAlign: 'center' }}>
                <p style={{ fontSize: 11, color: '#e11d48', fontWeight: 600, margin: '0 0 4px' }}>Absent</p>
                <p style={{ fontSize: 24, fontWeight: 800, color: '#e11d48', margin: 0 }}>{absentDays}</p>
              </div>
            </div>

            {/* Calendar */}
            <AttendanceCalendar year={currentYear} monthIndex={currentMonth} days={attendanceDays} />

            <p style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: '20px 0 12px' }}>Payment History</p>
            {/* Monthly list */}
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              {staffSalaries.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No payment history found.</div>
              ) : staffSalaries.map((m, i) => (
                <div key={m.id} onClick={() => setSelectedStaffMonth(m)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 16px', borderBottom: i < staffSalaries.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#0891b2' }}>calendar_month</span>
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#0f172a' }}>{m.month}</span>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>₹ {(m.amountPaid || 0).toLocaleString('en-IN')}</span>
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
              {loadingUsers ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>Loading tenants...</div>
              ) : usersList.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>No tenants registered yet.</div>
              ) : usersList.filter(u => (u.name || '').toLowerCase().includes(search.toLowerCase())).map(u => (
                <div key={u.id} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div onClick={() => setSelectedUser(u)} style={{ display: 'flex', gap: 14, cursor: 'pointer', flex: 1 }}>
                    <div style={{ width: 60, height: 60, borderRadius: 12, background: '#0891b2', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, overflow: 'hidden', flexShrink: 0 }}>
                      <img 
                        src={u.kyc?.profilePhoto || u.image || u.profilePhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || 'User')}&background=0891b2&color=fff&size=150`} 
                        alt={u.name} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 2 }}>
                      <p style={{ fontWeight: 800, fontSize: 15, color: '#0f172a', margin: 0 }}>{u.name}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#475569' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#38bdf8' }}>door_front</span> {u.roomNo ? `Room ${u.roomNo}` : 'Unassigned'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#475569' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#38bdf8' }}>phone</span> {u.phone || 'N/A'}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setCollectModalData({ 
                    name: u.name, 
                    room: `Room ${u.roomNo || ''}`, 
                    amount: u.rentAmount || 0, 
                    month: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
                    tenantId: u.tenantId || u.id,
                    rent: u.rentAmount || 0,
                    security: u.securityDeposit || 0
                  })}
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
              {loadingStaff ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>Loading staff...</div>
              ) : staffList.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>No staff found. Generate a key in Staff section first.</div>
              ) : staffList.filter(u => (u.name || '').toLowerCase().includes(search.toLowerCase())).map(u => (
                <div key={u.id} onClick={() => setSelectedStaff(u)} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '12px', display: 'flex', gap: 14, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', cursor: 'pointer' }}>
                  <div style={{ width: 60, height: 60, borderRadius: 12, background: '#f43f5e', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700 }}>
                    {(u.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, paddingTop: 2 }}>
                    <p style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', margin: 0 }}>{u.name}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#475569' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#38bdf8' }}>badge</span> Token: #{u.id}
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
          <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 , paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))'}}>
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


            {!loadingRents && rentData[rentTab].length > 0 && (
               <div style={{ background: '#f8fafc', padding: '16px', borderRadius: 12, marginBottom: 16, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#475569' }}>Total {activeTab.label}</span>
                  <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 22, fontWeight: 800, color: activeTab.color }}>
                     ₹{rentData[rentTab].reduce((acc, curr) => acc + (parseInt(String(curr.amount).replace(/,/g, '')) || 0), 0).toLocaleString('en-IN')}
                  </span>
               </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {loadingRents ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>Loading rent data...</div>
              ) : rentData[rentTab].length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>No records found.</div>
              ) : rentData[rentTab]
                  .filter(t => String(t.name || '').toLowerCase().includes(search.toLowerCase()) || String(t.room || '').toLowerCase().includes(search.toLowerCase()))
                  .map((t, i) => {
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
                      <button onClick={async () => {
                        let r = t.rawReceipt;
                        if (r.paymentMode === 'UPI (Joining)' && r.tenantId) {
                          try {
                            const q = query(collection(db, 'users', r.tenantId, 'payments'), orderBy('createdAt', 'desc'), limit(1));
                            const snap = await getDocs(q);
                            if (!snap.empty) {
                              const p = snap.docs[0].data();
                              r = {
                                ...r,
                                paymentMode: p.paymentMode || r.paymentMode,
                                senderUPI: p.transactionId || (p.paymentMode === 'Cash' ? 'Paid in Cash' : r.senderUPI),
                                receivedBy: p.receivedBy || r.receivedBy
                              };
                            }
                          } catch (e) {
                            console.error('Error fetching real payment data:', e);
                          }
                        }
                        setActiveReceipt(r);
                      }}
                        style={{ padding: '8px 12px', background: '#ecfeff', color: '#0891b2', border: '1px solid #0891b2', borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>receipt_long</span>
                        Receipt
                      </button>
                    ) : (
                      <button onClick={() => setCollectModalData({
                          tenantId: t.tenantId || t.id,
                          name: t.name,
                          room: `Room ${t.room}`,
                          amount: amtVal,
                          rent: t.rent || 0,
                          security: t.security || 0,
                          month: t.month || new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })
                        })}
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
          <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 , paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))'}}>
            <button onClick={() => { setActiveModule(null); setSelectedMonth(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#0891b2' }}>
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: 18, color: '#0f172a', margin: 0, flex: 1, textAlign: 'center' }}>Live Profit-Loss Account</p>
            <div style={{ width: 32 }} />
          </div>
          <div style={{ padding: '16px' }}>
            {selectedMonth ? (
              <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ padding: '20px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', background: selectedMonth.type === 'profit' ? '#f0fdf4' : '#fff1f2' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: selectedMonth.type === 'profit' ? '#059669' : '#e11d48', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {selectedMonth.month} · Net {selectedMonth.type === 'profit' ? 'Profit' : 'Loss'}
                  </p>
                  <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 32, fontWeight: 800, color: selectedMonth.type === 'profit' ? '#059669' : '#e11d48', margin: 0 }}>
                    {selectedMonth.type === 'profit' ? '+' : '-'} ₹{Math.abs(selectedMonth.net).toLocaleString('en-IN')}
                  </p>
                </div>
                <div style={{ padding: '16px' }}>
                  <p style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>Income Breakdown</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: 13.5, color: '#64748b' }}>Rent & Token Collections</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#059669' }}>+ ₹{selectedMonth.details.rent.toLocaleString('en-IN')}</span>
                  </div>

                  {selectedMonth.details.meter > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ fontSize: 13.5, color: '#64748b' }}>Electricity Bills Collected</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#059669' }}>+ ₹{selectedMonth.details.meter.toLocaleString('en-IN')}</span>
                    </div>
                  )}

                  <p style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: '20px 0 12px' }}>Expenses Breakdown</p>
                  
                  {selectedMonth.details.staff > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontSize: 13.5, color: '#64748b' }}>Staff Salaries Paid</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#e11d48' }}>- ₹{selectedMonth.details.staff.toLocaleString('en-IN')}</span>
                    </div>
                  )}

                  {selectedMonth.details.lease > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontSize: 13.5, color: '#64748b' }}>PG Property Lease</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#e11d48' }}>- ₹{selectedMonth.details.lease.toLocaleString('en-IN')}</span>
                    </div>
                  )}

                  {selectedMonth.details.vendor > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontSize: 13.5, color: '#64748b' }}>Vendor & Maintenance</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#e11d48' }}>- ₹{selectedMonth.details.vendor.toLocaleString('en-IN')}</span>
                    </div>
                  )}

                  {selectedMonth.details.petty > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontSize: 13.5, color: '#64748b' }}>Petty Cash Allocations</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#e11d48' }}>- ₹{selectedMonth.details.petty.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  
                  {selectedMonth.details.pettyDetails?.length > 0 && (
                    <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, marginTop: 6, marginBottom: 14, border: '1px solid #e2e8f0' }}>
                      <p style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', margin: '0 0 6px', textTransform: 'uppercase' }}>Petty Cash Breakdown:</p>
                      {selectedMonth.details.pettyDetails.map((pd, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, color: '#64748b' }}>{pd.staffName}</span>
                          <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>₹{pd.amount.toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, paddingTop: 14, borderTop: '1.5px solid #e2e8f0' }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Total Month Income</span>
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#059669' }}>₹{selectedMonth.totalIncome.toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, paddingBottom: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Total Month Expenses</span>
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#e11d48' }}>₹{selectedMonth.expenses.toLocaleString('en-IN')}</span>
                  </div>
                </div>
                <div style={{ padding: '0 16px 16px' }}>
                  <button onClick={() => setSelectedMonth(null)} style={{ width: '100%', padding: 12, background: '#f1f5f9', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', color: '#475569' }}>← Back to All Months</button>
                </div>
              </div>
            ) : loadingProfitLoss ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
                <p style={{ margin: 0, fontSize: 14 }}>Calculating Live Profit & Loss...</p>
              </div>
            ) : profitLossData.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', background: 'white', borderRadius: 16, border: '1px solid #e2e8f0' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 44, color: '#cbd5e1', marginBottom: 8 }}>account_balance</span>
                <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>No financial records found</p>
                <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>Rent collections, staff salaries, and expenses will appear here automatically.</p>
              </div>
            ) : (
              <>
              <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderRadius: 16, padding: 20, marginBottom: 16, color: 'white', boxShadow: '0 4px 16px rgba(15,23,42,0.15)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>Overall PG Status (Till Date)</p>
                  <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: 'rgba(16,185,129,0.2)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }}>LIVE SYNC</span>
                </div>
                {(() => {
                  const totalIncome = profitLossData.reduce((acc, curr) => acc + curr.totalIncome, 0);
                  const totalExpense = profitLossData.reduce((acc, curr) => acc + curr.expenses, 0);
                  const overallNet = totalIncome - totalExpense;
                  return (
                    <>
                      <p style={{ fontSize: 32, fontWeight: 900, margin: '0 0 16px', color: overallNet >= 0 ? '#34d399' : '#f87171' }}>
                        {overallNet >= 0 ? '+' : '-'} ₹{Math.abs(overallNet).toLocaleString('en-IN')}
                        <span style={{ fontSize: 14, fontWeight: 600, marginLeft: 8, color: '#94a3b8' }}>{overallNet >= 0 ? 'Net Profit' : 'Net Loss'}</span>
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12 }}>
                        <div>
                          <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 2px' }}>Total Collections</p>
                          <p style={{ fontSize: 16, fontWeight: 800, margin: 0, color: '#34d399' }}>₹{totalIncome.toLocaleString('en-IN')}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 2px' }}>Total Expenses</p>
                          <p style={{ fontSize: 16, fontWeight: 800, margin: 0, color: '#f87171' }}>₹{totalExpense.toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
              <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                {profitLossData.map((item, i) => (
                  <div key={item.id} onClick={() => setSelectedMonth(item)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: i < profitLossData.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: item.type === 'profit' ? '#ecfdf5' : '#fff1f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="material-symbols-outlined" style={{ color: item.type === 'profit' ? '#059669' : '#e11d48' }}>{item.type === 'profit' ? 'trending_up' : 'trending_down'}</span>
                      </div>
                      <div>
                        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 15, display: 'block' }}>{item.month}</span>
                        <span style={{ fontSize: 11, color: '#64748b' }}>Income: ₹{item.totalIncome.toLocaleString('en-IN')} · Exp: ₹{item.expenses.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 16, margin: 0, color: item.type === 'profit' ? '#059669' : '#e11d48' }}>
                        {item.type === 'profit' ? '+' : '-'}₹{Math.abs(item.net).toLocaleString('en-IN')}
                      </p>
                      <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: item.type === 'profit' ? '#ecfdf5' : '#fff1f2', color: item.type === 'profit' ? '#059669' : '#e11d48', textTransform: 'uppercase' }}>
                        {item.type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              </>
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
      if (loadingLease) {
        return (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f1f5f9' }}>
            <div style={{ width: 40, height: 40, border: '4px solid #e2e8f0', borderTopColor: '#0891b2', borderRadius: '50%', animation: 'spin 1s linear infinite' }}>
              <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
          </div>
        );
      }
      
      if (pgDetails && !pgDetails.isOnLease) {
        return (
          <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 32 }}>
            <SubHeader title="Lease Amount" onBack={() => setActiveModule(null)} />
            <div style={{ padding: '40px 16px', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 64, color: '#94a3b8', marginBottom: 16 }}>home</span>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>Owned Property</h2>
              <p style={{ fontSize: 14, color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                Your PG is listed as an owned property. The Lease Account feature is only applicable for properties taken on lease.
              </p>
            </div>
          </div>
        );
      }

      return (
        <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 32 }}>
          <SubHeader title="Lease Amount" onBack={() => setActiveModule(null)} />
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', margin: 0 }}>Lease Payments</p>
              <button onClick={() => setShowAddLeaseModal(true)} style={{ background: '#0891b2', color: 'white', border: 'none', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span> Record Payment
              </button>
            </div>
            
            <div style={{ background: 'white', border: '1.5px solid #0891b2', borderRadius: 8, padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#0891b2', margin: 0 }}>Monthly Lease Amount</p>
              <p style={{ fontSize: 20, fontWeight: 600, color: '#333', margin: 0 }}>₹ {Number(pgDetails?.leaseAmount || 0).toLocaleString('en-IN')}</p>
            </div>
            
            <div style={{ background: 'white', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              {leasePayments.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>No lease payments recorded yet.</div>
              ) : (
                leasePayments.map((row, i) => (
                  <div key={row.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: i < leasePayments.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="material-symbols-outlined" style={{ color: '#0891b2', fontSize: 18, fontWeight: 300 }}>calendar_month</span>
                      <div>
                        <span style={{ fontSize: 15, color: '#000', fontWeight: 500, display: 'block' }}>{row.month}</span>
                        <span style={{ fontSize: 12, color: '#64748b' }}>{new Date(row.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#000' }}>₹ {Number(row.amount).toLocaleString('en-IN')}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      );
    }

    // ── SECURITY DEPOSITS MODULE ────────────────────────────────────────────────
    if (activeModule === 'security-deposits') {
      const activeTenants = usersList.filter(t => t.securityDeposit > 0 && ['Approved', 'Current User', 'Notice', 'On Notice Period', 'Upcoming User', 'Verified'].includes(t.status));
      return (
        <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 32 }}>
          <SubHeader title="Security Deposits" onBack={() => setActiveModule(null)} color="#2563eb" />
          <div style={{ padding: '16px' }}>
            {activeTenants.length > 0 && (
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: 12, marginBottom: 16, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#475569' }}>Total Deposits Held</span>
                <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 22, fontWeight: 800, color: '#2563eb' }}>
                  ₹{activeTenants.reduce((acc, curr) => acc + (Number(curr.securityDeposit) || 0), 0).toLocaleString('en-IN')}
                </span>
              </div>
            )}
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              {loadingUsers ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 14 }}>Loading...</div>
              ) : activeTenants.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>No security deposits currently held.</div>
              ) : (
                activeTenants.map((t, i) => (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: i < activeTenants.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <img src={t.kyc?.profilePhoto || t.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(t.name || 'User')}&background=0891b2&color=fff&size=150`} alt={t.name} style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }} />
                      <div>
                        <p style={{ fontWeight: 600, fontSize: 15, color: '#0f172a', margin: '0 0 4px' }}>{t.name}</p>
                        <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Room {t.roomNo}</p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontWeight: 700, fontSize: 15, color: '#2563eb', margin: '0 0 4px' }}>₹ {t.securityDeposit?.toLocaleString('en-IN')}</p>
                      <button 
                        onClick={() => setSecurityRefundModal(t)}
                        style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        GENERATE
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      );
    }

    // ── Main Account Overview ──────────────────────────────────────────────────
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk',sans-serif" }}>
        <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 , paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))'}}>
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

      {/* Outstanding Dues Modal */}
      {selectedDuesTenant && (
        <OutstandingDuesModal
          isOpen={!!selectedDuesTenant}
          onClose={() => setSelectedDuesTenant(null)}
          tenant={selectedDuesTenant.tenant}
          duesData={selectedDuesTenant.dues}
          adminUser={user}
          activePgId={activePgId}
          onRefresh={() => setDuesRefreshKey(p => p + 1)}
        />
      )}

      {collectModalData && (
        <CollectPaymentModal
          dueData={collectModalData}
          onClose={() => setCollectModalData(null)}
          onConfirm={async (newReceipt) => {
            if (user?.uid && collectModalData?.tenantId) {
              try {
                const receiptPayload = {
                  ...newReceipt,
                  adminId: user.uid, pgId: activePgId, 
                  tenantId: collectModalData.tenantId,
                  tenantName: collectModalData.name,
                  roomNo: collectModalData.room.replace('Room ', ''),
                  rentMonth: collectModalData.month,
                  amountPaid: Number(newReceipt.totalAmount || 0),
                  datePaid: new Date().toISOString()
                };
                
                await addDoc(collection(db, 'rent_receipts'), receiptPayload);
                
                setCollectModalData(null);
                setActiveReceipt(receiptPayload);
                setRentRefreshKey(prev => prev + 1);
                // If we're in the user-account drill down, we might want to refresh, but for now activeReceipt takes over the screen.
              } catch (e) {
                console.error("Error saving receipt:", e);
                alert("Failed to save receipt. Please try again.");
              }
            } else {
              setCollectModalData(null);
              setActiveReceipt(newReceipt);
            }
          }}
        />
      )}

      {payStaffModalData && (
        <PayStaffModal
          payData={payStaffModalData}
          onClose={() => setPayStaffModalData(null)}
          onConfirm={async (payoutDetails) => {
            if (user?.uid && payStaffModalData?.staffId) {
              try {
                const salaryPayload = {
                  adminId: user.uid, pgId: activePgId, 
                  staffId: payStaffModalData.staffId,
                  staffName: payStaffModalData.name,
                  month: payStaffModalData.month,
                  amountPaid: payoutDetails.amountPaid,
                  paymentMode: payoutDetails.paymentMode,
                  totalDays: payoutDetails.totalDays,
                  presentDays: payoutDetails.presentDays,
                  absentDays: payoutDetails.absentDays,
                  advancesDeducted: payoutDetails.advances,
                  baseSalary: payoutDetails.baseSalary,
                  datePaid: new Date().toISOString(),
                  createdAt: new Date().toISOString()
                };
                
                await addDoc(collection(db, 'staff_salaries'), salaryPayload);
                
                setPayStaffModalData(null);
                
                // Refresh local state to instantly show the new payment
                setStaffSalaries(prev => [salaryPayload, ...prev]);
                
              } catch (e) {
                console.error("Error saving staff salary:", e);
                alert("Failed to save salary record. Please try again.");
              }
            }
          }}
        />
      )}
      {showAddLeaseModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(3px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowAddLeaseModal(false); }}>
          <div style={{ background: 'white', width: '100%', maxWidth: 440, borderRadius: 20, padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>Record Lease Payment</h3>
              <button onClick={() => setShowAddLeaseModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', display: 'flex' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#64748b' }}>close</span>
              </button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const payload = {
                adminId: user.uid, pgId: activePgId, 
                month: formData.get('month'),
                amount: Number(formData.get('amount')),
                date: new Date().toISOString()
              };
              try {
                const docRef = await addDoc(collection(db, 'lease_payments'), payload);
                setLeasePayments(prev => [{ id: docRef.id, ...payload }, ...prev]);
                setShowAddLeaseModal(false);
              } catch (err) {
                console.error("Error saving lease payment:", err);
                alert("Failed to save payment");
              }
            }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Month & Year</label>
              <input name="month" required placeholder="e.g., August 2025"
                style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 15, marginBottom: 16, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Amount Paid (₹)</label>
              <input name="amount" type="number" required defaultValue={pgDetails?.leaseAmount || ''}
                style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 15, marginBottom: 24, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />

              <button type="submit" style={{ width: '100%', padding: '14px', background: '#0891b2', border: 'none', borderRadius: 12, color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Save Payment
              </button>
            </form>
          </div>
        </div>
      )}

      {securityRefundModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setSecurityRefundModal(null); }}>
          <div style={{ background: 'white', width: '100%', maxWidth: 440, borderRadius: 24, padding: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', fontFamily: "'Hanken Grotesk', sans-serif" }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>Generate Security Refund</h3>
              <button onClick={() => setSecurityRefundModal(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', display: 'flex' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#64748b' }}>close</span>
              </button>
            </div>

            <div style={{ display: 'flex', gap: 14, alignItems: 'center', background: '#f8fafc', padding: 16, borderRadius: 16, marginBottom: 20, border: '1px solid #e2e8f0' }}>
              <img src={securityRefundModal.kyc?.profilePhoto || securityRefundModal.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(securityRefundModal.name || 'User')}&background=0891b2&color=fff&size=150`} alt={securityRefundModal.name} style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover' }} />
              <div>
                <p style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', margin: '0 0 4px' }}>{securityRefundModal.name}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#0891b2' }}>meeting_room</span> 
                  Room {securityRefundModal.roomNo}
                </div>
              </div>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              const amtStr = e.target.elements.refundAmount.value;
              const amt = Number(amtStr);
              if (amt >= 0 && amt <= securityRefundModal.securityDeposit) {
                try {
                  const newBalance = securityRefundModal.securityDeposit - amt;
                  await updateDoc(doc(db, 'tenants', securityRefundModal.id), { securityDeposit: newBalance });
                  setUsersList(prev => prev.map(u => u.id === securityRefundModal.id ? { ...u, securityDeposit: newBalance } : u));
                  setSecurityRefundModal(null);
                  alert(`Refund/deduction of ₹${amt} processed successfully!`);
                } catch (err) {
                  console.error(err);
                  alert('Error updating security deposit.');
                }
              } else {
                alert('Invalid amount entered. Cannot exceed total deposit.');
              }
            }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 8 }}>Amount to Refund / Deduct (Max ₹{securityRefundModal.securityDeposit})</label>
              <div style={{ position: 'relative', marginBottom: 24 }}>
                <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: '#64748b', fontSize: 16 }}>₹</span>
                <input 
                  name="refundAmount" 
                  type="number" 
                  required 
                  defaultValue={securityRefundModal.securityDeposit}
                  max={securityRefundModal.securityDeposit}
                  min="0"
                  style={{ width: '100%', padding: '14px 14px 14px 40px', border: '1.5px solid #2563eb', borderRadius: 12, fontSize: 16, fontWeight: 600, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', color: '#0f172a' }} 
                />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" onClick={() => setSecurityRefundModal(null)} style={{ flex: 1, padding: '14px', background: '#f1f5f9', border: 'none', borderRadius: 12, color: '#475569', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Cancel
                </button>
                <button type="submit" style={{ flex: 1, padding: '14px', background: '#2563eb', border: 'none', borderRadius: 12, color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </>
  );
}
