import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const MENU_ITEMS = [
  { category: 'Accommodation', items: [
    { name: 'Single Sharing Bed', price: '₹ 8,000 /mo' },
    { name: 'Double Sharing Bed', price: '₹ 6,500 /mo' },
    { name: 'Triple Sharing Bed', price: '₹ 5,000 /mo' },
    { name: 'Four Sharing Bed', price: '₹ 4,000 /mo' },
    { name: 'Security Deposit', price: '₹ 10,000 (once)' },
  ]},
  { category: 'Food (Optional)', items: [
    { name: 'Monthly Meal Plan (2 meals)', price: '₹ 3,000 /mo' },
    { name: 'Breakfast Only', price: '₹ 1,200 /mo' },
    { name: 'Dinner Only', price: '₹ 2,000 /mo' },
    { name: 'Per Meal (Thali)', price: '₹ 80 /meal' },
  ]},
  { category: 'Services', items: [
    { name: 'Laundry (per kg)', price: '₹ 50 /kg' },
    { name: 'Housekeeping (extra)', price: '₹ 500 /mo' },
    { name: 'Electricity (per unit)', price: '₹ 8 /unit' },
    { name: 'Parking (Two-wheeler)', price: '₹ 300 /mo' },
  ]},
];

export default function PriceMenu() {
  const navigate = useNavigate();

  return (
    <div className="app-container">
      <div className="top-nav">
        <div className="flex items-center gap-4">
          <button className="icon-btn" onClick={() => navigate('/admin-dashboard')}><ArrowLeft size={24} /></button>
          <div className="nav-title">Price Menu</div>
        </div>
      </div>
      <div style={{ padding: '16px' }}>
        {MENU_ITEMS.map(section => (
          <div key={section.category} className="card" style={{ marginBottom: '16px' }}>
            <h3 style={{ marginBottom: '12px', color: 'var(--primary)', fontSize: '1rem' }}>{section.category}</h3>
            {section.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center" style={{ paddingTop: idx === 0 ? 0 : '12px', borderTop: idx === 0 ? 'none' : '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.875rem' }}>{item.name}</span>
                <span style={{ fontWeight: '600', fontSize: '0.875rem', color: 'var(--primary)' }}>{item.price}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
