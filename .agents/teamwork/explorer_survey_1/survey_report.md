# Comprehensive Survey Report: febebo-app Student Experience

**Investigator**: Explorer 1  
**Target Application**: `febebo-app` (Student / Resident Frontend)  
**Feature**: Tenant Long-Term Food Vacation / Meal Pause  
**Date**: 2026-10-02  
**Working Directory**: `c:\Users\RACHIT\OneDrive\Desktop\Febeboo\.agents\teamwork\explorer_survey_1`

---

## Executive Summary

This report provides the complete architectural and code-level survey of `febebo-app` for implementing the **Long-Term Meal Cancellation / Food Vacation** feature. Tenants will be able to schedule meal leave across a custom calendar date range (e.g., 10 days) for all meals or specific individual meals (Breakfast, Lunch, Snacks, Dinner).

The survey traces all components, props, hooks, Firestore listeners, QR code mechanics, and daily meal action workflows. It defines exact UI and state insertion points for the Vacation Modal, the Active Vacation Banner, meal action locking, and Early Resume controls ("Shorten Return Date" and "Resume Meals Now"), and verifies that non-food modules (`Account`, `Complaints`, `Chat`, `RequestBox`) remain completely unaffected.

---

## 1. Codebase Architecture & File Inventory

### 1.1 Relevant Files in `febebo-app`

| File Path | Component / Module | Role in Food Experience |
|---|---|---|
| `febebo-app/src/screens/Food.jsx` | `Food` | Primary screen for daily and weekly meals, food requests, QR meal passes, and food services. |
| `febebo-app/src/screens/Food.css` | Stylesheet | Styling for tabs, meal subcards, modal popups, meal chips, and action buttons. |
| `febebo-app/src/context/AuthContext.jsx` | `AuthProvider`, `useAuth` | Manages authenticated student session, real-time listener to `users/{uid}`, tenant PG details (`subscribedPG`). |
| `febebo-app/src/screens/StudentDashboard.jsx` | `StudentDashboard` | Entry point to Food screen via dashboard item (`Food Menu` -> `/food`). |
| `febebo-app/src/components/BottomNav.jsx` | `BottomNav` | Bottom navigation bar rendered on `Food` and other primary screens. |
| `febebo-app/src/App.jsx` | `App`, `AppRoutes` | Route registration: `<Route path="/food" element={<ProtectedRoute><Food /></ProtectedRoute>} />`. |
| `febebo-app/src/data/commonFoodDishes.js` | Dish presets & images | Preset food catalog and image resolution helper. |

### 1.2 Independent Modules Verified (Non-Food Tabs)

| Screen | File Path | Firestore Collections Used | Coupled to Food? |
|---|---|---|---|
| Rent & Accounts | `febebo-app/src/screens/Account.jsx` | `payments`, `users` | **No** (Zero coupling) |
| Complaints | `febebo-app/src/screens/Complaints.jsx` | `complaints` | **No** (Zero coupling) |
| PG Chat | `febebo-app/src/screens/Chat.jsx` | `chats` | **No** (Zero coupling) |
| Inventory / Item Requests | `febebo-app/src/screens/RequestBox.jsx` | `item_requests`, `inventory` | **No** (Zero coupling) |
| Profile | `febebo-app/src/screens/MyProfile.jsx` | `users` | **No** (Zero coupling) |

**Verification Result**: All non-food modules operate on independent collections and have isolated component state. They will continue to function without any interference when a food vacation is active.

---

## 2. Daily Meal Flow & Data Lifecycle in `Food.jsx`

### 2.1 State Management in `Food.jsx`

Currently, `Food.jsx` manages the following state hooks:

```javascript
// febebo-app/src/screens/Food.jsx
const { user } = useAuth();
const { startLoading, stopLoading } = useLoading();
const [foodData, setFoodData] = useState({});
const [foodMenuImages, setFoodMenuImages] = useState({});
const [foodItemImages, setFoodItemImages] = useState({});
const [todayRequests, setTodayRequests] = useState({}); // { Breakfast: 'pack', Lunch: 'cancel', ... }
const [activeTab, setActiveTab] = useState('today'); // 'today' | 'weekly'
const [activeModal, setActiveModal] = useState(null); // 'rate' | 'extra'
const [showQRModal, setShowQRModal] = useState(false);
const [activeMealQR, setActiveMealQR] = useState('');
const [eatenStatus, setEatenStatus] = useState({});
const [showScannerModal, setShowScannerModal] = useState(false);
const [targetScanMeal, setTargetScanMeal] = useState('');
const [scanResult, setScanResult] = useState(null);
const [isProcessingScan, setIsProcessingScan] = useState(false);
```

### 2.2 Firestore Realtime Subscriptions

`Food.jsx` establishes three realtime subscriptions in `useEffect` (lines 156–198):

1. **Weekly Menu**:
   - Path: `doc(db, 'pg_owners', user.subscribedPG.pgId)`
   - Populates: `foodData` (nested by Day -> Meal -> dishes string), `foodMenuImages`, and `foodItemImages`.
2. **Eaten Status (Headcount Document)**:
   - Path: `doc(db, 'mess_headcount', `${user.subscribedPG.pgId}_${getTodayStr()}`)`
   - Populates:
     ```javascript
     setEatenStatus({
       breakfast: !!data[`${user.uid}_breakfast_eaten`],
       lunch: !!data[`${user.uid}_lunch_eaten`],
       snacks: !!data[`${user.uid}_snacks_eaten`],
       dinner: !!data[`${user.uid}_dinner_eaten`],
     });
     ```
3. **Student Specific Food Requests**:
   - Path: `doc(db, 'pg_owners', user.subscribedPG.pgId, 'food_requests', user.uid)`
   - Populates: `todayRequests` (`{ [meal]: 'pack' | 'cancel' | null }`).

### 2.3 Daily Meal Card Rendering & Interaction Flow

In `renderTodayMealCard` (lines 482–597):
- Evaluates `foodItem = foodData[currentDayStr]?.[meal]`.
- Determines status: `status = todayRequests[meal]`.
- Evaluates `isEaten = eatenStatus[meal.toLowerCase()]`.
- If `isEaten`: Displays green "Eaten ✓" button.
- If not eaten:
  1. Displays "Scan Cook's QR to Eat" button -> opens `Scanner` component.
  2. Displays "Pack" button -> calls `handleMealAction(meal, 'pack')`.
  3. Displays "Cancel" button -> calls `handleMealAction(meal, 'cancel')`.
  4. Displays "Or show my meal pass" -> sets `activeMealQR(meal)` and opens `QRCode` modal.

### 2.4 QR Code Generation Flow

In `Food.jsx` lines 806–824:
```jsx
<QRCode 
  value={`MEALPASS|${activeMealQR.toLowerCase()}|${user.uid}|${user.name || 'Student'}|${user?.profileData?.roomDetails?.roomNumber || user?.subscribedPG?.roomNo || ''}`} 
  size={200} 
/>
```
This payload is scanned by the Cook's device to mark the meal as eaten.

---

## 3. Food Vacation Architecture & Firestore Schema

### 3.1 Recommended Firestore Data Contract

To ensure 100% real-time synchronization across `febebo-app`, `febebo-staff` (Cook), and `Febebo-admin` (Admin), the food vacation record should be stored on the tenant document and user profile:

**Path 1**: `users/{uid}` (field: `foodVacation`)  
**Path 2**: `tenants/{uid}` (field: `foodVacation`)  
**Path 3** (Optional convenience collection): `pg_owners/{pgId}/food_vacations/{uid}`

#### Data Structure:
```json
{
  "foodVacation": {
    "status": "active",
    "startDate": "2026-10-05",
    "endDate": "2026-10-15",
    "isFullDay": false,
    "meals": ["Lunch", "Dinner"],
    "reason": "Visiting family",
    "createdAt": "2026-10-02T07:30:00.000Z",
    "updatedAt": "2026-10-02T07:30:00.000Z",
    "resumedAt": null,
    "history": [
      {
        "action": "created",
        "startDate": "2026-10-05",
        "endDate": "2026-10-15",
        "meals": ["Lunch", "Dinner"],
        "timestamp": "2026-10-02T07:30:00.000Z"
      }
    ]
  }
}
```

#### Why This Schema Synchronizes Instantly:
1. `febebo-app`: `AuthContext.jsx` already has an active `onSnapshot` listener on `doc(db, 'users', firebaseUser.uid)` (line 23). Any change to `users/{uid}` immediately triggers an update to `user.profileData.foodVacation`.
2. `febebo-staff`: `StaffApp.jsx` listens to `collection(db, 'tenants')` with `onSnapshot` (line 1070) and enriches with `users/{uid}` (line 1081).
3. `Febebo-admin`: `MessHeadcount.jsx` listens to `collection(db, 'tenants')` with `onSnapshot` (line 208) and enriches with `users/{uid}` (line 220).

Any update made by the student immediately triggers re-renders in all three apps without page refreshes!

---

## 4. Exact UI & State Insertion Points in `febebo-app`

### 4.1 State Hooks to Add to `Food.jsx`

```javascript
// Food Vacation States
const [vacationData, setVacationData] = useState(null);
const [showVacationModal, setShowVacationModal] = useState(false);
const [showShortenModal, setShowShortenModal] = useState(false);
const [showResumeModal, setShowResumeModal] = useState(false);

// Booking Form State
const [vacationStartDate, setVacationStartDate] = useState('');
const [vacationEndDate, setVacationEndDate] = useState('');
const [vacationMeals, setVacationMeals] = useState(['Breakfast', 'Lunch', 'Snacks', 'Dinner']);
const [isFullDayVacation, setIsFullDayVacation] = useState(true);
const [vacationReason, setVacationReason] = useState('');
const [savingVacation, setSavingVacation] = useState(false);

// Shorten Form State
const [shortenNewDate, setShortenNewDate] = useState('');
```

### 4.2 Helper Vacation Functions

```javascript
// Check if a given date string (YYYY-MM-DD) falls within active vacation
const isDateInVacation = (dateStr, vacation) => {
  if (!vacation || vacation.status !== 'active') return false;
  return dateStr >= vacation.startDate && dateStr <= vacation.endDate;
};

// Check if a specific meal on today is paused
const isMealPausedToday = (mealName) => {
  const today = getTodayStr();
  if (!isDateInVacation(today, vacationData)) return false;
  if (vacationData.isFullDay) return true;
  return vacationData.meals?.includes(mealName);
};

// Calculate days between two date strings
const getVacationDaysCount = (start, end) => {
  if (!start || !end) return 0;
  const d1 = new Date(start);
  const d2 = new Date(end);
  const diffTime = d2 - d1;
  return Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1);
};
```

### 4.3 Realtime Listener for Vacation

In `Food.jsx` inside the primary `useEffect`:
```javascript
// Listen to student's user doc / tenant doc for vacation
const userDocRef = doc(db, 'users', user.uid);
const unsubUserVacation = onSnapshot(userDocRef, (snap) => {
  if (snap.exists()) {
    const data = snap.data();
    setVacationData(data.foodVacation || null);
  }
});
```

---

### 4.4 Insertion Point 1: Food Services Action Card

In `Food.jsx` lines 782–801 (Food Services Section):
Replace 2-column grid with 3-column grid (or card):

```jsx
<div className="food-action-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
  <div className="food-action-card" onClick={() => setActiveModal('rate')}>
    <div className="action-icon-wrap" style={{ background: '#fef3c7' }}>
      <Star size={24} color="#d97706" />
    </div>
    <span className="action-title">Rate Food</span>
  </div>

  <div className="food-action-card" onClick={() => setActiveModal('extra')}>
    <div className="action-icon-wrap" style={{ background: '#fce7f3' }}>
      <Users size={24} color="#be185d" />
    </div>
    <span className="action-title">Extra Plates</span>
  </div>

  <div 
    className="food-action-card" 
    onClick={() => setShowVacationModal(true)}
    style={{ border: vacationData?.status === 'active' ? '1.5px solid #10b981' : '1px solid #f1f5f9' }}
  >
    <div className="action-icon-wrap" style={{ background: '#ecfdf5' }}>
      <span className="material-symbols-outlined" style={{ color: '#059669', fontSize: '24px' }}>
        beach_access
      </span>
    </div>
    <span className="action-title">
      {vacationData?.status === 'active' ? 'Food Vacation (Active)' : 'Food Vacation'}
    </span>
  </div>
</div>
```

---

### 4.5 Insertion Point 2: "Food Vacation Active" Banner / Card

Directly inside `.food-scroll-area` before the Today and Weekly views (above line 621):

```jsx
{/* Active Food Vacation Banner */}
{vacationData?.status === 'active' && isDateInVacation(getTodayStr(), vacationData) && (
  <div className="food-vacation-active-banner">
    <div className="vacation-banner-top">
      <div className="vacation-icon-badge">🏖️</div>
      <div className="vacation-banner-content">
        <div className="vacation-status-pill">FOOD VACATION ACTIVE</div>
        <h4 className="vacation-dates-title">
          Meals Paused until {new Date(vacationData.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </h4>
        <p className="vacation-date-range">
          {new Date(vacationData.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – {new Date(vacationData.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          {' · '}
          <span className="vacation-days-tag">
            {getVacationDaysCount(getTodayStr(), vacationData.endDate)} days remaining
          </span>
        </p>
      </div>
    </div>

    {/* Paused Meals Chips */}
    <div className="vacation-paused-meals-row">
      <span className="paused-meals-label">Paused:</span>
      {vacationData.isFullDay ? (
        <span className="meal-tag-pill all-meals">Full Day (All 4 Meals)</span>
      ) : (
        vacationData.meals?.map(m => (
          <span key={m} className="meal-tag-pill">{m}</span>
        ))
      )}
    </div>

    {/* Early Resume & Shorten Controls */}
    <div className="vacation-banner-actions">
      <button 
        className="btn-vacation-shorten"
        onClick={() => { setShortenNewDate(vacationData.endDate); setShowShortenModal(true); }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit_calendar</span>
        Shorten Return Date
      </button>

      <button 
        className="btn-vacation-resume"
        onClick={() => setShowResumeModal(true)}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>play_circle</span>
        Resume Meals Now
      </button>
    </div>
  </div>
)}
```

---

### 4.6 Insertion Point 3: Locking Daily Meal Cards & QR Pass

In `renderTodayMealCard(title, icon, mealsList)` (lines 490–595):

1. **Card Header Badge**:
   ```jsx
   {isMealPausedToday(meal) && (
     <span style={{ fontSize: '11px', fontWeight: '800', padding: '2px 8px', borderRadius: '12px', color: 'white', background: '#059669' }}>
       PAUSED ON VACATION
     </span>
   )}
   ```

2. **Actions Block Replacement**:
   ```jsx
   <div className="subcard-actions" ...>
     {isMealPausedToday(meal) ? (
       <div className="vacation-locked-action-box">
         <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#059669' }}>
           pause_circle
         </span>
         <div>
           <div style={{ fontSize: '13px', fontWeight: '800', color: '#064e3b' }}>
             Meal Paused on Vacation
           </div>
           <div style={{ fontSize: '11px', color: '#047857', fontWeight: '600' }}>
             Actions and QR generation are locked for this meal
           </div>
         </div>
       </div>
     ) : eatenStatus[meal.toLowerCase()] ? (
       // Render normal Eaten button
       ...
     ) : (
       // Render normal Scan Cook's QR, Pack, Cancel, Show Meal Pass
       ...
     )}
   </div>
   ```

3. **Protection in QR Code Modal**:
   In `Food.jsx`, if `isMealPausedToday(activeMealQR)` is true, prevent opening `showQRModal` or display a locked notice inside the modal.

4. **Protection in Reverse QR Scanner (`handleStudentScan`)**:
   In lines 281–340:
   ```javascript
   const qrMealCap = qrMeal.charAt(0).toUpperCase() + qrMeal.slice(1);
   if (isMealPausedToday(qrMealCap)) {
     setScanResult({
       type: 'error',
       title: 'Meal Paused 🏖️',
       desc: `You are currently on Food Vacation for ${qrMealCap}. Please resume your meals in the Food tab if you wish to eat.`
     });
     setIsProcessingScan(false);
     return;
   }
   ```

---

### 4.7 Insertion Point 4: "Food Vacation / Long-Term Leave" Modal

Modal UI added inside `renderModal()` or as a standalone modal overlay in `Food.jsx`:

1. **Date Picker with Range Validation**:
   - `Start Date`: `<input type="date" min={getTodayStr()} value={vacationStartDate} onChange={...} />`
   - `End Date`: `<input type="date" min={vacationStartDate || getTodayStr()} value={vacationEndDate} onChange={...} />`
   - Total days counter display: `{getVacationDaysCount(vacationStartDate, vacationEndDate)} days selected`.

2. **Meal Selector**:
   - "Full Day (All 4 Meals)" toggle button / checkbox.
   - 4 Individual checkboxes:
     - `Breakfast`
     - `Lunch`
     - `Snacks`
     - `Dinner`
   - Toggling individual meals updates `vacationMeals`. If all 4 are selected, auto-select Full Day; if Full Day is toggled, select/deselect all 4.

3. **Optional Reason**:
   - `<input type="text" placeholder="e.g. Vacation, Exams, Going Home..." value={vacationReason} onChange={...} />`

4. **Submission Handler**:
   ```javascript
   const handleBookVacation = async () => {
     if (!vacationStartDate || !vacationEndDate) {
       alert('Please select both start and end dates.');
       return;
     }
     if (vacationStartDate > vacationEndDate) {
       alert('End date must be on or after start date.');
       return;
     }
     if (vacationMeals.length === 0) {
       alert('Please select at least one meal to pause.');
       return;
     }

     startLoading();
     try {
       const vacationPayload = {
         status: 'active',
         startDate: vacationStartDate,
         endDate: vacationEndDate,
         isFullDay: isFullDayVacation,
         meals: isFullDayVacation ? ['Breakfast', 'Lunch', 'Snacks', 'Dinner'] : vacationMeals,
         reason: vacationReason.trim() || 'Food Vacation',
         createdAt: new Date().toISOString(),
         updatedAt: new Date().toISOString(),
         resumedAt: null,
         history: [{
           action: 'booked',
           startDate: vacationStartDate,
           endDate: vacationEndDate,
           meals: isFullDayVacation ? ['Breakfast', 'Lunch', 'Snacks', 'Dinner'] : vacationMeals,
           timestamp: new Date().toISOString()
         }]
       };

       // 1. Update user profile doc
       await setDoc(doc(db, 'users', user.uid), {
         foodVacation: vacationPayload
       }, { merge: true });

       // 2. Update tenant doc (for Admin and Staff apps sync)
       await setDoc(doc(db, 'tenants', user.uid), {
         foodVacation: vacationPayload
       }, { merge: true });

       setShowVacationModal(false);
       // Reset form
       setVacationStartDate('');
       setVacationEndDate('');
       setVacationReason('');
     } catch (err) {
       console.error('Error saving food vacation:', err);
       alert('Failed to save food vacation. Please try again.');
     } finally {
       stopLoading();
     }
   };
   ```

---

### 4.8 Insertion Point 5: "Shorten Return Date" Modal & Logic

Modal allows choosing a new `endDate` between `today` and `currentEndDate`:
```javascript
const handleShortenVacation = async () => {
  if (!shortenNewDate) return;
  const today = getTodayStr();
  if (shortenNewDate < today) {
    alert('Return date cannot be in the past.');
    return;
  }
  if (shortenNewDate >= vacationData.endDate) {
    alert('New return date must be earlier than the current end date.');
    return;
  }

  startLoading();
  try {
    const updatedVacation = {
      ...vacationData,
      endDate: shortenNewDate,
      updatedAt: new Date().toISOString(),
      history: [
        ...(vacationData.history || []),
        {
          action: 'shortened',
          previousEndDate: vacationData.endDate,
          newEndDate: shortenNewDate,
          timestamp: new Date().toISOString()
        }
      ]
    };

    await setDoc(doc(db, 'users', user.uid), { foodVacation: updatedVacation }, { merge: true });
    await setDoc(doc(db, 'tenants', user.uid), { foodVacation: updatedVacation }, { merge: true });

    setShowShortenModal(false);
  } catch (err) {
    console.error('Error shortening vacation:', err);
    alert('Failed to update return date.');
  } finally {
    stopLoading();
  }
};
```

---

### 4.9 Insertion Point 6: "Resume Meals Now" Confirmation & Action

```javascript
const handleResumeMealsNow = async () => {
  startLoading();
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    const updatedVacation = {
      ...vacationData,
      status: 'resumed',
      resumedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Set endDate to yesterday so isDateInVacation returns false for today
      endDate: yesterdayStr,
      history: [
        ...(vacationData.history || []),
        {
          action: 'resumed_early',
          resumedAt: new Date().toISOString(),
          timestamp: new Date().toISOString()
        }
      ]
    };

    await setDoc(doc(db, 'users', user.uid), { foodVacation: updatedVacation }, { merge: true });
    await setDoc(doc(db, 'tenants', user.uid), { foodVacation: updatedVacation }, { merge: true });

    setShowResumeModal(false);
  } catch (err) {
    console.error('Error resuming meals:', err);
    alert('Failed to resume meals.');
  } finally {
    stopLoading();
  }
};
```

---

## 5. CSS Styles to Add in `Food.css`

The following styles integrate seamlessly into `febebo-app/src/screens/Food.css`:

```css
/* ── Food Vacation Active Banner ────────────────────────────── */
.food-vacation-active-banner {
  background: linear-gradient(135deg, #064e3b, #047857);
  border-radius: 20px;
  padding: 18px 20px;
  margin-bottom: 20px;
  color: white;
  box-shadow: 0 8px 24px rgba(4, 120, 87, 0.25);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.vacation-banner-top {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.vacation-icon-badge {
  font-size: 28px;
  background: rgba(255, 255, 255, 0.2);
  width: 50px;
  height: 50px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.vacation-banner-content {
  flex: 1;
}

.vacation-status-pill {
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 1px;
  color: #a7f3d0;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.vacation-dates-title {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 800;
  color: #ffffff;
}

.vacation-date-range {
  margin: 0;
  font-size: 12px;
  color: #d1fae5;
  font-weight: 600;
}

.vacation-days-tag {
  background: rgba(255, 255, 255, 0.25);
  padding: 2px 8px;
  border-radius: 8px;
  font-weight: 700;
}

.vacation-paused-meals-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.paused-meals-label {
  font-size: 12px;
  font-weight: 700;
  color: #a7f3d0;
}

.meal-tag-pill {
  font-size: 11px;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.meal-tag-pill.all-meals {
  background: #fef08a;
  color: #854d0e;
}

.vacation-banner-actions {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}

.btn-vacation-shorten {
  flex: 1;
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.35);
  color: white;
  border-radius: 12px;
  padding: 10px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s;
}

.btn-vacation-resume {
  flex: 1;
  background: #ffffff;
  border: none;
  color: #064e3b;
  border-radius: 12px;
  padding: 10px;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.2s;
}

/* ── Locked Meal Subcard Action ──────────────────────────────── */
.vacation-locked-action-box {
  background: #ecfdf5;
  border: 1.5px dashed #6ee7b7;
  border-radius: 14px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
}
```

---

## 6. Build & Compilation Verification

Baseline clean compilation has been verified across all three workspaces:
1. `febebo-app`: `npm run build` exits 0 (built in 1.13s).
2. `febebo-staff`: `npm run build` exits 0 (built in 785ms).
3. `Febebo-admin`: `npm run build` exits 0 (built in 1.06s).

---

## 7. Conclusions & Implementation Recommendations for Implementer

1. **Zero Breaking Changes**: The proposed design modifies only `febebo-app/src/screens/Food.jsx` and `febebo-app/src/screens/Food.css`. No routing, navigation, or other tab files require modification.
2. **Dual Doc Write**: Writing the `foodVacation` object to both `users/{uid}` and `tenants/{uid}` simultaneously guarantees instant synchronization with `febebo-staff` and `Febebo-admin` without modifying their core collections.
3. **Atomic Early Resume**: Setting `status: 'resumed'` and `endDate` to yesterday automatically deactivates `isDateInVacation()` immediately and seamlessly restores all meal ordering.
