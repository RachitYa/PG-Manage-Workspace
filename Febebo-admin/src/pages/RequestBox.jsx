import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, getDoc, doc, updateDoc, writeBatch, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import ReviewDetailsModal from '../components/ReviewDetailsModal';
import { buildPgLookupMap, resolveDocPgInfo, PG_COLOR_PALETTES } from '../utils/pgColorUtils';
import { fetchAllAdminPgs } from '../utils/pgUtils';

const cyan = '#0891b2';

const CATEGORY_CONFIG = {
  document:    { icon: 'description',  color: '#6366f1', bg: '#eef2ff' },
  amenity:     { icon: 'bed',          color: '#0891b2', bg: '#ecfeff' },
  maintenance: { icon: 'build',        color: '#d97706', bg: '#fffbeb' },
  room:        { icon: 'meeting_room', color: '#10b981', bg: '#ecfdf5' },
  user:        { icon: 'person_add',   color: '#3b82f6', bg: '#eff6ff' },
  staff:       { icon: 'badge',        color: '#f59e0b', bg: '#fffbeb' },
  rent:        { icon: 'payments',     color: '#ef4444', bg: '#fef2f2' },
  inventory:   { icon: 'inventory_2',  color: '#0891b2', bg: '#ecfeff' },
  pay_later:   { icon: 'hourglass_top', color: '#ea580c', bg: '#ffedd5' },
};

export default function RequestBox() {
  const navigate = useNavigate();
  const { user, activePgId, switchPg } = useAuth();
  
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pgList, setPgList] = useState([]);
  const [selectedPgFilter, setSelectedPgFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('Pending');
  
  const [reviewModalData, setReviewModalData] = useState(null);
  const [approveLoading, setApproveLoading] = useState(false);
  const [payReviewModal, setPayReviewModal] = useState(null);
  const [customPayAmount, setCustomPayAmount] = useState('');
  const [staffReqModal, setStaffReqModal] = useState(null);
  const [photoLightbox, setPhotoLightbox] = useState(null);

  // Exchange Approval Modal State & Refs
  const [approvingExchangeItem, setApprovingExchangeItem] = useState(null);
  const [issuedPhoto, setIssuedPhoto] = useState(null);
  const [issuedNote, setIssuedNote] = useState('');
  const [isApprovingExchangeLoading, setIsApprovingExchangeLoading] = useState(false);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const handlePhotoCapture = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 900;
        let width = img.width;
        let height = img.height;
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        setIssuedPhoto(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Fetch all PGs and all Notifications across all PGs
  useEffect(() => {
    if (!user?.uid) return;
    
    const fetchAllData = async () => {
      setLoading(true);
      try {
        // 1. Fetch all PGs owned by this admin (exhaustive multi-schema discovery)
        let pgs = [];
        try {
          pgs = await fetchAllAdminPgs(user);
        } catch (e) {
          console.warn('Error fetching PGs in RequestBox:', e);
        }

        if (pgs.length === 0) {
          pgs.push({ id: 'primary', pgName: 'Main PG', isPrimary: true });
        }
        setPgList(pgs);

        const pgLookupMap = buildPgLookupMap(pgs, user.uid);
        const results = [];

        // 2. Fetch from 'notifications' collection (Unified across all PGs for this admin)
        const qNotif = query(collection(db, 'notifications'), where('adminId', '==', user.uid));
        const snapNotif = await getDocs(qNotif);
        const batch = writeBatch(db);
        let hasUpdates = false;
        
        snapNotif.forEach(d => {
          const data = d.data();
          const docPgId = data.pgId || 'primary';
          const pgInfo = resolveDocPgInfo(docPgId, pgLookupMap, user.uid);
          
          results.push({ 
            id: d.id, 
            ...data, 
            pgId: docPgId,
            pgInfo: pgInfo,
            source: 'notification' 
          });
        });
        
        if (hasUpdates) {
          batch.commit().catch(e => console.error("Failed to auto-resolve notifications", e));
        }

        // 3. Fetch Pending Tenants/Users across all PGs
        const qUsers = query(collection(db, 'tenants'), where('adminId', '==', user.uid));
        const snapUsers = await getDocs(qUsers);
        snapUsers.forEach(d => {
          const data = d.data();
          if (data.status === 'Pending' || data.status === 'Upcoming User' || !data.status) {
            const docPgId = data.pgId || 'primary';
            const pgInfo = resolveDocPgInfo(docPgId, pgLookupMap, user.uid);
            results.push({
              id: 'user_' + d.id,
              tenant: data.name || 'Resident',
              room: data.room || data.roomNo || 'N/A',
              phone: data.phone || '',
              type: 'New User Approval',
              desc: `New student ${data.name || 'Resident'} has signed up and needs approval.`,
              date: data.createdAt || new Date().toISOString(),
              resolved: false,
              category: 'user',
              source: 'tenant',
              originalId: d.id,
              tenantId: d.id,
              pgId: docPgId,
              pgInfo: pgInfo
            });
          }
        });

        // 4. Fetch Pending Staff Requisitions across all PGs
        const qReqs = query(collection(db, 'staff_requisitions'), where('adminId', '==', user.uid), where('status', '==', 'Pending Rate'));
        const snapReqs = await getDocs(qReqs);
        snapReqs.forEach(d => {
          const data = d.data();
          const docPgId = data.pgId || 'primary';
          const pgInfo = resolveDocPgInfo(docPgId, pgLookupMap, user.uid);
          results.push({
            id: 'req_' + d.id,
            tenant: data.staffName || 'Staff',
            room: 'N/A',
            phone: '',
            type: 'Staff Requisition',
            desc: `Requested ${data.qty}x ${data.item}. Pending rate approval.`,
            date: data.date || data.createdAt || new Date().toISOString(),
            resolved: false,
            category: 'staff',
            source: 'requisition',
            originalId: d.id,
            pgId: docPgId,
            pgInfo: pgInfo
          });
        });

        // 5. Fetch Staff Requests across all PGs
        const qStaffReqs = query(collection(db, 'staff_requests'), where('adminId', '==', user.uid), where('status', '==', 'Pending'));
        const snapStaffReqs = await getDocs(qStaffReqs);
        snapStaffReqs.forEach(d => {
          const data = d.data();
          const docPgId = data.pgId || 'primary';
          const pgInfo = resolveDocPgInfo(docPgId, pgLookupMap, user.uid);
          results.push({
            id: 'sreq_' + d.id,
            tenant: data.staffName || 'Staff',
            room: 'N/A',
            phone: '',
            type: data.type || 'Staff Request',
            desc: `Reason: ${data.reason}` + (data.amt && data.amt !== '-' ? ` | Amount: ${data.amt}` : ''),
            date: data.createdAt || data.date || new Date().toISOString(),
            resolved: false,
            category: 'staff',
            source: 'staff_request',
            originalId: d.id,
            rawData: data,
            pgId: docPgId,
            pgInfo: pgInfo
          });
        });

        // 6. Fetch Inventory Exchange Requests across all PGs
        const qInvEx = query(collection(db, 'inventory_exchange_requests'), where('adminId', '==', user.uid));
        const snapInvEx = await getDocs(qInvEx);
        snapInvEx.forEach(d => {
          const data = d.data();
          const docPgId = data.pgId || 'primary';
          const pgInfo = resolveDocPgInfo(docPgId, pgLookupMap, user.uid);
          const alreadyExists = results.some(r => r.exchangeRequestId === d.id || r.id === 'inv_ex_' + d.id || (r.source === 'notification' && r.exchangeRequestId === d.id));
          if (!alreadyExists) {
            results.push({
              id: 'inv_ex_' + d.id,
              exchangeRequestId: d.id,
              tenant: data.tenantName || 'Student',
              room: data.roomNo || 'N/A',
              phone: data.tenantPhone || '',
              type: 'Inventory Exchange',
              desc: `Exchange requested for ${data.itemName} (${data.reason}): ${data.description}`,
              date: data.createdAt || data.date || new Date().toISOString(),
              resolved: data.status !== 'Pending',
              status: data.status || 'Pending',
              category: 'inventory',
              source: 'inventory_exchange',
              originalId: d.id,
              itemName: data.itemName,
              reason: data.reason,
              description: data.description,
              photo: data.photo || null,
              issuedItemPhoto: data.issuedItemPhoto || null,
              issuedItemNote: data.issuedItemNote || null,
              tenantId: data.tenantId,
              pgId: docPgId,
              pgInfo: pgInfo
            });
          }
        });

        // 7. Fetch Room Change Requests across all PGs
        const qRoomReqs = query(collection(db, 'room_change_requests'), where('adminId', '==', user.uid));
        const snapRoomReqs = await getDocs(qRoomReqs);
        snapRoomReqs.forEach(d => {
          const data = d.data();
          const docPgId = data.pgId || 'primary';
          const pgInfo = resolveDocPgInfo(docPgId, pgLookupMap, user.uid);
          const alreadyExists = results.some(r => r.id === 'rc_' + d.id);
          if (!alreadyExists) {
            results.push({
              id: 'rc_' + d.id,
              tenant: data.tenantName || 'Resident',
              room: data.currentRoom || data.roomNo || 'N/A',
              phone: data.tenantPhone || '',
              type: 'Room Change Request',
              desc: `Shift request from Room ${data.currentRoom || 'N/A'} (Bed ${data.currentBed || '1'}) to Room ${data.targetRoom || 'Preferred'}. Reason: ${data.reason || 'Not specified'}`,
              date: data.createdAt || data.date || new Date().toISOString(),
              resolved: data.status === 'Approved' || data.status === 'Rejected',
              status: data.status || 'Pending',
              category: 'room',
              source: 'room_change',
              originalId: d.id,
              rawData: data,
              pgId: docPgId,
              pgInfo: pgInfo
            });
          }
        });

        // Sort by timestamp descending (newest first)
        results.sort((a, b) => {
          const tA = a.timestamp || a.createdAt || a.date || '';
          const tB = b.timestamp || b.createdAt || b.date || '';
          const dateA = new Date(tA).getTime();
          const dateB = new Date(tB).getTime();
          
          if (isNaN(dateA) && isNaN(dateB)) return 0;
          if (isNaN(dateA)) return 1;
          if (isNaN(dateB)) return -1;
          
          return dateB - dateA;
        });

        setRequests(results);
      } catch (err) {
        console.error("Error fetching notifications across PGs:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [user]);

  // Context Switcher helper when taking actions on other PG items
  const ensurePgContext = (req) => {
    if (req?.pgInfo?.id && req.pgInfo.id !== activePgId && switchPg) {
      // Save for subsequent pages
      localStorage.setItem('activePgId', req.pgInfo.id);
    }
  };

  const handlePaymentAction = async (req, actionType) => {
    try {
      const tenantId = req.tenantId || req.userId;
      if (!tenantId) return alert('No tenant ID found for this request');
      
      const userRef = doc(db, 'users', tenantId);
      
      if (req.type === 'partial_payment_request') {
        if (actionType === 'Approve') {
          await updateDoc(userRef, { 'subscribedPG.kycStatus': 'payment_approved_kyc_pending', 'subscribedPG.partialApproved': true });
          await addDoc(collection(db, 'users', tenantId, 'notifications'), { title: '✅ Request Approved', desc: 'Admin approved your partial payment request. Please fill your details to unlock the dashboard.', type: 'success', action: 'VIEW_DASHBOARD', unread: true, createdAt: new Date().toISOString() });
        } else {
          await updateDoc(userRef, { 'subscribedPG.kycStatus': null, 'subscribedPG.paymentVerificationPending': false });
          await addDoc(collection(db, 'users', tenantId, 'notifications'), { title: '❌ Request Denied', desc: 'Admin denied your partial payment request.', type: 'error', action: 'VIEW_PAYMENTS', unread: true, createdAt: new Date().toISOString() });
        }
      } else if (req.type === 'full_remaining_payment' && actionType === 'Approve') {
        await updateDoc(userRef, { 'subscribedPG.kycStatus': 'payment_approved_kyc_pending' });
        await addDoc(collection(db, 'users', tenantId, 'notifications'), { title: '✅ Payment Verified', desc: 'Admin verified your full payment. Please fill your details to unlock the dashboard.', type: 'success', action: 'VIEW_DASHBOARD', unread: true, createdAt: new Date().toISOString() });
      }

      await updateDoc(doc(db, 'notifications', req.id), { resolved: true });
      setRequests(prev => prev.map(r => r.id === req.id ? { ...r, resolved: true } : r));
    } catch (err) {
      console.error(err);
      alert('Failed to process action');
    }
  };

  const handleExchangeAction = async (req, action) => {
    try {
      const exId = req.exchangeRequestId || req.originalId;
      const tId = req.tenantId || req.userId;
      const itemName = req.itemName || 'item';

      if (action === 'Approve') {
        setApprovingExchangeItem(req);
        setIssuedPhoto(null);
        setIssuedNote('');
        return;
      } else {
        const reason = window.prompt("Reason for declining this exchange request (optional):", "Item is in acceptable condition or replacement currently unavailable");
        if (reason === null) return;

        if (exId) {
          try {
            await updateDoc(doc(db, 'inventory_exchange_requests', exId), {
              status: 'Rejected',
              rejectionReason: reason,
              resolvedAt: new Date().toISOString()
            });
          } catch (e) { console.warn('Exchange doc update error:', e); }
        }

        if (tId) {
          try {
            const uReqSnap = await getDocs(query(collection(db, 'users', tId, 'requests'), where('exchangeRequestId', '==', exId)));
            const batchPromises = uReqSnap.docs.map(d => updateDoc(d.ref, { status: 'Rejected' }));
            await Promise.all(batchPromises);
          } catch (e) { console.warn('User request update error:', e); }

          await addDoc(collection(db, 'users', tId, 'notifications'), {
            title: '❌ Exchange Request Declined',
            desc: `Your exchange request for ${itemName} was declined: ${reason}`,
            type: 'error',
            action: 'VIEW_DASHBOARD',
            unread: true,
            createdAt: new Date().toISOString()
          });
        }

        if (req.source === 'notification') {
          await updateDoc(doc(db, 'notifications', req.id), { resolved: true });
        }
        setRequests(prev => prev.map(r => r.id === req.id ? { ...r, resolved: true, status: 'Rejected' } : r));
      }
    } catch (err) {
      console.error('Error handling exchange action:', err);
      alert('Failed to process exchange action.');
    }
  };

  const confirmApproveExchange = async () => {
    if (!approvingExchangeItem) return;
    setIsApprovingExchangeLoading(true);
    try {
      const req = approvingExchangeItem;
      const exId = req.exchangeRequestId || req.originalId;
      const tId = req.tenantId || req.userId;
      const itemName = req.itemName || 'item';
      const nowIso = new Date().toISOString();

      if (exId) {
        try {
          await updateDoc(doc(db, 'inventory_exchange_requests', exId), {
            status: 'Approved',
            issuedItemPhoto: issuedPhoto || null,
            issuedItemNote: issuedNote.trim() || null,
            approvedAt: nowIso,
            approvedBy: user?.name || user?.email || 'Admin',
            resolvedAt: nowIso
          });
        } catch (e) { console.warn('Exchange doc update error:', e); }
      }

      if (tId) {
        try {
          const uReqSnap = await getDocs(query(collection(db, 'users', tId, 'requests'), where('exchangeRequestId', '==', exId)));
          const batchPromises = uReqSnap.docs.map(d => updateDoc(d.ref, {
            status: 'Approved',
            issuedItemPhoto: issuedPhoto || null,
            issuedItemNote: issuedNote.trim() || null,
            approvedAt: nowIso
          }));
          await Promise.all(batchPromises);
        } catch (e) { console.warn('User request update error:', e); }

        await addDoc(collection(db, 'users', tId, 'notifications'), {
          title: '📦 Exchange Approved!',
          desc: `Your exchange request for ${itemName} has been approved. A replacement has been issued${issuedNote.trim() ? `: "${issuedNote.trim()}"` : ''}. Please inspect and confirm receipt.`,
          type: 'success',
          action: 'VIEW_DASHBOARD',
          unread: true,
          createdAt: nowIso
        });
      }

      if (req.source === 'notification') {
        await updateDoc(doc(db, 'notifications', req.id), { resolved: true });
      }

      setRequests(prev => prev.map(r => (r.id === req.id || r.exchangeRequestId === exId) ? {
        ...r,
        resolved: true,
        status: 'Approved',
        issuedItemPhoto: issuedPhoto || null,
        issuedItemNote: issuedNote.trim() || null
      } : r));

      setApprovingExchangeItem(null);
      setIssuedPhoto(null);
      setIssuedNote('');
      alert(`Exchange request for ${itemName} approved successfully!`);
    } catch (err) {
      console.error('Error approving exchange in RequestBox:', err);
      alert('Failed to approve exchange request.');
    } finally {
      setIsApprovingExchangeLoading(false);
    }
  };

  const handleResolve = async (req) => {
    ensurePgContext(req);
    if (req.source === 'notification') {
      if (req.action === 'VIEW_TENANTS') {
        try {
          await updateDoc(doc(db, 'notifications', req.id), { resolved: true });
        } catch (e) { console.error(e); }
        navigate('/manage-tenants', { state: { tab: 'Upcoming User' } });
      } else {
        try {
          await updateDoc(doc(db, 'notifications', req.id), { resolved: true });
          setRequests(prev => prev.map(r => r.id === req.id ? { ...r, resolved: true } : r));
        } catch (e) { console.error(e); }
      }
    } else if (req.source === 'tenant') {
      navigate('/manage-tenants');
    } else if (req.source === 'requisition') {
      navigate('/manage-account');
    } else if (req.source === 'staff_request') {
      setStaffReqModal(req);
    } else if (req.source === 'room_change') {
      navigate('/approvals', { state: { approvalType: 'RoomChanges' } });
    }
  };

  const handleAttendanceReview = async (req, newStatus) => {
    if (newStatus === 'present') {
      setPayReviewModal(req);
      setCustomPayAmount('');
      return;
    }
    try {
      if (req.attDocId) {
        await updateDoc(doc(db, 'staff_attendance', req.attDocId), { status: newStatus });
      }
      await updateDoc(doc(db, 'notifications', req.id), { resolved: true });
      setRequests(prev => prev.map(r => r.id === req.id ? { ...r, resolved: true } : r));
    } catch (e) { console.error('Failed to review attendance:', e); }
  };

  const handleStaffReqAction = async (status) => {
    if (!staffReqModal) return;
    try {
      await updateDoc(doc(db, 'staff_requests', staffReqModal.originalId), { status });
      await addDoc(collection(db, 'notifications'), {
         staffId: staffReqModal.rawData.staffId,
         adminId: user.uid, 
         pgId: staffReqModal.pgId || activePgId, 
         title: `Request ${status}`,
         desc: `Your request for ${staffReqModal.rawData.type} was ${status}.`,
         type: 'Staff Request',
         date: new Date().toISOString(),
         read: false
      });
      setRequests(prev => prev.filter(r => r.id !== staffReqModal.id));
      setStaffReqModal(null);
    } catch (e) {
      console.error(e);
    }
  };

  const submitPayReview = async (amount) => {
    if (!payReviewModal) return;
    try {
      if (payReviewModal.attDocId) {
        await updateDoc(doc(db, 'staff_attendance', payReviewModal.attDocId), { 
           status: 'present', 
           dailyPay: Number(amount)
        });
      }
      await updateDoc(doc(db, 'notifications', payReviewModal.id), { resolved: true });
      setRequests(prev => prev.map(r => r.id === payReviewModal.id ? { ...r, resolved: true } : r));
      setPayReviewModal(null);
    } catch (e) {
      console.error(e);
      alert('Failed to submit pay review');
    }
  };

  const handleApproveDetails = async (tId) => {
    if (!reviewModalData) return;
    setApproveLoading(true);
    try {
      await updateDoc(doc(db, 'users', tId), {
        'subscribedPG.status': 'Approved',
        'subscribedPG.kycStatus': 'approved'
      });
      try {
        await updateDoc(doc(db, 'tenants', tId), {
          isApproved: true,
          status: 'Current User',
          pgStatus: 'Current User',
          kycStatus: 'approved'
        });
      } catch (err) {
        console.warn('Tenant doc update optional:', err);
      }
      await updateDoc(doc(db, 'notifications', reviewModalData.id), {
        resolved: true
      });
      try {
        await addDoc(collection(db, 'users', tId, 'notifications'), {
          title: '🎉 Details Approved!',
          desc: 'Your details have been approved by the admin. Your dashboard is now fully unlocked!',
          type: 'success',
          action: 'VIEW_DASHBOARD',
          unread: true,
          createdAt: new Date().toISOString()
        });
      } catch (err) {
        console.warn('User notification optional:', err);
      }
      setRequests(prev => prev.map(r => r.id === reviewModalData.id ? { ...r, resolved: true } : r));
      setReviewModalData(null);
    } catch (e) {
      console.error(e);
      alert("Error approving student details.");
    } finally {
      setApproveLoading(false);
    }
  };

  // Helper date & time formatters
  const formatTime = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d)) return '';
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };
  
  const getCategoryLabel = (isoString) => {
    if (!isoString) return 'Older';
    const d = new Date(isoString);
    if (isNaN(d)) return 'Older';
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Filter requests by PG and status
  const filteredByPg = requests.filter(req => {
    if (selectedPgFilter === 'all') return true;
    if (selectedPgFilter === 'primary') {
      return req.pgInfo?.isPrimary || req.pgId === 'primary' || req.pgId === user?.uid || !req.pgId;
    }
    return req.pgId === selectedPgFilter || req.pgInfo?.id === selectedPgFilter;
  });

  const shown = filteredByPg.filter(r => {
    if (activeTab === 'Pending') return !r.resolved;
    if (activeTab === 'Resolved') return r.resolved;
    return true;
  });

  const pendingCountTotal = requests.filter(r => !r.resolved).length;
  const resolvedCountTotal = requests.filter(r => r.resolved).length;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Hanken Grotesk', sans-serif", paddingBottom: 50 }}>
      
      {/* ── HEADER WITH PG PORTFOLIO STATS ── */}
      <div style={{ background: 'linear-gradient(145deg, #0c1a2e 0%, #0f2847 60%, #0c3461 100%)', paddingTop: 'max(16px, env(safe-area-inset-top, 16px))', padding: '16px 16px 20px', color: 'white' }}>
        
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button 
              onClick={() => navigate('/admin-dashboard')} 
              style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 12, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white', backdropFilter: 'blur(4px)' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back_ios_new</span>
            </button>
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: 'white', letterSpacing: '-0.3px' }}>Notifications</h1>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>
                {pgList.length > 1 ? `Multi-PG Hub · ${pgList.length} Properties` : 'Unified Notification Hub'}
              </p>
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', borderRadius: 12, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, border: '1px solid rgba(255,255,255,0.15)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#f59e0b' }}>notifications_active</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#ffffff' }}>{pendingCountTotal} Pending</span>
          </div>
        </div>

        {/* ── MULTI-PG SELECTOR FILTER BAR (WITH DISTINCT PG COLORS) ── */}
        {pgList.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                Filter By Property
              </span>
              <span style={{ fontSize: 11, color: '#38bdf8', fontWeight: 700 }}>
                {selectedPgFilter === 'all' ? 'Showing All Properties' : (pgList.find(p => p.id === selectedPgFilter)?.pgName || 'Selected PG')}
              </span>
            </div>

            {/* Horizontal Scrollable Chips */}
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
              {/* "All PGs" Chip */}
              <button
                onClick={() => setSelectedPgFilter('all')}
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 12,
                  border: selectedPgFilter === 'all' ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.15)',
                  background: selectedPgFilter === 'all' ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.08)',
                  color: selectedPgFilter === 'all' ? '#ffffff' : '#cbd5e1',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  backdropFilter: 'blur(6px)'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: selectedPgFilter === 'all' ? '#38bdf8' : '#94a3b8' }}>domain</span>
                All Properties
                <span style={{ background: selectedPgFilter === 'all' ? '#38bdf8' : 'rgba(255,255,255,0.2)', color: selectedPgFilter === 'all' ? '#0f172a' : '#ffffff', fontSize: 10, fontWeight: 900, padding: '1px 6px', borderRadius: 8 }}>
                  {requests.length}
                </span>
              </button>

              {/* Individual PG Chips with their unique color palette */}
              {pgList.map((pg, idx) => {
                const pgMap = buildPgLookupMap(pgList, user?.uid);
                const pgInfo = pgMap[pg.id] || resolveDocPgInfo(pg.id, pgMap, user?.uid);
                const isSelected = selectedPgFilter === pg.id;
                const pgReqCount = requests.filter(r => (pg.id === 'primary' ? (r.pgInfo?.isPrimary || r.pgId === 'primary') : (r.pgId === pg.id || r.pgInfo?.id === pg.id))).length;

                return (
                  <button
                    key={pg.id || idx}
                    onClick={() => setSelectedPgFilter(pg.id)}
                    style={{
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 14px',
                      borderRadius: 12,
                      border: isSelected ? `2px solid ${pgInfo.color.primary}` : '1px solid rgba(255,255,255,0.15)',
                      background: isSelected ? pgInfo.color.bg : 'rgba(255,255,255,0.08)',
                      color: isSelected ? pgInfo.color.text : '#e2e8f0',
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      backdropFilter: 'blur(6px)'
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: pgInfo.color.dot, boxShadow: `0 0 8px ${pgInfo.color.dot}` }} />
                    <span>{pg.pgName || `PG #${idx + 1}`}</span>
                    <span style={{ 
                      background: isSelected ? pgInfo.color.badgeBg : 'rgba(255,255,255,0.2)', 
                      color: isSelected ? pgInfo.color.text : '#ffffff', 
                      fontSize: 10, 
                      fontWeight: 900, 
                      padding: '1px 6px', 
                      borderRadius: 8,
                      border: isSelected ? `1px solid ${pgInfo.color.border}` : 'none'
                    }}>
                      {pgReqCount}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* ── STATUS TABS (Pending / Resolved / All) ── */}
      <div style={{ padding: '12px 16px', background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 8, position: 'sticky', top: 0, zIndex: 20 }}>
        {[
          { id: 'Pending', label: 'Pending Action', count: filteredByPg.filter(r => !r.resolved).length, color: '#ea580c' },
          { id: 'Resolved', label: 'Resolved / Done', count: filteredByPg.filter(r => r.resolved).length, color: '#10b981' },
          { id: 'All', label: 'All Items', count: filteredByPg.length, color: '#0284c7' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '8px 4px',
              borderRadius: 10,
              border: activeTab === tab.id ? `1.5px solid ${tab.color}` : '1px solid #e2e8f0',
              background: activeTab === tab.id ? `${tab.color}10` : '#f8fafc',
              color: activeTab === tab.id ? tab.color : '#64748b',
              fontSize: 12,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <span>{tab.label}</span>
            <span style={{ background: activeTab === tab.id ? tab.color : '#cbd5e1', color: 'white', fontSize: 10, fontWeight: 900, padding: '1px 5px', borderRadius: 6 }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── NOTIFICATIONS FEED ── */}
      <div style={{ padding: '16px' }}>
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ display: 'inline-block', width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: cyan, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <p style={{ marginTop: 12, fontSize: 13, color: '#64748b', fontWeight: 600 }}>Loading notifications across your PGs...</p>
          </div>
        ) : shown.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: 20, border: '1px solid #e2e8f0', marginTop: 10 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#94a3b8' }}>notifications_off</span>
            </div>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: '#0f172a' }}>No notifications found</h3>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: 13 }}>
              {selectedPgFilter !== 'all' ? 'No alerts for this property.' : 'You are all caught up on all properties!'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {Object.entries(
              shown.reduce((acc, req) => {
                const timeVal = req.timestamp || req.date || req.createdAt || '';
                const label = getCategoryLabel(timeVal);
                if (!acc[label]) acc[label] = [];
                acc[label].push(req);
                return acc;
              }, {})
            ).map(([dateLabel, reqs]) => (
              <div key={dateLabel} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                
                {/* Date Category Heading */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 4px' }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    {dateLabel}
                  </span>
                  <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                  <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>
                    {reqs.length} item{reqs.length !== 1 ? 's' : ''}
                  </span>
                </div>
                
                {/* Cards List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {reqs.map((req) => {
                    const cat = CATEGORY_CONFIG[req.category] || CATEGORY_CONFIG.amenity;
                    const timeVal = req.timestamp || req.date || req.createdAt || '';
                    const pgInfo = req.pgInfo || resolveDocPgInfo(req.pgId, buildPgLookupMap(pgList, user?.uid), user?.uid);

                    return (
                      <div 
                        key={req.id} 
                        style={{ 
                          background: 'white', 
                          borderRadius: 18, 
                          border: `1.5px solid ${pgInfo.color.border || '#e2e8f0'}`, 
                          borderLeft: `5.5px solid ${pgInfo.color.stripe || '#0284c7'}`,
                          overflow: 'hidden', 
                          boxShadow: '0 3px 8px rgba(0,0,0,0.03)',
                          transition: 'transform 0.15s ease'
                        }}
                      >
                        <div style={{ padding: '14px 16px' }}>
                          
                          {/* Top Row: PG Badge + Category Icon + Type + Time */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                              <div style={{ width: 34, height: 34, borderRadius: 10, background: cat.bg, color: cat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{cat.icon}</span>
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <h4 style={{ margin: 0, fontWeight: 800, fontSize: 14, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {req.type || req.title || 'Notification'}
                                </h4>
                                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{formatTime(timeVal)}</span>
                              </div>
                            </div>

                            {/* 🏷️ DEDICATED PG COLOR BADGE / PILL */}
                            <div 
                              style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: 5, 
                                background: pgInfo.color.badgeBg, 
                                color: pgInfo.color.text, 
                                border: `1px solid ${pgInfo.color.border}`, 
                                padding: '3px 8px', 
                                borderRadius: 8, 
                                fontSize: 11, 
                                fontWeight: 800,
                                flexShrink: 0,
                                letterSpacing: 0.2
                              }}
                              title={`Property: ${pgInfo.name}`}
                            >
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: pgInfo.color.dot }} />
                              <span>{pgInfo.name}</span>
                            </div>
                          </div>
                          
                          {/* Resident & Room Subtext */}
                          {req.tenant && (
                            <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#94a3b8' }}>person</span>
                              {req.tenant} {(req.room && req.room !== 'N/A') && `· Room ${req.room}`}
                            </p>
                          )}

                          {/* Message / Description */}
                          <p style={{ margin: '0 0 12px', fontSize: 13, color: '#334155', lineHeight: 1.45 }}>
                            {req.desc || req.message || req.description || 'No additional details.'}
                          </p>
                          
                          {/* Damage Photo (Student proof) */}
                          {req.photo && (
                            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10, background: '#f8fafc', padding: 8, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                              <img
                                src={req.photo}
                                alt="Proof"
                                onClick={() => setPhotoLightbox(req.photo)}
                                style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover', border: `1.5px solid ${cyan}`, cursor: 'pointer', flexShrink: 0 }}
                              />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <span onClick={() => setPhotoLightbox(req.photo)} style={{ fontSize: 12, color: cyan, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>zoom_in</span>
                                  Student Proof Photo
                                </span>
                                <span style={{ fontSize: 11, color: '#64748b', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Tap photo to inspect proof</span>
                              </div>
                            </div>
                          )}

                          {/* Issued Replacement Photo */}
                          {req.issuedItemPhoto && (
                            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10, background: '#f0fdf4', padding: 8, borderRadius: 12, border: '1px solid #bbf7d0' }}>
                              <img
                                src={req.issuedItemPhoto}
                                alt="Issued Replacement"
                                onClick={() => setPhotoLightbox(req.issuedItemPhoto)}
                                style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover', border: '1.5px solid #16a34a', cursor: 'pointer', flexShrink: 0 }}
                              />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <span onClick={() => setPhotoLightbox(req.issuedItemPhoto)} style={{ fontSize: 12, color: '#16a34a', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                                  Issued Replacement Item
                                </span>
                                <span style={{ fontSize: 11, color: '#15803d', display: 'block' }}>{req.issuedItemNote || 'Replacement issued by Admin'}</span>
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 4, borderTop: '1px solid #f1f5f9' }}>
                            {req.phone && (
                              <a href={`tel:${req.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#ecfeff', color: cyan, border: '1px solid #a5f3fc', borderRadius: 9, padding: '7px 12px', textDecoration: 'none', fontSize: 12, fontWeight: 700 }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>call</span>
                                Call
                              </a>
                            )}
                            
                            {!req.resolved && req.type === 'Attendance_Review' && (
                              <>
                                <button
                                  onClick={() => handleAttendanceReview(req, 'present')}
                                  style={{ flex: 1, background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: 9, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>check_circle</span>
                                  Mark Present
                                </button>
                                <button
                                  onClick={() => handleAttendanceReview(req, 'absent')}
                                  style={{ flex: 1, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 9, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>cancel</span>
                                  Mark Absent
                                </button>
                              </>
                            )}

                            {(!req.resolved && (req.type === 'Inventory Exchange' || req.category === 'inventory')) && (
                              <>
                                <button
                                  onClick={() => handleExchangeAction(req, 'Reject')}
                                  style={{ flex: 1, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 9, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>close</span>
                                  Reject
                                </button>
                                <button
                                  onClick={() => handleExchangeAction(req, 'Approve')}
                                  style={{ flex: 1, background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: 9, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>check</span>
                                  Approve Exchange
                                </button>
                              </>
                            )}

                            {(req.resolved && (req.type === 'Inventory Exchange' || req.category === 'inventory')) && (
                              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '6px 12px', borderRadius: 9, background: req.status === 'Approved' ? '#ecfdf5' : '#fef2f2', color: req.status === 'Approved' ? '#059669' : '#dc2626', fontSize: 12, fontWeight: 700 }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{req.status === 'Approved' ? 'check_circle' : 'cancel'}</span>
                                {req.status === 'Approved' ? 'Exchange Approved' : 'Exchange Rejected'}
                              </div>
                            )}
                            
                            {req.type === 'Student Details Review' && (
                              <button
                                onClick={() => setReviewModalData(req)}
                                style={{ flex: 1, background: '#0f172a', color: 'white', border: 'none', borderRadius: 9, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                                Review Details
                              </button>
                            )}

                            {!req.resolved && req.source === 'notification' && req.type === 'partial_payment_request' && (
                              <>
                                <button
                                  onClick={() => handlePaymentAction(req, 'Deny')}
                                  style={{ flex: 1, background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3', borderRadius: 9, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>close</span>
                                  Deny
                                </button>
                                <button
                                  onClick={() => handlePaymentAction(req, 'Approve')}
                                  style={{ flex: 1, background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: 9, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>check</span>
                                  Approve
                                </button>
                              </>
                            )}
                            
                            {!req.resolved && req.source === 'notification' && req.type === 'full_remaining_payment' && (
                              <button
                                onClick={() => handlePaymentAction(req, 'Approve')}
                                style={{ flex: 1, background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: 9, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>check</span>
                                Verify & Approve
                              </button>
                            )}

                            {!req.resolved && req.source === 'notification' && req.action === 'VIEW_TENANTS' && req.type !== 'partial_payment_request' && req.type !== 'full_remaining_payment' && (
                              <button
                                onClick={() => handleResolve(req)}
                                style={{ flex: 1, background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: 9, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>open_in_new</span>
                                {req.type === 'kyc_submitted' ? 'Review Details' : 'View Upcoming User'}
                              </button>
                            )}

                            {!req.resolved && req.source === 'staff' && (
                              <button
                                onClick={() => handleResolve(req)}
                                style={{ flex: 1, background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: 9, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>open_in_new</span>
                                Review & Action
                              </button>
                            )}

                            {!req.resolved && req.source === 'staff_request' && (
                              <button
                                onClick={() => handleResolve(req)}
                                style={{ flex: 1, background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: 9, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>open_in_new</span>
                                Review & Action
                              </button>
                            )}

                            {!req.resolved && req.source === 'tenant' && (
                              <button
                                onClick={() => handleResolve(req)}
                                style={{ flex: 1, background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: 9, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>person_check</span>
                                Review & Allot Room
                              </button>
                            )}

                            {req.resolved && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10b981', fontSize: 11, fontWeight: 700, padding: '4px 8px', background: '#ecfdf5', borderRadius: 6 }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check_circle</span>
                                Resolved
                              </div>
                            )}

                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ReviewDetailsModal
        isOpen={!!reviewModalData}
        onClose={() => setReviewModalData(null)}
        userId={reviewModalData?.tenantId}
        onApprove={handleApproveDetails}
        approveLoading={approveLoading}
      />

      {/* Staff Request Modal */}
      {staffReqModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
          <div style={{ background: 'white', width: '100%', maxWidth: 480, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: '24px 20px', animation: 'slideUp 0.3s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Review Staff Request</h3>
              <span className="material-symbols-outlined" onClick={() => setStaffReqModal(null)} style={{ cursor: 'pointer', color: '#94a3b8' }}>close</span>
            </div>
            
            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, marginBottom: 24 }}>
              <p style={{ margin: '0 0 8px', fontSize: 14, color: '#475569' }}><strong>Staff:</strong> {staffReqModal.tenant}</p>
              <p style={{ margin: '0 0 8px', fontSize: 14, color: '#475569' }}><strong>Property:</strong> {staffReqModal.pgInfo?.name || 'Main PG'}</p>
              <p style={{ margin: '0 0 8px', fontSize: 14, color: '#475569' }}><strong>Type:</strong> {staffReqModal.rawData.type}</p>
              {staffReqModal.rawData.amt && staffReqModal.rawData.amt !== '-' && (
                <p style={{ margin: '0 0 8px', fontSize: 14, color: '#475569' }}><strong>Amount:</strong> {staffReqModal.rawData.amt}</p>
              )}
              <p style={{ margin: 0, fontSize: 14, color: '#475569' }}><strong>Reason:</strong> {staffReqModal.rawData.reason}</p>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                onClick={() => handleStaffReqAction('Rejected')}
                style={{ flex: 1, padding: '16px', background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
              >
                Deny
              </button>
              <button 
                onClick={() => handleStaffReqAction('Approved')}
                style={{ flex: 1, padding: '16px', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pay Review Modal */}
      {payReviewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
          <div style={{ background: 'white', width: '100%', maxWidth: 480, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: '24px 20px', animation: 'slideUp 0.3s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Pay Staff (Partial Day)</h3>
              <span className="material-symbols-outlined" onClick={() => setPayReviewModal(null)} style={{ cursor: 'pointer', color: '#94a3b8' }}>close</span>
            </div>
            
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
              This staff member logged fewer hours than a full shift. You are marking them Present. Please specify their pay for today.
            </p>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 6 }}>Custom Pay Amount (₹)</label>
              <input type="number" placeholder="Enter amount..." value={customPayAmount} onChange={e => setCustomPayAmount(e.target.value)} style={{ width: '100%', padding: '14px', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 16, fontFamily: 'inherit', background: 'white', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                onClick={() => submitPayReview(Number(customPayAmount))}
                disabled={!customPayAmount}
                style={{ flex: 1, padding: '16px', background: customPayAmount ? '#0891b2' : '#cbd5e1', color: 'white', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: customPayAmount ? 'pointer' : 'not-allowed' }}
              >
                Pay Custom Amount
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── APPROVE EXCHANGE MODAL WITH OPTIONAL PHOTO UPLOADER ── */}
      {approvingExchangeItem && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 20, maxWidth: 480, width: '100%', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 22 }}>check_circle</span>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>Approve Exchange</h3>
                  <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Item: {approvingExchangeItem.itemName || 'Inventory Item'}</p>
                </div>
              </div>
              <button onClick={() => setApprovingExchangeItem(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#64748b' }}>close</span>
              </button>
            </div>

            {/* Student Request Info */}
            <div style={{ background: '#f8fafc', borderRadius: 12, padding: 12, border: '1px solid #e2e8f0', marginBottom: 16 }}>
              <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                Student: {approvingExchangeItem.tenant || approvingExchangeItem.tenantName || 'Student'} {(approvingExchangeItem.room && approvingExchangeItem.room !== 'N/A') ? `· Room ${approvingExchangeItem.room}` : ''}
              </p>
              <p style={{ margin: '0 0 4px', fontSize: 12, color: '#64748b' }}>
                Property: <strong>{approvingExchangeItem.pgInfo?.name || 'Main PG'}</strong>
              </p>
              <p style={{ margin: '0 0 4px', fontSize: 12, color: '#64748b' }}>
                Reason: <strong>{approvingExchangeItem.reason || 'Exchange Requested'}</strong>
              </p>
              {(approvingExchangeItem.description || approvingExchangeItem.desc) && (
                <p style={{ margin: 0, fontSize: 12, color: '#475569' }}>"{approvingExchangeItem.description || approvingExchangeItem.desc}"</p>
              )}
            </div>

            {/* Optional Photo of Issued Replacement Item */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
                Photo of Replacement Item <span style={{ fontSize: 11, fontWeight: 500, color: '#94a3b8' }}>(Optional)</span>
              </label>
              <p style={{ margin: '0 0 10px', fontSize: 12, color: '#64748b' }}>
                Capture or attach a photo of the new replacement item issued to the student:
              </p>

              {issuedPhoto ? (
                <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1.5px solid #10b981', maxHeight: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
                  <img src={issuedPhoto} alt="Issued Item Preview" style={{ width: '100%', maxHeight: 180, objectFit: 'contain' }} />
                  <button
                    onClick={() => setIssuedPhoto(null)}
                    style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    style={{ padding: '14px', borderRadius: 12, border: '1.5px dashed #0284c7', background: '#f0f9ff', color: '#0284c7', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 24 }}>photo_camera</span>
                    <span>Take Photo</span>
                  </button>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    ref={cameraInputRef}
                    style={{ display: 'none' }}
                    onChange={handlePhotoCapture}
                  />

                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    style={{ padding: '14px', borderRadius: 12, border: '1.5px dashed #64748b', background: '#f8fafc', color: '#475569', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 24 }}>photo_library</span>
                    <span>From Gallery</span>
                  </button>
                  <input
                    type="file"
                    accept="image/*"
                    ref={galleryInputRef}
                    style={{ display: 'none' }}
                    onChange={handlePhotoCapture}
                  />
                </div>
              )}
            </div>

            {/* Optional Note / Remarks */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
                Remarks / Condition Note <span style={{ fontSize: 11, fontWeight: 500, color: '#94a3b8' }}>(Optional)</span>
              </label>
              <input
                type="text"
                value={issuedNote}
                onChange={e => setIssuedNote(e.target.value)}
                placeholder="e.g. Fresh mattress issued, standard clean condition"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => setApprovingExchangeItem(null)}
                style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmApproveExchange}
                disabled={isApprovingExchangeLoading}
                style={{ flex: 2, padding: '12px', borderRadius: 12, border: 'none', background: '#059669', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                {isApprovingExchangeLoading ? 'Approving...' : 'Confirm & Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PHOTO LIGHTBOX ── */}
      {photoLightbox && (
        <div
          onClick={() => setPhotoLightbox(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }}
        >
          <img
            src={photoLightbox}
            alt="Preview"
            style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: 12, boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setPhotoLightbox(null)}
            style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}
    </div>
  );
}