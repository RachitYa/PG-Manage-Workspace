# Milestone 3 Task Assignment: Kitchen & Headcount Real-Time Sync

## Target Files (Write Ownership)
- `febebo-staff/src/pages/StaffApp.jsx`
- `Febebo-admin/src/pages/MessHeadcount.jsx`
- `Febebo-admin/src/pages/ManageTenants.jsx`

## Authoritative Requirements & Context
- Read `c:\Users\RACHIT\OneDrive\Desktop\Febeboo\.agents\teamwork\ORIGINAL_REQUEST.md` (R3)
- Read `c:\Users\RACHIT\OneDrive\Desktop\Febeboo\.agents\teamwork\PROJECT.md`
- Use utilities from `febebo-staff/src/utils/vacationUtils.js` and `Febebo-admin/src/utils/vacationUtils.js`
- Reference survey blueprints in `c:\Users\RACHIT\OneDrive\Desktop\Febeboo\.agents\teamwork\explorer_survey_2\survey_report.md`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Detailed Requirements

### 1. `febebo-staff/src/pages/StaffApp.jsx` (Cook Dashboard)
- Add real-time `onSnapshot` listener to `collection(db, 'food_vacations')` where `adminId == user.ownerUid` and `status in ['active', 'shortened']`.
- In `computeStudents` and `rebuild`:
  - Evaluate `isStudentOnVacation(vacations, t.id, currentDateStr, mealName)`.
  - If true: assign `onVacation` status for that meal.
  - This automatically excludes the student from `requested` status.
- In `statsObj`:
  - Include `onVacation: students.filter(s => s[mealKey] === 'onVacation').length`.
- UI: Dedicated "On Food Vacation / Leave" stat card/banner:
  - Display paused student count for `mealTab`.
  - When clicked, sets `selectedStat = 'onVacation'`.
- Roster: When `selectedStat === 'onVacation'`, display paused students with room number, vacation dates, and paused meals list. Replace "Mark Eaten" button with "🏖️ Paused" badge.
- Manual selection modal (`showManual`): Exclude students where `s[statusKey] === 'onVacation'`.
- Live mess headcount card: Update denominator to show active eaters.

### 2. `Febebo-admin/src/pages/MessHeadcount.jsx` (Admin Mess Dashboard)
- Add real-time `onSnapshot` listener to `collection(db, 'food_vacations')` where `adminId == user.uid` and `status in ['active', 'shortened']`.
- In `students` useMemo:
  - Evaluate `isStudentOnVacation(vacations, t.id, selectedDate, mealName)`.
  - If true: assign `onVacation` status.
- In `statsCount` useMemo:
  - Include `onVacation: students.filter(s => s[mealKey] === 'onVacation').length`.
- UI: Add "On Leave" stat filter card with `statsCount.onVacation`.
- In student list: If `s[mealKey] === 'onVacation'`, render "🏖️ On Leave" badge and vacation date range.

### 3. `Febebo-admin/src/pages/ManageTenants.jsx`
- Display "🌴 On Food Pause" indicator on tenant card if the tenant has an active vacation covering today.

### 4. Real-Time Responsiveness
- Ensure listeners immediately react when a vacation is created, shortened, or resumed in Firestore, updating the counters with zero page reload.

### 5. Build & Test Verification
- Run `npm run build` in `febebo-staff` and `Febebo-admin` (both must exit with code 0).
- Run `node tests/e2e/test_vacation_suite.mjs` (must pass 100%).
- Write comprehensive handoff report to `c:\Users\RACHIT\OneDrive\Desktop\Febeboo\.agents\teamwork\worker_m3\handoff.md` and notify parent when complete.
