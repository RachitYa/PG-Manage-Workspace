import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const MOCK_ROOMS = [
  { id: 1, roomNo: '101', tenants: ['Ravi Kumar'], prevReading: 1240, currReading: '' },
  { id: 2, roomNo: '102', tenants: ['Priya Sharma', 'Amit Verma'], prevReading: 890, currReading: '' },
  { id: 3, roomNo: '103', tenants: ['Sneha Kapoor'], prevReading: 2100, currReading: '' },
  { id: 4, roomNo: '201', tenants: ['Karan Singh'], prevReading: 450, currReading: '' },
  { id: 5, roomNo: '202', tenants: ['Mohan Lal'], prevReading: 1680, currReading: '' },
];

export default function MeterReading() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState(MOCK_ROOMS);
  const [rate, setRate] = useState(8.5);
  const [fixedCharge, setFixedCharge] = useState(50);
  
  const [showConfig, setShowConfig] = useState(false);
  const [tempRate, setTempRate] = useState(rate);
  const [tempFixed, setTempFixed] = useState(fixedCharge);

  const [showSuccess, setShowSuccess] = useState(false);

  const handleConfigSave = () => {
    setRate(Number(tempRate));
    setFixedCharge(Number(tempFixed));
    setShowConfig(false);
  };

  const handleReadingChange = (id, value) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    setRooms(rooms.map(r => r.id === id ? { ...r, currReading: numericValue } : r));
  };

  const calculateBill = (prev, curr) => {
    if (!curr || Number(curr) < prev) return null;
    const units = Number(curr) - prev;
    return units * rate + fixedCharge;
  };

  const totalBillSoFar = rooms.reduce((acc, r) => {
    const bill = calculateBill(r.prevReading, r.currReading);
    return acc + (bill || 0);
  }, 0);

  const allFilled = rooms.every(r => r.currReading !== '' && Number(r.currReading) >= r.prevReading);

  return (
    <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", backgroundColor: '#f1f5f9', minHeight: '100vh', maxWidth: 480, margin: '0 auto', paddingBottom: 100, position: 'relative' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0c1a2e, #0f2847)', color: 'white', padding: '20px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: 8, borderRadius: '50%', display: 'flex', cursor: 'pointer' }}>
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", margin: 0, fontSize: '1.4rem', fontWeight: 600 }}>Meter Readings</h1>
        </div>
        <button onClick={() => setShowConfig(true)} style={{ background: 'transparent', border: 'none', color: 'white', display: 'flex', cursor: 'pointer' }}>
          <span className="material-symbols-outlined">settings</span>
        </button>
      </div>

      <div style={{ padding: 20 }}>
        {/* Summary Banner */}
        <div style={{ background: 'linear-gradient(135deg, #0891b2, #06b6d4)', borderRadius: 16, padding: 20, color: 'white', marginBottom: 24, boxShadow: '0 4px 15px rgba(8, 145, 178, 0.3)' }}>
          <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.9 }}>Total Bill Generated (This Month)</p>
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", margin: '8px 0 0', fontSize: '2rem' }}>₹{totalBillSoFar.toFixed(2)}</h2>
        </div>

        {/* Room List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {rooms.map(room => {
            const bill = calculateBill(room.prevReading, room.currReading);
            const units = bill !== null ? Number(room.currReading) - room.prevReading : 0;
            const isValid = room.currReading !== '' && Number(room.currReading) >= room.prevReading;

            return (
              <div key={room.id} style={{ background: 'white', borderRadius: 16, padding: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden' }}>
                {isValid && (
                  <div style={{ position: 'absolute', top: 16, right: 16, color: '#10b981', display: 'flex' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 24 }}>check_circle</span>
                  </div>
                )}
                
                <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", margin: '0 0 4px', fontSize: '1.2rem', color: '#1e293b' }}>Room {room.roomNo}</h3>
                <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: '#64748b' }}>{room.tenants.join(', ')}</p>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: 4 }}>Prev: {room.prevReading} units</label>
                    <input 
                      type="text" 
                      placeholder="Current" 
                      value={room.currReading}
                      onChange={(e) => handleReadingChange(room.id, e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  {isValid && (
                    <div style={{ flex: 1.5, background: '#f8fafc', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Units used: <strong>{units}</strong></p>
                      <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: '#0891b2', fontWeight: 600 }}>Total Bill: ₹{bill.toFixed(2)}</p>
                      {room.tenants.length > 1 && (
                        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#10b981', fontWeight: 600 }}>
                          Per Person: ₹{(bill / room.tenants.length).toFixed(2)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Generate Button */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, maxWidth: 480, margin: '0 auto', padding: 20, background: 'linear-gradient(to top, white, rgba(255,255,255,0.9))' }}>
        <button 
          onClick={() => setShowSuccess(true)}
          disabled={!allFilled}
          style={{ width: '100%', padding: 16, borderRadius: 12, border: 'none', background: allFilled ? '#0891b2' : '#cbd5e1', color: 'white', fontSize: '1.1rem', fontWeight: 600, cursor: allFilled ? 'pointer' : 'not-allowed', boxShadow: allFilled ? '0 4px 15px rgba(8, 145, 178, 0.4)' : 'none', transition: 'all 0.3s' }}
        >
          Generate All Bills
        </button>
      </div>

      {/* Rate Config Sheet */}
      {showConfig && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', maxWidth: 480, margin: '0 auto' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowConfig(false)}></div>
          <div style={{ background: 'white', padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24, position: 'relative', zIndex: 10, animation: 'slideUp 0.3s ease-out' }}>
            <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", margin: '0 0 20px', fontSize: '1.3rem', color: '#0c1a2e' }}>Rate Configuration</h3>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.9rem', color: '#64748b', marginBottom: 8 }}>Rate per Unit (₹)</label>
              <input type="number" value={tempRate} onChange={(e) => setTempRate(e.target.value)} style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: '0.9rem', color: '#64748b', marginBottom: 8 }}>Fixed Charge (₹)</label>
              <input type="number" value={tempFixed} onChange={(e) => setTempFixed(e.target.value)} style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <button onClick={handleConfigSave} style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: '#0891b2', color: 'white', fontSize: '1rem', fontWeight: 600, cursor: 'pointer' }}>Save Settings</button>
          </div>
        </div>
      )}

      {/* Success Bottom Sheet */}
      {showSuccess && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', maxWidth: 480, margin: '0 auto' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowSuccess(false)}></div>
          <div style={{ background: 'white', padding: 30, borderTopLeftRadius: 24, borderTopRightRadius: 24, position: 'relative', zIndex: 10, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#d1fae5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 32 }}>check</span>
            </div>
            <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", margin: '0 0 12px', fontSize: '1.4rem', color: '#0c1a2e' }}>Bills Generated Successfully!</h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: '1rem', lineHeight: 1.5 }}>
              Generated for <strong>{rooms.length} rooms</strong><br />
              Total: <strong>₹{totalBillSoFar.toFixed(2)}</strong><br />
              Added to tenant accounts.
            </p>
            <button onClick={() => { setShowSuccess(false); navigate(-1); }} style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: '#0891b2', color: 'white', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', marginTop: 24 }}>Done</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
