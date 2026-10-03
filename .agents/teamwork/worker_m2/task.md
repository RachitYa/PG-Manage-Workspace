# Milestone 2 Task Assignment: febebo-app Student Experience

## Target Files (Write Ownership)
- `febebo-app/src/screens/Food.jsx`
- `febebo-app/src/screens/Food.css`

## Authoritative Requirements & Context
- Read `c:\Users\RACHIT\OneDrive\Desktop\Febeboo\.agents\teamwork\ORIGINAL_REQUEST.md` (R1 & R2)
- Read `c:\Users\RACHIT\OneDrive\Desktop\Febeboo\.agents\teamwork\PROJECT.md`
- Use utilities from `febebo-app/src/utils/vacationUtils.js` (`formatDateStr`, `getTodayStr`, `generateDateRange`, `validateVacationRange`, `isMealPausedOnDate`, `buildVacationDoc`, `formatDateDisplay`, `MEAL_LABELS`)
- Reference survey findings in `c:\Users\RACHIT\OneDrive\Desktop\Febeboo\.agents\teamwork\explorer_survey_1\survey_report.md`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Detailed Requirements

### 1. Vacation Booking Modal
- Add a new "Food Vacation" card inside the "Food Services" grid in `Food.jsx` (alongside "Rate Food" and "Extra Plates").
- Clicking opens a "Food Vacation / Long-Term Leave" modal (`activeModal === 'vacation'`).
- Modal contents:
  - Start Date input (`type="date"`, min = today).
  - End Date input (`type="date"`, min = start date).
  - Granular meal selection:
    - Toggle/Checkbox: "Full Day (All Meals)" (defaults to true).
    - If unchecked: Individual checkboxes for "Breakfast", "Lunch", "Snacks", "Dinner".
  - Optional reason/note input.
  - Validation: Ensure Start Date <= End Date, at least 1 meal selected.
  - Save action:
    - Constructs `vacationData` via `buildVacationDoc(...)` with `tenantId: user.uid`, `tenantName: user.name`, `adminId: user.subscribedPG.adminId || user.subscribedPG.ownerUid`, `pgId: user.subscribedPG.pgId`, `status: 'active'`.
    - Saves document to `collection(db, 'food_vacations')`.
    - Also writes `foodVacation: vacationData` to `doc(db, 'users', user.uid)` and `doc(db, 'tenants', user.uid)` for multi-app reactivity.
    - Closes modal and displays success alert/toast.

### 2. Active Vacation Banner
- Real-time listener: Listen to `food_vacations` collection where `tenantId == user.uid` and `status in ['active', 'shortened']`, OR read `user.profileData.foodVacation`.
- If an active vacation exists covering today or future dates:
  - Render a prominent "Food Vacation Active" banner at top of `.food-scroll-area`.
  - Banner displays:
    - Active dates: `formatDateDisplay(vacation.startDate)` to `formatDateDisplay(vacation.endDate)`.
    - Remaining days countdown badge.
    - Paused meals chips: "All Meals" or chips for each paused meal.
    - Action buttons:
      - "Shorten Period": opens Shorten Modal to pick an earlier End Date.
      - "Resume Meals Now": opens confirmation prompt, then cancels remaining vacation (`status = 'resumed'`, `endDate` set to yesterday, syncs to Firestore).

### 3. Daily Meal Action Locking
- In the meal subcard (`renderMealCard` or meal action section):
  - Check `isMealPausedToday(meal)` using `isMealPausedOnDate(activeVacation, todayStr, meal)`.
  - If paused:
    - Hide/disable "Pack" and "Cancel" buttons; render a locked card: "🏖️ Meals Paused - On Food Vacation".
    - Disable/hide "Show meal pass" (`MEALPASS` QR generation).
    - If student attempts reverse QR scanner (`handleStudentScan`), reject the scan if the meal is paused: `alert('Cannot scan: You are currently on Food Vacation for ' + meal)`.

### 4. Non-Food Modules Verification
- Ensure NO changes are made to `Account.jsx`, `Complaints.jsx`, `Chat.jsx`, or `RequestBox.jsx`.

### 5. Build Verification
- Run `npm run build` in `febebo-app` and ensure it compiles cleanly with exit code 0.
- Also verify `node tests/e2e/test_vacation_suite.mjs` runs and passes.
- Deliver `handoff.md` with build logs and verification evidence.
