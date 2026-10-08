import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, auth } from '../firebase';
import { initializeApp, deleteApp, getApps } from 'firebase/app';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, getAuth as getFirebaseAuth } from 'firebase/auth';
import { collection, addDoc, doc, setDoc, updateDoc, query, where, orderBy, limit, onSnapshot, serverTimestamp, getDocs, getDoc } from 'firebase/firestore';
import { Scanner } from '@yudiel/react-qr-scanner';
import QRCode from 'react-qr-code';
import { isStudentOnVacation, getStudentActiveVacation, formatDateDisplay, isMealPausedOnDate, ALL_MEALS } from '../utils/vacationUtils';
import { COMMON_PG_DISHES, DISH_CATEGORIES, getDishPresetImage, DEFAULT_FOOD_PLACEHOLDER } from '../data/commonFoodDishes';
import ManagerTenantsView from '../components/manager/ManagerTenantsView';
import ManagerRoomsView from '../components/manager/ManagerRoomsView';
import ManagerComplaintsView from '../components/manager/ManagerComplaintsView';
import ManagerLeavesView from '../components/manager/ManagerLeavesView';
import ManagerVisitorsView from '../components/manager/ManagerVisitorsView';
import ManagerStaffView from '../components/manager/ManagerStaffView';
import ManagerMessHeadcountView from '../components/manager/ManagerMessHeadcountView';
import ManagerApprovalsView from '../components/manager/ManagerApprovalsView';
import ManagerVendorsView from '../components/manager/ManagerVendorsView';
import ManagerMeterView from '../components/manager/ManagerMeterView';
import StaffDeliveryView from '../components/delivery/StaffDeliveryView';
import { syncItemsToKitchenInventory, isKitchenRelatedCategory, calculateItemTotal } from '../utils/inventorySync';

// ─── Indian Kitchen Items Dataset ─────────────────────────────────────────────
const INDIAN_KITCHEN_ITEMS = {
  'Vegetables & Fresh (सब्जियां)': [
    'Potato (Aloo)', 'Onion (Pyaaz)', 'Tomato (Tamatar)', 'Green Chilli (Hari Mirch)',
    'Ginger (Adrak)', 'Garlic (Lehsun)', 'Coriander (Hara Dhaniya)', 'Spinach (Palak)',
    'Cauliflower (Gobhi)', 'Cabbage (Patta Gobhi)', 'Green Peas (Matar)', 'Carrot (Gajar)',
    'Lady Finger (Bhindi)', 'Bottle Gourd (Lauki)', 'Bitter Gourd (Karela)',
    'Capsicum (Shimla Mirch)', 'Brinjal (Baingan)', 'Green Beans (Beans)', 'Lemon (Nimbu)', 'Cucumber (Kheera)'
  ],
  'Groceries & Grains (राशन)': [
    'Wheat Flour (Atta)', 'Rice (Basmati)', 'Rice (Regular)', 'Dal Toor (Arhar)',
    'Dal Moong (Yellow)', 'Dal Moong (Chilka)', 'Dal Chana', 'Dal Urad',
    'Rajma', 'Chole (Kabuli Chana)', 'Besan (Gram Flour)', 'Poha', 'Sooji (Rava)',
    'Cooking Oil (Mustard)', 'Cooking Oil (Sunflower / Refined)', 'Desi Ghee',
    'Sugar (Cheeni)', 'Tea Leaves (Chai Patti)', 'Coffee Powder', 'Salt (Namak)',
    'Turmeric Powder (Haldi)', 'Red Chilli Powder (Lal Mirch)', 'Coriander Powder (Dhaniya)',
    'Garam Masala', 'Cumin Seeds (Jeera)', 'Mustard Seeds (Rai)', 'Hing (Asafoetida)',
    'Kasuri Methi', 'Papad', 'Pickle (Achaar)', 'Vermicelli (Sevaiya)'
  ],
  'Dairy & Bakery (डेयरी)': [
    'Milk (Full Cream)', 'Milk (Toned)', 'Curd (Dahi)', 'Paneer',
    'Butter (Makkhan)', 'Buttermilk (Chaas)', 'Bread (White / Brown)',
    'Eggs (Ande)', 'Rusk / Toast', 'Cheese'
  ],
  'Kitchen Gas & Supplies (गैस व सामग्री)': [
    'Commercial LPG Gas Cylinder (19kg)', 'Domestic LPG Cylinder (14.2kg)',
    'Dishwash Bar / Liquid', 'Kitchen Scrub / Sponge', 'Garbage Bags (Dustbin)',
    'Aluminium Foil & Napkins', 'Matchbox'
  ]
};

// ─── Period-based Meter Bill Distribution ─────────────────────────────────────
// ─── Period-based Meter Bill Distribution ─────────────────────────────────────
function calculateMeterBills(tenants, lastReading, currReading, ratePerUnit) {
  if (!tenants || tenants.length === 0 || currReading <= lastReading) return [];

  // Check if every tenant's join reading is above currReading (scale mismatch / meter reset)
  const allAhead = tenants.every(t => (Number(t.meterReadingAtJoin) || 0) > currReading);

  const withEffective = tenants.map(t => ({
    ...t,
    effectiveStart: allAhead
      ? lastReading
      : Math.max(Number(t.meterReadingAtJoin) || lastReading, lastReading)
  }));

  const milestoneSet = new Set([
    lastReading,
    ...withEffective.map(t => t.effectiveStart),
    currReading
  ]);
  const milestones = [...milestoneSet]
    .filter(m => m >= lastReading && m <= currReading)
    .sort((a, b) => a - b);

  const unitMap = {};
  withEffective.forEach(t => { unitMap[t.id || t.tenantId] = 0; });

  for (let i = 0; i < milestones.length - 1; i++) {
    const pStart = milestones[i];
    const pEnd   = milestones[i + 1];
    const pUnits = pEnd - pStart;
    const active = withEffective.filter(t => t.effectiveStart <= pStart);
    if (!active.length) {
      // If no tenant joined before this milestone, distribute equally to all current tenants
      const share = pUnits / withEffective.length;
      withEffective.forEach(t => { unitMap[t.id || t.tenantId] += share; });
      continue;
    }
    const share = pUnits / active.length;
    active.forEach(t => { unitMap[t.id || t.tenantId] += share; });
  }

  return withEffective.map(t => {
    const tid = t.id || t.tenantId;
    const units = Math.round((unitMap[tid] || 0) * 100) / 100;
    const money = Math.round(units * ratePerUnit * 100) / 100;
    return {
      ...t,
      consumedUnits: units,
      totalAmount: money
    };
  });
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{position:'fixed', inset:0, zIndex:1000, background:'white', color:'red', padding: 20}}>
           <h2>Something went wrong in AI Bot.</h2>
           <pre>{this.state.error.toString()}</pre>
           <pre>{this.state.error.stack}</pre>
           <button onClick={() => this.setState({hasError:false})}>Close</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Image Compressor Helper ───────────────────────────────────────────────
const compressImage = (file, maxWidth = 750) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.65));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  bg:'#fffdf0', card:'#ffffff', text:'#1a1500', sub:'#78680a', muted:'#78680a',
  border:'#e8df9a', primary:'#fde047', primaryDk:'#ca8a04', primaryBg:'#fefce8',
  success:'#10b981', successBg:'#dcfce7', warn:'#f59e0b', warnBg:'#fef3c7',
  danger:'#dc2626', dangerBg:'#fee2e2', indigo:'#fde047', indigoBg:'#fefce8',
};

const ROLE_META = {
  'Bus Driver':       { emoji:'🚌',   accent:'#38bdf8', accentBg:'#e0f2fe', dept:'Shuttle & Transport',     grad:'#38bdf8' },
  'Bus Driver':       { emoji:'🚌',   accent:'#38bdf8', accentBg:'#e0f2fe', dept:'Shuttle & Transport',     grad:'#38bdf8' },
  'Cook':             { emoji:'👨‍🍳', accent:'#a78bfa', accentBg:'#ede9fe', dept:'Kitchen & Mess',      grad:'#a78bfa' },
  'Cleaner':          { emoji:'🧹',   accent:'#67e8f9', accentBg:'#cffafe', dept:'Housekeeping',        grad:'#67e8f9' },
  'Maintenance':      { emoji:'🛠️',   accent:'#fda4af', accentBg:'#ffe4e6', dept:'Repairs & Technical', grad:'#fda4af' },
  'Purchase Manager': { emoji:'🛒',   accent:'#94a3b8', accentBg:'#f1f5f9', dept:'Store & Inventory',   grad:'#94a3b8' },
  'Security Guard':   { emoji:'🛡️',   accent:'#6ee7b7', accentBg:'#d1fae5', dept:'Gate Security',       grad:'#6ee7b7' },
  'HR':               { emoji:'👔',   accent:'#f472b6', accentBg:'#fce7f3', dept:'Human Resources & Hiring', grad:'#f472b6' },
  'Helper':           { emoji:'🙋',   accent:'#fb923c', accentBg:'#fff7ed', dept:'General Helper',          grad:'#fb923c' },
  'Plumber':          { emoji:'🔧',   accent:'#60a5fa', accentBg:'#eff6ff', dept:'Plumbing & Water',        grad:'#60a5fa' },
  'Electrician':      { emoji:'⚡',   accent:'#facc15', accentBg:'#fefce8', dept:'Electrical & Wiring',     grad:'#facc15' },
  'Carpenter':        { emoji:'🪚',   accent:'#a3a3a3', accentBg:'#fafafa', dept:'Carpentry & Fixtures',    grad:'#d4a574' },
  'Sales Manager':    { emoji:'📈',   accent:'#34d399', accentBg:'#ecfdf5', dept:'Sales & Admissions',      grad:'#34d399' },
  'Manager':          { emoji:'🏢',   accent:'#818cf8', accentBg:'#eef2ff', dept:'Operations Management',   grad:'#818cf8' },
  'Delivery Boy':     { emoji:'🛵',   accent:'#ea580c', accentBg:'#ffedd5', dept:'Tiffin & Delivery',        grad:'#ea580c' },
  'Others':           { emoji:'⚙️',   accent:'#9ca3af', accentBg:'#f9fafb', dept:'General Staff',           grad:'#9ca3af' },
};

// ─── Data ─────────────────────────────────────────────────────────────────────
const NAMES = ['Arjun Mehta','Priya Sharma','Ravi Kumar','Sneha Kapoor','Karan Singh','Mohan Lal','Ananya Gupta','Rohit Verma','Pooja Rani','Deepak Rathi','Vikram Das','Neha Singh','Amit Kumar','Suresh Patel','Divya Joshi','Rahul Sharma','Swati Roy','Aman Verma','Kavya Nair','Manoj Kumar','Ritu Singh','Alok Verma','Megha Roy','Varun Sharma','Sangeeta Kumari','Gaurav Malhotra','Preeti Mishra','Sunil Kumar','Nisha Agarwal','Vikas Y.'];

const STUDENTS = Array.from({length:30},(_,i) => {
  const statuses = ['notEaten', 'eaten', 'requested', 'pack', 'extra'];
  return {
    id: i+1,
    name: NAMES[i%30],
    phone: `+91 98${Math.floor(10000000 + Math.random() * 90000000)}`,
    room: `${101 + Math.floor(i/3)}`,
    bed: `Bed ${(i%3)+1}`,
    statusB: statuses[i % 5],
    statusL: statuses[(i + 1) % 5],
    statusS: statuses[(i + 2) % 5],
    statusD: statuses[(i + 3) % 5],
    detailsB: '',
    detailsL: '',
    detailsS: '',
    detailsD: '',
  };
});

const STORE_ITEMS = [
  {id:1,name:'Basmati Rice 25kg',cat:'Kitchen',stock:'4 bags',status:'In Stock',min:'2 bags'},
  {id:2,name:'Sunflower Oil 15L',cat:'Kitchen',stock:'1 can',status:'Low Stock',min:'3 cans'},
  {id:3,name:'Floor Sanitizer 5L',cat:'Housekeeping',stock:'2 cans',status:'In Stock',min:'2 cans'},
  {id:4,name:'PVC Tap Washers ½"',cat:'Plumbing',stock:'5 pcs',status:'Low Stock',min:'15 pcs'},
  {id:5,name:'LED Bulbs 12W',cat:'Electrical',stock:'8 pcs',status:'In Stock',min:'5 pcs'},
  {id:6,name:'Heavy Duty Mop Set',cat:'Housekeeping',stock:'0 pcs',status:'Out of Stock',min:'2 pcs'},
];

const getContactInitials = (name) => {
  if (!name) return '??';
  const clean = name.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  if (!clean) return name.substring(0, 2).toUpperCase();
  const parts = clean.split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getAvatarStyle = (contact) => {
  if (!contact) return { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0', isIcon: false };
  if (contact.type === 'admin') {
    return {
      bg: '#0f172a',
      color: '#ffffff',
      border: '#0f172a',
      isIcon: true,
      icon: 'admin_panel_settings'
    };
  }
  const name = contact.name || '';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const PALETTES = [
    { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
    { bg: '#faf5ff', color: '#6d28d9', border: '#ddd6fe' },
    { bg: '#ecfeff', color: '#0e7490', border: '#a5f3fc' },
    { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
    { bg: '#fdf2f8', color: '#be185d', border: '#fbcfe8' },
    { bg: '#f8fafc', color: '#334155', border: '#cbd5e1' },
  ];
  const idx = Math.abs(hash) % PALETTES.length;
  return {
    ...PALETTES[idx],
    isIcon: false
  };
};

const INIT_CONTACTS = [
  {id:'c1', name:'Manager / Admin', role:'Property Admin', phone:'+91 99999 00000', isPinned:true, reminder:null, lastMsg:'Update daily logs by 6 PM today.', time:'09:00 AM', type:'admin'},
  {id:'c2', name:'Priya Sharma', role:'Student · Room 102', phone:'+91 98888 77777', isPinned:false, reminder:'Check AC remote today 5:00 PM', lastMsg:'Can room 102 bathroom be cleaned at 11 AM?', time:'09:15 AM', type:'student', room:'102'},
  {id:'c3', name:'Dinesh (Maint.)', role:'Staff · Electrician', phone:'+91 97777 66666', isPinned:false, reminder:null, lastMsg:'Room 201 AC issue has been resolved.', time:'11:30 AM', type:'staff'},
];

const INIT_MESSAGES = {
  'c1': [
    {id:1, text:'Good morning team! Update daily logs by 6 PM today.', time:'09:00 AM', me:false},
    {id:2, text:'Monthly salary will be credited on 1st Aug.', time:'10:00 AM', me:false}
  ],
  'c2': [
    {id:3, text:'Can room 102 bathroom be cleaned at 11 AM?', time:'09:15 AM', me:false}
  ],
  'c3': [
    {id:4, text:'Room 201 AC issue has been resolved.', time:'11:30 AM', me:false}
  ]
};

const visitors = [
  {id:1,name:'Rajesh Malhotra',phone:'+91 98111 22233',purpose:'Parent Visit – Rm 104',inTime:'10:15 AM',outTime:null,status:'Inside'},
  {id:2,name:'Zomato Delivery',phone:'+91 98222 33344',purpose:'Food Delivery – Rm 202',inTime:'11:00 AM',outTime:'11:12 AM',status:'Exited'},
  {id:3,name:'Sunil Plumbing',phone:'+91 98333 44455',purpose:'Main Tank Repair',inTime:'08:45 AM',outTime:null,status:'Inside'},
];
const parcels = [
  {id:1,student:'Arjun Mehta',room:'101',carrier:'Amazon',tracking:'AMZ-88910',date:'Today 10:30 AM',status:'Pending'},
  {id:2,student:'Sneha Kapoor',room:'202',carrier:'Flipkart',tracking:'FK-44102',date:'Yesterday',status:'Claimed'},
  {id:3,student:'Karan Singh',room:'201',carrier:'Courier Express',tracking:'CX-9921',date:'Today 09:15 AM',status:'Pending'},
];
const tickets = [
  {id:1,room:'108',issue:'Water leakage — bathroom sink tap',priority:'High',status:'Open',student:'Sneha Kapoor',date:'Today 09:30 AM'},
  {id:2,room:'201',issue:'AC remote & filter cleaning needed',priority:'Normal',status:'In Progress',student:'Karan Singh',date:'Today 10:15 AM'},
  {id:3,room:'305',issue:'Geyser switch sparking / tripping',priority:'High',status:'Open',student:'Ravi Kumar',date:'Yesterday 4 PM'},
];
const cleaning = [
  {id:1, room:'101', student:'Arjun Mehta', phone:'+91 9895921139', slot:'09:00 AM – 11:00 AM', slotStatus:'completed', type:'Full Room Clean', done:true, note:'Please mop balcony too', date:'2026-07-24'},
  {id:2, room:'102', student:'Priya Sharma', phone:'+91 9861927774', slot:'11:00 AM – 01:00 PM', slotStatus:'active', type:'Dusting & Mop', done:false, note:'Key with room partner', date:'2026-07-24'},
  {id:3, room:'105', student:'Ankit Kumar', phone:'+91 9848300363', slot:'11:00 AM – 01:00 PM', slotStatus:'active', type:'Bathroom Sanitise', done:false, note:'Spilled juice near desk', date:'2026-07-24'},
  {id:4, room:'201', student:'Karan Singh', phone:'+91 9811122233', slot:'01:00 PM – 03:00 PM', slotStatus:'upcoming', type:'Bedsheet & Towel Change', done:false, note:'Leave fresh towel on chair', date:'2026-07-24'},
  {id:5, room:'202', student:'Sneha Kapoor', phone:'+91 9822233344', slot:'03:00 PM – 05:00 PM', slotStatus:'upcoming', type:'Full Room Clean', done:false, note:'Call before entering', date:'2026-07-24'},
  {id:6, room:'305', student:'Ravi Kumar', phone:'+91 9833344455', slot:'03:00 PM – 05:00 PM', slotStatus:'upcoming', type:'Bathroom Sanitise', done:false, note:'', date:'2026-07-24'}
];
const demands = [
  {id:1,item:'Basmati Rice 25kg',qty:'2 Bags',reqBy:'Ramesh (Cook)',vendor:'Local Market',date:'22 Jul',status:'Pending'},
  {id:2,item:'Floor Cleaner 5L',qty:'3 cans',reqBy:'Lakshmi (Cleaner)',vendor:'Sunil Traders',date:'21 Jul',status:'Approved'},
  {id:3,item:'PVC Washers (20pc)',qty:'1 pack',reqBy:'Dinesh (Maint.)',vendor:'Hardware Depot',date:'22 Jul',status:'Pending'},
];

const candidates = [
  {id:1, name:'Suresh Kumar', position:'Helper / Maintenance', experience:'3 Yrs', phone:'+91 9876543210', status:'Interview Scheduled', date:'Today 2:00 PM', note:'Experienced in plumbing & painting'},
  {id:2, name:'Rekha Devi', position:'Cook', experience:'5 Yrs', phone:'+91 9812345678', status:'Applied', date:'Yesterday', note:'Specializes in North Indian dishes'},
  {id:3, name:'Vikram Rathi', position:'Security Guard', experience:'2 Yrs', phone:'+91 9899988877', status:'Hired ✅', date:'22 Jul', note:'Joined night shift'}
];

const enquiries = [
  {id:1, name:'Rohit Sharma', phone:'+91 9876543210', requirement:'Single Room AC', budget:'₹10,000', status:'New 🔴', source:'WhatsApp', text:'Looking for a single room with AC. Budget around ₹10,000.'},
  {id:2, name:'Priya Mehta', phone:'+91 9123456789', requirement:'Double Sharing', budget:'₹7,500', status:'Contacted 🟡', source:'NoBroker', text:'Do you have double sharing available near metro station?'},
  {id:3, name:'Arun Verma', phone:'+91 9012345678', requirement:'Triple Sharing', budget:'₹6,000', status:'Closed 🟢', source:'MagicBricks', text:'What is the security deposit for triple sharing?'},
  {id:4, name:'Kavya Singh', phone:'+91 9811122233', requirement:'Double Sharing AC', budget:'₹8,500', status:'New 🔴', source:'Direct Call', text:'Need immediate move-in from 1st August.'}
];

const tasks = [
  {id:1, title:'Clean common area corridor – Ground Floor', assignedBy:'Admin', priority:'High', status:'Pending', room:'Common', time:'09:00 AM'},
  {id:2, title:'Carry vegetable delivery to kitchen', assignedBy:'Cook Ramesh', priority:'Normal', status:'Done', room:'Kitchen', time:'10:30 AM'},
  {id:3, title:'Help guest luggage – Room 204 checkout', assignedBy:'Admin', priority:'Normal', status:'Pending', room:'204', time:'12:00 PM'},
  {id:4, title:'Replace welcome mat at main entrance', assignedBy:'Admin', priority:'Low', status:'Pending', room:'Entrance', time:'02:00 PM'},
];

const plumbingJobs = [
  {id:1, room:'108', issue:'Bathroom sink tap leaking continuously', student:'Sneha Kapoor', priority:'High', status:'Open', date:'Today 09:30 AM', note:'Water pooling on floor'},
  {id:2, room:'302', issue:'Flush not working – Tank valve stuck', student:'Gaurav Malhotra', priority:'Normal', status:'In Progress', date:'Today 10:00 AM', note:'Need new valve'},
  {id:3, room:'201', issue:'Hot water geyser not heating', student:'Karan Singh', priority:'Normal', status:'Open', date:'Yesterday 4 PM', note:'Check element'},
  {id:4, room:'401', issue:'Main inlet pipe making noise', student:'Ravi Kumar', priority:'Low', status:'Open', date:'22 Jul', note:'Loose fitting'},
];

const electricalJobs = [
  {id:1, room:'305', issue:'Geyser switch sparking / MCB tripping', student:'Ravi Kumar', priority:'High', status:'Open', date:'Today 08:00 AM', note:'Do not use till fixed'},
  {id:2, room:'102', issue:'Fan running slow – capacitor issue', student:'Priya Sharma', priority:'Normal', status:'Open', date:'Today 11:00 AM', note:''},
  {id:3, room:'207', issue:'2 power sockets not working', student:'Mohan Lal', priority:'Normal', status:'In Progress', date:'Yesterday', note:'Extension used as workaround'},
  {id:4, room:'103', issue:'AC remote not pairing', student:'Arjun Mehta', priority:'Low', status:'Resolved', date:'22 Jul', note:'Remote replaced'},
];

const carpenterJobs = [
  {id:1, room:'104', issue:'Wardrobe door hinge broken', student:'Divya Joshi', priority:'Normal', status:'Open', date:'Today 10:00 AM', note:'Needs 2 hinges'},
  {id:2, room:'202', issue:'Study table drawer stuck / jammed', student:'Sneha Kapoor', priority:'Low', status:'Open', date:'Today 11:30 AM', note:''},
  {id:3, room:'301', issue:'Bed slat cracked – squeaking', student:'Rahul Sharma', priority:'High', status:'In Progress', date:'Yesterday', note:'Replacement slat ordered'},
  {id:4, room:'106', issue:'Window latch / lock not closing', student:'Aman Verma', priority:'Normal', status:'Open', date:'22 Jul', note:'Security risk'},
];

const rooms = [
  {id:1, number:'101', type:'Single AC', status:'Occupied', student:'Arjun Mehta', rent:'₹12,000', due:'2026-08-01'},
  {id:2, number:'102', type:'Double Sharing', status:'Occupied', student:'Priya Sharma / Kavya', rent:'₹8,500', due:'2026-08-01'},
  {id:3, number:'201', type:'Triple Sharing', status:'Occupied', student:'Karan / Rohit / Aman', rent:'₹7,000', due:'2026-08-01'},
  {id:4, number:'203', type:'Single Non-AC', status:'Vacant', student:'—', rent:'₹9,000', due:'—'},
  {id:5, number:'301', type:'Double Sharing AC', status:'Vacant', student:'—', rent:'₹10,500', due:'—'},
  {id:6, number:'305', type:'Single AC', status:'Occupied', student:'Ravi Kumar', rent:'₹12,000', due:'2026-08-01'},
];

const INIT_VENDORS = [
  { id: 1, name: 'Sunil Kumar', shop: 'The Local Market', category: 'Groceries', upi: 'sunilkumar@upi', balance: 90, totalSpent: 100 },
  { id: 2, name: 'Raju Verma', shop: 'Fresh Picks', category: 'Groceries', upi: 'rajuverma@upi', balance: 5000, totalSpent: 85000 },
  { id: 3, name: 'Lakhan DryCleaners', shop: 'Express Laundry', category: 'Laundry', upi: 'lakhan@upi', balance: 12000, totalSpent: 45000 },
  { id: 4, name: 'Sanjay Veggies', shop: 'Sabzi Mandi Shop', category: 'Vegetables', upi: 'sanjay@upi', balance: 3500, totalSpent: 30000 },
  { id: 5, name: 'Krishna Dairy', shop: 'Shree Krishna Milk', category: 'Dairy', upi: 'krishna@upi', balance: 8000, totalSpent: 65000 },
  { id: 6, name: 'Bisleri Water Supplier', shop: 'Pure Water Agency', category: 'Water', upi: 'bisleri@upi', balance: 4000, totalSpent: 24000 }
];

const INIT_ITEMS_BY_CATEGORY = {
  'Groceries': [
    { name: 'Besan', unit: 'kg', rate: 10 },
    { name: 'Biscuits', unit: 'packet', rate: 20 },
    { name: 'Coffee Powder', unit: 'gm', rate: 120 },
    { name: 'Cooking Oil (Mustard)', unit: 'L', rate: 170 },
    { name: 'Cooking Oil (Sunflower)', unit: 'L', rate: 140 },
    { name: 'Coriander Powder', unit: 'gm', rate: 45 },
    { name: 'Cumin Seeds', unit: 'gm', rate: 90 },
    { name: 'Sugar', unit: 'kg', rate: 40 },
    { name: 'Tea Leaves', unit: 'gm', rate: 60 }
  ],
  'Laundry': [
    { name: 'Bedsheet Washing', unit: 'pc', rate: 15 },
    { name: 'Pillow Cover washing', unit: 'pc', rate: 5 },
    { name: 'Dry Cleaning Uniform', unit: 'set', rate: 80 }
  ],
  'Vegetables': [
    { name: 'Potatoes', unit: 'kg', rate: 25 },
    { name: 'Onions', unit: 'kg', rate: 35 },
    { name: 'Tomatoes', unit: 'kg', rate: 40 },
    { name: 'Green Chillies', unit: 'kg', rate: 80 }
  ],
  'Dairy': [
    { name: 'Toned Milk', unit: 'L', rate: 54 },
    { name: 'Full Cream Milk', unit: 'L', rate: 66 },
    { name: 'Paneer', unit: 'kg', rate: 360 },
    { name: 'Curd', unit: 'kg', rate: 80 }
  ],
  'Water': [
    { name: '20L Water Can', unit: 'bottle', rate: 30 },
    { name: 'Water Tanker (1000L)', unit: 'tanker', rate: 800 }
  ]
};

// ─── Role-Based Personalized Item Lists ─────────────────────────────────────
const ROLE_ITEM_LISTS = {
  'Cook': [
    { name: 'Rice (Regular)', unit: 'kg', cat: 'Groceries' },
    { name: 'Basmati Rice', unit: 'kg', cat: 'Groceries' },
    { name: 'Dal (Chana)', unit: 'kg', cat: 'Groceries' },
    { name: 'Dal (Moong)', unit: 'kg', cat: 'Groceries' },
    { name: 'Dal (Masoor)', unit: 'kg', cat: 'Groceries' },
    { name: 'Besan', unit: 'kg', cat: 'Groceries' },
    { name: 'Wheat Flour (Aata)', unit: 'kg', cat: 'Groceries' },
    { name: 'Sooji', unit: 'kg', cat: 'Groceries' },
    { name: 'Sugar', unit: 'kg', cat: 'Groceries' },
    { name: 'Salt', unit: 'kg', cat: 'Groceries' },
    { name: 'Cooking Oil (Sunflower)', unit: 'L', cat: 'Groceries' },
    { name: 'Cooking Oil (Mustard)', unit: 'L', cat: 'Groceries' },
    { name: 'Tea Leaves', unit: 'gm', cat: 'Groceries' },
    { name: 'Coffee Powder', unit: 'gm', cat: 'Groceries' },
    { name: 'Turmeric Powder', unit: 'gm', cat: 'Groceries' },
    { name: 'Coriander Powder', unit: 'gm', cat: 'Groceries' },
    { name: 'Red Chilli Powder', unit: 'gm', cat: 'Groceries' },
    { name: 'Cumin Seeds', unit: 'gm', cat: 'Groceries' },
    { name: 'Garam Masala', unit: 'gm', cat: 'Groceries' },
    { name: 'Vermicelli', unit: 'packet', cat: 'Groceries' },
    { name: 'Biscuits', unit: 'packet', cat: 'Groceries' },
    { name: 'Potatoes', unit: 'kg', cat: 'Vegetables' },
    { name: 'Onions', unit: 'kg', cat: 'Vegetables' },
    { name: 'Tomatoes', unit: 'kg', cat: 'Vegetables' },
    { name: 'Green Chillies', unit: 'kg', cat: 'Vegetables' },
    { name: 'Ginger', unit: 'gm', cat: 'Vegetables' },
    { name: 'Garlic', unit: 'gm', cat: 'Vegetables' },
    { name: 'Toned Milk', unit: 'L', cat: 'Dairy' },
    { name: 'Full Cream Milk', unit: 'L', cat: 'Dairy' },
    { name: 'Paneer', unit: 'kg', cat: 'Dairy' },
    { name: 'Curd', unit: 'kg', cat: 'Dairy' },
    { name: 'LPG Gas Cylinder', unit: 'cylinder', cat: 'Utilities' },
  ],
  'Plumber': [
    { name: 'CPVC Pipe (1/2 inch)', unit: 'm', cat: 'Plumbing' },
    { name: 'CPVC Pipe (3/4 inch)', unit: 'm', cat: 'Plumbing' },
    { name: 'PVC Pipe (4 inch)', unit: 'm', cat: 'Plumbing' },
    { name: 'Ball Valve (1/2 inch)', unit: 'pc', cat: 'Plumbing' },
    { name: 'Stop Cock', unit: 'pc', cat: 'Plumbing' },
    { name: 'Angle Valve', unit: 'pc', cat: 'Plumbing' },
    { name: 'Pipe Elbow (1/2 inch)', unit: 'pc', cat: 'Plumbing' },
    { name: 'Pipe Tee (1/2 inch)', unit: 'pc', cat: 'Plumbing' },
    { name: 'Teflon Tape', unit: 'roll', cat: 'Plumbing' },
    { name: 'PVC Solvent Cement', unit: 'tin', cat: 'Plumbing' },
    { name: 'Geyser Element', unit: 'pc', cat: 'Fittings' },
    { name: 'Float Valve', unit: 'pc', cat: 'Fittings' },
    { name: 'Tap Washer Set', unit: 'set', cat: 'Fittings' },
    { name: 'Drain Cleaner Chemical', unit: 'bottle', cat: 'Cleaning' },
    { name: 'Flexible Hose Pipe', unit: 'm', cat: 'Plumbing' },
    { name: 'Plumber Putty', unit: 'tin', cat: 'Plumbing' },
  ],
  'Electrician': [
    { name: 'MCB (Single Pole 6A)', unit: 'pc', cat: 'Electrical' },
    { name: 'MCB (Double Pole 32A)', unit: 'pc', cat: 'Electrical' },
    { name: 'Wire (1.5 sq mm)', unit: 'm', cat: 'Electrical' },
    { name: 'Wire (2.5 sq mm)', unit: 'm', cat: 'Electrical' },
    { name: 'Modular Switch (10A)', unit: 'pc', cat: 'Electrical' },
    { name: 'Modular Socket (16A)', unit: 'pc', cat: 'Electrical' },
    { name: 'AC Socket (5 pin)', unit: 'pc', cat: 'Electrical' },
    { name: 'LED Bulb (9W)', unit: 'pc', cat: 'Electrical' },
    { name: 'LED Bulb (12W)', unit: 'pc', cat: 'Electrical' },
    { name: 'Tube Light (18W)', unit: 'pc', cat: 'Electrical' },
    { name: 'Fan Capacitor', unit: 'pc', cat: 'Electrical' },
    { name: 'Geyser Switch (25A)', unit: 'pc', cat: 'Electrical' },
    { name: 'Extension Board (4 socket)', unit: 'pc', cat: 'Electrical' },
    { name: 'PVC Conduit Pipe', unit: 'm', cat: 'Electrical' },
    { name: 'Electrical Tape', unit: 'roll', cat: 'Supplies' },
  ],
  'Carpenter': [
    { name: 'Plywood (18mm)', unit: 'sheet', cat: 'Wood' },
    { name: 'MDF Board (12mm)', unit: 'sheet', cat: 'Wood' },
    { name: 'Nail Set (Mixed)', unit: 'box', cat: 'Hardware' },
    { name: 'Wood Screw Set', unit: 'box', cat: 'Hardware' },
    { name: 'Hinge (3 inch)', unit: 'pair', cat: 'Hardware' },
    { name: 'Door Handle', unit: 'pc', cat: 'Hardware' },
    { name: 'Door Latch (5 inch)', unit: 'pc', cat: 'Hardware' },
    { name: 'Door Lock Set', unit: 'set', cat: 'Hardware' },
    { name: 'Wood Polish', unit: 'L', cat: 'Finishing' },
    { name: 'Wood Filler Putty', unit: 'tin', cat: 'Finishing' },
    { name: 'Sandpaper (80 grit)', unit: 'sheet', cat: 'Finishing' },
    { name: 'Wood Glue', unit: 'bottle', cat: 'Finishing' },
    { name: 'Drawer Slider Set', unit: 'pair', cat: 'Hardware' },
  ],
  'Housekeeper': [
    { name: 'Floor Cleaning Liquid', unit: 'L', cat: 'Cleaning' },
    { name: 'Toilet Cleaning Liquid', unit: 'bottle', cat: 'Cleaning' },
    { name: 'Glass Cleaner', unit: 'bottle', cat: 'Cleaning' },
    { name: 'Disinfectant Spray', unit: 'bottle', cat: 'Cleaning' },
    { name: 'Scrub Pad (Pack of 6)', unit: 'pack', cat: 'Cleaning' },
    { name: 'Broom (Floor)', unit: 'pc', cat: 'Supplies' },
    { name: 'Mop Set', unit: 'set', cat: 'Supplies' },
    { name: 'Garbage Bags (Pack of 30)', unit: 'pack', cat: 'Supplies' },
    { name: 'Toilet Paper (12 Roll Pack)', unit: 'pack', cat: 'Consumables' },
    { name: 'Hand Wash Liquid', unit: 'bottle', cat: 'Consumables' },
    { name: 'Room Freshener Spray', unit: 'bottle', cat: 'Consumables' },
    { name: 'Laundry Detergent Powder', unit: 'kg', cat: 'Cleaning' },
    { name: 'Cloth Wiper / Duster', unit: 'pc', cat: 'Supplies' },
  ],
  'Security': [
    { name: 'Log Book (A4)', unit: 'pc', cat: 'Stationery' },
    { name: 'Pen (Blue, Pack of 10)', unit: 'pack', cat: 'Stationery' },
    { name: 'Torch / Flashlight', unit: 'pc', cat: 'Equipment' },
    { name: 'Batteries (AA)', unit: 'pack', cat: 'Equipment' },
    { name: 'Visitor Badge (Pack of 50)', unit: 'pack', cat: 'Stationery' },
    { name: 'Rubber Stamp Ink', unit: 'bottle', cat: 'Stationery' },
    { name: 'Umbrella', unit: 'pc', cat: 'Supplies' },
    { name: 'Safety Whistle', unit: 'pc', cat: 'Equipment' },
  ],
  'Sales Manager': [
    { name: 'Brochure Paper (A4 Glossy)', unit: 'ream', cat: 'Stationery' },
    { name: 'Visiting Cards (Pack of 100)', unit: 'pack', cat: 'Stationery' },
    { name: 'Pen (Blue, Pack of 10)', unit: 'pack', cat: 'Stationery' },
    { name: 'File Folder A4', unit: 'pc', cat: 'Stationery' },
    { name: 'Notepad A4', unit: 'pc', cat: 'Stationery' },
    { name: 'Marker Pen (Pack of 5)', unit: 'pack', cat: 'Stationery' },
    { name: 'Printer Ink Cartridge', unit: 'pc', cat: 'Equipment' },
    { name: 'A4 Printing Paper (500 sheet)', unit: 'ream', cat: 'Stationery' },
  ],
  'Purchase Manager': [
    { name: 'Invoice File Folder', unit: 'pc', cat: 'Stationery' },
    { name: 'Payment Receipt Book', unit: 'pc', cat: 'Stationery' },
    { name: 'Pen (Blue, Pack of 10)', unit: 'pack', cat: 'Stationery' },
    { name: 'Calculator', unit: 'pc', cat: 'Equipment' },
    { name: 'Printer Ink Cartridge', unit: 'pc', cat: 'Equipment' },
    { name: 'A4 Printing Paper (500 sheet)', unit: 'ream', cat: 'Stationery' },
    { name: 'Stapler + Refill', unit: 'set', cat: 'Stationery' },
  ],
};

const DEFAULT_ITEMS = [
  { name: 'Pen (Blue)', unit: 'pc', cat: 'Stationery' },
  { name: 'Notepad', unit: 'pc', cat: 'Stationery' },
  { name: 'Torch', unit: 'pc', cat: 'Equipment' },
  { name: 'Umbrella', unit: 'pc', cat: 'Supplies' },
];

const INIT_VENDOR_LEDGER = [
  { id: 1, vendorId: 1, date: '24 July 2026', type: 'Purchase', amount: 100, desc: 'Purchase: Besan (10 kg)', status: 'Pending', pm: 'UPI -> sunilkumar@upi' }
];

// ─── Small Reusable UI ────────────────────────────────────────────────────────
const Chip = ({label,color=C.primary,bg=C.primaryBg})=>(
  <span style={{fontSize:10,fontWeight:800,color,background:bg,padding:'3px 8px',borderRadius:20,whiteSpace:'nowrap'}}>{label}</span>
);

const Row = ({children,style={}})=>(
  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',...style}}>{children}</div>
);

const Divider = ()=><div style={{height:1,background:C.border,margin:'6px 0'}}/>;

const InputField = ({label,textarea=false,...props})=>{
  const Tag = textarea ? 'textarea' : 'input';
  return (
    <div style={{display:'flex',flexDirection:'column',gap:5}}>
      {label&&<label style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:.4}}>{label}</label>}
      <Tag {...props} style={{padding:'11px 14px',border: '1px solid #e2e8f0',borderRadius: 8,fontSize:14,fontFamily:'inherit',background:'#fff',color:C.text,outline:'none',boxSizing:'border-box',width:'100%',resize:textarea?'vertical':'none',...props.style}}/>
    </div>
  );
};

const SelectField = ({label,children,...props})=>(
  <div style={{display:'flex',flexDirection:'column',gap:5}}>
    {label&&<label style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:.4}}>{label}</label>}
    <select {...props} style={{padding:'11px 14px',border: '1px solid #e2e8f0',borderRadius: 8,fontSize:14,fontFamily:'inherit',background:'#fff',color:C.text,outline:'none',boxSizing:'border-box',width:'100%',...props.style}}>{children}</select>
  </div>
);

// ─── Bottom Sheet Modal ───────────────────────────────────────────────────────
const Sheet = ({show,onClose,title,sub,children})=>{
  if(!show)return null;
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,.6)',zIndex:400,display:'flex',alignItems:'flex-end',backdropFilter:'blur(4px)'}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{width:'100%',maxWidth:480,margin:'0 auto',background:'#fff',borderRadius:'24px 24px 0 0',padding:'0 0 36px',boxShadow: '0 4px 16px rgba(15,23,42,0.05)',animation:'sheetUp .25s ease'}}>
        <div style={{display:'flex',justifyContent:'center',padding:'14px 0 0'}}><div style={{width:36,height:4,background:C.border,borderRadius:4}}/></div>
        <Row style={{padding:'12px 20px 16px',borderBottom: '1px solid #e2e8f0'}}>
          <div><p style={{margin:0,fontSize:16,fontWeight:800,color:C.text}}>{title}</p>{sub&&<p style={{margin:'2px 0 0',fontSize:12,color:C.muted}}>{sub}</p>}</div>
          <button onClick={onClose} style={{background:C.bg,border: '1px solid #e2e8f0',borderRadius:10,width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:18,color:C.muted}}>✕</button>
        </Row>
        <div style={{padding:'16px 20px'}}>{children}</div>
      </div>
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
// ─── Custom Persistent State Hook ───────────────────────────────────────────────
function usePersistentState(key, defaultValue) {
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved !== null ? JSON.parse(saved) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {}
  }, [key, state]);

  return [state, setState];
}


// ─── Inventory View Component ──────────────────────────────────────────────────
function InventoryView({ myInventory, updateQty, removeItem, setView, showToast }) {

  const saveInventory = () => {
    showToast('Inventory saved successfully!', 'success');
  };

  return (
    <div style={{padding:'0', display:'flex', flexDirection:'column', gap:0, background:'#f8fafc', minHeight:'100vh'}}>
      {/* Top Bar for Inventory */}
      <div style={{background:'#fff', padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #e2e8f0', position:'sticky', top:0, zIndex:10}}>
        <div style={{display:'flex', alignItems:'center', gap:12}}>
          <button onClick={() => setView('work')} style={{background:'none', border:'none', color:'#0891b2', display:'flex', alignItems:'center', cursor:'pointer', padding:0}}>
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h3 style={{margin:0, fontSize:17, fontWeight:800, color:'#0f172a'}}>Allotted Inventory</h3>
        </div>
        <button onClick={saveInventory} style={{background:'#0891b2', color:'#fff', border:'none', borderRadius:20, padding:'6px 16px', fontSize:14, fontWeight:700, cursor:'pointer'}}>
          Save
        </button>
      </div>

      <div style={{padding:'20px 16px', display:'flex', flexDirection:'column', gap:12}}>
        {myInventory.map(item => (
          <div key={item.id} style={{background:'#fff', borderRadius:16, border:'1px solid #e2e8f0', padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', boxShadow:'0 2px 8px rgba(15,23,42,0.03)'}}>
            <div style={{display:'flex', alignItems:'center', gap:12}}>
              <span className="material-symbols-outlined" style={{color:'#0891b2', fontSize:22}}>{item.icon}</span>
              <span style={{fontSize:15, fontWeight:700, color:'#334155'}}>{item.name}</span>
            </div>
            <div style={{display:'flex', alignItems:'center', gap:16}}>
              <input 
                type="number" 
                value={item.qty}
                onChange={(e) => updateQty(item.id, parseInt(e.target.value) || 0)}
                style={{width:48, height:32, border:'1px solid #0891b2', borderRadius:8, textAlign:'center', fontSize:15, fontWeight:700, color:'#0f172a', outline:'none'}}
              />
              <button onClick={() => removeItem(item.id)} style={{background:'none', border:'none', color:'#ef4444', display:'flex', alignItems:'center', cursor:'pointer', padding:0}}>
                <span className="material-symbols-outlined" style={{fontSize:22}}>delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <button 
        onClick={() => showToast('Adding custom item...', 'success')}
        style={{position:'fixed', bottom:100, right:24, width:56, height:56, borderRadius:'50%', background:'#0891b2', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', border:'none', boxShadow:'0 4px 12px rgba(8, 145, 178, 0.4)', cursor:'pointer', zIndex:20}}>
        <span className="material-symbols-outlined" style={{fontSize:28}}>add</span>
      </button>
    </div>
  );
}

const getInventoryForRole = (role) => {
  const common = [
    { id: '1', name: 'Uniform', icon: 'checkroom', qty: 2 },
    { id: '2', name: 'ID Card', icon: 'badge', qty: 1 }
  ];
  if (role === 'Cleaner') return [...common, { id: '3', name: 'Apron', icon: 'dry_cleaning', qty: 2 }, { id: '4', name: 'Gloves', icon: 'front_hand', qty: 3 }, { id: '5', name: 'Mop', icon: 'cleaning_services', qty: 2 }, { id: '6', name: 'Broom', icon: 'mop', qty: 1 }, { id: '7', name: 'Bucket', icon: 'water_drop', qty: 2 }, { id: '8', name: 'Cleaning Spray', icon: 'sanitizer', qty: 3 }, { id: '9', name: 'Dustpan', icon: 'delete_sweep', qty: 1 }];
  if (role === 'Security Guard') return [...common, { id: '3', name: 'Whistle', icon: 'sports', qty: 1 }, { id: '4', name: 'Torch / Flashlight', icon: 'flashlight_on', qty: 1 }, { id: '5', name: 'Baton', icon: 'gavel', qty: 1 }, { id: '6', name: 'Raincoat', icon: 'umbrella', qty: 1 }, { id: '7', name: 'Walkie-Talkie', icon: 'settings_remote', qty: 1 }];
  if (role === 'Cook') return [...common, { id: '3', name: 'Chef Hat', icon: 'restaurant_menu', qty: 2 }, { id: '4', name: 'Apron', icon: 'dry_cleaning', qty: 3 }, { id: '5', name: 'Kitchen Gloves', icon: 'front_hand', qty: 4 }, { id: '6', name: 'Thermometer', icon: 'device_thermostat', qty: 1 }];
  if (role === 'Bus Driver') return [...common, { id: '3', name: 'License Badge', icon: 'directions_bus', qty: 1 }, { id: '4', name: 'First Aid Kit', icon: 'medical_services', qty: 1 }, { id: '5', name: 'Reflective Vest', icon: 'safety_divider', qty: 1 }];
  if (['Plumber', 'Electrician', 'Carpenter', 'Maintenance'].includes(role)) return [...common, { id: '3', name: 'Safety Helmet', icon: 'engineering', qty: 1 }, { id: '4', name: 'Toolbelt', icon: 'home_repair_service', qty: 1 }, { id: '5', name: 'Safety Shoes', icon: 'snowshoeing', qty: 1 }, { id: '6', name: 'Heavy Gloves', icon: 'front_hand', qty: 2 }];
  if (['HR', 'Sales Manager', 'Purchase Manager'].includes(role)) return [...common, { id: '3', name: 'Laptop', icon: 'laptop_mac', qty: 1 }, { id: '4', name: 'Tablet', icon: 'tablet_mac', qty: 1 }, { id: '5', name: 'Notebook', icon: 'menu_book', qty: 2 }];
  return [...common, { id: '3', name: 'Notebook', icon: 'menu_book', qty: 1 }, { id: '4', name: 'Safety Vest', icon: 'safety_divider', qty: 1 }];
};

// ─── Kitchen Estimator (static fallback) ─────────────────────────────────────
const estimateKitchenRequirements = async (count) => {
  // Simple per-head formula, no AI needed
  return {
    rice:   Math.round(count * 0.12 * 10) / 10,
    atta:   Math.round(count * 0.10 * 10) / 10,
    dal:    Math.round(count * 0.05 * 10) / 10,
    veggies: Math.round(count * 0.15 * 10) / 10,
  };
};

const ShiftTimer = ({ clockIn, clockInExact, clocked, resting, lastRestStart, totalRestMs }) => {
  const [timeStr, setTimeStr] = useState('00 : 00 : 00');

  useEffect(() => {
    if (!clocked || (!clockIn && !clockInExact)) {
      setTimeStr('00 : 00 : 00');
      return;
    }

    const updateTimer = () => {
      const parseTime = (timeStr) => {
        if (!timeStr) return new Date();
        let time = String(timeStr).trim();
        let modifier = '';
        if (time.toLowerCase().includes('am')) { modifier = 'AM'; time = time.replace(/am/i, '').trim(); }
        else if (time.toLowerCase().includes('pm')) { modifier = 'PM'; time = time.replace(/pm/i, '').trim(); }
        
        let [hours, minutes] = time.split(':');
        if (!hours || !minutes) return new Date();
        
        hours = parseInt(hours, 10);
        minutes = parseInt(minutes, 10);
        
        if (hours === 12) hours = 0;
        if (modifier === 'PM') hours += 12;
        
        const d = new Date();
        d.setHours(hours, minutes, 0, 0);
        return d;
      };

      let t1;
      if (clockInExact) {
        t1 = new Date(clockInExact);
        if (isNaN(t1.getTime())) t1 = parseTime(clockIn); // Fallback if invalid date
      } else {
        t1 = parseTime(clockIn);
      }
      
      const now = new Date();
      let diffMs = now - t1;
      if (isNaN(diffMs)) {
        setTimeStr('00 : 00 : 00');
        return;
      }
      if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000;
      
      let extraRest = 0;
      if (resting && lastRestStart) {
        const isIso = String(lastRestStart).includes('T');
        let restStartTime = isIso ? new Date(lastRestStart) : parseTime(lastRestStart);
        if (!isNaN(restStartTime.getTime())) {
          let restDiff = now - restStartTime;
          if (restDiff < 0) restDiff += 24 * 60 * 60 * 1000;
          extraRest = restDiff;
        }
      }
      diffMs -= ((Number(totalRestMs) || 0) + extraRest);
      if (diffMs < 0) diffMs = 0;
      
      const h = Math.floor(diffMs / 3600000) || 0;
      const m = Math.floor((diffMs % 3600000) / 60000) || 0;
      const s = Math.floor((diffMs % 60000) / 1000) || 0;
      
      setTimeStr(
        `${h.toString().padStart(2, '0')} : ${m.toString().padStart(2, '0')} : ${s.toString().padStart(2, '0')}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [clocked, clockIn, clockInExact, resting, lastRestStart, totalRestMs]);

  return <h2 style={{margin:'6px 0 2px', fontSize:36, fontWeight:900, letterSpacing:-1, color:'#000'}}>{timeStr}</h2>;
};

export default function StaffApp(){

  const { user, logout, activePgId, switchPg, assignedProperties } = useAuth();
  const [showStaffPgSwitcher, setShowStaffPgSwitcher] = useState(false);
  const [staffProfile, setStaffProfile] = useState(user);
  const [fbAuthReady, setFbAuthReady] = useState(false);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setFbAuthReady(true);
      } else {
        signInWithEmailAndPassword(auth, "superadmin_backend_hidden@febebo.com", "FebeboSuperadminSecret2026!")
          .then(() => setFbAuthReady(true))
          .catch(async (err) => {
             console.error("Superadmin background login failed:", err);
             if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                try {
                   await createUserWithEmailAndPassword(auth, "superadmin_backend_hidden@febebo.com", "FebeboSuperadminSecret2026!");
                   setFbAuthReady(true);
                } catch(createErr) {
                   console.error("Superadmin fallback creation failed:", createErr);
                   setFbAuthReady(true);
                }
             } else {
               setFbAuthReady(true);
             }
          });
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if ((user?.id || user?.uid)) {
       const unsub = onSnapshot(doc(db, 'staff_tokens', (user.id || (user?.uid || user?.id))), (d) => {
         if (d.exists()) setStaffProfile({ ...user, ...d.data() });
       });
       return () => unsub();
    }
  }, [(user?.id || user?.uid)]);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  };

  const rawRole = (user?.staffRole || (user?.role !== 'staff' ? user?.role : null) || 'Cook');
  const roleAlias = {
    'House Keeping': 'Cleaner',
    'Laundry': 'Cleaner',
    'Sweeper': 'Cleaner',
    'Painter': 'Carpenter',
    'Driver': 'Bus Driver',
    'Receptionist': 'Manager',
    'Gardener': 'Helper',
    'Sales': 'Sales Manager',
    'Delivery': 'Delivery Boy',
    'Delivery Partner': 'Delivery Boy',
    'Delivery Staff': 'Delivery Boy',
    'Other': 'Others'
  };
  const staffRole = roleAlias[rawRole] || rawRole;
  const staffName = user?.name     || 'Staff Member';
  const hasDeliveryDuty = (
    staffRole === 'Delivery Boy' || 
    staffRole === 'Manager' || 
    String(staffRole || '').toLowerCase().includes('manager') ||
    user?.isDeliveryBoy === true || 
    String(user?.isDeliveryBoy) === 'true'
  );
  const meta      = ROLE_META[staffRole] || ROLE_META['Cook'];
  const firstName = staffName.split(/\s+/)[0];

  // Sidebar & view
  const [sidebar,  setSidebar]  = useState(false);
  const [view,     setView]     = useState('home');
  const [showAllModules, setShowAllModules] = useState(false);
  const [salaryExpanded, setSalaryExpanded] = useState({});
  const [aiEstimates, setAiEstimates] = useState(null);
  const [isEstimating, setIsEstimating] = useState(false);
  
  const [myInventory, setMyInventory] = useState(() => getInventoryForRole(staffRole));
  const updateQty = (id, newQty) => {
    if(newQty < 0) return;
    setMyInventory(prev => prev.map(item => item.id === id ? { ...item, qty: newQty } : item));
  };
  const removeItem = (id) => {
    if(window.confirm('Remove this item from your allotted inventory?')) {
      setMyInventory(prev => prev.filter(item => item.id !== id));
    }
  };
   const currentJsDay = new Date().getDay();
  const dayNameMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = dayNameMap[currentJsDay];

  // Clock
  const [clocked, setClocked]   = useState(false);
  const [showPunchOutConfirm, setShowPunchOutConfirm] = useState(false);
  const [allAttendanceLogs, setAllAttendanceLogs] = useState([]);
  const [clockIn, setClockIn]   = useState('');
  const [clockInExact, setClockInExact] = useState(''); // ISO string of punch-in time
  const [resting, setResting] = useState(false);
  const [restStart, setRestStart] = useState('');
  const [totalRestDurationMs, setTotalRestDurationMs] = useState(0);
  const [punchLog, setPunchLog] = useState([]);
  const [paySlips, setPaySlips] = useState([]);
  const [workingDays, setWorkingDays] = useState(0);
  const [staffFeedback, setStaffFeedback] = useState([]);
  const [isPunching, setIsPunching] = useState(false);

  // Cook
  const [students,setStudents]  = useState([]);
  const [vacations, setVacations] = useState([]);
  const [showScan, setShowScan] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [showMealQR, setShowMealQR] = useState(false);
  const [selectedQRMeal, setSelectedQRMeal] = useState('');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [manualSearch, setManualSearch] = useState('');
  const [activeMeal, setActiveMeal] = useState('');
  
  // get today meal based on hour
  useEffect(() => {
    const hr = new Date().getHours();
    if (hr >= 5 && hr < 11) setActiveMeal('breakfast');
    else if (hr >= 11 && hr < 16) setActiveMeal('lunch');
    else if (hr >= 16 && hr < 19) setActiveMeal('snacks');
    else setActiveMeal('dinner');
  }, []);

  // ── Kitchen Inventory Master State (Live Synced with Admin) ───────────────
  const [kitchenInventoryList, setKitchenInventoryList] = useState([]);
  const [kitchenInventoryLoading, setKitchenInventoryLoading] = useState(true);
  const [inventoryTab, setInventoryTab] = useState('kitchen'); // 'kitchen' | 'petty_cash'
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [showAddKitchenItemModal, setShowAddKitchenItemModal] = useState(false);
  const [newKitchenItemForm, setNewKitchenItemForm] = useState({ name: '', qty: '', unit: 'kg' });
  const [kitchenItemSaving, setKitchenItemSaving] = useState(false);

  useEffect(() => {
    const adminUid = staffProfile?.ownerUid || user?.ownerUid;
    if (!adminUid) return;

    const q = query(
      collection(db, 'pg_inventory_master'),
      where('adminId', '==', adminUid),
      where('category', '==', 'kitchen')
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
      setKitchenInventoryList(list);
      setKitchenInventoryLoading(false);
    }, (err) => {
      console.error('Error listening to kitchen inventory in StaffApp:', err);
      setKitchenInventoryLoading(false);
    });

    return () => unsub();
  }, [user?.ownerUid, staffProfile?.ownerUid]);

  
  


  useEffect(() => {
    if (staffRole === 'Cook') {
      const count = students.filter(s=>s.statusB==='eaten').length || 32;
      setIsEstimating(true);
      estimateKitchenRequirements(count).then(estimates => {
        setAiEstimates(estimates);
        setIsEstimating(false);
      });
    }
  }, [students, staffRole]);
  const [timeFilter, setTimeFilter] = useState('Daily'); // Daily | Weekly | Monthly
  const [mealTab, setMealTab] = useState(() => {
    const hour = new Date().getHours();
    if (hour < 11) return 'Breakfast';
    if (hour < 15) return 'Lunch';
    if (hour < 18) return 'Snacks';
    return 'Dinner';
  }); // Breakfast | Lunch | Snacks | Dinner
  const [selectedStat, setSelectedStat] = useState('notEaten'); // requested | pack | extra | eaten | notEaten
  

  const [showMenuEdit, setShowMenuEdit] = useState(false);
  const [menuEditVal, setMenuEditVal] = useState('');

  const [showPackEdit, setShowPackEdit] = useState(false);
  const [packStudentId, setPackStudentId] = useState(null);
  const [packVal, setPackVal] = useState('');
  const [packPriceVal, setPackPriceVal] = useState('');
  const [workDate, setWorkDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Cook History Filters
  const [cookHistStatus, setCookHistStatus] = useState('All');
  const [cookHistMeal, setCookHistMeal] = useState('All Meals');
  const [cookHistFood, setCookHistFood] = useState('All Food Items');
  const [expandedCookHistId, setExpandedCookHistId] = useState(null);
  const [totalCapacity, setTotalCapacity] = useState(0);
  
  // Weekly Food Menu
  const [weeklyFoodMenu, setWeeklyFoodMenu] = useState({
    Monday: { Breakfast: 'Poha, Jalebi, Chai / Masala Tea', Lunch: 'Rajma Chawal, Roti, Salad', Snacks: 'Samosa, Chai / Masala Tea', Dinner: 'Paneer Butter Masala, Roti, Dal' },
    Tuesday: { Breakfast: 'Aloo Paratha, Curd, Chai / Masala Tea', Lunch: 'Kadi Pakoda, Rice', Snacks: 'Puff, Chai / Masala Tea', Dinner: 'Mix Veg, Dal, Roti' },
    Wednesday: { Breakfast: 'Idli, Sambhar, Chai / Masala Tea', Lunch: 'Chole Bhature, Lassi', Snacks: 'Namkeen, Chai / Masala Tea', Dinner: 'Dal Makhani, Roti, Rice' },
    Thursday: { Breakfast: 'Bread Omelette, Chai / Masala Tea', Lunch: 'Dal Fry, Rice, Papad', Snacks: 'Biscuits, Chai / Masala Tea', Dinner: 'Egg Curry, Roti, Rice' },
    Friday: { Breakfast: 'Upma, Chai / Masala Tea', Lunch: 'Veg Biryani, Raita', Snacks: 'Bhel Puri, Chai / Masala Tea', Dinner: 'Matar Paneer, Roti' },
    Saturday: { Breakfast: 'Puri Sabji, Chai / Masala Tea', Lunch: 'Dal Tadka, Rice', Snacks: 'Pakoda, Chai / Masala Tea', Dinner: 'Aloo Gobi, Roti' },
    Sunday: { Breakfast: 'Masala Dosa, Chutney, Chai / Masala Tea', Lunch: 'Special Thali', Snacks: 'Samosa, Chai / Masala Tea', Dinner: 'Paneer Butter Masala, Roti, Dal' }
  });
  const [foodMenuImages, setFoodMenuImages] = useState({});
  const [foodItemImages, setFoodItemImages] = useState({});
  const [pausedMeals, setPausedMeals] = useState({});

  const handleToggleMealPause = async (targetMealKey, targetDate) => {
    const adminId = user?.ownerUid;
    if (!adminId) return;
    const mKey = (targetMealKey || 'lunch').toLowerCase();
    const dateKey = targetDate || workDate || new Date().toISOString().split('T')[0];
    const currentlyPaused = !!(pausedMeals?.[dateKey]?.[mKey]);
    const nextVal = !currentlyPaused;

    const updatedPausedMeals = {
      ...pausedMeals,
      [dateKey]: {
        ...(pausedMeals?.[dateKey] || {}),
        [mKey]: nextVal
      }
    };
    setPausedMeals(updatedPausedMeals);

    try {
      await setDoc(doc(db, 'pg_owners', adminId), {
        pausedMeals: updatedPausedMeals
      }, { merge: true });

      await setDoc(doc(db, 'mess_headcount', `${adminId}_${dateKey}`), {
        pausedMeals: updatedPausedMeals[dateKey]
      }, { merge: true });

      showToast?.(`${targetMealKey.toUpperCase()} is now ${nextVal ? 'PAUSED ⏸️' : 'RESUMED ▶️'}!`, nextVal ? 'warning' : 'success');
    } catch (err) {
      console.error('Failed to toggle meal pause:', err);
      showToast?.('Error updating meal pause state', 'error');
    }
  };

  const [showWeeklyMenuEdit, setShowWeeklyMenuEdit] = useState(false);
  const [editWeeklyMenuDay, setEditWeeklyMenuDay] = useState('');
  const [editWeeklyMenuMeal, setEditWeeklyMenuMeal] = useState('');
  const [editWeeklyMenuItems, setEditWeeklyMenuItems] = useState([]); // [{ id, name, image }]
  const [cookCustomItemInput, setCookCustomItemInput] = useState('');
  const [cookPresetSearch, setCookPresetSearch] = useState('');
  const [cookPresetCategory, setCookPresetCategory] = useState('All');
  const [activeCookPhotoIndex, setActiveCookPhotoIndex] = useState(null);
  const [showCookItemPhotoPicker, setShowCookItemPhotoPicker] = useState(false);
  const cookPhotoInputRef = useRef(null);
  const [isProcessingCookPhoto, setIsProcessingCookPhoto] = useState(false);

  // Menu Edit History & Last Editor state
  const [lastMenuEdit, setLastMenuEdit] = useState(null);
  const [showMenuHistoryModal, setShowMenuHistoryModal] = useState(false);
  const [menuHistoryList, setMenuHistoryList] = useState([]);
  const [loadingMenuHistory, setLoadingMenuHistory] = useState(false);

  const fetchCookMenuHistory = async () => {
    const ownerUid = user?.ownerUid;
    if (!ownerUid) return;
    setLoadingMenuHistory(true);
    try {
      const qHistory = query(
        collection(db, 'pg_owners', ownerUid, 'food_menu_history'),
        orderBy('editedAt', 'desc'),
        limit(50)
      );
      const snap = await getDocs(qHistory);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMenuHistoryList(list);
    } catch (err) {
      console.warn('Ordered history fetch failed, falling back to client-side sort:', err);
      try {
        const snap = await getDocs(collection(db, 'pg_owners', ownerUid, 'food_menu_history'));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => new Date(b.editedAt || 0) - new Date(a.editedAt || 0));
        setMenuHistoryList(list);
      } catch (e2) {
        console.error('Fallback history fetch failed:', e2);
      }
    } finally {
      setLoadingMenuHistory(false);
    }
  };

  // Open cook meal editor modal with parsed items
  const openCookEditModal = (day, meal) => {
    setEditWeeklyMenuDay(day);
    setEditWeeklyMenuMeal(meal);
    const raw = weeklyFoodMenu?.[day]?.[meal] || '';
    const itemNames = raw.split(/[,;]/).map(s => s.trim()).filter(Boolean);
    const currentImages = foodItemImages?.[day]?.[meal] || {};
    const parsed = itemNames.map(name => ({
      id: Math.random().toString(36).substring(2, 9),
      name,
      image: currentImages[name] || getDishPresetImage(name) || null
    }));
    setEditWeeklyMenuItems(parsed);
    setCookCustomItemInput('');
    setCookPresetSearch('');
    setCookPresetCategory('All');
    setActiveCookPhotoIndex(null);
    setShowCookItemPhotoPicker(false);
    setShowWeeklyMenuEdit(true);
  };

  const handleCookPhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || activeCookPhotoIndex === null) return;
    setIsProcessingCookPhoto(true);
    try {
      const compressed = await compressImage(file, 750);
      setEditWeeklyMenuItems(prev => prev.map((item, idx) => 
        idx === activeCookPhotoIndex ? { ...item, image: compressed } : item
      ));
      setShowCookItemPhotoPicker(false);
    } catch (err) {
      console.error('Cook photo processing error:', err);
    } finally {
      setIsProcessingCookPhoto(false);
      if (cookPhotoInputRef.current) cookPhotoInputRef.current.value = '';
    }
  };

  const handleCookSaveMenu = async () => {
    const namesStr = editWeeklyMenuItems.map(i => i.name.trim()).filter(Boolean).join(', ');
    const imagesMap = {};
    editWeeklyMenuItems.forEach(i => {
      const cleanName = i.name.trim();
      if (cleanName && i.image) {
        imagesMap[cleanName] = i.image;
      }
    });

    const newMenu = {
      ...weeklyFoodMenu,
      [editWeeklyMenuDay]: {
        ...(weeklyFoodMenu[editWeeklyMenuDay] || {}),
        [editWeeklyMenuMeal]: namesStr
      }
    };
    const newItemImages = {
      ...foodItemImages,
      [editWeeklyMenuDay]: {
        ...(foodItemImages[editWeeklyMenuDay] || {}),
        [editWeeklyMenuMeal]: imagesMap
      }
    };

    setWeeklyFoodMenu(newMenu);
    setFoodItemImages(newItemImages);
    setShowWeeklyMenuEdit(false);

    if (user?.ownerUid) {
      try {
        const editorName = user?.name || staffName || 'Cook';
        const roleName = staffRole || 'Cook';
        const editTimeIso = new Date().toISOString();
        const editRecord = {
          editedBy: editorName,
          editorRole: roleName,
          editorUid: user?.uid || 'cook',
          editedAt: editTimeIso,
          day: editWeeklyMenuDay,
          meal: editWeeklyMenuMeal,
          dishesSummary: namesStr || 'Cleared',
          itemsCount: editWeeklyMenuItems.length,
          hasPhotos: Object.keys(imagesMap).length > 0
        };

        setLastMenuEdit(editRecord);

        await setDoc(doc(db, 'pg_owners', user.ownerUid), { 
          foodMenu: newMenu,
          foodItemImages: newItemImages,
          lastMenuEdit: editRecord
        }, { merge: true });

        // Save into food_menu_history audit subcollection
        try {
          await addDoc(collection(db, 'pg_owners', user.ownerUid, 'food_menu_history'), editRecord);
        } catch (hErr) {
          console.warn('Cook menu history add error:', hErr);
        }

        // Notify all active students of this PG
        if (students && students.length > 0) {
          students.forEach(st => {
            addDoc(collection(db, 'users', st.id, 'notifications'), {
              title: '🍽️ Food Menu Updated',
              desc: `${editWeeklyMenuDay} ${editWeeklyMenuMeal} was updated by ${roleName} (${editorName}): ${namesStr || 'Updated dishes'}`,
              type: 'food_menu',
              action: 'FOOD_TAB',
              unread: true,
              createdAt: editTimeIso
            }).catch(e => console.warn('Student menu notif error:', e));
          });
        }

        // Notify PG Admin
        addDoc(collection(db, 'users', user.ownerUid, 'notifications'), {
          title: '👨‍🍳 Cook Updated Menu',
          desc: `${editorName} (${roleName}) updated ${editWeeklyMenuDay} ${editWeeklyMenuMeal}: ${namesStr || 'Updated dishes'}`,
          type: 'food_menu',
          action: 'MESS_HEADCOUNT',
          unread: true,
          createdAt: editTimeIso
        }).catch(e => console.warn('Admin menu notif error:', e));

      } catch (e) {
        console.error('Failed to update menu', e);
      }
    }
  };
  const [selectedFoodMenuDate, setSelectedFoodMenuDate] = useState(new Date().toISOString().split('T')[0]);
  const [cookMenuTab, setCookMenuTab] = useState('date'); // date | weekly
  
  const [showBcast,setShowBcast]= useState(false);
  const [bTarget, setBTarget]   = useState('All');
  const [bStudentId, setBStudentId] = useState('');
  const [bMsg,setBMsg]          = useState('Fresh hot meal is ready! Please head to the mess hall. 🍽️');
  const [bMeal,setBMeal]        = useState('Breakfast');

  // Interactive Modals & Transport States
  const [showParcelModal, setShowParcelModal] = useState(false);
  const [parcelItemName, setParcelItemName] = useState('');
  const [parcelStudent, setParcelStudent] = useState('');
  const [parcelRoom, setParcelRoom] = useState('');
  const [parcelCarrier, setParcelCarrier] = useState('Amazon');
  const [parcelDate, setParcelDate] = useState(new Date().toISOString().split('T')[0]);
  const [parcels, setParcels] = usePersistentState('febebo_parcels', []);
  const [showRefillModal, setShowRefillModal] = useState(false);
  const [showMoveOutModal, setShowMoveOutModal] = useState(false);
  const [showFuelModal, setShowFuelModal] = useState(false);
  
  const [moRoom, setMoRoom] = useState('');
  const [moTenant, setMoTenant] = useState('');
  const [moItems, setMoItems] = useState([
    { id: 1, name: 'Bed & Frame', status: 'Intact', fine: 0 },
    { id: 2, name: 'Mattress', status: 'Intact', fine: 0 },
    { id: 3, name: 'Bedsheet & Pillow', status: 'Intact', fine: 0 },
    { id: 4, name: 'Wardrobe / Almirah', status: 'Intact', fine: 0 },
    { id: 5, name: 'Study Chair & Table', status: 'Intact', fine: 0 },
    { id: 6, name: 'Kettle / Electricals', status: 'Intact', fine: 0 },
  ]);
  const [moNotes, setMoNotes] = useState('');
  
  const [fuelLiters, setFuelLiters] = useState('');
  const [fuelAmount, setFuelAmount] = useState('');
  const [fuelPump, setFuelPump] = useState('');
  
  const [passengers, setPassengers] = useState([
    { id: 1, name: 'Arjun Mehta', room: '102', time: '08:10 AM', phone: '+91 9415227843', status: 'Boarded' },
    { id: 2, name: 'Ravi Shankar', room: '103', time: '08:15 AM', phone: '+91 9839221456', status: 'Waiting' },
    { id: 3, name: 'Priya Sharma', room: '205', time: '08:20 AM', phone: '+91 9977881234', status: 'Waiting' },
    { id: 4, name: 'Deepak Verma', room: '301', time: '08:25 AM', phone: '+91 9412078800', status: 'Absent' },
    { id: 5, name: 'Sneha Kapoor', room: '304', time: '08:30 AM', phone: '+91 9814567890', status: 'Boarded' },
    { id: 6, name: 'Rajeev Kumar', room: '105', time: '08:35 AM', phone: '+91 9988776655', status: 'Waiting' },
  ]);

  // Cleaner state
  const [cleaning, setCleaning] = usePersistentState('febebo_cleaning', []);
  const [cleanerTimeFilter, setCleanerTimeFilter] = useState('Daily'); // Daily | Weekly | Monthly
  const [cleanerDate, setCleanerDate] = useState(new Date().toISOString().split('T')[0]);
  const [cleanerSlotFilter, setCleanerSlotFilter] = useState('all'); // all | active | upcoming | completed
  const [cleanerTypeFilter, setCleanerTypeFilter] = useState('All'); // All | Full Room Clean | Dusting & Mop | Bathroom Sanitise | Mopping | Basic Cleaning

  // Maintenance
  const [tickets,setTickets]    = usePersistentState('febebo_tickets', []);

  // HR state
  const [candidates, setCandidates] = useState([]);
  const [enquiries, setEnquiries]   = useState([]);
  const [hrTab, setHrTab]           = useState('hiring'); // hiring | enquiries
  
  // Manager dashboard state
  const [totalStaff, setTotalStaff] = useState(0);
  const [allStaff, setAllStaff] = useState([]);
  const [allAttendance, setAllAttendance] = useState([]);
  const [allLeaves, setAllLeaves] = useState([]);
  const [staffOnDuty, setStaffOnDuty] = useState(0);

  // Manager – Add Tenant state
  const [mgr_addTenantStep, setMgr_addTenantStep]     = useState(1);
  const [mgr_addTenantLoading, setMgr_addTenantLoading] = useState(false);
  const [mgr_addTenantSuccess, setMgr_addTenantSuccess] = useState(false);
  const [mgr_addTenantForm, setMgr_addTenantForm]     = useState({
    name:'', phone:'', email:'', password:'',
    selectedRoomId:'', selectedBed:'',
    rent:'', securityDeposit:'',
    paymentMode:'Token Only', amountPaid:'', paymentMethod:'Cash', paymentScreenshot:null,
    serviceType:'all_services',
  });
  const [mgr_rooms, setMgr_rooms] = useState([]);
  const [mgr_roomsFetched, setMgr_roomsFetched] = useState(false);
  const [mgr_tenants, setMgr_tenants] = useState([]);
  const [mgr_loadingRooms, setMgr_loadingRooms] = useState(false);

  // Manager – Enquiry view state
  const [mgr_enqFilter, setMgr_enqFilter] = useState('All');
  const [mgr_enqViewMode, setMgr_enqViewMode] = useState('leads'); // 'leads'|'applications'
  const [mgr_applications, setMgr_applications] = useState([]);
  const [mgr_serviceModal, setMgr_serviceModal] = useState(false); // show service type picker before add tenant

  useEffect(() => {
    if (view === 'add_tenant' && user?.ownerUid && !mgr_roomsFetched && !mgr_loadingRooms) {
      setMgr_loadingRooms(true);
      getDocs(query(collection(db, 'rooms'), where('adminId','==',user.ownerUid))).then(snap => {
        setMgr_rooms(snap.docs.map(d=>({id:d.id,...d.data()})));
        setMgr_loadingRooms(false);
        setMgr_roomsFetched(true);
      }).catch(err => {
        console.error(err);
        setMgr_loadingRooms(false);
        setMgr_roomsFetched(true);
      });
      getDocs(query(collection(db, 'tenants'), where('adminId','==',user.ownerUid))).then(snap => {
        setMgr_tenants(snap.docs.map(d=>({id:d.id,...d.data()})));
      });
    }
  }, [view, user?.ownerUid, mgr_roomsFetched, mgr_loadingRooms]);


  // Helper / Plumber / Electrician / Carpenter / Sales / Manager state
  const [selectedAttMonth, setSelectedAttMonth] = useState(null);
  const [tasks, setTasks]               = useState([]);

  // ── 🔗 CONNECTION 1: Real-time Tasks from Admin ──────────────────────────
  useEffect(() => {
    if (!(user?.id || user?.uid) || !user?.ownerUid) return;
    const q = query(
      collection(db, 'staff_tasks'),
      where('staffId', '==', (user.id || (user?.uid || user?.id))),
      where('adminId', '==', user.ownerUid)
    );
    const unsub = onSnapshot(q, (snap) => {
      let firestoreTasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      firestoreTasks.sort((a, b) => new Date(b.assignedDate || 0) - new Date(a.assignedDate || 0));
      if (firestoreTasks.length > 0) {
        setTasks(firestoreTasks);
      }
    });
    return () => unsub();
  }, [(user?.id || user?.uid), user?.ownerUid]);

  // ── 🔗 CONNECTION 2: Real-time Visitors from Admin ──────────────────────────
  useEffect(() => {
    if (!user?.ownerUid || staffRole !== 'Security Guard') return;
    const q = query(
      collection(db, 'visitors'),
      where('adminId', '==', user.ownerUid)
    );
    const unsub = onSnapshot(q, (snap) => {
      const fbVisitors = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
      fbVisitors.sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
      setVisitorLogs(fbVisitors);
    });
    return () => unsub();
  }, [user?.ownerUid, staffRole]);

  // ── 👨‍🍳 CONNECTION: Cook — Real-time Student List (Tenants + Meal Status) ─────
  useEffect(() => {
    if (!user?.ownerUid) return;
    // All roles need student list for cook dashboard (in case role is Cook)
    // We use onSnapshot so list stays live as tenants are added/removed
    const adminId = user.ownerUid;
    const todayStr = new Date().toISOString().split('T')[0];

    let cachedTenants = [];
    let cachedMeals = [];
    let cachedVacations = [];

    const rebuild = () => {
      const currentDateStr = workDate || todayStr;
      const list = cachedTenants.map(t => {
        const mealLog = cachedMeals.find(m => m.tenantId === t.id);
        const isVacB = isStudentOnVacation(cachedVacations, t.id, currentDateStr, 'breakfast') || isMealPausedOnDate(t.foodVacation, currentDateStr, 'breakfast');
        const isVacL = isStudentOnVacation(cachedVacations, t.id, currentDateStr, 'lunch') || isMealPausedOnDate(t.foodVacation, currentDateStr, 'lunch');
        const isVacS = isStudentOnVacation(cachedVacations, t.id, currentDateStr, 'snacks') || isMealPausedOnDate(t.foodVacation, currentDateStr, 'snacks');
        const isVacD = isStudentOnVacation(cachedVacations, t.id, currentDateStr, 'dinner') || isMealPausedOnDate(t.foodVacation, currentDateStr, 'dinner');

        const studentVac = getStudentActiveVacation(cachedVacations, t.id, currentDateStr) || t.foodVacation || null;
        const isFoodIncluded = t.foodIncluded !== false;

        const resolveStatus = (isVac, val) => {
          if (!isFoodIncluded) return 'selfCooking';
          if (isVac) return 'onVacation';
          if (val === 'not_eating') return 'notEaten';
          if (val === 'eaten') return 'eaten';
          if (val === 'delivery') return 'delivery';
          if (val === 'pack') return 'pack';
          if (val === 'extra') return 'extra';
          return 'requested';
        };

        return {
          id: t.id,
          name: t.name || 'Tenant',
          room: t.roomNo || t.room || t.subscribedPG?.roomNo || 'N/A',
          bed: t.bedNo || t.bed || 'A',
          phone: t.phone || 'N/A',
          foodIncluded: isFoodIncluded,
          includedFoodPersons: t.includedFoodPersons || 1,
          foodVacation: studentVac,
          statusB: resolveStatus(isVacB, mealLog?.breakfast),
          statusL: resolveStatus(isVacL, mealLog?.lunch),
          statusS: resolveStatus(isVacS, mealLog?.snacks),
          statusD: resolveStatus(isVacD, mealLog?.dinner),
        };
      });
      setStudents(list);
    };

    // Real-time meal status for today
    const qMeal = query(collection(db, 'meal_status'), where('adminId', '==', adminId), where('date', '==', todayStr));
    const unsubMeal = onSnapshot(qMeal, snap => {
      cachedMeals = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      rebuild();
    });

    // Real-time food vacations listener
    const qVac = query(
      collection(db, 'food_vacations'),
      where('adminId', '==', adminId),
      where('status', 'in', ['active', 'shortened'])
    );
    const unsubVac = onSnapshot(qVac, snap => {
      cachedVacations = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setVacations(cachedVacations);
      rebuild();
    }, err => console.error('Vacation listener error in StaffApp rebuild:', err));

    // Real-time tenants (approved/current users of this PG)
    const qTenants = query(collection(db, 'tenants'), where('adminId', '==', adminId));
    const unsubTenants = onSnapshot(qTenants, async snap => {
      const raw = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const current = raw.filter(t => {
        const s = t.status;
        return s === 'Approved' || s === 'Current User' || !s;
      });
      // Enrich with users doc for room number and name
      const enriched = await Promise.all(current.map(async t => {
        try {
          const uid = t.tenantId || t.id;
          if (uid) {
            const uSnap = await getDoc(doc(db, 'users', uid));
            if (uSnap.exists()) {
              const u = uSnap.data();
              if (!t.name || t.name === 'Tenant') t.name = u.name || u.displayName || t.name;
              if (!t.roomNo) t.roomNo = u.subscribedPG?.roomNo || u.profileData?.roomDetails?.roomNumber || '';
              if (!t.room)   t.room   = t.roomNo;
              if (u.foodVacation) t.foodVacation = u.foodVacation;
            }
          }
        } catch (_) {}
        return t;
      }));
      cachedTenants = enriched;
      rebuild();
    });

    return () => { unsubMeal(); unsubTenants(); if (unsubVac) unsubVac(); };
  }, [user?.ownerUid, workDate]);

  // Transaction History Filters
  const [txnMonthFilter, setTxnMonthFilter] = useState('All Months');
  const [txnYearFilter, setTxnYearFilter] = useState('All Years');
  const [txnTypeFilter, setTxnTypeFilter] = useState('All Types');
  const [txnFlowFilter, setTxnFlowFilter] = useState('All');
  const [isAvailable, setIsAvailable]   = useState(true);
  const [plumbingJobs, setPlumbingJobs] = useState([]);
  const [electricalJobs, setElectricalJobs] = useState([]);
  const [carpenterJobs, setCarpenterJobs]   = useState([]);
  const [rooms]                             = useState([]);
  const [salesTab, setSalesTab]             = useState('leads'); // leads | rooms

  // Purchase
  const [demands,setDemands]    = useState([]);

  // Work History states
  const [historyYear, setHistoryYear] = useState(2026);
  const [historyMonth, setHistoryMonth] = useState(6); // July (0-indexed)
  const [selectedHistoryDate, setSelectedHistoryDate] = useState('2026-07-25');

  const HISTORY_DAYS = {
    '2026-07-01': { status: 'work', tasks: ['Cleaned Room 102 bathroom', 'Fixed water pressure in Room 103'] },
    '2026-07-02': { status: 'work', tasks: ['Kitchen cleanup', 'Repaired table lock in Room 204'] },
    '2026-07-03': { status: 'present', tasks: [] },
    '2026-07-04': { status: 'absent', tasks: [] },
    '2026-07-05': { status: 'work', tasks: ['Repaired door hinges in Room 301', 'Changed light bulb in corridor'] },
    '2026-07-06': { status: 'work', tasks: ['Kitchen assistant shift', 'Disposed waste bins'] },
    '2026-07-07': { status: 'work', tasks: ['Unclogged kitchen sink drain', 'Washed main entry staircase'] },
    '2026-07-08': { status: 'work', tasks: ['Replaced AC remote battery in Room 207'] },
    '2026-07-09': { status: 'work', tasks: ['Mopped lobby', 'Polished dining tables'] },
    '2026-07-10': { status: 'present', tasks: [] },
    '2026-07-11': { status: 'absent', tasks: [] },
    '2026-07-12': { status: 'work', tasks: ['Repaired ceiling fan switch in Room 105'] },
    '2026-07-13': { status: 'work', tasks: ['Washed terrace floor', 'Refilled water tank filters'] },
    '2026-07-14': { status: 'work', tasks: ['Fixed sparking socket in Room 302', 'Checked geyser heating'] },
    '2026-07-15': { status: 'work', tasks: ['Assisted vendor delivery', 'Restocked cleaning chemicals'] },
    '2026-07-16': { status: 'work', tasks: ['Mopped floor in Room 206', 'Polished door knobs'] },
    '2026-07-17': { status: 'present', tasks: [] },
    '2026-07-18': { status: 'absent', tasks: [] },
    '2026-07-19': { status: 'work', tasks: ['Unclogged bathroom pipe in Room 101'] },
    '2026-07-20': { status: 'work', tasks: ['Washed dining hall', 'Sorted garbage bags'] },
    '2026-07-21': { status: 'work', tasks: ['Fixed loose wiring in corridor', 'Fitted wall hooks in Room 304'] },
    '2026-07-22': { status: 'absent', tasks: [] },
    '2026-07-23': { status: 'work', tasks: ['Assisted in LPG cylinder placement', 'Washed courtyard'] },
    '2026-07-24': { status: 'present', tasks: [] },
    '2026-07-25': { status: 'work', tasks: ['Room 305: Geyser switch sparking / MCB tripping', 'Room 103: AC remote not pairing'] },
  };

  // My Profile page states — all seeded from real user data (profileData filled in onboarding)
  const pd = user?.profileData || {};
  const [profilePic, setProfilePic] = useState(localStorage.getItem('febebo_profile_pic') || null);
  const [editPersonal, setEditPersonal] = useState(false);
  const [phoneInput, setPhoneInput] = useState(user?.phone || pd.phone || '');
  const [emailInput, setEmailInput] = useState(pd.email || '');
  const [addressInput, setAddressInput] = useState(pd.permanentAddress || pd.correspondingAddress || '');
  // Emergency contact: built from relative details filled in onboarding form
  const emergencyDefault = pd.relativeName
    ? `${pd.relativeName}${pd.relativeRelation ? ' (' + pd.relativeRelation + ')' : ''}${pd.relativePhone ? ' · ' + pd.relativePhone : ''}`
    : '';
  const [emergencyInput, setEmergencyInput] = useState(emergencyDefault);

  const [editProfessional, setEditProfessional] = useState(false);
  const [salaryInput, setSalaryInput] = useState('');
  const [dojInput, setDojInput] = useState('');
  const [shiftInput, setShiftInput] = useState('');
  const [statusInput, setStatusInput] = useState('On Duty ✅');

  const [documentsList, setDocumentsList] = useState(() => {
    // Build documents list from real uploaded data stored in profileData
    const docs = [];
    if (pd.aadharNo || pd.aadharFrontUrl) {
      docs.push({
        name: 'Aadhar Card',
        desc: pd.aadharFrontUrl ? 'Uploaded — Pending Verification' : 'Not Uploaded',
        icon: 'badge',
        no: pd.aadharNo ? `****  ****  ${pd.aadharNo.slice(-4)}` : 'Not provided',
        status: pd.aadharFrontUrl ? 'Uploaded' : 'Unverified',
        fileUrl: pd.aadharFrontUrl || ''
      });
    } else {
      docs.push({ name: 'Aadhar Card', desc: 'Not uploaded yet', icon: 'badge', no: '—', status: 'Unverified', fileUrl: '' });
    }
    if (pd.panNo || pd.panCardUrl) {
      docs.push({
        name: 'PAN Card',
        desc: pd.panCardUrl ? 'Uploaded — Pending Verification' : 'Not Uploaded',
        icon: 'credit_card',
        no: pd.panNo || 'Not provided',
        status: pd.panCardUrl ? 'Uploaded' : 'Unverified',
        fileUrl: pd.panCardUrl || ''
      });
    } else {
      docs.push({ name: 'PAN Card', desc: 'Not uploaded yet', icon: 'credit_card', no: '—', status: 'Unverified', fileUrl: '' });
    }
    docs.push({ name: 'Employment Agreement', desc: 'Pending from Admin', icon: 'description', no: '—', status: 'Unverified', fileUrl: '' });
    return docs;
  });

  const [previewDoc, setPreviewDoc] = useState(null); // { name, fileUrl, status }

  // Vendor system states for Purchase Manager
  const [vendors, setVendors] = useState([]);
  const [activeVendorCategory, setActiveVendorCategory] = useState('Groceries');
  const [searchVendorQuery, setSearchVendorQuery] = useState('');
  const [selectedVendor, setSelectedVendor] = useState(null); 
  const [vendorLedger, setVendorLedger] = useState([]);
  const [showAddPurchaseModal, setShowAddPurchaseModal] = useState(false);
  const [showPayVendorModal, setShowPayVendorModal] = useState(false);
  const [purchaseItemsState, setPurchaseItemsState] = useState([]); 
  const [purchaseDate, setPurchaseDate] = useState('24-07-2026');
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('UPI'); 
  const [paySenderUpi, setPaySenderUpi] = useState('');
  const [pmTab, setPmTab] = useState('requisitions'); // requisitions | vendors

  // ── Cook Kitchen Vendor & Purchases System ─────────────────────────────
  const [cookVendorTab, setCookVendorTab] = useState('new'); // 'new' | 'history'
  const [adminVendors, setAdminVendors] = useState([]);
  const [cookPurchaseHistory, setCookPurchaseHistory] = useState([]);
  const [kitchenSearchQuery, setKitchenSearchQuery] = useState('');
  const [kitchenActiveCategory, setKitchenActiveCategory] = useState('All');
  const [selectedKitchenItems, setSelectedKitchenItems] = useState({}); // { [name]: { qty, unit, rate } }
  const [customKitchenItems, setCustomKitchenItems] = useState([]);
  const [showCustomKitchenItemModal, setShowCustomKitchenItemModal] = useState(false);
  const [newCustomKitchenName, setNewCustomKitchenName] = useState('');

  // Checkout Sheet State
  const [showCookCheckoutModal, setShowCookCheckoutModal] = useState(false);
  const [cookPurchaseDate, setCookPurchaseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [cookSelectedVendorId, setCookSelectedVendorId] = useState('');
  const [cookManualVendorName, setCookManualVendorName] = useState('');
  const [cookManualVendorPhone, setCookManualVendorPhone] = useState('');
  const [cookManualVendorUpi, setCookManualVendorUpi] = useState('');
  const [cookPaymentSource, setCookPaymentSource] = useState('petty_cash'); // 'petty_cash' | 'cash' | 'upi'
  const [cookPaidAmount, setCookPaidAmount] = useState('');
  const [cookPurchaseNote, setCookPurchaseNote] = useState('');
  const [isSubmittingCookPurchase, setIsSubmittingCookPurchase] = useState(false);

  // Live Firestore listener for Admin Vendors & Cook Purchases
  useEffect(() => {
    const adminUid = staffProfile?.ownerUid || user?.ownerUid;
    if (!adminUid) return;

    // Listen to registered vendors
    const qVendors = query(collection(db, 'vendors'), where('adminId', '==', adminUid));
    const unsubVendors = onSnapshot(qVendors, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAdminVendors(list);
      setVendors(list);
    }, (err) => console.warn('Vendors listen error:', err));

    // Listen to purchases made by cook
    const qPurchases = query(
      collection(db, 'vendor_transactions'),
      where('adminId', '==', adminUid),
      where('isCookPurchase', '==', true)
    );
    const unsubPurchases = onSnapshot(qPurchases, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a,b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
      setCookPurchaseHistory(list);
    }, (err) => console.warn('Cook purchases listen error:', err));

    return () => {
      unsubVendors();
      unsubPurchases();
    };
  }, [staffProfile?.ownerUid, user?.ownerUid]);

  const toggleKitchenItem = (itemName, defaultUnit = 'kg') => {
    setSelectedKitchenItems(prev => {
      if (prev[itemName]) {
        const next = { ...prev };
        delete next[itemName];
        return next;
      }
      return {
        ...prev,
        [itemName]: { qty: '1', unit: defaultUnit, rate: '' }
      };
    });
  };

  const updateKitchenItemField = (itemName, field, value) => {
    setSelectedKitchenItems(prev => {
      if (!prev[itemName]) return prev;
      return {
        ...prev,
        [itemName]: { ...prev[itemName], [field]: value }
      };
    });
  };

  const handleAddCustomKitchenItem = () => {
    const trimmed = newCustomKitchenName.trim();
    if (!trimmed) return;
    if (!customKitchenItems.includes(trimmed)) {
      setCustomKitchenItems(prev => [...prev, trimmed]);
    }
    toggleKitchenItem(trimmed, 'kg');
    setNewCustomKitchenName('');
    setShowCustomKitchenItemModal(false);
  };

  const validKitchenRows = Object.entries(selectedKitchenItems).filter(([, v]) => parseFloat(v.qty) > 0 && parseFloat(v.rate) > 0);
  const kitchenGrandTotal = validKitchenRows.reduce((sum, [, v]) => sum + calculateItemTotal(v.qty, v.unit, v.rate), 0);

  const openCookCheckout = () => {
    if (!validKitchenRows.length) {
      showToast('Please check at least one item and enter quantity & rate', 'error');
      return;
    }
    setCookPaidAmount(String(kitchenGrandTotal));
    if (adminVendors.length > 0 && !cookSelectedVendorId) {
      setCookSelectedVendorId(adminVendors[0].id);
    } else if (!adminVendors.length) {
      setCookSelectedVendorId('manual');
    }
    setCookPaymentSource('petty_cash');
    setShowCookCheckoutModal(true);
  };

  const handleConfirmCookPurchase = async () => {
    if (!validKitchenRows.length) {
      showToast('Please select at least one item with valid quantity and rate', 'error');
      return;
    }
    if (cookSelectedVendorId === 'manual' && !cookManualVendorName.trim()) {
      showToast('Please enter vendor / shop name', 'error');
      return;
    }

    const paidAmt = parseFloat(cookPaidAmount) || 0;
    if (cookPaymentSource === 'petty_cash' && paidAmt > availablePettyCash) {
      const confirmExceed = window.confirm(
        `Amount to pay (₹${paidAmt.toLocaleString('en-IN')}) exceeds your current available Petty Cash (₹${availablePettyCash.toLocaleString('en-IN')}).\n\nDo you want to proceed and record it?`
      );
      if (!confirmExceed) return;
    }

    setIsSubmittingCookPurchase(true);
    try {
      const adminUid = staffProfile?.ownerUid || user?.ownerUid;
      const targetPgId = activePgId || 'primary';
      const targetPgObj = assignedProperties.find(p => p.id === targetPgId);
      const targetPgName = targetPgObj?.name || 'Primary PG';

      let vendorId = cookSelectedVendorId;
      let vendorName = '';
      let vendorStore = '';
      let vendorUpi = '';

      if (cookSelectedVendorId === 'manual') {
        vendorName = cookManualVendorName.trim();
        vendorStore = cookManualVendorName.trim();
        vendorUpi = cookManualVendorUpi.trim();

        const newVRef = await addDoc(collection(db, 'vendors'), {
          adminId: adminUid,
          name: vendorName,
          store: vendorName,
          category: 'Groceries',
          phone: cookManualVendorPhone.trim() || '',
          upi: vendorUpi || '',
          amount: 0,
          addedBy: 'Cook',
          addedByStaffId: user.id || (user?.uid || 'cook'),
          createdAt: new Date().toISOString()
        });
        vendorId = newVRef.id;
      } else {
        const matched = adminVendors.find(v => v.id === cookSelectedVendorId);
        vendorName = matched?.name || 'Vendor';
        vendorStore = matched?.store || matched?.name || 'Store';
        vendorUpi = matched?.upi || '';
      }

      const formattedItems = validKitchenRows.map(([name, v]) => ({
        item: name,
        qty: String(v.qty),
        unit: v.unit || 'kg',
        rate: parseFloat(v.rate),
        price: calculateItemTotal(v.qty, v.unit, v.rate)
      }));

      const itemsSummary = formattedItems.map(it => `${it.item} (${it.qty}${it.unit})`).join(', ');

      // 1. Record in vendor_transactions
      const txnData = {
        adminId: adminUid,
        vendorId: vendorId,
        vendorName: vendorName,
        vendorStore: vendorStore,
        date: cookPurchaseDate || new Date().toISOString().split('T')[0],
        items: formattedItems,
        payInfo: {
          amtNow: paidAmt,
          method: cookPaymentSource === 'petty_cash' ? 'Petty Cash' : cookPaymentSource === 'upi' ? 'UPI' : 'Cash',
          toWhom: vendorName,
          senderUPI: cookPaymentSource === 'upi' ? staffUpiId : '',
          receiverUPI: vendorUpi
        },
        pgId: targetPgId,
        pgName: targetPgName,
        isCookPurchase: true,
        purchasedBy: 'cook',
        staffId: user.id || (user?.uid || 'cook'),
        staffName: staffName,
        paymentSource: cookPaymentSource,
        isPettyCashPaid: cookPaymentSource === 'petty_cash',
        note: cookPurchaseNote || '',
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'vendor_transactions'), txnData);

      // Automatically sync kitchen items into Kitchen Inventory
      await syncItemsToKitchenInventory(db, {
        adminId: adminUid,
        pgId: targetPgId,
        items: formattedItems,
        source: 'Cook Purchase',
        actorName: `${staffName} (Cook)`
      });

      // 2. If paid using Petty Cash, record in petty_cash_transactions
      if (cookPaymentSource === 'petty_cash' && paidAmt > 0) {
        await addDoc(collection(db, 'petty_cash_transactions'), {
          type: 'expense',
          adminId: adminUid,
          pgId: targetPgId,
          staffId: user.id || (user?.uid || 'cook'),
          staffName: staffName,
          amount: paidAmt,
          desc: `Kitchen: ${itemsSummary.substring(0, 90)}`,
          paymentMode: 'Petty Cash',
          paidTo: vendorName,
          isCookPurchase: true,
          date: cookPurchaseDate || new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString()
        });
      }

      // 3. Send Notification to Admin
      await addDoc(collection(db, 'notifications'), {
        adminId: adminUid,
        title: 'Cook Kitchen Purchase 👨‍🍳',
        desc: `${staffName} purchased kitchen supplies worth ₹${kitchenGrandTotal} (Paid: ₹${paidAmt} via ${cookPaymentSource === 'petty_cash' ? 'Petty Cash' : cookPaymentSource.toUpperCase()}) from ${vendorName}.`,
        type: 'Vendor',
        date: new Date().toISOString(),
        resolved: false,
        pgId: targetPgId
      });

      showToast('Kitchen purchase recorded and synced! 🛒', 'success');
      setSelectedKitchenItems({});
      setCookPurchaseNote('');
      setShowCookCheckoutModal(false);
      setCookVendorTab('history');
    } catch (err) {
      console.error('Error saving cook purchase:', err);
      showToast('Failed to save purchase: ' + err.message, 'error');
    } finally {
      setIsSubmittingCookPurchase(false);
    }
  };

  // Security
  const [visitors,setVisitors]  = useState([]);

  const [showVisitor,setShowVisitor]=useState(false);
  const [showParcel,setShowParcel]  =useState(false);
  const [vName,setVName]=useState(''); const [vPhone,setVPhone]=useState(''); const [vPurp,setVPurp]=useState('');
  const [pStu,setPStu]=useState('');   const [pRoom,setPRoom]=useState('');   const [pCarr,setPCarr]=useState('Amazon'); const [pTrk,setPTrk]=useState('');

  // Demand/Requisition (shared)
  const [showDemandList, setShowDemandList] = useState(false);
  const [showDemandForm, setShowDemandForm] = useState(false);
  const [dItem,setDItem]=useState(''); const [dQty,setDQty]=useState(''); const [dNote,setDNote]=useState('');
  const [myDemands,setMyDemands]=useState([{id:1,item:'Basmati Rice 25kg',qty:'2 Bags',date:'22 Jul',status:'Approved'}]);

  // Send Supplies Request system
  const todayStr = new Date().toISOString().split('T')[0];
  const [showItemRequestModal, setShowItemRequestModal] = useState(false);
  const [itemReqSentList, setItemReqSentList] = useState([]);
  const [itemReqDate, setItemReqDate] = useState(new Date().toISOString().split('T')[0]);
  const [itemReqSendTo, setItemReqSendTo] = useState('Purchase Manager');
  const [itemReqNote, setItemReqNote] = useState('');
  const [itemReqItems, setItemReqItems] = useState([]);
  const [itemReqCustomInput, setItemReqCustomInput] = useState('');
  const [itemReqCustomUnit, setItemReqCustomUnit] = useState('');
  const [itemReqAddingCustom, setItemReqAddingCustom] = useState(false);
  const [itemReqSearchQ, setItemReqSearchQ] = useState('');
  const [itemReqSentTab, setItemReqSentTab] = useState('new');

  
  // ── 🔗 CONNECTION: Real-time Supplies (staff_requisitions) ────────────────
  useEffect(() => {
    if (!(user?.id || user?.uid) || !user?.ownerUid) return;
    const q = query(
      collection(db, 'staff_requisitions'),
      where('staffId', '==', (user.id || (user?.uid || user?.id)))
    );
    const unsub = onSnapshot(q, (snap) => {
      const allItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Group by reqId
      const grouped = {};
      allItems.forEach(item => {
        const rId = item.reqId || item.id;
        if (!grouped[rId]) {
          grouped[rId] = {
            id: rId,
            items: [],
            sendTo: item.sendTo || 'Admin',
            date: item.date || new Date().toLocaleDateString(),
            status: 'Pending', // Default
            note: item.note || ''
          };
        }
        // If any item is Approved, maybe we show Approved
        if (item.status === 'Approved') {
           grouped[rId].status = 'Approved';
        } else if (item.status === 'Received') {
           grouped[rId].status = 'Received';
        }
        grouped[rId].items.push(item.qty ? `${item.item} — ${item.qty} ${item.unit || ''}` : item.item);
      });
      
      const reqArray = Object.values(grouped).sort((a,b) => b.id - a.id);
      setItemReqSentList(reqArray);
    });
    return () => unsub();
  }, [(user?.id || user?.uid), user?.ownerUid]);


  
  // ── 🔗 CONNECTION: Real-time Supplies (staff_requisitions) ────────────────
  useEffect(() => {
    if (!(user?.id || user?.uid) || !user?.ownerUid) return;
    const q = query(
      collection(db, 'staff_requisitions'),
      where('staffId', '==', (user.id || (user?.uid || user?.id)))
    );
    const unsub = onSnapshot(q, (snap) => {
      const allItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Group by reqId
      const grouped = {};
      allItems.forEach(item => {
        const rId = item.reqId || item.id;
        if (!grouped[rId]) {
          grouped[rId] = {
            id: rId,
            items: [],
            sendTo: item.sendTo || 'Admin',
            date: item.date || new Date().toLocaleDateString(),
            status: 'Pending', // Default
            note: item.note || ''
          };
        }
        // If any item is Approved, maybe we show Approved
        if (item.status === 'Approved') {
           grouped[rId].status = 'Approved';
        } else if (item.status === 'Received') {
           grouped[rId].status = 'Received';
        }
        grouped[rId].items.push(item.qty ? `${item.item} — ${item.qty} ${item.unit || ''}` : item.item);
      });
      
      const reqArray = Object.values(grouped).sort((a,b) => b.id - a.id);
      setItemReqSentList(reqArray);
    });
    return () => unsub();
  }, [(user?.id || user?.uid), user?.ownerUid]);


  // --- New Global States for 7-Feature Integration ---
  
  // 1. Leave Requests
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveFromDate, setLeaveFromDate] = useState('');
  const [leaveToDate, setLeaveToDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('Sick Leave');
  const [leaveRequests, setLeaveRequests] = useState([]);

  useEffect(() => {
    if (user && user.ownerUid) {
      const q = query(
        collection(db, 'leave_requests'),
        where('staffId', '==', (user.id || (user?.uid || user?.id))),
        where('adminId', '==', user.ownerUid)
      );
      const unsub = onSnapshot(q, (snap) => {
        const reqs = [];
        snap.forEach(doc => reqs.push({ id: doc.id, ...doc.data() }));
        reqs.sort((a, b) => new Date(b.from) - new Date(a.from));
        setLeaveRequests(reqs);
      });
      return () => unsub();
    }
  }, [user]);

  // 2. Gatekeeper / Visitor Log
  const [showGatekeeperModal, setShowGatekeeperModal] = useState(false);
  const [gkName, setGkName] = useState('');
  const [gkPhone, setGkPhone] = useState('');
  const [gkRoom, setGkRoom] = useState('');
  const [gkPurpose, setGkPurpose] = useState('');
  const [gkPhoto, setGkPhoto] = useState(null);
  const [gkIdType, setGkIdType] = useState('Aadhar');
  const [gkIdNumber, setGkIdNumber] = useState('');
  const [gkRelation, setGkRelation] = useState('');

  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [aiMeetings, setAiMeetings] = usePersistentState('febebo_ai_meetings', []);


  const [visitorLogs, setVisitorLogs] = useState([]);

  const handleApproveEntry = async (docId) => {
    try {
      await updateDoc(doc(db, 'visitors', docId), { status: 'Inside', approvedBy: staffName });
      showToast('Visitor entry approved', 'success');
    } catch(e) { showToast('Error approving', 'error'); }
  };
  const handleDenyEntry = async (docId) => {
    try {
      await updateDoc(doc(db, 'visitors', docId), { status: 'Denied', approvedBy: staffName });
      showToast('Visitor entry denied', 'error');
    } catch(e) { showToast('Error denying', 'error'); }
  };
  const handleApproveExit = async (docId) => {
    try {
      await updateDoc(doc(db, 'visitors', docId), { status: 'Exited', approvedBy: staffName, timeOut: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) });
      showToast('Visitor exit approved', 'success');
    } catch(e) { showToast('Error exiting', 'error'); }
  };

  const [isSendingItemReq, setIsSendingItemReq] = useState(false);

  const sendItemRequest = async () => {
    const selected = itemReqItems.filter(i => i.checked);
    if (selected.length === 0) { showToast('Please select at least one item.', 'warning'); return; }
    
    setIsSendingItemReq(true);
    const reqId = Date.now();
    const dateStr = new Date(itemReqDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    
    try {
      for (const item of selected) {
        await addDoc(collection(db, 'staff_requisitions'), {
          reqId: reqId,
          item: item.name,
          qty: (item.qty || '1') + ' ' + (item.unit || ''),
          staff: user?.name || 'Staff',
          staffId: (user?.id || user?.uid) || null,
          adminId: user?.ownerUid || null,
          sendTo: itemReqSendTo,
          date: dateStr,
          status: 'Pending Rate',
          note: itemReqNote.trim(),
          createdAt: new Date().toISOString()
        });
      }
      
      // If requested by Cook or contains kitchen supplies, sync to Kitchen Inventory
      if (staffRole === 'Cook' || isKitchenRelatedCategory('', selected)) {
        await syncItemsToKitchenInventory(db, {
          adminId: user?.ownerUid,
          pgId: activePgId || 'primary',
          items: selected,
          source: 'Cook Requisition',
          actorName: `${staffName} (${staffRole})`
        });
      }

      setShowItemRequestModal(false);
      showToast('Supplies request sent and synced with Kitchen Inventory!', 'success');
    } catch (e) {
      console.error(e);
      showToast('Failed to send request.', 'error');
    } finally {
      setIsSendingItemReq(false);
    }
  };

  // 3. Meter Reading (Synced from Admin Rooms & Tenants, Electricity Only)
  const [meterRooms, setMeterRooms] = useState([]);
  const [meterRoom, setMeterRoom] = useState('');
  const [meterElec, setMeterElec] = useState('');
  const [meterRate, setMeterRate] = useState(() => {
    const saved = localStorage.getItem('febebo_meter_rate');
    return saved ? Number(saved) : 8;
  });
  const [meterLastReading, setMeterLastReading] = useState(0);
  const [meterLastReadingDate, setMeterLastReadingDate] = useState(null);
  const [meterRoomTenants, setMeterRoomTenants] = useState([]);
  const [meterEditingTenantId, setMeterEditingTenantId] = useState(null);
  const [meterEditJoinVal, setMeterEditJoinVal] = useState('');
  const [isGeneratingMeterBill, setIsGeneratingMeterBill] = useState(false);
  const [recentMeterBills, setRecentMeterBills] = useState([]);
  const [loadingMeterData, setLoadingMeterData] = useState(false);
  const [allAdminMeters, setAllAdminMeters] = useState([]);
  const [allAdminTenants, setAllAdminTenants] = useState([]);

  // Fetch rooms, meters, tenants, and recent bills from Admin data when on Meter Reading screen
  useEffect(() => {
    if (view !== 'meter_reading') return;
    const adminUid = user?.ownerUid || user?.adminId || staffProfile?.ownerUid || staffProfile?.adminId;
    if (!adminUid) return;

    let isMounted = true;
    setLoadingMeterData(true);

    const fetchMeterSetup = async () => {
      try {
        const [roomsSnap, metersSnap, tenantsSnap, settingsSnap] = await Promise.all([
          getDocs(query(collection(db, 'rooms'), where('adminId', '==', adminUid))),
          getDocs(query(collection(db, 'meters'), where('adminId', '==', adminUid))),
          getDocs(query(collection(db, 'tenants'), where('adminId', '==', adminUid))),
          getDoc(doc(db, 'adminSettings', adminUid)).catch(() => null)
        ]);

        if (!isMounted) return;

        // Auto-fill rate from adminSettings if not already set locally
        if (settingsSnap && settingsSnap.exists() && settingsSnap.data().meterSettings?.rate) {
          const sRate = Number(settingsSnap.data().meterSettings.rate);
          if (!localStorage.getItem('febebo_meter_rate') && sRate > 0) {
            setMeterRate(sRate);
          }
        }

        const mList = metersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAllAdminMeters(mList);

        const tList = tenantsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAllAdminTenants(tList);

        // Build unique rooms list synced from Admin data
        const roomMap = new Map();
        roomsSnap.docs.forEach(d => {
          const r = d.data();
          const rNo = String(r.roomNo || r.roomName || '').trim();
          if (rNo) {
            roomMap.set(rNo.toLowerCase(), {
              id: d.id,
              roomNo: rNo,
              seater: r.seater || r.beds || 0,
              type: r.roomType || ''
            });
          }
        });

        // Also add rooms from existing meters
        mList.forEach(m => {
          const rNo = String(m.roomName || '').trim();
          if (rNo && !roomMap.has(rNo.toLowerCase())) {
            roomMap.set(rNo.toLowerCase(), {
              id: m.id,
              roomNo: rNo,
              seater: 0,
              type: ''
            });
          }
        });

        const sortedRooms = Array.from(roomMap.values()).sort((a, b) =>
          String(a.roomNo).localeCompare(String(b.roomNo), undefined, { numeric: true })
        );

        setMeterRooms(sortedRooms);

        if (sortedRooms.length > 0 && (!meterRoom || !roomMap.has(meterRoom.toLowerCase()))) {
          setMeterRoom(sortedRooms[0].roomNo);
        }

        // Fetch recent bills
        const billsSnap = await getDocs(query(collection(db, 'meter_bills'), where('adminId', '==', adminUid), limit(30)));
        const bills = billsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        setRecentMeterBills(bills);

      } catch (err) {
        console.error("fetchMeterSetup error:", err);
      } finally {
        if (isMounted) setLoadingMeterData(false);
      }
    };

    fetchMeterSetup();
    return () => { isMounted = false; };
  }, [view, user?.ownerUid, user?.adminId, staffProfile?.ownerUid]);

  // When selected room changes, update baseline reading and filter tenants
  useEffect(() => {
    if (!meterRoom) return;

    // Find meter for this room
    const matchingMeter = allAdminMeters.find(m =>
      String(m.roomName || '').trim().toLowerCase() === String(meterRoom).trim().toLowerCase()
    );

    const lastRd = matchingMeter ? Number(matchingMeter.lastReading || matchingMeter.setupReading || 0) : 0;
    setMeterLastReading(lastRd);
    setMeterLastReadingDate(matchingMeter?.lastReadingDate || null);

    // Filter active residents in this room
    const inactive = ['Moved Out', 'Rejected', 'Deleted', 'Archived'];
    const rKey = String(meterRoom).trim().toLowerCase();
    const inRoom = allAdminTenants.filter(t => {
      const tRoom = String(t.roomNo || t.room || '').trim().toLowerCase();
      return tRoom === rKey && !inactive.includes(t.status);
    }).map(t => ({
      id: t.id,
      tenantId: t.id,
      name: t.name || 'Tenant',
      bedNo: t.bedNo || t.bed || '',
      dateOfJoining: t.dateOfJoining || t.joiningDate || '',
      meterReadingAtJoin: Number(t.meterReadingAtJoin !== undefined ? t.meterReadingAtJoin : (t.meterReading !== undefined ? t.meterReading : lastRd)) || 0
    })).sort((a, b) => (Number(a.meterReadingAtJoin) || 0) - (Number(b.meterReadingAtJoin) || 0));

    setMeterRoomTenants(inRoom);
  }, [meterRoom, allAdminMeters, allAdminTenants]);

  // Rate change handler: autofills future calculations
  const handleRateChange = (newVal) => {
    setMeterRate(newVal);
    const val = Number(newVal);
    if (!isNaN(val) && val > 0) {
      localStorage.setItem('febebo_meter_rate', String(val));
    }
  };

  // Adjust tenant join reading inline
  const handleSaveTenantJoinReading = async (tenantId, newJoinVal) => {
    const val = Number(newJoinVal) || 0;
    setMeterRoomTenants(prev => prev.map(t => (t.id === tenantId || t.tenantId === tenantId) ? { ...t, meterReadingAtJoin: val } : t));
    setMeterEditingTenantId(null);
    try {
      await updateDoc(doc(db, 'tenants', tenantId), { meterReadingAtJoin: val, meterReading: val });
      showToast("Updated joining reading for tenant", "success");
    } catch (e) {
      console.warn("Could not persist tenant join reading:", e);
    }
  };

  // Live bill calculation variables
  const currMeterNum = Number(meterElec);
  const isValidMeterInput = !isNaN(currMeterNum) && currMeterNum > meterLastReading && meterElec !== '';
  const consumedMeterUnits = isValidMeterInput ? Math.round((currMeterNum - meterLastReading) * 100) / 100 : 0;
  const numMeterRate = Number(meterRate) || 8;
  const totalMeterBillAmount = isValidMeterInput ? Math.round(consumedMeterUnits * numMeterRate * 100) / 100 : 0;
  const calculatedTenantBills = (isValidMeterInput && meterRoomTenants.length > 0)
    ? calculateMeterBills(meterRoomTenants, meterLastReading, currMeterNum, numMeterRate)
    : [];

  // Submit meter reading & sync bill to admin & residents
  const handleGenerateMeterBill = async () => {
    if (!isValidMeterInput) {
      return showToast(`Current reading must be higher than previous reading (${meterLastReading} kWh)`, 'warning');
    }
    if (meterRoomTenants.length === 0) {
      return showToast(`No active tenants found in Room ${meterRoom}.`, 'warning');
    }

    const adminUid = user?.ownerUid || user?.adminId || staffProfile?.ownerUid || staffProfile?.adminId;
    if (!adminUid) return showToast('Admin account not found.', 'error');

    setIsGeneratingMeterBill(true);
    try {
      const now = new Date();
      const readingDate = now.toISOString();
      const billMonth = now.toLocaleString('default', { month: 'long', year: 'numeric' });
      const currentPg = activePgId || user?.pgId || 'primary';

      // 1. Update or create meter document in meters collection
      let meterDocId = '';
      const existingMeter = allAdminMeters.find(m =>
        String(m.roomName || '').trim().toLowerCase() === String(meterRoom).trim().toLowerCase()
      );

      if (existingMeter?.id) {
        meterDocId = existingMeter.id;
        await updateDoc(doc(db, 'meters', existingMeter.id), {
          lastReading: currMeterNum,
          lastReadingDate: readingDate,
          ratePerUnit: numMeterRate,
          updatedBy: staffProfile?.name || user?.name || 'Staff'
        });
      } else {
        const mRef = await addDoc(collection(db, 'meters'), {
          adminId: adminUid,
          pgId: currentPg,
          roomName: meterRoom,
          lastReading: currMeterNum,
          setupReading: meterLastReading,
          lastReadingDate: readingDate,
          ratePerUnit: numMeterRate,
          dateAdded: readingDate.split('T')[0],
          createdBy: staffProfile?.name || user?.name || 'Staff'
        });
        meterDocId = mRef.id;
      }

      // 2. Add bills to meter_bills for each tenant
      const newBills = [];
      for (const b of calculatedTenantBills) {
        const bDoc = {
          adminId: adminUid,
          pgId: currentPg,
          tenantId: b.id || b.tenantId,
          tenantName: b.name,
          meterId: meterDocId,
          roomName: meterRoom,
          meterReadingAtJoin: b.meterReadingAtJoin,
          meterReadingAtBillStart: meterLastReading,
          meterReadingAtBillEnd: currMeterNum,
          consumedUnits: b.consumedUnits,
          totalAmount: b.totalAmount,
          ratePerUnit: numMeterRate,
          billMonth,
          date: readingDate,
          status: 'Unpaid',
          generatedBy: staffProfile?.name || user?.name || 'Staff'
        };

        const bRef = await addDoc(collection(db, 'meter_bills'), bDoc);
        newBills.push({ id: bRef.id, ...bDoc });

        // Resident notification
        await addDoc(collection(db, 'notifications'), {
          adminId: adminUid,
          pgId: currentPg,
          userId: b.id || b.tenantId,
          title: 'New Electricity Bill',
          message: `Your electricity bill for ${billMonth} is ₹${b.totalAmount.toFixed(2)} (${b.consumedUnits} kWh). Pay from My Account.`,
          createdAt: readingDate,
          isRead: false,
          type: 'meter_bill'
        }).catch(() => {});
      }

      // 3. Admin notification
      await addDoc(collection(db, 'notifications'), {
        adminId: adminUid,
        pgId: currentPg,
        title: 'Electricity Bill Generated',
        desc: `${staffProfile?.name || user?.name || 'Staff'} logged meter reading for Room ${meterRoom}: ${currMeterNum} kWh (total ${consumedMeterUnits} kWh, ₹${totalMeterBillAmount}) across ${calculatedTenantBills.length} tenants.`,
        createdAt: readingDate,
        isRead: false,
        type: 'meter_reading'
      }).catch(() => {});

      // Advance last reading in state and clear input
      setMeterLastReading(currMeterNum);
      setMeterLastReadingDate(readingDate);
      setMeterElec('');
      setRecentMeterBills(prev => [...newBills, ...prev]);

      setAllAdminMeters(prev => {
        const exists = prev.some(m => String(m.roomName).trim().toLowerCase() === String(meterRoom).trim().toLowerCase());
        if (exists) {
          return prev.map(m => String(m.roomName).trim().toLowerCase() === String(meterRoom).trim().toLowerCase()
            ? { ...m, lastReading: currMeterNum, lastReadingDate: readingDate, ratePerUnit: numMeterRate }
            : m
          );
        }
        return [...prev, { id: meterDocId, roomName: meterRoom, lastReading: currMeterNum, lastReadingDate: readingDate, ratePerUnit: numMeterRate }];
      });

      showToast(`⚡ Reading synced! ₹${totalMeterBillAmount} bill distributed between ${calculatedTenantBills.length} tenants!`, 'success');

    } catch (err) {
      console.error("handleGenerateMeterBill error:", err);
      showToast('Error syncing reading: ' + err.message, 'error');
    } finally {
      setIsGeneratingMeterBill(false);
    }
  };


  const RECIPIENTS = ['Purchase Manager', 'Admin', 'Manager', 'Store Incharge', 'Supervisor'];

  const openItemRequest = () => {
    const baseItems = ROLE_ITEM_LISTS[staffRole] || DEFAULT_ITEMS;
    setItemReqItems(baseItems.map(i => ({ ...i, checked: false, qty: '' })));
    setItemReqDate(new Date().toISOString().split('T')[0]);
    setItemReqSendTo('Purchase Manager');
    setItemReqNote('');
    setItemReqSearchQ('');
    setItemReqAddingCustom(false);
    setItemReqCustomInput('');
    setItemReqCustomUnit('');
    setShowItemRequestModal(true);
  };

  const addCustomItemToReq = () => {
    if (!itemReqCustomInput.trim()) return;
    const newCustom = {
      name: itemReqCustomInput.trim(),
      unit: itemReqCustomUnit.trim() || 'unit',
      cat: 'Custom',
      checked: true,
      qty: '',
      custom: true
    };
    setItemReqItems(prev => [...prev, newCustom]);
    setItemReqCustomInput('');
    setItemReqCustomUnit('');
    setItemReqAddingCustom(false);
  };

  // Salary Pay Slip Details

  const [selectedPaySlip, setSelectedPaySlip] = useState(null);
  const [showPaySlipModal, setShowPaySlipModal] = useState(false);

  // Inventory & Petty Cash Funds
  const [pettyCashLogs, setPettyCashLogs] = useState([]);
  const [availablePettyCash, setAvailablePettyCash] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    const unsub = onSnapshot(query(collection(db, 'petty_cash_transactions'), where('staffId', '==', user.id)), snap => {
      const txs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      txs.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
      
      const allocs = txs.filter(t => t.type === 'allocation').reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const exps = txs.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount || 0), 0);
      setAvailablePettyCash(allocs - exps);

      setPettyCashLogs(txs.map(t => ({
        id: t.id,
        type: t.type === 'allocation' ? 'credit' : 'expense',
        title: t.desc || (t.type === 'allocation' ? 'Petty Cash Allocated' : 'Expense'),
        amount: t.amount,
        party: t.paidTo || (t.type === 'allocation' ? 'Admin' : 'Local Vendor'),
        date: t.date ? new Date(t.date).toLocaleDateString() : 'Just now'
      })));
    });
    return () => unsub();
  }, [user]);
  const [assignedAssets, setAssignedAssets] = useState([
    {id:1, name:'Commercial Gas Cylinders', qty:'2 Units', cond:'Good', serial:'LPG-8891'},
    {id:2, name:'Mess Kitchen Key Set', qty:'1 Set', cond:'In Use', serial:'KEY-MESS-01'},
    {id:3, name:'Stainless Steel Food Warmer', qty:'1 Unit', cond:'Good', serial:'WRM-2024'}
  ]);
  const staffUpiId = `${firstName.toLowerCase()}.staff@febebo.upi`;

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showAddFundModal, setShowAddFundModal] = useState(false);
  const [expTitle, setExpTitle] = useState('');
  const [expAmt, setExpAmt] = useState('');
  const [expMode, setExpMode] = useState('Cash');
  const [expPaidTo, setExpPaidTo] = useState('');
  const [expSenderUpi, setExpSenderUpi] = useState(staffUpiId);
  const [expReceiverUpi, setExpReceiverUpi] = useState('');
  const [isSavingExp, setIsSavingExp] = useState(false);

  const [fundSrc, setFundSrc] = useState('Admin');
  const [fundTitle, setFundTitle] = useState('');
  const [fundAmt, setFundAmt] = useState('');
  const [fundMode, setFundMode] = useState('UPI');
  const [fundPayerName, setFundPayerName] = useState('Admin Office');
  const [fundSenderUpi, setFundSenderUpi] = useState('admin.office@febebo.upi');
  const [fundReceiverUpi, setFundReceiverUpi] = useState(staffUpiId);

  // Chat - Individual WhatsApp style
  const [contacts, setContacts] = useState(INIT_CONTACTS);
  const [activeContact, setActiveContact] = useState(null); // null = list view, object = chat view
  const [chatHist, setChatHist] = useState(INIT_MESSAGES);
  const [chatInput, setChatInput] = useState('');
  const [chatSearch, setChatSearch] = useState('');
  const [chatFilterTab, setChatFilterTab] = useState('all');
  const chatEndRef = useRef(null);

  useEffect(() => { 
    if (view === 'chat' && activeContact) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHist, view, activeContact]);

  // ─── DEDICATED REALTIME CONTACTS SYNCHRONIZATION ───
  useEffect(() => {
    const currentAdminId = user?.ownerUid || user?.adminId || staffProfile?.ownerUid || staffProfile?.adminId || 'primary';
    const currentMyId = String(user?.id || user?.uid || staffProfile?.id || staffProfile?.uid || 'staff');

    const adminContact = {
      id: currentAdminId,
      name: 'Manager / Admin',
      role: 'Property Admin',
      phone: '',
      isPinned: true,
      reminder: null,
      lastMsg: 'Send a message',
      time: '',
      type: 'admin'
    };

    let tenantContacts = [];
    let staffContacts = [];

    const syncAllContacts = () => {
      const map = new Map();
      map.set(adminContact.id, adminContact);

      tenantContacts.forEach(t => {
        if (t.id && t.id !== currentMyId) map.set(t.id, t);
      });

      staffContacts.forEach(s => {
        if (s.id && s.id !== currentMyId) map.set(s.id, s);
      });

      // Keep starter contacts if no external contacts loaded yet
      if (map.size <= 1) {
        INIT_CONTACTS.forEach(ic => {
          if (!map.has(ic.id)) map.set(ic.id, ic);
        });
      }

      const merged = Array.from(map.values());
      setContacts(prev => {
        return merged.map(m => {
          const old = prev.find(p => p.id === m.id);
          if (old) {
            return {
              ...m,
              lastMsg: old.lastMsg || m.lastMsg,
              time: old.time || m.time,
              reminder: old.reminder !== undefined ? old.reminder : m.reminder,
              isPinned: old.isPinned !== undefined ? old.isPinned : m.isPinned
            };
          }
          return m;
        });
      });
    };

    syncAllContacts();

    if (!currentAdminId) return;

    // 1. Sync Tenants / Students
    const qTenants = query(collection(db, 'tenants'), where('adminId', '==', currentAdminId));
    const unsubTenants = onSnapshot(qTenants, (snap) => {
      tenantContacts = snap.docs
        .map(d => {
          const data = d.data();
          const tid = data.tenantId || d.id;
          return {
            id: tid,
            name: data.name || data.tenantName || 'Student',
            role: `Student · Room ${data.roomNo || data.room || 'N/A'}`,
            phone: data.phone || data.tenantPhone || '',
            room: data.roomNo || data.room || '',
            time: '',
            lastMsg: 'Send a message',
            type: 'student',
            isPinned: false
          };
        })
        .filter(t => t.id !== currentMyId);
      syncAllContacts();
    }, (err) => console.warn('Tenants sync warning:', err));

    // 2. Sync Staff Members
    const qStaff = query(collection(db, 'staff_tokens'), where('ownerUid', '==', currentAdminId));
    const unsubStaff = onSnapshot(qStaff, (snap) => {
      staffContacts = snap.docs
        .map(d => {
          const data = d.data();
          const sid = d.id;
          return {
            id: sid,
            name: data.name || `Staff (${data.role || 'Member'})`,
            role: `Staff · ${data.role || 'Colleague'}`,
            phone: data.phone || '',
            time: '',
            lastMsg: 'Send a message',
            type: 'staff',
            isPinned: false
          };
        })
        .filter(s => s.id !== currentMyId);
      syncAllContacts();
    }, (err) => console.warn('Staff sync warning:', err));

    // 3. Sync Recent Chats summary for last message and timestamp
    const qChats = query(collection(db, 'chats'), where('participants', 'array-contains', currentMyId));
    const unsubChats = onSnapshot(qChats, (snap) => {
      if (!snap.empty) {
        const chatMap = {};
        snap.forEach(docSnap => {
          const cData = docSnap.data();
          const otherParticipant = (cData.participants || []).find(p => p !== currentMyId);
          if (otherParticipant) {
            chatMap[otherParticipant] = {
              lastMsg: cData.lastMessage || '',
              time: cData.lastMessageTime ? new Date(cData.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
            };
          }
        });
        setContacts(prev => prev.map(c => {
          if (chatMap[c.id]) {
            return {
              ...c,
              lastMsg: chatMap[c.id].lastMsg || c.lastMsg,
              time: chatMap[c.id].time || c.time
            };
          }
          return c;
        }));
      }
    }, (err) => console.warn('Chats list listener warning:', err));

    return () => {
      unsubTenants();
      unsubStaff();
      unsubChats();
    };
  }, [user?.ownerUid, user?.adminId, (user?.id || user?.uid), staffProfile?.ownerUid]);

  // ─── REALTIME MESSAGE LISTENER FOR ACTIVE CHAT ───
  useEffect(() => {
    const currentMyId = String(user?.id || user?.uid || staffProfile?.id || staffProfile?.uid || 'staff');
    if (!activeContact?.id || !currentMyId) return;

    const chatId = [currentMyId, String(activeContact.id)].sort().join('_');
    const qChat = query(collection(db, 'chats', chatId, 'messages'), orderBy('timestamp', 'asc'));

    const unsub = onSnapshot(qChat, (snap) => {
      const msgs = snap.docs.map(docSnap => {
        const d = docSnap.data({ serverTimestampBehavior: 'estimate' });
        const ts = d.timestamp ? (d.timestamp.toMillis ? d.timestamp.toMillis() : (typeof d.timestamp === 'string' ? new Date(d.timestamp).getTime() : Date.now())) : Date.now();
        return {
          id: docSnap.id,
          text: d.text,
          rawTs: ts,
          time: d.time || new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          me: String(d.senderId) === currentMyId
        };
      });
      msgs.sort((a, b) => a.rawTs - b.rawTs);
      setChatHist(prev => ({ ...prev, [activeContact.id]: msgs }));

      if (msgs.length > 0) {
        const last = msgs[msgs.length - 1];
        setContacts(prev => prev.map(c => c.id === activeContact.id ? { ...c, lastMsg: last.text, time: last.time } : c));
      }
    }, (err) => {
      console.warn("Active chat message sync error:", err);
    });

    return () => unsub();
  }, [activeContact?.id, (user?.id || user?.uid), staffProfile?.id]);

  // Chat Reminder Modal
  const [showReminder, setShowReminder] = useState(false);
  const [remDate, setRemDate] = useState(new Date().toISOString().split('T')[0]);
  const [remTime, setRemTime] = useState('17:00');
  const [remReason, setRemReason] = useState('');

  // Reports
  const [rptText,setRptText]  = useState('');
  const [rptHist,setRptHist]  = useState([{id:1,date:'22 Jul 2026',summary:'Completed mess clean-up & kitchen prep for dinner.',status:'Reviewed ✓'}]);

  // Requests
  const [reqType,setReqType]    = useState('Leave');
  const [reqReason,setReqReason]= useState('');
  const [reqAmt,setReqAmt]      = useState('');
  const [reqFrom,setReqFrom]    = useState('');
  const [reqTo,setReqTo]        = useState('');
  const [myReqs,setMyReqs]      = useState([]);
  const [myLeaves,setMyLeaves]  = useState([]);
  const [reqSuccessModal, setReqSuccessModal] = useState(false);
  const [bcastSuccessModal, setBcastSuccessModal] = useState(false);


  const [eatenData, setEatenData] = useState({});
  useEffect(() => {
    if (!user?.ownerUid) return;
    const docRef = doc(db, 'mess_headcount', `${user.ownerUid}_${new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0')}`);
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const hData = docSnap.data();
        setEatenData(hData);
        if (hData.pausedMeals) {
          const todayDateKey = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0');
          setPausedMeals(prev => ({
            ...prev,
            [todayDateKey]: hData.pausedMeals
          }));
        }
      }
    });
    return () => unsub();
  }, [user]);

  // ─── FIREBASE REALTIME SYNC (Ecosystem Connectivity) ───
  useEffect(() => {
    if (!user?.ownerUid || !fbAuthReady) {
      return; // ownerUid not yet available or Firebase Auth not ready
    }

    const adminId = user.ownerUid;

    // 1. Cleaning Tasks (Cleaners) - Linked to Student App cleaner_requests
    const qCleaning = query(collection(db, 'pg_owners', adminId, 'cleaner_requests'));
    const unsubCleaning = onSnapshot(qCleaning, (snap) => {
      const todayString = new Date().toISOString().split('T')[0];
      const parsedTasks = snap.docs.map(d => {
        const data = d.data();
        let currentStatus = data.status || 'Pending';
        
        // Reset logic: If not updated today, it means a new day has started. Reset to 'Pending'.
        const lastUpdatedDate = data.lastUpdated ? data.lastUpdated.split('T')[0] : '';
        if (lastUpdatedDate !== todayString) {
          currentStatus = 'Pending';
        }

        // Determine slotStatus based on time (Active/Upcoming)
        let slotStatus = 'upcoming';
        const nowHour = new Date().getHours();
        if (data.regularSlot) {
          const match = data.regularSlot.match(/(\d+):/);
          if (match) {
            let startHour = parseInt(match[1]);
            if ((data.regularSlot || '').includes('PM') && startHour !== 12) startHour += 12;
            if ((data.regularSlot || '').includes('AM') && startHour === 12) startHour = 0;
            if (nowHour >= startHour && nowHour < startHour + 2) slotStatus = 'active';
            else if (nowHour > startHour + 2) slotStatus = 'passed';
          }
        }

        return {
          id: d.id,
          room: data.roomNumber || 'N/A',
          student: data.studentName || 'Unknown',
          type: data.specialRequest ? 'Special Request' : 'Full Room',
          slot: data.regularSlot || (data.specialRequest ? `${data.specialRequest.date} ${data.specialRequest.time}` : 'Unscheduled'),
          slotStatus: slotStatus,
          done: currentStatus === 'Done',
          needsApproval: currentStatus === 'Needs Approval',
          dbStatus: currentStatus,
          phone: '',
          note: ''
        };
      });

      // Sort so earliest time slot is at the top
      parsedTasks.sort((a, b) => {
        const getHour = (slot) => {
          const m = slot.match(/(\d+):/);
          if (!m) return 24;
          let h = parseInt(m[1]);
          if ((slot || '').includes('PM') && h !== 12) h += 12;
          if ((slot || '').includes('AM') && h === 12) h = 0;
          return h;
        };
        return getHour(a.slot) - getHour(b.slot);
      });

      setCleaning(parsedTasks);
    });


    // My Requests (staff_requests)
    const qMyReqs = query(collection(db, 'staff_requests'), where('staffId', '==', (user?.uid || user?.id)));
    const unsubMyReqs = onSnapshot(qMyReqs, (snap) => {
      setMyReqs(snap.docs.map(d => ({ docId: d.id, ...d.data() })).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)));
    });

    // My Leaves (leave_requests)
    const qMyLeaves = query(collection(db, 'leave_requests'), where('staffId', '==', (user?.uid || user?.id)));
    const unsubMyLeaves = onSnapshot(qMyLeaves, (snap) => {
      setMyLeaves(snap.docs.map(d => ({ 
        docId: d.id, 
        ...d.data(), 
        type: 'Leave', 
        amt: '-', 
        date: new Date(d.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
      })).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)));
    });

    // 2. Complaints / Maintenance Tickets (Plumber, Electrician, Carpenter)
    const qComplaints = query(collection(db, 'complaints'), where('adminId', '==', adminId));
    const unsubComplaints = onSnapshot(qComplaints, (snap) => {
      const allComp = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPlumbingJobs(allComp.filter(c => c.category === 'Plumbing' || c.subCategory === 'Plumbing'));
      setElectricalJobs(allComp.filter(c => c.category === 'Electrical' || c.subCategory === 'Electrical'));
      setCarpenterJobs(allComp.filter(c => c.category === 'Carpenter' || c.subCategory === 'Carpenter'));
      setTickets(allComp);
    });

    // 3. Supplies Requests (Purchase Manager)
    const qItems = query(collection(db, 'item_requests'), where('adminId', '==', adminId));
    const unsubItems = onSnapshot(qItems, (snap) => {
      setDemands(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 3.5 Attendance for this staff member
    const qAttendance = query(
      collection(db, 'staff_attendance'), 
      where('staffId', '==', user.id || (user?.uid || user?.id) || '')
    );
    const unsubAttendance = onSnapshot(qAttendance, (snap) => {
      let logs = snap.docs.map(d => ({ dbId: d.id, ...d.data() }));
      const currentMonth = new Date().toISOString().split('T')[0].substring(0, 7);
      const wDays = new Set();
      logs.forEach(log => {
        if (log.date && log.date.startsWith(currentMonth)) {
          wDays.add(log.date);
        }
      });
      setWorkingDays(wDays.size);

      // Sort client-side to avoid needing a composite index
      logs.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setAllAttendanceLogs(logs);

      // ── CRITICAL: search todayLog from ALL logs BEFORE slicing ──
      // Using local date string to match what the phone actually shows
      const nowLocal = new Date();
      const todayStr = `${nowLocal.getFullYear()}-${String(nowLocal.getMonth()+1).padStart(2,'0')}-${String(nowLocal.getDate()).padStart(2,'0')}`;
      
      // Determine clocked state based on today's doc (search ALL logs)
      const todayLog = logs.find(log => log.date === todayStr || log.date === new Date().toISOString().split('T')[0]);
      if (todayLog && !todayLog.clockOut) {
        setClocked(true);
        setClockIn(todayLog.clockIn || '');
        setClockInExact(todayLog.createdAt || '');
        setResting(todayLog.status === 'resting');
        setRestStart(todayLog.lastRestStart || '');
        setTotalRestDurationMs(todayLog.totalRestMs || 0);
      } else {
        setClocked(false);
        setClockIn('');
        setClockInExact('');
        setResting(false);
        setRestStart('');
        setTotalRestDurationMs(0);
      }

      logs = logs.slice(0, 14);

      // Map to punchLog format
      const formattedLogs = logs.map((log) => {
        let displayDate = log.date;
        if (log.date === todayStr) displayDate = 'Today, ' + new Date(log.date).toLocaleDateString('en-GB');
        else displayDate = new Date(log.date).toLocaleDateString('en-GB');
        
        let hrs = null;
        if (log.clockIn && log.clockOut) {
          const parseTime = (timeStr) => {
            const [time, modifier] = timeStr.split(/\s+/);
            let [hours, minutes] = time.split(':');
            if (hours === '12') { hours = '00'; }
            if (modifier?.toUpperCase() === 'PM') { hours = parseInt(hours, 10) + 12; }
            return new Date(`1970/01/01 ${hours}:${minutes}`);
          };
          
          try {
            const t1 = parseTime(log.clockIn);
            const t2 = parseTime(log.clockOut);
            let diffMs = t2 - t1;
            if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000; // Passed midnight
            const h = Math.floor(diffMs / 3600000);
            const m = Math.floor((diffMs % 3600000) / 60000);
            hrs = `${h} h ${m} m`;
          } catch(e) {}
        }
        
        return {
          id: log.dbId,
          date: displayDate,
          inT: log.clockIn || '--',
          outT: log.clockOut || null,
          hrs: hrs
        };
      });
      setPunchLog(formattedLogs);
    });


    // 4. Cooks & Kitchen Headcount (Meal Status)
    const todayStr = new Date().toISOString().split('T')[0];
    const qMeal = query(collection(db, 'meal_status'), where('adminId', '==', adminId), where('date', '==', todayStr));

    let activeTenants = [];
    let todayMeals = [];
    let activeVacations = [];

    const computeStudents = () => {
      const currentDateStr = workDate || todayStr;
      const studentsList = activeTenants.map(t => {
        const mealLog = todayMeals.find(m => m.tenantId === t.id);
        const isVacB = isStudentOnVacation(activeVacations, t.id, currentDateStr, 'breakfast') || isMealPausedOnDate(t.foodVacation, currentDateStr, 'breakfast');
        const isVacL = isStudentOnVacation(activeVacations, t.id, currentDateStr, 'lunch') || isMealPausedOnDate(t.foodVacation, currentDateStr, 'lunch');
        const isVacS = isStudentOnVacation(activeVacations, t.id, currentDateStr, 'snacks') || isMealPausedOnDate(t.foodVacation, currentDateStr, 'snacks');
        const isVacD = isStudentOnVacation(activeVacations, t.id, currentDateStr, 'dinner') || isMealPausedOnDate(t.foodVacation, currentDateStr, 'dinner');

        const studentVac = getStudentActiveVacation(activeVacations, t.id, currentDateStr) || t.foodVacation || null;
        const isFoodIncluded = t.foodIncluded !== false;

        const resolveStatus = (isVac, val) => {
          if (!isFoodIncluded) return 'selfCooking';
          if (isVac) return 'onVacation';
          if (val === 'not_eating') return 'notEaten';
          if (val === 'eaten') return 'eaten';
          if (val === 'delivery') return 'delivery';
          if (val === 'pack') return 'pack';
          if (val === 'extra') return 'extra';
          return 'requested';
        };

        return {
          id: t.id,
          name: t.name || 'Tenant',
          room: t.roomNo || t.room || t.subscribedPG?.roomNo || 'N/A',
          bed: t.bedNo || t.bed || 'A',
          phone: t.phone || 'N/A',
          foodIncluded: isFoodIncluded,
          includedFoodPersons: t.includedFoodPersons || 1,
          foodVacation: studentVac,
          statusB: resolveStatus(isVacB, mealLog?.breakfast),
          statusL: resolveStatus(isVacL, mealLog?.lunch),
          statusS: resolveStatus(isVacS, mealLog?.snacks),
          statusD: resolveStatus(isVacD, mealLog?.dinner)
        };
      });
      setStudents(studentsList);
    };

    // Fetch tenants + enrich from users docs (same as admin ManageTenants)
    // Only include Current Users (status Approved / Current User) — matches admin "Current Users" tab
    const fetchAndEnrichTenants = async () => {
      try {
        const qTenants = query(collection(db, 'tenants'), where('adminId', '==', adminId));
        const snap = await getDocs(qTenants);
        const rawTenants = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Filter to current users only (same logic as admin ManageTenants)
        const currentTenants = rawTenants.filter(t => {
          const s = t.status;
          return s === 'Approved' || s === 'Current User' || !s;
        });

        // Enrich each tenant with their users doc for accurate roomNo / name
        const enriched = await Promise.all(currentTenants.map(async (t) => {
          try {
            const uid = t.tenantId || t.id;
            if (uid) {
              const userDoc = await getDoc(doc(db, 'users', uid));
              if (userDoc.exists()) {
                const uData = userDoc.data();
                // Prefer users doc data as it has the latest profile
                if (!t.name || t.name === 'Tenant') t.name = uData.name || uData.displayName || t.name;
                if (!t.roomNo) t.roomNo = uData.subscribedPG?.roomNo || uData.profileData?.roomDetails?.roomNumber || '';
                if (!t.room)   t.room   = t.roomNo;
                if (uData.foodVacation) t.foodVacation = uData.foodVacation;
              }
            }
          } catch (e) { /* silently skip enrichment errors */ }
          return t;
        }));

        activeTenants = enriched;
        computeStudents();
      } catch (err) {
        console.error('Error fetching tenants:', err);
      }
    };

    fetchAndEnrichTenants();

    const unsubMeal = onSnapshot(qMeal, (snap) => {
      todayMeals = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      computeStudents();
    });

    const qVacations = query(
      collection(db, 'food_vacations'),
      where('adminId', '==', adminId),
      where('status', 'in', ['active', 'shortened'])
    );
    const unsubVacations = onSnapshot(qVacations, (snap) => {
      activeVacations = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setVacations(activeVacations);
      computeStudents();
    }, (err) => console.error('computeStudents vacation error:', err));

    const unsubPG = onSnapshot(doc(db, 'pg_owners', adminId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.propertyDetails && data.propertyDetails.totalSeats) {
          setTotalCapacity(data.propertyDetails.totalSeats);
        }
        if (data.foodMenu) {
          setWeeklyFoodMenu(data.foodMenu);
        }
        if (data.foodMenuImages) {
          setFoodMenuImages(data.foodMenuImages);
        } else if (data.foodImages) {
          setFoodMenuImages(data.foodImages);
        }
        if (data.foodItemImages) {
          setFoodItemImages(data.foodItemImages);
        }
        if (data.foodItemImages) {
          setFoodItemImages(data.foodItemImages);
        }
        if (data.lastMenuEdit) {
          setLastMenuEdit(data.lastMenuEdit);
        }
        if (data.pausedMeals) {
          setPausedMeals(data.pausedMeals);
        }
      }
    });

    let unsubTokens, unsubAllAtt, unsubEnquiries, unsubApplications;
    if (staffRole === 'Manager' || staffRole === 'Sales') {
      const qTokens = query(collection(db, 'staff_tokens'), where('ownerUid', '==', adminId));
      unsubTokens = onSnapshot(qTokens, (snap) => {
        setTotalStaff(snap.docs.length);
        setAllStaff(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      
      const qAllAtt = query(collection(db, 'staff_attendance'), where('adminId', '==', adminId), where('date', '==', todayStr));
      unsubAllAtt = onSnapshot(qAllAtt, (snap) => {
        let dutyCount = 0;
        snap.forEach(d => {
          if (!d.data().clockOut) dutyCount++;
        });
        setStaffOnDuty(dutyCount);
      });

      const qEnquiries = query(collection(db, 'enquiries'), where('adminId', '==', adminId));
      unsubEnquiries = onSnapshot(qEnquiries, (snap) => {
        setEnquiries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      const qApps = query(collection(db, 'pg_applications'), where('adminId', '==', adminId));
      unsubApplications = onSnapshot(qApps, (snap) => {
        setMgr_applications(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => {
          const tA = a.date ? new Date(a.date).getTime() : 0;
          const tB = b.date ? new Date(b.date).getTime() : 0;
          return tB - tA;
        }));
      });
    }


    // (Dedicated Chat & Contact Sync effect handles all contacts and messaging)

    const qSalaries = query(collection(db, 'staff_salaries'), where('staffId', '==', (user?.id || user?.uid)));
    const unsubSalaries = onSnapshot(qSalaries, (snap) => {
      const slips = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      slips.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setPaySlips(slips);
    }, (error) => {
      console.warn("Error fetching pay slips:", error);
    });

    // 7. Staff Performance Ratings
    const qTenantsForRatings = query(collection(db, 'tenants'), where('adminId', '==', adminId));
    const unsubRatings = onSnapshot(qTenantsForRatings, async (snap) => {
      const tenantDocs = snap.docs.map(d => d.data());
      let allRatings = [];
      const fetchPromises = tenantDocs.map(async (t) => {
        if (!t.tenantId) return;
        try {
          const qRatings = collection(db, 'users', t.tenantId, 'ratings');
          const rSnap = await getDocs(qRatings);
          rSnap.forEach(rDoc => {
            const rData = rDoc.data();
            if (rData.staffType === user.role || rData.staffType === staffRole) {
              allRatings.push({
                id: rDoc.id,
                text: rData.description || (rData.behavior === 'Good' ? 'Good Behavior' : 'Needs Improvement'),
                rating: rData.rating || (rData.behavior === 'Good' ? 5 : 2),
                author: t.name ? `${t.name} (Rm ${t.roomNo || '?'})` : 'Student',
                date: rData.createdAt ? new Date(rData.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently',
                createdAtMs: rData.createdAt ? new Date(rData.createdAt).getTime() : 0
              });
            }
          });
        } catch(e) { console.warn("Error fetching ratings", e); }
      });
      await Promise.all(fetchPromises);
      allRatings.sort((a,b) => b.createdAtMs - a.createdAtMs);
      setStaffFeedback(allRatings);
    });

    return () => {
      unsubPG();
      unsubMeal();
      if(unsubVacations) unsubVacations();
      unsubCleaning();
      unsubComplaints();
      unsubMyReqs();
      unsubMyLeaves();
      unsubItems();
      unsubAttendance();
      unsubSalaries();
      unsubRatings();
      if(unsubTokens) unsubTokens();
      if(unsubAllAtt) unsubAllAtt();
      if(unsubEnquiries) unsubEnquiries();
      if(unsubApplications) unsubApplications();
    };
  }, [user?.ownerUid, (user?.id || user?.uid), user?.uid, fbAuthReady, workDate]);

  // Greeting
  const hr   = new Date().getHours();
  const greet= hr<12?'Good Morning':hr<17?'Good Afternoon':'Good Evening';
  const today= new Date().toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'});

  // Handlers
  const punch = async () => {
    if (clocked) setClocked(false);
    const now = new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
    const today = new Date();
    const clickTimeIso = today.toISOString();
    const year  = today.getFullYear();
    const month = today.getMonth() + 1;
    const day   = today.getDate();

    const doPunch = async (lat = null, lng = null) => {
      if (clocked) {
        // ── Punch OUT ──
        try {
          const attDocId = `${user?.id || user?.uid}_${year}_${month}_${day}`;
          
          const parseTimeStr = (tStr) => {
            if (!tStr) return new Date();
            const [time, modifier] = tStr.split(/\s+/);
            let [hours, minutes] = time.split(':');
            hours = parseInt(hours, 10);
            if (hours === 12) hours = 0;
            if (modifier?.toUpperCase() === 'PM') hours += 12;
            const d = new Date();
            d.setHours(hours, parseInt(minutes, 10), 0, 0);
            return d;
          };

          const t1 = parseTimeStr(clockIn);
          const t2 = parseTimeStr(now);
          let diffMs = t2 - t1;
          if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000;
          
          let extraRest = 0;
          if (resting && restStart) {
            const isIso = (restStart || '').includes('T');
            let restStartTime = isIso ? new Date(restStart) : parseTimeStr(restStart);
            let restDiff = t2 - restStartTime;
            if (restDiff < 0) restDiff += 24 * 60 * 60 * 1000;
            extraRest = restDiff;
          }
          diffMs -= ((totalRestDurationMs || 0) + extraRest);
          if (diffMs < 0) diffMs = 0;
          
          const hoursWorked = diffMs / (1000 * 60 * 60);
          const isFullDay = hoursWorked >= 8;
          const newStatus = isFullDay ? 'present' : 'pending_review';

          await setDoc(doc(db, 'staff_attendance', attDocId), {
            clockOut: now,
            outLat: lat,
            outLng: lng,
            status: newStatus,
            hoursWorked: hoursWorked.toFixed(2),
            updatedAt: new Date().toISOString()
          }, { merge: true });
          
          // Send notification to Admin on punch out
          try {
            if (isFullDay) {
              await addDoc(collection(db, 'notifications'), {
                adminId: user?.ownerUid,
                title: 'Staff Punched Out',
                desc: `${user?.name || staffName} (${staffRole}) punched out at ${now}. Worked for ${hoursWorked.toFixed(1)} hours (Present).`,
                type: 'Attendance',
                date: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                pgId: 'primary',
                resolved: false
              });
            } else {
              await addDoc(collection(db, 'notifications'), {
                adminId: user?.ownerUid,
                title: 'Staff Punched Out Early',
                desc: `${user?.name || staffName} (${staffRole}) punched out at ${now}, working only ${hoursWorked.toFixed(1)} hours. Please review.`,
                type: 'Attendance_Review',
                attDocId: attDocId,
                staffId: user?.id || user?.uid,
                staffName: user?.name || staffName,
                date: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                pgId: 'primary',
                resolved: false
              });
            }
          } catch(notifErr) {
            console.error('Failed to send admin notification:', notifErr);
          }
          
          showToast(`Punched Out. Worked ${hoursWorked.toFixed(1)} hours.`, 'success');
        } catch(e) { 
          console.error('Punch-out write failed:', e); 
          showToast('Punch-out failed', 'warning'); 
          setClocked(true); 
        }
      } else {
        // ── Punch IN ──
        try {
          const attDocId = `${user?.id || user?.uid}_${year}_${month}_${day}`;
          await setDoc(doc(db, 'staff_attendance', attDocId), {
            staffToken: user?.id || user?.uid,
            staffId:    user?.id || user?.uid,
            staffName:  user?.name || staffName,
            role:       staffRole,
            adminId:    user?.ownerUid,
            year,
            month,
            day,
            status:     'present',
            clockIn:    now,
            inLat: lat,
            inLng: lng,
            clockOut:   null,
            date:       `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`,
            createdAt:  clickTimeIso
          }, { merge: true });
          
          setClocked(true);
          setClockIn(now);
          setClockInExact(clickTimeIso);
          
          // Send notification to Admin
          try {
            await addDoc(collection(db, 'notifications'), {
              adminId: user?.ownerUid,
              title: 'Staff Punched In',
              desc: `${user?.name || staffName} (${staffRole}) punched in at ${now}.`,
              type: 'Attendance',
              date: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              pgId: 'primary',
              resolved: false
            });
          } catch(notifErr) {
            console.error('Failed to send admin notification:', notifErr);
          }
          
          showToast('Punched In ✅ Attendance recorded', 'success');
        } catch(e) {
          console.error('Punch-in write failed:', e);
          alert('Punch in failed: ' + e.message);
          showToast('Attendance write failed, try again', 'warning');
        }
      }
    };
    setIsPunching(true);
    let locationResolved = false;

    const finalizePunch = (lat, lng) => {
      if (locationResolved) return;
      locationResolved = true;
      doPunch(lat, lng).finally(() => setIsPunching(false));
    };

    showToast('Fetching location...', 'info');
    
    // Import dynamically so it doesn't break if not present
    import('@capacitor/geolocation').then(async ({ Geolocation }) => {
      try {
        const perm = await Geolocation.checkPermissions();
        if (perm.location !== 'granted') {
          const req = await Geolocation.requestPermissions();
          if (req.location !== 'granted') {
             throw new Error('Permission denied');
          }
        }
        
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 10000
        });
        finalizePunch(position.coords.latitude, position.coords.longitude);
      } catch (err) {
        console.error("GPS error:", err);
        alert("GPS error: " + err.message);
        showToast('Location not available. Punching without GPS.', 'warning');
        finalizePunch(null, null);
      }
    }).catch(err => {
        console.error("Capacitor Geolocation error:", err);
        // Fallback to navigator
        if (navigator.geolocation) {
           navigator.geolocation.getCurrentPosition(
             pos => finalizePunch(pos.coords.latitude, pos.coords.longitude),
             e => {
                alert("GPS error: " + e.message);
                finalizePunch(null, null);
             },
             { enableHighAccuracy: false, timeout: 5000, maximumAge: 10000 }
           );
        } else {
           alert("Geolocation not supported.");
           finalizePunch(null, null);
        }
    });

    // Fallback timeout in case WebView silently hangs on getCurrentPosition
    setTimeout(() => {
      if (!locationResolved) {
        console.warn("GPS request hung, falling back manually");
        alert("GPS timed out. Proceeding without GPS.");
        showToast('GPS timeout. Punching in without GPS.', 'warning');
        finalizePunch(null, null);
      }
    }, 6000);
  };


  // ─── FIRESTORE ACTION HELPERS ───

  const takeRest = async () => {
    if (!clocked) return;
    const now = new Date();
    
    let restDiff = 0;
    let newTotalRestMs = Number(totalRestDurationMs) || 0;
    
    if (resting && restStart) {
      const parseTime = (timeStr) => {
        const [time, modifier] = timeStr.split(/\s+/);
        let [hours, minutes] = time.split(':');
        if (hours === '12') hours = '00';
        if (modifier?.toUpperCase() === 'PM') hours = parseInt(hours, 10) + 12;
        const d = new Date();
        d.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
        return d;
      };
      const isIso = (restStart || '').includes('T');
      let restStartTime = isIso ? new Date(restStart) : parseTime(restStart);
      restDiff = now - restStartTime;
      if (restDiff < 0) restDiff += 24 * 60 * 60 * 1000;
      newTotalRestMs += restDiff;
    }

    // Optimistic UI update
    if (resting) {
        setResting(false);
        setTotalRestDurationMs(newTotalRestMs);
    } else {
        setResting(true);
        setRestStart(now.toISOString());
    }

    const today = now;
    const year  = today.getFullYear();
    const month = today.getMonth() + 1;
    const day   = today.getDate();
    const attDocId = `${user?.id || user?.uid}_${year}_${month}_${day}`;
    
    try {
      if (resting) {
        // We already calculated newTotalRestMs and restDiff above
        
        await setDoc(doc(db, 'staff_attendance', attDocId), {
          status: 'working',
          totalRestMs: newTotalRestMs,
          lastRestStart: null,
          restEndLog: now.toISOString()
        }, { merge: true });
        
        const durationStr = Math.round(restDiff / 60000) + ' minutes';
        await addDoc(collection(db, 'notifications'), {
          title: 'Staff Rest Ended',
          desc: `${user?.name || 'Staff'} has resumed work after resting for ${durationStr}.`,
          type: 'info',
          unread: true,
          adminId: user?.ownerUid || 'admin',
          createdAt: now.toISOString(),
              pgId: 'primary',
        });
        showToast('Work Restarted', 'success');
      } else {
        const timeStr = now.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
        await setDoc(doc(db, 'staff_attendance', attDocId), {
          status: 'resting',
          lastRestStart: now.toISOString(),
          restStartLog: now.toISOString()
        }, { merge: true });
        
        await addDoc(collection(db, 'notifications'), {
          title: 'Staff Taking Rest',
          desc: `${user?.name || 'Staff'} is taking rest at ${timeStr}.`,
          type: 'info',
          unread: true,
          adminId: user?.ownerUid || 'admin',
          createdAt: now.toISOString(),
              pgId: 'primary',
        });
        showToast('Rest Started', 'success');
      }
    } catch(err) {
      console.error(err);
    }
  };

  const updateTicketStatus = async (ticketId, newStatus) => {
    try {
      await updateDoc(doc(db, 'complaints', ticketId), { status: newStatus });
      showToast(`Ticket marked as ${newStatus}`, 'success');
    } catch (e) {
      console.error(e);
      showToast('Failed to update ticket', 'warning');
    }
  };

  const completeCleaningTask = async (taskId) => {
    try {
      await updateDoc(doc(db, 'pg_owners', user.ownerUid, 'cleaner_requests', taskId), {
        status: 'Needs Approval',
        lastUpdated: new Date().toISOString()
      });
      showToast('Sent to student for approval ⏳', 'success');
    } catch (e) {
      console.error(e);
      showToast('Failed to update cleaning task', 'warning');
    }
  };

  const markMealEaten = async (tenantId, mealKey) => {
    try {
      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;

      const mealStr = mealKey.startsWith('status') 
        ? { statusB: 'breakfast', statusL: 'lunch', statusS: 'snacks', statusD: 'dinner' }[mealKey]
        : mealKey;

      if (!mealStr) return;
      
      const student = students.find(s => s.id === tenantId);
      const studentName = student ? student.name : 'Student';

      const docRef = doc(db, 'mess_headcount', `${user.ownerUid}_${todayStr}`);
      await setDoc(docRef, {
        [`${tenantId}_${mealStr}_eaten`]: true,
        [`${tenantId}_${mealStr}_audit`]: {
          confirmedVia: 'manual_cook',
          markedByName: staffName || 'Cook',
          markedByRole: staffRole || 'Cook',
          timestamp: new Date().toISOString()
        }
      }, { merge: true });
      
      await addDoc(collection(db, 'users', tenantId, 'notifications'), {
        title: 'Meal Status: Eaten ✅',
        desc: `You have been marked as having eaten your ${mealStr}.`,
        type: 'Food',
        action: 'VIEW_FOOD',
        unread: true,
        createdAt: new Date().toISOString()
      });

      showToast(`${studentName} marked as Eaten!`, 'success');
    } catch (e) {
      console.error(e);
      showToast('Failed to update meal status', 'error');
    }
  };

  const getChatId = (uid1, uid2) => {
    return [uid1, uid2].sort().join('_');
  };

  const handleTaskDone = async (task) => {
    try {
      await updateDoc(doc(db, 'staff_tasks', task.id), {
        status: 'Completed',
        completedAt: new Date().toISOString()
      });
      // Send notification to admin
      await addDoc(collection(db, 'notifications'), {
        adminId: task.adminId || adminId,
        type: 'task_completed',
        title: 'Task Completed',
        message: `${staffName} (${staffRole}) completed the task: ${task.title}`,
        createdAt: new Date().toISOString(),
        resolved: false,
              pgId: 'primary',
      });
    } catch(e) {
      console.error(e);
      alert('Error updating task');
    }
  };

  const sendMsg = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!chatInput.trim() || !activeContact) return;
    const text = chatInput.trim();
    setChatInput('');

    const currentAdminId = user?.ownerUid || user?.adminId || staffProfile?.ownerUid || staffProfile?.adminId || 'primary';
    const currentMyId = String(user?.id || user?.uid || staffProfile?.id || staffProfile?.uid || 'staff');
    const contactId = String(activeContact.id);
    const chatId = getChatId(currentMyId, contactId);

    const newMsg = {
      text: text,
      senderId: currentMyId,
      senderName: staffName,
      timestamp: serverTimestamp(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Immediate optimistic update
    setChatHist(prev => ({
      ...prev,
      [contactId]: [
        ...(prev[contactId] || []),
        {
          id: 'opt_' + Date.now(),
          text: newMsg.text,
          rawTs: Date.now(),
          time: newMsg.time,
          me: true
        }
      ]
    }));

    setContacts(prev => prev.map(c => c.id === contactId ? { ...c, lastMsg: text, time: newMsg.time } : c));

    try {
      await Promise.all([
        setDoc(doc(db, 'chats', chatId), {
          participants: [currentMyId, contactId],
          lastMessage: text,
          lastMessageTime: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          adminId: currentAdminId
        }, { merge: true }),
        addDoc(collection(db, 'chats', chatId, 'messages'), newMsg)
      ]);
    } catch (err) {
      console.error('Chat error:', err);
      showToast('Failed to send message', 'warning');
    }
  };

  const openReminder = () => {
    if (activeContact.reminder) {
      const parts = activeContact.reminder.split(' — ');
      if (parts.length > 1) {
        setRemReason(parts[0]);
      } else {
        setRemReason(activeContact.reminder);
      }
    } else {
      setRemReason('');
    }
    setShowReminder(true);
  };

  const saveReminder = e => {
    e.preventDefault();
    const reminderStr = `${remReason ? `${remReason} — ` : ''}${remDate} ${remTime}`;
    setContacts(prev => prev.map(c => c.id === activeContact.id ? { ...c, isPinned: true, reminder: reminderStr } : c));
    setActiveContact(prev => ({ ...prev, isPinned: true, reminder: reminderStr }));
    setShowReminder(false);
    setRemReason('');
  };

  const clearReminder = () => {
    setContacts(prev => prev.map(c => c.id === activeContact.id ? { ...c, isPinned: false, reminder: null } : c));
    setActiveContact(prev => ({ ...prev, isPinned: false, reminder: null }));
  };

  const submitReport = e=>{
    e.preventDefault();
    if(!rptText.trim()) return;
    setRptHist(p=>[{id:Date.now(),date:new Date().toLocaleDateString('en-GB'),summary:rptText.trim(),status:'Submitted'},...p]);
    setRptText('');
    showToast('Report submitted to Admin!', 'success');
  };

  const submitRequest = async (e) => {
    e.preventDefault();
    if(!reqReason.trim()) return;
    try {
      if (reqType === 'Leave') {
        await addDoc(collection(db, 'leave_requests'), {
          staffId: (user?.uid || user?.id),
          adminId: user.ownerUid,
          staffName: user.name || 'Staff',
          role: staffRole,
          from: reqFrom || new Date().toISOString(),
          to: reqTo || new Date().toISOString(),
          reason: reqReason,
          status: 'Pending',
          type: 'Leave',
          createdAt: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, 'staff_requests'), {
          staffId: (user?.uid || user?.id),
          adminId: user.ownerUid,
          staffName: user.name || 'Staff',
          type: reqType,
          reason: reqReason,
          amt: reqAmt ? `₹${reqAmt}` : '-',
          date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
          status: 'Pending',
          createdAt: new Date().toISOString()
        });
      }

      await addDoc(collection(db, 'notifications'), {
        adminId: user.ownerUid,
        staffId: (user?.uid || user?.id),
        title: 'New Staff Request',
        desc: `${user.name || 'Staff'} submitted a request for ${reqType}.`,
        type: 'Staff Request',
        resolved: false,
        createdAt: new Date().toISOString(),
              pgId: 'primary',
      });

      setReqReason(''); setReqAmt(''); setReqFrom(''); setReqTo('');
      setReqSuccessModal(true);
    } catch(err) {
      console.error(err);
      showToast('Error submitting', 'error');
    }
  };

  const submitDemand = e=>{
    e.preventDefault();
    if(!dItem.trim()) return;
    const newD = {
      id: Date.now(),
      item: dItem.trim(),
      qty: dQty || '1 unit',
      reqBy: `${staffName} (${staffRole})`,
      vendor: 'Pending Admin Assignment',
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      status: 'Pending'
    };
    setMyDemands(p=>[newD, ...p]);
    setDemands(p=>[newD, ...p]);
    setDItem(''); setDQty(''); setDNote('');
    setShowDemandForm(false);
    showToast('Requisition submitted to Admin!', 'success');
  };

  const addVisitor = e=>{
    e.preventDefault();
    if(!vName.trim()) return;
    setVisitors(p=>[{id:Date.now(),name:vName,phone:vPhone||'—',purpose:vPurp||'Visitor',inTime:new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}),outTime:null,status:'Inside'},...p]);
    setVName(''); setVPhone(''); setVPurp(''); setShowVisitor(false);
  };

  const addParcel = e=>{
    e.preventDefault();
    if(!pStu.trim()) return;
    setParcels(p=>[{id:Date.now(),student:pStu,room:pRoom||'—',carrier:pCarr,tracking:pTrk||'TRK-'+Math.floor(1000+Math.random()*9000),date:'Today '+new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}),status:'Pending'},...p]);
    setPStu(''); setPRoom(''); setPTrk(''); setShowParcel(false);
  };

  const eaten = students.filter(s=>s.statusB==='eaten').length; // Home view demo data

  // ─── Module tiles on Home ──────────────────────────────────────────────────
  const MODULES = [
    {id:'work',      label:'My Work',        sub:staffRole,          icon:'home_work',              grad:'#eef2ff'},
    {id:'inventory', label:'Inventory',      sub:'Petty Funds & Assets', icon:'account_balance_wallet', grad:'#eef2ff'},
    {id:'inout',     label:'Attendance',     sub:'Punch In / Out',   icon:'schedule',               grad:'#eef2ff'},
    {id:'salary',    label:'Salary',         sub:'₹18,500 Jul',      icon:'payments',               grad:'#eef2ff'},
    {id:'chat',      label:'Chat',           sub:'5 Messages',       icon:'forum',                  grad:'#eef2ff'},
    {id:'performance', label:'Performance',  sub:'Feedback & Ratings', icon:'star',             grad:'#eef2ff'},
    {id:'requests',  label:'Requests',       sub:'Leave / Advance',  icon:'approval',               grad:'#eef2ff'},
  ];

  // ─── Role quick stats ─────────────────────────────────────────────────────
  const roleStats = {
  'Bus Driver':       [{l:'Passengers',v:6,icon:'groups'},{l:'Trips Today',v:2,icon:'directions_bus'},{l:'On Time',v:'100%',icon:'schedule'},{l:'Fuel Spent',v:'₹1,500',icon:'local_gas_station'}],
  'Bus Driver':       [{l:'Passengers',v:6,icon:'groups'},{l:'Trips Today',v:2,icon:'directions_bus'},{l:'On Time',v:'100%',icon:'schedule'},{l:'Fuel Spent',v:'₹1,500',icon:'local_gas_station'}],
    'HR':               [{l:'Applicants',v:candidates.filter(c=>c.status!=='Hired ✅').length,icon:'group_add'},{l:'Enquiries',v:enquiries.length,icon:'contact_phone'},{l:'Staff Hired',v:candidates.filter(c=>c.status==='Hired ✅').length,icon:'badge'},{l:'Open Jobs',v:3,icon:'work_outline'}],
    'Cook':             [{l:'Breakfast',v:30,icon:'coffee'},{l:'Lunch',v:28,icon:'lunch_dining'},{l:'Dinner',v:30,icon:'dinner_dining'},{l:'Snacks',v:30,icon:'bakery_dining'}],
    'Cleaner':          [{l:'Pending',v:cleaning.filter(c=>!c.done).length,icon:'mop'},{l:'Cleaned',v:cleaning.filter(c=>c.done).length,icon:'check_circle'},{l:'Rooms Today',v:4,icon:'room_service'},{l:'Floors',v:3,icon:'stairs'}],
    'Maintenance':      [{l:'Open',v:tickets.filter(t=>t.status==='Open').length,icon:'build'},{l:'In Progress',v:tickets.filter(t=>t.status==='In Progress').length,icon:'construction'},{l:'Resolved',v:8,icon:'check_circle'},{l:'High Priority',v:2,icon:'priority_high'}],
    'Purchase Manager': [{l:'Pending POs',v:demands.filter(d=>d.status==='Pending').length,icon:'pending'},{l:'Approved',v:demands.filter(d=>d.status==='Approved').length,icon:'verified'},{l:'Items Low',v:2,icon:'inventory_2'},{l:'Out of Stock',v:1,icon:'remove_shopping_cart'}],
    'Security Guard':   [{l:'Visitors In',v:visitors.filter(v=>v.status==='Inside').length,icon:'person'},{l:'Today Total',v:visitors.length,icon:'groups'},{l:'Parcels',v:parcels.filter(p=>p.status==='Pending').length,icon:'package_2'},{l:'Incidents',v:0,icon:'warning'}],
    'Helper':           [{l:'Tasks Today',v:tasks.length,icon:'task_alt'},{l:'Pending',v:tasks.filter(t=>t.status==='Pending').length,icon:'pending'},{l:'Done',v:tasks.filter(t=>t.status==='Done').length,icon:'check_circle'},{l:'High Priority',v:tasks.filter(t=>t.priority==='High').length,icon:'priority_high'}],
    'Plumber':          [{l:'Open Jobs',v:plumbingJobs.filter(t=>t.status==='Open').length,icon:'plumbing'},{l:'In Progress',v:plumbingJobs.filter(t=>t.status==='In Progress').length,icon:'construction'},{l:'Resolved',v:1,icon:'check_circle'},{l:'High Priority',v:plumbingJobs.filter(t=>t.priority==='High').length,icon:'priority_high'}],
    'Electrician':      [{l:'Open',v:electricalJobs.filter(t=>t.status==='Open').length,icon:'electrical_services'},{l:'In Progress',v:electricalJobs.filter(t=>t.status==='In Progress').length,icon:'construction'},{l:'Resolved',v:electricalJobs.filter(t=>t.status==='Resolved').length,icon:'check_circle'},{l:'High Priority',v:electricalJobs.filter(t=>t.priority==='High').length,icon:'priority_high'}],
    'Carpenter':        [{l:'Open Jobs',v:carpenterJobs.filter(t=>t.status==='Open').length,icon:'carpenter'},{l:'In Progress',v:carpenterJobs.filter(t=>t.status==='In Progress').length,icon:'construction'},{l:'Resolved',v:0,icon:'check_circle'},{l:'High Priority',v:carpenterJobs.filter(t=>t.priority==='High').length,icon:'priority_high'}],
    'Sales Manager':    [{l:'New Leads',v:enquiries.filter(e=>(e.status || '').includes('New')).length,icon:'contact_phone'},{l:'Contacted',v:enquiries.filter(e=>(e.status || '').includes('Contacted')).length,icon:'call_made'},{l:'Vacant Rooms',v:rooms.filter(r=>r.status==='Vacant').length,icon:'meeting_room'},{l:'Closed Deals',v:enquiries.filter(e=>(e.status || '').includes('Closed')).length,icon:'handshake'}],
    'Manager':          [{l:'Staff On Duty',v:staffOnDuty + ' / ' + totalStaff,icon:'groups'},{l:'New Leads',v:enquiries.filter(e=>e.status==='New').length,icon:'person_add'},{l:'Vacant Rooms',v:Math.max(0, totalCapacity - students.length),icon:'meeting_room'},{l:'Pending POs',v:demands.filter(d=>d.status==='Pending').length,icon:'pending'}],
    'Others':           [{l:'Tasks Today',v:tasks.length,icon:'task_alt'},{l:'Pending',v:tasks.filter(t=>t.status==='Pending').length,icon:'pending'},{l:'Done',v:tasks.filter(t=>t.status==='Done').length,icon:'check_circle'},{l:'Available',v:1,icon:'person_check'}],
  };
  const stats = roleStats[staffRole] || roleStats['HR'];

  // Sorting contacts
  const sortedContacts = [...contacts].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    if (a.reminder && !b.reminder) return -1;
    if (!a.reminder && b.reminder) return 1;
    return 0;
  });

  // ─── RENDER ──────────────────────────────────────────────────────────────
  return (
    <div className="mobile-shell" style={{background: staffRole === 'Manager' ? '#f1f5f9' : C.bg, fontFamily:"'Hanken Grotesk',sans-serif"}}>
      <style>{`
        @keyframes sheetUp{from{transform:translateY(60px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes sideIn{from{left:-300px}to{left:0}}
        @keyframes fadeInUp{from{opacity:0;transform:translate(-50%,20px)}to{opacity:1;transform:translate(-50%,0)}}
        ::-webkit-scrollbar{display:none} *{-webkit-tap-highlight-color:transparent}
      `}</style>

      {/* ── Toast Message ─────────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 'calc(110px + env(safe-area-inset-bottom, 0px))', left: '50%', transform: 'translateX(-50%)',
          background: toast.type === 'warning' ? '#f59e0b' : '#10b981', color: 'white',
          padding: '12px 24px', borderRadius: 30, fontWeight: 800, fontSize: 14,
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)', zIndex: 10001, whiteSpace: 'nowrap',
          animation: 'fadeInUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}>
          {toast.message}
        </div>
      )}

      {/* ── Sidebar Overlay ─────────────────────────────────────────────── */}
      {sidebar && <div onClick={()=>setSidebar(false)} style={{position:'fixed',inset:0,background:'rgba(15,23,42,.55)',zIndex:60,backdropFilter:'blur(3px)'}}/>}

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside style={{position:'fixed', top:0, left:sidebar ? 0 : '-300px', width:280, height:'100dvh', background:'#fff', borderRight: '1px solid #e2e8f0', zIndex:70, transition:'left .3s cubic-bezier(.4,0,.2,1)', display:'flex', flexDirection:'column', boxShadow: '4px 0 16px rgba(15,23,42,0.06)'}}>
        {/* Sidebar top profile – safe-area-top prevents notch overlap */}
        <div onClick={()=>{setView('profile_view');setSidebar(false);}} style={{padding:'28px 20px 20px', paddingTop:'calc(28px + env(safe-area-inset-top, 0px))', borderBottom: '1px solid #e2e8f0', cursor:'pointer'}}>
          <div style={{width:52, height:52, borderRadius:12, background: meta.accentBg, border: '1px solid #e2e8f0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, marginBottom:12, boxShadow: '0 2px 8px rgba(15,23,42,0.04)'}}>
            {meta.emoji}
          </div>
          <p style={{fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:20, fontWeight:800, color:'#000', margin:0}}>{staffName}</p>
          <div style={{display:'flex', alignItems:'center', gap:6, marginTop:4}}>
            <span style={{fontSize:11, fontWeight:800, background:meta.accent, color:'#000', padding:'2px 8px', borderRadius:8, border: '1px solid #e2e8f0'}}>{staffRole}</span>
            <span style={{fontSize:12, fontWeight:700, color:C.muted}}>· {meta.dept}</span>
          </div>
        </div>

        {/* Nav items */}
        <div style={{flex:1, overflowY:'auto', padding:'16px 12px'}}>
          {[
            {id:'home',      icon:'home',                   label:'Home Dashboard'},
            {id:'work',      icon:'home_work',              label:'My Work'},
            {id:'history',   icon:'history',                label:'Work History'},
            {id:'itemreq',   icon:'inventory',              label:'Request Supplies'},
            {id:'inventory', icon:'account_balance_wallet', label:'Inventory & Petty Cash'},
            {id:'inout',     icon:'schedule',               label:'Attendance'},
            {id:'salary',    icon:'payments',               label:'Salary & Pay'},
            {id:'chat',      icon:'forum',                  label:'Chat'},
            {id:'performance', icon:'star',                   label:'Performance & Feedback'},
            {id:'requests',  icon:'approval',               label:'Requests'},
            {id:'profile_view', icon:'person',              label:'My Profile'},
          ].map(item => {
            const active = view === item.id;
            return (
              <div key={item.id} onClick={()=>{setView(item.id);setSidebar(false);setActiveContact(null);}}
                style={{
                  display:'flex', alignItems:'center', gap:12, padding:'12px 16px', marginBottom:8, cursor:'pointer',
                  color: '#000',
                  background: active ? C.primary : 'transparent',
                  border: active ? '2px solid #000' : '2px solid transparent',
                  borderRadius: 12,
                  boxShadow: active ? '2px 2px 0px #000' : 'none',
                  fontWeight: active ? 800 : 600,
                  transition: 'all .15s'
                }}>
                <span className="material-symbols-outlined" style={{fontSize:20}}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            );
          })}
        </div>

        {/* Logout – safe-area-bottom prevents home bar overlap */}
        <div style={{borderTop: '1px solid #e2e8f0', padding:'16px 20px', paddingBottom:'calc(16px + env(safe-area-inset-bottom, 0px))', background:'#fafafa'}}>
          <div onClick={logout} style={{display:'flex', alignItems:'center', gap:14, color:C.danger, cursor:'pointer', padding:'8px 0', fontWeight:800}}>
            <span className="material-symbols-outlined" style={{fontSize:20}}>logout</span>
            <span style={{fontSize:14}}>Sign Out</span>
          </div>
        </div>
      </aside>

      {/* ── HEADER (always visible) ──────────────────────────────────────── */}
      {view === 'home' ? (
        staffRole === 'Manager' ? (
          // ── MANAGER HERO HEADER (Admin Aesthetic) ──────────────────────────
          <div style={{
            background: 'linear-gradient(160deg, #0c1a2e 0%, #0f2847 60%, #0c3461 100%)',
            padding: '0 18px 24px',
            paddingTop: 'max(0px, env(safe-area-inset-top, 0px))',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Soft decorative glows */}
            <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(56,189,248,0.12)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -20, left: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(99,102,241,0.1)', pointerEvents: 'none' }} />

            {/* Top Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 60, position: 'relative', zIndex: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 26, fontWeight: 800, color: '#38bdf8', margin: 0, letterSpacing: -0.5 }}>
                  febebo
                </p>

                {/* Multi-PG Switcher Pill */}
                {assignedProperties && assignedProperties.length > 0 && (
                  <div 
                    onClick={() => {
                      if (assignedProperties.length > 1) setShowStaffPgSwitcher(true);
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: 20, padding: '4px 10px', cursor: assignedProperties.length > 1 ? 'pointer' : 'default',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)', backdropFilter: 'blur(6px)'
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#38bdf8' }}>domain</span>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: '#ffffff', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {assignedProperties.find(p => p.id === activePgId)?.name || 'Primary PG'}
                    </span>
                    {assignedProperties.length > 1 && (
                      <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#94a3b8' }}>expand_more</span>
                    )}
                  </div>
                )}
              </div>

              {/* Profile Avatar Button */}
              <button onClick={() => setView('profile_view')} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 50, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', zIndex: 10, overflow: 'hidden', padding: 0 }}>
                {profilePic ? (
                  <img src={profilePic} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#38bdf8' }}>person</span>
                )}
              </button>
            </div>

            {/* Greeting & Subtitle */}
            <div style={{ marginTop: 6, marginBottom: 16 }}>
              <p style={{ color: '#94a3b8', fontSize: 13, margin: '0 0 3px', fontWeight: 600 }}>
                {new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 17 ? 'Good Afternoon' : 'Good Evening'} 👋
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h2 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", color: 'white', fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
                  <span style={{ color: '#38bdf8' }}>{firstName || staffName || 'Manager'}</span>
                </h2>
                <span style={{ fontSize: 10.5, fontWeight: 800, background: 'rgba(56,189,248,0.18)', color: '#38bdf8', padding: '3px 8px', borderRadius: 8, border: '1px solid rgba(56,189,248,0.3)', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  Manager
                </span>
              </div>
              <p style={{ color: '#64748b', fontSize: 12.5, margin: '4px 0 0' }}>Here's what's happening today</p>
            </div>

            {/* Duty / Punch Bar (Sleek Glass Card) */}
            <div style={{
              marginBottom: 16,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 14,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ position: 'relative', display: 'flex', height: 10, width: 10 }}>
                  {clocked && (
                    <span style={{ animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite', position: 'absolute', display: 'inline-flex', height: '100%', width: '100%', borderRadius: '50%', background: '#10b981', opacity: 0.75 }} />
                  )}
                  <span style={{ position: 'relative', display: 'inline-flex', borderRadius: '50%', height: 10, width: 10, background: clocked ? '#10b981' : '#ef4444' }} />
                </span>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#f1f5f9' }}>{clocked ? 'On Duty' : 'Off Shift'}</span>
                {clocked && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginLeft: 6 }}>since {clockIn}</span>
                )}
              </div>

              <button 
                onClick={() => {
                  if (clocked) setShowPunchOutConfirm(true);
                  else punch();
                }} 
                disabled={isPunching}
                style={{
                  padding: '6px 14px',
                  borderRadius: 10,
                  border: clocked ? '1px solid rgba(239,68,68,0.35)' : '1px solid rgba(16,185,129,0.35)',
                  background: clocked ? 'rgba(239,68,68,0.18)' : 'rgba(16,185,129,0.18)',
                  color: clocked ? '#fca5a5' : '#6ee7b7',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: isPunching ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5
                }}
              >
                {isPunching ? (
                  <div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                ) : (
                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>{clocked ? 'logout' : 'login'}</span>
                )}
                {clocked ? 'Punch Out' : 'Punch In'}
              </button>
            </div>

            {/* 4 Stat Pills — All Clickable */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                {
                  label: 'Seats Occupied',
                  value: `${students.length}/${totalCapacity || students.length}`,
                  icon: 'meeting_room',
                  color: '#38bdf8',
                  bg: 'rgba(56,189,248,0.15)',
                  view: 'manage_rooms'
                },
                {
                  label: 'Staff on Duty',
                  value: `${staffOnDuty}/${totalStaff || allStaff.length || 1}`,
                  icon: 'badge',
                  color: '#34d399',
                  bg: 'rgba(52,211,153,0.15)',
                  view: 'manage_staff'
                },
                {
                  label: 'Open Issues',
                  value: String(tickets.filter(t => t.status === 'Active' || t.status === 'Pending' || t.status === 'Open').length),
                  icon: 'report_problem',
                  color: '#f87171',
                  bg: 'rgba(248,113,113,0.15)',
                  view: 'complaints'
                },
                {
                  label: 'Mess Covers',
                  value: `${students.filter(s=>s['status'+(mealTab||'Lunch').charAt(0)]!=='notEaten').length}/${students.length}`,
                  icon: 'restaurant',
                  color: '#fbbf24',
                  bg: 'rgba(251,191,36,0.15)',
                  view: 'mess_headcount'
                }
              ].map((s, i) => (
                <div 
                  key={i} 
                  onClick={() => s.view && setView(s.view)}
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 14,
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: s.color }}>{s.icon}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", color: 'white', fontSize: 16, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>{s.value}</p>
                    <p style={{ color: '#94a3b8', fontSize: 10.5, margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</p>
                  </div>
                  <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>chevron_right</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          // ── WORKER HERO HEADER (Standard) ──────────────────────────────────
          <div style={{background: 'linear-gradient(to bottom, #fffef2, #fffdf0)', padding:'0 16px 20px', paddingTop:'max(0px, env(safe-area-inset-top, 0px))', color: '#1a1500', borderBottom: '1.5px solid #e8df9a'}}>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', height:60, position:'relative'}}>
              <div style={{display:'flex', alignItems:'center', gap:10, zIndex:10}}>
                <p style={{fontFamily:"'Hanken Grotesk',sans-serif", fontSize:24, fontWeight:900, color: '#1a1500', margin:0, letterSpacing:-.5}}>febebo</p>
                
                {/* Multi-PG Switcher Pill */}
                {assignedProperties && assignedProperties.length > 0 && (
                  <div 
                    onClick={() => {
                      if (assignedProperties.length > 1) setShowStaffPgSwitcher(true);
                    }}
                    style={{
                      display:'flex', alignItems:'center', gap:5,
                      background: '#ffffff', border: '1.5px solid #e8df9a',
                      borderRadius: 20, padding: '4px 10px', cursor: assignedProperties.length > 1 ? 'pointer' : 'default',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
                    }}
                  >
                    <span className="material-symbols-outlined" style={{fontSize:15, color: '#ca8a04'}}>domain</span>
                    <span style={{fontSize:11.5, fontWeight:800, color:'#1a1500', maxWidth:110, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                      {assignedProperties.find(p => p.id === activePgId)?.name || 'Primary PG'}
                    </span>
                    {assignedProperties.length > 1 && (
                      <span className="material-symbols-outlined" style={{fontSize:15, color: '#ca8a04'}}>expand_more</span>
                    )}
                  </div>
                )}
              </div>

              <button onClick={()=>setView('profile_view')} style={{background: '#fefce8', border: '1.5px solid #e8df9a', borderRadius:50, width:44, height:44, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', position:'relative', zIndex:10, overflow:'hidden', padding:0}}>
                {profilePic ? (
                  <img src={profilePic} alt="Profile" style={{width:'100%', height:'100%', objectFit:'cover'}} />
                ) : (
                  <span className="material-symbols-outlined" style={{fontSize:24, color: '#ca8a04'}}>person</span>
                )}
              </button>
            </div>

            {/* Greeting card */}
            <div style={{marginTop:14}}>
              <p style={{margin:0, fontSize:13, fontWeight:800, color:'#ca8a04', textTransform:'uppercase', letterSpacing:'0.04em'}}>{greet}, {firstName} 👋</p>
              <div style={{display:'flex', alignItems:'center', gap:10, marginTop:4}}>
                <div style={{width:40, height:40, borderRadius:12, background: meta.accentBg, border: '1.5px solid #e8df9a', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, boxShadow:'0 2px 6px rgba(0,0,0,0.05)'}}>
                  {meta.emoji}
                </div>
                <div>
                  <div style={{display:'flex', alignItems:'center', gap:6}}>
                    <h2 style={{margin:0, fontSize:22, fontWeight:900, color: '#1a1500', letterSpacing:-.5}}>{meta.dept}</h2>
                    <span style={{fontSize:10, fontWeight:800, background: '#fefce8', color: '#ca8a04', padding:'3px 8px', borderRadius:8, border: '1.5px solid #e8df9a'}}>{staffRole}</span>
                  </div>
                </div>
              </div>
            </div>

          {/* Punch card */}
          {(() => {
            const _now = new Date();
            const _todayStr = `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,'0')}-${String(_now.getDate()).padStart(2,'0')}`;
            const _todayLog = allAttendanceLogs.find(l => l.date === _todayStr);
            const _isCompleted = _todayLog && _todayLog.clockOut;
            const _isMarkedExternally = _todayLog && !_todayLog.clockIn && (_todayLog.status === 'absent' || _todayLog.status === 'present');
            const hasCompletedShift = !clocked && (_isCompleted || _isMarkedExternally);

            if (hasCompletedShift) {
              return (
                <div style={{marginTop:18, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius:18, padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow: '0 4px 16px rgba(120, 104, 10, 0.04)'}}>
                  <div style={{display:'flex', flexDirection:'column', gap:2}}>
                    <div style={{display:'flex', alignItems:'center', gap:8}}>
                      <span style={{position:'relative', display:'flex', height:10, width:10}}>
                        <span style={{position:'relative', display:'inline-flex', borderRadius:'50%', height:10, width:10, background: '#16a34a'}}></span>
                      </span>
                      <span style={{fontSize:14, fontWeight:800, color: '#1a1500'}}>Shift Completed</span>
                    </div>
                    <span style={{fontSize:11, fontWeight:700, color: '#64748b', marginLeft:18}}>You have finished work for today</span>
                  </div>
                  <div style={{
                    padding:'8px 16px', 
                    borderRadius:12, 
                    background: '#e2e8f0', 
                    color: '#64748b', 
                    fontSize:12, 
                    fontWeight:900, 
                    display:'flex', 
                    alignItems:'center', 
                    gap:6
                  }}>
                    <span className="material-symbols-outlined" style={{fontSize:16}}>done_all</span>
                    Done
                  </div>
                </div>
              );
            }

            return (
              <div style={{marginTop:18, background: '#ffffff', border: '1.5px solid #e8df9a', borderRadius:18, padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow: '0 4px 16px rgba(120, 104, 10, 0.04)'}}>
                <div style={{display:'flex', flexDirection:'column', gap:2}}>
                  <div style={{display:'flex', alignItems:'center', gap:8}}>
                    <span style={{position:'relative', display:'flex', height:10, width:10}}>
                      {clocked && (
                        <span style={{animation:'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite', position:'absolute', display:'inline-flex', height:'100%', width:'100%', borderRadius:'50%', background:'#10b981', opacity:0.75}}></span>
                      )}
                      <span style={{position:'relative', display:'inline-flex', borderRadius:'50%', height:10, width:10, background: clocked ? '#10b981' : '#ef4444'}}></span>
                    </span>
                    <span style={{fontSize:14, fontWeight:800, color: '#1a1500'}}>{clocked ? 'On Duty' : 'Off Shift'}</span>
                  </div>
                  {clocked && (
                    <span style={{fontSize:11, fontWeight:700, color: '#64748b', marginLeft:18}}>Logged in at {clockIn}</span>
                  )}
                </div>
                
                <button 
                  onClick={() => {
                    if (clocked) {
                      setShowPunchOutConfirm(true);
                    } else {
                      punch();
                    }
                  }} 
                  disabled={isPunching}
                  style={{
                    padding:'8px 16px', 
                    borderRadius:12, 
                    border: 'none', 
                    background: clocked ? '#fee2e2' : '#dcfce7', 
                    color: clocked ? '#991b1b' : '#166534', 
                    fontSize:12, 
                    fontWeight:900, 
                    cursor:isPunching?'not-allowed':'pointer', 
                    fontFamily:'inherit', 
                    display:'flex', 
                    alignItems:'center', 
                    gap:6, 
                    boxShadow:'0 2px 6px rgba(0,0,0,0.03)',
                    opacity: isPunching ? 0.7 : 1
                  }}
                >
                  {isPunching ? (
                    <>
                      <div style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: clocked ? '#991b1b' : '#166534', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                      Wait...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined" style={{fontSize:16}}>
                        {clocked ? 'logout' : 'login'}
                      </span>
                      {clocked ? 'Punch Out' : 'Punch In'}
                    </>
                  )}
                </button>
              </div>
            );
          })()}
        </div>
        )
      ) : view === 'chat' && activeContact ? (
        // Individual Chat Header
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'0 16px',height:64,background:'#fff',borderBottom: '1px solid #e2e8f0',position:'sticky',top:0,zIndex:50,boxShadow: '0 2px 10px rgba(15,23,42,0.03)'}}>
          <button onClick={() => setActiveContact(null)} style={{background:C.bg,border: '1px solid #e2e8f0',borderRadius:10,width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0}}>
            <span className="material-symbols-outlined" style={{fontSize:20,color:C.sub}}>arrow_back_ios_new</span>
          </button>
          {(() => {
            const av = getAvatarStyle(activeContact);
            return (
              <div style={{
                width:40,
                height:40,
                borderRadius:'50%',
                background: av.bg,
                border:`1.5px solid ${av.border}`,
                display:'flex',
                alignItems:'center',
                justifyContent:'center',
                fontSize: av.isIcon ? 20 : 14,
                fontWeight:800,
                color: av.color,
                flexShrink:0
              }}>
                {av.isIcon ? (
                  <span className="material-symbols-outlined" style={{fontSize:20, color:av.color}}>{av.icon}</span>
                ) : (
                  getContactInitials(activeContact.name)
                )}
              </div>
            );
          })()}
          <div style={{flex:1, overflow:'hidden'}}>
            <p style={{margin:0,fontSize:15,fontWeight:800,color:C.text,whiteSpace:'nowrap',textOverflow:'ellipsis',overflow:'hidden'}}>{activeContact.name}</p>
            <p style={{margin:0,fontSize:11,color:C.muted}}>{activeContact.role}</p>
          </div>
          {activeContact.phone && (
            <a href={`tel:${activeContact.phone}`} title={`Call ${activeContact.name}`} style={{background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0891b2', textDecoration: 'none'}}>
              <span className="material-symbols-outlined" style={{fontSize: 18}}>call</span>
            </a>
          )}
          <button onClick={openReminder} style={{background: activeContact.reminder ? '#fef3c7' : '#f8fafc', border: `1px solid ${activeContact.reminder ? '#fde68a' : '#e2e8f0'}`, borderRadius: 10, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: activeContact.reminder ? '#b45309' : '#475569', fontSize: 12, fontWeight: 700, fontFamily: 'inherit'}}>
            <span className="material-symbols-outlined" style={{fontSize:16}}>{activeContact.reminder ? 'notifications_active' : 'notifications'}</span>
          </button>
        </div>
      ) : ['foodMenu', 'manage_tenants', 'manage_rooms', 'complaints', 'student_leaves', 'visitor_log', 'manage_staff', 'mess_headcount', 'approvals', 'manage_vendors'].includes(view) ? null : (
        // Inner page header
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'0 16px',height:58,background:'#fff',borderBottom: '1px solid #e2e8f0',position:'sticky',top:0,zIndex:50,boxShadow: '0 4px 16px rgba(15,23,42,0.05)'}}>
          <button onClick={()=>setView('home')} style={{background:'#fff',border: '1px solid #e2e8f0',borderRadius:10,width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,boxShadow: '0 2px 8px rgba(15,23,42,0.04)'}}>
            <span className="material-symbols-outlined" style={{fontSize:20,color:'#000'}}>arrow_back_ios_new</span>
          </button>
          <p style={{flex:1,margin:0,fontSize:18,fontWeight:900,color:'#000'}}>
            {view==='work'?'My Work':view==='history'?'Work History':view==='itemreq'?'Request Supplies':view==='inventory'?'Inventory & Petty Cash':view==='inout'?'Attendance':view==='salary'?'Salary & Pay':view==='items'?'Item List':view==='chat'?'Chat':view==='performance'?'Performance':view==='meter_reading'?'Meter Reading':view==='requests'?'Requests':view==='enquiry'?'Enquiries':view==='add_tenant'?'Add New Tenant':view==='cookVendor'?'Kitchen Purchases & Vendors':'My Profile'}
          </p>
          {view==='items' && (
            <button onClick={()=>setShowDemandForm(true)} style={{background:C.primary,border: `1.5px solid ${C.border}`,borderRadius:10,padding:'6px 10px',color:'#000',fontSize:11,fontWeight:800,cursor:'pointer',display:'flex',alignItems:'center',gap:4,boxShadow: '0 2px 8px rgba(15,23,42,0.04)'}}>
              <span className="material-symbols-outlined" style={{fontSize:15}}>add</span>
              Demand
            </button>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          HOME VIEW
         ══════════════════════════════════════════════════════════════════════ */}
      {view === 'home' && (
        <div style={{padding:'16px 14px', paddingBottom:'calc(110px + env(safe-area-inset-bottom, 0px))'}}>

          {/* Modules Grid */}
          {(() => {
            const isManager = staffRole === 'Manager';
            const managerModules = [
              { id: 'manage_tenants', label: 'Tenants',       desc: 'Residents',   icon: 'groups',                 gradient: 'linear-gradient(135deg,#f59e0b,#d97706)' },
              { id: 'manage_rooms',   label: 'Rooms & Beds',  desc: 'Spaces',      icon: 'meeting_room',           gradient: 'linear-gradient(135deg,#10b981,#059669)' },
              { id: 'complaints',     label: 'Complaints',    desc: 'Issues',      icon: 'report_problem',         gradient: 'linear-gradient(135deg,#dc2626,#b91c1c)', badgeCount: tickets.filter(t => t.status === 'Active' || t.status === 'Pending' || t.status === 'Open').length },
              { id: 'mess_headcount', label: 'Live Mess',     desc: 'Headcount',   icon: 'restaurant',             gradient: 'linear-gradient(135deg,#f59e0b,#d97706)' },
              { id: 'manage_vendors', label: 'Vendors',       desc: 'Suppliers',   icon: 'storefront',             gradient: 'linear-gradient(135deg,#8b5cf6,#7c3aed)' },
              ...(hasDeliveryDuty ? [{ id: 'delivery_orders', label: 'Delivery', desc: 'Orders', icon: 'two_wheeler', gradient: 'linear-gradient(135deg,#ffedd5,#ea580c)' }] : []),
              { id: 'student_leaves', label: 'Leaves',        desc: 'Requests',    icon: 'event_busy',             gradient: 'linear-gradient(135deg,#0891b2,#0e7490)' },
              { id: 'visitor_log',    label: 'Visitors',      desc: 'Gate Log',    icon: 'recent_actors',          gradient: 'linear-gradient(135deg,#10b981,#047857)' },
              { id: 'manage_staff',   label: 'Staff & Work',  desc: 'HR & Duty',   icon: 'badge',                  gradient: 'linear-gradient(135deg,#f43f5e,#e11d48)' },
              { id: 'approvals',      label: 'Approvals',     desc: 'Room Moves',  icon: 'verified',               gradient: 'linear-gradient(135deg,#eab308,#ca8a04)' },
              { id: 'inout',          label: 'Attendance',    desc: 'My Clock',    icon: 'schedule',               gradient: 'linear-gradient(135deg,#10b981,#059669)' },
              { id: 'foodMenu',       label: 'Food Menu',     desc: 'Weekly Menu', icon: 'restaurant_menu',        gradient: 'linear-gradient(135deg,#a855f7,#7e22ce)' },
              { id: 'enquiry',        label: 'Leads',         desc: 'Admissions',  icon: 'contact_support',        gradient: 'linear-gradient(135deg,#06b6d4,#0891b2)', badgeCount: enquiries.filter(e => e.status === 'New' || e.status === 'New Lead').length },
              { id: 'add_tenant',     label: 'Add Tenant',    desc: 'Registration',icon: 'person_add',             gradient: 'linear-gradient(135deg,#10b981,#059669)' },
              { id: 'meter_reading',  label: 'Meter',         desc: 'Readings',    icon: 'electric_meter',         gradient: 'linear-gradient(135deg,#06b6d4,#0891b2)' },
              { id: 'inventory',      label: 'Inventory',     desc: 'Stock & Cash',icon: 'account_balance_wallet', gradient: 'linear-gradient(135deg,#ec4899,#db2777)' },
              { id: 'cookVendor',     label: 'Kitchen POs',   desc: 'Orders',      icon: 'local_shipping',         gradient: 'linear-gradient(135deg,#6366f1,#4f46e5)' },
              { id: 'chat',           label: 'Chat',          desc: 'Messages',    icon: 'forum',                  gradient: 'linear-gradient(135deg,#0ea5e9,#0284c7)' },
              { id: 'salary',         label: 'Salary',        desc: 'Pay Slips',   icon: 'payments',               gradient: 'linear-gradient(135deg,#eab308,#ca8a04)' },
              { id: 'requests',       label: 'Requests',      desc: 'Approvals',   icon: 'approval',               gradient: 'linear-gradient(135deg,#8b5cf6,#7c3aed)' },
            ];

            const workerModules = [
              ...(hasDeliveryDuty ? [{id:'delivery_orders', label:'Delivery', icon:'two_wheeler', bg:'#ffedd5', c:'#ea580c'}] : []),
              {id:'work',           label:'My Work',        icon:'home_work',              bg:'#eef2ff', c:'#6366f1'},
              {id:'inventory',      label:'Inventory',      icon:'account_balance_wallet', bg:'#fdf2f8', c:'#ec4899'},
              {id:'inout',          label:'Attendance',     icon:'schedule',               bg:'#f0fdf4', c:'#10b981'},
              {id:'salary',         label:'Salary',         icon:'payments',               bg:'#fefce8', c:'#eab308'},
              {id:'chat',           label:'Chat',           icon:'forum',                  bg:'#f0f9ff', c:'#0ea5e9'},
              {id:'performance',    label:'Performance',    icon:'star',                   bg:'#fff1f2', c:'#f43f5e'},
              ...(staffRole === 'Electrician' ? [{id:'meter_reading', label:'Meter', icon:'electric_meter', bg:'#ecfeff', c:'#06b6d4'}] : []),
              {id:'requests',       label:'Requests',       icon:'approval',               bg:'#f5f3ff', c:'#8b5cf6'},
              ...(staffRole === 'Cook' ? [
                {id:'foodMenu',     label:'Food Menu',      icon:'restaurant_menu',        bg:'#ede9fe', c:'#a78bfa'},
                {id:'menu_history', label:'Menu History',   icon:'history',                bg:'#fdf4ff', c:'#c026d3'},
                {id:'cookVendor',   label:'Vendor Order',   icon:'storefront',             bg:'#ecfeff', c:'#0891b2'},
              ] : []),
            ];

            const allModules = isManager ? managerModules : workerModules;
            const displayedModules = (isManager && !showAllModules)
              ? allModules.slice(0, 8)
              : allModules;

            return (
              <>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14}}>
                  <p style={{fontFamily:"'Bricolage Grotesque',sans-serif", fontWeight:700, fontSize:18, color:'#0f172a', margin:0}}>Modules</p>
                  {isManager && allModules.length > 8 && (
                    <span 
                      onClick={() => setShowAllModules(prev => !prev)} 
                      style={{fontSize:12, fontWeight:700, color:'#0891b2', cursor:'pointer', display:'flex', alignItems:'center', gap:2}}
                    >
                      {showAllModules ? 'See less ▴' : `See all (${allModules.length}) ▾`}
                    </span>
                  )}
                  {!isManager && allModules.length > 8 && (
                    <span 
                      onClick={() => setShowAllModules(prev => !prev)} 
                      style={{fontSize:12, fontWeight:800, color:C.primaryDk, cursor:'pointer', display:'flex', alignItems:'center', gap:2}}
                    >
                      {showAllModules ? 'See less ▴' : `See all (${allModules.length}) ▾`}
                    </span>
                  )}
                </div>

                <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10, marginBottom: isManager ? 16 : (allModules.length > 8 ? 10 : 20)}}>
                  {displayedModules.map(m => (
                    <button key={m.id} onClick={() => {
                      if (m.id === 'menu_history') {
                        fetchCookMenuHistory();
                        setShowMenuHistoryModal(true);
                        return;
                      }
                      if (m.id === 'add_tenant') {
                        setMgr_serviceModal(true);
                        setMgr_addTenantStep(1);
                        setMgr_addTenantForm(prev => ({...prev, serviceType: 'all_services'}));
                      }
                      setView(m.id);
                    }}
                      style={isManager ? {
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 6,
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: 16,
                        padding: '14px 6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                        position: 'relative'
                      } : {
                        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6, background:'#fff', border:`1px solid ${C.border}`, borderRadius:20, padding:'12px 4px 10px', cursor:'pointer', boxShadow:'0 4px 12px rgba(120, 104, 10, 0.04)', minHeight:88, outline:'none', transition:'all 0.15s'
                      }}>
                      {isManager && m.badgeCount > 0 && (
                        <div style={{ position: 'absolute', top: -6, right: -6, minWidth: 20, height: 20, padding: '0 6px', borderRadius: 10, background: '#ef4444', color: 'white', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(239,68,68,0.3)', zIndex: 5, boxSizing: 'border-box' }}>
                          {m.badgeCount > 99 ? '99+' : m.badgeCount}
                        </div>
                      )}
                      <div style={{
                        width:40, height:40, borderRadius:12,
                        background: isManager ? m.gradient : m.bg,
                        display:'flex', alignItems:'center', justifyContent:'center'
                      }}>
                        <span className="material-symbols-outlined" style={{fontSize:20, color: isManager ? 'white' : m.c}}>{m.icon}</span>
                      </div>
                      <span style={{fontSize:11, fontWeight:700, color: isManager ? '#1e293b' : C.text, textAlign:'center', lineHeight:1.2}}>{m.label}</span>
                      {isManager && <span style={{fontSize:10, color:'#94a3b8', textAlign:'center', lineHeight:1}}>{m.desc}</span>}
                    </button>
                  ))}
                </div>

                {isManager && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 22 }}>
                    <button
                      onClick={() => setView('complaints')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        background: '#fff1f2',
                        border: '1px solid #fecdd3',
                        borderRadius: 14,
                        padding: '12px 14px',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ color: '#e11d48', fontSize: 22 }}>report</span>
                      <div>
                        <p style={{ fontWeight: 800, color: '#0f172a', fontSize: 13, margin: 0 }}>Complaints</p>
                        <p style={{ fontSize: 11, color: '#e11d48', fontWeight: 600, margin: 0 }}>
                          {tickets.filter(t => t.status === 'Active' || t.status === 'Pending' || t.status === 'Open').length} Open Issues
                        </p>
                      </div>
                    </button>

                    <button
                      onClick={() => setView('mess_headcount')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        background: '#ede9fe',
                        border: '1px solid #ddd6fe',
                        borderRadius: 14,
                        padding: '12px 14px',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ color: '#7c3aed', fontSize: 22 }}>restaurant</span>
                      <div>
                        <p style={{ fontWeight: 800, color: '#0f172a', fontSize: 13, margin: 0 }}>Live Mess</p>
                        <p style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600, margin: 0 }}>Check Headcount</p>
                      </div>
                    </button>
                  </div>
                )}

                {!isManager && allModules.length > 8 && (
                  <div 
                    onClick={() => setShowAllModules(prev => !prev)} 
                    style={{
                      display:'flex',
                      alignItems:'center',
                      justifyContent:'center',
                      gap:6,
                      background:'#f8fafc',
                      border:`1px dashed ${C.border}`,
                      borderRadius:14,
                      padding:'8px 14px',
                      cursor:'pointer',
                      marginBottom:18,
                      fontSize:12,
                      fontWeight:800,
                      color: showAllModules ? C.muted : C.primaryDk,
                      transition:'all 0.15s'
                    }}
                  >
                    <span>{showAllModules ? 'Show less modules' : `See all ${allModules.length} modules`}</span>
                    <span className="material-symbols-outlined" style={{fontSize:16}}>
                      {showAllModules ? 'expand_less' : 'expand_more'}
                    </span>
                  </div>
                )}
              </>
            );
          })()}

          {/* Need Supplies Card (Worker only) */}
          {staffRole !== 'Manager' && (
            <div onClick={openItemRequest} style={{
              background: '#ffffff',
              border: `1px solid ${C.border}`,
              borderRadius: 18,
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(120, 104, 10, 0.03)',
              marginBottom: 20
            }}>
              <div style={{width:32, height:32, borderRadius:50, background: '#fefce8', display:'flex', alignItems:'center', justifyContent:'center'}}>
                <span className="material-symbols-outlined" style={{fontSize:18, color: '#ca8a04'}}>shopping_cart</span>
              </div>
              <div>
                <p style={{margin:0, fontSize:13, fontWeight:800, color: C.text}}>Need Supplies</p>
                <p style={{margin:0, fontSize:10.5, fontWeight:700, color: C.muted}}>Request Materials</p>
              </div>
            </div>
          )}

          {/* Outstanding Work / Tasks section */}
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
            <p style={{margin:0, fontSize:15, fontWeight:900, color: staffRole === 'Manager' ? '#0f172a' : C.text}}>Today's Tasks</p>
            <span onClick={() => setView('work')} style={{fontSize:12, fontWeight:800, color: staffRole === 'Manager' ? '#0891b2' : C.primaryDk, cursor:'pointer'}}>See all ▾</span>
          </div>

          <div style={{display:'flex', flexDirection:'column', gap:10}}>
            {/* Cleaner Outstanding list */}
            {staffRole === 'Cleaner' && cleaning.filter(c => !c.done).slice(0, 3).map(c => (
              <div key={c.id} onClick={() => setView('work')} style={{background:'#fff', border:`1px solid ${C.border}`, borderRadius:18, padding:14, display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow:'0 4px 12px rgba(120, 104, 10, 0.03)', cursor:'pointer'}}>
                <div style={{display:'flex', alignItems:'center', gap:12}}>
                  <div style={{width:40, height:40, borderRadius:12, background:'#fefce8', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20}}>🧹</div>
                  <div>
                    <h4 style={{margin:0, fontSize:14, fontWeight:800, color:C.text}}>Room {c.room}</h4>
                    <p style={{margin:0, fontSize:11, color:C.muted}}>Housekeeping slot · {c.type}</p>
                  </div>
                </div>
                <span style={{fontSize:11, fontWeight:800, padding:'4px 10px', borderRadius:10, background:'#fee2e2', color:'#dc2626'}}>Pending</span>
              </div>
            ))}

            {/* Unified Admin Assigned Tasks */}
            {tasks.filter(t => t.status === 'Pending').slice(0, 3).map(t => (
              <div key={t.id} onClick={() => setView('work')} style={{background:'#fff', border: staffRole === 'Manager' ? '1px solid #e2e8f0' : `1px solid ${C.border}`, borderRadius:16, padding:14, display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow:'0 1px 4px rgba(0,0,0,0.04)', cursor:'pointer'}}>
                <div style={{display:'flex', alignItems:'center', gap:12}}>
                  <div style={{width:40, height:40, borderRadius:12, background: staffRole === 'Manager' ? '#ecfeff' : '#fefce8', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20}}>📋</div>
                  <div style={{flex:1, minWidth:0}}>
                    <h4 style={{margin:0, fontSize:14, fontWeight:800, color: staffRole === 'Manager' ? '#0f172a' : C.text, whiteSpace:'nowrap', textOverflow:'ellipsis', overflow:'hidden', maxWidth:220}}>{t.title}</h4>
                    <p style={{margin:0, fontSize:11, color: staffRole === 'Manager' ? '#64748b' : C.muted}}>{t.description ? t.description.substring(0,25)+'...' : 'Admin Task'}</p>
                  </div>
                </div>
                <span style={{fontSize:11, fontWeight:800, padding:'4px 10px', borderRadius:10, background: '#fee2e2', color: '#dc2626'}}>Pending</span>
              </div>
            ))}

            {staffRole === 'Manager' && tasks.filter(t => t.status === 'Pending').length === 0 && (
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '16px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#64748b' }}>🎉 All manager tasks are up to date</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MY WORK (Role-Specific)
         ══════════════════════════════════════════════════════════════════════ */}
      
      {/* ══════════════════════════════════════════════════════════════════════
          COOK HISTORY VIEW (GPAY STYLE)
         ══════════════════════════════════════════════════════════════════════ */}
      {view === 'cookHistory' && (() => {
        // Generate robust mock history from the 40 students
        const mockCookHistory = [];
        const mealsList = ['Breakfast', 'Lunch', 'Snacks', 'Dinner'];
        const statList = ['Requested', 'To Pack', 'Extra Plate', 'Eaten', 'Not Eaten'];
        const uniqueFoodsSet = new Set(['Poha', 'Jalebi', 'Tea', 'Rajma Chawal', 'Roti, Salad', 'Samosa', 'Paneer Butter Masala', 'Aloo Paratha', 'Dal Makhani']);
        let _id = 1;
        
        // Generate a random history for all 40 students
        students.forEach((s, idx) => {
           // assign a few random meals to each student
           const mealCount = (idx % 3) + 1; // 1 to 3 meals
           for(let i=0; i<mealCount; i++) {
              const meal = mealsList[(idx + i) % mealsList.length];
              const status = statList[(idx * 2 + i) % statList.length];
              const food = Array.from(uniqueFoodsSet)[(idx + i) % uniqueFoodsSet.size];
              mockCookHistory.push({
                 id: _id++,
                 student: s.name,
                 meal: meal,
                 food: food,
                 status: status,
                 date: '26 Jul',
                 amount: 1
              });
           }
        });
        
        // Extract all unique foods for filter
        const uniqueFoods = ['All Food Items', ...Array.from(uniqueFoodsSet)];
        
        const filteredHist = mockCookHistory.filter(item => {
           if(cookHistStatus !== 'All' && item.status !== cookHistStatus) return false;
           if(cookHistMeal !== 'All Meals' && item.meal !== cookHistMeal) return false;
           if(cookHistFood !== 'All Food Items' && item.food !== cookHistFood) return false;
           return true;
        });

        return (
          <div style={{padding:'0 0 calc(32px + env(safe-area-inset-bottom, 0px))', display:'flex', flexDirection:'column', height:'100%'}}>
            {/* Header */}
            <div style={{background:C.primary, padding:'20px 14px 14px', position:'sticky', top:0, zIndex:10, display:'flex', alignItems:'center', gap:10}}>
              <button onClick={() => setView('work')} style={{background:'transparent', border:'none', padding:0, margin:0, cursor:'pointer', display:'flex', alignItems:'center'}}>
                <span className="material-symbols-outlined" style={{fontSize:24, color:'#000'}}>arrow_back</span>
              </button>
              <h2 style={{margin:0, fontSize:18, fontWeight:900, color:'#000'}}>Food Transaction History</h2>
            </div>
            
            {/* Filters */}
            <div style={{padding:'14px', display:'flex', gap:8, overflowX:'auto', borderBottom:'1px solid #f1f5f9', background:'#fff', whiteSpace:'nowrap'}}>
              {['All', 'Requested', 'To Pack', 'Extra Plate', 'Eaten', 'Not Eaten'].map(f => (
                <button key={f} onClick={() => setCookHistStatus(f)} style={{padding:'6px 14px', borderRadius:20, border:'1px solid #e2e8f0', background: cookHistStatus===f?'#1a1500':'#fff', color:cookHistStatus===f?'#fde047':'#1e293b', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit'}}>
                  {f}
                </button>
              ))}
              <div style={{width:1, background:'#e2e8f0', margin:'0 4px'}} />
              <select value={cookHistMeal} onChange={e => setCookHistMeal(e.target.value)} style={{padding:'6px 12px', borderRadius:20, border:'1px solid #e2e8f0', background:'#fff', color:'#1e293b', fontSize:12, fontWeight:700, outline:'none', cursor:'pointer', fontFamily:'inherit'}}>
                <option>All Meals</option>
                <option>Breakfast</option>
                <option>Lunch</option>
                <option>Snacks</option>
                <option>Dinner</option>
              </select>
              <select value={cookHistFood} onChange={e => setCookHistFood(e.target.value)} style={{padding:'6px 12px', borderRadius:20, border:'1px solid #e2e8f0', background:'#fff', color:'#1e293b', fontSize:12, fontWeight:700, outline:'none', cursor:'pointer', fontFamily:'inherit'}}>
                {uniqueFoods.map(food => <option key={food}>{food}</option>)}
              </select>
            </div>

            {/* List */}
            <div style={{padding:'14px', display:'flex', flexDirection:'column', gap:20}}>
              {filteredHist.length === 0 && (
                <div style={{textAlign:'center', padding:'30px 0'}}>
                  <p style={{margin:0, fontSize:14, color:'#64748b', fontWeight:700}}>No history found.</p>
                </div>
              )}
              {(() => {
                 const groupedHist = filteredHist.reduce((acc, item) => {
                    if (!acc[item.status]) acc[item.status] = [];
                    acc[item.status].push(item);
                    return acc;
                 }, {});

                 return Object.keys(groupedHist).map(statusKey => {
                    const groupItems = groupedHist[statusKey];
                    return (
                       <div key={statusKey} style={{display:'flex', flexDirection:'column', gap:12}}>
                          <h3 style={{margin:0, fontSize:16, fontWeight:900, color:'#000', paddingLeft:8}}>{statusKey} {groupItems.length}</h3>
                          {groupItems.map(item => {
                             const getColors = (status) => {
                               switch(status) {
                                 case 'Eaten': return { bg:'#dcfce7', c:'#15803d', icon:'restaurant' };
                                 case 'Not Eaten': return { bg:'#fee2e2', c:'#b91c1c', icon:'no_meals' };
                                 case 'To Pack': return { bg:'#fef08a', c:'#a16207', icon:'takeout_dining' };
                                 case 'Extra Plate': return { bg:'#e0e7ff', c:'#4338ca', icon:'local_dining' };
                                 default: return { bg:'#f1f5f9', c:'#475569', icon:'notifications' };
                               }
                             };
                             const clr = getColors(item.status);
                             const isExpanded = expandedCookHistId === item.id;
                             const isClickable = item.status === 'To Pack' || item.status === 'Extra Plate';
                             
                             return (
                               <div key={item.id} onClick={() => isClickable && setExpandedCookHistId(isExpanded ? null : item.id)} style={{display:'flex', flexDirection:'column', background:'#fff', borderRadius:16, border:'1px solid #f1f5f9', boxShadow:'0 2px 8px rgba(0,0,0,0.02)', cursor: isClickable ? 'pointer' : 'default', overflow:'hidden', transition:'all 0.2s'}}>
                                 <div style={{display:'flex', alignItems:'center', gap:14, padding:'14px 16px'}}>
                                   <div style={{width:42, height:42, borderRadius:21, background: clr.bg, display:'flex', alignItems:'center', justifyContent:'center'}}>
                                     <span className="material-symbols-outlined" style={{fontSize:20, color: clr.c}}>{clr.icon}</span>
                                   </div>
                                   <div style={{flex:1}}>
                                     <p style={{margin:0, fontSize:15, fontWeight:800, color:'#1a1500'}}>{item.student}</p>
                                     <p style={{margin:'2px 0 0', fontSize:12, fontWeight:600, color:'#64748b'}}>{item.date} · {item.meal} {cookHistFood !== 'All Food Items' ? '· ' + item.food : ''}</p>
                                   </div>
                                   <div style={{textAlign:'right', display:'flex', flexDirection:'column', alignItems:'flex-end'}}>
                                     <p style={{margin:0, fontSize:13, fontWeight:800, color: clr.c}}>{item.status}</p>
                                     {isClickable && <span className="material-symbols-outlined" style={{fontSize:16, color:C.muted, marginTop:4}}>{isExpanded ? 'expand_less' : 'expand_more'}</span>}
                                   </div>
                                 </div>
                                 
                                 {isExpanded && item.status === 'To Pack' && (
                                    <div style={{padding:'12px 16px', background:'#f8fafc', borderTop:'1px solid #f1f5f9', fontSize:13, color:'#475569', fontWeight:600}}>
                                       <div style={{display:'flex', justifyContent:'space-between', marginBottom:6}}><span>Date Requested:</span> <span style={{fontWeight:800, color:'#000'}}>{item.date}</span></div>
                                       <div style={{display:'flex', justifyContent:'space-between'}}><span>Food Items:</span> <span style={{fontWeight:800, color:'#000'}}>{item.food} (x1)</span></div>
                                    </div>
                                 )}
                                 
                                 {isExpanded && item.status === 'Extra Plate' && (
                                    <div style={{padding:'12px 16px', background:'#f8fafc', borderTop:'1px solid #f1f5f9', fontSize:13, color:'#475569', fontWeight:600}}>
                                       <div style={{display:'flex', justifyContent:'space-between', marginBottom:6}}><span>Visitor Name:</span> <span style={{fontWeight:800, color:'#000'}}>Guest of {item.student}</span></div>
                                       <div style={{display:'flex', justifyContent:'space-between', marginBottom:6}}><span>Food Items:</span> <span style={{fontWeight:800, color:'#000'}}>{item.food} (x1)</span></div>
                                       <div style={{display:'flex', justifyContent:'space-between', borderTop:'1px dashed #cbd5e1', paddingTop:6, marginTop:2}}><span>Total Charge:</span> <span style={{fontWeight:900, color:'#10b981'}}>₹80</span></div>
                                    </div>
                                 )}
                               </div>
                             );
                          })}
                       </div>
                    );
                 });
              })()}
            </div>
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════════════════════════
          MANAGER VIEWS: TENANTS, ROOMS, COMPLAINTS, LEAVES, VISITORS, STAFF, MESS, APPROVALS
         ══════════════════════════════════════════════════════════════════════ */}
      {view === 'manage_tenants' && (
        <ManagerTenantsView
          adminId={user?.ownerUid}
          onBack={() => setView('home')}
          onAddTenant={() => {
            setMgr_serviceModal(true);
            setMgr_addTenantStep(1);
            setMgr_addTenantForm(prev => ({...prev, serviceType: 'all_services'}));
            setView('add_tenant');
          }}
          showToast={showToast}
        />
      )}

      {view === 'manage_rooms' && (
        <ManagerRoomsView
          adminId={user?.ownerUid}
          onBack={() => setView('home')}
          showToast={showToast}
        />
      )}

      {view === 'complaints' && (
        <ManagerComplaintsView
          adminId={user?.ownerUid}
          onBack={() => setView('home')}
          showToast={showToast}
        />
      )}

      {view === 'student_leaves' && (
        <ManagerLeavesView
          adminId={user?.ownerUid}
          onBack={() => setView('home')}
          showToast={showToast}
        />
      )}

      {view === 'visitor_log' && (
        <ManagerVisitorsView
          adminId={user?.ownerUid}
          onBack={() => setView('home')}
          showToast={showToast}
        />
      )}

      {view === 'manage_staff' && (
        <ManagerStaffView
          adminId={user?.ownerUid}
          onBack={() => setView('home')}
          showToast={showToast}
        />
      )}

      {view === 'mess_headcount' && (
        <ManagerMessHeadcountView
          adminId={user?.ownerUid}
          staffName={staffName}
          staffRole={staffRole}
          onBack={() => setView('home')}
          onOpenFoodMenu={() => setView('foodMenu')}
          showToast={showToast}
        />
      )}

      {view === 'approvals' && (
        <ManagerApprovalsView
          adminId={user?.ownerUid}
          onBack={() => setView('home')}
          showToast={showToast}
        />
      )}

      {view === 'manage_vendors' && (
        <ManagerVendorsView
          adminId={user?.ownerUid}
          onBack={() => setView('home')}
          showToast={showToast}
          currentStaffName={staffName}
        />
      )}

      {view === 'delivery_orders' && (
        <StaffDeliveryView
          adminId={user?.ownerUid}
          activePgId={activePgId}
          staffName={staffName}
          onBack={() => setView('home')}
          showToast={showToast}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          WEEKLY FOOD MENU
         ══════════════════════════════════════════════════════════════════════ */}
            {view === 'foodMenu' && (() => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const displayDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const selectedDateObj = new Date(selectedFoodMenuDate);
        const dayOfWeek = days[selectedDateObj.getDay()];
        const mealsForDay = weeklyFoodMenu?.[dayOfWeek] || {};

        return (
          <div style={{padding:'0 0 calc(32px + env(safe-area-inset-bottom, 0px))', display:'flex', flexDirection:'column', height:'100%'}}>
            <div style={{background:C.primary, padding:'20px 14px 14px', position:'sticky', top:0, zIndex:10, display:'flex', flexDirection:'column', gap:16}}>
              <div style={{display:'flex', alignItems:'center', justifyContent: 'space-between', width: '100%'}}>
                <div style={{display:'flex', alignItems:'center', gap:10}}>
                  <button onClick={() => setView('home')} style={{background:'transparent', border:'none', padding:0, margin:0, cursor:'pointer', display:'flex', alignItems:'center'}}>
                    <span className="material-symbols-outlined" style={{fontSize:24, color:'#000'}}>arrow_back</span>
                  </button>
                  <h2 style={{margin:0, fontSize:18, fontWeight:900, color:'#000'}}>Food Menu Timetable</h2>
                </div>
                <button 
                  onClick={() => {
                    fetchCookMenuHistory();
                    setShowMenuHistoryModal(true);
                  }}
                  style={{
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 800,
                    color: '#6d28d9',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                  }}
                >
                  <span className="material-symbols-outlined" style={{fontSize:16, color: '#7c3aed'}}>history</span> History
                </button>
              </div>
              
              <div style={{display:'flex', background:'#f1f5f9', borderRadius:12, padding:4}}>
                <button 
                  onClick={() => setCookMenuTab('date')}
                  style={{flex:1, padding:'8px 0', borderRadius:10, border:'none', fontSize:14, fontWeight:800, background: cookMenuTab === 'date' ? '#fff' : 'transparent', color: cookMenuTab === 'date' ? '#0f172a' : '#64748b', boxShadow: cookMenuTab === 'date' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', cursor:'pointer', transition:'all 0.2s'}}>
                  By Date
                </button>
                <button 
                  onClick={() => setCookMenuTab('weekly')}
                  style={{flex:1, padding:'8px 0', borderRadius:10, border:'none', fontSize:14, fontWeight:800, background: cookMenuTab === 'weekly' ? '#fff' : 'transparent', color: cookMenuTab === 'weekly' ? '#0f172a' : '#64748b', boxShadow: cookMenuTab === 'weekly' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', cursor:'pointer', transition:'all 0.2s'}}>
                  Full Week
                </button>
              </div>
            </div>
            
            <div style={{padding:'14px', display:'flex', flexDirection:'column', gap:16}}>
              
              {cookMenuTab === 'date' && (
                <>
                  {/* Date Picker */}
                  <div style={{background:'#fff', borderRadius:16, border: '1px solid #e2e8f0', padding:16, boxShadow: '0 4px 16px rgba(15,23,42,0.05)', display:'flex', alignItems:'center', gap:10}}>
                    <div style={{width:44, height:44, borderRadius:22, background:'#fefce8', display:'flex', alignItems:'center', justifyContent:'center'}}>
                      <span className="material-symbols-outlined" style={{fontSize:24, color:'#a16207'}}>calendar_month</span>
                    </div>
                    <div style={{flex:1}}>
                      <p style={{margin:0, fontSize:13, fontWeight:800, color:C.muted, textTransform:'uppercase'}}>Select Date</p>
                      <input 
                        type="date" 
                        value={selectedFoodMenuDate} 
                        onChange={e => setSelectedFoodMenuDate(e.target.value)} 
                        style={{border:'none', background:'transparent', fontSize:16, fontWeight:900, color:'#1e293b', outline:'none', width:'100%', fontFamily:'inherit', cursor:'pointer', marginTop:2}} 
                      />
                    </div>
                  </div>

                  {/* Day's Menu */}
                  <div style={{background:'#fff', borderRadius:16, border: '1px solid #e2e8f0', padding:16, boxShadow: '0 4px 16px rgba(15,23,42,0.05)'}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', margin:'0 0 12px', borderBottom:'1px solid #f1f5f9', paddingBottom:8}}>
                      <div>
                        <h3 style={{margin:0, fontSize:16, fontWeight:900, color:'#000'}}>{dayOfWeek}'s Menu</h3>
                        {lastMenuEdit && (
                          <p style={{margin:'2px 0 0', fontSize:11, color:C.muted}}>
                            Last edited by <span style={{fontWeight:800, color:lastMenuEdit.editorRole==='Cook'?'#16a34a':'#7c3aed'}}>{lastMenuEdit.editedBy} ({lastMenuEdit.editorRole})</span>
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {['Breakfast', 'Lunch', 'Snacks', 'Dinner'].map(meal => {
                      const mealDishes = (mealsForDay?.[meal] || '').split(/[,;]/).map(s => s.trim()).filter(Boolean);
                      const dishImgs = foodItemImages?.[dayOfWeek]?.[meal] || {};

                      return (
                        <div key={meal} style={{padding:'10px 0', borderBottom:'1px solid #f8fafc'}}>
                          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:10}}>
                            <div style={{flex:1, minWidth:0}}>
                              <span style={{fontSize:11, fontWeight:800, color:C.muted, textTransform:'uppercase'}}>{meal}</span>
                              <p style={{margin:'2px 0 0', fontSize:14, fontWeight:700, color:'#1e293b'}}>{mealsForDay?.[meal] || 'Not Set'}</p>
                            </div>
                            <button 
                              onClick={() => openCookEditModal(dayOfWeek, meal)}
                              style={{background:C.bg, border: '1px solid #e2e8f0', borderRadius:10, padding:'6px 12px', fontSize:12, fontWeight:800, color:C.sub, cursor:'pointer', display:'flex', alignItems:'center', gap:4, flexShrink:0}}>
                              <span className="material-symbols-outlined" style={{fontSize:14}}>photo_camera</span> Edit
                            </button>
                          </div>

                          {mealDishes.length > 0 && (
                            <div style={{display:'flex', gap:8, overflowX:'auto', WebkitOverflowScrolling:'touch', marginTop:8, paddingBottom:2}}>
                              {mealDishes.map((dish, i) => {
                                const dImg = dishImgs[dish] || getDishPresetImage(dish);
                                return (
                                  <div key={i} style={{flexShrink:0, display:'flex', alignItems:'center', gap:6, background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:8, padding:'4px 8px'}}>
                                    {dImg ? (
                                      <img src={dImg} alt={dish} style={{width:24, height:24, borderRadius:6, objectFit:'cover'}} />
                                    ) : (
                                      <div style={{width:24, height:24, borderRadius:6, background:'#e2e8f0', display:'flex', alignItems:'center', justifyContent:'center'}}>
                                        <span className="material-symbols-outlined" style={{fontSize:14, color:'#64748b'}}>restaurant</span>
                                      </div>
                                    )}
                                    <span style={{fontSize:11, fontWeight:700, color:'#334155'}}>{dish}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {cookMenuTab === 'weekly' && (
                <div style={{display:'flex', flexDirection:'column', gap:16}}>
                  {displayDays.map(dDay => {
                    const dMeals = weeklyFoodMenu?.[dDay] || {};
                    return (
                      <div key={dDay} style={{background:'#fff', borderRadius:16, border: '1px solid #e2e8f0', padding:16, boxShadow: '0 4px 16px rgba(15,23,42,0.05)'}}>
                        <h3 style={{margin:'0 0 12px', fontSize:16, fontWeight:900, color:'#166534', borderBottom:'1px solid #f1f5f9', paddingBottom:8}}>{dDay}</h3>
                        <div style={{display:'flex', flexDirection:'column', gap:12}}>
                          {['Breakfast', 'Lunch', 'Snacks', 'Dinner'].map(meal => {
                            const dPhoto = foodMenuImages?.[dDay]?.[meal];
                            return (
                              <div key={meal} style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:10}}>
                                {dPhoto && (
                                  <img src={dPhoto} alt={meal} style={{width:44, height:44, borderRadius:10, objectFit:'cover', border:'1px solid #e2e8f0', flexShrink:0}} />
                                )}
                                <div style={{flex:1, minWidth:0}}>
                                  <div style={{display:'flex', alignItems:'center', gap:6}}>
                                    <span style={{fontSize:11, fontWeight:800, color:C.muted, textTransform:'uppercase'}}>{meal}</span>
                                    {dPhoto && <span style={{fontSize:10, background:'#dcfce7', color:'#166534', padding:'1px 5px', borderRadius:4, fontWeight:800}}>📷 Photo</span>}
                                  </div>
                                  {(() => {
                                    const dItems = (dMeals?.[meal] || '').split(/[,;]/).map(s => s.trim()).filter(Boolean);
                                    const dItemImgs = foodItemImages?.[dDay]?.[meal] || {};
                                    if (dItems.length === 0) {
                                      return <p style={{margin:'4px 0 0', fontSize:13, fontWeight:600, color:C.muted}}>Not set yet</p>;
                                    }
                                    return (
                                      <div style={{display:'flex', gap:6, overflowX:'auto', WebkitOverflowScrolling:'touch', marginTop:6, paddingBottom:2}}>
                                        {dItems.map((dish, i) => {
                                          const dImg = dItemImgs[dish] || getDishPresetImage(dish);
                                          return (
                                            <div key={i} style={{flexShrink:0, display:'flex', alignItems:'center', gap:5, background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:8, padding:'3px 7px'}}>
                                              {dImg ? (
                                                <img
                                                  src={dImg}
                                                  alt={dish}
                                                  onError={(e) => {
                                                    e.currentTarget.onerror = null;
                                                    e.currentTarget.src = DEFAULT_FOOD_PLACEHOLDER;
                                                  }}
                                                  style={{width:22, height:22, borderRadius:5, objectFit:'cover'}}
                                                />
                                              ) : (
                                                <div style={{width:22, height:22, borderRadius:5, background:'#e2e8f0', display:'flex', alignItems:'center', justifyContent:'center'}}>
                                                  <span className="material-symbols-outlined" style={{fontSize:13, color:'#64748b'}}>restaurant</span>
                                                </div>
                                              )}
                                              <span style={{fontSize:11, fontWeight:700, color:'#334155'}}>{dish}</span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    );
                                  })()}
                                </div>
                                <button 
                                  onClick={() => {
                                    setEditWeeklyMenuDay(dDay);
                                    setEditWeeklyMenuMeal(meal);
                                    setEditWeeklyMenuVal(dMeals?.[meal] || '');
                                    setEditWeeklyMenuImage(foodMenuImages?.[dDay]?.[meal] || null);
                                    setShowWeeklyMenuEdit(true);
                                  }}
                                  style={{background:'#f0fdf4', border: '1px solid #bbf7d0', borderRadius:10, padding:'6px 12px', fontSize:12, fontWeight:800, color:'#16a34a', cursor:'pointer', display:'flex', alignItems:'center', gap:4, flexShrink:0}}>
                                  <span className="material-symbols-outlined" style={{fontSize:14}}>photo_camera</span> Edit
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            
          </div>
        );
      })()}

      {view === 'work' && (
        <div style={{padding:'14px 14px calc(32px + env(safe-area-inset-bottom, 0px))',display:'flex',flexDirection:'column',gap:14}}>

          {/* UNIFIED ADMIN ASSIGNED TASKS (VISIBLE TO ALL ROLES IF ANY) */}
          {tasks.length > 0 && (
            <div style={{background:'#fff', borderRadius:16, border:'1px solid #e2e8f0', padding:16, boxShadow:'0 4px 16px rgba(15,23,42,0.05)', marginBottom: 14}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14}}>
                <div>
                  <p style={{margin:0, fontSize:15, fontWeight:900, color:C.text}}>📋 Admin Assigned Tasks</p>
                  <p style={{margin:'2px 0 0', fontSize:11, color:C.muted}}>{tasks.filter(t=>t.status==='Pending').length} pending · {tasks.filter(t=>t.status==='Completed').length} done</p>
                </div>
              </div>

              <div style={{display:'flex', flexDirection:'column', gap:10}}>
                {tasks.map(t => (
                  <div key={t.id} style={{background: t.status==='Completed' ? '#f0fdf4' : '#fafafa', border: `1px solid ${t.status==='Completed' ? '#bbf7d0' : '#e2e8f0'}`, borderRadius:12, padding:14, display:'flex', justifyContent:'space-between', alignItems:'center', gap:12}}>
                    <div style={{flex:1}}>
                      <div style={{display:'flex', alignItems:'center', gap:6, marginBottom:4}}>
                        <span style={{fontSize:13, fontWeight:900, color: t.status==='Completed' ? '#15803d' : C.text, textDecoration: t.status==='Completed' ? 'line-through' : 'none'}}>{t.title}</span>
                      </div>
                      {t.description && <p style={{margin:'4px 0 0', fontSize:12, color:C.muted}}>{t.description}</p>}
                      <p style={{margin:'4px 0 0', fontSize:11, color:C.muted}}>Assigned: {new Date(t.createdAt).toLocaleDateString()}</p>
                    </div>
                    {t.status === 'Pending' ? (
                      <button onClick={()=>handleTaskDone(t)} style={{padding:'8px 12px', borderRadius:10, border:'none', background: meta.accentBg, color: meta.accent, fontSize:11, fontWeight:900, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', minWidth:60}}>
                        ✓ Done
                      </button>
                    ) : (
                      <span style={{fontSize:11, fontWeight:900, color:'#166534', background:'#dcfce7', padding:'6px 10px', borderRadius:8}}>Completed</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* COOK */}
          {staffRole === 'Cook' && (<>
            {/* LIVE MESS HEADCOUNT CARD */}
            <div style={{background: 'linear-gradient(135deg, #1e293b, #0f172a)', borderRadius:20, padding:'24px', color:'#fff', boxShadow:'0 10px 25px rgba(15,23,42,0.15)', display:'flex', flexDirection:'column', gap:16, position:'relative', overflow:'hidden', marginBottom:14}}>
               <div style={{position:'absolute', right:-10, bottom:-10, opacity:0.1, pointerEvents:'none'}}>
                  <span className="material-symbols-outlined" style={{fontSize:120}}>group</span>
               </div>
               <div>
                  <div style={{display:'flex', alignItems:'center', gap:8}}>
                     <span style={{position:'relative', display:'flex', height:10, width:10}}>
                       <span style={{animation:'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite', position:'absolute', display:'inline-flex', height:'100%', width:'100%', borderRadius:'50%', background:'#ef4444', opacity:0.75}}></span>
                       <span style={{position:'relative', display:'inline-flex', borderRadius:'50%', height:10, width:10, background:'#dc2626'}}></span>
                     </span>
                     <span style={{fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:'#f8fafc'}}>Live Headcount</span>
                  </div>
                  <h3 style={{margin:'6px 0 0', fontSize:18, fontWeight:900, color:'#f8fafc'}}>Current Meal Eaten ({activeMeal})</h3>
               </div>
               <div style={{display:'flex', alignItems:'flex-end', justifyContent:'space-between', flexWrap:'wrap', gap:12}}>
                  <div style={{display:'flex', alignItems:'baseline', gap:8}}>
                    <h1 style={{margin:0, fontSize:56, fontWeight:900, lineHeight:1, color:'#fde047'}}>
                      {Object.keys(eatenData).filter(k => k.includes(`_${activeMeal}_eaten`)).length}
                    </h1>
                    <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>
                      {(() => {
                        const curMealKey = activeMeal === 'breakfast' ? 'statusB' : activeMeal === 'lunch' ? 'statusL' : activeMeal === 'snacks' ? 'statusS' : 'statusD';
                        const onVacCount = students.filter(s => s[curMealKey] === 'onVacation').length;
                        const selfCookingCount = students.filter(s => s[curMealKey] === 'selfCooking').length;
                        const activeEaters = students.filter(s => s.foodIncluded !== false).length - onVacCount;
                        return `/ ${activeEaters} active eating${onVacCount > 0 ? ` (${onVacCount} on leave)` : ''}${selfCookingCount > 0 ? ` · ${selfCookingCount} self-cooking` : ''}`;
                      })()}
                    </span>
                  </div>
               </div>

               <div style={{display:'flex', gap:12, marginTop:8, position:'relative', zIndex:1}}>
                  <button onClick={() => { setSelectedQRMeal(activeMeal || mealTab || 'lunch'); setShowMealQR(true); }} style={{flex:1.2, background: '#10b981', color:'white', border:'none', padding:'12px', borderRadius:'14px', fontSize:14, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6, boxShadow:'0 4px 12px rgba(16,185,129,0.3)'}}>
                     <span className="material-symbols-outlined" style={{fontSize:20}}>qr_code_2</span> Generate QR
                  </button>
                  <button onClick={() => setShowManual(true)} style={{flex:1, background: 'rgba(255,255,255,0.1)', color:'white', border:'1px solid rgba(255,255,255,0.2)', padding:'12px', borderRadius:'14px', fontSize:14, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6}}>
                     <span className="material-symbols-outlined" style={{fontSize:20}}>list_alt</span> Select Manually
                  </button>
               </div>
            </div>

            <div style={{display:'flex', gap:10, marginTop:14}}>
              <button onClick={() => { const h = new Date().getHours(); let m = 'Dinner'; if (h >= 6 && h < 11) m = 'Breakfast'; else if (h >= 11 && h < 16) m = 'Lunch'; else if (h >= 16 && h < 19) m = 'Snacks'; setBMeal(m); setShowBcast(true); }} style={{flex:1, padding:13, background: C.primary, color:'#000', border: '1px solid #e2e8f0', borderRadius:14, fontSize:13, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6, boxShadow: '0 4px 16px rgba(15,23,42,0.05)', fontFamily:'inherit'}}>
                <span className="material-symbols-outlined" style={{fontSize:18}}>campaign</span>
                "Food Ready!" 📢
              </button>
              <button onClick={() => setView('cookVendor')} style={{flex:1.2, padding:13, background: '#0891b2', color:'#fff', border: 'none', borderRadius:14, fontSize:13, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6, boxShadow: '0 4px 16px rgba(8,145,178,0.25)', fontFamily:'inherit'}}>
                <span className="material-symbols-outlined" style={{fontSize:18}}>shopping_basket</span>
                Kitchen Purchases 🛒
              </button>
            </div>

            {/* Calendar & Time Filter Bar */}
            <div style={{display:'flex', gap:10, alignItems:'center', flexWrap:'wrap'}}>
              <div style={{flex:1, display:'flex', alignItems:'center', gap:8, background:'#fff', padding:'6px 12px', border: '1px solid #e2e8f0', borderRadius:10, boxShadow: '0 2px 8px rgba(15,23,42,0.04)'}}>
                <span className="material-symbols-outlined" style={{fontSize:20, color:'#000'}}>calendar_month</span>
                <input 
                  type="date" 
                  value={workDate} 
                  onChange={e=>setWorkDate(e.target.value)} 
                  style={{border:'none', background:'transparent', fontSize:13, fontWeight:800, color:'#000', outline:'none', width:'100%', fontFamily:'inherit', cursor:'pointer'}} 
                />
              </div>

              {/* Time Filter Tabs */}
              <div style={{display:'flex', flex:1, background:'#fff', borderRadius: 10, padding:3, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(15,23,42,0.04)'}}>
                {['Daily', 'Weekly', 'Monthly'].map(f => (
                  <button key={f} onClick={()=>{ if(f==='Weekly' || f==='Monthly') { setView('cookHistory'); } else { setTimeFilter(f); } }} style={{flex:1, padding:'6px 0', borderRadius:8, border:timeFilter===f?'2px solid #000':'2px solid transparent', background:timeFilter===f?C.primary:'transparent', color:'#000', fontSize:12, fontWeight:800, cursor:'pointer', fontFamily:'inherit'}}>
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Meal Tabs */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:8}}>
              {[{m:'Breakfast',icon:'coffee'},{m:'Lunch',icon:'lunch_dining'},{m:'Snacks',icon:'bakery_dining'},{m:'Dinner',icon:'dinner_dining'}].map(x=>(
                <div key={x.m} onClick={()=>setMealTab(x.m)} style={{background:mealTab===x.m?meta.accentBg:'#fff',border:`1.5px solid ${mealTab===x.m?meta.accent:C.border}`,borderRadius: 8,padding:'10px 4px',textAlign:'center',cursor:'pointer'}}>
                  <span className="material-symbols-outlined" style={{fontSize:20,color:mealTab===x.m?meta.accent:C.muted}}>{x.icon}</span>
                  <p style={{fontSize:10,fontWeight:800,color:mealTab===x.m?meta.accent:C.muted,margin:'4px 0 0',textTransform:'uppercase'}}>{x.m}</p>
                </div>
              ))}
            </div>

            {/* Meal Pause Control Banner for Selected Meal & Date */}
            {(() => {
              const mKey = (mealTab || 'lunch').toLowerCase();
              const targetDate = workDate || new Date().toISOString().split('T')[0];
              const isPaused = !!(pausedMeals?.[targetDate]?.[mKey]);
              return (
                <div style={{
                  background: isPaused ? '#fff1f2' : '#f0fdf4',
                  border: `1.5px solid ${isPaused ? '#fecaca' : '#bbf7d0'}`,
                  borderRadius: 14,
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                }}>
                  <div style={{display:'flex', alignItems:'center', gap:8}}>
                    <span className="material-symbols-outlined" style={{fontSize:22, color: isPaused ? '#e11d48' : '#16a34a'}}>
                      {isPaused ? 'pause_circle' : 'check_circle'}
                    </span>
                    <div>
                      <p style={{margin:0, fontSize:12.5, fontWeight:900, color: isPaused ? '#9f1239' : '#14532d'}}>
                        {isPaused ? `${mealTab} is Paused for this date` : `${mealTab} is Serving Normally`}
                      </p>
                      <p style={{margin:0, fontSize:11, color: isPaused ? '#be123c' : '#15803d'}}>
                        {isPaused ? 'Meal passes & orders locked' : 'Students can order and eat'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleMealPause(mealTab, targetDate)}
                    style={{
                      background: isPaused ? '#10b981' : '#e11d48',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 10,
                      padding: '7px 14px',
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      boxShadow: isPaused ? '0 2px 6px rgba(16,185,129,0.3)' : '0 2px 6px rgba(225,29,72,0.3)'
                    }}
                  >
                    <span className="material-symbols-outlined" style={{fontSize:16}}>
                      {isPaused ? 'play_arrow' : 'pause'}
                    </span>
                    {isPaused ? 'Resume' : 'Pause'}
                  </button>
                </div>
              );
            })()}

            {/* Menu Display */}
            {(() => {
              const mKey = (mealTab || 'lunch').toLowerCase();
              const targetDate = workDate || new Date().toISOString().split('T')[0];
              const isPaused = !!(pausedMeals?.[targetDate]?.[mKey]);
              if (isPaused) {
                return (
                  <div style={{background: '#fff', borderRadius: 16, border: '1.5px dashed #fecaca', padding: '36px 16px', textAlign: 'center', marginTop: 12}}>
                    <div style={{width: 52, height: 52, borderRadius: 16, background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px'}}>
                      <span className="material-symbols-outlined" style={{fontSize: 30}}>pause_circle</span>
                    </div>
                    <h3 style={{margin: '0 0 6px', fontSize: 16, fontWeight: 900, color: '#991b1b', textTransform: 'capitalize'}}>
                      {mealTab} is Paused for Today
                    </h3>
                    <p style={{margin: '0 auto 16px', fontSize: 13, color: '#64748b', maxWidth: 280, lineHeight: 1.4}}>
                      Headcount and student eating list are hidden while this meal is paused.
                    </p>
                    <button
                      onClick={() => handleToggleMealPause(mealTab, targetDate)}
                      style={{background: '#10b981', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 18px', fontSize: 12, fontWeight: 800, cursor: 'pointer'}}
                    >
                      Resume {mealTab} Now
                    </button>
                  </div>
                );
              }
              return null;
            })()}

            {!pausedMeals?.[workDate || new Date().toISOString().split('T')[0]]?.[(mealTab || 'lunch').toLowerCase()] && (
              <>
            {/* Menu Display */}
            {(() => {
              const currentRawStr = weeklyFoodMenu?.[todayName]?.[mealTab] || '';
              const todayDishes = currentRawStr.split(/[,;]/).map(s => s.trim()).filter(Boolean);
              const dishImgs = foodItemImages?.[todayName]?.[mealTab] || {};

              return (
                <div style={{background:'#fff', borderRadius:16, border: '1px solid #e2e8f0', padding:14, boxShadow:'0 2px 8px rgba(15,23,42,0.03)'}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
                    <p style={{margin:0, fontSize:12, fontWeight:800, color:meta.accent, textTransform:'uppercase'}}>Today's {mealTab}</p>
                    <button 
                      onClick={() => openCookEditModal(todayName, mealTab)} 
                      style={{background:C.bg, border: '1px solid #e2e8f0', borderRadius:10, padding:'6px 12px', fontSize:12, fontWeight:800, color:C.sub, cursor:'pointer', display:'flex', alignItems:'center', gap:4, flexShrink:0}}>
                      <span className="material-symbols-outlined" style={{fontSize:15}}>photo_camera</span> Edit Items &amp; Photos
                    </button>
                  </div>

                  {todayDishes.length === 0 ? (
                    <p style={{margin:0, fontSize:13, color:C.muted, fontWeight:600}}>No menu set for today's {mealTab}</p>
                  ) : (
                    <div style={{display:'flex', gap:8, overflowX:'auto', WebkitOverflowScrolling:'touch', paddingBottom:2}}>
                      {todayDishes.map((dish, i) => {
                        const dImg = dishImgs[dish] || getDishPresetImage(dish);
                        return (
                          <div key={i} style={{flexShrink:0, display:'flex', alignItems:'center', gap:6, background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, padding:'5px 9px'}}>
                            {dImg ? (
                              <img src={dImg} alt={dish} style={{width:26, height:26, borderRadius:6, objectFit:'cover'}} />
                            ) : (
                              <div style={{width:26, height:26, borderRadius:6, background:'#e2e8f0', display:'flex', alignItems:'center', justifyContent:'center'}}>
                                <span className="material-symbols-outlined" style={{fontSize:15, color:'#64748b'}}>restaurant</span>
                              </div>
                            )}
                            <span style={{fontSize:12, fontWeight:700, color:C.text}}>{dish}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Stat Cards & Filtered List */}
            {(() => {
               const mealKey = mealTab==='Breakfast'?'statusB':mealTab==='Lunch'?'statusL':mealTab==='Snacks'?'statusS':'statusD';
               const detailsKey = mealTab==='Breakfast'?'detailsB':mealTab==='Lunch'?'detailsL':mealTab==='Snacks'?'detailsS':'detailsD';
               const statsObj = {
                 requested: students.filter(s=>s[mealKey]==='requested').length,
                 pack: students.filter(s=>s[mealKey]==='pack').length,
                 delivery: students.filter(s=>s[mealKey]==='delivery').length,
                 extra: students.filter(s=>s[mealKey]==='extra').length,
                 eaten: students.filter(s=>s[mealKey]==='eaten').length,
                 notEaten: students.filter(s=>s[mealKey]==='notEaten').length,
                 onVacation: students.filter(s=>s[mealKey]==='onVacation').length,
               };
               
               const mult = timeFilter==='Monthly'?30:timeFilter==='Weekly'?7:1;

               const statCards = [
                 {id:'requested', l:'Requested', v:statsObj.requested*mult, c:'#000', bg:'#fef08a'},
                 {id:'pack', l:'To Pack', v:statsObj.pack*mult, c:'#000', bg:'#fef08a'},
                 {id:'delivery', l:'Delivery', v:statsObj.delivery*mult, c:'#6d28d9', bg:'#ede9fe'},
                 {id:'extra', l:'Extra Plate', v:statsObj.extra*mult, c:'#000', bg:'#cffafe'},
                 {id:'eaten', l:'Eaten', v:statsObj.eaten*mult, c:'#000', bg:'#bbf7d0'},
                 {id:'notEaten', l:'Not Eaten', v:statsObj.notEaten*mult, c:'#000', bg:'#fecaca'},
                 {id:'onVacation', l:'On Food Vacation', v:statsObj.onVacation*mult, c:'#7c3aed', bg:'#ede9fe'}
               ];

               return (
                 <>
                   {/* Redesigned Stat Cards */}
                    <div style={{display:'flex', background:'#fff', border: '2px solid #000', borderRadius:16, marginBottom: 12, overflow:'hidden', boxShadow: '0 4px 12px rgba(15,23,42,0.05)'}}>
                       <div 
                         onClick={()=>setSelectedStat('pack')}
                         style={{flex:1, padding:'16px 8px', textAlign:'center', cursor:'pointer', background: selectedStat==='pack' ? '#fef08a' : 'transparent', borderRight: '2px solid #000', transition:'all .15s'}}
                       >
                         <p style={{fontSize:26,fontWeight:900,color:'#000',margin:0}}>{statsObj.pack*mult}</p>
                         <p style={{fontSize:10.5,fontWeight:800,color:'#000',margin:'4px 0 0',textTransform:'uppercase'}}>To Pack (Later)</p>
                       </div>
                       <div 
                         onClick={()=>setSelectedStat('delivery')}
                         style={{flex:1, padding:'16px 8px', textAlign:'center', cursor:'pointer', background: selectedStat==='delivery' ? '#ede9fe' : 'transparent', borderRight: '2px solid #000', transition:'all .15s'}}
                       >
                         <p style={{fontSize:26,fontWeight:900,color:'#6d28d9',margin:0}}>{statsObj.delivery*mult}</p>
                         <p style={{fontSize:10.5,fontWeight:800,color:'#6d28d9',margin:'4px 0 0',textTransform:'uppercase'}}>Delivery (Tiffin)</p>
                       </div>
                       <div 
                         onClick={()=>setSelectedStat('extra')}
                         style={{flex:1, padding:'16px 8px', textAlign:'center', cursor:'pointer', background: selectedStat==='extra' ? '#cffafe' : 'transparent', transition:'all .15s'}}
                       >
                         <p style={{fontSize:26,fontWeight:900,color:'#000',margin:0}}>{statsObj.extra*mult}</p>
                         <p style={{fontSize:10.5,fontWeight:800,color:'#000',margin:'4px 0 0',textTransform:'uppercase'}}>Extra Plate</p>
                       </div>
                    </div>

                     {/* Dedicated On Food Vacation / Leave Stat Card */}
                     <div
                       onClick={() => setSelectedStat(selectedStat === 'onVacation' ? 'requested' : 'onVacation')}
                       style={{
                         background: selectedStat === 'onVacation' ? '#f5f3ff' : '#ffffff',
                         border: `2px solid ${selectedStat === 'onVacation' ? '#7c3aed' : '#000'}`,
                         borderRadius: 16,
                         padding: '12px 16px',
                         display: 'flex',
                         alignItems: 'center',
                         justifyContent: 'space-between',
                         cursor: 'pointer',
                         marginBottom: 12,
                         boxShadow: selectedStat === 'onVacation' ? '0 4px 14px rgba(124,58,237,0.18)' : '0 2px 8px rgba(15,23,42,0.03)',
                         transition: 'all 0.15s ease'
                       }}
                     >
                       <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                         <div style={{
                           width: 40,
                           height: 40,
                           borderRadius: 12,
                           background: '#ede9fe',
                           display: 'flex',
                           alignItems: 'center',
                           justifyContent: 'center',
                           color: '#7c3aed',
                           flexShrink: 0
                         }}>
                           <span className="material-symbols-outlined" style={{ fontSize: 24 }}>flight_takeoff</span>
                         </div>
                         <div>
                           <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                             <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: '#7c3aed' }}>
                               On Food Vacation / Leave
                             </span>
                             <span style={{ background: '#7c3aed', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 8 }}>
                               Paused
                             </span>
                           </div>
                           <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 700, color: '#334155' }}>
                             {statsObj.onVacation} student{statsObj.onVacation !== 1 ? 's' : ''} paused for {mealTab}
                           </p>
                         </div>
                       </div>
                       <div style={{ fontSize: 26, fontWeight: 900, color: '#7c3aed' }}>
                         {statsObj.onVacation * mult}
                       </div>
                     </div>

                    <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8, marginBottom: 16}}>
                      {[
                        {id:'requested', l:'Requested', v:statsObj.requested*mult, bg:'#fef08a'},
                        {id:'eaten', l:'Eaten', v:statsObj.eaten*mult, bg:'#bbf7d0'},
                        {id:'notEaten', l:'Not Eaten', v:statsObj.notEaten*mult, bg:'#fecaca'}
                      ].map(s => (
                        <div key={s.id} onClick={()=>setSelectedStat(s.id)} style={{background:selectedStat===s.id?s.bg:'#fff', border:`2px solid #000`, borderRadius:14, padding:'12px 6px', textAlign:'center', cursor:'pointer', boxShadow: selectedStat === s.id ? '0 4px 12px rgba(15,23,42,0.06)' : 'none', transition:'all .15s'}}>
                          <p style={{fontSize:22,fontWeight:900,color:'#000',margin:0}}>{s.v}</p>
                          <p style={{fontSize:10,fontWeight:800,color:'#000',margin:'4px 0 0',textTransform:'uppercase'}}>{s.l}</p>
                        </div>
                      ))}
                    </div>
                    
                    {/* Filtered Student List */}
                   <div style={{background:'#fff',borderRadius:18,border: '1px solid #e2e8f0',padding:16, boxShadow: '0 4px 16px rgba(15,23,42,0.05)'}}>
                     <p style={{margin:'0 0 12px',fontSize:15,fontWeight:800,color:'#000'}}>
                       {statCards.find(c=>c.id===selectedStat)?.l} · {mealTab} <span style={{fontSize:12, fontWeight:600, color:C.muted}}>({workDate})</span>
                     </p>
                     
                     <div style={{maxHeight:360,overflowY:'auto',display:'flex',flexDirection:'column',gap:10,paddingRight:4}}>
                       {students.filter(s=>s[mealKey]===selectedStat).map(s=>(
                         <div key={s.id} style={{background:C.bg,border: '1px solid #e2e8f0',borderRadius: 12,padding:'12px',display:'flex',justifyContent:'space-between',alignItems:'center', boxShadow: '0 2px 8px rgba(15,23,42,0.04)'}}>
                           <div>
                             <span style={{fontSize:14,fontWeight:800,color:'#000'}}>{s.name} </span>
                             <p style={{margin:'2px 0 6px',fontSize:12,color:C.muted,fontWeight:600}}>Rm {s.room} · {s.bed}</p>
                             <div style={{display:'flex', gap:6, flexWrap:'wrap', alignItems:'center'}}>
                               <Chip label={s.phone} color="#78680a" bg="#fefce8"/>
                               {(selectedStat === 'pack' || selectedStat === 'extra') && s[detailsKey] && (
                                 <span style={{fontSize:11, fontWeight:800, color:'#78680a', background:'#fefce8', padding:'4px 8px', borderRadius:8, border: '1px solid #e8df9a'}}>
                                   {s[detailsKey]}
                                 </span>
                               )}
                               {selectedStat === 'onVacation' && s.foodVacation && (
                                 <>
                                   <span style={{fontSize:11, fontWeight:800, color:'#7c3aed', background:'#ede9fe', padding:'4px 8px', borderRadius:8, border: '1px solid #ddd6fe'}}>
                                     🗓️ {formatDateDisplay(s.foodVacation.startDate)} - {formatDateDisplay(s.foodVacation.endDate)}
                                   </span>
                                   <span style={{fontSize:11, fontWeight:700, color:'#6b21a8', background:'#f5f3ff', padding:'4px 8px', borderRadius:8}}>
                                     🍽️ {s.foodVacation.isAllMeals ? 'All Meals' : (s.foodVacation.meals || []).map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(', ')}
                                   </span>
                                   {s.foodVacation.reason && (
                                     <span style={{fontSize:11, color:'#64748b', fontStyle:'italic'}}>
                                       "{s.foodVacation.reason}"
                                     </span>
                                   )}
                                 </>
                               )}
                             </div>
                           </div>
                           
                           <div style={{display:'flex', flexDirection:'column', gap:6, alignItems:'flex-end'}}>
                             {(selectedStat === 'pack' || selectedStat === 'extra') && (
                               <button onClick={()=>{
                                 setPackStudentId(s.id); 
                                 const currentVal = s[detailsKey] || '';
                                 const priceMatch = currentVal.match(/₹(\d+)/);
                                 setPackPriceVal(priceMatch ? priceMatch[1] : '');
                                 setPackVal(currentVal.replace(/\s*\(₹\d+\)/, '')); 
                                 setShowPackEdit(true);
                               }}
                                 style={{padding:'7px 12px',borderRadius:8,border: '1px solid #e2e8f0',background:'#fef08a',color:'#000',fontSize:11,fontWeight:800,cursor:'pointer',fontFamily:'inherit',boxShadow: '0 2px 8px rgba(15,23,42,0.04)'}}>
                                 {s[detailsKey] ? 'Edit Details' : 'Fill Details'}
                               </button>
                             )}
                             
                             {/* Call Option for Students (especially Not Eaten) */}
                             <a href={`tel:${s.phone.replace(/\s+/g, '')}`} 
                                style={{padding:'6px 10px', borderRadius:8, border: '1px solid #e2e8f0', background:'#bbf7d0', color:'#000', textDecoration:'none', fontSize:11, fontWeight:800, display:'inline-flex', alignItems:'center', gap:4, boxShadow: '0 2px 8px rgba(15,23,42,0.04)'}}>
                                📞 Call
                              </a>

                             {/* Quick Action button for 'eaten' */}
                             {(selectedStat === 'requested' || selectedStat === 'notEaten') && timeFilter === 'Daily' && (
                               <button onClick={()=>markMealEaten(s.id, mealKey)}
                                 style={{padding:'6px 12px',borderRadius:8,border: '1px solid #e2e8f0',background:'#fff',color:'#000',fontSize:12,fontWeight:800,cursor:'pointer',fontFamily:'inherit',boxShadow: '0 2px 8px rgba(15,23,42,0.04)'}}>
                                 Mark Eaten
                               </button>
                             )}
                             {selectedStat === 'delivery' && (
                               <span style={{padding:'6px 12px', borderRadius:8, background:'#ede9fe', color:'#6d28d9', fontSize:12, fontWeight:800, border: '1px solid #ddd6fe', display:'inline-flex', alignItems:'center', gap:4}}>
                                 🛵 Tiffin Delivery
                               </span>
                             )}
                             {selectedStat === 'eaten' && timeFilter === 'Daily' && (
                                <Chip label="Eaten ✅" color="#166534" bg="#dcfce7"/>
                             )}
                             {selectedStat === 'onVacation' && (
                                <span style={{padding:'6px 12px', borderRadius:8, background:'#ede9fe', color:'#7c3aed', fontSize:12, fontWeight:800, border: '1px solid #ddd6fe', display:'inline-flex', alignItems:'center', gap:4}}>
                                  🏖️ Paused
                                </span>
                             )}
                           </div>
                         </div>
                       ))}
                       {students.filter(s=>s[mealKey]===selectedStat).length === 0 && (
                         <div style={{textAlign:'center', padding:'30px 10px'}}>
                           <span className="material-symbols-outlined" style={{fontSize:32,color:C.border}}>sentiment_dissatisfied</span>
                           <p style={{fontSize:13, color:C.muted, margin:'8px 0 0'}}>No students found.</p>
                         </div>
                       )}
                     </div>
                   </div>
                 </>
               )
            })()}
          </>
          )}
          </>)}

          {/* CLEANER ROLE - REDESIGNED */}
          {staffRole === 'Cleaner' && (() => {
            const mult = cleanerTimeFilter === 'Monthly' ? 30 : cleanerTimeFilter === 'Weekly' ? 7 : 1;
            const activeSlots = cleaning.filter(c => c.slotStatus === 'active');
            const upcomingSlots = cleaning.filter(c => c.slotStatus === 'upcoming');
            const completedSlots = cleaning.filter(c => c.done);
            const pendingSlots = cleaning.filter(c => !c.done);

            const matchesType = (item) => {
              if (cleanerTypeFilter === 'All') return true;
              return (item.type || '').toLowerCase().includes(cleanerTypeFilter.toLowerCase());
            };

            const filteredList = cleaning.filter(c => {
              if (!matchesType(c)) return false;
              if (cleanerSlotFilter === 'active') return c.slotStatus === 'active' && !c.done;
              if (cleanerSlotFilter === 'upcoming') return c.slotStatus === 'upcoming' && !c.done;
              if (cleanerSlotFilter === 'completed') return c.done;
              return true;
            });

            return (
              <>
                {/* Today Header */}
                <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                  <div>
                    <p style={{margin:0, fontSize:12, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:1}}>Today's Schedule</p>
                    <h2 style={{margin:'2px 0 0', fontSize:22, fontWeight:900, color:'#0f172a'}}>Cleaning Jobs</h2>
                  </div>
                  <input type="date" value={cleanerDate} onChange={e=>setCleanerDate(e.target.value)}
                    style={{border:'1.5px solid #e2e8f0', borderRadius:10, padding:'8px 12px', fontSize:13, fontWeight:700, color:'#0f172a', fontFamily:'inherit', background:'#fff', outline:'none', cursor:'pointer'}} />
                </div>

                {/* Stats Row */}
                <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10}}>
                  {[
                    {label:'Done', value: completedSlots.length, onClick: ()=>setCleanerSlotFilter('completed'), active: cleanerSlotFilter==='completed', bg:'#f0fdf4', activeBg:'#dcfce7', c:'#15803d'},
                    {label:'Active', value: activeSlots.length,  onClick: ()=>setCleanerSlotFilter('active'),    active: cleanerSlotFilter==='active',    bg:'#fefce8', activeBg:'#fde047', c:'#92400e'},
                    {label:'Pending', value: pendingSlots.length, onClick: ()=>setCleanerSlotFilter('all'),     active: cleanerSlotFilter==='all',       bg:'#f8fafc', activeBg:'#f1f5f9', c:'#475569'},
                  ].map(s => (
                    <div key={s.label} onClick={s.onClick} style={{
                      background: s.active ? s.activeBg : s.bg,
                      borderRadius:16, padding:'16px 12px', textAlign:'center', cursor:'pointer',
                      border: s.active ? `2px solid ${s.c}33` : '1.5px solid #e2e8f0',
                      transition:'all 0.15s'
                    }}>
                      <p style={{margin:0, fontSize:28, fontWeight:900, color: s.active ? s.c : '#0f172a'}}>{s.value}</p>
                      <p style={{margin:'4px 0 0', fontSize:11, fontWeight:800, color: s.active ? s.c : '#94a3b8', textTransform:'uppercase', letterSpacing:0.5}}>{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Move-Out Inspection Banner */}
                <div onClick={()=>setShowMoveOutModal(true)} style={{background:'#0f172a', borderRadius:16, padding:'16px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer'}}>
                  <div>
                    <p style={{margin:0, fontSize:11, fontWeight:800, color:'#fde047', textTransform:'uppercase', letterSpacing:1}}>Move-Out</p>
                    <p style={{margin:'2px 0 0', fontSize:15, fontWeight:900, color:'#f8fafc'}}>Start Room Inspection</p>
                  </div>
                  <div style={{width:40, height:40, borderRadius:20, background:'rgba(253,224,71,0.15)', display:'flex', alignItems:'center', justifyContent:'center'}}>
                    <span className="material-symbols-outlined" style={{fontSize:20, color:'#fde047'}}>checklist</span>
                  </div>
                </div>

                {/* Filter Pills */}
                <div style={{display:'flex', gap:6, overflowX:'auto'}}>
                  {[
                    {id:'all', label:'All'},
                    {id:'active', label:'Active Now'},
                    {id:'upcoming', label:'Upcoming'},
                    {id:'completed', label:'Cleaned'},
                  ].map(tab => (
                    <button key={tab.id} onClick={()=>setCleanerSlotFilter(tab.id)} style={{
                      padding:'7px 16px', borderRadius:20, fontSize:12, fontWeight:800, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', border:'none',
                      background: cleanerSlotFilter === tab.id ? '#0f172a' : '#f1f5f9',
                      color: cleanerSlotFilter === tab.id ? '#fde047' : '#64748b',
                      transition:'all 0.15s'
                    }}>
                      {tab.label}
                    </button>
                  ))}
                  <div style={{width:'1px', background:'#e2e8f0', flexShrink:0, margin:'4px 0'}}/>
                  {['All', 'Full Room', 'Dusting', 'Mopping', 'Bathroom'].map(t => (
                    <button key={t} onClick={()=>setCleanerTypeFilter(t)} style={{
                      padding:'7px 14px', borderRadius:20, fontSize:11, fontWeight:800, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap',
                      background: cleanerTypeFilter === t ? '#fde047' : 'transparent',
                      color: cleanerTypeFilter === t ? '#78350f' : '#94a3b8',
                      border: cleanerTypeFilter === t ? 'none' : '1px solid #e2e8f0',
                      transition:'all 0.15s'
                    }}>
                      {t}
                    </button>
                  ))}
                </div>

                {/* Job Cards */}
                <div style={{display:'flex', flexDirection:'column', gap:10}}>
                  {filteredList.length === 0 && (
                    <div style={{background:'#f8fafc', borderRadius:16, padding:'32px 16px', textAlign:'center'}}>
                      <span className="material-symbols-outlined" style={{fontSize:36, color:'#cbd5e1'}}>mop</span>
                      <p style={{margin:'8px 0 0', fontSize:14, color:'#94a3b8', fontWeight:700}}>All clear! No rooms in this filter.</p>
                    </div>
                  )}
                  {filteredList.map(slot => (
                    <div key={slot.id} style={{background:'#fff', borderRadius:18, border: slot.done ? '1.5px solid #86efac' : slot.slotStatus==='active' ? '1.5px solid #fde047' : '1.5px solid #e2e8f0', padding:'16px 16px 14px', boxShadow:'0 2px 12px rgba(15,23,42,0.04)'}}>
                      
                      {/* Top row */}
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                        <div>
                          <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:4}}>
                            <span style={{fontSize:17, fontWeight:900, color:'#0f172a'}}>Room {slot.room}</span>
                            <span style={{fontSize:10, fontWeight:800, padding:'3px 8px', borderRadius:20, background: slot.done ? '#dcfce7' : slot.needsApproval ? '#fefce8' : slot.slotStatus==='active' ? '#fef08a' : '#f1f5f9', color: slot.done ? '#15803d' : slot.needsApproval ? '#ca8a04' : slot.slotStatus==='active' ? '#92400e' : '#64748b'}}>
                              {slot.done ? '✓ Cleaned' : slot.needsApproval ? '⏳ Needs Appvl' : slot.slotStatus === 'active' ? '● Active' : '○ Upcoming'}
                            </span>
                          </div>
                          <p style={{margin:0, fontSize:12, fontWeight:700, color:'#64748b'}}>{slot.type}</p>
                        </div>
                        <span style={{fontSize:11, fontWeight:700, color:'#94a3b8', textAlign:'right', marginTop:2}}>
                          {slot.slot}
                        </span>
                      </div>

                      {/* Divider */}
                      <div style={{height:'1px', background:'#f1f5f9', margin:'12px 0'}}/>

                      {/* Bottom row */}
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <div style={{display:'flex', alignItems:'center', gap:8}}>
                          <div style={{width:28, height:28, borderRadius:14, background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center'}}>
                            <span className="material-symbols-outlined" style={{fontSize:15, color:'#64748b'}}>person</span>
                          </div>
                          <div>
                            <p style={{margin:0, fontSize:13, fontWeight:800, color:'#0f172a'}}>{slot.student}</p>
                            {slot.note && <p style={{margin:'1px 0 0', fontSize:11, color:'#94a3b8', fontWeight:600}}>"{slot.note}"</p>}
                          </div>
                        </div>
                        <div style={{display:'flex', gap:8, alignItems:'center'}}>
                          {slot.phone && (
                            <a href={`tel:${slot.phone.replace(/\s+/g, '')}`}
                              style={{width:36, height:36, borderRadius:18, background:'#f0fdf4', border:'1px solid #dcfce7', display:'flex', alignItems:'center', justifyContent:'center', textDecoration:'none'}}>
                              <span className="material-symbols-outlined" style={{fontSize:18, color:'#16a34a'}}>phone</span>
                            </a>
                          )}
                          {!slot.done && !slot.needsApproval && (
                            <button onClick={() => completeCleaningTask(slot.id)}
                              style={{padding:'8px 16px', borderRadius:12, border:'none', background:'#0f172a', color:'#fde047', fontSize:12, fontWeight:900, cursor:'pointer', fontFamily:'inherit'}}>
                              Done
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Weekly/Monthly Summary at the bottom */}
                {cleanerTimeFilter !== 'Daily' && (
                  <div style={{background:'#f8fafc', borderRadius:18, padding:'18px', border:'1.5px solid #e2e8f0'}}>
                    <p style={{margin:'0 0 14px', fontSize:13, fontWeight:800, color:'#64748b', textTransform:'uppercase', letterSpacing:0.5}}>{cleanerTimeFilter} Summary</p>
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
                      <div style={{background:'#dcfce7', borderRadius:14, padding:'14px', textAlign:'center'}}>
                        <p style={{fontSize:30, fontWeight:900, color:'#15803d', margin:0}}>{completedSlots.length * mult}</p>
                        <p style={{fontSize:11, fontWeight:800, color:'#15803d', margin:'4px 0 0', textTransform:'uppercase'}}>Cleaned</p>
                      </div>
                      <div style={{background:'#fee2e2', borderRadius:14, padding:'14px', textAlign:'center'}}>
                        <p style={{fontSize:30, fontWeight:900, color:'#b91c1c', margin:0}}>{(cleaning.length - completedSlots.length) * mult}</p>
                        <p style={{fontSize:11, fontWeight:800, color:'#b91c1c', margin:'4px 0 0', textTransform:'uppercase'}}>Pending</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            );
          })()}

          {/* MAINTENANCE */}
          {staffRole === 'Maintenance' && (<>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div style={{background:'#fff',borderRadius:14,border: '1px solid #e2e8f0',padding:14,textAlign:'center'}}>
                <p style={{fontSize:28,fontWeight:900,color:C.danger,margin:0}}>{tickets.filter(t=>t.status==='Open').length}</p>
                <p style={{fontSize:12,color:C.muted,margin:'2px 0 0'}}>Open</p>
              </div>
              <div style={{background:'#fff',borderRadius:14,border: '1px solid #e2e8f0',padding:14,textAlign:'center'}}>
                <p style={{fontSize:28,fontWeight:900,color:C.warn,margin:0}}>{tickets.filter(t=>t.status==='In Progress').length}</p>
                <p style={{fontSize:12,color:C.muted,margin:'2px 0 0'}}>In Progress</p>
              </div>
            </div>
            <div style={{background:'#fff',borderRadius:18,border: '1px solid #e2e8f0',padding:16}}>
              <p style={{margin:'0 0 12px',fontSize:15,fontWeight:800,color:C.text}}>🛠️ Repair Tickets</p>
              {tickets.map(t=>(
                <div key={t.id} style={{background:C.bg,border: '1px solid #e2e8f0',borderRadius:14,padding:14,marginBottom:10}}>
                  <Row style={{marginBottom:8,alignItems:'flex-start'}}>
                    <div>
                      <div style={{display:'flex',gap:6,marginBottom:4}}>
                        <Chip label={`Room ${t.room}`}/>
                        <Chip label={t.priority} color={t.priority==='High'?C.danger:C.warn} bg={t.priority==='High'?C.dangerBg:C.warnBg}/>
                      </div>
                      <p style={{margin:0,fontSize:14,fontWeight:800,color:C.text}}>{t.issue}</p>
                      <p style={{margin:'3px 0 0',fontSize:11,color:C.muted}}>By {t.student} · {t.date}</p>
                    </div>
                  </Row>
                  {t.status !== 'Resolved' && (
                    <div style={{display:'flex',gap:8}}>
                      {t.status==='Open' && <button onClick={()=>updateTicketStatus(t.id, 'In Progress')} style={{flex:1,padding:9,background:C.indigoBg,border:`1px solid ${C.indigo}`,borderRadius:10,color:C.indigo,fontSize:12,fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}>Start Work 🔧</button>}
                      <button onClick={()=>updateTicketStatus(t.id, 'Resolved')} style={{flex:1,padding:9,background: C.primary,border: '1px solid #e2e8f0',borderRadius:10,color:'#000',fontSize:12,fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}>Mark Resolved ✅</button>
                    </div>
                  )}
                  {t.status==='Resolved' && <Chip label="Resolved ✅" color={C.success} bg={C.successBg}/>}
                </div>
              ))}
            </div>
          </>)}

          {/* PURCHASE MANAGER */}
          {staffRole === 'Purchase Manager' && (<>
            {/* Tab Navigation */}
            <div style={{display:'flex', background:'#fff', borderRadius:12, padding:4, border:`1px solid ${C.border}`, boxShadow:'0 2px 8px rgba(15,23,42,0.04)', marginBottom:14}}>
              <button onClick={()=>setPmTab('requisitions')} style={{flex:1, padding:'10px 0', borderRadius:10, border:'none', background: pmTab==='requisitions' ? '#fde047' : 'transparent', color: pmTab==='requisitions' ? '#78680a' : C.muted, fontSize:13, fontWeight:900, cursor:'pointer', fontFamily:'inherit'}}>
                🛒 Requisitions ({demands.filter(d=>d.status==='Pending').length})
              </button>
              <button onClick={()=>setPmTab('vendors')} style={{flex:1, padding:'10px 0', borderRadius:10, border:'none', background: pmTab==='vendors' ? '#fde047' : 'transparent', color: pmTab==='vendors' ? '#78680a' : C.muted, fontSize:13, fontWeight:900, cursor:'pointer', fontFamily:'inherit'}}>
                🏢 Vendors ({vendors.length})
              </button>
            </div>

            {/* TAB 1: REQUISITIONS */}
            {pmTab === 'requisitions' && (
              <div style={{background:'#fff',borderRadius:18,border: `1px solid ${C.border}`,padding:16, boxShadow:'0 4px 12px rgba(120, 104, 10, 0.04)'}}>
                <p style={{margin:'0 0 12px',fontSize:15,fontWeight:800,color:C.text}}>📋 Staff Item Requisitions</p>
                {demands.map(d=>(
                  <div key={d.id} style={{background:C.bg,border: `1px solid ${C.border}`,borderRadius:14,padding:12,marginBottom:8,display:'flex',justifyContent:'space-between',alignItems:'center',gap:10}}>
                    <div style={{flex:1}}>
                      <p style={{margin:0,fontSize:14,fontWeight:800,color:C.text}}>{d.item}</p>
                      <p style={{margin:'3px 0 0',fontSize:11,color:C.muted}}>Qty: {d.qty} · {d.reqBy} · {d.date}</p>
                      <p style={{margin:'2px 0 0',fontSize:11,color:C.muted}}>Vendor: {d.vendor}</p>
                    </div>
                    {d.status==='Pending' ? (
                      <button onClick={()=>setDemands(p=>p.map(x=>x.id===d.id?{...x,status:'PO Sent'}:x))} style={{padding:'8px 12px',background:meta.accentBg,border:`1.5px solid ${meta.accent}`,borderRadius:10,color:meta.accent,fontSize:12,fontWeight:800,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>Create PO 📦</button>
                    ) : (
                      <Chip label="PO Sent ✓" color={C.success} bg={C.successBg}/>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* TAB 2: VENDOR ACCOUNT & LEDGER GRID */}
            {pmTab === 'vendors' && !selectedVendor && (
              <div style={{display:'flex', flexDirection:'column', gap:14}}>
                {/* Total amount card */}
                <div style={{background:'#ffffff', border:`1px solid ${C.border}`, borderRadius:18, padding:'16px 20px', boxShadow:'0 4px 12px rgba(120,104,10,0.03)'}}>
                  <p style={{margin:0, fontSize:12, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:0.5}}>Total Outstanding Payable</p>
                  <h2 style={{margin:'4px 0 0', fontSize:32, fontWeight:900, color:'#b91c1c'}}>₹{vendors.reduce((s, v)=>s+v.balance, 0).toLocaleString()}</h2>
                </div>

                {/* Search Bar */}
                <div style={{position:'relative', display:'flex', alignItems:'center'}}>
                  <span className="material-symbols-outlined" style={{position:'absolute', left:14, color:C.muted, fontSize:20}}>search</span>
                  <input 
                    type="text"
                    placeholder="Search Vendor"
                    value={searchVendorQuery}
                    onChange={e=>setSearchVendorQuery(e.target.value)}
                    style={{width:'100%', padding:'12px 14px 12px 42px', border:`1.5px solid ${C.border}`, borderRadius:12, fontSize:14, background:'#fff', color:C.text, outline:'none'}}
                  />
                </div>

                {/* Category Selector pills */}
                <div style={{display:'flex', gap:8, overflowX:'auto', paddingBottom:4, margin:'0 -2px'}}>
                  {['Groceries', 'Laundry', 'Vegetables', 'Dairy', 'Water'].map(cat => (
                    <button 
                      key={cat}
                      onClick={()=>setActiveVendorCategory(cat)}
                      style={{
                        padding:'8px 16px', borderRadius:20, border: activeVendorCategory===cat ? 'none' : `1px solid ${C.border}`,
                        background: activeVendorCategory===cat ? '#0891b2' : '#fff',
                        color: activeVendorCategory===cat ? '#fff' : C.text,
                        fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap'
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Vendor List */}
                <div style={{display:'flex', flexDirection:'column', gap:10}}>
                  {vendors
                    .filter(v => v.category === activeVendorCategory && (v.name || '').toLowerCase().includes(searchVendorQuery.toLowerCase()))
                    .map(v => (
                      <div 
                        key={v.id}
                        onClick={() => setSelectedVendor(v)}
                        style={{background:'#fff', border:`1px solid ${C.border}`, borderRadius:18, padding:16, display:'flex', justifyContent:'space-between', alignItems:'center', boxShadow:'0 4px 12px rgba(120,104,10,0.03)', cursor:'pointer'}}
                      >
                        <div>
                          <p style={{margin:0, fontSize:11, fontWeight:800, color:'#0891b2', textTransform:'uppercase'}}>{v.category} · {v.shop}</p>
                          <h4 style={{margin:'4px 0 2px', fontSize:16, fontWeight:900, color:C.text}}>{v.name}</h4>
                          <p style={{margin:0, fontSize:12, color:C.muted}}>Outstanding Balance: ₹{v.balance.toLocaleString()}</p>
                        </div>
                        <div style={{display:'flex', alignItems:'center', gap:4}}>
                          <span style={{fontSize:16, fontWeight:900, color:C.text}}>₹{v.balance.toLocaleString()}</span>
                          <span className="material-symbols-outlined" style={{fontSize:20, color:C.muted}}>chevron_right</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* VENDOR DETAIL PAGE (Screenshot 5 / Ledger layout) */}
            {pmTab === 'vendors' && selectedVendor && (
              <div style={{display:'flex', flexDirection:'column', gap:14}}>
                {/* Back Navigation header */}
                <div style={{display:'flex', alignItems:'center', gap:12}}>
                  <button onClick={() => setSelectedVendor(null)} style={{background:'#fff', border:`1px solid ${C.border}`, borderRadius:10, width:36, height:36, display:'flex', alignItems:'center', justifyCenter:'center', cursor:'pointer'}}>
                    <span className="material-symbols-outlined" style={{fontSize:20}}>arrow_back</span>
                  </button>
                  <div>
                    <h3 style={{margin:0, fontSize:18, fontWeight:900}}>{selectedVendor.name} Account</h3>
                    <p style={{margin:0, fontSize:11.5, color:C.muted}}>{selectedVendor.shop} · {selectedVendor.category}</p>
                  </div>
                </div>

                {/* Warning message card */}
                {selectedVendor.balance > 0 && (
                  <div onClick={() => {
                    setPayAmount(String(selectedVendor.balance));
                    setShowPayVendorModal(true);
                  }} style={{background:'#ffe4e6', border:'1px solid #fecaca', borderRadius:14, padding:'12px 14px', display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer'}}>
                    <div style={{display:'flex', alignItems:'center', gap:8}}>
                      <span className="material-symbols-outlined" style={{fontSize:18, color:'#dc2626'}}>warning</span>
                      <span style={{fontSize:12.5, fontWeight:800, color:'#b91c1c'}}>Pending Amount — Tap to Clear</span>
                    </div>
                    <span style={{fontSize:13, fontWeight:900, color:'#b91c1c'}}>₹{selectedVendor.balance.toLocaleString()}</span>
                  </div>
                )}

                {/* Total amount card */}
                <div style={{background:'#ffffff', border:`1px solid ${C.border}`, borderRadius:18, padding:'16px 20px', boxShadow:'0 4px 12px rgba(120,104,10,0.03)'}}>
                  <p style={{margin:0, fontSize:12, fontWeight:800, color:C.muted, textTransform:'uppercase'}}>Total Account Balance</p>
                  <h2 style={{margin:'4px 0 0', fontSize:32, fontWeight:900, color:C.text}}>₹{selectedVendor.balance.toLocaleString()}</h2>
                </div>

                {/* Transactions Ledger header */}
                <p style={{margin:'4px 0 0', fontSize:14, fontWeight:900, color:C.text}}>📄 Statement & Ledger History</p>

                {/* Transaction history list */}
                <div style={{display:'flex', flexDirection:'column', gap:10}}>
                  {vendorLedger
                    .filter(l => l.vendorId === selectedVendor.id)
                    .map(l => (
                      <div key={l.id} style={{background:'#fff', border:`1px solid ${C.border}`, borderRadius:16, padding:14, boxShadow:'0 2px 8px rgba(120,104,10,0.03)'}}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6}}>
                          <div>
                            <span style={{fontSize:11, fontWeight:800, background: l.type==='Purchase'?'#fee2e2':'#dcfce7', color: l.type==='Purchase'?'#b91c1c':'#166534', padding:'2px 8px', borderRadius:6}}>{l.type}</span>
                            <h5 style={{margin:'6px 0 2px', fontSize:14, fontWeight:900, color:C.text}}>{l.desc}</h5>
                            <p style={{margin:0, fontSize:11, color:C.muted}}>{l.date} · Method: {l.pm}</p>
                          </div>
                          <div style={{textAlign:'right'}}>
                            <p style={{margin:0, fontSize:15, fontWeight:900, color: l.type==='Purchase'?'#b91c1c':'#166534'}}>{l.type==='Purchase'?'+':'-'} ₹{l.amount.toLocaleString()}</p>
                            <span style={{fontSize:9.5, fontWeight:800, color: l.status==='Approved'?'#166534':'#d97706'}}>{l.status}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>

                {/* Bottom Action buttons */}
                <div style={{display:'flex', gap:10, marginTop:10}}>
                  <button 
                    onClick={() => {
                      const items = INIT_ITEMS_BY_CATEGORY[selectedVendor.category] || [];
                      setPurchaseItemsState(items.map(i => ({...i, qty: 10, checked: false})));
                      setShowAddPurchaseModal(true);
                    }} 
                    style={{flex:1, padding:13, background:'#0891b2', border:'none', borderRadius:12, color:'#fff', fontSize:13, fontWeight:900, cursor:'pointer', fontFamily:'inherit'}}
                  >
                    🛒 Add Purchase
                  </button>
                  <button 
                    onClick={() => {
                      setPayAmount(String(selectedVendor.balance));
                      setShowPayVendorModal(true);
                    }} 
                    style={{flex:1, padding:13, background:'#fde047', border:`1px solid ${C.border}`, borderRadius:12, color:'#78680a', fontSize:13, fontWeight:900, cursor:'pointer', fontFamily:'inherit'}}
                  >
                    💵 Pay Vendor
                  </button>
                </div>
              </div>
            )}
          </>)}

          {/* SECURITY */}
          {staffRole === 'Security Guard' && (<>
            
            {/* Gatekeeper Hero */}
            <div style={{background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderRadius:20, padding:'24px', color:'#fff', boxShadow:'0 10px 25px rgba(15,23,42,0.15)', display:'flex', flexDirection:'column', gap:16, position:'relative', overflow:'hidden'}}>
               <div style={{position:'absolute', right:-10, bottom:-10, opacity:0.1, pointerEvents:'none'}}>
                  <span className="material-symbols-outlined" style={{fontSize:120}}>shield_person</span>
               </div>
               <div>
                  <h2 style={{margin:0, fontSize:22, fontWeight:900, color:'#f8fafc'}}>Gatekeeper</h2>
                  <p style={{margin:'2px 0 0', fontSize:13, fontWeight:600, color:'#94a3b8'}}>Manage entries & exits securely.</p>
               </div>
               <button onClick={()=>setShowGatekeeperModal(true)} style={{padding:'14px', background:'#3b82f6', color:'#fff', border:'none', borderRadius:14, fontWeight:900, fontSize:15, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontFamily:'inherit', zIndex:5, boxShadow:'0 4px 12px rgba(59,130,246,0.3)'}}>
                  <span className="material-symbols-outlined" style={{fontSize:20}}>person_add</span> Log New Visitor
               </button>
            </div>

            {/* 📦 GATE PARCEL REGISTER SECTION */}
            <div style={{marginTop:20, background:'#fff', borderRadius:20, border:'1.5px solid #e2e8f0', padding:'18px', boxShadow:'0 4px 14px rgba(15,23,42,0.04)'}}>
               <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14}}>
                  <div>
                     <h3 style={{margin:0, fontSize:17, fontWeight:900, color:'#0f172a'}}>📦 Gate Parcel Register</h3>
                     <p style={{margin:'2px 0 0', fontSize:12, fontWeight:600, color:'#64748b'}}>Parcels received at gate for absent students</p>
                  </div>
                  <button onClick={() => setShowParcelModal(true)} style={{padding:'10px 14px', background:'#fde047', border:'none', borderRadius:12, color:'#0f172a', fontSize:12, fontWeight:900, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:6, boxShadow:'0 2px 8px rgba(0,0,0,0.05)'}}>
                     <span className="material-symbols-outlined" style={{fontSize:18}}>add_box</span> Log Parcel
                  </button>
               </div>

               {/* Parcel List Cards */}
               <div style={{display:'flex', flexDirection:'column', gap:10}}>
                  {(parcels || []).map(p => (
                     <div key={p.id} style={{background:'#f8fafc', borderRadius:14, padding:'14px', border:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <div>
                           <div style={{display:'flex', alignItems:'center', gap:8}}>
                              <span style={{fontSize:14, fontWeight:900, color:'#0f172a'}}>📦 {p.itemName || p.carrier + ' Parcel'}</span>
                              <span style={{fontSize:10, fontWeight:800, padding:'2px 8px', borderRadius:6, background: p.status === 'Claimed' ? '#dcfce7' : '#fef08a', color: p.status === 'Claimed' ? '#15803d' : '#92400e'}}>
                                 {p.status === 'Claimed' ? 'Handed Over ✅' : 'Pending Claim ⏳'}
                              </span>
                           </div>
                           <p style={{margin:'4px 0 0', fontSize:13, fontWeight:700, color:'#334155'}}>Student: <strong>{p.student}</strong> · Rm <strong>{p.room}</strong></p>
                           <p style={{margin:'2px 0 0', fontSize:11, fontWeight:600, color:'#94a3b8'}}>Carrier: {p.carrier || 'Amazon'} · Received: {p.date || 'Today'}</p>
                        </div>

                        {p.status !== 'Claimed' && (
                           <button onClick={() => {
                              setParcels(prev => prev.map(item => item.id === p.id ? {...item, status: 'Claimed'} : item));
                              showToast(`✅ Parcel handed over to ${p.student}!`, 'success');
                           }} style={{padding:'8px 14px', background:'#0f172a', color:'#fde047', border:'none', borderRadius:10, fontSize:12, fontWeight:800, cursor:'pointer', fontFamily:'inherit', flexShrink:0}}>
                              Hand Over
                           </button>
                        )}
                     </div>
                  ))}
                  {(parcels || []).length === 0 && (
                     <p style={{textAlign:'center', color:'#94a3b8', fontSize:13, margin:'10px 0'}}>No parcels recorded yet today.</p>
                  )}
               </div>
            </div>

            {/* Pending Gate Approvals */}
            <div style={{marginTop:16}}>
               <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
                  <h3 style={{margin:0, fontSize:16, fontWeight:900, color:'#1e293b'}}>Pending Gate Approvals</h3>
                  <span style={{background:'#fef08a', color:'#854d0e', padding:'4px 10px', borderRadius:20, fontSize:12, fontWeight:800}}>{(visitorLogs || []).filter(v=>v.status==='Pending Entry' || v.status==='Pending Exit').length} Pending</span>
               </div>
               <div style={{display:'flex', flexDirection:'column', gap:10}}>
                  {(visitorLogs || []).filter(v=>v.status==='Pending Entry' || v.status==='Pending Exit').map(v => (
                     <div key={v.docId || v.id} style={{background:'#fff', borderRadius:16, padding:'16px', border:'1px solid #fde047', boxShadow:'0 4px 12px rgba(253,224,71,0.15)', display:'flex', flexDirection:'column', gap:12}}>
                        <div>
                           <div style={{display:'flex', alignItems:'center', gap:6}}>
                              <span style={{fontSize:15, fontWeight:900, color:'#0f172a'}}>{v.visitorName || v.name}</span>
                              <span style={{padding:'2px 8px', borderRadius:8, background:'#fef08a', color:'#854d0e', fontSize:10, fontWeight:800}}>{v.status}</span>
                           </div>
                           <p style={{margin:'4px 0 0', fontSize:13, fontWeight:700, color:'#64748b'}}>Student: {v.tenantName || v.room} · {v.purpose}</p>
                           {v.contact && <p style={{margin:'4px 0 0', fontSize:12, fontWeight:600, color:'#475569'}}>Phone: {v.contact}</p>}
                           <p style={{margin:'4px 0 0', fontSize:11, fontWeight:600, color:'#94a3b8'}}>Requested In: {v.timeIn}</p>
                        </div>
                        <div style={{display:'flex', gap:8}}>
                           {v.status === 'Pending Entry' && (
                             <>
                               <button onClick={()=>handleApproveEntry(v.docId)} style={{flex:1, padding:'8px', background:'#22c55e', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:800, cursor:'pointer'}}>Allow Entry</button>
                               <button onClick={()=>handleDenyEntry(v.docId)} style={{flex:1, padding:'8px', background:'#fee2e2', color:'#ef4444', border:'none', borderRadius:10, fontSize:13, fontWeight:800, cursor:'pointer'}}>Deny Entry</button>
                             </>
                           )}
                           {v.status === 'Pending Exit' && (
                             <button onClick={()=>handleApproveExit(v.docId)} style={{flex:1, padding:'8px', background:'#3b82f6', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:800, cursor:'pointer'}}>Approve Exit</button>
                           )}
                        </div>
                     </div>
                  ))}
                  {(visitorLogs || []).filter(v=>v.status==='Pending Entry' || v.status==='Pending Exit').length === 0 && (
                     <p style={{textAlign:'center', color:'#94a3b8', fontSize:13, margin:'10px 0'}}>No pending approvals.</p>
                  )}
               </div>
            </div>

            {/* Current Visitors Inside */}
            <div style={{marginTop:24}}>
               <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
                  <h3 style={{margin:0, fontSize:16, fontWeight:900, color:'#1e293b'}}>Current Visitors Inside</h3>
                  <span style={{background:'#dbeafe', color:'#1d4ed8', padding:'4px 10px', borderRadius:20, fontSize:12, fontWeight:800}}>{(visitorLogs || []).filter(v=>v.status==='Inside').length} Inside</span>
               </div>
               <div style={{display:'flex', flexDirection:'column', gap:10}}>
                  {(visitorLogs || []).filter(v=>v.status==='Inside').map(v => (
                     <div key={v.docId || v.id} style={{background:'#fff', borderRadius:16, padding:'16px', border:'1px solid #f1f5f9', boxShadow:'0 2px 8px rgba(0,0,0,0.02)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <div>
                           <div style={{display:'flex', alignItems:'center', gap:6}}>
                              <span style={{fontSize:15, fontWeight:900, color:'#0f172a'}}>{v.visitorName || v.name}</span>
                              <span style={{width:8, height:8, borderRadius:4, background:'#22c55e'}}></span>
                           </div>
                           <p style={{margin:'4px 0 0', fontSize:13, fontWeight:700, color:'#64748b'}}>Student: {v.tenantName || v.room} · {v.purpose}</p>
                           <p style={{margin:'4px 0 0', fontSize:11, fontWeight:600, color:'#94a3b8'}}>In: {v.timeIn} | Approved by: {v.approvedBy || 'Auto'}</p>
                        </div>
                     </div>
                  ))}
               </div>
            </div>

            {/* Modal for New Visitor */}
            </>)}

          {/* 🚌 BUS DRIVER ROLE VIEW */}
          {(staffRole === 'Bus Driver' || staffRole === 'Driver' || staffRole === 'Shuttle Driver') && (() => {
             return (
                <div style={{display:'flex', flexDirection:'column', gap:14}}>
                   {/* Driver Route Card */}
                   <div style={{background:'linear-gradient(135deg, #0f172a, #1e293b)', borderRadius:20, padding:'20px', color:'#fff', boxShadow:'0 8px 20px rgba(15,23,42,0.15)'}}>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10}}>
                         <span style={{fontSize:11, fontWeight:800, textTransform:'uppercase', color:'#fde047', letterSpacing:1}}>🚌 Route #1 · Campus Express</span>
                         <span style={{fontSize:10, fontWeight:800, padding:'3px 8px', borderRadius:6, background:'#22c55e', color:'#fff'}}>ON TRIP</span>
                      </div>
                      <h2 style={{margin:0, fontSize:22, fontWeight:900, color:'#fff'}}>PG Hostel ➔ Sector 62 Metro</h2>
                      <p style={{margin:'4px 0 0', fontSize:12, fontWeight:600, color:'#94a3b8'}}>Morning Shift: 08:00 AM – 09:30 AM | Bus: UP 16 AB 4021</p>
                      
                      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:16}}>
                         <button onClick={()=>setShowFuelModal(true)} style={{padding:'10px', background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:12, color:'#fff', fontSize:12, fontWeight:800, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:6}}>
                            <span className="material-symbols-outlined" style={{fontSize:16}}>local_gas_station</span> Log Fuel Expense
                         </button>
                         <button onClick={()=>showToast('📢 Broadcast notification sent to all 6 shuttle passengers!', 'info')} style={{padding:'10px', background:'#fde047', border:'none', borderRadius:12, color:'#0f172a', fontSize:12, fontWeight:900, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:6}}>
                            <span className="material-symbols-outlined" style={{fontSize:16}}>campaign</span> Alert Passengers
                         </button>
                      </div>
                   </div>

                   {/* Student Passenger Roster */}
                   <div style={{background:'#fff', borderRadius:18, border:'1.5px solid #e2e8f0', padding:'16px', boxShadow:'0 4px 14px rgba(15,23,42,0.04)'}}>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
                         <div>
                            <h3 style={{margin:0, fontSize:16, fontWeight:900, color:'#0f172a'}}>Passenger Checklist</h3>
                            <p style={{margin:'2px 0 0', fontSize:12, fontWeight:600, color:'#64748b'}}>{passengers.filter(p=>p.status==='Boarded').length} / {passengers.length} Boarded</p>
                         </div>
                         <span style={{fontSize:12, fontWeight:800, padding:'4px 10px', borderRadius:20, background:'#f1f5f9', color:'#475569'}}>{passengers.length} Total</span>
                      </div>

                      <div style={{display:'flex', flexDirection:'column', gap:10}}>
                         {passengers.map(p => (
                            <div key={p.id} style={{background:'#f8fafc', borderRadius:14, padding:'12px 14px', border:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                               <div>
                                  <div style={{display:'flex', alignItems:'center', gap:8}}>
                                     <span style={{fontSize:14, fontWeight:900, color:'#0f172a'}}>{p.name}</span>
                                     <span style={{fontSize:11, fontWeight:700, color:'#64748b'}}>Rm {p.room}</span>
                                  </div>
                                  <p style={{margin:'2px 0 0', fontSize:11, fontWeight:600, color:'#94a3b8'}}>Pickup: {p.time}</p>
                               </div>
                               <div style={{display:'flex', gap:6, alignItems:'center'}}>
                                  <a href={`tel:${p.phone}`} style={{width:32, height:32, borderRadius:10, background:'#e0f2fe', color:'#0369a1', display:'flex', alignItems:'center', justifyContent:'center', textDecoration:'none'}}>
                                     <span className="material-symbols-outlined" style={{fontSize:16}}>phone</span>
                                  </a>
                                  <button onClick={()=>{
                                     setPassengers(prev => prev.map(x => x.id === p.id ? {...x, status: x.status==='Boarded' ? 'Waiting' : x.status==='Waiting' ? 'Absent' : 'Boarded'} : x));
                                  }} style={{padding:'6px 12px', borderRadius:8, border:'none', background: p.status==='Boarded' ? '#dcfce7' : p.status==='Waiting' ? '#fef08a' : '#fee2e2', color: p.status==='Boarded' ? '#15803d' : p.status==='Waiting' ? '#92400e' : '#b91c1c', fontSize:11, fontWeight:800, cursor:'pointer', fontFamily:'inherit'}}>
                                     {p.status}
                                  </button>
                               </div>
                            </div>
                         ))}
                      </div>
                   </div>
                </div>
             );
          })()}



          {/* HELPER / OTHERS TASK DASHBOARD */}
          {(staffRole === 'Helper' || staffRole === 'Others') && (<>
            {/* Availability Toggle */}
            <div style={{background: isAvailable ? '#dcfce7' : '#fee2e2', borderRadius:16, border: `1px solid ${isAvailable ? '#86efac' : '#fca5a5'}`, padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'center', boxShadow:'0 4px 12px rgba(15,23,42,0.05)'}}>
              <div>
                <p style={{margin:0, fontSize:13, fontWeight:900, color: isAvailable ? '#166534' : '#991b1b'}}>
                  {isAvailable ? '✅ You are Available' : '🔴 Marked Unavailable'}
                </p>
                <p style={{margin:'2px 0 0', fontSize:11, fontWeight:700, color: isAvailable ? '#15803d' : '#b91c1c'}}>
                  {isAvailable ? 'Admin can assign you tasks' : 'Toggle to go back on duty'}
                </p>
              </div>
              <button onClick={()=>setIsAvailable(p=>!p)} style={{padding:'8px 16px', borderRadius:10, border:'none', background: isAvailable ? '#16a34a' : '#dc2626', color:'#fff', fontSize:12, fontWeight:900, cursor:'pointer', fontFamily:'inherit'}}>
                {isAvailable ? 'Go Off Duty' : 'Go On Duty'}
              </button>
            </div>

          </>)}

                    {/* PLUMBER WORK QUEUE */}
          {staffRole === 'Plumber' && (<>
            <div style={{background: 'linear-gradient(to bottom, #fffef2, #fffdf0)', borderRadius:18, border:'1.5px solid #e8df9a', padding:'20px 18px', color:'#1a1500'}}>
              <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:4}}>
                <span className="material-symbols-outlined" style={{fontSize:20, color:'#ca8a04'}}>water_drop</span>
                <span style={{fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:0.5, color:'#ca8a04'}}>Plumbing & Water Systems</span>
              </div>
              <h3 style={{margin:0, fontSize:22, fontWeight:900, color:'#1a1500'}}>Job Work Queue</h3>
              <p style={{margin:'4px 0 0', fontSize:12.5, color:C.muted, fontWeight:700}}>{plumbingJobs.filter(j=>j.status==='Open').length} open · {plumbingJobs.filter(j=>j.status==='In Progress').length} in progress · {plumbingJobs.filter(j=>j.priority==='High').length} urgent</p>
            </div>

            <div style={{display:'flex', flexDirection:'column', gap:14}}>
              {plumbingJobs.map(j => (
                <div key={j.id} style={{background:'#fff', border:'1px solid #f6f3df', borderRadius:18, padding:'20px', boxShadow:'0 4px 16px rgba(120, 104, 10, 0.03)'}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12}}>
                    <div style={{flex:1}}>
                      <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:6}}>
                        <span style={{fontSize:15, fontWeight:900, color:'#1a1500'}}>Room {j.room}</span>
                        <span style={{fontSize:10, fontWeight:800, padding:'2px 8px', borderRadius:6, background: j.priority==='High'?'#fef2f2':'#f8fafc', color: j.priority==='High'?'#b91c1c':'#475569'}}>{j.priority}</span>
                        <span style={{fontSize:10, fontWeight:800, padding:'2px 8px', borderRadius:6, background: '#fce7f3', color:'#be185d', display:'flex', alignItems:'center', gap:4, boxShadow:'0 2px 4px rgba(190,24,93,0.1)'}}><span className="material-symbols-outlined" style={{fontSize:12}}>record_voice_over</span>Student Complaint</span>
                      </div>
                      <p style={{margin:0, fontSize:15, fontWeight:800, color:'#1a1500'}}>{j.issue}</p>
                      <p style={{margin:'6px 0 0', fontSize:11.5, fontWeight:600, color:C.muted}}>by {j.student} · {j.date}</p>
                      
                      {j.note && (
                        <div style={{marginTop:10, borderLeft:'2.5px solid #ca8a04', paddingLeft:10, fontSize:12, fontWeight:700, color:'#ca8a04', fontStyle:'italic'}}>
                          Note: {j.note}
                        </div>
                      )}
                    </div>
                    <span style={{fontSize:11, fontWeight:800, padding:'4px 10px', borderRadius:8, background: j.status==='Resolved'?'#dcfce7':j.status==='In Progress'?'#fff7ed':'#eff6ff', color: j.status==='Resolved'?'#15803d':j.status==='In Progress'?'#c2410c':'#1d4ed8'}}>{j.status}</span>
                  </div>

                  <div style={{display:'flex', justifyContent:'flex-end', gap:8, marginTop:14}}>
                    {j.status !== 'Resolved' && (
                      <button 
                        onClick={()=>updateTicketStatus(j.id, j.status==='Open'?'In Progress':'Resolved')} 
                        style={{
                          padding:'8px 16px', 
                          borderRadius:12, 
                          border:'none', 
                          background: j.status==='Open'?'#eff6ff':'#dcfce7', 
                          color: j.status==='Open'?'#1d4ed8':'#15803d', 
                          fontSize:12, 
                          fontWeight:900, 
                          cursor:'pointer', 
                          fontFamily:'inherit',
                          display:'flex',
                          alignItems:'center',
                          gap:6
                        }}
                      >
                        <span className="material-symbols-outlined" style={{fontSize:14}}>
                          {j.status==='Open' ? 'play_arrow' : 'check'}
                        </span>
                        {j.status==='Open' ? 'Start Job' : 'Mark Resolved'}
                      </button>
                    )}
                    <a 
                      href={'tel:' + (visitors[0]?.phone || '+91 9800000000')} 
                      style={{
                        padding:'8px 16px', 
                        borderRadius:12, 
                        background:'#f0fdf4', 
                        border:'1px solid #dcfce7', 
                        color:'#15803d', 
                        fontSize:12, 
                        fontWeight:900, 
                        textDecoration:'none',
                        display:'flex',
                        alignItems:'center',
                        gap:6
                      }}
                    >
                      <span className="material-symbols-outlined" style={{fontSize:14}}>phone</span>
                      Call Student
                    </a>
                    <button 
                      onClick={()=>showToast('📸 Camera opened for job completion proof', 'info')}
                      style={{
                        padding:'8px 16px', 
                        borderRadius:12, 
                        background:'#f1f5f9', 
                        border:'1px solid #e2e8f0', 
                        color:'#475569', 
                        fontSize:12, 
                        fontWeight:900, 
                        cursor:'pointer',
                        display:'flex',
                        alignItems:'center',
                        gap:6,
                        fontFamily:'inherit'
                      }}
                    >
                      <span className="material-symbols-outlined" style={{fontSize:14}}>add_a_photo</span>
                      Upload Photo
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>)}

          {/* ELECTRICIAN WORK QUEUE */}
          {staffRole === 'Electrician' && (<>
            <div style={{background: 'linear-gradient(to bottom, #fffef2, #fffdf0)', borderRadius:18, border:'1.5px solid #e8df9a', padding:'20px 18px', color:'#1a1500'}}>
              <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:4}}>
                <span className="material-symbols-outlined" style={{fontSize:20, color:'#ca8a04'}}>bolt</span>
                <span style={{fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:0.5, color:'#ca8a04'}}>Electrical & Wiring</span>
              </div>
              <h3 style={{margin:0, fontSize:22, fontWeight:900, color:'#1a1500'}}>Job Work Queue</h3>
              <p style={{margin:'4px 0 0', fontSize:12.5, color:C.muted, fontWeight:700}}>{electricalJobs.filter(j=>j.status==='Open').length} open · {electricalJobs.filter(j=>j.priority==='High').length} high voltage danger</p>
            </div>

            {/* Safety Banner for High Priority */}
            {electricalJobs.some(j=>j.priority==='High' && j.status!=='Resolved') && (
              <div style={{background:'#fffbfe', border:'1.5px solid #fde047', borderRadius:18, padding:'12px 16px', display:'flex', alignItems:'center', gap:10, boxShadow:'0 4px 12px rgba(253, 224, 71, 0.05)'}}>
                <span className="material-symbols-outlined" style={{fontSize:20, color:'#ca8a04'}}>warning</span>
                <p style={{margin:0, fontSize:12.5, fontWeight:800, color:'#854d0e'}}>High voltage / sparking issue reported — use PPE before starting work!</p>
              </div>
            )}

            <div style={{display:'flex', flexDirection:'column', gap:14}}>
              {electricalJobs.map(j => (
                <div key={j.id} style={{background:'#fff', border:'1px solid #f6f3df', borderRadius:18, padding:'20px', boxShadow:'0 4px 16px rgba(120, 104, 10, 0.03)'}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12}}>
                    <div style={{flex:1}}>
                      <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:6}}>
                        <span style={{fontSize:15, fontWeight:900, color:'#1a1500'}}>Room {j.room}</span>
                        <span style={{fontSize:10, fontWeight:800, padding:'2px 8px', borderRadius:6, background: j.priority==='High'?'#fef2f2':'#f8fafc', color: j.priority==='High'?'#b91c1c':'#475569'}}>{j.priority}</span>
                        <span style={{fontSize:10, fontWeight:800, padding:'2px 8px', borderRadius:6, background: '#fce7f3', color:'#be185d', display:'flex', alignItems:'center', gap:4, boxShadow:'0 2px 4px rgba(190,24,93,0.1)'}}><span className="material-symbols-outlined" style={{fontSize:12}}>record_voice_over</span>Student Complaint</span>
                      </div>
                      <p style={{margin:0, fontSize:15, fontWeight:800, color:'#1a1500'}}>{j.issue}</p>
                      <p style={{margin:'6px 0 0', fontSize:11.5, fontWeight:600, color:C.muted}}>by {j.student} · {j.date}</p>
                      
                      {j.note && (
                        <div style={{marginTop:10, borderLeft:'2.5px solid #ca8a04', paddingLeft:10, fontSize:12, fontWeight:700, color:'#ca8a04', fontStyle:'italic'}}>
                          Note: {j.note}
                        </div>
                      )}
                    </div>
                    <span style={{fontSize:11, fontWeight:800, padding:'4px 10px', borderRadius:8, background: j.status==='Resolved'?'#dcfce7':j.status==='In Progress'?'#fff7ed':'#fefce8', color: j.status==='Resolved'?'#15803d':j.status==='In Progress'?'#c2410c':'#ca8a04'}}>{j.status}</span>
                  </div>

                  {j.status !== 'Resolved' && (
                    <div style={{display:'flex', justifyContent:'flex-end', marginTop:14}}>
                      <button 
                        onClick={()=>updateTicketStatus(j.id, j.status==='Open'?'In Progress':'Resolved')} 
                        style={{
                          padding:'8px 16px', 
                          borderRadius:12, 
                          border:'none', 
                          background: j.status==='Open'?'#fefce8':'#dcfce7', 
                          color: j.status==='Open'?'#ca8a04':'#15803d', 
                          fontSize:12, 
                          fontWeight:900, 
                          cursor:'pointer', 
                          fontFamily:'inherit',
                          display:'flex',
                          alignItems:'center',
                          gap:6
                        }}
                      >
                        <span className="material-symbols-outlined" style={{fontSize:14}}>
                          {j.status==='Open' ? 'play_arrow' : 'check'}
                        </span>
                        {j.status==='Open' ? 'Start Job' : 'Mark Resolved'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>)}

          {/* CARPENTER WORK QUEUE */}
          {staffRole === 'Carpenter' && (<>
            <div style={{background: 'linear-gradient(to bottom, #fffef2, #fffdf0)', borderRadius:18, border:'1.5px solid #e8df9a', padding:'20px 18px', color:'#1a1500'}}>
              <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:4}}>
                <span className="material-symbols-outlined" style={{fontSize:20, color:'#ca8a04'}}>handyman</span>
                <span style={{fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:0.5, color:'#ca8a04'}}>Carpentry & Fixtures</span>
              </div>
              <h3 style={{margin:0, fontSize:22, fontWeight:900, color:'#1a1500'}}>Job Work Queue</h3>
              <p style={{margin:'4px 0 0', fontSize:12.5, color:C.muted, fontWeight:700}}>{carpenterJobs.filter(j=>j.status==='Open').length} open jobs · {carpenterJobs.filter(j=>j.priority==='High').length} urgent</p>
            </div>

            <div style={{display:'flex', flexDirection:'column', gap:14}}>
              {carpenterJobs.map(j => (
                <div key={j.id} style={{background:'#fff', border:'1px solid #f6f3df', borderRadius:18, padding:'20px', boxShadow:'0 4px 16px rgba(120, 104, 10, 0.03)'}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12}}>
                    <div style={{flex:1}}>
                      <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:6}}>
                        <span style={{fontSize:15, fontWeight:900, color:'#1a1500'}}>Room {j.room}</span>
                        <span style={{fontSize:10, fontWeight:800, padding:'2px 8px', borderRadius:6, background: j.priority==='High'?'#fef3c7':'#f8fafc', color: j.priority==='High'?'#92400e':'#475569'}}>{j.priority}</span>
                      </div>
                      <p style={{margin:0, fontSize:15, fontWeight:800, color:'#1a1500'}}>{j.issue}</p>
                      <p style={{margin:'6px 0 0', fontSize:11.5, fontWeight:600, color:C.muted}}>by {j.student} · {j.date}</p>
                      
                      {j.note && (
                        <div style={{marginTop:10, borderLeft:'2.5px solid #ca8a04', paddingLeft:10, fontSize:12, fontWeight:700, color:'#ca8a04', fontStyle:'italic'}}>
                          Note: {j.note}
                        </div>
                      )}
                    </div>
                    <span style={{fontSize:11, fontWeight:800, padding:'4px 10px', borderRadius:8, background: j.status==='Resolved'?'#dcfce7':j.status==='In Progress'?'#fff7ed':'#fefce8', color: j.status==='Resolved'?'#15803d':j.status==='In Progress'?'#c2410c':'#78350f'}}>{j.status}</span>
                  </div>

                  {j.status !== 'Resolved' && (
                    <div style={{display:'flex', justifyContent:'flex-end', marginTop:14}}>
                      <button 
                        onClick={()=>updateTicketStatus(j.id, j.status==='Open'?'In Progress':'Resolved')} 
                        style={{
                          padding:'8px 16px', 
                          borderRadius:12, 
                          border:'none', 
                          background: j.status==='Open'?'#fef3c7':'#dcfce7', 
                          color: j.status==='Open'?'#78350f':'#15803d', 
                          fontSize:12, 
                          fontWeight:900, 
                          cursor:'pointer', 
                          fontFamily:'inherit',
                          display:'flex',
                          alignItems:'center',
                          gap:6
                        }}
                      >
                        <span className="material-symbols-outlined" style={{fontSize:14}}>
                          {j.status==='Open' ? 'play_arrow' : 'check'}
                        </span>
                        {j.status==='Open' ? 'Start Job' : 'Mark Resolved'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Material Request */}
            <button onClick={() => setShowDemandForm(true)} style={{width:'100%', padding:14, background:'#fef3c7', border:'1px solid #fde68a', borderRadius:14, fontSize:13, fontWeight:900, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, color:'#78350f', fontFamily:'inherit', boxShadow:'0 3px 10px rgba(120,53,15,0.1)'}}>
              <span className="material-symbols-outlined" style={{fontSize:18}}>add_shopping_cart</span>
              Request Materials / Tools
            </button>
          </>)}
          {/* SALES MANAGER DASHBOARD */}
          {staffRole === 'Sales Manager' && (<>
            {/* Tab nav */}
            <div style={{display:'flex', background:'#fff', borderRadius:12, padding:4, border:'1px solid #e2e8f0', boxShadow:'0 2px 8px rgba(15,23,42,0.04)'}}>
              <button onClick={()=>setSalesTab('leads')} style={{flex:1, padding:'10px 0', borderRadius:10, border:'none', background: salesTab==='leads' ? '#fde047' : 'transparent', color: salesTab==='leads' ? '#78350f' : C.muted, fontSize:13, fontWeight:900, cursor:'pointer', fontFamily:'inherit'}}>
                📞 Leads ({enquiries.length})
              </button>
              <button onClick={()=>setSalesTab('rooms')} style={{flex:1, padding:'10px 0', borderRadius:10, border:'none', background: salesTab==='rooms' ? '#fef3c7' : 'transparent', color: salesTab==='rooms' ? '#92400e' : C.muted, fontSize:13, fontWeight:900, cursor:'pointer', fontFamily:'inherit'}}>
                🛏 Rooms ({rooms.length})
              </button>
            </div>

            {/* LEADS TAB */}
            {salesTab === 'leads' && (<>
              {/* Pipeline summary */}
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10}}>
                {[
                  {l:'New', v:enquiries.filter(e=>(e.status || '').includes('New')).length, bg:'#fee2e2', c:'#b91c1c'},
                  {l:'Contacted', v:enquiries.filter(e=>(e.status || '').includes('Contacted')).length, bg:'#fef3c7', c:'#92400e'},
                  {l:'Converted', v:enquiries.filter(e=>(e.status || '').includes('Closed')).length, bg:'#dcfce7', c:'#166534'},
                ].map(s => (
                  <div key={s.l} style={{background:s.bg, borderRadius:14, border:'1px solid #e2e8f0', padding:12, textAlign:'center', boxShadow:'0 2px 8px rgba(15,23,42,0.04)'}}>
                    <p style={{fontSize:26, fontWeight:900, margin:0, color:s.c}}>{s.v}</p>
                    <p style={{fontSize:11, fontWeight:800, margin:'2px 0 0', color:s.c, textTransform:'uppercase'}}>{s.l}</p>
                  </div>
                ))}
              </div>

              {/* Lead cards */}
              <div style={{display:'flex', flexDirection:'column', gap:12}}>
                {enquiries.map(e => (
                  <div key={e.id} style={{background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, padding:14, boxShadow:'0 4px 14px rgba(15,23,42,0.04)'}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8}}>
                      <div>
                        <h4 style={{margin:0, fontSize:15, fontWeight:900, color:C.text}}>{e.name}</h4>
                        <p style={{margin:'2px 0 0', fontSize:12, color:C.muted}}>{e.phone}</p>
                      </div>
                      <span style={{fontSize:11, fontWeight:800, padding:'4px 10px', borderRadius:20, background: (e.status || '').includes('Closed')?'#dcfce7':(e.status || '').includes('Contacted')?'#fef3c7':'#fee2e2', color: (e.status || '').includes('Closed')?'#166534':(e.status || '').includes('Contacted')?'#92400e':'#b91c1c'}}>{e.status}</span>
                    </div>
                    <div style={{display:'flex', gap:6, flexWrap:'wrap', marginBottom:8}}>
                      <Chip label={e.requirement} color="#4338ca" bg="#fefce8"/>
                      <Chip label={e.budget} color="#166534" bg="#dcfce7"/>
                      <Chip label={e.source} color="#475569" bg="#f1f5f9"/>
                    </div>
                    <p style={{margin:'0 0 10px', fontSize:12, color:'#334155', background:'#f8fafc', padding:'8px 10px', borderRadius:8, border:'1px solid #e2e8f0'}}>"{e.text}"</p>
                    <div style={{display:'flex', gap:8}}>
                      <a href={`tel:${e.phone}`} style={{flex:1, textAlign:'center', padding:'9px 0', background:'#dcfce7', border:'1px solid #86efac', borderRadius:10, color:'#166534', fontSize:12, fontWeight:800, textDecoration:'none'}}>
                        📞 Call
                      </a>
                      <button onClick={()=>setEnquiries(prev=>prev.map(x=>x.id===e.id?{...x,status:(x.status || '').includes('Contacted')?'Closed 🟢':'Contacted 🟡'}:x))} style={{flex:2, padding:'9px 0', background:'#fefce8', border:'1px solid #fcd34d', borderRadius:10, color:'#78350f', fontSize:12, fontWeight:800, cursor:'pointer', fontFamily:'inherit'}}>
                        {(e.status || '').includes('Contacted') ? '✓ Mark Converted' : '📲 Mark Contacted'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>)}

            {/* ROOMS TAB */}
            {salesTab === 'rooms' && (<>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:4}}>
                <div style={{background:'#dcfce7', borderRadius:14, border:'1px solid #86efac', padding:14, textAlign:'center'}}>
                  <p style={{fontSize:26, fontWeight:900, margin:0, color:'#166534'}}>{rooms.filter(r=>r.status==='Occupied').length}</p>
                  <p style={{fontSize:11, fontWeight:800, margin:'2px 0 0', color:'#166534', textTransform:'uppercase'}}>Occupied</p>
                </div>
                <div style={{background:'#fef3c7', borderRadius:14, border:'1px solid #fde68a', padding:14, textAlign:'center'}}>
                  <p style={{fontSize:26, fontWeight:900, margin:0, color:'#92400e'}}>{rooms.filter(r=>r.status==='Vacant').length}</p>
                  <p style={{fontSize:11, fontWeight:800, margin:'2px 0 0', color:'#92400e', textTransform:'uppercase'}}>Vacant — Available</p>
                </div>
              </div>

              {rooms.map(r => (
                <div key={r.docId || r.id} style={{background:'#fff', border:`1px solid ${r.status==='Vacant'?'#fde68a':'#e2e8f0'}`, borderRadius:14, padding:14, display:'flex', justifyContent:'space-between', alignItems:'center', boxShadow:'0 3px 10px rgba(15,23,42,0.04)'}}>
                  <div>
                    <div style={{display:'flex', alignItems:'center', gap:6, marginBottom:4}}>
                      <span style={{fontSize:15, fontWeight:900, color:C.text}}>Room {r.number}</span>
                      <Chip label={r.type} color="#4338ca" bg="#fefce8"/>
                      <span style={{fontSize:11, fontWeight:800, padding:'2px 8px', borderRadius:20, background: r.status==='Vacant'?'#fef3c7':'#dcfce7', color: r.status==='Vacant'?'#92400e':'#166534'}}>{r.status}</span>
                    </div>
                    <p style={{margin:0, fontSize:11, color:C.muted}}>{r.status==='Occupied'?r.student:'Available now'} · Rent: {r.rent}</p>
                  </div>
                  {r.status === 'Vacant' && (
                    <button style={{padding:'8px 12px', borderRadius:10, border:'none', background:'#fef3c7', color:'#92400e', fontSize:11, fontWeight:900, cursor:'pointer', fontFamily:'inherit'}}>
                      Share
                    </button>
                  )}
                </div>
              ))}
            </>)}
          </>)}

          {/* MANAGER OPERATIONS OVERVIEW */}
          {staffRole === 'Manager' && (<>
            {/* Command Center Header */}
            <div style={{background:'linear-gradient(160deg, #0c1a2e 0%, #0f2847 60%, #0c3461 100%)', borderRadius:16, padding:'16px 18px', color:'#fff', boxShadow:'0 4px 16px rgba(12,26,46,0.15)', position:'relative', overflow:'hidden'}}>
              <div style={{position:'absolute', top:-30, right:-30, width:120, height:120, borderRadius:'50%', background:'rgba(56,189,248,0.1)', pointerEvents:'none'}} />
              <p style={{margin:0, fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:0.5, color:'#38bdf8'}}>🏢 Command Center</p>
              <h3 style={{margin:'4px 0 2px', fontSize:20, fontWeight:900, color:'#ffffff'}}>Operations Overview</h3>
              <p style={{margin:0, fontSize:12, color:'#94a3b8', fontWeight:600}}>All departments & live status</p>
            </div>

            {/* Department KPI Grid */}
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
              {[
                {label:'Staff On Duty', value:`${staffOnDuty} / ${totalStaff}`, icon:'groups', bg:'#ecfdf5', color:'#059669', sub:`${Math.max(0, totalStaff - staffOnDuty)} off shift`, view:'manage_staff'},
                {label:'Vacant Seats', value: String(Math.max(0, totalCapacity - students.length)), icon:'meeting_room', bg:'#ecfeff', color:'#0891b2', sub:`Out of ${totalCapacity} total seats`, view:'manage_rooms'},
                {label:'Active Tenants', value: String(students.length), icon:'person', bg:'#f0fdf4', color:'#16a34a', sub:'Current residents', view:'manage_tenants'},
                {label:'Open Issues', value: String(tickets.filter(t => t.status === 'Active' || t.status === 'Pending' || t.status === 'Open').length), icon:'report_problem', bg:'#fff1f2', color:'#e11d48', sub:'Maintenance complaints', view:'complaints'},
                {label:'New Leads', value: String(enquiries.filter(e=>e.status==='New' || e.status==='New Lead').length), icon:'contact_phone', bg:'#f5f3ff', color:'#7c3aed', sub:'Room enquiries', view:'enquiry'},
                {label:'Mess Covers', value:`${students.filter(s=>s['status'+(mealTab||'Lunch').charAt(0)]!=='notEaten').length} / ${students.length}`, icon:'restaurant', bg:'#fffbeb', color:'#d97706', sub:`Today ${mealTab||'Lunch'}`, view:'mess_headcount'},
              ].map(k => (
                <div key={k.label} onClick={() => k.view && setView(k.view)} style={{background:'white', borderRadius:16, border:'1px solid #e2e8f0', padding:'14px 16px', boxShadow:'0 1px 3px rgba(0,0,0,0.05)', cursor:'pointer', transition:'all 0.15s'}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                    <div>
                      <p style={{fontSize:11, fontWeight:700, color:'#64748b', margin:0, textTransform:'uppercase', letterSpacing:0.3}}>{k.label}</p>
                      <p style={{fontSize:22, fontWeight:900, color:'#0f172a', margin:'4px 0 2px'}}>{k.value}</p>
                      <p style={{fontSize:11, fontWeight:600, color:k.color, margin:0}}>{k.sub}</p>
                    </div>
                    <div style={{width:36, height:36, borderRadius:10, background:k.bg, display:'flex', alignItems:'center', justifyContent:'center'}}>
                      <span className="material-symbols-outlined" style={{fontSize:20, color:k.color}}>{k.icon}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Mess & Meal Management Card */}
            <div style={{background:'#fff', borderRadius:16, border:'1px solid #e2e8f0', padding:16, boxShadow:'0 4px 16px rgba(15,23,42,0.05)'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
                <div style={{display:'flex', alignItems:'center', gap:8}}>
                  <div style={{width:36, height:36, borderRadius:10, background:'#ede9fe', display:'flex', alignItems:'center', justifyContent:'center'}}>
                    <span className="material-symbols-outlined" style={{fontSize:20, color:'#7c3aed'}}>restaurant_menu</span>
                  </div>
                  <div>
                    <p style={{margin:0, fontSize:14, fontWeight:900, color:C.text}}>Mess & Meal Management</p>
                    <p style={{margin:'2px 0 0', fontSize:11, color:C.muted}}>Pause / resume meals & manage food menu</p>
                  </div>
                </div>
                <div style={{display:'flex', gap:6}}>
                  <button
                    onClick={() => setView('mess_headcount')}
                    style={{
                      background: '#ede9fe',
                      color: '#6d28d9',
                      border: '1px solid #ddd6fe',
                      borderRadius: 10,
                      padding: '6px 10px',
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <span className="material-symbols-outlined" style={{fontSize:16}}>restaurant</span>
                    Live Mess
                  </button>
                  <button
                    onClick={() => setView('foodMenu')}
                    style={{
                      background: '#f8fafc',
                      color: '#475569',
                      border: '1px solid #e2e8f0',
                      borderRadius: 10,
                      padding: '6px 10px',
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <span className="material-symbols-outlined" style={{fontSize:16}}>edit</span>
                    Menu
                  </button>
                </div>
              </div>

              {/* Pause/Resume Meals Grid */}
              <div style={{display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:8, marginTop:8}}>
                {['Breakfast', 'Lunch', 'Snacks', 'Dinner'].map(meal => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  const mKey = meal.toLowerCase();
                  const isPaused = !!(pausedMeals?.[todayStr]?.[mKey]);
                  return (
                    <div
                      key={meal}
                      style={{
                        background: isPaused ? '#fff1f2' : '#f8fafc',
                        border: `1px solid ${isPaused ? '#fecaca' : '#e2e8f0'}`,
                        borderRadius: 12,
                        padding: '10px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6
                      }}
                    >
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <span style={{fontSize:13, fontWeight:900, color: isPaused ? '#b91c1c' : '#1e293b'}}>{meal}</span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: 6,
                            background: isPaused ? '#fee2e2' : '#dcfce7',
                            color: isPaused ? '#dc2626' : '#166534'
                          }}
                        >
                          {isPaused ? '⏸️ Paused' : '🟢 Active'}
                        </span>
                      </div>
                      <button
                        onClick={() => handleToggleMealPause(meal, todayStr)}
                        style={{
                          width: '100%',
                          padding: '6px 0',
                          borderRadius: 8,
                          border: 'none',
                          background: isPaused ? '#10b981' : '#e11d48',
                          color: '#fff',
                          fontSize: 11,
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4
                        }}
                      >
                        <span className="material-symbols-outlined" style={{fontSize:14}}>
                          {isPaused ? 'play_arrow' : 'pause'}
                        </span>
                        {isPaused ? 'Resume Meal' : 'Pause Meal'}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:12, paddingTop:10, borderTop:'1px solid #f1f5f9'}}>
                <span style={{fontSize:11, color:C.muted}}>Paused meals block tenant meal passes & orders.</span>
                <button
                  onClick={() => {
                    fetchCookMenuHistory();
                    setShowMenuHistoryModal(true);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#7c3aed',
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2
                  }}
                >
                  <span className="material-symbols-outlined" style={{fontSize:15}}>history</span> History
                </button>
              </div>
            </div>

            {/* Open Issues Summary by Department */}
            {/* Attendance Quick View */}
            <div style={{background:'#fff', borderRadius:16, border:'1px solid #e2e8f0', padding:16, boxShadow:'0 4px 16px rgba(15,23,42,0.05)'}}>
              <p style={{margin:'0 0 12px', fontSize:14, fontWeight:900, color:C.text}}>👥 Staff On Duty Today</p>
              {allStaff.length === 0 && <p style={{margin:0, fontSize:13, color:C.muted}}>No staff found.</p>}
              {allStaff.map(s => {
                const isWorkingToday = allAttendance.find(a => a.staffId === s.id || a.staffToken === s.id);
                const todayStr = new Date().toISOString().split('T')[0];
                const isOnLeave = allLeaves.find(l => (l.staffId === s.id || l.staffToken === s.id) && l.from <= todayStr && l.to >= todayStr);
                
                let statusLabel = 'Off Duty';
                let chipColor = '#64748b';
                let chipBg = '#f1f5f9';

                if (isOnLeave) {
                  statusLabel = 'On Leave';
                  chipColor = '#b91c1c';
                  chipBg = '#fee2e2';
                } else if (isWorkingToday && isWorkingToday.status === 'working') {
                  statusLabel = 'On Duty ✅';
                  chipColor = '#166534';
                  chipBg = '#dcfce7';
                }

                return (
                  <div key={s.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid #f1f5f9'}}>
                    <span style={{fontSize:13, fontWeight:700, color:C.text}}>{s.role} ({s.name})</span>
                    <Chip label={statusLabel} color={chipColor} bg={chipBg}/>
                  </div>
                );
              })}
            </div>
          </>)}

          {/* HR DASHBOARD - HIRING & ENQUIRIES */}
          {staffRole === 'HR' && (<>
            {/* HR Navigation Tabs */}
            <div style={{display:'flex', background:'#fff', borderRadius:12, padding:4, border: '1px solid #e2e8f0', boxShadow: '0 3px 12px rgba(15,23,42,0.05)'}}>
              <button 
                onClick={()=>setHrTab('hiring')} 
                style={{
                  flex:1, padding:'10px 0', borderRadius:10, border: hrTab==='hiring'?'2px solid #000':'2px solid transparent',
                  background: hrTab==='hiring' ? '#fde047' : 'transparent', color: '#000', fontSize:13, fontWeight:900, cursor:'pointer', fontFamily:'inherit'
                }}
              >
                👥 Hiring & Candidates ({candidates.length})
              </button>
              <button 
                onClick={()=>setHrTab('enquiries')} 
                style={{
                  flex:1, padding:'10px 0', borderRadius:10, border: hrTab==='enquiries'?'2px solid #000':'2px solid transparent',
                  background: hrTab==='enquiries' ? '#fde047' : 'transparent', color: '#000', fontSize:13, fontWeight:900, cursor:'pointer', fontFamily:'inherit'
                }}
              >
                📋 Room Enquiries ({enquiries.length})
              </button>
            </div>

            {/* HIRING TAB */}
            {hrTab === 'hiring' && (
              <div style={{display:'flex', flexDirection:'column', gap:14}}>
                {/* Hiring Stat Header */}
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
                  <div style={{background:'#fef08a', borderRadius:14, border: '1px solid #e2e8f0', padding:14, textAlign:'center', boxShadow: '0 3px 12px rgba(15,23,42,0.05)'}}>
                    <p style={{fontSize:24, fontWeight:900, margin:0, color:'#000'}}>{candidates.filter(c=>c.status!=='Hired ✅').length}</p>
                    <p style={{fontSize:11, fontWeight:800, margin:'2px 0 0', textTransform:'uppercase', color:'#000'}}>Active Candidates</p>
                  </div>
                  <div style={{background:'#bbf7d0', borderRadius:14, border: '1px solid #e2e8f0', padding:14, textAlign:'center', boxShadow: '0 3px 12px rgba(15,23,42,0.05)'}}>
                    <p style={{fontSize:24, fontWeight:900, margin:0, color:'#000'}}>{candidates.filter(c=>c.status==='Hired ✅').length}</p>
                    <p style={{fontSize:11, fontWeight:800, margin:'2px 0 0', textTransform:'uppercase', color:'#000'}}>Staff Hired</p>
                  </div>
                </div>

                {/* Candidate Action Card List */}
                <div style={{background:'#fff', borderRadius:16, border: '1px solid #e2e8f0', padding:16, boxShadow: '0 4px 16px rgba(15,23,42,0.05)'}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
                    <p style={{margin:0, fontSize:15, fontWeight:900, color:'#000'}}>👔 Candidate Recruitment Pipeline</p>
                    <button 
                      onClick={()=>{
                        const name = prompt('Candidate Name:');
                        const pos = prompt('Applied Position (e.g. Cook, Cleaner, Security):');
                        if (name && pos) {
                          setCandidates(prev => [{id:Date.now(), name, position:pos, experience:'1 Yr', phone:'+91 9800000000', status:'Applied', date:'Just Now', note:'New Applicant'}, ...prev]);
                        }
                      }}
                      style={{padding:'6px 10px', background:'#fef08a', border: '1px solid #e2e8f0', borderRadius:8, fontSize:11, fontWeight:900, cursor:'pointer', fontFamily:'inherit'}}
                    >
                      + Add Candidate
                    </button>
                  </div>

                  <div style={{display:'flex', flexDirection:'column', gap:10}}>
                    {candidates.map(c => (
                      <div key={c.id} style={{background:'#fafafa', border: '1px solid #e2e8f0', borderRadius:12, padding:14, boxShadow: '0 2px 8px rgba(15,23,42,0.04)'}}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                          <div>
                            <span style={{fontSize:15, fontWeight:900, color:'#000'}}>{c.name}</span>
                            <div style={{display:'flex', gap:6, marginTop:4}}>
                              <Chip label={c.position} color="#78680a" bg="#fefce8"/>
                              <Chip label={c.experience} color="#0891b2" bg="#ecfeff"/>
                            </div>
                          </div>
                          <span style={{fontSize:11, fontWeight:800, padding:'3px 8px', borderRadius:8, border: '1px solid #e8df9a', background: c.status==='Hired ✅'?'#bbf7d0':'#fef08a', color:'#000'}}>
                            {c.status}
                          </span>
                        </div>

                        {c.note && (
                          <p style={{margin:'8px 0 0', fontSize:11, fontWeight:700, color:'#444'}}>💬 {c.note}</p>
                        )}

                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:12, paddingTop:8, borderTop:'1px dashed #000'}}>
                          <a href={`tel:${c.phone}`} style={{padding:'6px 10px', borderRadius:8, border: '1px solid #e2e8f0', background:'#bbf7d0', color:'#000', textDecoration:'none', fontSize:11, fontWeight:800, boxShadow: '0 2px 6px rgba(120, 104, 10, 0.04)'}}>
                            📞 Call Applicant
                          </a>

                          {c.status !== 'Hired ✅' && (
                            <button 
                              onClick={() => setCandidates(prev => prev.map(x => x.id === c.id ? {...x, status:'Hired ✅'} : x))}
                              style={{padding:'7px 12px', background:'#fef08a', border: '1px solid #e2e8f0', borderRadius:8, color:'#000', fontSize:11, fontWeight:900, cursor:'pointer', fontFamily:'inherit', boxShadow: '0 2px 8px rgba(15,23,42,0.04)'}}
                            >
                              Hire Staff ✅
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ROOM ENQUIRIES TAB */}
            {hrTab === 'enquiries' && (
              <div style={{display:'flex', flexDirection:'column', gap:14}}>
                {/* Enquiries Header Stats - Minimalist Blended Header */}
                <div style={{background:'#fefce8', borderRadius:16, border: '1px solid #fcd34d', padding:'16px', color:'#0f172a', boxShadow: '0 4px 16px rgba(202,138,4,0.1)'}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <div>
                      <p style={{margin:0, fontSize:11, fontWeight:800, textTransform:'uppercase', color:'#92400e', letterSpacing:0.5}}>🏠 Room Enquiries & Leads</p>
                      <h3 style={{margin:'2px 0 0', fontSize:19, fontWeight:900, color:'#0f172a'}}>Tenant Leads Management</h3>
                    </div>
                    <Chip label={`${enquiries.length} Active Leads`} color="#92400e" bg="#fffde7"/>
                  </div>
                </div>

                {/* Enquiries List */}
                <div style={{display:'flex', flexDirection:'column', gap:12}}>
                  {enquiries.map(e => (
                    <div key={e.id} style={{background:'#fff', border: '1px solid #e2e8f0', borderRadius:16, padding:16, boxShadow: '0 4px 14px rgba(15,23,42,0.04)'}}>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8}}>
                        <div>
                          <h4 style={{margin:0, fontSize:15, fontWeight:900, color:'#0f172a'}}>{e.name}</h4>
                          <p style={{margin:'2px 0 0', fontSize:12, fontWeight:700, color:C.muted}}>{e.phone}</p>
                        </div>
                        <span style={{
                          fontSize:11, fontWeight:800, padding:'4px 10px', borderRadius:20,
                          background: (e.status || '').includes('Closed')?'#dcfce7':(e.status || '').includes('Contacted')?'#fef3c7':'#fee2e2',
                          color: (e.status || '').includes('Closed')?'#15803d':(e.status || '').includes('Contacted')?'#b45309':'#b91c1c',
                          border: `1px solid ${(e.status || '').includes('Closed')?'#86efac':(e.status || '').includes('Contacted')?'#fde68a':'#fca5a5'}`
                        }}>
                          {e.status}
                        </span>
                      </div>

                      <div style={{display:'flex', gap:6, margin:'6px 0'}}>
                        <Chip label={e.requirement} color="#0891b2" bg="#ecfeff"/>
                        <Chip label={`Budget: ${e.budget}`} color="#78680a" bg="#fefce8"/>
                        <Chip label={e.source} color="#78680a" bg="#fefce8"/>
                      </div>

                      <p style={{margin:'6px 0 10px', fontSize:12, fontWeight:700, color:'#333', background:'#f8fafc', padding:'8px 10px', borderRadius:8, border: '1px solid #e8df9a'}}>
                        "{e.text}"
                      </p>

                      <div style={{display:'flex', gap:8, marginTop:8}}>
                        <a href={`tel:${e.phone}`} style={{flex:1, textAlign:'center', padding:'8px 0', background:'#bbf7d0', border: '1px solid #e2e8f0', borderRadius:8, color:'#000', fontSize:11, fontWeight:800, textDecoration:'none', boxShadow: '0 2px 6px rgba(120, 104, 10, 0.04)'}}>
                          📞 Call Lead
                        </a>
                        <button 
                          onClick={()=>setEnquiries(prev=>prev.map(x=>x.id===e.id?{...x, status: (x.status || '').includes('Contacted')?'Closed 🟢':'Contacted 🟡'}:x))}
                          style={{flex:1, padding:'8px 0', background:'#fef08a', border: '1px solid #e2e8f0', borderRadius:8, color:'#000', fontSize:11, fontWeight:900, cursor:'pointer', fontFamily:'inherit', boxShadow: '0 2px 6px rgba(120, 104, 10, 0.04)'}}
                        >
                          {(e.status || '').includes('Contacted') ? 'Mark Closed 🟢' : 'Mark Contacted 🟡'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>)}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          ATTENDANCE
         ══════════════════════════════════════════════════════════════════════ */}
      {view === 'inout' && (() => {
        const joinedDate = new Date(staffProfile?.createdAt || Date.now());
        const today = new Date();
        const curYear = today.getFullYear();
        const curMonth = today.getMonth(); // 0-indexed

        const daysInMonth = new Date(curYear, curMonth + 1, 0).getDate();
        
        let present = 0, absent = 0, leave = 0;
        const calendarData = {};

        // Calculate offset for the first day of the month (0 = Sunday, 1 = Monday)
        const firstDayOfMonth = new Date(curYear, curMonth, 1).getDay();

        for (let d = 1; d <= daysInMonth; d++) {
          const iterDate = new Date(curYear, curMonth, d);
          // Zero out time for comparison
          iterDate.setHours(0,0,0,0);
          
          const jDate = new Date(joinedDate);
          jDate.setHours(0,0,0,0);

          if (iterDate < jDate) {
            calendarData[d] = 'not_joined';
            continue;
          }

          if (iterDate > new Date().setHours(0,0,0,0)) {
            continue; // Future dates
          }

          // Check if there is a log for this day
          const dateStr = `${curYear}-${String(curMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
          const log = allAttendanceLogs.find(l => l.date === dateStr);
          
          if (log) {
            if (log.status === 'present') { calendarData[d] = 'present'; present++; }
            else if (log.status === 'pending_review') { calendarData[d] = 'present'; present++; } // Treating pending as present for now in calendar
            else { calendarData[d] = 'absent'; absent++; }
          } else {
            // No log and past joining date = absent
            calendarData[d] = 'absent';
            absent++;
          }
        }

        const monthName = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        return (
        <div style={{padding:'14px 14px calc(32px + env(safe-area-inset-bottom, 0px))',display:'flex',flexDirection:'column',gap:14}}>
          {/* Shift Timer */}
          {(() => {
            const _now = new Date();
            const todayStr = `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,'0')}-${String(_now.getDate()).padStart(2,'0')}`;
            const todayLog = allAttendanceLogs.find(l => l.date === todayStr);
            const isCompleted = todayLog && todayLog.clockOut;
            const isMarkedExternally = todayLog && !todayLog.clockIn && (todayLog.status === 'absent' || todayLog.status === 'present');
            
            if (!clocked && (isCompleted || isMarkedExternally)) {
              return (
                <div style={{background: '#f8fafc', borderRadius:18, border: '1px solid #e2e8f0', padding:'20px 18px', textAlign: 'center', boxShadow: '0 4px 16px rgba(15,23,42,0.05)'}}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <span className="material-symbols-outlined">check_circle</span>
                  </div>
                  <p style={{margin:0, fontSize:15, fontWeight:800, color:'#0f172a'}}>Attendance Recorded</p>
                  <p style={{margin:'4px 0 0', fontSize:13, color:'#64748b', fontWeight:600}}>You have already completed your shift or been marked for today.</p>
                </div>
              );
            }

            return (
              <div style={{background: C.primary, borderRadius:18, border: '1px solid #e2e8f0', padding:'20px 18px', color:'#000', boxShadow: '0 4px 16px rgba(15,23,42,0.05)'}}>
                <p style={{margin:0, fontSize:11, fontWeight:800, textTransform:'uppercase', color:'#000', letterSpacing:.5}}>Today's Shift Timer</p>
                <ShiftTimer clockIn={clockIn} clockInExact={clockInExact} clocked={clocked} resting={resting} lastRestStart={restStart} totalRestMs={totalRestDurationMs} />
                <p style={{margin:'0 0 14px', fontSize:12, fontWeight:700, color:'#333'}}>{clocked?`Punched IN at ${clockIn}`:'Not currently punched in'}</p>
                <div style={{display:'flex',gap:12,width:'100%',justifyContent:'center'}}>
                  <button 
                    onClick={() => {
                      if (clocked) {
                        setShowPunchOutConfirm(true);
                      } else {
                        punch();
                      }
                    }} 
                    disabled={isPunching}
                    style={{padding:'10px 20px', background:'#fff', border: '1px solid #e2e8f0', borderRadius: 10, color:'#000', fontSize:13, fontWeight:800, cursor:isPunching?'not-allowed':'pointer', fontFamily:'inherit', boxShadow: '0 2px 8px rgba(15,23,42,0.04)', opacity: isPunching ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center'}}
                  >
                    {isPunching ? (
                      <>
                        <div style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                        Wait...
                      </>
                    ) : (
                      clocked?'⏹ Punch Out Now':'▶ Punch In'
                    )}
                  </button>
                  {clocked && (
                    <button 
                      onClick={takeRest}
                      style={{padding:'10px 20px', background: resting ? '#f59e0b' : '#fff', border: '1px solid #e2e8f0', borderRadius: 10, color: resting ? '#fff' : '#000', fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'inherit', boxShadow: '0 2px 8px rgba(15,23,42,0.04)'}}
                    >
                      {resting ? '▶ Restart Work' : '⏸ Take Rest'}
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Stats Row */}
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10}}>
            {[
              {l:'Present', v:present, bg:'#dcfce7', c:'#15803d'},
              {l:'Absent', v:absent, bg:'#fee2e2', c:'#b91c1c'},
              {l:'Leave', v:leave, bg:'#fefce8', c:'#ca8a04'}
            ].map(s=>(
              <div key={s.l} style={{background:s.bg, borderRadius:14, border: '1px solid #e2e8f0', padding:'14px 10px', textAlign:'center', boxShadow: '0 2px 8px rgba(15,23,42,0.04)'}}>
                <p style={{fontSize:26, fontWeight:900, color:s.c, margin:0}}>{s.v}</p>
                <p style={{fontSize:11, fontWeight:800, color:s.c, margin:'4px 0 0', textTransform:'uppercase'}}>{s.l}</p>
              </div>
            ))}
          </div>

          {/* Calendar View */}
          <div style={{background:'#fff', borderRadius:18, border:'1.5px solid #f1f5f9', padding:18, boxShadow:'0 4px 16px rgba(0,0,0,0.03)'}}>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16}}>
              <div style={{display:'flex', alignItems:'center', gap:8}}>
                <div style={{width:32, height:32, borderRadius:10, background:'#f8fafc', display:'flex', alignItems:'center', justifyContent:'center'}}>
                  <span className="material-symbols-outlined" style={{fontSize:18, color:'#1e293b'}}>calendar_month</span>
                </div>
                <div>
                  <p style={{margin:0, fontSize:14, fontWeight:900, color:'#1a1500'}}>Attendance Calendar</p>
                  <p style={{margin:'1px 0 0', fontSize:11, color:'#64748b', fontWeight:600}}>{monthName}</p>
                </div>
              </div>
            </div>

            {/* Day headers */}
            <div style={{display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3, marginBottom:6}}>
              {['S','M','T','W','T','F','S'].map((d,i)=>(
                <div key={i} style={{textAlign:'center', fontSize:10, fontWeight:800, color:'#94a3b8', padding:'4px 0'}}>{d}</div>
              ))}
            </div>
            
            {/* Day cells */}
            <div style={{display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3}}>
              {Array.from({length: firstDayOfMonth}).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({length: daysInMonth}, (_, i) => i+1).map(day => {
                const s = calendarData[day];
                const isNotJoined = s === 'not_joined';
                const bg = s==='present'?'#dcfce7':s==='absent'?'#fee2e2':s==='leave'?'#fefce8':(isNotJoined?'#f1f5f9':'#f8fafc');
                const c = s==='present'?'#15803d':s==='absent'?'#b91c1c':s==='leave'?'#ca8a04':'#94a3b8';
                return (
                  <div key={day} style={{aspectRatio:'1/1', borderRadius:8, background:bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:c, textDecoration: isNotJoined ? 'line-through' : 'none', opacity: isNotJoined ? 0.4 : 1}}>
                    {day}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        );
      })()}
      {/* ══════════════════════════════════════════════════════════════════════
          SALARY
         ══════════════════════════════════════════════════════════════════════ */}
      
      {/* ══════════════════════════════════════════════════════════════════════
          SALARY BREAKDOWN HISTORY (GPAY STYLE)
         ══════════════════════════════════════════════════════════════════════ */}
      {view === 'salaryBreakdown' && (() => {
        const salaryTransactions = [
          { id: 'txn1', date: '2026-07-25', month: 'July', year: '2026', type: 'Bonus', subtype: 'Performance Bonus', amount: 1000, flow: 'paid' },
          { id: 'txn2', date: '2026-07-20', month: 'July', year: '2026', type: 'Deduction', subtype: 'Advance Deduction', amount: 1000, flow: 'deducted' },
          { id: 'txn3', date: '2026-07-15', month: 'July', year: '2026', type: 'Overtime', subtype: 'Overtime (15 hrs)', amount: 2500, flow: 'paid' },
          { id: 'txn4', date: '2026-07-01', month: 'July', year: '2026', type: 'Salary', subtype: 'Base Monthly', amount: 16000, flow: 'paid' },
          { id: 'txn5', date: '2026-06-25', month: 'June', year: '2026', type: 'Bonus', subtype: 'Festival Bonus', amount: 500, flow: 'paid' },
          { id: 'txn6', date: '2026-06-15', month: 'June', year: '2026', type: 'Overtime', subtype: 'Overtime (5 hrs)', amount: 500, flow: 'paid' },
          { id: 'txn7', date: '2026-06-05', month: 'June', year: '2026', type: 'Deduction', subtype: 'Late Arrival Penalty', amount: 200, flow: 'deducted' },
          { id: 'txn8', date: '2026-06-01', month: 'June', year: '2026', type: 'Salary', subtype: 'Base Monthly', amount: 16000, flow: 'paid' },
        ];

        const filteredTransactions = salaryTransactions.filter(txn => {
          if (txnMonthFilter !== 'All Months' && txn.month !== txnMonthFilter) return false;
          if (txnYearFilter !== 'All Years' && txn.year !== txnYearFilter) return false;
          if (txnTypeFilter !== 'All Types' && txn.type !== txnTypeFilter) return false;
          if (txnFlowFilter !== 'All' && txn.flow !== txnFlowFilter.toLowerCase()) return false;
          return true;
        });

        return (
          <div style={{padding:'0 0 calc(32px + env(safe-area-inset-bottom, 0px))', display:'flex', flexDirection:'column', height:'100%'}}>
            {/* Header */}
            <div style={{background:C.primary, padding:'20px 14px 14px', position:'sticky', top:0, zIndex:10, display:'flex', alignItems:'center', gap:10}}>
              <button onClick={() => setView('salary')} style={{background:'transparent', border:'none', padding:0, margin:0, cursor:'pointer', display:'flex', alignItems:'center'}}>
                <span className="material-symbols-outlined" style={{fontSize:24, color:'#000'}}>arrow_back</span>
              </button>
              <h2 style={{margin:0, fontSize:18, fontWeight:900, color:'#000'}}>Transaction History</h2>
            </div>
            
            {/* Filters */}
            <div style={{padding:'14px', display:'flex', gap:8, overflowX:'auto', borderBottom:'1px solid #f1f5f9', background:'#fff', whiteSpace:'nowrap'}}>
              {['All', 'Paid', 'Deducted'].map(f => (
                <button key={f} onClick={() => setTxnFlowFilter(f)} style={{padding:'6px 14px', borderRadius:20, border:'1px solid #e2e8f0', background: txnFlowFilter===f?'#1a1500':'#fff', color:txnFlowFilter===f?'#fde047':'#1e293b', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit'}}>
                  {f}
                </button>
              ))}
              <div style={{width:1, background:'#e2e8f0', margin:'0 4px'}} />
              <select value={txnTypeFilter} onChange={e => setTxnTypeFilter(e.target.value)} style={{padding:'6px 12px', borderRadius:20, border:'1px solid #e2e8f0', background:'#fff', color:'#1e293b', fontSize:12, fontWeight:700, outline:'none', cursor:'pointer', fontFamily:'inherit'}}>
                <option>All Types</option>
                <option>Salary</option>
                <option>Bonus</option>
                <option>Overtime</option>
                <option>Deduction</option>
              </select>
              <select value={txnMonthFilter} onChange={e => setTxnMonthFilter(e.target.value)} style={{padding:'6px 12px', borderRadius:20, border:'1px solid #e2e8f0', background:'#fff', color:'#1e293b', fontSize:12, fontWeight:700, outline:'none', cursor:'pointer', fontFamily:'inherit'}}>
                <option>All Months</option>
                <option>July</option>
                <option>June</option>
              </select>
              <select value={txnYearFilter} onChange={e => setTxnYearFilter(e.target.value)} style={{padding:'6px 12px', borderRadius:20, border:'1px solid #e2e8f0', background:'#fff', color:'#1e293b', fontSize:12, fontWeight:700, outline:'none', cursor:'pointer', fontFamily:'inherit'}}>
                <option>All Years</option>
                <option>2026</option>
                <option>2025</option>
              </select>
            </div>

            {/* Transaction List */}
            <div style={{padding:'14px', display:'flex', flexDirection:'column', gap:12}}>
              {filteredTransactions.length === 0 && (
                <div style={{textAlign:'center', padding:'30px 0'}}>
                  <p style={{margin:0, fontSize:14, color:'#64748b', fontWeight:700}}>No transactions found.</p>
                </div>
              )}
              {filteredTransactions.map(txn => (
                <div key={txn.id} style={{display:'flex', alignItems:'center', gap:14, padding:'14px 16px', background:'#fff', borderRadius:16, border:'1px solid #f1f5f9', boxShadow:'0 2px 8px rgba(0,0,0,0.02)'}}>
                  <div style={{width:42, height:42, borderRadius:21, background: txn.flow === 'paid' ? '#dcfce7' : '#fee2e2', display:'flex', alignItems:'center', justifyContent:'center'}}>
                    <span className="material-symbols-outlined" style={{fontSize:20, color: txn.flow === 'paid' ? '#15803d' : '#b91c1c'}}>
                      {txn.flow === 'paid' ? 'south_west' : 'north_east'}
                    </span>
                  </div>
                  <div style={{flex:1}}>
                    <p style={{margin:0, fontSize:15, fontWeight:800, color:'#1a1500'}}>{txn.subtype}</p>
                    <p style={{margin:'2px 0 0', fontSize:12, fontWeight:600, color:'#64748b'}}>{txn.date} · {txn.type}</p>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <p style={{margin:0, fontSize:16, fontWeight:900, color: txn.flow === 'paid' ? '#15803d' : '#1a1500'}}>
                      {txn.flow === 'paid' ? '+' : '-'}₹{txn.amount.toLocaleString()}
                    </p>
                    <p style={{margin:'2px 0 0', fontSize:11, fontWeight:700, color:'#94a3b8'}}>{txn.flow === 'paid' ? 'Credited' : 'Debited'}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div style={{padding:'20px', textAlign:'center'}}>
              <p style={{margin:0, fontSize:12, color:'#94a3b8', fontWeight:600}}>End of transactions</p>
            </div>
          </div>
        );
      })()}

      {view === 'salary' && (() => {
        const payDate = staffProfile?.payDate || 1;
        const baseSal = staffProfile?.salary || 0;
        
        // Calculate the current billing cycle
        const today = new Date();
        let cycleStartMonth = today.getMonth();
        let cycleStartYear = today.getFullYear();
        
        if (today.getDate() < payDate) {
          cycleStartMonth--;
          if (cycleStartMonth < 0) {
            cycleStartMonth = 11;
            cycleStartYear--;
          }
        }
        
        const cycleStartDate = new Date(cycleStartYear, cycleStartMonth, payDate);
        let cycleEndDate = new Date(cycleStartYear, cycleStartMonth + 1, payDate - 1);
        
        // Ensure cycleEnd isn't completely crazy for short months
        if (cycleEndDate.getDate() < payDate - 1) {
           cycleEndDate = new Date(cycleStartYear, cycleStartMonth + 2, 0); // Last day of next month
        }

        const standardDailyWage = baseSal / 30; // standard approximation
        
        let earnedThisCycle = 0;
        const cycleLogs = [];

        // Loop through every day from cycleStart up to TODAY
        const iterateEndDate = today < cycleEndDate ? today : cycleEndDate;
        
        for (let d = new Date(cycleStartDate); d <= iterateEndDate; d.setDate(d.getDate() + 1)) {
           // Skip if this day is before they joined
           const jDate = new Date(staffProfile?.createdAt || Date.now());
           jDate.setHours(0,0,0,0);
           const iterDate = new Date(d);
           iterDate.setHours(0,0,0,0);
           
           if (iterDate < jDate) continue;

           // Find log for this day
           const dateStr = `${iterDate.getFullYear()}-${String(iterDate.getMonth()+1).padStart(2,'0')}-${String(iterDate.getDate()).padStart(2,'0')}`;
           const log = allAttendanceLogs.find(l => l.date === dateStr);

           let dailyEarned = 0;
           let typeLabel = '';

           if (log) {
              if (log.status === 'present' || log.status === 'pending_review') {
                 if (log.dailyPay !== undefined) {
                    dailyEarned = Number(log.dailyPay);
                    typeLabel = 'Partial Day Pay';
                 } else {
                    dailyEarned = standardDailyWage;
                    typeLabel = 'Full Day Pay (Punched In)';
                 }
              } else if (log.status === 'absent') {
                 dailyEarned = 0;
                 typeLabel = 'Absent';
              }
           } else {
              // No log means absent / unpaid
              dailyEarned = 0;
              typeLabel = 'Absent';
           }

           if (dailyEarned > 0) {
              earnedThisCycle += dailyEarned;
              cycleLogs.push({
                 date: iterDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
                 rawDate: iterDate.getTime(),
                 amount: dailyEarned,
                 type: typeLabel,
                 isAdvance: false
              });
           }
        }

        // Include approved advances
        myReqs.forEach(req => {
           if (req.type === 'Advance' && (req.status === 'Approved' || req.status === 'Approved ✓')) {
               const reqDate = new Date(req.createdAt || Date.now());
               reqDate.setHours(0,0,0,0);
               if (reqDate >= cycleStartDate && reqDate <= iterateEndDate) {
                   const amtStr = req.amt ? req.amt.replace(/[^0-9]/g, '') : '0';
                   const advanceAmount = Number(amtStr);
                   cycleLogs.push({
                       date: reqDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
                       rawDate: reqDate.getTime() + 1000, // slightly offset to appear above daily log
                       amount: advanceAmount,
                       type: 'ADVANCE PAYMENT',
                       isAdvance: true
                   });
                   earnedThisCycle += advanceAmount; // Add advance to net payable
               }
           }
        });

        // Sort cycleLogs descending (newest first)
        cycleLogs.sort((a,b) => b.rawDate - a.rawDate);

        const monthName = cycleEndDate.toLocaleDateString('en-US', { month: 'short' });

        let totalLifetimeEarnings = 0;
        allAttendanceLogs.forEach(log => {
           if (log.status === 'present' || log.status === 'pending_review') {
              if (log.dailyPay !== undefined) {
                 totalLifetimeEarnings += Number(log.dailyPay);
              } else {
                 totalLifetimeEarnings += standardDailyWage;
              }
           }
        });
        
        myReqs.forEach(req => {
           if (req.type === 'Advance' && (req.status === 'Approved' || req.status === 'Approved ✓')) {
               const amtStr = req.amt ? req.amt.replace(/[^0-9]/g, '') : '0';
               totalLifetimeEarnings += Number(amtStr);
           }
        });

        return (
          <div style={{padding:'14px 14px calc(32px + env(safe-area-inset-bottom, 0px))',display:'flex',flexDirection:'column',gap:14}}>
            
            {/* Main Salary Card */}
            <div style={{background:'#1a1500', borderRadius:20, padding:'24px', color:'#fff', boxShadow:'0 10px 25px rgba(26,21,0,0.2)', position:'relative', overflow:'hidden'}}>
              <div style={{position:'absolute', top:-20, right:-20, opacity:0.1, transform:'rotate(15deg)'}}>
                <span className="material-symbols-outlined" style={{fontSize:140}}>account_balance_wallet</span>
              </div>
              <div style={{position:'relative', zIndex:10}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                  <div>
                    <p style={{margin:0, fontSize:13, fontWeight:700, color:'#fde047', textTransform:'uppercase', letterSpacing:1}}>Till Date Earned</p>
                    <p style={{margin:'2px 0 0', fontSize:12, fontWeight:500, color:'#94a3b8'}}>{cycleStartDate.toLocaleDateString('en-US', {day:'numeric', month:'short'})} - {iterateEndDate.toLocaleDateString('en-US', {day:'numeric', month:'short'})}</p>
                  </div>
                  <div style={{padding:'4px 12px', borderRadius:20, background:'rgba(253,224,71,0.1)', border:'1px solid rgba(253,224,71,0.2)', color:'#fde047', fontSize:11, fontWeight:800}}>
                    Pay Date: {payDate}
                  </div>
                </div>
                
                <h1 style={{margin:'24px 0 12px', fontSize:48, fontWeight:900, lineHeight:1, letterSpacing:-1.5, color:'#fff'}}>₹{Math.round(totalLifetimeEarnings).toLocaleString()}</h1>
                <div style={{display:'flex', gap: 16, marginTop: 12}}>
                  <p style={{margin:0, fontSize:14, fontWeight:600, color:'#94a3b8'}}>Base Salary: ₹{baseSal.toLocaleString()}</p>
                  <p style={{margin:0, fontSize:14, fontWeight:600, color:'#fde047'}}>This Month: ₹{Math.round(earnedThisCycle).toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Breakdown List */}
            <div style={{background:'#fff', borderRadius:18, border:'1.5px solid #f1f5f9', padding:18, boxShadow:'0 4px 16px rgba(0,0,0,0.03)', marginTop:8}}>
              <p style={{margin:0, fontSize:15, fontWeight:800, color:'#000'}}>💰 Daily Earnings ({cycleLogs.length} days)</p>
              <p style={{margin:'4px 0 16px', fontSize:12, fontWeight:600, color:'#64748b'}}>Showing earnings accumulated till date</p>

              <div style={{display:'flex', flexDirection:'column', gap:12}}>
                {cycleLogs.length === 0 ? (
                  <div style={{textAlign:'center', padding:'20px 0', color:'#94a3b8', fontSize:13}}>No earnings recorded till date.</div>
                ) : (
                  cycleLogs.map((log, idx) => (
                    <div key={idx} style={{display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom:12, borderBottom: idx === cycleLogs.length - 1 ? 'none' : '1px solid #f1f5f9'}}>
                      <div style={{display:'flex', alignItems:'center', gap:12}}>
                        <div style={{width:40, height:40, borderRadius:12, background: log.isAdvance ? '#fef3c7' : '#f0fdf4', display:'flex', alignItems:'center', justifyContent:'center'}}>
                          <span className="material-symbols-outlined" style={{fontSize:20, color: log.isAdvance ? '#d97706' : '#10b981'}}>{log.isAdvance ? 'account_balance' : 'payments'}</span>
                        </div>
                        <div>
                          <p style={{margin:0, fontSize:14, fontWeight:800, color:'#0f172a'}}>{log.date}</p>
                          <p style={{margin:'2px 0 0', fontSize:11, fontWeight: log.isAdvance ? 800 : 600, color: log.isAdvance ? '#d97706' : '#64748b', background: log.isAdvance ? '#fef3c7' : 'transparent', padding: log.isAdvance ? '2px 6px' : 0, borderRadius: log.isAdvance ? 4 : 0, display:'inline-block'}}>{log.type}</p>
                        </div>
                      </div>
                      <p style={{margin:0, fontSize:15, fontWeight:800, color: log.isAdvance ? '#d97706' : '#10b981'}}>+₹{Math.round(log.amount)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            {/* Past Pay Slips */}
            <div style={{background:'#fff', borderRadius:18, border:'1.5px solid #f1f5f9', padding:18, boxShadow:'0 4px 16px rgba(0,0,0,0.03)', marginTop:8}}>
              <p style={{margin:0, fontSize:15, fontWeight:800, color:'#000'}}>🧾 Past Pay Slips</p>
              <p style={{margin:'4px 0 16px', fontSize:12, fontWeight:600, color:'#64748b'}}>Salary and partial payments disbursed</p>
              
              <div style={{display:'flex', flexDirection:'column', gap:12}}>
                {paySlips.length === 0 ? (
                  <div style={{textAlign:'center', padding:'20px 0', color:'#94a3b8', fontSize:13}}>No pay slips available.</div>
                ) : (
                  paySlips.map((slip, idx) => {
                    const slipDate = new Date(slip.datePaid || slip.createdAt || Date.now());
                    return (
                      <div key={idx} style={{display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom:12, borderBottom: idx === paySlips.length - 1 ? 'none' : '1px solid #f1f5f9'}}>
                        <div style={{display:'flex', alignItems:'center', gap:12}}>
                          <div style={{width:40, height:40, borderRadius:12, background: slip.type === 'Partial Day' ? '#fef3c7' : '#e0e7ff', display:'flex', alignItems:'center', justifyContent:'center'}}>
                            <span className="material-symbols-outlined" style={{fontSize:20, color: slip.type === 'Partial Day' ? '#d97706' : '#4338ca'}}>{slip.type === 'Partial Day' ? 'hourglass_bottom' : 'receipt_long'}</span>
                          </div>
                          <div>
                            <p style={{margin:0, fontSize:14, fontWeight:800, color:'#0f172a'}}>{slip.month || slipDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
                            <p style={{margin:'2px 0 0', fontSize:11, fontWeight:600, color:'#64748b'}}>{slipDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} • {slip.paymentMode || 'Paid'}</p>
                          </div>
                        </div>
                        <p style={{margin:0, fontSize:15, fontWeight:800, color: '#4338ca'}}>₹{Number(slip.amountPaid || 0).toLocaleString()}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        );
      })()}
      {/* ══════════════════════════════════════════════════════════════════════
          PERFORMANCE & FEEDBACK
         ══════════════════════════════════════════════════════════════════════ */}
      {view === 'performance' && (() => {
        // Realistic mock feedback based on staff role
        let feedbackData = staffFeedback;
        const totalFeedback = feedbackData.length;
        const avgRating = totalFeedback > 0 ? (feedbackData.reduce((acc, curr) => acc + curr.rating, 0) / totalFeedback).toFixed(1) : '0';
        const fullStars = Math.floor(Number(avgRating));
        const hasHalfStar = (Number(avgRating) - fullStars) >= 0.5;

        return (
          <div style={{padding:'14px 14px calc(32px + env(safe-area-inset-bottom, 0px))',display:'flex',flexDirection:'column',gap:16}}>
            
            {/* Weekly Rating Card */}
            <div style={{background: 'linear-gradient(135deg, #1e293b, #0f172a)', borderRadius:20, padding:'24px', color:'#fff', boxShadow:'0 10px 25px rgba(15,23,42,0.15)', position:'relative', overflow:'hidden'}}>
               <div style={{position:'absolute', top:-20, right:-20, opacity:0.1, transform:'rotate(15deg)'}}>
                  <span className="material-symbols-outlined" style={{fontSize:120}}>star</span>
               </div>
               <p style={{margin:0, fontSize:13, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:1}}>Weekly Average</p>
               <div style={{display:'flex', alignItems:'flex-end', gap:12, marginTop:8}}>
                  <h1 style={{margin:0, fontSize:56, fontWeight:900, lineHeight:1, color:'#fde047'}}>{avgRating}</h1>
                  <div style={{paddingBottom:8}}>
                     <div style={{display:'flex', gap:2, color:'#fde047'}}>
                        {[...Array(fullStars)].map((_, i) => <span key={`f-${i}`} className="material-symbols-outlined" style={{fontSize:20}}>star</span>)}
                        {hasHalfStar && <span className="material-symbols-outlined" style={{fontSize:20}}>star_half</span>}
                        {[...Array(5 - fullStars - (hasHalfStar ? 1 : 0))].map((_, i) => <span key={`e-${i}`} className="material-symbols-outlined" style={{fontSize:20}}>star_outline</span>)}
                     </div>
                     <p style={{margin:'4px 0 0', fontSize:12, fontWeight:700, color:'#34d399'}}>Based on {totalFeedback} reviews</p>
                  </div>
               </div>
            </div>

            {/* Recent Feedback Feed */}
            <h3 style={{margin:'8px 0 0 4px', fontSize:18, fontWeight:900, color:'#1a1500'}}>Recent Feedback</h3>
            
            <div style={{display:'flex', flexDirection:'column', gap:12}}>
               {feedbackData.length === 0 ? (
                  <div style={{textAlign:'center', padding:'32px 0', color:'#94a3b8', fontSize:14, fontWeight:600}}>
                    No ratings yet. Keep up the good work!
                  </div>
               ) : (
                  feedbackData.map(fb => (
                     <div key={fb.id} style={{background:'#fff', borderRadius:16, padding:'16px', border:'1px solid #f1f5f9', boxShadow:'0 2px 10px rgba(0,0,0,0.02)'}}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
                           <div style={{display:'flex', gap:2, color:'#facc15'}}>
                              {[...Array(5)].map((_, i) => (
                                 <span key={i} className="material-symbols-outlined" style={{fontSize:16, color: i < fb.rating ? '#facc15' : '#e2e8f0'}}>star</span>
                              ))}
                           </div>
                           <span style={{fontSize:11, fontWeight:700, color:'#94a3b8'}}>{fb.date}</span>
                        </div>
                        <p style={{margin:'0 0 12px', fontSize:15, fontWeight:600, color:'#1e293b', lineHeight:1.4}}>"{fb.text}"</p>
                        <div style={{display:'flex', alignItems:'center', gap:6}}>
                           <div style={{width:24, height:24, borderRadius:12, background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center'}}>
                              <span className="material-symbols-outlined" style={{fontSize:14, color:'#64748b'}}>person</span>
                           </div>
                           <span style={{fontSize:12, fontWeight:800, color:'#64748b'}}>{fb.author}</span>
                        </div>
                     </div>
                  ))
               )}
            </div>
            
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════════════════════════
          METER READING (Electricity Only - Synced with Admin & Tenant Billing)
         ══════════════════════════════════════════════════════════════════════ */}
      {view === 'meter_reading' && (
        <ManagerMeterView 
          adminId={user?.ownerUid || staffProfile?.ownerUid} 
          pgId={activePgId || 'primary'} 
          onBack={() => setView('home')} 
          showToast={showToast} 
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          REQUESTS
         ══════════════════════════════════════════════════════════════════════ */}
      {view === 'requests' && (() => {
        const allReqs = [...myReqs, ...myLeaves].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
        return (
        <div style={{padding:'14px 14px calc(32px + env(safe-area-inset-bottom, 0px))',display:'flex',flexDirection:'column',gap:14}}>
          <div style={{background:'#fff',borderRadius:18,border: '1px solid #e2e8f0',padding:16}}>
            <p style={{margin:'0 0 12px',fontSize:15,fontWeight:800,color:C.text}}>📬 New Request</p>
            <form onSubmit={submitRequest} style={{display:'flex',flexDirection:'column',gap:12}}>
              <SelectField label="Request Type" value={reqType} onChange={e=>setReqType(e.target.value)}>
                <option value="Leave">Casual / Sick Leave</option>
                <option value="Advance">Salary Advance</option>
                <option value="Tool">Equipment / Uniform</option>
              </SelectField>
              {reqType==='Leave' && (
                <div style={{display:'flex',gap:10}}>
                  <div style={{flex:1}}><InputField label="From Date" type="date" required value={reqFrom} onChange={e=>setReqFrom(e.target.value)}/></div>
                  <div style={{flex:1}}><InputField label="To Date" type="date" required value={reqTo} onChange={e=>setReqTo(e.target.value)}/></div>
                </div>
              )}
              {reqType==='Advance' && <InputField label="Amount Needed (₹)" type="number" value={reqAmt} onChange={e=>setReqAmt(e.target.value)} placeholder="e.g. 2000"/>}
              <InputField label="Reason / Details *" required value={reqReason} onChange={e=>setReqReason(e.target.value)} placeholder="Briefly explain your request…"/>
              <button type="submit" style={{padding:13,background:meta.grad,color:'#000',border: '1px solid #e2e8f0',borderRadius:14,fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'inherit',boxShadow: '0 4px 16px rgba(15,23,42,0.05)'}}>Submit Request 🚀</button>
            </form>
          </div>
          <div style={{background:'#fff',borderRadius:18,border: '1px solid #e2e8f0',padding:16}}>
            <p style={{margin:'0 0 12px',fontSize:15,fontWeight:800,color:C.text}}>📋 My Requests</p>
            {allReqs.map(r=>(
              <div key={r.docId || r.id} style={{background:C.bg,border: '1px solid #e2e8f0',borderRadius: 8,padding:12,display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <div><p style={{margin:0,fontSize:13,fontWeight:800,color:C.text}}>{r.type}</p><p style={{margin:'3px 0 0',fontSize:11,color:C.muted}}>{r.date}{r.amt!=='-'?` · ${r.amt}`:''}</p></div>
                <Chip label={r.status} color={r.status==='Approved'?C.success:r.status==='Pending'?C.warn:C.danger} bg={r.status==='Approved'?C.successBg:r.status==='Pending'?C.warnBg:C.dangerBg}/>
              </div>
            ))}
          </div>
        </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════════════════════════
          MY PROFILE VIEW
         ══════════════════════════════════════════════════════════════════════ */}
      {view === 'itemreq' && (
        <div style={{padding:'14px 14px calc(32px + env(safe-area-inset-bottom, 0px))', display:'flex', flexDirection:'column', gap:14}}>

          {/* Tab switcher */}
          <div style={{display:'flex', background:'#fff', borderRadius:12, padding:4, border:'1px solid #e8df9a', gap:4}}>
            {[['new','add_shopping_cart','New Request'],['sent','history','Sent']].map(([tab, icon, label]) => (
              <button key={tab} onClick={() => setItemReqSentTab(tab)} style={{
                flex:1, padding:'9px 0', borderRadius:10, border:'none',
                background: itemReqSentTab === tab ? C.primary : 'transparent',
                color: itemReqSentTab === tab ? '#1a1500' : C.muted,
                fontSize:12, fontWeight:900, cursor:'pointer', fontFamily:'inherit',
                display:'flex', alignItems:'center', justifyContent:'center', gap:6
              }}>
                <span className="material-symbols-outlined" style={{fontSize:15}}>{icon}</span>
                {label}
              </button>
            ))}
          </div>

          {itemReqSentTab === 'new' ? (
            <>
              {/* CTA Hero */}
              <div style={{background:'linear-gradient(to bottom, #fffef2, #fffadc)', border:'1.5px solid #e8df9a', borderRadius:18, padding:'20px 18px'}}>
                <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:6}}>
                  <span className="material-symbols-outlined" style={{fontSize:22, color:'#ca8a04'}}>inventory</span>
                  <span style={{fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:0.5, color:'#ca8a04'}}>Supplies Request</span>
                </div>
                <h3 style={{margin:'0 0 4px', fontSize:20, fontWeight:900, color:'#1a1500'}}>Need Supplies?</h3>
                <p style={{margin:'0 0 14px', fontSize:12.5, color:C.muted, fontWeight:600, lineHeight:1.6}}>
                  Select from your personalised list, add quantity (optional), and send to manager or purchase team.
                </p>
                <button
                  onClick={openItemRequest}
                  style={{
                    width:'100%', padding:'13px 0', borderRadius:14, border:'none',
                    background:'#1a1500', color:'#fde047', fontSize:14, fontWeight:900,
                    cursor:'pointer', fontFamily:'inherit',
                    display:'flex', alignItems:'center', justifyContent:'center', gap:8
                  }}
                >
                  <span className="material-symbols-outlined" style={{fontSize:18}}>add_shopping_cart</span>
                  Create New Supplies Request
                </button>
              </div>

              {/* Quick stats */}
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
                {[
                  { label:'Total Sent', val: itemReqSentList.length, icon:'send', bg:'#eff6ff', color:'#1d4ed8' },
                  { label:'Pending', val: itemReqSentList.filter(r=>r.status==='Pending').length, icon:'schedule', bg:'#fef3c7', color:'#b45309' }
                ].map(s => (
                  <div key={s.label} style={{background:'#fff', border:'1px solid #e8df9a', borderRadius:14, padding:'14px 16px', display:'flex', alignItems:'center', gap:12, boxShadow:'0 2px 8px rgba(120,104,10,0.03)'}}>
                    <div style={{width:36, height:36, borderRadius:10, background:s.bg, display:'flex', alignItems:'center', justifyContent:'center'}}>
                      <span className="material-symbols-outlined" style={{fontSize:20, color:s.color}}>{s.icon}</span>
                    </div>
                    <div>
                      <p style={{margin:0, fontSize:22, fontWeight:900, color:'#1a1500'}}>{s.val}</p>
                      <p style={{margin:0, fontSize:11, fontWeight:700, color:C.muted}}>{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recent sent list */}
              {itemReqSentList.length > 0 && (
                <div style={{display:'flex', flexDirection:'column', gap:10}}>
                  <p style={{margin:0, fontSize:11, fontWeight:800, color:C.muted, textTransform:'uppercase'}}>Recent Requests</p>
                  {itemReqSentList.slice(0, 3).map(r => (
                    <div key={r.docId || r.id} style={{background:'#fff', border:'1px solid #f1f5f9', borderRadius:14, padding:'14px 16px', boxShadow:'0 2px 8px rgba(0,0,0,0.02)'}}>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8}}>
                        <div>
                          <p style={{margin:0, fontSize:13, fontWeight:900, color:'#1a1500'}}>To: {r.sendTo}</p>
                          <p style={{margin:'2px 0 0', fontSize:11, fontWeight:600, color:C.muted}}>{r.date} · {r.items.length} items</p>
                        </div>
                        <span style={{
                          fontSize:10, fontWeight:800, padding:'3px 8px', borderRadius:6,
                          background: r.status === 'Received' ? '#dcfce7' : '#fef3c7',
                          color: r.status === 'Received' ? '#15803d' : '#b45309'
                        }}>{r.status}</span>
                      </div>
                      <p style={{margin:0, fontSize:12, color:C.muted, lineHeight:1.5}}>
                        {r.items.slice(0,2).join(', ')}{r.items.length > 2 ? ' +' + (r.items.length - 2) + ' more' : ''}
                      </p>
                    </div>
                  ))}
                  <button onClick={() => setItemReqSentTab('sent')} style={{background:'none', border:'none', fontSize:12, fontWeight:800, color:'#ca8a04', cursor:'pointer', fontFamily:'inherit', padding:0, textAlign:'left'}}>
                    View all sent requests
                  </button>
                </div>
              )}
            </>
          ) : (
            <div style={{display:'flex', flexDirection:'column', gap:12}}>
              {itemReqSentList.length === 0 ? (
                <p style={{textAlign:'center', padding:'30px 0', fontSize:13.5, color:C.muted, fontStyle:'italic'}}>No requests sent yet.</p>
              ) : (
                itemReqSentList.map(r => (
                  <div key={r.docId || r.id} style={{background:'#fff', border:'1px solid #f1f5f9', borderRadius:18, padding:'18px 16px', boxShadow:'0 4px 12px rgba(0,0,0,0.02)'}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10}}>
                      <div>
                        <p style={{margin:0, fontSize:14, fontWeight:900, color:'#1a1500'}}>To: {r.sendTo}</p>
                        <p style={{margin:'2px 0 0', fontSize:11.5, color:C.muted}}>{r.date} · {r.items.length} items</p>
                      </div>
                      <span style={{
                        fontSize:10.5, fontWeight:800, padding:'4px 10px', borderRadius:8,
                        background: r.status === 'Received' ? '#dcfce7' : '#fef3c7',
                        color: r.status === 'Received' ? '#15803d' : '#b45309'
                      }}>{r.status}</span>
                    </div>
                    <div style={{display:'flex', flexDirection:'column', gap:5}}>
                      {r.items.map((itm, idx) => (
                        <div key={idx} style={{display:'flex', alignItems:'center', gap:8, background:'#f8fafc', padding:'7px 10px', borderRadius:8}}>
                          <span className="material-symbols-outlined" style={{fontSize:14, color:'#ca8a04'}}>check_box</span>
                          <span style={{fontSize:12.5, fontWeight:700, color:'#1a1500'}}>{itm}</span>
                        </div>
                      ))}
                      {r.note && (
                        <div style={{marginTop:6, fontSize:11.5, color:'#78350f', fontStyle:'italic', borderLeft:'2px solid #ca8a04', paddingLeft:8}}>
                          Note: {r.note}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {view === 'history' && (
        <div style={{padding:'14px 14px calc(32px + env(safe-area-inset-bottom, 0px))', display:'flex', flexDirection:'column', gap:14}}>
          {/* Calendar Header with Navigation */}
          <div style={{background:'#fff', borderRadius:18, border:'1px solid #e8df9a', padding:'16px', display:'flex', flexDirection:'column', gap:12, boxShadow:'0 4px 16px rgba(120, 104, 10, 0.04)'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <button 
                onClick={() => {
                  if (historyMonth === 0) {
                    setHistoryMonth(11);
                    setHistoryYear(historyYear - 1);
                  } else {
                    setHistoryMonth(historyMonth - 1);
                  }
                }}
                style={{background:'none', border:'none', color:'#ca8a04', cursor:'pointer', display:'flex', alignItems:'center'}}
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <span style={{fontSize:16, fontWeight:900, color:'#1a1500'}}>
                {new Date(historyYear, historyMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
              </span>
              <button 
                onClick={() => {
                  if (historyMonth === 11) {
                    setHistoryMonth(0);
                    setHistoryYear(historyYear + 1);
                  } else {
                    setHistoryMonth(historyMonth + 1);
                  }
                }}
                style={{background:'none', border:'none', color:'#ca8a04', cursor:'pointer', display:'flex', alignItems:'center'}}
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>

            {/* Week Days Headers */}
            <div style={{display:'grid', gridTemplateColumns:'repeat(7, 1fr)', textAlign:'center', gap:6}}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <span key={d} style={{fontSize:11, fontWeight:800, color:C.muted}}>{d}</span>
              ))}
            </div>

            {/* Month Days Grid */}
            <div style={{display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:6}}>
              {(() => {
                const daysInMonth = new Date(historyYear, historyMonth + 1, 0).getDate();
                const firstDayIndex = new Date(historyYear, historyMonth, 1).getDay();
                const cells = [];

                // Empty leading cells
                for (let i = 0; i < firstDayIndex; i++) {
                  cells.push(<div key={`empty-${i}`} />);
                }

                // Calendar day cells
                for (let day = 1; day <= daysInMonth; day++) {
                  const dateString = `${historyYear}-${String(historyMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const dayData = HISTORY_DAYS[dateString] || { status: 'present', tasks: [] };
                  const isSelected = selectedHistoryDate === dateString;

                  let bg = '#f8fafc';
                  let color = '#64748b';
                  let border = '1px solid #e2e8f0';

                  if (dayData.status === 'work') {
                    bg = '#dcfce7';
                    color = '#15803d';
                    border = '1px solid #bbf7d0';
                  } else if (dayData.status === 'absent') {
                    bg = '#fee2e2';
                    color = '#b91c1c';
                    border = '1px solid #fca5a5';
                  }

                  cells.push(
                    <button
                      key={`day-${day}`}
                      onClick={() => setSelectedHistoryDate(dateString)}
                      style={{
                        height:36,
                        borderRadius:10,
                        border: isSelected ? '2px solid #ca8a04' : border,
                        background: bg,
                        color: color,
                        fontSize:12,
                        fontWeight:800,
                        cursor:'pointer',
                        fontFamily:'inherit',
                        display:'flex',
                        alignItems:'center',
                        justifyContent:'center',
                        boxShadow: isSelected ? '0 0 6px rgba(202,138,4,0.3)' : 'none'
                      }}
                    >
                      {day}
                    </button>
                  );
                }

                return cells;
              })()}
            </div>
          </div>

          {/* Selected Date Details Card */}
          {(() => {
            const dayData = HISTORY_DAYS[selectedHistoryDate] || { status: 'present', tasks: [] };
            const formattedDate = new Date(selectedHistoryDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

            return (
              <div style={{background:'#fff', borderRadius:18, border:'1px solid #e8df9a', padding:'18px 16px', display:'flex', flexDirection:'column', gap:12, boxShadow:'0 4px 16px rgba(120, 104, 10, 0.04)'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', borderBottom:'1px solid #f1f5f9', paddingBottom:10}}>
                  <div>
                    <h4 style={{margin:0, fontSize:15, fontWeight:900, color:'#1a1500'}}>{formattedDate}</h4>
                    <p style={{margin:'2px 0 0', fontSize:11.5, color:C.muted}}>Work history details</p>
                  </div>
                  <span style={{
                    fontSize:10.5, 
                    fontWeight:800, 
                    padding:'4px 8px', 
                    borderRadius:8, 
                    background: dayData.status === 'work' ? '#dcfce7' : dayData.status === 'absent' ? '#fee2e2' : '#f8fafc',
                    color: dayData.status === 'work' ? '#15803d' : dayData.status === 'absent' ? '#b91c1c' : '#64748b',
                    border: dayData.status === 'work' ? '1px solid #bbf7d0' : dayData.status === 'absent' ? '1px solid #fca5a5' : '1px solid #e2e8f0'
                  }}>
                    {dayData.status === 'work' ? 'Present (Jobs Done)' : dayData.status === 'absent' ? 'Absent (Off Duty)' : 'Present (No Jobs)'}
                  </span>
                </div>

                <div>
                  <p style={{margin:'0 0 8px', fontSize:11, fontWeight:800, color:C.muted, textTransform:'uppercase'}}>Tasks Performed</p>
                  {dayData.status === 'absent' ? (
                    <div style={{display:'flex', alignItems:'center', gap:8, color:'#b91c1c', background:'#fee2e2', padding:'10px 12px', borderRadius:10, fontSize:12.5, fontWeight:700}}>
                      <span className="material-symbols-outlined" style={{fontSize:18}}>cancel</span>
                      Staff member was marked absent on this date.
                    </div>
                  ) : dayData.tasks.length === 0 ? (
                    <p style={{margin:0, fontSize:13, fontWeight:700, color:C.muted, fontStyle:'italic'}}>No work or jobs completed on this date.</p>
                  ) : (
                    <div style={{display:'flex', flexDirection:'column', gap:8}}>
                      {dayData.tasks.map((t, idx) => (
                        <div key={idx} style={{display:'flex', alignItems:'center', gap:10, background:'#f8fafc', padding:'10px 12px', borderRadius:10, border:'1px solid #e2e8f0'}}>
                          <span className="material-symbols-outlined" style={{fontSize:18, color:'#15803d'}}>check_circle</span>
                          <span style={{fontSize:13, fontWeight:700, color:'#1a1500'}}>{t}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ─── MANAGER: ENQUIRY VIEW ─── */}
      {view === 'enquiry' && (() => {
        const STATUS_CFG = {
          New:       { bg:'#ecfeff', text:'#0891b2', border:'#a5f3fc', icon:'mark_chat_unread' },
          Seen:      { bg:'#f1f5f9', text:'#64748b', border:'#e2e8f0', icon:'visibility' },
          Contacted: { bg:'#fffbeb', text:'#d97706', border:'#fde68a', icon:'call_made' },
          Closed:    { bg:'#ecfdf5', text:'#059669', border:'#a7f3d0', icon:'check_circle' },
        };
        const tabsE = ['All','New','Seen','Contacted','Closed'];
        const countsE = {
          All: enquiries.length,
          New: enquiries.filter(e=>e.status==='New'||e.status==='New Lead').length,
          Seen: enquiries.filter(e=>e.status==='Seen').length,
          Contacted: enquiries.filter(e=>e.status==='Contacted'||e.status==='Contacted 🟡').length,
          Closed: enquiries.filter(e=>e.status==='Closed'||e.status==='Closed 🟢').length,
        };
        const filteredE = mgr_enqFilter === 'All' ? enquiries : enquiries.filter(e => {
          const s = String(e.status || '');
          return s.includes(mgr_enqFilter);
        });

        const updateStatus = async (enqId, newStatus) => {
          try {
            await updateDoc(doc(db, 'enquiries', enqId), { enquiryStatus: newStatus });
          } catch(err) { console.error(err); }
        };

        return (
          <div style={{flex:1, overflowY:'auto', padding:'16px 14px', paddingBottom:'calc(90px + env(safe-area-inset-bottom,0px))', display:'flex', flexDirection:'column', gap:14}}>
            {/* Stats Strip */}
            <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, background:'linear-gradient(135deg,#0c1a2e,#0f2847)', borderRadius:16, padding:'16px 12px'}}>
              {[{label:'New',val:countsE.New,c:'#38bdf8'},{label:'Seen',val:countsE.Seen,c:'#94a3b8'},{label:'Contacted',val:countsE.Contacted,c:'#fbbf24'},{label:'Closed',val:countsE.Closed,c:'#4ade80'}].map(s=>(
                <button key={s.label} onClick={()=>setMgr_enqFilter(mgr_enqFilter===s.label?'All':s.label)} style={{background:mgr_enqFilter===s.label?'rgba(255,255,255,0.18)':'rgba(255,255,255,0.08)', border:mgr_enqFilter===s.label?`1px solid ${s.c}`:'1px solid transparent', borderRadius:12, padding:'10px 4px', textAlign:'center', cursor:'pointer', outline:'none', fontFamily:'inherit'}}>
                  <p style={{margin:0,fontWeight:900,fontSize:20,color:s.c}}>{s.val}</p>
                  <p style={{margin:0,fontSize:10,color:mgr_enqFilter===s.label?'white':'#94a3b8'}}>{s.label}</p>
                </button>
              ))}
            </div>

            {/* Filter Tabs */}
            <div style={{display:'flex', gap:6}}>
              {tabsE.map(t=>(
                <button key={t} onClick={()=>setMgr_enqFilter(t)} style={{flex:1,padding:'7px 4px',border:'none',borderRadius:10,background:mgr_enqFilter===t?'#0891b2':'#f1f5f9',color:mgr_enqFilter===t?'white':'#64748b',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>{t}</button>
              ))}
            </div>

            {/* View Mode Toggle */}
            <div style={{display:'flex', background:'#f1f5f9', borderRadius:12, padding:4}}>
              {[['leads','📋 Leads'],['applications','🏠 Bookings']].map(([val,label])=>(
                <button key={val} onClick={()=>setMgr_enqViewMode(val)} style={{flex:1,padding:'9px 0',border:'none',borderRadius:9,background:mgr_enqViewMode===val?'#0891b2':'transparent',color:mgr_enqViewMode===val?'white':'#94a3b8',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',transition:'all 0.2s'}}>{label}</button>
              ))}
            </div>

            {/* Leads List */}
            {mgr_enqViewMode === 'leads' && (
              <>
                {filteredE.length === 0 && (
                  <div style={{textAlign:'center',padding:'40px 0'}}>
                    <span className="material-symbols-outlined" style={{fontSize:48,color:'#e2e8f0',display:'block'}}>contact_support</span>
                    <p style={{color:'#94a3b8',fontSize:14,fontWeight:600}}>No enquiries in this category.</p>
                  </div>
                )}
                {filteredE.map(enq => {
                  const sc = STATUS_CFG[enq.status] || STATUS_CFG['New'];
                  return (
                    <div key={enq.id} style={{background:'white',borderRadius:16,border:`1px solid ${sc.border}`,overflow:'hidden',boxShadow:'0 2px 6px rgba(0,0,0,0.05)',borderLeft:`4px solid ${sc.text}`}}>
                      <div style={{padding:'14px 16px'}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
                          <div>
                            <p style={{margin:0,fontWeight:700,fontSize:15,color:'#0f172a'}}>{enq.tenantName || enq.name || 'Unknown'}</p>
                            <span style={{fontSize:12,color:'#0891b2',fontWeight:600}}>{enq.tenantPhone || enq.phone || enq.mobile || ''}</span>
                          </div>
                          <span style={{fontSize:11,fontWeight:700,padding:'3px 9px',borderRadius:8,background:sc.bg,color:sc.text,display:'flex',alignItems:'center',gap:3}}>
                            <span className="material-symbols-outlined" style={{fontSize:12}}>{sc.icon}</span>
                            {enq.status}
                          </span>
                        </div>
                        <p style={{margin:'0 0 4px',fontSize:13,color:'#475569'}}>{enq.message || 'No message'}</p>
                        <p style={{margin:'0 0 12px',fontSize:11,color:'#94a3b8',display:'flex',alignItems:'center',gap:4}}>
                          <span className="material-symbols-outlined" style={{fontSize:14}}>schedule</span>
                          {enq.date ? new Date(enq.date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : ''}
                        </p>
                        <div style={{display:'flex',gap:8}}>
                          {(enq.status==='New'||enq.status==='New Lead') && (
                            <button onClick={()=>updateStatus(enq.id,'Seen')} style={{display:'flex',alignItems:'center',gap:4,background:'#f8fafc',color:'#64748b',border:'1px solid #e2e8f0',borderRadius:9,padding:'7px 12px',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                              <span className="material-symbols-outlined" style={{fontSize:15}}>visibility</span>Mark Seen
                            </button>
                          )}
                          <button onClick={()=>{ updateStatus(enq.id,'Contacted'); }} style={{display:'flex',alignItems:'center',gap:4,background:'#ecfeff',color:'#0891b2',border:'1px solid #a5f3fc',borderRadius:9,padding:'7px 12px',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                            <span className="material-symbols-outlined" style={{fontSize:15}}>call_made</span>Contacted
                          </button>
                          <button onClick={()=>updateStatus(enq.id,'Closed')} style={{display:'flex',alignItems:'center',gap:4,background:'#ecfdf5',color:'#059669',border:'1px solid #a7f3d0',borderRadius:9,padding:'7px 12px',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                            <span className="material-symbols-outlined" style={{fontSize:15}}>check_circle</span>Close
                          </button>
                          <a href={`tel:${enq.tenantPhone||enq.mobile||''}`} style={{display:'flex',alignItems:'center',gap:4,background:'#f8fafc',color:'#334155',border:'1px solid #e2e8f0',borderRadius:9,padding:'7px 10px',textDecoration:'none',fontSize:12,fontWeight:700}}>
                            <span className="material-symbols-outlined" style={{fontSize:15}}>call</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {/* Applications List */}
            {mgr_enqViewMode === 'applications' && (
              <>
                {mgr_applications.length === 0 && (
                  <div style={{textAlign:'center',padding:'40px 0'}}>
                    <span className="material-symbols-outlined" style={{fontSize:48,color:'#e2e8f0',display:'block'}}>home_work</span>
                    <p style={{color:'#94a3b8',fontSize:14,fontWeight:600}}>No applications yet.</p>
                  </div>
                )}
                {mgr_applications.map(app=>(
                  <div key={app.id} style={{background:'white',borderRadius:16,border:app.status==='pending'?'1px solid #fde68a':'1px solid #e2e8f0',marginBottom:12,overflow:'hidden',boxShadow:'0 2px 6px rgba(0,0,0,0.05)',borderLeft:`4px solid ${app.status==='approved'?'#059669':app.status==='rejected'?'#ef4444':'#d97706'}`}}>
                    <div style={{padding:'14px 16px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                        <div>
                          <p style={{margin:0,fontWeight:700,fontSize:15,color:'#0f172a'}}>{app.tenantName}</p>
                          <p style={{margin:0,fontSize:12,color:'#64748b'}}>{app.tenantPhone}</p>
                        </div>
                        <span style={{fontSize:10,fontWeight:700,padding:'4px 10px',borderRadius:8,background:app.status==='approved'?'#ecfdf5':app.status==='rejected'?'#fef2f2':'#fffbeb',color:app.status==='approved'?'#059669':app.status==='rejected'?'#ef4444':'#d97706',textTransform:'uppercase'}}>{app.status}</span>
                      </div>
                      <div style={{display:'flex',gap:8,marginTop:12}}>
                        <a href={`tel:${app.tenantPhone}`} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:4,background:'#ecfeff',color:'#0891b2',border:'1px solid #a5f3fc',borderRadius:9,padding:'9px 12px',textDecoration:'none',fontSize:13,fontWeight:700}}>
                          <span className="material-symbols-outlined" style={{fontSize:15}}>call</span>Call
                        </a>
                        {app.status === 'pending' && (
                          <button onClick={()=>{
                            setMgr_addTenantForm({
                              name: app.tenantName,
                              phone: app.tenantPhone,
                              email: '', password: '',
                              selectedRoomId: '', selectedBed: '', rent: '', securityDeposit: '',
                              paymentMode: 'Token Only', amountPaid: '', paymentMethod: 'Cash', paymentScreenshot: null,
                              serviceType: 'all_services',
                              appId: app.id // so we know we are approving an application
                            });
                            setMgr_addTenantStep(2); // Skip straight to Room Selection
                            setMgr_enqViewMode('leads'); // Reset enquiry view
                            setView('add_tenant'); // Switch to add tenant view
                          }} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:4,background:'#0891b2',color:'white',border:'none',borderRadius:9,padding:'9px 12px',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                            <span className="material-symbols-outlined" style={{fontSize:15}}>check_circle</span>Approve
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        );
      })()}

      {/* ─── MANAGER: ADD TENANT VIEW ─── */}
      {view === 'add_tenant' && (() => {
        const adminId = user?.ownerUid;
        const form = mgr_addTenantForm;
        const setForm = (k, v) => setMgr_addTenantForm(prev => ({...prev, [k]:v}));
        const step = mgr_addTenantStep;

        const selectedRoom = mgr_rooms.find(r => r.id === form.selectedRoomId);
        const customRent = Number(form.rent) || 0;
        const customSecurity = Number(form.securityDeposit) || 0;
        const leaseAmount = customRent + customSecurity;
        const amountPaid = Number(form.amountPaid) || 0;
        const remainingAmount = leaseAmount - amountPaid;

        // Rooms are now loaded by the top-level useEffect when view === 'add_tenant'

        const handleScreenshotUpload = (file) => {
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const MAX = 800;
              let w = img.width, h = img.height;
              if (w > MAX) { h = h * MAX / w; w = MAX; }
              canvas.width = w; canvas.height = h;
              canvas.getContext('2d').drawImage(img, 0, 0, w, h);
              setForm('paymentScreenshot', canvas.toDataURL('image/jpeg', 0.7));
            };
            img.src = e.target.result;
          };
          reader.readAsDataURL(file);
        };

        const handleSubmit = async () => {
          if (!form.amountPaid) return alert('Please enter amount paid.');
          if (!selectedRoom) return alert('Please select a room.');
          setMgr_addTenantLoading(true);
          let secondaryApp;
          try {
            // Create auth user via secondary app
            const firebaseConfig = {
              apiKey: "AIzaSyC_ZHNmSGhFOl16HUE5s-bQaXQ_hKsV2as",
              authDomain: "febebo-2026.firebaseapp.com",
              projectId: "febebo-2026",
              storageBucket: "febebo-2026.firebasestorage.app",
              messagingSenderId: "769680019456",
              appId: "1:769680019456:web:3e8d6a9cdb02cff8e4b6c6"
            };
            const appName = `secondary-mgr-${Date.now()}`;
            secondaryApp = initializeApp(firebaseConfig, appName);
            const secondaryAuth = getFirebaseAuth(secondaryApp);
            const email = form.email || `${form.phone}@febebo.auto`;
            const password = form.password || `Febebo@${form.phone}`;
            const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
            const newUid = cred.user.uid;

            // Write users doc
            await setDoc(doc(db, 'users', newUid), {
              role: 'customer', name: form.name, email, phone: form.phone,
              profileCompleted: true, detailsFilled: false, hasPG: true,
              pgStatus: 'Upcoming User', registeredVia: 'add_tenant', isAddTenant: true,
              serviceType: form.serviceType,
              roomNo: selectedRoom.roomNo, bedNo: form.selectedBed,
              createdAt: new Date().toISOString(),
              addedByStaff: user?.id || user?.uid,
              addedByStaffName: user?.name || 'Manager',
              subscribedPG: {
                pgId: adminId, pgName: 'Febebo PG',
                roomNo: selectedRoom.roomNo, bedNo: form.selectedBed,
                seaterLabel: selectedRoom.seaterLabel || `${selectedRoom.beds} Seater`,
                roomType: selectedRoom.roomType || 'Standard',
                rent: customRent, securityAmount: customSecurity, leaseAmount,
                tokenPaid: amountPaid, remainingAmount,
                paymentVerificationPending: remainingAmount > 0,
                paymentMethod: form.paymentMethod,
                paymentScreenshot: form.paymentScreenshot || null,
                status: 'Upcoming User',
                isAddTenant: true,
                dateOfJoining: new Date().toISOString()
              }
            });

            // Write tenants doc
            await setDoc(doc(db, 'tenants', newUid), {
              adminId, tenantId: newUid, name: form.name, phone: form.phone, email,
              roomNo: selectedRoom.roomNo, bedNo: form.selectedBed,
              rentAmount: leaseAmount, rent: customRent, securityAmount: customSecurity,
              tokenPaid: amountPaid, remainingAmount,
              dateOfJoining: new Date().toISOString(),
              registeredVia: 'add_tenant', isAddTenant: true,
              serviceType: form.serviceType, status: 'Upcoming User',
              addedByStaff: user?.id || user?.uid,
              addedByStaffName: user?.name || 'Manager',
            });

            // Write payment record
            if (amountPaid > 0) {
              const isoStr = new Date().toISOString();
              await addDoc(collection(db, 'rent_receipts'), {
                adminId, tenantId: newUid, tenantName: form.name, tenantPhone: form.phone,
                amount: amountPaid, paymentType: 'Token Payment',
                paymentMethod: form.paymentMethod, paymentDate: isoStr,
                roomNo: selectedRoom.roomNo, bedNo: form.selectedBed,
                totalRent: customRent, securityDeposit: customSecurity,
                remainingAmount, screenshotUrl: form.paymentScreenshot || null,
              });
            }

            // Notify admin
            await addDoc(collection(db, 'notifications'), {
              adminId,
              title: 'New Tenant Added by Manager',
              desc: `${user?.name || 'Manager'} added a new tenant: ${form.name} (${form.phone}) — Room ${selectedRoom.roomNo}, Bed ${form.selectedBed}. Service: ${form.serviceType === 'only_room' ? 'Only Room' : 'All PG Services'}.`,
              type: 'new_tenant_by_staff',
              date: new Date().toISOString(),
              unread: true,
              resolved: false,
              tenantId: newUid,
              pgId: 'primary',
            });

            // Update application status to approved if converting from application
            if (form.appId) {
              await updateDoc(doc(db, 'pg_applications', form.appId), {
                status: 'approved',
                tenantId: newUid,
                roomAllotted: selectedRoom.roomNo,
                bedAllotted: form.selectedBed
              });
            }

            setMgr_addTenantSuccess(true);
          } catch(err) {
            console.error(err);
            alert('Error: ' + err.message);
          } finally {
            if (secondaryApp) { try { await deleteApp(secondaryApp); } catch(_){} }
            setMgr_addTenantLoading(false);
          }
        };

        const resetForm = () => {
          setMgr_addTenantForm({ name:'',phone:'',email:'',password:'',selectedRoomId:'',selectedBed:'',rent:'',securityDeposit:'',paymentMode:'Token Only',amountPaid:'',paymentMethod:'Cash',paymentScreenshot:null,serviceType:'all_services' });
          setMgr_addTenantStep(1);
          setMgr_addTenantSuccess(false);
        };

        // Service type picker modal
        if (mgr_serviceModal) return (
          <div style={{flex:1, overflowY:'auto', padding:'0 14px', paddingBottom:'calc(90px + env(safe-area-inset-bottom,0px))'}}>
            <div style={{background:'white',borderRadius:20,padding:24,marginTop:20,boxShadow:'0 4px 20px rgba(0,0,0,0.08)'}}>
              <h2 style={{margin:'0 0 8px',fontSize:20,fontWeight:900,color:'#0f172a'}}>Select Service Type</h2>
              <p style={{margin:'0 0 24px',fontSize:13,color:'#64748b'}}>What services will this tenant use?</p>
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                <button onClick={()=>{setForm('serviceType','all_services');setMgr_serviceModal(false);}} style={{padding:18,background:'linear-gradient(135deg,#0891b2,#06b6d4)',border:'none',borderRadius:16,color:'white',fontWeight:800,fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',gap:12,textAlign:'left'}}>
                  <span className="material-symbols-outlined" style={{fontSize:28}}>apartment</span>
                  <div><div>All PG Services</div><div style={{fontSize:12,fontWeight:600,opacity:0.85}}>Room + Food + Transport + All features</div></div>
                </button>
                <button onClick={()=>{setForm('serviceType','only_room');setMgr_serviceModal(false);}} style={{padding:18,background:'#f8fafc',border:'2px solid #e2e8f0',borderRadius:16,color:'#0f172a',fontWeight:800,fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',gap:12,textAlign:'left'}}>
                  <span className="material-symbols-outlined" style={{fontSize:28,color:'#64748b'}}>bed</span>
                  <div><div>Only Room</div><div style={{fontSize:12,fontWeight:600,color:'#64748b'}}>Room only — no Food or Transport</div></div>
                </button>
              </div>
              <button onClick={()=>setMgr_serviceModal(false)} style={{marginTop:16,width:'100%',padding:12,background:'#f1f5f9',border:'none',borderRadius:12,fontWeight:700,fontSize:14,cursor:'pointer',fontFamily:'inherit'}}>Cancel</button>
            </div>
          </div>
        );

        if (mgr_addTenantSuccess) return (
          <div style={{flex:1, overflowY:'auto', padding:'40px 20px',textAlign:'center'}}>
            <div style={{width:80,height:80,borderRadius:'50%',background:'linear-gradient(135deg,#10b981,#059669)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',boxShadow:'0 8px 24px rgba(16,185,129,0.3)'}}>
              <span className="material-symbols-outlined" style={{fontSize:40,color:'white'}}>check_circle</span>
            </div>
            <h2 style={{margin:'0 0 8px',fontSize:22,fontWeight:900,color:'#0f172a'}}>Tenant Added! ✅</h2>
            <p style={{margin:'0 0 24px',fontSize:14,color:'#64748b'}}>Tenant registered successfully. Admin has been notified and can approve them from the dashboard.</p>
            <button onClick={resetForm} style={{padding:'14px 32px',background:'linear-gradient(135deg,#0891b2,#06b6d4)',border:'none',borderRadius:14,color:'white',fontWeight:800,fontSize:15,cursor:'pointer'}}>Add Another Tenant</button>
          </div>
        );

        // Step indicator helper
        const StepDot = ({n}) => (
          <div style={{width:32,height:32,borderRadius:'50%',background:step>=n?'#0891b2':'#e2e8f0',display:'flex',alignItems:'center',justifyContent:'center',color:step>=n?'white':'#94a3b8',fontWeight:900,fontSize:13}}>{n}</div>
        );
        const inputStyle = {width:'100%',padding:'13px 14px',border:'1px solid #e2e8f0',borderRadius:12,fontSize:14,fontWeight:600,background:'#fafafa',outline:'none',fontFamily:'inherit',boxSizing:'border-box'};
        const labelStyle = {fontSize:13,fontWeight:700,color:'#374151',display:'block',marginBottom:6};

        return (
          <div style={{flex:1, overflowY:'auto', padding:'16px 14px',paddingBottom:'calc(90px + env(safe-area-inset-bottom,0px))',display:'flex',flexDirection:'column',gap:16}}>
            {/* Step indicator */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
              {[1,2,3,4].map(n=>(
                <React.Fragment key={n}>
                  <StepDot n={n}/>
                  {n<4&&<div style={{height:2,width:30,background:step>n?'#0891b2':'#e2e8f0',borderRadius:1}}/>}
                </React.Fragment>
              ))}
            </div>

            {/* Service type indicator */}
            <div style={{background:'#ecfeff',border:'1px solid #a5f3fc',borderRadius:12,padding:'10px 14px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{fontSize:13,fontWeight:700,color:'#0891b2'}}>{form.serviceType==='only_room'?'🛏 Only Room':'🏢 All PG Services'}</span>
              <button onClick={()=>setMgr_serviceModal(true)} style={{padding:'4px 10px',background:'#0891b2',border:'none',borderRadius:8,color:'white',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Change</button>
            </div>

            {/* Step 1: Basic Info */}
            {step === 1 && (
              <div style={{background:'white',borderRadius:18,padding:20,boxShadow:'0 2px 8px rgba(0,0,0,0.05)'}}>
                <h3 style={{margin:'0 0 16px',fontSize:17,fontWeight:900,color:'#0f172a'}}>👤 Tenant Details</h3>
                <div style={{display:'flex',flexDirection:'column',gap:12}}>
                  <div><label style={labelStyle}>Full Name *</label><input style={inputStyle} placeholder="e.g. Rahul Sharma" value={form.name} onChange={e=>setForm('name',e.target.value)}/></div>
                  <div><label style={labelStyle}>Phone Number *</label><input style={inputStyle} type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={e=>setForm('phone',e.target.value)}/></div>
                  <div><label style={labelStyle}>Email Address</label><input style={inputStyle} type="email" placeholder="example@email.com" value={form.email} onChange={e=>setForm('email',e.target.value)}/></div>
                  <div><label style={labelStyle}>Password (for login)</label><input style={inputStyle} type="password" placeholder="Min 6 characters" value={form.password} onChange={e=>setForm('password',e.target.value)}/></div>
                </div>
                <button onClick={()=>{ if(!form.name||!form.phone) return alert('Name and phone required.'); setMgr_addTenantStep(2); }} style={{marginTop:20,width:'100%',padding:14,background:'linear-gradient(135deg,#0891b2,#06b6d4)',border:'none',borderRadius:14,color:'white',fontWeight:800,fontSize:15,cursor:'pointer'}}>Continue →</button>
              </div>
            )}

            {/* Step 2: Room Selection */}
            {step === 2 && (
              <div style={{background:'white',borderRadius:18,padding:20,boxShadow:'0 2px 8px rgba(0,0,0,0.05)'}}>
                <h3 style={{margin:'0 0 16px',fontSize:17,fontWeight:900,color:'#0f172a'}}>🏠 Room & Bed</h3>
                {mgr_loadingRooms ? <p style={{color:'#94a3b8',textAlign:'center'}}>Loading rooms...</p> : (
                  <div style={{display:'flex',flexDirection:'column',gap:12}}>
                    <div>
                      <label style={labelStyle}>Select Room *</label>
                      <select style={{...inputStyle}} value={form.selectedRoomId} onChange={e=>{setForm('selectedRoomId',e.target.value);setForm('selectedBed','');}}>
                        <option value="">-- Choose Room --</option>
                        {mgr_rooms.filter(r=>r.status==='Vacant'||r.status==='Partially Occupied').map(r=>(
                          <option key={r.id} value={r.id}>{r.roomNo} — {r.roomType||'Standard'} ({r.beds} Seater) — ₹{r.rent}</option>
                        ))}
                      </select>
                    </div>
                    {selectedRoom && (
                      <div>
                        <label style={labelStyle}>Select Bed *</label>
                        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                          {Array.from({length:selectedRoom.beds||1},(_,i)=>`Bed ${i+1}`).map(bed=>{
                            const occupied = mgr_tenants.some(t=>t.roomNo===selectedRoom.roomNo&&t.bedNo===bed);
                            return (
                              <button key={bed} disabled={occupied} onClick={()=>setForm('selectedBed',bed)} style={{padding:'10px 16px',borderRadius:10,border:form.selectedBed===bed?'2px solid #0891b2':'1px solid #e2e8f0',background:form.selectedBed===bed?'#ecfeff':occupied?'#f1f5f9':'white',color:occupied?'#94a3b8':'#0f172a',fontWeight:700,fontSize:13,cursor:occupied?'not-allowed':'pointer',fontFamily:'inherit'}}>
                                {bed} {occupied?'(Taken)':''}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <div><label style={labelStyle}>Monthly Rent (₹)</label><input style={inputStyle} type="number" placeholder={selectedRoom?.rent||''} value={form.rent} onChange={e=>setForm('rent',e.target.value)}/></div>
                    <div><label style={labelStyle}>Security Deposit (₹)</label><input style={inputStyle} type="number" placeholder="0" value={form.securityDeposit} onChange={e=>setForm('securityDeposit',e.target.value)}/></div>
                  </div>
                )}
                <div style={{display:'flex',gap:10,marginTop:20}}>
                  <button onClick={()=>setMgr_addTenantStep(1)} style={{flex:1,padding:14,background:'#f1f5f9',border:'none',borderRadius:14,fontWeight:800,fontSize:14,cursor:'pointer',fontFamily:'inherit'}}>← Back</button>
                  <button onClick={()=>{ if(!form.selectedRoomId||!form.selectedBed) return alert('Please select room and bed.'); setMgr_addTenantStep(3); }} style={{flex:2,padding:14,background:'linear-gradient(135deg,#0891b2,#06b6d4)',border:'none',borderRadius:14,color:'white',fontWeight:800,fontSize:15,cursor:'pointer'}}>Continue →</button>
                </div>
              </div>
            )}

            {/* Step 3: Payment */}
            {step === 3 && (
              <div style={{background:'white',borderRadius:18,padding:20,boxShadow:'0 2px 8px rgba(0,0,0,0.05)'}}>
                <h3 style={{margin:'0 0 16px',fontSize:17,fontWeight:900,color:'#0f172a'}}>💰 Payment Details</h3>
                <div style={{background:'#f8fafc',borderRadius:14,padding:14,marginBottom:16}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}><span style={{fontSize:13,color:'#64748b',fontWeight:600}}>Rent</span><span style={{fontSize:14,fontWeight:700}}>₹{customRent}</span></div>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}><span style={{fontSize:13,color:'#64748b',fontWeight:600}}>Security</span><span style={{fontSize:14,fontWeight:700}}>₹{customSecurity}</span></div>
                  <div style={{display:'flex',justifyContent:'space-between',borderTop:'1px dashed #e2e8f0',paddingTop:8}}><span style={{fontSize:14,fontWeight:800,color:'#0f172a'}}>Total</span><span style={{fontSize:16,fontWeight:900,color:'#0891b2'}}>₹{leaseAmount}</span></div>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:12}}>
                  <div>
                    <label style={labelStyle}>Payment Mode</label>
                    <select style={inputStyle} value={form.paymentMode} onChange={e=>setForm('paymentMode',e.target.value)}>
                      <option>Token Only</option><option>Full Payment</option>
                    </select>
                  </div>
                  <div><label style={labelStyle}>Amount Paid (₹) *</label><input style={inputStyle} type="number" placeholder="Enter amount received" value={form.amountPaid} onChange={e=>setForm('amountPaid',e.target.value)}/></div>
                  <div>
                    <label style={labelStyle}>Payment Method</label>
                    <select style={inputStyle} value={form.paymentMethod} onChange={e=>setForm('paymentMethod',e.target.value)}>
                      <option>Cash</option><option>Online</option><option>UPI</option><option>Cheque</option>
                    </select>
                  </div>
                  {form.paymentMethod !== 'Cash' && (
                    <div>
                      <label style={labelStyle}>Payment Screenshot</label>
                      <input type="file" accept="image/*" onChange={e=>handleScreenshotUpload(e.target.files[0])} style={{width:'100%',fontSize:13}}/>
                      {form.paymentScreenshot && <img src={form.paymentScreenshot} alt="screenshot" style={{width:'100%',borderRadius:10,marginTop:8,border:'1px solid #e2e8f0'}}/>}
                    </div>
                  )}
                  {amountPaid > 0 && leaseAmount > 0 && (
                    <div style={{background:'#fef3c7',borderRadius:12,padding:12,display:'flex',justifyContent:'space-between'}}>
                      <span style={{fontSize:13,fontWeight:700,color:'#92400e'}}>Remaining Balance</span>
                      <span style={{fontSize:15,fontWeight:900,color:'#b45309'}}>₹{Math.max(0,remainingAmount)}</span>
                    </div>
                  )}
                </div>
                <div style={{display:'flex',gap:10,marginTop:20}}>
                  <button onClick={()=>setMgr_addTenantStep(2)} style={{flex:1,padding:14,background:'#f1f5f9',border:'none',borderRadius:14,fontWeight:800,fontSize:14,cursor:'pointer',fontFamily:'inherit'}}>← Back</button>
                  <button onClick={()=>setMgr_addTenantStep(4)} style={{flex:2,padding:14,background:'linear-gradient(135deg,#0891b2,#06b6d4)',border:'none',borderRadius:14,color:'white',fontWeight:800,fontSize:15,cursor:'pointer'}}>Continue →</button>
                </div>
              </div>
            )}

            {/* Step 4: Review & Submit */}
            {step === 4 && (
              <div style={{background:'white',borderRadius:18,padding:20,boxShadow:'0 2px 8px rgba(0,0,0,0.05)'}}>
                <h3 style={{margin:'0 0 16px',fontSize:17,fontWeight:900,color:'#0f172a'}}>✅ Review & Confirm</h3>
                {[
                  ['Name',form.name],['Phone',form.phone],['Email',form.email||'Auto-generated'],
                  ['Room',selectedRoom?.roomNo||'—'],['Bed',form.selectedBed||'—'],
                  ['Service Type',form.serviceType==='only_room'?'Only Room':'All PG Services'],
                  ['Total Amount',`₹${leaseAmount}`],['Amount Paid',`₹${amountPaid}`],
                  ['Remaining',`₹${Math.max(0,remainingAmount)}`],['Payment Method',form.paymentMethod],
                ].map(([k,v])=>(
                  <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #f1f5f9'}}>
                    <span style={{fontSize:13,color:'#64748b',fontWeight:600}}>{k}</span>
                    <span style={{fontSize:13,fontWeight:700,color:'#0f172a'}}>{v}</span>
                  </div>
                ))}
                <div style={{display:'flex',gap:10,marginTop:20}}>
                  <button onClick={()=>setMgr_addTenantStep(3)} style={{flex:1,padding:14,background:'#f1f5f9',border:'none',borderRadius:14,fontWeight:800,fontSize:14,cursor:'pointer',fontFamily:'inherit'}}>← Back</button>
                  <button onClick={handleSubmit} disabled={mgr_addTenantLoading} style={{flex:2,padding:14,background:'linear-gradient(135deg,#10b981,#059669)',border:'none',borderRadius:14,color:'white',fontWeight:800,fontSize:15,cursor:'pointer',opacity:mgr_addTenantLoading?0.7:1}}>
                    {mgr_addTenantLoading?'Adding...':'✅ Add Tenant'}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {view === 'profile_view' && (
        <div style={{padding:'14px 14px calc(32px + env(safe-area-inset-bottom, 0px))', display:'flex', flexDirection:'column', gap:14}}>
          {/* Main Card: Avatar & Status */}
          <div style={{background:'#fff', borderRadius:18, border:'1px solid #e8df9a', padding:'24px 16px', display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', boxShadow:'0 4px 16px rgba(120, 104, 10, 0.05)', position:'relative'}}>
            
            {/* Clickable Profile Avatar with Hidden File Input */}
            <div style={{position:'relative', cursor:'pointer'}} onClick={() => document.getElementById('avatar-input').click()}>
              {profilePic ? (
                <img src={profilePic} alt="Profile" style={{width:84, height:84, borderRadius:50, objectFit:'cover', border:'2.5px solid #ca8a04', boxShadow:'0 4px 12px rgba(0,0,0,0.08)'}} />
              ) : (
                <div style={{width:84, height:84, borderRadius:50, background:meta.accentBg, border:'2.5px solid #e8df9a', display:'flex', alignItems:'center', justifyContent:'center', fontSize:38, boxShadow:'0 4px 12px rgba(0,0,0,0.06)'}}>
                  {meta.emoji}
                </div>
              )}
              {/* Photo edit badge overlay */}
              <div style={{position:'absolute', bottom:-4, right:-4, background:'#ca8a04', borderRadius:'50%', width:26, height:26, display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid #fff', boxShadow:'0 2px 6px rgba(0,0,0,0.2)'}}>
                <span className="material-symbols-outlined" style={{fontSize:14, color:'#fff'}}>photo_camera</span>
              </div>
            </div>

            <input 
              id="avatar-input" 
              type="file" 
              accept="image/*" 
              style={{display:'none'}} 
              onChange={e => {
                const file = e.target.files[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = () => {
                    setProfilePic(reader.result);
                    localStorage.setItem('febebo_profile_pic', reader.result);
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />

            <h3 style={{margin:'10px 0 4px', fontSize:22, fontWeight:900, color:'#000'}}>{staffName}</h3>
            <div style={{display:'flex', alignItems:'center', gap:6, marginBottom:12}}>
              <span style={{fontSize:11, fontWeight:800, background:meta.accent, color:'#000', padding:'2px 8px', borderRadius:8, border:'1.5px solid #e8df9a'}}>{staffRole}</span>
              <span style={{fontSize:12, fontWeight:700, color:C.muted}}>· {meta.dept}</span>
            </div>
            <div style={{background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:12, padding:'6px 12px', display:'flex', alignItems:'center', gap:6}}>
              <span className="material-symbols-outlined" style={{fontSize:16, color:'#166534'}}>verified</span>
              <span style={{fontSize:12, fontWeight:800, color:'#166534'}}>Verified Staff Member</span>
            </div>
          </div>

          {/* Section: Personal Detailing */}
          <div style={{background:'#fff', borderRadius:18, border:'1px solid #e8df9a', padding:16, display:'flex', flexDirection:'column', gap:12, boxShadow:'0 4px 16px rgba(120, 104, 10, 0.05)'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #f1f5f9', paddingBottom:8}}>
              <p style={{margin:0, fontSize:14, fontWeight:900, color:'#000', display:'flex', alignItems:'center', gap:6}}>
                <span className="material-symbols-outlined" style={{fontSize:18, color:'#ca8a04'}}>person</span>
                Personal Details
              </p>
              <button 
                onClick={() => setEditPersonal(!editPersonal)} 
                style={{background:'none', border:'none', color:'#ca8a04', fontSize:12, fontWeight:800, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:4}}
              >
                <span className="material-symbols-outlined" style={{fontSize:14}}>{editPersonal ? 'save' : 'edit'}</span>
                {editPersonal ? 'Done' : 'Edit'}
              </button>
            </div>

            <div style={{display:'flex', flexDirection:'column', gap:12}}>
              {/* Phone */}
              <div style={{display:'flex', flexDirection:'column', gap:3}}>
                <span style={{fontSize:10, fontWeight:800, color:C.muted, textTransform:'uppercase'}}>Phone Number</span>
                {editPersonal ? (
                  <input type="text" value={phoneInput} onChange={e=>setPhoneInput(e.target.value)} style={{padding:'8px 10px', border:`1px solid ${C.border}`, borderRadius:8, fontSize:13, outline:'none'}} />
                ) : (
                  <span style={{fontSize:13, fontWeight:700, color:'#000'}}>{phoneInput || <span style={{color:C.muted, fontStyle:'italic'}}>Not provided</span>}</span>
                )}
              </div>

              {/* Email */}
              <div style={{display:'flex', flexDirection:'column', gap:3}}>
                <span style={{fontSize:10, fontWeight:800, color:C.muted, textTransform:'uppercase'}}>Email Address</span>
                {editPersonal ? (
                  <input type="email" value={emailInput} onChange={e=>setEmailInput(e.target.value)} style={{padding:'8px 10px', border:`1px solid ${C.border}`, borderRadius:8, fontSize:13, outline:'none'}} />
                ) : (
                  <span style={{fontSize:13, fontWeight:700, color:'#000'}}>{emailInput || <span style={{color:C.muted, fontStyle:'italic'}}>Not provided</span>}</span>
                )}
              </div>

              {/* Date of Birth */}
              {pd.dob && (
                <div style={{display:'flex', flexDirection:'column', gap:3}}>
                  <span style={{fontSize:10, fontWeight:800, color:C.muted, textTransform:'uppercase'}}>Date of Birth</span>
                  <span style={{fontSize:13, fontWeight:700, color:'#000'}}>{new Date(pd.dob).toLocaleDateString('en-IN', {day:'2-digit', month:'long', year:'numeric'})}</span>
                </div>
              )}

              {/* Gender & Blood Group row */}
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
                {pd.gender && (
                  <div style={{display:'flex', flexDirection:'column', gap:3}}>
                    <span style={{fontSize:10, fontWeight:800, color:C.muted, textTransform:'uppercase'}}>Gender</span>
                    <span style={{fontSize:13, fontWeight:700, color:'#000'}}>{pd.gender}</span>
                  </div>
                )}
                {pd.bloodGroup && (
                  <div style={{display:'flex', flexDirection:'column', gap:3}}>
                    <span style={{fontSize:10, fontWeight:800, color:C.muted, textTransform:'uppercase'}}>Blood Group</span>
                    <span style={{fontSize:13, fontWeight:700, color:'#e11d48'}}>{pd.bloodGroup}</span>
                  </div>
                )}
              </div>

              {/* Marital Status */}
              {pd.maritalStatus && (
                <div style={{display:'flex', flexDirection:'column', gap:3}}>
                  <span style={{fontSize:10, fontWeight:800, color:C.muted, textTransform:'uppercase'}}>Marital Status</span>
                  <span style={{fontSize:13, fontWeight:700, color:'#000'}}>{pd.maritalStatus}</span>
                </div>
              )}

              {/* Permanent Address */}
              <div style={{display:'flex', flexDirection:'column', gap:3}}>
                <span style={{fontSize:10, fontWeight:800, color:C.muted, textTransform:'uppercase'}}>Permanent Address</span>
                {editPersonal ? (
                  <textarea value={addressInput} rows={2} onChange={e=>setAddressInput(e.target.value)} style={{padding:'8px 10px', border:`1px solid ${C.border}`, borderRadius:8, fontSize:13, outline:'none', resize:'none', fontFamily:'inherit'}} />
                ) : (
                  <span style={{fontSize:13, fontWeight:700, color:'#000'}}>{addressInput || <span style={{color:C.muted, fontStyle:'italic'}}>Not provided</span>}</span>
                )}
              </div>

              {/* Emergency Contact */}
              <div style={{display:'flex', flexDirection:'column', gap:3}}>
                <span style={{fontSize:10, fontWeight:800, color:C.muted, textTransform:'uppercase'}}>Emergency Contact</span>
                {editPersonal ? (
                  <input type="text" value={emergencyInput} onChange={e=>setEmergencyInput(e.target.value)} style={{padding:'8px 10px', border:`1px solid ${C.border}`, borderRadius:8, fontSize:13, outline:'none'}} />
                ) : (
                  <span style={{fontSize:13, fontWeight:700, color:'#000'}}>{emergencyInput || <span style={{color:C.muted, fontStyle:'italic'}}>Not provided</span>}</span>
                )}
              </div>
            </div>
          </div>

          {/* Section: Professional Detailing */}
          <div style={{background:'#fff', borderRadius:18, border:'1px solid #e8df9a', padding:16, display:'flex', flexDirection:'column', gap:12, boxShadow:'0 4px 16px rgba(120, 104, 10, 0.05)'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #f1f5f9', paddingBottom:8}}>
              <p style={{margin:0, fontSize:14, fontWeight:900, color:'#000', display:'flex', alignItems:'center', gap:6}}>
                <span className="material-symbols-outlined" style={{fontSize:18, color:'#ca8a04'}}>badge</span>
                Professional Details
              </p>
              <span style={{fontSize:10, color:C.muted, fontWeight:700}}>Set by Admin</span>
            </div>

            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
              {/* Staff ID = the actual generated token */}
              <div style={{display:'flex', flexDirection:'column', gap:2, gridColumn:'1 / -1'}}>
                <span style={{fontSize:10, fontWeight:800, color:C.muted, textTransform:'uppercase'}}>Staff ID (Login Key)</span>
                <span style={{fontSize:15, fontWeight:900, color:'#ca8a04', letterSpacing:3, fontFamily:'monospace', background:'#fefce8', padding:'8px 12px', borderRadius:10, border:'1px solid #e8df9a'}}>{user?.id || user?.uid || '——'}</span>
              </div>

              <div style={{display:'flex', flexDirection:'column', gap:2}}>
                <span style={{fontSize:10, fontWeight:800, color:C.muted, textTransform:'uppercase'}}>Designated Role</span>
                <span style={{fontSize:13, fontWeight:700, color:'#000'}}>{staffRole}</span>
              </div>

              <div style={{display:'flex', flexDirection:'column', gap:2}}>
                <span style={{fontSize:10, fontWeight:800, color:C.muted, textTransform:'uppercase'}}>Date of Joining</span>
                <span style={{fontSize:13, fontWeight:700, color:'#000'}}>
                  {(staffProfile?.createdAt || user?.createdAt)
                    ? new Date(staffProfile?.createdAt || user?.createdAt).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'})
                    : <span style={{color:C.muted, fontStyle:'italic', fontWeight:500, fontSize:11}}>Not available</span>}
                </span>
              </div>

              <div style={{display:'flex', flexDirection:'column', gap:2, gridColumn:'1 / -1'}}>
                <span style={{fontSize:10, fontWeight:800, color:C.muted, textTransform:'uppercase'}}>Monthly Salary</span>
                <span style={{fontSize:18, fontWeight:900, color:'#059669'}}>
                  {(staffProfile?.salary || user?.salary)
                    ? `₹${Number(staffProfile?.salary || user?.salary).toLocaleString('en-IN')} / month`
                    : <span style={{color:C.muted, fontStyle:'italic', fontWeight:500, fontSize:12}}>Not set by admin yet</span>}
                </span>
              </div>
            </div>
          </div>

          {/* Section: Documents */}
          <div style={{background:'#fff', borderRadius:18, border:'1px solid #e8df9a', padding:16, display:'flex', flexDirection:'column', gap:12, boxShadow:'0 4px 16px rgba(120, 104, 10, 0.05)'}}>
            <p style={{margin:0, fontSize:14, fontWeight:900, color:'#000', borderBottom:'1px solid #f1f5f9', paddingBottom:8, display:'flex', alignItems:'center', gap:6}}>
              <span className="material-symbols-outlined" style={{fontSize:18, color:'#ca8a04'}}>folder_shared</span>
              Documents & Verification
            </p>
            <div style={{display:'flex', flexDirection:'column', gap:10}}>
              {documentsList.map((doc, idx) => (
                <div key={doc.name} style={{background:C.bg, borderRadius:12, padding:'12px', border:'1px solid #e8df9a', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <div style={{display:'flex', alignItems:'center', gap:10, flex:1}}>
                    <span className="material-symbols-outlined" style={{fontSize:22, color:'#ca8a04'}}>{doc.icon}</span>
                    <div style={{flex:1}}>
                      <p style={{margin:0, fontSize:12, fontWeight:800, color:'#000'}}>{doc.name}</p>
                      <p style={{margin:0, fontSize:10, color:C.muted}}>{doc.no} · {doc.status === 'Verified' ? 'Verified' : doc.status}</p>
                    </div>
                  </div>
                  
                  {/* File interaction depending on Verification status */}
                  <div style={{display:'flex', alignItems:'center', gap:6}}>
                    {doc.status === 'Verified' ? (
                      <>
                        <button 
                          onClick={() => setPreviewDoc(doc)}
                          style={{background:'#fefce8', border:'1px solid #e8df9a', borderRadius:6, padding:'4px 8px', fontSize:10, fontWeight:800, color:'#ca8a04', cursor:'pointer', fontFamily:'inherit'}}
                        >
                          👁️ View
                        </button>
                        <div style={{display:'flex', alignItems:'center', gap:2, background:'#dcfce7', padding:'4px 8px', borderRadius:8}}>
                          <span className="material-symbols-outlined" style={{fontSize:10, color:'#166534'}}>check_circle</span>
                          <span style={{fontSize:9, fontWeight:800, color:'#166534'}}>Verified</span>
                        </div>
                      </>
                    ) : doc.status === 'Under Verification' || doc.status === 'Uploaded' ? (
                      <button 
                        onClick={() => setPreviewDoc(doc)}
                        style={{background:'#fefce8', border:'1px solid #e8df9a', borderRadius:6, padding:'4px 10px', fontSize:10, fontWeight:800, color:'#ca8a04', cursor:'pointer', fontFamily:'inherit'}}
                      >
                        👁️ Preview
                      </button>
                    ) : (
                      <>
                        <button 
                          onClick={() => document.getElementById(`doc-upload-${idx}`).click()}
                          style={{background:'#ca8a04', border:'none', borderRadius:8, padding:'6px 12px', fontSize:10, fontWeight:800, color:'#fff', cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:4}}
                        >
                          <span className="material-symbols-outlined" style={{fontSize:12}}>upload</span>
                          Upload
                        </button>
                        <input 
                          id={`doc-upload-${idx}`}
                          type="file"
                          accept=".pdf,image/*"
                          style={{display:'none'}}
                          onChange={e => {
                            const file = e.target.files[0];
                            if (file) {
                              const updatedDocs = documentsList.map((d, i) => i === idx ? {
                                ...d,
                                status: 'Under Verification',
                                desc: 'Verification Pending',
                                fileUrl: file.name,
                                no: file.name.substring(0, 15) + '...'
                              } : d);
                              setDocumentsList(updatedDocs);
                              localStorage.setItem('febebo_docs', JSON.stringify(updatedDocs));
                              alert(`${file.name} uploaded successfully! Subject to admin verification.`);
                            }
                          }}
                        />
                      </>
                    )}
                  </div>

                </div>
              ))}
            </div>
          </div>

          <button 
            onClick={logout} 
            style={{marginTop:16, width:'100%', padding:'16px', background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:18, display:'flex', alignItems:'center', justifyContent:'center', gap:8, cursor:'pointer', color:'#991b1b', fontSize:16, fontWeight:800, fontFamily:'inherit', boxShadow:'0 4px 12px rgba(239, 68, 68, 0.1)'}}
          >
            <span className="material-symbols-outlined" style={{fontSize:22}}>logout</span>
            Sign Out securely
          </button>
        </div>
      )}

      {/* ── MISSING VIEWS (Items, Chat, Inventory) ── */}
      {view === 'items' && (
        <div style={{padding:'16px 14px calc(96px + env(safe-area-inset-bottom, 0px))', display:'flex', flexDirection:'column', gap:10}}>
          {myInventory.length === 0 ? (
            <p style={{textAlign:'center', color:C.muted}}>No items assigned.</p>
          ) : myInventory.map(item => (
            <div key={item.id} style={{background:'#fff', borderRadius:14, padding:14, border:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <div>
                <p style={{margin:0, fontSize:15, fontWeight:800, color:'#1e293b'}}>{item.name}</p>
                <p style={{margin:'2px 0 0', fontSize:12, fontWeight:700, color:'#64748b'}}>Qty: {item.qty}</p>
              </div>
              <div style={{display:'flex', gap:10}}>
                <button onClick={() => updateQty(item.id, item.qty - 1)} style={{width:32, height:32, borderRadius:8, border:'1px solid #e2e8f0', background:'#f8fafc', display:'flex', alignItems:'center', justifyContent:'center'}}>-</button>
                <button onClick={() => updateQty(item.id, item.qty + 1)} style={{width:32, height:32, borderRadius:8, border:'1px solid #e2e8f0', background:'#f8fafc', display:'flex', alignItems:'center', justifyContent:'center'}}>+</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'chat' && !activeContact && (() => {
        const adminCount = contacts.filter(c => c.type === 'admin').length;
        const studentCount = contacts.filter(c => c.type === 'student').length;
        const staffCount = contacts.filter(c => c.type === 'staff').length;

        const filtered = contacts
          .filter(c => {
            if (chatFilterTab === 'admin' && c.type !== 'admin') return false;
            if (chatFilterTab === 'student' && c.type !== 'student') return false;
            if (chatFilterTab === 'staff' && c.type !== 'staff') return false;
            if (!chatSearch.trim()) return true;
            const q = chatSearch.toLowerCase();
            return (
              (c.name || '').toLowerCase().includes(q) ||
              (c.role || '').toLowerCase().includes(q) ||
              (c.room || '').toLowerCase().includes(q) ||
              (c.phone || '').includes(q) ||
              (c.lastMsg || '').toLowerCase().includes(q)
            );
          })
          .sort((a, b) => {
            if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
            if (a.reminder && !b.reminder) return -1;
            if (!a.reminder && b.reminder) return 1;
            return 0;
          });

        return (
          <div style={{padding:'14px 14px calc(100px + env(safe-area-inset-bottom, 0px))', display:'flex', flexDirection:'column', gap:12}}>
            {/* Search Bar */}
            <div style={{position:'relative', display:'flex', alignItems:'center'}}>
              <span className="material-symbols-outlined" style={{position:'absolute', left:14, fontSize:20, color:'#94a3b8', pointerEvents:'none'}}>search</span>
              <input
                type="text"
                placeholder="Search name, room, or role..."
                value={chatSearch}
                onChange={e => setChatSearch(e.target.value)}
                style={{
                  width:'100%',
                  padding:'12px 38px 12px 42px',
                  borderRadius:14,
                  border:'1.5px solid #e2e8f0',
                  background:'#fff',
                  fontSize:14,
                  fontWeight:600,
                  color:'#1e293b',
                  outline:'none',
                  boxSizing:'border-box',
                  fontFamily:'inherit',
                  boxShadow:'0 2px 6px rgba(0,0,0,0.02)'
                }}
              />
              {chatSearch && (
                <button
                  onClick={() => setChatSearch('')}
                  style={{position:'absolute', right:12, background:'none', border:'none', cursor:'pointer', color:'#94a3b8', display:'flex', alignItems:'center', padding:0}}
                >
                  <span className="material-symbols-outlined" style={{fontSize:18}}>cancel</span>
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div style={{display:'flex', gap:8, overflowX:'auto', paddingBottom:2}}>
              {[
                { id: 'all', label: 'All', icon: 'chat_bubble', count: contacts.length },
                { id: 'admin', label: 'Admin', icon: 'shield_person', count: adminCount },
                { id: 'student', label: 'Students', icon: 'school', count: studentCount },
                { id: 'staff', label: 'Staff', icon: 'badge', count: staffCount }
              ].map(tab => {
                const active = chatFilterTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setChatFilterTab(tab.id)}
                    style={{
                      padding:'8px 14px',
                      borderRadius:12,
                      border: active ? '1.5px solid #0f172a' : '1px solid #e2e8f0',
                      background: active ? '#0f172a' : '#fff',
                      color: active ? '#fff' : '#475569',
                      fontSize:12.5,
                      fontWeight:700,
                      cursor:'pointer',
                      display:'flex',
                      alignItems:'center',
                      gap:6,
                      whiteSpace:'nowrap',
                      transition:'all 0.15s',
                      fontFamily:'inherit',
                      boxShadow: active ? '0 2px 8px rgba(15,23,42,0.15)' : 'none'
                    }}
                  >
                    <span className="material-symbols-outlined" style={{fontSize:15, color: active ? '#94a3b8' : '#64748b'}}>
                      {tab.icon}
                    </span>
                    <span>{tab.label}</span>
                    <span style={{
                      fontSize:10.5,
                      fontWeight:800,
                      background: active ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
                      color: active ? '#fff' : '#64748b',
                      padding:'1px 6px',
                      borderRadius:8
                    }}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Contacts Feed */}
            {filtered.length === 0 ? (
              <div style={{background:'#fff', borderRadius:16, border:'1px solid #e2e8f0', padding:'36px 20px', textAlign:'center', marginTop:8}}>
                <div style={{width:54, height:54, borderRadius:27, background:'#f1f5f9', display:'inline-flex', alignItems:'center', justifyContent:'center', marginBottom:12}}>
                  <span className="material-symbols-outlined" style={{fontSize:28, color:'#94a3b8'}}>chat_bubble_outline</span>
                </div>
                <h4 style={{margin:0, fontSize:15, fontWeight:800, color:'#0f172a'}}>No conversations found</h4>
                <p style={{margin:'4px 0 16px', fontSize:13, color:'#64748b'}}>
                  {chatSearch ? `No contacts matching "${chatSearch}"` : 'No contacts in this category.'}
                </p>
                {(chatSearch || chatFilterTab !== 'all') && (
                  <button
                    onClick={() => { setChatSearch(''); setChatFilterTab('all'); }}
                    style={{padding:'8px 16px', borderRadius:10, background:'#0891b2', color:'#fff', border:'none', fontSize:12, fontWeight:800, cursor:'pointer', fontFamily:'inherit'}}
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            ) : (
              filtered.map(c => {
                const isStudent = c.type === 'student';
                const isAdmin = c.type === 'admin';
                const av = getAvatarStyle(c);

                return (
                  <div
                    key={c.id}
                    onClick={() => setActiveContact(c)}
                    style={{
                      background:'#fff',
                      borderRadius:14,
                      padding:'13px 15px',
                      border: '1px solid #e2e8f0',
                      borderLeft: c.isPinned ? '4px solid #0891b2' : '1px solid #e2e8f0',
                      display:'flex',
                      alignItems:'center',
                      gap:12,
                      cursor:'pointer',
                      boxShadow:'0 1px 3px rgba(15,23,42,0.03)',
                      transition:'all 0.15s',
                      position:'relative'
                    }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width:44,
                      height:44,
                      borderRadius:'50%',
                      background: av.bg,
                      border: `1.5px solid ${av.border}`,
                      display:'flex',
                      alignItems:'center',
                      justifyContent:'center',
                      fontSize: av.isIcon ? 20 : 14,
                      fontWeight:800,
                      color: av.color,
                      flexShrink:0,
                      letterSpacing: av.isIcon ? 0 : 0.5
                    }}>
                      {av.isIcon ? (
                        <span className="material-symbols-outlined" style={{fontSize:22, color:av.color}}>
                          {av.icon}
                        </span>
                      ) : (
                        getContactInitials(c.name)
                      )}
                    </div>

                    {/* Middle Info */}
                    <div style={{flex:1, minWidth:0}}>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:3}}>
                        <div style={{display:'flex', alignItems:'center', gap:6, minWidth:0}}>
                          <p style={{margin:0, fontSize:15, fontWeight:700, color:'#0f172a', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
                            {c.name}
                          </p>
                          {c.isPinned && (
                            <span style={{
                              display:'inline-flex',
                              alignItems:'center',
                              gap:3,
                              fontSize:10,
                              fontWeight:800,
                              background:'#ecfeff',
                              color:'#0891b2',
                              border:'1px solid #cffafe',
                              padding:'1px 6px',
                              borderRadius:6
                            }}>
                              <span className="material-symbols-outlined" style={{fontSize:11, transform:'rotate(45deg)'}}>push_pin</span>
                              PIN
                            </span>
                          )}
                        </div>
                        <span style={{fontSize:11, color:'#94a3b8', flexShrink:0, fontWeight:600}}>{c.time}</span>
                      </div>

                      <div style={{display:'flex', alignItems:'center', gap:6, marginBottom:4}}>
                        <span style={{
                          fontSize:11,
                          fontWeight:600,
                          padding:'2px 8px',
                          borderRadius:6,
                          background: isAdmin ? '#f0f9ff' : isStudent ? '#f8fafc' : '#f0fdf4',
                          color: isAdmin ? '#0284c7' : isStudent ? '#475569' : '#15803d',
                          border: `1px solid ${isAdmin ? '#e0f2fe' : isStudent ? '#e2e8f0' : '#dcfce7'}`,
                          display:'inline-flex',
                          alignItems:'center',
                          gap:4
                        }}>
                          {isAdmin ? (
                            <>
                              <span className="material-symbols-outlined" style={{fontSize:13, color:'#0284c7'}}>verified</span>
                              Property Admin
                            </>
                          ) : (
                            c.role || (isStudent ? 'Student' : 'Staff')
                          )}
                        </span>
                      </div>

                      <p style={{
                        margin:0,
                        fontSize:12.5,
                        color: (c.lastMsg && !c.lastMsg.startsWith('Tap to chat')) ? '#64748b' : '#94a3b8',
                        whiteSpace:'nowrap',
                        overflow:'hidden',
                        textOverflow:'ellipsis'
                      }}>
                        {(c.lastMsg && !c.lastMsg.startsWith('Tap to chat')) ? c.lastMsg : 'Send a message'}
                      </p>

                      {c.reminder && (
                        <div style={{display:'flex', alignItems:'center', gap:4, marginTop:4, fontSize:10.5, color:'#b45309', background:'#fffbeb', padding:'2px 6px', borderRadius:6, border:'1px solid #fef3c7', width:'fit-content'}}>
                          <span className="material-symbols-outlined" style={{fontSize:13}}>alarm</span>
                          <span>{c.reminder}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Icon / Call */}
                    <div style={{display:'flex', alignItems:'center', gap:8}}>
                      {c.phone && (
                        <a
                          href={`tel:${c.phone}`}
                          onClick={e => e.stopPropagation()}
                          style={{
                            width:34,
                            height:34,
                            borderRadius:'50%',
                            background:'#f8fafc',
                            border:'1px solid #e2e8f0',
                            display:'flex',
                            alignItems:'center',
                            justifyContent:'center',
                            color:'#0891b2',
                            textDecoration:'none',
                            transition:'all 0.15s'
                          }}
                          title={`Call ${c.name}`}
                        >
                          <span className="material-symbols-outlined" style={{fontSize:16}}>call</span>
                        </a>
                      )}
                      <span className="material-symbols-outlined" style={{fontSize:18, color:'#cbd5e1'}}>chevron_right</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        );
      })()}

      {view === 'chat' && activeContact && (
        /* Chat root: full remaining viewport height, flex column, no fixed positioning needed */
        <div style={{display:'flex', flexDirection:'column', height:'calc(100vh - 64px)', background:'#f8fafc', overflow:'hidden'}}>
          {/* Scrollable messages */}
          <div style={{flex:1, minHeight:0, overflowY:'auto', padding:'16px 14px', display:'flex', flexDirection:'column', gap:10, paddingBottom:16}}>
            {/* Contact header banner */}
            <div style={{background:'#fff', borderRadius:14, padding:'10px 14px', border:'1px solid #e2e8f0', display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4}}>
              <div style={{display:'flex', alignItems:'center', gap:10}}>
                {(() => {
                  const av = getAvatarStyle(activeContact);
                  return (
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: av.bg,
                      border: `1.5px solid ${av.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: av.isIcon ? 18 : 13,
                      fontWeight: 800,
                      color: av.color,
                      flexShrink: 0
                    }}>
                      {av.isIcon ? (
                        <span className="material-symbols-outlined" style={{fontSize: 18, color: av.color}}>{av.icon}</span>
                      ) : (
                        getContactInitials(activeContact.name)
                      )}
                    </div>
                  );
                })()}
                <div>
                  <p style={{margin:0, fontSize:13, fontWeight:800, color:'#0f172a'}}>{activeContact.name}</p>
                  <p style={{margin:0, fontSize:11, color:'#64748b'}}>{activeContact.role || 'Member'}</p>
                </div>
              </div>
              {activeContact.phone && (
                <a href={`tel:${activeContact.phone}`} style={{background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:8, padding:'5px 12px', fontSize:11.5, fontWeight:700, color:'#0891b2', textDecoration:'none', display:'flex', alignItems:'center', gap:4}}>
                  <span className="material-symbols-outlined" style={{fontSize:15}}>call</span>
                  <span>Call</span>
                </a>
              )}
            </div>

            {(chatHist[activeContact.id] || []).length === 0 ? (
              <div style={{textAlign:'center', padding:'30px 14px', color:'#64748b'}}>
                <div style={{width:48, height:48, borderRadius:24, background:'#e0f2fe', display:'inline-flex', alignItems:'center', justifyContent:'center', marginBottom:10}}>
                  <span className="material-symbols-outlined" style={{fontSize:24, color:'#0891b2'}}>waving_hand</span>
                </div>
                <h4 style={{margin:0, fontSize:15, fontWeight:800, color:'#0f172a'}}>Say hello to {activeContact.name}!</h4>
                <p style={{margin:'4px 0 14px', fontSize:12, color:'#94a3b8'}}>Send a message or update them on your work.</p>
                <div style={{display:'flex', gap:6, justifyContent:'center', flexWrap:'wrap'}}>
                  {['👋 Hello!', 'Everything is done ✅', 'Please check and verify'].map(quick => (
                    <button
                      key={quick}
                      onClick={() => {
                        setChatInput(quick);
                      }}
                      style={{background:'#fff', border:'1px solid #e2e8f0', borderRadius:20, padding:'6px 12px', fontSize:12, fontWeight:700, color:'#334155', cursor:'pointer'}}
                    >
                      {quick}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              (chatHist[activeContact.id] || []).map((msg, i) => (
                <div key={msg.id || i} style={{alignSelf: msg.me ? 'flex-end' : 'flex-start', maxWidth:'80%'}}>
                  <div style={{
                    background: msg.me ? C.primary : '#fff',
                    color: msg.me ? '#1a1500' : '#1e293b',
                    padding:'10px 14px',
                    borderRadius:16,
                    borderTopRightRadius: msg.me ? 4 : 16,
                    borderTopLeftRadius: msg.me ? 16 : 4,
                    fontSize:14,
                    fontWeight:500,
                    boxShadow:'0 2px 8px rgba(15,23,42,0.04)',
                    border: msg.me ? 'none' : '1px solid #e2e8f0',
                    lineHeight: 1.4,
                    wordBreak: 'break-word'
                  }}>
                    {msg.text}
                  </div>
                  <p style={{margin:'4px 6px 0', fontSize:10, color:C.muted, textAlign: msg.me ? 'right' : 'left', fontWeight:600}}>
                    {msg.time}
                  </p>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>
          {/* Input bar: inline so it moves up with keyboard */}
          <div style={{flexShrink:0, background:'#fff', padding:'12px 14px', paddingBottom:'calc(12px + env(safe-area-inset-bottom, 16px))', borderTop:'1px solid #e2e8f0', display:'flex', gap:8, zIndex:40}}>
            <input 
              type="text" 
              placeholder={`Message ${activeContact.name}...`} 
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMsg(e)}
              style={{flex:1, background:'#f1f5f9', border:'none', borderRadius:20, padding:'12px 16px', fontSize:14, outline:'none', fontFamily:'inherit'}}
            />
            <button
              onClick={sendMsg}
              disabled={!chatInput.trim()}
              style={{
                background: chatInput.trim() ? C.primary : '#e2e8f0',
                border:'none',
                borderRadius:'50%',
                width:44,
                height:44,
                display:'flex',
                alignItems:'center',
                justifyContent:'center',
                cursor: chatInput.trim() ? 'pointer' : 'default',
                transition:'all 0.15s'
              }}
            >
              <span className="material-symbols-outlined" style={{fontSize:20, color: chatInput.trim() ? '#1a1500' : '#94a3b8'}}>send</span>
            </button>
          </div>
        </div>
      )}

      {view === 'inventory' && (
        <div style={{padding:'16px 14px calc(96px + env(safe-area-inset-bottom, 0px))', display:'flex', flexDirection:'column', gap:14}}>
          
          {/* Top Tab Switcher */}
          <div style={{display:'flex', background:'#f1f5f9', padding:4, borderRadius:12, gap:4}}>
            <button
              onClick={() => setInventoryTab('kitchen')}
              style={{
                flex: 1,
                padding: '9px 0',
                borderRadius: 9,
                border: 'none',
                background: inventoryTab === 'kitchen' ? '#0891b2' : 'transparent',
                color: inventoryTab === 'kitchen' ? '#fff' : '#64748b',
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'all 0.15s'
              }}
            >
              <span className="material-symbols-outlined" style={{fontSize:18}}>kitchen</span>
              <span>Kitchen Stock ({kitchenInventoryList.length})</span>
            </button>

            <button
              onClick={() => setInventoryTab('petty_cash')}
              style={{
                flex: 1,
                padding: '9px 0',
                borderRadius: 9,
                border: 'none',
                background: inventoryTab === 'petty_cash' ? '#0891b2' : 'transparent',
                color: inventoryTab === 'petty_cash' ? '#fff' : '#64748b',
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'all 0.15s'
              }}
            >
              <span className="material-symbols-outlined" style={{fontSize:18}}>payments</span>
              <span>Petty Cash</span>
            </button>
          </div>

          {/* ── TAB 1: KITCHEN INVENTORY ────────────────────────── */}
          {inventoryTab === 'kitchen' && (
            <div style={{display:'flex', flexDirection:'column', gap:12}}>
              
              {/* Header Card */}
              <div style={{background:'#fff', borderRadius:16, border:`1px solid ${C.border}`, padding:14, display:'flex', justifyContent:'space-between', alignItems:'center', boxShadow:'0 2px 8px rgba(15,23,42,0.03)'}}>
                <div>
                  <span style={{fontSize:10, fontWeight:800, color:'#0891b2', textTransform:'uppercase', letterSpacing:0.5}}>Kitchen Inventory</span>
                  <h3 style={{margin:'2px 0 0', fontSize:18, fontWeight:900, color:'#0f172a'}}>{kitchenInventoryList.length} Items In Stock</h3>
                  <span style={{fontSize:11, color:'#16a34a', fontWeight:700}}>✓ Synced with Cook, Manager & Admin</span>
                </div>
                <button
                  onClick={() => setShowAddKitchenItemModal(true)}
                  style={{display:'flex', alignItems:'center', gap:4, background:'#0891b2', color:'#fff', border:'none', borderRadius:10, padding:'8px 12px', fontSize:12, fontWeight:800, cursor:'pointer'}}
                >
                  <span className="material-symbols-outlined" style={{fontSize:16}}>add</span>
                  <span>Add Item</span>
                </button>
              </div>

              {/* Search input */}
              <div style={{display:'flex', alignItems:'center', gap:8, background:'#fff', border:`1px solid ${C.border}`, borderRadius:12, padding:'8px 12px'}}>
                <span className="material-symbols-outlined" style={{fontSize:18, color:'#94a3b8'}}>search</span>
                <input
                  type="text"
                  value={stockSearchQuery}
                  onChange={(e) => setStockSearchQuery(e.target.value)}
                  placeholder="Search kitchen supplies, dal, rice, oil..."
                  style={{border:'none', outline:'none', width:'100%', fontSize:13, fontFamily:'inherit'}}
                />
                {stockSearchQuery && (
                  <button onClick={() => setStockSearchQuery('')} style={{background:'none', border:'none', cursor:'pointer', color:'#94a3b8', padding:0}}>
                    <span className="material-symbols-outlined" style={{fontSize:16}}>close</span>
                  </button>
                )}
              </div>

              {/* Items List */}
              {kitchenInventoryLoading ? (
                <div style={{textAlign:'center', padding:30, color:'#64748b'}}>
                  <span className="material-symbols-outlined" style={{fontSize:30, color:'#0891b2', animation:'spin 1s linear infinite'}}>progress_activity</span>
                  <p style={{margin:'6px 0 0', fontSize:12, fontWeight:700}}>Loading kitchen stock...</p>
                </div>
              ) : kitchenInventoryList.length === 0 ? (
                <div style={{background:'#fff', borderRadius:16, border:'1px dashed #cbd5e1', padding:32, textAlign:'center', color:'#94a3b8'}}>
                  <span className="material-symbols-outlined" style={{fontSize:40, color:'#cbd5e1', marginBottom:6}}>kitchen</span>
                  <p style={{margin:0, fontSize:14, fontWeight:800, color:'#475569'}}>Kitchen Inventory is Empty</p>
                  <p style={{margin:'4px 0 14px', fontSize:12}}>Any kitchen items requested by Cook or purchased by Cook/Manager/Admin will appear here automatically.</p>
                  <button
                    onClick={() => setShowAddKitchenItemModal(true)}
                    style={{background:'#0891b2', color:'#fff', border:'none', borderRadius:10, padding:'8px 16px', fontSize:12, fontWeight:800, cursor:'pointer'}}
                  >
                    + Add Item to Stock
                  </button>
                </div>
              ) : (
                <div style={{display:'flex', flexDirection:'column', gap:8}}>
                  {kitchenInventoryList
                    .filter(it => (it.name || '').toLowerCase().includes(stockSearchQuery.toLowerCase()))
                    .map(item => (
                      <div key={item.docId} style={{background:'#fff', borderRadius:14, border:`1px solid ${C.border}`, padding:'12px 14px', display:'flex', justifyContent:'space-between', alignItems:'center', boxShadow:'0 1px 4px rgba(15,23,42,0.02)'}}>
                        <div style={{display:'flex', alignItems:'center', gap:10}}>
                          <div style={{width:36, height:36, borderRadius:10, background:'#ecfeff', display:'flex', alignItems:'center', justifyContent:'center', color:'#0891b2'}}>
                            <span className="material-symbols-outlined" style={{fontSize:20}}>{item.icon || 'kitchen'}</span>
                          </div>
                          <div>
                            <p style={{margin:0, fontSize:14, fontWeight:800, color:'#0f172a'}}>{item.name}</p>
                            <span style={{fontSize:11, color:'#64748b', fontWeight:600}}>
                              {item.lastUpdatedBy ? `By: ${item.lastUpdatedBy}` : 'Kitchen Stock'}
                              {item.lastSource ? ` · ${item.lastSource}` : ''}
                            </span>
                          </div>
                        </div>

                        <div style={{display:'flex', alignItems:'center', gap:10}}>
                          {/* Qty +/- adjust */}
                          <div style={{display:'flex', alignItems:'center', background:'#f1f5f9', borderRadius:8, overflow:'hidden', border:'1px solid #e2e8f0'}}>
                            <button
                              onClick={async () => {
                                const newQty = Math.max(0, (parseFloat(item.totalQty) || 0) - 1);
                                try {
                                  await updateDoc(doc(db, 'pg_inventory_master', item.docId), {
                                    totalQty: newQty,
                                    lastUpdated: new Date().toISOString(),
                                    lastUpdatedBy: `${staffName} (${staffRole})`
                                  });
                                } catch (e) { console.error(e); }
                              }}
                              style={{width:28, height:28, border:'none', background:'transparent', cursor:'pointer', fontSize:16, fontWeight:800, color:'#64748b', display:'flex', alignItems:'center', justifyContent:'center'}}
                            >
                              -
                            </button>
                            <span style={{minWidth:36, textAlign:'center', fontSize:13, fontWeight:900, color:'#0f172a', padding:'0 4px'}}>
                              {item.totalQty} {item.unit || 'kg'}
                            </span>
                            <button
                              onClick={async () => {
                                const newQty = (parseFloat(item.totalQty) || 0) + 1;
                                try {
                                  await updateDoc(doc(db, 'pg_inventory_master', item.docId), {
                                    totalQty: newQty,
                                    lastUpdated: new Date().toISOString(),
                                    lastUpdatedBy: `${staffName} (${staffRole})`
                                  });
                                } catch (e) { console.error(e); }
                              }}
                              style={{width:28, height:28, border:'none', background:'transparent', cursor:'pointer', fontSize:16, fontWeight:800, color:'#64748b', display:'flex', alignItems:'center', justifyContent:'center'}}
                            >
                              +
                            </button>
                          </div>

                          <button
                            onClick={async () => {
                              if (window.confirm(`Delete ${item.name} from kitchen inventory?`)) {
                                try {
                                  await deleteDoc(doc(db, 'pg_inventory_master', item.docId));
                                  showToast('Item removed from inventory', 'success');
                                } catch (e) { console.error(e); }
                              }
                            }}
                            style={{background:'#fee2e2', border:'none', borderRadius:8, width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#ef4444', padding:0}}
                          >
                            <span className="material-symbols-outlined" style={{fontSize:16}}>delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* Add Kitchen Item Modal */}
              {showAddKitchenItemModal && (
                <div style={{position:'fixed', inset:0, background:'rgba(15,23,42,0.6)', zIndex:200, display:'flex', alignItems:'flex-end', justifyContent:'center', backdropFilter:'blur(3px)'}}
                  onClick={e => { if (e.target === e.currentTarget) setShowAddKitchenItemModal(false); }}>
                  <div style={{background:'#fff', width:'100%', maxWidth:480, borderRadius:'24px 24px 0 0', padding:'20px 20px 32px'}}>
                    <div style={{width:40, height:4, background:'#e2e8f0', borderRadius:99, margin:'0 auto 16px'}} />
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
                      <h3 style={{margin:0, fontSize:17, fontWeight:900, color:'#0f172a'}}>Add Kitchen Stock Item</h3>
                      <button onClick={() => setShowAddKitchenItemModal(false)} style={{background:'#f1f5f9', border:'none', borderRadius:8, padding:6, cursor:'pointer'}}>
                        <span className="material-symbols-outlined" style={{fontSize:18, color:'#64748b'}}>close</span>
                      </button>
                    </div>

                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      if (!newKitchenItemForm.name.trim()) return;
                      setKitchenItemSaving(true);
                      try {
                        const adminUid = staffProfile?.ownerUid || user?.ownerUid;
                        await addDoc(collection(db, 'pg_inventory_master'), {
                          adminId: adminUid,
                          pgId: activePgId || 'primary',
                          category: 'kitchen',
                          name: newKitchenItemForm.name.trim(),
                          totalQty: parseFloat(newKitchenItemForm.qty) || 1,
                          unit: newKitchenItemForm.unit || 'kg',
                          icon: 'kitchen',
                          createdAt: new Date().toISOString(),
                          lastUpdated: new Date().toISOString(),
                          lastUpdatedBy: `${staffName} (${staffRole})`,
                          lastSource: 'Manual Add'
                        });
                        showToast('Item added to kitchen inventory!', 'success');
                        setShowAddKitchenItemModal(false);
                        setNewKitchenItemForm({ name: '', qty: '', unit: 'kg' });
                      } catch (err) {
                        console.error('Error adding kitchen item:', err);
                        alert('Failed to add item: ' + err.message);
                      } finally {
                        setKitchenItemSaving(false);
                      }
                    }} style={{display:'flex', flexDirection:'column', gap:12}}>
                      <div>
                        <label style={{display:'block', fontSize:11, fontWeight:800, color:'#64748b', textTransform:'uppercase', marginBottom:4}}>Item Name *</label>
                        <input
                          type="text"
                          required
                          value={newKitchenItemForm.name}
                          onChange={e => setNewKitchenItemForm({ ...newKitchenItemForm, name: e.target.value })}
                          placeholder="e.g. Toor Dal, Basmati Rice, Mustard Oil..."
                          style={{width:'100%', padding:'11px 14px', border:'1.5px solid #e2e8f0', borderRadius:10, fontSize:14, outline:'none', boxSizing:'border-box'}}
                        />
                      </div>

                      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
                        <div>
                          <label style={{display:'block', fontSize:11, fontWeight:800, color:'#64748b', textTransform:'uppercase', marginBottom:4}}>Quantity</label>
                          <input
                            type="number"
                            step="0.1"
                            value={newKitchenItemForm.qty}
                            onChange={e => setNewKitchenItemForm({ ...newKitchenItemForm, qty: e.target.value })}
                            placeholder="e.g. 10"
                            style={{width:'100%', padding:'11px 14px', border:'1.5px solid #e2e8f0', borderRadius:10, fontSize:14, outline:'none', boxSizing:'border-box'}}
                          />
                        </div>
                        <div>
                          <label style={{display:'block', fontSize:11, fontWeight:800, color:'#64748b', textTransform:'uppercase', marginBottom:4}}>Unit</label>
                          <select
                            value={newKitchenItemForm.unit}
                            onChange={e => setNewKitchenItemForm({ ...newKitchenItemForm, unit: e.target.value })}
                            style={{width:'100%', padding:'11px 14px', border:'1.5px solid #e2e8f0', borderRadius:10, fontSize:14, outline:'none', background:'#fff', boxSizing:'border-box'}}
                          >
                            <option value="kg">kg</option>
                            <option value="g">g</option>
                            <option value="litre">litre</option>
                            <option value="piece">piece</option>
                            <option value="pack">pack</option>
                            <option value="can">can</option>
                          </select>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={kitchenItemSaving}
                        style={{
                          marginTop:8,
                          width:'100%',
                          padding:'14px',
                          background:'#0891b2',
                          color:'#fff',
                          border:'none',
                          borderRadius:12,
                          fontSize:15,
                          fontWeight:800,
                          cursor:'pointer',
                          boxShadow:'0 4px 12px rgba(8,145,178,0.25)'
                        }}
                      >
                        {kitchenItemSaving ? 'Saving...' : 'Add to Kitchen Inventory'}
                      </button>
                    </form>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ── TAB 2: PETTY CASH ───────────────────────────────── */}
          {inventoryTab === 'petty_cash' && (
            <div style={{display:'flex', flexDirection:'column', gap:16}}>
              <div style={{background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', borderRadius:16, padding:20, color:'#fff', display:'flex', flexDirection:'column', gap:6, boxShadow:'0 8px 24px rgba(15,23,42,0.15)'}}>
                <p style={{margin:0, fontSize:12, fontWeight:800, color:'#94a3b8', textTransform:'uppercase'}}>Available Petty Cash</p>
                <h2 style={{margin:0, fontSize:32, fontWeight:900, color:'#fde047'}}>₹{availablePettyCash.toLocaleString('en-IN')}</h2>
                <div style={{display:'flex', gap:10, marginTop:10}}>
                  <button onClick={()=>setShowExpenseModal(true)} style={{flex:1, padding:'10px', background:'#ef4444', border:'none', borderRadius:10, color:'#fff', fontWeight:800, cursor:'pointer'}}>- Expense</button>
                </div>
              </div>
              <p style={{margin:0, fontSize:15, fontWeight:900, color:C.text}}>Recent Logs</p>
              {pettyCashLogs?.map(log => (
                <div key={log.id} style={{background:'#fff', borderRadius:14, padding:14, border:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <div>
                    <p style={{margin:0, fontSize:14, fontWeight:800, color:'#1e293b'}}>{log.title}</p>
                    <p style={{margin:'2px 0 0', fontSize:11, color:'#64748b'}}>{log.date} · {log.party}</p>
                  </div>
                  <p style={{margin:0, fontSize:15, fontWeight:900, color: log.type === 'credit' ? '#16a34a' : '#ef4444'}}>
                    {log.type === 'credit' ? '+' : '-'}₹{log.amount}
                  </p>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* ── COOK VENDOR & KITCHEN PURCHASES VIEW ───────────────────────── */}
      {view === 'cookVendor' && (() => {
        const categoriesList = ['All', ...Object.keys(INDIAN_KITCHEN_ITEMS)];
        
        // Build items for current view
        let currentItems = [];
        if (kitchenActiveCategory === 'All') {
          Object.values(INDIAN_KITCHEN_ITEMS).forEach(items => {
            currentItems.push(...items);
          });
          currentItems.push(...customKitchenItems);
        } else {
          currentItems = [...(INDIAN_KITCHEN_ITEMS[kitchenActiveCategory] || [])];
          currentItems.push(...customKitchenItems);
        }
        
        // Remove duplicates and apply search filter
        const uniqueItems = Array.from(new Set(currentItems));
        const filteredItems = uniqueItems.filter(item => 
          item.toLowerCase().includes(kitchenSearchQuery.toLowerCase())
        );

        const totalSpentAll = cookPurchaseHistory.reduce((s, p) => {
          const itTot = p.items ? p.items.reduce((sum, it) => sum + (parseFloat(it.price) || 0), 0) : 0;
          return s + itTot;
        }, 0);

        return (
          <div style={{padding:'16px 14px calc(110px + env(safe-area-inset-bottom, 0px))', display:'flex', flexDirection:'column', gap:14}}>
            
            {/* Summary Banner */}
            <div style={{background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', borderRadius:18, padding:'18px 20px', color:'#fff', boxShadow:'0 8px 24px rgba(15,23,42,0.15)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <div>
                <p style={{margin:0, fontSize:11, fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:0.5}}>Available Petty Cash</p>
                <h2 style={{margin:'4px 0 0', fontSize:28, fontWeight:900, color:'#fde047'}}>₹{availablePettyCash.toLocaleString('en-IN')}</h2>
                <p style={{margin:'4px 0 0', fontSize:11, color:'#38bdf8', fontWeight:700}}>👨‍🍳 Cook Kitchen Fund</p>
              </div>
              <div style={{textAlign:'right'}}>
                <p style={{margin:0, fontSize:11, fontWeight:800, color:'#94a3b8', textTransform:'uppercase'}}>Total Logged</p>
                <h3 style={{margin:'4px 0 0', fontSize:20, fontWeight:900, color:'#f8fafc'}}>₹{totalSpentAll.toLocaleString('en-IN')}</h3>
                <span style={{fontSize:11, color:'#94a3b8'}}>{cookPurchaseHistory.length} orders</span>
              </div>
            </div>

            {/* Tab Selector */}
            <div style={{display:'flex', background:'#fff', border:`1px solid ${C.border}`, borderRadius:14, padding:4, gap:4}}>
              <button
                onClick={() => setCookVendorTab('new')}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
                  background: cookVendorTab === 'new' ? C.primary : 'transparent',
                  color: cookVendorTab === 'new' ? '#000' : '#64748b',
                  fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                }}
              >
                <span className="material-symbols-outlined" style={{fontSize:18}}>shopping_cart</span>
                New Purchase
              </button>
              <button
                onClick={() => setCookVendorTab('history')}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
                  background: cookVendorTab === 'history' ? C.primary : 'transparent',
                  color: cookVendorTab === 'history' ? '#000' : '#64748b',
                  fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                }}
              >
                <span className="material-symbols-outlined" style={{fontSize:18}}>history</span>
                Past Purchases ({cookPurchaseHistory.length})
              </button>
            </div>

            {cookVendorTab === 'new' && (
              <>
                {/* Search Bar */}
                <div style={{display:'flex', alignItems:'center', gap:8, background:'#fff', border:`1px solid ${C.border}`, borderRadius:12, padding:'8px 12px', boxShadow:'0 2px 8px rgba(120,104,10,0.03)'}}>
                  <span className="material-symbols-outlined" style={{fontSize:20, color:'#64748b'}}>search</span>
                  <input
                    type="text"
                    placeholder="Search Aloo, Atta, Rice, Milk, Gas cylinder..."
                    value={kitchenSearchQuery}
                    onChange={e => setKitchenSearchQuery(e.target.value)}
                    style={{border:'none', outline:'none', width:'100%', fontSize:13.5, fontFamily:'inherit', color:C.text}}
                  />
                  {kitchenSearchQuery && (
                    <button onClick={() => setKitchenSearchQuery('')} style={{background:'none', border:'none', cursor:'pointer', color:'#94a3b8', display:'flex', padding:0}}>
                      <span className="material-symbols-outlined" style={{fontSize:18}}>close</span>
                    </button>
                  )}
                </div>

                {/* Category Pills */}
                <div style={{display:'flex', gap:8, overflowX:'auto', paddingBottom:4}}>
                  {categoriesList.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setKitchenActiveCategory(cat)}
                      style={{
                        padding: '6px 14px', borderRadius: 20, whiteSpace: 'nowrap',
                        border: kitchenActiveCategory === cat ? 'none' : `1px solid ${C.border}`,
                        background: kitchenActiveCategory === cat ? '#0891b2' : '#fff',
                        color: kitchenActiveCategory === cat ? '#fff' : C.text,
                        fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
                        flexShrink: 0
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Add Custom Item trigger */}
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'4px 2px'}}>
                  <span style={{fontSize:12, fontWeight:700, color:'#64748b'}}>Select items to purchase:</span>
                  <button
                    onClick={() => setShowCustomKitchenItemModal(true)}
                    style={{
                      background: '#ecfeff', border: '1px solid #a5f3fc', borderRadius: 8,
                      padding: '4px 10px', fontSize: 11.5, fontWeight: 800, color: '#0891b2',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit'
                    }}
                  >
                    <span className="material-symbols-outlined" style={{fontSize:16}}>add</span>
                    Add Custom Item
                  </button>
                </div>

                {/* Items Checklist List */}
                <div style={{display:'flex', flexDirection:'column', gap:8}}>
                  {filteredItems.length === 0 ? (
                    <div style={{background:'#fff', borderRadius:14, padding:'32px 16px', textAlign:'center', border:`1px solid ${C.border}`}}>
                      <span className="material-symbols-outlined" style={{fontSize:36, color:'#cbd5e1'}}>shopping_bag</span>
                      <p style={{margin:'8px 0 0', fontSize:13, color:C.muted}}>No matching items found</p>
                      <button
                        onClick={() => { setNewCustomKitchenName(kitchenSearchQuery); setShowCustomKitchenItemModal(true); }}
                        style={{marginTop:12, background:C.primary, border:'none', borderRadius:10, padding:'8px 14px', fontSize:12, fontWeight:800, cursor:'pointer'}}
                      >
                        + Add "{kitchenSearchQuery}" as Custom Item
                      </button>
                    </div>
                  ) : (
                    filteredItems.map(itemName => {
                      const isSelected = !!selectedKitchenItems[itemName];
                      const val = selectedKitchenItems[itemName] || { qty: '', unit: 'kg', rate: '' };
                      const lineTotal = isSelected ? calculateItemTotal(val.qty, val.unit, val.rate) : 0;
                      
                      // Auto-suggest unit based on name
                      let defaultUnit = 'kg';
                      if (itemName.toLowerCase().includes('milk') || itemName.toLowerCase().includes('oil') || itemName.toLowerCase().includes('dahi')) defaultUnit = 'litre';
                      if (itemName.toLowerCase().includes('cylinder')) defaultUnit = 'cylinder';
                      if (itemName.toLowerCase().includes('eggs') || itemName.toLowerCase().includes('bread') || itemName.toLowerCase().includes('packet') || itemName.toLowerCase().includes('bar')) defaultUnit = 'piece';

                      return (
                        <div
                          key={itemName}
                          style={{
                            background: isSelected ? '#f0fdfa' : '#fff',
                            border: isSelected ? '1.5px solid #0891b2' : `1px solid ${C.border}`,
                            borderRadius: 14, padding: '12px 14px',
                            display: 'flex', flexDirection: 'column', gap: 8,
                            transition: 'all 0.15s',
                            boxShadow: isSelected ? '0 4px 14px rgba(8,145,178,0.08)' : '0 2px 6px rgba(120,104,10,0.02)'
                          }}
                        >
                          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                            <div
                              onClick={() => toggleKitchenItem(itemName, defaultUnit)}
                              style={{display:'flex', alignItems:'center', gap:10, cursor:'pointer', flex:1}}
                            >
                              <div
                                style={{
                                  width: 22, height: 22, borderRadius: 6,
                                  border: `2px solid ${isSelected ? '#0891b2' : '#cbd5e1'}`,
                                  background: isSelected ? '#0891b2' : '#fff',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                }}
                              >
                                {isSelected && <span className="material-symbols-outlined" style={{fontSize:15, color:'#fff'}}>check</span>}
                              </div>
                              <span style={{fontSize:14, fontWeight: isSelected ? 800 : 700, color: isSelected ? '#0f172a' : '#334155'}}>
                                {itemName}
                              </span>
                            </div>
                            {isSelected && lineTotal > 0 && (
                              <span style={{fontSize:13, fontWeight:900, color:'#0891b2'}}>
                                = ₹{lineTotal.toFixed(0)}
                              </span>
                            )}
                          </div>

                          {/* Inputs when checked */}
                          {isSelected && (
                            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1.2fr', gap:8, paddingTop:6, borderTop:'1px dashed #ccfbf1'}}>
                              <div>
                                <label style={{display:'block', fontSize:10, fontWeight:800, color:'#0f766e', marginBottom:2}}>QTY</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  placeholder="e.g. 5"
                                  value={val.qty}
                                  onChange={e => updateKitchenItemField(itemName, 'qty', e.target.value)}
                                  style={{
                                    width: '100%', padding: '7px 8px', border: '1.5px solid #99f6e4',
                                    borderRadius: 8, fontSize: 13, fontWeight: 700, outline: 'none',
                                    boxSizing: 'border-box', background: '#fff'
                                  }}
                                />
                              </div>
                              <div>
                                <label style={{display:'block', fontSize:10, fontWeight:800, color:'#0f766e', marginBottom:2}}>UNIT</label>
                                <select
                                  value={val.unit || defaultUnit}
                                  onChange={e => updateKitchenItemField(itemName, 'unit', e.target.value)}
                                  style={{
                                    width: '100%', padding: '7px 6px', border: '1.5px solid #99f6e4',
                                    borderRadius: 8, fontSize: 12, fontWeight: 700, outline: 'none',
                                    boxSizing: 'border-box', background: '#fff', cursor: 'pointer'
                                  }}
                                >
                                  <option value="kg">kg</option>
                                  <option value="g">g</option>
                                  <option value="litre">litre</option>
                                  <option value="piece">piece</option>
                                  <option value="packet">packet</option>
                                  <option value="can">can</option>
                                  <option value="cylinder">cylinder</option>
                                </select>
                              </div>
                              <div>
                                <label style={{display:'block', fontSize:10, fontWeight:800, color:'#0f766e', marginBottom:2}}>RATE (₹)</label>
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="₹ Rate"
                                  value={val.rate}
                                  onChange={e => updateKitchenItemField(itemName, 'rate', e.target.value)}
                                  style={{
                                    width: '100%', padding: '7px 8px', border: '1.5px solid #99f6e4',
                                    borderRadius: 8, fontSize: 13, fontWeight: 700, outline: 'none',
                                    boxSizing: 'border-box', background: '#fff'
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Sticky Bottom Summary Bar */}
                {validKitchenRows.length > 0 && (
                  <div
                    style={{
                      position: 'fixed', bottom: 64, left: 0, right: 0,
                      maxWidth: 480, margin: '0 auto', padding: '12px 16px',
                      background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(10px)',
                      borderTop: '1px solid rgba(255,255,255,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      zIndex: 40, boxShadow: '0 -4px 20px rgba(0,0,0,0.2)'
                    }}
                  >
                    <div>
                      <p style={{margin:0, fontSize:11, color:'#94a3b8', fontWeight:700}}>{validKitchenRows.length} item(s) selected</p>
                      <h3 style={{margin:'2px 0 0', fontSize:18, fontWeight:900, color:'#fde047'}}>Total: ₹{kitchenGrandTotal.toLocaleString('en-IN')}</h3>
                    </div>
                    <button
                      onClick={openCookCheckout}
                      style={{
                        padding: '12px 20px', background: '#0891b2', color: '#fff',
                        border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 800,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                        boxShadow: '0 4px 14px rgba(8,145,178,0.4)', fontFamily: 'inherit'
                      }}
                    >
                      Vendor &amp; Pay →
                    </button>
                  </div>
                )}
              </>
            )}

            {cookVendorTab === 'history' && (
              <div style={{display:'flex', flexDirection:'column', gap:10}}>
                {cookPurchaseHistory.length === 0 ? (
                  <div style={{background:'#fff', borderRadius:16, padding:'40px 20px', textAlign:'center', border:`1px solid ${C.border}`}}>
                    <span className="material-symbols-outlined" style={{fontSize:44, color:'#cbd5e1'}}>receipt_long</span>
                    <h4 style={{margin:'10px 0 4px', fontSize:16, fontWeight:800, color:C.text}}>No Past Purchases Yet</h4>
                    <p style={{margin:0, fontSize:12, color:C.muted}}>Purchases logged by the cook will appear here with live sync.</p>
                  </div>
                ) : (
                  cookPurchaseHistory.map(pur => {
                    const purTotal = pur.items ? pur.items.reduce((s, it) => s + (parseFloat(it.price) || 0), 0) : 0;
                    const paidNow = pur.payInfo?.amtNow ? parseFloat(pur.payInfo.amtNow) : 0;
                    const isPaidFull = paidNow >= purTotal;
                    
                    return (
                      <div
                        key={pur.id}
                        style={{
                          background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16,
                          padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10,
                          boxShadow: '0 2px 8px rgba(120,104,10,0.03)'
                        }}
                      >
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                          <div>
                            <div style={{display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginBottom:2}}>
                              <h4 style={{margin:0, fontSize:15, fontWeight:800, color:C.text}}>{pur.vendorName || pur.vendorStore || 'Vendor'}</h4>
                              {pur.pgName && (
                                <span style={{fontSize:10, background:'#f0fdf4', color:'#166534', border:'1px solid #bbf7d0', padding:'1px 6px', borderRadius:4, fontWeight:700}}>
                                  🏢 {pur.pgName}
                                </span>
                              )}
                            </div>
                            <p style={{margin:0, fontSize:11.5, color:'#64748b'}}>
                              📅 {pur.date} · {pur.payInfo?.method || (pur.paymentSource === 'petty_cash' ? 'Petty Cash' : 'Cash')}
                            </p>
                          </div>
                          <div style={{textAlign:'right'}}>
                            <h4 style={{margin:0, fontSize:16, fontWeight:900, color:'#0f172a'}}>₹{purTotal.toLocaleString('en-IN')}</h4>
                            <span style={{fontSize:11, fontWeight:800, color: isPaidFull ? '#16a34a' : '#d97706'}}>
                              {isPaidFull ? '✓ Paid' : `Pending ₹${(purTotal - paidNow).toLocaleString('en-IN')}`}
                            </span>
                          </div>
                        </div>

                        {/* Items list */}
                        {pur.items && pur.items.length > 0 && (
                          <div style={{background:'#f8fafc', borderRadius:10, padding:'8px 10px', display:'flex', flexWrap:'wrap', gap:6}}>
                            {pur.items.map((it, idx) => (
                              <span key={idx} style={{fontSize:11.5, background:'#fff', border:'1px solid #e2e8f0', borderRadius:6, padding:'2px 8px', color:'#334155', fontWeight:600}}>
                                {it.item}: {it.qty}{it.unit} @ ₹{it.rate}
                              </span>
                            ))}
                          </div>
                        )}

                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:11, color:'#94a3b8', borderTop:'1px dashed #f1f5f9', paddingTop:8}}>
                          <span>👨‍🍳 Logged by Cook: {pur.staffName || 'Staff'}</span>
                          {pur.paymentSource === 'petty_cash' && (
                            <span style={{color:'#7c3aed', fontWeight:700}}>💳 Deducted from Petty Cash</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

          </div>
        );
      })()}

      {/* ── MODALS ────────────────────────────────────────────────────────── */}
      {/* Cook Kitchen Purchase Checkout Sheet */}
      <Sheet show={showCookCheckoutModal} onClose={()=>setShowCookCheckoutModal(false)} title="Confirm Kitchen Purchase" sub="Syncs with Vendor Account & Staff Petty Cash">
        <div style={{display:'flex', flexDirection:'column', gap:14}}>
          
          {/* Order items preview */}
          <div style={{background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:12, padding:'12px 14px'}}>
            <p style={{margin:'0 0 8px', fontSize:11, fontWeight:800, color:'#64748b', textTransform:'uppercase'}}>Selected Items ({validKitchenRows.length})</p>
            <div style={{display:'flex', flexDirection:'column', gap:6, maxHeight:140, overflowY:'auto'}}>
              {validKitchenRows.map(([name, v]) => (
                <div key={name} style={{display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:12.5}}>
                  <span style={{color:'#1e293b', fontWeight:700}}>{name} ({v.qty} {v.unit})</span>
                  <span style={{color:'#0f172a', fontWeight:800}}>₹{calculateItemTotal(v.qty, v.unit, v.rate).toFixed(0)}</span>
                </div>
              ))}
            </div>
            <div style={{borderTop:'1px dashed #cbd5e1', marginTop:8, paddingTop:8, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <span style={{fontSize:13, fontWeight:800, color:'#0f172a'}}>Grand Total</span>
              <span style={{fontSize:16, fontWeight:900, color:'#0891b2'}}>₹{kitchenGrandTotal.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Delivery Date */}
          <div>
            <label style={{display:'block', fontSize:12, fontWeight:800, color:'#475569', marginBottom:5}}>Delivery / Purchase Date</label>
            <input
              type="date"
              value={cookPurchaseDate}
              onChange={e => setCookPurchaseDate(e.target.value)}
              style={{width:'100%', padding:'10px 12px', border:'1.5px solid #e2e8f0', borderRadius:10, fontSize:13.5, fontFamily:'inherit', outline:'none', boxSizing:'border-box', color:'#0f172a'}}
            />
          </div>

          {/* PG Property */}
          <div>
            <label style={{display:'block', fontSize:12, fontWeight:800, color:'#475569', marginBottom:5}}>PG Property</label>
            <div style={{padding:'10px 12px', border:'1.5px solid #e2e8f0', borderRadius:10, background:'#f8fafc', fontSize:13.5, fontWeight:700, color:'#0f172a'}}>
              🏢 {assignedProperties.find(p => p.id === activePgId)?.name || 'Primary PG'}
            </div>
          </div>

          {/* Vendor Selection */}
          <div>
            <label style={{display:'block', fontSize:12, fontWeight:800, color:'#475569', marginBottom:5}}>Vendor / Supplier *</label>
            <select
              value={cookSelectedVendorId}
              onChange={e => setCookSelectedVendorId(e.target.value)}
              style={{width:'100%', padding:'11px 12px', border:'1.5px solid #e2e8f0', borderRadius:10, fontSize:13.5, fontFamily:'inherit', outline:'none', background:'#fff', color:'#0f172a', fontWeight:700, boxSizing:'border-box'}}
            >
              {adminVendors.map(v => (
                <option key={v.id} value={v.id}>
                  🏢 {v.name} ({v.store || v.category || 'Vendor'})
                </option>
              ))}
              <option value="manual">➕ Type Manually / New Local Vendor</option>
            </select>
          </div>

          {/* If manual vendor selected */}
          {cookSelectedVendorId === 'manual' && (
            <div style={{background:'#f0fdfe', border:'1.5px dashed #a5f3fc', borderRadius:12, padding:12, display:'flex', flexDirection:'column', gap:10}}>
              <p style={{margin:0, fontSize:12, fontWeight:800, color:'#0891b2'}}>Enter Local Vendor Details</p>
              <InputField
                label="Vendor / Shop Name *"
                placeholder="e.g. Ramesh Sabzi Mandi or Kisan Store"
                value={cookManualVendorName}
                onChange={e => setCookManualVendorName(e.target.value)}
              />
              <InputField
                label="Phone Number (Optional)"
                placeholder="e.g. 9876543210"
                value={cookManualVendorPhone}
                onChange={e => setCookManualVendorPhone(e.target.value)}
              />
              <InputField
                label="UPI ID (Optional)"
                placeholder="e.g. vendor@upi or 9876543210@paytm"
                value={cookManualVendorUpi}
                onChange={e => setCookManualVendorUpi(e.target.value)}
              />
            </div>
          )}

          {/* Payment Method / Source */}
          <div>
            <label style={{display:'block', fontSize:12, fontWeight:800, color:'#475569', marginBottom:6}}>Payment Source *</label>
            <div style={{display:'flex', gap:8, marginBottom:8}}>
              {[
                { id: 'petty_cash', label: 'Petty Cash', icon: 'payments' },
                { id: 'cash', label: 'Direct Cash', icon: 'money' },
                { id: 'upi', label: 'UPI / Online', icon: 'smartphone' }
              ].map(pm => (
                <button
                  key={pm.id}
                  type="button"
                  onClick={() => setCookPaymentSource(pm.id)}
                  style={{
                    flex: 1, padding: '10px 4px', borderRadius: 10,
                    border: cookPaymentSource === pm.id ? '2px solid #0891b2' : '1.5px solid #e2e8f0',
                    background: cookPaymentSource === pm.id ? '#ecfeff' : '#fff',
                    color: cookPaymentSource === pm.id ? '#0891b2' : '#64748b',
                    fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3
                  }}
                >
                  <span className="material-symbols-outlined" style={{fontSize:18}}>{pm.icon}</span>
                  {pm.label}
                </button>
              ))}
            </div>

            {cookPaymentSource === 'petty_cash' && (
              <div style={{background:'#fefce8', border:'1px solid #fef08a', borderRadius:10, padding:'8px 12px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <span style={{fontSize:12, color:'#854d0e', fontWeight:700}}>Available Petty Cash Fund:</span>
                <span style={{fontSize:13, fontWeight:900, color:'#b45309'}}>₹{availablePettyCash.toLocaleString('en-IN')}</span>
              </div>
            )}
          </div>

          {/* Amount Paying Now */}
          <div>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5}}>
              <label style={{fontSize:12, fontWeight:800, color:'#475569'}}>Amount Paying Now (₹) *</label>
              {kitchenGrandTotal > (parseFloat(cookPaidAmount) || 0) && (
                <span style={{fontSize:11, color:'#ef4444', fontWeight:800}}>
                  Remaining Due: ₹{(kitchenGrandTotal - (parseFloat(cookPaidAmount) || 0)).toLocaleString('en-IN')}
                </span>
              )}
            </div>
            <input
              type="number"
              min="0"
              placeholder="Amount paid"
              value={cookPaidAmount}
              onChange={e => setCookPaidAmount(e.target.value)}
              style={{width:'100%', padding:'11px 12px', border:'1.5px solid #e2e8f0', borderRadius:10, fontSize:15, fontWeight:800, fontFamily:'inherit', outline:'none', boxSizing:'border-box', color:'#0f172a'}}
            />
          </div>

          {/* Optional Note */}
          <div>
            <label style={{display:'block', fontSize:12, fontWeight:800, color:'#475569', marginBottom:5}}>Note / Remark (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Weekly vegetable mandi purchase"
              value={cookPurchaseNote}
              onChange={e => setCookPurchaseNote(e.target.value)}
              style={{width:'100%', padding:'10px 12px', border:'1.5px solid #e2e8f0', borderRadius:10, fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box', color:'#0f172a'}}
            />
          </div>

          {/* Confirm Button */}
          <button
            onClick={handleConfirmCookPurchase}
            disabled={isSubmittingCookPurchase}
            style={{
              padding: '14px', background: '#0891b2', color: '#fff', border: 'none',
              borderRadius: 14, fontSize: 15, fontWeight: 800, cursor: isSubmittingCookPurchase ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 16px rgba(8,145,178,0.3)', fontFamily: 'inherit',
              opacity: isSubmittingCookPurchase ? 0.7 : 1, marginTop: 6
            }}
          >
            {isSubmittingCookPurchase ? (
              <>
                <div style={{width:16, height:16, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 1s linear infinite'}} />
                Syncing with Admin &amp; Petty Cash...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{fontSize:20}}>cloud_sync</span>
                Confirm &amp; Sync Purchase 🚀
              </>
            )}
          </button>

        </div>
      </Sheet>

      {/* Add Custom Item Modal */}
      <Sheet show={showCustomKitchenItemModal} onClose={()=>setShowCustomKitchenItemModal(false)} title="Add Custom Kitchen Item" sub="Add any special or local item to checklist">
        <div style={{display:'flex', flexDirection:'column', gap:12}}>
          <InputField
            label="Item Name *"
            placeholder="e.g. Sona Masoori Rice, Biryani Masala, Kaju..."
            value={newCustomKitchenName}
            onChange={e => setNewCustomKitchenName(e.target.value)}
          />
          <button
            onClick={handleAddCustomKitchenItem}
            style={{
              padding: '13px', background: C.primary, color: '#000', border: 'none',
              borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: 'pointer',
              fontFamily: 'inherit', marginTop: 6
            }}
          >
            Add to Checklist 🛒
          </button>
        </div>
      </Sheet>
      {/* Sheet 1: Demands List (Asked by other staff members) */}
      <Sheet show={showDemandList} onClose={()=>setShowDemandList(false)} title="Staff Requisitions Queue" sub="Item demands raised by staff members">
        <div style={{display:'flex', flexDirection:'column', gap:14}}>
          <button onClick={()=>{ setShowDemandForm(true); setShowDemandList(false); }} style={{width:'100%', padding:12, background:C.primaryBg, border:`1.5px solid ${C.border}`, borderRadius:12, color:C.primaryDk, fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'inherit'}}>
            ➕ Create New Demand / Requisition
          </button>

          <div style={{display:'flex', flexDirection:'column', gap:10, maxHeight:360, overflowY:'auto', paddingRight:4}}>
            {demands.length === 0 ? (
              <p style={{textAlign:'center', padding:'20px 0', fontSize:13, color:C.muted}}>No demands in queue</p>
            ) : (
              demands.map(d => (
                <div key={d.id} style={{background:'#fff', border:`1px solid ${C.border}`, borderRadius:14, padding:14, boxShadow:'0 2px 8px rgba(120,104,10,0.03)'}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8}}>
                    <div>
                      <h4 style={{margin:0, fontSize:14, fontWeight:800, color:C.text}}>{d.item}</h4>
                      <p style={{margin:'2px 0 0', fontSize:11.5, color:C.muted}}>Qty: {d.qty} · By: {d.reqBy}</p>
                      <p style={{margin:'2px 0 0', fontSize:10.5, color:C.muted}}>📅 {d.date} · Vendor: {d.vendor}</p>
                    </div>
                    <Chip label={d.status} color={d.status==='Approved'?C.success:d.status==='Pending'?'#d97706':C.danger} bg={d.status==='Approved'?C.successBg:d.status==='Pending'?'#fef3c7':C.dangerBg}/>
                  </div>
                  
                  {/* Approvals for Managers / Purchase Managers / Admin */}
                  {d.status === 'Pending' && (['Manager', 'Purchase Manager', 'HR'].includes(staffRole)) && (
                    <div style={{display:'flex', gap:8, marginTop:10}}>
                      <button onClick={() => setDemands(prev => prev.map(x => x.id === d.id ? {...x, status:'Approved'} : x))} style={{flex:1, padding:'6px 0', background:C.successBg, border:'none', borderRadius:8, color:C.success, fontSize:11.5, fontWeight:800, cursor:'pointer'}}>
                        ✓ Approve
                      </button>
                      <button onClick={() => setDemands(prev => prev.map(x => x.id === d.id ? {...x, status:'Rejected'} : x))} style={{flex:1, padding:'6px 0', background:C.dangerBg, border:'none', borderRadius:8, color:C.danger, fontSize:11.5, fontWeight:800, cursor:'pointer'}}>
                        ✕ Reject
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </Sheet>

      {/* Sheet 2: Demand Creation Form */}
      {/* Supplies Request Full Modal */}
      {showItemRequestModal && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:500,
          display:'flex', flexDirection:'column', alignItems:'flex-end'
        }} onClick={e => { if (e.target === e.currentTarget) setShowItemRequestModal(false); }}>
          <div style={{
            width:'100%', maxWidth:480, height:'95dvh', marginTop:'5dvh',
            background:'#f8f9fa', borderRadius:'24px 24px 0 0',
            display:'flex', flexDirection:'column', overflowY:'auto'
          }}>
            {/* Header */}
            <div style={{
              background:'#fff', padding:'16px 18px',
              borderBottom:'1px solid #f1f5f9', display:'flex',
              alignItems:'center', justifyContent:'space-between',
              position:'sticky', top:0, zIndex:10, borderRadius:'24px 24px 0 0'
            }}>
              <div>
                <p style={{margin:0, fontSize:16, fontWeight:900, color:'#1a1500'}}>Request Supplies</p>
                <p style={{margin:'2px 0 0', fontSize:11, color:C.muted, fontWeight:700}}>{staffRole} list · {staffName}</p>
              </div>
              <button onClick={() => setShowItemRequestModal(false)} style={{background:'#f8f9fa', border:'none', borderRadius:10, width:34, height:34, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, color:'#666'}}>
                <span className="material-symbols-outlined" style={{fontSize:20}}>close</span>
              </button>
            </div>

            {/* Body */}
            <div style={{padding:'16px', display:'flex', flexDirection:'column', gap:14, flex:1}}>

              {/* Date & Send To */}
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
                <div>
                  <p style={{margin:'0 0 5px', fontSize:10.5, fontWeight:800, color:C.muted, textTransform:'uppercase'}}>Date</p>
                  <input type="date" value={itemReqDate} onChange={e => setItemReqDate(e.target.value)}
                    style={{width:'100%', padding:'9px 12px', border:'1.5px solid #e8df9a', borderRadius:10, fontSize:13, fontFamily:'inherit', boxSizing:'border-box'}} />
                </div>
                <div>
                  <p style={{margin:'0 0 5px', fontSize:10.5, fontWeight:800, color:C.muted, textTransform:'uppercase'}}>Send To</p>
                  <select value={itemReqSendTo} onChange={e => setItemReqSendTo(e.target.value)}
                    style={{width:'100%', padding:'9px 12px', border:'1.5px solid #e8df9a', borderRadius:10, fontSize:13, fontFamily:'inherit', background:'#fff', boxSizing:'border-box'}}>
                    {RECIPIENTS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              {/* Search */}
              <div style={{position:'relative'}}>
                <span className="material-symbols-outlined" style={{position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:17, color:C.muted}}>search</span>
                <input type="text" placeholder="Search items..." value={itemReqSearchQ} onChange={e => setItemReqSearchQ(e.target.value)}
                  style={{width:'100%', padding:'10px 12px 10px 38px', border:'1.5px solid #e8df9a', borderRadius:12, fontSize:13, fontFamily:'inherit', boxSizing:'border-box'}} />
              </div>

              {/* Summary row */}
              <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                <p style={{margin:0, fontSize:11, fontWeight:700, color:C.muted}}>
                  {itemReqItems.filter(i => i.checked).length} items selected
                </p>
                <button onClick={() => setItemReqItems(prev => prev.map(i => ({ ...i, checked: false })))}
                  style={{background:'none', border:'none', fontSize:11, fontWeight:800, color:'#b91c1c', cursor:'pointer', fontFamily:'inherit', padding:0}}>
                  Clear All
                </button>
              </div>

              {/* Grouped item list */}
              {(() => {
                const filtered = itemReqItems.filter(i =>
                  (i.name || '').toLowerCase().includes(itemReqSearchQ.toLowerCase()) ||
                  (i.cat || '').toLowerCase().includes(itemReqSearchQ.toLowerCase())
                );
                const categories = [...new Set(filtered.map(i => i.cat || 'General'))];
                return (
                  <div style={{display:'flex', flexDirection:'column', gap:12}}>
                    {categories.map(cat => {
                      const catItems = filtered.filter(i => (i.cat || 'General') === cat);
                      return (
                        <div key={cat}>
                          <p style={{margin:'0 0 8px', fontSize:10.5, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:0.4}}>{cat}</p>
                          <div style={{display:'flex', flexDirection:'column', gap:6}}>
                            {catItems.map((item) => {
                              const globalIdx = itemReqItems.findIndex(i => i.name === item.name && i.cat === item.cat);
                              return (
                                <div key={item.name + item.cat} style={{
                                  background:'#fff',
                                  border: item.checked ? '1.5px solid #ca8a04' : '1px solid #f1f5f9',
                                  borderRadius:14, padding:'12px 14px',
                                  display:'flex', alignItems:'center', justifyContent:'space-between',
                                  boxShadow: item.checked ? '0 2px 8px rgba(202,138,4,0.08)' : 'none'
                                }}>
                                  <div style={{display:'flex', alignItems:'center', gap:10, flex:1}}>
                                    <div
                                      onClick={() => setItemReqItems(prev => prev.map((x, i) => i === globalIdx ? {...x, checked: !x.checked} : x))}
                                      style={{
                                        width:20, height:20, borderRadius:6,
                                        border: item.checked ? '2px solid #ca8a04' : '2px solid #d1d5db',
                                        background: item.checked ? '#ca8a04' : '#fff',
                                        cursor:'pointer', flexShrink:0,
                                        display:'flex', alignItems:'center', justifyContent:'center'
                                      }}
                                    >
                                      {item.checked && <span className="material-symbols-outlined" style={{fontSize:13, color:'#fff'}}>check</span>}
                                    </div>
                                    <div style={{flex:1}}>
                                      <p style={{margin:0, fontSize:13.5, fontWeight: item.checked ? 800 : 700, color: item.checked ? '#1a1500' : '#374151'}}>{item.name}</p>
                                      <p style={{margin:0, fontSize:10.5, color:C.muted}}>per {item.unit}{item.custom ? ' · Custom' : ''}</p>
                                    </div>
                                  </div>
                                  {item.checked && (
                                    <div style={{display:'flex', alignItems:'center', gap:6}}>
                                      <input
                                        type="number"
                                        placeholder="Qty"
                                        value={item.qty}
                                        onChange={e => setItemReqItems(prev => prev.map((x, i) => i === globalIdx ? {...x, qty: e.target.value} : x))}
                                        style={{width:54, padding:'6px 8px', border:'1.5px solid #e8df9a', borderRadius:8, fontSize:12.5, textAlign:'center', fontFamily:'inherit'}}
                                      />
                                      <span style={{fontSize:11, color:C.muted, whiteSpace:'nowrap'}}>{item.unit}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Add Custom Item */}
              {!itemReqAddingCustom ? (
                <button onClick={() => setItemReqAddingCustom(true)} style={{
                  display:'flex', alignItems:'center', gap:8, background:'none',
                  border:'1.5px dashed #ca8a04', borderRadius:12, padding:'11px 14px',
                  fontSize:13, fontWeight:800, color:'#ca8a04', cursor:'pointer', fontFamily:'inherit', width:'100%'
                }}>
                  <span className="material-symbols-outlined" style={{fontSize:18}}>add</span>
                  Add Item Not In List
                </button>
              ) : (
                <div style={{background:'#fffef2', border:'1.5px solid #e8df9a', borderRadius:14, padding:'14px'}}>
                  <p style={{margin:'0 0 10px', fontSize:11.5, fontWeight:800, color:'#ca8a04'}}>ADD CUSTOM ITEM</p>
                  <div style={{display:'flex', gap:8, marginBottom:10}}>
                    <input type="text" placeholder="Item name..." value={itemReqCustomInput} onChange={e => setItemReqCustomInput(e.target.value)}
                      style={{flex:2, padding:'9px 12px', border:'1.5px solid #e8df9a', borderRadius:10, fontSize:13, fontFamily:'inherit'}} />
                    <input type="text" placeholder="Unit (kg/pc)" value={itemReqCustomUnit} onChange={e => setItemReqCustomUnit(e.target.value)}
                      style={{flex:1, padding:'9px 10px', border:'1.5px solid #e8df9a', borderRadius:10, fontSize:12, fontFamily:'inherit'}} />
                  </div>
                  <div style={{display:'flex', gap:8}}>
                    <button onClick={addCustomItemToReq} style={{flex:1, padding:'9px 0', borderRadius:10, border:'none', background:'#ca8a04', color:'#fff', fontSize:12, fontWeight:900, cursor:'pointer', fontFamily:'inherit'}}>
                      Add to List
                    </button>
                    <button onClick={() => { setItemReqAddingCustom(false); setItemReqCustomInput(''); setItemReqCustomUnit(''); }}
                      style={{flex:1, padding:'9px 0', borderRadius:10, border:'1px solid #e8df9a', background:'#fff', color:C.muted, fontSize:12, fontWeight:800, cursor:'pointer', fontFamily:'inherit'}}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Note */}
              <div>
                <p style={{margin:'0 0 5px', fontSize:10.5, fontWeight:800, color:C.muted, textTransform:'uppercase'}}>Note (Optional)</p>
                <textarea
                  value={itemReqNote}
                  onChange={e => setItemReqNote(e.target.value)}
                  placeholder="Any special instructions or remarks..."
                  rows={2}
                  style={{width:'100%', padding:'10px 12px', border:'1.5px solid #e8df9a', borderRadius:12, fontSize:13, fontFamily:'inherit', resize:'none', boxSizing:'border-box'}}
                />
              </div>
            </div>

            {/* Sticky Send button */}
            <div style={{padding:'14px 16px', paddingBottom:'calc(14px + env(safe-area-inset-bottom, 0px))', background:'#fff', borderTop:'1px solid #f1f5f9', position:'sticky', bottom:0}}>
              <button onClick={sendItemRequest} disabled={isSendingItemReq || itemReqItems.filter(i => i.checked).length === 0} style={{
                width:'100%', padding:15, borderRadius:14, border:'none',
                background: itemReqItems.filter(i => i.checked).length === 0 ? '#e5e7eb' : '#1a1500',
                color: itemReqItems.filter(i => i.checked).length === 0 ? '#9ca3af' : '#fde047',
                fontSize:14, fontWeight:900,
                cursor: (isSendingItemReq || itemReqItems.filter(i => i.checked).length === 0) ? 'not-allowed' : 'pointer',
                fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:8
              }}>
                {isSendingItemReq ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2" style={{ borderColor: '#fde047' }}></div>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{fontSize:18}}>send</span>
                    {itemReqItems.filter(i => i.checked).length === 0
                      ? 'Select items to send'
                      : ('Send to ' + itemReqSendTo + ' (' + itemReqItems.filter(i => i.checked).length + ' items)')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sheet 3: Add Items Modal (Screenshot 3) */}
      <Sheet show={showAddPurchaseModal} onClose={()=>setShowAddPurchaseModal(false)} title="Add Items" sub={selectedVendor ? `${selectedVendor.category} · ${selectedVendor.shop}` : ''}>
        <div style={{display:'flex', flexDirection:'column', gap:12}}>
          {/* Date Selector */}
          <div style={{marginBottom:10}}>
            <label style={{display:'block', fontSize:11, fontWeight:800, color:C.muted, textTransform:'uppercase', marginBottom:6}}>Date</label>
            <input 
              type="date" 
              value={purchaseDate} 
              onChange={e=>setPurchaseDate(e.target.value)} 
              style={{width:'100%', padding:12, border:`1.5px solid ${C.border}`, borderRadius:10, fontSize:14, fontFamily:'inherit'}}
            />
          </div>

          {/* Items checklist */}
          <div style={{display:'flex', flexDirection:'column', gap:8, maxHeight:260, overflowY:'auto', paddingRight:4}}>
            {purchaseItemsState.map((item, idx) => (
              <div key={item.name} style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 10px', background:'#fff', border:`1px solid ${C.border}`, borderRadius:12}}>
                <div style={{display:'flex', alignItems:'center', gap:8, flex:1.5}}>
                  <input 
                    type="checkbox" 
                    checked={item.checked} 
                    onChange={e => setPurchaseItemsState(prev => prev.map((x, i) => i === idx ? {...x, checked: e.target.checked} : x))}
                    style={{width:16, height:16, cursor:'pointer'}}
                  />
                  <div>
                    <p style={{margin:0, fontSize:13, fontWeight:800, color:C.text}}>{item.name}</p>
                    <span style={{fontSize:10.5, color:C.muted}}>{item.rate} / {item.unit}</span>
                  </div>
                </div>
                
                {item.checked ? (
                  <div style={{display:'flex', alignItems:'center', gap:6, flex:2, justifyContent:'flex-end'}}>
                    <input 
                      type="number" 
                      value={item.qty} 
                      onChange={e => setPurchaseItemsState(prev => prev.map((x, i) => i === idx ? {...x, qty: Number(e.target.value)} : x))}
                      style={{width:60, padding:'6px 8px', border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:12, textAlign:'center'}}
                    />
                    <span style={{fontSize:11.5, color:C.muted}}>{item.unit}</span>
                    <input 
                      type="number" 
                      value={item.rate} 
                      onChange={e => setPurchaseItemsState(prev => prev.map((x, i) => i === idx ? {...x, rate: Number(e.target.value)} : x))}
                      style={{width:60, padding:'6px 8px', border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:12, textAlign:'center'}}
                    />
                  </div>
                ) : (
                  <span style={{fontSize:13, color:C.muted}}>-</span>
                )}

                <div style={{flex:0.8, textAlign:'right', fontSize:13, fontWeight:900, color:C.text}}>
                  {item.checked ? `₹${item.qty * item.rate}` : '-'}
                </div>
              </div>
            ))}
          </div>

          {/* Selection summary */}
          <div style={{background:'#ecfeff', border:'1px solid #cffafe', borderRadius:12, padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <span style={{fontSize:12.5, fontWeight:800, color:'#0891b2'}}>{purchaseItemsState.filter(i=>i.checked).length} items selected</span>
            <span style={{fontSize:14, fontWeight:900, color:'#0891b2'}}>₹{purchaseItemsState.filter(i=>i.checked).reduce((s, i) => s + (i.qty * i.rate), 0)}</span>
          </div>

          {/* Make Purchase Button */}
          <button 
            onClick={() => {
              const selectedItems = purchaseItemsState.filter(i => i.checked);
              if (selectedItems.length === 0) {
                showToast('Please select at least one item.', 'warning');
                return;
              }
              const totalCost = selectedItems.reduce((s, i) => s + (i.qty * i.rate), 0);
              const descStr = `Purchase: ` + selectedItems.map(i => `${i.name} (${i.qty} ${i.unit})`).join(', ');
              
              // Add ledger entry
              const newLedger = {
                id: Date.now(),
                vendorId: selectedVendor.id,
                date: purchaseDate.split('-').reverse().join('-'), // format date nicely
                type: 'Purchase',
                amount: totalCost,
                desc: descStr,
                status: 'Pending',
                pm: `UPI -> ${selectedVendor.upi}`
              };
              
              setVendorLedger(prev => [newLedger, ...prev]);
              
              // Update Vendor Balance
              setVendors(prev => prev.map(v => v.id === selectedVendor.id ? {...v, balance: v.balance + totalCost} : v));
              setSelectedVendor(prev => ({...prev, balance: prev.balance + totalCost}));
              
              setShowAddPurchaseModal(false);
              
              // Open Pay modal automatically
              setPayAmount(String(totalCost));
              setShowPayVendorModal(true);
            }} 
            style={{width:'100%', padding:14, background:'#0891b2', border:'none', borderRadius:12, color:'#fff', fontSize:14, fontWeight:900, cursor:'pointer', fontFamily:'inherit'}}
          >
            Make Purchase
          </button>
        </div>
      </Sheet>

      {/* Sheet 4: Purchase Payment Modal (Screenshot 4) */}
      {/* Sheet 5: Document Preview Modal */}
      <Sheet show={!!previewDoc} onClose={() => setPreviewDoc(null)} title={previewDoc?.name || 'Document View'} sub="Uploaded Document Details">
        <div style={{display:'flex', flexDirection:'column', gap:14, alignItems:'center', textAlign:'center'}}>
          
          <div>
            <h4 style={{margin:0, fontSize:16, fontWeight:800, color:C.text}}>{previewDoc?.name}</h4>
            <p style={{margin:'4px 0 0', fontSize:12, color:C.muted}}>Reference/No: {previewDoc?.no}</p>
          </div>

          {/* Show actual image if fileUrl is an image/base64, otherwise show icon placeholder */}
          {previewDoc?.fileUrl && (previewDoc.fileUrl.startsWith('data:image') || previewDoc.fileUrl.startsWith('http') || previewDoc.fileUrl.startsWith('blob')) ? (
            <img 
              src={previewDoc.fileUrl} 
              alt={previewDoc.name} 
              style={{width:'100%', borderRadius:14, border:'1.5px solid #e8df9a', objectFit:'contain', maxHeight:320, background:'#fafafa'}} 
            />
          ) : (
            <div style={{width:'100%', padding:'30px 10px', background:'#fafafa', border:`1.5px dashed ${C.border}`, borderRadius:14, display:'flex', flexDirection:'column', alignItems:'center', gap:8}}>
              <span className="material-symbols-outlined" style={{fontSize:48, color:'#ca8a04'}}>
                {previewDoc?.icon === 'badge' ? 'badge' : previewDoc?.icon === 'credit_card' ? 'credit_card' : 'description'}
              </span>
              <p style={{margin:0, fontSize:13, fontWeight:800, color:C.text}}>
                {previewDoc?.fileUrl || 'No file uploaded'}
              </p>
              <p style={{margin:'2px 0 0', fontSize:11, color:C.muted}}>Document uploaded — image preview not available</p>
            </div>
          )}

          {previewDoc?.status === 'Verified' && (
            <div style={{display:'inline-flex', alignItems:'center', gap:6, background:'#dcfce7', padding:'6px 14px', borderRadius:10}}>
              <span className="material-symbols-outlined" style={{fontSize:14, color:'#166534'}}>verified</span>
              <span style={{fontSize:11, fontWeight:800, color:'#166534'}}>VERIFIED DOCUMENT</span>
            </div>
          )}

          <button 
            onClick={() => setPreviewDoc(null)} 
            style={{width:'100%', padding:12, background:'#ca8a04', border:'none', borderRadius:10, color:'#fff', fontSize:13, fontWeight:900, cursor:'pointer', fontFamily:'inherit'}}
          >
            Close
          </button>
        </div>
      </Sheet>
      <Sheet show={showPayVendorModal} onClose={()=>setShowPayVendorModal(false)} title="Purchase Payment">
        <div style={{display:'flex', flexDirection:'column', gap:12}}>
          {/* Summary values card */}
          <div style={{background:'#fafafa', border:`1px solid ${C.border}`, borderRadius:14, padding:14, display:'flex', flexDirection:'column', gap:6}}>
            <div style={{display:'flex', justifyContent:'space-between', fontSize:13}}>
              <span style={{color:C.muted}}>Total Pending</span>
              <span style={{fontWeight:800, color:C.text}}>₹{selectedVendor?.balance.toLocaleString()}</span>
            </div>
            <div style={{display:'flex', justifyContent:'space-between', fontSize:13}}>
              <span style={{color:C.muted}}>Remaining after payment</span>
              <span style={{fontWeight:900, color:'#b91c1c'}}>₹{(Number(selectedVendor?.balance || 0) - Number(payAmount || 0)).toLocaleString()}</span>
            </div>
          </div>

          {/* Amount field */}
          <InputField 
            label="Amount Paying Now (₹)" 
            type="number" 
            required 
            value={payAmount} 
            onChange={e=>setPayAmount(e.target.value)} 
            placeholder="e.g. 5000"
          />

          {/* Toggle payment method */}
          <div>
            <label style={{display:'block', fontSize:11, fontWeight:800, color:C.muted, textTransform:'uppercase', marginBottom:6}}>Payment Method</label>
            <div style={{display:'flex', gap:10}}>
              <button 
                type="button"
                onClick={()=>setPayMethod('Cash')}
                style={{
                  flex:1, padding:12, borderRadius:10, border: payMethod==='Cash' ? 'none' : `1px solid ${C.border}`,
                  background: payMethod==='Cash' ? '#0891b2' : '#fff',
                  color: payMethod==='Cash' ? '#fff' : C.text,
                  fontWeight:800, fontSize:13, cursor:'pointer', fontFamily:'inherit'
                }}
              >
                💵 Cash
              </button>
              <button 
                type="button"
                onClick={()=>setPayMethod('UPI')}
                style={{
                  flex:1, padding:12, borderRadius:10, border: payMethod==='UPI' ? 'none' : `1px solid ${C.border}`,
                  background: payMethod==='UPI' ? '#0891b2' : '#fff',
                  color: payMethod==='UPI' ? '#fff' : C.text,
                  fontWeight:800, fontSize:13, cursor:'pointer', fontFamily:'inherit'
                }}
              >
                📲 UPI
              </button>
            </div>
          </div>

          {/* UPI specific detail fields */}
          {payMethod === 'UPI' && selectedVendor && (
            <div style={{display:'flex', flexDirection:'column', gap:10}}>
              <InputField 
                label="Sender Phone / UPI ID" 
                value={paySenderUpi} 
                onChange={e=>setPaySenderUpi(e.target.value)} 
                placeholder="your.name@upi"
              />
              <InputField 
                label="Receiver Phone / UPI ID" 
                disabled 
                value={selectedVendor.upi} 
                placeholder="vendor@upi"
              />
            </div>
          )}

          {/* Confirm Button */}
          <button 
            onClick={() => {
              const amt = Number(payAmount);
              if (!amt || amt <= 0) {
                showToast('Please enter a valid payment amount.', 'warning');
                return;
              }
              
              // Add ledger entry
              const newLedger = {
                id: Date.now(),
                vendorId: selectedVendor.id,
                date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
                type: 'Payment',
                amount: amt,
                desc: payMethod==='UPI' ? `Paid via UPI to ${selectedVendor.upi}` : 'Paid via Cash',
                status: 'Approved',
                pm: payMethod
              };
              
              setVendorLedger(prev => [newLedger, ...prev]);
              
              // Update Vendor Balance
              setVendors(prev => prev.map(v => v.id === selectedVendor.id ? {...v, balance: v.balance - amt} : v));
              setSelectedVendor(prev => ({...prev, balance: prev.balance - amt}));
              
              setShowPayVendorModal(false);
              showToast(`Payment of ₹${amt.toLocaleString()} recorded successfully!`, 'success');
            }} 
            style={{width:'100%', padding:14, background:'#0891b2', border:'none', borderRadius:12, color:'#fff', fontSize:14, fontWeight:900, cursor:'pointer', fontFamily:'inherit'}}
          >
            Confirm Payment
          </button>
        </div>
      </Sheet>
      <Sheet show={showDemandForm} onClose={()=>setShowDemandForm(false)} title="Demand Item / Supplies" sub="Submit requisition to admin">
        <form onSubmit={submitDemand} style={{display:'flex',flexDirection:'column',gap:12}}>
          <InputField label="Item Description *" required value={dItem} onChange={e=>setDItem(e.target.value)} placeholder="e.g. Basmati Rice 25kg"/>
          <InputField label="Quantity" value={dQty} onChange={e=>setDQty(e.target.value)} placeholder="e.g. 2 bags"/>
          <InputField label="Note / Urgency" value={dNote} onChange={e=>setDNote(e.target.value)} placeholder="e.g. Needed for tonight"/>
          <button type="submit" style={{padding:14,background:C.primary,color:C.text,border:`1.5px solid ${C.border}`,borderRadius:14,fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 4px 16px rgba(15,23,42,0.05)'}}>Submit Demand 🚀</button>
        </form>
      </Sheet>

      <Sheet show={showBcast} onClose={()=>setShowBcast(false)} title="Broadcast — Food is Ready!" sub="Send meal notification">
        <form onSubmit={e=>{
          e.preventDefault();
          setShowBcast(false);
          
          const targetName = bTarget === 'All' ? 'All Students' : students.find(s=>s.id===bStudentId)?.name || 'Student';
          const targetStudents = bTarget === 'All' ? students : students.filter(s => s.id === bStudentId);
          
          if (targetStudents.length === 0) {
            alert("No students found to broadcast to! (Check if students are properly allotted to this PG)");
            return;
          }

          // Show success modal instantly for quick UI feedback
          setBcastSuccessModal(true);
          
          const now = new Date().toISOString();
          console.log(`Broadcasting to ${targetStudents.length} students...`);

          // Execute backend writes asynchronously in the background
          Promise.all(targetStudents.map(student => 
            addDoc(collection(db, 'users', student.id, 'notifications'), {
              title: `🍽️ ${bMeal} is Ready!`,
              desc: bMsg || `Your ${bMeal} is freshly prepared and ready to be served. Enjoy your meal!`,
              type: 'info',
              action: 'FOOD_TAB',
              unread: true,
              createdAt: now
            })
          )).catch(err => {
             console.error("Broadcast error:", err);
          });
        }} style={{display:'flex',flexDirection:'column',gap:12}}>
          <SelectField label="Send To" value={bTarget} onChange={e=>setBTarget(e.target.value)}>
            <option value="All">All Students</option>
            <option value="Individual">Individual Student</option>
          </SelectField>
          {bTarget === 'Individual' && (
            <SelectField label="Select Student" required value={bStudentId} onChange={e=>setBStudentId(e.target.value)}>
              <option value="">-- Choose --</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name} (Rm {s.room})</option>)}
            </SelectField>
          )}
          <SelectField label="Meal" value={bMeal} onChange={e=>setBMeal(e.target.value)}>
            <option>Breakfast</option>
            <option>Lunch</option>
            <option>Snacks</option>
            <option>Dinner</option>
          </SelectField>
          <InputField label="Message" textarea rows={3} value={bMsg} onChange={e=>setBMsg(e.target.value)}/>
          <button type="submit" style={{padding:14,background: C.primary,color:'#000',border: '1px solid #e2e8f0',borderRadius:14,fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'inherit',boxShadow: '0 4px 16px rgba(15,23,42,0.05)'}}>Send Notification 📢</button>
        </form>
      </Sheet>

      <Sheet show={showMenuEdit} onClose={()=>setShowMenuEdit(false)} title={`Edit ${mealTab} Menu`} sub="Update the food items for today">
        <form onSubmit={async (e)=>{
          e.preventDefault();
          const newMenu = {
             ...weeklyFoodMenu,
             [todayName]: {
                ...weeklyFoodMenu[todayName],
                [mealTab]: menuEditVal
             }
          };
          setWeeklyFoodMenu(newMenu);
          setShowMenuEdit(false);
          if (user?.ownerUid) {
             try {
                await updateDoc(doc(db, 'pg_owners', user.ownerUid), { foodMenu: newMenu });
             } catch (err) { console.error('Failed to update today menu', err); }
          }
        }} style={{display:'flex',flexDirection:'column',gap:12}}>
          <InputField label="Food Items" textarea rows={3} required value={menuEditVal} onChange={e=>setMenuEditVal(e.target.value)} placeholder="e.g. 4 Roti, Dal, Rice, Salad"/>
          <button type="submit" style={{padding:14,background:meta.grad,color:'#000',border: '1px solid #e2e8f0',borderRadius:14,fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'inherit',boxShadow: '0 4px 16px rgba(15,23,42,0.05)'}}>Save Menu</button>
        </form>
      </Sheet>

      {/* ── COOK EDIT MENU & PER-ITEM PHOTOS MODAL ── */}
      {showWeeklyMenuEdit && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 999,
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '24px 24px 0 0',
            padding: 22,
            paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
            animation: 'slideUp 0.3s ease',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            {/* Hidden Photo Input for Camera/Gallery */}
            <input
              type="file"
              ref={cookPhotoInputRef}
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={handleCookPhotoSelect}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 800, color: meta.accent, textTransform: 'uppercase' }}>Kitchen Menu &amp; Photos</span>
                <h3 style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 900, color: '#000' }}>
                  Edit {editWeeklyMenuDay} {editWeeklyMenuMeal}
                </h3>
              </div>
              <span className="material-symbols-outlined" onClick={() => setShowWeeklyMenuEdit(false)} style={{ cursor: 'pointer', color: '#64748b' }}>close</span>
            </div>

            {/* Current Items List */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 800, color: '#1e293b', textTransform: 'uppercase' }}>
                  Items in this Meal ({editWeeklyMenuItems.length})
                </label>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Tap photo to take/change</span>
              </div>

              {editWeeklyMenuItems.length === 0 ? (
                <div style={{ padding: 14, background: '#f8fafc', borderRadius: 12, textAlign: 'center', border: '1.5px dashed #cbd5e1', color: '#64748b', fontSize: 13, fontWeight: 600 }}>
                  No items added yet. Click dishes below to add them with photos!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto', paddingRight: 2 }}>
                  {editWeeklyMenuItems.map((item, idx) => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '8px 10px' }}>
                      {/* Dish Photo Thumbnail */}
                      <div
                        onClick={() => {
                          setActiveCookPhotoIndex(idx);
                          setShowCookItemPhotoPicker(true);
                        }}
                        style={{
                          width: 44, height: 44, borderRadius: 10,
                          backgroundImage: `url(${item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop'})`,
                          backgroundSize: 'cover', backgroundPosition: 'center',
                          border: '1.5px solid #cbd5e1', cursor: 'pointer', flexShrink: 0,
                          position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end'
                        }}
                      >
                        <div style={{ background: 'rgba(15,23,42,0.7)', color: '#fff', borderRadius: 4, padding: '1px 3px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 12 }}>photo_camera</span>
                        </div>
                      </div>

                      {/* Name input */}
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditWeeklyMenuItems(prev => prev.map((it, i) => i === idx ? { ...it, name: val } : it));
                        }}
                        placeholder="e.g. 4 Roti"
                        style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700, outline: 'none', fontFamily: 'inherit', background: '#fff' }}
                      />

                      {/* Photo change button */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveCookPhotoIndex(idx);
                          setShowCookItemPhotoPicker(true);
                        }}
                        style={{ background: '#ede9fe', color: '#7c3aed', border: 'none', borderRadius: 8, padding: '7px 9px', fontSize: 11, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>photo_camera</span>
                        Photo
                      </button>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => setEditWeeklyMenuItems(prev => prev.filter((_, i) => i !== idx))}
                        style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: 8, padding: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Pick Common PG Dishes */}
            <div style={{ marginBottom: 16, background: '#f8fafc', borderRadius: 16, padding: 12, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                  ⚡ Quick Add Common Dishes
                </span>
                <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 700 }}>Pre-made Photos</span>
              </div>

              {/* Categories */}
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 6, marginBottom: 8 }}>
                {DISH_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCookPresetCategory(cat)}
                    style={{
                      padding: '4px 10px', borderRadius: 16, border: 'none',
                      background: cookPresetCategory === cat ? '#000' : '#fff',
                      color: cookPresetCategory === cat ? C.primary : '#64748b',
                      fontSize: 11, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap'
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Search */}
              <input
                type="text"
                placeholder="Search dish (e.g. Paneer, Roti, Dal, Poha)..."
                value={cookPresetSearch}
                onChange={e => setCookPresetSearch(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12, fontWeight: 600, outline: 'none', fontFamily: 'inherit', marginBottom: 8, boxSizing: 'border-box' }}
              />

              {/* Grid of Dishes */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8, maxHeight: 150, overflowY: 'auto', paddingRight: 2 }}>
                {COMMON_PG_DISHES
                  .filter(d => cookPresetCategory === 'All' || d.category === cookPresetCategory)
                  .filter(d => !cookPresetSearch || d.name.toLowerCase().includes(cookPresetSearch.toLowerCase()))
                  .map(dish => {
                    const isAdded = editWeeklyMenuItems.some(it => it.name.toLowerCase() === dish.name.toLowerCase());
                    return (
                      <div
                        key={dish.id}
                        onClick={() => {
                          if (isAdded) return;
                          setEditWeeklyMenuItems(prev => [
                            ...prev,
                            { id: Math.random().toString(36).substring(2, 9), name: dish.name, image: dish.image }
                          ]);
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          background: isAdded ? '#f0fdf4' : '#fff',
                          border: `1px solid ${isAdded ? '#86efac' : '#e2e8f0'}`,
                          borderRadius: 10, padding: '5px 8px', cursor: isAdded ? 'default' : 'pointer'
                        }}
                      >
                        <img src={dish.image} alt={dish.name} style={{ width: 30, height: 30, borderRadius: 6, objectFit: 'cover' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: isAdded ? '#15803d' : '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {dish.name}
                          </p>
                          <span style={{ fontSize: 10, fontWeight: 700, color: isAdded ? '#16a34a' : meta.accent }}>
                            {isAdded ? 'Added ✓' : '+ Add'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Custom Item Adder */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input
                type="text"
                placeholder="Or type custom dish..."
                value={cookCustomItemInput}
                onChange={e => setCookCustomItemInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && cookCustomItemInput.trim()) {
                    e.preventDefault();
                    const name = cookCustomItemInput.trim();
                    const presetImg = getDishPresetImage(name);
                    setEditWeeklyMenuItems(prev => [
                      ...prev,
                      { id: Math.random().toString(36).substring(2, 9), name, image: presetImg || null }
                    ]);
                    setCookCustomItemInput('');
                  }
                }}
                style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: 13, fontWeight: 700, outline: 'none', fontFamily: 'inherit' }}
              />
              <button
                type="button"
                onClick={() => {
                  if (!cookCustomItemInput.trim()) return;
                  const name = cookCustomItemInput.trim();
                  const presetImg = getDishPresetImage(name);
                  setEditWeeklyMenuItems(prev => [
                    ...prev,
                    { id: Math.random().toString(36).substring(2, 9), name, image: presetImg || null }
                  ]);
                  setCookCustomItemInput('');
                }}
                style={{ background: '#000', color: C.primary, border: 'none', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                + Add Dish
              </button>
            </div>

            {/* Save Button */}
            <button
              onClick={handleCookSaveMenu}
              style={{
                width: '100%', padding: 16, borderRadius: 14,
                background: '#000', color: C.primary, fontSize: 15, fontWeight: 800,
                border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>save</span>
              Save {editWeeklyMenuItems.length} Dishes &amp; Photos
            </button>
          </div>
        </div>
      )}

      {/* ── COOK MENU EDIT HISTORY MODAL ── */}
      {showMenuHistoryModal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.6)', zIndex: 1060,
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          alignItems: 'center'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '24px 24px 0 0',
            width: '100%',
            maxWidth: 480,
            padding: 22,
            paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
            maxHeight: '82vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 -10px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ede9fe', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 22 }}>history</span>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#000' }}>Menu Edit History</h3>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: C.muted }}>Who edited the menu &amp; when</p>
                </div>
              </div>
              <button 
                onClick={() => setShowMenuHistoryModal(false)} 
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {loadingMenuHistory ? (
                <div style={{ textAlign: 'center', padding: '36px 0', color: C.muted, fontSize: 13, fontWeight: 700 }}>
                  Loading edit logs...
                </div>
              ) : menuHistoryList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 16px', color: '#94a3b8' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#cbd5e1' }}>history_toggle_off</span>
                  <p style={{ margin: '8px 0 0', fontSize: 14, fontWeight: 800, color: '#475569' }}>No menu edits recorded yet</p>
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8' }}>Edits made by Admin or Cook will appear here.</p>
                </div>
              ) : (
                menuHistoryList.map((entry, idx) => (
                  <div key={entry.id || idx} style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 14,
                    padding: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 900,
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: entry.editorRole === 'Cook' ? '#dcfce7' : '#ede9fe',
                        color: entry.editorRole === 'Cook' ? '#166534' : '#6d28d9',
                        textTransform: 'uppercase'
                      }}>
                        {entry.editorRole || 'Staff'}: {entry.editedBy || 'Unknown'}
                      </span>
                      <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                        {entry.editedAt ? new Date(entry.editedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Recently'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#16a34a' }}>restaurant_menu</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                        {entry.day} · {entry.meal}
                      </span>
                      {entry.hasPhotos && (
                        <span style={{ fontSize: 10, background: '#ecfdf5', color: '#059669', padding: '1px 6px', borderRadius: 4, fontWeight: 800 }}>
                          📷 Photos Attached
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.4, background: '#fff', padding: '6px 10px', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                      <span style={{ fontWeight: 700, color: '#1e293b' }}>Items: </span>
                      {entry.dishesSummary || 'Updated'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── COOK ITEM PHOTO PICKER DRAWER ── */}
      {showCookItemPhotoPicker && activeCookPhotoIndex !== null && editWeeklyMenuItems[activeCookPhotoIndex] && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.65)', zIndex: 1050,
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '24px 24px 0 0',
            padding: 20,
            paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
            maxHeight: '85vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 800, color: meta.accent, textTransform: 'uppercase' }}>Dish Photo</span>
                <h3 style={{ margin: '2px 0 0', fontSize: 17, fontWeight: 900, color: '#000' }}>
                  Photo for "{editWeeklyMenuItems[activeCookPhotoIndex]?.name}"
                </h3>
              </div>
              <span className="material-symbols-outlined" onClick={() => setShowCookItemPhotoPicker(false)} style={{ cursor: 'pointer', color: '#64748b' }}>close</span>
            </div>

            {/* Current Photo Preview */}
            {editWeeklyMenuItems[activeCookPhotoIndex]?.image && (
              <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1.5px solid #e2e8f0', marginBottom: 14, height: 110 }}>
                <img src={editWeeklyMenuItems[activeCookPhotoIndex].image} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button
                  type="button"
                  onClick={() => {
                    setEditWeeklyMenuItems(prev => prev.map((it, i) => i === activeCookPhotoIndex ? { ...it, image: null } : it));
                  }}
                  style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(239,68,68,0.9)', color: '#fff', border: 'none', borderRadius: 8, padding: '4px 8px', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}
                >
                  Remove Photo
                </button>
              </div>
            )}

            {/* Action 1: Snap photo with Camera */}
            <button
              type="button"
              onClick={() => cookPhotoInputRef.current?.click()}
              disabled={isProcessingCookPhoto}
              style={{
                width: '100%', padding: 14, borderRadius: 12,
                border: '2px dashed #000', background: '#f8fafc',
                color: '#000', fontSize: 13, fontWeight: 800,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, marginBottom: 14
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 22, color: meta.accent }}>photo_camera</span>
              {isProcessingCookPhoto ? 'Compressing photo...' : 'Snap with Camera (Back Lens) or Upload'}
            </button>

            {/* Action 2: Choose from Preset Library */}
            <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 800, color: '#334155', textTransform: 'uppercase' }}>
              Or Choose Pre-made Photo:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(95px, 1fr))', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
              {COMMON_PG_DISHES.map(dish => (
                <div
                  key={dish.id}
                  onClick={() => {
                    setEditWeeklyMenuItems(prev => prev.map((it, i) => i === activeCookPhotoIndex ? { ...it, image: dish.image } : it));
                    setShowCookItemPhotoPicker(false);
                  }}
                  style={{ border: '1.5px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', cursor: 'pointer', background: '#f8fafc', textAlign: 'center' }}
                >
                  <img src={dish.image} alt={dish.name} style={{ width: '100%', height: 65, objectFit: 'cover' }} />
                  <p style={{ margin: '4px 2px', fontSize: 10, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {dish.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <Sheet show={showPackEdit} onClose={()=>setShowPackEdit(false)} title={selectedStat === 'extra' ? "Extra Plate Details" : "Pack Details"} sub={`For ${students.find(s=>s.id===packStudentId)?.name || 'Student'}`}>
        <form onSubmit={e=>{
          e.preventDefault();
          const detailsKey = mealTab==='Breakfast'?'detailsB':mealTab==='Lunch'?'detailsL':mealTab==='Snacks'?'detailsS':'detailsD';
          const formattedVal = (selectedStat === 'extra' && packPriceVal) ? `${packVal} (₹${packPriceVal})` : packVal;
          setStudents(p=>p.map(st=>st.id===packStudentId?{...st,[detailsKey]:formattedVal}:st));
          setShowPackEdit(false);
        }} style={{display:'flex',flexDirection:'column',gap:12}}>
          <InputField label="Food Items & Quantity" textarea rows={2} required value={packVal} onChange={e=>setPackVal(e.target.value)} placeholder="e.g. 4 Roti, 1 bowl Sabzi"/>
          {selectedStat === 'extra' && (
            <InputField label="Extra Plate Charge / Money (₹)" type="number" value={packPriceVal} onChange={e=>setPackPriceVal(e.target.value)} placeholder="e.g. 60"/>
          )}
          <button type="submit" style={{padding:14,background:C.primary,color:'#000',border: '1px solid #e2e8f0',borderRadius:14,fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'inherit',boxShadow: '0 4px 16px rgba(15,23,42,0.05)'}}>Save Details</button>
        </form>
      </Sheet>


      <Sheet show={showVisitor} onClose={()=>setShowVisitor(false)} title="Gate Visitor Entry" sub="Log a visitor at the gate">
        <form onSubmit={addVisitor} style={{display:'flex',flexDirection:'column',gap:12}}>
          <InputField label="Visitor Full Name *" required value={vName} onChange={e=>setVName(e.target.value)} placeholder="e.g. Rajesh Malhotra"/>
          <InputField label="Mobile Number" value={vPhone} onChange={e=>setVPhone(e.target.value)} placeholder="+91 98000 11122"/>
          <InputField label="Purpose & Room #" value={vPurp} onChange={e=>setVPurp(e.target.value)} placeholder="e.g. Parent visit – Rm 104"/>
          <button type="submit" style={{padding:14,background:meta.grad,color:'#000',border: '1px solid #e2e8f0',borderRadius:14,fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'inherit',boxShadow: '0 4px 16px rgba(15,23,42,0.05)'}}>Check-In Visitor ✅</button>
        </form>
      </Sheet>

      <Sheet show={showParcel} onClose={()=>setShowParcel(false)} title="Log Courier Parcel" sub="Record parcel received at gate">
        <form onSubmit={addParcel} style={{display:'flex',flexDirection:'column',gap:12}}>
          <InputField label="Student Name *" required value={pStu} onChange={e=>setPStu(e.target.value)} placeholder="e.g. Arjun Mehta"/>
          <InputField label="Room Number" value={pRoom} onChange={e=>setPRoom(e.target.value)} placeholder="e.g. 101"/>
          <SelectField label="Carrier" value={pCarr} onChange={e=>setPCarr(e.target.value)}><option>Amazon</option><option>Flipkart</option><option>BlueDart</option><option>Courier Express</option><option>India Post</option></SelectField>
          <InputField label="Tracking / AWB #" value={pTrk} onChange={e=>setPTrk(e.target.value)} placeholder="e.g. AMZ-88910"/>
          <button type="submit" style={{padding:14,background: C.primary,color:'#000',border: '1px solid #e2e8f0',borderRadius:14,fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'inherit',boxShadow: '0 4px 16px rgba(15,23,42,0.05)'}}>Log Parcel 📦</button>
        </form>
      </Sheet>

      {/* Pay Slip Detailed View & Share Sheet - Premium UI */}
      <Sheet show={showPaySlipModal} onClose={() => setShowPaySlipModal(false)} title={`${selectedPaySlip?.m || ''} Pay Slip`} sub="Detailed Salary Statement">
        {selectedPaySlip && (
          <div style={{display:'flex', flexDirection:'column', gap:14}}>
            <div style={{background: 'linear-gradient(135deg, #111827 0%, #1f2937 100%)', padding:'24px 20px', borderRadius:16, color:'#fff', boxShadow: '0 8px 16px rgba(0,0,0,0.1)'}}>
              <p style={{margin:0, fontSize:11, fontWeight:800, color:'#9ca3af', textTransform:'uppercase', letterSpacing:1}}>Net Disbursed Amount</p>
              <h3 style={{margin:'6px 0 0', fontSize:36, fontWeight:900, color:'#fef08a', letterSpacing:-1}}>{selectedPaySlip.v}</h3>
              <p style={{margin:'8px 0 0', fontSize:12, fontWeight:700, color:'#a7f3d0', display:'flex', alignItems:'center', gap: 4}}>
                <span className="material-symbols-outlined" style={{fontSize:14}}>verified</span> {selectedPaySlip.d} · {selectedPaySlip.bank}
              </p>
            </div>

            <div style={{background:'#fff', border: '1px solid #e2e8f0', borderRadius:16, padding:'16px'}}>
              <p style={{margin:'0 0 12px', fontSize:13, fontWeight:800, color:'#000', textTransform:'uppercase'}}>Earnings & Deductions Breakdown</p>
              
              {[
                { label: 'Base Salary', value: selectedPaySlip.base, color: '#000' },
                { label: 'Overtime', value: selectedPaySlip.overtime, color: '#15803d', sub: 'July W1: 5 hrs | July W2: 10 hrs' },
                { label: 'Bonus', value: selectedPaySlip.bonus, color: '#15803d', sub: '12 Jul: Top Performer | 28 Jul: Target Met' },
                { label: 'Deductions', value: selectedPaySlip.ded, color: '#b91c1c', sub: '5 Jul: Salary Advance' }
              ].map((item, idx) => (
                <div key={idx} style={{padding:'10px 0', borderBottom: idx===3 ? 'none' : '1px solid #f1f5f9'}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <span style={{fontSize:14, fontWeight:700, color:'#334155'}}>{item.label}</span>
                    <span style={{fontSize:15, fontWeight:900, color: item.color}}>{item.value}</span>
                  </div>
                  {item.sub && item.value !== '₹0' && (
                    <p style={{margin:'4px 0 0', fontSize:11, fontWeight:600, color:'#94a3b8'}}>{item.sub}</p>
                  )}
                </div>
              ))}
              
              <div style={{display:'flex', justifyContent:'space-between', padding:'16px 0 4px', marginTop: 8, borderTop: '2px dashed #e2e8f0', alignItems:'center'}}>
                <span style={{fontSize:15, fontWeight:900, color:'#000'}}>Total Net Pay</span>
                <span style={{fontSize:20, fontWeight:900, color:'#000'}}>{selectedPaySlip.v}</span>
              </div>
            </div>

            <div style={{background:'#f8fafc', border: '1px dashed #cbd5e1', borderRadius:12, padding:'14px', fontSize:11, fontWeight:700, color:'#475569'}}>
              <p style={{margin:0}}>Reference TXN: <span style={{color:'#0f172a', fontWeight:800}}>{selectedPaySlip.txn}</span></p>
              <p style={{margin:'6px 0 0'}}>Employee: <span style={{color:'#0f172a', fontWeight:800}}>{staffName} ({staffRole})</span></p>
            </div>

            {/* Actions: Download & Share */}
            <div style={{display:'flex', gap:10, marginTop:4}}>
              <button 
                type="button" 
                onClick={() => showToast(`📄 Downloading PDF for ${selectedPaySlip.m}...`, 'info')} 
                style={{flex:1, padding:13, background:'#fff', color:'#000', border: '1px solid #e2e8f0', borderRadius:12, fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'inherit', boxShadow: '0 2px 8px rgba(15,23,42,0.04)', display:'flex', alignItems:'center', justifyContent:'center', gap:6}}
              >
                <span>📥</span> PDF
              </button>
              <button 
                type="button" 
                onClick={() => {
                  const shareText = `📄 Febebo Staff Pay Slip\nMonth: ${selectedPaySlip.m}\nNet Paid: ${selectedPaySlip.v}\nStatus: ${selectedPaySlip.d}\nTxn: ${selectedPaySlip.txn}`;
                  if (navigator.share) {
                    navigator.share({ title: `${selectedPaySlip.m} Pay Slip`, text: shareText }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(shareText);
                    showToast('📋 Pay Slip summary copied to clipboard!', 'success');
                  }
                }} 
                style={{flex:2, padding:13, background:'#fef08a', color:'#000', border: '1px solid #e2e8f0', borderRadius:12, fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'inherit', boxShadow: '0 2px 8px rgba(15,23,42,0.04)', display:'flex', alignItems:'center', justifyContent:'center', gap:6}}
              >
                <span>📤</span> Share Pay Slip
              </button>
            </div>
          </div>
        )}
      </Sheet>

      {/* Log Expense Modal */}
      <Sheet show={showExpenseModal} onClose={()=>setShowExpenseModal(false)} title="Log Expense / Item Purchase" sub="Deduct from available Petty Cash fund">
        <form onSubmit={async e=>{
          e.preventDefault();
          if(!expTitle || !expAmt) return;
          if (Number(expAmt) > availablePettyCash) {
            showToast('Insufficient petty cash balance', 'error');
            return;
          }
          setIsSavingExp(true);
          try {
            await addDoc(collection(db, 'petty_cash_transactions'), {
              type: 'expense',
              adminId: user.ownerUid,
              staffId: user.id,
              staffName: staffName,
              amount: Number(expAmt),
              desc: expTitle,
              paymentMode: expMode,
              paidTo: expPaidTo || 'Local Vendor',
              senderUpi: expMode==='UPI / GPay' ? expSenderUpi : null,
              receiverUpi: expMode==='UPI / GPay' ? (expReceiverUpi || 'vendor@upi') : null,
              date: new Date().toISOString(),
              createdAt: new Date().toISOString()
            });

            await addDoc(collection(db, 'notifications'), {
              adminId: user.ownerUid,
              title: 'Petty Cash Used',
              desc: `${staffName} logged an expense of ₹${expAmt} for ${expTitle}.`,
              type: 'Petty Cash',
              date: new Date().toISOString(),
              resolved: false,
              pgId: 'primary',
            });

            showToast('Expense logged successfully', 'success');
            setExpTitle(''); setExpAmt(''); setExpPaidTo(''); setExpReceiverUpi(''); setShowExpenseModal(false);
          } catch (err) {
            console.error(err);
            showToast('Failed to log expense', 'error');
          } finally {
            setIsSavingExp(false);
          }
        }} style={{display:'flex', flexDirection:'column', gap:12}}>
          <InputField label="Item Description / Purpose *" required value={expTitle} onChange={e=>setExpTitle(e.target.value)} placeholder="e.g. Fresh Vegetables, Hardware, Mop"/>
          <InputField label="Paid To / Vendor Name *" required value={expPaidTo} onChange={e=>setExpPaidTo(e.target.value)} placeholder="e.g. Ramesh Veg Market"/>
          <InputField label="Amount Spent (₹) *" type="number" required value={expAmt} onChange={e=>setExpAmt(e.target.value)} placeholder="e.g. 500"/>
          
          <SelectField label="Payment Mode" value={expMode} onChange={e=>setExpMode(e.target.value)}>
            <option>Cash</option>
            <option>UPI / GPay</option>
            <option>Card</option>
          </SelectField>

          {expMode === 'UPI / GPay' && (
            <div style={{background:'#fafafa', border: '1px solid #e2e8f0', borderRadius:10, padding:12, display:'flex', flexDirection:'column', gap:10}}>
              <p style={{margin:0, fontSize:12, fontWeight:800, color:'#000'}}>📲 UPI Transaction IDs</p>
              <InputField label="Sender UPI ID (Staff - Prefilled)" value={expSenderUpi} onChange={e=>setExpSenderUpi(e.target.value)} placeholder="your.name@upi"/>
              <InputField label="Receiver UPI ID (Vendor)" value={expReceiverUpi} onChange={e=>setExpReceiverUpi(e.target.value)} placeholder="e.g. rameshveg@okaxis"/>
            </div>
          )}

          <button type="submit" disabled={isSavingExp} style={{padding:14, background:C.primary, color:'#000', border: '1px solid #e2e8f0', borderRadius:14, fontSize:14, fontWeight:800, cursor:isSavingExp?'not-allowed':'pointer', fontFamily:'inherit', boxShadow: '0 4px 16px rgba(15,23,42,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: isSavingExp ? 0.7 : 1}}>
            {isSavingExp ? (
              <>
                <div style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                Saving...
              </>
            ) : 'Save Expense 🛒'}
          </button>
        </form>
      </Sheet>

      {/* Receive Funds Modal */}
      <Sheet show={showAddFundModal} onClose={()=>setShowAddFundModal(false)} title="Receive Advance Funds" sub="Add cash/UPI received from Admin or Students">
        <form onSubmit={e=>{
          e.preventDefault();
          if(!fundTitle || !fundAmt) return;
          const newLog = {
            id: Date.now(),
            type: 'credit',
            title: fundTitle,
            amount: Number(fundAmt),
            mode: fundMode,
            party: fundPayerName || 'Admin Office',
            senderUpi: fundMode==='UPI' ? (fundSenderUpi || 'payer@upi') : null,
            receiverUpi: fundMode==='UPI' ? fundReceiverUpi : null,
            date: 'Just now',
            by: fundSrc
          };
          setPettyCashLogs(prev=>[newLog, ...prev]);
          setFundTitle(''); setFundAmt(''); setFundPayerName(''); setShowAddFundModal(false);
        }} style={{display:'flex', flexDirection:'column', gap:12}}>
          <SelectField label="Source" value={fundSrc} onChange={e=>{
            setFundSrc(e.target.value);
            if(e.target.value === 'Admin') {
              setFundPayerName('Admin Office');
              setFundSenderUpi('admin.office@febebo.upi');
            } else {
              setFundPayerName('Arjun Mehta (Rm 101)');
              setFundSenderUpi('arjun.student@okicici');
            }
          }}>
            <option value="Admin">Admin Cash Advance</option>
            <option value="Student">Student Payment / Extra Charge</option>
          </SelectField>

          <InputField label="Received From (Payer Name) *" required value={fundPayerName} onChange={e=>setFundPayerName(e.target.value)} placeholder="e.g. Admin Office or Student Name"/>
          <InputField label="Fund Source Note / Description *" required value={fundTitle} onChange={e=>setFundTitle(e.target.value)} placeholder="e.g. Weekly Kitchen Fund from Admin"/>
          <InputField label="Amount Received (₹) *" type="number" required value={fundAmt} onChange={e=>setFundAmt(e.target.value)} placeholder="e.g. 2000"/>
          
          <SelectField label="Payment Mode" value={fundMode} onChange={e=>setFundMode(e.target.value)}>
            <option>UPI</option>
            <option>Cash</option>
          </SelectField>

          {fundMode === 'UPI' && (
            <div style={{background:'#fafafa', border: '1px solid #e2e8f0', borderRadius:10, padding:12, display:'flex', flexDirection:'column', gap:10}}>
              <p style={{margin:0, fontSize:12, fontWeight:800, color:'#000'}}>📲 UPI Transaction IDs</p>
              <InputField label="Sender UPI ID (Payer)" value={fundSenderUpi} onChange={e=>setFundSenderUpi(e.target.value)} placeholder="payer@upi"/>
              <InputField label="Receiver UPI ID (Staff - Prefilled)" value={fundReceiverUpi} onChange={e=>setFundReceiverUpi(e.target.value)} placeholder="your.name@upi"/>
            </div>
          )}

          <button type="submit" style={{padding:14, background:'#bbf7d0', color:'#000', border: '1px solid #e2e8f0', borderRadius:14, fontSize:14, fontWeight:800, cursor:'pointer', fontFamily:'inherit', boxShadow: '0 4px 16px rgba(15,23,42,0.05)'}}>
            Record Received Funds 💵
          </button>
        </form>
      </Sheet>


      {/* 🌾 STOCK REFILL MODAL */}
      {showRefillModal && (
         <div style={{position:'fixed', inset:0, background:'rgba(15,23,42,0.65)', zIndex:100, display:'flex', flexDirection:'column', justifyContent:'flex-end'}}>
           <div style={{background:'#fff', padding:'20px 20px calc(32px + env(safe-area-inset-bottom, 0px))', borderTopLeftRadius:24, borderTopRightRadius:24, display:'flex', flexDirection:'column', gap:14, maxHeight:'90dvh', overflowY:'auto'}}>
             <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
               <div>
                 <p style={{margin:0, fontSize:18, fontWeight:900, color:'#0f172a'}}>Stock &amp; Refill Request</p>
                 <p style={{margin:'2px 0 0', fontSize:12, fontWeight:600, color:'#64748b'}}>Kitchen Inventory vs Live Headcount</p>
               </div>
               <button onClick={() => setShowRefillModal(false)} style={{background:'#f1f5f9', border:'none', borderRadius:10, width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer'}}>
                 <span className="material-symbols-outlined" style={{fontSize:18, color:'#64748b'}}>close</span>
               </button>
             </div>

             <div style={{display:'flex', flexDirection:'column', gap:10}}>
               {[
                 { name: 'Rice (Basmati)', stock: '14.5 kg', required: '5.0 kg', status: 'Sufficient', color: '#16a34a', bg: '#dcfce7' },
                 { name: 'Atta (Wheat Flour)', stock: '8.2 kg', required: '4.0 kg', status: 'Sufficient', color: '#16a34a', bg: '#dcfce7' },
                 { name: 'Arhar Dal', stock: '3.5 kg', required: '3.2 kg', status: '⚠️ LOW STOCK', color: '#d97706', bg: '#fef3c7' },
                 { name: 'Fresh Vegetables', stock: '12.0 kg', required: '6.0 kg', status: 'Sufficient', color: '#16a34a', bg: '#dcfce7' },
                 { name: 'Cooking Oil (Mustard)', stock: '4.0 L', required: '2.0 L', status: 'Sufficient', color: '#16a34a', bg: '#dcfce7' },
                 { name: 'Spices & Salt', stock: '1.2 kg', required: '0.8 kg', status: 'Sufficient', color: '#16a34a', bg: '#dcfce7' },
               ].map(item => (
                 <div key={item.name} style={{background:'#f8fafc', borderRadius:14, padding:'12px 14px', border:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                   <div>
                     <p style={{margin:0, fontSize:14, fontWeight:900, color:'#0f172a'}}>{item.name}</p>
                     <p style={{margin:'2px 0 0', fontSize:11, fontWeight:700, color:'#64748b'}}>In Stock: <b>{item.stock}</b> · Needed Today: {item.required}</p>
                   </div>
                   <span style={{fontSize:10, fontWeight:800, padding:'4px 8px', borderRadius:6, background: item.bg, color: item.color}}>
                     {item.status}
                   </span>
                 </div>
               ))}
             </div>

             <button onClick={() => {
               setShowRefillModal(false);
               showToast('📦 Refill order submitted to Purchase Manager!', 'success');
             }} style={{marginTop:10, padding:'15px', background:'#0284c7', color:'#fff', border:'none', borderRadius:14, fontSize:15, fontWeight:900, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 4px 12px rgba(2,132,199,0.3)'}}>
               Submit Refill Order to Purchase Manager
             </button>
           </div>
         </div>
      )}

      {/* 🚪 MOVE-OUT INSPECTION MODAL */}
      {showMoveOutModal && (
         <div style={{position:'fixed', inset:0, background:'rgba(15,23,42,0.65)', zIndex:100, display:'flex', flexDirection:'column', justifyContent:'flex-end'}}>
           <div style={{background:'#fff', padding:'20px 20px calc(32px + env(safe-area-inset-bottom, 0px))', borderTopLeftRadius:24, borderTopRightRadius:24, display:'flex', flexDirection:'column', gap:14, maxHeight:'92dvh', overflowY:'auto'}}>
             <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
               <div>
                 <p style={{margin:0, fontSize:18, fontWeight:900, color:'#0f172a'}}>Move-Out Room Inspection</p>
                 <p style={{margin:'2px 0 0', fontSize:12, fontWeight:600, color:'#64748b'}}>Audit room condition &amp; calculate damage fines</p>
               </div>
               <button onClick={() => setShowMoveOutModal(false)} style={{background:'#f1f5f9', border:'none', borderRadius:10, width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer'}}>
                 <span className="material-symbols-outlined" style={{fontSize:18, color:'#64748b'}}>close</span>
               </button>
             </div>

             <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
               <input type="text" placeholder="Room No. *" value={moRoom} onChange={e=>setMoRoom(e.target.value)} style={{padding:'12px', borderRadius:12, border:'1.5px solid #e2e8f0', fontFamily:'inherit', fontSize:14, fontWeight:700}} />
               <input type="text" placeholder="Tenant Name" value={moTenant} onChange={e=>setMoTenant(e.target.value)} style={{padding:'12px', borderRadius:12, border:'1.5px solid #e2e8f0', fontFamily:'inherit', fontSize:14, fontWeight:700}} />
             </div>

             <div style={{display:'flex', flexDirection:'column', gap:8}}>
               <label style={{fontSize:11, fontWeight:800, color:'#64748b', textTransform:'uppercase', letterSpacing:0.5}}>Room Inventory Audit Checklist</label>
               {moItems.map(item => (
                 <div key={item.id} style={{background:'#f8fafc', borderRadius:12, padding:'10px 12px', border:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                   <span style={{fontSize:13, fontWeight:800, color:'#0f172a'}}>{item.name}</span>
                   <div style={{display:'flex', gap:6}}>
                     {['Intact', 'Damaged', 'Missing'].map(st => (
                       <button key={st} onClick={() => {
                         const fineAmount = st === 'Damaged' ? 800 : st === 'Missing' ? 1500 : 0;
                         setMoItems(prev => prev.map(x => x.id === item.id ? {...x, status: st, fine: fineAmount} : x));
                       }} style={{padding:'4px 8px', borderRadius:6, border:'none', fontSize:10, fontWeight:800, cursor:'pointer', fontFamily:'inherit',
                         background: item.status === st ? (st === 'Intact' ? '#dcfce7' : st === 'Damaged' ? '#fef08a' : '#fee2e2') : '#e2e8f0',
                         color: item.status === st ? (st === 'Intact' ? '#15803d' : st === 'Damaged' ? '#92400e' : '#b91c1c') : '#64748b'
                       }}>
                         {st}
                       </button>
                     ))}
                   </div>
                 </div>
               ))}
             </div>

             {/* Total Fine Summary */}
             <div style={{background:'#fef2f2', borderRadius:14, padding:'12px 16px', border:'1px solid #fecaca', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
               <div>
                 <p style={{margin:0, fontSize:11, fontWeight:800, color:'#b91c1c', textTransform:'uppercase'}}>Estimated Damage Fine</p>
                 <p style={{margin:'2px 0 0', fontSize:18, fontWeight:900, color:'#991b1b'}}>
                   ₹{moItems.reduce((acc, curr) => acc + curr.fine, 0)}
                 </p>
               </div>
               <button onClick={() => showToast('📷 Camera opened for photo proof upload!', 'info')} style={{padding:'8px 12px', background:'#fff', border:'1px solid #fca5a5', borderRadius:10, color:'#b91c1c', fontSize:11, fontWeight:800, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:4}}>
                 <span className="material-symbols-outlined" style={{fontSize:16}}>add_a_photo</span> Photo Proof
               </button>
             </div>

             <button onClick={() => {
               if (!moRoom) return showToast('Please enter room number', 'warning');
               const totalFine = moItems.reduce((acc, curr) => acc + curr.fine, 0);
               setShowMoveOutModal(false);
               showToast(`✅ Move-Out Inspection submitted for Room ${moRoom}! Total fine ₹${totalFine} synced.`, 'success');
               setMoRoom(''); setMoTenant('');
             }} style={{padding:'15px', background:'#0f172a', color:'#fde047', border:'none', borderRadius:14, fontSize:15, fontWeight:900, cursor:'pointer', fontFamily:'inherit'}}>
               Submit Inspection &amp; Sync to Admin Deposit Settlement
             </button>
           </div>
         </div>
      )}

      {/* ⛽ LOG FUEL EXPENSE MODAL */}
      {showFuelModal && (
         <div style={{position:'fixed', inset:0, background:'rgba(15,23,42,0.65)', zIndex:100, display:'flex', flexDirection:'column', justifyContent:'flex-end'}}>
           <div style={{background:'#fff', padding:'20px 20px calc(32px + env(safe-area-inset-bottom, 0px))', borderTopLeftRadius:24, borderTopRightRadius:24, display:'flex', flexDirection:'column', gap:14}}>
             <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
               <div>
                 <p style={{margin:0, fontSize:18, fontWeight:900, color:'#0f172a'}}>Log Bus Fuel Expense</p>
                 <p style={{margin:'2px 0 0', fontSize:12, fontWeight:600, color:'#64748b'}}>Syncs directly to Admin Petty Cash &amp; Vendor Ledger</p>
               </div>
               <button onClick={() => setShowFuelModal(false)} style={{background:'#f1f5f9', border:'none', borderRadius:10, width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer'}}>
                 <span className="material-symbols-outlined" style={{fontSize:18, color:'#64748b'}}>close</span>
               </button>
             </div>

             <div style={{display:'flex', flexDirection:'column', gap:10}}>
               <input type="number" placeholder="Fuel Liters (e.g. 15.5 L)" value={fuelLiters} onChange={e=>setFuelLiters(e.target.value)} style={{padding:'12px', borderRadius:12, border:'1.5px solid #e2e8f0', fontFamily:'inherit', fontSize:14, fontWeight:600}} />
               <input type="number" placeholder="Total Amount (₹) *" value={fuelAmount} onChange={e=>setFuelAmount(e.target.value)} style={{padding:'12px', borderRadius:12, border:'1.5px solid #e2e8f0', fontFamily:'inherit', fontSize:14, fontWeight:600}} />
               <input type="text" placeholder="Fuel Station / Pump Name" value={fuelPump} onChange={e=>setFuelPump(e.target.value)} style={{padding:'12px', borderRadius:12, border:'1.5px solid #e2e8f0', fontFamily:'inherit', fontSize:14, fontWeight:600}} />
             </div>

             <button onClick={() => {
               if (!fuelAmount) return showToast('Please enter total fuel amount', 'warning');
               setShowFuelModal(false);
               showToast(`⛽ Fuel expense of ₹${fuelAmount} logged successfully!`, 'success');
               setFuelLiters(''); setFuelAmount(''); setFuelPump('');
             }} style={{padding:'14px', background:'#0f172a', color:'#fde047', border:'none', borderRadius:14, fontSize:15, fontWeight:900, cursor:'pointer', fontFamily:'inherit'}}>
               Save Expense to Admin Ledger
             </button>
           </div>
         </div>
      )}

      {/* 🛡️ GATEKEEPER VISITOR MODAL */}
      {showGatekeeperModal && (
         <div style={{position:'fixed', inset:0, background:'rgba(15,23,42,0.65)', zIndex:100, display:'flex', flexDirection:'column', justifyContent:'flex-end'}}>
           <div style={{background:'#fff', padding:'20px 20px calc(32px + env(safe-area-inset-bottom, 0px))', borderTopLeftRadius:24, borderTopRightRadius:24, display:'flex', flexDirection:'column', gap:14, maxHeight:'92dvh', overflowY:'auto'}}>
             
             <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
               <div>
                 <p style={{margin:0, fontSize:18, fontWeight:900, color:'#0f172a'}}>New Visitor Entry</p>
                 <p style={{margin:'2px 0 0', fontSize:12, fontWeight:600, color:'#94a3b8'}}>Fill all details for gate record</p>
               </div>
               <button onClick={() => { setShowGatekeeperModal(false); setGkPhoto(null); }} style={{background:'#f1f5f9', border:'none', borderRadius:10, width:34, height:34, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer'}}>
                 <span className="material-symbols-outlined" style={{fontSize:18, color:'#64748b'}}>close</span>
               </button>
             </div>

             <div style={{display:'flex', flexDirection:'column', gap:8}}>
               <label style={{fontSize:11, fontWeight:800, color:'#64748b', textTransform:'uppercase', letterSpacing:0.5}}>Visitor Photo</label>
               <div style={{display:'flex', gap:10, alignItems:'center'}}>
                 <div style={{width:72, height:72, borderRadius:16, background:'#f1f5f9', border:'2px dashed #cbd5e1', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', flexShrink:0}}>
                   {gkPhoto ? (
                     <img src={gkPhoto} alt="Visitor" style={{width:'100%', height:'100%', objectFit:'cover'}} />
                   ) : (
                     <span className="material-symbols-outlined" style={{fontSize:30, color:'#94a3b8'}}>person</span>
                   )}
                 </div>
                 <div style={{display:'flex', flexDirection:'column', gap:8, flex:1}}>
                   <label style={{display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background:'#0f172a', borderRadius:12, cursor:'pointer', color:'#fde047', fontSize:13, fontWeight:800}}>
                     <span className="material-symbols-outlined" style={{fontSize:18}}>photo_camera</span>
                     Click Photo
                     <input type="file" accept="image/*" capture="environment" onChange={e => {
                       const file = e.target.files[0];
                       if (file) {
                         const reader = new FileReader();
                         reader.onload = ev => setGkPhoto(ev.target.result);
                         reader.readAsDataURL(file);
                       }
                     }} style={{display:'none'}} />
                   </label>
                   <label style={{display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background:'#f1f5f9', borderRadius:12, cursor:'pointer', color:'#475569', fontSize:13, fontWeight:800}}>
                     <span className="material-symbols-outlined" style={{fontSize:18}}>upload</span>
                     Upload from Gallery
                     <input type="file" accept="image/*" onChange={e => {
                       const file = e.target.files[0];
                       if (file) {
                         const reader = new FileReader();
                         reader.onload = ev => setGkPhoto(ev.target.result);
                         reader.readAsDataURL(file);
                       }
                     }} style={{display:'none'}} />
                   </label>
                 </div>
               </div>
             </div>

             <div style={{height:'1px', background:'#f1f5f9'}} />

             <div style={{display:'flex', flexDirection:'column', gap:10}}>
               <label style={{fontSize:11, fontWeight:800, color:'#64748b', textTransform:'uppercase', letterSpacing:0.5}}>Visitor Info</label>
               <input type="text" placeholder="Full Name *" value={gkName} onChange={e=>setGkName(e.target.value)}
                 style={{padding:'13px 14px', borderRadius:12, border:'1.5px solid #e2e8f0', fontFamily:'inherit', fontSize:14, fontWeight:600, outline:'none'}} />
               <input type="tel" placeholder="Phone Number" value={gkPhone} onChange={e=>setGkPhone(e.target.value)}
                 style={{padding:'13px 14px', borderRadius:12, border:'1.5px solid #e2e8f0', fontFamily:'inherit', fontSize:14, fontWeight:600, outline:'none'}} />
               <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
                 <input type="text" placeholder="Room No. *" value={gkRoom} onChange={e=>setGkRoom(e.target.value)}
                   style={{padding:'13px 14px', borderRadius:12, border:'1.5px solid #e2e8f0', fontFamily:'inherit', fontSize:14, fontWeight:600, outline:'none'}} />
                 <select value={gkRelation} onChange={e=>setGkRelation(e.target.value)}
                   style={{padding:'13px 14px', borderRadius:12, border:'1.5px solid #e2e8f0', fontFamily:'inherit', fontSize:14, fontWeight:600, color: gkRelation ? '#0f172a' : '#94a3b8'}}>
                   <option value="" disabled>Relation *</option>
                   <option>Father</option>
                   <option>Mother</option>
                   <option>Brother</option>
                   <option>Sister</option>
                   <option>Uncle (Chacha)</option>
                   <option>Uncle (Mama)</option>
                   <option>Aunt</option>
                   <option>Grandfather</option>
                   <option>Grandmother</option>
                   <option>Friend</option>
                   <option>Colleague</option>
                   <option>Delivery Agent</option>
                   <option>Other</option>
                 </select>
               </div>
               <select value={gkPurpose} onChange={e=>setGkPurpose(e.target.value)}
                 style={{padding:'13px 14px', borderRadius:12, border:'1.5px solid #e2e8f0', fontFamily:'inherit', fontSize:14, fontWeight:600, color: gkPurpose ? '#0f172a' : '#94a3b8'}}>
                 <option value="" disabled>Purpose of Visit</option>
                 <option>Monthly visit &amp; fee payment</option>
                 <option>Dropping food &amp; groceries</option>
                 <option>Collecting documents</option>
                 <option>Medical emergency</option>
                 <option>Parcel / Delivery</option>
                 <option>Festival / Special occasion</option>
                 <option>Casual visit</option>
                 <option>Moving in / Moving out</option>
                 <option>Other</option>
               </select>
             </div>

             <div style={{display:'flex', flexDirection:'column', gap:10}}>
               <label style={{fontSize:11, fontWeight:800, color:'#64748b', textTransform:'uppercase', letterSpacing:0.5}}>Government ID Proof *</label>
               <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
                 <select value={gkIdType} onChange={e=>setGkIdType(e.target.value)}
                   style={{padding:'13px 14px', borderRadius:12, border:'1.5px solid #e2e8f0', fontFamily:'inherit', fontSize:14, fontWeight:700}}>
                   <option>Aadhaar Card</option>
                   <option>Voter ID</option>
                   <option>Driving Licence</option>
                   <option>Passport</option>
                   <option>PAN Card</option>
                   <option>Employee ID</option>
                   <option>Student ID</option>
                 </select>
                 <input type="text" placeholder="ID Number *" value={gkIdNumber} onChange={e=>setGkIdNumber(e.target.value)}
                   style={{padding:'13px 14px', borderRadius:12, border:'1.5px solid #e2e8f0', fontFamily:'inherit', fontSize:14, fontWeight:600, outline:'none'}} />
               </div>
             </div>

             <button
               onClick={() => {
                 if (!gkName.trim()) return showToast('Visitor name is required', 'warning');
                 if (!gkRoom.trim()) return showToast('Room number is required', 'warning');
                 if (!gkRelation) return showToast('Please select relation with student', 'warning');
                 if (!gkIdNumber.trim()) return showToast('ID Proof number is required', 'warning');
                 setVisitorLogs([{
                   id: Date.now(),
                   name: gkName,
                   phone: gkPhone,
                   room: gkRoom,
                   relation: gkRelation,
                   purpose: gkPurpose || 'Casual visit',
                   idProof: `${gkIdType}: ${gkIdNumber}`,
                   photo: gkPhoto,
                   timeIn: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
                   timeOut: null
                 }, ...(visitorLogs || [])]);
                 setShowGatekeeperModal(false);
                 setGkName(''); setGkPhone(''); setGkRoom(''); setGkRelation('');
                 setGkPurpose(''); setGkIdNumber(''); setGkPhoto(null);
                 showToast('✅ Entry logged! Alert sent to Student and Admin.', 'success');
               }}
               style={{marginTop:6, padding:'15px', background:'#0f172a', color:'#fde047', border:'none', borderRadius:14, fontSize:15, fontWeight:900, cursor:'pointer', fontFamily:'inherit'}}
             >
               Allow Entry &amp; Log Record
             </button>
           </div>
         </div>
      )}

    
      {/* 📦 PARCEL ENTRY MODAL */}
      {showParcelModal && (
        <div style={{position:'fixed', inset:0, background:'rgba(15,23,42,0.6)', zIndex:100, display:'flex', flexDirection:'column', justifyContent:'flex-end', animation:'sheetUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'}}>
          <div style={{background:'#fff', padding:'24px 20px calc(32px + env(safe-area-inset-bottom, 0px))', borderTopLeftRadius:24, borderTopRightRadius:24, display:'flex', flexDirection:'column', gap:16}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <p style={{margin:0, fontSize:18, fontWeight:900, color:'#1a1500'}}>Log New Parcel</p>
              <button onClick={() => setShowParcelModal(false)} style={{background:'#f8fafc', border:'none', borderRadius:10, width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer'}}>
                <span className="material-symbols-outlined" style={{fontSize:18, color:'#64748b'}}>close</span>
              </button>
            </div>
            
            <form onSubmit={(e) => {
               e.preventDefault();
               const itemName = e.target.itemName.value;
               const studentName = e.target.studentName.value;
               const roomNo = e.target.roomNo.value;
               const carrier = e.target.carrier.value;
               
               if(!itemName || !studentName || !roomNo) {
                 return showToast('Item, Student, and Room are required', 'warning');
               }
               
               const newParcel = {
                 id: Date.now(),
                 itemName,
                 student: studentName,
                 room: roomNo,
                 carrier: carrier || 'Unknown',
                 date: new Date().toLocaleDateString('en-GB'),
                 status: 'Pending'
               };
               
               setParcels([newParcel, ...(parcels || [])]);
               setShowParcelModal(false);
               showToast("Parcel Logged Successfully!", "success");
            }} style={{display:'flex', flexDirection:'column', gap:12}}>
              <input name="itemName" type="text" placeholder="Item Name / Description *" style={{padding:'14px', borderRadius:12, border:'1.5px solid #e2e8f0', fontFamily:'inherit', fontSize:15, fontWeight:600}} required />
              <input name="studentName" type="text" placeholder="Student Name *" style={{padding:'14px', borderRadius:12, border:'1.5px solid #e2e8f0', fontFamily:'inherit', fontSize:15, fontWeight:600}} required />
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
                 <input name="roomNo" type="text" placeholder="Room No. *" style={{padding:'14px', borderRadius:12, border:'1.5px solid #e2e8f0', fontFamily:'inherit', fontSize:15, fontWeight:600}} required />
                 <select name="carrier" style={{padding:'14px', borderRadius:12, border:'1.5px solid #e2e8f0', fontFamily:'inherit', fontSize:15, fontWeight:600}}>
                    <option value="">Carrier (Optional)</option>
                    <option value="Amazon">Amazon</option>
                    <option value="Flipkart">Flipkart</option>
                    <option value="Myntra">Myntra</option>
                    <option value="Blinkit">Blinkit</option>
                    <option value="Zepto">Zepto</option>
                    <option value="Swiggy">Swiggy</option>
                    <option value="Zomato">Zomato</option>
                    <option value="Other">Other</option>
                 </select>
              </div>
              
              <button 
                type="submit"
                style={{marginTop:10, padding:'14px', background:'#0f172a', color:'#fde047', border:'none', borderRadius:12, fontSize:15, fontWeight:900, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 4px 12px rgba(15,23,42,0.2)'}}
              >
                Log Parcel
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Punch Out Confirmation Modal */}
      {showPunchOutConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setShowPunchOutConfirm(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }} />
          <div style={{ background: 'white', borderRadius: 24, padding: 24, width: '90%', maxWidth: 340, position: 'relative', zIndex: 1, boxShadow: '0 10px 30px rgba(0,0,0,0.1)', textAlign: 'center' }}>
            <div style={{ background: '#fef2f2', width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#ef4444' }}>logout</span>
            </div>
            <h3 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 900, color: '#0f172a' }}>Punch Out Now?</h3>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: '#475569', lineHeight: 1.5, fontWeight: 500 }}>
              Are you sure you want to punch out for today? You will not be able to punch back in until tomorrow.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                onClick={() => setShowPunchOutConfirm(false)}
                style={{ flex: 1, padding: '14px', background: '#f1f5f9', border: 'none', borderRadius: 14, fontWeight: 800, fontSize: 14, color: '#475569', cursor: 'pointer', transition: 'background 0.2s' }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setShowPunchOutConfirm(false);
                  punch();
                }}
                style={{ flex: 1, padding: '14px', background: '#ef4444', border: 'none', borderRadius: 14, fontWeight: 800, fontSize: 14, color: 'white', cursor: 'pointer', transition: 'background 0.2s', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)' }}
              >
                Punch Out
              </button>
            </div>
          </div>

        </div>
      )}
      {/* Request Success Modal */}
      {reqSuccessModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'sheetUp 0.3s ease-out' }}>
          <div onClick={() => setReqSuccessModal(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }} />
          <div style={{ background: '#fffef2', borderRadius: 24, padding: 32, width: '85%', maxWidth: 320, position: 'relative', zIndex: 1, boxShadow: '0 20px 40px rgba(0,0,0,0.15)', textAlign: 'center', border: '1.5px solid #e8df9a' }}>
            <div style={{ background: '#dcfce7', width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 8px 16px rgba(22, 163, 74, 0.2)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#16a34a' }}>check_circle</span>
            </div>
            <h3 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 900, color: '#1a1500', fontFamily: "'Bricolage Grotesque', sans-serif" }}>Success!</h3>
            <p style={{ margin: '0 0 28px', fontSize: 14, color: '#64748b', lineHeight: 1.5, fontWeight: 600 }}>
              Sent request successfully! The admin will review it shortly.
            </p>
            <button 
              onClick={() => setReqSuccessModal(false)}
              style={{ width: '100%', padding: '14px', background: meta.grad, color: '#000', border: '1px solid #e2e8f0', borderRadius: 14, fontWeight: 800, fontSize: 15, cursor: 'pointer', transition: 'transform 0.15s, boxShadow 0.15s', boxShadow: '0 4px 12px rgba(15,23,42,0.06)' }}
            >
              Okay, Thanks!
            </button>
          </div>
        </div>
      )}
      
      {/* Broadcast Success Modal */}
      {bcastSuccessModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'sheetUp 0.3s ease-out' }}>
          <div onClick={() => setBcastSuccessModal(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }} />
          <div style={{ background: '#fffef2', borderRadius: 24, padding: 32, width: '85%', maxWidth: 320, position: 'relative', zIndex: 1, boxShadow: '0 20px 40px rgba(0,0,0,0.15)', textAlign: 'center', border: '1.5px solid #e8df9a' }}>
            <div style={{ background: '#dcfce7', width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 8px 16px rgba(22, 163, 74, 0.2)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#16a34a' }}>campaign</span>
            </div>
            <h3 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 900, color: '#1a1500', fontFamily: "'Bricolage Grotesque', sans-serif" }}>Broadcast Sent!</h3>
            <p style={{ margin: '0 0 28px', fontSize: 14, color: '#64748b', lineHeight: 1.5, fontWeight: 600 }}>
              Food is ready notification has been sent successfully to the students.
            </p>
            <button 
              onClick={() => setBcastSuccessModal(false)}
              style={{ width: '100%', padding: '14px', background: meta.grad, color: '#000', border: '1px solid #e2e8f0', borderRadius: 14, fontWeight: 800, fontSize: 15, cursor: 'pointer', transition: 'transform 0.15s, boxShadow 0.15s', boxShadow: '0 4px 12px rgba(15,23,42,0.06)' }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Cook Meal QR Display Modal */}
      {showMealQR && (() => {
        const currentM = (selectedQRMeal || activeMeal || 'lunch').toLowerCase();
        const mLabel = currentM.charAt(0).toUpperCase() + currentM.slice(1);
        const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
        const qrValue = `FEBEBO_MEAL|${user?.ownerUid || ''}|${currentM}|${todayStr}`;
        const currentEatenCount = Object.keys(eatenData).filter(k => k.includes(`_${currentM}_eaten`)).length;
        
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(8px)', padding: 16 }}>
            <div style={{ background: 'white', borderRadius: 28, width: '100%', maxWidth: 380, padding: '24px 20px', textAlign: 'center', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)' }}>
              <button 
                onClick={() => setShowMealQR(false)} 
                style={{ position: 'absolute', top: 16, right: 16, background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
              </button>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#ecfdf5', color: '#059669', padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                Counter QR Pass
              </div>

              <h3 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 900, color: '#0f172a' }}>{mLabel} QR Pass</h3>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b', fontWeight: 600 }}>
                Keep this screen open for students to scan
              </p>

              {/* Meal Selector Tabs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 18, background: '#f8fafc', padding: 4, borderRadius: 14, border: '1px solid #e2e8f0' }}>
                {['Breakfast', 'Lunch', 'Snacks', 'Dinner'].map(m => {
                  const isSel = (selectedQRMeal || activeMeal || 'lunch').toLowerCase() === m.toLowerCase();
                  return (
                    <button 
                      key={m}
                      onClick={() => setSelectedQRMeal(m.toLowerCase())}
                      style={{
                        padding: '8px 2px',
                        border: 'none',
                        borderRadius: 10,
                        background: isSel ? '#0f172a' : 'transparent',
                        color: isSel ? '#ffffff' : '#64748b',
                        fontWeight: 800,
                        fontSize: 11,
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>

              {/* QR Code Container with High Contrast */}
              <div style={{ background: '#ffffff', padding: 20, borderRadius: 24, border: '2px solid #e2e8f0', display: 'inline-block', boxShadow: '0 8px 20px rgba(0,0,0,0.06)', marginBottom: 16 }}>
                <QRCode value={qrValue} size={210} level="M" />
              </div>

              {/* Live Count Ticker directly below QR */}
              <div style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', color: 'white', borderRadius: 16, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ textAlign: 'left' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Live Headcount</span>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#fde047' }}>{mLabel} Eaten</div>
                </div>
                <div style={{ fontSize: 32, fontWeight: 900, color: '#ffffff' }}>
                  {currentEatenCount}
                </div>
              </div>

              <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                Date: {todayStr} · {user?.ownerUid ? `PG ID: ${user.ownerUid.substring(0, 8)}...` : ''}
              </p>
            </div>
          </div>
        );
      })()}

      {/* Scanner Modal */}
      {showScan && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'black', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px', paddingTop: 'calc(20px + env(safe-area-inset-top, 0px))', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.5)', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
            <h3 style={{ margin: 0, color: 'white', fontSize: '18px' }}>Scan Meal Pass</h3>
            <button onClick={() => setShowScan(false)} style={{ background: 'white', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
            </button>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'black' }}>
            <div style={{ width: '100%', maxWidth: '400px' }}>
              <Scanner
                onScan={(result) => {
                  if (result && result.length > 0) {
                    const text = result[0].rawValue;
                    if (text && text.startsWith('MEALPASS')) {
                      const parts = text.split('|');
                      const meal = parts[1];
                      const uid = parts[2];
                      markMealEaten(uid, meal);
                      setShowScan(false);
                    } else {
                      showToast('Invalid QR Code', 'error');
                    }
                  }
                }}
                onError={(error) => console.log(error)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Manual Selection Modal */}
      {showManual && (() => {
        // Students who have NOT eaten yet for the currently selected meal tab
        // eatenData keys are stored as: `${tenantId}_${mealStr}_eaten` where mealStr is lowercase
        const activeMealStr = mealTab.toLowerCase(); // e.g. 'lunch', 'breakfast'
        const statusKey = activeMealStr === 'breakfast' ? 'statusB' : activeMealStr === 'lunch' ? 'statusL' : activeMealStr === 'snacks' ? 'statusS' : 'statusD';
        // Show all students who have NOT been confirmed eaten yet (via QR/manual)
        const notEatenStudents = students.filter(s =>
          !eatenData[`${s.id}_${activeMealStr}_eaten`] && 
          s[statusKey] !== 'eaten' &&
          s[statusKey] !== 'onVacation'
        );

        // Rooms that still have pending (not-eaten) students
        const pendingRooms = Array.from(new Set(notEatenStudents.map(s => s.room)))
          .filter(r => r && r !== 'N/A')
          .sort((a, b) => {
            const na = parseInt(a) || 0, nb = parseInt(b) || 0;
            return na !== nb ? na - nb : a.localeCompare(b);
          });

        // Search filter — applies across all students when no room selected
        const searchLower = manualSearch.toLowerCase().trim();
        const searchResults = searchLower
          ? notEatenStudents.filter(s =>
              (s.name || '').toLowerCase().includes(searchLower) ||
              String(s.room).toLowerCase().includes(searchLower)
            )
          : notEatenStudents;

        // Students in selected room who haven't eaten
        const roomStudents = [];

        const totalPending = notEatenStudents.length;

        // Students with no valid room assigned — shown in separate section
        const unassignedStudents = notEatenStudents.filter(s => !s.room || s.room === 'N/A');

        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
            <div style={{ background: '#f8fafc', borderRadius: '24px', width: '92%', maxWidth: '420px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', boxShadow: '0 24px 48px rgba(0,0,0,0.25)' }}>

              {/* Header */}
              <div style={{ padding: '18px 20px 14px', background: 'white', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>
                      {selectedRoom ? `Room ${selectedRoom}` : 'Select Manually'}
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                      {mealTab} · {totalPending} student{totalPending !== 1 ? 's' : ''} pending
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (selectedRoom) { setSelectedRoom(null); }
                      else { setShowManual(false); setManualSearch(''); }
                    }}
                    style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                      {selectedRoom ? 'arrow_back' : 'close'}
                    </span>
                  </button>
                </div>

                {/* Search bar — shown only on room list view */}
                {!selectedRoom && (
                  <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: '12px', padding: '10px 14px', gap: 8 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#94a3b8' }}>search</span>
                    <input
                      type="text"
                      placeholder="Search by name or room no…"
                      value={manualSearch}
                      onChange={e => setManualSearch(e.target.value)}
                      style={{ border: 'none', background: 'transparent', fontSize: '14px', fontWeight: 600, color: '#0f172a', outline: 'none', width: '100%', fontFamily: 'inherit' }}
                      autoFocus
                    />
                    {manualSearch && (
                      <button onClick={() => setManualSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#94a3b8' }}>close</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Body */}
              <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>

                {students.length === 0 ? (
                  /* No students loaded yet */
                  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#cbd5e1' }}>people</span>
                    <p style={{ margin: '12px 0 0', fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>No students found</p>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>Students registered in the admin app will appear here.</p>
                  </div>

                ) : totalPending === 0 ? (
                  /* All students already eaten */
                  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#16a34a' }}>check_circle</span>
                    <p style={{ margin: '12px 0 0', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>All Done!</p>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>Every student has eaten for {mealTab}.</p>
                  </div>

                ) : searchResults !== null ? (
                  /* Search results — flat student list */
                  searchResults.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 20px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#cbd5e1' }}>person_search</span>
                      <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#64748b', fontWeight: 600 }}>No students found for "{manualSearch}"</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {searchResults.map(s => (
                        <div key={s.id} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 4px rgba(15,23,42,0.04)' }}>
                          <div>
                            <div style={{ fontSize: '15px', fontWeight: '800', color: '#1e293b' }}>{s.name}</div>
                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginTop: 2 }}>
                              <span style={{ background: '#f1f5f9', borderRadius: 6, padding: '2px 8px' }}>
                                {s.room && s.room !== 'N/A' ? `Room ${s.room}` : 'Room not assigned'}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => { markMealEaten(s.id, activeMealStr); setManualSearch(''); }}
                            style={{ background: '#000', color: 'white', border: 'none', padding: '9px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: '800', cursor: 'pointer', whiteSpace: 'nowrap' }}
                          >
                            Mark Eaten
                          </button>
                        </div>
                      ))}
                    </div>
                  )

                ) : null}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Staff Property Switcher Modal */}
      {showStaffPgSwitcher && (
        <div
          onClick={() => setShowStaffPgSwitcher(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: '0',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#ffffff',
              width: '100%',
              maxWidth: '480px',
              borderTopLeftRadius: '28px',
              borderTopRightRadius: '28px',
              padding: '24px 20px 36px',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>Switch Property</h3>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>Select a PG location to view duties & stats</p>
              </div>
              <button
                onClick={() => setShowStaffPgSwitcher(false)}
                style={{
                  border: 'none',
                  background: '#f1f5f9',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#475569'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
              {assignedProperties.map((prop) => {
                const isSelected = (activePgId || user?.pgId) === prop.id;
                return (
                  <button
                    key={prop.id}
                    onClick={() => {
                      switchPg(prop.id);
                      setShowStaffPgSwitcher(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px',
                      borderRadius: '16px',
                      border: isSelected ? '2px solid #0891b2' : '1px solid #e2e8f0',
                      background: isSelected ? '#ecfeff' : '#f8fafc',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '12px',
                          background: isSelected ? '#0891b2' : '#e2e8f0',
                          color: isSelected ? '#ffffff' : '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>apartment</span>
                      </div>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: isSelected ? '#0e7490' : '#1e293b' }}>
                          {prop.name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                          PG ID: {prop.id}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="material-symbols-outlined" style={{ color: '#0891b2', fontSize: '24px', fontWeight: 'bold' }}>
                        check_circle
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

