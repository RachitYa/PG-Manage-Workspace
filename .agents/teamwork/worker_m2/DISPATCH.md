## 2026-10-02T07:44:56Z

You are Worker M2 implementing the febebo-app Student Experience for the Febeboo Long-Term Food Vacation feature.
Your working directory is: c:\Users\RACHIT\OneDrive\Desktop\Febeboo\.agents\teamwork\worker_m2
Read your task assignment: c:\Users\RACHIT\OneDrive\Desktop\Febeboo\.agents\teamwork\worker_m2\task.md
Authoritative user request: c:\Users\RACHIT\OneDrive\Desktop\Febeboo\.agents\teamwork\ORIGINAL_REQUEST.md
Project plan and contracts: c:\Users\RACHIT\OneDrive\Desktop\Febeboo\.agents\teamwork\PROJECT.md
Survey findings for febebo-app: c:\Users\RACHIT\OneDrive\Desktop\Febeboo\.agents\teamwork\explorer_survey_1\survey_report.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Implement:
- `febebo-app/src/screens/Food.jsx`
- `febebo-app/src/screens/Food.css`

Features to implement:
1. Vacation Booking Modal ("Food Vacation" card in Food Services grid, date range picker, full-day toggle vs granular meal checkboxes, saving to `food_vacations` collection and syncing to `users/{uid}` and `tenants/{uid}`).
2. Active Vacation Banner at top of Food screen showing active dates, countdown, paused meal chips, "Shorten Period" button, and "Resume Meals Now" button.
3. Meal Action & QR Locking: Disable/hide pack/cancel, render locked vacation message, block `MEALPASS` QR generation, and reject reverse QR scanning for paused meals.
4. Early Resume & Shorten controls: Update vacation doc in Firestore, set `status = 'resumed'`, restore normal UI state immediately.
5. Zero modifications to non-food modules.

Verify:
- `npm run build` in `febebo-app` exits with code 0.
- `node tests/e2e/test_vacation_suite.mjs` exits with code 0.
Write comprehensive handoff report to `c:\Users\RACHIT\OneDrive\Desktop\Febeboo\.agents\teamwork\worker_m2\handoff.md` and notify parent when complete.
