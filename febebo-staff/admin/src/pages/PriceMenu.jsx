import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const cyan = '#0891b2';

const MENU_ITEMS = [
  { category: 'Accommodation', icon: 'hotel', color: '#6366f1', items: [
    { name: 'Single Sharing Bed', price: '₹8,000', per: '/mo', desc: 'Private room, attached bath option' },
    { name: 'Double Sharing Bed', price: '₹6,500', per: '/mo', desc: 'Shared with 1 person' },
    { name: 'Triple Sharing Bed', price: '₹5,000', per: '/mo', desc: 'Shared with 2 persons' },
    { name: 'Four Sharing Bed',   price: '₹4,000', per: '/mo', desc: 'Shared with 3 persons' },
    { name: 'Security Deposit',   price: '₹10,000', per: '(once)', desc: 'Refundable at checkout' },
  ]},
  { category: 'Food (Optional)', icon: 'restaurant', color: '#ef4444', items: [
    { name: 'Monthly Meal Plan', price: '₹3,000', per: '/mo', desc: 'Breakfast + Dinner daily' },
    { name: 'Breakfast Only',    price: '₹1,200', per: '/mo', desc: '7 AM – 9 AM' },
    { name: 'Dinner Only',       price: '₹2,000', per: '/mo', desc: '8 PM – 9:30 PM' },
    { name: 'Per Meal (Thali)',  price: '₹80',    per: '/meal', desc: 'Pay as you go' },
  ]},
  { category: 'Services', icon: 'build', color: '#10b981', items: [
    { name: 'Laundry',            price: '₹50',  per: '/kg',  desc: 'Washed & folded' },
    { name: 'Housekeeping Extra', price: '₹500', per: '/mo',  desc: 'Deep cleaning once a month' },
    { name: 'Electricity',        price: '₹8',   per: '/unit', desc: 'As per meter reading' },
    { name: 'Parking (2-wheeler)',price: '₹300', per: '/mo',  desc: 'Covered parking slot' },
  ]},
  { category: 'Transportation', icon: 'directions_car', color: '#f59e0b', items: [
    { name: 'Cab Share (Noida)',  price: '₹1,500', per: '/mo', desc: 'Sector 62 route' },
    { name: 'Cab Share (Gurgaon)',price: '₹2,000', per: '/mo', desc: 'Cyber City route' },
    { name: 'Metro Card Load',    price: 'At cost', per: '',   desc: 'No extra charge' },
  ]},
];

export default function PriceMenu() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState(null);

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk', sans-serif", paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0c1a2e, #0f2847)', padding: '0 16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, height: 64 }}>
          <button onClick={() => navigate('/admin-dashboard')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back_ios_new</span>
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'white' }}>Price Menu</h1>
            <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>All charges & packages</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#38bdf8' }}>receipt_long</span>
          </div>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {MENU_ITEMS.map((section) => (
          <div key={section.category} style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', marginBottom: 14, overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
            {/* Section header */}
            <div onClick={() => setActiveSection(activeSection === section.category ? null : section.category)}
              style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', borderBottom: activeSection === section.category ? '1px solid #f1f5f9' : 'none' }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: section.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22, color: section.color }}>{section.icon}</span>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{section.category}</p>
                <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>{section.items.length} items</p>
              </div>
              <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#94a3b8', transform: activeSection === section.category ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>expand_more</span>
            </div>

            {/* Items */}
            {activeSection === section.category && (
              <div>
                {section.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: idx < section.items.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{item.name}</p>
                      <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>{item.desc}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: section.color }}>{item.price}</span>
                      <span style={{ fontSize: 11, color: '#94a3b8', display: 'block' }}>{item.per}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Preview when collapsed */}
            {activeSection !== section.category && (
              <div style={{ padding: '8px 16px 12px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {section.items.slice(0, 3).map((item, idx) => (
                  <span key={idx} style={{ fontSize: 11, color: '#64748b', background: '#f8fafc', padding: '3px 8px', borderRadius: 6 }}>{item.name}</span>
                ))}
                {section.items.length > 3 && <span style={{ fontSize: 11, color: '#94a3b8' }}>+{section.items.length - 3} more</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
