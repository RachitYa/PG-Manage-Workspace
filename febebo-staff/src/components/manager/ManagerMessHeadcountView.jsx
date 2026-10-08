import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, addDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { isStudentOnVacation, isMealPausedOnDate } from '../../utils/vacationUtils';

export default function ManagerMessHeadcountView({ adminId, staffName = 'Manager', staffRole = 'Manager', onBack, onOpenFoodMenu, showToast }) {
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
  const [deliveryOrders, setDeliveryOrders] = useState([]);
  const [eatenData, setEatenData] = useState({});
  const [vacations, setVacations] = useState([]);
  const [pausedMeals, setPausedMeals] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStat, setFilterStat] = useState('all'); // 'all' | 'requested' | 'pack' | 'delivery' | 'extra' | 'eaten' | 'onVacation'

  // Audit modal state
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditSearchQuery, setAuditSearchQuery] = useState('');

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

  // Listener for mess_headcount and delivery_orders docs for selectedDate
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

    const qDeliv = query(collection(db, 'delivery_orders'), where('adminId', '==', adminId), where('date', '==', selectedDate));
    const unsubDeliv = onSnapshot(qDeliv, (snap) => {
      setDeliveryOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubHeadcount();
      unsubMeal();
      unsubDeliv();
    };
  }, [adminId, selectedDate]);

  // Computed student meal items
  const students = useMemo(() => {
    return tenants.map(t => {
      const mealLog = mealStatusLogs.find(m => m.tenantId === t.id);
      const mKey = mealTab.toLowerCase();

      const isEaten = !!eatenData[`${t.id}_${mKey}_eaten`];
      const audit = eatenData[`${t.id}_${mKey}_audit`] || null;
      const isVac = isStudentOnVacation(vacations, t.id, selectedDate, mKey) || isMealPausedOnDate(t.foodVacation, selectedDate, mKey);
      const isFoodIncluded = t.foodIncluded !== false;
      const deliv = deliveryOrders.find(d => d.studentId === t.id && d.meal?.toLowerCase() === mKey) || null;

      let status = 'requested';
      if (!isFoodIncluded) status = 'selfCooking';
      else if (isVac) status = 'onVacation';
      else if (isEaten) status = 'eaten';
      else if (mealLog?.[mKey] === 'not_eating') status = 'notEaten';
      else if (deliv || mealLog?.[mKey] === 'delivery') status = 'delivery';
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
        audit,
        deliv,
        details: mealLog?.[`${mKey}Details`] || (deliv ? `🛵 Delivery: ${deliv.destination || deliv.destinationType}` : '')
      };
    });
  }, [tenants, mealStatusLogs, eatenData, vacations, deliveryOrders, selectedDate, mealTab]);

  // Counts
  const counts = useMemo(() => {
    return {
      all: students.length,
      requested: students.filter(s => s.status === 'requested').length,
      pack: students.filter(s => s.status === 'pack').length,
      delivery: students.filter(s => s.status === 'delivery').length,
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

  // Toggle meal eaten with audit metadata
  const handleToggleEaten = async (studentId, currentIsEaten) => {
    try {
      const nextVal = !currentIsEaten;
      const mKey = mealTab.toLowerCase();
      const updatePayload = {
        [`${studentId}_${mKey}_eaten`]: nextVal
      };
      if (nextVal) {
        updatePayload[`${studentId}_${mKey}_audit`] = {
          confirmedVia: 'manual_manager',
          markedByName: staffName || 'Manager',
          markedByRole: staffRole || 'Manager',
          timestamp: new Date().toISOString()
        };
      } else {
        updatePayload[`${studentId}_${mKey}_audit`] = null;
      }
      await setDoc(doc(db, 'mess_headcount', `${adminId}_${selectedDate}`), updatePayload, { merge: true });
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
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setShowAuditModal(true)}
              style={{
                background: '#ede9fe',
                color: '#6d28d9',
                border: '1px solid #ddd6fe',
                borderRadius: 10,
                padding: '7px 11px',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>verified</span>
              Audit Log
            </button>
            <button
              onClick={onOpenFoodMenu}
              style={{
                background: '#f1f5f9',
                color: '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: 10,
                padding: '7px 11px',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>restaurant_menu</span>
              Menu
            </button>
          </div>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 5, marginTop: 10 }}>
          {[
            { id: 'all', l: 'Eating', v: counts.requested + counts.eaten, c: '#0891b2', bg: '#ecfeff' },
            { id: 'pack', l: 'To Pack', v: counts.pack, c: '#d97706', bg: '#fef3c7' },
            { id: 'delivery', l: 'Delivery', v: counts.delivery, c: '#7c3aed', bg: '#ede9fe' },
            { id: 'extra', l: 'Extra Plate', v: counts.extra, c: '#0284c7', bg: '#e0f2fe' },
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
                padding: '6px 2px',
                textAlign: 'center',
                cursor: 'pointer',
                border: `1px solid ${filterStat === k.id ? k.c : '#e2e8f0'}`
              }}
            >
              <p style={{ margin: 0, fontSize: 15, fontWeight: 900 }}>{k.v}</p>
              <p style={{ margin: '2px 0 0', fontSize: 8.5, fontWeight: 800, textTransform: 'uppercase' }}>{k.l}</p>
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
            const isDelivery = s.status === 'delivery';
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 900, color: '#0f172a' }}>{s.name}</h4>
                    {isPack && <span style={{ fontSize: 9.5, fontWeight: 800, padding: '1px 5px', borderRadius: 4, background: '#fef3c7', color: '#92400e' }}>PACK (LATER)</span>}
                    {isDelivery && <span style={{ fontSize: 9.5, fontWeight: 800, padding: '1px 5px', borderRadius: 4, background: '#ede9fe', color: '#6d28d9' }}>🛵 DELIVERY (TIFFIN)</span>}
                    {isExtra && <span style={{ fontSize: 9.5, fontWeight: 800, padding: '1px 5px', borderRadius: 4, background: '#e0f2fe', color: '#0369a1' }}>EXTRA</span>}
                    {isOnLeave && <span style={{ fontSize: 9.5, fontWeight: 800, padding: '1px 5px', borderRadius: 4, background: '#fee2e2', color: '#b91c1c' }}>ON LEAVE</span>}
                  </div>
                  <p style={{ margin: '2px 0 0', fontSize: 11.5, color: '#64748b' }}>
                    Room {s.roomNo} · Bed {s.bedNo}
                  </p>
                  {isEaten && s.audit && (
                    <div style={{
                      marginTop: 4,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 10,
                      fontWeight: 700,
                      background: s.audit.confirmedVia === 'counter_qr' ? '#ecfdf5' : s.audit.confirmedVia === 'delivery_qr' ? '#f5f3ff' : s.audit.confirmedVia === 'delivery_boy' ? '#eff6ff' : '#fffbeb',
                      color: s.audit.confirmedVia === 'counter_qr' ? '#047857' : s.audit.confirmedVia === 'delivery_qr' ? '#6d28d9' : s.audit.confirmedVia === 'delivery_boy' ? '#0284c7' : '#b45309',
                      padding: '2px 6px',
                      borderRadius: 6,
                      border: '1px solid rgba(0,0,0,0.06)'
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
                        {s.audit.confirmedVia === 'counter_qr' ? 'qr_code_scanner' : s.audit.confirmedVia === 'delivery_qr' ? 'two_wheeler' : s.audit.confirmedVia === 'delivery_boy' ? 'local_shipping' : 'verified'}
                      </span>
                      <span>
                        {s.audit.confirmedVia === 'counter_qr' ? 'Mess QR Scan' : s.audit.confirmedVia === 'delivery_qr' ? `Delivery QR (${s.audit.markedByName || 'Staff'})` : s.audit.confirmedVia === 'delivery_boy' ? `Delivered: ${s.audit.markedByName || 'Staff'}` : `${s.audit.markedByRole || 'Staff'}: ${s.audit.markedByName || 'Staff'}`}
                        {s.audit.timestamp ? ` · ${new Date(s.audit.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                      </span>
                    </div>
                  )}
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

      {/* Headcount Audit History Modal */}
      {showAuditModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,23,42,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 1001,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '560px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 18px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#ffffff'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ede9fe', color: '#6d28d9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>fact_check</span>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>
                    Audit Log: {mealTab.toUpperCase()}
                  </h3>
                  <p style={{ margin: '1px 0 0', fontSize: '11px', color: '#64748b' }}>
                    {selectedDate} · Verification Source &amp; History
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAuditModal(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
              </button>
            </div>

            {/* Verification Breakdown */}
            <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                <div style={{ background: '#fff', border: '1px solid #bbf7d0', borderRadius: 8, padding: '6px', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#16a34a' }}>{counts.eaten}</p>
                  <p style={{ margin: 0, fontSize: 9, fontWeight: 800, color: '#64748b' }}>EATEN</p>
                </div>
                <div style={{ background: '#fff', border: '1px solid #a7f3d0', borderRadius: 8, padding: '6px', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#047857' }}>
                    {students.filter(s => s.audit?.confirmedVia === 'counter_qr').length}
                  </p>
                  <p style={{ margin: 0, fontSize: 9, fontWeight: 800, color: '#64748b' }}>MESS QR</p>
                </div>
                <div style={{ background: '#fff', border: '1px solid #ddd6fe', borderRadius: 8, padding: '6px', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#7c3aed' }}>
                    {students.filter(s => s.audit?.confirmedVia === 'delivery_qr' || s.audit?.confirmedVia === 'delivery_boy').length}
                  </p>
                  <p style={{ margin: 0, fontSize: 9, fontWeight: 800, color: '#64748b' }}>DELIVERY</p>
                </div>
                <div style={{ background: '#fff', border: '1px solid #fed7aa', borderRadius: 8, padding: '6px', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#ea580c' }}>
                    {students.filter(s => s.audit?.confirmedVia && s.audit?.confirmedVia.startsWith('manual_')).length}
                  </p>
                  <p style={{ margin: 0, fontSize: 9, fontWeight: 800, color: '#64748b' }}>MANUAL</p>
                </div>
              </div>
            </div>

            {/* Audit Search */}
            <div style={{ padding: '10px 16px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f1f5f9', borderRadius: 8, padding: '6px 10px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#94a3b8' }}>search</span>
                <input
                  type="text"
                  placeholder="Filter student in audit..."
                  value={auditSearchQuery}
                  onChange={e => setAuditSearchQuery(e.target.value)}
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 12, fontWeight: 600, width: '100%' }}
                />
              </div>
            </div>

            {/* Student Audit Rows */}
            <div style={{ padding: '12px 16px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(() => {
                const list = students.filter(s => {
                  if (!auditSearchQuery.trim()) return true;
                  const q = auditSearchQuery.toLowerCase();
                  return (s.name || '').toLowerCase().includes(q) || String(s.roomNo || '').toLowerCase().includes(q);
                });

                if (list.length === 0) {
                  return <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, margin: 16 }}>No students found</p>;
                }

                return list.map(s => {
                  const isEaten = s.isEaten;
                  const audit = s.audit;
                  const deliv = s.deliv;

                  return (
                    <div
                      key={s.id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: 10,
                        padding: '8px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{s.name}</span>
                          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>R-{s.roomNo}</span>
                        </div>
                        <div style={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                          {isEaten && audit ? (
                            <span style={{
                              fontSize: 9.5,
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: 4,
                              background: audit.confirmedVia === 'counter_qr' ? '#ecfdf5' : audit.confirmedVia === 'delivery_qr' ? '#f5f3ff' : audit.confirmedVia === 'delivery_boy' ? '#eff6ff' : '#fffbeb',
                              color: audit.confirmedVia === 'counter_qr' ? '#047857' : audit.confirmedVia === 'delivery_qr' ? '#6d28d9' : audit.confirmedVia === 'delivery_boy' ? '#0284c7' : '#b45309',
                              border: '1px solid rgba(0,0,0,0.06)'
                            }}>
                              {audit.confirmedVia === 'counter_qr' ? '🤳 Counter QR Scanned' : audit.confirmedVia === 'delivery_qr' ? `🛵 Delivery QR (${audit.markedByName || 'Staff'})` : audit.confirmedVia === 'delivery_boy' ? `📦 Delivered: ${audit.markedByName || 'Staff'}` : `✍️ ${audit.markedByRole || 'Staff'}: ${audit.markedByName || 'Staff'}`}
                              {audit.timestamp ? ` · ${new Date(audit.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                            </span>
                          ) : isEaten ? (
                            <span style={{ fontSize: 9.5, fontWeight: 700, background: '#dcfce7', color: '#166534', padding: '1px 5px', borderRadius: 4 }}>
                              ✅ Eaten (Untracked)
                            </span>
                          ) : s.status === 'delivery' ? (
                            <span style={{ fontSize: 9.5, fontWeight: 700, background: '#ede9fe', color: '#6d28d9', padding: '1px 5px', borderRadius: 4 }}>
                              🛵 Tiffin Delivery {deliv ? `(${deliv.destination || deliv.destinationType})` : ''}
                            </span>
                          ) : s.status === 'pack' ? (
                            <span style={{ fontSize: 9.5, fontWeight: 700, background: '#fef3c7', color: '#92400e', padding: '1px 5px', borderRadius: 4 }}>
                              📦 Pack for Later
                            </span>
                          ) : s.status === 'onVacation' ? (
                            <span style={{ fontSize: 9.5, fontWeight: 700, background: '#fee2e2', color: '#b91c1c', padding: '1px 5px', borderRadius: 4 }}>
                              🏖️ On Food Leave
                            </span>
                          ) : (
                            <span style={{ fontSize: 9.5, fontWeight: 700, background: '#f1f5f9', color: '#64748b', padding: '1px 5px', borderRadius: 4 }}>
                              {s.status === 'extra' ? '➕ Extra Plate' : s.status === 'notEaten' ? '❌ Not Eating' : '⏳ Requested'}
                            </span>
                          )}
                        </div>
                      </div>

                      <span style={{
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '3px 6px',
                        borderRadius: 6,
                        background: isEaten ? '#dcfce7' : '#f1f5f9',
                        color: isEaten ? '#166534' : '#64748b'
                      }}>
                        {isEaten ? 'CONFIRMED' : 'PENDING'}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
