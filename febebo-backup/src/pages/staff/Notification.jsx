import React from 'react';
import TopBar from '../../components/TopBar';
import { Bell } from 'lucide-react';

const Notification = () => {
  const notifications = [
    { id: 1, title: 'Food Request', desc: 'Food request accepted by cooked', read: false },
    { id: 2, title: 'Congratulations', desc: 'Successfully register on febebo', read: false },
    { id: 3, title: 'Food Request', desc: 'Food request accepted by cooked', read: true },
    { id: 4, title: 'Food Request', desc: 'Food request accepted by cooked', read: true },
  ];

  return (
    <div className="app-container">
      <TopBar title="Notification" />
      
      <div className="padding-16 page-content">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {notifications.map((notif) => (
            <div key={notif.id} className="card" style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', opacity: notif.read ? 0.6 : 1 }}>
              <div style={{ 
                width: '40px', height: '40px', borderRadius: '50%', 
                backgroundColor: notif.read ? 'var(--border-color)' : 'var(--primary)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 
              }}>
                <Bell size={20} color="white" />
              </div>
              <div>
                <div className="font-semibold" style={{ marginBottom: '4px' }}>{notif.title}</div>
                <div className="text-muted" style={{ fontSize: '12px', marginBottom: '4px' }}>{notif.desc}</div>
                <div className="text-primary" style={{ fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}>View more...</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Notification;
