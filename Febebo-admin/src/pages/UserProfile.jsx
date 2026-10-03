import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import DetailedReceiptModal, { CollectPaymentModal } from '../components/DetailedReceiptModal';
import OutstandingDuesModal from '../components/OutstandingDuesModal';
import OutstandingDuesBar from '../components/OutstandingDuesBar';
import { aggregateTenantDues } from '../utils/duesUtils';
import { collection, query, orderBy, onSnapshot, where, updateDoc, doc, writeBatch, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

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
    <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', background: dark ? cyan : 'white', borderBottom: dark ? 'none' : '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 50, ...containerStyle , paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))'}}>
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
  const isPhone = label.toLowerCase().includes('mobile') || label.toLowerCase().includes('phone');
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: last ? 'none' : '1px solid #f1f5f9' }}>
      <span style={{ fontSize: 13, color: '#64748b', minWidth: 120 }}>{label}</span>
      {isPhone && value ? (
        <a href={`tel:${value}`} style={{ fontSize: 13, color: cyan, fontWeight: 600, textAlign: 'right', maxWidth: '55%', textDecoration: 'none' }}>{value}</a>
      ) : (
        <span style={{ fontSize: 13, color: cyan, fontWeight: 600, textAlign: 'right', maxWidth: '55%' }}>{value}</span>
      )}
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

// ─── SUB-VIEW: AMENITIES DETAIL ───────────────────────────
function AmenitiesDetailView({ user, onBack }) {
  const name = user?.name || 'User';
  const [expandedImage, setExpandedImage] = useState(null);
  return (
    <>
      <Header title="Allotted Amenities" onBack={onBack} center={false} />
      <div style={{ padding: 16 }}>
        <div style={{ background: 'linear-gradient(135deg, #0c1a2e, #0f2847)', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <img src={user?.kyc?.profilePhoto || user?.image || user?.img || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&h=120&fit=crop'} alt={name} style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.4)' }} />
          <div>
            <p style={{ margin: 0, fontWeight: 700, color: 'white', fontSize: 15 }}>{name}</p>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>Room {user?.room || '15'} · Bed {user?.bed || '3'}</p>
          </div>
        </div>
        <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {(!user?.amenities || user.amenities.length === 0) ? <p style={{padding: 16, textAlign: 'center', color: '#64748b'}}>No amenities assigned</p> : user.amenities.map((item, idx) => {
            const hasImage = user.amenityImages && user.amenityImages[item];
            return (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderBottom: idx < user.amenities.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {hasImage ? (
                  <img src={hasImage} alt={item} onClick={() => setExpandedImage(hasImage)} style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', border: '1px solid #e2e8f0', cursor: 'pointer' }} />
                ) : (
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: '#fdf4ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#d946ef' }}>stars</span>
                  </div>
                )}
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14, color: '#0f172a', margin: '0 0 2px', textTransform: 'capitalize' }}>{item.replace('custom-', '').replace(/-/g, ' ')}</p>
                </div>
              </div>
              <span style={{ background: '#f1f5f9', color: '#475569', fontWeight: 700, fontSize: 14, padding: '4px 10px', borderRadius: 8 }}>Included</span>
            </div>
          );})}
        </div>
      </div>
      {expandedImage && (
        <div onClick={() => setExpandedImage(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, backdropFilter: 'blur(4px)' }}>
          <img src={expandedImage} alt="Expanded" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: 12, boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }} onClick={(e) => e.stopPropagation()} />
          <div onClick={() => setExpandedImage(null)} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(0,0,0,0.5)', color: 'white', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <span className="material-symbols-outlined">close</span>
          </div>
        </div>
      )}

      {/* Notice Modal */}
      {showNoticeModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => !isSendingNotice && setShowNoticeModal(false)}></div>
          <div style={{ position: 'relative', background: 'white', width: '100%', maxWidth: 400, borderRadius: 20, padding: 20, boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18, color: '#0f172a' }}>Send Notice</h3>
            
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>Student Name</label>
              <input type="text" value={profile.name} disabled style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#94a3b8' }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>Phone Number</label>
              <input type="text" value={profile.phone !== '-' ? profile.phone : (user?.phone || '')} disabled style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#94a3b8' }} />
            </div>
            
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>Notice From</label>
                <input type="date" value={noticeForm.fromDate} onChange={e => setNoticeForm({...noticeForm, fromDate: e.target.value})} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', outlineColor: cyan }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>Notice To</label>
                <input type="date" value={noticeForm.toDate} onChange={e => setNoticeForm({...noticeForm, toDate: e.target.value})} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', outlineColor: cyan }} />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>Date Requested to Leave</label>
              <input type="date" value={noticeForm.leaveDate} onChange={e => setNoticeForm({...noticeForm, leaveDate: e.target.value})} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', outlineColor: cyan }} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>Message to Student</label>
              <textarea value={noticeForm.message} onChange={e => setNoticeForm({...noticeForm, message: e.target.value})} rows={3} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', outlineColor: cyan, resize: 'none', fontFamily: 'inherit' }} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowNoticeModal(false)} disabled={isSendingNotice} style={{ flex: 1, padding: 12, borderRadius: 10, background: '#f1f5f9', color: '#64748b', fontWeight: 600, border: 'none', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSendNotice} disabled={isSendingNotice} style={{ flex: 1, padding: 12, borderRadius: 10, background: cyan, color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {isSendingNotice ? <div style={{ width: 16, height: 16, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> : 'Send Notice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Confirm Modal */}
      {showKickConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => !isKicking && setShowKickConfirm(false)}></div>
          <div style={{ position: 'relative', background: 'white', width: '100%', maxWidth: 320, borderRadius: 20, padding: 24, textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 32 }}>person_remove</span>
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, color: '#0f172a' }}>Remove Student?</h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748b' }}>Are you sure you want to immediately remove <b>{profile.name}</b> from the PG? This action cannot be undone.</p>
            
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowKickConfirm(false)} disabled={isKicking} style={{ flex: 1, padding: 12, borderRadius: 10, background: '#f1f5f9', color: '#64748b', fontWeight: 600, border: 'none', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleKickImmediately} disabled={isKicking} style={{ flex: 1, padding: 12, borderRadius: 10, background: '#ef4444', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {isKicking ? <div style={{ width: 16, height: 16, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> : 'Remove Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── SUB-VIEW: INVENTORY DETAIL ───────────────────────────
function InventoryDetailView({ user, onBack }) {
  const name = user?.name || 'User';
  const [expandedImage, setExpandedImage] = useState(null);
  const [exchangeRequests, setExchangeRequests] = useState([]);
  const [storyModalItem, setStoryModalItem] = useState(null);

  useEffect(() => {
    const uid = user?.id || user?.tenantId;
    if (!uid) return;
    const fetchEx = async () => {
      try {
        const q = query(collection(db, 'inventory_exchange_requests'), where('tenantId', '==', uid));
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        setExchangeRequests(data);
      } catch (e) {
        console.error('Failed to load exchange requests:', e);
      }
    };
    fetchEx();
  }, [user]);

  return (
    <>
      <Header title="Room Inventory" onBack={onBack} center={false} />
      <div style={{ padding: 16 }}>
        <div style={{ background: 'linear-gradient(135deg, #0c1a2e, #0f2847)', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <img src={user?.kyc?.profilePhoto || user?.image || user?.img || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&h=120&fit=crop'} alt={name} style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.4)' }} />
          <div>
            <p style={{ margin: 0, fontWeight: 700, color: 'white', fontSize: 15 }}>{name}</p>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>Room {user?.room || '15'} · Bed {user?.bed || '3'}</p>
          </div>
        </div>
        <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {(!user?.inventory || Object.keys(user.inventory).length === 0) ? <p style={{padding: 16, textAlign: 'center', color: '#64748b'}}>No inventory assigned</p> : Object.keys(user.inventory).map((itemKey, idx) => {
            const hasImage = user.inventory[itemKey];
            const isCustom = itemKey.startsWith('inv-custom-');
            const cleanName = itemKey.replace('inv-custom-', '').replace(/-/g, ' ');

            const itemExchanges = exchangeRequests.filter(r => 
              r.itemId === itemKey ||
              r.itemName?.toLowerCase() === cleanName.toLowerCase() ||
              r.itemName?.toLowerCase() === itemKey.toLowerCase()
            );
            const latestExReq = itemExchanges[0];

            return (
            <div key={idx} style={{ padding: '14px 16px', borderBottom: idx < Object.keys(user.inventory).length - 1 ? '1px solid #f1f5f9' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {hasImage ? (
                    <img src={hasImage} alt={itemKey} onClick={() => setExpandedImage(hasImage)} style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', border: '1px solid #e2e8f0', cursor: 'pointer' }} />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#0ea5e9' }}>{isCustom ? 'inventory_2' : 'chair'}</span>
                    </div>
                  )}
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', margin: '0 0 2px', textTransform: 'capitalize' }}>{cleanName}</p>
                    {latestExReq && (
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: latestExReq.status === 'Confirmed' ? '#ecfdf5' : latestExReq.status === 'Approved' ? '#f0fdf4' : latestExReq.status === 'Disputed' ? '#faf5ff' : latestExReq.status === 'Rejected' ? '#fef2f2' : '#fffbeb',
                        color: latestExReq.status === 'Confirmed' ? '#059669' : latestExReq.status === 'Approved' ? '#16a34a' : latestExReq.status === 'Disputed' ? '#7c3aed' : latestExReq.status === 'Rejected' ? '#dc2626' : '#d97706',
                        display: 'inline-block'
                      }}>
                        {latestExReq.status === 'Confirmed' ? '✓ Exchange Confirmed' : latestExReq.status === 'Approved' ? '⏳ Awaiting Student Confirmation' : latestExReq.status === 'Disputed' ? '⚠️ Disputed by Student' : latestExReq.status === 'Rejected' ? '✕ Exchange Declined' : `⏳ Requested: ${latestExReq.reason}`}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => setStoryModalItem({ name: cleanName, image: hasImage, history: itemExchanges })}
                    style={{
                      background: itemExchanges.length > 0 ? '#ecfeff' : '#f8fafc',
                      border: `1px solid ${itemExchanges.length > 0 ? '#a5f3fc' : '#e2e8f0'}`,
                      borderRadius: 8,
                      padding: '5px 10px',
                      fontSize: 11.5,
                      color: itemExchanges.length > 0 ? '#0891b2' : '#64748b',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>history</span>
                    {itemExchanges.length > 0 ? `Exchange Story (${itemExchanges.length})` : 'Story'}
                  </button>
                  <span style={{ background: '#f1f5f9', color: '#475569', fontWeight: 700, fontSize: 13, padding: '4px 10px', borderRadius: 8 }}>×1</span>
                </div>
              </div>
            </div>
          );})}
        </div>
      </div>

      {/* ── ADMIN ITEM EXCHANGE STORY MODAL ── */}
      {storyModalItem && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 20, maxWidth: 520, width: '100%', padding: '24px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a', textTransform: 'capitalize' }}>
                  📜 Exchange Story: {storyModalItem.name}
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                  Tenant: {name} · Room {user?.room || 'N/A'}
                </p>
              </div>
              <button onClick={() => setStoryModalItem(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#64748b' }}>close</span>
              </button>
            </div>

            {storyModalItem.history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 16px', color: '#94a3b8' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 44, color: '#cbd5e1', marginBottom: 8, display: 'block' }}>history</span>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#334155' }}>No exchange history recorded</p>
                <p style={{ margin: '4px 0 0', fontSize: 12 }}>This item remains in its originally issued allocation.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {storyModalItem.history.map((ex, idx) => {
                  const isApproved = ex.status === 'Approved';
                  const isConfirmed = ex.status === 'Confirmed';
                  const isDisputed = ex.status === 'Disputed';
                  const isRejected = ex.status === 'Rejected';

                  return (
                    <div
                      key={ex.id || idx}
                      style={{
                        background: '#f8fafc',
                        borderRadius: 14,
                        border: '1.5px solid #e2e8f0',
                        borderLeft: isConfirmed ? '4px solid #059669' : isApproved ? '4px solid #16a34a' : isDisputed ? '4px solid #7c3aed' : isRejected ? '4px solid #dc2626' : '4px solid #d97706',
                        padding: 14
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                          Exchange #{storyModalItem.history.length - idx} · {ex.date || (ex.createdAt ? new Date(ex.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A')}
                        </span>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: 6,
                          background: isConfirmed ? '#ecfdf5' : isApproved ? '#f0fdf4' : isDisputed ? '#faf5ff' : isRejected ? '#fef2f2' : '#fffbeb',
                          color: isConfirmed ? '#059669' : isApproved ? '#16a34a' : isDisputed ? '#7c3aed' : isRejected ? '#dc2626' : '#d97706',
                          border: `1px solid ${isConfirmed ? '#a7f3d0' : isApproved ? '#86efac' : isDisputed ? '#ddd6fe' : isRejected ? '#fecaca' : '#fde68a'}`
                        }}>
                          {isConfirmed ? '✓ Confirmed Received' : isApproved ? '⏳ Awaiting Student Confirmation' : isDisputed ? '⚠️ Disputed by Student' : isRejected ? '✕ Declined' : '⏳ In Review'}
                        </span>
                      </div>

                      <div style={{ background: '#fff', borderRadius: 10, padding: 10, border: '1px solid #e2e8f0', marginBottom: 8 }}>
                        <p style={{ margin: '0 0 4px', fontSize: 12.5, color: '#1e293b' }}>
                          Reason: <strong>{ex.reason || 'Exchange'}</strong>
                        </p>
                        {ex.description && (
                          <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>"{ex.description}"</p>
                        )}
                      </div>

                      {/* Photos grid: Student damage photo + Admin replacement photo */}
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                        {ex.photo && (
                          <div style={{ background: '#fff', padding: 6, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>Damage Proof:</span>
                            <img
                              src={ex.photo}
                              alt="Damage Proof"
                              onClick={() => setExpandedImage(ex.photo)}
                              style={{ width: 64, height: 64, borderRadius: 6, objectFit: 'cover', cursor: 'pointer' }}
                            />
                          </div>
                        )}
                        {ex.issuedItemPhoto && (
                          <div style={{ background: '#ecfdf5', padding: 6, borderRadius: 8, border: '1px solid #bbf7d0' }}>
                            <span style={{ fontSize: 10, fontWeight: 800, color: '#166534', display: 'block', marginBottom: 4 }}>Issued Replacement:</span>
                            <img
                              src={ex.issuedItemPhoto}
                              alt="Issued Replacement"
                              onClick={() => setExpandedImage(ex.issuedItemPhoto)}
                              style={{ width: 64, height: 64, borderRadius: 6, objectFit: 'cover', cursor: 'pointer' }}
                            />
                          </div>
                        )}
                      </div>

                      {ex.issuedItemNote && (
                        <p style={{ margin: '0 0 6px', fontSize: 12, color: '#166534', fontWeight: 600 }}>
                          Admin Note: {ex.issuedItemNote}
                        </p>
                      )}

                      {/* Confirmation / Dispute details */}
                      {isConfirmed && (
                        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, padding: '6px 10px', fontSize: 11.5, color: '#065f46', fontWeight: 700 }}>
                          ✓ Student confirmed receipt {ex.confirmedAt ? `on ${new Date(ex.confirmedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}
                        </div>
                      )}

                      {isDisputed && (
                        <div style={{ background: '#faf5ff', border: '1px solid #ddd6fe', borderRadius: 8, padding: '6px 10px', fontSize: 11.5, color: '#6d28d9', fontWeight: 600 }}>
                          ⚠️ Disputed by Student: {ex.disputeNote || 'Replacement not received or defective'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={() => setStoryModalItem(null)}
              style={{ width: '100%', marginTop: 16, padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, color: '#475569', cursor: 'pointer' }}
            >
              Close Story
            </button>
          </div>
        </div>
      )}

      {expandedImage && (
        <div onClick={() => setExpandedImage(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, backdropFilter: 'blur(4px)' }}>
          <img src={expandedImage} alt="Expanded" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: 12, boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }} onClick={(e) => e.stopPropagation()} />
          <div onClick={() => setExpandedImage(null)} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(0,0,0,0.5)', color: 'white', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <span className="material-symbols-outlined">close</span>
          </div>
        </div>
      )}
    </>
  );
}

// ─── SUB-VIEW: METER HISTORY ──────────────────────────────
function MeterHistoryView({ profile, meterBills, initialMeter, joiningDate, onBack }) {
  const [expandedMonth, setExpandedMonth] = useState(null);

  const unpaidBills    = (meterBills || []).filter(b => b.status !== 'Paid');
  const totalUnpaidAmt = unpaidBills.reduce((s, b) => s + (b.totalAmount || 0), 0);

  const fmtDate = iso => {
    try { return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return '—'; }
  };

  return (
    <>
      <Header title="Monthly Consumption" onBack={onBack} center={false} />
      <div style={{ padding: 16 }}>

        {/* Joining reading info card */}
        {(initialMeter !== undefined && initialMeter !== null && initialMeter !== '') && (
          <div style={{ background: 'linear-gradient(135deg, #0c1a2e, #1e3a5f)', borderRadius: 14, padding: '14px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Meter Reading When Joined</p>
              <p style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 900, color: '#38bdf8' }}>{Number(initialMeter).toLocaleString()} <span style={{ fontSize: 13, fontWeight: 600 }}>kWh</span></p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{fmtDate(joiningDate)}</p>
            </div>
            <span className="material-symbols-outlined" style={{ fontSize: 36, color: 'rgba(56,189,248,0.4)' }}>electric_meter</span>
          </div>
        )}

        {/* Unpaid summary */}
        {totalUnpaidAmt > 0 && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-symbols-outlined" style={{ color: '#ef4444', fontSize: 20 }}>warning</span>
              <span style={{ fontSize: 13, color: '#ef4444', fontWeight: 700 }}>{unpaidBills.length} Unpaid Bill{unpaidBills.length > 1 ? 's' : ''}</span>
            </div>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#ef4444' }}>₹{totalUnpaidAmt.toLocaleString()}</span>
          </div>
        )}

        {(meterBills || []).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>bolt</span>
            <p style={{ margin: 0, fontSize: 14 }}>No bills generated yet</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(meterBills || []).map((b, i) => {
              const isPaid     = b.status === 'Paid';
              const isExpanded = expandedMonth === i;
              const monthName  = b.billMonth || (b.date ? new Date(b.date).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : 'Unknown Month');
              const units      = b.consumedUnits || 0;
              const amount     = b.totalAmount   || 0;
              const rate       = b.ratePerUnit   || 8;

              return (
                <div key={b.id || i} style={{ background: 'white', borderRadius: 14, border: `1px solid ${isPaid ? '#e2e8f0' : '#fecaca'}`, overflow: 'hidden' }}>
                  {/* Header row */}
                  <button onClick={() => setExpandedMonth(isExpanded ? null : i)}
                    style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 16px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: isPaid ? '#f0fdf4' : '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 20, color: isPaid ? '#16a34a' : '#ef4444' }}>bolt</span>
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{monthName}</p>
                        <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{units} kWh · ₹{amount.toFixed(2)}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ background: isPaid ? '#dcfce7' : '#fef2f2', color: isPaid ? '#16a34a' : '#ef4444', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                        {isPaid ? '✓ Paid' : '✗ Unpaid'}
                      </span>
                      <span className="material-symbols-outlined" style={{ color: '#94a3b8', fontSize: 18, transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>expand_more</span>
                    </div>
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid #f1f5f9', padding: '14px 16px', background: '#f8fafc' }}>

                      {/* Reading details grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                        {[
                          { label: 'Your Joining Reading', val: `${(b.meterReadingAtJoin || 0).toLocaleString()} kWh`, icon: 'login', color: '#7c3aed' },
                          { label: 'Period Start Reading', val: `${(b.meterReadingAtBillStart || b.prevReading || 0).toLocaleString()} kWh`, icon: 'start', color: '#0891b2' },
                          { label: 'Period End Reading',   val: `${(b.meterReadingAtBillEnd || b.currReading || 0).toLocaleString()} kWh`, icon: 'flag', color: '#0891b2' },
                          { label: 'Your Units',           val: `${units} kWh`, icon: 'bolt', color: '#d97706' },
                          { label: 'Rate per Unit',        val: `₹${rate}/kWh`, icon: 'currency_rupee', color: '#64748b' },
                          { label: 'Your Bill',            val: `₹${amount.toFixed(2)}`, icon: 'receipt', color: isPaid ? '#16a34a' : '#ef4444' },
                        ].map(d => (
                          <div key={d.label} style={{ background: 'white', borderRadius: 10, padding: '10px 12px', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 13, color: d.color }}>{d.icon}</span>
                              <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>{d.label}</span>
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{d.val}</span>
                          </div>
                        ))}
                      </div>

                      {/* How this was calculated */}
                      <div style={{ background: '#ecfeff', borderRadius: 10, padding: '10px 12px', marginBottom: 12, border: '1px solid #a5f3fc' }}>
                        <p style={{ margin: 0, fontSize: 11, color: '#0e7490', fontWeight: 600, lineHeight: 1.4 }}>
                          💡 Bill = Units used in periods where you were present, split among co-residents active in each period.
                        </p>
                      </div>

                      {/* Bill date */}
                      {b.date && (
                        <p style={{ margin: '0 0 10px', fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>Generated on {fmtDate(b.date)}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

// ─── SUB-VIEW: ROOM DETAILS REDIRECT ─────────────────────
function RoomPreviewView({ profile, user, onBack }) {
  const navigate = useNavigate();
  const room = ROOMS_DATA.find(r => r.roomNo === String(profile?.roomNo || user?.room)) || {
    name: 'Room ' + (profile?.roomNo || user?.room || ''),
    type: 'Standard Room',
    beds: 1,
    status: 'occupied',
    img: 'https://images.unsplash.com/photo-1522771731478-44eb10e5c8ba?w=400&h=220&fit=crop'
  };
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
  const [visitorHistory, setVisitorHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tenantUid = user?.id || user?.uid || user?.tenantId;
    if (!tenantUid) { setLoading(false); return; }
    const qV = query(collection(db, 'visitors'), where('tenantId', '==', tenantUid));
    const unsubV = onSnapshot(qV, (snap) => {
      setVisitorHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsubV();
  }, [user]);

  if (selectedVisitor) {
    const visits = visitorHistory.filter(v => v.name === selectedVisitor.name).sort((a, b) => new Date(b.date) - new Date(a.date));
    return (
      <>
        <Header title={selectedVisitor.name} onBack={() => setSelectedVisitor(null)} center={false} />
        <div style={{ padding: 16 }}>
          <div style={{ marginBottom: 16, background: 'white', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 4px' }}>Relation: <span style={{ color: '#0f172a', fontWeight: 600 }}>{selectedVisitor.relation}</span></p>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 4px' }}>Address: <span style={{ color: '#0f172a', fontWeight: 600 }}>{selectedVisitor.address || 'N/A'}</span></p>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 4px' }}>Phone: <a href={`tel:${selectedVisitor.number}`} style={{ color: '#0f172a', fontWeight: 600, textDecoration: 'none' }}>{selectedVisitor.number}</a></p>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 12px' }}>ID Proof: <span style={{ color: '#0f172a', fontWeight: 600 }}>{selectedVisitor.idProof || 'N/A'}</span></p>
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: 8, border: '1px dashed #cbd5e1', textAlign: 'center' }}>
              <img src="https://placehold.co/400x250/e2e8f0/64748b?text=Aadhaar+Front" alt="ID Proof Front" style={{ width: '100%', borderRadius: 6, objectFit: 'cover', marginBottom: 8 }} />
              <img src="https://placehold.co/400x250/e2e8f0/64748b?text=Aadhaar+Back" alt="ID Proof Back" style={{ width: '100%', borderRadius: 6, objectFit: 'cover' }} />
            </div>
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

  const grouped = visitorHistory.reduce((acc, v) => {
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
        <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 16 }}>Electrician, Plumber &amp; Others — coming soon</p>
      </div>
    </>
  );
}

// ─── MAIN DETAILS VIEW ────────────────────────────────────
function UserDetailsView({ user, onBack, onReceipt, onHistory, onMoveOut, onCollectPayment, subView, setSubView }) {
  const navigate = useNavigate();
  const [fullUser, setFullUser] = useState(user);
  const [realPayments, setRealPayments] = useState([]);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // ── DOM-injected fullscreen modal (bypasses overflow:hidden on parent shell) ──
  useEffect(() => {
    const existing = document.getElementById('__doc_modal_overlay__');
    if (existing) existing.remove();
    if (!fullscreenImage) return;

    const overlay = document.createElement('div');
    overlay.id = '__doc_modal_overlay__';
    Object.assign(overlay.style, {
      position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.95)', zIndex: '2147483647',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    });

    // Close button
    const btnRow = document.createElement('div');
    Object.assign(btnRow.style, { position: 'absolute', top: '20px', right: '20px', display: 'flex', gap: '12px' });

    const dlBtn = document.createElement('button');
    Object.assign(dlBtn.style, { background: 'white', border: 'none', borderRadius: '50%', width: '44px', height: '44px', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' });
    dlBtn.innerHTML = '⬇';
    dlBtn.title = 'Download';
    dlBtn.onclick = async () => {
      try {
        const res = await fetch(fullscreenImage);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `document_${Date.now()}.jpg`;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
      } catch { window.open(fullscreenImage, '_blank'); }
    };

    const closeBtn = document.createElement('button');
    Object.assign(closeBtn.style, { background: 'white', border: 'none', borderRadius: '50%', width: '44px', height: '44px', fontSize: '22px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' });
    closeBtn.innerHTML = '✕';
    closeBtn.onclick = () => setFullscreenImage(null);

    btnRow.appendChild(dlBtn);
    btnRow.appendChild(closeBtn);

    const img = document.createElement('img');
    img.src = fullscreenImage;
    Object.assign(img.style, { maxWidth: '92%', maxHeight: '80%', objectFit: 'contain', borderRadius: '12px' });

    overlay.appendChild(btnRow);
    overlay.appendChild(img);
    overlay.onclick = (e) => { if (e.target === overlay) setFullscreenImage(null); };
    document.body.appendChild(overlay);

    return () => { const el = document.getElementById('__doc_modal_overlay__'); if (el) el.remove(); };
  }, [fullscreenImage]);
  const [realUnits, setRealUnits] = useState(0);
  const [realAmount, setRealAmount] = useState(0);
  const [realMonth, setRealMonth] = useState('');
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [noticeForm, setNoticeForm] = useState({ fromDate: '', toDate: '', leaveDate: '', message: '' });
  const [isSendingNotice, setIsSendingNotice] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  const handleSendNotice = async () => {
    if(!noticeForm.fromDate || !noticeForm.toDate || !noticeForm.leaveDate || !noticeForm.message) {
      alert('Please fill all fields');
      return;
    }
    setIsSendingNotice(true);
    try {
      const uid = user.tenantId || user.id || user.uid;
      const batch = writeBatch(db);
      
      // Update tenant status
      batch.update(doc(db, 'tenants', uid), {
        status: 'On Notice Period',
        noticeDate: noticeForm.leaveDate,
        noticeFrom: noticeForm.fromDate,
        noticeTo: noticeForm.toDate,
        noticeMessage: noticeForm.message
      });

      // Update user subscribedPG status
      if (fullUser?.subscribedPG) {
        batch.update(doc(db, 'users', uid), {
          'subscribedPG.status': 'On Notice Period'
        });
      }

      // Add Notification
      batch.set(doc(collection(db, 'users', uid, 'notifications')), {
        title: 'Notice Period Started',
        desc: `${noticeForm.message}\nClear your all dues before leaving the PG on ${noticeForm.leaveDate}.`,
        type: 'warning',
        createdAt: new Date().toISOString(),
        unread: true
      });

      await batch.commit();
      setShowNoticeModal(false);
      alert('Notice sent successfully!');
    } catch(err) {
      console.error(err);
      alert('Failed to send notice.');
    } finally {
      setIsSendingNotice(false);
    }
  };

  const handleRemoveImmediately = async () => {
    setIsRemoving(true);
    try {
      const tenantDocId = user.id || user.tenantId || user.uid;
      const studentUid = user.tenantId || user.uid || user.id;
      const batch = writeBatch(db);
      const nowIso = new Date().toISOString();
      
      // Update tenant status to Removed so they appear in Removed Students tab
      batch.update(doc(db, 'tenants', tenantDocId), {
        status: 'Removed',
        removedAt: nowIso,
        movedOutDate: nowIso
      });

      // Remove subscribedPG from users so they return to normal explore view,
      // while PRESERVING all user profile details (name, phone, kyc, address, parents, etc.)
      batch.update(doc(db, 'users', studentUid), {
        subscribedPG: null,
        pgStatus: null,
        currentPG: null
      });

      // Add Notification
      batch.set(doc(collection(db, 'users', studentUid, 'notifications')), {
        title: 'Removed from PG',
        desc: 'You have been removed from the PG by the Admin. You can now explore other PGs.',
        type: 'warning',
        createdAt: nowIso,
        unread: true
      });

      await batch.commit();
      setShowRemoveConfirm(false);
      alert('Student removed successfully!');
      onBack();
    } catch(err) {
      console.error(err);
      alert('Failed to remove student.');
    } finally {
      setIsRemoving(false);
    }
  };
  // Backward compatibility alias
  const handleKickImmediately = handleRemoveImmediately;
  const isKicking = isRemoving;
  const showKickConfirm = showRemoveConfirm;
  const setShowKickConfirm = setShowRemoveConfirm;

  const { user: authUser, activePgId } = useAuth();
  const [realUnpaid, setRealUnpaid] = useState(0);
  const [realMeterBills, setRealMeterBills] = useState([]);
  const [realOutstandingDues, setRealOutstandingDues] = useState([]);
  const [realRentReceipts, setRealRentReceipts] = useState([]);
  const [showOutstandingDuesModal, setShowOutstandingDuesModal] = useState(false);

  // Co-Residents / Roommates Management State
  const [showAddCoResidentModal, setShowAddCoResidentModal] = useState(false);
  const [newCoResident, setNewCoResident] = useState({ name: '', phone: '', relation: 'Roommate', aadhar: '' });
  const [isSavingCoResident, setIsSavingCoResident] = useState(false);

  const handleSaveCoResident = async () => {
    if (!newCoResident.name.trim()) return;
    setIsSavingCoResident(true);
    try {
      const uid = user.tenantId || user.id || user.uid;
      const currentList = fullUser?.coResidents || fullUser?.subscribedPG?.coResidents || user?.coResidents || [];
      const updatedList = [...currentList, { ...newCoResident, id: 'cr_' + Date.now() }];
      
      // Update users doc
      await updateDoc(doc(db, 'users', uid), {
        coResidents: updatedList,
        'subscribedPG.coResidents': updatedList
      });
      // Update tenants doc
      await updateDoc(doc(db, 'tenants', uid), {
        coResidents: updatedList,
        'subscribedPG.coResidents': updatedList
      }).catch(() => {});
      
      setNewCoResident({ name: '', phone: '', relation: 'Roommate', aadhar: '' });
      setShowAddCoResidentModal(false);
    } catch (err) {
      console.error('Failed to save co-resident:', err);
    } finally {
      setIsSavingCoResident(false);
    }
  };

  const handleRemoveCoResident = async (crId, index) => {
    const uid = user.tenantId || user.id || user.uid;
    const currentList = fullUser?.coResidents || fullUser?.subscribedPG?.coResidents || user?.coResidents || [];
    const updatedList = currentList.filter((cr, idx) => (cr.id ? cr.id !== crId : idx !== index));
    try {
      await updateDoc(doc(db, 'users', uid), {
        coResidents: updatedList,
        'subscribedPG.coResidents': updatedList
      });
      await updateDoc(doc(db, 'tenants', uid), {
        coResidents: updatedList,
        'subscribedPG.coResidents': updatedList
      }).catch(() => {});
    } catch (err) {
      console.error('Failed to delete co-resident:', err);
    }
  };

  useEffect(() => {
    if (!user) return;
    const uid = user.tenantId || user.id || user.uid;
    if (!uid) return;
    
    // Fetch full user details from users collection
    const unsubUser = onSnapshot(doc(db, 'users', uid), (d) => {
      if (d.exists()) setFullUser(prev => ({ ...prev, ...d.data() }));
    });
    
    // Fetch full tenant details from tenants collection
    const unsubTenant = onSnapshot(doc(db, 'tenants', uid), (d) => {
      if (d.exists()) setFullUser(prev => ({ ...prev, ...d.data() }));
    });
    
    // Fetch payments
    const qPay = query(collection(db, 'users', uid, 'payments'), orderBy('createdAt', 'desc'));
    const unsubPay = onSnapshot(qPay, (snap) => {
      setRealPayments(snap.docs.map(d => ({ docId: d.id, ...d.data() })));
    });
    
    // Fetch meters
    const qMeter = query(collection(db, 'meter_bills'), where('tenantId', '==', uid));
    const unsubMeter = onSnapshot(qMeter, (snap) => {
      let bills = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      bills.sort((a,b) => new Date(b.date || b.billDate || 0) - new Date(a.date || a.billDate || 0));
      setRealMeterBills(bills);
      if(bills.length > 0) {
        setRealUnits(bills[0].consumedUnits || 0);
        setRealAmount(bills[0].totalAmount || (bills[0].consumedUnits * (bills[0].ratePerUnit || 8)));
        setRealMonth(bills[0].billMonth || new Date(bills[0].date).toLocaleString('default', { month: 'long' }));
      }
      setRealUnpaid(bills.filter(b => b.status === 'Unpaid').length);
    });

    // Fetch custom / recorded outstanding dues
    const qDues = query(collection(db, 'outstanding_dues'), where('tenantId', '==', uid));
    const unsubDues = onSnapshot(qDues, (snap) => {
      setRealOutstandingDues(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Fetch rent receipts
    const qReceipts = query(collection(db, 'rent_receipts'), where('tenantId', '==', uid));
    const unsubReceipts = onSnapshot(qReceipts, (snap) => {
      setRealRentReceipts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    
    return () => { unsubUser(); unsubTenant(); unsubPay(); unsubMeter(); unsubDues(); unsubReceipts(); };
  }, [user]);

  const profile = {
    roomType: fullUser?.subscribedPG?.seaterLabel || fullUser?.subscribedPG?.roomType || fullUser?.demandedToken?.seaterLabel || user?.seaterLabel || '-',
    type: user?.status === 'Approved' || fullUser?.status === 'Approved' ? 'current' : 'upcoming',
    leaseType: fullUser?.leaseType || fullUser?.subscribedPG?.leaseType || user?.leaseType || user?.subscribedPG?.leaseType || 'bed_sharing',
    foodIncluded: fullUser?.foodIncluded !== undefined ? fullUser.foodIncluded : (fullUser?.subscribedPG?.foodIncluded !== undefined ? fullUser.subscribedPG.foodIncluded : (user?.foodIncluded !== undefined ? user.foodIncluded : (user?.subscribedPG?.foodIncluded !== undefined ? user.subscribedPG.foodIncluded : true))),
    includedFoodPersons: fullUser?.includedFoodPersons || fullUser?.subscribedPG?.includedFoodPersons || user?.includedFoodPersons || 1,
    coResidents: fullUser?.coResidents || fullUser?.subscribedPG?.coResidents || user?.coResidents || [],
    isPrimaryPayer: fullUser?.isPrimaryPayer || user?.isPrimaryPayer || false,
    name: fullUser?.name || user?.name || '-' ,
    phone: fullUser?.phone || user?.phone || '-' ,
    email: fullUser?.email || user?.email || '-' ,
    dob: fullUser?.kycData?.dob || fullUser?.dob || '-' ,
    bloodGroup: fullUser?.emergencyContact?.bloodGroup || fullUser?.bloodGroup || '-' ,
    aadhar: fullUser?.kycData?.aadharNumber || fullUser?.kyc?.aadharNumber || fullUser?.kyc?.aadhaarNumber || fullUser?.aadhar || '-' ,
    aadharFront: fullUser?.kycData?.aadharFront || fullUser?.kyc?.aadharFront || '' ,
    aadharBack: fullUser?.kycData?.aadharBack || fullUser?.kyc?.aadharBack || '' ,
    address: fullUser?.address || '-' ,
    permanentAddress: fullUser?.kycData?.permanentAddress || fullUser?.permanentAddress || '-' ,
    correspondingAddress: fullUser?.kycData?.correspondingAddress || fullUser?.correspondingAddress || '-' ,
    schoolAddress: fullUser?.occupation?.address || fullUser?.schoolAddress || '-' ,
    college: fullUser?.kycData?.collegeName || fullUser?.occupation?.details || fullUser?.college || '-' ,
    companyName: fullUser?.kycData?.companyName || fullUser?.occupation?.details || fullUser?.company || '-' ,
    careerStatus: fullUser?.kycData?.occupationType || fullUser?.occupation?.type || fullUser?.career || 'Student' ,
    fatherName: fullUser?.kycData?.fatherName || fullUser?.parentsDetails?.fatherName || fullUser?.fatherName || '-' ,
    motherName: fullUser?.kycData?.motherName || fullUser?.parentsDetails?.motherName || fullUser?.motherName || '-' ,
    fatherPhone: fullUser?.kycData?.fatherPhone || fullUser?.parentsDetails?.fatherPhone || fullUser?.fatherPhone || '-' ,
    motherPhone: fullUser?.kycData?.motherPhone || fullUser?.parentsDetails?.motherPhone || fullUser?.motherPhone || '-' ,
    parentsAddress: fullUser?.kycData?.parentsAddress || fullUser?.parentsDetails?.address || fullUser?.parentsAddress || '-' ,
    joiningDate: fullUser?.subscribedPG?.dateOfJoining ? new Date(fullUser.subscribedPG.dateOfJoining).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : (fullUser?.dateOfJoining || fullUser?.joiningDate || user?.joiningDate || '-') ,
    tentativeLeaving: fullUser?.tentativeLeaving || '-' ,
    dateOfLeaving: fullUser?.dateOfLeaving || '-' ,
    dateOfTokenAmount: fullUser?.subscribedPG?.tokenDate ? new Date(fullUser.subscribedPG.tokenDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : (fullUser?.dateOfTokenAmount || (fullUser?.createdAt ? new Date(fullUser.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-')) ,
    roomNo: fullUser?.subscribedPG?.roomNo || fullUser?.roomNo || user?.subscribedPG?.roomNo || user?.roomNo || user?.room || '-' ,
    bedNo: fullUser?.subscribedPG?.bedNo || fullUser?.bedNo || user?.subscribedPG?.bedNo || user?.bedNo || user?.bed || '-' ,
    rent: fullUser?.subscribedPG?.rent || user?.subscribedPG?.rent || fullUser?.rent || user?.rent || fullUser?.rentAmount || user?.rentAmount || 0,
    token: fullUser?.subscribedPG?.tokenPaid !== undefined ? fullUser?.subscribedPG?.tokenPaid : (user?.subscribedPG?.tokenPaid !== undefined ? user?.subscribedPG?.tokenPaid : (fullUser?.tokenPaid !== undefined ? fullUser?.tokenPaid : (user?.tokenPaid || user?.token || 0))),
    pending: fullUser?.subscribedPG?.remainingAmount !== undefined ? fullUser?.subscribedPG?.remainingAmount : (user?.subscribedPG?.remainingAmount !== undefined ? user?.subscribedPG?.remainingAmount : ((user?.status === 'Approved' || fullUser?.status === 'Approved') ? (fullUser?.currentMonthPending || 0) : (fullUser?.remainingAmount !== undefined ? fullUser?.remainingAmount : (fullUser?.pending || 0)))),
    securityAmt: fullUser?.subscribedPG?.securityAmount || user?.subscribedPG?.securityAmount || fullUser?.securityAmount || user?.securityAmount || fullUser?.securityDeposit || user?.securityDeposit || user?.deposit || 0,
    meterRatePerUnit: user?.meterRatePerUnit || 8,
  };

  const [activeTab, setActiveTab] = useState('overview');
  if (subView === 'inventory') return <InventoryDetailView user={fullUser} onBack={() => setSubView(null)} />;
  if (subView === 'amenities') return <AmenitiesDetailView user={fullUser} onBack={() => setSubView(null)} />;
  if (subView === 'visitor')   return <VisitorHistoryView user={user} onBack={() => setSubView(null)} />;
  if (subView === 'room')      return <RoomPreviewView profile={profile} user={user} onBack={() => setSubView(null)} />;
  if (subView === 'meter')     return <MeterHistoryView profile={profile} meterBills={realMeterBills} initialMeter={fullUser?.meterReading} joiningDate={fullUser?.dateOfJoining || fullUser?.joiningDate || user?.joiningDate || '-'} onBack={() => setSubView(null)} />;
  const rent = profile.rent;
  const token = profile.token;
  const pending = profile.pending;
  const currentMonthUnits = realUnits;
  const currentMonthAmt   = realAmount;
  const unpaidMonths      = realUnpaid;

  const currentTenantObj = fullUser || user;
  const duesData = aggregateTenantDues({
    tenant: currentTenantObj,
    rentReceipts: realRentReceipts,
    meterBills: realMeterBills,
    customDues: realOutstandingDues
  });

  return (
    <>
      {profile.type === 'notice_period' && profile.pending > 0 && (
        <div style={{ background: '#ef4444', color: 'white', padding: '10px 16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>warning</span>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Notice Period: ₹{profile.pending.toLocaleString()} Pending</span>
        </div>
      )}
      <Header title="User Details" onBack={onBack} center={true} dark={true} containerStyle={{ position: 'relative', zIndex: 1 }} action={
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'white', padding: '4px 8px', borderRadius: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: cyan }}>4.3</span>
          <span className="material-symbols-outlined" style={{ fontSize: 14, color: cyan }}>star</span>
        </div>
      }/>

      <div style={{ background: cyan, padding: '0 16px 24px', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
        <div style={{ background: 'white', borderRadius: 16, padding: 16, display: 'flex', gap: 16, alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <img src={user?.image || user?.img || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop'} alt={profile.name} style={{ width: 80, height: 80, borderRadius: 12, objectFit: 'cover' }} />
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: 18, color: '#0f172a' }}>{profile.name}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: cyan }}>badge</span>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                {user?.studentId
                  ? user.studentId
                  : (user?.id
                    ? '#FB-' + String(user.id).slice(0, 8).toUpperCase()
                    : '#FB-??????')}
              </span>
            </div>
            <a href={`tel:${profile.phone !== '-' ? profile.phone : (user?.phone || '+91 9234567681')}`} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, textDecoration: 'none', background: '#ecfeff', padding: '6px 12px', borderRadius: '20px', border: `1px solid ${cyan}`, width: 'fit-content' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: cyan }}>call</span>
              <span style={{ fontSize: 13, color: cyan, fontWeight: 700 }}>Call {profile.name.split(' ')[0]}</span>
            </a>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: cyan }}>calendar_month</span>
              <span style={{ fontSize: 12, color: '#64748b' }}>{profile.joiningDate}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: cyan }}>meeting_room</span>
              <span style={{ fontSize: 12, color: '#64748b' }}>{profile.roomType} · Room {profile.roomNo} · Bed {profile.bedNo}</span>
            </div>
          </div>
        </div>

        {/* ── UNIFIED OUTSTANDING DUES AGGREGATED BAR ── */}
        <OutstandingDuesBar
          duesData={duesData}
          onClick={() => setShowOutstandingDuesModal(true)}
          style={{ marginTop: 14 }}
        />
        {(user?.status === 'Removed' || user?.status === 'Moved Out' || fullUser?.status === 'Removed' || fullUser?.status === 'Moved Out') ? (
          <div style={{ marginTop: 12, background: '#fee2e2', border: '1.5px solid #fca5a5', borderRadius: '14px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ color: '#dc2626', fontSize: 20 }}>person_off</span>
            <span style={{ color: '#991b1b', fontWeight: 800, fontSize: 13 }}>Student Removed from PG</span>
          </div>
        ) : (
          <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
            <button 
              onClick={() => {
                setNoticeForm(prev => ({...prev, message: 'Please clear your all dues before leaving the PG.'}));
                setShowNoticeModal(true);
              }}
              style={{ flex: 1, background: '#fefce8', color: '#92400e', border: '2px solid #fbbf24', padding: '12px 8px', borderRadius: '14px', fontWeight: '800', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(251,191,36,0.3)' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>notifications_active</span>
              Send Notice
            </button>
            
            <button 
              onClick={() => setShowRemoveConfirm(true)}
              style={{ flex: 1, background: '#fef2f2', color: '#991b1b', border: '2px solid #f87171', padding: '12px 8px', borderRadius: '14px', fontWeight: '800', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(239,68,68,0.25)' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>person_remove</span>
              Remove Student
            </button>
          </div>
        )}
      </div>

      <div style={{ padding: 16 }}>
        <Accordion title="Personal Details" icon="person_outline" defaultOpen={true}>
          <InfoRow label="Full Name" value={profile.name} />
          <InfoRow label="Date of Birth" value={profile.dob} />
          <InfoRow label="Email" value={profile.email} />
          <InfoRow label="Aadhar No." value={profile.aadhar} />
          <InfoRow label="Career" value={profile.careerStatus} />
          {profile.careerStatus === 'Student' ? <InfoRow label="College" value={profile.college} /> : <InfoRow label="Company" value={profile.companyName} />}
          <InfoRow label="Permanent Address" value={profile.permanentAddress} last />
        </Accordion>

        <Accordion title="Parents Details" icon="family_restroom" defaultOpen={true}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', margin: '8px 0 4px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Father</p>
          <InfoRow label="Name" value={profile.fatherName} />
          <InfoRow label="Mobile" value={profile.fatherPhone} />
          <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', margin: '12px 0 4px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Mother</p>
          <InfoRow label="Name" value={profile.motherName} />
          <InfoRow label="Mobile" value={profile.motherPhone} last />
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
          {profile.leaseType === 'entire_room' ? (
            <>
              <InfoRow label="Lease Model" value="🏢 Entire Flat / Single Payer" />
              <InfoRow label="Mess / Food" value={profile.foodIncluded ? `🍽️ Included (${profile.includedFoodPersons || 1} Persons)` : '🚫 Self-Cooking (Excluded)'} />
            </>
          ) : (
            <>
              <InfoRow label="Bed Number" value={`Bed ${profile.bedNo}`} />
              <InfoRow label="Mess / Food" value={profile.foodIncluded ? '🍽️ Included' : '🚫 Excluded (Self-Cooking)'} />
            </>
          )}
          <div style={{ marginTop: 12 }}>
            <button onClick={() => setSubView('room')} style={{ width: '100%', padding: 10, background: 'rgba(14,165,233,0.08)', border: `1px solid ${cyan}`, color: cyan, borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>meeting_room</span>
              View Room Details
            </button>
          </div>
        </Accordion>

        <Accordion 
          title="Roommates & Co-Residents" 
          icon="group" 
          defaultOpen={profile.leaseType === 'entire_room' || profile.coResidents.length > 0}
          badge={profile.coResidents.length > 0 ? `${profile.coResidents.length} Roommate${profile.coResidents.length > 1 ? 's' : ''}` : null}
        >
          <div style={{ padding: '4px 0' }}>
            {profile.coResidents.length === 0 ? (
              <p style={{ margin: '8px 0 12px', fontSize: 13, color: '#94a3b8', textAlign: 'center' }}>
                No non-paying co-residents or roommates registered yet.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                {profile.coResidents.map((cr, idx) => (
                  <div key={cr.id || idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>{cr.name}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: '#e0f2fe', color: '#0369a1' }}>
                            {cr.relation || 'Roommate'}
                          </span>
                        </div>
                        {cr.phone && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#64748b' }}>call</span>
                            <a href={`tel:${cr.phone}`} style={{ fontSize: 13, color: cyan, fontWeight: 700, textDecoration: 'none' }}>
                              {cr.phone}
                            </a>
                          </div>
                        )}
                        {cr.aadhar && (
                          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
                            ID/Aadhaar: <strong style={{ color: '#334155' }}>{cr.aadhar}</strong>
                          </p>
                        )}
                      </div>
                      <button 
                        onClick={() => handleRemoveCoResident(cr.id, idx)}
                        style={{ background: '#fee2e2', border: 'none', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Remove Roommate"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button 
              onClick={() => setShowAddCoResidentModal(true)}
              style={{ width: '100%', padding: '10px', background: '#f0fdf4', border: '1.5px dashed #16a34a', color: '#166534', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person_add</span>
              + Add Roommate / Co-Resident
            </button>
          </div>
        </Accordion>

        <Accordion title="Inventory Allotted" icon="inventory_2" onHeaderClick={() => setSubView('inventory')} />
        <Accordion title="Amenities Allotted" icon="chair" onHeaderClick={() => setSubView('amenities')} />

        {profile.type !== 'upcoming' && (
          <Accordion title="Meter Unit Details" icon="electric_meter" defaultOpen={true}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1, background: '#ecfeff', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 4px' }}>This Month ({realMonth || new Date().toLocaleString('default', { month: 'long' })})</p>
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
          <Accordion title="Visitor Details" icon="badge" onHeaderClick={() => setSubView('visitor')} />
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

        <Accordion title="Document" icon="description" defaultOpen={true}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 600 }}>ID Proof (Aadhar)</span>
            <span style={{ background: '#dcfce7', color: '#16a34a', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 12 }}>Verified</span>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, height: 80, background: '#e2e8f0', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', position: 'relative' }} onClick={() => {
              if (profile.aadharFront) {
                setFullscreenImage(profile.aadharFront);
              }
            }}>
              {profile.aadharFront ? (
                <>
                  <img src={profile.aadharFront} style={{ width: '100%' , height: '100%' , objectFit: 'cover', pointerEvents: 'none' }} alt="ID Front" />
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span className="material-symbols-outlined" style={{ color: 'white', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>zoom_in</span>
                  </div>
                </>
              ) : <div style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'#94a3b8'}}>No Front ID</div>}
            </div>
            <div style={{ flex: 1, height: 80, background: '#e2e8f0', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', position: 'relative' }} onClick={() => {
              if (profile.aadharBack) {
                setFullscreenImage(profile.aadharBack);
              }
            }}>
              {profile.aadharBack ? (
                <>
                  <img src={profile.aadharBack} style={{ width: '100%' , height: '100%' , objectFit: 'cover', pointerEvents: 'none' }} alt="ID Back" />
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span className="material-symbols-outlined" style={{ color: 'white', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>zoom_in</span>
                  </div>
                </>
              ) : <div style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'#94a3b8'}}>No Back ID</div>}
            </div>
          </div>
        </Accordion>

        <p style={{ fontSize: 14, fontWeight: 700, color: '#334155', margin: '24px 0 12px' }}>Payment History</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {realPayments.slice(0, 2).map((p, i) => {
            const isToken = p.paymentType === 'token';
            const rawDate = p.datePaid || p.date || p.createdAt;
            const displayDate = rawDate ? new Date(rawDate?.toDate ? rawDate.toDate() : rawDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
            return (
              <div key={i} onClick={() => setSelectedReceipt({ ...p, tenantName: fullUser?.name || profile.name, roomNo: fullUser?.roomNo || profile.roomNo })}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', padding: '12px 16px', borderRadius: 12, border: `1px solid ${isToken ? '#fef3c7' : '#e2e8f0'}`, cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: isToken ? '#fef9c3' : '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                    {isToken ? '💰' : '💸'}
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: '0 0 2px' }}>{p.name || 'Payment'}</p>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{displayDate}{p.paymentMode ? ` · ${p.paymentMode}` : ''}{p.screenshot ? ' · 📸' : ''}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>₹{Number(p.amount || p.amountPaid || 0).toLocaleString()}</p>
                  <p style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, margin: 0 }}>✓ Paid</p>
                </div>
              </div>
            );
          })}
        </div>
        <button onClick={onHistory} style={{ width: '100%', padding: 14, background: 'white', border: `1px solid ${cyan}`, color: cyan, fontWeight: 700, borderRadius: 12, marginTop: 12, cursor: 'pointer' }}>View All History</button>
      </div>
      {selectedReceipt && (
        <DetailedReceiptModal receipt={selectedReceipt} onClose={() => setSelectedReceipt(null)} />
      )}

      {/* ── SEND NOTICE MODAL ── */}
      {showNoticeModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }} onClick={() => !isSendingNotice && setShowNoticeModal(false)} />
          <div style={{ position: 'relative', background: 'white', width: '100%', maxWidth: 480, borderRadius: '24px 24px 0 0', padding: '24px 20px 36px', boxShadow: '0 -8px 32px rgba(0,0,0,0.15)' }}>
            {/* Handle */}
            <div style={{ width: 40, height: 4, background: '#e2e8f0', borderRadius: 4, margin: '0 auto 20px' }} />
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#d97706' }}>notifications_active</span>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>Send Notice to Student</h3>
                <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>This will be sent to the student's app notifications</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Student Name</label>
                <input type="text" value={profile.name} disabled style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: 14, fontFamily: 'inherit' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Phone Number</label>
                <input type="text" value={profile.phone !== '-' ? profile.phone : (fullUser?.phone || user?.phone || '')} disabled style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: 14, fontFamily: 'inherit' }} />
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Notice From</label>
                <input type="date" value={noticeForm.fromDate} onChange={e => setNoticeForm(f => ({...f, fromDate: e.target.value}))} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Notice To</label>
                <input type="date" value={noticeForm.toDate} onChange={e => setNoticeForm(f => ({...f, toDate: e.target.value}))} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Date Requested to Leave PG</label>
              <input type="date" value={noticeForm.leaveDate} onChange={e => setNoticeForm(f => ({...f, leaveDate: e.target.value}))} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Message to Student</label>
              <textarea
                value={noticeForm.message}
                onChange={e => setNoticeForm(f => ({...f, message: e.target.value}))}
                rows={3}
                placeholder="Write a message for the student..."
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, fontFamily: 'inherit', resize: 'none', outline: 'none' }}
              />
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8' }}>⚠️ "Clear all dues before leaving the PG." will also be shown automatically.</p>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowNoticeModal(false)}
                disabled={isSendingNotice}
                style={{ flex: 1, padding: 14, borderRadius: 12, background: '#f1f5f9', color: '#475569', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSendNotice}
                disabled={isSendingNotice}
                style={{ flex: 2, padding: 14, borderRadius: 12, background: 'linear-gradient(135deg, #d97706, #f59e0b)', color: 'white', fontWeight: 800, fontSize: 14, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                {isSendingNotice ? (
                  <div style={{ width: 18, height: 18, border: '2.5px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span>
                    Send Notice
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── REMOVE CONFIRMATION MODAL ── */}
      {showRemoveConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }} onClick={() => !isRemoving && setShowRemoveConfirm(false)} />
          <div style={{ position: 'relative', background: 'white', width: '100%', maxWidth: 340, borderRadius: 24, padding: '28px 24px', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            {/* Red icon */}
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #fef2f2, #fee2e2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 4px 16px rgba(239,68,68,0.2)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 36, color: '#dc2626' }}>person_remove</span>
            </div>

            <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: '#0f172a' }}>Remove Student?</h3>
            <p style={{ margin: '0 0 6px', fontSize: 14, color: '#64748b', lineHeight: 1.5 }}>
              You are about to immediately remove <span style={{ fontWeight: 700, color: '#0f172a' }}>{profile.name}</span> from your PG.
            </p>
            <p style={{ margin: '0 0 24px', fontSize: 13, color: '#ef4444', fontWeight: 600 }}>
              ⚠️ This will revoke their PG stay and move them to Removed Students history.
            </p>

            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 14px', marginBottom: 20, textAlign: 'left' }}>
              <p style={{ margin: 0, fontSize: 12, color: '#991b1b', lineHeight: 1.6 }}>
                • Student's PG access will be revoked immediately<br />
                • Student can explore and apply to other PGs<br />
                • Their saved profile details remain preserved<br />
                • A notification will be sent to the student
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowRemoveConfirm(false)}
                disabled={isRemoving}
                style={{ flex: 1, padding: 14, borderRadius: 12, background: '#f1f5f9', color: '#475569', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveImmediately}
                disabled={isRemoving}
                style={{ flex: 1, padding: 14, borderRadius: 12, background: 'linear-gradient(135deg, #dc2626, #ef4444)', color: 'white', fontWeight: 800, fontSize: 14, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                {isRemoving ? (
                  <div style={{ width: 18, height: 18, border: '2.5px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person_remove</span>
                    Remove Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD CO-RESIDENT MODAL ── */}
      {showAddCoResidentModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)' }} onClick={() => !isSavingCoResident && setShowAddCoResidentModal(false)} />
          <div style={{ position: 'relative', background: 'white', width: '100%', maxWidth: 420, borderRadius: 20, padding: 24, boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 24, color: cyan }}>person_add</span>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>Add Roommate / Co-Resident</h3>
              </div>
              <button onClick={() => !isSavingCoResident && setShowAddCoResidentModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', display: 'flex' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#64748b' }}>close</span>
              </button>
            </div>

            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b' }}>
              Add a roommate living in this room. They will be registered under <strong>{profile.name}</strong>.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Full Name *</label>
                <input 
                  type="text" 
                  value={newCoResident.name} 
                  onChange={e => setNewCoResident({ ...newCoResident, name: e.target.value })} 
                  placeholder="e.g. Rahul Sharma"
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Mobile Number</label>
                <input 
                  type="tel" 
                  value={newCoResident.phone} 
                  onChange={e => setNewCoResident({ ...newCoResident, phone: e.target.value })} 
                  placeholder="e.g. +91 9876543210"
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Relationship</label>
                  <select 
                    value={newCoResident.relation} 
                    onChange={e => setNewCoResident({ ...newCoResident, relation: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, outline: 'none', background: 'white', boxSizing: 'border-box' }}
                  >
                    <option value="Roommate">Roommate</option>
                    <option value="Friend">Friend</option>
                    <option value="Colleague">Colleague</option>
                    <option value="Brother">Brother</option>
                    <option value="Sister">Sister</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Aadhaar / ID Proof</label>
                  <input 
                    type="text" 
                    value={newCoResident.aadhar} 
                    onChange={e => setNewCoResident({ ...newCoResident, aadhar: e.target.value })} 
                    placeholder="e.g. 1234 5678 9012"
                    style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button 
                onClick={() => setShowAddCoResidentModal(false)}
                disabled={isSavingCoResident}
                style={{ flex: 1, padding: 12, borderRadius: 10, background: '#f1f5f9', color: '#475569', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveCoResident}
                disabled={isSavingCoResident || !newCoResident.name.trim()}
                style={{ flex: 1, padding: 12, borderRadius: 10, background: cyan, color: 'white', fontWeight: 800, fontSize: 13, border: 'none', cursor: (!newCoResident.name.trim() || isSavingCoResident) ? 'not-allowed' : 'pointer', opacity: (!newCoResident.name.trim() || isSavingCoResident) ? 0.6 : 1 }}
              >
                {isSavingCoResident ? 'Saving...' : 'Add Roommate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── OUTSTANDING DUES BREAKDOWN MODAL ── */}
      {showOutstandingDuesModal && (
        <OutstandingDuesModal
          isOpen={showOutstandingDuesModal}
          onClose={() => setShowOutstandingDuesModal(false)}
          tenant={currentTenantObj}
          duesData={duesData}
          adminUser={authUser}
          activePgId={activePgId}
        />
      )}

    </>
  );
}
// ─── VIEW 4: PAYMENT HISTORY & LIST ───────────────────────
function PaymentHistoryView({ onBack, tenantUid }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  useEffect(() => {
    if (!tenantUid) { setLoading(false); return; }
    const q = query(collection(db, 'users', tenantUid, 'payments'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setPayments(snap.docs.map(d => ({ docId: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [tenantUid]);

  const totalPaid = payments.reduce((s, p) => s + Number(p.amount || p.amountPaid || 0), 0);

  return (
    <>
      <Header title="Payment History" onBack={onBack} center={false} />
      <div style={{ padding: 16 }}>
        {/* Summary */}
        <div style={{ background: 'linear-gradient(135deg, #0c1a2e, #0f2847)', borderRadius: 16, padding: 16, marginBottom: 20 }}>
          <p style={{ margin: '0 0 4px', fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600, letterSpacing: 1 }}>TOTAL RECEIVED FROM TENANT</p>
          <h2 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: 'white' }}>₹{totalPaid.toLocaleString('en-IN')}</h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{payments.length} payment{payments.length !== 1 ? 's' : ''} recorded</p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Loading...</div>
        ) : payments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', background: '#f8fafc', borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>💳</div>
            <p style={{ margin: 0, fontWeight: 600, color: '#94a3b8' }}>No payments yet</p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#cbd5e1' }}>Payments made via chat will appear here</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {payments.map(p => {
              const isToken = p.paymentType === 'token';
              const isOnline = p.paymentMode === 'Online' || p.paymentMode === 'UPI';
              const rawDate = p.datePaid || p.date || p.createdAt;
              const displayDate = rawDate
                ? new Date(rawDate?.toDate ? rawDate.toDate() : rawDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                : '—';
              return (
                <div key={p.docId}
                  onClick={() => setSelectedReceipt({ ...p, tenantName: p.contact || p.name?.replace('Token Payment - ', '') || 'Tenant' })}
                  style={{ background: 'white', borderRadius: 12, border: `1px solid ${isToken ? '#fef3c7' : '#e2e8f0'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: isToken ? '#fef9c3' : '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                      {isToken ? '💰' : '💸'}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>{p.name || 'Payment'}</p>
                        {isToken && <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: '#fef3c7', color: '#b45309' }}>TOKEN</span>}
                      </div>
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
                        {displayDate}
                        {p.paymentMode ? ` · ${p.paymentMode}` : ''}
                        {p.screenshot ? ' · 📸' : ''}
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: '0 0 2px' }}>₹{Number(p.amount || p.amountPaid || 0).toLocaleString('en-IN')}</p>
                    <p style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, margin: 0 }}>✓ Paid</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Receipt popup */}
      {selectedReceipt && (
        <DetailedReceiptModal receipt={selectedReceipt} onClose={() => setSelectedReceipt(null)} />
      )}
    </>
  );
}

// ─── VIEW 5: RECEIPT & PARTIAL PAYMENT BREAKDOWN ─────────────
function ReceiptView({ user, onBack }) {
  const profile = {
    name: user?.name || '-',
    roomNo: user?.subscribedPG?.roomNo || user?.roomNo || user?.room || '-',
    bedNo: user?.subscribedPG?.bedNo || user?.bedNo || user?.bed || '-',
    rent: user?.subscribedPG?.rent || user?.rent || user?.rentAmount || 0,
    token: user?.subscribedPG?.tokenPaid !== undefined ? user.subscribedPG.tokenPaid : (user?.tokenPaid || user?.token || 0),
    pending: user?.subscribedPG?.remainingAmount !== undefined ? user.subscribedPG.remainingAmount : (user?.status === 'Approved' ? (user?.currentMonthPending || 0) : (user?.remainingAmount || user?.pending || 0)),
    securityAmt: user?.subscribedPG?.securityAmount || user?.securityAmount || user?.securityDeposit || user?.deposit || 0,
  };
  
  const rent = profile.rent;
  const [payAmount, setPayAmount] = useState(profile.pending > 0 ? (profile.rent - profile.pending) : profile.rent);
  const remainingDues = Math.max(0, profile.rent - payAmount);
  const [fullscreenImage, setFullscreenImage] = useState(null);

  return (
    <>
      <Header title="Payment Receipt & Dues" onBack={onBack} center={false} />
      <div style={{ padding: '16px' }}>
        <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e2e8f0', padding: '24px 20px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 4px' }}>Total Bill Amount</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>₹ {rent.toLocaleString()}</span>
            <span className="material-symbols-outlined" style={{ background: '#16a34a', color: 'white', borderRadius: '50%', fontSize: 16, padding: 2 }}>check</span>
          </div>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 16px' }}>Paid via Cash / UPI</p>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>Amount Paid Today:</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#16a34a' }}>₹ {payAmount.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: remainingDues > 0 ? '#b91c1c' : '#15803d' }}>
                {remainingDues > 0 ? '⚠️ Remaining Dues:' : '✓ Full Payment Settled:'}
              </span>
              <span style={{ fontSize: 16, fontWeight: 800, color: remainingDues > 0 ? '#dc2626' : '#16a34a' }}>
                ₹ {remainingDues.toLocaleString()}
              </span>
            </div>
          </div>

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
              { label: 'Room Rent', val: rent },
              { label: 'Security Deposit', val: profile.securityAmt },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: '#475569' }}>{item.label} :</span>
                <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 600 }}>₹ {item.val.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div style={{ paddingTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 16, color: '#0f172a', fontWeight: 700 }}>Total Bill</span>
              <span style={{ fontSize: 16, color: '#0f172a', fontWeight: 700 }}>₹ {(rent + profile.securityAmt).toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, color: remainingDues > 0 ? '#ef4444' : '#16a34a', fontWeight: 700 }}>Outstanding Dues Balance</span>
              <span style={{ fontSize: 14, color: remainingDues > 0 ? '#ef4444' : '#16a34a', fontWeight: 700 }}>{remainingDues > 0 ? `₹ ${remainingDues.toLocaleString()}` : 'Cleared'}</span>
            </div>
          </div>
        </div>
      </div>
      {fullscreenImage && ReactDOM.createPortal(
        <div id="docModal" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 2147483646, backgroundColor: 'rgba(0,0,0,0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: 16 }}>
            <button 
              onClick={async () => {
                try {
                  const res = await fetch(fullscreenImage);
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `document_${Date.now()}.jpg`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                } catch (e) {
                  window.open(fullscreenImage, '_blank');
                }
              }} 
              style={{ background: 'white', border: 'none', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <span className="material-symbols-outlined">download</span>
            </button>
            <button 
              onClick={() => setFullscreenImage(null)} 
              style={{ background: 'white', border: 'none', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <img src={fullscreenImage} style={{ maxWidth: '90%', maxHeight: '80%', objectFit: 'contain', borderRadius: 12 }} alt="Fullscreen Document" />
        </div>,
        document.body
      )}
    </>
  );
}

// ─── MAIN CONTROLLER ──────────────────────────────────────
export default function UserProfile() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = location.state?.user || { id: 1, name: 'Rajeev Kumar', phone: '+91 9234567681', room: 15, bed: 3 };
  const profile = {
    roomType: user?.seaterLabel || '-',
    type: user?.status === 'Approved' ? 'current' : 'upcoming',
    name: user?.name || '-',
    phone: user?.phone || '-',
    email: user?.email || '-',
    dob: user?.kycData?.dob || user?.dob || '-',
    bloodGroup: user?.emergencyContact?.bloodGroup || user?.bloodGroup || '-',
    aadhar: user?.kycData?.aadharNumber || user?.kyc?.aadharNumber || user?.kyc?.aadhaarNumber || user?.aadhar || '-',
    address: user?.address || '-',
    permanentAddress: user?.kycData?.permanentAddress || user?.permanentAddress || '-',
    correspondingAddress: user?.kycData?.correspondingAddress || user?.correspondingAddress || '-',
    schoolAddress: user?.schoolAddress || '-',
    college: user?.kycData?.collegeName || user?.occupation?.details || user?.college || '-',
    companyName: user?.kycData?.companyName || user?.occupation?.details || user?.company || '-',
    careerStatus: user?.kycData?.occupationType || user?.occupation?.type || user?.career || 'Student',
    fatherName: user?.kycData?.fatherName || user?.parentsDetails?.fatherName || user?.fatherName || '-',
    motherName: user?.kycData?.motherName || user?.parentsDetails?.motherName || user?.motherName || '-',
    fatherPhone: user?.kycData?.fatherPhone || user?.parentsDetails?.fatherPhone || user?.fatherPhone || '-',
    motherPhone: user?.kycData?.motherPhone || user?.parentsDetails?.motherPhone || user?.motherPhone || '-',
    parentsAddress: user?.kycData?.parentsAddress || user?.parentsDetails?.address || user?.parentsAddress || '-',
    joiningDate: user?.joiningDate || '-',
    tentativeLeaving: user?.tentativeLeaving || '-',
    dateOfLeaving: user?.dateOfLeaving || '-',
    dateOfTokenAmount: user?.dateOfTokenAmount || '-',
    roomNo: user?.subscribedPG?.roomNo || user?.roomNo || user?.room || '-',
    bedNo: user?.subscribedPG?.bedNo || user?.bedNo || user?.bed || '-',
    rent: user?.subscribedPG?.rent || user?.rent || user?.rentAmount || 0,
    token: user?.subscribedPG?.tokenPaid !== undefined ? user.subscribedPG.tokenPaid : (user?.tokenPaid || user?.token || 0),
    pending: user?.subscribedPG?.remainingAmount !== undefined ? user.subscribedPG.remainingAmount : (user?.status === 'Approved' ? (user?.currentMonthPending || 0) : (user?.remainingAmount || user?.pending || 0)),
    securityAmt: user?.subscribedPG?.securityAmount || user?.securityAmount || user?.securityDeposit || user?.deposit || 0,
    meterRatePerUnit: user?.meterRatePerUnit || 8,
  };

  const [view, setView] = useState('details');
  const [subView, setSubView] = useState(null);
  const [activeReceipt, setActiveReceipt] = useState(null);
  const [collectModalData, setCollectModalData] = useState(null);

  const goBack = () => {
    if (subView) { setSubView(null); return; }
    if (view !== 'details') { setView('details'); return; }
    navigate(-1);
  };

  return (
    <div style={BASE}>
      {view === 'details' && (
        <UserDetailsView
          user={user}
          onBack={goBack}
          onReceipt={() => setView('receipt')}
          onHistory={() => setView('history')}
          onMoveOut={() => navigate('/move-out', { state: { user } })}
          onCollectPayment={(amt) => setCollectModalData({ name: profile.name, room: `Room ${profile.roomNo}`, amount: amt || profile.rent, month: 'June 2025' })}
          subView={subView}
          setSubView={setSubView}
        />
      )}
      {view === 'history' && <PaymentHistoryView onBack={goBack} tenantUid={user?.id || user?.uid || user?.tenantId} />}
      {view === 'receipt' && <ReceiptView user={user} onBack={goBack} />}

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
    </div>
  );
}
