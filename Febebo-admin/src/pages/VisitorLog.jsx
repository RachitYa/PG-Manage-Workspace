import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

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
          if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
        } else {
          if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
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

export default function VisitorLog() {
  const navigate = useNavigate();
  const { user, activePgId } = useAuth();
  const [visitors, setVisitors] = useState([]);
  const [showLogSheet, setShowLogSheet] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [showRoomSelection, setShowRoomSelection] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, 'visitors'), where('adminId', '==', user.uid), where('pgId', '==', activePgId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      fetched.sort((a, b) => b.createdAt - a.createdAt);
      setVisitors(fetched);
    });

    // Fetch rooms & tenants
    const fetchRoomsAndTenants = async () => {
      const qRooms = query(collection(db, 'rooms'), where('adminId', '==', user.uid), where('pgId', '==', activePgId));
      const qTenants = query(collection(db, 'tenants'), where('adminId', '==', user.uid), where('pgId', '==', activePgId), where('status', '==', 'Approved'));
      const [snapR, snapT] = await Promise.all([getDocs(qRooms), getDocs(qTenants)]);
      
      const r = snapR.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => a.roomNo.localeCompare(b.roomNo, undefined, {numeric: true}));
      const t = snapT.docs.map(d => ({ id: d.id, ...d.data() }));
      setRooms(r);
      setTenants(t);
    };
    fetchRoomsAndTenants();

    return () => unsubscribe();
  }, [user, activePgId]);

  // Form State
  const [visitorName, setVisitorName] = useState('');
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [visitTime, setVisitTime] = useState(new Date().toTimeString().slice(0, 5));
  const [contact, setContact] = useState('');
  const [purpose, setPurpose] = useState('Personal Visit');
  const [idNo, setIdNo] = useState('');
  const [idCard, setIdCard] = useState(null);
  
  // Selected Tenant Details
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [selectedTenantName, setSelectedTenantName] = useState('');
  const [selectedRoomNo, setSelectedRoomNo] = useState('');

  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const totalToday = visitors.length; 
  const insideNow = visitors.filter(v => v.status === 'Inside').length;
  const exited = visitors.filter(v => v.status === 'Exited').length;

  const todayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

  const handleLogVisitor = async () => {
    if (!visitorName || !selectedTenantId || !visitDate || !user?.uid) return;
    setSubmitting(true);
    
    try {
      const now = new Date();
      const timeIn = visitTime || now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

      await addDoc(collection(db, 'visitors'), {
        adminId: user.uid,
        pgId: activePgId,
        tenantId: selectedTenantId,
        tenantName: selectedTenantName,
        visitorName,
        visitDate,
        visitTime,
        contact,
        purpose,
        idNo,
        idCard,
        status: 'Inside',
        marked: true,
        timeIn,
        timeOut: null,
        createdAt: now.getTime()
      });
      
      setVisitorName(''); setContact(''); setIdNo(''); setIdCard(null); 
      setSelectedTenantId(''); setSelectedTenantName(''); setSelectedRoomNo('');
      setShowLogSheet(false);
    } catch (e) {
      console.error(e);
      alert('Failed to log visitor');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckout = async (id) => {
    try {
      const timeOut = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      await updateDoc(doc(db, 'visitors', id), {
        status: 'Exited',
        timeOut
      });
      setSelectedVisitor(null);
    } catch (e) {
      console.error(e);
      alert('Failed to check out');
    }
  };

  const handleMarkVisitor = async (id, currentVisitor) => {
    try {
      const now = new Date();
      const timeIn = currentVisitor?.timeIn || now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      await updateDoc(doc(db, 'visitors', id), {
        status: 'Inside',
        marked: true,
        timeIn
      });
      setSelectedVisitor(null);
    } catch (e) {
      console.error(e);
    }
  };

  const selectTenant = (tenant, roomNo) => {
    setSelectedTenantId(tenant.tenantId || tenant.uid || tenant.id);
    setSelectedTenantName(tenant.name);
    setSelectedRoomNo(roomNo);
    setShowRoomSelection(false);
  };

  return (
    <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", backgroundColor: '#f1f5f9', minHeight: '100vh', maxWidth: 480, margin: '0 auto', paddingBottom: 40, position: 'relative' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0c1a2e, #0f2847)', color: 'white', padding: '20px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: 8, borderRadius: '50%', display: 'flex', cursor: 'pointer' }}>
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ color: '#0891b2' }}>shield</span>
            <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", margin: 0, fontSize: '1.4rem', fontWeight: 600 }}>Visitor Log</h1>
          </div>
        </div>
        <button onClick={() => setShowLogSheet(true)} style={{ background: '#0891b2', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', boxShadow: '0 2px 10px rgba(8, 145, 178, 0.4)' }}>
          <span className="material-symbols-outlined">add</span>
        </button>
      </div>

      <div style={{ padding: 20 }}>
        <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", margin: '0 0 16px', fontSize: '1.2rem', color: '#1e293b', textAlign: 'center' }}>{todayDate}</h2>

        {/* Summary Pills */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, overflowX: 'auto', paddingBottom: 8 }}>
          <div style={{ flex: 1, minWidth: 100, background: 'white', padding: '12px 16px', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', textAlign: 'center' }}>
            <p style={{ margin: '0 0 4px', fontSize: '0.75rem', color: '#64748b' }}>Total</p>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a', fontFamily: "'Bricolage Grotesque', sans-serif" }}>{totalToday}</h3>
          </div>
          <div style={{ flex: 1, minWidth: 100, background: '#fff1f2', padding: '12px 16px', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', textAlign: 'center' }}>
            <p style={{ margin: '0 0 4px', fontSize: '0.75rem', color: '#e11d48' }}>Inside Now</p>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#be123c', fontFamily: "'Bricolage Grotesque', sans-serif" }}>{insideNow}</h3>
          </div>
          <div style={{ flex: 1, minWidth: 100, background: '#f0fdf4', padding: '12px 16px', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', textAlign: 'center' }}>
            <p style={{ margin: '0 0 4px', fontSize: '0.75rem', color: '#15803d' }}>Exited</p>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#166534', fontFamily: "'Bricolage Grotesque', sans-serif" }}>{exited}</h3>
          </div>
        </div>

        {/* Visitor List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {visitors.map(visitor => {
            const vName = visitor.name || visitor.visitorName || 'Unknown';
            const vPhone = visitor.phone || visitor.contact || 'N/A';
            const vVisiting = visitor.visiting || visitor.tenantName || 'Unknown';
            return (
            <div key={visitor.id} onClick={() => setSelectedVisitor({ ...visitor, vName, vPhone, vVisiting })} style={{ background: 'white', borderRadius: 16, padding: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', color: '#1e293b', fontFamily: "'Bricolage Grotesque', sans-serif" }}>{vName}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: visitor.status === 'Inside' || visitor.status === 'Exited' ? '#f0fdf4' : (visitor.status === 'Denied' ? '#fef2f2' : '#fef08a'), color: visitor.status === 'Inside' || visitor.status === 'Exited' ? '#16a34a' : (visitor.status === 'Denied' ? '#ef4444' : '#854d0e') }}>
                      {visitor.status || 'Inside'}
                    </span>
                    {!visitor.marked && (
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#d97706', background: '#fffbeb', padding: '2px 8px', borderRadius: 12 }}>Unmarked Entry</span>
                    )}
                  </div>
                </div>
                <div style={{ background: visitor.purpose === 'Delivery' ? '#fef3c7' : '#e0f2fe', color: visitor.purpose === 'Delivery' ? '#d97706' : '#0284c7', padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600 }}>
                  {visitor.purpose || 'Visit'}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: '#f8fafc', borderRadius: 8 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#94a3b8' }}>person</span>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569' }}>Visiting: <strong>{vVisiting}</strong></p>
                {visitor.tenantName && (
                  <span style={{ marginLeft: 'auto', background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: 12, fontSize: '0.7rem', fontWeight: 600 }}>App Linked</span>
                )}
              </div>
            </div>
          )})}
          {visitors.length === 0 && (
            <p style={{ textAlign: 'center', color: '#64748b', marginTop: 20 }}>No visitors logged.</p>
          )}
        </div>
      </div>

      {/* Log Visitor Sheet (Redesigned matching Student App) */}
      {showLogSheet && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', maxWidth: 480, margin: '0 auto' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowLogSheet(false)}></div>
          <div style={{ background: '#f1f5f9', borderTopLeftRadius: 24, borderTopRightRadius: 24, position: 'relative', zIndex: 10, animation: 'slideUp 0.3s ease-out', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            
            <div style={{ background: 'white', padding: '20px 24px', borderTopLeftRadius: 24, borderTopRightRadius: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", margin: 0, fontSize: '1.2rem', color: '#0c1a2e' }}>Register Visitor</h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }} onClick={() => !submitting && setShowLogSheet(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div style={{ padding: 24, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: 6 }}>Visitor Name*</label>
                <input type="text" placeholder="E.g. John Doe" value={visitorName} onChange={(e) => setVisitorName(e.target.value)} style={{ width: '100%', padding: 14, borderRadius: 12, border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              {/* Room Selection Slider Trigger */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: 6 }}>Visiting Room / Tenant*</label>
                <div onClick={() => setShowRoomSelection(true)} style={{ width: '100%', padding: 14, borderRadius: 12, border: '1px solid #cbd5e1', fontSize: '1rem', background: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', boxSizing: 'border-box' }}>
                  <span style={{ color: selectedTenantId ? '#0f172a' : '#94a3b8' }}>
                    {selectedTenantId ? `${selectedTenantName} (Room ${selectedRoomNo})` : 'Select Room & Tenant'}
                  </span>
                  <span className="material-symbols-outlined" style={{ color: '#64748b' }}>chevron_right</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: 6 }}>Visit Date*</label>
                  <input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} style={{ width: '100%', padding: 14, borderRadius: 12, border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none', boxSizing: 'border-box', background: 'white' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: 6 }}>Visit Time</label>
                  <input type="time" value={visitTime} onChange={(e) => setVisitTime(e.target.value)} style={{ width: '100%', padding: 14, borderRadius: 12, border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none', boxSizing: 'border-box', background: 'white' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: 6 }}>Contact Number*</label>
                <input 
                  type="tel" 
                  placeholder="10-digit number" 
                  value={contact} 
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length <= 10) setContact(val);
                  }} 
                  style={{ width: '100%', padding: 14, borderRadius: 12, border: (contact && contact.length !== 10) ? '1px solid #ef4444' : '1px solid #cbd5e1', fontSize: '1rem', outline: 'none', boxSizing: 'border-box', background: (contact && contact.length !== 10) ? '#fef2f2' : 'white' }} 
                />
                {(contact && contact.length !== 10) ? (
                  <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>error</span>
                    Phone number must be exactly 10 digits
                  </p>
                ) : null}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: 6 }}>Purpose of Visit*</label>
                <select value={purpose} onChange={(e) => setPurpose(e.target.value)} style={{ width: '100%', padding: 14, borderRadius: 12, border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none', boxSizing: 'border-box', background: 'white' }}>
                  <option value="Personal Visit">Personal Visit</option>
                  <option value="Delivery">Delivery</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Interview">Interview</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: 6 }}>ID Number (Optional)</label>
                <input type="text" placeholder="ID Number" value={idNo} onChange={(e) => setIdNo(e.target.value)} style={{ width: '100%', padding: 14, borderRadius: 12, border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: 6 }}>ID Card Image</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <label style={{ flex: 1, padding: '16px 8px', background: 'white', border: '1px solid #cbd5e1', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#475569' }}>photo_camera</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>Camera</span>
                    <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={async (e) => { if(e.target.files[0]) setIdCard(await compressImage(e.target.files[0])); }} />
                  </label>
                  <label style={{ flex: 1, padding: '16px 8px', background: 'white', border: '1px solid #cbd5e1', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#475569' }}>image</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>Gallery</span>
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => { if(e.target.files[0]) setIdCard(await compressImage(e.target.files[0])); }} />
                  </label>
                </div>
                {idCard && (
                  <div style={{ background: '#dcfce7', padding: '10px 14px', borderRadius: 10, marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="material-symbols-outlined" style={{ color: '#16a34a', fontSize: 20 }}>check_circle</span>
                    <span style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: 700 }}>ID Card Uploaded Successfully</span>
                  </div>
                )}
              </div>
            </div>

            <div style={{ padding: '16px 24px', background: 'white', borderTop: '1px solid #e2e8f0' }}>
              <button onClick={handleLogVisitor} disabled={submitting || !visitorName || !selectedTenantId || !visitDate || contact.length !== 10} style={{ width: '100%', padding: 16, borderRadius: 12, border: 'none', background: (submitting || !visitorName || !selectedTenantId || !visitDate || contact.length !== 10) ? '#cbd5e1' : '#0891b2', color: 'white', fontSize: '1.05rem', fontWeight: 700, cursor: (submitting || !visitorName || !selectedTenantId || !visitDate || contact.length !== 10) ? 'not-allowed' : 'pointer' }}>
                {submitting ? 'Registering...' : 'Register Visitor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Room & Resident Selection Slide Menu */}
      {showRoomSelection && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', maxWidth: 480, margin: '0 auto' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowRoomSelection(false)}></div>
          <div style={{ background: '#f8fafc', borderTopLeftRadius: 24, borderTopRightRadius: 24, position: 'relative', zIndex: 61, animation: 'slideUp 0.3s ease-out', height: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: 'white', padding: '20px 24px', borderTopLeftRadius: 24, borderTopRightRadius: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", margin: 0, fontSize: '1.2rem', color: '#0c1a2e' }}>Select Room & Tenant</h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }} onClick={() => setShowRoomSelection(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
              {rooms.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#64748b' }}>No rooms found.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {rooms.map(room => {
                    const roomTenants = tenants.filter(t => String(t.roomNo) === String(room.roomNo));
                    if(roomTenants.length === 0) return null; // Don't show rooms with no tenants
                    
                    return (
                      <div key={room.id} style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                        <div style={{ background: '#f1f5f9', padding: '12px 16px', fontWeight: 700, color: '#334155', borderBottom: '1px solid #e2e8f0' }}>
                          Room {room.roomNo}
                        </div>
                        <div>
                          {roomTenants.map((t, index) => (
                            <div key={t.id} onClick={() => selectTenant(t, room.roomNo)} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: index < roomTenants.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer' }}>
                              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7', fontWeight: 700, fontSize: '1.1rem' }}>
                                {t.name.charAt(0).toUpperCase()}
                              </div>
                              <div style={{ flex: 1 }}>
                                <p style={{ margin: 0, fontWeight: 600, color: '#0f172a' }}>{t.name}</p>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>{t.phone}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detailed Visitor Modal */}
      {selectedVisitor && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', maxWidth: 480, margin: '0 auto' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)' }} onClick={() => setSelectedVisitor(null)}></div>
          <div style={{ background: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 0, position: 'relative', zIndex: 11, animation: 'slideUp 0.3s ease-out', maxHeight: '90vh', overflowY: 'auto' }}>
            
            <div style={{ background: '#f8fafc', padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'sticky', top: 0, zIndex: 12 , paddingTop: 'calc(20px + env(safe-area-inset-top, 0px))'}}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.2rem', color: '#0f172a', fontFamily: "'Bricolage Grotesque', sans-serif" }}>{selectedVisitor.vName}</h3>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: selectedVisitor.status === 'Inside' || selectedVisitor.status === 'Exited' ? '#f0fdf4' : (selectedVisitor.status === 'Denied' ? '#fef2f2' : '#fef08a'), color: selectedVisitor.status === 'Inside' || selectedVisitor.status === 'Exited' ? '#16a34a' : (selectedVisitor.status === 'Denied' ? '#ef4444' : '#854d0e') }}>
                  {selectedVisitor.status || 'Inside'}
                </span>
              </div>
              <button onClick={() => setSelectedVisitor(null)} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>
            
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem', color: '#475569' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#64748b' }}>calendar_today</span> 
                  <span>Date: <strong>{selectedVisitor.visitDate || new Date(selectedVisitor.createdAt).toLocaleDateString()}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem', color: '#475569' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#64748b' }}>login</span> 
                  <span>Time In: <strong>{selectedVisitor.timeIn || 'N/A'}</strong></span>
                </div>
                {selectedVisitor.timeOut && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem', color: '#475569' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#64748b' }}>logout</span> 
                    <span>Time Out: <strong>{selectedVisitor.timeOut}</strong></span>
                  </div>
                )}
                {selectedVisitor.vPhone !== 'N/A' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem', color: '#475569' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#64748b' }}>call</span> 
                    <span>Phone: <strong>{selectedVisitor.vPhone}</strong></span>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem', color: '#475569' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#64748b' }}>description</span> 
                  <span>Purpose: <strong>{selectedVisitor.purpose || 'Visit'}</strong></span>
                </div>
                {selectedVisitor.approvedBy && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem', color: '#475569' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#64748b' }}>verified_user</span> 
                    <span>Verified By: <strong>{selectedVisitor.approvedBy}</strong></span>
                  </div>
                )}
              </div>

              {selectedVisitor.idCard && (
                <div style={{ marginBottom: 24 }}>
                  <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', margin: '0 0 8px' }}>ID Card Document</p>
                  <div style={{ width: '100%', height: 200, borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={selectedVisitor.idCard} alt="ID Document" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} onClick={() => window.open(selectedVisitor.idCard, '_blank')} />
                  </div>
                </div>
              )}

              {(selectedVisitor.status === 'Inside' || selectedVisitor.status === 'Pending Exit') && (
                <button 
                  onClick={() => handleCheckout(selectedVisitor.id)}
                  style={{ width: '100%', background: '#ef4444', color: 'white', padding: 16, borderRadius: 12, fontWeight: 700, fontSize: '1rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 12px rgba(239,68,68,0.3)', marginBottom: 12 }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>logout</span> Approve / Mark as Exited (OUT)
                </button>
              )}

              {(!selectedVisitor.marked || selectedVisitor.status === 'Pending Entry') && selectedVisitor.status !== 'Exited' && selectedVisitor.status !== 'Pending Exit' && (
                <button 
                  onClick={() => handleMarkVisitor(selectedVisitor.id, selectedVisitor)}
                  style={{ width: '100%', background: '#10b981', color: 'white', padding: 16, borderRadius: 12, fontWeight: 700, fontSize: '1rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 12px rgba(16,185,129,0.3)', marginBottom: 12 }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>done_all</span> Approve Entry (IN)
                </button>
              )}
              {selectedVisitor.marked && (
                <div style={{ width: '100%', background: '#f0fdf4', color: '#16a34a', padding: 16, borderRadius: 12, fontWeight: 700, fontSize: '1rem', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>verified</span> Verified & Marked
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
