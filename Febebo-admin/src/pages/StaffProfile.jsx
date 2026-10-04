import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { db, storage } from '../firebase';
import { collection, query, where, getDocs, setDoc, doc, updateDoc, deleteDoc, onSnapshot, addDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

// ─── Header ─────────────────────────────────────────────────────────
function Header({ onBack }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', background: '#0891b2', position: 'sticky', top: 0, zIndex: 50 , paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))'}}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', color: 'white', position: 'relative', zIndex: 10 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 24, fontWeight: 300 }}>arrow_back_ios_new</span>
      </button>
      <h1 style={{ flex: 1, textAlign: 'center', margin: '0 0 0 -24px', fontSize: 18, fontWeight: 700, color: 'white' }}>Staff Details</h1>
      <div style={{ position: 'relative', zIndex: 10, background: 'white', color: '#0891b2', padding: '4px 10px', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700, fontSize: 13 }}>
        4.3 <span className="material-symbols-outlined" style={{ fontSize: 14 }}>star</span>
      </div>
    </div>
  );
}

// ─── Accordion ───────────────────────────────────────────────────────
function Accordion({ icon, title, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, marginBottom: 12, overflow: 'hidden' }}>
      <div onClick={() => setIsOpen(!isOpen)} style={{ display: 'flex', alignItems: 'center', padding: '16px', cursor: 'pointer', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: '50%', background: '#ecfeff', color: '#0891b2' }}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <p style={{ flex: 1, margin: 0, fontWeight: 600, fontSize: 15, color: '#0f172a' }}>{title}</p>
        <span className="material-symbols-outlined" style={{ color: '#0891b2', transition: 'transform 0.3s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          arrow_drop_down
        </span>
      </div>
      {isOpen && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px dashed #e2e8f0', paddingTop: 16 }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Info Row ────────────────────────────────────────────────────────
function InfoRow({ label, value }) {
  const isFilled = value !== undefined && value !== null && String(value).trim() !== '' && String(value).trim() !== 'N/A' && String(value).trim() !== '-' && String(value).trim() !== 'Not provided';
  const displayVal = isFilled ? value : 'Not filled';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '120px 10px 1fr', marginBottom: 12, fontSize: 14, alignItems: 'center' }}>
      <span style={{ color: '#475569' }}>{label}</span>
      <span style={{ color: '#94a3b8' }}>:</span>
      <span style={{
        color: isFilled ? '#0891b2' : '#f59e0b',
        fontWeight: isFilled ? 500 : 700,
        background: isFilled ? 'transparent' : '#fffbeb',
        padding: isFilled ? '0' : '2px 8px',
        borderRadius: isFilled ? '0' : '6px',
        display: 'inline-block',
        width: 'fit-content'
      }}>
        {displayVal}
      </span>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────
export default function StaffProfile() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('home');
  const [profileTab, setProfileTab] = useState('details');
  const [showAddTenantMenu, setShowAddTenantMenu] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadAmount, setUploadAmount] = useState('');
  const [uploadMonth, setUploadMonth] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const initialStaff = location.state?.staff || {};
  const [staff, setStaff] = useState(initialStaff);
  const [policeVerLoading, setPoliceVerLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Real-time listener — keep staff data in sync with Firestore
  useEffect(() => {
    const staffDocId = initialStaff.id;
    if (!staffDocId) return;
    const unsub = onSnapshot(doc(db, 'staff_tokens', staffDocId), (snap) => {
      if (snap.exists()) {
        setStaff({ id: snap.id, ...snap.data() });
      }
    });
    return () => unsub();
  }, [initialStaff.id]);

  // Toggle police verification
  const handleTogglePoliceVerification = async () => {
    const staffDocId = staff.id;
    if (!staffDocId) return;
    setPoliceVerLoading(true);
    try {
      const current = staff.policeVerification || 'unverified';
      const next = current === 'verified' ? 'unverified' : 'verified';
      await updateDoc(doc(db, 'staff_tokens', staffDocId), { policeVerification: next });
    } catch (e) { console.error(e); }
    setPoliceVerLoading(false);
  };

  // Delete staff
  const handleDeleteStaff = async () => {
    const staffDocId = staff.id;
    if (!staffDocId) return;
    try {
      await deleteDoc(doc(db, 'staff_tokens', staffDocId));
      navigate(-1);
    } catch (e) { console.error('Delete error:', e); }
  };

  // Download document
  const handleDownloadDoc = async (url, name) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) { console.error('Download error:', e); }
  };

  // Share document
  const handleShareDoc = async (url, title) => {
    if (navigator.share) {
      try { await navigator.share({ title, url }); } catch (e) {}
    } else {
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard');
    }
  };

  // Attendance & Salary State
  const today = new Date();
  const [calMonth, setCalMonth] = useState(today.getMonth() + 1);
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [staffTasks, setStaffTasks] = useState([]);
  
  const [selectedDateStr, setSelectedDateStr] = useState(null);
  const [selectedDayLog, setSelectedDayLog] = useState(null);
  const [selectedDayTasks, setSelectedDayTasks] = useState([]);
  
  const [salaryTillDate, setSalaryTillDate] = useState(0);

  useEffect(() => {
    if (!staff.id) return;
    
    const fetchData = async () => {
      const qAtt = query(collection(db, 'staff_attendance'), where('staffId', '==', staff.id));
      const snapAtt = await getDocs(qAtt);
      const logs = snapAtt.docs.map(d => d.data());
      setAttendanceLogs(logs);

      const qTasks = query(collection(db, 'staff_tasks'), where('assignedTo', '==', staff.id));
      const snapTasks = await getDocs(qTasks);
      const tks = snapTasks.docs.map(d => ({id: d.id, ...d.data()}));
      setStaffTasks(tks);

      const payDate = staff.payDate || 1;
      const baseSal = staff.salary || 0;
      
      let cycleStartMonth = today.getMonth();
      let cycleStartYear = today.getFullYear();
      if (today.getDate() < payDate) {
        cycleStartMonth--;
        if (cycleStartMonth < 0) {
          cycleStartMonth = 11;
          cycleStartYear--;
        }
      }
      
      const cycleStartDate = new Date(cycleStartYear, cycleStartMonth, payDate);
      let cycleEndDate = new Date(cycleStartYear, cycleStartMonth + 1, payDate - 1);
      if (cycleEndDate.getDate() < payDate - 1) {
         cycleEndDate = new Date(cycleStartYear, cycleStartMonth + 2, 0); 
      }

      const standardDailyWage = baseSal / 30;
      let earnedThisCycle = 0;
      const iterateEndDate = today < cycleEndDate ? today : cycleEndDate;
      
      for (let d = new Date(cycleStartDate); d <= iterateEndDate; d.setDate(d.getDate() + 1)) {
         const jDate = new Date(staff.createdAt || staff.timestamp || 0);
         jDate.setHours(0,0,0,0);
         const iterDate = new Date(d);
         iterDate.setHours(0,0,0,0);
         if (iterDate < jDate) continue;
         const dateStr = `${iterDate.getFullYear()}-${String(iterDate.getMonth()+1).padStart(2,'0')}-${String(iterDate.getDate()).padStart(2,'0')}`;
         const log = logs.find(l => l.date === dateStr);
         if (log) {
            if (log.dailyPay !== undefined) {
               earnedThisCycle += Number(log.dailyPay);
            } else if (log.status === 'present' || log.status === 'working' || log.status === 'resting' || log.status === 'pending_review') {
               earnedThisCycle += standardDailyWage;
            } else if (log.status === 'half_day') {
               earnedThisCycle += (standardDailyWage / 2);
            }
         }
      }
      setSalaryTillDate(Math.round(earnedThisCycle));
    };
    fetchData();
  }, [staff.id, calMonth, calYear]);

  
  const formatTime = (timeVal) => {
    if (!timeVal) return 'N/A';
    if (typeof timeVal === 'string' && (timeVal.includes('AM') || timeVal.includes('PM') || !timeVal.includes('T'))) {
      return timeVal;
    }
    return new Date(timeVal).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  const handleDayClick = (day) => {
    const mStr = String(calMonth).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    const fullDate = `${calYear}-${mStr}-${dStr}`;
    
    setSelectedDateStr(fullDate);
    const log = attendanceLogs.find(l => l.date === fullDate);
    setSelectedDayLog(log || null);
    
    const dTasks = staffTasks.filter(t => t.completedAt && t.completedAt.startsWith(fullDate));
    setSelectedDayTasks(dTasks);
  };

  const getDaysInMonth = (month, year) => new Date(year, month, 0).getDate();
  const getFirstDayOfMonth = (month, year) => new Date(year, month - 1, 1).getDay();
  
  const daysInCalMonth = getDaysInMonth(calMonth, calYear);
  const firstDay = getFirstDayOfMonth(calMonth, calYear);
  
  const calDays = [];
  for (let i = 0; i < firstDay; i++) calDays.push(null);
  for (let i = 1; i <= daysInCalMonth; i++) calDays.push(i);

  const prevMonth = () => {
    if (calMonth === 1) { setCalMonth(12); setCalYear(y => y - 1); }
    else { setCalMonth(m => m - 1); }
  };
  const nextMonth = () => {
    if (calMonth === 12) { setCalMonth(1); setCalYear(y => y + 1); }
    else { setCalMonth(m => m + 1); }
  };




  const handleUploadPaySlip = async (e) => {
    e.preventDefault();
    if (!uploadAmount || !uploadMonth || !uploadFile) return alert('Please fill all fields and select a receipt image');
    
    setIsUploading(true);
    try {
      const storageRef = ref(storage, `staff_receipts/${staff.id}/${Date.now()}_${uploadFile.name}`);
      const snapshot = await uploadBytesResumable(storageRef, uploadFile);
      const url = await getDownloadURL(snapshot.ref);

      const txnId = 'TXN-' + Date.now();
      await setDoc(doc(db, 'staff_salaries', txnId), {
        staffId: staff.id,
        adminId: staff.ownerUid || 'admin',
        amount: Number(uploadAmount),
        month: uploadMonth,
        receiptUrl: url,
        createdAt: new Date().toISOString(),
      });
      
      alert('Pay slip uploaded successfully!');
      setShowUpload(false);
      setUploadAmount('');
      setUploadMonth('');
      setUploadFile(null);
    } catch (err) {
      console.error(err);
      alert('Error uploading pay slip: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 80 }}>

      <Header onBack={() => navigate(-1)} />

      <div style={{ padding: '16px' }}>
        {/* Top Profile Card */}
        <div style={{ background: 'white', borderRadius: 16, padding: '16px', display: 'flex', gap: 16, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', marginBottom: 20 }}>
          <div style={{ width: 110, height: 130, borderRadius: 12, background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {staff.profileData?.profilePictureUrl || staff.profileUrl ? (
              <img src={staff.profileData?.profilePictureUrl || staff.profileUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Profile" />
            ) : (
              <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#94a3b8' }}>person</span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
            <p style={{ fontWeight: 700, fontSize: 18, color: '#0f172a', margin: '0 0 4px' }}>{staff.name || 'Staff Member'}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#38bdf8' }}>vpn_key</span> Token: {staff.token || 'N/A'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#38bdf8' }}>person</span> {staff.role || 'Role'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#38bdf8' }}>call</span> {staff.phone || 'N/A'}
            </div>
          </div>
        </div>

        {/* Tab Toggle */}
        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 12, padding: 6, marginBottom: 20, boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
          <button 
            onClick={() => setProfileTab('details')}
            style={{ flex: 1, padding: '12px 0', background: profileTab === 'details' ? 'white' : 'transparent', border: 'none', borderRadius: 8, fontWeight: 700, color: profileTab === 'details' ? '#0891b2' : '#64748b', boxShadow: profileTab === 'details' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span className="material-symbols-outlined" style={{fontSize: 20}}>badge</span>
            Details
          </button>
          <button 
            onClick={() => setProfileTab('attendance')}
            style={{ flex: 1, padding: '12px 0', background: profileTab === 'attendance' ? 'white' : 'transparent', border: 'none', borderRadius: 8, fontWeight: 700, color: profileTab === 'attendance' ? '#0891b2' : '#64748b', boxShadow: profileTab === 'attendance' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span className="material-symbols-outlined" style={{fontSize: 20}}>calendar_month</span>
            Attendance
          </button>
        </div>
        
        {profileTab === 'attendance' && (
        <div style={{ background: 'white', borderRadius: 16, padding: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#0f172a' }}>Attendance & Salary</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}><span className="material-symbols-outlined" style={{ fontSize: 20 }}>chevron_left</span></button>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{new Date(calYear, calMonth - 1).toLocaleString('default', { month: 'short' })} {calYear}</span>
              <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}><span className="material-symbols-outlined" style={{ fontSize: 20 }}>chevron_right</span></button>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center', marginBottom: 8 }}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <div key={d} style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center' }}>
            {calDays.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} />;
              
              const dateStr = `${calYear}-${String(calMonth).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
              const jDate = new Date(staff.createdAt || staff.timestamp || 0);
              jDate.setHours(0,0,0,0);
              
              const iterDate = new Date(calYear, calMonth - 1, day);
              iterDate.setHours(0,0,0,0);
              
              const isBeforeJoined = iterDate < jDate;
              
              const isFuture = iterDate > new Date();

              const log = attendanceLogs.find(l => l.date === dateStr);
              let bg = '#f1f5f9';
              let col = '#0f172a';
              let inner = day;
              
              if (isBeforeJoined) {
                inner = <span className="material-symbols-outlined" style={{fontSize: 16, color: '#94a3b8'}}>close</span>;
                col = '#94a3b8';
              } else if (isFuture) {
                col = '#cbd5e1';
              } else if (log) {
                if (log.status === 'present' || log.status === 'working' || log.status === 'resting') { bg = '#dcfce7'; col = '#15803d'; }
                else if (log.status === 'absent') { bg = '#fee2e2'; col = '#b91c1c'; }
                else if (log.status === 'half_day' || log.status === 'pending_review') { bg = '#fef9c3'; col = '#a16207'; }
              }
              
              return (
                <div key={day} onClick={() => !isBeforeJoined && !isFuture && handleDayClick(day)} style={{
                  height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: bg, color: col, borderRadius: 10, fontSize: 15, fontWeight: 700,
                  cursor: (!isBeforeJoined && !isFuture) ? 'pointer' : 'default',
                  border: selectedDateStr === dateStr ? '2px solid #0891b2' : 'none',
                  boxShadow: (!isBeforeJoined && !isFuture && bg !== '#f1f5f9') ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                  transition: 'all 0.2s'
                }}>
                  {inner}
                </div>
              );
            })}
          </div>

          {selectedDateStr && (
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '2px dashed #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#ecfeff', color: '#0891b2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>event_note</span>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                    {new Date(selectedDateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>Detailed Timeline</div>
                </div>
              </div>
              
              {!selectedDayLog || selectedDayLog.status === 'absent' ? (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="material-symbols-outlined" style={{ color: '#ef4444' }}>cancel</span>
                  <span style={{ fontSize: 14, color: '#b91c1c', fontWeight: 700 }}>Staff was absent on this date</span>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 12, border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 12, marginBottom: 4 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>login</span> Punched In
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{formatTime(selectedDayLog.clockIn)}</div>
                  </div>
                  
                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 12, border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 12, marginBottom: 4 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>logout</span> Punched Out
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{formatTime(selectedDayLog.clockOut)}</div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 12, border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 12, marginBottom: 4 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>coffee</span> Took Rest
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{formatTime(selectedDayLog.restStartLog || selectedDayLog.lastRestStart || selectedDayLog.restStart)}</div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 12, border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 12, marginBottom: 4 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>work_history</span> Resumed
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{formatTime(selectedDayLog.restEndLog || selectedDayLog.restEnd)}</div>
                  </div>

                  <div style={{ gridColumn: '1 / -1', background: '#ecfeff', padding: 12, borderRadius: 12, border: '1px solid #cffafe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#0e7490', fontSize: 13, fontWeight: 700 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>schedule</span> Hours Worked
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#0891b2' }}>{selectedDayLog.totalHoursWorked ? `${selectedDayLog.totalHoursWorked.toFixed(1)} hrs` : (selectedDayLog.hoursWorked ? `${selectedDayLog.hoursWorked} hrs` : 'N/A')}</div>
                  </div>

                  {selectedDayTasks.length > 0 && (
                    <div style={{ gridColumn: '1 / -1', marginTop: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>task_alt</span> Completed Tasks
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {selectedDayTasks.map(t => (
                          <div key={t.id} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 12px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#16a34a' }}>check_circle</span>
                            <span style={{ fontSize: 14, fontWeight: 600, color: '#15803d' }}>{t.title || t.name || 'Assigned Task'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 20, paddingTop: 20, borderTop: '2px dashed #e2e8f0' }}>
             <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: '0 0 16px' }}>Salary Summary</h3>
             <div style={{ display: 'flex', gap: 12 }}>
               <div style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
                   <span className="material-symbols-outlined" style={{ fontSize: 16 }}>account_balance</span> Base Salary
                 </div>
                 <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>₹{(staff.salary || 0).toLocaleString()}</div>
               </div>
               <div style={{ flex: 1, background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 12, padding: 16 }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#059669', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
                   <span className="material-symbols-outlined" style={{ fontSize: 16 }}>payments</span> Earned Till Date
                 </div>
                 <div style={{ fontSize: 20, fontWeight: 800, color: '#10b981' }}>₹{salaryTillDate.toLocaleString()}</div>
               </div>
             </div>
          </div>
        </div>
        )}
        
        {profileTab === 'details' && (
          <>


        

        {/* Personal Details */}
        <Accordion icon="person" title="Personal Details">
          <InfoRow label="Name" value={staff.profileData?.name || staff.name || 'N/A'} />
          <InfoRow label="Phone" value={staff.profileData?.phone || staff.phone || 'N/A'} />
          <InfoRow label="Gender" value={staff.profileData?.gender || 'N/A'} />
          <InfoRow label="DOB" value={staff.profileData?.dob || 'N/A'} />
          <InfoRow label="Blood Group" value={staff.profileData?.bloodGroup || 'N/A'} />
          <InfoRow label="Aadhaar No." value={staff.profileData?.aadharNo || 'N/A'} />
          <InfoRow label="PAN No." value={staff.profileData?.panNo || 'N/A'} />
          <InfoRow label="Marital Status" value={staff.profileData?.maritalStatus || 'N/A'} />
          <InfoRow label="Permanent Address" value={staff.profileData?.permanentAddress || 'N/A'} />
          <InfoRow label="Corresponding Address" value={staff.profileData?.correspondingAddress || 'N/A'} />
        </Accordion>

        {/* Parents Details */}
        <Accordion icon="diversity_3" title="Parents Details">
          <InfoRow label="Father's Name" value={staff.profileData?.fatherName || 'N/A'} />
          <InfoRow label="Father's Phone" value={staff.profileData?.fatherPhone || 'N/A'} />
          <InfoRow label="Mother's Name" value={staff.profileData?.motherName || 'N/A'} />
          <InfoRow label="Mother's Phone" value={staff.profileData?.motherPhone || 'N/A'} />
          <InfoRow label="Father's Occupation" value={staff.profileData?.fatherOccupation || 'N/A'} />
          <InfoRow label="Home Address" value={staff.profileData?.homeAddress || 'N/A'} />
        </Accordion>

        {/* Relative Details */}
        <Accordion icon="family_restroom" title="Relative Details">
          <InfoRow label="Name" value={staff.profileData?.relativeName || 'N/A'} />
          <InfoRow label="Number" value={staff.profileData?.relativePhone || 'N/A'} />
          <InfoRow label="Relation" value={staff.profileData?.relativeRelation || 'N/A'} />
          <InfoRow label="Address" value={staff.profileData?.relativeAddress || 'N/A'} />
        </Accordion>

        {/* Work Experience */}
        <Accordion icon="work" title="Work Experience">
          {(staff.profileData?.workExp1Company || staff.profileData?.workExp2Company) ? (
            <>
              {staff.profileData?.workExp1Company && (
                <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: staff.profileData?.workExp2Company ? '1px dashed #e2e8f0' : 'none' }}>
                  <p style={{ fontWeight: 700, color: '#0f172a', fontSize: 14, margin: '0 0 8px' }}>Experience 1</p>
                  <InfoRow label="Company" value={staff.profileData?.workExp1Company || 'N/A'} />
                  <InfoRow label="Duration" value={staff.profileData?.workExp1Duration || 'N/A'} />
                  <InfoRow label="Location" value={staff.profileData?.workExp1Location || 'N/A'} />
                  <InfoRow label="Responsibilities" value={staff.profileData?.workExp1Resp || 'N/A'} />
                </div>
              )}
              {staff.profileData?.workExp2Company && (
                <div style={{ marginBottom: 8 }}>
                  <p style={{ fontWeight: 700, color: '#0f172a', fontSize: 14, margin: '0 0 8px' }}>Experience 2</p>
                  <InfoRow label="Company" value={staff.profileData?.workExp2Company || 'N/A'} />
                  <InfoRow label="Duration" value={staff.profileData?.workExp2Duration || 'N/A'} />
                  <InfoRow label="Location" value={staff.profileData?.workExp2Location || 'N/A'} />
                  <InfoRow label="Responsibilities" value={staff.profileData?.workExp2Resp || 'N/A'} />
                </div>
              )}
            </>
          ) : (
            <p style={{ color: '#94a3b8', fontSize: 14, fontStyle: 'italic', margin: 0 }}>No work experience added</p>
          )}
        </Accordion>

        {/* Password */}
        <Accordion icon="lock" title="Password">
          <InfoRow label="Generated PIN" value={staff.token || 'N/A'} />
        </Accordion>

        {/* Police Verification */}
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, marginBottom: 12, display: 'flex', alignItems: 'center', padding: '16px', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: '50%', background: '#ecfeff', color: '#0891b2' }}>
            <span className="material-symbols-outlined">local_police</span>
          </div>
          <p style={{ flex: 1, margin: 0, fontWeight: 600, fontSize: 15, color: '#0f172a' }}>Police Verification</p>
          <button
            onClick={handleTogglePoliceVerification}
            disabled={policeVerLoading}
            style={{
              background: (staff.policeVerification || 'unverified') === 'verified' ? '#dcfce7' : '#fef9c3',
              color: (staff.policeVerification || 'unverified') === 'verified' ? '#16a34a' : '#854d0e',
              border: 'none', padding: '4px 12px', borderRadius: 16, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              opacity: policeVerLoading ? 0.6 : 1
            }}
          >
            {(staff.policeVerification || 'unverified') === 'verified' ? '✓ Verified' : '✗ Unverified'}
          </button>
        </div>

        {/* Document Section */}
        <div style={{ marginTop: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>Documents</p>
            {staff.profileData?.aadharFrontUrl ? (
              <div style={{ background: '#dcfce7', color: '#16a34a', padding: '4px 12px', borderRadius: 16, fontSize: 12, fontWeight: 700 }}>Uploaded</div>
            ) : (
              <div style={{ background: '#fef9c3', color: '#854d0e', padding: '4px 12px', borderRadius: 16, fontSize: 12, fontWeight: 700 }}>Pending</div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Aadhaar Front', url: staff.profileData?.aadharFrontUrl, icon: 'id_card', fileName: `${staff.name || 'staff'}_aadhar_front.jpg` },
              { label: 'Aadhaar Back', url: staff.profileData?.aadharBackUrl, icon: 'id_card', fileName: `${staff.name || 'staff'}_aadhar_back.jpg` },
              { label: 'PAN Card', url: staff.profileData?.panCardUrl, icon: 'credit_card', fileName: `${staff.name || 'staff'}_pan_card.jpg` },
            ].map(({ label, url, icon, fileName }) => (
              <div key={label} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
                {url ? (
                  <img src={url} style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} alt={label} />
                ) : (
                  <div style={{ height: 120, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 36, color: '#94a3b8' }}>{icon}</span>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>Not uploaded</span>
                  </div>
                )}
                <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{label}</span>
                  {url && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <a href={url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#ecfeff', color: '#0891b2', border: 'none', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 700, textDecoration: 'none', cursor: 'pointer' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span> View
                      </a>
                      <button onClick={() => handleDownloadDoc(url, fileName)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f0fdf4', color: '#16a34a', border: 'none', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>download</span> Download
                      </button>
                      <button onClick={() => handleShareDoc(url, label)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#faf5ff', color: '#7c3aed', border: 'none', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>share</span> Share
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Delete Staff */}
        <div style={{ marginTop: 24, marginBottom: 16 }}>
          {!deleteConfirm ? (
            <button onClick={() => setDeleteConfirm(true)} style={{ width: '100%', padding: '14px', background: '#fff1f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
              Delete Staff Member
            </button>
          ) : (
            <div style={{ background: '#fff1f2', border: '1px solid #fecaca', borderRadius: 12, padding: 16 }}>
              <p style={{ margin: '0 0 12px', fontWeight: 700, color: '#ef4444', fontSize: 14 }}>Are you sure you want to delete {staff.name}? This cannot be undone.</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setDeleteConfirm(false)} style={{ flex: 1, padding: '10px', background: 'white', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleDeleteStaff} style={{ flex: 1, padding: '10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Yes, Delete</button>
              </div>
            </div>
          )}
        </div>
          </>
        )}
      </div>


      {/* ADD TENANT POPUP MENU */}
      {showAddTenantMenu && (
        <>
          <div onClick={() => setShowAddTenantMenu(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', zIndex: 48 }} />
          <div style={{ position: 'absolute', bottom: '75px', left: '25%', transform: 'translateX(-25%)', background: '#fff', borderRadius: '16px', padding: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', zIndex: 49, display: 'flex', flexDirection: 'column', gap: '4px', width: '220px', border: '1px solid #e2e8f0' }}>
            <div onClick={() => navigate('/add-tenant')} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', borderRadius: '10px', color: '#0f172a', fontWeight: '600', fontSize: '14px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#0891b2' }}>person_add</span>
              Add New Tenant
            </div>
            <div onClick={() => navigate('/already-residence')} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', borderRadius: '10px', color: '#0f172a', fontWeight: '600', fontSize: '14px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#0891b2' }}>how_to_reg</span>
              Already a Residence
            </div>
          </div>
        </>
      )}

      {/* Bottom Nav — same as dashboard */}
      <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '8px 0 calc(20px + env(safe-area-inset-bottom, 0px))', zIndex: 50 }}>
        {[
          { tab: 'home',    icon: 'home',            label: 'Dashboard', path: '/admin-dashboard' },
          { tab: 'add', icon: 'person_add', label: 'Add Tenant',   path: '' },
          { tab: 'assign',  icon: 'assignment',      label: 'Assign Work', path: '/assign-work' },
          { tab: 'profile', icon: 'person',          label: 'Profile',   path: null },
        ].map(item => (
          <div key={item.tab} onClick={() => { 
            if (item.tab === 'add') {
              setShowAddTenantMenu(!showAddTenantMenu);
              setActiveTab('add');
            } else {
              setShowAddTenantMenu(false);
              setActiveTab(item.tab);
              if (item.path) navigate(item.path);
            }
          }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '4px 16px', cursor: 'pointer', color: activeTab === item.tab ? '#0891b2' : '#94a3b8', transition: 'color 0.2s' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 24, fontVariationSettings: activeTab === item.tab ? "'FILL' 1" : "'FILL' 0" }}>
              {item.icon}
            </span>
            <span style={{ fontSize: 10, fontWeight: activeTab === item.tab ? 700 : 500 }}>{item.label}</span>
          </div>
        ))}
      </nav>
    </div>
  );
}
