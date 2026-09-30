import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDoc, getDocs, doc, updateDoc, setDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

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
  const { user, activePgId } = useAuth();
  
  const [approvalType, setApprovalType] = useState('Applications'); // 'Applications' or 'RoomChanges'
  const [activeTab, setActiveTab] = useState('Pending');
  
  const [roomRequests, setRoomRequests] = useState([]);
  const [pgApplications, setPgApplications] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  // Modal State for Allotting Room
  const [allotModal, setAllotModal] = useState(null);
  const [allotForm, setAllotForm] = useState({ roomNo: '', rentAmount: '', securityDeposit: '', dateOfJoining: new Date().toISOString().split('T')[0], inventory: {} });

  
  
  const [customInventory, setCustomInventory] = useState([]);

  // Image picker popup: { id, type } where type = 'inventory' | 'amenity'
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
      setRoomRequests(rcDocs);

      // 2. Fetch PG Applications
      const qPA = query(collection(db, 'pg_applications'), where('adminId', '==', user.uid));
      const snapPA = await getDocs(qPA);
      let paDocs = snapPA.docs.map(d => ({ id: d.id, ...d.data() }));
      paDocs = paDocs.filter(d => d.pgId === activePgId || (activePgId === 'primary' && d.pgId === user.uid) || (!d.pgId));
      setPgApplications(paDocs);

      // 3. Fetch Available Rooms for Allotment (filter out fully occupied)
      const qRooms = query(collection(db, 'rooms'), where('adminId', '==', user.uid), where('pgId', '==', activePgId));
      const qTenants = query(collection(db, 'tenants'), where('adminId', '==', user.uid), where('pgId', '==', activePgId));
      const [snapRooms, snapTenants] = await Promise.all([getDocs(qRooms), getDocs(qTenants)]);
      
      const fetchedRooms = snapRooms.docs.map(d => ({ id: d.id, ...d.data() }));
      const fetchedTenants = snapTenants.docs.map(d => d.data());
      
      const roomsWithVacancy = fetchedRooms.filter(room => {
        const roomTenantsCount = fetchedTenants.filter(t => t.roomNo === room.roomNo).length;
        const vacantSeats = Math.max(0, (Number(room.beds) || 1) - roomTenantsCount);
        return vacantSeats > 0;
      });
      
      setAvailableRooms(roomsWithVacancy);
    } catch (err) {
      console.error('Error fetching approvals data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoomChangeAction = async (id, action) => {
    setActionLoading(id + action);
    try {
      await updateDoc(doc(db, 'room_change_requests', id), { status: action });
      setRoomRequests(prev => prev.map(r => r.id === id ? { ...r, status: action } : r));

      if (action === 'Approved') {
        const req = roomRequests.find(r => r.id === id);
        if (req && req.tenantId && req.requestedRoom) {
          try {
            // Get new room's rent
            let newRent = null;
            try {
              const rq = query(collection(db, 'rooms'), where('adminId', '==', user.uid), where('pgId', '==', activePgId), where('roomNo', '==', req.requestedRoom));
              const rs = await getDocs(rq);
              if (!rs.empty) {
                 newRent = Number(rs.docs[0].data().price) || null;
              }
            } catch(re) {}

            const tUpdate = {
              roomNo: req.requestedRoom,
              room: req.requestedRoom
            };
            if (newRent !== null) tUpdate.rentAmount = newRent;
            await updateDoc(doc(db, 'tenants', req.tenantId), tUpdate);
            
            // Try to update users doc too
            try {
               const uDoc = await getDoc(doc(db, 'users', req.tenantId));
               if (uDoc.exists()) {
                   const uData = uDoc.data();
                   const uUpdate = {};
                   if (uData.subscribedPG) {
                       uUpdate['subscribedPG.roomNumber'] = req.requestedRoom;
                       if (newRent !== null) uUpdate['subscribedPG.leaseAmount'] = newRent;
                   }
                   if (uData.profileData && uData.profileData.roomDetails) {
                       uUpdate['profileData.roomDetails.roomNumber'] = req.requestedRoom;
                       if (newRent !== null) uUpdate['profileData.roomDetails.rentAmount'] = newRent;
                   }
                   if (Object.keys(uUpdate).length > 0) {
                       await updateDoc(doc(db, 'users', req.tenantId), uUpdate);
                   }
               }
            } catch(ue) { console.error("users update error", ue); }

            await addDoc(collection(db, 'users', req.tenantId, 'notifications'), {
              title: "Room Shift Approved! 🏡",
              desc: `Your request to move to Room ${req.requestedRoom} has been approved by admin.`,
              type: "success",
              action: "VIEW_PROFILE",
              unread: true,
              createdAt: new Date().toISOString()
            });
          } catch(e) { console.error(e) }
        }
      }
    } catch (err) {
      console.error('Error updating request:', err);
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

      // 2b. Write each selected inventory item to inventory_allocations
      //     (so it shows up in Inventory → User Inventory page)
      {
        const tenantId = app.tenantId;
        // First clear any existing allocations for this tenant
        const qOld = query(
          collection(db, 'inventory_allocations'),
          where('adminId', '==', user.uid), where('pgId', '==', activePgId),
          where('targetId', '==', tenantId)
        );
        const snapOld = await getDocs(qOld);
        await Promise.all(snapOld.docs.map(d => deleteDoc(d.ref)));

        // Now write fresh allocations from the selected inventory
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

      // 4. Send Notification to Student
      await addDoc(collection(db, 'users', app.tenantId, 'notifications'), {
        title: "Application Approved! 🎉",
        desc: `Your PG application was approved. You have been allotted Room ${allotForm.roomNo}.`,
        type: "success",
        action: "VISIT_DASHBOARD",
        unread: true,
        createdAt: new Date().toISOString()
      });

      // Update local state
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
  const pending = currentData.filter(r => r.status === 'pending');
  const history = currentData.filter(r => r.status !== 'pending');
  const shown = activeTab === 'Pending' ? pending : history;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk', sans-serif", paddingBottom: 40 }}>
      {/* ── ALLOTMENT MODAL ── */}
      {allotModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div onClick={() => setAllotModal(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)' }} />
          <div style={{ position: 'relative', background: 'white', borderRadius: '24px 24px 0 0', padding: '24px 20px 40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0 }}>Allot Room</p>
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
                    <option key={r.id} value={r.roomNo}>Room {r.roomNo}</option>
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


      {/* ── CAMERA / FOLDER PICKER POPUP ── */}
      {imgPickerFor && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={closeImagePicker} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(2px)' }} />
          <div style={{ position: 'relative', background: 'white', borderRadius: '20px 20px 0 0', padding: '20px 20px 36px', width: '100%', maxWidth: 480, zIndex: 1 }}>
            <p style={{ margin: '0 0 16px', fontWeight: 800, fontSize: 16, color: '#0f172a', textAlign: 'center' }}>Upload Photo</p>
            <div style={{ display: 'flex', gap: 12 }}>
              {/* Camera option */}
              <label style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '18px 0', borderRadius: 14, border: '1.5px solid #e2e8f0', cursor: 'pointer', background: '#f8fafc' }}>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: 'none' }}
                  onChange={(e) => handlePickedFile(e, imgPickerFor.id, imgPickerFor.type, imgPickerFor.type === 'inventory' ? setAllotForm : setApproveForm)}
                />
                <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#0891b2' }}>photo_camera</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>Camera</span>
              </label>
              {/* Folder option */}
              <label style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '18px 0', borderRadius: 14, border: '1.5px solid #e2e8f0', cursor: 'pointer', background: '#f8fafc' }}>
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => handlePickedFile(e, imgPickerFor.id, imgPickerFor.type, imgPickerFor.type === 'inventory' ? setAllotForm : setApproveForm)}
                />
                <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#7c3aed' }}>folder_open</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>Gallery</span>
              </label>
            </div>
            <button onClick={closeImagePicker} style={{ marginTop: 14, width: '100%', padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, color: '#64748b', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <div style={{ background: 'linear-gradient(135deg, #0c1a2e, #0f2847)', padding: '0 16px 20px', paddingTop: 'max(env(safe-area-inset-top), 40px)', position: 'sticky', top: 0, zIndex: 10 , paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))'}}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, height: 64 }}>
          <button onClick={() => navigate('/admin-dashboard')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back_ios_new</span>
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'white' }}>Requests</h1>
            <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>Review & Approve</p>
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
              {type === 'Applications' ? 'New Joiners' : 'Room Shifts'}
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
          
          if (approvalType === 'RoomChanges') {
            const isApproving = actionLoading === req.id + 'approved';
            const isRejecting = actionLoading === req.id + 'rejected';
            return (
              <div key={req.id} style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', marginBottom: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0891b2', fontWeight: 800, fontSize: 16 }}>
                        {initials}
                      </div>
                      <div>
                        <h3 style={{ margin: '0 0 2px', fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{name}</h3>
                        <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Requested on {formatDate(req.date)}</p>
                      </div>
                    </div>
                    {req.status === 'approved' && <span style={{ background: '#ecfdf5', color: '#059669', padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>Approved</span>}
                    {req.status === 'rejected' && <span style={{ background: '#fef2f2', color: '#ef4444', padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>Rejected</span>}
                  </div>

                  <div style={{ background: '#f8fafc', borderRadius: 12, padding: 12, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: '0 0 2px', fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Current</p>
                      <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Room {req.currentRoom}</p>
                    </div>
                    <span className="material-symbols-outlined" style={{ color: '#cbd5e1' }}>arrow_forward</span>
                    <div style={{ flex: 1, textAlign: 'right' }}>
                      <p style={{ margin: '0 0 2px', fontSize: 11, color: '#0891b2', textTransform: 'uppercase', fontWeight: 700 }}>Requested</p>
                      <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0891b2' }}>Room {req.requestedRoom}</p>
                    </div>
                  </div>

                  <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>Reason:</span> {req.reason}
                  </p>

                  {req.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                      <button onClick={() => handleRoomChangeAction(req.id, 'rejected')} disabled={isRejecting || isApproving} style={{ flex: 1, background: 'white', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 0', fontSize: 14, fontWeight: 700, cursor: isRejecting || isApproving ? 'not-allowed' : 'pointer', opacity: isRejecting || isApproving ? 0.7 : 1 }}>Reject</button>
                      <button onClick={() => handleRoomChangeAction(req.id, 'approved')} disabled={isApproving || isRejecting} style={{ flex: 1, background: '#0891b2', color: 'white', border: 'none', borderRadius: 10, padding: '10px 0', fontSize: 14, fontWeight: 700, cursor: isApproving || isRejecting ? 'not-allowed' : 'pointer', opacity: isApproving || isRejecting ? 0.7 : 1 }}>Approve</button>
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
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
