import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection, query, where, getDocs,
  doc, setDoc, getDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

// ─── helpers ────────────────────────────────────────────────────────────────
function getTodayStr() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDisplayDate() {
  const d = new Date();
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

// ────────────────────────────────────────────────────────────────────────────

export default function MessHeadcount() {
  const navigate = useNavigate();
  const { user, activePgId } = useAuth();

  const [tenants, setTenants]           = useState([]);
  const [prefs, setPrefs]               = useState({});
  const [activeTab, setActiveTab]       = useState('breakfast');
  const [loading, setLoading]           = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  const todayStr   = getTodayStr();
  const docId      = `${user?.uid}_${todayStr}`;
  const prefDocRef = user?.uid ? doc(db, 'mess_headcount', docId) : null;

  // ── Fetch tenants + today's preferences ───────────────────────────────────
  useEffect(() => {
    if (!user?.uid) return;

    async function load() {
      setLoading(true);
      try {
        const tSnap = await getDocs(
          query(
            collection(db, 'tenants'),
            where('adminId', '==', user.uid), where('pgId', '==', activePgId),
            where('status',  '==', 'Approved')
          )
        );
        const list = tSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setTenants(list);

        const prefSnap = await getDoc(prefDocRef);
        if (prefSnap.exists()) {
          setPrefs(prefSnap.data());
        } else {
          const defaults = {};
          list.forEach(t => {
            defaults[`${t.id}_breakfast`] = true;
            defaults[`${t.id}_lunch`]     = true;
            defaults[`${t.id}_snacks`]    = true;
            defaults[`${t.id}_dinner`]    = true;
          });
          setPrefs(defaults);
        }
      } catch (err) {
        console.error('MessHeadcount load error:', err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Toggle a meal for a tenant ────────────────────────────────────────────
  const toggleMeal = async (tenantId, meal) => {
    const key     = `${tenantId}_${meal}`;
    const newVal  = !prefs[key];
    const updated = { ...prefs, [key]: newVal };
    setPrefs(updated);
    try {
      await setDoc(prefDocRef, { [key]: newVal }, { merge: true });
    } catch (err) {
      console.error('Toggle save error:', err);
      setPrefs(prefs);
    }
  };

  // ── Derived counts ────────────────────────────────────────────────────────
  const countEaten = meal => tenants.filter(t => prefs[`${t.id}_${meal}_eaten`]).length;
  const breakfastCount = countEaten('breakfast');
  const lunchCount     = countEaten('lunch');
  const snacksCount    = countEaten('snacks');
  const dinnerCount    = countEaten('dinner');
  const activeCount    = activeTab === 'breakfast' ? breakfastCount
                       : activeTab === 'lunch'     ? lunchCount
                       : activeTab === 'snacks'    ? snacksCount
                       : dinnerCount;
  const riceEstimate   = (dinnerCount * 0.125).toFixed(1);

  const handleExport = () => {
    setToastMessage('Headcount sent to Cook');
    setTimeout(() => setToastMessage(''), 3000);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      fontFamily: "'Hanken Grotesk', sans-serif",
      maxWidth: '480px',
      margin: '0 auto',
      backgroundColor: '#f1f5f9',
      minHeight: '100vh',
      paddingBottom: '40px',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0c1a2e, #0f2847)',
        padding: '20px',
        paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
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
          fontWeight: '600',
        }}>
          Mess &amp; Headcount
        </h1>
      </div>

      {/* Date bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '15px 20px',
        backgroundColor: 'white',
        borderBottom: '1px solid #e2e8f0',
      }}>
        <span style={{ fontWeight: '600', color: '#1e293b', fontSize: '15px' }}>
          Today, {formatDisplayDate()}
        </span>
      </div>

      {loading ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          color: '#64748b',
          gap: '12px',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '40px', color: '#0891b2' }}>
            hourglass_top
          </span>
          <span>Loading headcount…</span>
        </div>
      ) : (
        <div style={{ padding: '20px' }}>

          {/* ── Meal Count Cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '25px' }}>
            {[
              { id: 'breakfast', title: 'Breakfast', count: breakfastCount, icon: 'coffee_maker' },
              { id: 'lunch',     title: 'Lunch',     count: lunchCount,     icon: 'lunch_dining' },
              { id: 'snacks',    title: 'Snacks',    count: snacksCount,    icon: 'bakery_dining' },
              { id: 'dinner',    title: 'Dinner',    count: dinnerCount,    icon: 'dinner_dining' },
            ].map(meal => (
              <div
                key={meal.id}
                onClick={() => setActiveTab(meal.id)}
                style={{
                  background: activeTab === meal.id
                    ? 'linear-gradient(135deg, #0891b2, #06b6d4)'
                    : 'white',
                  color: activeTab === meal.id ? 'white' : '#475569',
                  borderRadius: '12px',
                  padding: '15px 10px',
                  textAlign: 'center',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  border: activeTab === meal.id ? 'none' : '1px solid #e2e8f0',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '28px', display: 'block', marginBottom: '5px' }}>
                  {meal.icon}
                </span>
                <div style={{ fontSize: '24px', fontWeight: 'bold', fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                  {meal.count}
                </div>
                <div style={{ fontSize: '12px', fontWeight: '500' }}>{meal.title}</div>
              </div>
            ))}
          </div>

          {/* ── Meal Roster ── */}
          <h2 style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontSize: '18px',
            color: '#1e293b',
            marginBottom: '15px',
            marginTop: 0,
          }}>
            Who Eaten?
          </h2>

          <div style={{
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
            overflow: 'hidden',
            marginBottom: '25px',
          }}>
            {/* Tab row */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
              {['breakfast', 'lunch', 'snacks', 'dinner'].map(tab => (
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
                    cursor: 'pointer',
                  }}
                >
                  {tab}
                </div>
              ))}
            </div>

            <div style={{ padding: '10px 20px' }}>
              {tenants.filter(t => prefs[`${t.id}_${activeTab}_eaten`]).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 20px', color: '#94a3b8' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '40px', display: 'block', marginBottom: '8px' }}>
                    no_meals
                  </span>
                  No one has eaten yet.
                </div>
              ) : (
                tenants.filter(t => prefs[`${t.id}_${activeTab}_eaten`]).map((tenant, idx, arr) => (
                  <div
                    key={tenant.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 0',
                      borderBottom: idx === arr.length - 1 ? 'none' : '1px solid #f1f5f9',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '15px' }}>
                        {tenant.name}
                      </div>
                      <div style={{ color: '#64748b', fontSize: '13px' }}>
                        Room {tenant.room}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontSize: '13px', fontWeight: '700' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
                      Eaten
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── Cooking Tip ── */}
          <div style={{
            backgroundColor: '#e0f2fe',
            borderRadius: '12px',
            padding: '15px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            marginBottom: '25px',
            border: '1px solid #bae6fd',
          }}>
            <span className="material-symbols-outlined" style={{ color: '#0369a1', fontSize: '20px' }}>
              lightbulb
            </span>
            <div>
              <div style={{ color: '#0369a1', fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>
                Cooking Tip
              </div>
              <div style={{ color: '#0c4a6e', fontSize: '13px', lineHeight: '1.4' }}>
                {activeTab === 'dinner'
                  ? `${dinnerCount} people eating dinner. Plan for ~${riceEstimate}kg rice.`
                  : `${activeCount} people eating ${activeTab}. Plan accordingly.`}
              </div>
            </div>
          </div>

          {/* ── Export Button ── */}
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
              boxShadow: '0 4px 6px -1px rgba(8,145,178,0.3)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>send</span>
            Export Headcount
          </button>
        </div>
      )}

      {/* Toast */}
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
          whiteSpace: 'nowrap',
        }}>
          {toastMessage}
        </div>
      )}
    </div>
  );
}
