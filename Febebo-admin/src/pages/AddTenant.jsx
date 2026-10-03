import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { collection, query, where, getDocs, doc, setDoc, addDoc } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { db, firebaseConfig, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../context/AuthContext';

export default function AddTenant() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const serviceType = searchParams.get('serviceType') || 'all_services'; // 'only_room' | 'all_services'
  const { user, activePgId } = useAuth();
  
  const [step, setStep] = useState(1);
  const totalSteps = 4;
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Firestore Rooms and Tenants
  const [rooms, setRooms] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  
  // Meter for selected room — used to validate minimum meter reading
  const [roomMeter, setRoomMeter] = useState(null); // { lastReading } or null
  const [fetchingMeter, setFetchingMeter] = useState(false);

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

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    selectedRoomId: '',
    selectedBed: '',
    leaseType: 'bed_sharing', // 'bed_sharing' | 'entire_room'
    foodIncluded: true,
    includedFoodPersons: 1,
    coResidents: [],
    dateOfJoining: new Date().toISOString().split('T')[0],
    rent: '',
    securityDeposit: '',
    paymentMode: 'Token Only',
    amountPaid: '',
    paymentMethod: 'Cash',
    paymentScreenshot: null
  });

  const [newCoResident, setNewCoResident] = useState({ name: '', phone: '', relation: 'Roommate', aadhar: '' });
  const [showAddCoResident, setShowAddCoResident] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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

  const handleNext = async () => {
    if (step === 1) {
      if (!formData.name || formData.phone.length !== 10) return alert("Please enter name and valid 10-digit phone.");
      if (!formData.email || !formData.password) return alert("Please enter both email and password.");
      if (formData.password.length < 6) return alert("Password must be at least 6 characters.");
      
      try {
        const q = query(collection(db, 'users'), where('phone', '==', formData.phone));
        const snap = await getDocs(q);
        if (!snap.empty) {
          return alert("This phone number is already registered to another user.");
        }
      } catch (err) {
        console.error("Error checking phone", err);
      }
    }
    if (step === 2) {
      if (!formData.selectedRoomId) return alert("Please select a room.");
      if (!formData.selectedBed) return alert("Please select a bed.");
      // Validate meter reading
      if (formData.meterReading === '' || formData.meterReading === undefined) {
        return alert("Please enter the room's current meter reading at the time of joining.");
      }
      if (roomMeter !== null && Number(formData.meterReading) < roomMeter.lastReading) {
        return alert(`Meter reading cannot be less than the room's last recorded reading (${roomMeter.lastReading} kWh). Please enter ≥ ${roomMeter.lastReading}.`);
      }
    }
    if (step === 3) {
      if (formData.rent === '' || formData.securityDeposit === '') return alert("Please enter both Rent and Security Deposit amounts.");
    }
    
    if (step < totalSteps) setStep(step + 1);
    else handleSubmit();
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!formData.amountPaid) return alert("Please enter the amount paid.");
    if (formData.paymentMethod === 'Online' && !formData.paymentScreenshot) return alert("Please upload a payment screenshot.");
    
    setLoading(true);
    let secondaryApp;
    
    try {
      const selectedRoom = rooms.find(r => r.id === formData.selectedRoomId);
      const customRent = Number(formData.rent) || 0;
      const customSecurity = Number(formData.securityDeposit) || 0;
      const leaseAmount = customRent + customSecurity;
      const amountPaid = Number(formData.amountPaid);
      const isFullPayment = formData.paymentMode === 'Full Payment';
      const remainingAmount = isFullPayment ? 0 : (leaseAmount - amountPaid);
      const isSinglePayerFlat = formData.leaseType === 'entire_room';
      const foodPersonsCount = formData.foodIncluded ? (Number(formData.includedFoodPersons) || (formData.coResidents.length + 1) || 1) : 0;

      // 1. Create a secondary Firebase App to create the user without logging out the Admin
      secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
      const secondaryAuth = getAuth(secondaryApp);
      
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password);
      const newStudentUid = userCredential.user.uid;
      
      // Upload screenshot if Online payment
      let screenshotUrl = null;
      if (formData.paymentMethod === 'Online' && formData.paymentScreenshot) {
        try {
          // Compress the image to Base64 (Matching the rest of the app's architecture)
          screenshotUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(formData.paymentScreenshot);
            reader.onload = (event) => {
              const img = new Image();
              img.src = event.target.result;
              img.onload = () => {
                try {
                  const canvas = document.createElement('canvas');
                  const MAX_SIZE = 800;
                  let width = img.width;
                  let height = img.height;
                  if (width > height && width > MAX_SIZE) {
                    height *= MAX_SIZE / width;
                    width = MAX_SIZE;
                  } else if (height > MAX_SIZE) {
                    width *= MAX_SIZE / height;
                    height = MAX_SIZE;
                  }
                  canvas.width = width;
                  canvas.height = height;
                  const ctx = canvas.getContext('2d');
                  ctx.drawImage(img, 0, 0, width, height);
                  
                  // Convert to base64 string like StudentDetailsModal
                  resolve(canvas.toDataURL('image/jpeg', 0.6));
                } catch (e) {
                  reject(e);
                }
              };
              img.onerror = () => reject(new Error("Image load failed"));
            };
            reader.onerror = () => reject(new Error("File read failed"));
          });
        } catch (uploadErr) {
          console.error("Screenshot compression failed:", uploadErr);
          // Don't fail the whole process just because the screenshot failed
          alert("Screenshot processing failed, but saving tenant...");
        }
      }

      const chosenBed = formData.selectedBed || '1';

      // 2. Create the user document immediately!
      const userDocRef = doc(db, 'users', newStudentUid);
      await setDoc(userDocRef, {
        role: 'customer',
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        profileCompleted: true, // Bypass OnboardingWizard completely
        detailsFilled: false,
        hasPG: true,
        pgStatus: 'Upcoming User',
        registeredVia: 'add_tenant',
        isAddTenant: true,
        serviceType: serviceType, // 'only_room' | 'all_services'
        roomNo: selectedRoom.roomNo,
        bedNo: chosenBed,
        isPrimaryPayer: isSinglePayerFlat,
        leaseType: formData.leaseType,
        foodIncluded: formData.foodIncluded,
        includedFoodPersons: foodPersonsCount,
        coResidents: formData.coResidents || [],
        createdAt: new Date().toISOString(),
        subscribedPG: {
          adminId: user.uid,
          pgId: activePgId === 'primary' ? user.uid : activePgId,
          pgName: user.name || 'PG',
          roomNo: selectedRoom.roomNo,
          bedNo: chosenBed,
          seaterLabel: selectedRoom.seaterLabel || `${selectedRoom.beds} Seater`,
          roomType: selectedRoom.roomType || 'Standard',
          isPrimaryPayer: isSinglePayerFlat,
          leaseType: formData.leaseType,
          foodIncluded: formData.foodIncluded,
          includedFoodPersons: foodPersonsCount,
          coResidents: formData.coResidents || [],
          rent: customRent,
          securityAmount: customSecurity,
          leaseAmount: leaseAmount,
          tokenPaid: amountPaid,
          remainingAmount: remainingAmount,
          paymentVerificationPending: remainingAmount > 0, // true whenever student still owes money
          paymentMethod: formData.paymentMethod,
          paymentScreenshot: screenshotUrl,
          status: 'Upcoming User',
          isAddTenant: true, // flag for student app to enforce payment + details flow
          dateOfJoining: new Date(formData.dateOfJoining).toISOString(),
          meterReadingAtJoin: Number(formData.meterReading) || 0,
          meterReading: Number(formData.meterReading) || 0
        }
      });

      // 3. Create the tenant reference for the admin
      const tenantData = {
        adminId: user.uid, pgId: activePgId, 
        tenantId: newStudentUid,
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        roomNo: selectedRoom.roomNo,
        bedNo: chosenBed,
        isPrimaryPayer: isSinglePayerFlat,
        leaseType: formData.leaseType,
        foodIncluded: formData.foodIncluded,
        includedFoodPersons: foodPersonsCount,
        coResidents: formData.coResidents || [],
        rentAmount: leaseAmount,
        rent: customRent,
        securityAmount: customSecurity,
        tokenPaid: amountPaid,
        remainingAmount: remainingAmount,
        dateOfJoining: new Date(formData.dateOfJoining).toISOString(),
        meterReadingAtJoin: Number(formData.meterReading) || 0,
        meterReading: Number(formData.meterReading) || 0,
        registeredVia: 'add_tenant',
        isAddTenant: true,
        serviceType: serviceType, // 'only_room' | 'all_services'
        status: 'Upcoming User'
      };
      await setDoc(doc(db, 'tenants', newStudentUid), tenantData, { merge: true });

      // 4. Create the payment record so it shows in Student App Account
      if (amountPaid > 0) {
        const paymentObj = {
          amount: amountPaid,
          date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
          rentMonth: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
          name: formData.paymentMode === 'Token Only' ? 'Token Payment' : 'First Month Payment',
          paymentMode: formData.paymentMethod,
          paymentType: formData.paymentMode === 'Token Only' ? 'token' : 'first_month',
          pgName: user.name || 'PG',
          receivedBy: 'Admin (Manual Entry)',
          rent: customRent,
          security: Number(formData.securityDeposit) || 0,
          totalAmount: leaseAmount,
          remainingAmount: remainingAmount,
          seaterLabel: selectedRoom.seaterLabel || `${selectedRoom.beds} Seater`,
          status: 'Verified',
          type: 'Debit',
          createdAt: new Date().toISOString(),
          roomNo: selectedRoom.roomNo,
          bedNo: chosenBed
        };
        
        if (screenshotUrl) {
          paymentObj.screenshot = screenshotUrl;
        }

        await addDoc(collection(db, 'users', newStudentUid, 'payments'), paymentObj);
        
        // Add to rent_receipts so admin sees it in Total Rents module
        await addDoc(collection(db, 'rent_receipts'), {
          ...paymentObj,
          adminId: user.uid, pgId: activePgId, 
          tenantId: newStudentUid,
          tenantName: formData.name,
          roomNo: selectedRoom.roomNo,
          bedNo: chosenBed
        });
      }

      setIsSuccess(true);
    } catch (err) {
      console.error("Error saving tenant", err);
      if (err.code === 'auth/email-already-in-use') {
        alert("This email is already registered in the system. Try another email.");
      } else {
        alert("Error saving tenant: " + err.message);
      }
    } finally {
      setLoading(false); // Do this FIRST so the button always recovers
      if (secondaryApp) {
        deleteApp(secondaryApp).catch(e => console.error("Error deleting secondary app", e));
      }
    }
  };

  if (isSuccess) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="material-symbols-outlined" style={{ color: '#fff', cursor: 'pointer' }} onClick={() => navigate(-1)}>arrow_back</span>
            <h1 style={{ margin: 0, fontSize: '20px', color: '#fff', fontFamily: "'Bricolage Grotesque', sans-serif" }}>Add Tenant</h1>
          </div>
        </div>
        <div style={{ padding: '40px 20px', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ width: '100px', height: '100px', borderRadius: '50px', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '50px', color: '#16a34a' }}>check_circle</span>
          </div>
          <h2 style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', marginBottom: '12px' }}>Student Added!</h2>
          <p style={{ fontSize: '16px', color: '#64748b', lineHeight: '1.6', marginBottom: '32px' }}>
            Tell {formData.name} to download the Febebo app and <b>login</b> (not sign up) using the Email and Password you just provided. 
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

  const renderStep = () => {
    switch(step) {
      case 1:
        return (
          <div style={styles.stepContainer}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Full Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Rahul Kumar" style={styles.input} />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Phone Number</label>
              <div style={{ display: 'flex' }}>
                <div style={styles.prefix}>+91</div>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="9876543210" style={{ ...styles.input, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderLeft: 'none' }} maxLength={10} />
              </div>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Email Address</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="rahul@example.com" style={styles.input} />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Password</label>
              <input type="text" name="password" value={formData.password} onChange={handleChange} placeholder="e.g. rahul@123" style={styles.input} />
              <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#64748b' }}>Create a password and tell the student to login with this.</p>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Date of Joining</label>
              <input type="date" name="dateOfJoining" value={formData.dateOfJoining} onChange={handleChange} style={styles.input} />
            </div>
          </div>
        );
      case 2:
        return (
          <div style={styles.stepContainer}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginBottom: '16px' }}>Available Rooms</h3>
            {loadingRooms ? <p>Loading rooms...</p> : rooms.length === 0 ? <p>No rooms found. Add rooms in Manage Rooms.</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {rooms.filter(room => {
                  const roomTenantsCount = tenants.filter(t => t.roomNo === room.roomNo).length;
                  const vacantSeats = Math.max(0, (Number(room.beds) || 1) - roomTenantsCount);
                  return vacantSeats > 0;
                }).map(room => {
                  const roomTenants = tenants.filter(t => t.roomNo === room.roomNo);
                  const occupiedBeds = roomTenants.map(t => String(t.bedNo).toUpperCase());
                  const allBeds = Array.from({ length: Number(room.beds) || 1 }, (_, i) => String.fromCharCode(65 + i));
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
                  const vacantSeats = vacantBeds.length;
                  const isSelected = formData.selectedRoomId === room.id;

                  return (
                    <div 
                      key={room.id}
                      onClick={() => {
                        const defaultBed = vacantBeds[0] || 'A';
                        setFormData(prev => ({ 
                          ...prev, 
                          selectedRoomId: room.id,
                          selectedBed: prev.selectedRoomId === room.id ? (prev.selectedBed || defaultBed) : defaultBed,
                          rent: String(room.price || 0),
                          securityDeposit: String((room.price || 0) * 2)
                        }));
                      }}
                      style={{
                        ...styles.roomCard,
                        borderColor: isSelected ? '#0891b2' : '#e2e8f0',
                        backgroundColor: isSelected ? '#ecfeff' : '#fff',
                        cursor: 'pointer',
                        opacity: 1
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>Room {room.roomNo}</span>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#0891b2' }}>₹{room.price}/mo</span>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', padding: '4px 8px', backgroundColor: '#f1f5f9', borderRadius: '6px', color: '#475569', fontWeight: '600' }}>{room.seaterLabel || `${room.beds} Seater`}</span>
                        <span style={{ fontSize: '12px', padding: '4px 8px', backgroundColor: '#f8fafc', borderRadius: '6px', color: '#64748b', fontWeight: '600', border: '1px solid #e2e8f0' }}>{room.roomType || 'Standard'}</span>
                      </div>
                      
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check_circle</span>
                        {`${vacantSeats} Seat${vacantSeats > 1 ? 's' : ''} Vacant`}
                      </div>

                      {isSelected && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed #cbd5e1' }} onClick={e => e.stopPropagation()}>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                            Select Bed <span style={{ color: '#ef4444' }}>*</span>:
                          </label>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {(vacantBeds.length > 0 ? vacantBeds : ['A']).map(b => (
                              <button
                                key={b}
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, selectedBed: b }))}
                                style={{
                                  padding: '6px 14px',
                                  borderRadius: 8,
                                  border: formData.selectedBed === b ? '2px solid #0891b2' : '1px solid #cbd5e1',
                                  background: formData.selectedBed === b ? '#0891b2' : '#ffffff',
                                  color: formData.selectedBed === b ? '#ffffff' : '#334155',
                                  fontWeight: 700,
                                  fontSize: 12,
                                  cursor: 'pointer'
                                }}
                              >
                                Bed {b}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {formData.selectedRoomId && (
              <div style={{ ...styles.inputGroup, marginTop: '20px' }}>
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
                  value={formData.meterReading || ''}
                  min={roomMeter ? roomMeter.lastReading : 0}
                  onChange={e => {
                    const val = e.target.value;
                    if (roomMeter && Number(val) < roomMeter.lastReading && val !== '') {
                      // allow typing but will validate on next
                    }
                    handleChange(e);
                  }}
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
            )}
          </div>
        );
      case 3:
        const selectedRoom = rooms.find(r => r.id === formData.selectedRoomId);
        return (
          <div style={styles.stepContainer}>
            <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#b45309', fontWeight: '600' }}>
                You selected <b>Room {selectedRoom?.roomNo} (Bed {formData.selectedBed})</b>. Standard rent is <b>₹{selectedRoom?.price}/mo</b>. You can customize the occupancy model, food plan, rent, and security deposit below.
              </p>
            </div>

            {/* Occupancy / Lease Model */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>Lease Type / Occupancy Model</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, leaseType: 'bed_sharing' }))}
                  style={{
                    padding: '12px',
                    borderRadius: 12,
                    border: `1.5px solid ${formData.leaseType === 'bed_sharing' ? '#0891b2' : '#e2e8f0'}`,
                    background: formData.leaseType === 'bed_sharing' ? '#ecfeff' : 'white',
                    color: formData.leaseType === 'bed_sharing' ? '#0e7490' : '#475569',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>bed</span>
                  <span>Individual Bed</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, leaseType: 'entire_room' }))}
                  style={{
                    padding: '12px',
                    borderRadius: 12,
                    border: `1.5px solid ${formData.leaseType === 'entire_room' ? '#7c3aed' : '#e2e8f0'}`,
                    background: formData.leaseType === 'entire_room' ? '#f5f3ff' : 'white',
                    color: formData.leaseType === 'entire_room' ? '#6d28d9' : '#475569',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>home_work</span>
                  <span>Entire Flat (Single Payer)</span>
                </button>
              </div>
              {formData.leaseType === 'entire_room' && (
                <p style={{ margin: '6px 0 0', fontSize: '11.5px', color: '#7c3aed', fontWeight: 600 }}>
                  👑 {formData.name || 'Primary Resident'} will be the single billing payer for all room occupants.
                </p>
              )}
            </div>

            {/* Food Facility Inclusion */}
            <div style={{ ...styles.inputGroup, background: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Mess / Food Facility</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b' }}>Include meal service for this tenant</p>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.foodIncluded}
                    onChange={e => setFormData(p => ({ ...p, foodIncluded: e.target.checked }))}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{ position: 'absolute', inset: 0, background: formData.foodIncluded ? '#059669' : '#cbd5e1', borderRadius: 24, transition: '0.2s' }}>
                    <span style={{ position: 'absolute', height: 18, width: 18, left: formData.foodIncluded ? 22 : 3, bottom: 3, background: 'white', borderRadius: '50%', transition: '0.2s' }} />
                  </span>
                </label>
              </div>

              {formData.foodIncluded && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Number of Eaters Included</label>
                  <input
                    type="number"
                    min="1"
                    name="includedFoodPersons"
                    value={formData.includedFoodPersons}
                    onChange={handleChange}
                    style={{ ...styles.input, padding: '8px 12px' }}
                  />
                </div>
              )}
            </div>

            {/* Co-Residents / Roommates Entry (For Entire Flat) */}
            {formData.leaseType === 'entire_room' && (
              <div style={{ marginBottom: 20, background: '#faf5ff', border: '1.5px dashed #c084fc', borderRadius: 14, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#6d28d9', textTransform: 'uppercase' }}>
                      👥 Co-Residents / Roommates ({formData.coResidents.length})
                    </h4>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: '#7e22ce' }}>Non-paying co-occupants sharing this room</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddCoResident(true)}
                    style={{ background: '#7c3aed', color: 'white', border: 'none', borderRadius: 8, padding: '6px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>
                    Add
                  </button>
                </div>

                {formData.coResidents.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
                    {formData.coResidents.map((cr, idx) => (
                      <div key={idx} style={{ background: 'white', border: '1px solid #e9d5ff', borderRadius: 10, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{cr.name}</p>
                          <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>{cr.relation || 'Roommate'}{cr.phone ? ` · ${cr.phone}` : ''}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormData(p => ({ ...p, coResidents: p.coResidents.filter((_, i) => i !== idx) }))}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex' }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {showAddCoResident && (
                  <div style={{ background: 'white', border: '1px solid #c084fc', borderRadius: 12, padding: 12, marginTop: 8 }}>
                    <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#6d28d9' }}>Add New Roommate</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <input
                        type="text"
                        placeholder="Roommate Full Name *"
                        value={newCoResident.name}
                        onChange={e => setNewCoResident(p => ({ ...p, name: e.target.value }))}
                        style={{ ...styles.input, padding: '8px 12px', fontSize: 13 }}
                      />
                      <input
                        type="tel"
                        placeholder="Mobile Number (Optional)"
                        value={newCoResident.phone}
                        onChange={e => setNewCoResident(p => ({ ...p, phone: e.target.value }))}
                        style={{ ...styles.input, padding: '8px 12px', fontSize: 13 }}
                      />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          type="text"
                          placeholder="Relation (e.g. Roommate, Friend)"
                          value={newCoResident.relation}
                          onChange={e => setNewCoResident(p => ({ ...p, relation: e.target.value }))}
                          style={{ ...styles.input, padding: '8px 12px', fontSize: 13, flex: 1 }}
                        />
                        <input
                          type="text"
                          placeholder="Aadhaar / ID No"
                          value={newCoResident.aadhar}
                          onChange={e => setNewCoResident(p => ({ ...p, aadhar: e.target.value }))}
                          style={{ ...styles.input, padding: '8px 12px', fontSize: 13, flex: 1 }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <button
                          type="button"
                          onClick={() => setShowAddCoResident(false)}
                          style={{ flex: 1, padding: '8px', background: '#f1f5f9', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!newCoResident.name.trim()) return alert('Please enter roommate name');
                            setFormData(p => ({ ...p, coResidents: [...p.coResidents, { ...newCoResident }] }));
                            setNewCoResident({ name: '', phone: '', relation: 'Roommate', aadhar: '' });
                            setShowAddCoResident(false);
                          }}
                          style={{ flex: 1, padding: '8px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                        >
                          Add Roommate
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div style={styles.inputGroup}>
              <label style={styles.label}>Monthly Rent (₹)</label>
              <input type="number" name="rent" value={formData.rent} onChange={handleChange} placeholder="e.g. 8000" style={styles.input} />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Security Deposit Demand (₹)</label>
              <input type="number" name="securityDeposit" value={formData.securityDeposit} onChange={handleChange} placeholder="e.g. 16000" style={styles.input} />
              <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#64748b' }}>Enter the total security amount you require.</p>
            </div>
          </div>
        );
      case 4:
        const rent = Number(formData.rent) || 0;
        const security = Number(formData.securityDeposit) || 0;
        const totalLease = rent + security;
        const paidNow = Number(formData.amountPaid) || 0;
        
        return (
          <div style={styles.stepContainer}>
            <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '14px', color: '#64748b', marginBottom: '12px', marginTop: 0 }}>Payment Summary</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#0f172a', fontSize: '14px' }}>Customized Rent</span>
                <span style={{ fontWeight: '600', color: '#0f172a' }}>₹{rent}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ color: '#0f172a', fontSize: '14px' }}>Security Deposit</span>
                <span style={{ fontWeight: '600', color: '#0f172a' }}>₹{security}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px dashed #cbd5e1' }}>
                <span style={{ color: '#0f172a', fontSize: '15px', fontWeight: '700' }}>Total Demand (Rent + Security)</span>
                <span style={{ fontWeight: '800', color: '#0891b2', fontSize: '16px' }}>₹{totalLease}</span>
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Payment Scenario</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                {['Token Only', 'Full Payment'].map(mode => (
                  <button
                    key={mode}
                    onClick={() => setFormData(prev => ({ ...prev, paymentMode: mode, amountPaid: mode === 'Full Payment' ? String(totalLease) : prev.amountPaid }))}
                    style={{
                      flex: 1, padding: '12px', borderRadius: '10px',
                      backgroundColor: formData.paymentMode === mode ? '#0f172a' : '#fff',
                      color: formData.paymentMode === mode ? '#fff' : '#64748b',
                      border: `1px solid ${formData.paymentMode === mode ? '#0f172a' : '#cbd5e1'}`,
                      fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Amount Paid Now (₹)</label>
              <input type="number" name="amountPaid" value={formData.amountPaid} onChange={handleChange} placeholder="e.g. 5000" style={{ ...styles.input, ...(formData.paymentMode === 'Full Payment' ? { backgroundColor: '#f1f5f9', cursor: 'not-allowed', color: '#94a3b8' } : {}) }} disabled={formData.paymentMode === 'Full Payment'} />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Payment Method</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                {['Cash', 'Online'].map(mode => (
                  <button
                    key={mode}
                    onClick={() => setFormData(prev => ({ ...prev, paymentMethod: mode }))}
                    style={{
                      flex: 1, padding: '12px', borderRadius: '10px',
                      backgroundColor: formData.paymentMethod === mode ? '#0f172a' : '#fff',
                      color: formData.paymentMethod === mode ? '#fff' : '#64748b',
                      border: `1px solid ${formData.paymentMethod === mode ? '#0f172a' : '#cbd5e1'}`,
                      fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {formData.paymentMethod === 'Online' && (
              <div style={styles.inputGroup}>
                <label style={styles.label}>Upload Payment Screenshot *</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentScreenshot: e.target.files[0] }))} 
                  style={{ ...styles.input, padding: '10px', backgroundColor: '#f8fafc' }} 
                />
              </div>
            )}
            
            {formData.paymentMode === 'Token Only' && formData.amountPaid && (
              <div style={{ padding: '16px', backgroundColor: '#fffbeb', color: '#b45309', borderRadius: '12px', fontSize: '14px', border: '1px solid #fde68a', marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '700' }}>Remaining Balance</span>
                  <span style={{ fontSize: '18px', fontWeight: '800' }}>₹{Math.max(0, totalLease - paidNow)}</span>
                </div>
                <span style={{ fontSize: '13px' }}>The student will be prompted to pay this amount on their app dashboard.</span>
              </div>
            )}
            {formData.paymentMode === 'Full Payment' && (
              <div style={{ padding: '12px', backgroundColor: '#ecfdf5', color: '#047857', borderRadius: '12px', fontSize: '13px', fontWeight: '600', border: '1px solid #a7f3d0', marginTop: 12 }}>
                ✓ Paid in full! Student dashboard will unlock access immediately after they fill their KYC details.
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const stepTitles = ['Personal Details', 'Room Selection', 'Financial Settings', 'Payment Scenario'];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <span className="material-symbols-outlined" style={{ color: '#fff', cursor: 'pointer' }} onClick={() => navigate(-1)}>arrow_back</span>
          <h1 style={{ margin: 0, fontSize: '20px', color: '#fff', fontFamily: "'Bricolage Grotesque', sans-serif" }}>Direct Entry</h1>
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
      <div style={styles.bottomBar}>
        <button style={{ ...styles.secondaryBtn, visibility: step === 1 ? 'hidden' : 'visible' }} onClick={handleBack}>Back</button>
        <button style={styles.primaryBtn} onClick={handleNext} disabled={loading}>
          {loading ? 'Saving...' : step === totalSteps ? 'Confirm Entry' : 'Next'}
        </button>
      </div>
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
  prefix: { backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRight: 'none', padding: '12px 16px', borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px', color: '#475569', fontSize: '15px', display: 'flex', alignItems: 'center' },
  roomCard: { backgroundColor: '#fff', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
  bottomBar: { padding: '16px 20px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))', backgroundColor: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', gap: '12px', position: 'sticky', bottom: 0, zIndex: 10 },
  primaryBtn: { flex: 2, backgroundColor: '#0891b2', color: '#fff', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '16px', fontWeight: '600', fontFamily: "'Hanken Grotesk', sans-serif", cursor: 'pointer', transition: 'background-color 0.2s' },
  secondaryBtn: { flex: 1, backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '16px', fontWeight: '600', fontFamily: "'Hanken Grotesk', sans-serif", cursor: 'pointer' }
};
