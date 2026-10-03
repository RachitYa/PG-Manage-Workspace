import React, { useState, useEffect } from 'react';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  User, Users, Calendar, Home, Box, Activity,
  ChevronRight, Zap, Coins, Clock, Bed, FileCheck,
  ShieldCheck, LogOut, Check, Wallet, X, Camera, Loader2, RefreshCw, Briefcase, HeartPulse,
  ArrowLeftRight, AlertCircle, Eye, CheckCircle2, Image as ImageIcon
} from 'lucide-react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import './MyProfile.css';
import './FilterModal.css';

const Section = ({ icon, title, subtitle, sectionKey, openSection, onToggle, children }) => {
  const isOpen = openSection === sectionKey;
  return (
    <div className="profile-section-card">
      <div className="profile-section-header" onClick={() => onToggle(sectionKey)}>
        <div className="profile-section-left">
          <div className="profile-section-icon-wrap">{icon}</div>
          <div>
            <div className="profile-section-title">{title}</div>
            {subtitle && <div className="profile-section-subtitle">{subtitle}</div>}
          </div>
        </div>
        <ChevronRight size={18} className={`profile-caret ${isOpen ? 'open' : ''}`} />
      </div>
      {isOpen && <div className="profile-section-body">{children}</div>}
    </div>
  );
};

const DetailRow = ({ label, value, type }) => (
  <div className="pf-detail-row">
    <span className="pf-detail-label">{label}</span>
    <span className={`pf-detail-value ${type || ''}`}>{value || 'Not provided'}</span>
  </div>
);

function ProfilePaymentCard({ payment, isToken, isDebit }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ background: '#fff', border: `1.5px solid ${isToken ? '#fef3c7' : '#f1f5f9'}`, borderRadius: 16, marginBottom: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
      <div onClick={() => setExpanded(!expanded)} style={{ display: 'flex', justifyContent: 'space-between', padding: '13px 16px', cursor: 'pointer', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1, minWidth: 0 }}>
          <div style={{ width: 42, height: 42, borderRadius: 13, background: isToken ? '#fef9c3' : (isDebit ? '#fef2f2' : '#f0fdf4'), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 20 }}>
            {isToken ? '💰' : (isDebit ? '💸' : '💵')}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{payment.name}</p>
              {isToken && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: '#fef3c7', color: '#b45309', flexShrink: 0 }}>TOKEN</span>}
            </div>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>{payment.date}{payment.seaterLabel ? ` · ${payment.seaterLabel}` : ''}</p>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, marginLeft: 8, flexShrink: 0 }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: isDebit ? '#ef4444' : '#16a34a' }}>
            {isDebit ? '-' : '+'}₹{Number(payment.amount).toLocaleString('en-IN')}
          </p>
          <span style={{ fontSize: 18, color: '#94a3b8' }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid #f8fafc', padding: '12px 16px', background: '#fafafa' }}>
          {isToken && (
            <div style={{ background: 'linear-gradient(135deg, #064e3b, #166534)', borderRadius: 12, padding: '12px 14px', marginBottom: 10 }}>
              <p style={{ margin: '0 0 6px', fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 700, letterSpacing: 1 }}>ROOM BREAKDOWN</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>Monthly Rent</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>₹{payment.rent || '—'}/mo</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>Security Deposit</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>₹{payment.security || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 7, marginTop: 5 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>Total First Month</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#86efac' }}>₹{payment.totalAmount || '—'}</span>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>{isToken ? 'Token Paid' : 'Amount Paid'}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: isDebit ? '#ef4444' : '#16a34a' }}>₹{Number(payment.amount).toLocaleString('en-IN')}</span>
          </div>
          {payment.pgName && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>PG</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{payment.pgName}</span>
            </div>
          )}
          {payment.screenshot && (
            <div style={{ marginTop: 10 }}>
              <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: 1 }}>PAYMENT SCREENSHOT</p>
              <img src={payment.screenshot} alt="Payment proof" style={{ width: '100%', borderRadius: 10, border: '1px solid #e2e8f0', maxHeight: 200, objectFit: 'cover' }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const MyProfile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [openSection, setOpenSection] = useState(null);
  const [payments, setPayments] = useState([]);
  
  // Edit state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = React.useRef(null);

  // Room Change State
  const [roomChangeRequests, setRoomChangeRequests] = useState([]);
  const [isRoomChangeModalOpen, setIsRoomChangeModalOpen] = useState(false);
  const [reqReason, setReqReason] = useState('');
  const [reqPreference, setReqPreference] = useState('');
  const [isSubmittingReq, setIsSubmittingReq] = useState(false);

  const [tenantData, setTenantData] = useState(null);

  // Inventory & Exchange State
  const [allocatedInventory, setAllocatedInventory] = useState([]);
  const [inventoryExchangeRequests, setInventoryExchangeRequests] = useState([]);
  const [isExchangeModalOpen, setIsExchangeModalOpen] = useState(false);
  const [selectedExchangeItem, setSelectedExchangeItem] = useState(null);
  const [customExchangeItemName, setCustomExchangeItemName] = useState('');
  const [exchangeReason, setExchangeReason] = useState('Damaged / Broken');
  const [exchangeDescription, setExchangeDescription] = useState('');
  const [exchangePhoto, setExchangePhoto] = useState(null);
  const [isSubmittingExchange, setIsSubmittingExchange] = useState(false);
  const [viewExchangeModalData, setViewExchangeModalData] = useState(null);
  const [itemStoryModal, setItemStoryModal] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const exchangeFileInputRef = React.useRef(null);

  // Co-Residents / Roommates State
  const [isAddRoommateModalOpen, setIsAddRoommateModalOpen] = useState(false);
  const [newRoommate, setNewRoommate] = useState({ name: '', phone: '', relation: 'Roommate', aadhar: '' });
  const [isSavingRoommate, setIsSavingRoommate] = useState(false);

  const handleConfirmExchangeInProfile = async (ex) => {
    if (!user?.uid || !ex) return;
    try {
      const nowIso = new Date().toISOString();
      const exDocId = ex.docId || ex.id;
      if (exDocId) {
        await updateDoc(doc(db, 'inventory_exchange_requests', exDocId), {
          status: 'Confirmed',
          confirmedAt: nowIso,
          confirmedBy: user.uid
        });
      }
      try {
        const uReqSnap = await getDocs(query(collection(db, 'users', user.uid, 'requests'), where('exchangeRequestId', '==', exDocId)));
        await Promise.all(uReqSnap.docs.map(d => updateDoc(d.ref, { status: 'Confirmed', confirmedAt: nowIso })));
      } catch (e) {}

      setInventoryExchangeRequests(prev => prev.map(r => (r.docId === exDocId || r.id === exDocId) ? { ...r, status: 'Confirmed', confirmedAt: nowIso } : r));
      if (viewExchangeModalData && (viewExchangeModalData.docId === exDocId || viewExchangeModalData.id === exDocId)) {
        setViewExchangeModalData(prev => ({ ...prev, status: 'Confirmed', confirmedAt: nowIso }));
      }
      if (itemStoryModal) {
        setItemStoryModal(prev => ({
          ...prev,
          history: prev.history.map(r => (r.docId === exDocId || r.id === exDocId) ? { ...r, status: 'Confirmed', confirmedAt: nowIso } : r)
        }));
      }
      alert('Thank you! Replacement confirmed successfully.');
    } catch (err) {
      console.error(err);
      alert('Failed to confirm exchange.');
    }
  };

  const handleDisputeExchangeInProfile = async (ex) => {
    if (!user?.uid || !ex) return;
    const reason = window.prompt('Why are you disputing this exchange? (e.g. Replacement item not received or damaged):', 'Replacement item not received');
    if (reason === null) return;
    try {
      const nowIso = new Date().toISOString();
      const exDocId = ex.docId || ex.id;
      if (exDocId) {
        await updateDoc(doc(db, 'inventory_exchange_requests', exDocId), {
          status: 'Disputed',
          disputeNote: reason || 'Disputed by student',
          disputedAt: nowIso,
          disputedBy: user.uid
        });
      }
      try {
        const uReqSnap = await getDocs(query(collection(db, 'users', user.uid, 'requests'), where('exchangeRequestId', '==', exDocId)));
        await Promise.all(uReqSnap.docs.map(d => updateDoc(d.ref, { status: 'Disputed', disputeNote: reason, disputedAt: nowIso })));
      } catch (e) {}

      setInventoryExchangeRequests(prev => prev.map(r => (r.docId === exDocId || r.id === exDocId) ? { ...r, status: 'Disputed', disputeNote: reason, disputedAt: nowIso } : r));
      if (viewExchangeModalData && (viewExchangeModalData.docId === exDocId || viewExchangeModalData.id === exDocId)) {
        setViewExchangeModalData(prev => ({ ...prev, status: 'Disputed', disputeNote: reason, disputedAt: nowIso }));
      }
      if (itemStoryModal) {
        setItemStoryModal(prev => ({
          ...prev,
          history: prev.history.map(r => (r.docId === exDocId || r.id === exDocId) ? { ...r, status: 'Disputed', disputeNote: reason, disputedAt: nowIso } : r)
        }));
      }
      alert('Dispute recorded. PG Admin will review your dispute.');
    } catch (err) {
      console.error(err);
      alert('Failed to dispute exchange.');
    }
  };

  const handleSaveRoommate = async () => {
    if (!newRoommate.name.trim() || !user?.uid) return;
    setIsSavingRoommate(true);
    try {
      const currentList = user?.coResidents || user?.subscribedPG?.coResidents || tenantData?.coResidents || [];
      const updatedList = [...currentList, { ...newRoommate, id: 'cr_' + Date.now() }];
      
      await updateDoc(doc(db, 'users', user.uid), {
        coResidents: updatedList,
        'subscribedPG.coResidents': updatedList
      });
      await updateDoc(doc(db, 'tenants', user.uid), {
        coResidents: updatedList,
        'subscribedPG.coResidents': updatedList
      }).catch(() => {});

      setNewRoommate({ name: '', phone: '', relation: 'Roommate', aadhar: '' });
      setIsAddRoommateModalOpen(false);
    } catch (err) {
      console.error('Failed to add roommate:', err);
      alert('Failed to save roommate details.');
    } finally {
      setIsSavingRoommate(false);
    }
  };

  const handleRemoveRoommate = async (crId, index) => {
    if (!user?.uid) return;
    try {
      const currentList = user?.coResidents || user?.subscribedPG?.coResidents || tenantData?.coResidents || [];
      const updatedList = currentList.filter((cr, idx) => (cr.id ? cr.id !== crId : idx !== index));
      await updateDoc(doc(db, 'users', user.uid), {
        coResidents: updatedList,
        'subscribedPG.coResidents': updatedList
      });
      await updateDoc(doc(db, 'tenants', user.uid), {
        coResidents: updatedList,
        'subscribedPG.coResidents': updatedList
      }).catch(() => {});
    } catch (err) {
      console.error('Failed to remove roommate:', err);
    }
  };

  const profileData = user?.profileData || {};
  const kycData = profileData.kycData || {};
  const personal = profileData.personalDetails || kycData || {};
  const parents = profileData.parentsDetails || kycData || {};
  const kyc = kycData.aadharNumber ? kycData : (profileData.kyc || {});
  const roomDetails = profileData.roomDetails || {};
  const occupation = profileData.occupation || kycData || {};
  const emergency = profileData.emergencyContact || {};

  const getValidVal = (val1, val2, val3) => {
    for (let v of [val1, val2, val3]) {
      if (v !== undefined && v !== null && String(v).trim() !== '' && String(v).trim().toLowerCase() !== 'unassigned') return String(v);
    }
    return '—';
  };

  const roomNumber = getValidVal(roomDetails.roomNumber, user?.subscribedPG?.roomNo, tenantData?.roomNo);
  const bedNumber = getValidVal(roomDetails.bedNumber, user?.subscribedPG?.bedNo, tenantData?.bedNo);
  
  const monthlyRent = getValidVal(roomDetails.monthlyRent, user?.subscribedPG?.leaseAmount, tenantData?.rentAmount);
  const securityAmt = getValidVal(roomDetails.securityAmount, user?.subscribedPG?.securityAmount, tenantData?.securityDeposit);
  const roomType = getValidVal(user?.subscribedPG?.seaterLabel, user?.demandedToken?.seaterLabel, tenantData?.seaterLabel);
  const joinedDate = tenantData?.joiningDate || tenantData?.dateOfJoining || profileData?.joiningDate || profileData?.joinDate || user?.subscribedPG?.joiningDate || user?.joiningDate || user?.createdAt;

  const leaseType = user?.subscribedPG?.leaseType || tenantData?.leaseType || user?.leaseType || 'bed_sharing';
  const foodIncluded = user?.subscribedPG?.foodIncluded !== undefined ? user.subscribedPG.foodIncluded : (tenantData?.foodIncluded !== undefined ? tenantData.foodIncluded : (user?.foodIncluded !== undefined ? user.foodIncluded : true));
  const includedFoodPersons = user?.subscribedPG?.includedFoodPersons || tenantData?.includedFoodPersons || 1;
  const coResidents = user?.coResidents || user?.subscribedPG?.coResidents || tenantData?.coResidents || [];
  const isPrimaryPayer = user?.isPrimaryPayer || tenantData?.isPrimaryPayer || (leaseType === 'entire_room') || (coResidents.length > 0);



  useEffect(() => {
    if (!user?.uid) return;

    // Fetch tenant data just in case room is only saved there (backward compatibility)
    import('firebase/firestore').then(({ getDoc, doc }) => {
      getDoc(doc(db, 'tenants', user.uid)).then(d => {
        if (d.exists()) setTenantData(d.data());
      }).catch(() => {});
    });

    const q = query(collection(db, 'users', user.uid, 'payments'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPayments(snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() })));
    });

    const rq = query(collection(db, 'room_change_requests'), where('tenantId', '==', user.uid));
    const unsubReq = onSnapshot(rq, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() }));
      data.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      setRoomChangeRequests(data);
    });

    const invQ = query(collection(db, 'inventory_allocations'), where('targetId', '==', user.uid));
    const unsubInv = onSnapshot(invQ, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        docId: doc.id,
        id: doc.id,
        name: doc.data().itemName || 'Item',
        qty: doc.data().qty || 1,
        icon: doc.data().icon || 'package',
        conditionImage: doc.data().conditionImage || null
      }));
      setAllocatedInventory(items);
    });

    const exQ = query(collection(db, 'inventory_exchange_requests'), where('tenantId', '==', user.uid));
    const unsubEx = onSnapshot(exQ, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() }));
      data.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setInventoryExchangeRequests(data);
    });

    return () => {
      unsubscribe();
      unsubReq();
      unsubInv();
      unsubEx();
    };
  }, [user]);

  const toggleSection = (section) => {
    setOpenSection(openSection === section ? null : section);
  };

  const openEditModal = () => {
    setEditName(user?.name || '');
    setEditPhotoUrl(kyc.profilePhoto || '');
    setIsEditModalOpen(true);
  };

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const max_size = 800;

          if (width > height) {
            if (width > max_size) {
              height *= max_size / width;
              width = max_size;
            }
          } else {
            if (height > max_size) {
              width *= max_size / height;
              height = max_size;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const compressedDataUrl = await compressImage(file);
        setEditPhotoUrl(compressedDataUrl);
      } catch (err) {
        console.error("Error compressing image", err);
        alert("Failed to process image.");
      }
    }
  };

  const saveProfile = async () => {
    if (!user?.uid) return;
    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        name: editName,
        'kyc.profilePhoto': editPhotoUrl
      });
      setIsEditModalOpen(false);
    } catch (err) {
      console.error("Error updating profile", err);
      alert("Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const submitRoomChangeRequest = async () => {
    if (!user?.uid || !reqReason.trim()) return;
    setIsSubmittingReq(true);
    try {
      const aId = user?.subscribedPG?.adminId || user?.subscribedPG?.pgId || 'none';
      const rawPgId = user?.subscribedPG?.pgId;
      const pId = (!rawPgId || rawPgId === aId) ? 'primary' : rawPgId;
      const nowIso = new Date().toISOString();

      const newReq = {
        adminId: aId,
        pgId: pId,
        tenantId: user.uid,
        tenantName: user.name || 'Student',
        tenantPhone: user.phone || user.phoneNumber || '',
        currentRoom: roomNumber !== '—' ? roomNumber : 'Unassigned',
        currentBed: user?.subscribedPG?.bedNo || user?.bedNo || tenantData?.bedNo || 'N/A',
        reason: reqReason.trim(),
        preference: reqPreference.trim() || 'Any suitable room/bed',
        status: 'Pending',
        date: nowIso,
        createdAt: nowIso
      };
      
      const docRef = await addDoc(collection(db, 'room_change_requests'), newReq);

      // Notify Admin / Manager in notifications collection
      if (aId && aId !== 'none') {
        try {
          await addDoc(collection(db, 'notifications'), {
            adminId: aId,
            pgId: pId,
            tenantId: user.uid,
            tenantName: user.name || 'Student',
            roomNo: roomNumber !== '—' ? roomNumber : 'N/A',
            title: '🔄 Room Change Request',
            desc: `${user.name || 'Student'} (Room ${roomNumber}) requested a room change: "${reqReason.trim()}"`,
            type: 'Room Change Request',
            category: 'room',
            action: 'VIEW_ROOM_REQUESTS',
            roomChangeRequestId: docRef.id,
            resolved: false,
            createdAt: nowIso,
            date: nowIso
          });
        } catch (ne) {
          console.warn('Could not add admin notification:', ne);
        }
      }

      setIsRoomChangeModalOpen(false);
      setReqReason('');
      setReqPreference('');
      alert("Your room change request has been submitted to Admin / Manager for allocation!");
    } catch (err) {
      console.error("Error submitting request", err);
      alert("Failed to submit request: " + err.message);
    } finally {
      setIsSubmittingReq(false);
    }
  };

  const getFallbackItems = () => {
    const invMap = tenantData?.inventory || user?.subscribedPG?.inventory;
    if (invMap && typeof invMap === 'object' && !Array.isArray(invMap) && Object.keys(invMap).length > 0) {
      return Object.entries(invMap).map(([k, img]) => ({
        id: k,
        name: k.replace('inv-custom-', '').replace(/_/g, ' ').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        qty: 1,
        icon: k,
        conditionImage: typeof img === 'string' ? img : null
      }));
    }
    if (Array.isArray(roomDetails.inventory) && roomDetails.inventory.length > 0) {
      return roomDetails.inventory.map((name, i) => ({
        id: `item-${i}`,
        name: String(name),
        qty: 1,
        icon: 'package',
        conditionImage: null
      }));
    }
    return [];
  };

  const displayInventory = allocatedInventory.length > 0 ? allocatedInventory : getFallbackItems();

  const handleExchangePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const compressed = await compressImage(file);
        setExchangePhoto(compressed);
      } catch (err) {
        console.error('Error compressing exchange photo:', err);
        alert('Failed to process image.');
      }
    }
  };

  const submitExchangeRequest = async () => {
    const finalItemName = selectedExchangeItem?.id === 'other'
      ? customExchangeItemName.trim()
      : (selectedExchangeItem?.name || '');

    if (!finalItemName) {
      alert('Please select or specify an item to exchange.');
      return;
    }
    if (!exchangeDescription.trim()) {
      alert('Please describe why you need an exchange (e.g. broken, damaged, malfunctioning).');
      return;
    }

    setIsSubmittingExchange(true);
    try {
      const aId = user?.subscribedPG?.adminId || tenantData?.adminId || user?.subscribedPG?.pgId || 'primary';
      const rawPgId = user?.subscribedPG?.pgId || tenantData?.pgId;
      const pId = (!rawPgId || rawPgId === aId) ? 'primary' : rawPgId;
      const pgName = user?.subscribedPG?.pgName || tenantData?.pgName || '';
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

      const exPayload = {
        tenantId: user.uid,
        tenantName: user.name || profileData.name || 'Student',
        tenantPhone: user.phone || profileData.phone || personal.phone || '',
        roomNo: roomNumber !== '—' ? roomNumber : 'N/A',
        bedNo: bedNumber !== '—' ? bedNumber : 'N/A',
        adminId: aId,
        pgId: pId,
        pgName: pgName,
        itemId: selectedExchangeItem?.id || finalItemName,
        itemName: finalItemName,
        reason: exchangeReason,
        description: exchangeDescription.trim(),
        photo: exchangePhoto || null,
        status: 'Pending',
        createdAt: now.toISOString(),
        date: dateStr
      };

      // 1. Add to inventory_exchange_requests
      const exDocRef = await addDoc(collection(db, 'inventory_exchange_requests'), exPayload);

      // 2. Add notification for PG Admin
      await addDoc(collection(db, 'notifications'), {
        adminId: aId,
        pgId: pId,
        tenantId: user.uid,
        tenant: user.name || profileData.name || 'Student',
        room: roomNumber !== '—' ? roomNumber : 'N/A',
        phone: user.phone || profileData.phone || personal.phone || '',
        type: 'Inventory Exchange',
        category: 'inventory',
        desc: `Exchange request for ${finalItemName} (${exchangeReason}): ${exchangeDescription.trim()}`,
        reason: exchangeReason,
        itemName: finalItemName,
        itemId: selectedExchangeItem?.id || finalItemName,
        photo: exchangePhoto || null,
        exchangeRequestId: exDocRef.id,
        resolved: false,
        createdAt: now.toISOString(),
        date: now.toISOString()
      });

      // 3. Add to user's own requests collection so it displays in RequestBox
      await addDoc(collection(db, 'users', user.uid, 'requests'), {
        id: `req-${Date.now()}`,
        date: dateStr,
        request: `Exchange: ${finalItemName}`,
        description: `${exchangeReason} - ${exchangeDescription.trim()}`,
        type: 'Inventory Exchange',
        itemId: selectedExchangeItem?.id || finalItemName,
        itemName: finalItemName,
        reason: exchangeReason,
        photo: exchangePhoto || null,
        exchangeRequestId: exDocRef.id,
        status: 'Pending',
        createdAt: now.toISOString()
      });

      setIsExchangeModalOpen(false);
      setSelectedExchangeItem(null);
      setCustomExchangeItemName('');
      setExchangeDescription('');
      setExchangePhoto(null);
      alert('Exchange request submitted successfully! PG Admin will review your request.');
    } catch (err) {
      console.error('Error submitting exchange request:', err);
      alert('Failed to submit exchange request: ' + err.message);
    } finally {
      setIsSubmittingExchange(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'Not available';
    return new Date(isoString).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const avatarSrc = kyc.profilePhoto ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'S')}&background=064e3b&color=bbf7d0&bold=true&size=200`;

  return (
    <div className="profile-page">
      <div className="profile-scroll">

        {/* ── HERO ── */}
        <div className="profile-hero">
          <div className="profile-topbar">
            <span className="profile-topbar-title">My Profile</span>
            <button className="profile-edit-btn" onClick={openEditModal}>Edit ✏️</button>
          </div>

          <div className="profile-avatar-section">
            <div className="profile-avatar-ring">
              <img src={avatarSrc} alt="avatar" className="profile-avatar" />
              <div className="profile-verified-badge">
                <Check size={12} strokeWidth={3} color="white" />
              </div>
            </div>
            <h2 className="profile-name">{user?.name || 'Student'}</h2>
            <p className="profile-email">{user?.email || ''}</p>
            <div className="profile-status-pill">
              <span className="status-dot" />
              {roomDetails.status || 'Active Member'}
            </div>
          </div>
        </div>

        {/* ── STATS ROW ── */}
        <div className="profile-stats-row">
          {user?.hasPG && (
            <>
              <div className="profile-stat-card">
                <div className="profile-stat-icon"><Home size={18} /></div>
                <div className="profile-stat-val">{roomNumber}</div>
                <div className="profile-stat-label">Room</div>
              </div>
              <div className="profile-stat-card">
                <div className="profile-stat-icon"><Bed size={18} /></div>
                <div className="profile-stat-val">{bedNumber}</div>
                <div className="profile-stat-label">Bed</div>
              </div>
            </>
          )}
          <div className="profile-stat-card">
            <div className="profile-stat-icon"><Clock size={18} /></div>
            <div className="profile-stat-val" style={{ fontSize: '13px' }}>
              {joinedDate ? new Date(joinedDate).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }) : '—'}
            </div>
            <div className="profile-stat-label">Joined</div>
          </div>
        </div>

        {/* ── ROOM CHANGE STATUS BANNER ── */}
        {roomChangeRequests.length > 0 && (
          <div style={{ margin: '0 20px 24px', padding: '14px 16px', borderRadius: '14px', background: roomChangeRequests[0].status === 'Approved' ? '#dcfce7' : roomChangeRequests[0].status === 'Rejected' ? '#fee2e2' : '#eff6ff', border: '1px solid', borderColor: roomChangeRequests[0].status === 'Approved' ? '#bbf7d0' : roomChangeRequests[0].status === 'Rejected' ? '#fecaca' : '#bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ flex: 1, marginRight: 8 }}>
              <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 }}>Room Change Status</p>
              <p style={{ margin: 0, fontSize: '13.5px', fontWeight: '700', color: roomChangeRequests[0].status === 'Approved' ? '#166534' : roomChangeRequests[0].status === 'Rejected' ? '#991b1b' : '#1d4ed8' }}>
                {roomChangeRequests[0].status === 'Approved' ? `Approved ➜ Shifted to Room ${roomChangeRequests[0].newRoom || roomChangeRequests[0].requestedRoom}` : roomChangeRequests[0].status === 'Rejected' ? `Declined: "${roomChangeRequests[0].rejectionReason || 'Unavailable'}"` : 'Request Under Review by Admin / Manager'}
              </p>
            </div>
            <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: roomChangeRequests[0].status === 'Approved' ? '#166534' : roomChangeRequests[0].status === 'Rejected' ? '#991b1b' : '#1d4ed8', padding: '6px 10px', borderRadius: '20px', background: 'rgba(255,255,255,0.7)', flexShrink: 0 }}>
              {roomChangeRequests[0].status === 'Approved' ? 'Approved' : roomChangeRequests[0].status === 'Rejected' ? 'Declined' : 'In Review'}
            </span>
          </div>
        )}

        {/* ── QUICK ACTIONS ── */}
        {user?.hasPG && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', padding: '0 20px', marginBottom: '24px' }}>
            <button 
              onClick={() => navigate('/account')}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '16px', color: '#1e293b', fontWeight: '600', boxShadow: '0 2px 8px rgba(0,0,0, 0.02)', cursor: 'pointer' }}
            >
              <div style={{ background: '#dcfce7', padding: '8px', borderRadius: '10px' }}><Wallet size={20} color="#166534" /></div>
              <span style={{ fontSize: '12px' }}>Payments</span>
            </button>
            <button 
              onClick={() => navigate('/reminder')}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '16px', color: '#1e293b', fontWeight: '600', boxShadow: '0 2px 8px rgba(0,0,0, 0.02)', cursor: 'pointer' }}
            >
              <div style={{ background: '#fef3c7', padding: '8px', borderRadius: '10px' }}><Clock size={20} color="#b45309" /></div>
              <span style={{ fontSize: '12px' }}>Reminders</span>
            </button>
            <button 
              onClick={() => { setIsRoomChangeModalOpen(true); setReqReason(''); setReqPreference(''); }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '16px', color: '#1e293b', fontWeight: '600', boxShadow: '0 2px 8px rgba(0,0,0, 0.02)', cursor: 'pointer' }}
            >
              <div style={{ background: '#e0f2fe', padding: '8px', borderRadius: '10px' }}><RefreshCw size={20} color="#0369a1" /></div>
              <span style={{ fontSize: '12px' }}>Change Room</span>
            </button>
          </div>
        )}


        {/* ── SECTIONS ── */}
        <div className="profile-sections">

          <Section
            icon={<User size={18} />}
            title="Personal Details"
            subtitle="Name, blood group, diet"
            sectionKey="personal"
            openSection={openSection}
            onToggle={toggleSection}
          >
            <DetailRow label="Full Name" value={user?.name} />
            <div className="pf-detail-divider" />
            <DetailRow label="Email" value={user?.email} />
            <div className="pf-detail-divider" />
            <DetailRow label="Blood Group" value={personal.bloodGroup} type="highlight" />
            <div className="pf-detail-divider" />
            <DetailRow label="Diet" value={personal.dietaryPreference} />
            <div className="pf-detail-divider" />
            <DetailRow label="Address" value={personal.permanentAddress} />
          </Section>

          {user?.hasPG && (
            <Section
              icon={<Users size={18} />}
              title="Parents Details"
              subtitle="Father's & Mother's info"
              sectionKey="parents"
              openSection={openSection}
              onToggle={toggleSection}
            >
              <DetailRow label="Father's Name" value={parents.fatherName} />
              <div className="pf-detail-divider" />
              <DetailRow label="Father's Phone" value={parents.fatherPhone} />
              <div className="pf-detail-divider" />
              <DetailRow label="Mother's Name" value={parents.motherName} />
              <div className="pf-detail-divider" />
              <DetailRow label="Mother's Phone" value={parents.motherPhone} />
            </Section>
          )}

          {user?.hasPG && (occupation.type || occupation.occupationType) && (
            <Section
              icon={<Briefcase size={18} />}
              title="Occupation Details"
              subtitle={occupation.type || occupation.occupationType}
              sectionKey="occupation"
              openSection={openSection}
              onToggle={toggleSection}
            >
              <DetailRow label="Type" value={occupation.type || occupation.occupationType} style={{ textTransform: 'capitalize' }} />
              <div className="pf-detail-divider" />
              <DetailRow label={(occupation.type || occupation.occupationType)?.toLowerCase() === 'student' ? 'College/School' : 'Company'} value={occupation.details || occupation.collegeName || occupation.companyName} />
              {occupation.role && (
                <>
                  <div className="pf-detail-divider" />
                  <DetailRow label={(occupation.type || occupation.occupationType)?.toLowerCase() === 'student' ? 'Course' : 'Role'} value={occupation.role} />
                </>
              )}
            </Section>
          )}

          {user?.hasPG && (
            <Section
              icon={<HeartPulse size={18} />}
              title="Identity & Emergency"
              subtitle="Aadhaar & Contacts"
              sectionKey="identity"
              openSection={openSection}
              onToggle={toggleSection}
            >
              <DetailRow label="Aadhaar Number" value={kyc.aadharNumber || kyc.aadhaarNumber} />
              <div className="pf-detail-divider" />
              <DetailRow label="Date of Birth" value={profileData.dob || kycData.dob} />
              <div className="pf-detail-divider" />
              <DetailRow label="Emergency Contact" value={emergency.name} />
              <div className="pf-detail-divider" />
              <DetailRow label="Emergency Phone" value={emergency.phone} />
              <div className="pf-detail-divider" />
              <DetailRow label="Blood Group" value={emergency.bloodGroup || personal.bloodGroup} type="highlight" />
            </Section>
          )}

          <Section
            icon={<Calendar size={18} />}
            title="Date of Joining"
            subtitle={formatDate(joinedDate)}
            sectionKey="doj"
            openSection={openSection}
            onToggle={toggleSection}
          >
            <DetailRow label="Joined On" value={formatDate(joinedDate)} />
          </Section>

          {user?.hasPG && (
            <Section
              icon={<Home size={18} />}
              title="Room Details"
              subtitle={leaseType === 'entire_room' ? `Entire Flat · Room ${roomNumber}` : `${roomType !== '—' ? roomType + ' · ' : ''}Room ${roomNumber} · Bed ${bedNumber}`}
              sectionKey="room"
              openSection={openSection}
              onToggle={toggleSection}
            >
              <DetailRow label="Room Number" value={roomNumber} type="highlight" />
              <div className="pf-detail-divider" />
              {leaseType === 'entire_room' ? (
                <>
                  <DetailRow label="Lease Type" value="Entire Flat / Single Payer" type="highlight" />
                  <div className="pf-detail-divider" />
                  <DetailRow label="Mess / Food" value={foodIncluded ? `Included (${includedFoodPersons} Persons)` : 'Self-Cooking (Excluded)'} />
                </>
              ) : (
                <>
                  <DetailRow label="Bed Number" value={bedNumber} type="highlight" />
                  <div className="pf-detail-divider" />
                  <DetailRow label="Mess / Food" value={foodIncluded ? 'Included in Package' : 'Self-Cooking (Excluded)'} />
                </>
              )}
            </Section>
          )}

          {user?.hasPG && (isPrimaryPayer || leaseType === 'entire_room' || coResidents.length > 0) && (
            <Section
              icon={<Users size={18} />}
              title="Roommates & Co-Residents"
              subtitle={`${coResidents.length} registered member${coResidents.length !== 1 ? 's' : ''}`}
              sectionKey="coresidents"
              openSection={openSection}
              onToggle={toggleSection}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {coResidents.length === 0 ? (
                  <p style={{ margin: 0, padding: '8px 0', fontSize: '13px', color: '#94a3b8', textAlign: 'center' }}>
                    No roommates added yet. You can add non-paying co-residents living in your room.
                  </p>
                ) : (
                  coResidents.map((cr, idx) => (
                    <div key={cr.id || idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>{cr.name}</span>
                          <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '6px', background: '#ecfdf5', color: '#059669' }}>
                            {cr.relation || 'Roommate'}
                          </span>
                        </div>
                        {cr.phone && (
                          <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                            📞 {cr.phone}
                          </p>
                        )}
                        {cr.aadhar && (
                          <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94a3b8' }}>
                            ID: {cr.aadhar}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveRoommate(cr.id, idx)}
                        style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '6px', color: '#ef4444', cursor: 'pointer', display: 'flex' }}
                        title="Remove roommate"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))
                )}

                <button
                  onClick={() => setIsAddRoommateModalOpen(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px',
                    borderRadius: '10px',
                    background: '#ecfdf5',
                    border: '1.5px dashed #059669',
                    color: '#059669',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    marginTop: '4px'
                  }}
                >
                  <Users size={16} /> + Add Roommate / Co-Resident
                </button>
              </div>
            </Section>
          )}

          {user?.hasPG && (
            <Section
              icon={<Box size={18} />}
              title="Inventory Allotted"
              subtitle={`${displayInventory.length} item${displayInventory.length !== 1 ? 's' : ''} in room`}
              sectionKey="inventory"
              openSection={openSection}
              onToggle={toggleSection}
            >
              {displayInventory.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                  No inventory items allotted yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {displayInventory.map((item, idx) => {
                    const activeExReq = inventoryExchangeRequests.find(r =>
                      (r.itemId === item.id || r.itemName?.toLowerCase() === item.name?.toLowerCase()) &&
                      (r.status === 'Pending' || r.status === 'Approved')
                    );
                    const pastExReq = !activeExReq ? inventoryExchangeRequests.find(r =>
                      (r.itemId === item.id || r.itemName?.toLowerCase() === item.name?.toLowerCase())
                    ) : null;
                    const displayReq = activeExReq || pastExReq;

                    return (
                      <div
                        key={item.id || idx}
                        style={{
                          background: '#f8fafc',
                          border: '1.5px solid #e2e8f0',
                          borderRadius: '14px',
                          padding: '12px 14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                            {item.conditionImage ? (
                              <img
                                src={item.conditionImage}
                                alt={item.name}
                                onClick={(e) => { e.stopPropagation(); setPreviewImage(item.conditionImage); }}
                                style={{
                                  width: '42px',
                                  height: '42px',
                                  borderRadius: '10px',
                                  objectFit: 'cover',
                                  border: '2px solid #0891b2',
                                  cursor: 'pointer',
                                  flexShrink: 0
                                }}
                                title="Click to view condition photo"
                              />
                            ) : (
                              <div
                                style={{
                                  width: '42px',
                                  height: '42px',
                                  borderRadius: '10px',
                                  background: '#ecfeff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#0891b2',
                                  flexShrink: 0
                                }}
                              >
                                <Box size={20} />
                              </div>
                            )}
                            <div style={{ minWidth: 0 }}>
                              <p style={{ margin: 0, fontWeight: 700, fontSize: '14px', color: '#0f172a', textTransform: 'capitalize' }}>
                                {item.name}
                              </p>
                              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                                Qty: {item.qty || 1} {item.conditionImage && '· 📸 Photo verified'}
                              </p>
                            </div>
                          </div>

                          {/* Action / Status */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            {activeExReq ? (
                              <button
                                onClick={() => setViewExchangeModalData(activeExReq)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '6px 10px',
                                  borderRadius: '10px',
                                  border: 'none',
                                  background: activeExReq.status === 'Approved' ? '#ecfdf5' : '#fffbeb',
                                  color: activeExReq.status === 'Approved' ? '#059669' : '#d97706',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                <RefreshCw size={12} className={activeExReq.status === 'Pending' ? 'animate-spin' : ''} />
                                {activeExReq.status === 'Approved' ? 'Approved' : 'Pending'}
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedExchangeItem(item);
                                  setIsExchangeModalOpen(true);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '6px 12px',
                                  borderRadius: '10px',
                                  border: '1px solid #0891b2',
                                  background: '#ecfeff',
                                  color: '#0891b2',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  transition: '0.2s'
                                }}
                              >
                                <ArrowLeftRight size={13} />
                                Exchange
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Item Exchange Story strip */}
                        {(() => {
                          const itemExchanges = inventoryExchangeRequests.filter(r => 
                            (r.itemId && r.itemId === item.id) ||
                            (r.itemName && item.name && r.itemName.toLowerCase() === item.name.toLowerCase())
                          );
                          return (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '8px 10px', borderRadius: '10px', border: '1px solid #f1f5f9', marginTop: '6px' }}>
                              <button
                                onClick={() => setItemStoryModal({ item, history: itemExchanges })}
                                style={{
                                  background: itemExchanges.length > 0 ? '#ecfeff' : '#f8fafc',
                                  border: `1px solid ${itemExchanges.length > 0 ? '#a5f3fc' : '#e2e8f0'}`,
                                  borderRadius: '8px',
                                  padding: '4px 10px',
                                  color: itemExchanges.length > 0 ? '#0891b2' : '#64748b',
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '5px'
                                }}
                              >
                                <Clock size={12} />
                                {itemExchanges.length > 0 ? `Exchange Story (${itemExchanges.length})` : 'Exchange Story'}
                              </button>

                              {activeExReq ? (
                                <span
                                  onClick={() => setViewExchangeModalData(activeExReq)}
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    color: activeExReq.status === 'Approved' ? '#16a34a' : (activeExReq.status === 'Disputed' ? '#7c3aed' : '#d97706'),
                                    background: activeExReq.status === 'Approved' ? '#dcfce7' : (activeExReq.status === 'Disputed' ? '#faf5ff' : '#fffbeb'),
                                    border: `1px solid ${activeExReq.status === 'Approved' ? '#bbf7d0' : (activeExReq.status === 'Disputed' ? '#ddd6fe' : '#fde68a')}`,
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {activeExReq.status === 'Approved' ? '🔔 Confirm Receipt' : activeExReq.status === 'Disputed' ? '⚠️ Disputed' : '⏳ In Review'}
                                </span>
                              ) : (
                                itemExchanges[0] && (
                                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                                    Last: <strong>{itemExchanges[0].status}</strong>
                                  </span>
                                )
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* General Request Exchange Button */}
              <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed #e2e8f0', display: 'flex', justifyContent: 'center' }}>
                <button
                  onClick={() => {
                    setSelectedExchangeItem(displayInventory[0] || { id: 'other', name: 'Other Item' });
                    setIsExchangeModalOpen(true);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '12px',
                    background: '#f0fdf4',
                    border: '1.5px dashed #16a34a',
                    color: '#166534',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    width: '100%',
                    justifyContent: 'center'
                  }}
                >
                  <ArrowLeftRight size={15} />
                  Request Item Exchange / Replacement
                </button>
              </div>
            </Section>
          )}

          {user?.hasPG && (
            <Section
              icon={<Activity size={18} />}
              title="User Status"
              subtitle="Current account status"
              sectionKey="status"
              openSection={openSection}
              onToggle={toggleSection}
            >
              <DetailRow label="Status" value={roomDetails.status || 'Approved'} type="highlight" />
            </Section>
          )}

          {user?.hasPG && (
            <Section
              icon={<Zap size={18} />}
              title="Meter Unit Details"
              subtitle="Electricity readings"
              sectionKey="meter"
              openSection={openSection}
              onToggle={toggleSection}
            >
              <DetailRow label="Current Reading" value={`${roomDetails.meterReading || 0} Units`} />
            </Section>
          )}

          {user?.hasPG && (
            <Section
              icon={<Coins size={18} />}
              title="Token Amount"
              subtitle="Security token paid"
              sectionKey="token"
              openSection={openSection}
              onToggle={toggleSection}
            >
              <DetailRow label="Amount" value={`₹ ${roomDetails.tokenAmount || '0'}`} type="highlight" />
              <div className="pf-detail-divider" />
              <DetailRow label="Received by" value="Manager" />
            </Section>
          )}

          {user?.hasPG && (
            <Section
              icon={<Clock size={18} />}
              title="Pending Amount"
              subtitle="Outstanding dues"
              sectionKey="pending"
              openSection={openSection}
              onToggle={toggleSection}
            >
              <DetailRow
                label="Due Amount"
                value={`₹ ${roomDetails.pendingAmount || 0}`}
                type={roomDetails.pendingAmount > 0 ? 'warning' : 'highlight'}
              />
            </Section>
          )}

          {user?.hasPG && (
            <Section
              icon={<Bed size={18} />}
              title="Rent / Security"
              subtitle="Monthly rent & deposit"
              sectionKey="rent"
              openSection={openSection}
              onToggle={toggleSection}
            >
              <DetailRow label="Monthly Rent" value={`₹${monthlyRent !== '—' ? monthlyRent : '0'}/mo`} type="highlight" />
              <div className="pf-detail-divider" />
              <DetailRow label="Security Deposit" value={`₹${securityAmt !== '—' ? securityAmt : '0'}`} />
            </Section>
          )}

          {user?.hasPG && (
            <Section
              icon={<ShieldCheck size={18} />}
              title="Police Verification"
              subtitle="Background check status"
              sectionKey="police"
              openSection={openSection}
              onToggle={toggleSection}
            >
              <DetailRow label="Status" value={roomDetails.policeVerification === 'Verified' ? "Verified ✓" : "Pending"} type="highlight" />
            </Section>
          )}

          {user?.hasPG && (
            <Section
              icon={<FileCheck size={18} />}
              title="Documents"
              subtitle="Aadhaar & ID proof"
              sectionKey="doc"
              openSection={openSection}
              onToggle={toggleSection}
            >
              <div className="pf-doc-images">
                <div>
                  <img
                    src={kyc.aadharFront || kyc.aadhaarFront || 'https://images.unsplash.com/photo-1588667509194-e0c1560fecdc?auto=format&fit=crop&q=80&w=600'}
                    alt="Aadhaar Front"
                    className="pf-doc-img"
                  />
                  <div className="pf-doc-label">Aadhaar Front</div>
                </div>
                <div>
                  <img
                    src={kyc.aadharBack || kyc.aadhaarBack || 'https://images.unsplash.com/photo-1588667509194-e0c1560fecdc?auto=format&fit=crop&q=80&w=600'}
                    alt="Aadhaar Back"
                    className="pf-doc-img"
                  />
                  <div className="pf-doc-label">Aadhaar Back</div>
                </div>
              </div>
            </Section>
          )}

        </div>

        {/* ── PAYMENT HISTORY ── */}
        <div className="profile-payments-section">
          <h3 className="profile-payments-heading">Payment History</h3>
          {payments.length === 0 ? (
            <div className="payment-empty">
              <span style={{ fontSize: 32, display: 'block', marginBottom: 8 }}>💳</span>
              <p style={{ margin: 0, color: '#94a3b8', fontWeight: 600 }}>No payments recorded yet</p>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#cbd5e1' }}>Your token & rent payments will appear here</p>
            </div>
          ) : (
            payments.map(payment => {
              const isToken = payment.paymentType === 'token';
              const isDebit = payment.type === 'Debit';
              return (
                <ProfilePaymentCard key={payment.docId} payment={payment} isToken={isToken} isDebit={isDebit} />
              );
            })
          )}
        </div>

        {/* ── LOGOUT ── */}
        <button className="profile-logout-btn" onClick={handleLogout}>
          <LogOut size={18} />
          Log Out
        </button>

      </div>

      {/* ── ADD ROOMMATE / CO-RESIDENT MODAL ── */}
      {isAddRoommateModalOpen && (
        <>
          <div className="filter-modal-backdrop" onClick={() => !isSavingRoommate && setIsAddRoommateModalOpen(false)} />
          <div className="filter-modal">
            <div className="filter-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Add Roommate / Co-Resident</h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>Register roommates living in your room</p>
              </div>
              <button onClick={() => !isSavingRoommate && setIsAddRoommateModalOpen(false)} className="close-btn" disabled={isSavingRoommate}><X size={20}/></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#166534' }}>Full Name *</label>
                <input
                  type="text"
                  value={newRoommate.name}
                  onChange={e => setNewRoommate({ ...newRoommate, name: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1.5px solid #cbd5e1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#166534' }}>Mobile Number</label>
                <input
                  type="tel"
                  value={newRoommate.phone}
                  onChange={e => setNewRoommate({ ...newRoommate, phone: e.target.value })}
                  placeholder="e.g. +91 9876543210"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1.5px solid #cbd5e1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#166534' }}>Relationship</label>
                  <select
                    value={newRoommate.relation}
                    onChange={e => setNewRoommate({ ...newRoommate, relation: e.target.value })}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1.5px solid #cbd5e1', fontSize: '13px', outline: 'none', background: 'white', boxSizing: 'border-box' }}
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#166534' }}>Aadhaar / ID</label>
                  <input
                    type="text"
                    value={newRoommate.aadhar}
                    onChange={e => setNewRoommate({ ...newRoommate, aadhar: e.target.value })}
                    placeholder="ID Number"
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1.5px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </div>

            <button
              className="apply-filter-btn"
              onClick={handleSaveRoommate}
              disabled={isSavingRoommate || !newRoommate.name.trim()}
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                background: '#166534',
                color: 'white',
                opacity: (!newRoommate.name.trim() || isSavingRoommate) ? 0.6 : 1
              }}
            >
              {isSavingRoommate ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Saving Roommate...
                </>
              ) : 'Save Roommate'}
            </button>
          </div>
        </>
      )}

      {/* ── EDIT PROFILE MODAL ── */}
      {isEditModalOpen && (
        <>
          <div className="filter-modal-backdrop" onClick={() => !isSaving && setIsEditModalOpen(false)} />
          <div className="filter-modal">
            <div className="filter-modal-header">
              <h3>Edit Profile</h3>
              <button onClick={() => !isSaving && setIsEditModalOpen(false)} className="close-btn" disabled={isSaving}><X size={20}/></button>
            </div>
            
            <div className="edit-profile-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
              {/* Photo Edit */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div 
                  className="profile-avatar-ring" 
                  style={{ width: '110px', height: '110px', cursor: 'pointer', margin: 0 }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <img 
                    src={editPhotoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(editName || 'S')}&background=064e3b&color=bbf7d0&bold=true&size=200`} 
                    alt="Edit avatar" 
                    className="profile-avatar" 
                  />
                  <div className="edit-camera-badge" style={{ position: 'absolute', bottom: '0', right: '0', background: '#166534', color: 'white', padding: '6px', borderRadius: '50%', border: '2px solid white', display: 'flex' }}>
                    <Camera size={16} />
                  </div>
                </div>
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Tap to change photo</span>
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handlePhotoChange} style={{ display: 'none' }} />
              </div>

              {/* Name Edit */}
              <div className="price-input-wrapper">
                <span style={{ color: '#166534' }}>Name</span>
                <input 
                  type="text" 
                  value={editName} 
                  onChange={e => setEditName(e.target.value)} 
                  placeholder="Your Full Name"
                  style={{ paddingLeft: '64px' }}
                />
              </div>
            </div>

            <button className="apply-filter-btn" onClick={saveProfile} disabled={isSaving} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
              {isSaving ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Saving...
                </>
              ) : 'Save Changes'}
            </button>
          </div>
        </>
      )}

      {/* ── ROOM CHANGE MODAL ── */}
      {isRoomChangeModalOpen && (
        <>
          <div className="filter-modal-backdrop" onClick={() => !isSubmittingReq && setIsRoomChangeModalOpen(false)} />
          <div className="filter-modal">
            <div className="filter-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Request Room Change</h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>Admin / Manager will review and assign your new room</p>
              </div>
              <button onClick={() => !isSubmittingReq && setIsRoomChangeModalOpen(false)} className="close-btn" disabled={isSubmittingReq}><X size={20}/></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div className="price-input-wrapper">
                <span style={{ color: '#64748b' }}>Current</span>
                <input 
                  type="text" 
                  value={roomNumber !== '—' ? `Room ${roomNumber} (Bed ${user?.subscribedPG?.bedNo || user?.bedNo || tenantData?.bedNo || '1'})` : 'Unassigned'} 
                  readOnly
                  style={{ paddingLeft: '80px', background: '#f8fafc', color: '#0f172a', fontWeight: '700' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#0369a1', marginLeft: '4px' }}>
                  Reason for Room Change *
                </span>
                <textarea 
                  value={reqReason} 
                  onChange={e => setReqReason(e.target.value)} 
                  placeholder="Please describe why you would like to change your room (e.g. need ground floor, looking for AC, study requirements, etc.)..."
                  style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1.5px solid #cbd5e1', minHeight: '110px', fontFamily: 'inherit', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#475569', marginLeft: '4px' }}>
                  Room Preference / Special Notes (Optional)
                </span>
                <input 
                  type="text" 
                  value={reqPreference} 
                  onChange={e => setReqPreference(e.target.value)} 
                  placeholder="e.g. Single Seater, 2-Sharing, AC room, near balcony"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1.5px solid #cbd5e1', fontFamily: 'inherit', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '10px', padding: '10px 12px', fontSize: '12px', color: '#0369a1', lineHeight: 1.4 }}>
                ℹ️ Your request will be directly sent to the PG Admin and Manager. They will allocate an available room/bed or swap based on vacancy.
              </div>
            </div>

            <button 
              className="apply-filter-btn" 
              onClick={submitRoomChangeRequest} 
              disabled={isSubmittingReq || !reqReason.trim()} 
              style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: '#0284c7', color: 'white', opacity: (!reqReason.trim() || isSubmittingReq) ? 0.6 : 1 }}
            >
              {isSubmittingReq ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Submitting to Admin...
                </>
              ) : 'Send Request to Management'}
            </button>
          </div>
        </>
      )}

      {/* ── INVENTORY EXCHANGE MODAL ── */}
      {isExchangeModalOpen && (
        <>
          <div className="filter-modal-backdrop" onClick={() => !isSubmittingExchange && setIsExchangeModalOpen(false)} />
          <div className="filter-modal" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="filter-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Request Item Exchange</h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>Request replacement for a damaged or defective item</p>
              </div>
              <button onClick={() => !isSubmittingExchange && setIsExchangeModalOpen(false)} className="close-btn" disabled={isSubmittingExchange}><X size={20}/></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              {/* Select Item */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#0891b2' }}>Item to Exchange</label>
                <select
                  value={selectedExchangeItem?.id || ''}
                  onChange={(e) => {
                    const found = displayInventory.find(i => String(i.id) === e.target.value);
                    if (e.target.value === 'other') {
                      setSelectedExchangeItem({ id: 'other', name: 'Other Item' });
                    } else if (found) {
                      setSelectedExchangeItem(found);
                    }
                  }}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: 'white', fontSize: '14px', fontWeight: 600, outline: 'none', color: '#0f172a' }}
                >
                  <option value="" disabled>Select an allotted item...</option>
                  {displayInventory.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} {item.qty > 1 ? `(Qty: ${item.qty})` : ''}
                    </option>
                  ))}
                  <option value="other">➕ Other Item (Specify)</option>
                </select>

                {selectedExchangeItem?.id === 'other' && (
                  <input
                    type="text"
                    placeholder="Enter item name (e.g. Chair, Mirror, Curtain)..."
                    value={customExchangeItemName}
                    onChange={(e) => setCustomExchangeItemName(e.target.value)}
                    style={{ width: '100%', marginTop: '6px', padding: '12px 14px', borderRadius: '12px', border: '1.5px solid #0891b2', fontSize: '14px', outline: 'none' }}
                  />
                )}
              </div>

              {/* Select Reason */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#0891b2' }}>Reason for Exchange</label>
                <select
                  value={exchangeReason}
                  onChange={(e) => setExchangeReason(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: 'white', fontSize: '14px', fontWeight: 600, outline: 'none', color: '#0f172a' }}
                >
                  <option value="Damaged / Broken">💥 Damaged / Broken</option>
                  <option value="Defective / Not Working">⚠️ Defective / Not Working</option>
                  <option value="Uncomfortable / Poor Quality">🪑 Uncomfortable / Poor Quality</option>
                  <option value="Normal Wear & Tear">⏳ Normal Wear & Tear</option>
                  <option value="Missing / Incomplete">❓ Missing / Incomplete</option>
                  <option value="Other">📝 Other Reason</option>
                </select>
              </div>

              {/* Description */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#0891b2' }}>Issue Description</label>
                <textarea
                  value={exchangeDescription}
                  onChange={(e) => setExchangeDescription(e.target.value)}
                  placeholder="Explain what is wrong with the item (e.g., The chair leg has cracked, remote power button stopped responding)..."
                  style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1.5px solid #e2e8f0', minHeight: '90px', fontFamily: 'inherit', fontSize: '14px', outline: 'none' }}
                />
              </div>

              {/* Photo Proof */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#0891b2' }}>
                  Photo of Damaged Item <span style={{ fontWeight: 400, color: '#64748b' }}>(Optional but recommended)</span>
                </label>
                
                {exchangePhoto ? (
                  <div style={{ position: 'relative', width: '100%', borderRadius: '14px', overflow: 'hidden', border: '1.5px solid #a5f3fc' }}>
                    <img src={exchangePhoto} alt="Exchange Proof" style={{ width: '100%', maxHeight: '180px', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => setExchangePhoto(null)}
                      style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer' }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => exchangeFileInputRef.current?.click()}
                    style={{
                      border: '2px dashed #cbd5e1',
                      borderRadius: '14px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      background: '#f8fafc',
                      transition: '0.2s'
                    }}
                  >
                    <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0891b2' }}>
                      <Camera size={20} />
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Take photo or upload proof</span>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>Helps PG admin verify and approve instantly</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  ref={exchangeFileInputRef}
                  onChange={handleExchangePhotoUpload}
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            <button
              className="apply-filter-btn"
              onClick={submitExchangeRequest}
              disabled={isSubmittingExchange || (!selectedExchangeItem && !customExchangeItemName) || !exchangeDescription.trim()}
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                background: '#0891b2',
                color: 'white',
                padding: '14px',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 700,
                border: 'none',
                cursor: (isSubmittingExchange || (!selectedExchangeItem && !customExchangeItemName) || !exchangeDescription.trim()) ? 'not-allowed' : 'pointer'
              }}
            >
              {isSubmittingExchange ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Submitting Request...
                </>
              ) : (
                <>
                  <ArrowLeftRight size={18} /> Submit Exchange Request
                </>
              )}
            </button>
          </div>
        </>
      )}

      {/* ── VIEW EXCHANGE STATUS MODAL ── */}
      {viewExchangeModalData && (
        <>
          <div className="filter-modal-backdrop" onClick={() => setViewExchangeModalData(null)} />
          <div className="filter-modal">
            <div className="filter-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Exchange Request Details</h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>Item: {viewExchangeModalData.itemName}</p>
              </div>
              <button onClick={() => setViewExchangeModalData(null)} className="close-btn"><X size={20}/></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Status</span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    padding: '4px 10px',
                    borderRadius: '8px',
                    background: viewExchangeModalData.status === 'Approved' ? '#ecfdf5' : (viewExchangeModalData.status === 'Rejected' ? '#fef2f2' : '#fffbeb'),
                    color: viewExchangeModalData.status === 'Approved' ? '#059669' : (viewExchangeModalData.status === 'Rejected' ? '#dc2626' : '#d97706')
                  }}
                >
                  {viewExchangeModalData.status === 'Approved' ? '✅ Approved' : (viewExchangeModalData.status === 'Rejected' ? '❌ Rejected' : '⏳ Pending Review')}
                </span>
              </div>

              <DetailRow label="Item" value={viewExchangeModalData.itemName} />
              <div className="pf-detail-divider" />
              <DetailRow label="Reason" value={viewExchangeModalData.reason} />
              <div className="pf-detail-divider" />
              <DetailRow label="Submitted On" value={viewExchangeModalData.date || (viewExchangeModalData.createdAt ? new Date(viewExchangeModalData.createdAt).toLocaleDateString('en-IN') : 'Recently')} />
              <div className="pf-detail-divider" />
              <div style={{ padding: '0 4px' }}>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Your Notes</span>
                <p style={{ margin: 0, fontSize: '14px', color: '#1e293b', background: '#f8fafc', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  {viewExchangeModalData.description || 'No description provided.'}
                </p>
              </div>

              {viewExchangeModalData.photo && (
                <div style={{ marginTop: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Attached Photo</span>
                  <img
                    src={viewExchangeModalData.photo}
                    alt="Damage proof"
                    onClick={() => setPreviewImage(viewExchangeModalData.photo)}
                    style={{ width: '100%', maxHeight: '160px', objectFit: 'cover', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer' }}
                    title="Click to view full photo"
                  />
                </div>
              )}

              {/* Admin Issued Replacement Item Photo */}
              {viewExchangeModalData.issuedItemPhoto && (
                <div style={{ marginTop: '4px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#166534', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ShieldCheck size={14} /> Replacement Item Issued
                    </span>
                    <span style={{ fontSize: '11px', color: '#0891b2', fontWeight: 700, cursor: 'pointer' }} onClick={() => setPreviewImage(viewExchangeModalData.issuedItemPhoto)}>
                      View Photo
                    </span>
                  </div>
                  <img
                    src={viewExchangeModalData.issuedItemPhoto}
                    alt="Issued replacement item"
                    onClick={() => setPreviewImage(viewExchangeModalData.issuedItemPhoto)}
                    style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #86efac', cursor: 'pointer' }}
                  />
                  {viewExchangeModalData.issuedItemNote && (
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#166534', fontWeight: 600 }}>Note: {viewExchangeModalData.issuedItemNote}</p>
                  )}
                </div>
              )}

              {/* ⚡ Student Confirmation Action Banner (when Approved) */}
              {viewExchangeModalData.status === 'Approved' && (
                <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', padding: '14px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <p style={{ margin: 0, fontSize: '13px', color: '#15803d', fontWeight: 700, lineHeight: 1.4 }}>
                    🔔 Admin approved this exchange. Have you received the replacement item in good condition?
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleConfirmExchangeInProfile(viewExchangeModalData)}
                      style={{ flex: 1, padding: '10px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <CheckCircle2 size={16} /> Confirm Received
                    </button>
                    <button
                      onClick={() => handleDisputeExchangeInProfile(viewExchangeModalData)}
                      style={{ flex: 1, padding: '10px', background: '#faf5ff', color: '#7c3aed', border: '1.5px solid #ddd6fe', borderRadius: '10px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <X size={16} /> Dispute
                    </button>
                  </div>
                </div>
              )}

              {viewExchangeModalData.status === 'Confirmed' && (
                <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '12px', borderRadius: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <CheckCircle2 size={18} color="#059669" />
                  <p style={{ margin: 0, fontSize: '12px', color: '#065f46', fontWeight: 700 }}>
                    You confirmed receipt of this replacement item.
                  </p>
                </div>
              )}

              {viewExchangeModalData.status === 'Disputed' && (
                <div style={{ background: '#faf5ff', border: '1px solid #ddd6fe', padding: '12px', borderRadius: '12px' }}>
                  <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#6d28d9', fontWeight: 800 }}>⚠️ Disputed by You</p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#5b21b6' }}>{viewExchangeModalData.disputeNote || 'Awaiting admin resolution.'}</p>
                </div>
              )}
            </div>

            <button
              onClick={() => setViewExchangeModalData(null)}
              style={{ width: '100%', padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '14px', color: '#475569', cursor: 'pointer' }}
            >
              Close
            </button>
          </div>
        </>
      )}

      {/* ── ITEM EXCHANGE STORY MODAL ── */}
      {itemStoryModal && (
        <>
          <div className="filter-modal-backdrop" onClick={() => setItemStoryModal(null)} />
          <div className="filter-modal" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="filter-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                  📜 Exchange Story: {itemStoryModal.item.name}
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                  Complete replacement & condition history for this item
                </p>
              </div>
              <button onClick={() => setItemStoryModal(null)} className="close-btn"><X size={20}/></button>
            </div>

            {itemStoryModal.history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 16px', color: '#94a3b8' }}>
                <Clock size={36} color="#cbd5e1" style={{ marginBottom: 8 }} />
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#475569' }}>No exchange history recorded</p>
                <p style={{ margin: '4px 0 16px', fontSize: '12px' }}>This item is currently in its original allotted state.</p>
                <button
                  onClick={() => {
                    const it = itemStoryModal.item;
                    setItemStoryModal(null);
                    setSelectedExchangeItem(it);
                    setIsExchangeModalOpen(true);
                  }}
                  style={{ padding: '10px 18px', borderRadius: '10px', background: '#0891b2', color: '#fff', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                >
                  Request Exchange for {itemStoryModal.item.name}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
                {itemStoryModal.history.map((ex, idx) => {
                  const isApproved = ex.status === 'Approved';
                  const isConfirmed = ex.status === 'Confirmed';
                  const isDisputed = ex.status === 'Disputed';
                  const isRejected = ex.status === 'Rejected';

                  return (
                    <div
                      key={ex.docId || ex.id || idx}
                      style={{
                        background: '#fff',
                        borderRadius: '14px',
                        border: '1.5px solid #e2e8f0',
                        borderLeft: isApproved ? '4px solid #16a34a' : isConfirmed ? '4px solid #059669' : isDisputed ? '4px solid #7c3aed' : isRejected ? '4px solid #dc2626' : '4px solid #d97706',
                        padding: '14px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                      }}
                    >
                      {/* Story Card Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>
                            Exchange #{itemStoryModal.history.length - idx}
                          </span>
                          <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                            {ex.date || (ex.createdAt ? new Date(ex.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date N/A')}
                          </p>
                        </div>
                        <span style={{
                          fontSize: '11.5px',
                          fontWeight: 800,
                          padding: '3px 10px',
                          borderRadius: '8px',
                          background: isConfirmed ? '#ecfdf5' : isApproved ? '#f0fdf4' : isDisputed ? '#faf5ff' : isRejected ? '#fef2f2' : '#fffbeb',
                          color: isConfirmed ? '#059669' : isApproved ? '#16a34a' : isDisputed ? '#7c3aed' : isRejected ? '#dc2626' : '#d97706',
                          border: `1px solid ${isConfirmed ? '#a7f3d0' : isApproved ? '#86efac' : isDisputed ? '#ddd6fe' : isRejected ? '#fecaca' : '#fde68a'}`
                        }}>
                          {isConfirmed ? '✓ Confirmed Received' : isApproved ? 'Approved — Confirm?' : isDisputed ? '⚠️ Disputed' : isRejected ? '✕ Declined' : '⏳ In Review'}
                        </span>
                      </div>

                      {/* Request Reason & Notes */}
                      <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '10px', border: '1px solid #f1f5f9', marginBottom: '10px' }}>
                        <p style={{ margin: '0 0 4px', fontSize: '12.5px', color: '#1e293b' }}>
                          Reason: <strong>{ex.reason || 'Replacement'}</strong>
                        </p>
                        {ex.description && (
                          <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>"{ex.description}"</p>
                        )}
                      </div>

                      {/* Student's damage photo */}
                      {ex.photo && (
                        <div style={{ marginBottom: '10px' }}>
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                            Damage Proof Submitted:
                          </span>
                          <img
                            src={ex.photo}
                            alt="Damage proof"
                            onClick={() => setPreviewImage(ex.photo)}
                            style={{ width: '64px', height: '64px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #e2e8f0', cursor: 'pointer' }}
                          />
                        </div>
                      )}

                      {/* Admin New Issued Item Photo */}
                      {ex.issuedItemPhoto && (
                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '10px', marginBottom: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <ShieldCheck size={14} /> Replacement Item Issued
                            </span>
                            <span style={{ fontSize: '11px', color: '#0891b2', fontWeight: 700, cursor: 'pointer' }} onClick={() => setPreviewImage(ex.issuedItemPhoto)}>
                              View Photo
                            </span>
                          </div>
                          <img
                            src={ex.issuedItemPhoto}
                            alt="Issued replacement item"
                            onClick={() => setPreviewImage(ex.issuedItemPhoto)}
                            style={{ width: '70px', height: '70px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #86efac', cursor: 'pointer' }}
                          />
                          {ex.issuedItemNote && (
                            <p style={{ margin: '6px 0 0', fontSize: '11.5px', color: '#166534', fontWeight: 600 }}>Note: {ex.issuedItemNote}</p>
                          )}
                        </div>
                      )}

                      {/* Student Approval / Dispute Buttons when Approved */}
                      {isApproved && (
                        <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '12px', padding: '10px', marginTop: '10px' }}>
                          <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 700, color: '#15803d' }}>
                            🔔 Admin marked this approved. Did you receive the replacement?
                          </p>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => handleConfirmExchangeInProfile(ex)}
                              style={{ flex: 1, padding: '8px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                            >
                              <CheckCircle2 size={14} /> Confirm Received
                            </button>
                            <button
                              onClick={() => handleDisputeExchangeInProfile(ex)}
                              style={{ flex: 1, padding: '8px', background: '#faf5ff', color: '#7c3aed', border: '1px solid #ddd6fe', borderRadius: '8px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                            >
                              <X size={14} /> Dispute
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Confirmed Banner */}
                      {isConfirmed && (
                        <div style={{ background: '#ecfdf5', borderRadius: '8px', padding: '8px 10px', fontSize: '11.5px', color: '#065f46', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <CheckCircle2 size={14} color="#059669" />
                          <span>Replacement confirmed received by you</span>
                        </div>
                      )}

                      {/* Disputed Banner */}
                      {isDisputed && (
                        <div style={{ background: '#faf5ff', border: '1px solid #ddd6fe', borderRadius: '8px', padding: '8px 10px', fontSize: '11.5px', color: '#5b21b6' }}>
                          <strong>Disputed:</strong> {ex.disputeNote || 'Waiting for admin resolution.'}
                        </div>
                      )}

                      {/* Rejected Banner */}
                      {isRejected && ex.rejectionReason && (
                        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '8px 10px', fontSize: '11.5px', color: '#991b1b' }}>
                          <strong>Reason:</strong> {ex.rejectionReason}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={() => setItemStoryModal(null)}
              style={{ width: '100%', padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '14px', color: '#475569', cursor: 'pointer' }}
            >
              Close Story
            </button>
          </div>
        </>
      )}

      {/* ── IMAGE FULL PREVIEW MODAL ── */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}
        >
          <img
            src={previewImage}
            alt="Preview"
            style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setPreviewImage(null)}
            style={{ position: 'absolute', top: '24px', right: '24px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <X size={22} />
          </button>
        </div>
      )}

      <BottomNav activeNav="profile" />
    </div>
  );
};

export default MyProfile;
