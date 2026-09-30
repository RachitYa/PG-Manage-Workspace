import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Bell } from 'lucide-react';
import './TopBar.css'; // Will create this

const TopBar = ({ title, showBack = true }) => {
  const navigate = useNavigate();

  return (
    <header className="topbar">
      <div className="topbar-left">
        {showBack && (
          <button className="icon-btn" onClick={() => navigate(-1)}>
            <ChevronLeft size={24} color="var(--primary)" />
          </button>
        )}
        <h1 className="topbar-title text-primary">{title}</h1>
      </div>
      <button className="icon-btn">
        <Bell size={24} color="var(--text-muted)" />
      </button>
    </header>
  );
};

export default TopBar;
