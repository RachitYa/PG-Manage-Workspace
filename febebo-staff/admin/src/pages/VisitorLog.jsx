import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const MOCK_VISITORS = [
  { id: 1, name: 'Suresh Patel', phone: '9876543210', visiting: 'Ravi Kumar - Room 101', purpose: 'Personal Visit', timeIn: '09:30 AM', timeOut: '10:45 AM', status: 'Exited' },
  { id: 2, name: 'Delivery Boy - Amazon', phone: '9988776655', visiting: 'Priya Sharma - Room 102', purpose: 'Delivery', timeIn: '11:15 AM', timeOut: null, status: 'Inside' },
  { id: 3, name: 'Ramesh Singh', phone: '9111223344', visiting: 'Karan Singh - Room 201', purpose: 'Personal Visit', timeIn: '02:00 PM', timeOut: '03:30 PM', status: 'Exited' },
];

export default function VisitorLog() {
  const navigate = useNavigate();
  const [visitors, setVisitors] = useState(MOCK_VISITORS);
  const [showLogSheet, setShowLogSheet] = useState(false);

  const [newVisitor, setNewVisitor] = useState({ name: '', phone: '', visiting: '', purpose: 'Personal Visit', note: '' });

  const totalToday = visitors.length;
  const insideNow = visitors.filter(v => v.status === 'Inside').length;
  const exited = visitors.filter(v => v.status === 'Exited').length;

  const todayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

  const handleLogVisitor = () => {
    if (!newVisitor.name || !newVisitor.phone || !newVisitor.visiting) return;
    
    const now = new Date();
    const timeIn = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    setVisitors([{
      id: Date.now(),
      name: newVisitor.name,
      phone: newVisitor.phone,
      visiting: newVisitor.visiting,
      purpose: newVisitor.purpose,
      timeIn,
      timeOut: null,
      status: 'Inside'
    }, ...visitors]);

    setNewVisitor({ name: '', phone: '', visiting: '', purpose: 'Personal Visit', note: '' });
    setShowLogSheet(false);
  };

  const handleLogExit = (id) => {
    const now = new Date();
    const timeOut = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    setVisitors(visitors.map(v => v.id === id ? { ...v, status: 'Exited', timeOut } : v));
  };

  return (
    <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", backgroundColor: '#f1f5f9', minHeight: '100vh', maxWidth: 480, margin: '0 auto', paddingBottom: 40, position: 'relative' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0c1a2e, #0f2847)', color: 'white', padding: '20px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: 8, borderRadius: '50%', display: 'flex', cursor: 'pointer' }}>
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ color: '#0891b2' }}>shield</span>
            <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", margin: 0, fontSize: '1.4rem', fontWeight: 600 }}>Visitor Log</h1>
          </div>
        </div>
        <button onClick={() => setShowLogSheet(true)} style={{ background: '#0891b2', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', boxShadow: '0 2px 10px rgba(8, 145, 178, 0.4)' }}>
          <span className="material-symbols-outlined">add</span>
        </button>
      </div>

      <div style={{ padding: 20 }}>
        <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", margin: '0 0 16px', fontSize: '1.2rem', color: '#1e293b', textAlign: 'center' }}>{todayDate}</h2>

        {/* Summary Pills */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, overflowX: 'auto', paddingBottom: 8 }}>
          <div style={{ flex: 1, minWidth: 100, background: 'white', padding: '12px 16px', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', textAlign: 'center' }}>
            <p style={{ margin: '0 0 4px', fontSize: '0.75rem', color: '#64748b' }}>Total Today</p>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a', fontFamily: "'Bricolage Grotesque', sans-serif" }}>{totalToday}</h3>
          </div>
          <div style={{ flex: 1, minWidth: 100, background: '#fff1f2', padding: '12px 16px', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', textAlign: 'center' }}>
            <p style={{ margin: '0 0 4px', fontSize: '0.75rem', color: '#e11d48' }}>Inside Now</p>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#be123c', fontFamily: "'Bricolage Grotesque', sans-serif" }}>{insideNow}</h3>
          </div>
          <div style={{ flex: 1, minWidth: 100, background: '#f0fdf4', padding: '12px 16px', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', textAlign: 'center' }}>
            <p style={{ margin: '0 0 4px', fontSize: '0.75rem', color: '#15803d' }}>Exited</p>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#166534', fontFamily: "'Bricolage Grotesque', sans-serif" }}>{exited}</h3>
          </div>
        </div>

        {/* Visitor List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {visitors.map(visitor => (
            <div key={visitor.id} style={{ background: 'white', borderRadius: 16, padding: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', color: '#1e293b', fontFamily: "'Bricolage Grotesque', sans-serif" }}>{visitor.name}</h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>phone</span> {visitor.phone}
                  </p>
                </div>
                <div style={{ background: visitor.purpose === 'Delivery' ? '#fef3c7' : '#e0f2fe', color: visitor.purpose === 'Delivery' ? '#d97706' : '#0284c7', padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600 }}>
                  {visitor.purpose}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, padding: '8px 12px', background: '#f8fafc', borderRadius: 8 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#94a3b8' }}>person</span>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569' }}>Visiting: <strong>{visitor.visiting}</strong></p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10b981', fontSize: '0.8rem', fontWeight: 600 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>login</span> {visitor.timeIn}
                  </div>
                  {visitor.status === 'Exited' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748b', fontSize: '0.8rem' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>logout</span> {visitor.timeOut}
                    </div>
                  )}
                  {visitor.status === 'Inside' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#e11d48', fontSize: '0.8rem', fontWeight: 600 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>error</span> Still Inside
                    </div>
                  )}
                </div>
                {visitor.status === 'Inside' && (
                  <button onClick={() => handleLogExit(visitor.id)} style={{ background: '#0891b2', color: 'white', border: 'none', padding: '6px 16px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                    Log Exit
                  </button>
                )}
              </div>
            </div>
          ))}
          {visitors.length === 0 && (
            <p style={{ textAlign: 'center', color: '#64748b', marginTop: 20 }}>No visitors logged today.</p>
          )}
        </div>
      </div>

      {/* Log Visitor Sheet */}
      {showLogSheet && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', maxWidth: 480, margin: '0 auto' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowLogSheet(false)}></div>
          <div style={{ background: 'white', padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24, position: 'relative', zIndex: 10, animation: 'slideUp 0.3s ease-out', maxHeight: '80vh', overflowY: 'auto' }}>
            <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", margin: '0 0 20px', fontSize: '1.3rem', color: '#0c1a2e' }}>Log New Visitor</h3>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.9rem', color: '#64748b', marginBottom: 8 }}>Visitor Name</label>
              <input type="text" placeholder="E.g., John Doe" value={newVisitor.name} onChange={(e) => setNewVisitor({...newVisitor, name: e.target.value})} style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.9rem', color: '#64748b', marginBottom: 8 }}>Phone Number</label>
              <input type="tel" placeholder="10-digit number" value={newVisitor.phone} onChange={(e) => setNewVisitor({...newVisitor, phone: e.target.value})} style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.9rem', color: '#64748b', marginBottom: 8 }}>Visiting Whom</label>
              <select value={newVisitor.visiting} onChange={(e) => setNewVisitor({...newVisitor, visiting: e.target.value})} style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none', boxSizing: 'border-box', background: 'white' }}>
                <option value="">Select Tenant</option>
                <option value="Ravi Kumar - Room 101">Ravi Kumar - Room 101</option>
                <option value="Priya Sharma - Room 102">Priya Sharma - Room 102</option>
                <option value="Sneha Kapoor - Room 103">Sneha Kapoor - Room 103</option>
                <option value="Karan Singh - Room 201">Karan Singh - Room 201</option>
                <option value="Mohan Lal - Room 202">Mohan Lal - Room 202</option>
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.9rem', color: '#64748b', marginBottom: 8 }}>Purpose</label>
              <select value={newVisitor.purpose} onChange={(e) => setNewVisitor({...newVisitor, purpose: e.target.value})} style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none', boxSizing: 'border-box', background: 'white' }}>
                <option value="Personal Visit">Personal Visit</option>
                <option value="Delivery">Delivery</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Interview">Interview</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: '0.9rem', color: '#64748b', marginBottom: 8 }}>Note (Optional)</label>
              <input type="text" placeholder="Tap to note..." value={newVisitor.note} onChange={(e) => setNewVisitor({...newVisitor, note: e.target.value})} style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <button onClick={handleLogVisitor} disabled={!newVisitor.name || !newVisitor.phone || !newVisitor.visiting} style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: (!newVisitor.name || !newVisitor.phone || !newVisitor.visiting) ? '#cbd5e1' : '#0891b2', color: 'white', fontSize: '1rem', fontWeight: 600, cursor: (!newVisitor.name || !newVisitor.phone || !newVisitor.visiting) ? 'not-allowed' : 'pointer', transition: '0.3s' }}>
              Log Entry
            </button>
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
