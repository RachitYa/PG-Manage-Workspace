import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, HeadphonesIcon, Star, User } from 'lucide-react';
import './BottomNav.css';

const BottomNav = ({ activeNav }) => {
  const navigate = useNavigate();

  return (
    <nav className="bottom-nav">
      <div 
        className={`nav-item ${activeNav === 'home' ? 'active' : ''}`} 
        onClick={() => navigate('/')}
      >
        <Home size={24} />
        <span>Home</span>
      </div>
      <div 
        className={`nav-item ${activeNav === 'help' ? 'active' : ''}`} 
        onClick={() => navigate('/help')}
      >
        <HeadphonesIcon size={24} />
        <span>Help</span>
      </div>
      <div 
        className={`nav-item ${activeNav === 'review' ? 'active' : ''}`} 
        onClick={() => navigate('/review')}
      >
        <Star size={24} />
        <span>Review</span>
      </div>
      <div 
        className={`nav-item ${activeNav === 'profile' ? 'active' : ''}`} 
        onClick={() => navigate('/profile')}
      >
        <User size={24} />
        <span>My Profile</span>
      </div>
    </nav>
  );
};

export default BottomNav;
