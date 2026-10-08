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
    <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk', sans-serif", paddingBottom: 80 }}>
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

      {/* ── TOP NAV BAR ────────────────────────────────────────────── */}
      <div className="no-print" style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '12px 20px', position: 'sticky', top: 0, zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate(-1)}
            style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#0f172a' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
          </button>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#0891b2' }}>fact_check</span>
              Meal Audit Log
            </h2>
            <p style={{ margin: 0, fontSize: 11, color: '#64748b', fontWeight: 600 }}>Detailed headcount verification trail</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => navigate('/mess-headcount')}
            style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#0f172a', padding: '7px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>restaurant</span>
            Live Headcount
          </button>
          <button
            onClick={() => window.print()}
            style={{ background: '#0891b2', border: 'none', color: '#ffffff', padding: '7px 14px', borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, boxShadow: '0 2px 8px rgba(8,145,178,0.25)' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>print</span>
            Print Audit
          </button>
        </div>
      </div>

      <div id="printable-audit" style={{ maxWidth: 840, margin: '20px auto', padding: '0 16px' }}>

        {/* ── AUDIT RECEIPT HERO CARD ─────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(160deg, #0c1a2e 0%, #0f2847 60%, #0c3461 100%)',
          borderRadius: 20,
          padding: '24px 24px 20px',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(12,26,46,0.15)',
          marginBottom: 16
        }}>
          {/* Ambient Glows */}
          <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(56,189,248,0.12)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -20, left: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(99,102,241,0.1)', pointerEvents: 'none' }} />

          {/* Header Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px dashed rgba(255,255,255,0.2)', paddingBottom: 16, marginBottom: 16 }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: 1 }}>
                Official Verification Audit
              </span>
              <h1 style={{ margin: '4px 0 2px', fontSize: 22, fontWeight: 900, color: '#ffffff', letterSpacing: -0.5 }}>
                {pgProfile?.pgName || 'Febebo PG Living'}
              </h1>
              <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                {pgProfile?.address || 'Primary Campus'} · Food & Mess Operations
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Audit Reference</span>
              <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 800, color: '#38bdf8', fontFamily: "'JetBrains Mono', monospace" }}>
                #{auditRefCode}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#cbd5e1' }}>
                {new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Date & Meal Slot Selector */}
          <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            {/* Date Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '6px 12px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#38bdf8' }}>calendar_month</span>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', fontWeight: 700, fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
              />
            </div>

            {/* Meal Slot Tabs */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 3, border: '1px solid rgba(255,255,255,0.15)' }}>
              {[
                { id: 'breakfast', label: 'Breakfast', icon: 'coffee' },
                { id: 'lunch',     label: 'Lunch',     icon: 'lunch_dining' },
                { id: 'snacks',    label: 'Snacks',    icon: 'bakery_dining' },
                { id: 'dinner',    label: 'Dinner',    icon: 'dinner_dining' },
              ].map(slot => {
                const active = mealTab === slot.id;
                return (
                  <button
                    key={slot.id}
                    onClick={() => setMealTab(slot.id)}
                    style={{
                      background: active ? '#38bdf8' : 'transparent',
                      color: active ? '#0c1a2e' : '#ffffff',
                      border: 'none',
                      borderRadius: 9,
                      padding: '6px 12px',
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      transition: 'all 0.15s'
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{slot.icon}</span>
                    {slot.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            <div style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 12px' }}>
              <p style={{ margin: 0, fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Total Enrolled</p>
              <p style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 900, color: '#ffffff' }}>{stats.total}</p>
            </div>
            <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 12, padding: '10px 12px' }}>
              <p style={{ margin: 0, fontSize: 10, color: '#6ee7b7', fontWeight: 700, textTransform: 'uppercase' }}>Confirmed Eaten</p>
              <p style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 900, color: '#34d399' }}>
                {stats.eaten} <span style={{ fontSize: 11, fontWeight: 700 }}>({Math.round((stats.eaten / (stats.total || 1)) * 100)}%)</span>
              </p>
            </div>
            <div style={{ background: 'rgba(234,88,12,0.15)', border: '1px solid rgba(234,88,12,0.25)', borderRadius: 12, padding: '10px 12px' }}>
              <p style={{ margin: 0, fontSize: 10, color: '#fdba74', fontWeight: 700, textTransform: 'uppercase' }}>Tiffins & Delivery</p>
              <p style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 900, color: '#fb923c' }}>{stats.delivery}</p>
            </div>
            <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '10px 12px' }}>
              <p style={{ margin: 0, fontSize: 10, color: '#fca5a5', fontWeight: 700, textTransform: 'uppercase' }}>Unverified / Pending</p>
              <p style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 900, color: '#f87171' }}>{stats.pending}</p>
            </div>
          </div>
        </div>

        {/* ── MEALS & FOOD DETAILS SECTION (Requested by User) ───────── */}
        <div style={{ background: '#ffffff', borderRadius: 18, border: '1px solid #e2e8f0', padding: '18px 20px', marginBottom: 16, boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: '#ede9fe', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>restaurant_menu</span>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                  Meal Details: {mealSlotName} ({dayName})
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                  Serving Window: {MEAL_TIMES[mealTab] || 'Standard Time'}
                </p>
              </div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 8, background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}>
              Kitchen Prepared & Verified
            </span>
          </div>

          {/* Dishes tags */}
          <div>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Scheduled Dishes for {dayName} {mealSlotName}:
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {scheduledDishes.split(/[,;]/).map((dish, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: 10,
                    padding: '6px 12px',
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: '#1e293b'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#0891b2' }}>check_circle</span>
                  {dish.trim()}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── VERIFICATION CHANNELS BREAKDOWN (Receipt Style) ───────── */}
        <div style={{ background: '#ffffff', borderRadius: 18, border: '1px solid #e2e8f0', padding: '18px 20px', marginBottom: 16, boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.8, margin: '0 0 12px', borderBottom: '2px solid #0f172a', paddingBottom: 6 }}>
            Verification Channel Breakdown
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '12px', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#16a34a' }}>qr_code_scanner</span>
              <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 900, color: '#16a34a' }}>{stats.counterQr}</p>
              <p style={{ margin: '2px 0 0', fontSize: 10.5, fontWeight: 700, color: '#64748b' }}>Counter QR Scan</p>
            </div>

            <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 12, padding: '12px', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#7c3aed' }}>two_wheeler</span>
              <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 900, color: '#7c3aed' }}>{stats.delivery}</p>
              <p style={{ margin: '2px 0 0', fontSize: 10.5, fontWeight: 700, color: '#64748b' }}>Tiffin Delivery</p>
            </div>

            <div style={{ background: '#fffbeb', border: '1px solid #fed7aa', borderRadius: 12, padding: '12px', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#d97706' }}>draw</span>
              <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 900, color: '#d97706' }}>{stats.manual}</p>
              <p style={{ margin: '2px 0 0', fontSize: 10.5, fontWeight: 700, color: '#64748b' }}>Manual Staff Override</p>
            </div>

            <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 12, padding: '12px', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#e11d48' }}>event_busy</span>
              <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 900, color: '#e11d48' }}>{stats.vacation}</p>
              <p style={{ margin: '2px 0 0', fontSize: 10.5, fontWeight: 700, color: '#64748b' }}>On Food Vacation</p>
            </div>
          </div>
        </div>

        {/* ── STUDENT ITEMIZED AUDIT LOG TABLE ──────────────────────── */}
        <div style={{ background: '#ffffff', borderRadius: 18, border: '1px solid #e2e8f0', padding: '18px 20px', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                Itemized Verification Trail ({filteredStudents.length})
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b' }}>Individual student verification timestamps & badges</p>
            </div>
          </div>

          {/* Search & Filter pills */}
          <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
            {/* Search Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '8px 12px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#94a3b8' }}>search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search student by name, room, verifier..."
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, fontWeight: 600, width: '100%', fontFamily: 'inherit' }}
              />
            </div>

            {/* Filter pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[
                { id: 'all',        label: `All (${students.length})` },
                { id: 'confirmed',  label: `Confirmed (${stats.eaten})` },
                { id: 'counter_qr', label: `Counter QR (${stats.counterQr})` },
                { id: 'delivery',   label: `Delivery (${stats.delivery})` },
                { id: 'manual',     label: `Manual (${stats.manual})` },
                { id: 'pending',    label: `Pending (${stats.pending})` },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFilterChannel(tab.id)}
                  style={{
                    background: filterChannel === tab.id ? '#0891b2' : '#f8fafc',
                    color: filterChannel === tab.id ? '#ffffff' : '#475569',
                    border: `1px solid ${filterChannel === tab.id ? '#0891b2' : '#e2e8f0'}`,
                    borderRadius: 10,
                    padding: '5px 12px',
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.15s'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Audit Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredStudents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 0', color: '#94a3b8' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#cbd5e1' }}>search_off</span>
                <p style={{ margin: '8px 0 0', fontSize: 13, fontWeight: 600 }}>No students found matching filters.</p>
              </div>
            ) : (
              filteredStudents.map(s => {
                const isConfirmed = s.status === 'eaten';
                const audit = s.audit;
                const deliv = s.deliv;

                return (
                  <div
                    key={s.id}
                    style={{
                      background: isConfirmed ? '#ffffff' : '#f8fafc',
                      border: `1px solid ${isConfirmed ? '#cbd5e1' : '#e2e8f0'}`,
                      borderRadius: 14,
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12
                    }}
                  >
                    {/* Student Info */}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{s.name}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                          Rm {s.room} · Bed {s.bed}
                        </span>
                      </div>

                      {/* Verification Badge */}
                      <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {isConfirmed && audit ? (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: 6,
                              background: audit.confirmedVia === 'counter_qr' ? '#ecfdf5' : audit.confirmedVia === 'delivery_qr' ? '#f5f3ff' : audit.confirmedVia === 'delivery_boy' ? '#eff6ff' : '#fffbeb',
                              color: audit.confirmedVia === 'counter_qr' ? '#047857' : audit.confirmedVia === 'delivery_qr' ? '#6d28d9' : audit.confirmedVia === 'delivery_boy' ? '#0284c7' : '#b45309',
                              border: `1px solid ${audit.confirmedVia === 'counter_qr' ? '#a7f3d0' : audit.confirmedVia === 'delivery_qr' ? '#ddd6fe' : audit.confirmedVia === 'delivery_boy' ? '#bae6fd' : '#fde68a'}`
                            }}
                          >
                            {audit.confirmedVia === 'counter_qr'
                              ? '🤳 Counter QR Scanned'
                              : audit.confirmedVia === 'delivery_qr'
                              ? `🛵 Delivery QR (${audit.markedByName || 'Staff'})`
                              : audit.confirmedVia === 'delivery_boy'
                              ? `📦 Marked Delivered: ${audit.markedByName || 'Staff'}`
                              : `✍️ ${audit.markedByRole || 'Staff'}: ${audit.markedByName || 'Admin'}`}
                            {audit.timestamp ? ` · ${new Date(audit.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : ''}
                          </span>
                        ) : isConfirmed ? (
                          <span style={{ fontSize: 11, fontWeight: 700, background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: 6 }}>
                            ✅ Confirmed Eaten
                          </span>
                        ) : s.status === 'delivery' ? (
                          <span style={{ fontSize: 11, fontWeight: 700, background: '#ede9fe', color: '#6d28d9', padding: '3px 8px', borderRadius: 6, border: '1px solid #ddd6fe' }}>
                            🛵 Tiffin Delivery {deliv ? `(${deliv.destination || deliv.destinationType})` : ''}
                          </span>
                        ) : s.status === 'onVacation' ? (
                          <span style={{ fontSize: 11, fontWeight: 700, background: '#fee2e2', color: '#b91c1c', padding: '3px 8px', borderRadius: 6, border: '1px solid #fecaca' }}>
                            🏖️ On Food Vacation / Leave
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, fontWeight: 700, background: '#f1f5f9', color: '#64748b', padding: '3px 8px', borderRadius: 6 }}>
                            ⏳ Pending Meal Verification
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right side status pill */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          padding: '5px 10px',
                          borderRadius: 8,
                          background: isConfirmed ? '#dcfce7' : '#f1f5f9',
                          color: isConfirmed ? '#15803d' : '#64748b',
                          border: `1px solid ${isConfirmed ? '#bbf7d0' : '#e2e8f0'}`,
                          letterSpacing: 0.5
                        }}
                      >
                        {isConfirmed ? 'CONFIRMED' : 'PENDING'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
