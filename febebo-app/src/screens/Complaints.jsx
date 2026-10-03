import React, { useState, useEffect } from 'react';
import { TopBar } from '../App';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import { collection, addDoc, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useLoading } from '../context/LoadingContext';
import { 
  MessageSquarePlus, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  RefreshCw, 
  X, 
  Image as ImageIcon, 
  Send, 
  ChevronRight, 
  Plus, 
  Calendar, 
  User, 
  Home, 
  HelpCircle,
  Eye
} from 'lucide-react';
import './Complaints.css';

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
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const COMMON_INVENTORY_ITEMS = [
  'Bed / Bedframe',
  'Mattress',
  'Study Chair',
  'Study Table',
  'Ceiling Fan',
  'Wardrobe / Cupboard',
  'Room Light / Tube',
  'Geyser',
  'AC Remote',
  'Curtains',
  'Door Lock / Key',
  'Other'
];

const EXCHANGE_REASONS = [
  'Damaged / Broken',
  'Worn Out / Torn',
  'Defective / Not Working',
  'Uncomfortable',
  'Missing Item',
  'Other'
];

const COMPLAINT_CATEGORIES = [
  'Maintenance',
  'Electrical',
  'Plumbing',
  'Carpentry',
  'Cleaning',
  'WiFi / Internet',
  'Other'
];

const Complaints = () => {
  const { user } = useAuth();
  const { startLoading, stopLoading } = useLoading();
  
  // Sub-tabs: 'complaints' | 'requests'
  const [activeSection, setActiveSection] = useState('complaints');

  // Filter chips
  const [complaintFilter, setComplaintFilter] = useState('All'); // All, Active, Pending, Resolved, Closed, Disputed
  const [requestFilter, setRequestFilter] = useState('All');       // All, Pending, Approved, Confirmed, Rejected, Disputed

  // Data lists
  const [myComplaints, setMyComplaints] = useState([]);
  const [myExchangeRequests, setMyExchangeRequests] = useState([]);

  // Form states - Complaint
  const [showComplaintForm, setShowComplaintForm] = useState(false);
  const [priority, setPriority] = useState('Medium');
  const [category, setCategory] = useState('Maintenance');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Form states - Exchange Request
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [selectedItemName, setSelectedItemName] = useState('');
  const [customItemName, setCustomItemName] = useState('');
  const [exchangeReason, setExchangeReason] = useState('Damaged / Broken');
  const [exchangeDescription, setExchangeDescription] = useState('');
  const [exchangePhoto, setExchangePhoto] = useState(null);
  const [isSubmittingExchange, setIsSubmittingExchange] = useState(false);

  // Detail Modal & Photo Lightbox
  const [detailItem, setDetailItem] = useState(null);
  const [photoLightbox, setPhotoLightbox] = useState(null);

  const priorities = ['High', 'Medium', 'Low'];

  // Helper to extract timestamp
  const getTimestamp = (item) => {
    const raw = item?.createdAt || item?.date || item?.timestamp;
    if (!raw) return 0;
    if (raw.toMillis) return raw.toMillis();
    if (typeof raw === 'number') return raw;
    const parsed = new Date(raw).getTime();
    return isNaN(parsed) ? 0 : parsed;
  };

  // Helper to calculate age in days
  const getAgeDays = (item) => {
    const ts = getTimestamp(item);
    if (!ts) return 0;
    const diffMs = Date.now() - ts;
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  };

  // Aging styles logic (Red for >=4 days, Orange for >=2 days, White for <2 days)
  const getAgingStyles = (item) => {
    // Disputed → Purple tint
    if (item.status === 'Disputed') {
      return {
        cardClass: 'card-aging-disputed',
        bg: '#faf5ff',
        border: '#ddd6fe',
        stripe: '#7c3aed',
        tagBg: '#ede9fe',
        tagText: '#5b21b6',
        tagLabel: 'Disputed',
        tagIcon: <AlertTriangle size={12} />,
        titleColor: '#0f172a',
        bodyColor: '#334155'
      };
    }
    // Resolved → Green (awaiting confirmation)
    if (item.status === 'Resolved' || item.status === 'Confirmed') {
      return {
        cardClass: 'card-resolved',
        bg: '#f0fdf4',
        border: '#bbf7d0',
        stripe: '#10b981',
        tagBg: '#dcfce7',
        tagText: '#15803d',
        tagLabel: item.status === 'Confirmed' ? 'You Confirmed' : 'Resolved by Admin',
        tagIcon: <CheckCircle2 size={12} />,
        titleColor: '#0f172a',
        bodyColor: '#334155'
      };
    }
    // Fully closed
    if (item.status === 'Closed') {
      return {
        cardClass: 'card-resolved',
        bg: '#ffffff',
        border: '#e2e8f0',
        stripe: '#10b981',
        tagBg: '#ecfdf5',
        tagText: '#059669',
        tagLabel: 'Closed',
        tagIcon: <CheckCircle2 size={12} />,
        titleColor: '#0f172a',
        bodyColor: '#334155'
      };
    }
    // Rejected
    if (item.status === 'Rejected') {
      return {
        cardClass: 'card-resolved',
        bg: '#ffffff',
        border: '#fecaca',
        stripe: '#ef4444',
        tagBg: '#fee2e2',
        tagText: '#dc2626',
        tagLabel: 'Rejected',
        tagIcon: <X size={12} />,
        titleColor: '#0f172a',
        bodyColor: '#334155'
      };
    }
    // Approved (exchange) - awaiting student confirmation
    if (item.status === 'Approved') {
      return {
        cardClass: 'card-aging-white',
        bg: '#f0fdf4',
        border: '#86efac',
        stripe: '#16a34a',
        tagBg: '#dcfce7',
        tagText: '#15803d',
        tagLabel: 'Approved — Confirm?',
        tagIcon: <CheckCircle2 size={12} />,
        titleColor: '#0f172a',
        bodyColor: '#334155'
      };
    }

    const days = getAgeDays(item);
    if (days >= 4) {
      // Too long -> Red
      return {
        cardClass: 'card-aging-red',
        bg: '#fef2f2',
        border: '#fca5a5',
        stripe: '#dc2626',
        tagBg: '#fee2e2',
        tagText: '#991b1b',
        tagLabel: `${days}d ago · Urgent`,
        tagIcon: <AlertTriangle size={12} />,
        titleColor: '#0f172a',
        bodyColor: '#334155'
      };
    } else if (days >= 2) {
      // More days -> Orange
      return {
        cardClass: 'card-aging-orange',
        bg: '#fff7ed',
        border: '#fdba74',
        stripe: '#ea580c',
        tagBg: '#ffedd5',
        tagText: '#9a3412',
        tagLabel: `${days}d ago`,
        tagIcon: <Clock size={12} />,
        titleColor: '#0f172a',
        bodyColor: '#334155'
      };
    } else {
      // New request -> White
      return {
        cardClass: 'card-aging-white',
        bg: '#ffffff',
        border: '#e2e8f0',
        stripe: '#0891b2',
        tagBg: '#f0fdf4',
        tagText: '#15803d',
        tagLabel: days === 0 ? 'Today · New' : '1d ago · New',
        tagIcon: <Clock size={12} />,
        titleColor: '#0f172a',
        bodyColor: '#334155'
      };
    }
  };

  // Student confirms that admin-resolved complaint is indeed fixed
  const handleConfirmResolution = async (item) => {
    const isExchange = item.type === 'exchange';
    const collection_ = isExchange ? 'inventory_exchange_requests' : 'complaints';
    const newStatus = isExchange ? 'Confirmed' : 'Closed';
    try {
      await updateDoc(doc(db, collection_, item.id), {
        status: newStatus,
        confirmedAt: new Date().toISOString(),
        confirmedBy: user.uid
      });
      if (isExchange) {
        setMyExchangeRequests(prev => prev.map(r => r.id === item.id ? { ...r, status: newStatus } : r));
      } else {
        setMyComplaints(prev => prev.map(c => c.id === item.id ? { ...c, status: newStatus } : c));
      }
      if (detailItem?.id === item.id) {
        setDetailItem(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      console.error('Error confirming resolution:', err);
      alert('Could not save confirmation. Please try again.');
    }
  };

  // Student disputes that the issue was NOT actually resolved
  const handleDisputeResolution = async (item) => {
    const reason = window.prompt('Why are you disputing this resolution? (optional):', 'Issue was not fully fixed');
    if (reason === null) return; // user cancelled
    const isExchange = item.type === 'exchange';
    const collection_ = isExchange ? 'inventory_exchange_requests' : 'complaints';
    try {
      await updateDoc(doc(db, collection_, item.id), {
        status: 'Disputed',
        disputeNote: reason || 'Disputed by student',
        disputedAt: new Date().toISOString(),
        disputedBy: user.uid
      });
      if (isExchange) {
        setMyExchangeRequests(prev => prev.map(r => r.id === item.id ? { ...r, status: 'Disputed', disputeNote: reason } : r));
      } else {
        setMyComplaints(prev => prev.map(c => c.id === item.id ? { ...c, status: 'Disputed', disputeNote: reason } : c));
      }
      if (detailItem?.id === item.id) {
        setDetailItem(prev => ({ ...prev, status: 'Disputed', disputeNote: reason }));
      }
    } catch (err) {
      console.error('Error disputing resolution:', err);
      alert('Could not save dispute. Please try again.');
    }
  };

  useEffect(() => {
    if (!user?.uid) return;
    
    // 1. Fetch user's complaints
    const complaintsRef = collection(db, 'complaints');
    const qComp = query(complaintsRef, where('tenantId', '==', user.uid));
    
    const unsubscribeComp = onSnapshot(qComp, (snapshot) => {
      const comps = [];
      snapshot.forEach(doc => {
        comps.push({ id: doc.id, ...doc.data(), type: 'complaint' });
      });
      // Systematic sorting: Newest strictly on top
      comps.sort((a, b) => getTimestamp(b) - getTimestamp(a));
      setMyComplaints(comps);
    }, (err) => {
      console.error('Error fetching complaints:', err);
    });

    // 2. Fetch user's inventory exchange requests
    const exchangeRef = collection(db, 'inventory_exchange_requests');
    const qEx = query(exchangeRef, where('tenantId', '==', user.uid));

    const unsubscribeEx = onSnapshot(qEx, (snapshot) => {
      const exs = [];
      snapshot.forEach(doc => {
        exs.push({ id: doc.id, ...doc.data(), type: 'exchange' });
      });
      // Systematic sorting: Newest strictly on top
      exs.sort((a, b) => getTimestamp(b) - getTimestamp(a));
      setMyExchangeRequests(exs);
    }, (err) => {
      console.error('Error fetching exchange requests:', err);
    });

    return () => {
      unsubscribeComp();
      unsubscribeEx();
    };
  }, [user]);

  const handleComplaintSubmit = async (e) => {
    e.preventDefault();
    if (!priority || !title.trim() || !description.trim()) return;
    if (!user?.uid) return;

    startLoading();
    try {
      const complaintsRef = collection(db, 'complaints');
      const adminId = user.subscribedPG?.adminId || user.subscribedPG?.pgId || user.subscribedPG?.pgOwnerUid || 'primary';
      const pgId = user.subscribedPG?.adminId ? user.subscribedPG?.pgId : 'primary';
      const room = user?.subscribedPG?.roomNo || user?.profileData?.roomDetails?.roomNumber || 'Unassigned';
      const phone = user?.phone || user?.profileData?.personalDetails?.phone || user?.profileData?.personalDetails?.fatherPhone || 'Unknown';
      const now = new Date();

      await addDoc(complaintsRef, {
        adminId,
        pgId,
        tenantId: user.uid,
        tenantName: user.name || user?.profileData?.name || 'Student',
        tenant: user.uid,
        room,
        phone,
        title: title.trim(),
        desc: description.trim(),
        priority,
        category,
        status: 'Active',
        date: now.toISOString(),
        createdAt: now.toISOString()
      });

      // Notify Admin
      await addDoc(collection(db, 'notifications'), {
        adminId,
        pgId,
        tenantId: user.uid,
        tenant: user.name || 'Student',
        room,
        phone,
        type: 'Complaint',
        category: 'complaint',
        title: `Complaint: ${title.trim()}`,
        desc: description.trim(),
        priority,
        status: 'Active',
        unread: true,
        createdAt: now.toISOString(),
        date: now.toISOString()
      });
      
      setPriority('Medium');
      setCategory('Maintenance');
      setTitle('');
      setDescription('');
      setShowComplaintForm(false);
    } catch (err) {
      console.error('Error submitting complaint:', err);
      alert('Failed to submit complaint. Please try again.');
    } finally {
      stopLoading();
    }
  };

  const handleExchangePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressImage(file, 800);
      setExchangePhoto(base64);
    } catch (err) {
      console.error('Error processing photo:', err);
      alert('Could not attach photo. Please try a different image.');
    }
  };

  const handleExchangeSubmit = async (e) => {
    e.preventDefault();
    const finalItem = selectedItemName === 'Other' ? customItemName.trim() : (selectedItemName || customItemName.trim());
    if (!finalItem) {
      alert('Please specify the item name.');
      return;
    }
    if (!exchangeDescription.trim()) {
      alert('Please describe the condition or reason for exchange.');
      return;
    }
    if (!user?.uid) return;

    setIsSubmittingExchange(true);
    startLoading();
    try {
      const adminId = user.subscribedPG?.adminId || user.subscribedPG?.pgId || user.subscribedPG?.pgOwnerUid || 'primary';
      const pgId = user.subscribedPG?.adminId ? user.subscribedPG?.pgId : 'primary';
      const roomNo = user?.subscribedPG?.roomNo || user?.profileData?.roomDetails?.roomNumber || 'Unassigned';
      const bedNo = user?.subscribedPG?.bedNo || 'N/A';
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

      const exPayload = {
        tenantId: user.uid,
        tenantName: user.name || user?.profileData?.name || 'Student',
        tenantPhone: user.phone || user?.profileData?.personalDetails?.phone || '',
        roomNo,
        bedNo,
        adminId,
        pgId,
        pgName: user?.subscribedPG?.pgName || 'PG',
        itemId: finalItem,
        itemName: finalItem,
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
        adminId,
        pgId,
        tenantId: user.uid,
        tenant: user.name || 'Student',
        room: roomNo,
        phone: user.phone || '',
        type: 'Inventory Exchange',
        category: 'inventory',
        desc: `Exchange request for ${finalItem} (${exchangeReason}): ${exchangeDescription.trim()}`,
        reason: exchangeReason,
        itemName: finalItem,
        itemId: finalItem,
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
        request: `Exchange: ${finalItem}`,
        description: `${exchangeReason} - ${exchangeDescription.trim()}`,
        type: 'Inventory Exchange',
        itemName: finalItem,
        reason: exchangeReason,
        photo: exchangePhoto || null,
        status: 'Pending',
        createdAt: now.toISOString()
      });

      setSelectedItemName('');
      setCustomItemName('');
      setExchangeDescription('');
      setExchangePhoto(null);
      setShowExchangeModal(false);
      setActiveSection('requests');
    } catch (err) {
      console.error('Error submitting exchange request:', err);
      alert('Failed to submit exchange request.');
    } finally {
      setIsSubmittingExchange(false);
      stopLoading();
    }
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'Pending':   return { color: '#d97706', bg: '#fef3c7', icon: <Clock size={13} /> };
      case 'Active':    return { color: '#0284c7', bg: '#e0f2fe', icon: <AlertCircle size={13} /> };
      case 'Resolved':  return { color: '#16a34a', bg: '#dcfce7', icon: <CheckCircle2 size={13} /> };
      case 'Approved':  return { color: '#16a34a', bg: '#dcfce7', icon: <CheckCircle2 size={13} /> };
      case 'Confirmed': return { color: '#059669', bg: '#ecfdf5', icon: <CheckCircle2 size={13} /> };
      case 'Closed':    return { color: '#059669', bg: '#ecfdf5', icon: <CheckCircle2 size={13} /> };
      case 'Rejected':  return { color: '#dc2626', bg: '#fee2e2', icon: <X size={13} /> };
      case 'Disputed':  return { color: '#7c3aed', bg: '#ede9fe', icon: <AlertTriangle size={13} /> };
      default:          return { color: '#64748b', bg: '#f1f5f9', icon: <Clock size={13} /> };
    }
  };

  const formatDate = (raw) => {
    if (!raw) return '';
    const d = new Date(raw);
    if (isNaN(d.getTime())) return String(raw);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute:'2-digit' });
  };

  // Filtered lists
  const filteredComplaints = myComplaints.filter(c => {
    if (complaintFilter === 'All') return true;
    return c.status === complaintFilter;
  });

  const filteredExchangeRequests = myExchangeRequests.filter(r => {
    if (requestFilter === 'All') return true;
    return r.status === requestFilter;
  });

  return (
    <div className="page-content bg-white pb-nav">
      <TopBar title="Complaints & Requests" />
      
      <div className="complaints-container">
        
        {/* Sub-tab Navigation */}
        <div className="subtab-segmented-control">
          <button 
            type="button"
            className={`subtab-btn ${activeSection === 'complaints' ? 'active' : ''}`}
            onClick={() => setActiveSection('complaints')}
          >
            <MessageSquarePlus size={16} />
            <span>Complaints</span>
            <span className="subtab-count-pill">{myComplaints.length}</span>
          </button>
          <button 
            type="button"
            className={`subtab-btn ${activeSection === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveSection('requests')}
          >
            <RefreshCw size={16} />
            <span>Requests</span>
            <span className="subtab-count-pill">{myExchangeRequests.length}</span>
          </button>
        </div>

        {/* ═════════════════ COMPLAINTS TAB ═════════════════ */}
        {activeSection === 'complaints' && (
          <div className="section-content-wrapper">
            
            {/* Quick action bar */}
            <div className="quick-action-bar">
              <button 
                type="button"
                className="btn-toggle-action"
                onClick={() => setShowComplaintForm(!showComplaintForm)}
              >
                {showComplaintForm ? <X size={18} /> : <Plus size={18} />}
                <span>{showComplaintForm ? 'Hide Form' : 'Raise New Complaint'}</span>
              </button>
            </div>

            {/* Complaint Form (Expandable) */}
            {showComplaintForm && (
              <div className="complaint-form-card">
                <div className="card-header-basic">
                  <MessageSquarePlus size={20} color="#0891b2" />
                  <h4>Raise a New Complaint</h4>
                </div>
                <p className="form-subtitle">Let us know what's wrong and our team will resolve it.</p>
                
                <form onSubmit={handleComplaintSubmit} className="complaint-form">
                  <div className="form-group">
                    <label>Priority</label>
                    <div className="category-chip-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                      {priorities.map(p => (
                        <button
                          type="button"
                          key={p}
                          className={`category-chip ${priority === p ? 'active' : ''}`}
                          onClick={() => setPriority(p)}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Category</label>
                    <div className="category-chip-scroll">
                      {COMPLAINT_CATEGORIES.map(cat => (
                        <button
                          type="button"
                          key={cat}
                          className={`category-chip-sm ${category === cat ? 'active' : ''}`}
                          onClick={() => setCategory(cat)}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Issue Title</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="E.g., Leaking tap, Tube light not working"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Description</label>
                    <textarea 
                      className="form-input" 
                      placeholder="Describe the issue in detail..."
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      style={{ minHeight: '85px', resize: 'none' }}
                      required
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="btn-primary" 
                    disabled={!priority || !title.trim() || !description.trim()}
                  >
                    Submit Complaint
                  </button>
                </form>
              </div>
            )}

            {/* Status Filter Chips */}
            <div className="filter-chips-bar">
              {['All', 'Active', 'Pending', 'Resolved', 'Closed', 'Disputed'].map(tab => (
                <button
                  key={tab}
                  type="button"
                  className={`filter-pill ${complaintFilter === tab ? 'active' : ''} ${tab === 'Disputed' ? 'filter-pill-disputed' : ''}`}
                  onClick={() => setComplaintFilter(tab)}
                >
                  {tab}
                  {tab !== 'All' && (
                    <span className="pill-badge">
                      {myComplaints.filter(c => c.status === tab).length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Complaints List */}
            <div className="complaints-history-section">
              <div className="section-header-row">
                <h3 className="section-title">My Complaints</h3>
                <span className="text-muted-count">{filteredComplaints.length} tickets</span>
              </div>
              
              {filteredComplaints.length === 0 ? (
                <div className="empty-history">
                  <p>No complaints found under "{complaintFilter}".</p>
                </div>
              ) : (
                <div className="history-list">
                  {filteredComplaints.map(comp => {
                    const aging = getAgingStyles(comp);
                    const statusConf = getStatusConfig(comp.status);
                    
                    return (
                      <div 
                        key={comp.id} 
                        className={`history-card ${aging.cardClass}`}
                        style={{ 
                          backgroundColor: aging.bg, 
                          borderColor: aging.border,
                          borderLeftColor: aging.stripe,
                          cursor: 'pointer'
                        }}
                        onClick={() => setDetailItem(comp)}
                      >
                        <div className="history-header">
                          <div className="header-tags-cluster">
                            <span 
                              className="history-category" 
                              style={{ 
                                background: comp.priority === 'High' ? '#fee2e2' : comp.priority === 'Medium' ? '#fef3c7' : '#dcfce7', 
                                color: comp.priority === 'High' ? '#ef4444' : comp.priority === 'Medium' ? '#d97706' : '#16a34a' 
                              }}
                            >
                              {comp.priority} Priority
                            </span>
                            
                            {/* Age badge */}
                            <span 
                              className="aging-chip" 
                              style={{ backgroundColor: aging.tagBg, color: aging.tagText }}
                            >
                              {aging.tagIcon}
                              <span>{aging.tagLabel}</span>
                            </span>
                          </div>

                          <div 
                            className="status-badge" 
                            style={{ backgroundColor: statusConf.bg, color: statusConf.color }}
                          >
                            {statusConf.icon}
                            <span>{comp.status}</span>
                          </div>
                        </div>

                        {/* Title - explicitly dark slate for guaranteed visibility */}
                        <h5 className="history-title" style={{ color: aging.titleColor }}>
                          {comp.title}
                        </h5>

                        {/* Description - explicitly dark slate */}
                        <p className="history-desc" style={{ color: aging.bodyColor }}>
                          {comp.desc}
                        </p>

                        {/* Dispute note if disputed */}
                        {comp.status === 'Disputed' && comp.disputeNote && (
                          <div className="disputed-note-box">
                            <AlertTriangle size={14} color="#7c3aed" />
                            <span>Your dispute: <strong>{comp.disputeNote}</strong></span>
                          </div>
                        )}

                        {/* ⚡ Confirmation CTA — only when admin marked Resolved */}
                        {comp.status === 'Resolved' && (
                          <div className="confirmation-cta-bar" onClick={e => e.stopPropagation()}>
                            <p className="confirmation-cta-label">
                              🔔 Admin marked this as resolved. Did they fix it?
                            </p>
                            <div className="confirmation-cta-actions">
                              <button
                                type="button"
                                className="btn-confirm-yes"
                                onClick={() => handleConfirmResolution(comp)}
                              >
                                <CheckCircle2 size={14} /> Yes, it's fixed!
                              </button>
                              <button
                                type="button"
                                className="btn-confirm-no"
                                onClick={() => handleDisputeResolution(comp)}
                              >
                                <X size={14} /> No, dispute
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="history-footer">
                          <span>{formatDate(comp.date || comp.createdAt)}</span>
                          <span className="view-details-hint">
                            Details <ChevronRight size={14} />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ═════════════════ REQUESTS (EXCHANGE) TAB ═════════════════ */}
        {activeSection === 'requests' && (
          <div className="section-content-wrapper">
            
            {/* Quick action bar */}
            <div className="quick-action-bar">
              <button 
                type="button"
                className="btn-toggle-action"
                onClick={() => setShowExchangeModal(true)}
              >
                <Plus size={18} />
                <span>Request Item Exchange</span>
              </button>
            </div>

            {/* Status Filter Chips */}
            <div className="filter-chips-bar">
              {['All', 'Pending', 'Approved', 'Confirmed', 'Rejected', 'Disputed'].map(tab => (
                <button
                  key={tab}
                  type="button"
                  className={`filter-pill ${requestFilter === tab ? 'active' : ''} ${tab === 'Disputed' ? 'filter-pill-disputed' : ''}`}
                  onClick={() => setRequestFilter(tab)}
                >
                  {tab}
                  {tab !== 'All' && (
                    <span className="pill-badge">
                      {myExchangeRequests.filter(r => r.status === tab).length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Exchange Requests List */}
            <div className="complaints-history-section">
              <div className="section-header-row">
                <h3 className="section-title">Item Exchange Requests</h3>
                <span className="text-muted-count">{filteredExchangeRequests.length} requests</span>
              </div>
              
              {filteredExchangeRequests.length === 0 ? (
                <div className="empty-history">
                  <RefreshCw size={32} color="#94a3b8" style={{ marginBottom: 8, opacity: 0.6 }} />
                  <p>No exchange requests found under "{requestFilter}".</p>
                  <button 
                    type="button"
                    className="btn-outline-action"
                    onClick={() => setShowExchangeModal(true)}
                    style={{ marginTop: 12 }}
                  >
                    Request an Item Exchange
                  </button>
                </div>
              ) : (
                <div className="history-list">
                  {filteredExchangeRequests.map(req => {
                    const aging = getAgingStyles(req);
                    const statusConf = getStatusConfig(req.status);
                    
                    return (
                      <div 
                        key={req.id} 
                        className={`history-card ${aging.cardClass}`}
                        style={{ 
                          backgroundColor: aging.bg, 
                          borderColor: aging.border,
                          borderLeftColor: aging.stripe,
                          cursor: 'pointer'
                        }}
                        onClick={() => setDetailItem(req)}
                      >
                        <div className="history-header">
                          <div className="header-tags-cluster">
                            <span className="history-category" style={{ background: '#ecfeff', color: '#0891b2' }}>
                              🔄 Inventory Exchange
                            </span>

                            {/* Age badge */}
                            <span 
                              className="aging-chip" 
                              style={{ backgroundColor: aging.tagBg, color: aging.tagText }}
                            >
                              {aging.tagIcon}
                              <span>{aging.tagLabel}</span>
                            </span>
                          </div>

                          <div 
                            className="status-badge" 
                            style={{ backgroundColor: statusConf.bg, color: statusConf.color }}
                          >
                            {statusConf.icon}
                            <span>{req.status}</span>
                          </div>
                        </div>

                        {/* Item Name - High Contrast */}
                        <h5 className="history-title" style={{ color: aging.titleColor }}>
                          Exchange: {req.itemName}
                        </h5>

                        <div className="reason-sub-badge">
                          <span>Reason: <strong>{req.reason}</strong></span>
                        </div>

                        {/* Description - High Contrast */}
                        <p className="history-desc" style={{ color: aging.bodyColor }}>
                          {req.description}
                        </p>

                        {/* Rejection Note Preview if rejected */}
                        {req.status === 'Rejected' && req.rejectionReason && (
                          <div className="rejection-box-sm">
                            <strong>Admin Note:</strong> {req.rejectionReason}
                          </div>
                        )}

                        {/* Dispute note if disputed */}
                        {req.status === 'Disputed' && req.disputeNote && (
                          <div className="disputed-note-box">
                            <AlertTriangle size={14} color="#7c3aed" />
                            <span>Your dispute: <strong>{req.disputeNote}</strong></span>
                          </div>
                        )}

                        {/* ⚡ Confirmation CTA — when admin approved exchange */}
                        {req.status === 'Approved' && (
                          <div className="confirmation-cta-bar" onClick={e => e.stopPropagation()}>
                            <p className="confirmation-cta-label">
                              🔔 Admin approved your exchange. Did you receive the replacement?
                            </p>
                            <div className="confirmation-cta-actions">
                              <button
                                type="button"
                                className="btn-confirm-yes"
                                onClick={() => handleConfirmResolution(req)}
                              >
                                <CheckCircle2 size={14} /> Yes, received!
                              </button>
                              <button
                                type="button"
                                className="btn-confirm-no"
                                onClick={() => handleDisputeResolution(req)}
                              >
                                <X size={14} /> No, dispute
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="history-footer">
                          <span>{formatDate(req.createdAt || req.date)}</span>
                          <span className="view-details-hint">
                            Details <ChevronRight size={14} />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

      </div>

      {/* ═════════════════ NEW EXCHANGE REQUEST MODAL ═════════════════ */}
      {showExchangeModal && (
        <div className="modal-backdrop-blur" onClick={() => setShowExchangeModal(false)}>
          <div className="modal-card-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-sheet-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="modal-icon-badge" style={{ background: '#ecfeff', color: '#0891b2' }}>
                  <RefreshCw size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>Request Item Exchange</h4>
                  <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Submit a request to replace an allotted item</p>
                </div>
              </div>
              <button 
                type="button" 
                className="modal-close-btn" 
                onClick={() => setShowExchangeModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleExchangeSubmit} className="modal-sheet-body">
              {/* Item Selection */}
              <div className="form-group">
                <label>Select Item to Exchange</label>
                <select 
                  className="form-input form-select"
                  value={selectedItemName}
                  onChange={e => setSelectedItemName(e.target.value)}
                  required
                >
                  <option value="" disabled>Choose an item...</option>
                  {COMMON_INVENTORY_ITEMS.map(it => (
                    <option key={it} value={it}>{it}</option>
                  ))}
                </select>
              </div>

              {selectedItemName === 'Other' && (
                <div className="form-group">
                  <label>Specify Custom Item Name</label>
                  <input 
                    type="text"
                    className="form-input"
                    placeholder="E.g., Window latch, Balcony stool"
                    value={customItemName}
                    onChange={e => setCustomItemName(e.target.value)}
                    required
                  />
                </div>
              )}

              {/* Reason */}
              <div className="form-group">
                <label>Reason for Exchange</label>
                <select 
                  className="form-input form-select"
                  value={exchangeReason}
                  onChange={e => setExchangeReason(e.target.value)}
                  required
                >
                  {EXCHANGE_REASONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="form-group">
                <label>Detailed Description</label>
                <textarea 
                  className="form-input"
                  placeholder="Explain the defect, tear, or issue requiring exchange..."
                  value={exchangeDescription}
                  onChange={e => setExchangeDescription(e.target.value)}
                  style={{ minHeight: '80px', resize: 'none' }}
                  required
                />
              </div>

              {/* Optional Photo Attachment */}
              <div className="form-group">
                <label>Attach Condition Photo (Optional)</label>
                <label className="photo-upload-container">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleExchangePhotoSelect} 
                    style={{ display: 'none' }} 
                  />
                  {exchangePhoto ? (
                    <div className="photo-preview-box">
                      <img src={exchangePhoto} alt="Item Condition" />
                      <button 
                        type="button" 
                        className="photo-remove-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setExchangePhoto(null);
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="photo-placeholder-box">
                      <ImageIcon size={22} color="#0891b2" />
                      <span>Tap to upload damage/condition photo</span>
                    </div>
                  )}
                </label>
              </div>

              <div className="modal-sheet-actions">
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setShowExchangeModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={isSubmittingExchange || (!selectedItemName && !customItemName) || !exchangeDescription.trim()}
                >
                  {isSubmittingExchange ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════ DETAILED VIEW MODAL ═════════════════ */}
      {detailItem && (
        <div className="modal-backdrop-blur" onClick={() => setDetailItem(null)}>
          <div className="modal-card-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-sheet-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div 
                  className="modal-icon-badge" 
                  style={{ 
                    background: detailItem.type === 'exchange' ? '#ecfeff' : '#eff6ff', 
                    color: detailItem.type === 'exchange' ? '#0891b2' : '#2563eb' 
                  }}
                >
                  {detailItem.type === 'exchange' ? <RefreshCw size={20} /> : <MessageSquarePlus size={20} />}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
                    {detailItem.type === 'exchange' ? 'Exchange Request Details' : 'Complaint Details'}
                  </h4>
                  <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                    Submitted on {formatDate(detailItem.createdAt || detailItem.date)}
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                className="modal-close-btn" 
                onClick={() => setDetailItem(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-sheet-body">
              
              {/* Status & Priority Row */}
              <div className="detail-meta-row">
                <div className="detail-meta-item">
                  <span className="detail-label">Status</span>
                  {(() => {
                    const c = getStatusConfig(detailItem.status);
                    return (
                      <span className="status-badge" style={{ background: c.bg, color: c.color, display: 'inline-flex', marginTop: 4 }}>
                        {c.icon}
                        <span>{detailItem.status}</span>
                      </span>
                    );
                  })()}
                </div>

                {detailItem.priority && (
                  <div className="detail-meta-item">
                    <span className="detail-label">Priority</span>
                    <span 
                      className="priority-badge-lg"
                      style={{
                        background: detailItem.priority === 'High' ? '#fee2e2' : detailItem.priority === 'Medium' ? '#fef3c7' : '#dcfce7',
                        color: detailItem.priority === 'High' ? '#ef4444' : detailItem.priority === 'Medium' ? '#d97706' : '#16a34a'
                      }}
                    >
                      {detailItem.priority}
                    </span>
                  </div>
                )}

                <div className="detail-meta-item">
                  <span className="detail-label">Age</span>
                  {(() => {
                    const aging = getAgingStyles(detailItem);
                    return (
                      <span 
                        className="aging-chip" 
                        style={{ backgroundColor: aging.tagBg, color: aging.tagText, display: 'inline-flex', marginTop: 4 }}
                      >
                        {aging.tagIcon}
                        <span>{aging.tagLabel}</span>
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Title / Item Name */}
              <div className="detail-card-section">
                <span className="detail-label">
                  {detailItem.type === 'exchange' ? 'Item Requested for Exchange' : 'Issue Title'}
                </span>
                <p className="detail-main-title">
                  {detailItem.type === 'exchange' ? detailItem.itemName : detailItem.title}
                </p>
              </div>

              {/* Reason / Category if available */}
              {(detailItem.reason || detailItem.category) && (
                <div className="detail-card-section">
                  <span className="detail-label">
                    {detailItem.type === 'exchange' ? 'Reason for Exchange' : 'Category'}
                  </span>
                  <p className="detail-sub-title">
                    {detailItem.reason || detailItem.category}
                  </p>
                </div>
              )}

              {/* Full Description */}
              <div className="detail-card-section">
                <span className="detail-label">Description</span>
                <div className="detail-description-box">
                  {detailItem.description || detailItem.desc || 'No description provided.'}
                </div>
              </div>

              {/* Assigned Staff (for complaints) */}
              {detailItem.type === 'complaint' && (
                <div className="detail-card-section">
                  <span className="detail-label">Assigned Staff</span>
                  <p className="detail-sub-title" style={{ color: detailItem.assignedTo ? '#0f172a' : '#64748b' }}>
                    {detailItem.assignedTo ? `Assigned to ${detailItem.assignedTo}` : 'Pending assignment by admin'}
                  </p>
                </div>
              )}

              {/* Rejection Note (if rejected) */}
              {detailItem.status === 'Rejected' && detailItem.rejectionReason && (
                <div className="rejection-box-alert">
                  <AlertCircle size={18} color="#dc2626" />
                  <div>
                    <strong>Admin Rejection Reason:</strong>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#991b1b' }}>
                      {detailItem.rejectionReason}
                    </p>
                  </div>
                </div>
              )}

              {/* Dispute note (if disputed by student) */}
              {detailItem.status === 'Disputed' && (
                <div style={{ background: '#faf5ff', border: '1.5px solid #ddd6fe', borderRadius: 14, padding: 14, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <AlertTriangle size={18} color="#7c3aed" style={{ flexShrink: 0 }} />
                  <div>
                    <strong style={{ fontSize: 13, color: '#5b21b6', display: 'block', marginBottom: 4 }}>You Disputed This</strong>
                    <p style={{ margin: 0, fontSize: 13, color: '#5b21b6' }}>
                      {detailItem.disputeNote || 'You have disputed this — admin will review and follow up.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Confirmed banner */}
              {(detailItem.status === 'Confirmed' || detailItem.status === 'Closed') && (
                <div style={{ background: '#ecfdf5', border: '1.5px solid #a7f3d0', borderRadius: 14, padding: 14 }}>
                  <strong style={{ fontSize: 13, color: '#059669', display: 'block', marginBottom: 2 }}>✓ Resolved & Confirmed</strong>
                  <p style={{ margin: 0, fontSize: 13, color: '#065f46' }}>You confirmed this was resolved. This case is now closed.</p>
                </div>
              )}

              {/* Photo preview (if attached) */}
              {detailItem.photo && (
                <div className="detail-card-section">
                  <span className="detail-label">Attached Photo</span>
                  <div 
                    className="detail-photo-wrapper"
                    onClick={() => setPhotoLightbox(detailItem.photo)}
                  >
                    <img src={detailItem.photo} alt="Item Condition" />
                    <div className="photo-zoom-overlay">
                      <Eye size={18} />
                      <span>Tap to view full image</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Issued Replacement Photo (from Admin/Manager) */}
              {detailItem.issuedItemPhoto && (
                <div className="detail-card-section" style={{ background: '#f0fdf4', padding: 12, borderRadius: 12, border: '1.5px solid #bbf7d0' }}>
                  <span className="detail-label" style={{ color: '#166534', fontWeight: 800 }}>📸 New Issued Replacement Item</span>
                  <div 
                    className="detail-photo-wrapper"
                    onClick={() => setPhotoLightbox(detailItem.issuedItemPhoto)}
                    style={{ marginTop: 6 }}
                  >
                    <img src={detailItem.issuedItemPhoto} alt="Issued Item" />
                    <div className="photo-zoom-overlay">
                      <Eye size={18} />
                      <span>Tap to view issued item</span>
                    </div>
                  </div>
                  {detailItem.issuedItemNote && (
                    <p style={{ margin: '8px 0 0', fontSize: 12, color: '#14532d', fontWeight: 600 }}>Note: {detailItem.issuedItemNote}</p>
                  )}
                </div>
              )}

              {/* Confirmation CTA in detail modal */}
              {(detailItem.status === 'Resolved' || detailItem.status === 'Approved') && (
                <div className="confirmation-cta-bar">
                  <p className="confirmation-cta-label">
                    🔔 {detailItem.type === 'exchange'
                      ? 'Admin approved your exchange. Did you receive the replacement item?'
                      : 'Admin marked this as resolved. Was the issue actually fixed?'}
                  </p>
                  <div className="confirmation-cta-actions">
                    <button
                      type="button"
                      className="btn-confirm-yes"
                      onClick={() => handleConfirmResolution(detailItem)}
                    >
                      <CheckCircle2 size={15} />
                      {detailItem.type === 'exchange' ? 'Yes, received!' : 'Yes, it\'s fixed!'}
                    </button>
                    <button
                      type="button"
                      className="btn-confirm-no"
                      onClick={() => handleDisputeResolution(detailItem)}
                    >
                      <X size={15} /> No, dispute
                    </button>
                  </div>
                </div>
              )}

              <button 
                type="button" 
                className="btn-primary" 
                onClick={() => setDetailItem(null)}
                style={{ marginTop: 8 }}
              >
                Close Details
              </button>

            </div>
          </div>
        </div>
      )}

      {/* ═════════════════ PHOTO LIGHTBOX MODAL ═════════════════ */}
      {photoLightbox && (
        <div className="modal-backdrop-blackout" onClick={() => setPhotoLightbox(null)}>
          <div className="lightbox-content" onClick={e => e.stopPropagation()}>
            <button 
              type="button" 
              className="lightbox-close-btn" 
              onClick={() => setPhotoLightbox(null)}
            >
              <X size={24} color="#ffffff" />
            </button>
            <img src={photoLightbox} alt="Fullscreen condition inspection" className="lightbox-image" />
          </div>
        </div>
      )}

      <BottomNav activeNav="" />
    </div>
  );
};

export default Complaints;
