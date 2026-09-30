import React, { useState, useEffect } from 'react';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  User, Users, Calendar, Home, Box, Activity,
  ChevronRight, Zap, Coins, Clock, Bed, FileCheck,
  ShieldCheck, LogOut, Check, Wallet, X, Camera, Loader2, RefreshCw, Briefcase, HeartPulse
} from 'lucide-react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import './MyProfile.css';

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
  const [vacantRoomsList, setVacantRoomsList] = useState([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [reqRoom, setReqRoom] = useState('');
  const [reqReason, setReqReason] = useState('');
  const [isSubmittingReq, setIsSubmittingReq] = useState(false);
  const [showRoomGrid, setShowRoomGrid] = useState(false);

  const [tenantData, setTenantData] = useState(null);

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


  useEffect(() => {
    if (isRoomChangeModalOpen && user?.uid) {
       const loadVacantRooms = async () => {
         setIsLoadingRooms(true);
         try {
           const aId = user?.subscribedPG?.adminId || user?.subscribedPG?.pgId || 'none';
           const pId = user?.subscribedPG?.adminId ? user.subscribedPG.pgId : 'primary';
           
           const rQ = query(collection(db, 'rooms'), where('adminId', '==', aId));
           const tQ = query(collection(db, 'tenants'), where('adminId', '==', aId));
           
           const [rSnap, tSnap] = await Promise.all([getDocs(rQ), getDocs(tQ)]);
           const rooms = rSnap.docs.map(d => d.data());
           const tenants = tSnap.docs.map(d => d.data()).filter(t => t.status === 'Approved' || t.status === 'Current User' || t.status === 'Notice' || t.status === 'On Notice Period' || t.status === 'Upcoming User');
           
           const vList = [];
           rooms.forEach(r => {
             const occ = tenants.filter(t => String(t.roomNo) === String(r.roomNo) || String(t.room) === String(r.roomNo)).length;
             const vac = (r.beds || 0) - occ;
             if (vac > 0 && String(r.roomNo) !== String(roomNumber)) {
                vList.push({ roomNo: r.roomNo, vacant: vac });
             }
           });
           setVacantRoomsList(vList);
         } catch(e) { console.error("Error loading rooms", e); }
         setIsLoadingRooms(false);
       };
       loadVacantRooms();
    }
  }, [isRoomChangeModalOpen, user, roomNumber]);

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

    return () => {
      unsubscribe();
      unsubReq();
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
    if (!user?.uid || !reqRoom || !reqReason) return;
    setIsSubmittingReq(true);
    try {
      const aId = user?.subscribedPG?.adminId || user?.subscribedPG?.pgId || 'none';
      const rawPgId = user?.subscribedPG?.pgId;
      const pId = (!rawPgId || rawPgId === aId) ? 'primary' : rawPgId;

      const newReq = {
        adminId: aId,
        pgId: pId,
        tenantId: user.uid,
        tenantName: user.name || 'Student',
        currentRoom: roomNumber !== '—' ? roomNumber : 'Unassigned',
        requestedRoom: reqRoom,
        reason: reqReason,
        status: 'Pending',
        date: new Date().toISOString()
      };
      await addDoc(collection(db, 'room_change_requests'), newReq);
      setIsRoomChangeModalOpen(false);
      setReqRoom('');
      setReqReason('');
      alert("Room change request sent successfully!");
      // Optionally reload requests locally if they were showing
    } catch (err) {
      console.error("Error submitting request", err);
      alert("Failed to submit request.");
    } finally {
      setIsSubmittingReq(true);
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
          <div style={{ margin: '0 20px 24px', padding: '12px 16px', borderRadius: '12px', background: roomChangeRequests[0].status === 'Approved' ? '#dcfce7' : roomChangeRequests[0].status === 'Rejected' ? '#fee2e2' : '#fffbeb', border: '1px solid', borderColor: roomChangeRequests[0].status === 'Approved' ? '#bbf7d0' : roomChangeRequests[0].status === 'Rejected' ? '#fecaca' : '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#475569', fontWeight: '600' }}>Room Change Request</p>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: roomChangeRequests[0].status === 'Approved' ? '#166534' : roomChangeRequests[0].status === 'Rejected' ? '#991b1b' : '#b45309' }}>
                {roomChangeRequests[0].requestedRoom}
              </p>
            </div>
            <span style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: roomChangeRequests[0].status === 'Approved' ? '#166534' : roomChangeRequests[0].status === 'Rejected' ? '#991b1b' : '#d97706', padding: '6px 12px', borderRadius: '20px', background: 'rgba(255,255,255,0.6)' }}>
              {roomChangeRequests[0].status}
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
              onClick={() => { setIsRoomChangeModalOpen(true); setShowRoomGrid(false); setReqRoom(''); setReqReason(''); }}
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
              subtitle={`${roomType !== '—' ? roomType + ' · ' : ''}Room ${roomNumber} · Bed ${bedNumber}`}
              sectionKey="room"
              openSection={openSection}
              onToggle={toggleSection}
            >
              <DetailRow label="Room Number" value={roomNumber} type="highlight" />
              <div className="pf-detail-divider" />
              <DetailRow label="Bed Number" value={bedNumber} type="highlight" />
            </Section>
          )}

          {user?.hasPG && (
            <Section
              icon={<Box size={18} />}
              title="Inventory Allotted"
              subtitle="Items in your room"
              sectionKey="inventory"
              openSection={openSection}
              onToggle={toggleSection}
            >
              <DetailRow label="Items" value={roomDetails.inventory?.join(', ') || 'None'} />
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
              <h3>Request Room Change</h3>
              <button onClick={() => !isSubmittingReq && setIsRoomChangeModalOpen(false)} className="close-btn" disabled={isSubmittingReq}><X size={20}/></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div className="price-input-wrapper">
                <span style={{ color: '#64748b' }}>Current</span>
                <input 
                  type="text" 
                  value={roomNumber !== '—' ? roomNumber : 'Unassigned'} 
                  readOnly
                  style={{ paddingLeft: '80px', background: '#f8fafc', color: '#94a3b8' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#166534', marginLeft: '4px' }}>Requested Room</span>
                
                <div 
                  onClick={() => setShowRoomGrid(!showRoomGrid)}
                  style={{ 
                    padding: '16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: 'white', 
                    cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}
                >
                  {reqRoom ? (
                    <span style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Room {reqRoom}</span>
                  ) : (
                    <span style={{ fontSize: '15px', color: '#94a3b8' }}>Tap to select a vacant room</span>
                  )}
                  <ChevronRight size={18} color="#64748b" style={{ transform: showRoomGrid ? 'rotate(90deg)' : 'rotate(0deg)', transition: '0.2s' }} />
                </div>

                {showRoomGrid && (
                  <div style={{ marginTop: '4px' }}>
                    {isLoadingRooms ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>Loading rooms...</div>
                    ) : vacantRoomsList.length === 0 ? (
                      <div style={{ padding: '16px', borderRadius: '12px', background: '#fef2f2', border: '1px dashed #fca5a5', textAlign: 'center', color: '#ef4444', fontSize: '14px', fontWeight: '600' }}>No vacant rooms available</div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', maxHeight: '200px', overflowY: 'auto', padding: '4px' }}>
                        {vacantRoomsList.map(r => (
                           <div 
                             key={r.roomNo} 
                             onClick={() => { setReqRoom(r.roomNo); setShowRoomGrid(false); }}
                             style={{ 
                               padding: '12px', borderRadius: '12px', cursor: 'pointer',
                               border: reqRoom === r.roomNo ? '2px solid #16a34a' : '1.5px solid #e2e8f0',
                               background: reqRoom === r.roomNo ? '#dcfce7' : '#f8fafc',
                               display: 'flex', flexDirection: 'column', gap: '4px'
                             }}
                           >
                             <span style={{ fontSize: '14px', fontWeight: '800', color: reqRoom === r.roomNo ? '#166534' : '#0f172a' }}>Room {r.roomNo}</span>
                             <span style={{ fontSize: '12px', fontWeight: '600', color: reqRoom === r.roomNo ? '#15803d' : '#64748b' }}>{r.vacant} Bed{r.vacant > 1 ? 's' : ''} left</span>
                           </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#166534', marginLeft: '4px' }}>Reason</span>
                <textarea 
                  value={reqReason} 
                  onChange={e => setReqReason(e.target.value)} 
                  placeholder="Why do you want to change?"
                  style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', minHeight: '100px', fontFamily: 'inherit', fontSize: '14px', outline: 'none' }}
                />
              </div>
            </div>

            <button className="apply-filter-btn" onClick={submitRoomChangeRequest} disabled={isSubmittingReq || !reqRoom || !reqReason} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
              {isSubmittingReq ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Submitting...
                </>
              ) : 'Submit Request'}
            </button>
          </div>
        </>
      )}

      <BottomNav activeNav="profile" />
    </div>
  );
};

export default MyProfile;
