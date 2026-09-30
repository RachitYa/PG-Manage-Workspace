import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TopBar } from '../App';
import { ClipboardList, Users, ShieldAlert, Calendar } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopBar title="Febebo App" showBack={false} />
      <div className="page-content">
        <h2 style={{ marginBottom: '16px', color: 'var(--text-dark)' }}>Welcome back!</h2>
        
        <div className="action-cards" style={{ flexWrap: 'wrap' }}>
          <div className="action-card" onClick={() => navigate('/complaints')}>
            <div className="action-card-icon">
              <ShieldAlert size={28} />
            </div>
            <div className="action-card-title">Complaints</div>
          </div>
          <div className="action-card" onClick={() => navigate('/my-work')}>
            <div className="action-card-icon">
              <ClipboardList size={28} />
            </div>
            <div className="action-card-title">Work Tasks</div>
          </div>
        </div>

        <div className="action-cards" style={{ flexWrap: 'wrap' }}>
          <div className="action-card" onClick={() => navigate('/staff-listing')}>
            <div className="action-card-icon">
              <Users size={28} />
            </div>
            <div className="action-card-title">Staff</div>
          </div>
          <div className="action-card" onClick={() => navigate('/attendance')}>
            <div className="action-card-icon">
              <Calendar size={28} />
            </div>
            <div className="action-card-title">Attendance</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
