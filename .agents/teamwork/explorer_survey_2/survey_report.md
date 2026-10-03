# Comprehensive Survey Report: febebo-staff & Febebo-admin Kitchen & Headcount Experience

**Investigator**: Explorer 2  
**Target Applications**: `febebo-staff` (Cook / Staff App) & `Febebo-admin` (Admin App)  
**Feature**: Tenant Long-Term Food Vacation / Meal Pause Synchronization  
**Date**: 2026-10-02  
**Working Directory**: `c:\Users\RACHIT\OneDrive\Desktop\Febeboo\.agents\teamwork\explorer_survey_2`

---

## Executive Summary

This report delivers a complete architectural and code-level investigation of `febebo-staff` and `Febebo-admin` for the **Febeboo Long-Term Food Vacation** feature.

Currently, both applications assume that all approved tenants in a PG are eating every meal by default (`requested`), unless a daily single-meal cancellation is recorded in `meal_status` or the student is confirmed eaten in `mess_headcount`. Neither application currently accounts for multi-day meal leave, leading to overcooked food, inaccurate headcount metrics, and manual overhead.

This survey establishes the exact data structures, components, calculation formulas, and realtime query listeners required to:
1. Automatically deduct students on active Food Vacation from the "Eating / Requested" headcount for paused meals on any selected date.
2. Provide a dedicated **"On Food Vacation / Leave"** counter and interactive student list in both the Cook dashboard and the Admin Mess Headcount dashboard.
3. Synchronize early vacation shortening and one-click meal resumes in real time via Firestore `onSnapshot` subscriptions without requiring page reloads.

Both `febebo-staff` and `Febebo-admin` have been verified to compile cleanly with `npm run build` exiting with code 0.

---

## 1. Architectural File Inventory & Component Mapping

### 1.1 `febebo-staff` File Map

| File Path | Component / Context | Key Function / Scope |
|---|---|---|
| `febebo-staff/src/pages/StaffApp.jsx` | `StaffApp` (Lines 1–8691) | Primary application screen containing the Cook dashboard, real-time student roster, Live Headcount counter card, Counter QR generator modal, and Manual Selection modal. |
| `febebo-staff/src/context/AuthContext.jsx` | `AuthProvider`, `useAuth` | Manages authenticated staff session, provides `user.ownerUid` (the PG Admin UID) and staff role (`staffRole`). |
| `febebo-staff/src/App.jsx` | `App`, `AppRoutes` | Routes `/staff-app` to `ProtectedRoute` -> `StaffApp`. |
| `febebo-staff/package.json` | Dependencies & Scripts | Vite 8.1.0, React 19.2.7, Firebase 12.17.0, `@yudiel/react-qr-scanner`, `react-qr-code`. |

### 1.2 `Febebo-admin` File Map

| File Path | Component / Context | Key Function / Scope |
|---|---|---|
| `Febebo-admin/src/pages/MessHeadcount.jsx` | `MessHeadcount` (Lines 1–2137) | Primary Admin mess management screen: Live Headcount ticker, meal tabs, daily date navigation, student attendance toggle switches, and food menu editor. |
| `Febebo-admin/src/pages/ManageTenants.jsx` | `ManageTenants`, `UserListView` (Lines 1–1071) | Admin tenant list: Displays "Current Users", room allocations, and tenant service types. |
| `Febebo-admin/src/pages/UserProfile.jsx` | `UserProfile` (Lines 1–1300) | Displays comprehensive tenant profile, KYC details, and `Cook — Food History` tab (line 688). |
| `Febebo-admin/src/pages/Reports.jsx` | `Reports`, `FoodTab` (Lines 889–980, 1310–1370) | Analytical reporting dashboard aggregating meal trends from `mess_headcount` and tenant counts from `tenants`. |
| `Febebo-admin/src/pages/AdminDashboard.jsx` | `AdminDashboard` (Line 301) | Main admin landing screen featuring the "Food & Mess" quick navigation card linking to `/mess-headcount`. |
| `Febebo-admin/src/context/AuthContext.jsx` | `AuthProvider`, `useAuth` | Admin auth context exposing `user.uid` and `activePgId` (for multi-PG management). |

---

## 2. Current Headcount Calculation Mechanics & Call Chains

### 2.1 Cook App (`febebo-staff/src/pages/StaffApp.jsx`)

#### A. State Variables
- `workDate`: Selected date string (`YYYY-MM-DD`), initialized to today (line 775).
- `mealTab`: Active meal tab (`'Breakfast'` | `'Lunch'` | `'Snacks'` | `'Dinner'`), initialized based on the current hour (lines 758–764).
- `activeMeal`: Time-of-day active meal (`'breakfast'`, `'lunch'`, `'snacks'`, `'dinner'`) used by the Live Headcount banner (lines 734–741).
- `selectedStat`: Current filter tab (`'requested'` | `'pack'` | `'extra'` | `'eaten'` | `'notEaten'`) (line 765).
- `students`: Enriched array of student objects (lines 1045–1058, 1947–1960).
- `eatenData`: Key-value map loaded from Firestore doc `mess_headcount/${user.ownerUid}_${todayStr}` (line 1743).

#### B. Existing Real-time Query Listeners
1. **Headcount Eaten Status**:
   - `docRef = doc(db, 'mess_headcount', `${user.ownerUid}_${todayStr}`)` (line 1746).
   - Updates `eatenData` on any snapshot event.
2. **Meal Status (Daily Cancellations / Pack Requests)**:
   - `qMeal = query(collection(db, 'meal_status'), where('adminId', '==', adminId), where('date', '==', todayStr))` (lines 1062, 1941).
   - Snapshots update `cachedMeals` / `todayMeals`.
3. **Tenants Collection**:
   - `qTenants = query(collection(db, 'tenants'), where('adminId', '==', adminId))` (lines 1069, 1967).
   - Filters `status === 'Approved' || status === 'Current User' || !status`.
   - Enriches each tenant with their profile from `users/{uid}` (`roomNo`, `name`, `phone`).

#### C. Student Status Logic (`computeStudents` / `rebuild`)
```javascript
// Lines 1954-1957 of StaffApp.jsx
statusB: mealLog?.breakfast === 'not_eating' ? 'notEaten' : mealLog?.breakfast === 'eaten' ? 'eaten' : 'requested',
statusL: mealLog?.lunch === 'not_eating' ? 'notEaten' : mealLog?.lunch === 'eaten' ? 'eaten' : 'requested',
statusS: mealLog?.snacks === 'not_eating' ? 'notEaten' : mealLog?.snacks === 'eaten' ? 'eaten' : 'requested',
statusD: mealLog?.dinner === 'not_eating' ? 'notEaten' : mealLog?.dinner === 'eaten' ? 'eaten' : 'requested'
```

#### D. Headcount Breakdown Formulas
```javascript
// Lines 3490-3498 of StaffApp.jsx
const mealKey = mealTab==='Breakfast'?'statusB':mealTab==='Lunch'?'statusL':mealTab==='Snacks'?'statusS':'statusD';
const statsObj = {
  requested: students.filter(s=>s[mealKey]==='requested').length,
  pack:      students.filter(s=>s[mealKey]==='pack').length,
  extra:     students.filter(s=>s[mealKey]==='extra').length,
  eaten:     students.filter(s=>s[mealKey]==='eaten').length,
  notEaten:  students.filter(s=>s[mealKey]==='notEaten').length,
};
```

#### E. Core UI Components in `StaffApp.jsx`
1. **Live Mess Headcount Card** (lines 3378–3407):
   - Big number: `{Object.keys(eatenData).filter(k => k.includes(`_${activeMeal}_eaten`)).length}`.
   - Buttons: "Generate QR" (`setShowMealQR(true)`), "Select Manually" (`setShowManual(true)`), "Broadcast Food Ready".
2. **Stat Cards** (lines 3513–3541):
   - Upper Row: "To Pack" (`statsObj.pack`), "Extra Plate" (`statsObj.extra`).
   - 3-Column Grid: "Requested" (`statsObj.requested`), "Eaten" (`statsObj.eaten`), "Not Eaten" (`statsObj.notEaten`).
3. **Filtered Student List** (lines 3544–3606):
   - Renders `students.filter(s => s[mealKey] === selectedStat)`.
   - Offers "Mark Eaten" action (calls `markMealEaten(s.id, mealKey)` at line 2444).
4. **Counter QR Pass Modal** (`showMealQR`, lines 8438–8513):
   - Generates QR code `FEBEBO_MEAL|${user.ownerUid}|${currentM}|${todayStr}`.
   - Displays live ticker: `{currentEatenCount}` eaten.
5. **Manual Selection Modal** (`showManual`, lines 8549–8685):
   - Computes `notEatenStudents = students.filter(s => !eatenData[`${s.id}_${activeMealStr}_eaten`] && s[statusKey] !== 'eaten')`.
   - Allows cook to mark students eaten by room or name search.

---

### 2.2 Admin App (`Febebo-admin/src/pages/MessHeadcount.jsx`)

#### A. State Variables
- `selectedDate`: Selected date string (`YYYY-MM-DD`), default `getTodayStr()` (lines 92–98, 114).
- `mealTab`: Active meal tab (`'breakfast'` | `'lunch'` | `'snacks'` | `'dinner'`) (lines 117–123).
- `selectedStatFilter`: Stat filter (`'all'` | `'requested'` | `'pack'` | `'extra'` | `'eaten'` | `'notEaten'`) (line 126).
- `rawTenants`: Array of all approved tenants for `pgDocId` (line 133).
- `mealStatusLogs`: Array of records from `meal_status` for `selectedDate` (line 134).
- `eatenData`: Headcount map from `mess_headcount/${pgDocId}_${selectedDate}` (line 135).

#### B. Existing Real-time Query Listeners
1. **Tenants**:
   - `qTenants = query(collection(db, 'tenants'), where('adminId', '==', user.uid))` (lines 207–242).
   - Filters `status === 'Approved' || status === 'Current User' || !status` and `matchesPg(t)`.
   - Enriches each tenant via `getDoc(doc(db, 'users', uid))` for room, bed, and KYC photo.
2. **Meal Status Logs**:
   - `qMeal = query(collection(db, 'meal_status'), where('adminId', '==', user.uid), where('date', '==', selectedDate))` (lines 247–256).
3. **Headcount Eaten Status**:
   - `docRef = doc(db, 'mess_headcount', `${pgDocId}_${selectedDate}`)` (lines 260–270).

#### C. Student Unified Attendance List (`students` useMemo, lines 273–306)
```javascript
const students = useMemo(() => {
  return rawTenants.map(t => {
    const mealLog = mealStatusLogs.find(m => m.tenantId === t.id);
    const isEatenB = !!eatenData[`${t.id}_breakfast_eaten`];
    const isEatenL = !!eatenData[`${t.id}_lunch_eaten`];
    const isEatenS = !!eatenData[`${t.id}_snacks_eaten`];
    const isEatenD = !!eatenData[`${t.id}_dinner_eaten`];

    const getStatus = (isEaten, val) => {
      if (isEaten) return 'eaten';
      if (val === 'not_eating') return 'notEaten';
      if (val === 'pack') return 'pack';
      if (val === 'extra') return 'extra';
      return 'requested'; // DEFAULT
    };

    return {
      id: t.id,
      name: t.name || 'Tenant',
      room: t.roomNo || t.room || 'N/A',
      bed: t.bedNo || t.bed || 'A',
      phone: t.phone || '',
      image: t.image || null,
      statusB: getStatus(isEatenB, mealLog?.breakfast),
      statusL: getStatus(isEatenL, mealLog?.lunch),
      statusS: getStatus(isEatenS, mealLog?.snacks),
      statusD: getStatus(isEatenD, mealLog?.dinner),
      detailsB: mealLog?.breakfastDetails || '',
      detailsL: mealLog?.lunchDetails || '',
      detailsS: mealLog?.snacksDetails || '',
      detailsD: mealLog?.dinnerDetails || '',
    };
  });
}, [rawTenants, mealStatusLogs, eatenData]);
```

#### D. Headcount Breakdown Formulas (`statsCount` useMemo, lines 312–321)
```javascript
const statsCount = useMemo(() => {
  return {
    all: students.length,
    requested: students.filter(s => s[mealKey] === 'requested').length,
    pack:      students.filter(s => s[mealKey] === 'pack').length,
    extra:     students.filter(s => s[mealKey] === 'extra').length,
    eaten:     students.filter(s => s[mealKey] === 'eaten').length,
    notEaten:  students.filter(s => s[mealKey] === 'notEaten').length,
  };
}, [students, mealKey]);
```

---

## 3. The Core Defect & Vacation Synchronization Architecture

### 3.1 The Problem
In both applications:
```
Default Tenant Status = 'requested' (EATING)
```
If a student goes home or is on a 10-day leave, they do not manually submit 40 individual cancellations daily. Without an automated vacation mechanism:
- The Cook dashboard counts them as `requested` (eating) every day.
- The kitchen cooks unneeded portions, wasting groceries and budget.
- The Admin Mess Headcount and Reports display artificially inflated eating numbers.
- In manual selection, the student appears in the pending eaters list.

### 3.2 The Synchronization Data Contract
To satisfy **R1, R2, R3**, the vacation record must be reactive across all three apps.

**Collection Path**: `food_vacations` (Firestore collection at root, indexed by `adminId` and `status`)  
AND mirrored to `users/{uid}.foodVacation` and `tenants/{tenantDocId}.foodVacation`.

```typescript
interface FoodVacationDoc {
  id: string;                      // Vacation ID (or student UID)
  tenantId: string;                // Student UID
  tenantName: string;              // Student Name
  roomNo: string;                  // Room Number
  adminId: string;                 // PG Owner UID
  pgId: string;                    // Subscribed PG ID
  startDate: string;               // YYYY-MM-DD
  endDate: string;                 // YYYY-MM-DD
  isFullDay: boolean;              // true if all 4 meals paused
  meals: string[];                 // ['Breakfast', 'Lunch', 'Snacks', 'Dinner']
  status: 'active' | 'cancelled' | 'shortened' | 'completed';
  reason?: string;
  createdAt: string;               // ISO 8601
  updatedAt: string;               // ISO 8601
  resumedAt?: string | null;       // ISO 8601 when resumed early
}
```

---

## 4. Integration Blueprint for Cook Dashboard (`febebo-staff`)

### 4.1 Real-time Query Subscription in `StaffApp.jsx`

Add an active `onSnapshot` listener in `StaffApp.jsx` (inside the Cook connection block at line 1034 or line 1939):

```javascript
// State for active vacations
const [vacations, setVacations] = useState([]);

useEffect(() => {
  if (!user?.ownerUid) return;
  const adminId = user.ownerUid;

  const qVacations = query(
    collection(db, 'food_vacations'),
    where('adminId', '==', adminId),
    where('status', '==', 'active')
  );

  const unsubVacations = onSnapshot(qVacations, (snap) => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setVacations(list);
  }, (err) => console.error('Vacation listener error:', err));

  return () => unsubVacations();
}, [user?.ownerUid]);
```

### 4.2 Vacation Evaluation Helper
```javascript
const isStudentOnVacation = (studentId, dateStr, mealName) => {
  // Check from vacations collection OR student enriched foodVacation
  const vac = vacations.find(v => 
    (v.tenantId === studentId || v.id === studentId) && 
    v.status === 'active'
  ) || students.find(s => s.id === studentId)?.foodVacation;

  if (!vac || vac.status !== 'active') return false;
  if (dateStr < vac.startDate || dateStr > vac.endDate) return false;
  if (vac.isFullDay || !vac.meals || vac.meals.length === 0) return true;
  return vac.meals.some(m => m.toLowerCase() === mealName.toLowerCase());
};
```

### 4.3 Student Status Mapping with Vacation Deduction
Update `computeStudents` (line 1946) and `rebuild` (line 1044) to evaluate vacation status **before** defaulting to `'requested'`:

```javascript
const computeStudents = () => {
  const currentDateStr = workDate || new Date().toISOString().split('T')[0];

  const studentsList = activeTenants.map(t => {
    const mealLog = todayMeals.find(m => m.tenantId === t.id);
    const isEatenB = !!eatenData[`${t.id}_breakfast_eaten`];
    const isEatenL = !!eatenData[`${t.id}_lunch_eaten`];
    const isEatenS = !!eatenData[`${t.id}_snacks_eaten`];
    const isEatenD = !!eatenData[`${t.id}_dinner_eaten`];

    const isVacB = isStudentOnVacation(t.id, currentDateStr, 'breakfast');
    const isVacL = isStudentOnVacation(t.id, currentDateStr, 'lunch');
    const isVacS = isStudentOnVacation(t.id, currentDateStr, 'snacks');
    const isVacD = isStudentOnVacation(t.id, currentDateStr, 'dinner');

    const resolveStatus = (isVac, isEaten, logVal) => {
      if (isVac) return 'onVacation'; // Excludes from eating count!
      if (isEaten) return 'eaten';
      if (logVal === 'not_eating') return 'notEaten';
      if (logVal === 'pack') return 'pack';
      if (logVal === 'extra') return 'extra';
      return 'requested';
    };

    const studentVac = vacations.find(v => (v.tenantId === t.id || v.id === t.id) && v.status === 'active');

    return {
      id: t.id,
      name: t.name || 'Tenant',
      room: t.roomNo || t.room || t.subscribedPG?.roomNo || 'N/A',
      bed: t.bedNo || t.bed || 'A',
      phone: t.phone || 'N/A',
      foodVacation: studentVac || t.foodVacation || null,
      statusB: resolveStatus(isVacB, isEatenB, mealLog?.breakfast),
      statusL: resolveStatus(isVacL, isEatenL, mealLog?.lunch),
      statusS: resolveStatus(isVacS, isEatenS, mealLog?.snacks),
      statusD: resolveStatus(isVacD, isEatenD, mealLog?.dinner)
    };
  });
  setStudents(studentsList);
};
```

### 4.4 Updated Headcount Formulas in `StaffApp.jsx`
```javascript
const statsObj = {
  requested:  students.filter(s => s[mealKey] === 'requested').length,
  pack:       students.filter(s => s[mealKey] === 'pack').length,
  extra:      students.filter(s => s[mealKey] === 'extra').length,
  eaten:      students.filter(s => s[mealKey] === 'eaten').length,
  notEaten:   students.filter(s => s[mealKey] === 'notEaten').length,
  onVacation: students.filter(s => s[mealKey] === 'onVacation').length, // Dedicated Vacation Count
};
```

**Key Mathematical Invariant**:
$$\text{Expected Eaters} = \text{Total Active Tenants} - \text{onVacation} - \text{notEaten}$$
$$\text{Cook Headcount} = \text{statsObj.requested} + \text{statsObj.pack} + \text{statsObj.extra}$$
Students on vacation are strictly deducted from `requested`.

### 4.5 Cook Dashboard UI Updates

#### A. Dedicated "On Food Vacation / Leave" Stat Banner & Card
Insert between the "To Pack / Extra Plate" cards and the 3-column grid (line 3529):

```jsx
{/* Dedicated Food Vacation / Leave Card */}
<div
  onClick={() => setSelectedStat(selectedStat === 'onVacation' ? 'requested' : 'onVacation')}
  style={{
    background: selectedStat === 'onVacation' ? '#f5f3ff' : '#ffffff',
    border: `2px solid ${selectedStat === 'onVacation' ? '#7c3aed' : '#e2e8f0'}`,
    borderRadius: 16,
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    marginBottom: 12,
    boxShadow: selectedStat === 'onVacation' ? '0 4px 14px rgba(124,58,237,0.15)' : '0 2px 8px rgba(15,23,42,0.03)',
    transition: 'all 0.15s ease'
  }}
>
  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
    <div style={{
      width: 42,
      height: 42,
      borderRadius: 12,
      background: '#ede9fe',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#7c3aed'
    }}>
      <span className="material-symbols-outlined" style={{ fontSize: 24 }}>flight_takeoff</span>
    </div>
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: '#7c3aed' }}>
          On Food Vacation / Leave
        </span>
        <span style={{ background: '#7c3aed', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 8 }}>
          Paused
        </span>
      </div>
      <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 700, color: '#334155' }}>
        {statsObj.onVacation} student{statsObj.onVacation !== 1 ? 's' : ''} paused for {mealTab}
      </p>
    </div>
  </div>
  <div style={{ fontSize: 26, fontWeight: 900, color: '#7c3aed' }}>
    {statsObj.onVacation * mult}
  </div>
</div>
```

#### B. Filtered Student List for `selectedStat === 'onVacation'`
When Cook clicks the Vacation card, the student list renders students on pause:
- Student Name, Room Number, Bed Number.
- Vacation Date Range: `🗓️ {vac.startDate} to {vac.endDate}`.
- Paused Meals: `🍽️ {vac.isFullDay ? 'All Meals' : vac.meals.join(', ')}`.
- Reason (if provided): `💬 {vac.reason}`.
- Action: "Call" button (`tel:${s.phone}`). "Mark Eaten" button is disabled/hidden with an info chip: "Meals Paused 🏖️".

#### C. Manual Selection Modal (`showManual`, line 8555)
Exclude vacationing students from pending selection:
```javascript
const notEatenStudents = students.filter(s =>
  !eatenData[`${s.id}_${activeMealStr}_eaten`] && 
  s[statusKey] !== 'eaten' &&
  s[statusKey] !== 'onVacation'
);
```

#### D. Live Mess Headcount Card Subtitle (line 3391)
Update subtitle to show net active eaters:
```jsx
<span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>
  {students.length - statsObj.onVacation} active eating · {statsObj.onVacation} on food vacation
</span>
```

---

## 5. Integration Blueprint for Admin Dashboard (`Febebo-admin`)

### 5.1 Real-time Query Subscription in `MessHeadcount.jsx`

Add active `onSnapshot` listener in `MessHeadcount.jsx` (around line 258):

```javascript
// State for food vacations
const [vacations, setVacations] = useState([]);

// ── 4b. Listen to food_vacations collection for active leaves ────────
useEffect(() => {
  if (!pgDocId) return;
  const qVac = query(
    collection(db, 'food_vacations'),
    where('adminId', '==', user?.uid),
    where('status', '==', 'active')
  );

  const unsub = onSnapshot(qVac, (snap) => {
    setVacations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, (err) => console.error('Vacations fetch error:', err));

  return () => unsub();
}, [pgDocId, user?.uid]);
```

### 5.2 Updated `students` useMemo in `MessHeadcount.jsx` (lines 273–306)

```javascript
const students = useMemo(() => {
  return rawTenants.map(t => {
    const mealLog = mealStatusLogs.find(m => m.tenantId === t.id);
    const isEatenB = !!eatenData[`${t.id}_breakfast_eaten`];
    const isEatenL = !!eatenData[`${t.id}_lunch_eaten`];
    const isEatenS = !!eatenData[`${t.id}_snacks_eaten`];
    const isEatenD = !!eatenData[`${t.id}_dinner_eaten`];

    const isVacB = isStudentOnVacation(t.id, selectedDate, 'breakfast');
    const isVacL = isStudentOnVacation(t.id, selectedDate, 'lunch');
    const isVacS = isStudentOnVacation(t.id, selectedDate, 'snacks');
    const isVacD = isStudentOnVacation(t.id, selectedDate, 'dinner');

    const getStatus = (isVac, isEaten, val) => {
      if (isVac) return 'onVacation';
      if (isEaten) return 'eaten';
      if (val === 'not_eating') return 'notEaten';
      if (val === 'pack') return 'pack';
      if (val === 'extra') return 'extra';
      return 'requested';
    };

    const currentVac = vacations.find(v => (v.tenantId === t.id || v.id === t.id) && v.status === 'active');

    return {
      id: t.id,
      name: t.name || 'Tenant',
      room: t.roomNo || t.room || 'N/A',
      bed: t.bedNo || t.bed || 'A',
      phone: t.phone || '',
      image: t.image || null,
      foodVacation: currentVac || t.foodVacation || null,
      statusB: getStatus(isVacB, isEatenB, mealLog?.breakfast),
      statusL: getStatus(isVacL, isEatenL, mealLog?.lunch),
      statusS: getStatus(isVacS, isEatenS, mealLog?.snacks),
      statusD: getStatus(isVacD, isEatenD, mealLog?.dinner),
      detailsB: mealLog?.breakfastDetails || '',
      detailsL: mealLog?.lunchDetails || '',
      detailsS: mealLog?.snacksDetails || '',
      detailsD: mealLog?.dinnerDetails || '',
    };
  });
}, [rawTenants, mealStatusLogs, eatenData, vacations, selectedDate]);
```

### 5.3 Updated `statsCount` useMemo in `MessHeadcount.jsx` (lines 312–321)

```javascript
const statsCount = useMemo(() => {
  return {
    all:        students.length,
    requested:  students.filter(s => s[mealKey] === 'requested').length,
    pack:       students.filter(s => s[mealKey] === 'pack').length,
    extra:      students.filter(s => s[mealKey] === 'extra').length,
    eaten:      students.filter(s => s[mealKey] === 'eaten').length,
    notEaten:   students.filter(s => s[mealKey] === 'notEaten').length,
    onVacation: students.filter(s => s[mealKey] === 'onVacation').length, // Dedicated Count
  };
}, [students, mealKey]);
```

### 5.4 UI Changes in `MessHeadcount.jsx`
1. **Live Mess Counter Card** (lines 723–733):
   Update display to:
   ```jsx
   <span style={{ fontSize: '15px', fontWeight: 700, color: '#94a3b8' }}>
     / {students.length - statsCount.onVacation} active eating ({statsCount.onVacation} on leave)
   </span>
   ```
2. **Stat Grid Expansion** (lines 964–992):
   Turn 3-column row into a 4-column row or add the Vacation card:
   ```jsx
   { id: 'onVacation', label: 'On Leave', val: statsCount.onVacation, bg: '#f5f3ff', border: '#7c3aed' }
   ```
3. **Student Roster Card Details** (lines 1060–1160):
   If `s[mealKey] === 'onVacation'`:
   - Replace the meal toggle switch with a badge: `<span style={{ background:'#f5f3ff', color:'#7c3aed', fontWeight:800, padding:'4px 8px', borderRadius:8 }}>🏖️ On Leave</span>`.
   - Display leave window: `Paused: {s.foodVacation.startDate} → {s.foodVacation.endDate}`.

### 5.5 Tenant Views & Daily Reports Integration
1. **`ManageTenants.jsx`**:
   In the tenant list card (`filteredUsers.map`, line 489):
   If tenant has an active vacation on today's date, render a compact badge:
   `<span style={{ fontSize: 10, background: '#f5f3ff', color: '#7c3aed', padding: '2px 6px', borderRadius: 6, fontWeight: 700 }}>🌴 Food Pause until {u.foodVacation.endDate}</span>`.
2. **`UserProfile.jsx`**:
   In the `Cook — Food History` tab (line 688), display past and current vacation periods as a dedicated timeline card.
3. **`Reports.jsx`**:
   In `FoodTab` (line 889), exclude vacation dates from tenant absenteeism and calculate total saved portions per week/month.

---

## 6. Real-Time Synchronization Lifecycle (Early Resume & Shorten)

```
+-----------------------------------------------------------------------------------+
|                           febebo-app (Student Device)                             |
|                                                                                   |
|  Student clicks "Resume Meals Now" OR "Shorten Return Date"                       |
|  -> updateDoc(doc(db, 'food_vacations', vacId), { status: 'cancelled' / ... })   |
|  -> updateDoc(doc(db, 'users', uid), { 'foodVacation.status': 'cancelled' })     |
+-----------------------------------------------------------------------------------+
                                         |
                       Firestore Realtime Event (100-200ms)
                                         |
        +--------------------------------+--------------------------------+
        |                                                                 |
        v                                                                 v
+------------------------------------+          +------------------------------------+
|     febebo-staff (Cook Device)     |          |       Febebo-admin (Admin Web)     |
|                                    |          |                                    |
| onSnapshot(qVacations) fires       |          | onSnapshot(qVac) fires             |
| -> setVacations(updatedList)       |          | -> setVacations(updatedList)       |
| -> isStudentOnVacation evaluates   |          | -> students useMemo recomputes     |
|    to FALSE for today              |          | -> Student status becomes          |
| -> Student status:                 |          |    'requested'                     |
|    'onVacation' -> 'requested'     |          | -> statsCount:                     |
| -> statsObj:                       |          |    requested +1, onVacation -1     |
|    requested +1, onVacation -1     |          | -> UI updates live without reload  |
| -> UI updates live without reload  |          +------------------------------------+
+------------------------------------+
```

---

## 7. Build Verification & Toolchain Diagnostics

Both target applications were compiled using their native production toolchains:

### 1. `Febebo-admin`
- **Command**: `npm run build` (`vite build`)
- **Working Dir**: `c:\Users\RACHIT\OneDrive\Desktop\Febeboo\Febebo-admin`
- **Result**: Exit code 0 (✓ built in 872ms)
- **Output Artifacts**: `dist/index.html`, `dist/assets/MessHeadcount-B8cQ1LS-.js` (53.01 kB), `dist/assets/AdminDashboard-ybtQjqSa.js` (38.59 kB).

### 2. `febebo-staff`
- **Command**: `npm run build` (`vite build`)
- **Working Dir**: `c:\Users\RACHIT\OneDrive\Desktop\Febeboo\febebo-staff`
- **Result**: Exit code 0 (✓ built in 856ms)
- **Output Artifacts**: `dist/index.html`, `dist/assets/index-xR3oAU7V.js` (1,336.58 kB).

### 3. `febebo-app` (Cross-check)
- **Command**: `npm run build` (`vite build`)
- **Working Dir**: `c:\Users\RACHIT\OneDrive\Desktop\Febeboo\febebo-app`
- **Result**: Exit code 0 (✓ built in 1.02s)

---

## 8. Summary of Proposed Changes by File

| File | Exact Insertion Lines | Proposed Changes |
|---|---|---|
| `febebo-staff/src/pages/StaffApp.jsx` | Around lines 1034 & 1939 | Add `qVacations` listener, import `onSnapshot`, `query`, `collection`. |
| `febebo-staff/src/pages/StaffApp.jsx` | Around line 1946 | Update `computeStudents` & `rebuild` to evaluate `isStudentOnVacation` before defaulting to `'requested'`. |
| `febebo-staff/src/pages/StaffApp.jsx` | Around lines 3490–3508 | Add `onVacation` to `statsObj`. |
| `febebo-staff/src/pages/StaffApp.jsx` | Around lines 3529–3542 | Insert dedicated "On Food Vacation / Leave" stat card and button. |
| `febebo-staff/src/pages/StaffApp.jsx` | Around lines 3544–3606 | Add vacation details render when `selectedStat === 'onVacation'`. |
| `febebo-staff/src/pages/StaffApp.jsx` | Around line 8555 | Exclude vacationing students from `notEatenStudents` in `showManual` modal. |
| `Febebo-admin/src/pages/MessHeadcount.jsx` | Around line 258 | Add `qVac` listener for `food_vacations`. |
| `Febebo-admin/src/pages/MessHeadcount.jsx` | Lines 273–306 | Update `students` useMemo to set `onVacation` status. |
| `Febebo-admin/src/pages/MessHeadcount.jsx` | Lines 312–321 | Add `onVacation` to `statsCount` useMemo. |
| `Febebo-admin/src/pages/MessHeadcount.jsx` | Lines 726–732 | Update Live Headcount denominator to exclude students on leave. |
| `Febebo-admin/src/pages/MessHeadcount.jsx` | Lines 964–992 | Add "🏖️ Food Vacation" stat card to filter student roster. |
| `Febebo-admin/src/pages/ManageTenants.jsx` | Around line 500 | Add "On Food Pause" badge to tenant card in "Current Users" tab. |
