import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminBottomNav({ activeTab }) {
  const navigate = useNavigate();

  const navItems = [
    { tab: 'home',    icon: 'home',            label: 'Dashboard', path: '/admin-dashboard' },
    { tab: 'pending', icon: 'pending_actions', label: 'Pending',   path: '/staff-work' },
    { tab: 'review',  icon: 'rate_review',     label: 'Review',    path: '/complain' },
    { tab: 'profile', icon: 'person',          label: 'Profile',   path: '/my-profile' },
  ];

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: 480,
      background: 'white',
      borderTop: '1px solid #e2e8f0',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      padding: '8px 0 env(safe-area-inset-bottom, 20px) 0',
      zIndex: 50,
      boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.03)'
    }}>
      {navItems.map(item => (
        <div 
          key={item.tab} 
          onClick={() => {
            if (item.path && activeTab !== item.tab) {
              navigate(item.path);
            }
          }}
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            gap: 4, 
            padding: '4px 16px', 
            cursor: 'pointer', 
            color: activeTab === item.tab ? '#0891b2' : '#94a3b8', 
            transition: 'color 0.2s' 
          }}
        >
          <span className="material-symbols-outlined" style={{ 
            fontSize: 24, 
            fontVariationSettings: activeTab === item.tab ? "'FILL' 1" : "'FILL' 0" 
          }}>
            {item.icon}
          </span>
          <span style={{ 
            fontSize: 10, 
            fontWeight: activeTab === item.tab ? 700 : 500 
          }}>
            {item.label}
          </span>
        </div>
      ))}
    </nav>
  );
}
