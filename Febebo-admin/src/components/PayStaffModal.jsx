import React, { useState, useEffect } from 'react';

export default function PayStaffModal({ payData, onClose, onConfirm }) {
  const [totalDays, setTotalDays] = useState(30);
  const [presentDays, setPresentDays] = useState(payData.presentDays || 0);
  const [absentDays, setAbsentDays] = useState(payData.absentDays || 0);
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [advances, setAdvances] = useState(0);

  const baseSalary = payData.baseSalary || 0;
  
  // Salary Calculation: (Base / TotalDays) * PresentDays - Advances
  const dailyRate = totalDays > 0 ? (baseSalary / totalDays) : 0;
  const calculatedSalary = (dailyRate * presentDays).toFixed(0);
  const finalPayout = Math.max(0, parseInt(calculatedSalary) - parseInt(advances || 0));

  useEffect(() => {
    // If no attendance is passed or present+absent == 0, default them based on total days (assuming 100% attendance if no app data exists)
    if (payData.presentDays === 0 && payData.absentDays === 0) {
      setPresentDays(totalDays);
    }
  }, [payData, totalDays]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm({
      amountPaid: finalPayout,
      paymentMode,
      totalDays,
      presentDays,
      absentDays,
      advances,
      baseSalary
    });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: 'white', width: '100%', maxWidth: 440, borderRadius: 24, padding: '24px 20px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', maxHeight: '92vh', overflowY: 'auto', fontFamily: "'Hanken Grotesk', sans-serif" }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Pay Staff Salary</h3>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>{payData.name} ({payData.month})</p>
          </div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#64748b' }}>close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 2px' }}>Base Monthly Salary</p>
              <p style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: 0 }}>₹ {baseSalary.toLocaleString('en-IN')}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 2px' }}>Final Payout</p>
              <p style={{ fontSize: 22, fontWeight: 900, color: '#f43f5e', margin: 0 }}>₹ {finalPayout.toLocaleString('en-IN')}</p>
            </div>
          </div>

          <p style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5, margin: '4px 0 -4px' }}>Attendance & Calculation</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>Total Days in Month</label>
              <input type="number" value={totalDays} onChange={e => setTotalDays(parseInt(e.target.value) || 0)} style={{ width: '100%', padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontWeight: 700 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>Days Present</label>
              <input type="number" value={presentDays} onChange={e => setPresentDays(parseInt(e.target.value) || 0)} style={{ width: '100%', padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontWeight: 700 }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>Deduct Advances/Loans (₹)</label>
            <input type="number" value={advances} onChange={e => setAdvances(e.target.value)} style={{ width: '100%', padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontWeight: 700 }} />
          </div>

          <p style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5, margin: '4px 0 -4px' }}>Payment Details</p>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>Payment Mode</label>
            <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)} style={{ width: '100%', padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, outline: 'none', background: 'white', fontWeight: 700 }}>
              <option value="UPI">📱 UPI</option>
              <option value="Cash">💵 Cash</option>
              <option value="Bank Transfer">🏦 Bank Transfer</option>
            </select>
          </div>

          <button type="submit" style={{ width: '100%', padding: '16px', marginTop: 10, background: '#f43f5e', color: 'white', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Confirm Payment of ₹{finalPayout}
          </button>
        </form>
      </div>
    </div>
  );
}
