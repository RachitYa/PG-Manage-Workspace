import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/TopBar';
import { Star, User, Users, UsersRound, Briefcase, MapPin, Key, ShieldCheck, FileText, ChevronDown, ChevronUp, Edit3, CheckCircle, LogOut } from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import './StaffProfile.css';

const StaffProfile = () => {
  const navigate = useNavigate();
  const [openSection, setOpenSection] = useState('documents'); // default open
  const staffName = localStorage.getItem('febebo_staff_name') || 'Staff Member';
  const staffRole = localStorage.getItem('febebo_staff_role') || 'Role';

  const toggleSection = (section) => {
    setOpenSection(openSection === section ? null : section);
  };

  const handleLogout = () => {
    localStorage.removeItem('febebo_staff_token');
    localStorage.removeItem('febebo_staff_role');
    localStorage.removeItem('febebo_staff_name');
    navigate('/login');
  };

  const sections = [
    { id: 'personal', title: 'Personal Details', icon: <User size={20} /> },
    { id: 'parents', title: 'Parents Details', icon: <Users size={20} /> },
    { id: 'relative', title: 'Relative Details', icon: <UsersRound size={20} /> },
    { id: 'work', title: 'Work Experience', icon: <Briefcase size={20} />, action: <div className="edit-btn"><Edit3 size={14} color="white" /></div> },
    { id: 'visitor', title: 'Visitor Details', icon: <User size={20} /> },
    { id: 'address', title: 'Address', icon: <MapPin size={20} /> },
    { id: 'password', title: 'Password', icon: <Key size={20} /> },
    { id: 'police', title: 'Police Verification', icon: <ShieldCheck size={20} />, badge: 'Verified' },
    { id: 'documents', title: 'Document', icon: <FileText size={20} />, badge: 'Verified' },
  ];

  return (
    <div className="app-container bg-white page-content" style={{ paddingBottom: '100px' }}>
      <TopBar title="Staff Details" />
      
      <div className="profile-header bg-primary">
        <div className="rating-badge">
          4.3 <Star size={12} fill="currentColor" />
        </div>
        
        <div className="profile-info-banner card">
          <div className="profile-img-container">
            <div className="dummy-img bg-primary"></div>
          </div>
          <div className="profile-text">
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', textTransform: 'capitalize' }}>{staffName}</h2>
            <div className="info-row"><User size={12} /> #1234567</div>
            <div className="info-row"><Briefcase size={12} style={{ textTransform: 'capitalize' }}/> {staffRole}</div>
            <div className="info-row text-primary" style={{ fontSize: '12px' }}>staff@febebo.com</div>
            <div className="info-row text-primary" style={{ fontSize: '12px' }}>+91 XXXXXXXXXX</div>
          </div>
        </div>
      </div>

      <div className="profile-accordion padding-16" style={{ marginTop: '40px' }}>
        {sections.map((sec) => (
          <div key={sec.id} className="accordion-item">
            <div className="accordion-header" onClick={() => toggleSection(sec.id)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                <div className="accordion-icon text-primary">{sec.icon}</div>
                <span className="font-semibold">{sec.title}</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {sec.badge && (
                  <span className="badge-verified bg-success-light text-success">
                    <CheckCircle size={10} style={{ marginRight: '4px' }} /> {sec.badge}
                  </span>
                )}
                {sec.action}
                {openSection === sec.id ? <ChevronUp size={20} className="text-primary" /> : <ChevronDown size={20} className="text-primary" />}
              </div>
            </div>
            
            {openSection === sec.id && (
              <div className="accordion-content">
                {sec.id === 'documents' && (
                  <div className="documents-grid">
                    <div className="doc-img-dummy">ID Card Front</div>
                    <div className="doc-img-dummy">ID Card Back</div>
                  </div>
                )}
                {sec.id === 'relative' && (
                  <div className="details-list">
                    <div className="detail-row">
                      <span className="detail-label">Name</span>
                      <span className="detail-value">: Anil Kumar</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Number</span>
                      <span className="detail-value text-primary">: +91 9876543232</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Relation</span>
                      <span className="detail-value text-primary">: Brother</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Address</span>
                      <span className="detail-value text-primary">: New Ashok Nagar Delhi</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        <div style={{ marginTop: '30px' }}>
          <button onClick={handleLogout} className="btn-primary" style={{ backgroundColor: '#fee2e2', color: '#dc2626', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
            <LogOut size={20} />
            Log Out
          </button>
        </div>
      </div>

      <BottomNav activeNav="profile" />
    </div>
  );
};

export default StaffProfile;
