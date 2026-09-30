import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TopBar } from '../App';
import { Search, UserSquare2, UserX, Fingerprint } from 'lucide-react';

const StaffListing = () => {
  const navigate = useNavigate();

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopBar title="Staff Listing" />
      <div className="page-content">
        
        <div className="search-container">
          <Search className="search-icon" size={20} />
          <input type="text" className="search-input" placeholder="Search Staff Name" />
        </div>
        
        <div className="tabs-container" style={{ justifyContent: 'space-between', gap: '8px' }}>
          <div className="tab-item active" style={{ flex: 1, minWidth: 'auto', padding: '12px 8px' }} onClick={() => navigate('/staff-list')}>
            <div className="action-card-icon" style={{ width: 40, height: 40, marginBottom: 8, backgroundColor: 'white', color: 'var(--primary)' }}>
              <UserSquare2 size={24} />
            </div>
            <div className="tab-title" style={{ textAlign: 'center', color: 'white' }}>Staff List</div>
          </div>
          <div className="tab-item" style={{ flex: 1, minWidth: 'auto', padding: '12px 8px' }}>
            <div className="action-card-icon" style={{ width: 40, height: 40, marginBottom: 8 }}>
              <UserX size={24} />
            </div>
            <div className="tab-title" style={{ textAlign: 'center', whiteSpace: 'normal' }}>Incomplete Profile</div>
          </div>
          <div className="tab-item" style={{ flex: 1, minWidth: 'auto', padding: '12px 8px' }} onClick={() => navigate('/attendance')}>
            <div className="action-card-icon" style={{ width: 40, height: 40, marginBottom: 8 }}>
              <Fingerprint size={24} />
            </div>
            <div className="tab-title" style={{ textAlign: 'center', whiteSpace: 'normal' }}>Staff Attendance</div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default StaffListing;
