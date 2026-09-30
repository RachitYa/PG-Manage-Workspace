import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function MoveOutFlow() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Default mock data if location.state is unavailable
  const tenant = location.state?.tenant || {
    name: 'Ravi Kumar',
    room: '101',
    bed: 'Bed 2',
    joinDate: 'Feb 2024',
    monthlyRent: 8000,
    securityDeposit: 16000,
    phone: '+91 9876543210'
  };

  const [lastDay, setLastDay] = useState(18); // Default to 18th for calculation
  const [damages, setDamages] = useState([
    { id: 1, desc: 'Broken mirror', amount: 500 }
  ]);
  const [isSuccess, setIsSuccess] = useState(false);

  // Handlers for Damages
  const handleAddDamage = () => {
    setDamages([...damages, { id: Date.now(), desc: '', amount: 0 }]);
  };

  const handleUpdateDamage = (id, field, value) => {
    setDamages(damages.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const handleDeleteDamage = (id) => {
    setDamages(damages.filter(d => d.id !== id));
  };

  // Calculations
  const proratedRent = Math.round((lastDay / 30) * tenant.monthlyRent);
  const totalDamages = damages.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const finalRefund = tenant.securityDeposit - proratedRent - totalDamages;

  if (isSuccess) {
    return (
      <div style={{
        fontFamily: "'Hanken Grotesk', sans-serif",
        maxWidth: '480px',
        margin: '0 auto',
        backgroundColor: '#f1f5f9',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          backgroundColor: '#dcfce7',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px'
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#16a34a' }}>check_circle</span>
        </div>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '24px', color: '#1e293b', marginBottom: '12px' }}>
          Tenant Checked Out!
        </h1>
        <p style={{ color: '#475569', fontSize: '16px', lineHeight: '1.5', marginBottom: '32px' }}>
          {tenant.bed} in Room {tenant.room} is now Vacant. Final settlement details have been recorded.
        </p>
        <button
          onClick={() => navigate(-1)}
          style={{
            backgroundColor: '#0891b2',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '16px 32px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 4px 6px -1px rgba(8, 145, 178, 0.3)'
          }}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: "'Hanken Grotesk', sans-serif",
      maxWidth: '480px',
      margin: '0 auto',
      backgroundColor: '#f1f5f9',
      minHeight: '100vh',
      paddingBottom: '40px'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0c1a2e, #0f2847)',
        padding: '20px',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        gap: '15px'
      }}>
        <span 
          className="material-symbols-outlined" 
          onClick={() => navigate(-1)}
          style={{ cursor: 'pointer', fontSize: '24px' }}
        >
          arrow_back
        </span>
        <h1 style={{ 
          fontFamily: "'Bricolage Grotesque', sans-serif", 
          margin: 0, 
          fontSize: '20px',
          fontWeight: '600'
        }}>
          Move-Out Settlement
        </h1>
      </div>

      <div style={{ padding: '20px' }}>
        {/* Tenant Info Card */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
            <div style={{
              width: '50px',
              height: '50px',
              backgroundColor: '#e0f2fe',
              borderRadius: '25px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0891b2',
              fontWeight: 'bold',
              fontSize: '20px'
            }}>
              {tenant.name.charAt(0)}
            </div>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#1e293b' }}>{tenant.name}</div>
              <div style={{ color: '#64748b', fontSize: '14px' }}>Room {tenant.room} • {tenant.bed}</div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '15px' }}>
            <div>
              <div style={{ color: '#64748b', fontSize: '12px' }}>Joined</div>
              <div style={{ fontWeight: '600', color: '#1e293b' }}>{tenant.joinDate}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#64748b', fontSize: '12px' }}>Deposit Held</div>
              <div style={{ fontWeight: '600', color: '#10b981' }}>₹{tenant.securityDeposit.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Step 1 - Last Day */}
        <div style={{ marginBottom: '25px' }}>
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '16px', color: '#334155', marginBottom: '12px' }}>
            1. Last Day & Rent Calculation
          </h2>
          <div style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>Last day of stay</label>
              <input 
                type="number"
                value={lastDay}
                onChange={(e) => setLastDay(Number(e.target.value) || 0)}
                min="1" max="31"
                style={{
                  width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '16px'
                }}
              />
            </div>
            <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
              <div style={{ fontSize: '14px', color: '#475569', marginBottom: '4px' }}>
                Days stayed: {lastDay} | Daily rate: ₹{Math.round(tenant.monthlyRent / 30)}
              </div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#ef4444' }}>
                Prorated Rent: ₹{proratedRent.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Step 2 - Damage Assessment */}
        <div style={{ marginBottom: '25px' }}>
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '16px', color: '#334155', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            2. Damage Assessment
            <button 
              onClick={handleAddDamage}
              style={{
                background: 'none', border: 'none', color: '#0891b2', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span> Add
            </button>
          </h2>
          
          <div style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            {damages.map((damage) => (
              <div key={damage.id} style={{ display: 'flex', gap: '10px', marginBottom: '12px', alignItems: 'center' }}>
                <input 
                  type="text"
                  placeholder="Description"
                  value={damage.desc}
                  onChange={(e) => handleUpdateDamage(damage.id, 'desc', e.target.value)}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
                <input 
                  type="number"
                  placeholder="₹ Amount"
                  value={damage.amount || ''}
                  onChange={(e) => handleUpdateDamage(damage.id, 'amount', e.target.value)}
                  style={{ width: '80px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
                <span 
                  onClick={() => handleDeleteDamage(damage.id)}
                  className="material-symbols-outlined" 
                  style={{ color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                >
                  close
                </span>
              </div>
            ))}
            {damages.length === 0 && <div style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center' }}>No damages added.</div>}
            
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontWeight: '600' }}>
              <span style={{ color: '#475569' }}>Total Damages:</span>
              <span style={{ color: '#ef4444' }}>₹{totalDamages.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Step 3 - Final Settlement */}
        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '16px', color: '#334155', marginBottom: '12px' }}>
            3. Final Settlement
          </h2>
          <div style={{ background: '#1e293b', borderRadius: '16px', padding: '20px', color: 'white', boxShadow: '0 4px 10px rgba(0,0,0,0.15)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px' }}>
              <span style={{ color: '#94a3b8' }}>Security Deposit</span>
              <span>₹{tenant.securityDeposit.toLocaleString()}</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px' }}>
              <span style={{ color: '#94a3b8' }}>Less: Prorated Rent</span>
              <span style={{ color: '#f87171' }}>-₹{proratedRent.toLocaleString()}</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontSize: '14px' }}>
              <span style={{ color: '#94a3b8' }}>Less: Total Damages</span>
              <span style={{ color: '#f87171' }}>-₹{totalDamages.toLocaleString()}</span>
            </div>
            
            <div style={{ borderTop: '1px solid #334155', paddingTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '600', fontSize: '16px' }}>
                {finalRefund >= 0 ? 'Refund to Tenant' : 'Tenant Owes'}
              </span>
              <span style={{ 
                fontWeight: 'bold', 
                fontSize: '22px', 
                color: finalRefund >= 0 ? '#34d399' : '#f87171' 
              }}>
                ₹{Math.abs(finalRefund).toLocaleString()}
              </span>
            </div>

          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={() => setIsSuccess(true)}
            style={{
              width: '100%',
              backgroundColor: '#0891b2',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '16px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 6px -1px rgba(8, 145, 178, 0.3)'
            }}
          >
            Confirm Settlement & Move Out
          </button>
          
          <button
            onClick={() => navigate(-1)}
            style={{
              width: '100%',
              backgroundColor: 'transparent',
              color: '#64748b',
              border: '1px solid #cbd5e1',
              borderRadius: '12px',
              padding: '16px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Go Back
          </button>
        </div>

      </div>
    </div>
  );
}
