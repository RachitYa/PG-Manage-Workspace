import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Briefcase, Clock, User, Heart, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './BottomNav.css';

const BottomNav = ({ activeNav }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const hasPG = user?.hasPG;

  const handleNav = (path) => {
    navigate(path);
  };

  return (
    <nav className="bottom-nav">
      <div 
        className={`nav-item ${activeNav === 'home' ? 'active' : ''}`} 
        onClick={() => handleNav('/student-dashboard')}
      >
        <Home size={24} />
        <span>Home</span>
      </div>

      {hasPG && (
        <div 
          className={`nav-item ${activeNav === 'explore' ? 'active' : ''}`} 
          onClick={() => handleNav('/explore')}
        >
          <Search size={24} />
          <span>Explore</span>
        </div>
      )}

      {!hasPG && (
        <div 
          className={`nav-item ${activeNav === 'liked' ? 'active' : ''}`} 
          onClick={() => handleNav('/liked-pgs')}
        >
          <Heart size={24} />
          <span>Liked</span>
        </div>
      )}

      <div 
        className={`nav-item ${activeNav === 'profile' ? 'active' : ''}`} 
        onClick={() => handleNav('/profile')}
      >
        <User size={24} />
        <span>My Profile</span>
      </div>
    </nav>
  );
};

export default BottomNav;
