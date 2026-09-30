import React, { useState, useEffect } from 'react';
import { TopBar } from '../App';
import BottomNav from '../components/BottomNav';
import { Sparkles, Clock, CalendarClock, Info, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useLoading } from '../context/LoadingContext';
import './Cleaner.css';

const Cleaner = () => {
  const { user } = useAuth();
  const { startLoading, stopLoading } = useLoading();
  
  const [regularSlot, setRegularSlot] = useState('');
  const [isEditingRegular, setIsEditingRegular] = useState(false);
  
  const [specialRequest, setSpecialRequest] = useState(null); // { date, time }
  const [isRequestingSpecial, setIsRequestingSpecial] = useState(false);
  const [specialDate, setSpecialDate] = useState('');
  const [specialTime, setSpecialTime] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const [reportDetails, setReportDetails] = useState('');
  const [successToast, setSuccessToast] = useState('');

  const [status, setStatus] = useState('Pending');
  const [lastUpdated, setLastUpdated] = useState('');

  const timeSlots = [
    '08:00 AM - 10:00 AM',
    '10:00 AM - 12:00 PM',
    '12:00 PM - 02:00 PM',
    '02:00 PM - 04:00 PM',
    '04:00 PM - 06:00 PM'
  ];

  useEffect(() => {
    let unsub = () => {};
    const fetchSettings = async () => {
      if (!user?.uid || !user?.subscribedPG?.pgId) return;
      startLoading();
      try {
        const docRef = doc(db, 'student_profiles', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().cleanerSettings) {
          const settings = docSnap.data().cleanerSettings;
          if (settings.regularSlot) setRegularSlot(settings.regularSlot);
          if (settings.specialRequest) setSpecialRequest(settings.specialRequest);
        }

        // Listen to cleaner_requests for approval status
        const pgRef = doc(db, 'pg_owners', user.subscribedPG.pgId, 'cleaner_requests', user.uid);
        unsub = onSnapshot(pgRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setStatus(data.status || 'Pending');
            setLastUpdated(data.lastUpdated || data.updatedAt || '');
          }
        });
      } catch (err) {
        console.error('Error fetching cleaner settings:', err);
      } finally {
        stopLoading();
      }
    };
    fetchSettings();
    return () => unsub();
  }, [user]);

  const handleSaveRegular = async () => {
    if (!regularSlot) return;
    startLoading();
    try {
      const docRef = doc(db, 'student_profiles', user.uid);
      await setDoc(docRef, { cleanerSettings: { regularSlot, specialRequest } }, { merge: true });
      
      // Sync to PG owner's database for staff app
      if (user?.subscribedPG?.pgId) {
        const pgRef = doc(db, 'pg_owners', user.subscribedPG.pgId, 'cleaner_requests', user.uid);
        await setDoc(pgRef, {
          studentId: user.uid,
          studentName: user.name || 'Unknown',
          roomNumber: user.subscribedPG.roomNumber || 'Unknown',
          regularSlot,
          specialRequest: specialRequest || null,
          status: 'Pending',
          updatedAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        }, { merge: true });
      }

      setIsEditingRegular(false);
    } catch (err) {
      console.error(err);
    } finally {
      stopLoading();
    }
  };

  const handleApprove = async () => {
    if (!user?.subscribedPG?.pgId) return;
    startLoading();
    try {
      const pgRef = doc(db, 'pg_owners', user.subscribedPG.pgId, 'cleaner_requests', user.uid);
      await updateDoc(pgRef, {
        status: 'Done',
        lastUpdated: new Date().toISOString()
      });
      setSuccessToast('Cleaning approved successfully!');
      setTimeout(() => setSuccessToast(''), 3000);
    } catch (err) {
      console.error('Error approving cleaning:', err);
    } finally {
      stopLoading();
    }
  };

  const handleSaveSpecial = async () => {
    setErrorMsg('');
    if (!specialDate || !specialTime) {
      setErrorMsg('Please select both date and time.');
      return;
    }

    const selectedDate = new Date(specialDate);
    const now = new Date();
    const diffHours = (selectedDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < 24) {
      setErrorMsg('Special requests must be made at least 24 hours in advance.');
      return;
    }

    startLoading();
    try {
      const newSpecial = { date: specialDate, time: specialTime };
      const docRef = doc(db, 'student_profiles', user.uid);
      await setDoc(docRef, { cleanerSettings: { regularSlot, specialRequest: newSpecial } }, { merge: true });
      
      // Sync to PG owner's database for staff app
      if (user?.subscribedPG?.pgId) {
        const pgRef = doc(db, 'pg_owners', user.subscribedPG.pgId, 'cleaner_requests', user.uid);
        await setDoc(pgRef, {
          studentId: user.uid,
          studentName: user.name || 'Unknown',
          roomNumber: user.subscribedPG.roomNumber || 'Unknown',
          regularSlot: regularSlot || null,
          specialRequest: newSpecial,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      setSpecialRequest(newSpecial);
      setIsRequestingSpecial(false);
    } catch (err) {
      console.error(err);
    } finally {
      stopLoading();
    }
  };

  const handleReportNotCleaned = async () => {
    if (!user?.subscribedPG?.pgId || !user?.uid) {
      alert("You need to be subscribed to a PG to raise a complaint.");
      return;
    }
    startLoading();
    try {
      const complaintsRef = collection(db, 'complaints');
      await addDoc(complaintsRef, {
        adminId: user.subscribedPG.adminId || user.subscribedPG.pgId,
        pgId: user.subscribedPG.adminId ? user.subscribedPG.pgId : 'primary',
        tenantId: user.uid,
        tenantName: user.name || 'Unknown',
        tenant: user.uid,
        room: user?.profileData?.roomDetails?.roomNumber || 'Unassigned',
        phone: user?.phone || user?.profileData?.personalDetails?.fatherPhone || 'Unknown',
        title: 'Room Not Cleaned',
        desc: reportDetails ? `The room was not cleaned. Additional details: ${reportDetails}` : 'The room was not cleaned today.',
        priority: 'High',
        category: 'Cleaning',
        status: 'Active',
        createdAt: serverTimestamp(),
      });
      setSuccessToast('Report submitted successfully! The admin has been notified.');
      setTimeout(() => setSuccessToast(''), 3000);
      setIsReporting(false);
      setReportDetails('');
    } catch (err) {
      console.error('Error submitting report:', err);
      alert('Failed to submit report. Please try again later.');
    } finally {
      stopLoading();
    }
  };

  // Get tomorrow's date string for min attribute
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDateString = tomorrow.toISOString().split('T')[0];

  return (
    <div className="page-content bg-white pb-nav">
      <TopBar title="Room Cleaning" />
      
      <div className="cleaner-container">
        
        {/* Banner */}
        <div className="cleaner-banner">
          <div className="banner-icon"><Sparkles size={28} color="#0891b2" /></div>
          <div className="banner-text">
            <h3>Keep your room spotless</h3>
            <p>Manage your regular cleaning slots or schedule a special one-time cleaning.</p>
          </div>
        </div>

        {/* Needs Approval Banner */}
        {status === 'Needs Approval' && (
          <div style={{ background: '#fefce8', border: '1.5px solid #fde047', borderRadius: 16, padding: 16, marginBottom: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ background: '#fef08a', width: 32, height: 32, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={18} color="#ca8a04" />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#854d0e' }}>Room Cleaned Today</h4>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#a16207' }}>Your housekeeper has marked your room as cleaned.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleApprove} style={{ flex: 1, padding: '10px', background: '#ca8a04', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
                Approve (Done)
              </button>
              <button onClick={() => setIsReporting(true)} style={{ padding: '10px 16px', background: '#fff', color: '#ca8a04', border: '1.5px solid #ca8a04', borderRadius: 12, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
                Report Issue
              </button>
            </div>
          </div>
        )}

        {/* Regular Slot Section */}
        <div className="cleaner-card">
          <div className="card-header">
            <Clock size={20} color="#166534" />
            <h4>Regular Cleaning Slot (2 Hours)</h4>
          </div>
          
          <p className="info-text">
            Choose a recurring daily 2-hour window when our staff can clean your room.
          </p>

          {isEditingRegular || !regularSlot ? (
            <div className="slot-selection">
              <div className="slot-chip-grid">
                {timeSlots.map(slot => (
                  <button
                    key={slot}
                    className={`slot-chip ${regularSlot === slot ? 'active' : ''}`}
                    onClick={() => setRegularSlot(slot)}
                  >
                    {slot}
                  </button>
                ))}
              </div>
              <button className="btn-primary" onClick={handleSaveRegular} disabled={!regularSlot}>
                Save Slot
              </button>
            </div>
          ) : (
            <div className="active-slot-view">
              <div className="active-slot-box">
                <span className="slot-val">{regularSlot}</span>
                <CheckCircle2 size={18} color="#16a34a" />
              </div>
              <button className="btn-outline" onClick={() => setIsEditingRegular(true)}>
                Change Regular Slot
              </button>
            </div>
          )}
        </div>

        {/* Special Request Section */}
        <div className="cleaner-card">
          <div className="card-header">
            <CalendarClock size={20} color="#d97706" />
            <h4>Special Cleaning Request</h4>
          </div>
          
          <div className="info-box warning">
            <Info size={16} />
            <span>Special requests must be scheduled at least <strong>24 hours</strong> in advance.</span>
          </div>

          {specialRequest && !isRequestingSpecial ? (
            <div className="active-slot-view">
              <div className="active-slot-box special-box">
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="slot-label">Upcoming Special Cleaning</span>
                  <span className="slot-val">{specialRequest.date} • {specialRequest.time}</span>
                </div>
                <CheckCircle2 size={18} color="#d97706" />
              </div>
              <button className="btn-outline special-btn" onClick={() => setIsRequestingSpecial(true)}>
                Edit Special Request
              </button>
            </div>
          ) : (
            <div className="special-form">
              <div className="form-group">
                <label>Select Date</label>
                <input 
                  type="date" 
                  min={minDateString}
                  value={specialDate}
                  onChange={(e) => setSpecialDate(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Select Time Slot</label>
                <div className="slot-chip-grid">
                  {timeSlots.map(slot => (
                    <button
                      key={slot}
                      className={`slot-chip ${specialTime === slot ? 'active' : ''}`}
                      onClick={() => setSpecialTime(slot)}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              {errorMsg && <p className="error-msg">{errorMsg}</p>}

              <div className="special-actions">
                {specialRequest && (
                  <button className="btn-text" onClick={() => setIsRequestingSpecial(false)}>Cancel</button>
                )}
                <button className="btn-primary" onClick={handleSaveSpecial}>
                  Confirm Request
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Room Not Cleaned Report Option */}
        <div className="cleaner-card report-card" style={{ marginTop: '20px', background: '#fff1f2', border: '1px solid #fecdd3' }}>
          <div className="card-header">
            <Info size={24} color="#e11d48" />
            <h3>Issue with Cleaning?</h3>
          </div>
          <p className="info-text" style={{ color: '#be123c', marginBottom: '12px' }}>
            If your room was not cleaned as scheduled, let us know.
          </p>
          
          {!isReporting ? (
            <button className="btn-outline" style={{ width: '100%', borderColor: '#f43f5e', color: '#e11d48' }} onClick={() => setIsReporting(true)}>
              Report Room Not Cleaned
            </button>
          ) : (
            <div className="report-form" style={{ marginTop: '12px' }}>
              <textarea 
                placeholder="Any specific details? (optional)" 
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #fda4af', marginBottom: '12px', fontSize: '14px', resize: 'none', height: '80px', outline: 'none' }}
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-text" style={{ flex: 1, color: '#475569' }} onClick={() => setIsReporting(false)}>Cancel</button>
                <button className="btn-primary" style={{ flex: 1, background: '#e11d48', border: 'none' }} onClick={handleReportNotCleaned}>Submit Report</button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Success Toast */}
      {successToast && (
        <div style={{
          position: 'fixed',
          bottom: '100px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#10b981',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '30px',
          fontSize: '14px',
          fontWeight: '500',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
          zIndex: 1000,
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle2 size={18} />
          {successToast}
        </div>
      )}

      <BottomNav activeNav="" />
    </div>
  );
};

export default Cleaner;
