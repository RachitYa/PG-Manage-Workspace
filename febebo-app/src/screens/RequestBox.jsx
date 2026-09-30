import React, { useState, useEffect } from 'react';
import { TopBar } from '../App';
import BottomNav from '../components/BottomNav';
import { Plus, X, FileText } from 'lucide-react';
import { collection, addDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import './RequestBox.css';

const RequestBox = () => {
  const { user } = useAuth();
  const [showPopup, setShowPopup] = useState(false);
  const [requestText, setRequestText] = useState('');
  const [requestDate, setRequestDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState([]);

  const statusConfig = {
    Approved:  { color: 'var(--success)', bg: '#dcfce7' },
    Pending:   { color: '#d97706',        bg: '#fffbeb' },
    Completed: { color: '#0891b2',        bg: '#ecfeff' },
  };

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, 'users', user.uid, 'requests'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() }));
      setRequests(data);
    });
    return () => unsubscribe();
  }, [user]);

  const handleSubmit = async () => {
    if (!requestText.trim()) return;
    setSubmitting(true);
    const now = new Date();
    const newReq = {
      id: `req-${Date.now()}`,
      date: now.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      request: 'Custom Request',
      description: requestText,
      status: 'Pending'
    };
    try {
      await addDoc(collection(db, 'users', user.uid, 'requests'), {
        ...newReq,
        createdAt: now.toISOString()
      });
    } catch (e) {
      console.error('Failed to save request:', e);
    }
    setRequestText('');
    setRequestDate('');
    setShowPopup(false);
    setSubmitting(false);
  };

  return (
    <div className="page-content bg-white pb-nav">
      <TopBar title="Request Box" />

      <div className="complain-list" style={{ paddingTop: '16px' }}>
        {requests.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', gap: '12px' }}>
            <FileText size={48} color="#cbd5e1" />
            <p style={{ color: '#94a3b8', textAlign: 'center', fontSize: '15px', fontWeight: '600', margin: 0 }}>No requests yet</p>
            <p style={{ color: '#cbd5e1', textAlign: 'center', fontSize: '13px', margin: 0 }}>Tap the + button to submit a new request</p>
          </div>
        ) : requests.map(req => {
          const s = statusConfig[req.status] || { color: '#64748b', bg: '#f1f5f9' };
          return (
            <div key={req.id} className="complain-card">
              <div className="complain-header">
                <span className="complain-date" style={{ margin: 0 }}>{req.date}</span>
                <span style={{ fontSize: '12px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px', color: s.color, backgroundColor: s.bg }}>
                  {req.status}
                </span>
              </div>
              <div className="complain-issue" style={{ marginTop: '10px' }}>
                <strong>Request:</strong> {req.request}
              </div>
              <div className="complain-desc">{req.description}</div>
            </div>
          );
        })}
      </div>

      <button className="fab-btn" onClick={() => setShowPopup(true)}>
        <Plus size={24} />
      </button>

      {showPopup && (
        <div className="popup-overlay">
          <div className="popup-card">
            <div className="popup-header">
              <h3>New Request</h3>
              <button className="close-popup" onClick={() => setShowPopup(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="popup-body">
              <input
                type="date"
                className="popup-input"
                value={requestDate}
                onChange={e => setRequestDate(e.target.value)}
              />
              <textarea
                className="popup-textarea"
                placeholder="Describe your request..."
                value={requestText}
                onChange={e => setRequestText(e.target.value)}
              ></textarea>
              <div className="popup-actions">
                <button className="btn-popup-submit" onClick={handleSubmit} disabled={submitting || !requestText.trim()}>
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
                <button className="btn-popup-cancel" onClick={() => setShowPopup(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <BottomNav activeNav="" />
    </div>
  );
};

export default RequestBox;
