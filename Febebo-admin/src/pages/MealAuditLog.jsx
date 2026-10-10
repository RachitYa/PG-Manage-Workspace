import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { isStudentOnVacation, isMealPausedOnDate } from '../utils/vacationUtils';

const MEAL_TIMES = {
  breakfast: '8:00 AM – 10:30 AM',
  lunch: '12:30 PM – 3:00 PM',
  snacks: '5:00 PM – 6:30 PM',
  dinner: '8:00 PM – 10:30 PM'
};

const DEFAULT_MENU = {
  Monday:    { Breakfast: 'Aloo Paratha, Curd, Tea', Lunch: 'Dal Tadka, Jeera Rice, Roti, Salad', Snacks: 'Samosa, Mint Chutney, Tea', Dinner: 'Paneer Butter Masala, Roti, Rice, Kheer' },
  Tuesday:   { Breakfast: 'Poha, Jalebi, Tea', Lunch: 'Rajma Chawal, Roti, Mixed Veg', Snacks: 'Veg Cutlet, Coffee', Dinner: 'Aloo Gobi, Dal Makhani, Roti, Rice' },
  Wednesday: { Breakfast: 'Idli, Sambar, Coconut Chutney', Lunch: 'Chole Bhature, Onion Salad, Boondi Raita', Snacks: 'Bread Pakora, Tea', Dinner: 'Mix Veg, Dal Tadka, Roti, Rice' },
  Thursday:  { Breakfast: 'Methi Paratha, Pickle, Tea', Lunch: 'Kadhi Pakoda, Steam Rice, Roti, Salad', Snacks: 'Pani Puri / Chaat, Tea', Dinner: 'Matar Paneer, Roti, Jeera Rice' },
  Friday:    { Breakfast: 'Upma, Chutney, Masala Chai', Lunch: 'Dal Fry, Aloo Jeera, Roti, Rice', Snacks: 'Vada Pav, Green Chutney', Dinner: 'Special Thali, Gulab Jamun, Veg Pulao' },
  Saturday:  { Breakfast: 'Puri Sabji, Halwa', Lunch: 'Khichdi, Papad, Pickle, Curd', Snacks: 'Bhel Puri, Lemon Tea', Dinner: 'Mushroom Masala, Roti, Dal, Rice' },
  Sunday:    { Breakfast: 'Masala Dosa, Sambar, Chutney', Lunch: 'Veg Biryani, Mirchi Ka Salan, Raita', Snacks: 'Pasta / Chowmein, Cold Coffee', Dinner: 'Shahi Paneer, Butter Roti, Peas Pulao, Ice Cream' },
};

export default function MealAuditLog() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, activePgId } = useAuth();

  const stateDate = location.state?.date;
  const stateMeal = location.state?.meal;

  const [selectedDate, setSelectedDate] = useState(() => stateDate || new Date().toISOString().split('T')[0]);
  const [mealTab, setMealTab] = useState(() => {
    if (stateMeal) return stateMeal.toLowerCase();
    const hr = new Date().getHours();
    if (hr < 11) return 'breakfast';
    if (hr < 16) return 'lunch';
    if (hr < 19) return 'snacks';
    return 'dinner';
  });

  const [filterChannel, setFilterChannel] = useState('all'); // 'all' | 'counter_qr' | 'delivery' | 'pack' | 'manual' | 'pending'
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const [rawTenants, setRawTenants] = useState([]);
  const [eatenData, setEatenData] = useState({});
  const [deliveryOrders, setDeliveryOrders] = useState([]);
  const [vacations, setVacations] = useState([]);
  const [weeklyMenu, setWeeklyMenu] = useState(DEFAULT_MENU);
  const [pgProfile, setPgProfile] = useState(null);

  const mealKey = mealTab === 'breakfast' ? 'statusB' : mealTab === 'lunch' ? 'statusL' : mealTab === 'snacks' ? 'statusS' : 'statusD';
  const auditKey = mealTab === 'breakfast' ? 'auditB' : mealTab === 'lunch' ? 'auditL' : mealTab === 'snacks' ? 'auditS' : 'auditD';
  const delivKey = mealTab === 'breakfast' ? 'delivB' : mealTab === 'lunch' ? 'delivL' : mealTab === 'snacks' ? 'delivS' : 'delivD';

  const matchesPg = (itemPgId) => {
    if (!activePgId || activePgId === 'primary') {
      return !itemPgId || itemPgId === 'primary' || itemPgId === user?.uid;
    }
    return itemPgId === activePgId;
  };

  // 1. Fetch PG Profile & Name
  useEffect(() => {
    if (!user?.uid) return;
    const fetchPg = async () => {
      try {
        const snap = await getDoc(doc(db, 'pg_profiles', user.uid));
        if (snap.exists()) setPgProfile(snap.data());
        else {
          const snapOwner = await getDoc(doc(db, 'pg_owners', user.uid));
          if (snapOwner.exists()) setPgProfile(snapOwner.data());
        }
      } catch (e) {
        console.error('Error fetching PG profile:', e);
      }
    };
    fetchPg();
  }, [user?.uid]);

  // 2. Tenants listener
  useEffect(() => {
    if (!user?.uid) return;
    const qTenants = query(collection(db, 'tenants'), where('adminId', '==', user.uid));
    const unsub = onSnapshot(qTenants, (snap) => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(d => matchesPg(d.pgId) && d.status !== 'Past' && d.status !== 'Rejected' && d.status !== 'Archived');
      setRawTenants(list);
      setLoading(false);
    });
    return () => unsub();
  }, [user?.uid, activePgId]);

  // 3. Mess Headcount doc for selected date
  useEffect(() => {
    if (!user?.uid) return;
    const activeAdmin = activePgId && activePgId !== 'primary' ? activePgId : user.uid;
    const docRef = doc(db, 'mess_headcount', `${activeAdmin}_${selectedDate}`);
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        setEatenData(snap.data());
      } else {
        setEatenData({});
      }
    });
    return () => unsub();
  }, [user?.uid, activePgId, selectedDate]);

  // 4. Delivery orders for selected date
  useEffect(() => {
    if (!user?.uid) return;
    const qDeliv = query(
      collection(db, 'delivery_orders'),
      where('adminId', '==', user.uid),
      where('date', '==', selectedDate)
    );
    const unsub = onSnapshot(qDeliv, (snap) => {
      setDeliveryOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user?.uid, selectedDate]);

  // 5. Vacations listener
  useEffect(() => {
    if (!user?.uid) return;
    const qVac = query(collection(db, 'food_vacations'), where('adminId', '==', user.uid));
    const unsub = onSnapshot(qVac, (snap) => {
      setVacations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user?.uid]);

  // 6. Food menu listener
  useEffect(() => {
    if (!user?.uid) return;
    const docRef = doc(db, 'weekly_food_menu', user.uid);
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists() && snap.data().menu) {
        setWeeklyMenu(snap.data().menu);
      }
    });
    return () => unsub();
  }, [user?.uid]);

  // Build unified student attendance list with full audit trail
  const students = useMemo(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const selectedDateObj = new Date(selectedDate);
    const dayOfWeek = days[selectedDateObj.getDay()];

    return rawTenants.map(t => {
      const isEaten = !!eatenData[`${t.id}_${mealTab}_eaten`];
      const audit = eatenData[`${t.id}_${mealTab}_audit`] || null;
      const deliv = deliveryOrders.find(d => d.studentId === t.id && d.meal?.toLowerCase() === mealTab.toLowerCase()) || null;

      const isVac = isStudentOnVacation(vacations, t.id, selectedDate, mealTab) || isMealPausedOnDate(t.foodVacation, selectedDate, mealTab);
      const isFoodIncluded = t.foodIncluded !== false;

      let status = 'requested';
      if (!isFoodIncluded) status = 'selfCooking';
      else if (isVac) status = 'onVacation';
      else if (isEaten) status = 'eaten';
      else if (deliv) status = 'delivery';

      return {
        id: t.id,
        name: t.name || 'Student',
        room: t.roomNo || t.room || 'N/A',
        bed: t.bedNo || t.bed || 'A',
        phone: t.phone || '',
        foodIncluded: isFoodIncluded,
        status,
        audit,
        deliv,
        dayOfWeek
      };
    });
  }, [rawTenants, eatenData, deliveryOrders, vacations, selectedDate, mealTab]);

  // Filtered list
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      // Channel filter
      if (filterChannel === 'confirmed' && s.status !== 'eaten') return false;
      if (filterChannel === 'pending' && s.status === 'eaten') return false;
      if (filterChannel === 'counter_qr' && s.audit?.confirmedVia !== 'counter_qr') return false;
      if (filterChannel === 'delivery' && !(s.audit?.confirmedVia === 'delivery_qr' || s.audit?.confirmedVia === 'delivery_boy' || s.status === 'delivery')) return false;
      if (filterChannel === 'pack' && s.status !== 'pack') return false;
      if (filterChannel === 'manual' && !(s.audit?.confirmedVia && s.audit?.confirmedVia.startsWith('manual_'))) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          String(s.room).toLowerCase().includes(q) ||
          (s.audit?.markedByName || '').toLowerCase().includes(q) ||
          (s.deliv?.destination || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [students, filterChannel, searchQuery]);

  // Metrics
  const stats = useMemo(() => {
    const total = students.length;
    const eaten = students.filter(s => s.status === 'eaten').length;
    const counterQr = students.filter(s => s.audit?.confirmedVia === 'counter_qr').length;
    const delivery = students.filter(s => s.audit?.confirmedVia === 'delivery_qr' || s.audit?.confirmedVia === 'delivery_boy' || s.status === 'delivery').length;
    const manual = students.filter(s => s.audit?.confirmedVia && s.audit?.confirmedVia.startsWith('manual_')).length;
    const vacation = students.filter(s => s.status === 'onVacation').length;
    const pending = students.filter(s => s.status !== 'eaten' && s.status !== 'onVacation').length;

    return { total, eaten, counterQr, delivery, manual, vacation, pending };
  }, [students]);

  const daysArr = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = daysArr[new Date(selectedDate).getDay()];
  const mealSlotName = mealTab.charAt(0).toUpperCase() + mealTab.slice(1);
  const scheduledDishes = weeklyMenu[dayName]?.[mealSlotName] || 'Standard Fresh Meal Prepared';

  const auditRefCode = `AUD-${selectedDate.replace(/-/g, '')}-${mealTab.toUpperCase().substring(0, 3)}`;

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif', paddingBottom: 60 }}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-audit, #printable-audit * { visibility: visible; }
          #printable-audit {
            position: absolute !important;
            left: 0 !important; top: 0 !important;
            width: 100% !important; max-width: 100% !important;
            box-shadow: none !important; border: none !important; margin: 0 !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* ── TOP NAV BAR (APPLE STYLE BLURRED HEADER) ── */}
      <div className="no-print" style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'saturate(180%) blur(20px)',
        borderBottom: '1px solid #f2f2f7',
        padding: '12px 16px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: '#f2f2f7',
              border: 'none',
              borderRadius: '50%',
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#000000'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#000000', letterSpacing: -0.3 }}>
              Meal Audit
            </h1>
            <p style={{ margin: 0, fontSize: 11, color: '#8e8e93', fontWeight: 500 }}>
              {pgProfile?.pgName || 'Mess Audit'} · #{auditRefCode}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => navigate('/mess-headcount')}
            style={{
              background: '#f2f2f7',
              border: 'none',
              color: '#000000',
              padding: '6px 12px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>restaurant</span>
            Live
          </button>
          <button
            onClick={() => window.print()}
            style={{
              background: '#000000',
              border: 'none',
              color: '#ffffff',
              width: 34,
              height: 34,
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Print Audit"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>print</span>
          </button>
        </div>
      </div>

      <div id="printable-audit" style={{ maxWidth: 680, margin: '0 auto', padding: '16px' }}>

        {/* ── DATE PICKER & APPLE SEGMENTED CONTROL ── */}
        <div className="no-print" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#f2f2f7',
              borderRadius: 12,
              padding: '6px 12px',
              border: '1px solid #ebebf0'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#636366' }}>calendar_today</span>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#000000',
                  fontWeight: 600,
                  fontSize: 13,
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#8e8e93' }}>
              {new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}
            </span>
          </div>

          {/* iOS Segmented Meal Slot Tabs */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            background: '#f2f2f7',
            borderRadius: 12,
            padding: 3,
            border: '1px solid #ebebf0'
          }}>
            {[
              { id: 'breakfast', label: 'Breakfast' },
              { id: 'lunch',     label: 'Lunch' },
              { id: 'snacks',    label: 'Snacks' },
              { id: 'dinner',    label: 'Dinner' },
            ].map(slot => {
              const active = mealTab === slot.id;
              return (
                <button
                  key={slot.id}
                  onClick={() => setMealTab(slot.id)}
                  style={{
                    background: active ? '#ffffff' : 'transparent',
                    color: active ? '#000000' : '#8e8e93',
                    border: 'none',
                    borderRadius: 9,
                    padding: '8px 4px',
                    fontSize: 12.5,
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                    boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {slot.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── KPI METRICS (CLEAN APPLE CARDS) ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
          <div style={{ background: '#fbfbfd', border: '1px solid #ebebf0', borderRadius: 14, padding: '12px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: 0.3 }}>Total</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#000000', marginTop: 2 }}>{stats.total}</div>
          </div>
          <div style={{ background: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: 14, padding: '12px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: 0.3 }}>Eaten</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#15803d', marginTop: 2 }}>
              {stats.eaten} <span style={{ fontSize: 11, fontWeight: 600 }}>({Math.round((stats.eaten / (stats.total || 1)) * 100)}%)</span>
            </div>
          </div>
          <div style={{ background: '#fff7ed', border: '1px solid #ffedd5', borderRadius: 14, padding: '12px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: '#ea580c', textTransform: 'uppercase', letterSpacing: 0.3 }}>Delivery</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#ea580c', marginTop: 2 }}>{stats.delivery}</div>
          </div>
          <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 14, padding: '12px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: 0.3 }}>Pending</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#dc2626', marginTop: 2 }}>{stats.pending}</div>
          </div>
        </div>

        {/* ── DISHES & TIMING BANNER (MINIMAL SINGLE ROW) ── */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid #ebebf0',
          borderRadius: 14,
          padding: '10px 14px',
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#ea580c', flexShrink: 0 }}>restaurant</span>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1c1c1e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {scheduledDishes}
            </div>
          </div>
          <span style={{ fontSize: 11, color: '#8e8e93', fontWeight: 600, flexShrink: 0 }}>
            {MEAL_TIMES[mealTab] || ''}
          </span>
        </div>

        {/* ── SEARCH & FILTER CONTROLS ── */}
        <div className="no-print" style={{ marginBottom: 12 }}>
          {/* iOS Style Search Input */}
          <div style={{
            position: 'relative',
            marginBottom: 10
          }}>
            <span className="material-symbols-outlined" style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: 18,
              color: '#8e8e93'
            }}>search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search student, room, verifier..."
              style={{
                width: '100%',
                background: '#f2f2f7',
                border: 'none',
                borderRadius: 12,
                padding: '9px 12px 9px 38px',
                fontSize: 13,
                fontWeight: 500,
                color: '#000000',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit'
              }}
            />
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
            {[
              { id: 'all',        label: `All (${students.length})` },
              { id: 'confirmed',  label: `Eaten (${stats.eaten})` },
              { id: 'counter_qr', label: `QR (${stats.counterQr})` },
              { id: 'delivery',   label: `Delivery (${stats.delivery})` },
              { id: 'manual',     label: `Manual (${stats.manual})` },
              { id: 'pending',    label: `Pending (${stats.pending})` },
            ].map(tab => {
              const active = filterChannel === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilterChannel(tab.id)}
                  style={{
                    background: active ? '#000000' : '#f2f2f7',
                    color: active ? '#ffffff' : '#636366',
                    border: 'none',
                    borderRadius: 20,
                    padding: '6px 12px',
                    fontSize: 11.5,
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── STUDENT ITEMIZED AUDIT LIST (APPLE TABLE VIEW) ── */}
        <div style={{
          background: '#ffffff',
          borderRadius: 16,
          border: '1px solid #ebebf0',
          overflow: 'hidden'
        }}>
          {filteredStudents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: '#8e8e93' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#d1d1d6' }}>search_off</span>
              <p style={{ margin: '8px 0 0', fontSize: 13, fontWeight: 500 }}>No students found</p>
            </div>
          ) : (
            filteredStudents.map((s, idx) => {
              const isConfirmed = s.status === 'eaten';
              const audit = s.audit;
              const deliv = s.deliv;

              return (
                <div
                  key={s.id}
                  style={{
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    borderBottom: idx < filteredStudents.length - 1 ? '1px solid #f2f2f7' : 'none',
                    background: '#ffffff'
                  }}
                >
                  {/* Left: Avatar + Details */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: isConfirmed ? '#e8f5e9' : s.status === 'delivery' ? '#fff3e0' : s.status === 'onVacation' ? '#fee2e2' : '#f2f2f7',
                      color: isConfirmed ? '#2e7d32' : s.status === 'delivery' ? '#e65100' : s.status === 'onVacation' ? '#b91c1c' : '#636366',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                      fontWeight: 700,
                      flexShrink: 0
                    }}>
                      {s.name ? s.name.charAt(0).toUpperCase() : 'S'}
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#000000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.name}
                        </span>
                        <span style={{ fontSize: 10.5, fontWeight: 600, background: '#f2f2f7', color: '#636366', padding: '1px 6px', borderRadius: 4, flexShrink: 0 }}>
                          R-{s.room}
                        </span>
                      </div>

                      {/* Micro Status Label */}
                      <div style={{ fontSize: 11, color: '#8e8e93', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {isConfirmed && audit ? (
                          <span>
                            {audit.confirmedVia === 'counter_qr' ? '🤳 Counter QR' :
                             audit.confirmedVia === 'delivery_qr' ? `🛵 Delivery QR (${audit.markedByName || 'Staff'})` :
                             audit.confirmedVia === 'delivery_boy' ? `📦 Delivered (${audit.markedByName || 'Staff'})` :
                             `✍️ ${audit.markedByName || 'Staff'}`}
                            {audit.timestamp ? ` · ${new Date(audit.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                          </span>
                        ) : isConfirmed ? (
                          <span>Marked eaten</span>
                        ) : s.status === 'delivery' ? (
                          <span style={{ color: '#ea580c' }}>
                            🛵 Delivery {deliv?.destination ? `· ${deliv.destination}` : ''}
                          </span>
                        ) : s.status === 'onVacation' ? (
                          <span style={{ color: '#dc2626' }}>🏖️ On food leave</span>
                        ) : (
                          <span>Not eaten yet</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Crisp Apple Pill */}
                  <div style={{ flexShrink: 0 }}>
                    {isConfirmed ? (
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '4px 9px',
                        borderRadius: 14,
                        background: '#e8f5e9',
                        color: '#2e7d32'
                      }}>
                        ✓ Eaten
                      </span>
                    ) : s.status === 'delivery' ? (
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '4px 9px',
                        borderRadius: 14,
                        background: '#fff3e0',
                        color: '#e65100'
                      }}>
                        Delivery
                      </span>
                    ) : s.status === 'onVacation' ? (
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '4px 9px',
                        borderRadius: 14,
                        background: '#fee2e2',
                        color: '#dc2626'
                      }}>
                        Leave
                      </span>
                    ) : (
                      <span style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '4px 9px',
                        borderRadius: 14,
                        background: '#f2f2f7',
                        color: '#8e8e93'
                      }}>
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}
