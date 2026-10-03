# Handoff Report: febebo-app Student Experience Survey

**Agent**: Explorer 1 (`explorer_survey_1`)  
**Mission**: Investigate `febebo-app` for Long-Term Meal Cancellation / Food Vacation  
**Target Report**: `c:\Users\RACHIT\OneDrive\Desktop\Febeboo\.agents\teamwork\explorer_survey_1\survey_report.md`  
**Timestamp**: 2026-10-02T07:33:00Z  

---

## 1. Observation

1. **Food Screen Location & Route**:
   - `febebo-app/src/App.jsx:159`: `<Route path="/food" element={<ProtectedRoute><Food /></ProtectedRoute>} />`.
   - `febebo-app/src/screens/StudentDashboard.jsx:149`: `{ name: 'Food Menu', icon: Utensils, path: '/food', color: '#f59e0b', bg: '#fef3c7', hideForOnlyRoom: true }`.

2. **Daily Meal Loading & Real-time State**:
   - `febebo-app/src/screens/Food.jsx:161-168`: Listens to `pg_owners/{pgId}` for `foodMenu`, `foodMenuImages`, and `foodItemImages`.
   - `febebo-app/src/screens/Food.jsx:171-182`: Listens to `mess_headcount/{pgId}_{todayDate}` for `{ [`${user.uid}_${meal}_eaten`]: true }`.
   - `febebo-app/src/screens/Food.jsx:185-191`: Listens to `pg_owners/{pgId}/food_requests/{user.uid}` for `todayStatus`.

3. **QR Generation and Meal Actions**:
   - `febebo-app/src/screens/Food.jsx:220-245`: `handleMealAction(meal, 'pack' | 'cancel')` toggles requests in `pg_owners/{pgId}/food_requests/{user.uid}`.
   - `febebo-app/src/screens/Food.jsx:816`: QR generation renders `<QRCode value={"MEALPASS|" + activeMealQR.toLowerCase() + "|" + user.uid + "|" + (user.name || "Student") + "|" + roomNo} size={200} />`.
   - `febebo-app/src/screens/Food.jsx:281-383`: Student reverse scanner checks Cook QR `FEBEBO_MEAL|ownerUid|meal|date` and writes to `mess_headcount/{pgId}_{today}`.

4. **Food Services Insertion Point**:
   - `febebo-app/src/screens/Food.jsx:782-801`: Food Services section contains a 2-column grid (`.food-action-grid`) with "Rate Food" (`setActiveModal('rate')`) and "Extra Plates" (`setActiveModal('extra')`).

5. **Tenant / User Profile State**:
   - `febebo-app/src/context/AuthContext.jsx:21-49`: `onSnapshot(doc(db, 'users', firebaseUser.uid))` continuously updates `user.profileData`.
   - `febebo-staff/src/pages/StaffApp.jsx:1069-1089`: Cook app listens to `tenants` collection where `adminId == adminId` and enriches from `users/{uid}`.
   - `Febebo-admin/src/pages/MessHeadcount.jsx:207-234`: Admin app listens to `tenants` collection where `adminId == user.uid` and enriches from `users/{uid}`.

6. **Non-Food Modules Isolation**:
   - `febebo-app/src/screens/Account.jsx`: Uses `payments` and `users` collections; independent of meals.
   - `febebo-app/src/screens/Complaints.jsx`: Uses `complaints` collection; independent of meals.
   - `febebo-app/src/screens/Chat.jsx`: Uses `chats` collection; independent of meals.
   - `febebo-app/src/screens/RequestBox.jsx`: Uses `item_requests` and `inventory` collections; independent of meals.

7. **Build Baseline**:
   - `npm run build` in `febebo-app` succeeded with exit code 0 (1.13s).
   - `npm run build` in `febebo-staff` succeeded with exit code 0 (785ms).
   - `npm run build` in `Febebo-admin` succeeded with exit code 0 (1.06s).

---

## 2. Logic Chain

1. **Isolation from Non-Food Modules**:
   - *Observation 6* proves that non-food tabs (`Account`, `Complaints`, `Chat`, `RequestBox`) query separate collections and maintain no state linkages to `Food.jsx`.
   - Therefore, introducing meal vacation logic within `febebo-app` will not disrupt non-food resident features.

2. **Instant Cross-App Synchronization via Dual-Write**:
   - *Observation 5* shows that `febebo-app` listens to `users/{uid}`, while `febebo-staff` and `Febebo-admin` listen to `tenants` and enrich with `users/{uid}`.
   - Writing the `foodVacation` payload to both `users/{user.uid}` and `tenants/{user.uid}` simultaneously ensures that all 3 applications receive reactive updates in real time with zero polling or refresh.

3. **UI Insertion Point Harmony**:
   - *Observation 4* shows that "Food Services" (`.food-action-grid`) in `Food.jsx` is the standard location for secondary food actions. Adding "Food Vacation" as a 3rd action card fits the design language perfectly.
   - *Observation 2* shows that the top of `.food-scroll-area` is where daily status and quick actions live. Placing the "Food Vacation Active" banner here guarantees prominent visibility on both "Today's Menu" and "Full Week" tabs.

4. **Robust Action & QR Locking**:
   - *Observation 3* identifies the three pathways to mark a meal: (a) Student meal pass QR (`MEALPASS`), (b) Cook counter QR scan (`handleStudentScan`), and (c) Daily buttons ("Pack" / "Cancel").
   - By creating a helper `isMealPausedToday(mealName)`, all three pathways can be reliably blocked:
     - Subcard actions replaced by a locked banner (`vacation-locked-action-box`).
     - "Show meal pass" button disabled/hidden for paused meals.
     - `handleStudentScan` rejects scanned meals that fall under active vacation.

5. **Early Resume & Shorten Mechanics**:
   - Updating `foodVacation.endDate` to an earlier date immediately shrinks the vacation window.
   - Setting `foodVacation.status = 'resumed'` and `endDate` to yesterday ensures `isDateInVacation()` returns `false` immediately, unlocking all buttons on the student screen and re-enabling headcount counters across staff and admin apps.

---

## 3. Caveats

1. **Past Date Boundary**: The date picker must strictly enforce `min={getTodayStr()}` to prevent booking leaves retroactively.
2. **Partial vs Full-Day Schema**: Individual meal selections must be stored as an explicit array `['Breakfast', 'Lunch', ...]` when `isFullDay: false`, so staff and admin apps can iterate and filter specific meals cleanly.
3. **Subscribed PG Presence**: If a tenant has not yet subscribed to a PG (`user.subscribedPG` is null), the Food screen displays the standard empty state. The vacation modal should verify `user?.subscribedPG?.pgId` before attempting to write to `tenants` or `users`.

---

## 4. Conclusion

The survey confirms:
1. `febebo-app` requires changes only in `src/screens/Food.jsx` and `src/screens/Food.css`.
2. The UI insertion points for the Vacation Modal, Active Vacation Banner, Action Lock, and Early Resume controls are precisely identified and documented with working code patterns in `survey_report.md`.
3. All non-food modules are 100% decoupled and safe from regressions.
4. The dual-write strategy to `users/{uid}` and `tenants/{uid}` enables instant real-time synchronization with `febebo-staff` and `Febebo-admin`.

---

## 5. Verification Method

1. **File Review**:
   - Review comprehensive survey report at `c:\Users\RACHIT\OneDrive\Desktop\Febeboo\.agents\teamwork\explorer_survey_1\survey_report.md`.
   - Inspect `febebo-app/src/screens/Food.jsx` around lines 220–250, 485–595, and 780–825.
2. **Build Verification**:
   - Run `npm run build` in `c:\Users\RACHIT\OneDrive\Desktop\Febeboo\febebo-app`.
   - Exit code must be 0.
3. **Invalidation Conditions**:
   - If `febebo-staff` or `Febebo-admin` stop listening to `tenants` or `users/{uid}`, the dual-write sync mechanism would need an alternate subscription path. (Currently confirmed active).
