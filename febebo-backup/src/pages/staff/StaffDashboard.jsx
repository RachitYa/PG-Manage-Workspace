import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Fingerprint, CalendarDays, Wallet, ClipboardList, Clock, Bell, UtensilsCrossed, Package, UserPlus } from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import './StaffDashboard.css';

const StaffDashboard = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState('kitchen'); // Default fallback
  const [name, setName] = useState('');

  useEffect(() => {
    const savedRole = localStorage.getItem('febebo_staff_role');
    const savedName = localStorage.getItem('febebo_staff_name');
    if (savedRole) setRole(savedRole.toLowerCase());
    if (savedName) setName(savedName);
  }, []);

  const getDashboardItems = () => {
    // Universal items
    const baseItems = [
      { id: 'attendance', label: 'Attendance', icon: <Fingerprint size={32} className="text-primary" />, path: '/attendance' },
      { id: 'apply-leave', label: 'Apply Leave', icon: <CalendarDays size={32} className="text-primary" />, path: '/apply-leave' },
      { id: 'salary', label: 'Salary', icon: <Wallet size={32} className="text-primary" />, path: '/salary' },
      { id: 'in-out', label: 'In-Out', icon: <Clock size={32} className="text-primary" />, path: '/in-out' },
    ];

    if (role === 'kitchen staff' || role === 'kitchen') {
      return [
        ...baseItems,
        { id: 'daily-task', label: 'Daily Task', icon: <ClipboardList size={32} className="text-primary" />, path: '/daily-task' },
        { id: 'kitchen-menu', label: 'Kitchen Menu', icon: <UtensilsCrossed size={32} className="text-primary" />, path: '/kitchen-menu' },
      ];
    }

    if (role === 'sales') {
      return [
        ...baseItems,
        { id: 'pg-inventory', label: 'PG Inventory', icon: <Package size={32} className="text-primary" />, path: '/pg-inventory' },
        { id: 'add-tenant', label: 'Add Tenant', icon: <UserPlus size={32} className="text-primary" />, path: '/add-tenant' },
      ];
    }

    // Default for cleaner, carpenter, painter, etc.
    return [
      ...baseItems,
      { id: 'daily-task', label: 'Daily Task', icon: <ClipboardList size={32} className="text-primary" />, path: '/daily-task' },
    ];
  };

  const dashboardItems = getDashboardItems();

  return (
    <div className="app-container bg-white page-content">
      <div className="dashboard-header">
        <div className="header-top">
          <div className="logo-container">
            <span className="logo-text text-primary">febebo</span>
          </div>
          <button className="icon-btn notification-btn" onClick={() => navigate('/notification')}>
            <Bell size={24} color="var(--primary)" />
            <span className="notification-dot"></span>
          </button>
        </div>
        
        <div className="welcome-banner">
          <span className="welcome-text">Welcome,</span>
          <span className="staff-name" style={{ textTransform: 'capitalize' }}>{name || 'Staff Member'}</span>
        </div>

        <div className="search-bar-wrapper">
          <Search size={20} className="search-icon text-muted" />
          <input type="text" placeholder="Search" className="search-input" />
        </div>
      </div>

      <div className="dashboard-grid">
        {dashboardItems.map((item) => (
          <div key={item.id} className="grid-item" onClick={() => navigate(item.path)}>
            <div className="grid-icon">
              {item.icon}
            </div>
            <span className="grid-label">{item.label}</span>
          </div>
        ))}
      </div>

      <BottomNav activeNav="home" />
    </div>
  );
};

export default StaffDashboard;
