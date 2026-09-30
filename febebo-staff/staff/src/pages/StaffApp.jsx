import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  bg:'#f1f5f9', card:'#ffffff', text:'#0f172a', sub:'#334155', muted:'#64748b',
  border:'#e2e8f0', primary:'#0891b2', primaryDk:'#0e7490', primaryBg:'#ecfeff',
  success:'#059669', successBg:'#ecfdf5', warn:'#d97706', warnBg:'#fffbeb',
  danger:'#e11d48', dangerBg:'#fff1f2', indigo:'#4f46e5', indigoBg:'#eef2ff',
};

const ROLE_META = {
  'Cook':             { emoji:'👨‍🍳', accent:'#7c3aed', accentBg:'#f5f3ff', dept:'Kitchen & Mess',      grad:'linear-gradient(135deg,#7c3aed,#a855f7)' },
  'Cleaner':          { emoji:'🧹',   accent:'#0891b2', accentBg:'#ecfeff', dept:'Housekeeping',        grad:'linear-gradient(135deg,#0891b2,#06b6d4)' },
  'Maintenance':      { emoji:'🛠️',   accent:'#e11d48', accentBg:'#fff1f2', dept:'Repairs & Technical', grad:'linear-gradient(135deg,#e11d48,#f43f5e)' },
  'Purchase Manager': { emoji:'🛒',   accent:'#475569', accentBg:'#f1f5f9', dept:'Store & Inventory',   grad:'linear-gradient(135deg,#475569,#64748b)' },
  'Security Guard':   { emoji:'🛡️',   accent:'#059669', accentBg:'#ecfdf5', dept:'Gate Security',       grad:'linear-gradient(135deg,#059669,#10b981)' },
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

const INIT_CONTACTS = [
  {id:'c1', name:'Admin Office', role:'Admin', avatar:'🏢', phone:'+91 99999 00000', isPinned:true, reminder:null, lastMsg:'Update daily logs by 6 PM today.', time:'09:00 AM'},
  {id:'c2', name:'Priya Sharma', role:'Student - Rm 102', avatar:'👩', phone:'+91 98888 77777', isPinned:false, reminder:'Check AC remote today 5:00 PM', lastMsg:'Can room 102 bathroom be cleaned at 11 AM?', time:'09:15 AM'},
  {id:'c3', name:'Dinesh (Maint.)', role:'Staff', avatar:'🛠️', phone:'+91 97777 66666', isPinned:false, reminder:null, lastMsg:'Room 201 AC issue has been resolved.', time:'11:30 AM'},
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

const INIT_VISITORS = [
  {id:1,name:'Rajesh Malhotra',phone:'+91 98111 22233',purpose:'Parent Visit – Rm 104',inTime:'10:15 AM',outTime:null,status:'Inside'},
  {id:2,name:'Zomato Delivery',phone:'+91 98222 33344',purpose:'Food Delivery – Rm 202',inTime:'11:00 AM',outTime:'11:12 AM',status:'Exited'},
  {id:3,name:'Sunil Plumbing',phone:'+91 98333 44455',purpose:'Main Tank Repair',inTime:'08:45 AM',outTime:null,status:'Inside'},
];
const INIT_PARCELS = [
  {id:1,student:'Arjun Mehta',room:'101',carrier:'Amazon',tracking:'AMZ-88910',date:'Today 10:30 AM',status:'Pending'},
  {id:2,student:'Sneha Kapoor',room:'202',carrier:'Flipkart',tracking:'FK-44102',date:'Yesterday',status:'Claimed'},
  {id:3,student:'Karan Singh',room:'201',carrier:'Courier Express',tracking:'CX-9921',date:'Today 09:15 AM',status:'Pending'},
];
const INIT_TICKETS = [
  {id:1,room:'108',issue:'Water leakage — bathroom sink tap',priority:'High',status:'Open',student:'Sneha Kapoor',date:'Today 09:30 AM'},
  {id:2,room:'201',issue:'AC remote & filter cleaning needed',priority:'Normal',status:'In Progress',student:'Karan Singh',date:'Today 10:15 AM'},
  {id:3,room:'305',issue:'Geyser switch sparking / tripping',priority:'High',status:'Open',student:'Ravi Kumar',date:'Yesterday 4 PM'},
];
const INIT_CLEANING = [
  {id:1,room:'101',student:'Arjun Mehta',slot:'10:00–11:00 AM',type:'Full Room',done:true},
  {id:2,room:'102',student:'Priya Sharma',slot:'11:00–12:00 PM',type:'Dusting & Mop',done:false},
  {id:3,room:'105',student:'Ankit Kumar',slot:'02:00–03:00 PM',type:'Bathroom Sanitise',done:false},
  {id:4,room:'202',student:'Sneha Kapoor',slot:'04:00–05:00 PM',type:'Full Room',done:false},
];
const INIT_DEMANDS = [
  {id:1,item:'Basmati Rice 25kg',qty:'2 Bags',reqBy:'Ramesh (Cook)',vendor:'Local Market',date:'22 Jul',status:'Pending'},
  {id:2,item:'Floor Cleaner 5L',qty:'3 cans',reqBy:'Lakshmi (Cleaner)',vendor:'Sunil Traders',date:'21 Jul',status:'Approved'},
  {id:3,item:'PVC Washers (20pc)',qty:'1 pack',reqBy:'Dinesh (Maint.)',vendor:'Hardware Depot',date:'22 Jul',status:'Pending'},
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
      <Tag {...props} style={{padding:'11px 14px',border:`1.5px solid ${C.border}`,borderRadius:12,fontSize:14,fontFamily:'inherit',background:'#fff',color:C.text,outline:'none',boxSizing:'border-box',width:'100%',resize:textarea?'vertical':'none',...props.style}}/>
    </div>
  );
};

const SelectField = ({label,children,...props})=>(
  <div style={{display:'flex',flexDirection:'column',gap:5}}>
    {label&&<label style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:.4}}>{label}</label>}
    <select {...props} style={{padding:'11px 14px',border:`1.5px solid ${C.border}`,borderRadius:12,fontSize:14,fontFamily:'inherit',background:'#fff',color:C.text,outline:'none',boxSizing:'border-box',width:'100%',...props.style}}>{children}</select>
  </div>
);

// ─── Bottom Sheet Modal ───────────────────────────────────────────────────────
const Sheet = ({show,onClose,title,sub,children})=>{
  if(!show)return null;
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,.6)',zIndex:400,display:'flex',alignItems:'flex-end',backdropFilter:'blur(4px)'}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{width:'100%',maxWidth:480,margin:'0 auto',background:'#fff',borderRadius:'24px 24px 0 0',padding:'0 0 36px',boxShadow:'0 -20px 40px rgba(0,0,0,.14)',animation:'sheetUp .25s ease'}}>
        <div style={{display:'flex',justifyContent:'center',padding:'14px 0 0'}}><div style={{width:36,height:4,background:C.border,borderRadius:4}}/></div>
        <Row style={{padding:'12px 20px 16px',borderBottom:`1px solid ${C.border}`}}>
          <div><p style={{margin:0,fontSize:16,fontWeight:800,color:C.text}}>{title}</p>{sub&&<p style={{margin:'2px 0 0',fontSize:12,color:C.muted}}>{sub}</p>}</div>
          <button onClick={onClose} style={{background:C.bg,border:'none',borderRadius:10,width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:18,color:C.muted}}>✕</button>
        </Row>
        <div style={{padding:'16px 20px'}}>{children}</div>
      </div>
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function StaffApp(){
  const {user,logout} = useAuth();

  const staffRole = user?.staffRole || 'Cook';
  const staffName = user?.name     || 'Staff Member';
  const meta      = ROLE_META[staffRole] || ROLE_META['Cook'];
  const firstName = staffName.split(' ')[0];

  // Sidebar & view
  const [sidebar,  setSidebar]  = useState(false);
  const [view,     setView]     = useState('home');   // home | work | inout | salary | items | chat | reports | requests

  // Clock
  const [clocked, setClocked]   = useState(true);
  const [clockIn]               = useState('08:30 AM');
  const [punchLog,setPunchLog]  = useState([
    {id:1,date:'Today, 23 Jul 2026',inT:'08:30 AM',outT:null,hrs:null},
    {id:2,date:'Yesterday, 22 Jul',  inT:'08:15 AM',outT:'06:30 PM',hrs:'10 h 15 m'},
    {id:3,date:'21 Jul 2026',        inT:'08:30 AM',outT:'06:00 PM',hrs:'9 h 30 m'},
  ]);

  // Cook
  const [students,setStudents]  = useState(STUDENTS);
  const [timeFilter, setTimeFilter] = useState('Daily'); // Daily | Weekly | Monthly
  const [mealTab, setMealTab]   = useState('Breakfast'); // Breakfast | Lunch | Snacks | Dinner
  const [selectedStat, setSelectedStat] = useState('notEaten'); // requested | pack | extra | eaten | notEaten
  
  const [showBcast,setShowBcast]= useState(false);
  const [bTarget, setBTarget]   = useState('All');
  const [bStudentId, setBStudentId] = useState('');
  const [bMsg,setBMsg]          = useState('Fresh hot meal is ready! Please head to the mess hall. 🍽️');
  const [bMeal,setBMeal]        = useState('Breakfast');

  // Cleaner
  const [cleaning,setCleaning]  = useState(INIT_CLEANING);

  // Maintenance
  const [tickets,setTickets]    = useState(INIT_TICKETS);

  // Purchase
  const [demands,setDemands]    = useState(INIT_DEMANDS);

  // Security
  const [visitors,setVisitors]  = useState(INIT_VISITORS);
  const [parcels,setParcels]    = useState(INIT_PARCELS);
  const [showVisitor,setShowVisitor]=useState(false);
  const [showParcel,setShowParcel]  =useState(false);
  const [vName,setVName]=useState(''); const [vPhone,setVPhone]=useState(''); const [vPurp,setVPurp]=useState('');
  const [pStu,setPStu]=useState('');   const [pRoom,setPRoom]=useState('');   const [pCarr,setPCarr]=useState('Amazon'); const [pTrk,setPTrk]=useState('');

  // Demand/Requisition (shared)
  const [showDemand,setShowDemand]=useState(false);
  const [dItem,setDItem]=useState(''); const [dQty,setDQty]=useState(''); const [dNote,setDNote]=useState('');
  const [myDemands,setMyDemands]=useState([{id:1,item:'Basmati Rice 25kg',qty:'2 Bags',date:'22 Jul',status:'Approved'}]);

  // Chat - Individual WhatsApp style
  const [contacts, setContacts] = useState(INIT_CONTACTS);
  const [activeContact, setActiveContact] = useState(null); // null = list view, object = chat view
  const [chatHist, setChatHist] = useState(INIT_MESSAGES);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);
  useEffect(() => { 
    if (view === 'chat' && activeContact) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHist, view, activeContact]);

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
  const [myReqs,setMyReqs]      = useState([
    {id:1,type:'Casual Leave',  date:'25 Jul',status:'Approved',amt:'-'},
    {id:2,type:'Salary Advance',date:'20 Jul',status:'Approved',amt:'₹3,000'},
  ]);

  // Greeting
  const hr   = new Date().getHours();
  const greet= hr<12?'Good Morning':hr<17?'Good Afternoon':'Good Evening';
  const today= new Date().toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'});

  // Handlers
  const punch = ()=>{
    const now = new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
    if(clocked){
      setClocked(false);
      setPunchLog(p=>p.map(x=>x.id===1?{...x,outT:now,hrs:'8 h 0 m'}:x));
    } else {
      setClocked(true);
      setPunchLog(p=>[{id:Date.now(),date:'Today, '+new Date().toLocaleDateString('en-GB'),inT:now,outT:null,hrs:null},...p]);
    }
  };

  const sendMsg = e => {
    e.preventDefault();
    if (!chatInput.trim() || !activeContact) return;
    const newMsg = { id: Date.now(), text: chatInput.trim(), time: new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}), me: true };
    setChatHist(prev => ({...prev, [activeContact.id]: [...(prev[activeContact.id] || []), newMsg]}));
    setContacts(prev => prev.map(c => c.id === activeContact.id ? { ...c, lastMsg: chatInput.trim(), time: newMsg.time } : c));
    setChatInput('');
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
    alert('Report submitted to Admin!');
  };

  const submitRequest = e=>{
    e.preventDefault();
    if(!reqReason.trim()) return;
    setMyReqs(p=>[{id:Date.now(),type:reqType,date:new Date().toLocaleDateString('en-GB'),status:'Pending',amt:reqAmt?`₹${reqAmt}`:'-'},...p]);
    setReqReason(''); setReqAmt('');
    alert('Request submitted!');
  };

  const submitDemand = e=>{
    e.preventDefault();
    if(!dItem.trim()) return;
    setMyDemands(p=>[{id:Date.now(),item:dItem.trim(),qty:dQty||'1 unit',date:new Date().toLocaleDateString('en-GB'),status:'Pending'},...p]);
    setDItem(''); setDQty(''); setDNote('');
    setShowDemand(false);
    alert('Requisition submitted to Admin!');
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
    {id:'work',     label:'My Work',    sub:staffRole,          icon:'home_work',         grad:`linear-gradient(135deg,${meta.accent},${meta.accent}bb)`},
    {id:'inout',    label:'Attendance', sub:'Punch In / Out',   icon:'schedule',           grad:'linear-gradient(135deg,#0ea5e9,#0891b2)'},
    {id:'salary',   label:'Salary',     sub:'₹18,500 Jul',      icon:'payments',           grad:'linear-gradient(135deg,#10b981,#059669)'},
    {id:'items',    label:'Item List',  sub:'Store Inventory',  icon:'inventory_2',        grad:'linear-gradient(135deg,#f59e0b,#d97706)'},
    {id:'chat',     label:'Chat',       sub:'5 Messages',       icon:'forum',              grad:'linear-gradient(135deg,#ec4899,#db2777)'},
    {id:'reports',  label:'Reports',    sub:'Work Logs',        icon:'assessment',         grad:'linear-gradient(135deg,#6366f1,#4f46e5)'},
    {id:'requests', label:'Requests',   sub:'Leave / Advance',  icon:'approval',           grad:'linear-gradient(135deg,#64748b,#475569)'},
  ];

  // ─── Role quick stats ─────────────────────────────────────────────────────
  const roleStats = {
    'Cook':             [{l:'Breakfast',v:30,icon:'coffee'},{l:'Lunch',v:28,icon:'lunch_dining'},{l:'Dinner',v:30,icon:'dinner_dining'},{l:'Snacks',v:30,icon:'bakery_dining'}],
    'Cleaner':          [{l:'Pending',v:INIT_CLEANING.filter(c=>!c.done).length,icon:'mop'},{l:'Cleaned',v:INIT_CLEANING.filter(c=>c.done).length,icon:'check_circle'},{l:'Rooms Today',v:4,icon:'room_service'},{l:'Floors',v:3,icon:'stairs'}],
    'Maintenance':      [{l:'Open',v:INIT_TICKETS.filter(t=>t.status==='Open').length,icon:'build'},{l:'In Progress',v:INIT_TICKETS.filter(t=>t.status==='In Progress').length,icon:'construction'},{l:'Resolved',v:8,icon:'check_circle'},{l:'High Priority',v:2,icon:'priority_high'}],
    'Purchase Manager': [{l:'Pending POs',v:INIT_DEMANDS.filter(d=>d.status==='Pending').length,icon:'pending'},{l:'Approved',v:INIT_DEMANDS.filter(d=>d.status==='Approved').length,icon:'verified'},{l:'Items Low',v:2,icon:'inventory_2'},{l:'Out of Stock',v:1,icon:'remove_shopping_cart'}],
    'Security Guard':   [{l:'Visitors In',v:INIT_VISITORS.filter(v=>v.status==='Inside').length,icon:'person'},{l:'Today Total',v:INIT_VISITORS.length,icon:'groups'},{l:'Parcels',v:INIT_PARCELS.filter(p=>p.status==='Pending').length,icon:'package_2'},{l:'Incidents',v:0,icon:'warning'}],
  };
  const stats = roleStats[staffRole] || roleStats['Cook'];

  // Sorting contacts
  const sortedContacts = [...contacts].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    if (a.reminder && !b.reminder) return -1;
    if (!a.reminder && b.reminder) return 1;
    return 0;
  });

  // ─── RENDER ──────────────────────────────────────────────────────────────
  return (
    <div style={{maxWidth:480,margin:'0 auto',minHeight:'100vh',background:C.bg,fontFamily:"'Hanken Grotesk',sans-serif",position:'relative',overflowX:'hidden'}}>
      <style>{`
        @keyframes sheetUp{from{transform:translateY(60px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes sideIn{from{left:-300px}to{left:0}}
        ::-webkit-scrollbar{display:none} *{-webkit-tap-highlight-color:transparent}
      `}</style>

      {/* ── Sidebar Overlay ─────────────────────────────────────────────── */}
      {sidebar && <div onClick={()=>setSidebar(false)} style={{position:'fixed',inset:0,background:'rgba(15,23,42,.55)',zIndex:60,backdropFilter:'blur(3px)'}}/>}

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside style={{position:'fixed',top:0,left:sidebar?0:'-300px',width:280,height:'100vh',background:'#0f172a',zIndex:70,transition:'left .3s cubic-bezier(.4,0,.2,1)',display:'flex',flexDirection:'column',boxShadow:'8px 0 32px rgba(0,0,0,.35)'}}>
        {/* Sidebar top profile */}
        <div style={{padding:'28px 20px 20px',borderBottom:'1px solid rgba(255,255,255,.08)'}}>
          <div style={{width:52,height:52,borderRadius:16,background:meta.grad,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,marginBottom:12}}>
            {meta.emoji}
          </div>
          <p style={{fontFamily:"'Bricolage Grotesque',sans-serif",fontSize:18,fontWeight:800,color:'white',margin:0}}>{staffName}</p>
          <div style={{display:'flex',alignItems:'center',gap:6,marginTop:4}}>
            <span style={{fontSize:11,fontWeight:800,background:meta.accent,color:'white',padding:'2px 8px',borderRadius:8}}>{staffRole}</span>
            <span style={{fontSize:11,color:'#64748b'}}>· {meta.dept}</span>
          </div>
        </div>

        {/* Nav items */}
        <div style={{flex:1,overflowY:'auto',paddingTop:8}}>
          {[
            {id:'home',     icon:'home',        label:'Home Dashboard'},
            {id:'work',     icon:'home_work',   label:'My Work'},
            {id:'inout',    icon:'schedule',    label:'Attendance'},
            {id:'salary',   icon:'payments',    label:'Salary & Pay'},
            {id:'items',    icon:'inventory_2', label:'Item List'},
            {id:'chat',     icon:'forum',       label:'Chat'},
            {id:'reports',  icon:'assessment',  label:'Work Reports'},
            {id:'requests', icon:'approval',    label:'Requests'},
          ].map(item=>{
            const active = view===item.id;
            return (
              <div key={item.id} onClick={()=>{setView(item.id);setSidebar(false);setActiveContact(null);}}
                style={{display:'flex',alignItems:'center',gap:14,padding:'13px 20px',cursor:'pointer',color:active?meta.accent:'#94a3b8',background:active?`${meta.accent}18`:'transparent',borderLeft:`3px solid ${active?meta.accent:'transparent'}`,transition:'all .15s'}}>
                <span className="material-symbols-outlined" style={{fontSize:20}}>{item.icon}</span>
                <span style={{fontSize:14,fontWeight:active?800:500}}>{item.label}</span>
              </div>
            );
          })}
        </div>

        {/* Logout */}
        <div style={{borderTop:'1px solid rgba(255,255,255,.08)',padding:'16px 20px'}}>
          <div onClick={logout} style={{display:'flex',alignItems:'center',gap:14,color:'#f87171',cursor:'pointer',padding:'8px 0'}}>
            <span className="material-symbols-outlined" style={{fontSize:20}}>logout</span>
            <span style={{fontSize:14,fontWeight:600}}>Sign Out</span>
          </div>
        </div>
      </aside>

      {/* ── HEADER (always visible) ──────────────────────────────────────── */}
      {view === 'home' ? (
        // Home Hero Header
        <div style={{background:`linear-gradient(160deg,#0c1a2e 0%,#0f2847 55%,${meta.accent}22 100%)`,padding:'0 16px 20px',color:'white'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',height:60}}>
            <button onClick={()=>setSidebar(true)} style={{background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.15)',borderRadius:10,width:38,height:38,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
              <span className="material-symbols-outlined" style={{fontSize:20,color:'white'}}>menu</span>
            </button>
            <p style={{fontFamily:"'Bricolage Grotesque',sans-serif",fontSize:20,fontWeight:800,color:'white',margin:0,letterSpacing:-.5}}>febebo</p>
            <button onClick={()=>setShowDemand(true)} style={{background:meta.accent,border:'none',borderRadius:10,padding:'7px 11px',color:'white',fontSize:11,fontWeight:800,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}>
              <span className="material-symbols-outlined" style={{fontSize:15}}>post_add</span>
              Demand
            </button>
          </div>

          {/* Greeting card */}
          <div style={{marginTop:6}}>
            <p style={{margin:'0 0 2px',fontSize:13,color:'#94a3b8',fontWeight:500}}>{greet}, {firstName} 👋</p>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <h2 style={{margin:0,fontSize:22,fontWeight:900,color:'white',letterSpacing:-.5}}>{meta.dept}</h2>
              <span style={{fontSize:11,fontWeight:800,background:meta.accent,color:'white',padding:'3px 8px',borderRadius:8}}>{staffRole}</span>
            </div>
            <p style={{margin:'3px 0 0',fontSize:11,color:'#64748b'}}>📅 {today} · Febebo PG</p>
          </div>

          {/* Punch card */}
          <div style={{marginTop:14,background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.1)',borderRadius:16,padding:'12px 14px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:3}}>
                <span style={{width:7,height:7,borderRadius:'50%',background:clocked?'#34d399':'#f87171',display:'inline-block',boxShadow:`0 0 7px ${clocked?'#34d399':'#f87171'}`}}/>
                <span style={{fontSize:13,fontWeight:800,color:'white'}}>{clocked?`On Duty · In at ${clockIn}`:'Off Shift'}</span>
              </div>
              <p style={{margin:0,fontSize:11,color:'#64748b'}}>📍 Location verified · {meta.dept}</p>
            </div>
            <button onClick={punch} style={{padding:'8px 14px',borderRadius:10,border:'none',background:clocked?C.dangerBg:C.successBg,color:clocked?C.danger:C.success,fontSize:12,fontWeight:800,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>
              {clocked?'⏹ Punch Out':'▶ Punch In'}
            </button>
          </div>
        </div>
      ) : view === 'chat' && activeContact ? (
        // Individual Chat Header
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'0 16px',height:64,background:'#fff',borderBottom:`1px solid ${C.border}`,position:'sticky',top:0,zIndex:50,boxShadow:'0 2px 8px rgba(0,0,0,.04)'}}>
          <button onClick={() => setActiveContact(null)} style={{background:C.bg,border:'none',borderRadius:10,width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0}}>
            <span className="material-symbols-outlined" style={{fontSize:20,color:C.sub}}>arrow_back_ios_new</span>
          </button>
          <div style={{width:40,height:40,borderRadius:12,background:meta.accentBg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>{activeContact.avatar}</div>
          <div style={{flex:1, overflow:'hidden'}}>
            <p style={{margin:0,fontSize:15,fontWeight:800,color:C.text,whiteSpace:'nowrap',textOverflow:'ellipsis',overflow:'hidden'}}>{activeContact.name}</p>
            <p style={{margin:0,fontSize:11,color:C.muted}}>{activeContact.role}</p>
          </div>
          <button onClick={openReminder} style={{background: activeContact.reminder ? '#fef3c7' : meta.accentBg, border: `1px solid ${activeContact.reminder ? '#fde68a' : meta.accent}`, borderRadius: 10, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: activeContact.reminder ? '#b45309' : meta.accent, fontSize: 12, fontWeight: 700, fontFamily: 'inherit'}}>
            <span className="material-symbols-outlined" style={{fontSize:16}}>{activeContact.reminder ? 'notifications_active' : 'notifications'}</span>
          </button>
        </div>
      ) : (
        // Inner page header
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'0 16px',height:58,background:'#fff',borderBottom:`1px solid ${C.border}`,position:'sticky',top:0,zIndex:50,boxShadow:'0 2px 8px rgba(0,0,0,.04)'}}>
          <button onClick={()=>setSidebar(true)} style={{background:C.bg,border:'none',borderRadius:10,width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0}}>
            <span className="material-symbols-outlined" style={{fontSize:20,color:C.sub}}>menu</span>
          </button>
          <button onClick={()=>setView('home')} style={{background:C.bg,border:'none',borderRadius:10,width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0}}>
            <span className="material-symbols-outlined" style={{fontSize:20,color:C.sub}}>arrow_back_ios_new</span>
          </button>
          <p style={{flex:1,margin:0,fontSize:16,fontWeight:800,color:meta.accent}}>
            {view==='work'?'My Work':view==='inout'?'Attendance':view==='salary'?'Salary':view==='items'?'Item List':view==='chat'?'Chat':view==='reports'?'Work Reports':'Requests'}
          </p>
          {view==='items' && (
            <button onClick={()=>setShowDemand(true)} style={{background:meta.accent,border:'none',borderRadius:10,padding:'6px 10px',color:'white',fontSize:11,fontWeight:800,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}>
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
        <div style={{padding:'16px 14px',paddingBottom:32}}>

          {/* Quick Stats Row */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:8,marginBottom:18}}>
            {stats.map((s,i)=>(
              <div key={i} style={{background:'#fff',borderRadius:14,padding:'10px 8px',textAlign:'center',border:`1px solid ${C.border}`,boxShadow:'0 2px 8px rgba(0,0,0,.03)'}}>
                <span className="material-symbols-outlined" style={{fontSize:18,color:meta.accent,display:'block',marginBottom:3}}>{s.icon}</span>
                <p style={{margin:0,fontSize:20,fontWeight:900,color:C.text}}>{s.v}</p>
                <p style={{margin:0,fontSize:9,fontWeight:700,color:C.muted,lineHeight:1.2,textTransform:'uppercase'}}>{s.l}</p>
              </div>
            ))}
          </div>

          {/* Module Grid */}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <p style={{margin:0,fontSize:13,fontWeight:800,color:C.text}}>Quick Access</p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:20}}>
            {MODULES.map((m,i)=>(
              <button key={m.id} onClick={()=>setView(m.id)}
                style={{display:'flex',flexDirection:'column',alignItems:'center',gap:7,background:'#fff',border:`1px solid ${C.border}`,borderRadius:18,padding:'14px 6px',cursor:'pointer',boxShadow:'0 2px 10px rgba(0,0,0,.04)'}}>
                <div style={{width:44,height:44,borderRadius:14,background:m.grad,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:`0 4px 12px ${meta.accent}33`}}>
                  <span className="material-symbols-outlined" style={{fontSize:22,color:'white'}}>{m.icon}</span>
                </div>
                <span style={{fontSize:10.5,fontWeight:800,color:C.text,textAlign:'center',lineHeight:1.2}}>{m.label}</span>
              </button>
            ))}
          </div>

          {/* Recent Activity */}
          <p style={{margin:'0 0 10px',fontSize:13,fontWeight:800,color:C.text}}>Recent Activity</p>

          {/* Cook preview */}
          {staffRole === 'Cook' && (
            <div onClick={()=>setView('work')} style={{background:'#fff',borderRadius:18,border:`1px solid ${C.border}`,padding:16,cursor:'pointer',boxShadow:'0 2px 10px rgba(0,0,0,.04)'}}>
              <Row>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{width:40,height:40,borderRadius:13,background:meta.grad,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>👨‍🍳</div>
                  <div>
                    <p style={{margin:0,fontSize:14,fontWeight:800,color:C.text}}>Today's Mess Overview</p>
                    <p style={{margin:'2px 0 0',fontSize:12,color:C.muted}}>Breakfast: 30 · Lunch: 28</p>
                  </div>
                </div>
                <span className="material-symbols-outlined" style={{fontSize:18,color:C.muted}}>chevron_right</span>
              </Row>
              <div style={{marginTop:12,background:meta.accentBg,borderRadius:12,padding:'10px 12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontSize:12,color:meta.accent,fontWeight:700}}>📊 Track meals, extra plates & packs</span>
                <Chip label="Update" color={meta.accent} bg={meta.accentBg}/>
              </div>
            </div>
          )}

          {/* Cleaner preview */}
          {staffRole === 'Cleaner' && (
            <div onClick={()=>setView('work')} style={{background:'#fff',borderRadius:18,border:`1px solid ${C.border}`,padding:16,cursor:'pointer',boxShadow:'0 2px 10px rgba(0,0,0,.04)'}}>
              <Row>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{width:40,height:40,borderRadius:13,background:meta.grad,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🧹</div>
                  <div>
                    <p style={{margin:0,fontSize:14,fontWeight:800,color:C.text}}>Cleaning Schedule</p>
                    <p style={{margin:'2px 0 0',fontSize:12,color:C.muted}}>{cleaning.filter(c=>!c.done).length} rooms pending · {cleaning.filter(c=>c.done).length} cleaned</p>
                  </div>
                </div>
                <span className="material-symbols-outlined" style={{fontSize:18,color:C.muted}}>chevron_right</span>
              </Row>
            </div>
          )}

          {/* Maintenance preview */}
          {staffRole === 'Maintenance' && (
            <div onClick={()=>setView('work')} style={{background:'#fff',borderRadius:18,border:`1px solid ${C.border}`,padding:16,cursor:'pointer',boxShadow:'0 2px 10px rgba(0,0,0,.04)'}}>
              <Row>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{width:40,height:40,borderRadius:13,background:meta.grad,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🛠️</div>
                  <div>
                    <p style={{margin:0,fontSize:14,fontWeight:800,color:C.text}}>Repair Tickets</p>
                    <p style={{margin:'2px 0 0',fontSize:12,color:C.muted}}>{tickets.filter(t=>t.status!=='Resolved').length} active · {tickets.filter(t=>t.priority==='High'&&t.status!=='Resolved').length} high priority</p>
                  </div>
                </div>
                <span className="material-symbols-outlined" style={{fontSize:18,color:C.muted}}>chevron_right</span>
              </Row>
            </div>
          )}

          {/* Purchase preview */}
          {staffRole === 'Purchase Manager' && (
            <div onClick={()=>setView('work')} style={{background:'#fff',borderRadius:18,border:`1px solid ${C.border}`,padding:16,cursor:'pointer',boxShadow:'0 2px 10px rgba(0,0,0,.04)'}}>
              <Row>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{width:40,height:40,borderRadius:13,background:meta.grad,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🛒</div>
                  <div>
                    <p style={{margin:0,fontSize:14,fontWeight:800,color:C.text}}>Requisitions Queue</p>
                    <p style={{margin:'2px 0 0',fontSize:12,color:C.muted}}>{demands.filter(d=>d.status==='Pending').length} pending POs to action</p>
                  </div>
                </div>
                <span className="material-symbols-outlined" style={{fontSize:18,color:C.muted}}>chevron_right</span>
              </Row>
            </div>
          )}

          {/* Security preview */}
          {staffRole === 'Security Guard' && (
            <div onClick={()=>setView('work')} style={{background:'#fff',borderRadius:18,border:`1px solid ${C.border}`,padding:16,cursor:'pointer',boxShadow:'0 2px 10px rgba(0,0,0,.04)'}}>
              <Row>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{width:40,height:40,borderRadius:13,background:meta.grad,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🛡️</div>
                  <div>
                    <p style={{margin:0,fontSize:14,fontWeight:800,color:C.text}}>Gate Security Log</p>
                    <p style={{margin:'2px 0 0',fontSize:12,color:C.muted}}>{visitors.filter(v=>v.status==='Inside').length} visitors inside · {parcels.filter(p=>p.status==='Pending').length} parcels unclaimed</p>
                  </div>
                </div>
                <span className="material-symbols-outlined" style={{fontSize:18,color:C.muted}}>chevron_right</span>
              </Row>
            </div>
          )}

          {/* Recent chat preview */}
          <div onClick={()=>setView('chat')} style={{marginTop:10,background:'#fff',borderRadius:18,border:`1px solid ${C.border}`,padding:16,cursor:'pointer',boxShadow:'0 2px 10px rgba(0,0,0,.04)'}}>
            <Row style={{marginBottom:10}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{width:36,height:36,borderRadius:11,background:'linear-gradient(135deg,#ec4899,#db2777)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <span className="material-symbols-outlined" style={{fontSize:18,color:'white'}}>forum</span>
                </div>
                <p style={{margin:0,fontSize:14,fontWeight:800,color:C.text}}>Recent Chat</p>
              </div>
              <Chip label={`${contacts.length} chats`} color="#db2777" bg="#fdf2f8"/>
            </Row>
            {contacts.slice(0, 2).map(c=>(
              <div key={c.id} style={{background:C.bg,borderRadius:10,padding:'8px 10px',marginBottom:6,display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:28,height:28,borderRadius:8,background:meta.accentBg,display:'flex',alignItems:'center',justifyContent:'center'}}>{c.avatar}</div>
                <div style={{flex:1, overflow:'hidden'}}>
                  <p style={{margin:0,fontSize:13,fontWeight:800,color:C.text}}>{c.name}</p>
                  <p style={{margin:'2px 0 0',fontSize:12,color:C.sub,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.lastMsg}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MY WORK (Role-Specific)
         ══════════════════════════════════════════════════════════════════════ */}
      {view === 'work' && (
        <div style={{padding:'14px 14px 32px',display:'flex',flexDirection:'column',gap:14}}>

          {/* COOK */}
          {staffRole === 'Cook' && (<>
            <button onClick={()=>setShowBcast(true)} style={{width:'100%',padding:14,background:'linear-gradient(135deg,#059669,#10b981)',color:'white',border:'none',borderRadius:16,fontSize:14,fontWeight:800,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,boxShadow:'0 4px 16px rgba(16,185,129,.3)',fontFamily:'inherit'}}>
              <span className="material-symbols-outlined" style={{fontSize:20}}>campaign</span>
              Broadcast "Food is Ready!" 📢
            </button>

            {/* Time Filter Tabs */}
            <div style={{display:'flex', background:'#fff', borderRadius:12, padding:4, border:`1px solid ${C.border}`}}>
              {['Daily', 'Weekly', 'Monthly'].map(f => (
                <button key={f} onClick={()=>setTimeFilter(f)} style={{flex:1, padding:'8px 0', borderRadius:8, border:'none', background:timeFilter===f?meta.accentBg:'transparent', color:timeFilter===f?meta.accent:C.muted, fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'inherit'}}>
                  {f}
                </button>
              ))}
            </div>

            {/* Meal Tabs */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:8}}>
              {[{m:'Breakfast',icon:'coffee'},{m:'Lunch',icon:'lunch_dining'},{m:'Snacks',icon:'bakery_dining'},{m:'Dinner',icon:'dinner_dining'}].map(x=>(
                <div key={x.m} onClick={()=>setMealTab(x.m)} style={{background:mealTab===x.m?meta.accentBg:'#fff',border:`1.5px solid ${mealTab===x.m?meta.accent:C.border}`,borderRadius:12,padding:'10px 4px',textAlign:'center',cursor:'pointer'}}>
                  <span className="material-symbols-outlined" style={{fontSize:20,color:mealTab===x.m?meta.accent:C.muted}}>{x.icon}</span>
                  <p style={{fontSize:10,fontWeight:800,color:mealTab===x.m?meta.accent:C.muted,margin:'4px 0 0',textTransform:'uppercase'}}>{x.m}</p>
                </div>
              ))}
            </div>

            {/* Stat Cards & Filtered List */}
            {(() => {
               const mealKey = mealTab==='Breakfast'?'statusB':mealTab==='Lunch'?'statusL':mealTab==='Snacks'?'statusS':'statusD';
               const statsObj = {
                 requested: students.filter(s=>s[mealKey]==='requested').length,
                 pack: students.filter(s=>s[mealKey]==='pack').length,
                 extra: students.filter(s=>s[mealKey]==='extra').length,
                 eaten: students.filter(s=>s[mealKey]==='eaten').length,
                 notEaten: students.filter(s=>s[mealKey]==='notEaten').length,
               };
               
               const mult = timeFilter==='Monthly'?30:timeFilter==='Weekly'?7:1;

               const statCards = [
                 {id:'requested', l:'Requested', v:statsObj.requested*mult, c:C.primary, bg:C.primaryBg},
                 {id:'pack', l:'To Pack', v:statsObj.pack*mult, c:C.warn, bg:C.warnBg},
                 {id:'extra', l:'Extra Plate', v:statsObj.extra*mult, c:C.indigo, bg:C.indigoBg},
                 {id:'eaten', l:'Eaten', v:statsObj.eaten*mult, c:C.success, bg:C.successBg},
                 {id:'notEaten', l:'Not Eaten', v:statsObj.notEaten*mult, c:C.danger, bg:C.dangerBg}
               ];

               return (
                 <>
                   {/* Scrollable Stat Cards Container */}
                   <div style={{display:'flex', gap:8, overflowX:'auto', paddingBottom:4, margin:'0 -4px', paddingLeft:4, paddingRight:4, scrollbarWidth:'none'}}>
                     {statCards.map(s => (
                       <div key={s.id} onClick={()=>setSelectedStat(s.id)} style={{flexShrink:0, width:90, background:selectedStat===s.id?s.bg:'#fff', border:`1.5px solid ${selectedStat===s.id?s.c:C.border}`, borderRadius:14, padding:'12px 10px', textAlign:'center', cursor:'pointer', transition:'all .15s'}}>
                         <p style={{fontSize:22,fontWeight:900,color:selectedStat===s.id?s.c:C.text,margin:0}}>{s.v}</p>
                         <p style={{fontSize:10,fontWeight:800,color:selectedStat===s.id?s.c:C.muted,margin:'4px 0 0',textTransform:'uppercase'}}>{s.l}</p>
                       </div>
                     ))}
                   </div>
                   
                   {/* Filtered Student List */}
                   <div style={{background:'#fff',borderRadius:18,border:`1px solid ${C.border}`,padding:16}}>
                     <p style={{margin:'0 0 12px',fontSize:15,fontWeight:800,color:C.text}}>
                       {statCards.find(c=>c.id===selectedStat)?.l} · {mealTab}
                     </p>
                     
                     <div style={{maxHeight:360,overflowY:'auto',display:'flex',flexDirection:'column',gap:8,paddingRight:4}}>
                       {students.filter(s=>s[mealKey]===selectedStat).map(s=>(
                         <div key={s.id} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:12,padding:'10px 12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                           <div>
                             <span style={{fontSize:13,fontWeight:800,color:C.text}}>{s.name} </span>
                             <p style={{margin:'2px 0 6px',fontSize:11,color:C.muted}}>Rm {s.room} · {s.bed}</p>
                             <Chip label={s.phone} color={meta.accent} bg={meta.accentBg}/>
                           </div>
                           
                           {/* Quick Action button for 'eaten' */}
                           {selectedStat !== 'eaten' && timeFilter === 'Daily' && (
                             <button onClick={()=>setStudents(p=>p.map(st=>st.id===s.id?{...st,[mealKey]:'eaten'}:st))}
                               style={{padding:'6px 12px',borderRadius:8,border:`1px solid ${C.border}`,background:'#fff',color:C.sub,fontSize:12,fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}>
                               Mark Eaten
                             </button>
                           )}
                           {selectedStat === 'eaten' && timeFilter === 'Daily' && (
                              <Chip label="Eaten ✅" color={C.success} bg={C.successBg}/>
                           )}
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
          </>)}

          {/* CLEANER */}
          {staffRole === 'Cleaner' && (<>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div style={{background:'#fff',borderRadius:14,border:`1px solid ${C.border}`,padding:14,textAlign:'center'}}>
                <p style={{fontSize:28,fontWeight:900,color:C.danger,margin:0}}>{cleaning.filter(c=>!c.done).length}</p>
                <p style={{fontSize:12,color:C.muted,margin:'2px 0 0'}}>Pending Rooms</p>
              </div>
              <div style={{background:'#fff',borderRadius:14,border:`1px solid ${C.border}`,padding:14,textAlign:'center'}}>
                <p style={{fontSize:28,fontWeight:900,color:C.success,margin:0}}>{cleaning.filter(c=>c.done).length}</p>
                <p style={{fontSize:12,color:C.muted,margin:'2px 0 0'}}>Cleaned</p>
              </div>
            </div>
            <div style={{background:'#fff',borderRadius:18,border:`1px solid ${C.border}`,padding:16}}>
              <p style={{margin:'0 0 12px',fontSize:15,fontWeight:800,color:C.text}}>🧹 Today's Schedule</p>
              {cleaning.map(slot=>(
                <div key={slot.id} style={{background:slot.done?C.successBg:C.bg,border:`1px solid ${slot.done?'#a7f3d0':C.border}`,borderRadius:14,padding:12,marginBottom:8,display:'flex',alignItems:'center',gap:12}}>
                  <div style={{width:40,height:40,borderRadius:12,background:slot.done?C.success:meta.accentBg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <span className="material-symbols-outlined" style={{fontSize:20,color:slot.done?'white':meta.accent}}>{slot.done?'check_circle':'mop'}</span>
                  </div>
                  <div style={{flex:1}}>
                    <Row>
                      <span style={{fontSize:14,fontWeight:800,color:C.text}}>Room {slot.room}</span>
                      {slot.done?<Chip label="Done ✓" color={C.success} bg={C.successBg}/>:
                        <button onClick={()=>setCleaning(p=>p.map(c=>c.id===slot.id?{...c,done:true}:c))} style={{padding:'6px 12px',background:meta.accentBg,border:`1.5px solid ${meta.accent}`,borderRadius:10,color:meta.accent,fontSize:12,fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}>Mark Done</button>}
                    </Row>
                    <p style={{margin:'3px 0 0',fontSize:11,color:C.muted}}>⏰ {slot.slot} · {slot.type} · {slot.student}</p>
                  </div>
                </div>
              ))}
            </div>
          </>)}

          {/* MAINTENANCE */}
          {staffRole === 'Maintenance' && (<>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div style={{background:'#fff',borderRadius:14,border:`1px solid ${C.border}`,padding:14,textAlign:'center'}}>
                <p style={{fontSize:28,fontWeight:900,color:C.danger,margin:0}}>{tickets.filter(t=>t.status==='Open').length}</p>
                <p style={{fontSize:12,color:C.muted,margin:'2px 0 0'}}>Open</p>
              </div>
              <div style={{background:'#fff',borderRadius:14,border:`1px solid ${C.border}`,padding:14,textAlign:'center'}}>
                <p style={{fontSize:28,fontWeight:900,color:C.warn,margin:0}}>{tickets.filter(t=>t.status==='In Progress').length}</p>
                <p style={{fontSize:12,color:C.muted,margin:'2px 0 0'}}>In Progress</p>
              </div>
            </div>
            <div style={{background:'#fff',borderRadius:18,border:`1px solid ${C.border}`,padding:16}}>
              <p style={{margin:'0 0 12px',fontSize:15,fontWeight:800,color:C.text}}>🛠️ Repair Tickets</p>
              {tickets.map(t=>(
                <div key={t.id} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:14,padding:14,marginBottom:10}}>
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
                      {t.status==='Open' && <button onClick={()=>setTickets(p=>p.map(x=>x.id===t.id?{...x,status:'In Progress'}:x))} style={{flex:1,padding:9,background:C.indigoBg,border:`1px solid ${C.indigo}`,borderRadius:10,color:C.indigo,fontSize:12,fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}>Start Work 🔧</button>}
                      <button onClick={()=>setTickets(p=>p.map(x=>x.id===t.id?{...x,status:'Resolved'}:x))} style={{flex:1,padding:9,background:'linear-gradient(135deg,#059669,#10b981)',border:'none',borderRadius:10,color:'white',fontSize:12,fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}>Mark Resolved ✅</button>
                    </div>
                  )}
                  {t.status==='Resolved' && <Chip label="Resolved ✅" color={C.success} bg={C.successBg}/>}
                </div>
              ))}
            </div>
          </>)}

          {/* PURCHASE MANAGER */}
          {staffRole === 'Purchase Manager' && (<>
            <div style={{background:'#fff',borderRadius:18,border:`1px solid ${C.border}`,padding:16}}>
              <p style={{margin:'0 0 12px',fontSize:15,fontWeight:800,color:C.text}}>🛒 Staff Item Requisitions</p>
              {demands.map(d=>(
                <div key={d.id} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:14,padding:12,marginBottom:8,display:'flex',justifyContent:'space-between',alignItems:'center',gap:10}}>
                  <div style={{flex:1}}>
                    <p style={{margin:0,fontSize:14,fontWeight:800,color:C.text}}>{d.item}</p>
                    <p style={{margin:'3px 0 0',fontSize:11,color:C.muted}}>Qty: {d.qty} · {d.reqBy} · {d.date}</p>
                    <p style={{margin:'2px 0 0',fontSize:11,color:C.muted}}>Vendor: {d.vendor}</p>
                  </div>
                  {d.status==='Pending'
                    ? <button onClick={()=>setDemands(p=>p.map(x=>x.id===d.id?{...x,status:'PO Sent'}:x))} style={{padding:'8px 12px',background:meta.accentBg,border:`1.5px solid ${meta.accent}`,borderRadius:10,color:meta.accent,fontSize:12,fontWeight:800,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>Create PO 📦</button>
                    : <Chip label="PO Sent ✓" color={C.success} bg={C.successBg}/>
                  }
                </div>
              ))}
            </div>
          </>)}

          {/* SECURITY */}
          {staffRole === 'Security Guard' && (<>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <button onClick={()=>setShowVisitor(true)} style={{padding:14,background:meta.grad,color:'white',border:'none',borderRadius:14,fontWeight:800,fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,fontFamily:'inherit',boxShadow:`0 4px 14px ${meta.accent}33`}}>
                <span className="material-symbols-outlined" style={{fontSize:18}}>person_add</span>Log Visitor
              </button>
              <button onClick={()=>setShowParcel(true)} style={{padding:14,background:'linear-gradient(135deg,#4f46e5,#6366f1)',color:'white',border:'none',borderRadius:14,fontWeight:800,fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,fontFamily:'inherit',boxShadow:'0 4px 14px rgba(79,70,229,.3)'}}>
                <span className="material-symbols-outlined" style={{fontSize:18}}>package_2</span>Log Parcel
              </button>
            </div>
            <div style={{background:'#fff',borderRadius:18,border:`1px solid ${C.border}`,padding:16}}>
              <Row style={{marginBottom:12}}><p style={{margin:0,fontSize:15,fontWeight:800,color:C.text}}>🛡️ Gate Entry Log</p><Chip label={`${visitors.filter(v=>v.status==='Inside').length} Inside`} color={C.success} bg={C.successBg}/></Row>
              {visitors.map(v=>(
                <div key={v.id} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:14,padding:12,marginBottom:8,display:'flex',justifyContent:'space-between',alignItems:'center',gap:10}}>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:6}}><span style={{fontSize:14,fontWeight:800,color:C.text}}>{v.name}</span><span style={{width:6,height:6,borderRadius:'50%',background:v.status==='Inside'?C.success:'#94a3b8',display:'inline-block'}}/></div>
                    <p style={{margin:'3px 0 0',fontSize:11,color:C.muted}}>{v.purpose} · In: {v.inTime}{v.outTime?` | Out: ${v.outTime}`:''}</p>
                  </div>
                  {v.status==='Inside' && <button onClick={()=>setVisitors(p=>p.map(x=>x.id===v.id?{...x,outTime:new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}),status:'Exited'}:x))} style={{padding:'7px 10px',background:C.dangerBg,border:`1px solid ${C.danger}`,borderRadius:10,color:C.danger,fontSize:11,fontWeight:800,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>Exit 🚪</button>}
                </div>
              ))}
            </div>
            <div style={{background:'#fff',borderRadius:18,border:`1px solid ${C.border}`,padding:16}}>
              <Row style={{marginBottom:12}}><p style={{margin:0,fontSize:15,fontWeight:800,color:C.text}}>📦 Courier Parcels</p><Chip label={`${parcels.filter(p=>p.status==='Pending').length} unclaimed`} color={C.warn} bg={C.warnBg}/></Row>
              {parcels.map(p=>(
                <div key={p.id} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:14,padding:12,marginBottom:8,display:'flex',justifyContent:'space-between',alignItems:'center',gap:10}}>
                  <div style={{flex:1}}>
                    <p style={{margin:0,fontSize:13,fontWeight:800,color:C.text}}>{p.student} · <span style={{color:C.primary}}>Rm {p.room}</span></p>
                    <p style={{margin:'3px 0 0',fontSize:11,color:C.muted}}>{p.carrier} · {p.tracking} · {p.date}</p>
                  </div>
                  <button onClick={()=>setParcels(prev=>prev.map(x=>x.id===p.id?{...x,status:x.status==='Pending'?'Claimed':'Pending'}:x))} style={{padding:'7px 10px',background:p.status==='Claimed'?C.successBg:meta.accentBg,border:`1px solid ${p.status==='Claimed'?C.success:meta.accent}`,borderRadius:10,color:p.status==='Claimed'?C.success:meta.accent,fontSize:11,fontWeight:800,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>
                    {p.status==='Claimed'?'Claimed ✅':'Hand Over'}
                  </button>
                </div>
              ))}
            </div>
            <button onClick={()=>alert('🚨 EMERGENCY ALERT sent to Admin & Security!')} style={{width:'100%',padding:16,background:'linear-gradient(135deg,#e11d48,#be123c)',color:'white',border:'none',borderRadius:14,fontSize:15,fontWeight:900,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,boxShadow:'0 6px 20px rgba(225,29,72,.4)',fontFamily:'inherit'}}>
              <span className="material-symbols-outlined" style={{fontSize:22}}>warning</span>EMERGENCY SOS ALERT 🚨
            </button>
          </>)}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          ATTENDANCE
         ══════════════════════════════════════════════════════════════════════ */}
      {view === 'inout' && (
        <div style={{padding:'14px 14px 32px',display:'flex',flexDirection:'column',gap:14}}>
          <div style={{background:meta.grad,borderRadius:18,padding:'20px 18px',color:'white'}}>
            <p style={{margin:0,fontSize:11,opacity:.8,fontWeight:700,textTransform:'uppercase'}}>Today's Shift Timer</p>
            <h2 style={{margin:'6px 0 2px',fontSize:34,fontWeight:900,letterSpacing:-1}}>{clocked?'07 : 45 : 12':'00 : 00 : 00'}</h2>
            <p style={{margin:'0 0 14px',fontSize:12,opacity:.85}}>{clocked?`Punched IN at ${clockIn}`:'Not currently punched in'}</p>
            <button onClick={punch} style={{padding:'10px 20px',background:'rgba(255,255,255,.2)',border:'1.5px solid rgba(255,255,255,.35)',borderRadius:12,color:'white',fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}>
              {clocked?'⏹ Punch Out Now':'▶ Punch In'}
            </button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
            {[{l:'Present',v:20,c:C.success},{l:'Absent',v:2,c:C.danger},{l:'Leave',v:1,c:C.warn}].map(s=>(
              <div key={s.l} style={{background:'#fff',borderRadius:14,border:`1px solid ${C.border}`,padding:14,textAlign:'center'}}>
                <p style={{fontSize:24,fontWeight:900,color:s.c,margin:0}}>{s.v}</p>
                <p style={{fontSize:12,color:C.muted,margin:'2px 0 0'}}>{s.l}</p>
              </div>
            ))}
          </div>
          <div style={{background:'#fff',borderRadius:18,border:`1px solid ${C.border}`,padding:16}}>
            <p style={{margin:'0 0 12px',fontSize:15,fontWeight:800,color:C.text}}>📋 Punch Log</p>
            {punchLog.map(p=>(
              <div key={p.id} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:12,padding:12,marginBottom:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <p style={{margin:0,fontSize:13,fontWeight:800,color:C.text}}>{p.date}</p>
                  <p style={{margin:'3px 0 0',fontSize:11,color:C.muted}}>In: <b>{p.inT}</b> · Out: <b>{p.outT||'—'}</b></p>
                </div>
                {p.hrs?<Chip label={p.hrs} color={C.primary} bg={C.primaryBg}/>:<Chip label="Active ●" color={C.success} bg={C.successBg}/>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SALARY
         ══════════════════════════════════════════════════════════════════════ */}
      {view === 'salary' && (
        <div style={{padding:'14px 14px 32px',display:'flex',flexDirection:'column',gap:14}}>
          <div style={{background:'linear-gradient(135deg,#0c1a2e,#0f2847)',borderRadius:18,padding:'20px 18px',color:'white'}}>
            <p style={{margin:0,fontSize:11,color:'#94a3b8',fontWeight:700,textTransform:'uppercase'}}>July 2026 · Net Estimated</p>
            <h2 style={{margin:'4px 0 0',fontSize:36,fontWeight:900}}>₹18,500</h2>
            <p style={{margin:'4px 0 0',fontSize:12,color:'#34d399'}}>↑ Pay date: 1 Aug 2026 · On Track</p>
          </div>
          <div style={{background:'#fff',borderRadius:18,border:`1px solid ${C.border}`,padding:16}}>
            <p style={{margin:'0 0 12px',fontSize:15,fontWeight:800,color:C.text}}>💰 Breakdown</p>
            {[{l:'Base Monthly',v:'₹16,000',c:C.text},{l:'Overtime (15 hrs)',v:'+₹2,500',c:C.success},{l:'Performance Bonus',v:'+₹1,000',c:C.success},{l:'Advance Deduction',v:'−₹1,000',c:C.danger}].map(row=>(
              <div key={row.l} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:`1px solid ${C.border}`}}>
                <span style={{fontSize:13,color:C.sub}}>{row.l}</span>
                <span style={{fontSize:14,fontWeight:800,color:row.c}}>{row.v}</span>
              </div>
            ))}
            <div style={{display:'flex',justifyContent:'space-between',padding:'12px 0 0'}}>
              <span style={{fontSize:15,fontWeight:900,color:C.text}}>Net Pay</span>
              <span style={{fontSize:20,fontWeight:900,color:meta.accent}}>₹18,500</span>
            </div>
          </div>
          <div style={{background:'#fff',borderRadius:18,border:`1px solid ${C.border}`,padding:16}}>
            <p style={{margin:'0 0 12px',fontSize:15,fontWeight:800,color:C.text}}>📄 Pay Slip History</p>
            {[{m:'June 2026',v:'₹17,800',d:'Paid 1 Jul'},{m:'May 2026',v:'₹16,500',d:'Paid 1 Jun'}].map(s=>(
              <div key={s.m} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:12,padding:12,display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <div>
                  <p style={{margin:0,fontSize:13,fontWeight:800,color:C.text}}>{s.m}</p>
                  <p style={{margin:'2px 0 0',fontSize:11,color:C.success}}>{s.d}</p>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <span style={{fontSize:16,fontWeight:900,color:C.text}}>{s.v}</span>
                  <button onClick={()=>alert(`Downloading ${s.m} Pay Slip...`)} style={{padding:'6px 10px',background:C.primaryBg,border:`1px solid ${C.primaryBg}`,borderRadius:8,color:C.primary,fontSize:11,fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}>PDF 📥</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          ITEM LIST
         ══════════════════════════════════════════════════════════════════════ */}
      {view === 'items' && (
        <div style={{padding:'14px 14px 32px',display:'flex',flexDirection:'column',gap:12}}>
          {STORE_ITEMS.map(item=>(
            <div key={item.id} style={{background:'#fff',borderRadius:16,border:`1px solid ${C.border}`,padding:14,display:'flex',justifyContent:'space-between',alignItems:'center',boxShadow:'0 2px 8px rgba(0,0,0,.03)'}}>
              <div>
                <p style={{margin:0,fontSize:14,fontWeight:800,color:C.text}}>{item.name}</p>
                <p style={{margin:'3px 0 0',fontSize:11,color:C.muted}}>{item.cat} · Min: {item.min}</p>
              </div>
              <div style={{textAlign:'right'}}>
                <p style={{margin:0,fontSize:15,fontWeight:900,color:C.text}}>{item.stock}</p>
                <Chip label={item.status} color={item.status==='In Stock'?C.success:item.status==='Low Stock'?C.warn:C.danger} bg={item.status==='In Stock'?C.successBg:item.status==='Low Stock'?C.warnBg:C.dangerBg}/>
              </div>
            </div>
          ))}
          {myDemands.length>0 && (<>
            <p style={{margin:'8px 0 6px',fontSize:13,fontWeight:800,color:C.text}}>📋 My Demands</p>
            {myDemands.map(d=>(
              <div key={d.id} style={{background:'#fff',borderRadius:14,border:`1px solid ${C.border}`,padding:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div><p style={{margin:0,fontSize:13,fontWeight:800,color:C.text}}>{d.item}</p><p style={{margin:'2px 0 0',fontSize:11,color:C.muted}}>Qty: {d.qty} · {d.date}</p></div>
                <Chip label={d.status} color={d.status==='Approved'?C.success:C.warn} bg={d.status==='Approved'?C.successBg:C.warnBg}/>
              </div>
            ))}
          </>)}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          CHAT — WHATSAPP STYLE WITH REMINDERS
         ══════════════════════════════════════════════════════════════════════ */}
      {view === 'chat' && (
        <div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 58px)'}}>
          
          {!activeContact ? (
            // Contacts List View
            <div style={{flex:1, overflowY:'auto', background:'#fff'}}>
              {sortedContacts.map(c => (
                <div key={c.id} onClick={() => setActiveContact(c)} style={{display:'flex',alignItems:'center',padding:'14px 16px',borderBottom:`1px solid ${C.border}`,cursor:'pointer',transition:'background .15s',gap:14}} onMouseEnter={e=>e.currentTarget.style.background=C.bg} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <div style={{position:'relative'}}>
                    <div style={{width:48,height:48,borderRadius:'50%',background:meta.accentBg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24}}>
                      {c.avatar}
                    </div>
                    {c.isPinned && <div style={{position:'absolute',bottom:0,right:-2,background:'#eab308',color:'white',width:18,height:18,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid white'}}><span className="material-symbols-outlined" style={{fontSize:10}}>push_pin</span></div>}
                  </div>
                  <div style={{flex:1, overflow:'hidden'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:4}}>
                      <span style={{fontSize:15,fontWeight:800,color:C.text}}>{c.name}</span>
                      <span style={{fontSize:11,color:C.muted,fontWeight:600}}>{c.time}</span>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <span style={{fontSize:13,color:C.sub,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{c.lastMsg}</span>
                      {c.reminder && <span className="material-symbols-outlined" style={{fontSize:16,color:'#d97706'}}>notifications_active</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Individual Chat View
            <div style={{flex:1, display:'flex', flexDirection:'column', background:'#f8fafc', height:'100%'}}>
              {/* Reminder Bar */}
              {activeContact.reminder && (
                <div style={{background:'#fef3c7',padding:'8px 16px',borderBottom:'1px solid #fde68a',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer'}} onClick={openReminder}>
                    <span className="material-symbols-outlined" style={{fontSize:16,color:'#b45309'}}>notifications_active</span>
                    <span style={{fontSize:12,fontWeight:700,color:'#92400e'}}>Reminder: {activeContact.reminder}</span>
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={openReminder} style={{background:'#fffbeb',border:'1px solid #fde68a',color:'#b45309',borderRadius:6,padding:'2px 8px',fontSize:11,fontWeight:800,cursor:'pointer'}}>Edit</button>
                    <button onClick={clearReminder} style={{background:'none',border:'none',color:'#d97706',fontSize:12,fontWeight:800,cursor:'pointer'}}>Clear</button>
                  </div>
                </div>
              )}

              {/* Messages Area */}
              <div style={{flex:1,overflowY:'auto',padding:'16px 14px',display:'flex',flexDirection:'column',gap:12}}>
                {(!chatHist[activeContact.id] || chatHist[activeContact.id].length === 0) && (
                  <div style={{textAlign:'center',padding:'40px 20px',color:C.muted}}>
                    <span className="material-symbols-outlined" style={{fontSize:48,display:'block',marginBottom:12,opacity:.4}}>chat_bubble</span>
                    <p style={{margin:0,fontSize:14}}>No messages yet. Send a message to start!</p>
                  </div>
                )}
                {(chatHist[activeContact.id] || []).map(m => (
                  <div key={m.id} style={{display:'flex',flexDirection:'column',alignItems:m.me?'flex-end':'flex-start',gap:4}}>
                    <div style={{maxWidth:'78%',background:m.me?meta.grad:'#fff',color:m.me?'white':C.text,borderRadius:m.me?'18px 18px 4px 18px':'18px 18px 18px 4px',padding:'11px 14px',boxShadow:m.me?`0 4px 12px ${meta.accent}33`:'0 2px 8px rgba(0,0,0,.06)'}}>
                      <p style={{margin:0,fontSize:14,lineHeight:1.5}}>{m.text}</p>
                    </div>
                    <span style={{fontSize:10,color:C.muted}}>{m.time}</span>
                  </div>
                ))}
                <div ref={chatEndRef}/>
              </div>

              {/* Input Bar */}
              <form onSubmit={sendMsg} style={{display:'flex',gap:8,padding:'12px 14px',background:'#fff',borderTop:`1px solid ${C.border}`,flexShrink:0}}>
                <input value={chatInput} onChange={e=>setChatInput(e.target.value)} placeholder="Type a message…"
                  style={{flex:1,padding:'12px 16px',border:`1.5px solid ${C.border}`,borderRadius:24,fontSize:14,outline:'none',fontFamily:'inherit',background:C.bg,color:C.text}}/>
                <button type="submit" style={{width:46,height:46,background:meta.grad,border:'none',borderRadius:'50%',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:`0 4px 12px ${meta.accent}44`,flexShrink:0}}>
                  <span className="material-symbols-outlined" style={{fontSize:20,color:'white'}}>send</span>
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          WORK REPORTS
         ══════════════════════════════════════════════════════════════════════ */}
      {view === 'reports' && (
        <div style={{padding:'14px 14px 32px',display:'flex',flexDirection:'column',gap:14}}>
          <div style={{background:'#fff',borderRadius:18,border:`1px solid ${C.border}`,padding:16}}>
            <p style={{margin:'0 0 12px',fontSize:15,fontWeight:800,color:C.text}}>📝 Submit Today's Report</p>
            <form onSubmit={submitReport} style={{display:'flex',flexDirection:'column',gap:12}}>
              <InputField label="Work Summary *" textarea required rows={4} value={rptText} onChange={e=>setRptText(e.target.value)} placeholder="Tasks completed, issues found, items needed…"/>
              <button type="submit" style={{padding:13,background:meta.grad,color:'white',border:'none',borderRadius:14,fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'inherit',boxShadow:`0 4px 14px ${meta.accent}33`}}>Submit Report 🚀</button>
            </form>
          </div>
          <div style={{background:'#fff',borderRadius:18,border:`1px solid ${C.border}`,padding:16}}>
            <p style={{margin:'0 0 12px',fontSize:15,fontWeight:800,color:C.text}}>📋 Past Reports</p>
            {rptHist.map(r=>(
              <div key={r.id} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:12,padding:12,marginBottom:8}}>
                <Row style={{marginBottom:6}}><span style={{fontSize:12,fontWeight:800,color:C.text}}>{r.date}</span><Chip label={r.status} color={r.status.includes('Reviewed')?C.success:C.warn} bg={r.status.includes('Reviewed')?C.successBg:C.warnBg}/></Row>
                <p style={{margin:0,fontSize:13,color:C.sub,lineHeight:1.5}}>{r.summary}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          REQUESTS
         ══════════════════════════════════════════════════════════════════════ */}
      {view === 'requests' && (
        <div style={{padding:'14px 14px 32px',display:'flex',flexDirection:'column',gap:14}}>
          <div style={{background:'#fff',borderRadius:18,border:`1px solid ${C.border}`,padding:16}}>
            <p style={{margin:'0 0 12px',fontSize:15,fontWeight:800,color:C.text}}>📬 New Request</p>
            <form onSubmit={submitRequest} style={{display:'flex',flexDirection:'column',gap:12}}>
              <SelectField label="Request Type" value={reqType} onChange={e=>setReqType(e.target.value)}>
                <option value="Leave">Casual / Sick Leave</option>
                <option value="Advance">Salary Advance</option>
                <option value="Tool">Equipment / Uniform</option>
              </SelectField>
              {reqType==='Advance' && <InputField label="Amount Needed (₹)" type="number" value={reqAmt} onChange={e=>setReqAmt(e.target.value)} placeholder="e.g. 2000"/>}
              <InputField label="Reason / Details *" required value={reqReason} onChange={e=>setReqReason(e.target.value)} placeholder="Briefly explain your request…"/>
              <button type="submit" style={{padding:13,background:meta.grad,color:'white',border:'none',borderRadius:14,fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'inherit',boxShadow:`0 4px 14px ${meta.accent}33`}}>Submit Request 🚀</button>
            </form>
          </div>
          <div style={{background:'#fff',borderRadius:18,border:`1px solid ${C.border}`,padding:16}}>
            <p style={{margin:'0 0 12px',fontSize:15,fontWeight:800,color:C.text}}>📋 My Requests</p>
            {myReqs.map(r=>(
              <div key={r.id} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:12,padding:12,display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <div><p style={{margin:0,fontSize:13,fontWeight:800,color:C.text}}>{r.type}</p><p style={{margin:'3px 0 0',fontSize:11,color:C.muted}}>{r.date}{r.amt!=='-'?` · ${r.amt}`:''}</p></div>
                <Chip label={r.status} color={r.status==='Approved'?C.success:r.status==='Pending'?C.warn:C.danger} bg={r.status==='Approved'?C.successBg:r.status==='Pending'?C.warnBg:C.dangerBg}/>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MODALS ────────────────────────────────────────────────────────── */}
      <Sheet show={showDemand} onClose={()=>setShowDemand(false)} title="Demand Item / Supplies" sub="Submit requisition to admin">
        <form onSubmit={submitDemand} style={{display:'flex',flexDirection:'column',gap:12}}>
          <InputField label="Item Description *" required value={dItem} onChange={e=>setDItem(e.target.value)} placeholder="e.g. Basmati Rice 25kg"/>
          <InputField label="Quantity" value={dQty} onChange={e=>setDQty(e.target.value)} placeholder="e.g. 2 bags"/>
          <InputField label="Note / Urgency" value={dNote} onChange={e=>setDNote(e.target.value)} placeholder="e.g. Needed for tonight"/>
          <button type="submit" style={{padding:14,background:meta.grad,color:'white',border:'none',borderRadius:14,fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'inherit',boxShadow:`0 4px 14px ${meta.accent}33`}}>Submit Demand 🚀</button>
        </form>
      </Sheet>

      <Sheet show={showBcast} onClose={()=>setShowBcast(false)} title="Broadcast — Food is Ready!" sub="Send meal notification">
        <form onSubmit={e=>{
          e.preventDefault();
          setShowBcast(false);
          const targetName = bTarget === 'All' ? 'All Students' : students.find(s=>s.id===Number(bStudentId))?.name;
          alert(`📢 ${bMeal} broadcast sent to ${targetName}!`);
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
          <button type="submit" style={{padding:14,background:'linear-gradient(135deg,#059669,#10b981)',color:'white',border:'none',borderRadius:14,fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 4px 14px rgba(16,185,129,.3)'}}>Send Notification 📢</button>
        </form>
      </Sheet>

      <Sheet show={showVisitor} onClose={()=>setShowVisitor(false)} title="Gate Visitor Entry" sub="Log a visitor at the gate">
        <form onSubmit={addVisitor} style={{display:'flex',flexDirection:'column',gap:12}}>
          <InputField label="Visitor Full Name *" required value={vName} onChange={e=>setVName(e.target.value)} placeholder="e.g. Rajesh Malhotra"/>
          <InputField label="Mobile Number" value={vPhone} onChange={e=>setVPhone(e.target.value)} placeholder="+91 98000 11122"/>
          <InputField label="Purpose & Room #" value={vPurp} onChange={e=>setVPurp(e.target.value)} placeholder="e.g. Parent visit – Rm 104"/>
          <button type="submit" style={{padding:14,background:meta.grad,color:'white',border:'none',borderRadius:14,fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'inherit',boxShadow:`0 4px 14px ${meta.accent}33`}}>Check-In Visitor ✅</button>
        </form>
      </Sheet>

      <Sheet show={showParcel} onClose={()=>setShowParcel(false)} title="Log Courier Parcel" sub="Record parcel received at gate">
        <form onSubmit={addParcel} style={{display:'flex',flexDirection:'column',gap:12}}>
          <InputField label="Student Name *" required value={pStu} onChange={e=>setPStu(e.target.value)} placeholder="e.g. Arjun Mehta"/>
          <InputField label="Room Number" value={pRoom} onChange={e=>setPRoom(e.target.value)} placeholder="e.g. 101"/>
          <SelectField label="Carrier" value={pCarr} onChange={e=>setPCarr(e.target.value)}><option>Amazon</option><option>Flipkart</option><option>BlueDart</option><option>Courier Express</option><option>India Post</option></SelectField>
          <InputField label="Tracking / AWB #" value={pTrk} onChange={e=>setPTrk(e.target.value)} placeholder="e.g. AMZ-88910"/>
          <button type="submit" style={{padding:14,background:'linear-gradient(135deg,#4f46e5,#6366f1)',color:'white',border:'none',borderRadius:14,fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 4px 14px rgba(79,70,229,.3)'}}>Log Parcel 📦</button>
        </form>
      </Sheet>

      {/* Reminder Bottom Sheet */}
      <Sheet show={showReminder} onClose={() => setShowReminder(false)} title="Set Chat Reminder" sub={activeContact ? `For ${activeContact.name}` : ''}>
        <form onSubmit={saveReminder} style={{display:'flex',flexDirection:'column',gap:12}}>
          <div style={{display:'flex', gap:10}}>
            <div style={{flex:1}}>
              <InputField label="Date" type="date" required value={remDate} onChange={e=>setRemDate(e.target.value)} />
            </div>
            <div style={{flex:1}}>
              <InputField label="Time" type="time" required value={remTime} onChange={e=>setRemTime(e.target.value)} />
            </div>
          </div>
          <InputField label="Reminder Reason" value={remReason} onChange={e=>setRemReason(e.target.value)} placeholder="e.g. Follow up on AC repair" />
          <div style={{display:'flex', gap:10, marginTop:4}}>
            <button type="button" onClick={() => setShowReminder(false)} style={{flex:1, padding:13, background:C.bg, color:C.text, border:`1px solid ${C.border}`, borderRadius:14, fontSize:14, fontWeight:800, cursor:'pointer', fontFamily:'inherit'}}>
              Cancel
            </button>
            <button type="submit" style={{flex:2, padding:13, background:meta.grad, color:'white', border:'none', borderRadius:14, fontSize:14, fontWeight:800, cursor:'pointer', fontFamily:'inherit', boxShadow:`0 4px 14px ${meta.accent}33`}}>
              Save Reminder
            </button>
          </div>
        </form>
      </Sheet>

    </div>
  );
}
