# Survey Report: Firestore Data Schema, Security Rules & Build Toolchains
**Febeboo Long-Term Food Vacation / Meal Cancellation Feature**
**Author**: Explorer 3 (Investigation & Infrastructure Specialist)
**Date**: 2026-10-02
**Working Directory**: `c:\Users\RACHIT\OneDrive\Desktop\Febeboo\.agents\teamwork\explorer_survey_3`

---

## 1. Executive Summary

This survey provides the foundational data architecture, security rules, query strategies, and build toolchain verification required to implement the **Long-Term Meal Cancellation / Food Vacation** feature across the Febeboo platform:
- **Tenant Student App (`febebo-app`)**
- **Cook / Kitchen Staff App (`febebo-staff`)**
- **Property Admin Dashboard (`Febebo-admin`)**

All three applications connect to a unified Firebase project (`febebo-2026`). Currently, no long-term vacation or cancellation collection exists in Firestore. Daily attendance and meal verification rely on individual document writes in `mess_headcount` (`${pgDocId}_${date}`) and `food_requests` (`pg_owners/${pgId}/food_requests/${studentId}`).

A new top-level collection **`food_vacations`** is proposed with full multi-tenant indexing, date array expansion for range matching, and comprehensive Firestore Security Rules. All three project builds (`npm run build`) were tested and verified to compile cleanly with **Exit Code 0**.

---

## 2. Existing Infrastructure & Data Models

### 2.1 Firebase Project Configuration
Across all three repositories, the Firebase client initialization targets the identical project:
- **Project ID**: `febebo-2026`
- **Auth Domain**: `febebo-2026.firebaseapp.com`
- **Database URL**: `https://febebo-2026-default-rtdb.asia-southeast1.firebasedatabase.app`
- **Storage Bucket**: `febebo-2026.firebasestorage.app`
- **Config locations**:
  - `febebo-app/src/firebase.js`
  - `febebo-staff/src/firebase.js`
  - `Febebo-admin/src/firebase.js`

### 2.2 Existing Firestore Collections & Usage

| Collection | Schema / Path Pattern | Key Fields | Used In |
|---|---|---|---|
| `tenants` | Top-level: `tenants/{docId}` | `adminId`, `pgId`, `tenantId`, `name`, `roomNo`, `room`, `bedNo`, `bed`, `status` (`'Approved'`, `'Current User'`), `serviceType` (`'all_services'` vs `'only_room'`) | Admin, Staff |
| `users` | Top-level: `users/{userId}` | `name`, `phone`, `email`, `subscribedPG: { pgId, adminId, roomNo, bedNo, status }`, `profileData: { roomDetails: { roomNumber, bedNumber } }` | App, Admin, Staff |
| `pg_owners` | Top-level: `pg_owners/{pgId}` | `foodMenu`, `foodMenuImages`, `foodItemImages`, `propertyDetails` | App, Admin, Staff |
| `pg_owners/.../food_requests` | Subcollection: `pg_owners/{pgId}/food_requests/{studentId}` | `todayStatus: { breakfast: 'pack'\|'cancel'\|null, ... }`, `studentName`, `roomNumber`, `lastUpdated` | App (`Food.jsx`) |
| `mess_headcount` | Top-level: `mess_headcount/{pgId}_{YYYY-MM-DD}` | Dynamic keys: `{ [studentId + '_breakfast_eaten']: boolean, [studentId + '_lunch_eaten']: boolean, ... }` | App, Staff, Admin |
| `meal_status` | Top-level: `meal_status/{docId}` | `adminId`, `date`, `tenantId`, `breakfast`, `lunch`, `snacks`, `dinner` | Queried by Staff & Admin (read-only in current code) |
| `cleaner_requests` | Subcollection: `pg_owners/{pgId}/cleaner_requests/{studentId}` | `status`, `regularSlot`, `specialRequest`, `lastUpdated` | App, Staff |
| `complaints` | Top-level: `complaints/{docId}` | `adminId`, `pgId`, `tenantId`, `tenantName`, `room`, `title`, `desc`, `priority`, `status` | App, Admin, Staff |
| `leave_requests` | Top-level: `leave_requests/{docId}` | `adminId`, `pgId`, `staffId`, `staffName`, `role`, `from`, `to`, `reason`, `status` | Admin (`Leave.jsx`) - **Staff Leave only**, not tenant food |

### 2.3 Critical Findings on Meal Architecture
1. **No Existing Long-Term Vacation Model**: There is currently no `food_vacations` collection or schema anywhere in the repository.
2. **Current Cancellation is Daily-Only**: In `febebo-app/src/screens/Food.jsx`, students can click "Cancel" or "Pack", which writes to `pg_owners/{pgId}/food_requests/{studentId}` with `todayStatus: { [meal]: 'cancel' }`. This status does not persist across multiple days and requires daily manual intervention.
3. **Headcount Default Assumption**: In both `StaffApp.jsx` (Cook dashboard) and `MessHeadcount.jsx` (Admin dashboard), all active/approved tenants default to `requested` (`Eating`) unless marked `eaten` or `not_eating`. Therefore, without an explicit vacation mechanism, students away on leave are erroneously counted in daily cooking calculations, leading to severe food waste.
4. **Date Formatting Standard**: All apps format dates as local `YYYY-MM-DD` strings:
   ```javascript
   const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
   ```
   **Rule**: Never use `toISOString().split('T')[0]` for daily date comparisons in the Indian Standard Time (IST) zone, as it lags behind local time between 00:00 and 05:29 AM.

---

## 3. Proposed Firestore Data Schema: `food_vacations`

### 3.1 Design Decision: Top-Level Collection vs Subcollection
We recommend a **top-level collection** named `food_vacations` rather than a nested subcollection under `pg_owners`:
- **Direct Tenant Queries**: Tenants can query their active/historical vacations directly (`where('tenantId', '==', user.uid)`) without needing collection group index queries.
- **Direct Staff/Admin Listeners**: Cook and Admin apps can listen to all active vacations for their PG (`where('adminId', '==', adminId)` or `where('pgId', '==', pgId)`).
- **Fast Updates**: Actions like "Shorten Period" or "Resume Meals Now" perform an atomic update on `doc(db, 'food_vacations', vacationId)`.

### 3.2 Document Specification

```typescript
interface FoodVacation {
  // Document ID: Auto-generated by addDoc or `${tenantId}_${startDate}_${Date.now()}`
  id: string;

  // Identity & Multi-Tenancy Scoping
  tenantId: string;            // Firebase Auth UID of the student (user.uid)
  tenantName: string;          // Full name of student for quick Cook/Admin display
  tenantPhone: string;         // Contact number for urgent mess inquiries
  roomNumber: string;          // Room number (e.g. "104", "B-201")
  bedNumber?: string;          // Bed identifier if assigned (e.g. "A", "1")
  pgId: string;                // Subscribed PG ID (from user.subscribedPG.pgId)
  adminId: string;             // Owner/Admin UID (from user.subscribedPG.adminId || pgId)

  // Date Range Specification (Local YYYY-MM-DD format)
  startDate: string;           // Beginning date inclusive, e.g. "2026-10-05"
  endDate: string;             // Ending date inclusive, e.g. "2026-10-15"
  originalEndDate?: string;    // Recorded if vacation is shortened (e.g. "2026-10-15")
  dates: string[];             // Array of all calendar dates: ["2026-10-05", "2026-10-06", ..., "2026-10-15"]
  
  // Granular Meal Selection
  // Lowercase array: any combination of ['breakfast', 'lunch', 'snacks', 'dinner']
  meals: ('breakfast' | 'lunch' | 'snacks' | 'dinner')[];
  isAllMeals: boolean;         // true if all 4 meals are selected

  // Lifecycle & Status
  // 'active': Pause currently ongoing or scheduled for future
  // 'shortened': Active pause with return date shortened
  // 'resumed': Early return triggered; meals restored immediately
  // 'cancelled': Cancelled prior to start or invalidated
  status: 'active' | 'shortened' | 'resumed' | 'cancelled';

  // Optional Context
  reason?: string;             // e.g., "Semester break", "Going home for festival"

  // Audit Timestamps (ISO 8601 strings)
  createdAt: string;           // Timestamp when booked
  updatedAt: string;           // Timestamp of last modification
  shortenedAt?: string | null; // Timestamp when end date was shortened
  resumedAt?: string | null;   // Timestamp when meals were resumed early
  cancelledAt?: string | null; // Timestamp when cancelled
}
```

### 3.3 Sample Document Instance
```json
{
  "id": "vac_98a7sd8f7a6sdf",
  "tenantId": "usr_student_88219",
  "tenantName": "Aarav Sharma",
  "tenantPhone": "+91 9876543210",
  "roomNumber": "204",
  "bedNumber": "B",
  "pgId": "pg_green_residency",
  "adminId": "adm_owner_4011",
  "startDate": "2026-10-05",
  "endDate": "2026-10-12",
  "originalEndDate": "2026-10-15",
  "dates": [
    "2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08",
    "2026-10-09", "2026-10-10", "2026-10-11", "2026-10-12"
  ],
  "meals": ["breakfast", "lunch", "snacks", "dinner"],
  "isAllMeals": true,
  "status": "shortened",
  "reason": "Family function",
  "createdAt": "2026-10-02T08:00:00.000Z",
  "updatedAt": "2026-10-04T14:30:00.000Z",
  "shortenedAt": "2026-10-04T14:30:00.000Z",
  "resumedAt": null
}
```

### 3.4 State Machine & Lifecycle Transitions

```
[Tenant Schedules Vacation]
            │
            ▼
        ( active )
         │      │
 [Shorten Date] [Resume Meals Now / Cancel]
         │      │
         ▼      ▼
   ( shortened ) ─────────────────► ( resumed )
                                         ▲
                                         │
 [From 'active' -> Early Resume] ────────┘
```

1. **Scheduling**:
   - Tenant selects `[startDate, endDate]` (min 1 day, `startDate <= endDate`).
   - Tenant selects all meals or checkboxes for Breakfast, Lunch, Snacks, Dinner.
   - Document saved with `status: 'active'`.
2. **Shortening (`shorten`)**:
   - Tenant selects a new end date `newEndDate < currentEndDate` and `newEndDate >= todayStr`.
   - `endDate` updated to `newEndDate`.
   - `originalEndDate` preserved (if not already set).
   - `dates` array regenerated up to `newEndDate`.
   - `status: 'shortened'`, `shortenedAt: new Date().toISOString()`.
3. **Early Resume (`resume`)**:
   - Tenant clicks "Resume Meals Now" with confirmation prompt.
   - Document updated: `status: 'resumed'`, `resumedAt: new Date().toISOString()`.
   - Vacation is instantly invalidated for current and subsequent dates. Meals unlock immediately.
4. **Cancellation (`cancel`)**:
   - If scheduled for the future and cancelled before start:
   - `status: 'cancelled'`, `cancelledAt: new Date().toISOString()`.

---

## 4. Query Strategies & Real-Time Synchronization

### 4.1 Tenant Active Pause Query (`febebo-app`)
To determine if the student currently has an active vacation in `Food.jsx`:
```javascript
import { collection, query, where, onSnapshot } from 'firebase/firestore';

// Listen to tenant's active/shortened vacations
const qVacation = query(
  collection(db, 'food_vacations'),
  where('tenantId', '==', user.uid),
  where('status', 'in', ['active', 'shortened'])
);

const unsubscribe = onSnapshot(qVacation, (snapshot) => {
  const vacations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  // Find vacation active for today
  const today = getTodayStr(); // YYYY-MM-DD
  const activeVacation = vacations.find(v => today >= v.startDate && today <= v.endDate);
  
  setCurrentVacation(activeVacation || null);
});
```

### 4.2 Cook / Staff Real-Time Sync (`febebo-staff`)
In `StaffApp.jsx`, the Cook dashboard maintains a live listener on active vacations for their PG:
```javascript
const qVacations = query(
  collection(db, 'food_vacations'),
  where('adminId', '==', user.ownerUid),
  where('status', 'in', ['active', 'shortened'])
);

const unsubVacations = onSnapshot(qVacations, (snapshot) => {
  const vacations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  setActiveVacations(vacations);
  recomputeHeadcounts(vacations);
});
```

#### Headcount Computation Logic:
When computing student states for a specific meal (e.g. `mealTab = 'Lunch'`):
```javascript
const mealKey = mealTab.toLowerCase(); // 'breakfast', 'lunch', 'snacks', 'dinner'

const studentsWithStatus = activeTenants.map(t => {
  // Check if tenant has an active vacation covering today & this meal
  const vacation = activeVacations.find(v => 
    v.tenantId === t.id &&
    todayStr >= v.startDate && 
    todayStr <= v.endDate &&
    v.meals.includes(mealKey)
  );

  if (vacation) {
    return {
      ...t,
      status: 'vacation',
      vacationDetails: `On Vacation until ${vacation.endDate}`
    };
  }

  // Normal meal status evaluation (eaten / notEaten / requested)
  // ...
});

// Headcount Counters:
const statsObj = {
  requested: studentsWithStatus.filter(s => s.status === 'requested').length,
  vacation:  studentsWithStatus.filter(s => s.status === 'vacation').length,
  pack:       studentsWithStatus.filter(s => s.status === 'pack').length,
  extra:      studentsWithStatus.filter(s => s.status === 'extra').length,
  eaten:      studentsWithStatus.filter(s => s.status === 'eaten').length,
  notEaten:   studentsWithStatus.filter(s => s.status === 'notEaten').length,
};
```
**Outcome**:
- Tenants on vacation are **completely excluded** from `requested` / `Eating`.
- Dedicated counter `statsObj.vacation` displays the count of students on leave.
- Student list displays a prominent "On Vacation" badge and disables "Mark Eaten" action.

### 4.3 Admin Headcount & Roster Sync (`Febebo-admin`)
In `MessHeadcount.jsx`, the admin selects `selectedDate`:
```javascript
const qVacations = query(
  collection(db, 'food_vacations'),
  where('adminId', '==', user.uid),
  where('status', 'in', ['active', 'shortened'])
);

// When mapping tenants:
const vacation = vacations.find(v =>
  v.tenantId === t.id &&
  selectedDate >= v.startDate &&
  selectedDate <= v.endDate &&
  v.meals.includes(mealTab)
);

const studentStatus = vacation ? 'vacation' : getStatus(isEaten, mealLog?.[mealTab]);
```
- Real-time updates: As soon as a student resumes meals or shortens dates, the `onSnapshot` fires instantly, recalculating counters without page reload.

---

## 5. Security Rules Specification (`firestore.rules`)

To enforce strict role-based access, data validation, and prevent tampering, the following security rules are defined for `food_vacations`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    function isAdmin() {
      return isAuthenticated() && (
        exists(/databases/$(database)/documents/admins/$(request.auth.uid)) ||
        exists(/databases/$(database)/documents/pg_owners/$(request.auth.uid))
      );
    }

    // ── Food Vacations Collection Rules ──
    match /food_vacations/{vacationId} {
      // 1. Read: Tenant can read their own; Property Admin & Staff can read for their property
      allow read: if isAuthenticated() && (
        resource.data.tenantId == request.auth.uid ||
        resource.data.adminId == request.auth.uid ||
        isAdmin()
      );

      // 2. Create: Authenticated tenant can create their own vacation with validation
      allow create: if isAuthenticated() &&
        request.resource.data.tenantId == request.auth.uid &&
        request.resource.data.status == 'active' &&
        request.resource.data.startDate is string &&
        request.resource.data.endDate is string &&
        request.resource.data.startDate <= request.resource.data.endDate &&
        request.resource.data.meals is list &&
        request.resource.data.meals.size() > 0 &&
        request.resource.data.adminId is string &&
        request.resource.data.pgId is string;

      // 3. Update:
      // - Tenant can shorten date or resume/cancel their own vacation
      // - Admin can update any vacation within their PG
      allow update: if isAuthenticated() && (
        // Tenant updating own vacation: cannot alter tenantId, adminId, or pgId
        (
          resource.data.tenantId == request.auth.uid &&
          request.resource.data.tenantId == resource.data.tenantId &&
          request.resource.data.adminId == resource.data.adminId &&
          request.resource.data.status in ['active', 'shortened', 'resumed', 'cancelled']
        ) ||
        // Admin or staff of the property
        resource.data.adminId == request.auth.uid ||
        isAdmin()
      );

      // 4. Delete: Restricted to Admin or vacation owner
      allow delete: if isAuthenticated() && (
        resource.data.tenantId == request.auth.uid ||
        resource.data.adminId == request.auth.uid ||
        isAdmin()
      );
    }

    // Existing fallback
    match /{document=**} {
      allow read, write: if isAuthenticated();
    }
  }
}
```

---

## 6. Build Toolchain & Environment Verification

A full audit of `package.json` scripts, frameworks, dependencies, and build pipelines was performed across all three applications.

### 6.1 Toolchain Matrix

| Project | Path | Framework | Bundler | Node Module Type | Build Command | Dependencies of Note |
|---|---|---|---|---|---|---|
| **Student App** | `c:\Users\RACHIT\OneDrive\Desktop\Febeboo\febebo-app` | React 19.2.7 | Vite 8.1.0 | ESM (`"type": "module"`) | `npm run build` | `@capacitor/android: ^8.4.1`, `firebase: ^12.16.0`, `lucide-react: ^1.22.0`, `@yudiel/react-qr-scanner: ^2.6.0`, `react-qr-code: ^2.2.0` |
| **Staff App** | `c:\Users\RACHIT\OneDrive\Desktop\Febeboo\febebo-staff` | React 19.2.7 | Vite 8.1.0 | ESM (`"type": "module"`) | `npm run build` | `@capacitor/android: ^8.4.1`, `firebase: ^12.17.0`, `recharts: ^3.9.2`, `lucide-react: ^1.22.0` |
| **Admin App** | `c:\Users\RACHIT\OneDrive\Desktop\Febeboo\Febebo-admin` | React 19.2.7 | Vite 8.1.0 | ESM (`"type": "module"`) | `npm run build` | `@capacitor/android: ^8.4.1`, `firebase: ^12.16.0`, `recharts: ^3.10.0`, `lucide-react: ^1.22.0` |

### 6.2 Local Build Verification Results
All three targets were executed synchronously using `npm run build`:

1. **`febebo-app`**:
   - Command: `npm run build`
   - Exit Code: **0**
   - Output bundle: `dist/assets/index-D0d6UTpw.js` (1,529.77 kB)
   - Duration: **1.02s**
2. **`febebo-staff`**:
   - Command: `npm run build`
   - Exit Code: **0**
   - Output bundle: `dist/assets/index-xR3oAU7V.js` (1,336.58 kB)
   - Duration: **772ms**
3. **`Febebo-admin`**:
   - Command: `npm run build`
   - Exit Code: **0**
   - Output bundle: `dist/assets/index-B2sVLPqK.js` (193.34 kB)
   - Duration: **928ms**

**Verification Conclusion**: The build environments and dependencies are completely healthy, with zero compilation or syntax errors.

---

## 7. Concrete Implementation Roadmap

Based on this investigation, the implementation phase can be cleanly segmented into atomic tasks:

### Task 1: Tenant Vacation Booking & Experience (`febebo-app`)
- **File**: `febebo-app/src/screens/Food.jsx` & `Food.css`
- **Actions**:
  1. Add "Food Vacation" card to the "Food Services" grid.
  2. Implement `VacationModal`:
     - Start Date picker (defaults to today, `min = todayStr`).
     - End Date picker (`min = startDate`).
     - Meal selection: Checkboxes for Breakfast, Lunch, Snacks, Dinner, and "Select All" toggle.
     - Optional reason input.
     - Save handler creating document in `collection(db, 'food_vacations')`.
  3. Active Vacation Card & Banner:
     - Prominent banner when today is within an active pause period.
     - "Shorten Period" button (opens date picker to reduce `endDate`).
     - "Resume Meals Now" button (with confirmation modal setting `status = 'resumed'`).
  4. Lock paused meal cards:
     - Hide "Scan Cook's QR to Eat", "Pack", "Cancel", and "Show my meal pass".
     - Show locked indicator: "🌴 Meals Paused on Vacation".

### Task 2: Kitchen Headcount Synchronization (`febebo-staff`)
- **File**: `febebo-staff/src/pages/StaffApp.jsx`
- **Actions**:
  1. Add real-time listener for `food_vacations` where `adminId == user.ownerUid` and `status in ['active', 'shortened']`.
  2. In `rebuild()` / `computeStudents()`:
     - Check if student is on active vacation for `todayStr` and current meal tab.
     - Assign status `'vacation'`.
  3. Update `statsObj`:
     - Exclude vacation students from `requested` count.
     - Add `statsObj.vacation`.
     - Render "On Vacation" stat card with distinctive badge (e.g. Indigo/Purple theme).
  4. In student list rendering:
     - Render vacation students with "🌴 On Vacation (until [End Date])".
     - In manual selection modal (`showManual`), exclude students on vacation.

### Task 3: Admin Mess Headcount Synchronization (`Febebo-admin`)
- **File**: `Febebo-admin/src/pages/MessHeadcount.jsx`
- **Actions**:
  1. Add real-time listener for `food_vacations` where `adminId == user.uid` and `status in ['active', 'shortened']`.
  2. In `students` memoization:
     - Check vacation status against `selectedDate` and current meal tab.
     - Set status to `'vacation'`.
  3. In `statsCount`:
     - Add `vacation: students.filter(s => s[mealKey] === 'vacation').length`.
     - Exclude vacation students from `requested` count.
  4. Add "On Vacation" filter button in the stat pills row.
  5. In student roster:
     - Show "On Vacation" tag and pause dates.

### Task 4: Firestore Rules (`firestore.rules`)
- Provide `firestore.rules` file in repository root to standardize production deployment rules.

---
*End of Report.*
