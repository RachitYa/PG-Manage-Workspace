import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, doc, setDoc, addDoc, getDoc } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { db, firebaseConfig } from '../../firebase';

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

const AMENITIES_LIST = [
  { id: 'ac', label: 'Air Conditioner', icon: 'ac_unit' },
  { id: 'fridge', label: 'Refrigerator', icon: 'kitchen' },
  { id: 'washing_machine', label: 'Washing Machine', icon: 'local_laundry_service' },
  { id: 'study_table', label: 'Study Table', icon: 'desk' },
  { id: 'cooler', label: 'Air Cooler', icon: 'mode_fan' },
  { id: 'geyser', label: 'Geyser / Water Heater', icon: 'water_heater' }
];

const compressImageBase64 = (file, maxWidth = 800) => {
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
        resolve(canvas.toDataURL('image/jpeg', 0.65));
      };
      img.onerror = () => resolve(null);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
};

export default function ManagerAddTenantView({
  adminId,
  activePgId,
  assignedProperties = [],
  staffUser,
  onBack,
  showToast,
  initialMode = 'new'
}) {
  // Mode: 'new' (New Student) | 'already' (Already Resident)
  const [mode, setMode] = useState(initialMode); // 'new' | 'already'
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  // Selected Target PG
  const [selectedPgId, setSelectedPgId] = useState(() => {
    return activePgId || (assignedProperties[0]?.id) || 'primary';
  });

  const selectedPgName = useMemo(() => {
    const found = assignedProperties.find(p => p.id === selectedPgId);
    return found ? found.name : 'Primary PG';
  }, [assignedProperties, selectedPgId]);

  // Loading states
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [createdStudentInfo, setCreatedStudentInfo] = useState(null); // Success screen state

  // Rooms and Tenants for selected PG
  const [rooms, setRooms] = useState([]);
  const [tenants, setTenants] = useState([]);

  // Fetch rooms & existing tenants whenever adminId or selectedPgId changes
  useEffect(() => {
    if (!adminId) return;
    const fetchRoomsAndTenants = async () => {
      setLoadingRooms(true);
      try {
        const qRooms = query(collection(db, 'rooms'), where('adminId', '==', adminId));
        const qTenants = query(collection(db, 'tenants'), where('adminId', '==', adminId));

        const [rSnap, tSnap] = await Promise.all([getDocs(qRooms), getDocs(qTenants)]);

        const allRooms = rSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const allTenants = tSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Filter by selectedPgId
        const pgRooms = allRooms.filter(r => {
          if (!r.pgId || r.pgId === 'primary') return selectedPgId === 'primary';
          return r.pgId === selectedPgId;
        });

        const pgTenants = allTenants.filter(t => {
          if (t.status === 'Moved Out' || t.status === 'Exited') return false;
          if (!t.pgId || t.pgId === 'primary') return selectedPgId === 'primary';
          return t.pgId === selectedPgId;
        });

        // Sort rooms numerically
        pgRooms.sort((a, b) => String(a.roomNo).localeCompare(String(b.roomNo), undefined, { numeric: true }));

        setRooms(pgRooms);
        setTenants(pgTenants);
      } catch (err) {
        console.error('Error fetching rooms for manager add student:', err);
      } finally {
        setLoadingRooms(false);
      }
    };

    fetchRoomsAndTenants();
  }, [adminId, selectedPgId]);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Personal
    name: '',
    phone: '',
    email: '',
    password: '',
    serviceType: 'all_services', // 'all_services' | 'only_room'

    // Step 2: Room & Bed
    selectedRoomId: '',
    selectedBed: '',
    leaseType: 'bed_sharing', // 'bed_sharing' | 'entire_room'
    dateOfJoining: new Date().toISOString().split('T')[0],
    meterReading: '',

    // Step 3 (New): Rent & Food
    rent: '',
    securityDeposit: '',
    foodIncluded: true,
    includedFoodPersons: 1,
    coResidents: [],

    // Step 3 (Already): Inventory & Amenities
    amenities: [],
    inventory: {}, // itemId: true/false

    // Step 4 (New): Payment
    paymentMode: 'Token Only', // 'Token Only' | 'Full Payment'
    amountPaid: '',
    paymentMethod: 'Cash', // 'Cash' | 'Online' | 'UPI'
    paymentScreenshot: null,

    // Step 4 (Already): Financial Balance
    paidTillMonth: new Date().toISOString().slice(0, 7),
    remainingAmount: '0'
  });

  const selectedRoom = useMemo(() => {
    return rooms.find(r => r.id === formData.selectedRoomId);
  }, [rooms, formData.selectedRoomId]);

  // When room is selected, automatically update suggested rent
  useEffect(() => {
    if (selectedRoom) {
      if (selectedRoom.price && !formData.rent) {
        setFormData(prev => ({ ...prev, rent: String(selectedRoom.price) }));
      }
      if (selectedRoom.foodIncluded !== undefined) {
        setFormData(prev => ({
          ...prev,
          foodIncluded: selectedRoom.foodIncluded,
          includedFoodPersons: selectedRoom.includedFoodPersons || 1
        }));
      }
    }
  }, [selectedRoom]);

  // Bed occupants for currently selected room
  const roomOccupants = useMemo(() => {
    if (!selectedRoom) return {};
    const occupants = {};
    tenants.forEach(t => {
      if (String(t.roomNo) === String(selectedRoom.roomNo) || String(t.room) === String(selectedRoom.roomNo)) {
        const bed = (t.bedNo || t.bed || '').toUpperCase();
        if (bed) occupants[bed] = t.name || 'Occupied';
      }
    });
    return occupants;
  }, [selectedRoom, tenants]);

  // Handle inputs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Toggle Amenities for Already Resident
  const toggleAmenity = (id) => {
    setFormData(prev => {
      const list = prev.amenities || [];
      return {
        ...prev,
        amenities: list.includes(id) ? list.filter(x => x !== id) : [...list, id]
      };
    });
  };

  // Toggle Inventory for Already Resident
  const toggleInventoryItem = (id) => {
    setFormData(prev => {
      const inv = { ...(prev.inventory || {}) };
      if (inv[id]) delete inv[id];
      else inv[id] = true;
      return { ...prev, inventory: inv };
    });
  };

  // Screenshot upload
  const handleScreenshotChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await compressImageBase64(file);
    if (base64) {
      setFormData(prev => ({ ...prev, paymentScreenshot: base64 }));
    }
  };

  // Validate and step forward
  const handleNext = async () => {
    if (step === 1) {
      if (!formData.name.trim()) {
        showToast?.('Please enter student full name', 'warning');
        return;
      }
      const cleanPhone = formData.phone.trim().replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        showToast?.('Please enter a valid 10-digit mobile number', 'warning');
        return;
      }

      // Check if phone already registered in users collection
      try {
        const qCheck = query(collection(db, 'users'), where('phone', '==', cleanPhone));
        const checkSnap = await getDocs(qCheck);
        if (!checkSnap.empty) {
          showToast?.('This mobile number is already registered in Febebo', 'error');
          return;
        }
      } catch (err) {
        console.warn('Phone check error:', err);
      }

      // Default email & password if left empty
      if (!formData.email.trim()) {
        setFormData(prev => ({ ...prev, email: `${cleanPhone}@febebo.auto` }));
      }
      if (!formData.password.trim()) {
        setFormData(prev => ({ ...prev, password: `Febebo@${cleanPhone}` }));
      }
    }

    if (step === 2) {
      if (!formData.selectedRoomId) {
        showToast?.('Please select a room', 'warning');
        return;
      }
      if (!formData.selectedBed) {
        showToast?.('Please allocate a bed (e.g. Bed A, Bed B)', 'warning');
        return;
      }
      if (roomOccupants[formData.selectedBed.toUpperCase()]) {
        showToast?.(`Bed ${formData.selectedBed} is already occupied by ${roomOccupants[formData.selectedBed.toUpperCase()]}`, 'warning');
        return;
      }
    }

    if (step === 3) {
      if (mode === 'new') {
        if (!formData.rent || Number(formData.rent) < 0) {
          showToast?.('Please enter a valid monthly rent amount', 'warning');
          return;
        }
      }
    }

    if (step < totalSteps) {
      setStep(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrev = () => {
    if (step > 1) setStep(prev => prev - 1);
  };

  // Submit Handler
  const handleSubmit = async () => {
    const cleanPhone = formData.phone.trim().replace(/\D/g, '');
    const email = formData.email.trim() || `${cleanPhone}@febebo.auto`;
    const password = formData.password.trim() || `Febebo@${cleanPhone}`;

    if (mode === 'new') {
      if (formData.amountPaid === '' || formData.amountPaid === undefined) {
        showToast?.('Please enter the advance / token amount paid (or 0)', 'warning');
        return;
      }
    }

    setSubmitting(true);
    let secondaryApp = null;

    try {
      // 1. Initialize secondary app so staff member is NEVER signed out
      const appName = `MgrAddTenant_${Date.now()}`;
      secondaryApp = initializeApp(firebaseConfig, appName);
      const secondaryAuth = getAuth(secondaryApp);

      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const newUid = userCredential.user.uid;

      const customRent = Number(formData.rent) || 0;
      const customSecurity = Number(formData.securityDeposit) || 0;
      const leaseAmount = customRent + customSecurity;
      const amountPaid = Number(formData.amountPaid) || 0;
      const isFullPayment = formData.paymentMode === 'Full Payment';
      const remainingAmount = mode === 'already' 
        ? (Number(formData.remainingAmount) || 0) 
        : (isFullPayment ? 0 : Math.max(0, leaseAmount - amountPaid));

      const isSinglePayer = formData.leaseType === 'entire_room';
      const foodPersonsCount = formData.foodIncluded 
        ? (Number(formData.includedFoodPersons) || (formData.coResidents?.length || 0) + 1 || 1) 
        : 0;

      const dateJoiningIso = new Date(formData.dateOfJoining || new Date()).toISOString();

      // 2. Write users document
      await setDoc(doc(db, 'users', newUid), {
        role: 'customer',
        name: formData.name.trim(),
        email,
        phone: cleanPhone,
        profileCompleted: true,
        detailsFilled: false,
        hasPG: true,
        pgStatus: mode === 'already' ? 'Approved' : 'Upcoming User',
        registeredVia: mode === 'already' ? 'already_residence' : 'add_tenant',
        isAddTenant: true,
        isAlreadyResident: mode === 'already',
        serviceType: formData.serviceType,
        roomNo: selectedRoom?.roomNo || '',
        bedNo: formData.selectedBed,
        isPrimaryPayer: isSinglePayer,
        leaseType: formData.leaseType,
        foodIncluded: formData.foodIncluded,
        includedFoodPersons: foodPersonsCount,
        coResidents: formData.coResidents || [],
        amenities: formData.amenities || [],
        inventory: formData.inventory || {},
        createdAt: new Date().toISOString(),
        addedByStaff: staffUser?.id || staffUser?.uid,
        addedByStaffName: staffUser?.name || 'Manager',
        subscribedPG: {
          adminId,
          pgId: selectedPgId,
          pgName: selectedPgName,
          roomNo: selectedRoom?.roomNo || '',
          bedNo: formData.selectedBed,
          seaterLabel: selectedRoom?.seaterLabel || `${selectedRoom?.beds || 1} Seater`,
          roomType: selectedRoom?.roomType || 'Standard',
          isPrimaryPayer: isSinglePayer,
          leaseType: formData.leaseType,
          foodIncluded: formData.foodIncluded,
          includedFoodPersons: foodPersonsCount,
          rent: customRent,
          securityAmount: customSecurity,
          leaseAmount,
          tokenPaid: amountPaid,
          remainingAmount,
          paidTillMonth: mode === 'already' ? formData.paidTillMonth : '',
          paymentVerificationPending: remainingAmount > 0,
          paymentMethod: formData.paymentMethod,
          paymentScreenshot: formData.paymentScreenshot || null,
          status: mode === 'already' ? 'Approved' : 'Upcoming User',
          isAddTenant: true,
          isAlreadyResident: mode === 'already',
          dateOfJoining: dateJoiningIso,
          meterReadingAtJoin: Number(formData.meterReading) || 0,
          meterReading: Number(formData.meterReading) || 0
        }
      });

      // 3. Write tenants document
      await setDoc(doc(db, 'tenants', newUid), {
        adminId,
        pgId: selectedPgId,
        tenantId: newUid,
        name: formData.name.trim(),
        phone: cleanPhone,
        email,
        roomNo: selectedRoom?.roomNo || '',
        bedNo: formData.selectedBed,
        isPrimaryPayer: isSinglePayer,
        leaseType: formData.leaseType,
        foodIncluded: formData.foodIncluded,
        includedFoodPersons: foodPersonsCount,
        coResidents: formData.coResidents || [],
        rentAmount: leaseAmount,
        rent: customRent,
        securityAmount: customSecurity,
        tokenPaid: amountPaid,
        remainingAmount,
        dateOfJoining: dateJoiningIso,
        meterReadingAtJoin: Number(formData.meterReading) || 0,
        meterReading: Number(formData.meterReading) || 0,
        registeredVia: mode === 'already' ? 'already_residence' : 'add_tenant',
        isAddTenant: true,
        isAlreadyResident: mode === 'already',
        serviceType: formData.serviceType,
        status: mode === 'already' ? 'Approved' : 'Upcoming User',
        addedByStaff: staffUser?.id || staffUser?.uid,
        addedByStaffName: staffUser?.name || 'Manager',
        createdAt: new Date().toISOString()
      }, { merge: true });

      // 4. If token payment recorded, create rent_receipts document
      if (amountPaid > 0) {
        await addDoc(collection(db, 'rent_receipts'), {
          adminId,
          pgId: selectedPgId,
          tenantId: newUid,
          tenantName: formData.name.trim(),
          tenantPhone: cleanPhone,
          amount: amountPaid,
          paymentType: 'Advance / Token Payment',
          paymentMethod: formData.paymentMethod,
          paymentDate: new Date().toISOString(),
          roomNo: selectedRoom?.roomNo || '',
          bedNo: formData.selectedBed,
          totalRent: customRent,
          securityDeposit: customSecurity,
          remainingAmount,
          screenshotUrl: formData.paymentScreenshot || null,
          collectedByStaff: staffUser?.id || staffUser?.uid,
          collectedByStaffName: staffUser?.name || 'Manager'
        });
      }

      // 5. If already resident with inventory, create inventory_allocations
      if (mode === 'already' && formData.inventory) {
        const allocatedKeys = Object.keys(formData.inventory);
        for (const key of allocatedKeys) {
          const itemMeta = INVENTORY_ITEMS.find(i => i.id === key);
          if (itemMeta) {
            await addDoc(collection(db, 'inventory_allocations'), {
              tenantId: newUid,
              adminId,
              pgId: selectedPgId,
              itemName: itemMeta.label,
              icon: itemMeta.icon,
              allocatedAt: new Date().toISOString(),
              allocatedBy: staffUser?.name || 'Manager'
            });
          }
        }
      }

      // 6. Send live notification to Admin
      await addDoc(collection(db, 'notifications'), {
        adminId,
        pgId: selectedPgId,
        title: mode === 'already' ? 'Existing Resident Added' : 'New Student Added',
        desc: `${staffUser?.name || 'Manager'} added ${formData.name.trim()} (${cleanPhone}) to Room ${selectedRoom?.roomNo || ''} (Bed ${formData.selectedBed}) at ${selectedPgName}.`,
        type: 'new_tenant_by_staff',
        date: new Date().toISOString(),
        unread: true,
        resolved: false,
        tenantId: newUid
      });

      // Cleanup secondary app
      await deleteApp(secondaryApp);

      // Show Success view
      setCreatedStudentInfo({
        name: formData.name.trim(),
        phone: cleanPhone,
        email,
        password,
        roomNo: selectedRoom?.roomNo,
        bedNo: formData.selectedBed,
        pgName: selectedPgName
      });

      showToast?.(`Student ${formData.name.trim()} successfully added to ${selectedPgName}!`, 'success');
    } catch (err) {
      console.error('Error creating student account:', err);
      showToast?.(`Failed to add student: ${err.message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // SUCCESS SCREEN
  if (createdStudentInfo) {
    return (
      <div style={{ minHeight: '100vh', background: '#ffffff', display: 'flex', flexDirection: 'column', padding: '24px 20px', fontFamily: "'Hanken Grotesk', sans-serif" }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', maxWidth: 420, margin: '0 auto', width: '100%' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 44, color: '#16a34a' }}>check_circle</span>
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: '0 0 6px' }}>Student Added Successfully!</h2>
          <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 24px', lineHeight: 1.5 }}>
            <strong>{createdStudentInfo.name}</strong> has been enrolled into <strong>{createdStudentInfo.pgName}</strong> (Room {createdStudentInfo.roomNo}, Bed {createdStudentInfo.bedNo}).
          </p>

          <div style={{ width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, padding: '18px 16px', textAlign: 'left', marginBottom: 24 }}>
            <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>Student Login Credentials</p>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: '#64748b' }}>Mobile Number:</span>
              <strong style={{ fontSize: 13, color: '#0f172a' }}>{createdStudentInfo.phone}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: '#64748b' }}>Email:</span>
              <strong style={{ fontSize: 13, color: '#0f172a' }}>{createdStudentInfo.email}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: '#64748b' }}>Password:</span>
              <strong style={{ fontSize: 13, color: '#0891b2' }}>{createdStudentInfo.password}</strong>
            </div>

            <button
              onClick={() => {
                const text = `Febebo PG Login:\nPhone: ${createdStudentInfo.phone}\nPassword: ${createdStudentInfo.password}\nRoom: ${createdStudentInfo.roomNo} (${createdStudentInfo.bedNo})\nPG: ${createdStudentInfo.pgName}`;
                navigator.clipboard.writeText(text);
                showToast?.('Credentials copied to clipboard!', 'success');
              }}
              style={{
                width: '100%',
                marginTop: 14,
                padding: '10px',
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>content_copy</span>
              Copy Login Details
            </button>
          </div>

          <div style={{ display: 'flex', gap: 12, width: '100%' }}>
            <button
              onClick={() => {
                setCreatedStudentInfo(null);
                setStep(1);
                setFormData(prev => ({
                  ...prev,
                  name: '', phone: '', email: '', password: '',
                  selectedRoomId: '', selectedBed: '', amountPaid: '', paymentScreenshot: null
                }));
              }}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: 14,
                border: '1.5px solid #e2e8f0',
                background: '#ffffff',
                color: '#0f172a',
                fontSize: 14,
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              Add Another
            </button>

            <button
              onClick={onBack}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: 14,
                border: 'none',
                background: '#0891b2',
                color: '#ffffff',
                fontSize: 14,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(8,145,178,0.25)'
              }}
            >
              Back to Tenants
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100%', background: '#ffffff', display: 'flex', flexDirection: 'column', fontFamily: "'Hanken Grotesk', sans-serif", paddingBottom: 'calc(40px + env(safe-area-inset-bottom, 0px))' }}>
      
      {/* ── TOP HEADER (APPLE BRIGHT) ── */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '16px 16px', position: 'sticky', top: 0, zIndex: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={onBack}
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#0f172a' }}>arrow_back</span>
            </button>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>Add Student</h2>
              <p style={{ margin: 0, fontSize: 11, color: '#64748b', fontWeight: 600 }}>Step {step} of {totalSteps} · {selectedPgName}</p>
            </div>
          </div>

          {/* Multi-PG Selector Pill */}
          {assignedProperties && assignedProperties.length > 1 && (
            <div style={{ position: 'relative' }}>
              <select
                value={selectedPgId}
                onChange={e => {
                  setSelectedPgId(e.target.value);
                  setFormData(prev => ({ ...prev, selectedRoomId: '', selectedBed: '' }));
                }}
                style={{
                  background: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: 20,
                  padding: '6px 28px 6px 12px',
                  fontSize: 12,
                  fontWeight: 800,
                  color: '#0f172a',
                  outline: 'none',
                  appearance: 'none',
                  cursor: 'pointer'
                }}
              >
                {assignedProperties.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <span className="material-symbols-outlined" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: '#64748b', pointerEvents: 'none' }}>
                expand_more
              </span>
            </div>
          )}
        </div>

        {/* ── MODE SWITCHER SEGMENTED CONTROL ── */}
        <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: 12 }}>
          <button
            type="button"
            onClick={() => { setMode('new'); setStep(1); }}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: 10,
              border: 'none',
              background: mode === 'new' ? '#ffffff' : 'transparent',
              color: mode === 'new' ? '#0f172a' : '#64748b',
              fontWeight: 800,
              fontSize: 12.5,
              cursor: 'pointer',
              boxShadow: mode === 'new' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s'
            }}
          >
            🎓 New Admission
          </button>
          <button
            type="button"
            onClick={() => { setMode('already'); setStep(1); }}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: 10,
              border: 'none',
              background: mode === 'already' ? '#ffffff' : 'transparent',
              color: mode === 'already' ? '#0f172a' : '#64748b',
              fontWeight: 800,
              fontSize: 12.5,
              cursor: 'pointer',
              boxShadow: mode === 'already' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s'
            }}
          >
            🏠 Already Resident
          </button>
        </div>

        {/* ── STEP PROGRESS BAR ── */}
        <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
          {[1, 2, 3, 4].map(s => (
            <div
              key={s}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background: s <= step ? '#0891b2' : '#e2e8f0',
                transition: 'background 0.2s'
              }}
            />
          ))}
        </div>
      </div>

      {/* ── FORM BODY ── */}
      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>

        {/* ──────────────────────────────────────────────────────────
            STEP 1: PERSONAL DETAILS
           ────────────────────────────────────────────────────────── */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#0f172a' }}>Personal Details</h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>Basic identity and service enrollment</p>
            </div>

            {/* Service Type (New admission only) */}
            {mode === 'new' && (
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Service Package</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 6 }}>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, serviceType: 'all_services' }))}
                    style={{
                      padding: '12px 10px',
                      borderRadius: 12,
                      border: `1.5px solid ${formData.serviceType === 'all_services' ? '#0891b2' : '#e2e8f0'}`,
                      background: formData.serviceType === 'all_services' ? '#ecfeff' : '#ffffff',
                      color: formData.serviceType === 'all_services' ? '#0e7490' : '#475569',
                      fontWeight: 800,
                      fontSize: 12,
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    🍽️ Full PG + Food
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, serviceType: 'only_room', foodIncluded: false }))}
                    style={{
                      padding: '12px 10px',
                      borderRadius: 12,
                      border: `1.5px solid ${formData.serviceType === 'only_room' ? '#0891b2' : '#e2e8f0'}`,
                      background: formData.serviceType === 'only_room' ? '#ecfeff' : '#ffffff',
                      color: formData.serviceType === 'only_room' ? '#0e7490' : '#475569',
                      fontWeight: 800,
                      fontSize: 12,
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    🛏️ Only Room
                  </button>
                </div>
              </div>
            )}

            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Full Name *</label>
              <input
                type="text"
                name="name"
                required
                placeholder="e.g. Rahul Sharma"
                value={formData.name}
                onChange={handleChange}
                style={{ width: '100%', marginTop: 4, padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 14, fontWeight: 600, color: '#0f172a', background: '#fff', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Mobile Number *</label>
              <div style={{ display: 'flex', alignItems: 'center', marginTop: 4, border: '1px solid #cbd5e1', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
                <span style={{ padding: '0 12px', background: '#f1f5f9', color: '#64748b', fontSize: 13, fontWeight: 700, borderRight: '1px solid #cbd5e1', lineHeight: '46px' }}>+91</span>
                <input
                  type="tel"
                  name="phone"
                  maxLength={10}
                  required
                  placeholder="9876543210"
                  value={formData.phone}
                  onChange={handleChange}
                  style={{ width: '100%', border: 'none', padding: '12px 14px', fontSize: 14, fontWeight: 700, color: '#0f172a', outline: 'none' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Email Address (Optional)</label>
              <input
                type="email"
                name="email"
                placeholder={formData.phone ? `${formData.phone}@febebo.auto` : 'student@example.com'}
                value={formData.email}
                onChange={handleChange}
                style={{ width: '100%', marginTop: 4, padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 14, fontWeight: 600, color: '#0f172a', background: '#fff', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Account Password</label>
              <input
                type="text"
                name="password"
                placeholder={formData.phone ? `Febebo@${formData.phone}` : 'Default password'}
                value={formData.password}
                onChange={handleChange}
                style={{ width: '100%', marginTop: 4, padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 14, fontWeight: 600, color: '#0f172a', background: '#fff', boxSizing: 'border-box' }}
              />
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8' }}>Defaults automatically to <code>Febebo@[Phone]</code> if left empty.</p>
            </div>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────
            STEP 2: ROOM & BED ALLOCATION
           ────────────────────────────────────────────────────────── */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#0f172a' }}>Room & Bed Allocation</h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>Assigned property: {selectedPgName}</p>
            </div>

            {/* Room Picker */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Select Room *</label>
              {loadingRooms ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Loading rooms...</div>
              ) : rooms.length === 0 ? (
                <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 12, padding: 14, marginTop: 6, color: '#e11d48', fontSize: 13 }}>
                  No rooms configured for {selectedPgName}. Please add rooms in "Rooms & Beds" first.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 6, maxHeight: 180, overflowY: 'auto' }}>
                  {rooms.map(r => {
                    const isSelected = formData.selectedRoomId === r.id;
                    const rBeds = parseInt(r.beds || r.capacity || 1) || 1;
                    const occ = tenants.filter(t => String(t.roomNo) === String(r.roomNo) || String(t.room) === String(r.roomNo)).length;
                    const isFull = occ >= rBeds;

                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, selectedRoomId: r.id, selectedBed: '' }));
                        }}
                        style={{
                          padding: '10px 8px',
                          borderRadius: 12,
                          border: `1.5px solid ${isSelected ? '#0891b2' : isFull ? '#e2e8f0' : '#bbf7d0'}`,
                          background: isSelected ? '#ecfeff' : isFull ? '#f8fafc' : '#ffffff',
                          cursor: 'pointer',
                          textAlign: 'center'
                        }}
                      >
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: isSelected ? '#0891b2' : '#0f172a' }}>Room {r.roomNo}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 10, fontWeight: 700, color: isFull ? '#94a3b8' : '#16a34a' }}>
                          {occ}/{rBeds} {isFull ? 'Full' : 'Seats'}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bed Picker */}
            {selectedRoom && (
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Select Bed *</label>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(parseInt(selectedRoom.beds || 2), 4)}, 1fr)`, gap: 8, marginTop: 6 }}>
                  {Array.from({ length: parseInt(selectedRoom.beds || 2) }).map((_, idx) => {
                    const bedLetter = String.fromCharCode(65 + idx); // A, B, C...
                    const occupantName = roomOccupants[bedLetter];
                    const isOccupied = !!occupantName;
                    const isSelected = formData.selectedBed === bedLetter;

                    return (
                      <button
                        key={bedLetter}
                        type="button"
                        disabled={isOccupied}
                        onClick={() => setFormData(prev => ({ ...prev, selectedBed: bedLetter }))}
                        style={{
                          padding: '12px 6px',
                          borderRadius: 12,
                          border: `1.5px solid ${isSelected ? '#0891b2' : isOccupied ? '#f1f5f9' : '#cbd5e1'}`,
                          background: isSelected ? '#ecfeff' : isOccupied ? '#f1f5f9' : '#ffffff',
                          cursor: isOccupied ? 'not-allowed' : 'pointer',
                          opacity: isOccupied ? 0.6 : 1,
                          textAlign: 'center'
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 20, color: isSelected ? '#0891b2' : isOccupied ? '#94a3b8' : '#475569' }}>
                          single_bed
                        </span>
                        <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 900, color: isSelected ? '#0891b2' : '#0f172a' }}>Bed {bedLetter}</p>
                        <p style={{ margin: 0, fontSize: 10, color: isOccupied ? '#ef4444' : '#16a34a', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {isOccupied ? occupantName.split(' ')[0] : 'Vacant'}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Occupancy / Lease Model */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Occupancy Model</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, leaseType: 'bed_sharing' }))}
                  style={{
                    padding: '10px',
                    borderRadius: 12,
                    border: `1.5px solid ${formData.leaseType === 'bed_sharing' ? '#0891b2' : '#e2e8f0'}`,
                    background: formData.leaseType === 'bed_sharing' ? '#ecfeff' : '#ffffff',
                    color: formData.leaseType === 'bed_sharing' ? '#0e7490' : '#475569',
                    fontWeight: 800,
                    fontSize: 12,
                    cursor: 'pointer'
                  }}
                >
                  🛏️ Bed Sharing
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, leaseType: 'entire_room' }))}
                  style={{
                    padding: '10px',
                    borderRadius: 12,
                    border: `1.5px solid ${formData.leaseType === 'entire_room' ? '#0891b2' : '#e2e8f0'}`,
                    background: formData.leaseType === 'entire_room' ? '#ecfeff' : '#ffffff',
                    color: formData.leaseType === 'entire_room' ? '#0e7490' : '#475569',
                    fontWeight: 800,
                    fontSize: 12,
                    cursor: 'pointer'
                  }}
                >
                  🏢 Entire Room / Flat
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Joining Date</label>
                <input
                  type="date"
                  name="dateOfJoining"
                  value={formData.dateOfJoining}
                  onChange={handleChange}
                  style={{ width: '100%', marginTop: 4, padding: '10px 12px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700, color: '#0f172a', background: '#fff', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Meter Reading (kWh)</label>
                <input
                  type="number"
                  name="meterReading"
                  placeholder="e.g. 142.5"
                  value={formData.meterReading}
                  onChange={handleChange}
                  style={{ width: '100%', marginTop: 4, padding: '10px 12px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700, color: '#0f172a', background: '#fff', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────
            STEP 3 (NEW): RENT & FOOD PLAN
           ────────────────────────────────────────────────────────── */}
        {step === 3 && mode === 'new' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#0f172a' }}>Rent & Food Plan</h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>Configure monthly rent, security & meal plans</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Monthly Rent (₹) *</label>
                <input
                  type="number"
                  name="rent"
                  required
                  placeholder="e.g. 8500"
                  value={formData.rent}
                  onChange={handleChange}
                  style={{ width: '100%', marginTop: 4, padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 14, fontWeight: 700, color: '#0f172a', background: '#fff', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Security Deposit (₹)</label>
                <input
                  type="number"
                  name="securityDeposit"
                  placeholder="e.g. 5000"
                  value={formData.securityDeposit}
                  onChange={handleChange}
                  style={{ width: '100%', marginTop: 4, padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 14, fontWeight: 700, color: '#0f172a', background: '#fff', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Food Included Toggle */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 24, color: formData.foodIncluded ? '#059669' : '#94a3b8' }}>restaurant</span>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#0f172a' }}>Food / Mess Included</p>
                    <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>Counted in kitchen daily headcount</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.foodIncluded}
                  onChange={e => setFormData(prev => ({ ...prev, foodIncluded: e.target.checked }))}
                  style={{ width: 20, height: 20, accentColor: '#0891b2', cursor: 'pointer' }}
                />
              </div>

              {formData.foodIncluded && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
                  <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Number of Food Persons</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.includedFoodPersons}
                    onChange={e => setFormData(prev => ({ ...prev, includedFoodPersons: Math.max(1, parseInt(e.target.value) || 1) }))}
                    style={{ width: '100%', marginTop: 4, padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700, background: '#fff', boxSizing: 'border-box' }}
                  />
                </div>
              )}
            </div>

            {/* Total Move-in calculation */}
            <div style={{ background: '#ecfeff', border: '1.5px solid #a5f3fc', borderRadius: 14, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#0e7490' }}>Total Move-In (Rent + Deposit)</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#155e75' }}>Due at joining</p>
              </div>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#0e7490' }}>
                ₹{(Number(formData.rent) || 0) + (Number(formData.securityDeposit) || 0)}
              </p>
            </div>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────
            STEP 3 (ALREADY RESIDENT): AMENITIES & INVENTORY
           ────────────────────────────────────────────────────────── */}
        {step === 3 && mode === 'already' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#0f172a' }}>Amenities & Inventory</h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>Assigned room items and amenities</p>
            </div>

            {/* Room Inventory */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Assigned Inventory Items</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 6 }}>
                {INVENTORY_ITEMS.map(item => {
                  const isChecked = !!formData.inventory?.[item.id];
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleInventoryItem(item.id)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 12,
                        border: `1.5px solid ${isChecked ? '#0891b2' : '#e2e8f0'}`,
                        background: isChecked ? '#ecfeff' : '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <span style={{ fontSize: 18 }}>{item.icon}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: isChecked ? '#0e7490' : '#0f172a' }}>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Room Amenities */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Room Amenities</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 6 }}>
                {AMENITIES_LIST.map(amenity => {
                  const isChecked = (formData.amenities || []).includes(amenity.id);
                  return (
                    <button
                      key={amenity.id}
                      type="button"
                      onClick={() => toggleAmenity(amenity.id)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 12,
                        border: `1.5px solid ${isChecked ? '#0891b2' : '#e2e8f0'}`,
                        background: isChecked ? '#ecfeff' : '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18, color: isChecked ? '#0891b2' : '#64748b' }}>{amenity.icon}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: isChecked ? '#0e7490' : '#0f172a' }}>{amenity.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────
            STEP 4 (NEW): ADVANCE & PAYMENT
           ────────────────────────────────────────────────────────── */}
        {step === 4 && mode === 'new' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#0f172a' }}>Advance & Payment</h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>Record joining token or full payment</p>
            </div>

            {/* Payment Mode */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Payment Mode</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, paymentMode: 'Token Only' }))}
                  style={{
                    padding: '12px 10px',
                    borderRadius: 12,
                    border: `1.5px solid ${formData.paymentMode === 'Token Only' ? '#0891b2' : '#e2e8f0'}`,
                    background: formData.paymentMode === 'Token Only' ? '#ecfeff' : '#ffffff',
                    color: formData.paymentMode === 'Token Only' ? '#0e7490' : '#475569',
                    fontWeight: 800,
                    fontSize: 12,
                    cursor: 'pointer'
                  }}
                >
                  🪙 Token / Advance
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const total = (Number(formData.rent) || 0) + (Number(formData.securityDeposit) || 0);
                    setFormData(prev => ({ ...prev, paymentMode: 'Full Payment', amountPaid: String(total) }));
                  }}
                  style={{
                    padding: '12px 10px',
                    borderRadius: 12,
                    border: `1.5px solid ${formData.paymentMode === 'Full Payment' ? '#0891b2' : '#e2e8f0'}`,
                    background: formData.paymentMode === 'Full Payment' ? '#ecfeff' : '#ffffff',
                    color: formData.paymentMode === 'Full Payment' ? '#0e7490' : '#475569',
                    fontWeight: 800,
                    fontSize: 12,
                    cursor: 'pointer'
                  }}
                >
                  💵 Full Payment
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Amount Paid (₹) *</label>
                <input
                  type="number"
                  name="amountPaid"
                  required
                  placeholder="e.g. 2000"
                  value={formData.amountPaid}
                  onChange={handleChange}
                  style={{ width: '100%', marginTop: 4, padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 14, fontWeight: 700, color: '#0f172a', background: '#fff', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Payment Method</label>
                <select
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleChange}
                  style={{ width: '100%', marginTop: 4, padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700, color: '#0f172a', background: '#fff', boxSizing: 'border-box' }}
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="Online">Online Transfer</option>
                  <option value="Card">Card</option>
                </select>
              </div>
            </div>

            {/* Remaining Amount Badge */}
            {(() => {
              const lease = (Number(formData.rent) || 0) + (Number(formData.securityDeposit) || 0);
              const paid = Number(formData.amountPaid) || 0;
              const rem = Math.max(0, lease - paid);

              return (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Remaining Due at Move-in:</span>
                  <strong style={{ fontSize: 16, color: rem > 0 ? '#ef4444' : '#16a34a' }}>₹{rem}</strong>
                </div>
              );
            })()}

            {/* Payment Screenshot */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Receipt / Screenshot (Optional)</label>
              <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                <label style={{ padding: '10px 14px', borderRadius: 10, background: '#f1f5f9', border: '1px solid #cbd5e1', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>attach_file</span>
                  {formData.paymentScreenshot ? 'Change Photo' : 'Upload Screenshot'}
                  <input type="file" accept="image/*" onChange={handleScreenshotChange} style={{ display: 'none' }} />
                </label>
                {formData.paymentScreenshot && (
                  <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span> Attached
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────
            STEP 4 (ALREADY RESIDENT): FINANCIAL BALANCE & DUES
           ────────────────────────────────────────────────────────── */}
        {step === 4 && mode === 'already' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#0f172a' }}>Financial Balance & Dues</h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>Existing tenant payment status & past dues</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Monthly Rent (₹) *</label>
                <input
                  type="number"
                  name="rent"
                  required
                  placeholder="e.g. 8000"
                  value={formData.rent}
                  onChange={handleChange}
                  style={{ width: '100%', marginTop: 4, padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 14, fontWeight: 700, color: '#0f172a', background: '#fff', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Security Deposit (₹)</label>
                <input
                  type="number"
                  name="securityDeposit"
                  placeholder="e.g. 5000"
                  value={formData.securityDeposit}
                  onChange={handleChange}
                  style={{ width: '100%', marginTop: 4, padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 14, fontWeight: 700, color: '#0f172a', background: '#fff', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Paid Till Month</label>
                <input
                  type="month"
                  name="paidTillMonth"
                  value={formData.paidTillMonth}
                  onChange={handleChange}
                  style={{ width: '100%', marginTop: 4, padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700, color: '#0f172a', background: '#fff', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Past Remaining Due (₹)</label>
                <input
                  type="number"
                  name="remainingAmount"
                  placeholder="0"
                  value={formData.remainingAmount}
                  onChange={handleChange}
                  style={{ width: '100%', marginTop: 4, padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 14, fontWeight: 700, color: '#0f172a', background: '#fff', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: 14 }}>
              <p style={{ margin: 0, fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
                💡 <strong>Already Resident:</strong> Tenant will be saved with status <strong>Approved</strong>. Their move-in date and past balance will carry forward directly into accounts & billing.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── BOTTOM ACTIONS (STICKY) ── */}
      <div style={{ background: '#ffffff', borderTop: '1px solid #e2e8f0', padding: '14px 16px', position: 'sticky', bottom: 0, zIndex: 30, display: 'flex', gap: 12 }}>
        {step > 1 && (
          <button
            type="button"
            onClick={handlePrev}
            style={{
              padding: '14px 18px',
              borderRadius: 14,
              border: '1.5px solid #e2e8f0',
              background: '#ffffff',
              color: '#0f172a',
              fontSize: 14,
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            Back
          </button>
        )}

        <button
          type="button"
          disabled={submitting}
          onClick={handleNext}
          style={{
            flex: 1,
            padding: '14px',
            borderRadius: 14,
            border: 'none',
            background: '#0891b2',
            color: '#ffffff',
            fontSize: 14,
            fontWeight: 800,
            cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.7 : 1,
            boxShadow: '0 4px 12px rgba(8,145,178,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6
          }}
        >
          {submitting ? (
            <>
              <div style={{ width: 18, height: 18, border: '2px solid #fff', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              Saving Student...
            </>
          ) : step === totalSteps ? (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>person_add</span>
              Complete Enrollment
            </>
          ) : (
            <>
              Next Step
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_forward</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
