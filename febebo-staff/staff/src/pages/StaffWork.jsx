import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// ─── App-consistent design tokens ─────────────────────────────────────────────
const C = {
  bg:         '#f1f5f9',
  white:      '#ffffff',
  primary:    '#0891b2',
  primaryDark:'#0e7490',
  primaryBg:  '#ecfeff',
  primaryBdr: '#a5f3fc',
  text:       '#0f172a',
  textSub:    '#334155',
  muted:      '#64748b',
  border:     '#e2e8f0',
  success:    '#059669',
  successBg:  '#ecfdf5',
  warn:       '#d97706',
  warnBg:     '#fffbeb',
  danger:     '#e11d48',
  dangerBg:   '#fff1f2',
  indigo:     '#4f46e5',
  indigoBg:   '#eef2ff',
};

// ─── DATA ─────────────────────────────────────────────────────────────────────
// ─── DATA ─────────────────────────────────────────────────────────────────────
export const ROLES = [
  { id: 'hr',          label: 'HR',              icon: 'manage_accounts',    category: 'A'       },
  { id: 'manager',     label: 'Manager',          icon: 'supervisor_account', category: 'A'       },
  { id: 'sales',       label: 'Sales Manager',    icon: 'query_stats',        category: 'A'       },
  { id: 'purchase',    label: 'Purchase Manager', icon: 'shopping_bag',       category: 'D'       },
  { id: 'cook',        label: 'Cook',             icon: 'restaurant',         category: 'B_cook'  },
  { id: 'cleaner',     label: 'Cleaner',          icon: 'mop',                category: 'B_clean' },
  { id: 'helper',      label: 'Helper',           icon: 'handyman',           category: 'A'       },
  { id: 'plumber',     label: 'Plumber',          icon: 'plumbing',           category: 'C'       },
  { id: 'electrician', label: 'Electrician',      icon: 'electric_bolt',      category: 'C'       },
  { id: 'carpenter',   label: 'Carpenter',        icon: 'carpenter',          category: 'C'       },
];

export const STAFF_MEMBERS = {
  hr:          [{ id: 'h1',  name: 'Priya Mishra',     joined: 'Jan 2024', phone: '9876543210' }],
  manager:     [{ id: 'm1',  name: 'Vikram Sharma',    joined: 'Mar 2023', phone: '9123456789' }],
  sales:       [{ id: 's1',  name: 'Anita Rao',        joined: 'Jul 2023', phone: '9988776655' }],
  purchase:    [{ id: 'p1',  name: 'Rajan Verma',      joined: 'Feb 2024', phone: '9090909090' }],
  cook:        [{ id: 'c1',  name: 'Ramesh Yadav',     joined: 'Jun 2022', phone: '9871234560' }, { id: 'c2', name: 'Sunita Devi', joined: 'Nov 2023', phone: '9812345670' }],
  cleaner:     [{ id: 'cl1', name: 'Mohan Das',        joined: 'Apr 2023', phone: '9933221100' }, { id: 'cl2', name: 'Lakshmi B.', joined: 'Sep 2023', phone: '9900112233' }],
  helper:      [{ id: 'he1', name: 'Suresh Kumar',     joined: 'Jan 2023', phone: '9777888999' }],
  plumber:     [{ id: 'pl1', name: 'Dinesh Patel',     joined: 'May 2022', phone: '9444555666' }],
  electrician: [{ id: 'el1', name: 'Raj Electricals',  joined: 'Oct 2023', phone: '9333444555' }],
  carpenter:   [{ id: 'ca1', name: 'Balram Singh',     joined: 'Aug 2022', phone: '9222333444' }],
};

export const INITIAL_STAFF_PURCHASE_REQUISITIONS = [
  { id: 1, date: '2026-07-22', staffName: 'Ramesh Yadav', staffRole: 'Cook', item: 'Basmati Rice (25kg)', qty: '2 bags', vendor: 'Sharma Traders', status: 'Pending' },
  { id: 2, date: '2026-07-22', staffName: 'Sunita Devi', staffRole: 'Cook', item: 'Refined Sunflower Oil (15L)', qty: '3 cans', vendor: 'Local Wholesale Mandi', status: 'Approved' },
  { id: 3, date: '2026-07-21', staffName: 'Mohan Das', staffRole: 'Cleaner', item: 'Floor Cleaner Liquid 5L', qty: '2 cans', vendor: 'Clean Depot', status: 'Purchased' },
  { id: 4, date: '2026-07-21', staffName: 'Ashok Kumar', staffRole: 'Plumber', item: '1/2 inch PVC Washers', qty: '20 pcs', vendor: 'Hardware Supply Co', status: 'Approved' },
];

export const INITIAL_ASSIGNED_STAFF_WORK = [
  { id: 1, staffId: 'cl1', staffName: 'Mohan Das', role: 'cleaner', title: 'Daily Floor Mopping & Sanitization', type: 'Regular', duration: 'Daily Routine', status: 'In Progress', note: 'Ensure Floor 2 corridor is cleaned before 10 AM', assignedDate: '2026-07-22' },
  { id: 2, staffId: 'cl1', staffName: 'Mohan Das', role: 'cleaner', title: 'Deep Clean Overhead Water Tank', type: 'Special', duration: '2 Days (22-23 Jul)', status: 'Pending', note: 'Use chlorine solution and scrub inner walls', assignedDate: '2026-07-22' },
  { id: 3, staffId: 'c1', staffName: 'Ramesh Yadav', role: 'cook', title: 'Prepare Special Sunday Feast', type: 'Special', duration: 'One-time (26 Jul)', status: 'Pending', note: 'Paneer Butter Masala, Gulab Jamun', assignedDate: '2026-07-21' },
  { id: 4, staffId: 'pl1', staffName: 'Dinesh Patel', role: 'plumber', title: 'Fix Main Water Line Leakage', type: 'Special', duration: '1 Day', status: 'Completed', note: 'Replaced main joint connector', assignedDate: '2026-07-20' },
];

export const INITIAL_PACKED_FOOD_REQUESTS = [
  { id: 1, studentId: 'u102', studentName: 'Ravi Gupta', room: '102', phone: '+91 9876543210', date: '2026-07-22', meal: 'Lunch', timing: 'Same Day', note: 'Pack extra pickle', status: 'Pending' },
  { id: 2, studentId: 'u104', studentName: 'Sneha R.', room: '104', phone: '+91 9876543211', date: '2026-07-22', meal: 'Lunch', timing: 'Same Day', note: 'Leave near security gate', status: 'Packed' },
  { id: 3, studentId: 'u105', studentName: 'Anil K.', room: '105', phone: '+91 9876543212', date: '2026-07-23', meal: 'Breakfast', timing: 'Day Before', note: 'Leaving early at 7 AM', status: 'Pending' },
  { id: 4, studentId: 'u201', studentName: 'Priya S.', room: '201', phone: '+91 9876543213', date: '2026-07-22', meal: 'Dinner', timing: 'Same Day', note: 'No onions in salad', status: 'Picked Up' },
];

export const INITIAL_FOOD_BROADCASTS = [
  { id: 1, date: '2026-07-22', time: '01:15 PM', meal: 'Lunch', cookName: 'Ramesh Yadav', target: 'All Students', message: 'Lunch is hot & ready! Dal Tadka, Jeera Rice & Hot Rotis.' },
];

const TIMELINE_LOGS = {
  h1:  [
    { id: 1, date: '2026-07-11', time: '10:30 AM', text: 'Interviewed 2 candidates for Cook position. Shortlisted 1.', pinned: true },
    { id: 2, date: '2026-07-10', time: '03:00 PM', text: 'Completed onboarding paperwork for new helper Suresh Kumar.', pinned: false },
    { id: 3, date: '2026-07-09', time: '11:00 AM', text: 'Salary processed for all staff for June 2026.', pinned: false },
    { id: 4, date: '2026-07-07', time: '02:15 PM', text: 'Posted job listing for Electrician on Naukri.', pinned: false },
  ],
  m1:  [
    { id: 1, date: '2026-07-11', time: '09:00 AM', text: 'Reviewed daily occupancy — 28/32 rooms occupied (87.5%). One tenant left today.', pinned: true },
    { id: 2, date: '2026-07-10', time: '06:00 PM', text: 'Conducted evening inspection of floors 1 & 2. All rooms clean.', pinned: false },
    { id: 3, date: '2026-07-09', time: '10:00 AM', text: 'Resolved dispute between tenants in Room 104 and 105.', pinned: false },
  ],
  s1:  [
    { id: 1, date: '2026-07-11', time: '11:00 AM', text: 'Handled 5 enquiries. 2 converted to site visits tomorrow.', pinned: true },
    { id: 2, date: '2026-07-10', time: '04:30 PM', text: 'Follow-up call with Riya Sharma — double occupancy, quoted ₹6,500/month.', pinned: false },
    { id: 3, date: '2026-07-08', time: '01:00 PM', text: 'Updated listing on NoBroker and MagicBricks with new photos.', pinned: false },
  ],
  he1: [
    { id: 1, date: '2026-07-11', time: '08:30 AM', text: 'Helped move furniture from Room 201 to 203 for new tenant.', pinned: false },
    { id: 2, date: '2026-07-10', time: '12:00 PM', text: 'Grocery run — vegetables, oil, spices for kitchen.', pinned: false },
    { id: 3, date: '2026-07-09', time: '03:00 PM', text: 'Assisted Cook with dish washing after lunch.', pinned: false },
  ],
};

const COOK_DATA = {
  c1: {
    todayMenu: { breakfast: 'Poha + Chai', lunch: 'Dal Tadka, Jeera Rice, Roti', dinner: 'Rajma, Rice, Sabzi' },
    rating: 4.2, totalReviews: 38,
    reviews: [
      { id: 1, tenant: 'Ravi Gupta', room: '102', date: '2026-07-11', rating: 5, text: 'Lunch was amazing today! Dal was perfect.' },
      { id: 2, tenant: 'Priya S.',   room: '204', date: '2026-07-11', rating: 3, text: 'Dinner sabzi was a bit bland today.' },
      { id: 3, tenant: 'Anil K.',    room: '301', date: '2026-07-10', rating: 4, text: 'Breakfast poha was good. More quantity please!' },
      { id: 4, tenant: 'Sneha R.',   room: '105', date: '2026-07-10', rating: 5, text: 'Everything was great. Keep it up!' },
    ],
  },
  c2: {
    todayMenu: { breakfast: 'Upma + Coffee', lunch: 'Chole, Bhature, Salad', dinner: 'Mix Veg, Dal, Roti' },
    rating: 3.9, totalReviews: 21,
    reviews: [
      { id: 1, tenant: 'Mohit J.', room: '107', date: '2026-07-11', rating: 4, text: 'Nice variety today.' },
      { id: 2, tenant: 'Diya P.',  room: '208', date: '2026-07-10', rating: 3, text: 'Chole was too spicy for me.' },
    ],
  },
};

const COOK_DAY_STATS = {
  c1: [
    { date: '2026-07-11', eaten: 45, extraPlates: [{ by: 'Ravi (102)', count: 2 }], ingredients: '10kg Rice, 2L Oil, 3kg Dal', packed: 5, lateFood: 3 },
    { date: '2026-07-10', eaten: 42, extraPlates: [{ by: 'Sneha (105)', count: 1 }], ingredients: '8kg Atta, 5kg Potato, 2kg Poha', packed: 2, lateFood: 1 },
  ],
  c2: [
    { date: '2026-07-11', eaten: 30, extraPlates: [], ingredients: '5kg Rice, 1L Oil, 2kg Mix Veg', packed: 0, lateFood: 0 },
  ]
};

const EXTRA_GUEST_FOOD = [
  { id: 1, student: 'Ravi Gupta', room: '102', date: '2026-07-11', count: 2, amount: 100, status: 'Paid', mode: 'UPI' },
  { id: 2, student: 'Sneha R.', room: '105', date: '2026-07-10', count: 1, amount: 50, status: 'Pending', mode: '' },
  { id: 3, student: 'Mohit J.', room: '107', date: '2026-07-09', count: 3, amount: 150, status: 'Pending', mode: '' },
];

const CLEANER_DATA = {
  cl1: { assignedRooms: [
    { room: '101', cleanedAt: '08:15 AM', studentStatus: 'Approved', studentName: 'Ravi Gupta' },
    { room: '102', cleanedAt: '09:00 AM', studentStatus: 'Rejected', studentName: 'Priya S.',  rejectionNote: 'Bathroom not cleaned properly' },
    { room: '103', cleanedAt: '09:45 AM', studentStatus: 'Pending',  studentName: 'Anil K.' },
    { room: '104', cleanedAt: '10:30 AM', studentStatus: 'Approved', studentName: 'Sneha R.' },
  ]},
  cl2: { assignedRooms: [
    { room: '201', cleanedAt: '08:30 AM', studentStatus: 'Approved', studentName: 'Mohit J.' },
    { room: '202', cleanedAt: '09:15 AM', studentStatus: 'Pending',  studentName: 'Diya P.' },
    { room: '203', cleanedAt: '10:00 AM', studentStatus: 'Rejected', studentName: 'Rahul V.', rejectionNote: 'Floor still wet and dusty' },
  ]},
};

const CLEANER_STATS = {
  daily: { total: 8, breakdown: { full: 4, dusting: 2, bathroom: 2 } },
  weekly: { total: 45, breakdown: { full: 20, dusting: 15, bathroom: 10 } },
  monthly: { total: 180, breakdown: { full: 80, dusting: 60, bathroom: 40 } },
};

const TICKET_DATA = {
  pl1: [
    { id: 1, issue: 'Leaking tap in bathroom',   room: '104', date: '2026-07-11', status: 'In Progress', priority: 'High',   note: 'Ordered new washer' },
    { id: 2, issue: 'Drainage blocked',           room: '202', date: '2026-07-10', status: 'Resolved',    priority: 'High',   note: 'Cleared blockage, all good now' },
    { id: 3, issue: 'WC flush not working',       room: '301', date: '2026-07-09', status: 'Pending',     priority: 'Medium', note: '' },
  ],
  el1: [
    { id: 1, issue: 'Fan speed fluctuating',      room: '205', date: '2026-07-11', status: 'Pending',     priority: 'Medium', note: '' },
    { id: 2, issue: 'Switch board sparking',      room: '103', date: '2026-07-10', status: 'Resolved',    priority: 'High',   note: 'Replaced faulty switch' },
    { id: 3, issue: 'Power socket not working',   room: '308', date: '2026-07-08', status: 'In Progress', priority: 'Medium', note: 'Coming with tools tomorrow' },
  ],
  ca1: [
    { id: 1, issue: 'Cupboard door hinge broken', room: '107', date: '2026-07-11', status: 'Pending',     priority: 'Low',    note: '' },
    { id: 2, issue: 'Study table leg cracked',    room: '201', date: '2026-07-09', status: 'Resolved',    priority: 'Medium', note: 'Fixed with new leg' },
  ],
};

const PURCHASE_LOG = {
  p1: [
    { id: 1, date: '2026-07-11', item: 'Basmati Rice',        qty: 25, unit: 'kg',    rate: 65,  total: 1625, vendor: 'Sharma Traders',  category: 'Grocery'  },
    { id: 2, date: '2026-07-10', item: 'Cooking Oil',         qty: 10, unit: 'litre', rate: 120, total: 1200, vendor: 'Sharma Traders',  category: 'Grocery'  },
    { id: 3, date: '2026-07-09', item: 'Cleaning Liquid',     qty: 5,  unit: 'litre', rate: 85,  total: 425,  vendor: 'Clean Depot',     category: 'Cleaning' },
    { id: 4, date: '2026-07-08', item: 'Toilet Paper (bulk)', qty: 50, unit: 'piece', rate: 12,  total: 600,  vendor: 'Clean Depot',     category: 'Cleaning' },
    { id: 5, date: '2026-07-07', item: 'Onions',              qty: 15, unit: 'kg',    rate: 30,  total: 450,  vendor: 'Vegetable Mandi', category: 'Grocery'  },
  ],
};

const STAFF_INFO = {
  default: {
    attendance: { inTime: '08:00 AM', outTime: '06:00 PM', log: ['08:05 AM - Checked In', '01:00 PM - Lunch Break', '02:00 PM - Resumed', '06:10 PM - Checked Out'] },
    salary: { monthly: 15000, deductions: 500, net: 14500, status: 'Pending', mode: 'Cash' },
    inventory: ['Uniform', 'ID Card', 'Master Keys']
  }
};

const PETTY_CASH_DATA = {
  default: { balance: 5000, transactions: [{ id: 1, type: 'credit', amount: 10000, date: '2026-07-01', desc: 'Monthly Allocation' }, { id: 2, type: 'debit', amount: 5000, date: '2026-07-05', desc: 'Grocery Shopping' }] }
};

const COOK_STATS = {
  default: {
    day: {
      breakfast: { req: 40, eaten: 35, notEaten: [{name: 'Rahul (104)', phone: '9090'}, {name: 'Anita (201)', phone: '8080'}], tiffinReq: 5, tiffinTaken: [{id: 1, name: 'Sanjay', items: '4 Puri, Sabzi'}], tiffinMissed: [{id: 2, name: 'Amit'}], extra: [{name: 'Ravi', qty: 2}] },
      lunch: { req: 45, eaten: 45, notEaten: [], tiffinReq: 10, tiffinTaken: [], tiffinMissed: [], extra: [] },
      dinner: { req: 42, eaten: 40, notEaten: [{name: 'Sneha', phone:'123'}], tiffinReq: 2, tiffinTaken: [], tiffinMissed: [], extra: [] }
    },
    week: {
      breakfast: { req: 280, eaten: 260, notEaten: [], tiffinReq: 35, tiffinTaken: [], tiffinMissed: [], extra: [] },
      lunch: { req: 300, eaten: 290, notEaten: [], tiffinReq: 70, tiffinTaken: [], tiffinMissed: [], extra: [] },
      dinner: { req: 290, eaten: 275, notEaten: [], tiffinReq: 14, tiffinTaken: [], tiffinMissed: [], extra: [] }
    },
    month: {
      breakfast: { req: 1200, eaten: 1100, notEaten: [], tiffinReq: 150, tiffinTaken: [], tiffinMissed: [], extra: [] },
      lunch: { req: 1300, eaten: 1250, notEaten: [], tiffinReq: 300, tiffinTaken: [], tiffinMissed: [], extra: [] },
      dinner: { req: 1250, eaten: 1180, notEaten: [], tiffinReq: 60, tiffinTaken: [], tiffinMissed: [], extra: [] }
    }
  }
};

const NEW_CLEANER_STATS = {
  default: {
    day: { assigned: 15, cleaned: 10, uncleaned: 2, notReq: 3, fan: [{room: '101', time: '10AM'}], bath: [{room: '102', time: '11AM'}, {room: '105', time: '11:30AM'}], room: [{room: '101', time: '10AM'}, {room: '102', time: '11AM'}], others: [] },
    week: { assigned: 105, cleaned: 90, uncleaned: 5, notReq: 10, fan: [], bath: [], room: [], others: [] },
    month: { assigned: 450, cleaned: 400, uncleaned: 10, notReq: 40, fan: [], bath: [], room: [], others: [] }
  }
};

// ─── SHARED UI ─────────────────────────────────────────────────────────────────

const TopBar = ({ title, subtitle, onBack, onReqClick, onAssignWorkClick, onProfileClick }) => {
  const initials = (title || 'Staff').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: '0 16px', height: 64, display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 0, zIndex: 20 }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.primary, display: 'flex', alignItems: 'center', padding: 0 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 22 }}>arrow_back_ios_new</span>
      </button>

      {/* Clickable Profile Avatar */}
      <div onClick={onProfileClick} style={{ width: 38, height: 38, borderRadius: '50%', background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, cursor: 'pointer', flexShrink: 0, boxShadow: '0 2px 6px rgba(8,145,178,0.25)' }}>
        {initials}
      </div>

      <div style={{ flex: 1, cursor: 'pointer' }} onClick={onProfileClick}>
        <p style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: 0, lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: 4 }}>
          {title}
          <span className="material-symbols-outlined" style={{ fontSize: 16, color: C.primary }}>info</span>
        </p>
        {subtitle && <p style={{ fontSize: 12, color: C.muted, margin: 0, marginTop: 1 }}>{subtitle}</p>}
      </div>

      <button onClick={onAssignWorkClick} style={{ background: '#f3e8ff', color: '#7c3aed', border: '1px solid #d8b4fe', borderRadius: 10, padding: '6px 10px', fontSize: 11, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add_task</span>
        Assign Work
      </button>

      <button onClick={onReqClick} style={{ background: C.primaryBg, color: C.primary, border: `1px solid ${C.primaryBdr}`, borderRadius: 10, padding: '6px 10px', fontSize: 11, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>playlist_add</span>
        Item List
      </button>
    </div>
  );
};

export function StaffDemandedItemsModal({ staffName, staffRole, onClose }) {
  const VENDORS_LIST = ['The Local Market', 'Shree Traders', 'Daily Harvest Store', 'Sharma Mandi', 'Green Valley Farm', 'RO Water Supplier'];

  const [itemsList, setItemsList] = useState([
    { id: 1, date: new Date().toISOString().split('T')[0], isToday: true, item: 'Basmati Rice 25kg', qty: '2 Bags', vendor: 'The Local Market', status: 'Pending Rate', rate: '' },
    { id: 2, date: new Date().toISOString().split('T')[0], isToday: true, item: 'Cooking Oil (Mustard)', qty: '5 Litres', vendor: 'Shree Traders', status: 'Pending Rate', rate: '' },
    { id: 3, date: '2026-07-20', isToday: false, item: 'Wheat Flour (Aata) 10kg', qty: '3 Bags', vendor: 'Sharma Mandi', status: 'Sent to Vendor & Approved', rate: '350', totalPrice: 1050 },
    { id: 4, date: '2026-07-18', isToday: false, item: 'Ghee & Dairy Products', qty: '4 kg', vendor: 'Shree Dairy Farm', status: 'Sent to Vendor & Approved', rate: '600', totalPrice: 2400 },
    { id: 5, date: '2026-07-15', isToday: false, item: 'Floor Cleaner & Sanitizer', qty: '5 Litres', vendor: 'Sunil Traders', status: 'Sent to Vendor & Approved', rate: '120', totalPrice: 600 },
  ]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('');
  const [newItemVendor, setNewItemVendor] = useState(VENDORS_LIST[0]);
  const [newItemRate, setNewItemRate] = useState('');

  const handleUpdateItemField = (id, field, value) => {
    setItemsList(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleSendToVendor = (id) => {
    const itemObj = itemsList.find(i => i.id === id);
    if (!itemObj) return;
    if (!itemObj.rate) {
      alert('Please enter rate per unit before sending to vendor!');
      return;
    }
    const total = (parseFloat(itemObj.rate) || 0) * (parseFloat(itemObj.qty) || 1);
    setItemsList(prev => prev.map(item => item.id === id ? { ...item, status: 'Sent to Vendor & Approved', isToday: false, totalPrice: total || parseFloat(itemObj.rate) } : item));
    alert(`Item "${itemObj.item}" sent to vendor "${itemObj.vendor}" at rate ₹${itemObj.rate}!`);
  };

  const handleAddDirectDemand = (e) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    const newEntry = {
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      isToday: true,
      item: newItemName.trim(),
      qty: newItemQty || '1 Unit',
      vendor: newItemVendor,
      status: newItemRate ? 'Sent to Vendor & Approved' : 'Pending Rate',
      rate: newItemRate,
      totalPrice: newItemRate ? parseFloat(newItemRate) : 0
    };
    if (newItemRate) newEntry.isToday = false;
    setItemsList(prev => [newEntry, ...prev]);
    setNewItemName('');
    setNewItemQty('');
    setNewItemRate('');
    setShowAddForm(false);
    alert(`New item demand created successfully!`);
  };

  const todayDemands = itemsList.filter(i => i.isToday);
  const previousDemands = itemsList.filter(i => !i.isToday);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 460, background: C.white, borderRadius: 20, padding: 22, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: 0 }}>Item Demands List</h3>
            <p style={{ fontSize: 12, color: C.muted, margin: '2px 0 0' }}>Demanded by <b>{staffName || 'Staff Member'}</b> ({staffRole || 'Staff'})</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, color: C.muted, cursor: 'pointer', padding: 0 }}>&times;</button>
        </div>

        {/* Add item toggle button */}
        <button onClick={() => setShowAddForm(!showAddForm)} style={{ padding: '8px 12px', background: showAddForm ? C.bg : C.primaryBg, color: showAddForm ? C.textSub : C.primary, border: `1px solid ${showAddForm ? C.border : C.primary}`, borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 14, fontFamily: 'inherit' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{showAddForm ? 'close' : 'add'}</span>
          {showAddForm ? 'Cancel Direct Add' : '+ Direct Add Item Demand'}
        </button>

        {showAddForm && (
          <form onSubmit={handleAddDirectDemand} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase' }}>Item Name *</label>
              <input required value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="e.g. Basmati Rice 25kg" style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, outline: 'none', background: C.white, boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase' }}>Quantity</label>
                <input value={newItemQty} onChange={e => setNewItemQty(e.target.value)} placeholder="e.g. 2 Bags" style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, outline: 'none', background: C.white, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase' }}>Rate (₹)</label>
                <input type="number" value={newItemRate} onChange={e => setNewItemRate(e.target.value)} placeholder="Rate ₹" style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, outline: 'none', background: C.white, boxSizing: 'border-box' }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase' }}>Select Vendor</label>
              <select value={newItemVendor} onChange={e => setNewItemVendor(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, outline: 'none', background: C.white, boxSizing: 'border-box' }}>
                {VENDORS_LIST.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <button type="submit" style={{ padding: '9px', background: C.primary, color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
              Add & Send Demand 🚀
            </button>
          </form>
        )}

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, paddingRight: 4 }}>
          {/* Today's Demands */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 800, color: C.primary, textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 8px' }}>
              📅 Demands Pending Rate & Vendor ({todayDemands.length})
            </p>
            {todayDemands.length === 0 ? (
              <p style={{ fontSize: 13, color: C.muted, fontStyle: 'italic', margin: 0 }}>No pending demands for today.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {todayDemands.map(d => (
                  <div key={d.id} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <h4 style={{ fontSize: 15, fontWeight: 800, color: C.text, margin: 0 }}>{d.item}</h4>
                        <p style={{ fontSize: 12, color: C.muted, margin: '2px 0 0' }}>Demanded Qty: <b>{d.qty}</b></p>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 20, background: '#fffbeb', color: '#d97706' }}>
                        Pending Rate
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: C.bg, padding: 10, borderRadius: 10, border: `1px solid ${C.border}` }}>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>Assigned Vendor</label>
                        <select value={d.vendor} onChange={e => handleUpdateItemField(d.id, 'vendor', e.target.value)} style={{ width: '100%', padding: '6px 8px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, background: 'white', color: C.text, fontFamily: 'inherit' }}>
                          {VENDORS_LIST.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>

                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>Enter Rate (₹)</label>
                          <input type="number" placeholder="Rate ₹" value={d.rate} onChange={e => handleUpdateItemField(d.id, 'rate', e.target.value)} style={{ width: '100%', padding: '6px 8px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, outline: 'none', background: 'white', boxSizing: 'border-box' }} />
                        </div>
                        <button onClick={() => handleSendToVendor(d.id)} style={{ flex: 1, height: 32, marginTop: 14, background: C.primary, color: 'white', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          Send to Vendor 🚀
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sent to Vendor & Previous History */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 8px' }}>
              📜 Sent to Vendor & Approved History ({previousDemands.length})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {previousDemands.map(d => (
                <div key={d.id} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ fontSize: 14, fontWeight: 800, color: C.text, margin: 0 }}>{d.item}</h4>
                      <p style={{ fontSize: 12, color: C.muted, margin: '2px 0 0' }}>Qty: <b>{d.qty}</b> · Vendor: <b>{d.vendor}</b></p>
                      <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>Date: {d.date}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: C.success }}>₹{d.totalPrice || d.rate}</span>
                      <p style={{ fontSize: 10, fontWeight: 800, color: C.success, margin: '2px 0 0', background: C.successBg, padding: '2px 6px', borderRadius: 4 }}>Sent to Vendor</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN ASSIGN WORK MODAL ──────────────────────────────────────────────────
export function AssignWorkModal({ staffName, role, onClose, onSubmit }) {
  const [targetStaff, setTargetStaff] = useState(staffName || 'Ramesh Yadav');
  const [workType, setWorkType] = useState('Regular'); // 'Regular' | 'Special'
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [duration, setDuration] = useState('Daily Routine');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    const newTask = {
      id: Date.now(),
      staffId: 1,
      staffName: targetStaff,
      role: (role || 'Cook').toLowerCase(),
      type: workType,
      title: title.trim(),
      note: note.trim() || '',
      duration: workType === 'Regular' ? 'Daily Routine' : (duration || '1-2 Days'),
      assignedDate: new Date().toISOString().split('T')[0],
      status: 'Pending',
    };
    onSubmit(newTask);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 420, background: C.white, borderRadius: 20, padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: 0 }}>Assign Work</h3>
            <p style={{ fontSize: 12, color: C.muted, margin: '2px 0 0' }}>Assign Regular or Special task to {targetStaff}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, color: C.muted, cursor: 'pointer', padding: 0 }}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Work Category *</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button type="button" onClick={() => { setWorkType('Regular'); setDuration('Daily Routine'); }}
                style={{ padding: '10px', borderRadius: 10, border: workType === 'Regular' ? `2px solid ${C.primary}` : `1px solid ${C.border}`, background: workType === 'Regular' ? C.primaryBg : C.white, color: workType === 'Regular' ? C.primary : C.muted, fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
                🔄 Regular Work
              </button>
              <button type="button" onClick={() => { setWorkType('Special'); setDuration('1-2 Days'); }}
                style={{ padding: '10px', borderRadius: 10, border: workType === 'Special' ? `2px solid #8b5cf6` : `1px solid ${C.border}`, background: workType === 'Special' ? '#f3e8ff' : C.white, color: workType === 'Special' ? '#7c3aed' : C.muted, fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
                ⭐ Special Work
              </button>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Task Title *</label>
            <input required type="text" placeholder={workType === 'Regular' ? "e.g. Daily Kitchen Deep Clean" : "e.g. Fix Water Tank Leakage"} value={title} onChange={e => setTitle(e.target.value)} style={{ width: '100%', padding: '12px 14px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 15, fontFamily: 'inherit', color: C.text, outline: 'none', boxSizing: 'border-box' }} />
          </div>

          {workType === 'Special' && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Duration / Timeline</label>
              <input type="text" placeholder="e.g. 2 Days / By Tomorrow Evening" value={duration} onChange={e => setDuration(e.target.value)} style={{ width: '100%', padding: '12px 14px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 15, fontFamily: 'inherit', color: C.text, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          )}

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Instructions & Note</label>
            <textarea placeholder="Add specific instructions for staff member..." value={note} onChange={e => setNote(e.target.value)} style={{ width: '100%', minHeight: 60, padding: '10px 14px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 14, fontFamily: 'inherit', color: C.text, outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: 13, background: C.bg, color: C.textSub, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
            <button type="submit" style={{ flex: 1, padding: 13, background: workType === 'Special' ? '#7c3aed' : C.primary, color: 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Assign Task</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── ALL 40 REQUESTED DINE-IN STUDENTS MODAL ────────────────────────────────
export function AllRequestedStudentsModal({ mealName, onClose }) {
  const [students, setStudents] = useState(
    Array.from({ length: 40 }, (_, i) => ({
      id: i + 1,
      name: ['Rahul Sharma', 'Anita Roy', 'Karan Mehta', 'Priya Singh', 'Sanjay Kumar', 'Vikram Patel', 'Sneha Kapoor', 'Ravi Gupta', 'Deepak Verma', 'Neha Joshi'][i % 10] + ` (#${i + 1})`,
      room: 101 + Math.floor(i / 2),
      bed: (i % 2) + 1,
      phone: `+91 98765${String(1000 + i).padStart(4, '0')}`,
      status: i < 30 ? 'Eaten' : i < 37 ? 'Requested' : 'Skipped'
    }))
  );

  const toggleStatus = (id, newStatus) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
  };

  const eatenCount = students.filter(s => s.status === 'Eaten').length;
  const reqCount = students.filter(s => s.status === 'Requested').length;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 440, background: C.white, borderRadius: 20, padding: 20, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: 0 }}>All 40 Requested Students</h3>
            <p style={{ fontSize: 12, color: C.muted, margin: '2px 0 0' }}>{mealName} Dine-In Roster · {eatenCount} Eaten / {reqCount} Pending</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, color: C.muted, cursor: 'pointer', padding: 0 }}>&times;</button>
        </div>

        {/* Scrollable list */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4 }}>
          {students.map(s => (
            <div key={s.id} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 800, color: C.text, margin: '0 0 2px' }}>{s.name}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: C.primary, fontWeight: 700 }}>Room {s.room} · Bed {s.bed}</span>
                  <a href={`tel:${s.phone}`} style={{ fontSize: 12, color: C.success, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                    📞 {s.phone}
                  </a>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => toggleStatus(s.id, 'Eaten')}
                  style={{ padding: '6px 10px', borderRadius: 6, border: 'none', background: s.status === 'Eaten' ? C.success : C.white, color: s.status === 'Eaten' ? 'white' : C.muted, fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
                  ✓ Eaten
                </button>
                <button onClick={() => toggleStatus(s.id, 'Skipped')}
                  style={{ padding: '6px 10px', borderRadius: 6, border: 'none', background: s.status === 'Skipped' ? C.danger : C.white, color: s.status === 'Skipped' ? 'white' : C.muted, fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
                  ✗ Skipped
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── CLICKABLE STAFF PROFILE MODAL ──────────────────────────────────────────
export function StaffProfileModal({ staffName, role, staffId, onClose }) {
  const info = STAFF_INFO[staffId] || STAFF_INFO.default;
  const initials = (staffName || 'Staff').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 420, background: C.white, borderRadius: 20, padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: 0 }}>Staff Profile</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, color: C.muted, cursor: 'pointer', padding: 0 }}>&times;</button>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`, color: 'white', fontSize: 24, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', boxShadow: '0 4px 12px rgba(8,145,178,0.3)' }}>
            {initials}
          </div>
          <h2 style={{ margin: '0 0 4px', fontSize: 20, color: C.text }}>{staffName}</h2>
          <span style={{ fontSize: 12, fontWeight: 800, color: C.primary, background: C.primaryBg, padding: '4px 10px', borderRadius: 20 }}>{role}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: C.bg, padding: 12, borderRadius: 12, border: `1px solid ${C.border}` }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, color: C.muted, textTransform: 'uppercase', fontWeight: 700 }}>Employee ID</p>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.text }}>#EMP-{String(1000 + (staffId || 1))}</p>
          </div>

          <div style={{ background: C.bg, padding: 12, borderRadius: 12, border: `1px solid ${C.border}` }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, color: C.muted, textTransform: 'uppercase', fontWeight: 700 }}>Attendance & Timings</p>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.text }}>In-Time: {info.inTime} · Out-Time: {info.outTime}</p>
          </div>

          <div style={{ background: C.bg, padding: 12, borderRadius: 12, border: `1px solid ${C.border}` }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, color: C.muted, textTransform: 'uppercase', fontWeight: 700 }}>Monthly Salary & Pay Status</p>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.success }}>₹{info.salary.toLocaleString('en-IN')} / month ({info.payStatus})</p>
          </div>

          <div style={{ background: C.bg, padding: 12, borderRadius: 12, border: `1px solid ${C.border}` }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, color: C.muted, textTransform: 'uppercase', fontWeight: 700 }}>Phone / Contact</p>
            <a href="tel:+919876543214" style={{ fontSize: 14, fontWeight: 700, color: C.primary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              📞 +91 98765 43214 (Tap to Call)
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AssignedWorkSection({ staffName, role, assignedTasks }) {
  const tasks = assignedTasks || [];
  if (tasks.length === 0) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ fontSize: 12, fontWeight: 800, color: C.muted, letterSpacing: 0.8, textTransform: 'uppercase', margin: '16px 0 10px 0' }}>📋 Admin Assigned Work</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {tasks.map(t => (
          <div key={t.id} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 20, background: t.type === 'Special' ? '#f3e8ff' : '#ecfeff', color: t.type === 'Special' ? '#7c3aed' : C.primary, textTransform: 'uppercase', display: 'inline-block', marginBottom: 6 }}>
                  {t.type === 'Special' ? '⭐ Special Work' : '🔄 Regular Work'}
                </span>
                <h4 style={{ fontSize: 15, fontWeight: 800, color: C.text, margin: 0, lineHeight: 1.3 }}>{t.title}</h4>
              </div>
              <span style={{ fontSize: 12, fontWeight: 800, padding: '4px 10px', borderRadius: 20, background: t.status === 'Completed' ? C.successBg : t.status === 'In Progress' ? C.indigoBg : '#fffbeb', color: t.status === 'Completed' ? C.success : t.status === 'In Progress' ? C.indigo : '#d97706' }}>
                {t.status}
              </span>
            </div>

            {t.note && (
              <p style={{ fontSize: 13, color: C.textSub, margin: '8px 0', background: C.bg, padding: '8px 12px', borderRadius: 10, border: `1px solid ${C.border}` }}>
                📌 {t.note}
              </p>
            )}
            <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>⏳ Duration: {t.duration} · Assigned: {t.assignedDate}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const TopTabs = ({ tabs, activeTab, setActiveTab }) => (
  <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, background: C.white, overflowX: 'auto', padding: '0 16px' }}>
    {tabs.map(t => (
      <button key={t} onClick={() => setActiveTab(t)}
        style={{ flex: 1, whiteSpace: 'nowrap', padding: '14px 16px', border: 'none', background: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                 borderBottom: activeTab === t ? `2px solid ${C.primary}` : '2px solid transparent',
                 color: activeTab === t ? C.primary : C.muted, transition: 'all 0.2s', fontFamily: 'inherit' }}>
        {t}
      </button>
    ))}
  </div>
);

function GenericStaffInfo({ staffId }) {
  const info = STAFF_INFO[staffId] || STAFF_INFO.default;
  const pettyCash = PETTY_CASH_DATA[staffId] || PETTY_CASH_DATA.default;
  const [pcModal, setPcModal] = useState(null);
  const [pcAmount, setPcAmount] = useState('');
  const [pcDesc, setPcDesc] = useState('');
  const [localPc, setLocalPc] = useState(pettyCash);

  const handlePcSubmit = () => {
    if(!pcAmount || !pcDesc) return;
    const amt = parseFloat(pcAmount);
    const newTx = { id: Date.now(), type: pcModal === 'add' ? 'credit' : 'debit', amount: amt, date: new Date().toISOString().split('T')[0], desc: pcDesc };
    setLocalPc(prev => ({
      balance: prev.balance + (pcModal === 'add' ? amt : -amt),
      transactions: [newTx, ...prev.transactions]
    }));
    setPcModal(null); setPcAmount(''); setPcDesc('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Petty Cash Account */}
      <div>
        <SectionTitle text="Petty Cash Wallet" />
        <Card style={{ background: `linear-gradient(135deg, ${C.primaryDark}, ${C.primary})`, color: 'white', padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', margin: '0 0 4px', fontWeight: 600 }}>Wallet Balance</p>
              <p style={{ fontSize: 32, fontWeight: 800, margin: 0, fontFamily: "'Bricolage Grotesque',sans-serif", letterSpacing: -0.5 }}>₹{localPc.balance.toLocaleString('en-IN')}</p>
            </div>
            <span className="material-symbols-outlined" style={{ fontSize: 44, color: 'rgba(255,255,255,0.2)' }}>account_balance_wallet</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setPcModal('add')} style={{ flex: 1, padding: '10px 0', background: 'white', color: C.primary, border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>+ Add Funds</button>
            <button onClick={() => setPcModal('expense')} style={{ flex: 1, padding: '10px 0', background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>- Log Expense</button>
          </div>
        </Card>
        
        {localPc.transactions.length > 0 && (
          <div style={{ marginTop: 12, background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: C.text, padding: '12px 14px', margin: 0, borderBottom: `1px solid ${C.border}`, background: C.bg }}>Recent Transactions</p>
            {localPc.transactions.slice(0, 3).map((tx, i) => (
              <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', borderBottom: i < Math.min(localPc.transactions.length-1, 2) ? `1px solid ${C.border}` : 'none' }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 2px' }}>{tx.desc}</p>
                  <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{tx.date}</p>
                </div>
                <p style={{ fontSize: 15, fontWeight: 800, color: tx.type === 'credit' ? C.success : C.danger, margin: 0 }}>
                  {tx.type === 'credit' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <SectionTitle text="Attendance & Timing" />
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 12, color: C.muted, margin: '0 0 4px', fontWeight: 700, textTransform: 'uppercase' }}>In-Time</p>
              <p style={{ fontSize: 16, fontWeight: 800, margin: 0, color: C.text }}>{info.attendance.inTime}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 12, color: C.muted, margin: '0 0 4px', fontWeight: 700, textTransform: 'uppercase' }}>Out-Time</p>
              <p style={{ fontSize: 16, fontWeight: 800, margin: 0, color: C.text }}>{info.attendance.outTime}</p>
            </div>
          </div>
          <div style={{ background: C.bg, padding: 14, borderRadius: 10, border: `1px solid ${C.border}` }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: C.text, margin: '0 0 8px', textTransform: 'uppercase' }}>Daily Log</p>
            {info.attendance.log.map((l, i) => (
              <p key={i} style={{ fontSize: 14, color: C.textSub, margin: '0 0 6px', fontWeight: 600 }}>• {l}</p>
            ))}
          </div>
        </Card>
      </div>

      <div>
        <SectionTitle text="Salary Details" />
        <Card>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <p style={{ fontSize: 12, color: C.muted, margin: '0 0 4px', fontWeight: 700, textTransform: 'uppercase' }}>Monthly Salary</p>
              <p style={{ fontSize: 16, fontWeight: 800, margin: 0, color: C.text }}>₹{info.salary.monthly}</p>
            </div>
            <div>
              <p style={{ fontSize: 12, color: C.muted, margin: '0 0 4px', fontWeight: 700, textTransform: 'uppercase' }}>Deductions</p>
              <p style={{ fontSize: 16, fontWeight: 800, margin: 0, color: C.danger }}>-₹{info.salary.deductions}</p>
            </div>
            <div>
              <p style={{ fontSize: 12, color: C.muted, margin: '0 0 4px', fontWeight: 700, textTransform: 'uppercase' }}>Net Pay</p>
              <p style={{ fontSize: 16, fontWeight: 800, margin: 0, color: C.success }}>₹{info.salary.net}</p>
            </div>
            <div>
              <p style={{ fontSize: 12, color: C.muted, margin: '0 0 4px', fontWeight: 700, textTransform: 'uppercase' }}>Status / Mode</p>
              <p style={{ fontSize: 15, fontWeight: 800, margin: 0, color: C.text }}>
                {info.salary.status} <span style={{ color: C.muted, fontSize: 13 }}>({info.salary.mode})</span>
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div>
        <SectionTitle text="Assigned Inventory" />
        <Card>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {info.inventory.map((item, i) => (
              <span key={i} style={{ background: C.primaryBg, color: C.primary, padding: '6px 12px', borderRadius: 20, fontSize: 13, fontWeight: 700, border: `1px solid ${C.primaryBdr}` }}>{item}</span>
            ))}
          </div>
        </Card>
      </div>
      
      {pcModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ width: '100%', maxWidth: 360, background: C.white, borderRadius: 20, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <p style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: 0 }}>{pcModal === 'add' ? 'Add Funds to Wallet' : 'Log Wallet Expense'}</p>
              <button onClick={() => setPcModal(null)} style={{ background: 'none', border: 'none', fontSize: 24, color: C.muted, cursor: 'pointer', padding: 0, lineHeight: 1 }}>&times;</button>
            </div>
            <input type="number" placeholder="Amount (₹)" value={pcAmount} onChange={e => setPcAmount(e.target.value)} style={{ width: '100%', padding: '12px 14px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 16, marginBottom: 12, outline: 'none', boxSizing: 'border-box' }} />
            <input type="text" placeholder="Description" value={pcDesc} onChange={e => setPcDesc(e.target.value)} style={{ width: '100%', padding: '12px 14px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 16, marginBottom: 20, outline: 'none', boxSizing: 'border-box' }} />
            <button onClick={handlePcSubmit} style={{ width: '100%', padding: '14px', background: C.primary, color: 'white', border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Confirm Transaction
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const statusMap = {
  Approved:     { color: C.success, bg: C.successBg },
  Resolved:     { color: C.success, bg: C.successBg },
  'In Progress':{ color: C.indigo,  bg: C.indigoBg  },
  Pending:      { color: C.warn,    bg: C.warnBg    },
  Rejected:     { color: C.danger,  bg: C.dangerBg  },
  High:         { color: C.danger,  bg: C.dangerBg  },
  Medium:       { color: C.warn,    bg: C.warnBg    },
  Low:          { color: C.muted,   bg: '#f1f5f9'   },
};

const Chip = ({ label }) => {
  const s = statusMap[label] || { color: C.muted, bg: '#f1f5f9' };
  return (
    <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: s.bg, color: s.color, letterSpacing: 0.3, display: 'inline-block' }}>
      {label}
    </span>
  );
};

const Card = ({ children, style = {}, ...props }) => (
  <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: 18, ...style }} {...props}>
    {children}
  </div>
);

const SectionTitle = ({ text }) => (
  <p style={{ fontSize: 12, fontWeight: 800, color: C.muted, letterSpacing: 1, textTransform: 'uppercase', margin: '24px 0 12px 0' }}>{text}</p>
);

const StatRow = ({ items }) => (
  <div style={{ display: 'flex', gap: 12 }}>
    {items.map(s => (
      <div key={s.label} style={{ flex: 1, background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: '14px 10px', textAlign: 'center' }}>
        <p style={{ fontSize: 28, fontWeight: 800, color: s.color, margin: '0 0 3px', fontFamily: "'Bricolage Grotesque',sans-serif" }}>{s.value}</p>
        <p style={{ fontSize: 12, fontWeight: 700, color: s.color, margin: 0, textTransform: 'uppercase', letterSpacing: 0.4 }}>{s.label}</p>
      </div>
    ))}
  </div>
);

// ─── TIMELINE VIEW  (HR / Manager / Sales / Helper) ──────────────────────────
export function TimelineView({ staffId, staffName, role, onBack }) {
  const [activeTab, setActiveTab] = useState('Work Details');
  const [note, setNote] = useState('');
  const [showAssignWorkModal, setShowAssignWorkModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showDemandsModal, setShowDemandsModal] = useState(false);
  const [assignedWork, setAssignedWork] = useState(INITIAL_ASSIGNED_STAFF_WORK);
  const logs = TIMELINE_LOGS[staffId] || Object.values(TIMELINE_LOGS)[0] || [];

  const staffTasks = assignedWork.filter(w => w.staffId === staffId || w.role === (role || '').toLowerCase());

  const handleUpdateStatus = (id, newStatus) => {
    setAssignedWork(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: C.bg, fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 40 }}>
      <TopBar 
        title={staffName} 
        subtitle={role} 
        onBack={onBack} 
        onReqClick={() => setShowDemandsModal(true)} 
        onAssignWorkClick={() => setShowAssignWorkModal(true)}
        onProfileClick={() => setShowProfileModal(true)}
      />
      <TopTabs tabs={['Work Details', 'Staff Info']} activeTab={activeTab} setActiveTab={setActiveTab} />

      <div style={{ padding: '0 16px' }}>
        {activeTab === 'Staff Info' ? (
          <GenericStaffInfo staffId={staffId} />
        ) : (
          <>
            {/* Admin Assigned Tasks */}
            <AssignedWorkSection staffName={staffName} role={role} assignedTasks={staffTasks} onUpdateTaskStatus={handleUpdateStatus} />

            {/* Note box */}
            <SectionTitle text="Leave an instruction" />
            <Card>
              <textarea value={note} onChange={e => setNote(e.target.value)}
                placeholder="Type a task or message for this staff member…"
                style={{ width: '100%', minHeight: 80, background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: '12px 14px', fontSize: 15, fontFamily: 'inherit', color: C.text, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
              <button onClick={() => setNote('')}
                style={{ marginTop: 12, width: '100%', padding: '13px 0', background: C.primary, border: 'none', borderRadius: 10, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Send Note
              </button>
            </Card>

            <SectionTitle text="Recent activity" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {logs.map(log => (
                <Card key={log.id} style={{ borderLeft: log.pinned ? `4px solid ${C.primary}` : `1px solid ${C.border}`, padding: 16 }}>
                  {log.pinned && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14, color: C.primary }}>push_pin</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.primary }}>Pinned</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 15, color: C.muted }}>schedule</span>
                    <span style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>{log.date} · {log.time}</span>
                  </div>
                  <p style={{ fontSize: 15, color: C.text, margin: 0, lineHeight: 1.6 }}>{log.text}</p>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      {showAssignWorkModal && (
        <AssignWorkModal staffName={staffName} role={role} onClose={() => setShowAssignWorkModal(false)} onSubmit={(newTask) => {
          INITIAL_ASSIGNED_STAFF_WORK.unshift(newTask);
          setAssignedWork(prev => [newTask, ...prev]);
          setShowAssignWorkModal(false);
          alert(`New task assigned to ${staffName}!`);
        }} />
      )}
      {showProfileModal && (
        <StaffProfileModal staffName={staffName} role={role} staffId={staffId} onClose={() => setShowProfileModal(false)} />
      )}
      {showDemandsModal && (
        <StaffDemandedItemsModal staffName={staffName} staffRole={role} onClose={() => setShowDemandsModal(false)} />
      )}
    </div>
  );
}

// ─── COOK VIEW ────────────────────────────────────────────────────────────────
export function CookView({ staffId, staffName, onBack }) {
  const [activeTab, setActiveTab] = useState('Work Details');
  const [timeFilter, setTimeFilter] = useState('day'); // 'day' | 'week' | 'month'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [assignedWork, setAssignedWork] = useState(INITIAL_ASSIGNED_STAFF_WORK);
  const [packedRequests, setPackedRequests] = useState(INITIAL_PACKED_FOOD_REQUESTS);
  const [broadcasts, setBroadcasts] = useState(INITIAL_FOOD_BROADCASTS);

  const [showDemandsModal, setShowDemandsModal] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [showPackedModal, setShowPackedModal] = useState(false);
  const [showAssignWorkModal, setShowAssignWorkModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAllRequestedModal, setShowAllRequestedModal] = useState(false);
  const [selectedMealForPacked, setSelectedMealForPacked] = useState('Lunch');
  const [selectedMealFor40, setSelectedMealFor40] = useState('Breakfast');

  // Broadcast state
  const [bMeal, setBMeal] = useState('Lunch');
  const [bTarget, setBTarget] = useState('All Students');
  const [bMessage, setBMessage] = useState('Hot and fresh meal is ready to serve!');

  const stats = COOK_STATS[staffId] || COOK_STATS.default;
  const currentStats = (stats && stats[timeFilter]) ? stats[timeFilter] : stats.day;
  const staffTasks = assignedWork.filter(w => w.staffId === staffId || w.role === 'cook');

  const handleUpdateStatus = (id, newStatus) => {
    setAssignedWork(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  const handleReqSubmit = (newReq) => {
    INITIAL_STAFF_PURCHASE_REQUISITIONS.unshift(newReq);
    setShowDemandsModal(false);
    alert(`Purchasing request for "${newReq.item}" sent to Admin successfully!`);
  };

  const handleAssignWorkSubmit = (newTask) => {
    INITIAL_ASSIGNED_STAFF_WORK.unshift(newTask);
    setAssignedWork(prev => [newTask, ...prev]);
    setShowAssignWorkModal(false);
    alert(`New task "${newTask.title}" assigned to ${newTask.staffName}!`);
  };

  const handleSendBroadcast = (e) => {
    e.preventDefault();
    const newB = {
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      meal: bMeal,
      cookName: staffName || 'Cook',
      target: bTarget,
      message: bMessage.trim() || 'Food is ready!',
    };
    INITIAL_FOOD_BROADCASTS.unshift(newB);
    setBroadcasts(prev => [newB, ...prev]);
    setShowBroadcastModal(false);
    alert(`"Food Ready" notification sent to ${bTarget}!`);
  };

  const renderMealSection = (mealName, dataInput) => {
    const data = dataInput || { req: 40, eaten: 35, notEaten: [], tiffinReq: 5, tiffinTaken: [], tiffinMissed: [], extra: [] };
    const notEatenList = data.notEaten || [];
    const tiffinTakenList = data.tiffinTaken || [];
    const extraList = data.extra || [];
    const mealPackedReqs = packedRequests.filter(r => r.meal === mealName);

    return (
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: `1px solid ${C.border}`, paddingBottom: 8 }}>
          <p style={{ fontSize: 16, fontWeight: 800, color: C.text, textTransform: 'uppercase', margin: 0 }}>{mealName}</p>
          <button onClick={() => { setBMeal(mealName); setShowBroadcastModal(true); }} style={{ background: C.successBg, color: C.success, border: `1px solid ${C.success}`, borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>campaign</span>
            Food Ready!
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 8px' }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: C.muted, margin: 0 }}>DINE-IN</p>
          <span style={{ fontSize: 11, color: C.primary, fontWeight: 800 }}>Click requested for all 40 list 🔍</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
          <div onClick={() => { setSelectedMealFor40(mealName); setShowAllRequestedModal(true); }}
               style={{ background: '#ecfeff', border: `1.5px solid ${C.primary}`, padding: '10px 6px', borderRadius: 8, textAlign: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(8,145,178,0.1)' }}>
            <p style={{ fontSize: 18, fontWeight: 800, color: C.primary, margin: 0 }}>{data.req || 40}</p>
            <p style={{ fontSize: 11, color: C.primary, margin: 0, fontWeight: 800 }}>Requested 🔍</p>
          </div>
          <div style={{ background: C.successBg, padding: '10px 6px', borderRadius: 8, textAlign: 'center' }}>
            <p style={{ fontSize: 18, fontWeight: 800, color: C.success, margin: 0 }}>{data.eaten || 35}</p>
            <p style={{ fontSize: 11, color: C.success, margin: 0, fontWeight: 700 }}>Eaten</p>
          </div>
          <div style={{ background: C.dangerBg, padding: '10px 6px', borderRadius: 8, textAlign: 'center' }}>
            <p style={{ fontSize: 18, fontWeight: 800, color: C.danger, margin: 0 }}>{notEatenList.length > 0 ? notEatenList.length : ((data.req || 40) - (data.eaten || 35))}</p>
            <p style={{ fontSize: 11, color: C.danger, margin: 0, fontWeight: 700 }}>Not Eaten</p>
          </div>
        </div>
        {notEatenList.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
            {notEatenList.map((u, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.bg, padding: '6px 12px', borderRadius: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{u.name}</span>
                <a href={`tel:${u.phone}`} style={{ fontSize: 12, color: C.primary, fontWeight: 700, textDecoration: 'none' }}>Call</a>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0 8px' }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: C.muted, margin: 0 }}>TIFFIN / PACKED</p>
          <span style={{ fontSize: 11, color: C.primary, fontWeight: 700 }}>Click requested to view list 🔍</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
          <div onClick={() => { setSelectedMealForPacked(mealName); setShowPackedModal(true); }}
               style={{ background: '#ecfeff', border: `1.5px solid ${C.primary}`, padding: '10px 6px', borderRadius: 8, textAlign: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(8,145,178,0.1)' }}>
            <p style={{ fontSize: 18, fontWeight: 800, color: C.primary, margin: 0 }}>{mealPackedReqs.length}</p>
            <p style={{ fontSize: 11, color: C.primary, margin: 0, fontWeight: 800 }}>Requested 🔍</p>
          </div>
          <div style={{ background: C.successBg, padding: '10px 6px', borderRadius: 8, textAlign: 'center' }}>
            <p style={{ fontSize: 18, fontWeight: 800, color: C.success, margin: 0 }}>{mealPackedReqs.filter(r => r.status === 'Packed' || r.status === 'Picked Up').length}</p>
            <p style={{ fontSize: 11, color: C.success, margin: 0, fontWeight: 700 }}>Packed</p>
          </div>
          <div style={{ background: C.warnBg, padding: '10px 6px', borderRadius: 8, textAlign: 'center' }}>
            <p style={{ fontSize: 18, fontWeight: 800, color: C.warn, margin: 0 }}>{mealPackedReqs.filter(r => r.status === 'Pending').length}</p>
            <p style={{ fontSize: 11, color: C.warn, margin: 0, fontWeight: 700 }}>Pending</p>
          </div>
        </div>
        {tiffinTakenList.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            {tiffinTakenList.map((t, i) => (
              <p key={i} style={{ fontSize: 13, color: C.textSub, margin: '0 0 4px' }}><b>{t.name}</b> took: {t.items}</p>
            ))}
          </div>
        )}

        {extraList.length > 0 && (
          <>
            <p style={{ fontSize: 13, fontWeight: 800, color: C.muted, margin: '0 0 8px', marginTop: 12 }}>EXTRA PLATES</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {extraList.map((e, i) => (
                <span key={i} style={{ background: C.indigoBg, color: C.indigo, fontSize: 12, fontWeight: 700, padding: '4px 8px', borderRadius: 6 }}>{e.name} (+{e.qty})</span>
              ))}
            </div>
          </>
        )}
      </Card>
    );
  };
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: C.bg, fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 40 }}>
      <TopBar title={staffName} subtitle="Cook" onBack={onBack} onReqClick={() => setShowDemandsModal(true)} onProfileClick={() => setShowProfileModal(true)} />
      <TopTabs tabs={['Work Details', 'Extra Guest Food', 'Staff Info']} activeTab={activeTab} setActiveTab={setActiveTab} />
      <div style={{ padding: '0 16px' }}>
        {activeTab === 'Staff Info' ? <GenericStaffInfo staffId={staffId} /> : 
         activeTab === 'Extra Guest Food' ? (
          <>
            <div style={{ display: 'flex', background: C.white, borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.border}`, margin: '20px 0 16px' }}>
              {['day', 'week', 'month'].map(t => (
                <button key={t} onClick={() => setTimeFilter(t)} style={{ flex: 1, padding: '10px 0', border: 'none', background: timeFilter === t ? C.primary : 'transparent', color: timeFilter === t ? '#fff' : C.muted, fontSize: 14, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.2s' }}>{t}</button>
              ))}
            </div>
            {timeFilter === 'day' && (
              <div style={{ marginBottom: 16 }}>
                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 15, fontFamily: 'inherit', color: C.text, outline: 'none', boxSizing: 'border-box', background: C.white }} />
              </div>
            )}
            
            {(() => {
              let filteredFood = EXTRA_GUEST_FOOD;
              if (timeFilter === 'day') {
                filteredFood = EXTRA_GUEST_FOOD.filter(f => f.date === selectedDate);
              }
              const totalPaid = filteredFood.filter(f => f.status === 'Paid').reduce((s,f) => s + f.amount, 0);
              const totalUnpaid = filteredFood.filter(f => f.status === 'Pending').reduce((s,f) => s + f.amount, 0);
              
              return (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                    <div style={{ background: C.successBg, border: '1px solid #a7f3d0', borderRadius: 12, padding: 14 }}>
                      <p style={{ fontSize: 12, fontWeight: 800, color: C.success, margin: '0 0 4px', textTransform: 'uppercase' }}>Total Paid</p>
                      <p style={{ fontSize: 18, fontWeight: 800, color: C.success, margin: 0 }}>₹{totalPaid}</p>
                    </div>
                    <div style={{ background: C.dangerBg, border: '1px solid #fecaca', borderRadius: 12, padding: 14 }}>
                      <p style={{ fontSize: 12, fontWeight: 800, color: C.danger, margin: '0 0 4px', textTransform: 'uppercase' }}>Total Unpaid</p>
                      <p style={{ fontSize: 18, fontWeight: 800, color: C.danger, margin: 0 }}>₹{totalUnpaid}</p>
                    </div>
                  </div>
                  
                  {filteredFood.length === 0 ? (
                    <p style={{ textAlign: 'center', color: C.muted, fontSize: 14, marginTop: 20 }}>No extra food requests for this period.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {filteredFood.map((f, i) => (
                        <div key={i} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <p style={{ fontSize: 15, fontWeight: 800, color: C.text, margin: '0 0 4px' }}>{f.student} (Rm {f.room})</p>
                            <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>{f.count} plates · {f.date}</p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: '0 0 4px' }}>₹{f.amount}</p>
                            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: f.status === 'Paid' ? C.successBg : C.warnBg, color: f.status === 'Paid' ? C.success : C.warn }}>{f.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )
            })()}
          </>
         ) : (
          <>
            {/* Admin Assigned Tasks */}
            <AssignedWorkSection staffName={staffName} role="cook" assignedTasks={staffTasks} onUpdateTaskStatus={handleUpdateStatus} />

            {/* Broadcast Food Ready Banner */}
            <button onClick={() => setShowBroadcastModal(true)} style={{ width: '100%', padding: '13px', background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16, boxShadow: '0 4px 12px rgba(16,185,129,0.25)', fontFamily: 'inherit' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>campaign</span>
              Broadcast "Food is Ready!" to Students
            </button>
            {/* Time Filter Toggle */}
            <div style={{ display: 'flex', background: C.white, borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.border}`, margin: '20px 0 16px' }}>
              {['day', 'week', 'month'].map(t => (
                <button key={t} onClick={() => setTimeFilter(t)} style={{ flex: 1, padding: '10px 0', border: 'none', background: timeFilter === t ? C.primary : 'transparent', color: timeFilter === t ? '#fff' : C.muted, fontSize: 14, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.2s' }}>{t}</button>
              ))}
            </div>

            {timeFilter === 'day' && (
              <div style={{ marginBottom: 16 }}>
                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 15, fontFamily: 'inherit', color: C.text, outline: 'none', boxSizing: 'border-box', background: C.white }} />
              </div>
            )}

            {/* Meal Cards */}
            <SectionTitle text={`Daily Meal Roster (${timeFilter.toUpperCase()})`} />
            {renderMealSection('Breakfast', currentStats.breakfast)}
            {renderMealSection('Lunch', currentStats.lunch)}
            {renderMealSection('Dinner', currentStats.dinner)}

            {/* Broadcast History */}
            <SectionTitle text="Food Ready Broadcasts" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {broadcasts.map(b => (
                <Card key={b.id} style={{ borderLeft: `4px solid ${C.success}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: C.success, textTransform: 'uppercase' }}>📢 {b.meal} Ready</span>
                    <span style={{ fontSize: 12, color: C.muted }}>{b.date} · {b.time}</span>
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 4px' }}>{b.message}</p>
                  <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>Sent to: <b>{b.target}</b></p>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      {showDemandsModal && (
        <StaffDemandedItemsModal staffName={staffName} staffRole="Cook" onClose={() => setShowDemandsModal(false)} />
      )}
      {showBroadcastModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ width: '100%', maxWidth: 420, background: C.white, borderRadius: 20, padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: 0 }}>Broadcast Food Ready</h3>
                <p style={{ fontSize: 12, color: C.muted, margin: '2px 0 0' }}>Notify students that {bMeal} is served!</p>
              </div>
              <button onClick={() => setShowBroadcastModal(false)} style={{ background: 'none', border: 'none', fontSize: 24, color: C.muted, cursor: 'pointer', padding: 0 }}>&times;</button>
            </div>

            <form onSubmit={handleSendBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Select Meal</label>
                <select value={bMeal} onChange={e => setBMeal(e.target.value)} style={{ width: '100%', padding: '12px 14px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 15, fontFamily: 'inherit', color: C.text, background: 'white', outline: 'none', boxSizing: 'border-box' }}>
                  <option value="Breakfast">Breakfast</option>
                  <option value="Lunch">Lunch</option>
                  <option value="Dinner">Dinner</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Target Audience</label>
                <select value={bTarget} onChange={e => setBTarget(e.target.value)} style={{ width: '100%', padding: '12px 14px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 15, fontFamily: 'inherit', color: C.text, background: 'white', outline: 'none', boxSizing: 'border-box' }}>
                  <option value="All Students">All Students</option>
                  <option value="Floor 1 Students">Floor 1 Students</option>
                  <option value="Floor 2 Students">Floor 2 Students</option>
                  <option value="Floor 3 Students">Floor 3 Students</option>
                  <option value="Specific Tiffin Requests">Students who requested Tiffin/Packed</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Message Broadcast</label>
                <textarea value={bMessage} onChange={e => setBMessage(e.target.value)} rows={3} style={{ width: '100%', padding: '12px 14px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 14, fontFamily: 'inherit', color: C.text, outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <button type="button" onClick={() => setShowBroadcastModal(false)} style={{ flex: 1, padding: 13, background: C.bg, color: C.textSub, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: 13, background: C.success, color: 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Broadcast Now 🚀</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clickable Requested Packed Food Details Modal */}
      {showPackedModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ width: '100%', maxWidth: 440, background: C.white, borderRadius: 20, padding: 22, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: 0 }}>Packed Food Requests — {selectedMealForPacked}</h3>
                <p style={{ fontSize: 12, color: C.muted, margin: '2px 0 0' }}>Click to view student contact & room details</p>
              </div>
              <button onClick={() => setShowPackedModal(false)} style={{ background: 'none', border: 'none', fontSize: 24, color: C.muted, cursor: 'pointer', padding: 0 }}>&times;</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {packedRequests.filter(r => r.meal === selectedMealForPacked).length === 0 ? (
                <p style={{ textAlign: 'center', color: C.muted, padding: '30px 0', fontSize: 14 }}>No packed food requests for {selectedMealForPacked}.</p>
              ) : (
                packedRequests.filter(r => r.meal === selectedMealForPacked).map(req => (
                  <div key={req.id} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div>
                        <p style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: 0 }}>{req.studentName}</p>
                        <p style={{ fontSize: 13, color: C.primary, fontWeight: 700, margin: '2px 0 0' }}>Room Number: {req.room}</p>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 8, background: req.timing === 'Day Before' ? '#f3e8ff' : '#ecfeff', color: req.timing === 'Day Before' ? '#7c3aed' : '#0891b2' }}>
                        {req.timing}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '8px 0' }}>
                      <a href={`tel:${req.phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: C.successBg, color: C.success, border: `1px solid ${C.success}`, borderRadius: 8, padding: '5px 10px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>call</span>
                        {req.phone}
                      </a>
                      <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Req Date: {req.date}</span>
                    </div>

                    {req.note && <p style={{ fontSize: 12, color: C.textSub, margin: '6px 0', background: C.white, padding: '6px 8px', borderRadius: 6, border: `1px solid ${C.border}` }}>📌 Note: {req.note}</p>}

                    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                      {['Pending', 'Packed', 'Picked Up'].map(st => (
                        <button key={st} onClick={() => setPackedRequests(prev => prev.map(p => p.id === req.id ? { ...p, status: st } : p))}
                          style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: req.status === st ? 'none' : `1px solid ${C.border}`, background: req.status === st ? C.primary : C.white, color: req.status === st ? 'white' : C.muted, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 40 Student Dine-In Roster Modal */}
      {showAllRequestedModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ width: '100%', maxWidth: 440, background: C.white, borderRadius: 20, padding: 22, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: 0 }}>40 Student Dine-In Roster — {selectedMealFor40}</h3>
                <p style={{ fontSize: 12, color: C.muted, margin: '2px 0 0' }}>Live status for today's meal</p>
              </div>
              <button onClick={() => setShowAllRequestedModal(false)} style={{ background: 'none', border: 'none', fontSize: 24, color: C.muted, cursor: 'pointer', padding: 0 }}>&times;</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Array.from({ length: 40 }).map((_, i) => {
                const isEaten = i < 35;
                const isTiffin = i >= 35 && i < 38;
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: C.bg, borderRadius: 10, border: `1px solid ${C.border}` }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>Student #{i + 1} (Room 10{Math.floor(i / 4) + 1})</p>
                      <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>+91 98765 432{i < 10 ? `0${i}` : i}</p>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 8, background: isEaten ? C.successBg : isTiffin ? '#f3e8ff' : C.dangerBg, color: isEaten ? C.success : isTiffin ? '#7c3aed' : C.danger }}>
                      {isEaten ? '✓ Eaten' : isTiffin ? '📦 Tiffin' : '⏳ Not Eaten'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showProfileModal && (
        <StaffProfileModal staffName={staffName} role="Cook" staffId={staffId} onClose={() => setShowProfileModal(false)} />
      )}
    </div>
  );
}

// ─── CLEANER VIEW ─────────────────────────────────────────────────────────────
export function CleanerView({ staffId, staffName, onBack }) {
  const [activeTab, setActiveTab] = useState('Work Details');
  const [timeFilter, setTimeFilter] = useState('day');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [expandedCat, setExpandedCat] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [showAssignWorkModal, setShowAssignWorkModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showDemandsModal, setShowDemandsModal] = useState(false);
  const [assignedWork, setAssignedWork] = useState(INITIAL_ASSIGNED_STAFF_WORK);

  const staffTasks = assignedWork.filter(w => w.staffId === staffId || w.role === 'cleaner');

  const handleUpdateStatus = (id, newStatus) => {
    setAssignedWork(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  const handleReqSubmit = (newReq) => {
    INITIAL_STAFF_PURCHASE_REQUISITIONS.unshift(newReq);
    setShowReqModal(false);
    alert(`Purchasing request for "${newReq.item}" sent to Admin successfully!`);
  };

  const [uncleanedRooms, setUncleanedRooms] = useState([
    { room: '103', reason: 'Student Sleeping' },
    { room: '104', reason: 'Door Locked' },
    { room: '105', reason: 'Not in Room' }
  ]);
  const [cleanedRooms, setCleanedRooms] = useState([
    { room: '101' }, { room: '102' }, { room: '201' }, { room: '205' }
  ]);
  const [notReqRooms, setNotReqRooms] = useState([
    { room: '301' }, { room: '302' }
  ]);

  const handleOverride = (room) => {
    setUncleanedRooms(prev => prev.filter(r => r.room !== room));
    setCleanedRooms(prev => [...prev, { room }]);
  };
  
  const stats = NEW_CLEANER_STATS[staffId] || NEW_CLEANER_STATS.default;
  const cur = stats[timeFilter];

  const uncleanedCount = timeFilter === 'day' ? uncleanedRooms.length : cur.uncleaned;
  const cleanedCount = timeFilter === 'day' ? cleanedRooms.length : cur.cleaned;
  const notReqCount = timeFilter === 'day' ? notReqRooms.length : cur.notReq;
  const assignedCount = timeFilter === 'day' ? uncleanedCount + cleanedCount + notReqCount : cur.assigned;

  const renderCat = (key, label, dataArr, iconStr) => (
    <div style={{ background: C.white, borderRadius: 16, overflow: 'hidden', marginBottom: 12, boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.04)' }}>
      <div onClick={() => setExpandedCat(expandedCat === key ? null : key)} 
           style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: expandedCat === key ? 'linear-gradient(to right, #ecfeff, #ffffff)' : 'transparent', transition: 'all 0.3s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #06b6d4, #0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(8, 145, 178, 0.3)' }}>
            <span style={{ fontSize: 18 }}>{iconStr}</span>
          </div>
          <p style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>{label}</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ background: '#f1f5f9', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 800, color: '#334155' }}>
            {dataArr.length}
          </div>
          <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#94a3b8', transform: expandedCat === key ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>expand_more</span>
        </div>
      </div>
      {expandedCat === key && (
        <div style={{ padding: '16px', borderTop: `1px solid ${C.border}`, background: '#fafaf9' }}>
          {dataArr.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {dataArr.map((d, i) => (
                <div key={i} style={{ background: C.white, padding: '12px', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: '#1e293b' }}>Rm {d.room}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0891b2', background: '#ecfeff', padding: '4px 8px', borderRadius: 8 }}>{d.time}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 14, fontWeight: 600, color: '#94a3b8', margin: 0, textAlign: 'center', padding: '10px 0' }}>No records found for this period.</p>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 40 }}>
      <TopBar 
        title={staffName} 
        subtitle="Housekeeping • Cleaner" 
        onBack={onBack} 
        onReqClick={() => setShowDemandsModal(true)} 
        onAssignWorkClick={() => setShowAssignWorkModal(true)}
        onProfileClick={() => setShowProfileModal(true)}
      />
      
      {/* Sleek Tabs */}
      <div style={{ display: 'flex', padding: '16px', gap: 10 }}>
        {['Work Details', 'Staff Info'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            style={{ flex: 1, padding: '14px', borderRadius: 14, border: 'none', background: activeTab === t ? '#0f172a' : C.white, color: activeTab === t ? C.white : '#64748b', fontSize: 14, fontWeight: 800, cursor: 'pointer', transition: 'all 0.3s ease', boxShadow: activeTab === t ? '0 4px 12px rgba(15, 23, 42, 0.2)' : '0 2px 6px rgba(0,0,0,0.02)' }}>
            {t}
          </button>
        ))}
      </div>

      <div style={{ padding: '0 16px' }}>
        {activeTab === 'Staff Info' ? <GenericStaffInfo staffId={staffId} /> : (
          <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
            {/* Admin Assigned Tasks */}
            <AssignedWorkSection staffName={staffName} role="cleaner" assignedTasks={staffTasks} />

            {/* Student Preferred Cleaning Time Slots */}
            <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, padding: 16, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: C.primary }}>schedule</span>
                    Student Preferred Cleaning Slots
                  </h4>
                  <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>Time slots requested by students for entry</p>
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, background: C.primaryBg, color: C.primary, padding: '3px 8px', borderRadius: 20 }}>
                  5 Slots Today
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { id: 1, room: '101', student: 'Arjun Mehta', slot: '10:00 AM - 11:00 AM', type: 'Full Room Cleaning', status: 'Cleaned' },
                  { id: 2, room: '102', student: 'Priya Sharma', slot: '11:00 AM - 12:00 PM', type: 'Dusting & Mopping', status: 'Pending' },
                  { id: 3, room: '105', student: 'Ankit Kumar', slot: '02:00 PM - 03:00 PM', type: 'Bathroom Sanitize', status: 'Pending' },
                  { id: 4, room: '202', student: 'Sneha Kapoor', slot: '04:00 PM - 05:00 PM', type: 'Full Room Cleaning', status: 'Pending' },
                  { id: 5, room: '205', student: 'Rahul Verma', slot: '05:30 PM - 06:30 PM', type: 'Dusting & Mopping', status: 'Pending' },
                ].map(slot => (
                  <div key={slot.id} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>Rm {slot.room}</span>
                        <span style={{ fontSize: 12, color: C.textSub, fontWeight: 600 }}>({slot.student})</span>
                      </div>
                      <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
                        ⏰ <b>{slot.slot}</b> · {slot.type}
                      </p>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: slot.status === 'Cleaned' ? C.successBg : '#fffbeb', color: slot.status === 'Cleaned' ? C.success : '#d97706' }}>
                      {slot.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {/* Time Filter Toggle */}
            <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: 12, padding: 4, marginBottom: 20 }}>
              {['day', 'week', 'month'].map(t => (
                <button key={t} onClick={() => setTimeFilter(t)} 
                  style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 10, background: timeFilter === t ? C.white : 'transparent', color: timeFilter === t ? '#0f172a' : '#64748b', fontSize: 14, fontWeight: 800, cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.2s ease', boxShadow: timeFilter === t ? '0 2px 8px rgba(0,0,0,0.05)' : 'none' }}>
                  {t}
                </button>
              ))}
            </div>

            {timeFilter === 'day' && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ position: 'relative' }}>
                  <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                    style={{ width: '100%', padding: '14px 16px', paddingLeft: 44, border: `1px solid ${C.border}`, borderRadius: 14, fontSize: 15, fontWeight: 700, fontFamily: 'inherit', color: '#0f172a', outline: 'none', boxSizing: 'border-box', background: C.white, boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }} />
                  <span className="material-symbols-outlined" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#0891b2' }}>calendar_month</span>
                </div>
              </div>
            )}
            
            <p style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 16px' }}>Activity Overview</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              {/* Stat Cards with Gradients & Glassmorphism */}
              <div onClick={() => setActiveModal('assigned')} style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #334155, #0f172a)', borderRadius: 16, padding: 18, cursor: 'pointer', boxShadow: '0 4px 15px rgba(15, 23, 42, 0.2)' }}>
                <span className="material-symbols-outlined" style={{ position: 'absolute', right: -10, bottom: -10, fontSize: 80, color: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }}>assignment</span>
                <p style={{ fontSize: 13, fontWeight: 800, color: '#94a3b8', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Assigned</p>
                <p style={{ fontSize: 28, fontWeight: 900, color: C.white, margin: 0 }}>{assignedCount}</p>
              </div>
              <div onClick={() => setActiveModal('cleaned')} style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #10b981, #059669)', borderRadius: 16, padding: 18, cursor: 'pointer', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)' }}>
                <span className="material-symbols-outlined" style={{ position: 'absolute', right: -10, bottom: -10, fontSize: 80, color: 'rgba(255,255,255,0.1)', pointerEvents: 'none' }}>check_circle</span>
                <p style={{ fontSize: 13, fontWeight: 800, color: '#a7f3d0', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Cleaned</p>
                <p style={{ fontSize: 28, fontWeight: 900, color: C.white, margin: 0 }}>{cleanedCount}</p>
              </div>
              <div onClick={() => setActiveModal('uncleaned')} style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #f43f5e, #e11d48)', borderRadius: 16, padding: 18, cursor: 'pointer', boxShadow: '0 4px 15px rgba(225, 29, 72, 0.3)' }}>
                <span className="material-symbols-outlined" style={{ position: 'absolute', right: -10, bottom: -10, fontSize: 80, color: 'rgba(255,255,255,0.1)', pointerEvents: 'none' }}>cancel</span>
                <p style={{ fontSize: 13, fontWeight: 800, color: '#fecdd3', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Uncleaned</p>
                <p style={{ fontSize: 28, fontWeight: 900, color: C.white, margin: 0 }}>{uncleanedCount}</p>
              </div>
              <div onClick={() => setActiveModal('notReq')} style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #94a3b8, #64748b)', borderRadius: 16, padding: 18, cursor: 'pointer', boxShadow: '0 4px 15px rgba(100, 116, 139, 0.2)' }}>
                <span className="material-symbols-outlined" style={{ position: 'absolute', right: -10, bottom: -10, fontSize: 80, color: 'rgba(255,255,255,0.1)', pointerEvents: 'none' }}>block</span>
                <p style={{ fontSize: 13, fontWeight: 800, color: '#e2e8f0', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Not Req.</p>
                <p style={{ fontSize: 28, fontWeight: 900, color: C.white, margin: 0 }}>{notReqCount}</p>
              </div>
            </div>

            <p style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 16px' }}>Detailed Breakdown</p>
            {renderCat('room', 'Room Cleaning', cur.room, '🧹')}
            {renderCat('bath', 'Bathroom Cleaning', cur.bath, '🚽')}
            {renderCat('fan', 'Fan & Dusting', cur.fan, '💨')}
            {renderCat('others', 'Deep Clean', cur.others, '🪣')}

            {activeModal && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', animation: 'fadeIn 0.2s ease-out' }}>
                <div style={{ background: '#f8fafc', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: '24px 20px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 -10px 40px rgba(0,0,0,0.1)', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                  <div style={{ width: 40, height: 4, background: '#cbd5e1', borderRadius: 2, margin: '0 auto 20px' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
                      {activeModal === 'assigned' && 'Assigned Rooms'}
                      {activeModal === 'cleaned' && 'Cleaned Rooms'}
                      {activeModal === 'uncleaned' && 'Uncleaned Rooms'}
                      {activeModal === 'notReq' && 'Not Requested'}
                    </h3>
                    <button onClick={() => setActiveModal(null)} style={{ background: '#e2e8f0', border: 'none', borderRadius: 20, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <span className="material-symbols-outlined" style={{ color: '#475569', fontSize: 18 }}>close</span>
                    </button>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {activeModal === 'uncleaned' ? (
                      uncleanedRooms.length > 0 ? uncleanedRooms.map(r => (
                        <div key={r.room} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.white, padding: '16px', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' }}>
                          <div>
                            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Room {r.room}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#e11d48' }}>error</span>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#e11d48' }}>{r.reason}</p>
                            </div>
                          </div>
                          <button onClick={() => handleOverride(r.room)} style={{ padding: '10px 16px', background: 'linear-gradient(135deg, #10b981, #059669)', color: C.white, border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 10px rgba(16, 185, 129, 0.3)', transition: 'transform 0.1s' }} onTouchStart={e => e.currentTarget.style.transform='scale(0.95)'} onTouchEnd={e => e.currentTarget.style.transform='scale(1)'}>
                            Override
                          </button>
                        </div>
                      )) : (
                        <div style={{ textAlign: 'center', padding: '30px 0' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#cbd5e1', marginBottom: 10 }}>celebration</span>
                          <p style={{ fontSize: 15, fontWeight: 700, color: '#64748b', margin: 0 }}>All caught up! No uncleaned rooms.</p>
                        </div>
                      )
                    ) : activeModal === 'cleaned' ? (
                      cleanedRooms.map(r => (
                        <div key={r.room} style={{ background: C.white, padding: '16px', borderRadius: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #f1f5f9' }}>
                          <span style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Room {r.room}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#ecfdf5', padding: '6px 12px', borderRadius: 20 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#059669' }}>check_circle</span>
                            <span style={{ fontSize: 13, color: '#059669', fontWeight: 800 }}>Cleaned</span>
                          </div>
                        </div>
                      ))
                    ) : activeModal === 'notReq' ? (
                      notReqRooms.map(r => (
                        <div key={r.room} style={{ background: C.white, padding: '16px', borderRadius: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #f1f5f9' }}>
                          <span style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Room {r.room}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f1f5f9', padding: '6px 12px', borderRadius: 20 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#64748b' }}>block</span>
                            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 800 }}>Not Req.</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      [...cleanedRooms, ...uncleanedRooms, ...notReqRooms].map((r, idx) => (
                        <div key={idx} style={{ background: C.white, padding: '16px', borderRadius: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #f1f5f9' }}>
                          <span style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Room {r.room}</span>
                          <span style={{ fontSize: 13, color: '#64748b', fontWeight: 700 }}>Assigned</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <style>{`
              @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
              @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            `}</style>
          </div>
        )}
      </div>

      {showAssignWorkModal && (
        <AssignWorkModal staffName={staffName} role="cleaner" onClose={() => setShowAssignWorkModal(false)} onSubmit={(newTask) => {
          INITIAL_ASSIGNED_STAFF_WORK.unshift(newTask);
          setAssignedWork(prev => [newTask, ...prev]);
          setShowAssignWorkModal(false);
          alert(`New task assigned to ${staffName}!`);
        }} />
      )}

      {showProfileModal && (
        <StaffProfileModal staffName={staffName} role="Cleaner" staffId={staffId} onClose={() => setShowProfileModal(false)} />
      )}

      {showDemandsModal && (
        <StaffDemandedItemsModal staffName={staffName} staffRole="Cleaner" onClose={() => setShowDemandsModal(false)} />
      )}
    </div>
  );
}

// ─── TICKET VIEW  (Plumber / Electrician / Carpenter) ────────────────────────
export function TicketView({ staffId, staffName, role, onBack }) {
  const [activeTab, setActiveTab] = useState('Work Details');
  const [tickets, setTickets] = useState(TICKET_DATA[staffId] || Object.values(TICKET_DATA)[0] || []);
  const [filter, setFilter] = useState('All');
  const [showAssignWorkModal, setShowAssignWorkModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showDemandsModal, setShowDemandsModal] = useState(false);
  const [assignedWork, setAssignedWork] = useState(INITIAL_ASSIGNED_STAFF_WORK);

  const staffTasks = assignedWork.filter(w => w.staffId === staffId || w.role === (role || '').toLowerCase());

  const handleUpdateStatus = (id, newStatus) => {
    setAssignedWork(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  const update = (id, status) => setTickets(prev => prev.map(t => t.id === id ? { ...t, status } : t));
  const tabs = ['All', 'Pending', 'In Progress', 'Resolved'];
  const cnt = { All: tickets.length, Pending: tickets.filter(t => t.status === 'Pending').length, 'In Progress': tickets.filter(t => t.status === 'In Progress').length, Resolved: tickets.filter(t => t.status === 'Resolved').length };
  const filtered = filter === 'All' ? tickets : tickets.filter(t => t.status === filter);

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: C.bg, fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 40 }}>
      <TopBar 
        title={staffName} 
        subtitle={role} 
        onBack={onBack} 
        onReqClick={() => setShowDemandsModal(true)} 
        onAssignWorkClick={() => setShowAssignWorkModal(true)}
        onProfileClick={() => setShowProfileModal(true)}
      />
      <TopTabs tabs={['Work Details', 'Staff Info']} activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div style={{ padding: '0 16px' }}>
        {activeTab === 'Staff Info' ? (
          <GenericStaffInfo staffId={staffId} />
        ) : (
          <>
            {/* Admin Assigned Tasks */}
            <AssignedWorkSection staffName={staffName} role={role} assignedTasks={staffTasks} onUpdateTaskStatus={handleUpdateStatus} />

            <SectionTitle text="Summary" />
            <StatRow items={[
              { label: 'Pending',  value: cnt.Pending,           color: C.warn    },
              { label: 'Active',   value: cnt['In Progress'],    color: C.indigo  },
              { label: 'Done',     value: cnt.Resolved,          color: C.success },
            ]} />

            {/* Filter tabs */}
            <div style={{ display: 'flex', gap: 8, margin: '20px 0 16px', overflowX: 'auto', paddingBottom: 4 }}>
              {tabs.map(t => {
                const active = t === filter;
                return (
                  <button key={t} onClick={() => setFilter(t)}
                    style={{ whiteSpace: 'nowrap', padding: '8px 16px', borderRadius: 20, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', border: active ? 'none' : `1px solid ${C.border}`, background: active ? C.primary : C.white, color: active ? '#fff' : C.muted, transition: 'all .15s' }}>
                    {t} ({cnt[t] ?? 0})
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map(t => (
                <Card key={t.id} style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                    <p style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: 0, lineHeight: 1.4, flex: 1 }}>{t.issue}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-end', flexShrink: 0 }}>
                      <Chip label={t.status} />
                      <Chip label={t.priority} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: t.note ? 12 : 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.primary, background: C.primaryBg, padding: '3px 8px', borderRadius: 6 }}>Rm {t.room}</span>
                    <span style={{ fontSize: 13, color: C.muted }}>{t.date}</span>
                  </div>
                  {t.note && (
                    <div style={{ background: C.bg, borderRadius: 8, padding: '10px 12px', border: `1px solid ${C.border}`, marginTop: 10, marginBottom: 4 }}>
                      <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>📌 {t.note}</p>
                    </div>
                  )}
                  {t.status !== 'Resolved' && (
                    <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                      {t.status === 'Pending' && (
                        <button onClick={() => update(t.id, 'In Progress')}
                          style={{ flex: 1, padding: '11px', background: C.indigoBg, border: `1.5px solid ${C.indigo}`, borderRadius: 10, color: C.indigo, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                          Start Progress
                        </button>
                      )}
                      <button onClick={() => update(t.id, 'Resolved')}
                        style={{ flex: 1, padding: '11px', background: C.successBg, border: `1.5px solid ${C.success}`, borderRadius: 10, color: C.success, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Mark Done ✅
                      </button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      {showAssignWorkModal && (
        <AssignWorkModal staffName={staffName} role={role} onClose={() => setShowAssignWorkModal(false)} onSubmit={(newTask) => {
          INITIAL_ASSIGNED_STAFF_WORK.unshift(newTask);
          setAssignedWork(prev => [newTask, ...prev]);
          setShowAssignWorkModal(false);
          alert(`New task assigned to ${staffName}!`);
        }} />
      )}

      {showProfileModal && (
        <StaffProfileModal staffName={staffName} role={role} staffId={staffId} onClose={() => setShowProfileModal(false)} />
      )}

      {showDemandsModal && (
        <StaffDemandedItemsModal staffName={staffName} staffRole={role} onClose={() => setShowDemandsModal(false)} />
      )}
    </div>
  );
}

// ─── PURCHASE MANAGER VIEW ────────────────────────────────────────────────────
export function PurchaseManagerView({ staffId, staffName, onBack }) {
  const [activeTab, setActiveTab] = useState('Work Details');
  const logs = PURCHASE_LOG[staffId] || Object.values(PURCHASE_LOG)[0] || [];
  const total = logs.reduce((s, l) => s + l.total, 0);
  const [filter, setFilter] = useState('All');
  const [showAssignWorkModal, setShowAssignWorkModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showDemandsModal, setShowDemandsModal] = useState(false);
  const [assignedWork, setAssignedWork] = useState(INITIAL_ASSIGNED_STAFF_WORK);

  const staffTasks = assignedWork.filter(w => w.staffId === staffId || w.role === 'purchase manager');

  const handleUpdateStatus = (id, newStatus) => {
    setAssignedWork(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  const cats = ['All', ...new Set(logs.map(l => l.category))];
  const filtered = filter === 'All' ? logs : logs.filter(l => l.category === filter);

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: C.bg, fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 40 }}>
      <TopBar 
        title={staffName} 
        subtitle="Purchase Manager" 
        onBack={onBack} 
        onReqClick={() => setShowDemandsModal(true)} 
        onAssignWorkClick={() => setShowAssignWorkModal(true)}
        onProfileClick={() => setShowProfileModal(true)}
      />
      <TopTabs tabs={['Work Details', 'Staff Info']} activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div style={{ padding: '0 16px' }}>
        {activeTab === 'Staff Info' ? (
          <GenericStaffInfo staffId={staffId} />
        ) : (
          <>
            {/* Admin Assigned Tasks */}
            <AssignedWorkSection staffName={staffName} role="purchase manager" assignedTasks={staffTasks} onUpdateTaskStatus={handleUpdateStatus} />
            {/* Spend summary */}
            <SectionTitle text="This week's spend" />
            <div style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`, borderRadius: 16, padding: '20px 22px', marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: 600, margin: '0 0 6px' }}>Total Purchases</p>
                <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 36, fontWeight: 900, color: '#fff', margin: '0 0 6px', letterSpacing: -1 }}>₹ {total.toLocaleString('en-IN')}</p>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: 0 }}>{logs.length} entries this week</p>
              </div>
              <span className="material-symbols-outlined" style={{ fontSize: 56, color: 'rgba(255,255,255,0.15)' }}>shopping_bag</span>
            </div>

            {/* Filter tabs */}
            <div style={{ display: 'flex', gap: 8, margin: '20px 0 16px', overflowX: 'auto', paddingBottom: 4 }}>
              {cats.map(cat => {
                const active = cat === filter;
                return (
                  <button key={cat} onClick={() => setFilter(cat)}
                    style={{ whiteSpace: 'nowrap', padding: '8px 16px', borderRadius: 20, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', border: active ? 'none' : `1px solid ${C.border}`, background: active ? C.primary : C.white, color: active ? '#fff' : C.muted, transition: 'all .15s' }}>
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Log list */}
            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
              {filtered.map((log, i) => (
                <div key={log.id} style={{ padding: '14px 18px', borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, paddingRight: 12 }}>
                      <p style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: '0 0 3px' }}>{log.item}</p>
                      <p style={{ fontSize: 13, color: C.muted, margin: '0 0 7px' }}>{log.vendor}</p>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 13, color: C.muted }}>{log.date}</span>
                        <span style={{ fontSize: 12, background: C.primaryBg, color: C.primary, padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>{log.category}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 17, fontWeight: 800, color: C.text, margin: '0 0 3px' }}>₹{log.total.toLocaleString('en-IN')}</p>
                      <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>{log.qty} {log.unit} × ₹{log.rate}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {showAssignWorkModal && (
        <AssignWorkModal staffName={staffName} role="purchase manager" onClose={() => setShowAssignWorkModal(false)} onSubmit={(newTask) => {
          INITIAL_ASSIGNED_STAFF_WORK.unshift(newTask);
          setAssignedWork(prev => [newTask, ...prev]);
          setShowAssignWorkModal(false);
          alert(`New task assigned to ${staffName}!`);
        }} />
      )}

      {showProfileModal && (
        <StaffProfileModal staffName={staffName} role="Purchase Manager" staffId={staffId} onClose={() => setShowProfileModal(false)} />
      )}

      {showDemandsModal && (
        <StaffDemandedItemsModal staffName={staffName} staffRole="Purchase Manager" onClose={() => setShowDemandsModal(false)} />
      )}
    </div>
  );
}

// ─── STAFF MEMBER LIST ────────────────────────────────────────────────────────
function StaffMemberList({ role, onBack, onSelect }) {
  const members = STAFF_MEMBERS[role.id] || [];
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: C.bg, fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 40 }}>
      <TopBar title={role.label} subtitle={`${members.length} member${members.length !== 1 ? 's' : ''}`} onBack={onBack} />
      <div style={{ padding: '0 16px' }}>
        <SectionTitle text="Team members" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {members.map(m => (
            <Card key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: 16 }} onClick={() => onSelect(m)}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: C.primaryBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 24, color: C.primary }}>{role.icon}</span>
                </div>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: '0 0 3px' }}>{m.name}</p>
                  <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Since {m.joined} · {m.phone}</p>
                </div>
              </div>
              <span className="material-symbols-outlined" style={{ color: C.border, fontSize: 22 }}>chevron_right</span>
            </Card>
          ))}
          {members.length === 0 && (
            <Card style={{ padding: '40px 20px', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 44, color: C.border, display: 'block', marginBottom: 10 }}>person_off</span>
              <p style={{ fontSize: 15, color: C.muted, margin: 0 }}>No staff assigned yet.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export const ROLE_GRADIENTS = {
  hr:          'linear-gradient(135deg,#6366f1,#4f46e5)',
  manager:     'linear-gradient(135deg,#0891b2,#0e7490)',
  sales:       'linear-gradient(135deg,#f59e0b,#d97706)',
  purchase:    'linear-gradient(135deg,#8b5cf6,#7c3aed)',
  cook:        'linear-gradient(135deg,#ef4444,#dc2626)',
  cleaner:     'linear-gradient(135deg,#10b981,#059669)',
  helper:      'linear-gradient(135deg,#64748b,#475569)',
  plumber:     'linear-gradient(135deg,#06b6d4,#0891b2)',
  electrician: 'linear-gradient(135deg,#f59e0b,#92400e)',
  carpenter:   'linear-gradient(135deg,#a16207,#78350f)',
};

export const ROLE_CATS = [
  { key: 'management', label: 'Management', ids: ['hr', 'manager', 'sales', 'purchase'] },
  { key: 'services',   label: 'Daily Services', ids: ['cook', 'cleaner', 'helper'] },
  { key: 'technical',  label: 'Technical', ids: ['plumber', 'electrician', 'carpenter'] },
];

// ─── ROLE MENU ACCORDION (main entry) ─────────────────────────────────────────
export default function StaffWork() {
  const navigate = useNavigate();
  const location = useLocation();
  const rawRole = location.state?.role || null;

  const resolveRole = (r) => {
    if (!r) return null;
    if (typeof r === 'object' && r.id) return r;
    if (typeof r === 'string') {
      return ROLES.find(x => x.id.toLowerCase() === r.toLowerCase() || x.label.toLowerCase() === r.toLowerCase()) || null;
    }
    return null;
  };

  const [selRole,  setSelRole]  = useState(resolveRole(rawRole));
  const [selStaff, setSelStaff] = useState(null);

  const activeRole = resolveRole(selRole);
  const currentStaff = selStaff || (activeRole ? (STAFF_MEMBERS[activeRole.id]?.[0] || { id: 'c1', name: 'Ramesh Yadav' }) : null);

  if (activeRole && currentStaff) {
    const p   = { staffId: currentStaff.id, staffName: currentStaff.name, role: activeRole.label, onBack: () => { setSelRole(null); setSelStaff(null); } };
    const cat = activeRole.category;
    if (cat === 'A')       return <TimelineView {...p} />;
    if (cat === 'B_cook')  return <CookView {...p} />;
    if (cat === 'B_clean') return <CleanerView {...p} />;
    if (cat === 'C')       return <TicketView {...p} />;
    if (cat === 'D')       return <PurchaseManagerView {...p} />;
    
    // Fallback if category is unknown or undefined
    return (
      <div style={{ padding: 20 }}>
        <h2>Error</h2>
        <p>Unknown category: {String(cat)}</p>
        <button onClick={() => { setSelRole(null); setSelStaff(null); }}>Go Back</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: C.bg, fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0c1a2e, #0f2847)', padding: '0 20px 24px', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, height: 64 }}>
          <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back_ios_new</span>
          </button>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 20, fontWeight: 800, color: 'white', margin: 0 }}>Staff Work</p>
            <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Select a role to view staff</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 16px' }}>
        {ROLE_CATS.map(cat => (
          <div key={cat.key} style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 12, fontWeight: 800, color: C.muted, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 12px' }}>{cat.label}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {ROLES.filter(r => cat.ids.includes(r.id)).map(role => {
                const members = STAFF_MEMBERS[role.id] || [];
                const count = members.length;
                const grad = ROLE_GRADIENTS[role.id] || C.primary;

                return (
                  <div key={role.id} onClick={() => setSelRole(role)}
                    style={{ position: 'relative', width: '100%', paddingTop: '100%', cursor: 'pointer', transition: 'transform 0.2s' }}
                    onTouchStart={e => e.currentTarget.style.transform = 'scale(0.96)'}
                    onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', textAlign: 'center', overflow: 'hidden', padding: 4 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 12, background: grad, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'white' }}>{role.icon}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                        <p style={{ fontSize: 11, fontWeight: 800, color: C.text, margin: '0 0 2px', lineHeight: 1.1, width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{role.label}</p>
                        <p style={{ fontSize: 10, color: C.muted, margin: 0, width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{count} member{count !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
