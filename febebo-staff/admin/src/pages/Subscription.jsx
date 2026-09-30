import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Zap, Shield } from 'lucide-react';

const PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    price: '₹499',
    period: '/month',
    icon: <Star size={24} />,
    color: 'var(--text-muted)',
    features: ['Up to 10 Rooms', '1 PG Profile', 'Basic Reports', 'Email Support'],
    current: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '₹999',
    period: '/month',
    icon: <Zap size={24} />,
    color: 'var(--primary)',
    features: ['Up to 50 Rooms', '3 PG Profiles', 'Advanced Reports', 'Staff Management', 'Priority Support'],
    current: false,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '₹2,499',
    period: '/month',
    icon: <Shield size={24} />,
    color: '#8b5cf6',
    features: ['Unlimited Rooms', 'Unlimited PGs', 'Full Analytics', 'All Features', 'Dedicated Account Manager'],
    current: false,
  },
];

export default function Subscription() {
  const navigate = useNavigate();

  return (
    <div className="app-container">
      <div className="top-nav">
        <div className="flex items-center gap-4">
          <button className="icon-btn" onClick={() => navigate('/admin-dashboard')}><ArrowLeft size={24} /></button>
          <div className="nav-title">Subscription Plans</div>
        </div>
      </div>
      <div style={{ padding: '16px' }}>
        <div className="text-center mb-6">
          <h2>Choose Your Plan</h2>
          <p style={{ marginTop: '8px' }}>Unlock more features for your PG</p>
        </div>

        {PLANS.map(plan => (
          <div key={plan.id} className="card" style={{ marginBottom: '16px', border: plan.current ? '2px solid var(--primary)' : '1px solid var(--border-color)', position: 'relative' }}>
            {plan.current && (
              <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'var(--primary)', color: 'white', fontSize: '0.75rem', padding: '2px 12px', borderRadius: 'var(--radius-full)', fontWeight: '600' }}>
                Current Plan
              </div>
            )}
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <div style={{ color: plan.color }}>{plan.icon}</div>
                <div style={{ fontWeight: '700', fontSize: '1.125rem' }}>{plan.name}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontWeight: '700', fontSize: '1.25rem', color: plan.color }}>{plan.price}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{plan.period}</span>
              </div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              {plan.features.map((f, i) => (
                <div key={i} className="flex items-center gap-2" style={{ marginBottom: '8px', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>✓</span> {f}
                </div>
              ))}
            </div>
            {!plan.current && (
              <button className="btn-primary" style={{ backgroundColor: plan.color }}>Upgrade to {plan.name}</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
