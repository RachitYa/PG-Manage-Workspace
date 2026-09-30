import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopBar } from '../App';
import BottomNav from '../components/BottomNav';
import { Bell, Wallet, Info } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import './Notifications.css';

const Notifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, 'users', user.uid, 'notifications'), 
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotifications(notifs);
      setLoading(false);
      
      // Automatically mark unread notifications as read when they are viewed
      const unreadNotifs = notifs.filter(n => n.unread);
      if (unreadNotifs.length > 0) {
        const batch = writeBatch(db);
        unreadNotifs.forEach(n => {
          batch.update(doc(db, 'users', user.uid, 'notifications', n.id), { unread: false });
        });
        batch.commit().catch(err => console.error("Error marking notifications as read: ", err));
      }
    }, (error) => {
      console.error("Error fetching notifications: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const getIcon = (type) => {
    switch (type) {
      case 'warning':
        return <Wallet size={24} />;
      case 'primary':
        return <Bell size={24} />;
      default:
        return <Info size={24} />;
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  };

  return (
    <div className="notifications-page">
      <TopBar title="Notifications" showBack={true} />
      
      <div className="notifications-content">
        {loading ? (
          <div className="empty-notifications">
            <p style={{ color: '#94a3b8', fontSize: '14px', fontWeight: '500' }}>Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="empty-notifications">
            <Bell size={48} strokeWidth={1.5} />
            <h3>No notifications yet</h3>
            <p>We'll let you know when something important happens.</p>
          </div>
        ) : (
          notifications.map(notif => (
            <div key={notif.id} className={`notification-card ${notif.unread ? 'unread' : ''}`}>
              <div className={`notif-icon-wrap ${notif.type || 'info'}`}>
                {getIcon(notif.type)}
              </div>
              <div className="notif-content">
                <h4 className="notif-title">{notif.title}</h4>
                <p className="notif-desc">{notif.desc}</p>
                <span className="notif-time">{formatTime(notif.createdAt)}</span>
                
                {notif.action === 'VISIT_DASHBOARD' && (
                  <button 
                    onClick={() => navigate('/student-dashboard')}
                    style={{
                      marginTop: '10px',
                      padding: '8px 16px',
                      background: '#d3a429',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: '700',
                      fontSize: '14px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(211,164,41,0.3)',
                      alignSelf: 'flex-start'
                    }}
                  >
                    Visit Dashboard
                  </button>
                )}
              </div>
              {notif.unread && <span className="unread-dot" />}
            </div>
          ))
        )}
      </div>

      <BottomNav activeNav="" />
    </div>
  );
};

export default Notifications;
