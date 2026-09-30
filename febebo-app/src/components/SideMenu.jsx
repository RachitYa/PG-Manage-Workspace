import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Home, 
  Utensils, 
  User, 
  MessageSquareWarning, 
  FileText, 
  Star, 
  HeadphonesIcon, 
  LogOut,
  X,
  AlertTriangle
} from 'lucide-react';
import './SideMenu.css';

const SideMenu = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleNavigation = (path) => {
    onClose();
    if(path) navigate(path);
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = async () => {
    setLoggingOut(true);
    await logout();
    setShowLogoutConfirm(false);
    onClose();
    navigate('/');
  };

  const handleCancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const menuItems = [
    { name: 'Rating', icon: <Star size={20} />, path: '/rating', requirePG: true },
    { name: 'Help', icon: <HeadphonesIcon size={20} />, path: '/help', alwaysShow: true },
  ];

  const visibleItems = menuItems.filter(item => item.alwaysShow || (item.requirePG && user?.hasPG));

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`side-menu-backdrop ${isOpen ? 'open' : ''}`} 
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className={`side-menu-drawer ${isOpen ? 'open' : ''}`}>
        
        <div className="side-menu-header">
          <img 
            src={user?.profileData?.kyc?.profilePhoto || user?.photoURL || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100&h=100"} 
            alt="Profile" 
            className="profile-img"
          />
          <div className="profile-info">
            <h3 className="profile-name">{user?.name || 'Student'}</h3>
            <p className="profile-role" style={{ textTransform: 'capitalize' }}>{typeof user?.profileData?.occupation === 'string' ? user.profileData.occupation : (user?.profileData?.occupation?.type || 'User')}</p>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="side-menu-content">
          {visibleItems.map((item, index) => (
            <div 
              key={index} 
              className={`menu-item ${item.active ? 'active' : ''}`}
              onClick={() => handleNavigation(item.path)}
            >
              <div className="menu-icon">{item.icon}</div>
              <span className="menu-text">{item.name}</span>
            </div>
          ))}

          {/* Locked items teaser when no PG */}
          {!user?.hasPG && (
            <div style={{ margin: '8px 0', padding: '12px 16px', background: '#f0f9ff', borderRadius: '12px', border: '1px dashed #bae6fd' }}>
              <p style={{ fontSize: '12px', color: '#0891b2', fontWeight: '600', margin: 0 }}>🔒 Subscribe to a PG to unlock Food, Account, Complaints, and more!</p>
            </div>
          )}

          <div className="menu-divider"></div>

          <div 
            className="menu-item logout-item"
            onClick={handleLogoutClick}
          >
            <div className="menu-icon"><LogOut size={20} /></div>
            <span className="menu-text">Logout</span>
          </div>
        </div>

      </div>

      {/* Logout Confirmation Popup */}
      {showLogoutConfirm && (
        <div className="logout-overlay">
          <div className="logout-popup">
            {/* Icon */}
            <div className="logout-icon-wrap">
              <AlertTriangle size={32} color="#ef4444" />
            </div>

            {/* Text */}
            <h2 className="logout-title">Log Out?</h2>
            <p className="logout-subtitle">
              Are you sure you want to log out of your febebo account?
            </p>

            {/* Buttons */}
            <div className="logout-actions">
              <button
                className="btn-logout-cancel"
                onClick={handleCancelLogout}
                disabled={loggingOut}
              >
                Cancel
              </button>
              <button
                className="btn-logout-confirm"
                onClick={handleConfirmLogout}
                disabled={loggingOut}
              >
                {loggingOut ? 'Logging out...' : 'Yes, Log Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SideMenu;
