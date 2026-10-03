import React, { useState, useEffect, useRef } from 'react';
import { TopBar } from '../App';
import BottomNav from '../components/BottomNav';
import { Plus, X, FileText, ArrowLeftRight, Camera, Image as ImageIcon, Loader2, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { collection, addDoc, query, orderBy, onSnapshot, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import './RequestBox.css';

const compressImage = (file, maxWidth = 800) => {
  return new Promise((resolve, reject) => {
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
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const RequestBox = () => {
  const { user } = useAuth();
  const [showPopup, setShowPopup] = useState(false);
  const [requestCategory, setRequestCategory] = useState('general'); // 'general' | 'exchange'
  
  // General Request fields
  const [requestText, setRequestText] = useState('');
  const [requestDate, setRequestDate] = useState('');
  
  // Exchange fields
  const [inventoryList, setInventoryList] = useState([]);
  const [selectedExchangeItem, setSelectedExchangeItem] = useState(null);
  const [customItemName, setCustomItemName] = useState('');
  const [exchangeReason, setExchangeReason] = useState('Damaged / Broken');
  const [exchangeDescription, setExchangeDescription] = useState('');
  const [exchangePhoto, setExchangePhoto] = useState(null);
  const [photoPreviewModal, setPhotoPreviewModal] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState([]);
  const [tenantData, setTenantData] = useState(null);
  const fileInputRef = useRef(null);

  const statusConfig = {
    Approved:  { color: '#16a34a', bg: '#dcfce7', label: 'Approved — Confirm?' },
    Confirmed: { color: '#059669', bg: '#ecfdf5', label: '✓ Confirmed Received' },
    Disputed:  { color: '#7c3aed', bg: '#faf5ff', label: '⚠️ Disputed' },
    Pending:   { color: '#d97706', bg: '#fffbeb', label: 'Pending Review' },
    Completed: { color: '#0891b2', bg: '#ecfeff', label: 'Completed' },
    Rejected:  { color: '#ef4444', bg: '#fee2e2', label: 'Declined' },
  };

  const handleConfirmExchange = async (req) => {
    if (!user?.uid || !req) return;
    try {
      const nowIso = new Date().toISOString();
      if (req.docId) {
        await updateDoc(doc(db, 'users', user.uid, 'requests', req.docId), {
          status: 'Confirmed',
          confirmedAt: nowIso
        });
      }
      if (req.exchangeRequestId) {
        await updateDoc(doc(db, 'inventory_exchange_requests', req.exchangeRequestId), {
          status: 'Confirmed',
          confirmedAt: nowIso,
          confirmedBy: user.uid
        });
      }
      alert('Thank you! You have confirmed receipt of the replacement item.');
    } catch (err) {
      console.error('Error confirming exchange:', err);
      alert('Could not update status. Please try again.');
    }
  };

  const handleDisputeExchange = async (req) => {
    if (!user?.uid || !req) return;
    const reason = window.prompt('Why are you disputing this exchange? (e.g. Replacement item not received or defective):', 'Replacement item not received');
    if (reason === null) return;
    try {
      const nowIso = new Date().toISOString();
      if (req.docId) {
        await updateDoc(doc(db, 'users', user.uid, 'requests', req.docId), {
          status: 'Disputed',
          disputeNote: reason || 'Disputed by student',
          disputedAt: nowIso
        });
      }
      if (req.exchangeRequestId) {
        await updateDoc(doc(db, 'inventory_exchange_requests', req.exchangeRequestId), {
          status: 'Disputed',
          disputeNote: reason || 'Disputed by student',
          disputedAt: nowIso,
          disputedBy: user.uid
        });
      }
      alert('Dispute recorded. PG Admin will review your dispute.');
    } catch (err) {
      console.error('Error disputing exchange:', err);
      alert('Could not record dispute. Please try again.');
    }
  };

  useEffect(() => {
    if (!user?.uid) return;
    
    // Listen to user requests
    const q = query(collection(db, 'users', user.uid, 'requests'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() }));
      setRequests(data);
    });

    // Fetch tenant doc for inventory info
    getDoc(doc(db, 'tenants', user.uid)).then(d => {
      if (d.exists()) setTenantData(d.data());
    }).catch(() => {});

    // Listen to allocated inventory
    const invQ = query(collection(db, 'inventory_allocations'), where('targetId', '==', user.uid));
    const unsubInv = onSnapshot(invQ, (snapshot) => {
      if (!snapshot.empty) {
        const items = snapshot.docs.map(d => ({
          id: d.id,
          name: d.data().itemName || 'Item',
          qty: d.data().qty || 1,
          conditionImage: d.data().conditionImage || null
        }));
        setInventoryList(items);
      } else {
        // Fallback
        const invMap = user?.subscribedPG?.inventory || tenantData?.inventory;
        if (invMap && typeof invMap === 'object' && !Array.isArray(invMap)) {
          const fallback = Object.entries(invMap).map(([k, img]) => ({
            id: k,
            name: k.replace('inv-custom-', '').replace(/_/g, ' ').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            qty: 1,
            conditionImage: typeof img === 'string' ? img : null
          }));
          setInventoryList(fallback);
        }
      }
    });

    return () => {
      unsubscribe();
      unsubInv();
    };
  }, [user]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const compressed = await compressImage(file);
        setExchangePhoto(compressed);
      } catch (err) {
        console.error('Failed to compress photo', err);
        alert('Could not process photo.');
      }
    }
  };

  const handleGeneralSubmit = async () => {
    if (!requestText.trim()) return;
    setSubmitting(true);
    const now = new Date();
    const newReq = {
      id: `req-${Date.now()}`,
      date: requestDate ? new Date(requestDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : now.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      request: 'Custom Request',
      description: requestText.trim(),
      status: 'Pending',
      type: 'General',
      createdAt: now.toISOString()
    };
    try {
      await addDoc(collection(db, 'users', user.uid, 'requests'), newReq);
      setRequestText('');
      setRequestDate('');
      setShowPopup(false);
    } catch (e) {
      console.error('Failed to save request:', e);
      alert('Failed to save request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExchangeSubmit = async () => {
    const finalItemName = selectedExchangeItem?.id === 'other'
      ? customItemName.trim()
      : (selectedExchangeItem?.name || '');

    if (!finalItemName) {
      alert('Please select or specify an item to exchange.');
      return;
    }
    if (!exchangeDescription.trim()) {
      alert('Please provide reason and description for exchange.');
      return;
    }

    setSubmitting(true);
    try {
      const aId = user?.subscribedPG?.adminId || tenantData?.adminId || user?.subscribedPG?.pgId || 'primary';
      const rawPgId = user?.subscribedPG?.pgId || tenantData?.pgId;
      const pId = (!rawPgId || rawPgId === aId) ? 'primary' : rawPgId;
      const pgName = user?.subscribedPG?.pgName || tenantData?.pgName || '';
      const roomNo = user?.subscribedPG?.roomNo || tenantData?.roomNo || 'N/A';
      const bedNo = user?.subscribedPG?.bedNo || tenantData?.bedNo || 'N/A';
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

      const exPayload = {
        tenantId: user.uid,
        tenantName: user.name || 'Student',
        tenantPhone: user.phone || '',
        roomNo: roomNo,
        bedNo: bedNo,
        adminId: aId,
        pgId: pId,
        pgName: pgName,
        itemId: selectedExchangeItem?.id || finalItemName,
        itemName: finalItemName,
        reason: exchangeReason,
        description: exchangeDescription.trim(),
        photo: exchangePhoto || null,
        status: 'Pending',
        createdAt: now.toISOString(),
        date: dateStr
      };

      // 1. Add to inventory_exchange_requests
      const exDocRef = await addDoc(collection(db, 'inventory_exchange_requests'), exPayload);

      // 2. Add notification for PG Admin
      await addDoc(collection(db, 'notifications'), {
        adminId: aId,
        pgId: pId,
        tenantId: user.uid,
        tenant: user.name || 'Student',
        room: roomNo,
        phone: user.phone || '',
        type: 'Inventory Exchange',
        category: 'inventory',
        desc: `Exchange request for ${finalItemName} (${exchangeReason}): ${exchangeDescription.trim()}`,
        reason: exchangeReason,
        itemName: finalItemName,
        itemId: selectedExchangeItem?.id || finalItemName,
        photo: exchangePhoto || null,
        exchangeRequestId: exDocRef.id,
        resolved: false,
        createdAt: now.toISOString(),
        date: now.toISOString()
      });

      // 3. Add to user's requests timeline
      await addDoc(collection(db, 'users', user.uid, 'requests'), {
        id: `req-${Date.now()}`,
        date: dateStr,
        request: `Exchange: ${finalItemName}`,
        description: `${exchangeReason} - ${exchangeDescription.trim()}`,
        type: 'Inventory Exchange',
        itemId: selectedExchangeItem?.id || finalItemName,
        itemName: finalItemName,
        reason: exchangeReason,
        photo: exchangePhoto || null,
        exchangeRequestId: exDocRef.id,
        status: 'Pending',
        createdAt: now.toISOString()
      });

      setShowPopup(false);
      setSelectedExchangeItem(null);
      setCustomItemName('');
      setExchangeDescription('');
      setExchangePhoto(null);
      alert('Exchange request submitted successfully! PG Admin will review it.');
    } catch (err) {
      console.error('Error submitting exchange request:', err);
      alert('Failed to submit exchange request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-content bg-white pb-nav">
      <TopBar title="Request Box" />

      {/* ── TOP ACTION BAR ── */}
      <div style={{ padding: '14px 16px 6px', background: '#fff' }}>
        <button
          onClick={() => { setShowPopup(true); setRequestCategory('general'); }}
          style={{
            width: '100%',
            padding: '13px 18px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #0891b2, #0e7490)',
            color: '#fff',
            border: 'none',
            fontSize: '14px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(8, 145, 178, 0.25)',
            fontFamily: 'inherit'
          }}
        >
          <Plus size={18} />
          <span>New Request or Item Exchange</span>
        </button>
      </div>

      <div className="complain-list" style={{ paddingTop: '10px' }}>
        {requests.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', gap: '12px' }}>
            <FileText size={48} color="#cbd5e1" />
            <p style={{ color: '#94a3b8', textAlign: 'center', fontSize: '15px', fontWeight: '600', margin: 0 }}>No requests yet</p>
            <p style={{ color: '#cbd5e1', textAlign: 'center', fontSize: '13px', margin: 0 }}>Tap the + button to submit a new request or exchange</p>
          </div>
        ) : requests.map(req => {
          const s = statusConfig[req.status] || { color: '#64748b', bg: '#f1f5f9' };
          const isExchange = req.type === 'Inventory Exchange' || req.request?.startsWith('Exchange:');
          return (
            <div key={req.docId || req.id} className="complain-card" style={{ borderLeft: isExchange && req.status === 'Approved' ? '4px solid #16a34a' : (req.status === 'Disputed' ? '4px solid #7c3aed' : '1px solid #e2e8f0') }}>
              <div className="complain-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="complain-date" style={{ margin: 0 }}>{req.date}</span>
                  {isExchange && (
                    <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: '#ecfeff', color: '#0891b2', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ArrowLeftRight size={10} /> ITEM EXCHANGE
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '12px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px', color: s.color, backgroundColor: s.bg }}>
                  {s.label || req.status}
                </span>
              </div>
              <div className="complain-issue" style={{ marginTop: '10px' }}>
                <strong>Request:</strong> {req.request}
              </div>
              <div className="complain-desc">{req.description}</div>

              {/* Student's damage photo proof */}
              {req.photo && (
                <div style={{ marginTop: '10px' }}>
                  <img
                    src={req.photo}
                    alt="Damage proof"
                    onClick={() => setPhotoPreviewModal(req.photo)}
                    style={{ width: '64px', height: '64px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #e2e8f0', cursor: 'pointer' }}
                    title="Click to zoom"
                  />
                  <span style={{ fontSize: '11px', color: '#0891b2', marginLeft: '8px', fontWeight: 600, cursor: 'pointer' }} onClick={() => setPhotoPreviewModal(req.photo)}>
                    View damage photo
                  </span>
                </div>
              )}

              {/* Admin/Manager New Issued Replacement Item Photo */}
              {req.issuedItemPhoto && (
                <div style={{ marginTop: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#166534', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ShieldCheck size={14} /> New Replacement Item Issued
                    </span>
                    <span style={{ fontSize: '11px', color: '#0891b2', fontWeight: 700, cursor: 'pointer' }} onClick={() => setPhotoPreviewModal(req.issuedItemPhoto)}>
                      View Full
                    </span>
                  </div>
                  <img
                    src={req.issuedItemPhoto}
                    alt="Issued replacement item"
                    onClick={() => setPhotoPreviewModal(req.issuedItemPhoto)}
                    style={{ width: '70px', height: '70px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #86efac', cursor: 'pointer' }}
                  />
                  {req.issuedItemNote && (
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#14532d', fontWeight: 600 }}>Note: {req.issuedItemNote}</p>
                  )}
                </div>
              )}

              {/* ⚡ Student Confirmation Action Banner (when Approved) */}
              {isExchange && req.status === 'Approved' && (
                <div style={{ marginTop: '12px', background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)', border: '1.5px solid #86efac', borderRadius: '12px', padding: '12px' }}>
                  <p style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 700, color: '#15803d', lineHeight: 1.4 }}>
                    🔔 Admin approved this exchange. Have you received the replacement item in good condition?
                  </p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => handleConfirmExchange(req)}
                      style={{ flex: 1, padding: '9px 12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <CheckCircle2 size={16} /> Confirm Received
                    </button>
                    <button
                      onClick={() => handleDisputeExchange(req)}
                      style={{ flex: 1, padding: '9px 12px', background: '#faf5ff', color: '#7c3aed', border: '1.5px solid #ddd6fe', borderRadius: '10px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <X size={16} /> Dispute / Not Fixed
                    </button>
                  </div>
                </div>
              )}

              {/* Confirmed State Banner */}
              {isExchange && req.status === 'Confirmed' && (
                <div style={{ marginTop: '10px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={16} color="#059669" />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#065f46' }}>
                    You confirmed receipt of replacement {req.confirmedAt ? `(${new Date(req.confirmedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})` : ''}
                  </span>
                </div>
              )}

              {/* Disputed State Banner */}
              {isExchange && req.status === 'Disputed' && (
                <div style={{ marginTop: '10px', background: '#faf5ff', border: '1px solid #ddd6fe', borderRadius: '10px', padding: '8px 12px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <AlertTriangle size={16} color="#7c3aed" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#6d28d9', display: 'block' }}>Disputed by You</span>
                    <span style={{ fontSize: '12px', color: '#5b21b6' }}>{req.disputeNote || 'Admin will review and follow up.'}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button className="fab-btn" onClick={() => { setShowPopup(true); setRequestCategory('general'); }}>
        <Plus size={24} />
      </button>

      {/* ── CREATE NEW REQUEST POPUP ── */}
      {showPopup && (
        <div className="popup-overlay">
          <div className="popup-card" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="popup-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>Create Request</h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>Choose request type below</p>
              </div>
              <button className="close-popup" onClick={() => setShowPopup(false)}>
                <X size={20} />
              </button>
            </div>

            {/* Tab switch */}
            <div style={{ display: 'flex', gap: '8px', padding: '12px 16px 0', borderBottom: '1px solid #f1f5f9' }}>
              <button
                type="button"
                onClick={() => setRequestCategory('general')}
                style={{
                  flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
                  background: requestCategory === 'general' ? '#0f172a' : '#f1f5f9',
                  color: requestCategory === 'general' ? 'white' : '#64748b',
                  fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: '0.2s'
                }}
              >
                General Request
              </button>
              <button
                type="button"
                onClick={() => setRequestCategory('exchange')}
                style={{
                  flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
                  background: requestCategory === 'exchange' ? '#0891b2' : '#f1f5f9',
                  color: requestCategory === 'exchange' ? 'white' : '#64748b',
                  fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: '0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}
              >
                <ArrowLeftRight size={14} /> Item Exchange
              </button>
            </div>

            <div className="popup-body">
              {requestCategory === 'general' ? (
                <>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>Target Date (Optional)</label>
                  <input
                    type="date"
                    className="popup-input"
                    value={requestDate}
                    onChange={e => setRequestDate(e.target.value)}
                  />
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>Request Details</label>
                  <textarea
                    className="popup-textarea"
                    placeholder="Describe your request..."
                    value={requestText}
                    onChange={e => setRequestText(e.target.value)}
                  ></textarea>

                  <div className="popup-actions">
                    <button className="btn-popup-submit" onClick={handleGeneralSubmit} disabled={submitting || !requestText.trim()}>
                      {submitting ? 'Submitting...' : 'Submit Request'}
                    </button>
                    <button className="btn-popup-cancel" onClick={() => setShowPopup(false)}>Cancel</button>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Item selector */}
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#0891b2', display: 'block', marginBottom: '4px' }}>Allotted Item to Exchange</label>
                    <select
                      value={selectedExchangeItem?.id || ''}
                      onChange={(e) => {
                        if (e.target.value === 'other') {
                          setSelectedExchangeItem({ id: 'other', name: 'Other Item' });
                        } else {
                          const found = inventoryList.find(i => String(i.id) === e.target.value);
                          if (found) setSelectedExchangeItem(found);
                        }
                      }}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: 'white', fontSize: '14px', fontWeight: 600, outline: 'none' }}
                    >
                      <option value="" disabled>Select item to exchange...</option>
                      {inventoryList.map(item => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                      <option value="other">➕ Other Item (Specify)</option>
                    </select>

                    {selectedExchangeItem?.id === 'other' && (
                      <input
                        type="text"
                        placeholder="Enter item name (e.g. Chair, Mirror)..."
                        value={customItemName}
                        onChange={e => setCustomItemName(e.target.value)}
                        style={{ width: '100%', marginTop: '6px', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #0891b2', fontSize: '14px', outline: 'none' }}
                      />
                    )}
                  </div>

                  {/* Reason selector */}
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#0891b2', display: 'block', marginBottom: '4px' }}>Reason</label>
                    <select
                      value={exchangeReason}
                      onChange={e => setExchangeReason(e.target.value)}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: 'white', fontSize: '14px', fontWeight: 600, outline: 'none' }}
                    >
                      <option value="Damaged / Broken">💥 Damaged / Broken</option>
                      <option value="Defective / Not Working">⚠️ Defective / Not Working</option>
                      <option value="Uncomfortable / Poor Quality">🪑 Uncomfortable / Poor Quality</option>
                      <option value="Normal Wear & Tear">⏳ Normal Wear & Tear</option>
                      <option value="Missing / Incomplete">❓ Missing / Incomplete</option>
                      <option value="Other">📝 Other Reason</option>
                    </select>
                  </div>

                  {/* Description */}
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#0891b2', display: 'block', marginBottom: '4px' }}>Describe Damage / Problem</label>
                    <textarea
                      className="popup-textarea"
                      placeholder="Explain what is broken or why it needs exchange..."
                      value={exchangeDescription}
                      onChange={e => setExchangeDescription(e.target.value)}
                      style={{ minHeight: '80px' }}
                    ></textarea>
                  </div>

                  {/* Photo Proof */}
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#0891b2', display: 'block', marginBottom: '4px' }}>Photo Proof (Optional)</label>
                    {exchangePhoto ? (
                      <div style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', border: '1px solid #a5f3fc' }}>
                        <img src={exchangePhoto} alt="Proof" style={{ width: '100%', maxHeight: '140px', objectFit: 'cover' }} />
                        <button
                          type="button"
                          onClick={() => setExchangePhoto(null)}
                          style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer' }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        style={{ border: '1.5px dashed #cbd5e1', borderRadius: '10px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', background: '#f8fafc' }}
                      >
                        <Camera size={18} color="#0891b2" />
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Attach damage photo</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handlePhotoUpload} style={{ display: 'none' }} />
                  </div>

                  <div className="popup-actions" style={{ marginTop: '8px' }}>
                    <button
                      className="btn-popup-submit"
                      style={{ background: '#0891b2' }}
                      onClick={handleExchangeSubmit}
                      disabled={submitting || (!selectedExchangeItem && !customItemName) || !exchangeDescription.trim()}
                    >
                      {submitting ? 'Submitting...' : 'Submit Exchange'}
                    </button>
                    <button className="btn-popup-cancel" onClick={() => setShowPopup(false)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── IMAGE LIGHTBOX ── */}
      {photoPreviewModal && (
        <div
          onClick={() => setPhotoPreviewModal(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}
        >
          <img
            src={photoPreviewModal}
            alt="Preview"
            style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setPhotoPreviewModal(null)}
            style={{ position: 'absolute', top: '24px', right: '24px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <X size={22} />
          </button>
        </div>
      )}

      <BottomNav activeNav="" />
    </div>
  );
};

export default RequestBox;
