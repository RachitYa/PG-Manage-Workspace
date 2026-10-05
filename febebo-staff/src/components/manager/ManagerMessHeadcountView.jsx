import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, addDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { isStudentOnVacation, isMealPausedOnDate } from '../../utils/vacationUtils';

export default function ManagerMessHeadcountView({ adminId, onBack, onOpenFoodMenu, showToast }) {
  const [mealTab, setMealTab] = useState(() => {
    const hr = new Date().getHours();
    if (hr < 11) return 'breakfast';
    if (hr < 16) return 'lunch';
    if (hr < 19) return 'snacks';
    return 'dinner';
  });

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [tenants, setTenants] = useState([]);
  const [mealStatusLogs, setMealStatusLogs] = useState([]);
  const [eatenData, setEatenData] = useState({});
  const [vacations, setVacations] = useState([]);
  const [pausedMeals, setPausedMeals] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStat, setFilterStat] = useState('all'); // 'all' | 'requested' | 'pack' | 'extra' | 'eaten' | 'onVacation'

  // Real-time listeners
  useEffect(() => {
    if (!adminId) return;
    setLoading(true);

    const qTenants = query(collection(db, 'tenants'), where('adminId', '==', adminId));
    const unsubTenants = onSnapshot(qTenants, (snap) => {
      setTenants(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(t => t.status === 'Approved' || t.status === 'Current User' || t.status === 'Notice' || !t.status));
      setLoading(false);
    }, () => setLoading(false));

    const qVac = query(collection(db, 'food_vacations'), where('adminId', '==', adminId), where('status', 'in', ['active', 'shortened']));
    const unsubVac = onSnapshot(qVac, (snap) => {
      setVacations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubPG = onSnapshot(doc(db, 'pg_owners', adminId), (snap) => {
      if (snap.exists() && snap.data().pausedMeals) {
        setPausedMeals(snap.data().pausedMeals);
      }
    });

    return () => {
      unsubTenants();
      unsubVac();
      unsubPG();
    };
  }, [adminId]);

  // Listener for mess_headcount doc for selectedDate
  useEffect(() => {
    if (!adminId || !selectedDate) return;
    const unsubHeadcount = onSnapshot(doc(db, 'mess_headcount', `${adminId}_${selectedDate}`), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setEatenData(data);
        if (data.pausedMeals) {
          setPausedMeals(prev => ({
            ...prev,
            [selectedDate]: data.pausedMeals
          }));
        }
      } else {
        setEatenData({});
      }
    });

    const qMeal = query(collection(db, 'meal_status'), where('adminId', '==', adminId), where('date', '==', selectedDate));
    const unsubMeal = onSnapshot(qMeal, (snap) => {
      setMealStatusLogs(snap.docs.map(d => d.data()));
    });

    return () => {
      unsubHeadcount();
      unsubMeal();
    };
  }, [adminId, selectedDate]);

  // Computed student meal items
  const students = useMemo(() => {
    return tenants.map(t => {
      const mealLog = mealStatusLogs.find(m => m.tenantId === t.id);
      const mKey = mealTab.toLowerCase();

      const isEaten = !!eatenData[`${t.id}_${mKey}_eaten`];
      const isVac = isStudentOnVacation(vacations, t.id, selectedDate, mKey) || isMealPausedOnDate(t.foodVacation, selectedDate, mKey);
      const isFoodIncluded = t.foodIncluded !== false;

      let status = 'requested';
      if (!isFoodIncluded) status = 'selfCooking';
      else if (isVac) status = 'onVacation';
      else if (isEaten) status = 'eaten';
      else if (mealLog?.[mKey] === 'not_eating') status = 'notEaten';
      else if (mealLog?.[mKey] === 'pack') status = 'pack';
      else if (mealLog?.[mKey] === 'extra') status = 'extra';

      return {
        id: t.id,
        name: t.name || 'Student',
        roomNo: t.roomNo || t.room || 'N/A',
        bedNo: t.bedNo || t.bed || 'A',
        foodIncluded: isFoodIncluded,
        status,
        isEaten,
        details: mealLog?.[`${mKey}Details`] || ''
      };
    });
  }, [tenants, mealStatusLogs, eatenData, vacations, selectedDate, mealTab]);

  // Counts
  const counts = useMemo(() => {
    return {
      all: students.length,
      requested: students.filter(s => s.status === 'requested').length,
      pack: students.filter(s => s.status === 'pack').length,
      extra: students.filter(s => s.status === 'extra').length,
      eaten: students.filter(s => s.status === 'eaten').length,
      onVacation: students.filter(s => s.status === 'onVacation').length,
      selfCooking: students.filter(s => s.status === 'selfCooking').length,
    };
  }, [students]);

  // Filtered
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (filterStat !== 'all' && s.status !== filterStat) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (s.name || '').toLowerCase().includes(q) || (s.roomNo || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [students, filterStat, search]);

  // Toggle meal eaten
  const handleToggleEaten = async (studentId, currentIsEaten) => {
    try {
      const nextVal = !currentIsEaten;
      await setDoc(doc(db, 'mess_headcount', `${adminId}_${selectedDate}`), {
        [`${studentId}_${mealTab.toLowerCase()}_eaten`]: nextVal
      }, { merge: true });
    } catch (err) {
      console.error('Toggle eaten error:', err);
    }
  };

  // Toggle Pause
  const isPaused = !!(pausedMeals?.[selectedDate]?.[mealTab.toLowerCase()]);
  const handleTogglePause = async () => {
    const mKey = mealTab.toLowerCase();
    const nextVal = !isPaused;
    const updated = {
      ...pausedMeals,
      [selectedDate]: {
        ...(pausedMeals?.[selectedDate] || {}),
        [mKey]: nextVal
      }
    };
    setPausedMeals(updated);

    try {
      await setDoc(doc(db, 'pg_owners', adminId), { pausedMeals: updated }, { merge: true });
      await setDoc(doc(db, 'mess_headcount', `${adminId}_${selectedDate}`), {
        pausedMeals: updated[selectedDate]
      }, { merge: true });
      showToast?.(`${mealTab.toUpperCase()} is now ${nextVal ? 'PAUSED ⏸️' : 'RESUMED ▶️'}!`, nextVal ? 'warning' : 'success');
    } catch (err) {
      console.error('Meal pause error:', err);
    }
  };

  // Broadcast Food Ready
  const handleBroadcastFoodReady = async () => {
    if (!window.confirm(`Broadcast "Food is Ready" notification for ${mealTab.toUpperCase()} to all students?`)) return;
    try {
      const nowIso = new Date().toISOString();
      await Promise.all(tenants.map(t => {
        const uid = t.tenantId || t.id;
        return addDoc(collection(db, 'users', uid, 'notifications'), {
          title: `🍽️ ${mealTab.charAt(0).toUpperCase() + mealTab.slice(1)} is Ready!`,
          desc: `Hot and fresh ${mealTab} is now being served in the mess hall. Please head down!`,
          type: 'food',
          action: 'FOOD_TAB',
          unread: true,
          createdAt: nowIso
        }).catch(() => {});
      }));
      showToast?.(`📢 "Food Ready" broadcast sent to ${tenants.length} students!`, 'success');
    } catch (e) {
      console.error('Broadcast error:', e);
      showToast?.('Failed to send broadcast', 'error');
    }
  };

  return (
    <div style={{ padding: '0 0 calc(32px + env(safe-area-inset-bottom, 0px))', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '16px 16px', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={onBack} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#0f172a' }}>arrow_back</span>
            </button>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>Mess & Headcount</h2>
              <p style={{ margin: 0, fontSize: 11, color: '#64748b', fontWeight: 600 }}>Live Headcount & Attendance</p>
            </div>
          </div>
          <button
            onClick={onOpenFoodMenu}
            style={{
              background: '#ede9fe',
              color: '#6d28d9',
              border: '1px solid #ddd6fe',
              borderRadius: 10,
              padding: '7px 12px',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>restaurant_menu</span>
            Menu Timetable
          </button>
        </div>

        {/* Date Selector & Broadcast */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, background: '#f8fafc', padding: '6px 10px', borderRadius: 10, border: '1px solid #cbd5e1' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#64748b' }}>calendar_month</span>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: 13, fontWeight: 800, color: '#0f172a' }}
            />
          </div>

          <button
            onClick={handleBroadcastFoodReady}
            style={{
              background: '#fef08a',
              border: '1px solid #fde047',
              borderRadius: 10,
              padding: '8px 12px',
              fontSize: 12,
              fontWeight: 800,
              color: '#713f12',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>campaign</span>
            Food Ready!
          </button>
        </div>

        {/* Meal Tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 10 }}>
          {['breakfast', 'lunch', 'snacks', 'dinner'].map(m => (
            <button
              key={m}
              onClick={() => setMealTab(m)}
              style={{
                padding: '8px 0',
                borderRadius: 10,
                border: 'none',
                background: mealTab === m ? '#0f172a' : '#f1f5f9',
                color: mealTab === m ? '#fff' : '#475569',
                fontSize: 12,
                fontWeight: 800,
                textTransform: 'capitalize',
                cursor: 'pointer'
              }}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Pause Banner */}
        <div
          style={{
            background: isPaused ? '#fff1f2' : '#f0fdf4',
            border: `1.5px solid ${isPaused ? '#fecaca' : '#bbf7d0'}`,
            borderRadius: 12,
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: isPaused ? '#e11d48' : '#16a34a' }}>
              {isPaused ? 'pause_circle' : 'check_circle'}
            </span>
            <span style={{ fontSize: 12, fontWeight: 800, color: isPaused ? '#9f1239' : '#14532d' }}>
              {isPaused ? `${mealTab.toUpperCase()} is Paused for this date` : `${mealTab.toUpperCase()} is Active`}
            </span>
          </div>
          <button
            onClick={handleTogglePause}
            style={{
              background: isPaused ? '#10b981' : '#e11d48',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '5px 12px',
              fontSize: 11,
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            {isPaused ? '▶️ Resume' : '⏸️ Pause'}
          </button>
        </div>

        {/* Headcount Stat Counters */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginTop: 10 }}>
          {[
            { id: 'all', l: 'Eating', v: counts.requested + counts.eaten, c: '#0891b2', bg: '#ecfeff' },
            { id: 'pack', l: 'To Pack', v: counts.pack, c: '#d97706', bg: '#fef3c7' },
            { id: 'extra', l: 'Extra Plate', v: counts.extra, c: '#7c3aed', bg: '#ede9fe' },
            { id: 'eaten', l: 'Eaten', v: counts.eaten, c: '#16a34a', bg: '#dcfce7' },
            { id: 'onVacation', l: 'On Leave', v: counts.onVacation, c: '#dc2626', bg: '#fee2e2' },
          ].map(k => (
            <div
              key={k.id}
              onClick={() => setFilterStat(k.id === filterStat ? 'all' : k.id)}
              style={{
                background: filterStat === k.id ? k.c : k.bg,
                color: filterStat === k.id ? '#fff' : k.c,
                borderRadius: 10,
                padding: '6px 4px',
                textAlign: 'center',
                cursor: 'pointer',
                border: `1px solid ${filterStat === k.id ? k.c : '#e2e8f0'}`
              }}
            >
              <p style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>{k.v}</p>
              <p style={{ margin: '2px 0 0', fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase' }}>{k.l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Student Eating Checklist */}
      <div style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '8px 12px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#94a3b8' }}>search</span>
          <input
            type="text"
            placeholder="Search student or room..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: 13, fontWeight: 600 }}
          />
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, margin: 20 }}>Loading Headcount...</p>
        ) : filteredStudents.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, margin: 20 }}>No students found in this filter.</p>
        ) : (
          filteredStudents.map(s => {
            const isEaten = s.isEaten;
            const isOnLeave = s.status === 'onVacation';
            const isPack = s.status === 'pack';
            const isExtra = s.status === 'extra';

            return (
              <div
                key={s.id}
                style={{
                  background: isEaten ? '#f0fdf4' : isOnLeave ? '#f8fafc' : '#fff',
                  border: `1px solid ${isEaten ? '#bbf7d0' : isOnLeave ? '#e2e8f0' : '#cbd5e1'}`,
                  borderRadius: 14,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 8px rgba(15,23,42,0.03)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 900, color: '#0f172a' }}>{s.name}</h4>
                    {isPack && <span style={{ fontSize: 9.5, fontWeight: 800, padding: '1px 5px', borderRadius: 4, background: '#fef3c7', color: '#92400e' }}>PACK</span>}
                    {isExtra && <span style={{ fontSize: 9.5, fontWeight: 800, padding: '1px 5px', borderRadius: 4, background: '#ede9fe', color: '#7c3aed' }}>EXTRA</span>}
                    {isOnLeave && <span style={{ fontSize: 9.5, fontWeight: 800, padding: '1px 5px', borderRadius: 4, background: '#fee2e2', color: '#b91c1c' }}>ON LEAVE</span>}
                  </div>
                  <p style={{ margin: '2px 0 0', fontSize: 11.5, color: '#64748b' }}>
                    Room {s.roomNo} · Bed {s.bedNo}
                  </p>
                </div>

                {!isOnLeave ? (
                  <button
                    onClick={() => handleToggleEaten(s.id, isEaten)}
                    style={{
                      background: isEaten ? '#16a34a' : '#f1f5f9',
                      color: isEaten ? '#fff' : '#475569',
                      border: 'none',
                      borderRadius: 10,
                      padding: '8px 14px',
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                      {isEaten ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                    {isEaten ? 'Eaten ✅' : 'Mark Eaten'}
                  </button>
                ) : (
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8' }}>Vacation</span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
