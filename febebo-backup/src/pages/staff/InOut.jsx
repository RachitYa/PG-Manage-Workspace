import React, { useState } from 'react';
import TopBar from '../../components/TopBar';

const InOut = () => {
  const [logs, setLogs] = useState([
    { type: 'Out', time: '12:00 PM' },
    { type: 'In', time: '12:10 PM' },
    { type: 'Out', time: '02:00 PM' },
    { type: 'In', time: '02:30 PM' },
    { type: 'Out', time: '04:00 PM' },
    { type: 'In', time: '04:10 PM' }
  ]);

  const [isOut, setIsOut] = useState(false);

  const handleToggle = () => {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    setLogs([...logs, { type: isOut ? 'In' : 'Out', time: timeString }]);
    setIsOut(!isOut);
  };

  return (
    <div className="app-container">
      <TopBar title="Outside Inside" />
      
      <div className="padding-16 page-content">
        <div className="text-center mb-16">
          <span style={{ color: 'var(--danger)', fontWeight: '600', padding: '8px 16px', border: '1px solid var(--danger-light)', borderRadius: '4px', display: 'inline-block', width: '100%', fontSize: '14px' }}>
            Time Calculator ( Today Details)
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '32px' }}>
          {logs.map((log, index) => (
            <div key={index} style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1, padding: '12px', border: '1px solid var(--border-color)', textAlign: 'center', fontWeight: '500', borderRadius: '4px' }}>
                {log.type}
              </div>
              <div style={{ flex: 1, padding: '12px', border: '1px solid var(--border-color)', textAlign: 'center', fontWeight: '500', borderRadius: '4px' }}>
                {log.time}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mb-16" style={{ marginTop: '32px' }}>
          <button 
            className="btn-primary" 
            style={{ width: '120px' }}
            onClick={handleToggle}
          >
            {isOut ? 'In' : 'Out'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', position: 'absolute', bottom: '24px', left: '16px', right: '16px' }}>
          <div style={{ flex: 1, padding: '12px', border: '1px solid var(--border-color)', textAlign: 'center', fontWeight: '500', borderRadius: '4px' }}>
            Outside Time
          </div>
          <div style={{ flex: 1, padding: '12px', border: '1px solid var(--border-color)', textAlign: 'center', fontWeight: '500', borderRadius: '4px' }}>
            (50) Mins
          </div>
        </div>
      </div>
    </div>
  );
};

export default InOut;
