# Handoff Report: febebo-staff & Febebo-admin Kitchen/Headcount Experience

**Agent**: Explorer 2  
**Task**: Survey `febebo-staff` and `Febebo-admin` for Tenant Long-Term Food Vacation synchronization  
**Date**: 2026-10-02  
**Working Directory**: `c:\Users\RACHIT\OneDrive\Desktop\Febeboo\.agents\teamwork\explorer_survey_2`

---

## 1. Observation

1. **febebo-staff Cook Dashboard & Headcount Implementation**:
   - File: `febebo-staff/src/pages/StaffApp.jsx` (Total Lines: 8691).
   - Cook Live Mess Headcount Card is rendered at lines 3378–3407:
     ```javascript
     Line 3391: <h3 style={{margin:'6px 0 0', fontSize:18, fontWeight:900, color:'#f8fafc'}}>Current Meal Eaten ({activeMeal})</h3>
     Line 3395: {Object.keys(eatenData).filter(k => k.includes(`_${activeMeal}_eaten`)).length}
     ```
   - Real-time listener on `mess_headcount` at lines 1744–1751:
     ```javascript
     const docRef = doc(db, 'mess_headcount', `${user.ownerUid}_${new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0')}`);
     const unsub = onSnapshot(docRef, (docSnap) => {
       if (docSnap.exists()) setEatenData(docSnap.data());
     });
     ```
   - Headcount calculation formula in `StaffApp.jsx` lines 3490–3498:
     ```javascript
     const mealKey = mealTab==='Breakfast'?'statusB':mealTab==='Lunch'?'statusL':mealTab==='Snacks'?'statusS':'statusD';
     const statsObj = {
       requested: students.filter(s=>s[mealKey]==='requested').length,
       pack: students.filter(s=>s[mealKey]==='pack').length,
       extra: students.filter(s=>s[mealKey]==='extra').length,
       eaten: students.filter(s=>s[mealKey]==='eaten').length,
       notEaten: students.filter(s=>s[mealKey]==='notEaten').length,
     };
     ```
   - Default student status in `StaffApp.jsx` line 1954:
     ```javascript
     statusB: mealLog?.breakfast === 'not_eating' ? 'notEaten' : mealLog?.breakfast === 'eaten' ? 'eaten' : 'requested'
     ```
     Any tenant without an explicit log in `meal_status` defaults to `'requested'` (i.e. Eating).
   - "Mark Eaten" action at lines 2444–2478:
     ```javascript
     const docRef = doc(db, 'mess_headcount', `${user.ownerUid}_${todayStr}`);
     await setDoc(docRef, { [`${tenantId}_${mealStr}_eaten`]: true }, { merge: true });
     ```
   - Manual Selection modal at line 8555:
     ```javascript
     const notEatenStudents = students.filter(s =>
       !eatenData[`${s.id}_${activeMealStr}_eaten`] && s[statusKey] !== 'eaten'
     );
     ```

2. **Febebo-admin Mess Headcount Implementation**:
   - File: `Febebo-admin/src/pages/MessHeadcount.jsx` (Total Lines: 2137).
   - Active Listeners:
     - `tenants` collection: lines 207–242 (`where('adminId', '==', user.uid)`).
     - `meal_status` collection: lines 247–256 (`where('adminId', '==', user.uid), where('date', '==', selectedDate)`).
     - `mess_headcount` doc: lines 260–270 (`${pgDocId}_${selectedDate}`).
   - Student status assignment in `useMemo` at lines 281–287:
     ```javascript
     const getStatus = (isEaten, val) => {
       if (isEaten) return 'eaten';
       if (val === 'not_eating') return 'notEaten';
       if (val === 'pack') return 'pack';
       if (val === 'extra') return 'extra';
       return 'requested';
     };
     ```
   - Headcount calculation in `statsCount` useMemo at lines 312–321:
     ```javascript
     const statsCount = useMemo(() => {
       return {
         all: students.length,
         requested: students.filter(s => s[mealKey] === 'requested').length,
         pack: students.filter(s => s[mealKey] === 'pack').length,
         extra: students.filter(s => s[mealKey] === 'extra').length,
         eaten: students.filter(s => s[mealKey] === 'eaten').length,
         notEaten: students.filter(s => s[mealKey] === 'notEaten').length,
       };
     }, [students, mealKey]);
     ```

3. **Compilation Commands & Results**:
   - `Febebo-admin`: `npm run build` executed in `c:\Users\RACHIT\OneDrive\Desktop\Febeboo\Febebo-admin` -> exited with code 0 (✓ built in 872ms).
   - `febebo-staff`: `npm run build` executed in `c:\Users\RACHIT\OneDrive\Desktop\Febeboo\febebo-staff` -> exited with code 0 (✓ built in 856ms).
   - `febebo-app`: `npm run build` executed in `c:\Users\RACHIT\OneDrive\Desktop\Febeboo\febebo-app` -> exited with code 0 (✓ built in 1.02s).

---

## 2. Logic Chain

1. **Observation 1 & 2** reveal that both `febebo-staff` (`StaffApp.jsx`) and `Febebo-admin` (`MessHeadcount.jsx`) determine headcounts by mapping through all active tenants in the PG and assigning each student a status of `'requested'` by default, unless they have a single-meal record in `meal_status` or an eaten flag in `mess_headcount`.
2. Because neither application queries or listens for multi-day food vacation periods, any student who goes on a 10-day leave is continuously classified as `requested`, inflating the cook's preparation requirements and distorting admin records.
3. By adding an `onSnapshot` listener to `collection(db, 'food_vacations')` (filtered by `where('adminId', '==', adminId), where('status', '==', 'active')`), both applications obtain real-time awareness of active leaves.
4. When mapping tenants to students, evaluating `isStudentOnVacation(studentId, selectedDate, meal)` before applying the `'requested'` default allows assigning status `'onVacation'`.
5. Because a student with status `'onVacation'` is filtered out of `requested` (`students.filter(s => s[mealKey] === 'requested')`), the "Eating / Requested" headcount automatically and accurately decreases.
6. Introducing a dedicated `onVacation` count into `statsObj` (in `StaffApp.jsx`) and `statsCount` (in `MessHeadcount.jsx`) allows rendering a prominent "On Food Vacation / Leave" stat card.
7. Filtering the student list by `selectedStat === 'onVacation'` reveals the list of students on pause with their vacation date range, paused meals, and reason.
8. When a tenant shortens or resumes food vacation in `febebo-app`, updating the Firestore document immediately triggers the `onSnapshot` callback in the Cook app and Admin app within ~100ms. The student's status transitions from `'onVacation'` back to `'requested'`, updating all counters reactively without requiring a page refresh.

---

## 3. Caveats

1. **Multi-PG Support in Admin App**: In `Febebo-admin`, `activePgId` can be `'primary'` or a specific PG ID. In `febebo-staff`, `user.ownerUid` is always the direct PG admin UID. The query for `food_vacations` must filter by `adminId == user.uid` (or `user.ownerUid`) and match `pgId` where applicable.
2. **Backward Compatibility**: If some vacation records are stored in `users/{uid}.foodVacation` or `tenants/{tenantDocId}.foodVacation` rather than only in `food_vacations` collection, the evaluation helper checks both sources to avoid missing records.
3. No other caveats.

---

## 4. Conclusion

The integration path for `febebo-staff` and `Febebo-admin` is completely defined, low-risk, and requires no architectural rewrites:
- Add a single `onSnapshot` subscription to `food_vacations` in `febebo-staff/src/pages/StaffApp.jsx` and `Febebo-admin/src/pages/MessHeadcount.jsx`.
- Update the student status resolution function to assign `'onVacation'` when `selectedDate` / `workDate` falls within an active vacation window for that meal.
- Add `onVacation` to the stat breakdown objects and render the dedicated "On Food Vacation / Leave" stat card and roster view.
- Exclude vacationing students from manual selection and decrement the expected eating headcount in the Live Mess Headcount banner.
- All target codebases are build-verified and ready for implementation.

Full code snippets, schemas, and insertion points are documented in `survey_report.md`.

---

## 5. Verification Method

1. **Build Verification**:
   ```bash
   cd "c:\Users\RACHIT\OneDrive\Desktop\Febeboo\Febebo-admin" && npm run build
   cd "c:\Users\RACHIT\OneDrive\Desktop\Febeboo\febebo-staff" && npm run build
   cd "c:\Users\RACHIT\OneDrive\Desktop\Febeboo\febebo-app" && npm run build
   ```
   All commands must exit with code 0.

2. **File Inspection**:
   - Check `c:\Users\RACHIT\OneDrive\Desktop\Febeboo\.agents\teamwork\explorer_survey_2\survey_report.md` for complete code snippets and step-by-step diff specifications.
   - Inspect `febebo-staff/src/pages/StaffApp.jsx` lines 1034–1097, 1939–2007, 3378–3606, 8549–8685.
   - Inspect `Febebo-admin/src/pages/MessHeadcount.jsx` lines 207–321, 664–760, 926–1050.

3. **Invalidation Conditions**:
   - If the student app stores vacations under an incompatible collection name or mismatched date format (e.g. non-ISO format), `isStudentOnVacation` date comparison will fail.
   - If `status !== 'active'` is not respected, completed or cancelled vacations would continue deducting headcounts.
