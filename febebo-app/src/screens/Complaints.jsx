import React, { useState, useEffect } from 'react';
import { TopBar } from '../App';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import { collection, addDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useLoading } from '../context/LoadingContext';
import { MessageSquarePlus, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import './Complaints.css';

const Complaints = () => {
  const { user } = useAuth();
  const { startLoading, stopLoading } = useLoading();
  
  const [priority, setPriority] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  const [myComplaints, setMyComplaints] = useState([]);
  
  const priorities = ['High', 'Medium', 'Low'];

  useEffect(() => {
    if (!user?.subscribedPG?.pgId || !user?.uid) return;
    
    // Fetch user's complaints
    const complaintsRef = collection(db, 'complaints');
    const q = query(complaintsRef, where('tenantId', '==', user.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const comps = [];
      snapshot.forEach(doc => {
        comps.push({ id: doc.id, ...doc.data() });
      });
      // Sort by timestamp descending client side
      comps.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      setMyComplaints(comps);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!priority || !title || !description) return;
    if (!user?.subscribedPG?.pgId || !user?.uid) return;

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
        title,
        desc: description,
        priority,
        status: 'Active',
        date: new Date().toISOString()
      });
      
      setPriority('');
      setTitle('');
      setDescription('');
    } catch (err) {
      console.error('Error submitting complaint:', err);
    } finally {
      stopLoading();
    }
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'Pending': return { color: '#d97706', bg: '#fef3c7', icon: <Clock size={14} /> };
      case 'Active': return { color: '#0284c7', bg: '#e0f2fe', icon: <AlertCircle size={14} /> };
      case 'Closed': return { color: '#16a34a', bg: '#dcfce7', icon: <CheckCircle2 size={14} /> };
      default: return { color: '#64748b', bg: '#f1f5f9', icon: <Clock size={14} /> };
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute:'2-digit' });
  };

  return (
    <div className="page-content bg-white pb-nav">
      <TopBar title="Complaints" />
      
      <div className="complaints-container">
        
        {/* Submission Form */}
        <div className="complaint-form-card">
          <div className="card-header-basic">
            <MessageSquarePlus size={20} color="#0891b2" />
            <h4>Raise a New Complaint</h4>
          </div>
          <p className="form-subtitle">Let us know what's wrong and we'll fix it.</p>
          
          <form onSubmit={handleSubmit} className="complaint-form">
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
              <label>Issue Title</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="E.g., Leaking tap"
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
                style={{ minHeight: '80px', resize: 'none' }}
                required
              />
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              disabled={!priority || !title || !description}
            >
              Submit Complaint
            </button>
          </form>
        </div>

        {/* History Section */}
        <div className="complaints-history-section">
          <h3 className="section-title">My Complaints</h3>
          
          {myComplaints.length === 0 ? (
            <div className="empty-history">
              <p>You haven't raised any complaints yet.</p>
            </div>
          ) : (
            <div className="history-list">
              {myComplaints.map(comp => {
                const statusConf = getStatusConfig(comp.status);
                return (
                  <div key={comp.id} className="history-card">
                    <div className="history-header">
                      <span className="history-category" style={{ background: comp.priority === 'High' ? '#fee2e2' : comp.priority === 'Medium' ? '#fef3c7' : '#dcfce7', color: comp.priority === 'High' ? '#ef4444' : comp.priority === 'Medium' ? '#d97706' : '#16a34a' }}>
                        {comp.priority} Priority
                      </span>
                      <div 
                        className="status-badge" 
                        style={{ backgroundColor: statusConf.bg, color: statusConf.color }}
                      >
                        {statusConf.icon}
                        <span>{comp.status}</span>
                      </div>
                    </div>
                    <h5 className="history-title">{comp.title}</h5>
                    <p className="history-desc">{comp.desc}</p>
                    <div className="history-footer">
                      <span>{formatDate(comp.date)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
      <BottomNav activeNav="" />
    </div>
  );
};

export default Complaints;
