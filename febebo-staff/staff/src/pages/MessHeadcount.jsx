import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const mockTenants = [
  { id: 1, name: 'Ravi Kumar', room: '101', breakfast: true, lunch: true, dinner: true },
  { id: 2, name: 'Priya Sharma', room: '102', breakfast: false, lunch: true, dinner: true },
  { id: 3, name: 'Amit Verma', room: '102', breakfast: true, lunch: false, dinner: true },
  { id: 4, name: 'Sneha Kapoor', room: '103', breakfast: true, lunch: true, dinner: false },
  { id: 5, name: 'Karan Singh', room: '201', breakfast: false, lunch: false, dinner: true },
  { id: 6, name: 'Mohan Lal', room: '202', breakfast: true, lunch: true, dinner: true },
];

export default function MessHeadcount() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState(mockTenants);
  const [activeTab, setActiveTab] = useState('breakfast');
  const [toastMessage, setToastMessage] = useState('');

  const toggleMeal = (id, meal) => {
    setTenants(tenants.map(t => t.id === id ? { ...t, [meal]: !t[meal] } : t));
  };

  const breakfastCount = tenants.filter(t => t.breakfast).length;
  const lunchCount = tenants.filter(t => t.lunch).length;
  const dinnerCount = tenants.filter(t => t.dinner).length;

  const handleExport = () => {
    setToastMessage('Headcount sent to Cook');
    setTimeout(() => setToastMessage(''), 3000);
  };

  const getActiveCount = () => {
    if (activeTab === 'breakfast') return breakfastCount;
    if (activeTab === 'lunch') return lunchCount;
    return dinnerCount;
  };

  const riceEstimate = (dinnerCount * 0.125).toFixed(1); // roughly 125g per person

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
          Mess & Headcount
        </h1>
      </div>

      {/* Date Navigation */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '15px 20px',
        backgroundColor: 'white',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <span className="material-symbols-outlined" style={{ cursor: 'pointer', color: '#64748b' }}>chevron_left</span>
        <span style={{ fontWeight: '600', color: '#1e293b' }}>Today, 20 July</span>
        <span className="material-symbols-outlined" style={{ cursor: 'pointer', color: '#64748b' }}>chevron_right</span>
      </div>

      <div style={{ padding: '20px' }}>
        {/* Meal Cards */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
          {[
            { id: 'breakfast', title: 'Breakfast', count: breakfastCount, icon: 'coffee_maker' },
            { id: 'lunch', title: 'Lunch', count: lunchCount, icon: 'lunch_dining' },
            { id: 'dinner', title: 'Dinner', count: dinnerCount, icon: 'dinner_dining' }
          ].map(meal => (
            <div 
              key={meal.id}
              onClick={() => setActiveTab(meal.id)}
              style={{
                flex: 1,
                background: activeTab === meal.id ? 'linear-gradient(135deg, #0891b2, #06b6d4)' : 'white',
                color: activeTab === meal.id ? 'white' : '#475569',
                borderRadius: '12px',
                padding: '15px 10px',
                textAlign: 'center',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: activeTab === meal.id ? 'none' : '1px solid #e2e8f0'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '28px', marginBottom: '5px' }}>
                {meal.icon}
              </span>
              <div style={{ fontSize: '24px', fontWeight: 'bold', fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                {meal.count}
              </div>
              <div style={{ fontSize: '12px', fontWeight: '500' }}>{meal.title}</div>
            </div>
          ))}
        </div>

        {/* Meal Roster Section */}
        <h2 style={{
          fontFamily: "'Bricolage Grotesque', sans-serif",
          fontSize: '18px',
          color: '#1e293b',
          marginBottom: '15px'
        }}>
          Meal Roster
        </h2>

        <div style={{
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          marginBottom: '25px'
        }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
            {['breakfast', 'lunch', 'dinner'].map(tab => (
              <div 
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: '12px 0',
                  fontWeight: '600',
                  fontSize: '14px',
                  textTransform: 'capitalize',
                  color: activeTab === tab ? '#0891b2' : '#64748b',
                  borderBottom: activeTab === tab ? '2px solid #0891b2' : '2px solid transparent',
                  cursor: 'pointer'
                }}
              >
                {tab}
              </div>
            ))}
          </div>

          <div style={{ padding: '10px 20px' }}>
            {tenants.map((tenant, idx) => (
              <div key={tenant.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 0',
                borderBottom: idx === tenants.length - 1 ? 'none' : '1px solid #f1f5f9'
              }}>
                <div>
                  <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '15px' }}>{tenant.name}</div>
                  <div style={{ color: '#64748b', fontSize: '13px' }}>Room {tenant.room}</div>
                </div>
                
                {/* Toggle Switch */}
                <div 
                  onClick={() => toggleMeal(tenant.id, activeTab)}
                  style={{
                    width: '44px',
                    height: '24px',
                    borderRadius: '12px',
                    backgroundColor: tenant[activeTab] ? '#22c55e' : '#cbd5e1',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease'
                  }}
                >
                  <div style={{
                    width: '20px',
                    height: '20px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: '2px',
                    left: tenant[activeTab] ? '22px' : '2px',
                    transition: 'left 0.2s ease',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tip Section */}
        <div style={{
          backgroundColor: '#e0f2fe',
          borderRadius: '12px',
          padding: '15px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          marginBottom: '25px',
          border: '1px solid #bae6fd'
        }}>
          <span className="material-symbols-outlined" style={{ color: '#0369a1', fontSize: '20px' }}>lightbulb</span>
          <div>
            <div style={{ color: '#0369a1', fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>Cooking Tip</div>
            <div style={{ color: '#0c4a6e', fontSize: '13px', lineHeight: '1.4' }}>
              {activeTab === 'dinner' 
                ? `${dinnerCount} people eating dinner. Plan for ~${riceEstimate}kg rice.` 
                : `${getActiveCount()} people eating ${activeTab}. Plan accordingly.`}
            </div>
          </div>
        </div>

        {/* Export Button */}
        <button
          onClick={handleExport}
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
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 6px -1px rgba(8, 145, 178, 0.3)'
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>send</span>
          Export Headcount
        </button>
      </div>

      {/* Toast Message */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#334155',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '30px',
          fontSize: '14px',
          fontWeight: '500',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          whiteSpace: 'nowrap'
        }}>
          {toastMessage}
        </div>
      )}
    </div>
  );
}
