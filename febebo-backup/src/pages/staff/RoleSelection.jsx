import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChefHat, Trash2, Paintbrush, Utensils, Shirt, ShoppingBag, Hammer, Shield } from 'lucide-react';
import './RoleSelection.css';

const RoleSelection = () => {
  const navigate = useNavigate();

  const roles = [
    { id: 'kitchen', title: 'Kitchen Staff', icon: <ChefHat size={32} /> },
    { id: 'housekeeping', title: 'House Keeping', icon: <Trash2 size={32} /> },
    { id: 'cleaner', title: 'Cleaner', icon: <Utensils size={32} /> },
    { id: 'painter', title: 'Painter', icon: <Paintbrush size={32} /> },
    { id: 'laundry', title: 'Laundry', icon: <Shirt size={32} /> },
    { id: 'sales', title: 'Sales', icon: <ShoppingBag size={32} /> },
    { id: 'carpenter', title: 'Carpenter', icon: <Hammer size={32} /> },
    { id: 'sweeper', title: 'Sweeper', icon: <Trash2 size={32} /> },
    { id: 'security', title: 'Security', icon: <Shield size={32} /> },
  ];

  const handleRoleSelect = (roleId) => {
    // In a real app, this updates Firebase and LocalStorage
    localStorage.setItem('febebo_staff_role', roleId);
    navigate('/');
  };

  return (
    <div className="app-container bg-bg-color page-content" style={{ padding: '24px 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px', marginTop: '20px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-dark)', marginBottom: '8px' }}>Select Your Role</h2>
        <p className="text-muted" style={{ fontSize: '14px' }}>Please select your job profile to configure your dashboard.</p>
      </div>

      <div className="role-grid">
        {roles.map((role) => (
          <div 
            key={role.id} 
            className="role-card"
            onClick={() => handleRoleSelect(role.id)}
          >
            <div className="role-icon text-primary">{role.icon}</div>
            <span className="role-title">{role.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RoleSelection;
