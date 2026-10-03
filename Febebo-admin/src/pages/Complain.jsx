import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

// Admin advances: Active → Pending → Resolved (awaiting student confirmation) → Closed (student confirmed)
// Disputed items (student declined) go to Disputed
const STATUS_FLOW = { Active: 'Pending', Pending: 'Resolved', Resolved: 'Active', Disputed: 'Active' };

const STATUS_CONFIG = {
  Active:   { bg: '#fff1f2', text: '#e11d48', border: '#fecaca', icon: 'error',       badgeBg: '#e11d48' },
  Pending:  { bg: '#fffbeb', text: '#d97706', border: '#fde68a', icon: 'schedule',    badgeBg: '#d97706' },
  Resolved: { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0', icon: 'task_alt',    badgeBg: '#16a34a' },
  Closed:   { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0', icon: 'check_circle', badgeBg: '#059669' },
  Approved: { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0', icon: 'check_circle', badgeBg: '#059669' },
  Rejected: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca', icon: 'cancel',      badgeBg: '#dc2626' },
  Disputed: { bg: '#fff1f2', text: '#be123c', border: '#fecaca', icon: 'gavel',       badgeBg: '#be123c' },
};

const PRIORITY_CONFIG = {
  High:   { color: '#e11d48', bg: '#fff1f2' },
  Medium: { color: '#d97706', bg: '#fffbeb' },
  Low:    { color: '#059669', bg: '#ecfdf5' },
};

const PRIORITY_ICON = { High: 'priority_high', Medium: 'remove', Low: 'south' };
const INITIALS_COLORS = ['#3b82f6','#f43f5e','#0284c7','#10b981','#f59e0b','#8b5cf6'];

const COMPLAINT_TABS = ['All', 'Active', 'Pending', 'Resolved', 'Closed', 'Disputed'];
const REQUEST_TABS = ['All', 'Pending', 'Approved', 'Confirmed', 'Rejected', 'Disputed'];

export default function Complain() {
  const navigate = useNavigate();
  const { user, activePgId } = useAuth();

  const [activeSection, setActiveSection] = useState('complaints'); // 'complaints' | 'requests'
  const [complaints, setComplaints] = useState([]);
  const [exchangeRequests, setExchangeRequests] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Sub-tab filters
  const [activeComplaintTab, setActiveComplaintTab] = useState('All');
  const [activeRequestTab, setActiveRequestTab] = useState('All');

  // Detail Modal & Lightbox
  const [detailItem, setDetailItem] = useState(null);
  const [photoLightbox, setPhotoLightbox] = useState(null);

  // Standard Approval with Optional Photo Modal (For Pending requests)
  const [approvingExchangeItem, setApprovingExchangeItem] = useState(null);
  const [issuedPhoto, setIssuedPhoto] = useState(null);
  const [issuedNote, setIssuedNote] = useState('');
  const [isApprovingLoading, setIsApprovingLoading] = useState(false);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  // Dispute Resolution Modal State
  const [resolvingDisputeItem, setResolvingDisputeItem] = useState(null);
  const [disputeResolutionType, setDisputeResolutionType] = useState('reissue'); // 'reissue' | 'resolve' | 'decline' (exchange), 'resolve' | 'reopen' | 'close' (complaint)
  const [disputeResolutionNote, setDisputeResolutionNote] = useState('');
  const [disputeReplacementPhoto, setDisputeReplacementPhoto] = useState(null);
  const [isResolvingDispute, setIsResolvingDispute] = useState(false);
  const disputeCameraInputRef = useRef(null);
  const disputeGalleryInputRef = useRef(null);

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

  const handleDisputePhotoCapture = (e) => {
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
        setDisputeReplacementPhoto(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!user?.uid) return;
    fetchData();
  }, [user, activePgId]);

  const getTimestamp = (item) => {
    const raw = item?.createdAt || item?.date || item?.timestamp;
    if (!raw) return 0;
    if (raw.toMillis) return raw.toMillis();
    if (typeof raw === 'number') return raw;
    const parsed = new Date(raw).getTime();
    return isNaN(parsed) ? 0 : parsed;
  };

  const getAgeDays = (item) => {
    const ts = getTimestamp(item);
    if (!ts) return 0;
    const diffMs = Date.now() - ts;
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  };

  const getAgingStyles = (item) => {
    if (item.status === 'Disputed') {
      return {
        bg: '#ffffff',
        border: '#fecaca',
        stripe: '#e11d48',
        tagBg: '#fff1f2',
        tagText: '#be123c',
        tagLabel: 'Disputed',
        tagIcon: 'gavel',
        title: '#0f172a',
        sub: '#9f1239',
        body: '#334155'
      };
    }

    const isResolved = item.status === 'Closed' || item.status === 'Approved' || item.status === 'Rejected' || item.status === 'Confirmed';
    if (isResolved) {
      return {
        bg: '#ffffff',
        border: '#e2e8f0',
        stripe: '#10b981',
        tagBg: '#ecfdf5',
        tagText: '#059669',
        tagLabel: item.status,
        tagIcon: 'check_circle',
        title: '#0f172a',
        sub: '#64748b',
        body: '#334155'
      };
    }

    const days = getAgeDays(item);
    if (days >= 4) {
      return {
        bg: '#ffffff',
        border: '#fca5a5',
        stripe: '#dc2626',
        tagBg: '#fee2e2',
        tagText: '#991b1b',
        tagLabel: `${days}d ago · Urgent`,
        tagIcon: 'warning',
        title: '#0f172a',
        sub: '#991b1b',
        body: '#334155'
      };
    } else if (days >= 2) {
      return {
        bg: '#ffffff',
        border: '#fdba74',
        stripe: '#ea580c',
        tagBg: '#ffedd5',
        tagText: '#9a3412',
        tagLabel: `${days}d ago`,
        tagIcon: 'schedule',
        title: '#0f172a',
        sub: '#9a3412',
        body: '#334155'
      };
    } else {
      return {
        bg: '#ffffff',
        border: '#e2e8f0',
        stripe: '#3b82f6',
        tagBg: '#f1f5f9',
        tagText: '#475569',
        tagLabel: days === 0 ? 'Today' : '1d ago',
        tagIcon: 'schedule',
        title: '#0f172a',
        sub: '#64748b',
        body: '#334155'
      };
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const adminUid = user.uid;

      const [compSnap, invExSnap, tenantsSnap, staffSnap] = await Promise.all([
        getDocs(query(collection(db, 'complaints'), where('adminId', '==', adminUid))),
        getDocs(query(collection(db, 'inventory_exchange_requests'), where('adminId', '==', adminUid))),
        getDocs(query(collection(db, 'tenants'), where('adminId', '==', adminUid))),
        getDocs(query(collection(db, 'staff'), where('adminId', '==', adminUid)))
      ]);

      const tenantsData = {};
      tenantsSnap.docs.forEach(d => {
        tenantsData[d.id] = d.data();
      });

      const matchesPg = (itemPgId) => {
        if (!activePgId || activePgId === 'all') return true;
        if (!itemPgId || itemPgId === 'primary') return true;
        return itemPgId === activePgId;
      };

      // 1. Process Complaints
      const compList = [];
      compSnap.docs.forEach(d => {
        const c = d.data();
        if (matchesPg(c.pgId)) {
          const t = tenantsData[c.tenantId];
          compList.push({
            id: d.id,
            ...c,
            tenantName: t?.name || c.tenantName || 'Unknown',
            room: t?.room || t?.roomNo || c.room || 'Unassigned',
            phone: t?.phone || c.phone || '',
            category: c.category || c.subCategory || 'General Complaint',
            type: 'complaint'
          });
        }
      });

      // 2. Process Exchange Requests
      const exList = [];
      invExSnap.docs.forEach(d => {
        const data = d.data();
        if (matchesPg(data.pgId)) {
          const t = tenantsData[data.tenantId];
          exList.push({
            id: d.id,
            exchangeRequestId: d.id,
            ...data,
            tenantName: t?.name || data.tenantName || 'Student',
            room: t?.room || t?.roomNo || data.roomNo || 'Unassigned',
            phone: t?.phone || data.tenantPhone || '',
            itemName: data.itemName || 'Item',
            reason: data.reason || 'Exchange requested',
            description: data.description || '',
            photo: data.photo || null,
            status: data.status || 'Pending',
            disputeNote: data.disputeNote || '',
            disputedAt: data.disputedAt || null,
            rejectionReason: data.rejectionReason || '',
            createdAt: data.createdAt || data.date || new Date().toISOString(),
            tenantId: data.tenantId,
            type: 'exchange'
          });
        }
      });

      // Systematic sort: Newest requests strictly above older ones
      compList.sort((a, b) => getTimestamp(b) - getTimestamp(a));
      exList.sort((a, b) => getTimestamp(b) - getTimestamp(a));

      setComplaints(compList);
      setExchangeRequests(exList);

      const names = staffSnap.docs.map(d => d.data().name || d.data().staffName || '').filter(Boolean);
      setStaffList(['Unassigned', ...names]);
    } catch (err) {
      console.error('Error fetching complaints/requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const advanceStatus = async (id, currentStatus, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const nextStatus = STATUS_FLOW[currentStatus] || 'Active';
    try {
      await updateDoc(doc(db, 'complaints', id), { status: nextStatus });
      setComplaints(prev => prev.map(c => c.id === id ? { ...c, status: nextStatus } : c));
      if (detailItem?.id === id) {
        setDetailItem(prev => ({ ...prev, status: nextStatus }));
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const assignStaff = async (id, staff, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const assignedTo = staff === 'Unassigned' ? '' : staff;
    try {
      await updateDoc(doc(db, 'complaints', id), { assignedTo });
      setComplaints(prev => prev.map(c => c.id === id ? { ...c, assignedTo } : c));
      if (detailItem?.id === id) {
        setDetailItem(prev => ({ ...prev, assignedTo }));
      }
    } catch (err) {
      console.error('Error assigning staff:', err);
    }
  };

  const handleExchangeAction = async (item, action, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    try {
      const exId = item.id;
      const tId = item.tenantId;
      const itemName = item.itemName || 'Item';

      if (action === 'Approve') {
        setApprovingExchangeItem(item);
        setIssuedPhoto(null);
        setIssuedNote('');
        return;
      } else {
        const reason = window.prompt("Reason for declining this exchange request (optional):", "Item is in acceptable condition or replacement currently unavailable");
        if (reason === null) return;

        await updateDoc(doc(db, 'inventory_exchange_requests', exId), {
          status: 'Rejected',
          rejectionReason: reason,
          resolvedAt: new Date().toISOString()
        });

        try {
          const uReqSnap = await getDocs(query(collection(db, 'users', tId, 'requests'), where('exchangeRequestId', '==', exId)));
          await Promise.all(uReqSnap.docs.map(d => updateDoc(d.ref, { status: 'Rejected' })));
        } catch(e) {}

        if (tId) {
          await addDoc(collection(db, 'users', tId, 'notifications'), {
            title: '⚠️ Exchange Request Declined',
            desc: `Your exchange request for ${itemName} was declined: ${reason}`,
            type: 'error',
            action: 'VIEW_DASHBOARD',
            unread: true,
            createdAt: new Date().toISOString()
          });
        }

        setExchangeRequests(prev => prev.map(r => r.id === exId ? { ...r, status: 'Rejected', rejectionReason: reason } : r));
        if (detailItem?.id === exId) {
          setDetailItem(prev => ({ ...prev, status: 'Rejected', rejectionReason: reason }));
        }
      }
    } catch (err) {
      console.error('Error handling exchange action:', err);
      alert('Failed to process exchange request');
    }
  };

  const confirmApproveExchange = async () => {
    if (!approvingExchangeItem) return;
    setIsApprovingLoading(true);
    try {
      const item = approvingExchangeItem;
      const exId = item.id;
      const tId = item.tenantId;
      const itemName = item.itemName || 'Item';
      const nowIso = new Date().toISOString();

      await updateDoc(doc(db, 'inventory_exchange_requests', exId), {
        status: 'Approved',
        issuedItemPhoto: issuedPhoto || null,
        issuedItemNote: issuedNote.trim() || null,
        approvedAt: nowIso,
        approvedBy: user?.name || user?.email || 'Admin',
        resolvedAt: nowIso
      });

      // Update user requests subcollection if present
      try {
        const uReqSnap = await getDocs(query(collection(db, 'users', tId, 'requests'), where('exchangeRequestId', '==', exId)));
        await Promise.all(uReqSnap.docs.map(d => updateDoc(d.ref, {
          status: 'Approved',
          issuedItemPhoto: issuedPhoto || null,
          issuedItemNote: issuedNote.trim() || null,
          approvedAt: nowIso
        })));
      } catch(e) {}

      if (tId) {
        await addDoc(collection(db, 'users', tId, 'notifications'), {
          title: '📦 Exchange Approved!',
          desc: `Your exchange request for ${itemName} has been approved. Replacement item issued! Please check and confirm receipt.`,
          type: 'success',
          action: 'VIEW_DASHBOARD',
          unread: true,
          createdAt: nowIso
        });
      }

      setExchangeRequests(prev => prev.map(r => r.id === exId ? {
        ...r,
        status: 'Approved',
        issuedItemPhoto: issuedPhoto || null,
        issuedItemNote: issuedNote.trim() || null,
        approvedAt: nowIso
      } : r));

      if (detailItem?.id === exId) {
        setDetailItem(prev => ({
          ...prev,
          status: 'Approved',
          issuedItemPhoto: issuedPhoto || null,
          issuedItemNote: issuedNote.trim() || null
        }));
      }

      setApprovingExchangeItem(null);
      setIssuedPhoto(null);
      setIssuedNote('');
      alert(`Exchange request for ${itemName} approved successfully!`);
    } catch (err) {
      console.error('Error approving exchange:', err);
      alert('Failed to approve exchange. Please try again.');
    } finally {
      setIsApprovingLoading(false);
    }
  };

  // Open Dispute Resolution Modal
  const openDisputeResolutionModal = (item, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setResolvingDisputeItem(item);
    setDisputeResolutionNote('');
    setDisputeReplacementPhoto(null);
    if (item.type === 'exchange') {
      setDisputeResolutionType('reissue');
    } else {
      setDisputeResolutionType('resolve');
    }
  };

  // Submit Dispute Resolution
  const submitDisputeResolution = async () => {
    if (!resolvingDisputeItem) return;
    setIsResolvingDispute(true);
    try {
      const item = resolvingDisputeItem;
      const isExchange = item.type === 'exchange';
      const nowIso = new Date().toISOString();
      const tenantId = item.tenantId;

      if (isExchange) {
        const itemName = item.itemName || 'Item';

        if (disputeResolutionType === 'reissue') {
          // Re-issues a replacement -> Status: 'Approved' (student will re-verify)
          const updatePayload = {
            status: 'Approved',
            issuedItemPhoto: disputeReplacementPhoto || item.issuedItemPhoto || null,
            issuedItemNote: disputeResolutionNote.trim() || 'New replacement issued by Admin after dispute review',
            disputeResolvedAt: nowIso,
            disputeResolutionNote: disputeResolutionNote.trim() || 'New replacement issued',
            resolvedAt: nowIso
          };

          await updateDoc(doc(db, 'inventory_exchange_requests', item.id), updatePayload);

          try {
            const uReqSnap = await getDocs(query(collection(db, 'users', tenantId, 'requests'), where('exchangeRequestId', '==', item.id)));
            await Promise.all(uReqSnap.docs.map(d => updateDoc(d.ref, updatePayload)));
          } catch (e) {}

          if (tenantId) {
            await addDoc(collection(db, 'users', tenantId, 'notifications'), {
              title: '🔄 Exchange Dispute Resolved: Replacement Issued',
              desc: `Admin reviewed your dispute for ${itemName} and issued a new replacement item. Please inspect and confirm receipt.`,
              type: 'success',
              action: 'VIEW_DASHBOARD',
              unread: true,
              createdAt: nowIso
            });
          }

          setExchangeRequests(prev => prev.map(r => r.id === item.id ? { ...r, ...updatePayload } : r));
          if (detailItem?.id === item.id) setDetailItem(prev => ({ ...prev, ...updatePayload }));
          alert(`Dispute resolved: New replacement item issued for ${itemName}!`);

        } else if (disputeResolutionType === 'resolve') {
          // Direct settlement -> Status: 'Confirmed'
          const updatePayload = {
            status: 'Confirmed',
            disputeResolvedAt: nowIso,
            disputeResolutionNote: disputeResolutionNote.trim() || 'Settled and verified in person with student',
            resolvedAt: nowIso,
            confirmedAt: nowIso
          };

          await updateDoc(doc(db, 'inventory_exchange_requests', item.id), updatePayload);

          try {
            const uReqSnap = await getDocs(query(collection(db, 'users', tenantId, 'requests'), where('exchangeRequestId', '==', item.id)));
            await Promise.all(uReqSnap.docs.map(d => updateDoc(d.ref, updatePayload)));
          } catch (e) {}

          if (tenantId) {
            await addDoc(collection(db, 'users', tenantId, 'notifications'), {
              title: '✅ Exchange Dispute Settled',
              desc: `Your dispute for ${itemName} was settled: ${disputeResolutionNote.trim() || 'Confirmed by Admin'}`,
              type: 'success',
              action: 'VIEW_DASHBOARD',
              unread: true,
              createdAt: nowIso
            });
          }

          setExchangeRequests(prev => prev.map(r => r.id === item.id ? { ...r, ...updatePayload } : r));
          if (detailItem?.id === item.id) setDetailItem(prev => ({ ...prev, ...updatePayload }));
          alert(`Dispute for ${itemName} settled and marked Confirmed!`);

        } else if (disputeResolutionType === 'decline') {
          // Decline dispute -> Status: 'Rejected'
          const updatePayload = {
            status: 'Rejected',
            rejectionReason: disputeResolutionNote.trim() || 'Dispute reviewed and declined',
            disputeResolvedAt: nowIso,
            resolvedAt: nowIso
          };

          await updateDoc(doc(db, 'inventory_exchange_requests', item.id), updatePayload);

          try {
            const uReqSnap = await getDocs(query(collection(db, 'users', tenantId, 'requests'), where('exchangeRequestId', '==', item.id)));
            await Promise.all(uReqSnap.docs.map(d => updateDoc(d.ref, updatePayload)));
          } catch (e) {}

          if (tenantId) {
            await addDoc(collection(db, 'users', tenantId, 'notifications'), {
              title: '⚠️ Exchange Dispute Declined',
              desc: `Your dispute for ${itemName} was declined: ${disputeResolutionNote.trim() || 'Item meets acceptable condition'}`,
              type: 'error',
              action: 'VIEW_DASHBOARD',
              unread: true,
              createdAt: nowIso
            });
          }

          setExchangeRequests(prev => prev.map(r => r.id === item.id ? { ...r, ...updatePayload } : r));
          if (detailItem?.id === item.id) setDetailItem(prev => ({ ...prev, ...updatePayload }));
          alert(`Dispute declined for ${itemName}.`);
        }
      } else {
        // Complaint Dispute Resolution
        const compTitle = item.title || 'Complaint';

        if (disputeResolutionType === 'resolve') {
          const updatePayload = {
            status: 'Resolved',
            disputeResolvedAt: nowIso,
            resolutionNote: disputeResolutionNote.trim() || 'Issue re-addressed and confirmed fixed',
            resolvedAt: nowIso
          };

          await updateDoc(doc(db, 'complaints', item.id), updatePayload);

          if (tenantId) {
            await addDoc(collection(db, 'users', tenantId, 'notifications'), {
              title: '✅ Complaint Dispute Resolved',
              desc: `Your complaint "${compTitle}" was re-addressed: ${disputeResolutionNote.trim() || 'Fixed by technician'}. Please verify.`,
              type: 'success',
              action: 'VIEW_DASHBOARD',
              unread: true,
              createdAt: nowIso
            });
          }

          setComplaints(prev => prev.map(c => c.id === item.id ? { ...c, ...updatePayload } : c));
          if (detailItem?.id === item.id) setDetailItem(prev => ({ ...prev, ...updatePayload }));
          alert(`Complaint re-marked as Resolved!`);

        } else if (disputeResolutionType === 'reopen') {
          const updatePayload = {
            status: 'Active',
            disputeResolvedAt: nowIso,
            reopenReason: disputeResolutionNote.trim() || 'Reopened for staff re-inspection'
          };

          await updateDoc(doc(db, 'complaints', item.id), updatePayload);

          if (tenantId) {
            await addDoc(collection(db, 'users', tenantId, 'notifications'), {
              title: '🔧 Complaint Reopened',
              desc: `Your complaint "${compTitle}" has been reopened for staff inspection.`,
              type: 'info',
              action: 'VIEW_DASHBOARD',
              unread: true,
              createdAt: nowIso
            });
          }

          setComplaints(prev => prev.map(c => c.id === item.id ? { ...c, ...updatePayload } : c));
          if (detailItem?.id === item.id) setDetailItem(prev => ({ ...prev, ...updatePayload }));
          alert(`Complaint reopened to Active status.`);

        } else if (disputeResolutionType === 'close') {
          const updatePayload = {
            status: 'Closed',
            disputeResolvedAt: nowIso,
            closingNote: disputeResolutionNote.trim() || 'Closed by Admin after dispute investigation'
          };

          await updateDoc(doc(db, 'complaints', item.id), updatePayload);

          if (tenantId) {
            await addDoc(collection(db, 'users', tenantId, 'notifications'), {
              title: '📁 Complaint Closed',
              desc: `Your complaint "${compTitle}" was reviewed and closed: ${disputeResolutionNote.trim() || 'Closed by Admin'}.`,
              type: 'info',
              action: 'VIEW_DASHBOARD',
              unread: true,
              createdAt: nowIso
            });
          }

          setComplaints(prev => prev.map(c => c.id === item.id ? { ...c, ...updatePayload } : c));
          if (detailItem?.id === item.id) setDetailItem(prev => ({ ...prev, ...updatePayload }));
          alert(`Complaint closed.`);
        }
      }

      setResolvingDisputeItem(null);
      setDisputeResolutionNote('');
      setDisputeReplacementPhoto(null);
    } catch (err) {
      console.error('Error resolving dispute:', err);
      alert('Failed to resolve dispute. Please try again.');
    } finally {
      setIsResolvingDispute(false);
    }
  };

  const getField = (obj, ...keys) => {
    for (const k of keys) {
      if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
    }
    return '';
  };

  const formatFullDate = (item) => {
    const raw = item?.createdAt || item?.date || item?.timestamp;
    if (!raw) return 'Unknown Date';
    const d = new Date(raw.toMillis ? raw.toMillis() : raw);
    if (isNaN(d.getTime())) return String(raw);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filtered complaints
  const filteredComplaints = complaints.filter(c => {
    if (activeComplaintTab === 'All') return true;
    return c.status === activeComplaintTab;
  });

  // Filtered exchange requests
  const filteredRequests = exchangeRequests.filter(r => {
    if (activeRequestTab === 'All') return true;
    return r.status === activeRequestTab;
  });

  const complaintCounts = {
    All: complaints.length,
    Active: complaints.filter(c => c.status === 'Active').length,
    Pending: complaints.filter(c => c.status === 'Pending').length,
    Resolved: complaints.filter(c => c.status === 'Resolved').length,
    Closed: complaints.filter(c => c.status === 'Closed').length,
    Disputed: complaints.filter(c => c.status === 'Disputed').length,
  };

  const requestCounts = {
    All: exchangeRequests.length,
    Pending: exchangeRequests.filter(r => r.status === 'Pending').length,
    Approved: exchangeRequests.filter(r => r.status === 'Approved').length,
    Confirmed: exchangeRequests.filter(r => r.status === 'Confirmed').length,
    Rejected: exchangeRequests.filter(r => r.status === 'Rejected').length,
    Disputed: exchangeRequests.filter(r => r.status === 'Disputed').length,
  };

  const pendingComplaintsTotal = complaintCounts.Active + complaintCounts.Pending;
  const pendingRequestsTotal = requestCounts.Pending;
  const disputedTotal = complaintCounts.Disputed + requestCounts.Disputed;
  const staffOptions = staffList.length > 1 ? staffList : ['Unassigned'];

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Hanken Grotesk', sans-serif", paddingBottom: 40 }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
        paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))',
        padding: '0 16px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.06)'
      }}>
        {/* Top Navbar Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: 56 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10,
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'white',
              flexShrink: 0
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back_ios_new</span>
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'white', letterSpacing: -0.3 }}>Complaints &amp; Requests</h1>
            <p style={{ margin: '1px 0 0', fontSize: 11.5, color: '#94a3b8' }}>
              {pendingComplaintsTotal} open · {pendingRequestsTotal} pending {disputedTotal > 0 ? `· ${disputedTotal} disputed` : ''}
            </p>
          </div>
          {disputedTotal > 0 && (
            <div style={{
              background: 'rgba(225,29,72,0.18)',
              border: '1px solid rgba(225,29,72,0.4)',
              borderRadius: 10,
              padding: '4px 9px',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#fda4af' }}>gavel</span>
              <span style={{ fontSize: 12, fontWeight: 900, color: '#fda4af' }}>{disputedTotal} Disputed</span>
            </div>
          )}
        </div>

        {/* PRIMARY SUB-TAB SELECTOR (Complaints vs Requests) */}
        <div style={{
          display: 'flex',
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 12,
          padding: 3,
          marginTop: 10,
          gap: 4,
          border: '1px solid rgba(255,255,255,0.06)'
        }}>
          <button
            onClick={() => setActiveSection('complaints')}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: 'none',
              borderRadius: 9,
              background: activeSection === 'complaints' ? '#ffffff' : 'transparent',
              color: activeSection === 'complaints' ? '#0f172a' : '#94a3b8',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              boxShadow: activeSection === 'complaints' ? '0 2px 6px rgba(0,0,0,0.12)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>report_problem</span>
            <span>Complaints</span>
            <span style={{
              fontSize: 11,
              fontWeight: 800,
              padding: '1px 6px',
              borderRadius: 10,
              background: activeSection === 'complaints' ? '#e2e8f0' : 'rgba(255,255,255,0.1)',
              color: activeSection === 'complaints' ? '#0f172a' : '#cbd5e1'
            }}>
              {complaints.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSection('requests')}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: 'none',
              borderRadius: 9,
              background: activeSection === 'requests' ? '#ffffff' : 'transparent',
              color: activeSection === 'requests' ? '#0f172a' : '#94a3b8',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              boxShadow: activeSection === 'requests' ? '0 2px 6px rgba(0,0,0,0.12)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>published_with_changes</span>
            <span>Requests</span>
            <span style={{
              fontSize: 11,
              fontWeight: 800,
              padding: '1px 6px',
              borderRadius: 10,
              background: activeSection === 'requests' ? '#e2e8f0' : 'rgba(255,255,255,0.1)',
              color: activeSection === 'requests' ? '#0f172a' : '#cbd5e1'
            }}>
              {exchangeRequests.length}
            </span>
          </button>
        </div>

        {/* STATUS FILTER HORIZONTAL PILL BAR (Replaced 4x2 grid with clean scrollable tabs) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginTop: 12,
          overflowX: 'auto',
          paddingBottom: 2,
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}>
          {(activeSection === 'complaints' ? COMPLAINT_TABS : REQUEST_TABS).map(tab => {
            const currentTab = activeSection === 'complaints' ? activeComplaintTab : activeRequestTab;
            const count = activeSection === 'complaints' ? complaintCounts[tab] : requestCounts[tab];
            const isTabActive = currentTab === tab;
            const isDisputedTab = tab === 'Disputed';
            const hasDisputes = isDisputedTab && count > 0;

            return (
              <button
                key={tab}
                onClick={() => activeSection === 'complaints' ? setActiveComplaintTab(tab) : setActiveRequestTab(tab)}
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: isTabActive
                    ? '#ffffff'
                    : hasDisputes
                      ? 'rgba(244, 63, 94, 0.16)'
                      : 'rgba(255, 255, 255, 0.08)',
                  border: isTabActive
                    ? 'none'
                    : hasDisputes
                      ? '1px solid rgba(244, 63, 94, 0.4)'
                      : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 20,
                  padding: '6px 12px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s ease',
                  boxShadow: isTabActive ? '0 2px 8px rgba(0,0,0,0.15)' : 'none'
                }}
              >
                <span style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: isTabActive
                    ? '#0f172a'
                    : hasDisputes
                      ? '#fda4af'
                      : '#cbd5e1'
                }}>
                  {tab}
                </span>
                <span style={{
                  fontSize: 11,
                  fontWeight: 900,
                  padding: '1px 6px',
                  borderRadius: 10,
                  background: isTabActive
                    ? '#0f172a'
                    : hasDisputes
                      ? '#e11d48'
                      : 'rgba(255, 255, 255, 0.15)',
                  color: isTabActive
                    ? '#ffffff'
                    : hasDisputes
                      ? '#ffffff'
                      : '#94a3b8',
                  lineHeight: 1
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ padding: 14 }}>
        {/* Loading Spinner */}
        {loading && (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 36, color: '#94a3b8', display: 'block', marginBottom: 10, animation: 'spin 1s linear infinite' }}>sync</span>
            <p style={{ color: '#94a3b8', fontSize: 13, fontWeight: 700 }}>Loading {activeSection === 'complaints' ? 'complaints' : 'requests'}...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && (activeSection === 'complaints' ? filteredComplaints : filteredRequests).length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px', background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', marginTop: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 44, color: '#cbd5e1' }}>check_circle</span>
            <h4 style={{ margin: '10px 0 4px', fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
              No {activeSection === 'complaints' ? activeComplaintTab.toLowerCase() : activeRequestTab.toLowerCase()} items
            </h4>
            <p style={{ margin: 0, fontSize: 12.5, color: '#64748b' }}>
              {activeSection === 'complaints' ? 'All complaints in this filter have been handled.' : 'No exchange requests in this category.'}
            </p>
          </div>
        )}

        {/* ─── COMPLAINTS LIST ─── */}
        {!loading && activeSection === 'complaints' && filteredComplaints.map((comp, idx) => {
          const aging = getAgingStyles(comp);
          const sc = STATUS_CONFIG[comp.status] || STATUS_CONFIG['Pending'];
          const priority = comp.priority || 'Medium';
          const pc = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG['Medium'];
          const initColor = INITIALS_COLORS[idx % INITIALS_COLORS.length];
          const tenantName = getField(comp, 'tenantName', 'tenant') || 'Unknown';
          const initials = tenantName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'ST';
          const description = getField(comp, 'description', 'desc');
          const phone = getField(comp, 'phone');
          const assignedTo = getField(comp, 'assignedTo');
          const isDisputed = comp.status === 'Disputed';

          return (
            <div
              key={comp.id}
              onClick={() => setDetailItem(comp)}
              style={{
                marginBottom: 12,
                borderRadius: 14,
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                border: `1px solid ${aging.border}`,
                background: '#ffffff',
                cursor: 'pointer',
                transition: 'transform 0.15s ease'
              }}
            >
              {/* Card Header & Body */}
              <div style={{ padding: '14px 16px', borderLeft: `4px solid ${aging.stripe}` }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: initColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: 'white', flexShrink: 0 }}>
                    {initials}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, marginBottom: 3 }}>
                      <div>
                        <h4 style={{ margin: 0, fontWeight: 800, fontSize: 15, color: '#0f172a', lineHeight: 1.3 }}>
                          {comp.title || 'Complaint'}
                        </h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12, color: '#475569', fontWeight: 700 }}>{tenantName}</span>
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>•</span>
                          <span style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600 }}>Room {comp.room}</span>
                        </div>
                      </div>

                      {/* Status & Priority Badge */}
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 7px', borderRadius: 6, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, display: 'flex', alignItems: 'center', gap: 3 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>{sc.icon}</span>
                          {comp.status}
                        </span>
                      </div>
                    </div>

                    {description && (
                      <p style={{ margin: '6px 0 0', fontSize: 13, color: '#475569', lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {description}
                      </p>
                    )}

                    {/* PROMINENT STUDENT DISPUTE CALLOUT BOX */}
                    {isDisputed && (
                      <div style={{
                        marginTop: 10,
                        padding: '10px 12px',
                        borderRadius: 10,
                        background: '#fff1f2',
                        border: '1px solid #fecaca',
                        borderLeft: '4px solid #e11d48'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', color: '#be123c', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>gavel</span>
                            Student Dispute Reason
                          </span>
                          {comp.disputedAt && (
                            <span style={{ fontSize: 10.5, color: '#9f1239', fontWeight: 600 }}>
                              {formatFullDate({ createdAt: comp.disputedAt })}
                            </span>
                          )}
                        </div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#881337', lineHeight: 1.4 }}>
                          "{comp.disputeNote || 'Student indicated issue was not fixed'}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Action Strip */}
              <div style={{ background: '#f8fafc', padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{formatFullDate(comp)}</span>
                  {assignedTo && <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>· {assignedTo}</span>}
                  {comp.status === 'Resolved' && (
                    <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 6px', borderRadius: 6, background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>
                      ⏳ Awaiting Student
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  {phone && (
                    <a
                      href={`tel:${phone}`}
                      onClick={e => e.stopPropagation()}
                      style={{ fontSize: 11.5, fontWeight: 800, padding: '5px 10px', borderRadius: 8, background: '#ecfdf5', color: '#059669', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3, border: '1px solid #a7f3d0' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>call</span>
                      Call
                    </a>
                  )}

                  {isDisputed ? (
                    <button
                      onClick={e => openDisputeResolutionModal(comp, e)}
                      style={{ fontSize: 11.5, fontWeight: 800, padding: '5px 12px', borderRadius: 8, background: '#059669', color: 'white', border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 1px 3px rgba(5,150,105,0.3)' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>task_alt</span>
                      Resolve Dispute
                    </button>
                  ) : (
                    <button
                      onClick={e => advanceStatus(comp.id, comp.status, e)}
                      style={{ fontSize: 11.5, fontWeight: 800, padding: '5px 10px', borderRadius: 8, background: sc.text, color: 'white', border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 3 }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 13 }}>arrow_forward</span>
                      {STATUS_FLOW[comp.status] || 'Next'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* ─── EXCHANGE REQUESTS LIST ─── */}
        {!loading && activeSection === 'requests' && filteredRequests.map((req, idx) => {
          const aging = getAgingStyles(req);
          const sc = STATUS_CONFIG[req.status] || STATUS_CONFIG['Pending'];
          const initColor = INITIALS_COLORS[idx % INITIALS_COLORS.length];
          const tenantName = req.tenantName || 'Student';
          const initials = tenantName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'EX';
          const isDisputed = req.status === 'Disputed';

          return (
            <div
              key={req.id}
              onClick={() => setDetailItem(req)}
              style={{
                marginBottom: 12,
                borderRadius: 14,
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                border: `1px solid ${aging.border}`,
                background: '#ffffff',
                cursor: 'pointer',
                transition: 'transform 0.15s ease'
              }}
            >
              {/* Card Header & Content */}
              <div style={{ padding: '14px 16px', borderLeft: `4px solid ${aging.stripe}` }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: initColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: 'white', flexShrink: 0 }}>
                    {initials}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, marginBottom: 3 }}>
                      <div>
                        <h4 style={{ margin: 0, fontWeight: 800, fontSize: 15, color: '#0f172a', lineHeight: 1.3 }}>
                          Exchange: {req.itemName || 'Item'}
                        </h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12, color: '#475569', fontWeight: 700 }}>{tenantName}</span>
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>•</span>
                          <span style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600 }}>Room {req.room}</span>
                        </div>
                      </div>

                      {/* Single status badge */}
                      <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 7px', borderRadius: 6, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>{sc.icon}</span>
                        {req.status}
                      </span>
                    </div>

                    {/* Original Reason */}
                    {req.reason && req.reason !== 'Disputed by student' && (
                      <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#64748b' }}>
                        Reason: <strong>{req.reason}</strong>
                      </p>
                    )}

                    {req.description && !isDisputed && (
                      <p style={{ margin: '4px 0 0', fontSize: 13, color: '#334155', lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        "{req.description}"
                      </p>
                    )}

                    {/* PROMINENT STUDENT DISPUTE CALLOUT BOX */}
                    {isDisputed && (
                      <div style={{
                        marginTop: 10,
                        padding: '10px 12px',
                        borderRadius: 10,
                        background: '#fff1f2',
                        border: '1px solid #fecaca',
                        borderLeft: '4px solid #e11d48'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', color: '#be123c', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>gavel</span>
                            Student Dispute Reason
                          </span>
                          {req.disputedAt && (
                            <span style={{ fontSize: 10.5, color: '#9f1239', fontWeight: 600 }}>
                              {formatFullDate({ createdAt: req.disputedAt })}
                            </span>
                          )}
                        </div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#881337', lineHeight: 1.4 }}>
                          "{req.disputeNote || req.description || 'Student disputed replacement item'}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Strip */}
              <div style={{ background: '#f8fafc', padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{formatFullDate(req)}</span>
                  {req.status === 'Approved' && (
                    <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 6px', borderRadius: 6, background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>
                      ⏳ Awaiting Student Confirm
                    </span>
                  )}
                  {req.status === 'Confirmed' && (
                    <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 6px', borderRadius: 6, background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}>
                      ✓ Confirmed &amp; Received
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  {req.phone && (
                    <a
                      href={`tel:${req.phone}`}
                      onClick={e => e.stopPropagation()}
                      style={{ fontSize: 11.5, fontWeight: 800, padding: '5px 10px', borderRadius: 8, background: '#ecfdf5', color: '#059669', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3, border: '1px solid #a7f3d0' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>call</span>
                      Call
                    </a>
                  )}

                  {isDisputed ? (
                    <>
                      <button
                        onClick={e => handleExchangeAction(req, 'Reject', e)}
                        style={{ fontSize: 11.5, fontWeight: 800, padding: '5px 10px', borderRadius: 8, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        Decline
                      </button>
                      <button
                        onClick={e => openDisputeResolutionModal(req, e)}
                        style={{ fontSize: 11.5, fontWeight: 800, padding: '5px 12px', borderRadius: 8, background: '#059669', color: 'white', border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 1px 3px rgba(5,150,105,0.3)' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>task_alt</span>
                        Resolve Dispute
                      </button>
                    </>
                  ) : req.status === 'Pending' ? (
                    <>
                      <button
                        onClick={e => handleExchangeAction(req, 'Reject', e)}
                        style={{ fontSize: 11.5, fontWeight: 800, padding: '5px 10px', borderRadius: 8, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        Decline
                      </button>
                      <button
                        onClick={e => handleExchangeAction(req, 'Approve', e)}
                        style={{ fontSize: 11.5, fontWeight: 800, padding: '5px 12px', borderRadius: 8, background: '#059669', color: 'white', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        Approve
                      </button>
                    </>
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 800, color: sc.text, padding: '4px 6px' }}>
                      {req.status === 'Approved' ? '✓ Approved' : req.status === 'Confirmed' ? '✓ Received' : '✕ Declined'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── COMPREHENSIVE DETAIL MODAL (clicked on card) ─── */}
      {detailItem && (() => {
        const isComp = detailItem.type === 'complaint';
        const aging = getAgingStyles(detailItem);
        const sc = STATUS_CONFIG[detailItem.status] || STATUS_CONFIG['Pending'];
        const priority = detailItem.priority || 'Medium';
        const pc = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG['Medium'];
        const isDisputed = detailItem.status === 'Disputed';

        return (
          <div
            onClick={() => setDetailItem(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15,23,42,0.65)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              backdropFilter: 'blur(3px)'
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 480,
                background: 'white',
                borderRadius: '24px 24px 0 0',
                padding: '20px 20px calc(24px + env(safe-area-inset-bottom, 0px))',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
                animation: 'slideUp 0.25s ease'
              }}
            >
              {/* Modal Drag Handle */}
              <div style={{ width: 40, height: 4, background: '#e2e8f0', borderRadius: 2, margin: '0 auto 16px' }} />

              {/* Modal Top Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', color: '#0f172a', background: '#f1f5f9', padding: '2px 8px', borderRadius: 6 }}>
                      {isComp ? 'Complaint Details' : 'Exchange Request'}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: sc.bg, color: sc.text }}>
                      {detailItem.status}
                    </span>
                  </div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>
                    {isComp ? (detailItem.title || 'Complaint') : `Exchange: ${detailItem.itemName}`}
                  </h3>
                </div>
                <button
                  onClick={() => setDetailItem(null)}
                  style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#64748b' }}>close</span>
                </button>
              </div>

              {/* Student Profile Card */}
              <div style={{ background: '#f8fafc', borderRadius: 14, padding: 14, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{detailItem.tenantName || 'Student'}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 600, color: '#64748b' }}>Room {detailItem.room || 'N/A'}</p>
                </div>
                {detailItem.phone && (
                  <a
                    href={`tel:${detailItem.phone}`}
                    style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: 10, padding: '7px 12px', fontSize: 12, fontWeight: 800, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>call</span>
                    Call Student
                  </a>
                )}
              </div>

              {/* Submission Date info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, color: '#64748b', fontSize: 12, fontWeight: 600 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#94a3b8' }}>schedule</span>
                <span>Submitted on {formatFullDate(detailItem)}</span>
              </div>

              {/* Details Specifics */}
              {isComp ? (
                /* Complaint specifics */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 18 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1, background: '#f8fafc', padding: 10, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>Priority</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: pc.color }}>{priority}</span>
                    </div>
                    <div style={{ flex: 1, background: '#f8fafc', padding: 10, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>Category</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{detailItem.category || 'Maintenance'}</span>
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Description</span>
                    <p style={{ margin: 0, fontSize: 14, color: '#334155', lineHeight: 1.5 }}>
                      {detailItem.description || detailItem.desc || 'No description provided.'}
                    </p>
                  </div>

                  {/* Assign Staff in Modal */}
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                      Assign Staff Member
                    </label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {staffOptions.map(s => {
                        const isSelected = detailItem.assignedTo === s || (s === 'Unassigned' && !detailItem.assignedTo);
                        return (
                          <button
                            key={s}
                            onClick={() => assignStaff(detailItem.id, s)}
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              padding: '6px 12px',
                              borderRadius: 8,
                              border: '1px solid',
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                              background: isSelected ? '#0f172a' : '#fff',
                              color: isSelected ? '#fff' : '#334155',
                              borderColor: isSelected ? '#0f172a' : '#e2e8f0'
                            }}
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                /* Exchange request specifics */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 18 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1, background: '#f8fafc', padding: 10, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>Item to Exchange</span>
                      <span style={{ fontSize: 14, fontWeight: 900, color: '#0f172a' }}>{detailItem.itemName}</span>
                    </div>
                    <div style={{ flex: 1, background: '#f8fafc', padding: 10, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>Reason</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#d97706' }}>{detailItem.reason}</span>
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Student Remarks</span>
                    <p style={{ margin: 0, fontSize: 14, color: '#334155', lineHeight: 1.5 }}>
                      {detailItem.description ? `"${detailItem.description}"` : 'No additional remarks.'}
                    </p>
                  </div>

                  {/* Condition Photo if attached */}
                  {detailItem.photo && (
                    <div style={{ background: '#f8fafc', padding: 12, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Condition Photo</span>
                      <img
                        src={detailItem.photo}
                        alt="Item condition"
                        onClick={() => setPhotoLightbox(detailItem.photo)}
                        style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 8, cursor: 'pointer', border: '1px solid #cbd5e1' }}
                      />
                      <span style={{ fontSize: 11, color: '#0284c7', fontWeight: 600, display: 'block', marginTop: 4 }}>Tap photo to enlarge</span>
                    </div>
                  )}

                  {detailItem.rejectionReason && (
                    <div style={{ background: '#fef2f2', padding: 12, borderRadius: 12, border: '1px solid #fecaca' }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Decline Reason</span>
                      <p style={{ margin: 0, fontSize: 13, color: '#991b1b', fontWeight: 600 }}>{detailItem.rejectionReason}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons in Modal */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 10, borderTop: '1px solid #e2e8f0' }}>
                {/* Dispute note if disputed */}
                {isDisputed && (
                  <div style={{ background: '#fff1f2', border: '1.5px solid #fecaca', borderLeft: '4px solid #e11d48', borderRadius: 12, padding: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 900, color: '#be123c', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                      ⚠️ Student Dispute Note
                    </span>
                    <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#881337', lineHeight: 1.4 }}>
                      "{detailItem.disputeNote || detailItem.description || 'Student disputed this resolution'}"
                    </p>
                  </div>
                )}

                {/* Dispute Resolution Primary CTA Button */}
                {isDisputed && (
                  <button
                    onClick={() => {
                      const item = detailItem;
                      setDetailItem(null);
                      openDisputeResolutionModal(item);
                    }}
                    style={{
                      width: '100%',
                      padding: 13,
                      borderRadius: 12,
                      background: '#059669',
                      color: 'white',
                      border: 'none',
                      fontWeight: 800,
                      fontSize: 14,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      boxShadow: '0 2px 6px rgba(5,150,105,0.3)'
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>task_alt</span>
                    Resolve Dispute Now
                  </button>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                  {isComp ? (
                    !isDisputed && (
                      <button
                        onClick={() => advanceStatus(detailItem.id, detailItem.status)}
                        style={{ flex: 1, padding: 12, borderRadius: 12, background: sc.text, color: 'white', border: 'none', fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        Advance to {STATUS_FLOW[detailItem.status] || 'Next'}
                      </button>
                    )
                  ) : detailItem.status === 'Pending' ? (
                    <>
                      <button
                        onClick={() => handleExchangeAction(detailItem, 'Reject')}
                        style={{ flex: 1, padding: 12, borderRadius: 12, background: '#fef2f2', color: '#dc2626', border: '1.5px solid #fecaca', fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        ✕ Decline Request
                      </button>
                      <button
                        onClick={() => handleExchangeAction(detailItem, 'Approve')}
                        style={{ flex: 1, padding: 12, borderRadius: 12, background: '#059669', color: 'white', border: 'none', fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        ✓ Approve Exchange
                      </button>
                    </>
                  ) : !isDisputed && (
                    <div style={{ flex: 1, padding: 12, borderRadius: 12, background: sc.bg, color: sc.text, textAlign: 'center', fontWeight: 800, fontSize: 14, border: `1.5px solid ${sc.border}` }}>
                      {detailItem.status === 'Approved' ? '⏳ Awaiting Student Confirmation'
                        : detailItem.status === 'Confirmed' ? '✓ Exchange Fully Confirmed'
                        : '✕ Exchange Declined'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── APPROVE EXCHANGE WITH OPTIONAL PHOTO MODAL ── */}
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
                Student: {approvingExchangeItem.tenantName || 'Student'} · Room {approvingExchangeItem.room || 'N/A'}
              </p>
              <p style={{ margin: '0 0 4px', fontSize: 12, color: '#64748b' }}>
                Reason: <strong>{approvingExchangeItem.reason || 'Exchange'}</strong>
              </p>
              {approvingExchangeItem.description && (
                <p style={{ margin: 0, fontSize: 12, color: '#475569' }}>"{approvingExchangeItem.description}"</p>
              )}
            </div>

            {/* Optional Photo of Issued Replacement Item */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
                Photo of Replacement Item <span style={{ fontSize: 11, fontWeight: 500, color: '#94a3b8' }}>(Optional)</span>
              </label>
              <p style={{ margin: '0 0 10px', fontSize: 12, color: '#64748b' }}>
                Capture or attach a photo of the replacement item given to the student:
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
                disabled={isApprovingLoading}
                style={{ flex: 2, padding: '12px', borderRadius: 12, border: 'none', background: '#059669', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                {isApprovingLoading ? 'Approving...' : 'Confirm & Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DISPUTE RESOLUTION MODAL ── */}
      {resolvingDisputeItem && (() => {
        const item = resolvingDisputeItem;
        const isExchange = item.type === 'exchange';

        return (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1050,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15,23,42,0.7)',
            backdropFilter: 'blur(4px)',
            padding: 16
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: 20,
              maxWidth: 480,
              width: '100%',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              maxHeight: '92vh',
              overflowY: 'auto'
            }}>
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fff1f2', color: '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 22 }}>gavel</span>
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: '#0f172a' }}>
                      Resolve Dispute
                    </h3>
                    <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                      {isExchange ? `Item: ${item.itemName}` : `Complaint: ${item.title}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setResolvingDisputeItem(null)}
                  style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#64748b' }}>close</span>
                </button>
              </div>

              {/* Student Info Card */}
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: 12, border: '1px solid #e2e8f0', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: 0, fontSize: 13.5, fontWeight: 800, color: '#0f172a' }}>
                    {item.tenantName || 'Student'} · Room {item.room || 'N/A'}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 11.5, color: '#64748b' }}>
                    Submitted {formatFullDate(item)}
                  </p>
                </div>
                {item.phone && (
                  <a
                    href={`tel:${item.phone}`}
                    style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: 8, padding: '5px 10px', fontSize: 11.5, fontWeight: 800, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>call</span>
                    Call
                  </a>
                )}
              </div>

              {/* Student Dispute Reason Callout */}
              <div style={{ background: '#fff1f2', border: '1.5px solid #fecaca', borderLeft: '4px solid #e11d48', borderRadius: 12, padding: 12, marginBottom: 16 }}>
                <span style={{ fontSize: 10.5, fontWeight: 900, color: '#be123c', textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>
                  ⚠️ Student Dispute Reason
                </span>
                <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#881337', lineHeight: 1.4 }}>
                  "{item.disputeNote || item.description || 'Student disputed this resolution'}"
                </p>
              </div>

              {/* Resolution Action Mode Selector */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
                  Select Resolution Action:
                </label>

                {isExchange ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      padding: 10,
                      borderRadius: 10,
                      border: `1.5px solid ${disputeResolutionType === 'reissue' ? '#059669' : '#e2e8f0'}`,
                      background: disputeResolutionType === 'reissue' ? '#f0fdf4' : '#fff',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="radio"
                        name="exchangeDisputeAction"
                        checked={disputeResolutionType === 'reissue'}
                        onChange={() => setDisputeResolutionType('reissue')}
                        style={{ marginTop: 3 }}
                      />
                      <div>
                        <strong style={{ fontSize: 13, color: '#0f172a', display: 'block' }}>Issue New / Alternate Replacement</strong>
                        <span style={{ fontSize: 11.5, color: '#64748b' }}>Provide a fresh replacement item (photo optional) and request student confirmation.</span>
                      </div>
                    </label>

                    <label style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      padding: 10,
                      borderRadius: 10,
                      border: `1.5px solid ${disputeResolutionType === 'resolve' ? '#059669' : '#e2e8f0'}`,
                      background: disputeResolutionType === 'resolve' ? '#f0fdf4' : '#fff',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="radio"
                        name="exchangeDisputeAction"
                        checked={disputeResolutionType === 'resolve'}
                        onChange={() => setDisputeResolutionType('resolve')}
                        style={{ marginTop: 3 }}
                      />
                      <div>
                        <strong style={{ fontSize: 13, color: '#0f172a', display: 'block' }}>Settle Directly &amp; Mark Confirmed</strong>
                        <span style={{ fontSize: 11.5, color: '#64748b' }}>Resolved in person with student; close dispute as fully received.</span>
                      </div>
                    </label>

                    <label style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      padding: 10,
                      borderRadius: 10,
                      border: `1.5px solid ${disputeResolutionType === 'decline' ? '#dc2626' : '#e2e8f0'}`,
                      background: disputeResolutionType === 'decline' ? '#fef2f2' : '#fff',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="radio"
                        name="exchangeDisputeAction"
                        checked={disputeResolutionType === 'decline'}
                        onChange={() => setDisputeResolutionType('decline')}
                        style={{ marginTop: 3 }}
                      />
                      <div>
                        <strong style={{ fontSize: 13, color: '#0f172a', display: 'block' }}>Decline Dispute</strong>
                        <span style={{ fontSize: 11.5, color: '#64748b' }}>Original replacement is acceptable; reject dispute with reason.</span>
                      </div>
                    </label>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      padding: 10,
                      borderRadius: 10,
                      border: `1.5px solid ${disputeResolutionType === 'resolve' ? '#059669' : '#e2e8f0'}`,
                      background: disputeResolutionType === 'resolve' ? '#f0fdf4' : '#fff',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="radio"
                        name="complaintDisputeAction"
                        checked={disputeResolutionType === 'resolve'}
                        onChange={() => setDisputeResolutionType('resolve')}
                        style={{ marginTop: 3 }}
                      />
                      <div>
                        <strong style={{ fontSize: 13, color: '#0f172a', display: 'block' }}>Re-verify &amp; Mark Resolved</strong>
                        <span style={{ fontSize: 11.5, color: '#64748b' }}>Fix has been completed and re-verified. Notify student to re-check.</span>
                      </div>
                    </label>

                    <label style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      padding: 10,
                      borderRadius: 10,
                      border: `1.5px solid ${disputeResolutionType === 'reopen' ? '#0284c7' : '#e2e8f0'}`,
                      background: disputeResolutionType === 'reopen' ? '#f0f9ff' : '#fff',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="radio"
                        name="complaintDisputeAction"
                        checked={disputeResolutionType === 'reopen'}
                        onChange={() => setDisputeResolutionType('reopen')}
                        style={{ marginTop: 3 }}
                      />
                      <div>
                        <strong style={{ fontSize: 13, color: '#0f172a', display: 'block' }}>Reopen Ticket as Active</strong>
                        <span style={{ fontSize: 11.5, color: '#64748b' }}>Move back to Active so maintenance staff attend to it again.</span>
                      </div>
                    </label>

                    <label style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      padding: 10,
                      borderRadius: 10,
                      border: `1.5px solid ${disputeResolutionType === 'close' ? '#64748b' : '#e2e8f0'}`,
                      background: disputeResolutionType === 'close' ? '#f8fafc' : '#fff',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="radio"
                        name="complaintDisputeAction"
                        checked={disputeResolutionType === 'close'}
                        onChange={() => setDisputeResolutionType('close')}
                        style={{ marginTop: 3 }}
                      />
                      <div>
                        <strong style={{ fontSize: 13, color: '#0f172a', display: 'block' }}>Force Close Complaint</strong>
                        <span style={{ fontSize: 11.5, color: '#64748b' }}>Mark closed after investigation with closing note.</span>
                      </div>
                    </label>
                  </div>
                )}
              </div>

              {/* Optional Photo if re-issuing replacement */}
              {isExchange && disputeResolutionType === 'reissue' && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
                    Photo of New Replacement Item <span style={{ fontSize: 11, fontWeight: 500, color: '#94a3b8' }}>(Optional)</span>
                  </label>

                  {disputeReplacementPhoto ? (
                    <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1.5px solid #10b981', maxHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
                      <img src={disputeReplacementPhoto} alt="Replacement Preview" style={{ width: '100%', maxHeight: 160, objectFit: 'contain' }} />
                      <button
                        onClick={() => setDisputeReplacementPhoto(null)}
                        style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <button
                        type="button"
                        onClick={() => disputeCameraInputRef.current?.click()}
                        style={{ padding: '12px', borderRadius: 10, border: '1.5px dashed #059669', background: '#ecfdf5', color: '#059669', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 22 }}>photo_camera</span>
                        <span>Take Photo</span>
                      </button>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        ref={disputeCameraInputRef}
                        style={{ display: 'none' }}
                        onChange={handleDisputePhotoCapture}
                      />

                      <button
                        type="button"
                        onClick={() => disputeGalleryInputRef.current?.click()}
                        style={{ padding: '12px', borderRadius: 10, border: '1.5px dashed #64748b', background: '#f8fafc', color: '#475569', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 22 }}>photo_library</span>
                        <span>From Gallery</span>
                      </button>
                      <input
                        type="file"
                        accept="image/*"
                        ref={disputeGalleryInputRef}
                        style={{ display: 'none' }}
                        onChange={handleDisputePhotoCapture}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Resolution Note Input */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
                  Resolution Note / Reason <span style={{ fontSize: 11, fontWeight: 500, color: '#94a3b8' }}>(Optional)</span>
                </label>
                <input
                  type="text"
                  value={disputeResolutionNote}
                  onChange={e => setDisputeResolutionNote(e.target.value)}
                  placeholder={
                    disputeResolutionType === 'decline'
                      ? 'e.g. Current item is in proper condition'
                      : disputeResolutionType === 'reopen'
                        ? 'e.g. Electrician scheduled for second inspection'
                        : 'e.g. Issued new memory foam replacement, confirmed clean'
                  }
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setResolvingDisputeItem(null)}
                  style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitDisputeResolution}
                  disabled={isResolvingDispute}
                  style={{
                    flex: 2,
                    padding: '12px',
                    borderRadius: 12,
                    border: 'none',
                    background: disputeResolutionType === 'decline' ? '#dc2626' : '#059669',
                    color: '#fff',
                    fontSize: 13.5,
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                >
                  {isResolvingDispute ? 'Processing...' : 'Confirm Resolution'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Lightbox Modal for Photo */}
      {photoLightbox && (
        <div
          onClick={() => setPhotoLightbox(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <img src={photoLightbox} alt="Item Condition Full" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 12 }} />
        </div>
      )}
    </div>
  );
}
