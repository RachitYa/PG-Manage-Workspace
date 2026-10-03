# Handoff Report: Explorer Survey 3 - Firestore Data Schema, Security Rules & Build Toolchains

**Target Recipient**: Parent Orchestrator (`5f789ae3-639b-4567-89bb-4d2bf8ecaeb0`) & Feature Implementers
**Investigation Focus**: Firestore Data Schema, Security Rules, and Build Toolchains across `febebo-app`, `febebo-staff`, and `Febebo-admin`.
**Report Path**: `c:\Users\RACHIT\OneDrive\Desktop\Febeboo\.agents\teamwork\explorer_survey_3\survey_report.md`
**Handoff Type**: Hard (Task Complete)

---

## 1. Observation

1. **Firebase Config & Project Identity**:
   - `febebo-app/src/firebase.js:9`: `projectId: "febebo-2026"`
   - `febebo-staff/src/firebase.js:10`: `projectId: "febebo-2026"`
   - `Febebo-admin/src/firebase.js:10`: `projectId: "febebo-2026"`
   All three applications point to the identical Firebase project and Firestore instance. No local `firestore.rules` or `firebase.json` file is present in the workspace root.

2. **Existing Meal & Headcount Data Patterns**:
   - In `febebo-app/src/screens/Food.jsx:171`:
     `const headcountDocRef = doc(db, 'mess_headcount', `${user.subscribedPG.pgId}_${getTodayStr()}`);`
     Eaten status is read from dynamic boolean keys `${user.uid}_breakfast_eaten`, etc.
   - In `febebo-app/src/screens/Food.jsx:224`:
     `const docRef = doc(db, 'pg_owners', user.subscribedPG.pgId, 'food_requests', user.uid);`
     Daily meal action writes `{ todayStatus: { [meal]: 'pack' | 'cancel' | null } }`.
   - In `febebo-staff/src/pages/StaffApp.jsx:1062` and `1941`:
     `const qMeal = query(collection(db, 'meal_status'), where('adminId', '==', adminId), where('date', '==', todayStr));`
     Reads `meal_status`, but zero code writes to `meal_status` anywhere in the repository.
   - In `febebo-staff/src/pages/StaffApp.jsx:3493-3498`:
     `requested: students.filter(s=>s[mealKey]==='requested').length`
     All active tenants default to `requested` (`Eating`) unless explicitly marked eaten.
   - In `Febebo-admin/src/pages/MessHeadcount.jsx:261` and `312-321`:
     `const docRef = doc(db, 'mess_headcount', `${pgDocId}_${selectedDate}`);`
     `requested: students.filter(s => s[mealKey] === 'requested').length`
     Admin dashboard similarly assumes all approved tenants are eating by default.

3. **Tenant & Multi-Tenancy Data Structure**:
   - In `Febebo-admin/src/pages/ManageTenants.jsx:207-230`:
     `tenants` collection stores documents with `adminId`, `pgId`, `tenantId`, `name`, `roomNo`, `bedNo`, `status` (`'Approved'`, `'Current User'`), `serviceType`.
   - In `febebo-app/src/context/AuthContext.jsx:45-48`:
     Student profile contains `subscribedPG: { pgId, adminId, roomNo, bedNo, status }`.
   - In `febebo-staff/src/pages/StaffApp.jsx:1069`:
     Cook/staff app queries tenants by `where('adminId', '==', user.ownerUid)`.

4. **Date Formatting Conventions**:
   - `febebo-app/src/screens/Food.jsx:14`:
     `return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;`
   - `Febebo-admin/src/pages/MessHeadcount.jsx:144`:
     `return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;`
   - `febebo-staff/src/pages/StaffApp.jsx:8441`:
     `const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;`
   All date references across the codebase use local `YYYY-MM-DD` strings.

5. **Build Toolchains & Package Setups**:
   - `febebo-app/package.json`: Vite 8.1.0, React 19.2.7, ESM, script `"build": "vite build"`.
   - `febebo-staff/package.json`: Vite 8.1.0, React 19.2.7, ESM, script `"build": "vite build"`.
   - `Febebo-admin/package.json`: Vite 8.1.0, React 19.2.7, ESM, script `"build": "vite build"`.
   - Build execution tests via `run_command`:
     - `cd febebo-app && npm run build` exited with code 0 (1.02s).
     - `cd febebo-staff && npm run build` exited with code 0 (772ms).
     - `cd Febebo-admin && npm run build` exited with code 0 (928ms).

---

## 2. Logic Chain

1. **Current Absence of Vacation Tracking (Obs 1, Obs 2)**:
   Because no `food_vacations` or `food_cancellations` collection exists and daily cancellations are scoped only to `pg_owners/{pgId}/food_requests/{studentId}` for a single day, long-term leave cannot be persisted or retrieved across arbitrary date ranges.

2. **Headcount Distortion (Obs 2)**:
   Because `StaffApp.jsx` and `MessHeadcount.jsx` compute `requested` as all approved tenants who are not marked `eaten` or `not_eating`, any student away on multi-day leave is counted as `requested` (eating). This directly violates requirement R3 ("automatically excluded from the Eating / Requested headcount for the paused meals").

3. **Collection Placement Architecture (Obs 1, Obs 3)**:
   - Nested subcollections under `pg_owners` require collectionGroup queries to fetch student-wide history and restrict cross-PG visibility.
   - A top-level collection `food_vacations` with fields `tenantId`, `adminId`, and `pgId` allows:
     1. Student app to query `where('tenantId', '==', user.uid)` directly.
     2. Cook app to query `where('adminId', '==', user.ownerUid)` directly.
     3. Admin app to query `where('adminId', '==', user.uid)` directly.
   - Storing `dates: string[]` (array of `YYYY-MM-DD` strings for each day of the vacation) enables direct `array-contains` Firestore queries without requiring complex composite multi-field inequality indexes (`startDate <= date AND endDate >= date`).

4. **Lifecycle & Immediacy (Obs 2, Obs 4)**:
   - Lifecycle states `'active' | 'shortened' | 'resumed' | 'cancelled'` cleanly handle early returns:
     - When student clicks "Resume Meals Now", updating `status = 'resumed'` immediately satisfies the `onSnapshot` listeners in `Food.jsx`, `StaffApp.jsx`, and `MessHeadcount.jsx` in real time (< 200ms) without page reloads.
     - When student shortens the return date, updating `endDate`, `dates`, and `status = 'shortened'` ensures the leave expires on the new earlier date.

5. **Build Feasibility (Obs 5)**:
   All three web applications compile cleanly with `npm run build` under Vite 8 and React 19. No legacy build blockers or syntax errors exist.

---

## 3. Caveats

1. **Firebase Security Rules Deployment**:
   No `firestore.rules` file is currently checked into version control. Rules are likely configured via the Firebase Web Console or running in test/open mode. A recommended production `firestore.rules` has been defined in `survey_report.md` and should be committed.
2. **Multi-PG Edge Cases**:
   In rare multi-PG setups where an admin has multiple properties under the same account (`activePgId !== 'primary'`), both `adminId` and `pgId` should always be stored on every vacation document to guarantee proper property scoping.
3. **Date Generation Warning**:
   Never use `new Date().toISOString().split('T')[0]` for daily comparisons in IST, as it lags behind local time between 00:00 and 05:29 AM. Always use local `YYYY-MM-DD` format via `getFullYear()`, `getMonth() + 1`, and `getDate()`.

---

## 4. Conclusion

The recommended Firestore infrastructure for the Long-Term Food Vacation feature consists of:
1. **Collection Name**: `food_vacations` (top-level collection).
2. **Core Document Fields**:
   - `tenantId` (string, student UID)
   - `tenantName` (string)
   - `tenantPhone` (string)
   - `roomNumber` (string)
   - `bedNumber` (string, optional)
   - `pgId` (string)
   - `adminId` (string)
   - `startDate` (string, `YYYY-MM-DD`)
   - `endDate` (string, `YYYY-MM-DD`)
   - `originalEndDate` (string, optional, set when shortened)
   - `dates` (array of `YYYY-MM-DD` strings)
   - `meals` (`['breakfast', 'lunch', 'snacks', 'dinner']`)
   - `isAllMeals` (boolean)
   - `status` (`'active' | 'shortened' | 'resumed' | 'cancelled'`)
   - `reason` (string, optional)
   - `createdAt`, `updatedAt`, `shortenedAt`, `resumedAt`, `cancelledAt` (ISO strings)
3. **Synchronization Pattern**:
   - `febebo-app`: Real-time listener for tenant's active pause -> locks paused meal cards (disables QR scanner, QR pass, pack, cancel) and renders "Food Vacation Active" banner with "Shorten Period" and "Resume Meals Now" actions.
   - `febebo-staff`: Real-time listener for PG's active vacations -> marks vacation students with status `'vacation'`, excludes them from `requested` headcount, adds dedicated "On Vacation" counter, and badges student cards.
   - `Febebo-admin`: Real-time listener in `MessHeadcount.jsx` for `selectedDate` -> excludes vacation students from `requested` and shows vacation breakdown.
4. **Build Toolchains**: Verified clean and ready for implementation.

Full schema diagrams, queries, and security rules are documented in `c:\Users\RACHIT\OneDrive\Desktop\Febeboo\.agents\teamwork\explorer_survey_3\survey_report.md`.

---

## 5. Verification Method

To independently verify all findings:

1. **Verify Builds**:
   Run the following commands from the workspace root:
   ```bash
   cd febebo-app && npm run build
   cd ../febebo-staff && npm run build
   cd ../Febebo-admin && npm run build
   ```
   *Expected Result*: All three commands exit with code 0.

2. **Verify Existing Headcount Logic**:
   - Inspect `febebo-staff/src/pages/StaffApp.jsx` lines 3490–3508: Observe that `requested` counts all students where `status === 'requested'` and defaults without vacation awareness.
   - Inspect `Febebo-admin/src/pages/MessHeadcount.jsx` lines 312–321: Observe identical default behavior.

3. **Verify Food Screen Actions**:
   - Inspect `febebo-app/src/screens/Food.jsx` lines 550–590: Observe that action buttons ("Scan Cook's QR to Eat", "Pack", "Cancel", "Or show my meal pass") are currently unconditional when `!eatenStatus[meal]`.

4. **Invalidation Conditions**:
   This report's design would be invalidated if:
   - A subcollection-only constraint was mandated by existing backend Cloud Functions (verified: `server.js` does not process food vacations).
   - Firestore security rules prohibited top-level collections (verified: `complaints` and `tenants` are already top-level collections).
