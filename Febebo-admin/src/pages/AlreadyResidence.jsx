import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, storage, firebaseConfig } from '../firebase';
import { collection, query, where, getDocs, getDoc, setDoc, doc, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
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
const INVENTORY_ICON_MAP = {
  bed: 'bed', mattress: 'bed', table: 'table_restaurant',
  chair: 'chair', cupboard: 'door_sliding', ac_remote: 'air',
  keys: 'key', dustbin: 'delete'
};
const AMENITIES_DATA = [
  { id: 'ac', label: 'AC', icon: '❄️' },
  { id: 'fridge', label: 'Fridge', icon: '🧊' },
  { id: 'washing-machine', label: 'Washing Machine', icon: '🧺' },
  { id: 'study-table', label: 'Study Table', icon: '🪚' },
  { id: 'cooler', label: 'Cooler', icon: '🌬️' },
  { id: 'geyser', label: 'Geyser', icon: '♨️' },
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

export default function AlreadyResidence() {
  const { user, activePgId } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const totalSteps = 4;
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  
  // Meter for selected room — used to validate minimum meter reading
  const [roomMeter, setRoomMeter] = useState(null);
  const [fetchingMeter, setFetchingMeter] = useState(false);
  
  const currentMonthValue = new Date().toISOString().slice(0,7);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    selectedRoomId: '',
    selectedBed: '',
    amenities: [],
    amenityImages: {},
    inventory: {},
    meterReading: '',
    rent: '',
    securityDeposit: '',
    paidTillMonth: currentMonthValue,
    joiningDate: new Date().toISOString().split('T')[0],
    remainingAmount: ''
  });

  const [customAmenities, setCustomAmenities] = useState([]);
  const [customInventory, setCustomInventory] = useState([]);

  // Setup camera picker state
  const [imagePickerConfig, setImagePickerConfig] = useState(null); // { id, type }

  const handlePickedFile = async (e, id, type) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setFormData(prev => {
        if (type === 'inventory') {
          return { ...prev, inventory: { ...prev.inventory, [id]: compressed } };
        } else {
          const cur = prev.amenityImages || {};
          return { ...prev, amenityImages: { ...cur, [id]: compressed } };
        }
      });
    } catch(err) { console.error('Compression failed', err); }
    setImagePickerConfig(null);
  };

  useEffect(() => {
    const fetchRoomsAndTenants = async () => {
      if (!user) return;
      try {
        const [rSnap, tSnap] = await Promise.all([
          getDocs(query(collection(db, 'rooms'), where('adminId', '==', user.uid), where('pgId', '==', activePgId))),
          getDocs(query(collection(db, 'tenants'), where('adminId', '==', user.uid), where('pgId', '==', activePgId)))
        ]);
        
        const fetchedRooms = rSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const fetchedTenants = tSnap.docs.map(doc => doc.data());
        
        setRooms(fetchedRooms);
        setTenants(fetchedTenants);
      } catch (err) {
        console.error("Error fetching data", err);
      } finally {
        setLoadingRooms(false);
      }
    };
    fetchRoomsAndTenants();
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // When a room is selected, fetch its meter to know the minimum allowed reading
  useEffect(() => {
    const fetchRoomMeter = async () => {
      if (!formData.selectedRoomId || !user) { setRoomMeter(null); return; }
      const selectedRoom = rooms.find(r => r.id === formData.selectedRoomId);
      if (!selectedRoom) { setRoomMeter(null); return; }
      setFetchingMeter(true);
      try {
        const pgId = activePgId === 'primary' ? user.uid : activePgId;
        const meterSnap = await getDocs(query(
          collection(db, 'meters'),
          where('adminId', '==', user.uid),
          where('pgId',   '==', pgId),
          where('roomName', '==', String(selectedRoom.roomNo))
        ));
        if (!meterSnap.empty) {
          const m = meterSnap.docs[0].data();
          setRoomMeter({ lastReading: Number(m.lastReading || m.setupReading || 0) });
        } else {
          setRoomMeter(null); // no meter set up for this room yet
        }
      } catch(e) { console.error(e); setRoomMeter(null); }
      finally { setFetchingMeter(false); }
    };
    fetchRoomMeter();
  }, [formData.selectedRoomId, rooms, user]);

  const handleSubmit = async () => {
    setLoading(true);
    let secondaryApp;
    try {
      const selectedRoom = rooms.find(r => r.id === formData.selectedRoomId);

      // Fetch PG owner details for pgName and location
      let pgName = user?.name || 'PG';
      let pgLocation = null;
      try {
        if (user?.uid) {
          const pgSnap = await getDoc(doc(db, 'pg_owners', user.uid));
          if (pgSnap.exists()) {
            const pgData = pgSnap.data();
            if (pgData.pgName) pgName = pgData.pgName;
            if (pgData.location) pgLocation = pgData.location;
          }
        }
      } catch (e) {
        console.warn('Could not fetch pg_owners details:', e);
      }

      secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
      const secondaryAuth = getAuth(secondaryApp);
      
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password);
      const newUser = userCredential.user;
      
      await updateProfile(newUser, { displayName: formData.name });
      
      const joinIso = formData.joiningDate ? new Date(formData.joiningDate).toISOString() : new Date().toISOString();

      // Save to users collection as Upcoming User (requires approval & onboarding)
      await setDoc(doc(db, 'users', newUser.uid), {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: 'customer',
        pgStatus: 'Upcoming User',
        profileCompleted: false,
        detailsFilled: false,
        registeredVia: 'already_residence',
        isAlreadyResident: true,
        location: pgLocation,
        createdAt: serverTimestamp(),
        amenities: formData.amenities,
        inventory: formData.inventory,
        amenityImages: formData.amenityImages || {},
        subscribedPG: {
          id: user?.uid || 'admin_pg',
          pgId: user?.uid || 'admin_pg',
          pgName: pgName,
          roomNo: selectedRoom ? selectedRoom.roomNo : '',
          roomId: selectedRoom ? selectedRoom.id : '',
          bedNo: formData.selectedBed || '',
          rent: Number(formData.rent) || 0,
          securityAmount: Number(formData.securityDeposit) || 0,
          leaseAmount: (Number(formData.rent) || 0) + (Number(formData.securityDeposit) || 0),
          remainingAmount: Number(formData.remainingAmount) || 0,
          paymentVerificationPending: (Number(formData.remainingAmount) || 0) > 0,
          paidTillMonth: formData.paidTillMonth,
          meterReadingAtJoin: Number(formData.meterReading) || 0,
          dateOfJoining: joinIso,
          kycStatus: 'pending',
          status: 'Pending'
        }
      });

      // Write inventory_allocations so Inventory -> User Inventory page shows them
      const selectedItems = Object.keys(formData.inventory || {});
      for (let itemId of selectedItems) {
        const allItems = [...INVENTORY_ITEMS, ...customInventory];
        const found = allItems.find(i => i.id === itemId);
        if (found) {
          await addDoc(collection(db, 'inventory_allocations'), {
            tenantId: newUser.uid,
            pgId: user?.uid || 'admin_pg',
            itemName: found.label,
            icon: INVENTORY_ICON_MAP[itemId] || 'inventory_2',
            conditionImage: (formData.inventory || {})[itemId] || null,
            allocatedAt: new Date()
          });
        }
      }

      // Create tenant reference for admin
      await setDoc(doc(db, 'tenants', newUser.uid), {
        adminId: user?.uid || 'admin_pg', pgId: activePgId, 
        tenantId: newUser.uid,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        roomNo: selectedRoom ? selectedRoom.roomNo : '',
        bedNo: formData.selectedBed || '',
        meterReading: Number(formData.meterReading) || 0,
        rentAmount: Number(formData.rent) || 0,
        securityDeposit: Number(formData.securityDeposit) || 0,
        leaseAmount: (Number(formData.rent) || 0) + (Number(formData.securityDeposit) || 0),
        remainingAmount: Number(formData.remainingAmount) || 0,
        dateOfJoining: joinIso,
        registeredVia: 'already_residence',
        isAlreadyResident: true,
        status: 'Pending'
      }, { merge: true });
      
      // Update room seats (Wait, actually room beds logic computes this dynamically in AddTenant, but setting it anyway doesn't hurt, though we rely on tenants collection now)
      
      await secondaryAuth.signOut();
      setIsSuccess(true);
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="material-symbols-outlined" style={{ color: '#fff', cursor: 'pointer' }} onClick={() => navigate(-1)}>arrow_back</span>
            <h1 style={{ margin: 0, fontSize: '20px', color: '#fff', fontFamily: "'Bricolage Grotesque', sans-serif" }}>Already a Resident</h1>
          </div>
        </div>
        <div style={{ padding: '40px 20px', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ width: '100px', height: '100px', borderRadius: '50px', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '50px', color: '#16a34a' }}>check_circle</span>
          </div>
          <h2 style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', marginBottom: '12px' }}>Resident Added!</h2>
          <p style={{ fontSize: '16px', color: '#64748b', lineHeight: '1.6', marginBottom: '32px' }}>
            Tell {formData.name} to download the Febebo app and <b>login</b> (not sign up) using the Email and Password you just provided. 
            <br/><br/>
            They will be prompted to fill their KYC details immediately. No admin approval needed.
            <br/><br/>
            Email: <b>{formData.email}</b><br/>
            Password: <b>{formData.password}</b>
          </p>
          <button style={{ ...styles.primaryBtn, flex: 'none', padding: '12px 24px', fontSize: '16px', borderRadius: '8px', width: 'fit-content' }} onClick={() => navigate('/admin-dashboard')}>
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const handleNext = async () => {
    setErrorMsg('');
    if (step === 1) {
      if (!formData.name || !formData.phone || !formData.email || !formData.password) return setErrorMsg("Please fill all fields.");
      if (formData.phone.length !== 10) return setErrorMsg("Phone number must be exactly 10 digits.");
      
      try {
        const q = query(collection(db, 'users'), where('phone', '==', formData.phone));
        const snap = await getDocs(q);
        if (!snap.empty) {
          return setErrorMsg("This phone number is already registered to another user.");
        }
      } catch (err) {
        console.error("Error checking phone", err);
      }
    }
    if (step === 2) {
      if (!formData.selectedRoomId || !formData.selectedBed) return setErrorMsg("Please select a room and bed.");
      if (formData.meterReading === '') return setErrorMsg("Please enter meter reading at the time of joining.");
      if (roomMeter !== null && Number(formData.meterReading) < roomMeter.lastReading) {
        return setErrorMsg(`Meter reading cannot be less than the room's last recorded reading (${roomMeter.lastReading} kWh).`);
      }
    }
    if (step === 3) {
      if (formData.rent === '' || formData.paidTillMonth === '' || formData.securityDeposit === '') return setErrorMsg("Please enter rent, security deposit, and paid till month.");
      if (!formData.joiningDate) return setErrorMsg("Please select a joining date.");
    }
    
    if (step < totalSteps) setStep(step + 1);
    else handleSubmit();
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div style={styles.stepContainer}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Tenant Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Full Name" style={styles.input} />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Phone Number</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="10-digit number" style={styles.input} />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Email Address (for login)</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="email@example.com" style={styles.input} />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Temporary Password</label>
              <input type="text" name="password" value={formData.password} onChange={handleChange} placeholder="Min 6 characters" style={styles.input} />
            </div>
          </div>
        );
      case 2:
        const allAmenities = [...AMENITIES_DATA, ...customAmenities];
        const allInventoryItems = [...INVENTORY_ITEMS, ...customInventory];
        
        return (
          <div style={styles.stepContainer}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Assign Room</label>
              {loadingRooms ? <p>Loading rooms...</p> : rooms.length === 0 ? <p>No rooms found.</p> : (
                <select
                  name="selectedRoomId"
                  value={formData.selectedRoomId}
                  onChange={(e) => {
                    const selectedRoom = rooms.find(r => r.id === e.target.value);
                    setFormData(prev => ({
                      ...prev,
                      selectedRoomId: e.target.value,
                      selectedBed: '',
                      rent: selectedRoom ? String(selectedRoom.price || 0) : ''
                    }));
                  }}
                  style={{ ...styles.input, backgroundColor: '#fff' }}
                >
                  <option value="">Choose Room...</option>
                  {rooms.filter(room => {
                    const roomTenantsCount = tenants.filter(t => t.roomNo === room.roomNo).length;
                    const vacantSeats = Math.max(0, (Number(room.beds) || 1) - roomTenantsCount);
                    return vacantSeats > 0;
                  }).map(r => {
                    const roomTenantsCount = tenants.filter(t => t.roomNo === r.roomNo).length;
                    const vacantSeats = Math.max(0, (Number(r.beds) || 1) - roomTenantsCount);
                    return (
                      <option key={r.id} value={r.id}>
                        Room {r.roomNo} ({vacantSeats} Seats Available)
                      </option>
                    );
                  })}
                </select>
              )}
            </div>

            {formData.selectedRoomId && (() => {
              const selectedRoom = rooms.find(r => r.id === formData.selectedRoomId);
              if (!selectedRoom) return null;
              
              const roomTenants = tenants.filter(t => t.roomNo === selectedRoom.roomNo);
              const occupiedBeds = roomTenants.map(t => String(t.bedNo).toUpperCase());
              
              const allBeds = Array.from({ length: Number(selectedRoom.beds) || 1 }, (_, i) => String.fromCharCode(65 + i));
              
              const normalizedOccupied = occupiedBeds.map(b => {
                 b = b.replace(/BED\s*/g, '').trim();
                 if (b === '1') return 'A';
                 if (b === '2') return 'B';
                 if (b === '3') return 'C';
                 if (b === '4') return 'D';
                 if (b === '5') return 'E';
                 if (b === '6') return 'F';
                 return b;
              });
              
              const vacantBeds = allBeds.filter(b => !normalizedOccupied.includes(b));
              
              return (
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Assign Bed <span style={{ color: '#ef4444' }}>*</span></label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                    {(vacantBeds.length > 0 ? vacantBeds : ['A']).map(b => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, selectedBed: b }))}
                        style={{
                          padding: '8px 16px',
                          borderRadius: 8,
                          border: formData.selectedBed === b ? '2px solid #0891b2' : '1px solid #cbd5e1',
                          background: formData.selectedBed === b ? '#0891b2' : '#ffffff',
                          color: formData.selectedBed === b ? '#ffffff' : '#334155',
                          fontWeight: 700,
                          fontSize: 13,
                          cursor: 'pointer'
                        }}
                      >
                        Bed {b}
                      </button>
                    ))}
                  </div>
                  {vacantBeds.length === 0 && (
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: '#ef4444' }}>All beds are occupied in this room.</p>
                  )}
                </div>
              );
            })()}

            <div style={styles.inputGroup}>
              <label style={styles.label}>Room Meter Reading at Time of Joining (kWh)</label>
              {roomMeter !== null && (
                <p style={{ margin: '0 0 6px', fontSize: 12, color: '#0891b2', fontWeight: 600 }}>
                  ⚡ Room's last recorded reading: {roomMeter.lastReading.toLocaleString()} kWh — you must enter ≥ this value
                </p>
              )}
              {roomMeter === null && !fetchingMeter && (
                <p style={{ margin: '0 0 6px', fontSize: 12, color: '#94a3b8' }}>
                  No meter set up for this room yet. Enter today's reading on the physical meter.
                </p>
              )}
              <input 
                type="number" 
                name="meterReading" 
                value={formData.meterReading} 
                min={roomMeter ? roomMeter.lastReading : 0}
                onChange={handleChange} 
                placeholder={roomMeter ? `Minimum: ${roomMeter.lastReading} kWh` : "e.g. 1500"} 
                style={{
                  ...styles.input,
                  borderColor: (formData.meterReading && roomMeter && Number(formData.meterReading) < roomMeter.lastReading) ? '#ef4444' : undefined
                }} 
              />
              {formData.meterReading && roomMeter && Number(formData.meterReading) < roomMeter.lastReading && (
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#ef4444', fontWeight: 600 }}>
                  ⚠ Reading cannot be less than {roomMeter.lastReading} kWh (room's last recorded reading)
                </p>
              )}
            </div>

          </div>
        );
      case 3:
        return (
          <div style={styles.stepContainer}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Monthly Rent (₹)</label>
              <input type="number" name="rent" value={formData.rent} onChange={handleChange} placeholder="e.g. 5000" style={styles.input} />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Security Deposit (₹)</label>
              <input type="number" name="securityDeposit" value={formData.securityDeposit} onChange={handleChange} placeholder="e.g. 5000" style={styles.input} />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Paid Till Month</label>
              <input type="month" name="paidTillMonth" value={formData.paidTillMonth} onChange={handleChange} style={styles.input} />
              <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                They will not be asked for rent until the month after this.
              </p>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Joining Date</label>
              <input type="date" name="joiningDate" value={formData.joiningDate} onChange={handleChange} style={styles.input} />
              <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                At what date they joined the PG.
              </p>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Remaining Amount (If Any)</label>
              <input type="number" name="remainingAmount" value={formData.remainingAmount} onChange={handleChange} placeholder="e.g. 1500" style={styles.input} />
            </div>
          </div>
        );
      case 4:
        return (
          <div style={styles.stepContainer}>
            <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#0f172a' }}>Payment Summary</h3>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ color: '#475569', fontSize: '15px' }}>Monthly Rent</span>
                <span style={{ color: '#0f172a', fontWeight: '600', fontSize: '15px' }}>₹{formData.rent || 0}</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ color: '#475569', fontSize: '15px' }}>Security Deposited</span>
                <span style={{ color: '#0f172a', fontWeight: '600', fontSize: '15px' }}>₹{formData.securityDeposit || 0}</span>
              </div>
              
              <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '12px 0' }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#0f172a', fontWeight: '600', fontSize: '16px' }}>Remaining Amount</span>
                <span style={{ color: '#e11d48', fontWeight: '700', fontSize: '16px' }}>₹{formData.remainingAmount || 0}</span>
              </div>
            </div>
          </div>
        );
      default: return null;
    }
  };

  const stepTitles = ['Auth Details', 'Room & Belongings', 'Rent Status', 'Summary'];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <span className="material-symbols-outlined" style={{ color: '#fff', cursor: 'pointer' }} onClick={() => navigate(-1)}>arrow_back</span>
          <h1 style={{ margin: 0, fontSize: '20px', color: '#fff', fontFamily: "'Bricolage Grotesque', sans-serif" }}>Already a Resident</h1>
        </div>
        <div style={{ padding: '0 8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: '#cbd5e1', fontSize: '13px' }}>Step {step} of {totalSteps}</span>
            <span style={{ color: '#fff', fontSize: '13px', fontWeight: '500' }}>{stepTitles[step - 1]}</span>
          </div>
          <div style={{ height: '6px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '3px', overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: `${(step / totalSteps) * 100}%`, backgroundColor: '#22d3ee', transition: 'width 0.3s ease' }} />
          </div>
        </div>
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {renderStep()}
      </div>
      
      {errorMsg && (
        <div style={{ margin: '0 20px 16px', color: '#ef4444', background: '#fef2f2', padding: '12px 16px', borderRadius: 12, fontSize: 13, fontWeight: 700, border: '1.5px solid #fecaca', display: 'flex', alignItems: 'center', gap: 8, animation: 'slideUp 0.3s ease-out' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>error</span>
          {errorMsg}
        </div>
      )}

      <div style={styles.bottomBar}>
        <button style={{ ...styles.secondaryBtn, visibility: step === 1 ? 'hidden' : 'visible' }} onClick={() => setStep(step - 1)}>Back</button>
        <button style={styles.primaryBtn} onClick={handleNext} disabled={loading}>
          {loading ? 'Saving...' : step === totalSteps ? 'Save Resident' : 'Next'}
        </button>
      </div>

      {imagePickerConfig && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 120, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div onClick={() => setImagePickerConfig(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(2px)' }} />
          <div style={{ position: 'relative', background: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: '24px 20px 40px', animation: 'slideUp 0.3s ease-out' }}>
            <p style={{ margin: '0 0 16px', fontWeight: 800, fontSize: 16, color: '#0f172a', textAlign: 'center' }}>Upload Photo</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <label style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '18px 0', borderRadius: 14, border: '1.5px solid #e2e8f0', cursor: 'pointer', background: '#f8fafc' }}>
                <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => handlePickedFile(e, imagePickerConfig.id, imagePickerConfig.type)} />
                <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#0891b2' }}>photo_camera</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>Camera</span>
              </label>
              <label style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '18px 0', borderRadius: 14, border: '1.5px solid #e2e8f0', cursor: 'pointer', background: '#f8fafc' }}>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handlePickedFile(e, imagePickerConfig.id, imagePickerConfig.type)} />
                <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#7c3aed' }}>folder_open</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>Gallery</span>
              </label>
            </div>
            <button onClick={() => setImagePickerConfig(null)} style={{ marginTop: 14, width: '100%', padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, color: '#64748b', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { maxWidth: '480px', margin: '0 auto', backgroundColor: '#f1f5f9', minHeight: '100vh', fontFamily: "'Hanken Grotesk', sans-serif", display: 'flex', flexDirection: 'column', position: 'relative' },
  header: { background: 'linear-gradient(135deg, #0c1a2e, #0f2847)', padding: '24px 20px', borderBottomLeftRadius: '24px', borderBottomRightRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' },
  stepContainer: { padding: '24px 20px' },
  inputGroup: { marginBottom: '20px' },
  label: { display: 'block', fontSize: '14px', color: '#475569', marginBottom: '8px', fontWeight: '500' },
  input: { width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '15px', fontFamily: "'Hanken Grotesk', sans-serif", color: '#0f172a', boxSizing: 'border-box', outline: 'none' },
  roomCard: { backgroundColor: '#fff', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', cursor: 'pointer' },
  bottomBar: { padding: '16px 20px', paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))', backgroundColor: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', gap: '12px', position: 'sticky', bottom: 0, zIndex: 10 },
  primaryBtn: { flex: 2, backgroundColor: '#0891b2', color: '#fff', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', transition: 'background-color 0.2s' },
  secondaryBtn: { flex: 1, backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }
};
