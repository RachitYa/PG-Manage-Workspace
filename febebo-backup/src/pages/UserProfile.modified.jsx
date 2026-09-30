import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const BASE = { backgroundColor: '#f8fafc', minHeight: '100vh', position: 'relative', paddingBottom: 80, fontFamily: "'Hanken Grotesk', sans-serif" };
const cyan = '#0ea5e9';

// ─── SHARED DUMMY DATA ────────────────────────────────────
const ROOMS_DATA = [
  { id: 1, roomNo: '15', name: 'Staircase Front', type: 'Double Bed Room', beds: 2, status: 'occupied', img: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=220&fit=crop', residentIds: [1, 5] },
  { id: 2, roomNo: '16', name: 'Staircase Front', type: 'Triple Bed Room', beds: 3, status: 'occupied', img: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=400&h=220&fit=crop', residentIds: [2] },
  { id: 3, roomNo: '17', name: 'Staircase Front', type: 'Four Bed Room',   beds: 4, status: 'occupied', img: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=400&h=220&fit=crop', residentIds: [3] },
  { id: 4, roomNo: '18', name: 'Staircase Front', type: 'Double Bed Room', beds: 2, status: 'occupied', img: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=220&fit=crop', residentIds: [4] },
];

const USER_PROFILES = {
  1: { type: 'upcoming', dateOfJoining: '25 Feb 2025', dateOfTokenAmount: '01 Feb 2025', name: 'Rajeev Kumar', dob: '12 Aug 1999', email: 'rajeev.kumar@gmail.com', aadhar: '2345 6789 0123', address: '22, MG Road, Lajpat Nagar, New Delhi - 110024', permanentAddress: 'H.No 12, Ram Nagar, Aligarh, UP - 202001', correspondingAddress: '22, MG Road, Lajpat Nagar, New Delhi - 110024', college: 'Delhi University', careerStatus: 'Student', fatherName: 'Suresh Kumar', fatherPhone: '+91 9988776655', motherName: 'Anita Kumar', motherPhone: '+91 9988776644', parentsAddress: 'H.No 12, Ram Nagar, Aligarh, UP - 202001', joiningDate: '25 Feb 2025', tentativeLeaving: '24 Feb 2026', roomNo: 15, bedNo: 3, rent: 10000, token: 5000, pending: 5000, securityAmt: 3000, meterUnit: 1240, meterRatePerUnit: 8 },
  2: { type: 'current', bloodGroup: 'B+', schoolAddress: 'DPS RK Puram, Delhi', name: 'Ravi Kumar', dob: '5 Mar 2000', email: 'ravi.kumar@gmail.com', aadhar: '3456 7890 1234', address: '45, Nehru Place, South Delhi - 110019', permanentAddress: 'Village Govindpur, Dist. Varanasi, UP - 221001', correspondingAddress: '45, Nehru Place, South Delhi - 110019', college: 'IIT Delhi', careerStatus: 'Student', fatherName: 'Rajesh Kumar', fatherPhone: '+91 9876543210', motherName: 'Sunita Kumar', motherPhone: '+91 9876543200', parentsAddress: 'Village Govindpur, Dist. Varanasi, UP - 221001', joiningDate: '1 Jan 2025', tentativeLeaving: '31 Dec 2025', roomNo: 16, bedNo: 1, rent: 9500, token: 4000, pending: 0, securityAmt: 3000, meterUnit: 980, meterRatePerUnit: 8 },
  3: { type: 'notice_period', dateOfLeaving: '19 Jul 2025', name: 'Ravi Kumar (Notice)', dob: '22 Nov 1998', email: 'priya.sharma@gmail.com', aadhar: '4567 8901 2345', address: '7, Connaught Place, New Delhi - 110001', permanentAddress: 'B-14, Shastri Nagar, Jaipur, Rajasthan - 302016', correspondingAddress: '7, Connaught Place, New Delhi - 110001', college: null, careerStatus: 'Working', companyName: 'TechSoft India Pvt. Ltd.', companyAddress: 'Sector 62, Noida, UP', fatherName: 'Dinesh Sharma', fatherPhone: '+91 9123456789', motherName: 'Kavita Sharma', motherPhone: '+91 9123456780', parentsAddress: 'B-14, Shastri Nagar, Jaipur, Rajasthan - 302016', joiningDate: '10 Mar 2025', tentativeLeaving: '19 Jul 2026', roomNo: 12, bedNo: 2, rent: 11000, token: 6000, pending: 2500, securityAmt: 3000, meterUnit: 1520, meterRatePerUnit: 8 },
  4: { type: 'upcoming', dateOfJoining: '15 Apr 2025', dateOfTokenAmount: '01 Apr 2025', name: 'Ravi Kumar (Upcoming)', dob: '8 Jul 2001', email: 'amit.verma@gmail.com', aadhar: '5678 9012 3456', address: '33, Rohini Sector 4, New Delhi - 110085', permanentAddress: 'Plot 5, Gandhi Nagar, Agra, UP - 282001', correspondingAddress: '33, Rohini Sector 4, New Delhi - 110085', college: 'Jamia Millia Islamia', careerStatus: 'Student', fatherName: 'Vikas Verma', fatherPhone: '+91 9012345678', motherName: 'Rekha Verma', motherPhone: '+91 9012345670', parentsAddress: 'Plot 5, Gandhi Nagar, Agra, UP - 282001', joiningDate: '15 Apr 2025', tentativeLeaving: '15 Aug 2025', roomNo: 17, bedNo: 1, rent: 8500, token: 3500, pending: 3500, securityAmt: 2500, meterUnit: 820, meterRatePerUnit: 8 },
  5: { type: 'current', bloodGroup: 'AB+', schoolAddress: 'Mount Carmel School, Delhi', name: 'Sneha Kapoor', dob: '14 Feb 2000', email: 'sneha.kapoor@gmail.com', aadhar: '6789 0123 4567', address: '9, Vasant Kunj, New Delhi - 110070', permanentAddress: '23, Model Town, Ludhiana, Punjab - 141002', correspondingAddress: '9, Vasant Kunj, New Delhi - 110070', college: null, careerStatus: 'Working', companyName: 'Infosys BPM Ltd.', companyAddress: 'Cyber City, Gurugram', fatherName: 'Arun Kapoor', fatherPhone: '+91 8901234567', motherName: 'Meena Kapoor', motherPhone: '+91 8901234560', parentsAddress: '23, Model Town, Ludhiana, Punjab - 141002', joiningDate: '1 Jun 2025', tentativeLeaving: '31 May 2026', roomNo: 18, bedNo: 3, rent: 10500, token: 5500, pending: 1000, securityAmt: 3000, meterUnit: 1100, meterRatePerUnit: 8 },
};

const VISITOR_HISTORY = [
  { name: 'Suresh Kumar', number: '+91 9988776655', relation: 'Father', address: 'H.No 12, Ram Nagar, Aligarh, UP', purpose: 'Casual Visit', timeIn: '10:00 AM', timeOut: '05:00 PM', date: '2025-06-25', idProof: 'Aadhar: 1234 5678' },
  { name: 'Ramesh Singh',  number: '+91 9811223344', relation: 'Uncle',  address: '44, Karol Bagh, Delhi', purpose: 'Dropping luggage', timeIn: '08:30 AM', timeOut: '09:15 AM', date: '2025-05-12', idProof: 'DL: DL142011' },
  { name: 'Anita Kumar',   number: '+91 9988776644', relation: 'Mother', address: 'H.No 12, Ram Nagar, Aligarh, UP', purpose: 'Medical checkup', timeIn: '11:00 AM', timeOut: '06:30 PM', date: '2025-04-05', idProof: 'PAN: ABCDE1234F' },
  { name: 'Suresh Kumar', number: '+91 9988776655', relation: 'Father', address: 'H.No 12, Ram Nagar, Aligarh, UP', purpose: 'Bringing food', timeIn: '01:00 PM', timeOut: '02:00 PM', date: '2025-07-10', idProof: 'Aadhar: 1234 5678' },
];

const DEFAULT_PROFILE = USER_PROFILES[1];

const USER_INVENTORY = [
  { name: 'Bed',      icon: 'bed',               qty: 1, exchanges: [] },
  { name: 'Mattress', icon: 'airline_seat_flat', qty: 1, exchanges: [{ date: '1 Jun 2025', note: 'Sagging issue' }] },
  { name: 'Bedsheet', icon: 'layers',            qty: 2, exchanges: [{ date: '5 Jul 2025', note: 'Wear & tear' }] },
  { name: 'Pillow',   icon: 'weekend',           qty: 4, exchanges: [{ date: '8 Jul 2025', note: 'Old one torn' }] },
  { name: 'Chair',    icon: 'chair',             qty: 2, exchanges: [] },
  { name: 'Almirah',  icon: 'door_sliding',      qty: 1, exchanges: [] },
  { name: 'Kettle',   icon: 'coffee_maker',      qty: 1, exchanges: [] },
  { name: 'Table',    icon: 'table_restaurant',  qty: 1, exchanges: [] },
];

// Updated METER_HISTORY with prevReading and currReading
const METER_HISTORY = [
  { month: 'June 2025',     prevReading: 12420, currReading: 12640, units: 220, rate: 8, paid: true  },
  { month: 'May 2025',      prevReading: 12222, currReading: 12420, units: 198, rate: 8, paid: true  },
  { month: 'April 2025',    prevReading: 12047, currReading: 12222, units: 175, rate: 8, paid: true  },
  { month: 'March 2025',    prevReading: 11837, currReading: 12047, units: 210, rate: 8, paid: true  },
  { month: 'February 2025', prevReading: 11672, currReading: 11837, units: 165, rate: 8, paid: false },
  { month: 'January 2025',  prevReading: 11420, currReading: 11672, units: 252, rate: 8, paid: false },
];

// ─── REUSABLE HEADER ──────────────────────────────────────
function Header({ title, onBack, action, center = true, dark = false, containerStyle = {} }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', background: dark ? cyan : 'white', borderBottom: dark ? 'none' : '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 50, ...containerStyle }}>
      <button onClick={onBack} style={{ position: 'relative', zIndex: 10, background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', color: dark ? 'white' : cyan }}>
        <span className="material-symbols-outlined" style={{ fontSize: 24, fontWeight: 300 }}>arrow_back_ios_new</span>
      </button>
      <h1 style={{ flex: 1, textAlign: center ? 'center' : 'left', margin: center ? '0 0 0 -24px' : '0 0 0 16px', fontSize: 18, fontWeight: 700, color: dark ? 'white' : cyan }}>{title}</h1>
      {action && <div style={{ position: 'relative', zIndex: 10 }}>{action}</div>}
    </div>
  );
}

// ─── INFO ROW ─────────────────────────────────────────────
function InfoRow({ label, value, last }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: last ? 'none' : '1px solid #f1f5f9' }}>
      <span style={{ fontSize: 13, color: '#64748b', minWidth: 120 }}>{label}</span>
      <span style={{ fontSize: 13, color: cyan, fontWeight: 600, textAlign: 'right', maxWidth: '55%' }}>{value}</span>
    </div>
  );
}

// ─── ACCORDION ────────────────────────────────────────────
function Accordion({ title, icon, children, defaultOpen = false, onHeaderClick, badge }) {
  const [open, setOpen] = useState(defaultOpen);
  const handleClick = () => {
    if (onHeaderClick) { onHeaderClick(); return; }
    setOpen(!open);
  };
  return (
    <div style={{ background: 'white', borderRadius: 12, marginBottom: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <button onClick={handleClick} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'transparent', border: 'none', cursor: 'pointer', outline: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="material-symbols-outlined" style={{ color: cyan, fontSize: 22 }}>{icon}</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{title}</span>
          {badge && <span style={{ background: '#fef9c3', color: '#ca8a04', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>{badge}</span>}
        </div>
        <span className="material-symbols-outlined" style={{ color: cyan, fontSize: 20, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          {onHeaderClick ? 'chevron_right' : 'arrow_drop_down'}
        </span>
      </button>
      {!onHeaderClick && open && <div style={{ padding: '0 16px 16px', borderTop: '1px solid #f1f5f9' }}>{children}</div>}
    </div>
  );
}

// ─── PAYMENT MODAL (Cash / UPI) ───────────────────────────
function PaymentModal({ title, totalAmt, defaultToWhom, onConfirm, onClose }) {
  const [amtNow, setAmtNow]     = useState(String(totalAmt || ''));
  const [method, setMethod]     = useState('Cash');
  const [toWhom, setToWhom]     = useState(defaultToWhom || '');
  const [senderUPI, setSenderUPI]   = useState('');
  const [receiverUPI, setReceiverUPI] = useState('');
  const remaining = (totalAmt || 0) - (parseFloat(amtNow) || 0);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 70, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(3px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: 'white', width: '100%', maxWidth: 480, borderRadius: '20px 20px 0 0', padding: '20px 20px 36px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ width: 40, height: 4, background: '#e2e8f0', borderRadius: 99, margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <p style={{ fontWeight: 800, fontSize: 17, color: '#0f172a', margin: 0 }}>{title}</p>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', borderRadius: 8, padding: 6, display: 'flex' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#64748b' }}>close</span>
          </button>
        </div>

        <div style={{ background: '#f8fafc', borderRadius: 12, padding: '12px 16px', marginBottom: 16, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Total Due</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>₹ {(totalAmt || 0).toLocaleString('en-IN')}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Remaining after</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: remaining > 0 ? '#ef4444' : '#16a34a' }}>₹ {remaining.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Amount Paying Now (₹)</label>
        <input type="number" value={amtNow} onChange={e => setAmtNow(e.target.value)} placeholder="Enter amount"
          style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 16, fontWeight: 700, outline: 'none', boxSizing: 'border-box', marginBottom: 16, color: '#0f172a' }} />

        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 8 }}>Payment Method</label>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          {['Cash', 'UPI'].map(m => (
            <button key={m} onClick={() => setMethod(m)}
              style={{ flex: 1, padding: 11, borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', border: method === m ? 'none' : '1.5px solid #e2e8f0', background: method === m ? cyan : 'white', color: method === m ? 'white' : '#64748b' }}>
              {m === 'Cash' ? '💵 Cash' : '📱 UPI'}
            </button>
          ))}
        </div>

        {method === 'Cash' ? (
          <>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>To Whom</label>
            <input value={toWhom} onChange={e => setToWhom(e.target.value)} placeholder="Name of receiver"
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 15, outline: 'none', boxSizing: 'border-box', marginBottom: 16, color: '#0f172a', fontFamily: 'inherit' }} />
          </>
        ) : (
          <>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Your Phone / UPI ID (Sender)</label>
            <input value={senderUPI} onChange={e => setSenderUPI(e.target.value)} placeholder="e.g. 9876543210 or name@upi"
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 15, outline: 'none', boxSizing: 'border-box', marginBottom: 12, color: '#0f172a', fontFamily: 'inherit' }} />
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Receiver Phone / UPI ID</label>
            <input value={receiverUPI} onChange={e => setReceiverUPI(e.target.value)} placeholder="e.g. manager@paytm"
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 15, outline: 'none', boxSizing: 'border-box', marginBottom: 16, color: '#0f172a', fontFamily: 'inherit' }} />
          </>
        )}

        <button onClick={() => { onConfirm({ amtNow: parseFloat(amtNow) || 0, method, toWhom, senderUPI, receiverUPI }); onClose(); }}
          style={{ width: '100%', padding: 15, background: cyan, border: 'none', borderRadius: 12, color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          Confirm Payment
        </button>
      </div>
    </div>
  );
}

// ─── SUB-VIEW: INVENTORY DETAIL ───────────────────────────
function InventoryDetailView({ user, onBack }) {
  const name = user?.name || 'User';
  return (
    <>
      <Header title="Allotted Inventory" onBack={onBack} center={false} />
      <div style={{ padding: 16 }}>
        <div style={{ background: cyan, borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <img src={user?.image || user?.img || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&h=120&fit=crop'} alt={name} style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.4)' }} />
          <div>
            <p style={{ margin: 0, fontWeight: 700, color: 'white', fontSize: 15 }}>{name}</p>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>Room {user?.room || '15'} · Bed {user?.bed || '3'}</p>
          </div>
        </div>
        <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {USER_INVENTORY.map((item, idx) => (
            <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderBottom: idx < USER_INVENTORY.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: cyan }}>{item.icon}</span>
                </div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14, color: '#0f172a', margin: '0 0 2px' }}>{item.name}</p>
                  {item.exchanges.length > 0 && <p style={{ fontSize: 11, color: '#ca8a04', margin: 0, fontWeight: 600 }}>↕ {item.exchanges.length} exchange{item.exchanges.length > 1 ? 's' : ''}</p>}
                </div>
              </div>
              <span style={{ background: '#f1f5f9', color: '#475569', fontWeight: 700, fontSize: 14, padding: '4px 10px', borderRadius: 8 }}>×{item.qty}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── SUB-VIEW: METER HISTORY ──────────────────────────────
function MeterHistoryView({ profile, onBack }) {
  const [expandedMonth, setExpandedMonth] = useState(null);
  const [payModal, setPayModal] = useState(null);
  const totalUnpaidUnits = METER_HISTORY.filter(m => !m.paid).reduce((s, m) => s + m.units, 0);
  const totalUnpaidAmt   = totalUnpaidUnits * (profile?.meterRatePerUnit || 8);

  // Get room people count from ROOMS_DATA
  const room = ROOMS_DATA.find(r => r.roomNo === String(profile?.roomNo));
  const roomPeople = room?.beds || 1;

  return (
    <>
      <Header title="Meter Consumption" onBack={onBack} center={false} />
      <div style={{ padding: 16 }}>
        {totalUnpaidAmt > 0 && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-symbols-outlined" style={{ color: '#ef4444', fontSize: 20 }}>warning</span>
              <span style={{ fontSize: 13, color: '#ef4444', fontWeight: 600 }}>Pending Meter Bill</span>
            </div>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#ef4444' }}>₹{totalUnpaidAmt.toLocaleString()}</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {METER_HISTORY.map((m, i) => {
            const totalAmt   = m.units * m.rate;
            const myShare    = Math.round(totalAmt / roomPeople);
            const isExpanded = expandedMonth === i;
            return (
              <div key={i} style={{ background: 'white', borderRadius: 12, border: `1px solid ${!m.paid ? '#fecaca' : '#e2e8f0'}`, overflow: 'hidden' }}>
                {/* Month header — clickable */}
                <button onClick={() => setExpandedMonth(isExpanded ? null : i)}
                  style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'transparent', border: 'none', cursor: 'pointer', outline: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="material-symbols-outlined" style={{ color: cyan, fontSize: 20 }}>electric_meter</span>
                    <div style={{ textAlign: 'left' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', display: 'block' }}>{m.month}</span>
                      <span style={{ fontSize: 12, color: '#64748b' }}>Units: {m.units} kWh · ₹{totalAmt.toLocaleString()}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ background: m.paid ? '#dcfce7' : '#fef2f2', color: m.paid ? '#16a34a' : '#ef4444', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 10 }}>{m.paid ? '✓ Paid' : '✗ Unpaid'}</span>
                    <span className="material-symbols-outlined" style={{ color: '#94a3b8', fontSize: 18, transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>expand_more</span>
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid #f1f5f9', padding: '14px 16px', background: '#f8fafc' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                      {[
                        { label: 'Prev Reading', val: `${m.prevReading.toLocaleString()} kWh`, icon: 'arrow_back' },
                        { label: 'Curr Reading', val: `${m.currReading.toLocaleString()} kWh`, icon: 'arrow_forward' },
                        { label: 'Units Consumed', val: `${m.units} kWh`, icon: 'bolt' },
                        { label: 'Rate per Unit', val: `₹${m.rate}`, icon: 'currency_rupee' },
                        { label: 'Total Bill', val: `₹${totalAmt.toLocaleString()}`, icon: 'receipt' },
                        { label: 'Room Sharers', val: `${roomPeople} person${roomPeople > 1 ? 's' : ''}`, icon: 'group' },
                      ].map(d => (
                        <div key={d.label} style={{ background: 'white', borderRadius: 10, padding: '10px 12px', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 14, color: cyan }}>{d.icon}</span>
                            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{d.label}</span>
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{d.val}</span>
                        </div>
                      ))}
                    </div>

                    {/* Your share */}
                    <div style={{ background: '#ecfeff', border: '1px solid #a5f3fc', borderRadius: 10, padding: '12px 14px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 18, color: cyan }}>person</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#0e7490' }}>Your Individual Share</span>
                      </div>
                      <span style={{ fontSize: 18, fontWeight: 900, color: cyan }}>₹{myShare.toLocaleString()}</span>
                    </div>

                    {!m.paid && (
                      <button onClick={() => setPayModal({ month: m.month, amt: myShare })}
                        style={{ width: '100%', padding: '12px', background: '#fef2f2', border: '1.5px solid #ef4444', borderRadius: 10, color: '#ef4444', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>payments</span>
                        Clear Pending ₹{myShare.toLocaleString()}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {payModal && (
        <PaymentModal
          title={`Meter Payment — ${payModal.month}`}
          totalAmt={payModal.amt}
          defaultToWhom="Manager / Admin"
          onConfirm={() => {}}
          onClose={() => setPayModal(null)}
        />
      )}
    </>
  );
}

// ─── SUB-VIEW: ROOM DETAILS REDIRECT ─────────────────────
function RoomPreviewView({ profile, user, onBack }) {
  const navigate = useNavigate();
  const room = ROOMS_DATA.find(r => r.roomNo === String(profile?.roomNo || user?.room));
  return (
    <>
      <Header title={`Room No. ${profile?.roomNo || user?.room}`} onBack={onBack} center={false} />
      <div style={{ padding: 16 }}>
        {room && (
          <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0', marginBottom: 16 }}>
            <img src={room.img} alt={room.name} style={{ width: '100%', height: 180, objectFit: 'cover' }} />
            <div style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', margin: '0 0 2px' }}>{room.name}</p>
                  <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{room.type} · {room.beds} beds</p>
                </div>
                <span style={{ background: room.status === 'occupied' ? '#dcfce7' : '#f1f5f9', color: room.status === 'occupied' ? '#059669' : '#64748b', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20 }}>
                  {room.status === 'occupied' ? 'Occupied' : 'Vacated'}
                </span>
              </div>
              <button onClick={() => navigate('/manage-rooms', { state: { openRoomId: room?.id } })} style={{ width: '100%', padding: 12, background: cyan, color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                View Full Room Details →
              </button>
            </div>
          </div>
        )}
        <div style={{ background: 'white', borderRadius: 12, padding: '14px 16px', border: '1px solid #e2e8f0' }}>
          <InfoRow label="Room Number" value={`Room ${profile?.roomNo || user?.room}`} />
          <InfoRow label="Bed Number" value={`Bed ${profile?.bedNo || user?.bed}`} />
          <InfoRow label="Room Type" value={room?.type || 'Double Bed'} />
          <InfoRow label="Status" value={room?.status === 'occupied' ? 'Occupied' : 'Available'} last />
        </div>
      </div>
    </>
  );
}

// ─── SUB-VIEW: VISITOR HISTORY ────────────────────────────
function VisitorHistoryView({ user, onBack }) {
  const [selectedVisitor, setSelectedVisitor] = useState(null);

  if (selectedVisitor) {
    const visits = VISITOR_HISTORY.filter(v => v.name === selectedVisitor.name).sort((a, b) => new Date(b.date) - new Date(a.date));
    return (
      <>
        <Header title={selectedVisitor.name} onBack={() => setSelectedVisitor(null)} center={false} />
        <div style={{ padding: 16 }}>
          <div style={{ marginBottom: 16, background: 'white', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 4px' }}>Relation: <span style={{ color: '#0f172a', fontWeight: 600 }}>{selectedVisitor.relation}</span></p>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 4px' }}>Phone: <span style={{ color: '#0f172a', fontWeight: 600 }}>{selectedVisitor.number}</span></p>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>ID Proof: <span style={{ color: '#0f172a', fontWeight: 600 }}>{selectedVisitor.idProof || 'N/A'}</span></p>
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#334155', marginBottom: 12 }}>Past Visits</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {visits.map((v, i) => (
              <div key={i} style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>{new Date(v.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>{v.timeIn} - {v.timeOut}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 8 }}><span className="material-symbols-outlined" style={{ fontSize: 18, color: cyan }}>info</span><span style={{ fontSize: 13, color: '#475569' }}>{v.purpose}</span></div>
                  <div style={{ display: 'flex', gap: 8 }}><span className="material-symbols-outlined" style={{ fontSize: 18, color: cyan }}>location_on</span><span style={{ fontSize: 13, color: '#475569' }}>{v.address}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  const grouped = VISITOR_HISTORY.reduce((acc, v) => {
    if (!acc[v.name]) acc[v.name] = { ...v, count: 0 };
    acc[v.name].count += 1;
    return acc;
  }, {});
  const uniqueVisitors = Object.values(grouped);

  return (
    <>
      <Header title="Visitor History" onBack={onBack} center={false} />
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {uniqueVisitors.map((v, i) => (
            <div key={i} onClick={() => setSelectedVisitor(v)} style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: 16, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', margin: '0 0 2px' }}>{v.name}</p>
                <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{v.relation} · {v.number}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ background: '#ecfeff', color: cyan, fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20 }}>{v.count} Visit{v.count > 1 ? 's' : ''}</span>
                <span className="material-symbols-outlined" style={{ color: '#cbd5e1', fontSize: 20 }}>chevron_right</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── SUB-VIEW: STUDENT STAFF WORK ─────────────────────────
// Cook data filtered by room
const STUDENT_COOK_DATA = {
  mealLog: [
    { date: '2026-07-11', breakfast: true,  lunch: true,  dinner: false, extraPlates: 0,  tiffin: false, usersAsked: 45, storedFood: true,  tiffinItems: [] },
    { date: '2026-07-10', breakfast: true,  lunch: true,  dinner: true,  extraPlates: 2,  tiffin: false, usersAsked: 42, storedFood: false, tiffinItems: [] },
    { date: '2026-07-09', breakfast: false, lunch: true,  dinner: true,  extraPlates: 0,  tiffin: true,  usersAsked: 50, storedFood: false, tiffinItems: ['Roti', 'Sabzi', 'Salad'] },
    { date: '2026-07-08', breakfast: true,  lunch: false, dinner: true,  extraPlates: 0,  tiffin: false, usersAsked: 38, storedFood: true,  tiffinItems: [] },
    { date: '2026-07-07', breakfast: true,  lunch: true,  dinner: true,  extraPlates: 1,  tiffin: false, usersAsked: 40, storedFood: false, tiffinItems: [] },
    { date: '2026-07-06', breakfast: false, lunch: true,  dinner: false, extraPlates: 0,  tiffin: true,  usersAsked: 48, storedFood: true,  tiffinItems: ['Pulao', 'Raita'] },
    { date: '2026-07-05', breakfast: true,  lunch: true,  dinner: true,  extraPlates: 0,  tiffin: false, usersAsked: 41, storedFood: false, tiffinItems: [] },
  ],
  reviews: [
    { id: 1, date: '2026-07-10', meal: 'Lunch', rating: 4, text: 'Dal was perfect today!' },
    { id: 2, date: '2026-07-09', meal: 'Dinner', rating: 3, text: 'Sabzi was a bit bland.' },
    { id: 3, date: '2026-07-07', meal: 'Breakfast', rating: 5, text: 'Poha was great!' },
  ],
};

const STUDENT_CLEANER_DATA = [
  { date: '2026-07-11', time: '09:00 AM', cleaningType: ['Full Room Cleaning', 'Bathroom Cleaning'],       studentStatus: 'Approved', cleaner: 'Mohan Das' },
  { date: '2026-07-10', time: '09:30 AM', cleaningType: ['Dusting', 'Fan Cleaning'],                       studentStatus: 'Rejected', cleaner: 'Mohan Das',  rejectionNote: 'Fan still dusty' },
  { date: '2026-07-09', time: '08:45 AM', cleaningType: ['Full Room Cleaning'],                             studentStatus: 'Approved', cleaner: 'Mohan Das' },
  { date: '2026-07-08', time: '09:15 AM', cleaningType: ['Bathroom Cleaning', 'Dusting'],                  studentStatus: 'Pending',  cleaner: 'Mohan Das' },
  { date: '2026-07-07', time: '10:00 AM', cleaningType: ['Full Room Cleaning', 'Fan Cleaning', 'Others'],  studentStatus: 'Approved', cleaner: 'Lakshmi B.' },
];

function StudentCookView({ studentName, onBack }) {
  const [period, setPeriod] = useState('week');
  const log = STUDENT_COOK_DATA.mealLog;
  const totalB  = log.filter(d => d.breakfast).length;
  const totalL  = log.filter(d => d.lunch).length;
  const totalD  = log.filter(d => d.dinner).length;
  const totalEP = log.reduce((s, d) => s + d.extraPlates, 0);
  const totalTf = log.filter(d => d.tiffin).length;

  return (
    <>
      <Header title="Cook — Food History" onBack={onBack} center={false} />
      <div style={{ padding: 16 }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Breakfast', val: totalB, icon: 'free_breakfast' },
            { label: 'Lunch', val: totalL, icon: 'lunch_dining' },
            { label: 'Dinner', val: totalD, icon: 'dinner_dining' },
          ].map(s => (
            <div key={s.label} style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: '12px 8px', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: cyan, display: 'block', marginBottom: 4 }}>{s.icon}</span>
              <p style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 2px' }}>{s.val}</p>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', margin: 0 }}>{s.label}</p>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#d97706' }}>group_add</span>
            <div>
              <p style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0 }}>{totalEP}</p>
              <p style={{ fontSize: 12, color: '#d97706', fontWeight: 700, margin: 0 }}>Extra Plates</p>
            </div>
          </div>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#16a34a' }}>takeout_dining</span>
            <div>
              <p style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0 }}>{totalTf}</p>
              <p style={{ fontSize: 12, color: '#16a34a', fontWeight: 700, margin: 0 }}>Tiffin Packed</p>
            </div>
          </div>
        </div>

        {/* Daily log */}
        <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Daily Meal Log</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {log.map((d, i) => (
            <div key={i} style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: '12px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{d.date}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {d.extraPlates > 0 && <span style={{ background: '#fffbeb', color: '#d97706', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>+{d.extraPlates} plates</span>}
                  {d.tiffin && <span style={{ background: '#f0fdf4', color: '#16a34a', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>Tiffin</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {[['Breakfast', d.breakfast], ['Lunch', d.lunch], ['Dinner', d.dinner]].map(([label, had]) => (
                  <span key={label} style={{ flex: 1, textAlign: 'center', padding: '5px 4px', borderRadius: 8, background: had ? '#ecfeff' : '#f1f5f9', color: had ? cyan : '#94a3b8', fontSize: 12, fontWeight: 700 }}>
                    {had ? '✓' : '✗'} {label}
                  </span>
                ))}
              </div>
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#64748b' }}>forum</span>
                  <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>{d.usersAsked} users asked</span>
                </div>
                {d.storedFood && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#f59e0b' }}>inventory_2</span>
                    <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>Stored late food</span>
                  </div>
                )}
                {d.tiffin && d.tiffinItems?.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#16a34a' }}>takeout_dining</span>
                    <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>Tiffin: {d.tiffinItems.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Reviews */}
        <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Your Food Reviews</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {STUDENT_COOK_DATA.reviews.map(r => (
            <div key={r.id} style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: '12px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', gap: 2 }}>
                  {[1,2,3,4,5].map(i => (
                    <span key={i} className="material-symbols-outlined" style={{ fontSize: 16, color: i <= r.rating ? '#f59e0b' : '#e2e8f0' }}>star</span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, background: '#ecfeff', color: cyan, padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>{r.meal}</span>
                  <span style={{ fontSize: 12, color: '#64748b' }}>{r.date}</span>
                </div>
              </div>
              <p style={{ fontSize: 14, color: '#334155', margin: 0, fontStyle: 'italic' }}>"{r.text}"</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function StudentCleanerView({ studentName, roomNo, onBack }) {
  const statusColor = { Approved: '#16a34a', Rejected: '#ef4444', Pending: '#d97706' };
  const statusBg    = { Approved: '#dcfce7', Rejected: '#fee2e2', Pending: '#fffbeb' };

  return (
    <>
      <Header title="Cleaner — Room History" onBack={onBack} center={false} />
      <div style={{ padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Approved', count: STUDENT_CLEANER_DATA.filter(d => d.studentStatus === 'Approved').length, color: '#16a34a', bg: '#dcfce7' },
            { label: 'Pending',  count: STUDENT_CLEANER_DATA.filter(d => d.studentStatus === 'Pending').length,  color: '#d97706', bg: '#fffbeb' },
            { label: 'Rejected', count: STUDENT_CLEANER_DATA.filter(d => d.studentStatus === 'Rejected').length, color: '#ef4444', bg: '#fee2e2' },
          ].map(s => (
            <div key={s.label} style={{ background: 'white', borderRadius: 12, border: `1px solid ${s.bg}`, padding: '14px 8px', textAlign: 'center' }}>
              <p style={{ fontSize: 24, fontWeight: 800, color: s.color, margin: '0 0 3px' }}>{s.count}</p>
              <p style={{ fontSize: 11, fontWeight: 700, color: s.color, margin: 0, textTransform: 'uppercase' }}>{s.label}</p>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Cleaning Log — Room {roomNo}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {STUDENT_CLEANER_DATA.map((d, i) => (
            <div key={i} style={{ background: 'white', borderRadius: 12, border: `1px solid ${d.studentStatus === 'Rejected' ? '#fecaca' : '#e2e8f0'}`, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>{d.date}</p>
                  <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>By {d.cleaner} · {d.time}</p>
                </div>
                <span style={{ background: statusBg[d.studentStatus], color: statusColor[d.studentStatus], fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>{d.studentStatus}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: d.studentStatus === 'Rejected' ? 10 : 0 }}>
                {d.cleaningType.map(t => (
                  <span key={t} style={{ background: '#ecfeff', color: cyan, fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>{t}</span>
                ))}
              </div>
              {d.studentStatus === 'Rejected' && (
                <div style={{ background: '#fee2e2', borderRadius: 8, padding: '8px 12px', marginTop: 8 }}>
                  <p style={{ fontSize: 13, color: '#ef4444', margin: 0, fontWeight: 600 }}>Issue: {d.rejectionNote}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function StudentStaffWorkView({ profile, roomNo, onBack }) {
  const [selected, setSelected] = useState(null);

  if (selected === 'cook')    return <StudentCookView studentName={profile.name} onBack={() => setSelected(null)} />;
  if (selected === 'cleaner') return <StudentCleanerView studentName={profile.name} roomNo={roomNo} onBack={() => setSelected(null)} />;

  const options = [
    { id: 'cook',       icon: 'restaurant',   label: 'Cook',        sub: 'Food history & reviews' },
    { id: 'cleaner',    icon: 'mop',          label: 'Cleaner',     sub: 'Room cleaning status' },
    { id: 'electrician',icon: 'electric_bolt',label: 'Electrician', sub: 'Electrical issues' },
    { id: 'plumber',    icon: 'plumbing',     label: 'Plumber',     sub: 'Plumbing requests' },
    { id: 'others',     icon: 'handyman',     label: 'Others',      sub: 'Other staff' },
  ];

  return (
    <>
      <Header title="Staff Work" onBack={onBack} center={false} />
      <div style={{ padding: 16 }}>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>View work related to your room and stay.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {options.map(opt => (
            <div key={opt.id} onClick={() => (opt.id === 'cook' || opt.id === 'cleaner') ? setSelected(opt.id) : null}
              style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, cursor: opt.id === 'cook' || opt.id === 'cleaner' ? 'pointer' : 'default', opacity: opt.id !== 'cook' && opt.id !== 'cleaner' ? 0.5 : 1 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22, color: cyan }}>{opt.icon}</span>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>{opt.label}</p>
                <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{opt.sub}</p>
              </div>
              <span className="material-symbols-outlined" style={{ color: '#cbd5e1', fontSize: 20 }}>chevron_right</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 16 }}>Electrician, Plumber & Others — coming soon</p>
      </div>
    </>
  );
}

// ─── MAIN DETAILS VIEW ────────────────────────────────────
function UserDetailsView({ user, onBack, onReceipt, onHistory, subView, setSubView }) {
  const profile = USER_PROFILES[user?.id] || DEFAULT_PROFILE;
  const rent = profile.rent;
  const token = profile.token;
  const pending = profile.pending;
  const currentMonthUnits = METER_HISTORY[0]?.units || 220;
  const currentMonthAmt   = currentMonthUnits * profile.meterRatePerUnit;
  const unpaidMonths      = METER_HISTORY.filter(m => !m.paid).length;

  if (subView === 'inventory')     return <InventoryDetailView user={user} onBack={() => setSubView(null)} />;
  if (subView === 'meter')         return <MeterHistoryView profile={profile} onBack={() => setSubView(null)} />;
  if (subView === 'room')          return <RoomPreviewView profile={profile} user={user} onBack={() => setSubView(null)} />;
  if (subView === 'visitor_history') return <VisitorHistoryView user={user} onBack={() => setSubView(null)} />;
  if (subView === 'staff_work')    return <StudentStaffWorkView profile={profile} roomNo={profile.roomNo} onBack={() => setSubView(null)} />;

  return (
    <>
      <div style={{ position: 'sticky', top: 0, zIndex: 60 }}>
        {profile.type === 'notice_period' && profile.pending > 0 && (
          <div style={{ background: '#ef4444', color: 'white', padding: '10px 16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>warning</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Notice Period: ₹{profile.pending.toLocaleString()} Pending</span>
          </div>
        )}
        <Header title="User Details" onBack={onBack} center={true} dark={true} containerStyle={{ position: 'relative', zIndex: 50 }} action={
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'white', padding: '4px 8px', borderRadius: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: cyan }}>4.3</span>
          <span className="material-symbols-outlined" style={{ fontSize: 14, color: cyan }}>star</span>
        </div>
      }/>
      </div>

      <div style={{ background: cyan, padding: '0 16px 24px', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
        <div style={{ background: 'white', borderRadius: 16, padding: 16, display: 'flex', gap: 16, alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <img src={user?.image || user?.img || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop'} alt={profile.name} style={{ width: 80, height: 80, borderRadius: 12, objectFit: 'cover' }} />
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: 18, color: '#0f172a' }}>{profile.name}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: cyan }}>badge</span>
              <span style={{ fontSize: 12, color: '#64748b' }}>{user?.studentId || '#' + String(1234560 + (user?.id || 1))}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: cyan }}>call</span>
              <span style={{ fontSize: 12, color: '#64748b' }}>{user?.phone || '+91 9234567681'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: cyan }}>calendar_month</span>
              <span style={{ fontSize: 12, color: '#64748b' }}>{profile.joiningDate}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        <Accordion title="Personal Details" icon="person_outline" defaultOpen={false}>
          <InfoRow label="Full Name" value={profile.name} />
          <InfoRow label="Date of Birth" value={profile.dob} />
          <InfoRow label="Email" value={profile.email} />
          <InfoRow label="Aadhar No." value={profile.aadhar} />
          <InfoRow label="Career" value={profile.careerStatus} />
          {profile.careerStatus === 'Student' ? <InfoRow label="College" value={profile.college} /> : <InfoRow label="Company" value={profile.companyName} />}
          <InfoRow label="Permanent Address" value={profile.permanentAddress} />
          <InfoRow label="Corresponding Address" value={profile.correspondingAddress} last={profile.type !== 'current'} />
          {profile.type === 'current' && (
            <>
              <InfoRow label="Blood Group" value={profile.bloodGroup} />
              <InfoRow label="School Address" value={profile.schoolAddress} last />
            </>
          )}
        </Accordion>

        <Accordion title="Parents Details" icon="family_restroom" defaultOpen={false}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', margin: '8px 0 4px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Father</p>
          <InfoRow label="Name" value={profile.fatherName} />
          <InfoRow label="Mobile" value={profile.fatherPhone} />
          <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', margin: '12px 0 4px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Mother</p>
          <InfoRow label="Name" value={profile.motherName} />
          <InfoRow label="Mobile" value={profile.motherPhone} />
          <InfoRow label="Parents Address" value={profile.parentsAddress} last />
        </Accordion>

        <Accordion title="Date of Joining" icon="event" defaultOpen={false}>
          <InfoRow label="Joining Date" value={profile.joiningDate} />
          {profile.type === 'upcoming' ? (
            <InfoRow label="Token Amt Date" value={profile.dateOfTokenAmount} last />
          ) : profile.type === 'notice_period' ? (
            <InfoRow label="Date of Leaving" value={profile.dateOfLeaving} last />
          ) : (
            <InfoRow label="Tentative Leaving" value={profile.tentativeLeaving} last />
          )}
        </Accordion>

        <Accordion title="Room Details" icon="meeting_room" defaultOpen={true}>
          <InfoRow label="Room Number" value={`Room ${profile.roomNo}`} />
          <InfoRow label="Bed Number" value={`Bed ${profile.bedNo}`} />
          <div style={{ marginTop: 12 }}>
            <button onClick={() => setSubView('room')} style={{ width: '100%', padding: 10, background: 'rgba(14,165,233,0.08)', border: `1px solid ${cyan}`, color: cyan, borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>meeting_room</span>
              View Room Details
            </button>
          </div>
        </Accordion>

        <Accordion title="Inventory Allotted" icon="inventory_2" onHeaderClick={() => setSubView('inventory')} />

        {profile.type !== 'upcoming' && (
          <Accordion title="Meter Unit Details" icon="electric_meter" defaultOpen={true}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1, background: '#ecfeff', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 4px' }}>This Month (June)</p>
                <p style={{ fontSize: 18, fontWeight: 800, color: cyan, margin: '0 0 2px' }}>{currentMonthUnits} kWh</p>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', margin: 0 }}>₹{currentMonthAmt.toLocaleString()}</p>
              </div>
              <div style={{ flex: 1, background: unpaidMonths > 0 ? '#fef2f2' : '#f0fdf4', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 4px' }}>Total Pending</p>
                <p style={{ fontSize: 18, fontWeight: 800, color: unpaidMonths > 0 ? '#ef4444' : '#16a34a', margin: '0 0 2px' }}>{unpaidMonths}</p>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', margin: 0 }}>Month{unpaidMonths !== 1 ? 's' : ''} Unpaid</p>
              </div>
            </div>
            <button onClick={() => setSubView('meter')} style={{ width: '100%', padding: 10, background: 'rgba(14,165,233,0.08)', border: `1px solid ${cyan}`, color: cyan, borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>bar_chart</span>
              View Monthly Consumption
            </button>
          </Accordion>
        )}

        {profile.type === 'upcoming' && (
          <>
            <Accordion title="Token Amount" icon="payments" defaultOpen={false}>
              <InfoRow label="Amount" value={`₹ ${token.toLocaleString()}`} />
              <InfoRow label="Received by" value="Manager" last />
            </Accordion>
            <Accordion title="Late Fees (Token Expired Fine)" icon="money_off" defaultOpen={false}>
              <InfoRow label="Paid To" value="Owner" />
              <InfoRow label="Paid By" value={profile.name} />
              <InfoRow label="Payment Method" value="UPI" />
              <InfoRow label="Room Rent" value={`₹ ${profile.rent.toLocaleString()}`} last />
            </Accordion>
          </>
        )}

        {profile.type !== 'upcoming' && (
          <Accordion title="Pending Amount" icon="history" defaultOpen={false}>
            <div style={{ textAlign: 'right', padding: '8px 0' }}>
              <span style={{ fontSize: 18, color: pending > 0 ? '#ef4444' : '#16a34a', fontWeight: 800 }}>
                {pending > 0 ? `₹ ${pending.toLocaleString()}` : '✓ All Clear'}
              </span>
            </div>
          </Accordion>
        )}

        <Accordion title="Rent / Security Amount" icon="bed" defaultOpen={true}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'rgba(14,165,233,0.05)', borderRadius: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: '#475569' }}>Rent Of Bed:</span>
            <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 700 }}>₹{rent.toLocaleString()}/month</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'rgba(14,165,233,0.05)', borderRadius: 8 }}>
            <span style={{ fontSize: 12, color: '#475569' }}>Security Amount:</span>
            <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 700 }}>₹{profile.securityAmt.toLocaleString()}</span>
          </div>
        </Accordion>

        {profile.type !== 'upcoming' && (
          <Accordion title="Visitor Details" icon="badge" onHeaderClick={() => setSubView('visitor_history')} />
        )}

        {/* Staff Work — only for current and notice_period */}
        {(profile.type === 'current' || profile.type === 'notice_period') && (
          <Accordion title="Staff Work" icon="engineering" onHeaderClick={() => setSubView('staff_work')} />
        )}

        <Accordion title="Police Verification" icon="local_police" defaultOpen={false}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <span style={{ background: '#dcfce7', color: '#16a34a', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 12 }}>Verified</span>
          </div>
        </Accordion>

        <Accordion title="Document" icon="description" defaultOpen={false}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 600 }}>ID Proof (Aadhar)</span>
            <span style={{ background: '#dcfce7', color: '#16a34a', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 12 }}>Verified</span>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, height: 80, background: '#e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
              <img src="https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=200&h=120&fit=crop" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} alt="ID Front" />
            </div>
            <div style={{ flex: 1, height: 80, background: '#e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
              <img src="https://images.unsplash.com/photo-1621570275815-188b3f81e351?w=200&h=120&fit=crop" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} alt="ID Back" />
            </div>
          </div>
        </Accordion>

        <p style={{ fontSize: 14, fontWeight: 700, color: '#334155', margin: '24px 0 12px' }}>Payment History</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { label: 'June 2025', amount: 10000, date: '05/06/2025' },
            { label: 'May 2025',  amount: 9500,  date: '04/05/2025' },
          ].map((p, i) => (
            <div key={i} onClick={onReceipt} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', padding: '12px 16px', borderRadius: 12, border: '1px solid #e2e8f0', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ color: cyan, fontSize: 18, transform: 'rotate(-45deg)' }}>arrow_upward</span>
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: '0 0 2px' }}>{p.label}</p>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>Sent {p.date}</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>₹{p.amount.toLocaleString()}</p>
                <p style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, margin: 0 }}>Paid</p>
              </div>
            </div>
          ))}
        </div>
        <button onClick={onHistory} style={{ width: '100%', padding: 14, background: 'white', border: `1px solid ${cyan}`, color: cyan, fontWeight: 700, borderRadius: 12, marginTop: 12, cursor: 'pointer' }}>View All History</button>
      </div>
    </>
  );
}

// ─── VIEW 4: PAYMENT HISTORY & LIST ───────────────────────
function PaymentHistoryView({ onBack }) {
  const [tab, setTab] = useState('list');
  const TABS = [
    { id: 'food', label: 'Food', icon: 'restaurant' },
    { id: 'laundry', label: 'Laundry', icon: 'local_laundry_service' },
    { id: 'complain', label: 'Complain', icon: 'report_problem' },
  ];
  return (
    <>
      <Header title={tab === 'list' ? 'Monthly Payment List' : 'History'} onBack={onBack} center={false} />
      <div style={{ padding: 16 }}>
        {tab === 'list' ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              <div style={{ border: `1px dashed ${cyan}`, borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-symbols-outlined" style={{ color: cyan, fontSize: 18 }}>calendar_month</span>
                <div><p style={{ fontSize: 9, color: '#94a3b8', margin: 0 }}>From Date</p><p style={{ fontSize: 12, color: cyan, fontWeight: 600, margin: 0 }}>2 Feb 2025</p></div>
              </div>
              <div style={{ border: `1px dashed ${cyan}`, borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-symbols-outlined" style={{ color: cyan, fontSize: 18 }}>calendar_month</span>
                <div><p style={{ fontSize: 9, color: '#94a3b8', margin: 0 }}>To Date</p><p style={{ fontSize: 12, color: cyan, fontWeight: 600, margin: 0 }}>30 Jun 2025</p></div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { m: 'June 2025',     amt: 10000, paid: true  },
                { m: 'May 2025',      amt: 9500,  paid: true  },
                { m: 'April 2025',    amt: 10200, paid: true  },
                { m: 'March 2025',    amt: 9800,  paid: false },
                { m: 'February 2025', amt: 9000,  paid: false },
              ].map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, background: 'white', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className="material-symbols-outlined" style={{ color: cyan }}>calendar_today</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{r.m}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>₹{r.amt.toLocaleString()}</p>
                    <span style={{ fontSize: 11, fontWeight: 700, color: r.paid ? '#16a34a' : '#ef4444' }}>{r.paid ? '✓ Paid' : '✗ Pending'}</span>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setTab('food')} style={{ width: '100%', padding: 14, background: 'white', border: `1px solid ${cyan}`, color: cyan, fontWeight: 700, borderRadius: 12, marginTop: 16, cursor: 'pointer' }}>Switch to History</button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 12, marginBottom: 24, justifyContent: 'center' }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} style={{ width: 80, height: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, border: tab === t.id ? `1.5px solid ${cyan}` : '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}>
                  <span className="material-symbols-outlined" style={{ color: cyan, fontSize: 28 }}>{t.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{t.label}</span>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#64748b' }}>calendar_today</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>21 January 2025</span>
                    </div>
                    {tab === 'complain' && <span style={{ color: i === 1 ? '#ef4444' : '#16a34a', fontSize: 12, fontWeight: 600 }}>{i === 1 ? 'Pending' : 'Complete'}</span>}
                  </div>
                  {tab === 'complain' ? (
                    <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>Issue: Washing Machine not working.</p>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Payment Mode: Cash · Received By: Manager</p>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>₹ 5,000</p>
                        <p style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, margin: 0 }}>Paid</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button onClick={() => setTab('list')} style={{ width: '100%', padding: 14, background: 'white', border: `1px solid ${cyan}`, color: cyan, fontWeight: 700, borderRadius: 12, marginTop: 16, cursor: 'pointer' }}>Back to Monthly List</button>
          </>
        )}
      </div>
    </>
  );
}

// ─── VIEW 5: RECEIPT ──────────────────────────────────────
function ReceiptView({ user, onBack }) {
  const profile = USER_PROFILES[user?.id] || DEFAULT_PROFILE;
  return (
    <>
      <Header title="Paid Successfully" onBack={onBack} center={false} />
      <div style={{ padding: '24px 20px' }}>
        <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e2e8f0', padding: '24px 20px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 4px' }}>Amount</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>₹ {profile.rent.toLocaleString()}</span>
            <span className="material-symbols-outlined" style={{ background: '#16a34a', color: 'white', borderRadius: '50%', fontSize: 16, padding: 2 }}>check</span>
          </div>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 24px' }}>Paid via Cash</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', padding: '20px 0' }}>
            <div>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 4px' }}>To</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>Manager <span style={{ fontSize: 11, fontWeight: 500, color: '#94a3b8' }}>Febebo PG</span></p>
            </div>
            <div>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 4px' }}>From</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>{profile.name}</p>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0' }}>Room {profile.roomNo} · Bed {profile.bedNo}</p>
            </div>
          </div>
          <div style={{ padding: '20px 0', borderBottom: '1px dashed #cbd5e1' }}>
            {[
              { label: 'Rent',          val: profile.rent - 2000 },
              { label: 'Food Charge',   val: 1000 },
              { label: 'Meter Unit',    val: Math.round(METER_HISTORY[0].units * profile.meterRatePerUnit) },
              { label: 'Laundry',       val: 500 },
              { label: 'Other Charges', val: 500 },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: '#475569' }}>{item.label} :</span>
                <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 600 }}>₹ {item.val.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div style={{ paddingTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 16, color: '#0f172a', fontWeight: 700 }}>Total</span>
              <span style={{ fontSize: 16, color: '#0f172a', fontWeight: 700 }}>₹ {profile.rent.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, color: profile.pending > 0 ? '#ef4444' : '#16a34a', fontWeight: 700 }}>Pending</span>
              <span style={{ fontSize: 14, color: profile.pending > 0 ? '#ef4444' : '#16a34a', fontWeight: 700 }}>{profile.pending > 0 ? `₹ ${profile.pending.toLocaleString()}` : 'None'}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── MAIN CONTROLLER ──────────────────────────────────────
export default function UserProfile() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = location.state?.user || { id: 1, name: 'Rajeev Kumar', phone: '+91 9234567681', room: 15, bed: 3 };
  const [view, setView]       = useState('details');
  const [subView, setSubView] = useState(null);

  const goBack = () => {
    if (subView) { setSubView(null); return; }
    if (view !== 'details') { setView('details'); return; }
    navigate(-1);
  };

  return (
    <div style={BASE}>
      {view === 'details' && <UserDetailsView user={user} onBack={goBack} onReceipt={() => setView('receipt')} onHistory={() => setView('history')} subView={subView} setSubView={setSubView} />}
      {view === 'history' && <PaymentHistoryView onBack={goBack} />}
      {view === 'receipt' && <ReceiptView user={user} onBack={goBack} />}
    </div>
  );
}
