## 2026-10-02T07:45:15Z

You are Worker M3 implementing the Kitchen & Headcount Real-Time Sync in febebo-staff and Febebo-admin for the Febeboo Long-Term Food Vacation feature.
Your working directory is: c:\Users\RACHIT\OneDrive\Desktop\Febeboo\.agents\teamwork\worker_m3
Read your task assignment: c:\Users\RACHIT\OneDrive\Desktop\Febeboo\.agents\teamwork\worker_m3\task.md
Authoritative user request: c:\Users\RACHIT\OneDrive\Desktop\Febeboo\.agents\teamwork\ORIGINAL_REQUEST.md
Project plan and contracts: c:\Users\RACHIT\OneDrive\Desktop\Febeboo\.agents\teamwork\PROJECT.md
Survey findings: c:\Users\RACHIT\OneDrive\Desktop\Febeboo\.agents\teamwork\explorer_survey_2\survey_report.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Implement:
1. `febebo-staff/src/pages/StaffApp.jsx`:
   - Real-time `onSnapshot` listener to `food_vacations`.
   - Update `computeStudents` and `rebuild` using `isStudentOnVacation` from `src/utils/vacationUtils.js` to set status `'onVacation'`.
   - Automatically exclude vacationing students from `requested` (eating) headcount.
   - Add `onVacation` count to `statsObj`.
   - Add dedicated "On Food Vacation / Leave" stat card/banner showing paused count.
   - Add filtered student roster for `selectedStat === 'onVacation'` with dates, meals, and disabled "Mark Eaten".
   - Exclude vacationing students from `showManual` modal.
2. `Febebo-admin/src/pages/MessHeadcount.jsx`:
   - Real-time `onSnapshot` listener to `food_vacations`.
   - Update `students` useMemo and `statsCount` useMemo using `isStudentOnVacation`.
   - Add "On Leave" stat filter card and badge in student roster.
3. `Febebo-admin/src/pages/ManageTenants.jsx`:
   - Add vacation indicator for tenants currently on food pause.

Verify:
- `npm run build` in `febebo-staff` and `Febebo-admin` (both must exit with code 0).
- `node tests/e2e/test_vacation_suite.mjs` (must pass 100%).
Write comprehensive handoff report to `c:\Users\RACHIT\OneDrive\Desktop\Febeboo\.agents\teamwork\worker_m3\handoff.md` and notify parent when complete.
