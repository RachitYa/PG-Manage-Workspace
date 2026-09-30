import React from 'react';
import { TopBar } from '../App';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

const Attendance = () => {
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopBar title="Attendance" />
      <div className="page-content">
        
        {/* User Selection */}
        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <select className="search-input" style={{ paddingLeft: '16px', appearance: 'none', backgroundColor: 'var(--card-bg)' }}>
            <option>Sachin Kumar</option>
          </select>
          <ChevronDown style={{ position: 'absolute', right: '16px', top: '12px', color: 'var(--text-muted)' }} size={20} />
        </div>

        {/* Date Filter & Submit */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <select className="search-input" style={{ paddingLeft: '12px', appearance: 'none', backgroundColor: 'var(--card-bg)' }}>
              <option>December</option>
            </select>
            <ChevronDown style={{ position: 'absolute', right: '12px', top: '12px', color: 'var(--text-muted)' }} size={20} />
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <select className="search-input" style={{ paddingLeft: '12px', appearance: 'none', backgroundColor: 'var(--card-bg)' }}>
              <option>2024</option>
            </select>
            <ChevronDown style={{ position: 'absolute', right: '12px', top: '12px', color: 'var(--text-muted)' }} size={20} />
          </div>
          <button className="btn btn-primary" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>Submit</button>
        </div>

        {/* Salary Card */}
        <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '15px', fontWeight: 500 }}>
            <span>Total Salary</span>
            <span>₹ 25,000</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 500 }}>
            <span>Advance Salary</span>
            <span>₹ 10,000</span>
          </div>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          <div style={{ flex: 1, backgroundColor: 'var(--success-light)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: '14px', marginBottom: '4px' }}>Present</div>
              <div style={{ fontSize: '24px', fontWeight: 600 }}>27</div>
            </div>
            <div className="text-success" style={{ fontWeight: 600 }}>₹ 22,500</div>
          </div>
          <div style={{ flex: 1, backgroundColor: 'var(--danger-light)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: '14px', marginBottom: '4px' }}>Absent</div>
              <div style={{ fontSize: '24px', fontWeight: 600 }}>4</div>
            </div>
            <div className="text-danger" style={{ fontWeight: 600 }}>₹ 2,500</div>
          </div>
        </div>

        {/* Calendar Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <button className="back-button" style={{ color: 'var(--text-dark)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
            <ChevronLeft size={20} />
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: 600 }}>February</div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>2025</div>
          </div>
          <button className="back-button" style={{ color: 'var(--text-dark)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Calendar Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', textAlign: 'center', marginBottom: '16px' }}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>{day}</div>
          ))}
          {/* Dummy calendar dates */}
          {[...Array(28)].map((_, i) => {
            const isAbsent = i === 1 || i === 7 || i === 8 || i === 15;
            return (
              <div 
                key={i} 
                style={{ 
                  aspectRatio: '1', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  borderRadius: '50%',
                  backgroundColor: isAbsent ? 'var(--danger)' : 'var(--success)',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 500
                }}
              >
                {i + 1}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};

export default Attendance;
