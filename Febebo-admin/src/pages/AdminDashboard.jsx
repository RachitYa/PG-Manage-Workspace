import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DetailedReceiptModal, { CollectPaymentModal } from '../components/DetailedReceiptModal';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { aggregateTenantDues, formatDateDisplay, BILL_TYPES } from '../utils/duesUtils';
import { fetchAllAdminPgs } from '../utils/pgUtils';

export default function AdminDashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('home');
  const [showAddTenantMenu, setShowAddTenantMenu] = useState(false);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [showAllModules, setShowAllModules] = useState(false);
  const [isEditingModules, setIsEditingModules] = useState(false);
  const [visibleModuleIds, setVisibleModuleIds] = useState([
    'account', 'mess', 'room', 'user', 'staff', 'visitor', 'vendor', 'inventory'
  ]);
  const [duesSheet, setDuesSheet] = useState(null); // selected dues person
  const [activeReceipt, setActiveReceipt] = useState(null);
  const [collectModalData, setCollectModalData] = useState(null);
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0);
  const [pendingNotifsCount, setPendingNotifsCount] = useState(0);
  const [visitorCount, setVisitorCount] = useState(0);
  const [vendorCount, setVendorCount] = useState(0);
  const [vendorPrevCount, setVendorPrevCount] = useState(null);
  const [toastMsg, setToastMsg] = useState('');

  const [leaveCount, setLeaveCount] = useState(0);
  const [complainCount, setComplainCount] = useState(0);
  const [chatCount, setChatCount] = useState(0);
  const [enquiryCount, setEnquiryCount] = useState(0);
  const [appCount, setAppCount] = useState(0);
  const [adminName, setAdminName] = useState('Admin');
  const { user, activePgId, switchPg } = useAuth();

  // ── Multi-PG Switcher ──────────────────────────────────
  const [showPgSwitcher, setShowPgSwitcher] = useState(false);
  const [pgList, setPgList] = useState([]);
  const longPressTimer = useRef(null);
  const longPressFired = useRef(false);


  useEffect(() => {
    if (!user?.uid) return;
    const checkNotifs = async () => {
      try {
        const now = new Date();
        const currentMonthName = now.toLocaleString('default', { month: 'long' });
        const todayStr = now.toISOString().split('T')[0];

        const safeGetDocs = (q, name) => getDocs(q).catch(e => { console.error(`Error fetching ${name}:`, e); return { empty: true, size: 0, docs: [] }; });
        const safeGetDoc = (ref, name) => getDoc(ref).catch(e => { console.error(`Error fetching ${name}:`, e); return { exists: () => false, data: () => ({}) }; });

        const matchesPg = (itemPgId) => {
          if (!activePgId || activePgId === 'primary') return true;
          return !itemPgId || itemPgId === activePgId || itemPgId === user.uid;
        };

        // 🔥 Massive Parallel Data Fetching! Execute all network requests simultaneously.
        const [
          qNotif, qUsers, qRooms, qReqs,
          qAdmin, qOwner, qProfile,
          qReceipts, qStaff, qAttendance, qVisitorsInside,
          qVisitorsPending, qLeavePending, qComplaints,
          qEnquiries, qApplications,
          qCustomDues, qMeterBills
        ] = await Promise.all([
          safeGetDocs(query(collection(db, 'notifications'), where('adminId', '==', user.uid), where('resolved', '==', false)), 'notifications'),
          safeGetDocs(query(collection(db, 'tenants'), where('adminId', '==', user.uid)), 'tenants'),
          safeGetDocs(query(collection(db, 'rooms'), where('adminId', '==', user.uid)), 'rooms'),
          safeGetDocs(query(collection(db, 'staff_requisitions'), where('adminId', '==', user.uid), where('pgId', '==', activePgId), where('status', '==', 'Pending Rate')), 'staff_requisitions'),
          safeGetDoc(doc(db, 'admins', user.uid), 'admins'),
          safeGetDoc(activePgId === 'primary' ? doc(db, 'pg_owners', user.uid) : doc(db, 'pg_owners', activePgId), 'pg_owners'),
          safeGetDoc(doc(db, 'pg_profiles', user.uid), 'pg_profiles'),
          safeGetDocs(query(collection(db, 'rent_receipts'), where('adminId', '==', user.uid)), 'rent_receipts'),
          safeGetDocs(query(collection(db, 'staff_tokens'), where('ownerUid', '==', user.uid), where('pgId', '==', activePgId)), 'staff_tokens'),
          safeGetDocs(query(collection(db, 'staff_attendance'), where('ownerUid', '==', user.uid), where('pgId', '==', activePgId), where('date', '==', todayStr), where('status', '==', 'Present')), 'staff_attendance'),
          safeGetDocs(query(collection(db, 'visitors'), where('adminId', '==', user.uid), where('pgId', '==', activePgId), where('status', '==', 'Inside')), 'visitors (Inside)'),
          safeGetDocs(query(collection(db, 'visitors'), where('adminId', '==', user.uid), where('pgId', '==', activePgId), where('marked', '==', false)), 'visitors (marked=false)'),
          safeGetDocs(query(collection(db, 'leave_requests'), where('adminId', '==', user.uid), where('pgId', '==', activePgId), where('status', '==', 'Pending')), 'leave_requests'),
          safeGetDocs(query(collection(db, 'complaints'), where('adminId', '==', user.uid), where('pgId', '==', activePgId)), 'complaints'),
          safeGetDocs(query(collection(db, 'enquiries'), where('adminId', '==', user.uid), where('pgId', '==', activePgId)), 'enquiries'),
          safeGetDocs(query(collection(db, 'pg_applications'), where('adminId', '==', user.uid), where('pgId', '==', activePgId), where('status', '==', 'Pending')), 'pg_applications'),
          safeGetDocs(query(collection(db, 'outstanding_dues'), where('adminId', '==', user.uid)), 'outstanding_dues'),
          safeGetDocs(query(collection(db, 'electricity_meter_bills'), where('adminId', '==', user.uid)), 'electricity_meter_bills')
        ]);

        const complaintsPendingCount = qComplaints.docs.filter(d => d.data().status === 'Pending' || d.data().status === 'Active').length;
        
        setVisitorCount(qVisitorsPending.size);
        setLeaveCount(qLeavePending.size);
        setComplainCount(complaintsPendingCount);
        setChatCount(0); // Chat unread counts require schema updates to be fully exact

        // Process Tenants, Rooms & Enquiries
        const tenants = qUsers.docs
          .map(d => ({ id: d.id, tenantId: d.id, ...d.data() }))
          .filter(d => matchesPg(d.pgId));
        
        const rooms = qRooms.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(d => matchesPg(d.pgId));
        
        // (Enquiry count is now handled by a real-time listener below)
        setAppCount(qApplications.size);

        const filteredNotifs = qNotif.docs.filter(d => matchesPg(d.data().pgId));
        const totalNotifs = filteredNotifs.length + qReqs.size;
        setPendingNotifsCount(totalNotifs);

        // Process Name
        const ownerData = qOwner.exists() ? qOwner.data() : {};
        const profileData = qProfile.exists() ? qProfile.data() : {};
        const adminData = qAdmin.exists() ? qAdmin.data() : {};
        const foundName = profileData.pgName || ownerData.pgName || 
                          ownerData.adminName || ownerData.name || ownerData.fullName ||
                          profileData.adminName || profileData.name ||
                          adminData.name || adminData.adminName ||
                          user.displayName || (user.email ? user.email.split('@')[0] : 'Admin');
        setAdminName(foundName);

        // Real room & seat stats (accurately synchronized with ManageRooms)
        const OCCUPIED_STATUSES = ['Approved', 'Current User', 'Notice', 'On Notice Period', 'Upcoming User'];
        const activeTenants = tenants.filter(d => OCCUPIED_STATUSES.includes(d.status));
        
        // Count tenants who have an allotted room
        const occupiedCount = rooms.length > 0
          ? rooms.reduce((acc, r) => acc + activeTenants.filter(t => t.roomNo === r.roomNo || t.room === r.roomNo).length, 0)
          : activeTenants.length;
        
        const definedCapacity = rooms.reduce((acc, r) => acc + (Number(r.beds) || 0), 0);
        const pdTotalSeats = Number(ownerData.propertyDetails?.totalSeats || profileData.propertyDetails?.totalSeats || 0);
        const totalSeats = Math.max(pdTotalSeats, definedCapacity);

        // --- Calculate Outstanding & Pending Dues ---
        const receipts = qReceipts.docs.map(d => ({ ...d.data(), id: d.id })).filter(d => matchesPg(d.pgId));
        const customDuesList = qCustomDues.docs.map(d => ({ id: d.id, ...d.data() })).filter(d => matchesPg(d.pgId));
        const meterBillsList = qMeterBills.docs.map(d => ({ id: d.id, ...d.data() })).filter(d => matchesPg(d.pgId));

        let pendingDuesCount = 0;
        let totalDueAmount = 0;
        const duesData = [];

        tenants.filter(t => t.status === 'Approved' || t.status === 'Current User' || t.status === 'Notice' || t.status === 'On Notice Period').forEach(t => {
          const tenantDues = aggregateTenantDues({
            tenant: t,
            rentReceipts: receipts,
            meterBills: meterBillsList,
            customDues: customDuesList,
            todayStr
          });

          if (tenantDues.totalOutstanding > 0) {
            pendingDuesCount++;
            totalDueAmount += tenantDues.totalOutstanding;
            
            const primaryItem = tenantDues.items[0];
            const dueLabel = primaryItem?.isOverdue
              ? `Overdue (${primaryItem.daysOverdue}d)`
              : `Due: ${formatDateDisplay(primaryItem?.dueDate)}`;

            duesData.push({
              id: t.id,
              name: t.name || 'Unknown',
              room: t.roomNo || t.room || '-',
              amount: tenantDues.totalOutstanding.toLocaleString('en-IN'),
              rent: t.rentAmount || 0,
              security: t.securityDeposit || 0,
              due: dueLabel,
              initials: (t.name || 'U').substring(0, 2).toUpperCase(),
              color: primaryItem?.isOverdue ? '#e11d48' : '#0891b2',
              img: t.photoUrl || t.profilePic || t.kyc?.profilePhoto || t.image || null,
              phone: t.phone || t.contactNo || '',
              joinDate: t.dateOfJoining || t.joiningDate || '-',
              plan: t.plan || '-',
              duesSummary: tenantDues,
              payHistory: []
            });
          }
        });
        
        setDues(duesData);
        // ---------------------------------------------------------------
        
        let dueValueStr = '0';
        if (totalDueAmount > 0) {
           dueValueStr = totalDueAmount >= 1000 ? `₹${(totalDueAmount/1000).toFixed(1).replace('.0', '')}K` : `₹${totalDueAmount}`;
        }

        setStats([
          { label: 'Seats Occupied', value: `${occupiedCount}/${totalSeats}`, sub: 'Total Seats', icon: 'meeting_room', color: '#0891b2', bg: '#ecfeff' },
          { label: 'Pending Dues', value: dueValueStr, sub: `${pendingDuesCount} tenants`, icon: 'payments', color: '#e11d48', bg: '#fff1f2' },
          { label: 'Staff Present', value: `${qAttendance.size}/${qStaff.size}`, sub: 'Today', icon: 'badge', color: '#059669', bg: '#ecfdf5' },
          { label: 'Visitors in PG', value: String(qVisitorsInside.size), sub: 'Inside Now', icon: 'recent_actors', color: '#d97706', bg: '#fffbeb' },
        ]);

      } catch (e) { console.error(e); } finally { setLoadingDashboard(false); }
    };
    checkNotifs();

    // ── Real-time listener for Enquiries ──
    const qEnquiries = query(collection(db, 'enquiries'), where('adminId', '==', user.uid), where('pgId', '==', activePgId));
    const unsubEnq = onSnapshot(qEnquiries, (snap) => {
      const newEnquiriesCount = snap.docs.filter(d => (d.data().enquiryStatus || 'New') === 'New').length;
      setEnquiryCount(newEnquiriesCount);
    });

    // ── Real-time listener for Notifications Count (Across all PGs) ──
    const unsubNotifs = onSnapshot(
        query(collection(db, 'notifications'), where('adminId', '==', user.uid), where('resolved', '==', false)),
        (snap) => {
            getDocs(query(collection(db, 'staff_requisitions'), where('adminId', '==', user.uid), where('status', '==', 'Pending Rate')))
              .then(reqSnap => {
                  setPendingNotifsCount(snap.size + reqSnap.size);
              }).catch(e => console.warn('Error fetching reqs count:', e));
        }
    );

    return () => { unsubEnq(); unsubNotifs(); };
  }, [user, activePgId, dashboardRefreshKey]);


  useEffect(() => {
    if (!user) return;
    const qReqs = query(
      collection(db, 'staff_requisitions'),
      where('adminId', '==', user.uid), where('pgId', '==', activePgId),
      where('status', '==', 'Pending Rate')
    );
    const unsub = onSnapshot(qReqs, (snap) => {
      const currentCount = snap.docs.length;
      setVendorCount(currentCount);
      
      // Update pending notifs count too
      getDocs(query(collection(db, 'notifications'), where('adminId', '==', user.uid), where('pgId', '==', activePgId), where('resolved', '==', false)))
        .then(nSnap => setPendingNotifsCount(nSnap.size + currentCount));
      setVendorPrevCount(prev => {
        if (prev !== null && currentCount > prev) {
          setToastMsg('New Staff Requisition received!');
          setTimeout(() => setToastMsg(''), 5000);
        }
        return currentCount;
      });
    });
    return () => unsub();
  }, [user]);

  // ── Fetch all PGs for this admin (exhaustive multi-schema discovery) ──
  useEffect(() => {
    if (!user?.uid) return;
    const fetchPgs = async () => {
      try {
        const pgs = await fetchAllAdminPgs(user);
        setPgList(pgs);
      } catch (e) {
        console.warn('Error fetching multi-PG list:', e);
      }
    };
    fetchPgs();
  }, [user]);

  // ── Long-press handler for profile tab ──
  const handleProfilePressStart = useCallback(() => {
    longPressFired.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      setShowPgSwitcher(true);
    }, 600);
  }, []);

  const handleProfilePressEnd = useCallback(() => {
    clearTimeout(longPressTimer.current);
    if (!longPressFired.current) {
      // Short tap → go to profile
      setShowAddTenantMenu(false);
      setActiveTab('profile');
      navigate('/admin-profile');
    }
  }, [navigate]);

  const handleProfilePressCancel = useCallback(() => {
    clearTimeout(longPressTimer.current);
  }, []);

  const handlePgSwitch = (pgId) => {
    setShowPgSwitcher(false);
    switchPg(pgId);
  };

  const MODULES = [
    { id: 'account',        label: 'Account',        desc: 'Ledgers',       icon: 'account_balance_wallet', gradient: 'linear-gradient(135deg,#0ea5e9,#0891b2)' },
    { id: 'inventory',      label: 'Inventory',      desc: 'Stock',          icon: 'inventory_2',            gradient: 'linear-gradient(135deg,#6366f1,#4f46e5)' },
    { id: 'vendor',         label: 'Vendor',         desc: 'Suppliers',      icon: 'local_shipping',         gradient: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', badgeCount: vendorCount },
    { id: 'room',           label: 'Seats',          desc: 'Spaces',         icon: 'meeting_room',           gradient: 'linear-gradient(135deg,#10b981,#059669)' },
    { id: 'user',           label: 'Users',          desc: 'Tenants',        icon: 'groups',                 gradient: 'linear-gradient(135deg,#f59e0b,#d97706)' },
    { id: 'staff',          label: 'Staff',          desc: 'HR & Pay',       icon: 'badge',                  gradient: 'linear-gradient(135deg,#f43f5e,#e11d48)' },
    { id: 'enquiry',        label: 'Enquiry',        desc: 'Leads',          icon: 'contact_support',        gradient: 'linear-gradient(135deg,#06b6d4,#0891b2)', badgeCount: enquiryCount + appCount },
    { id: 'visitor',        label: 'Visitors',       desc: 'Gate Log',       icon: 'recent_actors',          gradient: 'linear-gradient(135deg,#10b981,#047857)', badgeCount: visitorCount },
    { id: 'meter',          label: 'Meters',         desc: 'Readings',       icon: 'electric_meter',         gradient: 'linear-gradient(135deg,#f59e0b,#b45309)' },
    { id: 'mess',           label: 'Food & Mess',    desc: 'Menu & Students',icon: 'restaurant',             gradient: 'linear-gradient(135deg,#f59e0b,#d97706)' },
    { id: 'transportation', label: 'Transport',      desc: 'Drivers',        icon: 'directions_car',         gradient: 'linear-gradient(135deg,#16a34a,#15803d)' },
    { id: 'chat',           label: 'Chat',           desc: 'Messages',       icon: 'chat',                   gradient: 'linear-gradient(135deg,#ec4899,#db2777)', badgeCount: chatCount },
    { id: 'approvals',      label: 'Approvals',      desc: 'Room changes',   icon: 'verified',               gradient: 'linear-gradient(135deg,#eab308,#ca8a04)' },
    { id: 'hired_workers',  label: 'Workers',        desc: 'Shared Pool',    icon: 'engineering',            gradient: 'linear-gradient(135deg,#0ea5e9,#2563eb)' },
    { id: 'reports',        label: 'Reports',        desc: 'Analytics',      icon: 'bar_chart',              gradient: 'linear-gradient(135deg,#7c3aed,#6d28d9)' },
    { id: 'leave',          label: 'Leave',          desc: 'Requests',       icon: 'event_busy',             gradient: 'linear-gradient(135deg,#0891b2,#0e7490)', badgeCount: leaveCount },
    { id: 'complain',       label: 'Complaints',     desc: 'Issues',         icon: 'report',                 gradient: 'linear-gradient(135deg,#dc2626,#b91c1c)', badgeCount: complainCount },
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
    'Seats Occupied': '/manage-rooms',
    'Pending Dues': '/manage-account',
    'Staff Present': '/manage-staff',
    'Visitors in PG': '/visitor-log',
  };

  const [dues, setDues] = useState([]);

  const [stats, setStats] = useState([
    { label: 'Rooms Occupied', value: '-', sub: 'Loading...', icon: 'meeting_room',    color: '#0891b2', bg: '#ecfeff' },
    { label: 'Pending Dues',   value: '-', sub: 'Loading...', icon: 'payments',        color: '#e11d48', bg: '#fff1f2' },
    { label: 'Staff Present',  value: '-', sub: 'Today',      icon: 'badge',           color: '#059669', bg: '#ecfdf5' },
    { label: 'Visitors in PG', value: '-', sub: 'Loading...', icon: 'recent_actors',   color: '#d97706', bg: '#fffbeb' },
  ]);

  // First 8 modules shown in grid; rest in "See All" drawer
  const VISIBLE_MODULES = visibleModuleIds.map(id => MODULES.find(m => m.id === id)).filter(Boolean).slice(0, 8);

  const payStatusColor = (s) => s === 'Paid' ? '#059669' : s === 'Late' ? '#d97706' : '#e11d48';


  if (loadingDashboard) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8fafc' }}>
        <div style={{ width: 40, height: 40, border: '4px solid #e2e8f0', borderTop: '4px solid #0891b2', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: 16, fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 16, color: '#64748b', fontWeight: 600 }}>Loading Dashboard...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk', sans-serif", position: 'relative', overflowX: 'hidden', paddingBottom: 'max(110px, calc(90px + env(safe-area-inset-bottom, 0px)))' }}>

      {/* ── "See All" Modules Drawer ── */}
      {showAllModules && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div onClick={() => { setShowAllModules(false); setIsEditingModules(false); }} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)' }} />
          <div style={{ position: 'relative', background: 'white', borderRadius: '24px 24px 0 0', maxHeight: '80vh', overflowY: 'auto', padding: '0 0 40px' }}>
            <div style={{ position: 'sticky', top: 0, background: 'white', padding: '16px 20px 12px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 2 , paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))'}}>
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
                      <div style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#0891b2', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', zIndex: 10 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check</span>
                      </div>
                    )}
                    {!isEditingModules && mod.badgeCount > 0 && (
                      <div style={{ position: 'absolute', top: -6, right: -6, minWidth: 20, height: 20, padding: '0 6px', borderRadius: 10, background: '#ef4444', color: 'white', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(239,68,68,0.3)', zIndex: 5, boxSizing: 'border-box' }}>
                        {mod.badgeCount > 99 ? '99+' : mod.badgeCount}
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
              <div style={{ background: 'linear-gradient(135deg, #e11d48, #be123c)', borderRadius: 16, padding: '18px 20px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 1 }}>Outstanding Due</p>
                  <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 32, fontWeight: 800, color: 'white', margin: 0 }}>₹{duesSheet.amount}</p>
                  <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, margin: '4px 0 0', fontWeight: 600 }}>Due by {duesSheet.due}</p>
                </div>
                <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'rgba(255,255,255,0.15)' }}>payments</span>
              </div>

              {/* Itemized Due Breakdown — What is this due for? */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: 15, color: '#0f172a', margin: 0 }}>
                    What this Due is For ({duesSheet.duesSummary?.items?.length || 1})
                  </p>
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Itemized Breakdown</span>
                </div>

                {duesSheet.duesSummary?.items && duesSheet.duesSummary.items.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {duesSheet.duesSummary.items.map((item, idx) => {
                      const typeMeta = BILL_TYPES[item.type] || BILL_TYPES.custom || { label: 'Charge', icon: 'receipt_long', color: '#0284c7', bg: '#e0f2fe' };
                      const isOver = item.isOverdue || item.status === 'overdue';
                      return (
                        <div key={idx} style={{ background: '#f8fafc', border: `1.5px solid ${isOver ? '#fecdd3' : '#e2e8f0'}`, borderRadius: 14, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 38, height: 38, borderRadius: 10, background: isOver ? '#fff1f2' : (typeMeta.bg || '#f1f5f9'), display: 'flex', alignItems: 'center', justifyContent: 'center', color: isOver ? '#e11d48' : (typeMeta.color || '#0284c7') }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{typeMeta.icon || 'receipt_long'}</span>
                            </div>
                            <div>
                              <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>{item.title}</p>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                {item.description && <span style={{ fontSize: 12, color: '#64748b' }}>{item.description} · </span>}
                                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: isOver ? '#fee2e2' : '#e0f2fe', color: isOver ? '#be123c' : '#0369a1' }}>
                                  {isOver ? `Overdue (${item.daysOverdue}d)` : `Due: ${formatDateDisplay(item.dueDate)}`}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: 10 }}>
                            <p style={{ fontSize: 16, fontWeight: 800, color: isOver ? '#be123c' : '#0f172a', margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>
                              ₹{Number(item.amount || 0).toLocaleString('en-IN')}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '14px', textAlign: 'center' }}>
                    <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Standard Monthly Rent / Balance</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
                <button onClick={() => setCollectModalData(duesSheet)} style={{ background: '#0891b2', color: 'white', border: 'none', borderRadius: 12, padding: '13px 0', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 2px 8px rgba(8,145,178,0.25)' }}>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {duesSheet.payHistory.map((ph, i) => {
                  const amtVal = typeof ph.amount === 'number' ? ph.amount : parseInt(String(ph.amount).replace(/,/g, '')) || 0;
                  const rawDate = ph.date || '';
                  const displayDate = rawDate ? (() => { try { return new Date(rawDate?.toDate ? rawDate.toDate() : rawDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return rawDate; } })() : '—';
                  const isToken = ph.name?.toLowerCase().includes('token') || ph.paymentType === 'token';
                  return (
                    <div key={i} onClick={() => setActiveReceipt({
                      id: ph.id,
                      tenantName: ph.tenantName || duesSheet.name,
                      tenantId: ph.tenantId || duesSheet.id,
                      room: ph.roomNo || duesSheet.room,
                      month: ph.month,
                      rentMonth: ph.month,
                      datePaid: ph.date,
                      paymentMode: ph.mode,
                      receivedBy: ph.receivedBy || '',
                      senderUPI: ph.senderUPI || '',
                      receiverUPI: ph.receiverUPI || '',
                      transactionId: ph.transactionId || '',
                      note: ph.note || '',
                      items: ph.items && ph.items.length > 0 ? ph.items : [{ label: 'Room Rent', amount: amtVal }],
                      totalAmount: amtVal,
                      amountPaid: amtVal,
                      pendingAmount: ph.pendingAmount || 0,
                    })} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', padding: '12px 16px', borderRadius: 12, border: `1px solid ${isToken ? '#fef3c7' : '#e2e8f0'}`, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: isToken ? '#fef9c3' : '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                          {isToken ? '💰' : '💸'}
                        </div>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: '0 0 2px' }}>{ph.name || ph.month || 'Payment'}</p>
                          <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{displayDate}{ph.mode ? ` · ${ph.mode}` : ''}{ph.screenshot ? ' · 📸' : ''}</p>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>₹{Number(amtVal).toLocaleString()}</p>
                        <p style={{ fontSize: 11, color: ph.status === 'Paid' ? '#16a34a' : '#ef4444', fontWeight: 600, margin: 0 }}>
                          {ph.status === 'Paid' ? '✓ Paid' : ph.status}
                        </p>
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
      <div style={{ background: 'linear-gradient(160deg, #0c1a2e 0%, #0f2847 60%, #0c3461 100%)', padding: '0 20px 28px', paddingTop: 'max(0px, env(safe-area-inset-top, 0px))', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(56,189,248,0.12)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -20, left: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(99,102,241,0.1)', pointerEvents: 'none' }} />

        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px' }}>
          <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 26, fontWeight: 800, color: '#38bdf8', margin: 0 }}>Febebo</p>
          <button onClick={() => navigate('/request-box')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white', position: 'relative' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>notifications</span>
            {pendingNotifsCount > 0 && (
              <div style={{ position: 'absolute', top: -2, right: -2, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 8, background: '#ef4444', color: 'white', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #0f172a', boxSizing: 'border-box' }}>
                {pendingNotifsCount > 99 ? '99+' : pendingNotifsCount}
              </div>
            )}
          </button>
        </div>

        {/* Welcome */}
        <div style={{ marginTop: 14, marginBottom: 20 }}>
          <p style={{ color: '#94a3b8', fontSize: 13, margin: '0 0 4px' }}>
            {new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 17 ? 'Good Afternoon' : 'Good Evening'} 👋
          </p>
          <h2 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", color: 'white', fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: '-0.5px', textTransform: 'uppercase' }}>
            <span style={{ color: '#38bdf8' }}>{adminName || 'Admin'}</span>
          </h2>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>Here's what's happening today</p>
        </div>

        {/* 4 Stat Pills — all clickable */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {stats.map((s, i) => (
            <div key={i} onClick={() => {
              if (s.label === 'Pending Dues') {
                navigate(STAT_ROUTES[s.label], { state: { activeModule: 'total-rents', rentTab: 'pending' } });
              } else {
                navigate(STAT_ROUTES[s.label]);
              }
            }}
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
          <span onClick={() => setShowAllModules(true)} style={{ position: 'relative', fontSize: 12, color: '#0891b2', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}>
            See all <span className="material-symbols-outlined" style={{ fontSize: 14 }}>expand_more</span>
            {(() => {
              const hiddenBadgeCount = MODULES.filter(m => !visibleModuleIds.includes(m.id)).reduce((sum, m) => sum + (m.badgeCount || 0), 0);
              if (hiddenBadgeCount > 0) {
                return (
                  <div style={{ position: 'absolute', top: -8, right: -14, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 8, background: '#ef4444', color: 'white', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(239,68,68,0.3)', boxSizing: 'border-box' }}>
                    {hiddenBadgeCount > 99 ? '99+' : hiddenBadgeCount}
                  </div>
                );
              }
              return null;
            })()}
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
              <div style={{ position: 'relative', width: 40, height: 40, borderRadius: 12, background: mod.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {mod.badgeCount > 0 && (
                  <div style={{ position: 'absolute', top: -6, right: -6, minWidth: 20, height: 20, padding: '0 6px', borderRadius: 10, background: '#ef4444', color: 'white', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(239,68,68,0.3)', zIndex: 5, boxSizing: 'border-box' }}>
                    {mod.badgeCount > 99 ? '99+' : mod.badgeCount}
                  </div>
                )}
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
              <p style={{ fontSize: 11, color: '#e11d48', fontWeight: 600, margin: 0 }}>View Now</p>
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
          {dues.map((d, i) => (
            <div key={i} onClick={async () => {
              try {
                const rSnap = await getDocs(query(
                  collection(db, 'rent_receipts'),
                  where('tenantId', '==', d.id)
                ));
                const realHistory = rSnap.docs.map(doc => {
                  const r = doc.data();
                  return {
                    id: doc.id,
                    month: r.rentMonth || r.month || '',
                    date: r.datePaid || r.date || '',
                    mode: r.paymentMode || 'UPI',
                    amount: Number(r.totalAmount || r.amountPaid || r.amount || 0),
                    status: 'Paid',
                    items: r.items || [],
                    tenantId: r.tenantId || d.id,
                    tenantName: d.name,
                    roomNo: d.room,
                    receivedBy: r.receivedBy || '',
                    senderUPI: r.senderUPI || '',
                    receiverUPI: r.receiverUPI || '',
                    transactionId: r.transactionId || '',
                    note: r.note || '',
                    pendingAmount: r.pendingAmount || 0,
                  };
                });
                realHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
                setDuesSheet({ ...d, payHistory: realHistory });
              } catch (e) {
                setDuesSheet(d);
              }
            }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', padding: '12px 16px', borderRadius: 12, border: '1px solid #fee2e2', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e11d48', color: 'white', fontWeight: 700, fontSize: 14 }}>
                  {d.img
                    ? <img src={d.img} alt={d.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (d.initials || (d.name || 'U').substring(0, 2).toUpperCase())}
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: '0 0 2px' }}>{d.name}</p>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>Room {d.room} · {d.due}</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>₹{d.amount}</p>
                <p style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, margin: 0 }}>Outstanding</p>
              </div>
            </div>
          ))}
          <button onClick={() => navigate('/manage-account')} style={{ width: '100%', background: '#f8fafc', border: 'none', borderTop: '1px solid #f1f5f9', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#0891b2', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            Send All Reminders
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_right</span>
          </button>
        </div>
      </div>

      {/* ── Chat FAB – hide when add-tenant menu is open to avoid overlap ── */}
      {!showAddTenantMenu && (
        <button onClick={() => navigate('/chat')}
          style={{ position: 'fixed', right: 20, bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))', width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,#ec4899,#db2777)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(236,72,153,0.4)', cursor: 'pointer', zIndex: 49 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 24 }}>chat</span>
        </button>
      )}

      {/* ── Add Tenant popup rendered via portal to escape nav's transform containing block ── */}
      {showAddTenantMenu && ReactDOM.createPortal(
        <>
          <div onClick={() => setShowAddTenantMenu(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', zIndex: 51 }} />
          <div style={{ position: 'fixed', bottom: 'calc(68px + env(safe-area-inset-bottom, 0px))', left: '50%', transform: 'translateX(-75px)', background: '#fff', borderRadius: '16px', padding: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', zIndex: 52, display: 'flex', flexDirection: 'column', gap: '4px', width: '220px', border: '1px solid #e2e8f0' }}>
            <div onClick={() => { setShowAddTenantMenu(false); navigate('/manage-tenants', { state: { openAddModal: true } }); }} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', borderRadius: '10px', color: '#0f172a', fontWeight: '600', fontSize: '14px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#0891b2' }}>person_add</span>
              Add New Tenant
            </div>
            <div onClick={() => navigate('/already-residence')} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', borderRadius: '10px', color: '#0f172a', fontWeight: '600', fontSize: '14px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#0891b2' }}>how_to_reg</span>
              Already a Residence
            </div>
          </div>
        </>,
        document.body
      )}

      {/* ── BOTTOM NAV ── */}
      <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-around', alignItems: 'stretch', padding: '0 0 calc(4px + env(safe-area-inset-bottom, 0px)) 0', zIndex: 50 }}>
        {[
          { tab: 'home',    icon: 'home',            label: 'Dashboard', path: '/admin-dashboard' },
          { tab: 'add',     icon: 'person_add',      label: 'Add Tenant', path: '' },
          { tab: 'assign',  icon: 'assignment',      label: 'Assign Work', path: '/assign-work' },
        ].map(item => {
          const isActive = activeTab === item.tab || (item.tab === 'add' && showAddTenantMenu);
          return (
            <div key={item.tab} onClick={() => {
              if (item.tab === 'add') {
                setShowAddTenantMenu(!showAddTenantMenu);
                setActiveTab('add');
              } else {
                setShowAddTenantMenu(false);
                setActiveTab(item.tab);
                if (item.path) navigate(item.path);
              }
            }}
              style={{ display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, paddingTop: '10px', paddingBottom: '6px', cursor: 'pointer', color: isActive ? '#0891b2' : '#94a3b8', transition: 'color 0.2s', borderTop: isActive ? '2.5px solid #0891b2' : '2.5px solid transparent' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 24, fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                {item.icon}
              </span>
              <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500 }}>{item.label}</span>
            </div>
          );
        })}

        {/* Profile tab — short tap = navigate, long press = PG switcher */}
        <div
          onTouchStart={handleProfilePressStart}
          onTouchEnd={handleProfilePressEnd}
          onTouchCancel={handleProfilePressCancel}
          onMouseDown={handleProfilePressStart}
          onMouseUp={handleProfilePressEnd}
          onMouseLeave={handleProfilePressCancel}
          style={{ display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, paddingTop: '10px', paddingBottom: '6px', cursor: 'pointer', color: activeTab === 'profile' ? '#0891b2' : '#94a3b8', transition: 'color 0.2s', userSelect: 'none', WebkitUserSelect: 'none', borderTop: activeTab === 'profile' ? '2.5px solid #0891b2' : '2.5px solid transparent' }}>
          <div style={{ position: 'relative' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 24, fontVariationSettings: activeTab === 'profile' ? "'FILL' 1" : "'FILL' 0" }}>person</span>
            {pgList.length > 1 && (
              <span style={{ position: 'absolute', top: -3, right: -5, width: 8, height: 8, borderRadius: '50%', background: '#0891b2', border: '1.5px solid white' }} />
            )}
          </div>
          <span style={{ fontSize: 10, fontWeight: activeTab === 'profile' ? 700 : 500 }}>Profile</span>
        </div>
      </nav>

      {/* ── PG SWITCHER SHEET ── */}
      {showPgSwitcher && ReactDOM.createPortal(
        <div
          onClick={() => setShowPgSwitcher(false)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 3000, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 480, background: 'white', borderRadius: '24px 24px 0 0', padding: '20px 20px calc(32px + env(safe-area-inset-bottom, 0px))', animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)' }}>

            {/* Handle bar */}
            <div style={{ width: 40, height: 4, borderRadius: 2, background: '#e2e8f0', margin: '0 auto 20px' }} />

            <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 800, color: '#0f172a' }}>Switch PG</h3>
            <p style={{ margin: '0 0 18px', fontSize: 12, color: '#94a3b8' }}>Long press to switch between your PGs</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {pgList.map(pg => {
                const isActive = activePgId === pg.id;
                const initials = pg.pgName.split(' ').filter(Boolean).map(w => w[0]).join('').substring(0, 2).toUpperCase();
                const typeColor = pg.pgType === 'Boys' ? '#3b82f6' : pg.pgType === 'Girls' ? '#ec4899' : '#8b5cf6';
                return (
                  <div key={pg.id} onClick={() => handlePgSwitch(pg.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderRadius: 16, border: `1.5px solid ${isActive ? '#0891b2' : '#e2e8f0'}`, background: isActive ? '#ecfeff' : '#f8fafc', cursor: 'pointer', transition: 'all 0.15s' }}>
                    {/* Avatar */}
                    <div style={{ width: 46, height: 46, borderRadius: '50%', background: isActive ? 'linear-gradient(135deg,#0891b2,#0e7490)' : 'linear-gradient(135deg,#64748b,#475569)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ color: 'white', fontWeight: 800, fontSize: 17 }}>{initials}</span>
                    </div>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pg.pgName}</p>
                        {pg.pgType && (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 20, background: typeColor + '18', color: typeColor, flexShrink: 0 }}>{pg.pgType}</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: pg.status === 'Active' || pg.status === 'Approved' ? '#10b981' : '#f59e0b', flexShrink: 0 }} />
                        <p style={{ margin: 0, fontSize: 11, color: '#64748b', fontWeight: 500 }}>
                          {pg.status === 'Active' || pg.status === 'Approved' ? 'Active' : 'Pending Approval'}
                          {pg.location ? ` · ${pg.location}` : ''}
                        </p>
                      </div>
                    </div>
                    {/* Active check */}
                    {isActive && (
                      <span className="material-symbols-outlined" style={{ color: '#0891b2', fontSize: 22, flexShrink: 0 }}>check_circle</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add New PG button */}
            <button
              onClick={() => { setShowPgSwitcher(false); navigate('/create-pg-profile?mode=new'); }}
              style={{ width: '100%', padding: '14px', background: 'white', border: '1.5px dashed #0891b2', borderRadius: 16, color: '#0891b2', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add_circle</span>
              Add New PG
            </button>

            {/* Migrate Data Button */}
            <button
              onClick={async () => { 
                const { runMigration } = await import('./runMultiPgMigration');
                await runMigration(user.uid);
              }}
              style={{ width: '100%', padding: '14px', background: '#fffbeb', border: '1.5px solid #f59e0b', borderRadius: 16, color: '#b45309', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>database</span>
              Migrate Existing Data to Multi-PG
            </button>
          </div>
        </div>,
        document.body
      )}


      {/* Modals for Detailed Receipt Breakdown */}
      {activeReceipt && (
        <DetailedReceiptModal receipt={activeReceipt} onClose={() => setActiveReceipt(null)} />
      )}

      {collectModalData && (
        <CollectPaymentModal
          dueData={collectModalData}
          onClose={() => setCollectModalData(null)}
          onConfirm={async (newReceipt) => {
            if (user?.uid && collectModalData) {
              try {
                const tenantId = collectModalData.tenantId || collectModalData.id;
                const receiptPayload = {
                  adminId: user.uid,
                  pgId: activePgId || collectModalData.pgId || 'primary',
                  tenantId: tenantId || '',
                  tenantName: collectModalData.name || '',
                  roomNo: String(collectModalData.room || '').replace('Room ', ''),
                  rentMonth: newReceipt.rentMonth || newReceipt.month || new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
                  datePaid: new Date().toISOString(),
                  date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                  paymentMode: newReceipt.paymentMode || 'UPI',
                  receivedBy: newReceipt.receivedBy || 'Admin',
                  senderUPI: newReceipt.senderUPI || '',
                  receiverUPI: newReceipt.receiverUPI || '',
                  transactionId: newReceipt.transactionId || '',
                  note: newReceipt.note || '',
                  items: newReceipt.items || [],
                  totalAmount: Number(newReceipt.totalAmount || 0),
                  amountPaid: Number(newReceipt.totalAmount || 0),
                  pendingAmount: Number(newReceipt.pendingAmount || 0),
                  createdAt: new Date().toISOString()
                };

                await addDoc(collection(db, 'rent_receipts'), receiptPayload);

                // If admission balance was paid, update tenant remainingAmount
                if (tenantId) {
                  try {
                    const tRef = doc(db, 'tenants', tenantId);
                    const tSnap = await getDoc(tRef);
                    if (tSnap.exists()) {
                      const curRem = Number(tSnap.data().remainingAmount || 0);
                      if (curRem > 0) {
                        const newRem = Math.max(0, curRem - Number(newReceipt.totalAmount || 0));
                        await updateDoc(tRef, { remainingAmount: newRem });
                      }
                    }
                  } catch (err) {
                    console.error("Error updating tenant remainingAmount:", err);
                  }
                }

                // If dues were custom dues or meter bills, mark them as paid in Firestore
                if (collectModalData.duesSummary?.items) {
                  for (const it of collectModalData.duesSummary.items) {
                    if (it.source === 'custom_due' && it.docId) {
                      try {
                        await updateDoc(doc(db, 'outstanding_dues', it.docId), { status: 'Paid', isPaid: true, paidAt: new Date().toISOString() });
                      } catch (e) {}
                    }
                    if (it.source === 'meter_bill' && it.docId) {
                      try {
                        await updateDoc(doc(db, 'electricity_meter_bills', it.docId), { status: 'Paid', isPaid: true, paidAt: new Date().toISOString() });
                      } catch (e) {}
                    }
                  }
                }

                setCollectModalData(null);
                setDuesSheet(null);
                setActiveReceipt(receiptPayload);
                setDashboardRefreshKey(prev => prev + 1);
              } catch (e) {
                console.error("Error saving payment receipt:", e);
                alert("Failed to save payment: " + e.message);
              }
            } else {
              setCollectModalData(null);
              setActiveReceipt(newReceipt);
            }
          }}
        />
      )}


      {toastMsg && (
        <div style={{
          position: 'fixed', top: 'calc(20px + env(safe-area-inset-top, 0px))', right: 20, zIndex: 9999,
          background: '#0891b2', color: 'white', padding: '12px 20px',
          borderRadius: 8, fontWeight: 700, fontSize: 14,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex', alignItems: 'center', gap: 8,
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <span className="material-symbols-outlined">info</span>
          {toastMsg}
        </div>
      )}
    </div>
  );
}
