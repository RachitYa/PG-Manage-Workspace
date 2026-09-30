import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';

const StudentSplash = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Navigate to signup after 2.5 seconds
    const timer = setTimeout(() => {
      navigate('/signup');
    }, 2500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div style={{ 
      width: '100%', 
      height: '100vh', 
      overflow: 'hidden', 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center', 
      background: 'linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)' 
    }}>
      <style>
        {`
          @keyframes pulse-logo {
            0% { transform: scale(0.95); opacity: 0.8; }
            50% { transform: scale(1.05); opacity: 1; }
            100% { transform: scale(0.95); opacity: 0.8; }
          }
        `}
      </style>
      <img 
        src={logo} 
        alt="Febebo Loading" 
        style={{ 
          width: '180px', 
          height: 'auto', 
          objectFit: 'contain',
          animation: 'pulse-logo 2s ease-in-out infinite'
        }} 
      />
    </div>
  );
};

export default StudentSplash;
