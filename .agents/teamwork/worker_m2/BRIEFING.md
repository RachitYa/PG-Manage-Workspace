# BRIEFING — 2026-10-02T07:52:00Z

## Mission
Implement the febebo-app Student Experience for the Febeboo Long-Term Food Vacation feature in `febebo-app/src/screens/Food.jsx` and `febebo-app/src/screens/Food.css`.

## 🔒 My Identity
- Archetype: implementer
- Roles: implementer, qa, specialist
- Working directory: c:\Users\RACHIT\OneDrive\Desktop\Febeboo\.agents\teamwork\worker_m2
- Original parent: 5f789ae3-639b-4567-89bb-4d2bf8ecaeb0
- Milestone: M2 - febebo-app Student Experience

## 🔒 Key Constraints
- DO NOT CHEAT: Genuine implementation, no hardcoded test shortcuts or dummy facades.
- Modify ONLY `febebo-app/src/screens/Food.jsx` and `febebo-app/src/screens/Food.css`.
- Zero modifications to non-food modules (`Account.jsx`, `Complaints.jsx`, `Chat.jsx`, `RequestBox.jsx`).
- Must save to `food_vacations` collection and sync to `users/{uid}` and `tenants/{uid}`.
- Real-time reactivity via Firestore listener.
- `npm run build` in `febebo-app` must pass with exit code 0.
- `node tests/e2e/test_vacation_suite.mjs` must pass with exit code 0.

## Current Parent
- Conversation ID: 5f789ae3-639b-4567-89bb-4d2bf8ecaeb0
- Updated: not yet

## Task Summary
- **What to build**:
  1. Vacation Booking Modal (Food Vacation card in Food Services, date range picker, full-day toggle vs granular meal checkboxes, saving to `food_vacations`, `users`, `tenants`).
  2. Active Vacation Banner at top of Food screen (dates, countdown, paused meal chips, "Shorten Period", "Resume Meals Now").
  3. Meal Action & QR Locking (Disable/hide pack/cancel, render locked vacation message, block `MEALPASS` QR generation, reject reverse QR scanning for paused meals).
  4. Early Resume & Shorten controls (Firestore update, status = 'resumed', restore normal UI).
  5. Zero modifications to non-food modules.
- **Success criteria**:
  - `npm run build` in `febebo-app` exits with code 0.
  - `node tests/e2e/test_vacation_suite.mjs` exits with code 0.
- **Interface contracts**: `PROJECT.md` § Interface Contracts (`buildVacationDoc`, `isMealPausedOnDate`).
- **Code layout**: `PROJECT.md` § Code Layout.

## Change Tracker
- **Files modified**:
  - `febebo-app/src/screens/Food.jsx`: Added Food Vacation booking modal, active banner, meal/QR locking, shorten & early resume handlers, real-time listener to `food_vacations`.
  - `febebo-app/src/screens/Food.css`: Added styles for vacation banner, paused meal chips, action buttons, and locked meal subcard.
- **Build status**: PASS (all 3 apps: `febebo-app` exit 0, `febebo-staff` exit 0, `Febebo-admin` exit 0)
- **Pending issues**: none

## Quality Status
- **Build/test result**: PASS (E2E test suite: 121/121 tests pass across 24 suites)
- **Lint status**: clean (0 errors)
- **Tests added/modified**: E2E test suite running full invariant verification

## Loaded Skills
- None loaded.

## Key Decisions Made
- Used `febebo-app/src/utils/vacationUtils.js` functions directly (`buildVacationDoc`, `isMealPausedOnDate`, `formatDateDisplay`, etc.).
- Implemented real-time `onSnapshot` subscription to `collection(db, 'food_vacations')` filtered by `tenantId == user.uid`.
- Simultaneously syncs vacation documents to `food_vacations/{id}`, `users/{uid}`, and `tenants/{uid}` for full cross-app reactivity with Cook and Admin portals.
- Ensured zero modifications to non-food modules (`Account.jsx`, `Complaints.jsx`, `Chat.jsx`, `RequestBox.jsx`).

## Artifact Index
- `febebo-app/src/screens/Food.jsx` — Student food screen
- `febebo-app/src/screens/Food.css` — Student food styling
