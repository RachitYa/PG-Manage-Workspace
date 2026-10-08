import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DetailedReceiptModal, { CollectPaymentModal } from '../components/DetailedReceiptModal';
import { collection, query, where, getDocs, getDoc, doc, updateDoc, addDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { getTodayStr, getStudentActiveVacation, formatDateDisplay } from '../utils/vacationUtils';

const BASE = { backgroundColor: '#f8fafc', minHeight: '100vh', position: 'relative', paddingBottom: 80, fontFamily: "'Hanken Grotesk', sans-serif" };
const cyan = '#0ea5e9';

// MOCK_USERS removed, fetching dynamically from Firestore

const AMENITIES_DATA = [
  { id: 'ac', label: 'AC', icon: '❄️' },
  { id: 'fridge', label: 'Fridge', icon: '🧊' },
  { id: 'washing-machine', label: 'Washing Machine', icon: '🧺' },
  { id: 'study-table', label: 'Study Table', icon: '🪚' },
  { id: 'cooler', label: 'Cooler', icon: '🌬️' },
  { id: 'geyser', label: 'Geyser', icon: '♨️' },
];

// ─── REUSABLE HEADER ──────────────────────────────────────
function Header({ title, onBack, action, center = true, dark = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', background: dark ? cyan : 'white', borderBottom: dark ? 'none' : '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 50 , paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))'}}>
      <button onClick={onBack} style={{ position: 'relative', zIndex: 10, background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', color: dark ? 'white' : cyan }}>
        <span className="material-symbols-outlined" style={{ fontSize: 24, fontWeight: 300 }}>arrow_back_ios_new</span>
      </button>
      <h1 style={{ flex: 1, textAlign: center ? 'center' : 'left', margin: center ? '0 0 0 -24px' : '0 0 0 16px', fontSize: 18, fontWeight: 700, color: dark ? 'white' : cyan }}>{title}</h1>
      {action && <div style={{ position: 'relative', zIndex: 10 }}>{action}</div>}
    </div>
  );
}

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

// ─── MAIN COMPONENT: MANAGE TENANTS ───────────────────────

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

export default function ManageTenants() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialTab = location.state?.tab || 'Current User';
  const [showServiceModal, setShowServiceModal] = useState(location.state?.openAddModal === true);

  const goBack = () => {
    navigate('/admin-dashboard');
  };

  const openDetails = (u) => {
    navigate(`/user/${u.id}`, { state: { user: u } });
  };

  const handleAddTenant = () => {
    setShowServiceModal(true);
  };

  const handleServiceSelect = (serviceType) => {
    setShowServiceModal(false);
    navigate(`/add-tenant?serviceType=${serviceType}`);
  };

  return (
    <div style={BASE}>
      <UserListView onBack={goBack} onAdd={handleAddTenant} onSelect={openDetails} initialTab={initialTab} />

      {/* ── Service Type Selection Modal ── */}
      {showServiceModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={() => setShowServiceModal(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'relative', background: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: '28px 24px calc(36px + env(safe-area-inset-bottom, 0px))', width: '100%', maxWidth: 480, boxShadow: '0 -8px 40px rgba(15,23,42,0.18)', animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)' }}>
            <style>{`@keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
            {/* Handle */}
            <div style={{ width: 40, height: 4, borderRadius: 4, background: '#e2e8f0', margin: '0 auto 20px' }} />
            <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>Select Tenant Type</h2>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: '#64748b', textAlign: 'center' }}>Choose what services this tenant will have access to</p>

            {/* Option 1 – Only Room */}
            <button onClick={() => handleServiceSelect('only_room')} style={{ width: '100%', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 16, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', marginBottom: 14, textAlign: 'left', transition: 'border-color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = cyan}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
            >
              <div style={{ width: 50, height: 50, borderRadius: 14, background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 26, color: cyan }}>bed</span>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Only Room</p>
                <p style={{ margin: '3px 0 0', fontSize: 13, color: '#64748b' }}>Accommodation only — no Food Menu or Transport access</p>
              </div>
            </button>

            {/* Option 2 – All PG Services */}
            <button onClick={() => handleServiceSelect('all_services')} style={{ width: '100%', background: `linear-gradient(135deg, ${cyan}15, #0369a115)`, border: `1.5px solid ${cyan}`, borderRadius: 16, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', textAlign: 'left' }}>
              <div style={{ width: 50, height: 50, borderRadius: 14, background: 'rgba(14,165,233,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 26, color: cyan }}>apartment</span>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>All PG Services</p>
                <p style={{ margin: '3px 0 0', fontSize: 13, color: '#64748b' }}>Full access — Food Menu, Transport & all features</p>
              </div>
              <span style={{ marginLeft: 'auto', background: cyan, color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, flexShrink: 0 }}>DEFAULT</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── VIEW 1: USER LIST ────────────────────────────────────
function UserListView({ onBack, onAdd, onSelect, initialTab = 'Current User' }) {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState(initialTab);
  const [activeReceipt, setActiveReceipt] = useState(null);
  const [collectModalData, setCollectModalData] = useState(null);
  const [users, setUsers] = useState([]);
  const [vacations, setVacations] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, activePgId } = useAuth();
  const [approveUser, setApproveUser] = useState(null);
  const [approveForm, setApproveForm] = useState({ meterReading: '', amenities: [], remarks: '', inventory: {} });
  const [isApproving, setIsApproving] = useState(false);

    const [customAmenities, setCustomAmenities] = useState([]);

  
  const [customInventory, setCustomInventory] = useState([]);

  // Image picker popup: { id, type } where type = 'inventory' | 'amenity'
  const [imgPickerFor, setImgPickerFor] = useState(null);

  const openImagePicker = (id, type) => setImgPickerFor({ id, type });
  const closeImagePicker = () => setImgPickerFor(null);

  const [showRoomDrawer, setShowRoomDrawer] = useState(false);

  const handlePickedFile = async (e, id, type) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setApproveForm(prev => {
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
      setApproveForm(prev => ({ ...prev, inventory: { ...prev.inventory, [id]: null } }));
    }
  };

  const toggleInventory = (id) => {
    setApproveForm(prev => {
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
        setApproveForm(prev => ({ ...prev, inventory: { ...prev.inventory, [id]: compressed } }));
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

  const handleAddCustomAmenity = () => {
    const name = window.prompt('Enter custom amenity name:');
    if (name && name.trim()) {
      const id = 'custom-' + name.trim().toLowerCase().replace(/\s+/g, '-');
      setCustomAmenities(prev => [...prev, { id, label: name.trim(), icon: '✨' }]);
      setApproveForm(prev => ({ ...prev, amenities: [...prev.amenities, id] }));
    }
  };

  const allAmenities = [...AMENITIES_DATA, ...customAmenities];

  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    if (!user?.uid) return;
    const fetchUsers = async () => {
      try {
        const matchesPg = (itemPgId) => {
          if (!activePgId || activePgId === 'primary') {
            return !itemPgId || itemPgId === 'primary' || itemPgId === user.uid;
          }
          return itemPgId === activePgId;
        };

        const rSnap = await getDocs(query(collection(db, 'rooms'), where('adminId', '==', user.uid)));
        setRooms(rSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(r => matchesPg(r.pgId)));

        const q = query(collection(db, 'tenants'), where('adminId', '==', user.uid));
        const snap = await getDocs(q);
        const fetchedTenants = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(t => matchesPg(t.pgId));
        
        // Fetch corresponding user profiles to get real profile pictures
        const enrichedTenants = await Promise.all(fetchedTenants.map(async (t) => {
          try {
            const uid = t.tenantId || t.id;
            if (uid) {
              const userDoc = await getDoc(doc(db, 'users', uid));
              if (userDoc.exists()) {
                const uData = userDoc.data();
                t.kyc = uData.kyc || t.kyc;
                t.kycData = uData.kycData || t.kycData;
                t.image = uData.kyc?.profilePhoto || uData.photoURL || t.image;
                t.registeredVia = t.registeredVia || uData.registeredVia || (uData.subscribedPG?.paidTillMonth ? 'already_residence' : '');
                t.isAlreadyResident = t.isAlreadyResident || uData.isAlreadyResident || !!uData.subscribedPG?.paidTillMonth;
                t.isAddTenant = t.isAddTenant || uData.isAddTenant || t.registeredVia === 'add_tenant' || uData.registeredVia === 'add_tenant';
                if (!t.roomNo) t.roomNo = uData.subscribedPG?.roomNo || '';
                if (!t.bedNo) t.bedNo = uData.subscribedPG?.bedNo || '';
                if (t.tokenPaid === undefined) t.tokenPaid = uData.subscribedPG?.tokenPaid !== undefined ? uData.subscribedPG.tokenPaid : (uData.tokenPaid || 0);
                if (t.remainingAmount === undefined) t.remainingAmount = uData.subscribedPG?.remainingAmount !== undefined ? uData.subscribedPG.remainingAmount : (uData.remainingAmount || 0);
                if (t.meterReading === undefined || t.meterReading === null || t.meterReading === '') {
                  t.meterReading = uData.subscribedPG?.meterReadingAtJoin !== undefined ? uData.subscribedPG?.meterReadingAtJoin : '';
                }
                if (uData.foodVacation) t.foodVacation = uData.foodVacation;
              }
            }
          } catch (e) { console.error("Error fetching user profile", e); }
          return t;
        }));
        
        setUsers(enrichedTenants);
      } catch (err) {
        console.error("Error fetching tenants:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [user]);

  // Real-time listener for food_vacations to track active pauses
  useEffect(() => {
    if (!user?.uid) return;
    const qVac = query(
      collection(db, 'food_vacations'),
      where('adminId', '==', user.uid),
      where('status', 'in', ['active', 'shortened'])
    );
    const unsub = onSnapshot(qVac, (snap) => {
      setVacations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error("Error fetching food vacations:", err));
    return () => unsub();
  }, [user?.uid]);

  const getRoomOccupancy = () => {
    return rooms.map(r => {
      const roomTenants = users.filter(u => 
        (u.status === 'Approved' || u.status === 'Current User' || u.status === 'Notice' || u.status === 'On Notice Period' || u.status === 'Upcoming User') && 
        (u.roomNo === r.roomNo || u.room === r.roomNo) && u.id !== approveUser?.id
      );
      const occupiedBeds = roomTenants.map(t => String(t.bedNo));
      const allBeds = Array.from({length: parseInt(r.beds) || 1}, (_, i) => String(i + 1));
      const vacantBeds = allBeds.filter(b => !occupiedBeds.includes(b));
      return { ...r, occupiedBeds, vacantBeds };
    }).filter(r => r.vacantBeds.length > 0);
  };

  const handleApproveClick = (u, e) => {
    e.stopPropagation();
    const existingMeter = (u.meterReading !== undefined && u.meterReading !== null && u.meterReading !== '') 
      ? u.meterReading 
      : (u.meterReadingAtJoin !== undefined ? u.meterReadingAtJoin : '');

    const rNo = u.roomNo || (u.subscribedPG?.roomNo) || '';
    const bNo = u.bedNo || (u.subscribedPG?.bedNo) || (rNo ? '1' : '');

    u.roomNo = rNo;
    u.bedNo = bNo;

    setApproveForm({ 
      roomNo: rNo, 
      bedNo: bNo, 
      meterReading: existingMeter, 
      amenities: [], 
      remarks: '', 
      inventory: {} 
    });
    setApproveUser(u);
  };

  const confirmApprove = async () => {
    if (!approveUser || isApproving) return;
    const finalRoom = approveForm.roomNo || approveUser.roomNo || '';
    const finalBed = approveForm.bedNo || approveUser.bedNo || '';
    if (!finalRoom || !finalBed) {
      alert('Please select a Room and Bed before approving.');
      return;
    }
    setIsApproving(true);
    const uId = approveUser.id;
    try {
      const joinDate = new Date().toISOString().split('T')[0];
      const docRef = doc(db, 'tenants', uId);
      const finalMeter = approveForm.meterReading !== '' 
        ? approveForm.meterReading 
        : ((approveUser.meterReading !== undefined && approveUser.meterReading !== null && approveUser.meterReading !== '')
            ? approveUser.meterReading 
            : (approveUser.meterReadingAtJoin !== undefined ? approveUser.meterReadingAtJoin : ''));

      await updateDoc(docRef, { 
        status: 'Approved',
        joiningDate: joinDate,
        roomNo: finalRoom,
        bedNo: finalBed,
        ...(finalMeter !== '' ? { meterReading: finalMeter } : {}),
        amenities: approveForm.amenities,
        approvalRemarks: approveForm.remarks,
        inventory: approveForm.inventory,
        amenityImages: approveForm.amenityImages || {}
      });
      await updateDoc(doc(db, 'users', uId), {
        joiningDate: joinDate,
        'subscribedPG.status': 'Approved',
        'subscribedPG.kycStatus': 'approved',
        'subscribedPG.joiningDate': joinDate,
        'subscribedPG.roomNo': finalRoom,
        'subscribedPG.bedNo': finalBed,
        ...(finalMeter !== '' ? { 'subscribedPG.meterReadingAtJoin': finalMeter } : {})
      });
      
      await addDoc(collection(db, 'users', uId, 'notifications'), {
        title: '🎉 Approved!',
        desc: 'Your payment has been verified. You can now access your full dashboard.',
        type: 'success', action: 'VISIT_DASHBOARD', unread: true, createdAt: new Date().toISOString()
      });
      
      // Write inventory_allocations so Inventory → User Inventory page shows them
      {
        const qOld = query(
          collection(db, 'inventory_allocations'),
          where('adminId', '==', user.uid), where('pgId', '==', activePgId),
          where('targetId', '==', uId)
        );
        const snapOld = await getDocs(qOld);
        await Promise.all(snapOld.docs.map(d => deleteDoc(d.ref)));

        const selectedItems = Object.keys(approveForm.inventory || {});
        if (selectedItems.length > 0) {
          const allItems = [...INVENTORY_ITEMS, ...customInventory];
          await Promise.all(selectedItems.map(itemId => {
            const itemMeta = allItems.find(i => i.id === itemId);
            return addDoc(collection(db, 'inventory_allocations'), {
              adminId: user.uid, pgId: activePgId, 
              targetId: uId,
              targetType: 'tenant',
              itemName: itemMeta?.label || itemId,
              qty: 1,
              icon: INVENTORY_ICON_MAP[itemId] || 'inventory_2',
              conditionImage: (approveForm.inventory || {})[itemId] || null,
              assignedAt: new Date().toISOString()
            });
          }));
        }
      }

      setUsers(prev => prev.map(u => u.id === uId ? { ...u, status: 'Approved' } : u));
      setApproveUser(null);
    } catch (err) {
      console.error(err);
      alert("Failed to approve user.");
    } finally {
      setIsApproving(false);
    }
  };

  const getDaysLeft = (noticeDate) => {
    if (!noticeDate) return 0;
    const diffTime = new Date(noticeDate).getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const TABS = [
    { id: 'Upcoming User', label: 'Upcoming\nUser', icon: 'person_add' },
    { id: 'Current User', label: 'Current\nUser', icon: 'person' },
    { id: 'On Notice Period', label: 'On Notice\nPeriod', icon: 'person_remove' },
    { id: 'Removed', label: 'Removed\nStudents', icon: 'person_off' },
  ];

  return (
    <>
      <Header title="User" onBack={onBack} />
      <div style={{ padding: 16 }}>
        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <span className="material-symbols-outlined" style={{ position: 'absolute', left: 14, top: 12, color: cyan, fontSize: 20 }}>search</span>
          <input type="text" placeholder="Search by name, ID or phone..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '12px 12px 12px 42px', borderRadius: 8, border: `1px solid ${cyan}`, fontSize: 14, outline: 'none' }} />
        </div>

        {/* Tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 24 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '10px 4px', borderRadius: 12, border: tab === t.id ? `1.5px solid ${t.id === 'Removed' ? '#ef4444' : cyan}` : '1px solid #e2e8f0', background: 'white', cursor: 'pointer', transition: 'all 0.2s' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: t.id === 'Removed' ? (tab === t.id ? '#fee2e2' : 'rgba(239,68,68,0.1)') : (tab === t.id ? 'rgba(14,165,233,0.18)' : 'rgba(14,165,233,0.1)'), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ color: t.id === 'Removed' ? '#ef4444' : cyan, fontSize: 20 }}>{t.icon}</span>
              </div>
              <span style={{ fontSize: 10.5, fontWeight: tab === t.id ? 800 : 600, color: tab === t.id ? (t.id === 'Removed' ? '#dc2626' : '#0369a1') : '#334155', whiteSpace: 'pre-line', textAlign: 'center', lineHeight: 1.2 }}>{t.label}</span>
            </button>
          ))}
        </div>

        {/* List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ display: 'inline-block', width: 30, height: 30, border: '3px solid #e2e8f0', borderTopColor: cyan, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            (() => {
              const filteredUsers = users.filter(u => {
                const matchesSearch = (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
                                      (u.studentId || '').toLowerCase().includes(search.toLowerCase()) ||
                                      (u.phone || '').includes(search);
                const isCurrent = u.status === 'Approved' || u.status === 'Current User';
                const isUpcoming = u.status === 'Pending' || u.status === 'Upcoming User' || !u.status;
                const isNotice = u.status === 'Notice' || u.status === 'On Notice Period';
                const isRemoved = u.status === 'Removed' || u.status === 'Moved Out' || u.status === 'kicked' || u.status === 'Left';
                
                if (tab === 'Current User') return isCurrent && matchesSearch;
                if (tab === 'Upcoming User') return isUpcoming && matchesSearch;
                if (tab === 'On Notice Period') return isNotice && matchesSearch;
                if (tab === 'Removed') return isRemoved && matchesSearch;
                return false;
              });

              // Sort serial-wise alphabetically (A-Z)
              filteredUsers.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));

              if (filteredUsers.length === 0) {
                return (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#cbd5e1', marginBottom: 12 }}>group_off</span>
                    <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{tab === 'Removed' ? 'No removed students' : 'No users yet'}</p>
                  </div>
                );
              }

              return filteredUsers.map((u, idx) => {
                const today = getTodayStr();
                const activeVac = getStudentActiveVacation(vacations, u.id, today) || 
                                  getStudentActiveVacation(vacations, u.tenantId, today) ||
                                  (u.foodVacation && (u.foodVacation.status === 'active' || u.foodVacation.status === 'shortened') && today >= u.foodVacation.startDate && today <= u.foodVacation.endDate ? u.foodVacation : null);

                return (
                <div key={u.id} onClick={() => onSelect(u)} style={{ background: 'white', borderRadius: 14, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, border: '1px solid #f1f5f9', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1 }}>
                    <div style={{ position: 'relative' }}>
                      <img src={u.kyc?.profilePhoto || u.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || 'User')}&background=0891b2&color=fff&size=150`} alt={u.name} style={{ width: 60, height: 60, borderRadius: 10, objectFit: 'cover' }} />
                      <span style={{ position: 'absolute', top: -5, left: -5, background: tab === 'Removed' ? '#dc2626' : '#0f172a', color: 'white', borderRadius: '50%', width: 20, height: 20, fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid white' }}>{idx + 1}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <p style={{ fontWeight: 800, fontSize: 15, color: '#0f172a', margin: 0 }}>{u.name}</p>
                        {activeVac && (
                          <span style={{
                            fontSize: 10,
                            background: '#f5f3ff',
                            color: '#7c3aed',
                            border: '1px solid #ddd6fe',
                            padding: '2px 8px',
                            borderRadius: 6,
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3
                          }}>
                            🌴 On Food Pause ({formatDateDisplay(activeVac.endDate)})
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14, color: cyan }}>badge</span>
                        <span style={{ fontSize: 12, color: '#64748b' }}>
                          {u.studentId
                            ? u.studentId
                            : (u.id ? '#FB-' + String(u.id).slice(0, 8).toUpperCase() : '—')} · Room {u.roomNo || 'TBD'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14, color: cyan }}>call</span>
                        <a href={`tel:${u.phone}`} onClick={e => e.stopPropagation()} style={{ fontSize: 12, color: '#64748b', textDecoration: 'none' }}>{u.phone || 'No Phone'}</a>
                      </div>
                    </div>
                  </div>
                  {tab === 'Upcoming User' && (
                    <button onClick={(e) => handleApproveClick(u, e)} style={{ background: '#ecfeff', border: `1px solid ${cyan}`, color: cyan, padding: '6px 12px', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                      Approve
                    </button>
                  )}
                  {tab === 'On Notice Period' && (
                    <div style={{ textAlign: 'center', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 8, padding: '6px 10px' }}>
                      <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#e11d48' }}>{getDaysLeft(u.noticeDate)}</p>
                      <p style={{ margin: 0, fontSize: 10, color: '#be123c', fontWeight: 600 }}>Days Left</p>
                    </div>
                  )}
                  {tab === 'Removed' && (
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <span style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                        Removed
                      </span>
                      {u.removedAt && (
                        <span style={{ fontSize: 10, color: '#94a3b8' }}>
                          {new Date(u.removedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ); });
            })()
          )}
        </div>
      </div>

      {activeReceipt && (
        <DetailedReceiptModal receipt={activeReceipt} onClose={() => setActiveReceipt(null)} />
      )}

      {approveUser && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setApproveUser(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'relative', background: 'white', borderRadius: 24, padding: 24, width: '90%', maxWidth: 360, textAlign: 'left', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 20, color: '#0f172a' }}>Approve <span style={{color: cyan}}>{approveUser.name}</span></h3>
            
            {/* Do not show allot room & bed option if a valid room is already allotted */}
            {(approveUser.roomNo && !String(approveUser.roomNo).toLowerCase().includes('allot') && String(approveUser.roomNo).toLowerCase() !== 'n/a') ? (
              <div style={{ background: '#ecfeff', border: '1px solid #a5f3fc', borderRadius: 12, padding: '12px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#0891b2', textTransform: 'uppercase', letterSpacing: 0.5 }}>Room &amp; Bed (Allotted)</span>
                  <p style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                    Room {approveUser.roomNo || approveForm.roomNo} — Bed {approveUser.bedNo || approveForm.bedNo}
                  </p>
                </div>
                <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#0891b2' }}>meeting_room</span>
              </div>
            ) : (
              <>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Allot Room &amp; Bed <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div 
                  onClick={() => setShowRoomDrawer(true)}
                  style={{ width: '100%', padding: '12px', borderRadius: 8, border: `1.5px solid ${approveForm.roomNo ? cyan : '#e2e8f0'}`, fontSize: 14, marginBottom: 16, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: approveForm.roomNo ? '#ecfeff' : '#f8fafc' }}
                >
                  <span style={{ color: approveForm.roomNo ? '#0f172a' : '#94a3b8', fontWeight: approveForm.roomNo ? 700 : 400 }}>
                    {approveForm.roomNo ? `✓  Room ${approveForm.roomNo} — Bed ${approveForm.bedNo}` : 'Select a Vacant Room & Bed'}
                  </span>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: cyan }}>meeting_room</span>
                </div>
              </>
            )}

            {/* Do not ask meter reading if registered via already residence or if meter reading already exists */}
            {!(
              approveUser.registeredVia === 'already_residence' ||
              approveUser.registeredVia === 'already_resident' ||
              approveUser.isAlreadyResident ||
              approveUser.isAlreadyResidence ||
              (approveUser.meterReading !== undefined && approveUser.meterReading !== null && approveUser.meterReading !== '') ||
              (approveUser.meterReadingAtJoin !== undefined && approveUser.meterReadingAtJoin !== null && approveUser.meterReadingAtJoin !== '')
            ) && (
              <>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Initial Meter Reading</label>
                <input type="number" placeholder="e.g. 1024" value={approveForm.meterReading} onChange={e => setApproveForm(prev => ({...prev, meterReading: e.target.value}))} style={{ width: '100%', padding: '12px', borderRadius: 8, border: `1px solid ${cyan}`, fontSize: 14, marginBottom: 16, outline: 'none' }} />
              </>
            )}
            
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Amenities Allotted (Select & Add Photo)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {allAmenities.map(amenity => {
                const isAmenitySelected = approveForm.amenities.includes(amenity.id);
                const hasAmenityImage = isAmenitySelected && (approveForm.amenityImages || {})[amenity.id];
                return (
                  <div key={amenity.id} style={{ display: 'flex', alignItems: 'center', borderRadius: 20, border: isAmenitySelected ? `1.5px solid ${cyan}` : '1px solid #e2e8f0', background: isAmenitySelected ? 'rgba(14,165,233,0.1)' : 'white', overflow: 'hidden' }}>
                    <button
                      type="button"
                      onClick={() => setApproveForm(prev => ({
                        ...prev,
                        amenities: prev.amenities.includes(amenity.id) ? prev.amenities.filter(a => a !== amenity.id) : [...prev.amenities, amenity.id]
                      }))}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#334155' }}
                    >
                      <span>{amenity.icon}</span> {amenity.label}
                    </button>
                    {isAmenitySelected && (
                      <button type="button" onClick={() => openImagePicker(amenity.id, 'amenity')} style={{ padding: '8px 12px', borderLeft: `1px solid ${cyan}`, cursor: 'pointer', display: 'flex', alignItems: 'center', background: hasAmenityImage ? '#0ea5e9' : 'transparent', color: hasAmenityImage ? 'white' : cyan, border: 'none', borderLeft: `1px solid ${cyan}` }} title="Upload Photo">
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{hasAmenityImage ? 'check_circle' : 'add_a_photo'}</span>
                      </button>
                    )}
                  </div>
                );
              })}
              <button
                type="button"
                onClick={handleAddCustomAmenity}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', borderRadius: 20, border: '1px dashed #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#64748b' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                Add
              </button>
            </div>

            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Remarks / Room Condition</label>
            <input type="text" placeholder="e.g. Clean room, all switches working" value={approveForm.remarks} onChange={e => setApproveForm(prev => ({...prev, remarks: e.target.value}))} style={{ width: '100%', padding: '12px', borderRadius: 8, border: `1px solid ${cyan}`, fontSize: 14, marginBottom: 16, outline: 'none' }} />

            
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Inventory Allotted (Select & Add Photo)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
              {allInventoryItems.map(item => {
                const isSelected = approveForm.inventory.hasOwnProperty(item.id);
                const hasImage = isSelected && approveForm.inventory[item.id];
                return (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 0, borderRadius: 20, border: isSelected ? `1.5px solid ${cyan}` : '1px solid #e2e8f0', background: isSelected ? 'rgba(14,165,233,0.1)' : 'white', overflow: 'hidden' }}>
                    <button
                      onClick={(e) => { e.preventDefault(); toggleInventory(item.id); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#334155' }}
                    >
                      <span>{item.icon}</span> {item.label}
                    </button>
                    {isSelected && (
                      <button type="button" onClick={() => openImagePicker(item.id, 'inventory')} style={{ padding: '8px 12px', borderLeft: `1px solid ${cyan}`, cursor: 'pointer', display: 'flex', alignItems: 'center', background: hasImage ? '#0ea5e9' : 'transparent', color: hasImage ? 'white' : cyan, border: 'none', borderLeft: `1px solid ${cyan}` }} title="Upload Photo">
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{hasImage ? 'check_circle' : 'add_a_photo'}</span>
                      </button>
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
            
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setApproveUser(null)} style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={confirmApprove} disabled={isApproving} style={{ flex: 1, padding: '12px', background: isApproving ? '#94a3b8' : cyan, color: 'white', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: isApproving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {isApproving && <span className="material-symbols-outlined febebo-spinner" style={{ fontSize: 18 }}>progress_activity</span>}
                {isApproving ? 'Approving...' : 'Approve'}
              </button>
            </div>
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
              <label style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '18px 0', borderRadius: 14, border: '1.5px solid #e2e8f0', cursor: 'pointer', background: '#f8fafc' }}>
                <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => handlePickedFile(e, imgPickerFor.id, imgPickerFor.type)} />
                <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#0891b2' }}>photo_camera</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>Camera</span>
              </label>
              <label style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '18px 0', borderRadius: 14, border: '1.5px solid #e2e8f0', cursor: 'pointer', background: '#f8fafc' }}>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handlePickedFile(e, imgPickerFor.id, imgPickerFor.type)} />
                <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#7c3aed' }}>folder_open</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>Gallery</span>
              </label>
            </div>
            <button onClick={closeImagePicker} style={{ marginTop: 14, width: '100%', padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, color: '#64748b', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
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
      {showRoomDrawer && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div onClick={() => setShowRoomDrawer(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(2px)' }} />
          <div style={{ position: 'relative', background: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, width: '100%', maxHeight: '80vh', overflowY: 'auto', animation: 'slideUp 0.3s ease-out', maxWidth: 480, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: '#0f172a', fontWeight: 800 }}>Select Room & Bed</h3>
              <button onClick={() => setShowRoomDrawer(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 24 }}>close</span>
              </button>
            </div>
            
            {getRoomOccupancy().length === 0 ? (
              <p style={{ textAlign: 'center', color: '#64748b', margin: '32px 0' }}>No vacant rooms available.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {getRoomOccupancy().map(r => (
                  <div key={r.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div>
                        <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{r.name || `Room ${r.roomNo}`}</p>
                        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>Room {r.roomNo} • {r.vacantBeds.length} vacant beds</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {r.vacantBeds.map(b => (
                        <button
                          key={b}
                          onClick={() => {
                            setApproveForm(prev => ({ ...prev, roomNo: r.roomNo, bedNo: b }));
                            setShowRoomDrawer(false);
                          }}
                          style={{
                            padding: '8px 16px', borderRadius: 20, cursor: 'pointer', fontWeight: 600, fontSize: 13,
                            border: approveForm.roomNo === r.roomNo && String(approveForm.bedNo) === String(b) ? `1.5px solid ${cyan}` : '1px solid #cbd5e1',
                            background: approveForm.roomNo === r.roomNo && String(approveForm.bedNo) === String(b) ? '#ecfeff' : '#f8fafc',
                            color: approveForm.roomNo === r.roomNo && String(approveForm.bedNo) === String(b) ? cyan : '#334155'
                          }}
                        >
                          Bed {b}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ─── VIEW 2: ADD USER ─────────────────────────────────────
function AddUserView({ onBack }) {
  const [userType, setUserType] = useState('upcoming'); // upcoming | current
  const [career, setCareer] = useState('student'); // student | working
  const [payment, setPayment] = useState('cash'); // cash | online
  const [paymentType, setPaymentType] = useState('token'); // token | full
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [parentsAlive, setParentsAlive] = useState(true);
  const [paymentReceiver, setPaymentReceiver] = useState('admin'); // admin | manager | other
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [customAmenities, setCustomAmenities] = useState([]);
  const [lockInPeriod, setLockInPeriod] = useState('6 Months');
  const fileInputRef = useRef(null);

  const Label = ({ children, req }) => <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>{children} {req && <span style={{ color: '#ef4444' }}>*</span>}</label>;
  const Input = ({ placeholder, type = 'text', value, onChange }) => <input type={type} placeholder={placeholder} value={value} onChange={onChange} style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: `1px solid ${cyan}`, fontSize: 14, marginBottom: 16, outline: 'none' }} />;

  const handleUploadClick = () => fileInputRef.current?.click();

  
  const [customInventory, setCustomInventory] = useState([]);

  // Image picker popup: { id, type } where type = 'inventory' | 'amenity'
  const [imgPickerFor, setImgPickerFor] = useState(null);

  const openImagePicker = (id, type) => setImgPickerFor({ id, type });
  const closeImagePicker = () => setImgPickerFor(null);

  const handlePickedFile = async (e, id, type) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setApproveForm(prev => {
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
      setApproveForm(prev => ({ ...prev, inventory: { ...prev.inventory, [id]: null } }));
    }
  };

  const toggleInventory = (id) => {
    setApproveForm(prev => {
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
        setApproveForm(prev => ({ ...prev, inventory: { ...prev.inventory, [id]: compressed } }));
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

  const handleAddCustomAmenity = () => {
    const name = window.prompt('Enter custom amenity name:');
    if (name && name.trim()) {
      const id = 'custom-' + name.trim().toLowerCase().replace(/\s+/g, '-');
      setCustomAmenities(prev => [...prev, { id, label: name.trim(), icon: '✨' }]);
      setSelectedAmenities(prev => [...prev, id]);
    }
  };

  const toggleAmenity = (id) => {
    setSelectedAmenities(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const allAmenities = [...AMENITIES_DATA, ...customAmenities];
  
  const todayObj = new Date();
  const today = todayObj.toISOString().split('T')[0];
  const dayAfterTomorrowObj = new Date(todayObj);
  dayAfterTomorrowObj.setDate(dayAfterTomorrowObj.getDate() + 2);
  const dayAfterTomorrow = dayAfterTomorrowObj.toISOString().split('T')[0];
  
  const showFullAmount = userType === 'current' || joiningDate <= dayAfterTomorrow;

  return (
    <>
      <Header title="Add User" onBack={onBack} />
      <div style={{ padding: '20px 16px' }}>
        
        <Label req>User Type</Label>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <button onClick={() => setUserType('upcoming')} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${cyan}`, background: userType === 'upcoming' ? 'rgba(14,165,233,0.1)' : 'white', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', border: `4px solid ${userType === 'upcoming' ? cyan : '#e2e8f0'}`, background: 'white' }} />
            <span style={{ fontSize: 14, color: '#334155' }}>Upcoming User</span>
          </button>
          <button onClick={() => setUserType('current')} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${cyan}`, background: userType === 'current' ? 'rgba(14,165,233,0.1)' : 'white', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', border: `4px solid ${userType === 'current' ? cyan : '#e2e8f0'}`, background: 'white' }} />
            <span style={{ fontSize: 14, color: '#334155' }}>Current User</span>
          </button>
        </div>

        {userType === 'upcoming' && (
          <>
            <Label req>Lock-in Period</Label>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16 }}>
              {['1 Month', '3 Months', '6 Months', '12 Months'].map(period => (
                <button key={period} onClick={() => setLockInPeriod(period)} style={{ padding: '8px 16px', borderRadius: 20, border: `1px solid ${cyan}`, background: lockInPeriod === period ? cyan : 'white', color: lockInPeriod === period ? 'white' : cyan, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {period}
                </button>
              ))}
            </div>
          </>
        )}

        <Label req>Joining Date</Label>
        <Input type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} />

        <Label req>Name</Label><Input placeholder="Enter User Name" />
        <Label req>Mobile Number</Label><Input placeholder="Enter Mobile Number" type="tel" />
        <Label req>Email Id</Label><Input placeholder="Enter Email Id" type="email" />

        <Label req>Upload User Image</Label>
        <div onClick={handleUploadClick} style={{ border: `1.5px dashed ${cyan}`, borderRadius: 12, padding: '24px 16px', textAlign: 'center', background: 'white', marginBottom: 16, cursor: 'pointer' }}>
          <input type="file" ref={fileInputRef} style={{ display: 'none' }} />
          <span style={{ fontSize: 13, color: '#94a3b8' }}>Tap here to upload image</span>
          <span className="material-symbols-outlined" style={{ display: 'block', marginTop: 8, color: '#94a3b8' }}>cloud_upload</span>
        </div>

        <Label req>Parents Alive?</Label>
        <select value={parentsAlive ? 'yes' : 'no'} onChange={e => setParentsAlive(e.target.value === 'yes')} style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: `1px solid ${cyan}`, fontSize: 14, marginBottom: 16, outline: 'none', background: 'white' }}>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>

        {parentsAlive ? (
          <>
            <Label req>Father Name</Label><Input placeholder="Enter Father Name" />
            <Label req>Father Mobile Number</Label><Input placeholder="Enter Mobile Number" type="tel" />
          </>
        ) : (
          <>
            <Label req>Guardian/Relative Name</Label><Input placeholder="Enter Guardian Name" />
            <Label req>Guardian Mobile Number</Label><Input placeholder="Enter Mobile Number" type="tel" />
            <Label req>Relation</Label><Input placeholder="e.g. Uncle, Brother" />
          </>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><Label req>Bed Number</Label><Input placeholder="Enter Bed Number" /></div>
          <div><Label req>Room Number</Label><Input placeholder="Enter Room Number" /></div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <Label req>Amenities</Label>
          <span onClick={handleAddCustomAmenity} style={{ fontSize: '0.875rem', color: cyan, cursor: 'pointer', fontWeight: 600 }}>+ Add Custom</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: 16 }}>
          {allAmenities.map(amenity => {
            const isSelected = selectedAmenities.includes(amenity.id);
            return (
              <div 
                key={amenity.id} onClick={() => toggleAmenity(amenity.id)}
                style={{ border: `1px solid ${isSelected ? cyan : '#e2e8f0'}`, borderRadius: 8, padding: '10px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backgroundColor: isSelected ? 'rgba(14, 165, 233, 0.05)' : 'white', position: 'relative' }}
              >
                {isSelected && (
                  <div style={{ position: 'absolute', top: '-6px', right: '-6px', backgroundColor: cyan, color: 'white', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 12 }}>check</span>
                  </div>
                )}
                <span style={{ fontSize: '1.4rem', marginBottom: '4px' }}>{amenity.icon}</span>
                <span style={{ fontSize: '0.65rem', textAlign: 'center', fontWeight: '600', color: isSelected ? cyan : '#64748b' }}>{amenity.label}</span>
              </div>
            );
          })}
        </div>

        <Label req>Career Status</Label>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <button onClick={() => setCareer('student')} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${cyan}`, background: career === 'student' ? 'rgba(14,165,233,0.1)' : 'white', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', border: `4px solid ${career === 'student' ? cyan : '#e2e8f0'}`, background: 'white' }} />
            <span style={{ fontSize: 14, color: '#334155' }}>Student</span>
          </button>
          <button onClick={() => setCareer('working')} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${cyan}`, background: career === 'working' ? 'rgba(14,165,233,0.1)' : 'white', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', border: `4px solid ${career === 'working' ? cyan : '#e2e8f0'}`, background: 'white' }} />
            <span style={{ fontSize: 14, color: '#334155' }}>Working</span>
          </button>
        </div>

        {career === 'working' ? (
          <>
            <Label req>Company Name</Label><Input placeholder="Enter Company Name" />
            <Label req>Company Address</Label><Input placeholder="Enter Company Address" />
          </>
        ) : (
          <>
            <Label req>College Name</Label><Input placeholder="Enter College Name" />
            <Label req>College Address</Label><Input placeholder="Enter College Address" />
          </>
        )}

        <Label req>Upload ID Card Image</Label>
        <div onClick={handleUploadClick} style={{ border: `1.5px dashed ${cyan}`, borderRadius: 12, padding: '24px 16px', textAlign: 'center', background: 'white', marginBottom: 16, cursor: 'pointer' }}>
          <span style={{ fontSize: 13, color: '#94a3b8' }}>Tap here to upload Front & Back File</span>
          <span className="material-symbols-outlined" style={{ display: 'block', marginTop: 8, color: '#94a3b8' }}>cloud_upload</span>
        </div>

        {showFullAmount ? (
          <>
            <Label req>Full Amount Paid</Label><Input placeholder="Enter Full Amount" type="number" />
          </>
        ) : (
          <>
            <Label req>Payment Type</Label>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <button onClick={() => setPaymentType('token')} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${cyan}`, background: paymentType === 'token' ? 'rgba(14,165,233,0.1)' : 'white', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', border: `4px solid ${paymentType === 'token' ? cyan : '#e2e8f0'}`, background: 'white' }} />
                <span style={{ fontSize: 14, color: '#334155' }}>Token Amount</span>
              </button>
              <button onClick={() => setPaymentType('full')} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${cyan}`, background: paymentType === 'full' ? 'rgba(14,165,233,0.1)' : 'white', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', border: `4px solid ${paymentType === 'full' ? cyan : '#e2e8f0'}`, background: 'white' }} />
                <span style={{ fontSize: 14, color: '#334155' }}>Full Amount</span>
              </button>
            </div>
            
            {paymentType === 'token' ? (
              <>
                <Label req>Token Amount</Label><Input placeholder="Enter Token Amount" type="number" />
                <Label req>Pending Amount</Label><Input placeholder="Enter Pending Amount" type="number" />
              </>
            ) : (
              <>
                <Label req>Full Amount Paid</Label><Input placeholder="Enter Full Amount" type="number" />
              </>
            )}
          </>
        )}

        <Label req>Payment Mode</Label>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <button onClick={() => setPayment('cash')} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${cyan}`, background: payment === 'cash' ? 'rgba(14,165,233,0.1)' : 'white', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', border: `4px solid ${payment === 'cash' ? cyan : '#e2e8f0'}`, background: 'white' }} />
            <span style={{ fontSize: 14, color: '#334155' }}>CASH</span>
          </button>
          <button onClick={() => setPayment('online')} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${cyan}`, background: payment === 'online' ? 'rgba(14,165,233,0.1)' : 'white', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', border: `4px solid ${payment === 'online' ? cyan : '#e2e8f0'}`, background: 'white' }} />
            <span style={{ fontSize: 14, color: '#334155' }}>ONLINE</span>
          </button>
        </div>

        <Label req>Payment Handled By</Label>
        <select value={paymentReceiver} onChange={e => setPaymentReceiver(e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: `1px solid ${cyan}`, fontSize: 14, marginBottom: 16, outline: 'none', background: 'white' }}>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="other">Other</option>
        </select>
        
        {paymentReceiver === 'other' && (
          <>
            <Label req>Receiver Name</Label><Input placeholder="Enter Name of Receiver" />
          </>
        )}

        {payment === 'online' && (
          <>
            <Label req>Sender Phone / UPI ID</Label><Input placeholder="e.g. 9876543210 or user@upi" />
            <Label req>Receiver Phone / UPI ID</Label><Input placeholder="e.g. 9876543210 or pg@upi" />
          </>
        )}

        <Label req>Meter Unit</Label><Input placeholder="1000 Unit" />
        
        <Label req>Complete Address</Label>
        <Input placeholder="Enter City Name" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input placeholder="Street No." />
          <Input placeholder="Pincode" />
        </div>
        <Input placeholder="Full Address" />

        <button onClick={onBack} style={{ width: '100%', padding: '16px', borderRadius: 8, background: cyan, color: 'white', fontWeight: 700, fontSize: 15, border: 'none', marginTop: 10, cursor: 'pointer' }}>
          Save & Next
        </button>
      </div>
    </>
  );
}
