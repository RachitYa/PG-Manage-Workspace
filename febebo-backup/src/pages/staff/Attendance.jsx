import React, { useState } from 'react';
import TopBar from '../../components/TopBar';
import './Attendance.css';

const Attendance = () => {
  const [currentDate] = useState('10/02/2025');
  const [marked, setMarked] = useState(false);

  return (
    <div className="app-container">
      <TopBar title="Attendance" />
      
      <div className="padding-16 page-content">
        <div className="card text-center mb-16">
          <div className="coming-time text-danger">
            Coming Time ({marked ? '08:57 AM' : '--:--'})
          </div>
          
          <div className="date-display">
            <span className="date-label">Date</span>
            <span className="date-value">{currentDate}</span>
          </div>
          
          <button 
            className="btn-primary" 
            onClick={() => setMarked(true)}
            disabled={marked}
            style={{ opacity: marked ? 0.7 : 1 }}
          >
            {marked ? 'Marked Successfully' : 'Good Morning'}
          </button>
        </div>

        <div className="stats-row mb-16">
          <div className="stat-box bg-success-light">
            <span className="stat-label">Present</span>
            <span className="stat-value text-success">{marked ? '1' : '0'}</span>
          </div>
          <div className="stat-box bg-danger-light">
            <span className="stat-label">Absent</span>
            <span className="stat-value text-danger">0</span>
          </div>
        </div>

        {/* Dummy Calendar View */}
        <div className="card calendar-card">
          <div className="calendar-header">
            <button className="cal-btn">&lt;</button>
            <h3>February 2025</h3>
            <button className="cal-btn">&gt;</button>
          </div>
          
          <div className="calendar-grid">
            <div className="cal-day-name">Mon</div>
            <div className="cal-day-name">Tue</div>
            <div className="cal-day-name">Wed</div>
            <div className="cal-day-name">Thu</div>
            <div className="cal-day-name">Fri</div>
            <div className="cal-day-name">Sat</div>
            <div className="cal-day-name">Sun</div>
            
            {/* Dummy empty days */}
            <div className="cal-day text-muted">27</div>
            <div className="cal-day text-muted">28</div>
            <div className="cal-day text-muted">29</div>
            <div className="cal-day text-muted">30</div>
            <div className="cal-day text-muted">31</div>
            <div className="cal-day">1</div>
            <div className="cal-day">2</div>
            
            <div className="cal-day">3</div>
            <div className="cal-day">4</div>
            <div className="cal-day">5</div>
            <div className="cal-day">6</div>
            <div className="cal-day">7</div>
            <div className="cal-day">8</div>
            <div className="cal-day">9</div>
            
            <div className={`cal-day ${marked ? 'cal-day-present' : ''}`}>10</div>
            <div className="cal-day">11</div>
            <div className="cal-day">12</div>
            <div className="cal-day">13</div>
            <div className="cal-day">14</div>
            <div className="cal-day">15</div>
            <div className="cal-day">16</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Attendance;
