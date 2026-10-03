import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, query, where, getDoc, getDocs, doc, updateDoc, setDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { shiftTenantToRoom, swapTenantsBetweenRooms } from '../utils/roomAllocationUtils';

const INVENTORY_ITEMS = [
  { id: 'bed', label: 'Bed', icon: '🛏️' },
  { id: 'mattress', label: 'Mattress', icon: '🛌' },
  { id: 'table', label: 'Table', icon: '🪑' },
  { id: 'chair', label: 'Chair', icon: '💺' },
  { id: 'cupboard', label: 'Cupboard', icon: '🚪' },
  { id: 'ac_remote', label: 'AC Remote', icon: '🎛️' },
  { id: 'keys', label: 'Keys', icon: '🔑' },
  { id: 'dustbin', label: 'Dustbin', icon: '🗑️' }
];

const compressImage = (file, maxWidth = 800) => {
  return new Promise((resolve) => {
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
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

export default function Approvals() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, activePgId } = useAuth();
  
  const [approvalType, setApprovalType] = useState(location.state?.approvalType || location.state?.tab || 'Applications'); // 'Applications' or 'RoomChanges'
  const [activeTab, setActiveTab] = useState('Pending');
  
  const [roomRequests, setRoomRequests] = useState([]);
  const [pgApplications, setPgApplications] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [allRoomsList, setAllRoomsList] = useState([]);
  const [activeTenantsList, setActiveTenantsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  // Modal State for Allotting Application Room
  const [allotModal, setAllotModal] = useState(null);
  const [allotForm, setAllotForm] = useState({ roomNo: '', rentAmount: '', securityDeposit: '', dateOfJoining: new Date().toISOString().split('T')[0], inventory: {} });

  // Modal State for Shift Room (Room Change Request)
  const [shiftModal, setShiftModal] = useState(null);
  const [shiftForm, setShiftForm] = useState({ toRoomNo: '', toBedNo: '1', newRent: '' });

  // Modal State for Swap Residents (Room Change Request)
  const [swapModal, setSwapModal] = useState(null);
  const [swapTargetTenantId, setSwapTargetTenantId] = useState('');

  const [customInventory, setCustomInventory] = useState([]);
  const [imgPickerFor, setImgPickerFor] = useState(null);

  const openImagePicker = (id, type) => setImgPickerFor({ id, type });
  const closeImagePicker = () => setImgPickerFor(null);

  const handlePickedFile = async (e, id, type, setter) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setter(prev => {
        if (type === 'inventory') {
          return { ...prev, inventory: { ...prev.inventory, [id]: compressed } };
        } else {
          const cur = prev.amenityImages || {};
          return { ...prev, amenityImages: { ...cur, [id]: compressed } };
        }
      });
    } catch(err) { console.error('Compression failed', err); }
    closeImagePicker();
  };

  const handleAddCustomInventory = () => {
    const name = window.prompt('Enter custom inventory item:');
    if (name && name.trim()) {
      const id = 'inv-custom-' + name.trim().toLowerCase().replace(/\s+/g, '-');
      setCustomInventory(prev => [...prev, { id, label: name.trim(), icon: '📦' }]);
      setAllotForm(prev => ({ ...prev, inventory: { ...prev.inventory, [id]: null } }));
    }
  };

  const toggleInventory = (id) => {
    setAllotForm(prev => {
      const newInv = { ...prev.inventory };
      if (newInv.hasOwnProperty(id)) {
        delete newInv[id];
      } else {
        newInv[id] = null;
      }
      return { ...prev, inventory: newInv };
    });
  };

  const handleInventoryItemImage = async (id, e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const compressed = await compressImage(file);
        setAllotForm(prev => ({ ...prev, inventory: { ...prev.inventory, [id]: compressed } }));
      } catch(err) {
        console.error("Compression failed", err);
      }
    }
  };

  const INVENTORY_ICON_MAP = {
    bed: 'bed', mattress: 'bed', table: 'table_restaurant',
    chair: 'chair', cupboard: 'door_sliding', ac_remote: 'air',
    keys: 'key', dustbin: 'delete'
  };

  const allInventoryItems = [...INVENTORY_ITEMS, ...customInventory];

  useEffect(() => {
    if (!user?.uid) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Room Change Requests
      const qRC = query(collection(db, 'room_change_requests'), where('adminId', '==', user.uid));
      const snapRC = await getDocs(qRC);
      let rcDocs = snapRC.docs.map(d => ({ id: d.id, ...d.data() }));
      rcDocs = rcDocs.filter(d => d.pgId === activePgId || (activePgId === 'primary' && d.pgId === user.uid) || (!d.pgId));
      rcDocs.sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0));
      setRoomRequests(rcDocs);

      // 2. Fetch PG Applications
      const qPA = query(collection(db, 'pg_applications'), where('adminId', '==', user.uid));
      const snapPA = await getDocs(qPA);
      let paDocs = snapPA.docs.map(d => ({ id: d.id, ...d.data() }));
      paDocs = paDocs.filter(d => d.pgId === activePgId || (activePgId === 'primary' && d.pgId === user.uid) || (!d.pgId));
      setPgApplications(paDocs);

      // 3. Fetch All Rooms & Tenants for Allotment/Shift/Swap
      const qRooms = query(collection(db, 'rooms'), where('adminId', '==', user.uid), where('pgId', '==', activePgId));
      const qTenants = query(collection(db, 'tenants'), where('adminId', '==', user.uid), where('pgId', '==', activePgId));
      const [snapRooms, snapTenants] = await Promise.all([getDocs(qRooms), getDocs(qTenants)]);
      
      const fetchedRooms = snapRooms.docs.map(d => ({ id: d.id, ...d.data() }));
      const fetchedTenants = snapTenants.docs.map(d => ({ id: d.id, tenantId: d.id, ...d.data() })).filter(t => t.status === 'Approved' || t.status === 'Current User' || t.status === 'Notice' || t.status === 'On Notice Period' || t.status === 'Upcoming User');
      
      setAllRoomsList(fetchedRooms);
      setActiveTenantsList(fetchedTenants);

      const roomsWithVacancy = fetchedRooms.map(room => {
        const roomTenants = fetchedTenants.filter(t => String(t.roomNo) === String(room.roomNo) || String(t.room) === String(room.roomNo));
        const totalBeds = Number(room.beds) || 1;
        const vacantSeats = Math.max(0, totalBeds - roomTenants.length);
        return {
          ...room,
          occupiedCount: roomTenants.length,
          vacantSeats: vacantSeats
        };
      }).filter(r => r.vacantSeats > 0);
      
      setAvailableRooms(roomsWithVacancy);
    } catch (err) {
      console.error('Error fetching approvals data:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── HANDLE SHIFT ROOM (SINGLE ALLOTMENT) ──
  const handleConfirmShift = async (e) => {
    e.preventDefault();
    if (!shiftModal || !shiftForm.toRoomNo) {
      alert('Please select a target room');
      return;
    }

    setActionLoading('shifting_room');
    try {
      await shiftTenantToRoom({
        tenantId: shiftModal.tenantId,
        tenantName: shiftModal.tenantName,
        fromRoomNo: shiftModal.currentRoom,
        toRoomNo: shiftForm.toRoomNo,
        toBedNo: shiftForm.toBedNo || '1',
        newRent: shiftForm.newRent || null,
        adminId: user.uid,
        pgId: activePgId,
        requestId: shiftModal.id,
        adminName: user?.displayName || user?.name || 'Admin'
      });

      alert(`Resident ${shiftModal.tenantName} successfully shifted to Room ${shiftForm.toRoomNo} (Bed ${shiftForm.toBedNo || '1'})!`);
      setShiftModal(null);
      setShiftForm({ toRoomNo: '', toBedNo: '1', newRent: '' });
      fetchData();
    } catch (err) {
      console.error('Error shifting room:', err);
      alert('Failed to shift room: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // ── HANDLE SWAP RESIDENTS ──
  const handleConfirmSwap = async (e) => {
    e.preventDefault();
    if (!swapModal || !swapTargetTenantId) {
      alert('Please select a resident to swap with');
      return;
    }

    const tenantA = {
      id: swapModal.tenantId,
      tenantId: swapModal.tenantId,
      name: swapModal.tenantName,
      roomNo: swapModal.currentRoom,
      bedNo: swapModal.currentBed || '1'
    };

    const targetTenant = activeTenantsList.find(t => (t.id === swapTargetTenantId || t.tenantId === swapTargetTenantId));
    if (!targetTenant) {
      alert('Target resident not found');
      return;
    }

    setActionLoading('swapping_residents');
    try {
      await swapTenantsBetweenRooms({
        tenantA,
        tenantB: targetTenant,
        adminId: user.uid,
        pgId: activePgId,
        requestId: swapModal.id,
        adminName: user?.displayName || user?.name || 'Admin'
      });

      alert(`Successfully swapped rooms between ${tenantA.name} and ${targetTenant.name}!`);
      setSwapModal(null);
      setSwapTargetTenantId('');
      fetchData();
    } catch (err) {
      console.error('Error swapping residents:', err);
      alert('Failed to swap residents: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // ── REJECT ROOM CHANGE REQUEST ──
  const handleRejectRoomChange = async (req) => {
    const reason = window.prompt('Reason for declining this room change request (optional):', 'No suitable rooms currently available');
    if (reason === null) return;

    setActionLoading(req.id + 'rejected');
    try {
      const nowIso = new Date().toISOString();
      await updateDoc(doc(db, 'room_change_requests', req.id), {
        status: 'Rejected',
        rejectionReason: reason,
        resolvedAt: nowIso
      });

      if (req.tenantId) {
        await addDoc(collection(db, 'users', req.tenantId, 'notifications'), {
          title: '❌ Room Change Request Declined',
          desc: `Your room change request was declined: "${reason}". Please contact management for assistance.`,
          type: 'error',
          action: 'VIEW_PROFILE',
          unread: true,
          createdAt: nowIso
        });
      }

      setRoomRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'Rejected', rejectionReason: reason } : r));
    } catch (err) {
      console.error('Error rejecting room change:', err);
      alert('Failed to reject request: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const rejectApplication = async (id) => {
    setActionLoading(id + 'rejected');
    try {
      await updateDoc(doc(db, 'pg_applications', id), { status: 'rejected' });
      setPgApplications(prev => prev.map(a => a.id === id ? { ...a, status: 'rejected' } : a));
    } catch (err) {
      console.error('Error rejecting application:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const approveApplication = async (e) => {
    e.preventDefault();
    if (!allotForm.roomNo || !allotForm.rentAmount) return alert("Please fill all fields");
    
    setActionLoading('approving_app');
    const app = allotModal;
    
    try {
      // 1. Update Application Status
      await updateDoc(doc(db, 'pg_applications', app.id), { status: 'approved' });
      
      // 2. Create Tenant Record
      await setDoc(doc(db, 'tenants', app.tenantId), {
        tenantId: app.tenantId,
        adminId: user.uid, pgId: activePgId, 
        name: app.tenantName,
        phone: app.tenantPhone,
        roomNo: allotForm.roomNo,
        rentAmount: Number(allotForm.rentAmount),
        dateOfJoining: allotForm.dateOfJoining,
        status: 'Approved',
        securityDeposit: Number(allotForm.securityDeposit) || 0,
        plan: 'Monthly',
        paymentStatus: 'Paid',
        inventory: allotForm.inventory
      }, { merge: true });

      // 2b. Inventory Allocations
      {
        const tenantId = app.tenantId;
        const qOld = query(
          collection(db, 'inventory_allocations'),
          where('adminId', '==', user.uid), where('pgId', '==', activePgId),
          where('targetId', '==', tenantId)
        );
        const snapOld = await getDocs(qOld);
        await Promise.all(snapOld.docs.map(d => deleteDoc(d.ref)));

        const selectedItems = Object.keys(allotForm.inventory);
        if (selectedItems.length > 0) {
          const allItems = [...INVENTORY_ITEMS, ...customInventory];
          await Promise.all(selectedItems.map(itemId => {
            const itemMeta = allItems.find(i => i.id === itemId);
            return addDoc(collection(db, 'inventory_allocations'), {
              adminId: user.uid, pgId: activePgId, 
              targetId: tenantId,
              targetType: 'tenant',
              itemName: itemMeta?.label || itemId,
              qty: 1,
              icon: INVENTORY_ICON_MAP[itemId] || 'inventory_2',
              conditionImage: allotForm.inventory[itemId] || null,
              assignedAt: new Date().toISOString()
            });
          }));
        }
      }

      // Create Receipt for Joining Month
      const doj = new Date(allotForm.dateOfJoining);
      const joiningMonthStr = doj.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      const rentNumber = Number(allotForm.rentAmount);
      await addDoc(collection(db, 'rent_receipts'), {
        adminId: user.uid, pgId: activePgId, 
        tenantId: app.tenantId,
        tenantName: app.tenantName,
        roomNo: allotForm.roomNo.replace('Room ', ''),
        rentMonth: joiningMonthStr,
        datePaid: new Date().toISOString(),
        date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        paymentMode: 'UPI (Joining)',
        receivedBy: 'Admin',
        senderUPI: 'Paid during admission',
        receiverUPI: '-',
        items: [
          { label: 'Room Rent', amount: rentNumber }
        ],
        totalAmount: rentNumber,
        pendingAmount: 0
      });

      // 3. Unlock Student Dashboard
      await updateDoc(doc(db, 'users', app.tenantId), {
        subscribedPG: {
          pgId: user.uid,
          pgName: app.pgName || 'Your PG',
          leaseAmount: Number(allotForm.rentAmount)
        }
      });
      
      // 4. Update Enquiry Status to Closed (if they were a lead)
      const eq = query(collection(db, 'enquiries'), where('tenantId', '==', app.tenantId));
      const esnap = await getDocs(eq);
      esnap.forEach(d => updateDoc(doc(db, 'enquiries', d.id), { enquiryStatus: 'Closed' }));

      // 5. Send Notification to Student
      await addDoc(collection(db, 'users', app.tenantId, 'notifications'), {
        title: "Application Approved! 🎉",
        desc: `Your PG application was approved. You have been allotted Room ${allotForm.roomNo}.`,
        type: "success",
        action: "VISIT_DASHBOARD",
        unread: true,
        createdAt: new Date().toISOString()
      });

      setPgApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: 'approved' } : a));
      setAllotModal(null);
    } catch (err) {
      console.error("Error approving application:", err);
      alert("Failed to approve application. " + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (raw) => {
    if (!raw) return '';
    try { return new Date(raw).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return raw; }
  };

  // Filter Data
  const currentData = approvalType === 'RoomChanges' ? roomRequests : pgApplications;
  const pending = currentData.filter(r => (r.status === 'pending' || r.status === 'Pending'));
  const history = currentData.filter(r => (r.status !== 'pending' && r.status !== 'Pending'));
  const shown = activeTab === 'Pending' ? pending : history;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk', sans-serif", paddingBottom: 40 }}>
      
      {/* ── HEADER ── */}
      <div style={{ background: 'linear-gradient(135deg, #0c1a2e, #0f2847)', paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))', padding: '0 16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, height: 64 }}>
          <button onClick={() => navigate('/admin-dashboard')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back_ios_new</span>
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'white' }}>Approvals Hub</h1>
            <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>
              {approvalType === 'Applications' ? 'New Joiner Applications' : 'Room Change & Swap Requests'}
            </p>
          </div>
          {pending.length > 0 && (
            <div style={{ background: '#fef3c7', borderRadius: 10, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#d97706' }}>pending_actions</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#d97706' }}>{pending.length}</span>
            </div>
          )}
        </div>

        {/* TOP LEVEL TOGGLE: Applications vs Room Changes */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 4, marginBottom: 12 }}>
          {['Applications', 'RoomChanges'].map(type => (
            <button
              key={type}
              onClick={() => setApprovalType(type)}
              style={{
                flex: 1, padding: '9px 0', border: 'none', borderRadius: 9,
                background: approvalType === type ? '#0891b2' : 'transparent',
                color: approvalType === type ? 'white' : '#94a3b8',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'inherit', transition: 'all 0.2s',
              }}
            >
              {type === 'Applications' ? 'New Joiners' : 'Room Change Requests'}
            </button>
          ))}
        </div>

        {/* PENDING / HISTORY TOGGLE */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 4 }}>
          {['Pending', 'History'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1, padding: '9px 0', border: 'none', borderRadius: 9,
                background: activeTab === tab ? 'white' : 'transparent',
                color: activeTab === tab ? '#0f172a' : '#94a3b8',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'inherit', transition: 'all 0.2s',
              }}
            >
              {tab} ({tab === 'Pending' ? pending.length : history.length})
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {loading && (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#94a3b8', display: 'block', marginBottom: 12, animation: 'spin 1s linear infinite' }}>sync</span>
            <p style={{ color: '#94a3b8', fontSize: 14, fontWeight: 600 }}>Loading requests...</p>
          </div>
        )}

        {!loading && shown.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 56, color: '#e2e8f0' }}>verified</span>
            <p style={{ color: '#94a3b8', fontSize: 15, fontWeight: 600, marginTop: 12, lineHeight: 1.5, padding: '0 24px' }}>
              {activeTab === 'Pending'
                ? `No pending ${approvalType === 'Applications' ? 'applications' : 'room change requests'}.`
                : 'No history yet.'}
            </p>
          </div>
        )}

        {/* ── RENDERING LIST ── */}
        {!loading && shown.map(req => {
          const name = req.tenantName || 'Unknown';
          const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
          const isPending = req.status === 'pending' || req.status === 'Pending';
          const isApproved = req.status === 'approved' || req.status === 'Approved';
          const isRejected = req.status === 'rejected' || req.status === 'Rejected';

          if (approvalType === 'RoomChanges') {
            return (
              <div key={req.id} style={{ background: 'white', borderRadius: 18, border: '1px solid #e2e8f0', marginBottom: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ padding: 16 }}>
                  
                  {/* Top: Student Profile & Status Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0369a1', fontWeight: 800, fontSize: 16 }}>
                        {initials}
                      </div>
                      <div>
                        <h3 style={{ margin: '0 0 2px', fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{name}</h3>
                        <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Requested on {formatDate(req.createdAt || req.date)}</p>
                      </div>
                    </div>
                    {isApproved && <span style={{ background: '#ecfdf5', color: '#059669', padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>Approved</span>}
                    {isRejected && <span style={{ background: '#fef2f2', color: '#ef4444', padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>Rejected</span>}
                    {isPending && <span style={{ background: '#fffbeb', color: '#d97706', padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>Pending Allotment</span>}
                  </div>

                  {/* Current Room Pill & Preferences */}
                  <div style={{ background: '#f8fafc', borderRadius: 12, padding: 12, marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>Current Allocation:</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                        Room {req.currentRoom} {req.currentBed ? `(Bed ${req.currentBed})` : ''}
                      </span>
                    </div>
                    {req.preference && req.preference !== 'Any suitable room/bed' && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: '#0369a1', fontWeight: 700 }}>Student Preference:</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#0369a1', background: '#e0f2fe', padding: '2px 8px', borderRadius: 6 }}>
                          {req.preference}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Student Reason */}
                  <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, padding: '10px 12px', marginBottom: 12 }}>
                    <p style={{ margin: '0 0 2px', fontSize: 11, color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>Reason for Change:</p>
                    <p style={{ margin: 0, fontSize: 13, color: '#334155', fontStyle: 'italic', lineHeight: 1.4 }}>
                      "{req.reason || 'Requested room change'}"
                    </p>
                  </div>

                  {/* Approved Details if Already Resolved */}
                  {isApproved && (
                    <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10, padding: '10px 12px', marginBottom: 6, fontSize: 12, color: '#065f46' }}>
                      <div style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                        Shifted to Room {req.newRoom || req.requestedRoom} {req.newBed ? `(Bed ${req.newBed})` : ''}
                      </div>
                      {req.swappedWith && (
                        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#047857' }}>
                          Swapped with <strong>{req.swappedWith.name}</strong> (prev in Room {req.swappedWith.previousRoom})
                        </p>
                      )}
                    </div>
                  )}

                  {/* Action Controls for Pending Requests */}
                  {isPending && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                      <button 
                        onClick={() => handleRejectRoomChange(req)}
                        style={{ background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                      >
                        Reject
                      </button>

                      <button 
                        onClick={() => {
                          setSwapModal(req);
                          setSwapTargetTenantId('');
                        }}
                        style={{ flex: 1, background: '#f5f3ff', color: '#7c3aed', border: '1.5px solid #ddd6fe', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>swap_horiz</span>
                        Swap Resident
                      </button>

                      <button 
                        onClick={() => {
                          setShiftModal(req);
                          setShiftForm({ toRoomNo: '', toBedNo: '1', newRent: '' });
                        }}
                        style={{ flex: 1, background: '#0891b2', color: 'white', border: 'none', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>meeting_room</span>
                        Allot / Shift
                      </button>
                    </div>
                  )}

                </div>
              </div>
            );
          } else {
            // PG Applications
            const isRejecting = actionLoading === req.id + 'rejected';
            return (
              <div key={req.id} style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', marginBottom: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0891b2', fontWeight: 800, fontSize: 16 }}>
                        {initials}
                      </div>
                      <div>
                        <h3 style={{ margin: '0 0 2px', fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{name}</h3>
                        <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Applied on {formatDate(req.date)}</p>
                      </div>
                    </div>
                    {req.status === 'approved' && <span style={{ background: '#ecfdf5', color: '#059669', padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>Approved</span>}
                    {req.status === 'rejected' && <span style={{ background: '#fef2f2', color: '#ef4444', padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>Rejected</span>}
                  </div>

                  <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                     <a href={`tel:${req.tenantPhone}`} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f8fafc', color: '#334155', border: '1px solid #e2e8f0', borderRadius: 9, padding: '7px 12px', textDecoration: 'none', fontSize: 12, fontWeight: 700 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>call</span> {req.tenantPhone}
                      </a>
                  </div>

                  {req.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                      <button onClick={() => rejectApplication(req.id)} disabled={isRejecting} style={{ flex: 1, background: 'white', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 0', fontSize: 14, fontWeight: 700, cursor: isRejecting ? 'not-allowed' : 'pointer', opacity: isRejecting ? 0.7 : 1 }}>
                        Reject
                      </button>
                      <button onClick={() => setAllotModal(req)} style={{ flex: 1, background: '#0891b2', color: 'white', border: 'none', borderRadius: 10, padding: '10px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                        Review & Approve
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          }
        })}
      </div>

      {/* ── SUB-MODAL 1: SHIFT / ALLOT AVAILABLE ROOM ── */}
      {shiftModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div onClick={() => setShiftModal(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)' }} />
          <div style={{ position: 'relative', background: 'white', borderRadius: '24px 24px 0 0', padding: '24px 20px 40px', maxHeight: '85vh', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Allot / Shift Room</h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>Moving {shiftModal.tenantName} from Room {shiftModal.currentRoom}</p>
              </div>
              <button onClick={() => setShiftModal(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#475569' }}>close</span>
              </button>
            </div>

            <form onSubmit={handleConfirmShift} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                  Select Target Room *
                </label>
                <select
                  required
                  value={shiftForm.toRoomNo}
                  onChange={e => {
                    const rNo = e.target.value;
                    const rObj = allRoomsList.find(r => String(r.roomNo) === String(rNo));
                    setShiftForm(p => ({
                      ...p,
                      toRoomNo: rNo,
                      newRent: rObj?.price ? String(rObj.price) : p.newRent
                    }));
                  }}
                  style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: 14, fontFamily: 'inherit', background: 'white' }}
                >
                  <option value="">Choose a room...</option>
                  {allRoomsList.map(r => {
                    const occ = activeTenantsList.filter(t => String(t.roomNo) === String(r.roomNo) || String(t.room) === String(r.roomNo)).length;
                    const vac = Math.max(0, (Number(r.beds) || 1) - occ);
                    const isCurrent = String(r.roomNo) === String(shiftModal.currentRoom);
                    return (
                      <option key={r.id || r.roomNo} value={r.roomNo} disabled={isCurrent}>
                        Room {r.roomNo} ({r.roomType || `${r.beds} Beds`} · {vac} Vacant{isCurrent ? ' - Current' : ''})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Target Bed No.</label>
                  <select
                    value={shiftForm.toBedNo}
                    onChange={e => setShiftForm(p => ({ ...p, toBedNo: e.target.value }))}
                    style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: 14, fontFamily: 'inherit', background: 'white' }}
                  >
                    {[1, 2, 3, 4, 5, 6].map(b => (
                      <option key={b} value={String(b)}>Bed {b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Monthly Rent (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 8000"
                    value={shiftForm.newRent}
                    onChange={e => setShiftForm(p => ({ ...p, newRent: e.target.value }))}
                    style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={actionLoading === 'shifting_room'}
                style={{ background: '#0891b2', color: 'white', border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 800, cursor: 'pointer', marginTop: 8 }}
              >
                {actionLoading === 'shifting_room' ? 'Shifting Resident...' : 'Confirm & Shift Room'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── SUB-MODAL 2: SWAP TWO RESIDENTS ── */}
      {swapModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div onClick={() => setSwapModal(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)' }} />
          <div style={{ position: 'relative', background: 'white', borderRadius: '24px 24px 0 0', padding: '24px 20px 40px', maxHeight: '85vh', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>swap_horiz</span>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Swap Residents</h3>
                  <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Exchange rooms between 2 residents</p>
                </div>
              </div>
              <button onClick={() => setSwapModal(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#475569' }}>close</span>
              </button>
            </div>

            {/* Resident A (Requesting) */}
            <div style={{ background: '#f8fafc', borderRadius: 12, padding: '12px 14px', border: '1.5px solid #e2e8f0', marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#0284c7', textTransform: 'uppercase' }}>Resident A (Requesting)</span>
                  <h4 style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{swapModal.tenantName}</h4>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#475569' }}>Room {swapModal.currentRoom}</span>
                  <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>Bed {swapModal.currentBed || '1'}</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleConfirmSwap} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                  Select Resident B to Swap With *
                </label>
                <select
                  required
                  value={swapTargetTenantId}
                  onChange={e => setSwapTargetTenantId(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1.5px solid #7c3aed', fontSize: 14, fontFamily: 'inherit', background: 'white' }}
                >
                  <option value="">Choose resident to swap with...</option>
                  {activeTenantsList
                    .filter(t => (t.id !== swapModal.tenantId && t.tenantId !== swapModal.tenantId) && (t.roomNo || t.room))
                    .map(t => (
                      <option key={t.id || t.tenantId} value={t.id || t.tenantId}>
                        {t.name} (Room {t.roomNo || t.room} · Bed {t.bedNo || '1'})
                      </option>
                    ))}
                </select>
              </div>

              {/* Swap Preview Box */}
              {swapTargetTenantId && (() => {
                const targetTenant = activeTenantsList.find(t => (t.id === swapTargetTenantId || t.tenantId === swapTargetTenantId));
                if (!targetTenant) return null;
                return (
                  <div style={{ background: '#f5f3ff', border: '1.5px dashed #c4b5fd', borderRadius: 14, padding: 14 }}>
                    <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 800, color: '#6d28d9', textAlign: 'center', textTransform: 'uppercase' }}>
                      ⚡ Swap Outcome Preview
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                      <div>
                        <strong>{swapModal.tenantName}</strong> ➜ Room {targetTenant.roomNo || targetTenant.room}
                      </div>
                      <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#7c3aed' }}>sync_alt</span>
                      <div>
                        <strong>{targetTenant.name}</strong> ➜ Room {swapModal.currentRoom}
                      </div>
                    </div>
                  </div>
                );
              })()}

              <button
                type="submit"
                disabled={actionLoading === 'swapping_residents' || !swapTargetTenantId}
                style={{ background: '#7c3aed', color: 'white', border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 800, cursor: 'pointer', marginTop: 6 }}
              >
                {actionLoading === 'swapping_residents' ? 'Executing Swap...' : 'Confirm & Execute Swap'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── SUB-MODAL 3: APPLICATION ALLOTMENT MODAL ── */}
      {allotModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div onClick={() => setAllotModal(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)' }} />
          <div style={{ position: 'relative', background: 'white', borderRadius: '24px 24px 0 0', padding: '24px 20px 40px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0 }}>Allot Room (New Joiner)</p>
              <button onClick={() => setAllotModal(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#475569' }}>close</span>
              </button>
            </div>
            
            <div style={{ background: '#ecfeff', padding: '12px 16px', borderRadius: 12, marginBottom: 20 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0891b2' }}>{allotModal.tenantName}</p>
              <p style={{ margin: 0, fontSize: 12, color: '#0e7490' }}>{allotModal.tenantPhone}</p>
            </div>

            <form onSubmit={approveApplication}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8, textTransform: 'uppercase' }}>Select Room <span style={{color:'#e11d48'}}>*</span></label>
                <select 
                  value={allotForm.roomNo} 
                  onChange={e => setAllotForm(p => ({ ...p, roomNo: e.target.value }))}
                  style={{ width: '100%', padding: '14px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 15, fontFamily: 'inherit', outline: 'none' }}
                  required
                >
                  <option value="">Choose a room...</option>
                  {availableRooms.map(r => (
                    <option key={r.id} value={r.roomNo}>Room {r.roomNo} ({r.vacantSeats} Vacant)</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8, textTransform: 'uppercase' }}>Monthly Rent (₹) <span style={{color:'#e11d48'}}>*</span></label>
                <input 
                  type="number" 
                  value={allotForm.rentAmount} 
                  onChange={e => setAllotForm(p => ({ ...p, rentAmount: e.target.value }))}
                  placeholder="e.g. 10000"
                  style={{ width: '100%', padding: '14px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 15, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8, textTransform: 'uppercase' }}>Security Deposit (₹)</label>
                <input 
                  type="number" 
                  value={allotForm.securityDeposit} 
                  onChange={e => setAllotForm(p => ({ ...p, securityDeposit: e.target.value }))}
                  placeholder="e.g. 10000"
                  style={{ width: '100%', padding: '14px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 15, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8, textTransform: 'uppercase' }}>Date of Joining</label>
                <input 
                  type="date" 
                  value={allotForm.dateOfJoining} 
                  onChange={e => setAllotForm(p => ({ ...p, dateOfJoining: e.target.value }))}
                  style={{ width: '100%', padding: '14px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 15, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8, textTransform: 'uppercase' }}>Allotted Inventory (Select & Add Photo)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {allInventoryItems.map(item => {
                    const isSelected = allotForm.inventory.hasOwnProperty(item.id);
                    const hasImage = isSelected && allotForm.inventory[item.id];
                    return (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 0, borderRadius: 20, border: isSelected ? `1.5px solid #0891b2` : '1px solid #e2e8f0', background: isSelected ? 'rgba(8,145,178,0.1)' : 'white', overflow: 'hidden' }}>
                        <button
                          onClick={(e) => { e.preventDefault(); toggleInventory(item.id); }}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#334155' }}
                        >
                          <span>{item.icon}</span> {item.label}
                        </button>
                        {isSelected && (
                          <label style={{ padding: '8px 12px', borderLeft: `1px solid #0891b2`, cursor: 'pointer', display: 'flex', alignItems: 'center', background: hasImage ? '#0891b2' : 'transparent', color: hasImage ? 'white' : '#0891b2' }} title="Upload Condition Picture">
                            <input type="file" accept="image/*" onChange={(e) => handleInventoryItemImage(item.id, e)} style={{ display: 'none' }} />
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{hasImage ? 'check_circle' : 'add_a_photo'}</span>
                          </label>
                        )}
                      </div>
                    );
                  })}
                  <button
                    onClick={(e) => { e.preventDefault(); handleAddCustomInventory(); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', borderRadius: 20, border: '1px dashed #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#64748b' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                    Add
                  </button>
                </div>
              </div>

              <button type="submit" disabled={actionLoading === 'approving_app'} style={{ width: '100%', padding: '16px', background: actionLoading === 'approving_app' ? '#94a3b8' : '#0891b2', color: 'white', border: 'none', borderRadius: 16, fontWeight: 800, fontSize: 16, cursor: actionLoading === 'approving_app' ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {actionLoading === 'approving_app' && <span className="material-symbols-outlined febebo-spinner" style={{ fontSize: 20 }}>progress_activity</span>}
                {actionLoading === 'approving_app' ? 'Approving...' : 'Confirm & Allot Room'}
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
