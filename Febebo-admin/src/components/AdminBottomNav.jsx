import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactDOM from 'react-dom';

export default function AdminBottomNav({ activeTab }) {
  const navigate = useNavigate();
  const [showAddMenu, setShowAddMenu] = useState(false);

  const navItems = [
    { tab: 'home',    icon: 'home',            label: 'Dashboard', path: '/admin-dashboard' },
    { tab: 'add', icon: 'person_add', label: 'Add Tenant',   path: '' },
    { tab: 'assign',  icon: 'assignment',      label: 'Assign Work', path: '/assign-work' },
    { tab: 'profile', icon: 'person',          label: 'Profile',   path: '/admin-profile' },
  ];

  return (
    <>
      {/* Backdrop rendered via portal so it escapes the nav's transform containing block */}
      {showAddMenu && ReactDOM.createPortal(
        <>
          <div onClick={() => setShowAddMenu(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', zIndex: 51 }} />
          <div style={{ position: 'fixed', bottom: 'calc(68px + env(safe-area-inset-bottom, 0px))', left: '50%', transform: 'translateX(-75px)', background: '#fff', borderRadius: '16px', padding: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', zIndex: 52, display: 'flex', flexDirection: 'column', gap: '4px', width: '220px', border: '1px solid #e2e8f0' }}>
            <div onClick={() => { setShowAddMenu(false); navigate('/add-tenant'); }} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', borderRadius: '10px', color: '#0f172a', fontWeight: '600', fontSize: '14px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#0891b2' }}>person_add</span>
              Add New Tenant
            </div>
            <div onClick={() => { setShowAddMenu(false); navigate('/already-residence'); }} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', borderRadius: '10px', color: '#0f172a', fontWeight: '600', fontSize: '14px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#0891b2' }}>how_to_reg</span>
              Already a Residence
            </div>
          </div>
        </>,
        document.body
      )}

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
        alignItems: 'stretch',
        padding: '0 0 calc(4px + env(safe-area-inset-bottom, 0px)) 0',
        zIndex: 50,
        boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.03)'
      }}>
        {navItems.map(item => {
          const isActive = activeTab === item.tab || (item.tab === 'add' && showAddMenu);
          return (
            <div 
              key={item.tab} 
              onClick={() => {
                if (item.tab === 'add') {
                  setShowAddMenu(!showAddMenu);
                } else if (item.path && activeTab !== item.tab) {
                  setShowAddMenu(false);
                  navigate(item.path);
                }
              }}
              style={{ 
                display: 'flex', 
                flex: 1,
                flexDirection: 'column', 
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3, 
                paddingTop: '10px',
                paddingBottom: '6px',
                cursor: 'pointer', 
                color: isActive ? '#0891b2' : '#94a3b8', 
                transition: 'color 0.2s',
                position: 'relative',
                borderTop: isActive ? '2.5px solid #0891b2' : '2.5px solid transparent',
              }}
            >
              <span className="material-symbols-outlined" style={{ 
                fontSize: 24, 
                fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" 
              }}>
                {item.icon}
              </span>
              <span style={{ 
                fontSize: 10, 
                fontWeight: isActive ? 700 : 500 
              }}>
                {item.label}
              </span>
            </div>
          );
        })}
      </nav>
    </>
  );
}
