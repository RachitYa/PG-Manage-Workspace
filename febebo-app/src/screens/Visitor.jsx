import React, { useState, useEffect } from 'react';
import { TopBar } from '../App';
import BottomNav from '../components/BottomNav';
import { UserPlus, Plus, X, Calendar, Clock, Phone, FileText, CheckCircle2, Clock as ClockIcon, LogOut, Camera, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import './Visitor.css';

const Visitor = () => {
  const { user } = useAuth();
  const [visitors, setVisitors] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [visitorName, setVisitorName] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [visitTime, setVisitTime] = useState('');
  const [contact, setContact] = useState('');
  const [purpose, setPurpose] = useState('');
  const [idNo, setIdNo] = useState('');
  const [idCard, setIdCard] = useState(null);
  const [selectedVisitor, setSelectedVisitor] = useState(null);

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 600;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
      };
    });
  };


  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, 'visitors'), 
      where('tenantId', '==', user.uid)
    );
    
    // Note: Due to lack of composite indexes initially, we might have to sort on client side
    // if orderBy('createdAt', 'desc') throws an index error. We'll fetch and sort.
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() }));
      data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setVisitors(data);
    });
    return () => unsubscribe();
  }, [user]);

  const handleSubmit = async () => {
    if (!visitorName || !visitDate || !purpose || !idCard) return;
    setSubmitting(true);
    
    try {
      const now = new Date();
      const timeIn = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

      const newVisitor = {
        adminId: user?.subscribedPG?.adminId || user?.subscribedPG?.pgId || 'none',
        pgId: user?.subscribedPG?.adminId ? user.subscribedPG.pgId : 'primary',
        tenantId: user.uid,
        tenantName: user.name || 'Student',
        visitorName,
        visitDate,
        visitTime,
        contact,
        purpose,
        idNo,
        idCard,
        status: 'Pending Entry',
        marked: false,
        timeIn,
        timeOut: null,
        createdAt: now.getTime() // store as timestamp to sort easily
      };
      
      await addDoc(collection(db, 'visitors'), newVisitor);
      
      setVisitorName('');
      setVisitDate('');
      setVisitTime('');
      setContact('');
      setPurpose('');
      setIdNo('');
      setIdCard(null);
      setShowPopup(false);
    } catch (e) {
      console.error("Error saving visitor:", e);
      alert("Failed to save visitor. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckout = async () => {
    if (!selectedVisitor) return;
    const now = new Date();
    const timeOut = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    try {
      await updateDoc(doc(db, 'visitors', selectedVisitor.docId), {
        status: 'Pending Exit',
        timeOut
      });
      setSelectedVisitor(null);
    } catch (e) {
      console.error("Error checking out visitor:", e);
      alert("Failed to check out visitor.");
    }
  };

  return (
    <div className="page-content bg-white pb-nav">
      <TopBar title="Visitors" />
      
      <div className="visitor-container">
        
        <button 
          className="add-visitor-btn"
          onClick={() => setShowPopup(true)}
        >
          <Plus size={20} /> Register New Visitor
        </button>

        <h3 className="section-title">Visitor History</h3>

        {visitors.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon-wrap">
              <UserPlus size={32} color="#166534" />
            </div>
            <p className="empty-title">No visitors registered</p>
            <p className="empty-subtitle">Register your guests before they arrive</p>
          </div>
        ) : (
          <div className="visitor-list">
            {visitors.map(v => (
              <div key={v.docId} className="visitor-card" onClick={() => setSelectedVisitor(v)} style={{ cursor: 'pointer' }}>
                <div className="v-card-header">
                  <h4 className="v-name">{v.visitorName}</h4>
                  <span className={`v-status ${v.status === 'Inside' || v.status === 'Exited' ? 'status-approved' : (v.status === 'Denied' ? 'status-denied' : 'status-pending')}`}>
                    {v.status === 'Inside' || v.status === 'Exited' ? <CheckCircle2 size={12}/> : <ClockIcon size={12}/>}
                    {v.status || 'Inside'}
                  </span>
                </div>
                
                <div className="v-card-body">
                  <div className="v-info-row">
                    <Calendar size={14} color="#64748b" /> 
                    <span>{v.visitDate} {v.timeIn ? `at ${v.timeIn}` : (v.visitTime ? `at ${v.visitTime}` : '')}</span>
                  </div>
                  {v.contact && (
                    <div className="v-info-row">
                      <Phone size={14} color="#64748b" /> 
                      <span>{v.contact}</span>
                    </div>
                  )}
                  <div className="v-info-row">
                    <FileText size={14} color="#64748b" /> 
                    <span>{v.purpose}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showPopup && (
        <div className="popup-overlay">
          <div className="popup-card">
            <div className="popup-header">
              <h3>Register Visitor</h3>
              <button className="close-popup" onClick={() => !submitting && setShowPopup(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="popup-body">
              <div>
                <label className="popup-label">Visitor Name*</label>
                <input 
                  type="text" 
                  className="popup-input" 
                  value={visitorName} 
                  onChange={e => setVisitorName(e.target.value)}
                  placeholder="E.g. John Doe"
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label className="popup-label">Visit Date*</label>
                  <input 
                    type="date" 
                    className="popup-input" 
                    value={visitDate} 
                    onChange={e => setVisitDate(e.target.value)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="popup-label">Visit Time (Opt)</label>
                  <input 
                    type="time" 
                    className="popup-input" 
                    value={visitTime} 
                    onChange={e => setVisitTime(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="popup-label">Contact Number (Opt)</label>
                <input 
                  type="tel" 
                  className="popup-input" 
                  value={contact} 
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length <= 10) setContact(val);
                  }}
                  placeholder="10-digit mobile number"
                  style={{ border: (contact && contact.length !== 10) ? '1px solid #ef4444' : undefined, background: (contact && contact.length !== 10) ? '#fef2f2' : undefined }}
                />
                {(contact && contact.length !== 10) ? (
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#ef4444', fontWeight: 'bold' }}>
                    Phone number must be exactly 10 digits
                  </p>
                ) : null}
              </div>

              <div>
                <label className="popup-label">Purpose of Visit*</label>
                <input 
                  type="text" 
                  className="popup-input" 
                  value={purpose} 
                  onChange={e => setPurpose(e.target.value)}
                  placeholder="E.g. Family visit, Project work"
                />
              </div>

              <div>
                <label className="popup-label">ID Number (Opt)</label>
                <input 
                  type="text" 
                  className="popup-input" 
                  value={idNo} 
                  onChange={e => setIdNo(e.target.value)}
                  placeholder="ID Number"
                />
              </div>

              <div style={{ marginTop: 12 }}>
                <label className="popup-label">ID Card Image*</label>
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <label style={{ flex: 1, padding: '12px 8px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <Camera size={22} color="#475569" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>Camera</span>
                    <input 
                      type="file" 
                      accept="image/*"
                      capture="environment"
                      style={{ display: 'none' }}
                      onChange={async (e) => {
                        if (e.target.files[0]) {
                          const compressed = await compressImage(e.target.files[0]);
                          setIdCard(compressed);
                        }
                      }}
                    />
                  </label>
                  <label style={{ flex: 1, padding: '12px 8px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <ImageIcon size={22} color="#475569" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>Gallery</span>
                    <input 
                      type="file" 
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={async (e) => {
                        if (e.target.files[0]) {
                          const compressed = await compressImage(e.target.files[0]);
                          setIdCard(compressed);
                        }
                      }}
                    />
                  </label>
                </div>
                {idCard && <div style={{ background: '#dcfce7', padding: '8px 12px', borderRadius: '8px', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={16} color="#16a34a" />
                  <span style={{ fontSize: 13, color: '#16a34a', fontWeight: '700' }}>ID Card Uploaded Successfully</span>
                </div>}
              </div>

            </div>

            <button 
              className="btn-popup-submit-full"
              onClick={handleSubmit} 
              disabled={submitting || !visitorName || !visitDate || !purpose || !idCard || (contact && contact.length !== 10)}
            >
              {submitting ? 'Registering...' : 'Register Visitor'}
            </button>
          </div>
        </div>
      )}
      
      {selectedVisitor && (
        <div className="popup-overlay">
          <div className="popup-card" style={{ maxWidth: 400, padding: 0, overflow: 'hidden' }}>
            <div style={{ background: '#f8fafc', padding: '20px 20px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: 18, color: '#0f172a', fontWeight: 800 }}>{selectedVisitor.visitorName}</h3>
                <span className={`v-status ${selectedVisitor.status === 'Inside' || selectedVisitor.status === 'Exited' ? 'status-approved' : (selectedVisitor.status === 'Denied' ? 'status-denied' : 'status-pending')}`} style={{ display: 'inline-flex' }}>
                  {selectedVisitor.status}
                </span>
              </div>
              <button onClick={() => setSelectedVisitor(null)} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>
            
            <div style={{ padding: 20 }}>
              <div className="v-card-body" style={{ marginBottom: 20 }}>
                <div className="v-info-row">
                  <Calendar size={16} color="#64748b" /> 
                  <span style={{ fontSize: 14 }}>Date: <strong>{selectedVisitor.visitDate}</strong></span>
                </div>
                <div className="v-info-row">
                  <Clock size={16} color="#64748b" /> 
                  <span style={{ fontSize: 14 }}>Time In: <strong>{selectedVisitor.timeIn || 'N/A'}</strong></span>
                </div>
                {selectedVisitor.timeOut && (
                  <div className="v-info-row">
                    <LogOut size={16} color="#64748b" /> 
                    <span style={{ fontSize: 14 }}>Time Out: <strong>{selectedVisitor.timeOut}</strong></span>
                  </div>
                )}
                {selectedVisitor.contact && (
                  <div className="v-info-row">
                    <Phone size={16} color="#64748b" /> 
                    <span style={{ fontSize: 14 }}>Phone: <strong>{selectedVisitor.contact}</strong></span>
                  </div>
                )}
                <div className="v-info-row">
                  <FileText size={16} color="#64748b" /> 
                  <span style={{ fontSize: 14 }}>Purpose: <strong>{selectedVisitor.purpose}</strong></span>
                </div>
              </div>

              {selectedVisitor.idCard && (
                <div style={{ marginBottom: 24 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#475569', margin: '0 0 8px' }}>ID Card Document</p>
                  <div style={{ width: '100%', height: 180, borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0', background: '#f1f5f9' }}>
                    <img src={selectedVisitor.idCard} alt="ID Document" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                </div>
              )}

              {selectedVisitor.status === 'Inside' && (
                <button 
                  onClick={handleCheckout}
                  style={{ width: '100%', background: '#dc2626', color: 'white', padding: 14, borderRadius: 12, fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  <LogOut size={18} /> Request Checkout (OUT)
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      <BottomNav activeNav="" />
    </div>
  );
};

export default Visitor;
