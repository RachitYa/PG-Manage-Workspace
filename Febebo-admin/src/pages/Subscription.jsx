import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const cyan = '#0891b2';

const PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    price: '₹499',
    period: '/month',
    icon: 'star',
    iconColor: '#64748b',
    accentColor: '#64748b',
    bgColor: '#f8fafc',
    features: [
      'Up to 10 Rooms',
      '1 PG Profile',
      'Basic Reports',
      'Email Support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '₹999',
    period: '/month',
    icon: 'bolt',
    iconColor: cyan,
    accentColor: cyan,
    bgColor: '#ecfeff',
    features: [
      'Up to 50 Rooms',
      '3 PG Profiles',
      'Advanced Reports',
      'Staff Management',
      'Priority Support',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '₹2,499',
    period: '/month',
    icon: 'shield',
    iconColor: '#8b5cf6',
    accentColor: '#8b5cf6',
    bgColor: '#faf5ff',
    features: [
      'Unlimited Rooms',
      'Unlimited PGs',
      'Full Analytics',
      'All Features',
      'Dedicated Account Manager',
    ],
  },
];

const WA_NUMBER = '919999999999'; // placeholder — replace with real number

export default function Subscription() {
  const navigate = useNavigate();
  const { user, activePgId } = useAuth();

  const [currentPlan, setCurrentPlan] = useState('basic');
  const [loading, setLoading] = useState(true);

  /* --- Fetch current subscription plan --- */
  useEffect(() => {
    if (!user?.uid) return;
    (async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, 'adminSettings', user.uid));
        if (snap.exists() && snap.data().subscriptionPlan) {
          setCurrentPlan(snap.data().subscriptionPlan);
        } else {
          setCurrentPlan('basic');
        }
      } catch (err) {
        console.error('Error fetching subscription:', err);
        setCurrentPlan('basic');
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const handleUpgrade = (planName) => {
    const text = encodeURIComponent(`Hi, I'd like to upgrade my PG Manage account to the ${planName} plan. My user ID is: ${user?.uid || 'N/A'}`);
    window.open(`https://wa.me/${WA_NUMBER}?text=${text}`, '_blank');
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk', sans-serif", paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0c1a2e, #0f2847)', paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))', padding: '0 16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, height: 64 }}>
          <button onClick={() => navigate(-1)}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back_ios_new</span>
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'white' }}>Subscription Plans</h1>
            <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>Manage your plan</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#38bdf8' }}>workspace_premium</span>
          </div>
        </div>

        {/* Hero text */}
        <div style={{ textAlign: 'center', paddingTop: 4, paddingBottom: 4 }}>
          <p style={{ color: '#cbd5e1', fontSize: 13, margin: 0 }}>Unlock more features for your PG business</p>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', paddingTop: 80 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#cbd5e1', display: 'block', marginBottom: 12 }}>sync</span>
          <p style={{ color: '#94a3b8', fontSize: 14, fontWeight: 600 }}>Loading your plan...</p>
        </div>
      )}

      {/* Plan cards */}
      {!loading && (
        <div style={{ padding: '20px 16px' }}>

          {/* Current plan chip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, background: 'white', borderRadius: 12, padding: '10px 14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: cyan }}>verified</span>
            <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 700 }}>
              Your current plan: <span style={{ color: cyan, textTransform: 'capitalize' }}>{currentPlan}</span>
            </span>
          </div>

          {PLANS.map(plan => {
            const isCurrent = plan.id === currentPlan;
            return (
              <div key={plan.id} style={{
                background: 'white',
                borderRadius: 20,
                border: isCurrent ? `2px solid ${plan.accentColor}` : '1px solid #e2e8f0',
                marginBottom: 16,
                overflow: 'visible',
                boxShadow: isCurrent
                  ? `0 4px 20px ${plan.accentColor}22`
                  : '0 2px 8px rgba(0,0,0,0.04)',
                position: 'relative',
              }}>

                {/* Current Plan badge */}
                {isCurrent && (
                  <div style={{
                    position: 'absolute',
                    top: -13,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: plan.accentColor,
                    color: 'white',
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '3px 14px',
                    borderRadius: 20,
                    whiteSpace: 'nowrap',
                    letterSpacing: 0.3,
                  }}>
                    ✦ Current Plan
                  </div>
                )}

                {/* Card top */}
                <div style={{ padding: '20px 20px 16px', background: isCurrent ? plan.bgColor : 'white', borderRadius: isCurrent ? '18px 18px 0 0' : '20px 20px 0 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 14, background: plan.accentColor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 24, color: plan.accentColor, fontVariationSettings: "'FILL' 1" }}>
                          {plan.icon}
                        </span>
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{plan.name}</p>
                        <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Plan</p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: 0, fontSize: 26, fontWeight: 900, color: plan.accentColor, lineHeight: 1 }}>{plan.price}</p>
                      <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>{plan.period}</p>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div style={{ padding: '12px 20px 16px', borderTop: `1px solid ${plan.accentColor}11` }}>
                  {plan.features.map((feature, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i < plan.features.length - 1 ? 10 : 0 }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: plan.accentColor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 13, color: plan.accentColor, fontVariationSettings: "'FILL' 1" }}>check</span>
                      </div>
                      <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div style={{ padding: '0 20px 20px' }}>
                  {isCurrent ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px 0', background: plan.accentColor + '10', borderRadius: 12, border: `1px dashed ${plan.accentColor}44` }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: plan.accentColor }}>check_circle</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: plan.accentColor }}>You're on this plan</span>
                    </div>
                  ) : (
                    <button onClick={() => handleUpgrade(plan.name)}
                      style={{ width: '100%', padding: '13px 0', background: `linear-gradient(135deg, ${plan.accentColor}, ${plan.accentColor}cc)`, color: 'white', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: `0 4px 14px ${plan.accentColor}44` }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>whatsapp</span>
                      Upgrade to {plan.name} via WhatsApp
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Footer note */}
          <div style={{ background: 'white', borderRadius: 14, padding: '14px 16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#f59e0b', flexShrink: 0, marginTop: 1 }}>info</span>
            <p style={{ fontSize: 12, color: '#64748b', margin: 0, lineHeight: 1.6 }}>
              To upgrade your plan, tap the WhatsApp button above. Our team will confirm the upgrade and update your plan within a few hours.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
