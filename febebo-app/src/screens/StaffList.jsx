import React from 'react';
import { TopBar } from '../App';
import { Search, IdCard, User, Mail, Phone } from 'lucide-react';

const StaffList = () => {
  const staff = [
    {
      id: 1,
      name: 'Sachin Kumar',
      empId: '#1234567',
      role: 'House Keeping',
      email: 'sachin@gmail.com',
      phone: '+91 9234567681',
      image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80'
    },
    {
      id: 2,
      name: 'Sachin Kumar',
      empId: '#1234567',
      role: 'House Keeping',
      email: 'sachin@gmail.com',
      phone: '+91 9234567681',
      image: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=150&q=80'
    },
    {
      id: 3,
      name: 'Sachin Kumar',
      empId: '#1234567',
      role: 'House Keeping',
      email: 'sachin@gmail.com',
      phone: '+91 9234567681',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80'
    }
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopBar title="Staff List" />
      <div className="page-content">
        
        <div className="search-container">
          <Search className="search-icon" size={20} />
          <input type="text" className="search-input" placeholder="Search" />
        </div>

        <div>
          {staff.map(member => (
            <div key={member.id} className="card" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <img 
                src={member.image} 
                alt={member.name}
                style={{ width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover' }}
              />
              <div style={{ flex: 1 }}>
                <div className="card-title" style={{ fontSize: '18px', marginBottom: '8px' }}>{member.name}</div>
                <div className="info-row">
                  <IdCard className="info-icon" size={16} />
                  <span>{member.empId}</span>
                </div>
                <div className="info-row">
                  <User className="info-icon" size={16} />
                  <span>{member.role}</span>
                </div>
                <div className="info-row">
                  <Mail className="info-icon" size={16} />
                  <span>{member.email}</span>
                </div>
                <div className="info-row" style={{ marginBottom: 0 }}>
                  <Phone className="info-icon" size={16} />
                  <span>{member.phone}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default StaffList;
