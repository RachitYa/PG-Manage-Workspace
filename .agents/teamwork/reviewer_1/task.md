# Reviewer 1 Task Assignment: Verification of Requirements & Multi-App Builds

## Mission
Independently review the complete implementation of the Febeboo Long-Term Food Vacation feature across all 3 applications.

## Key Inputs
- `c:\Users\RACHIT\OneDrive\Desktop\Febeboo\.agents\teamwork\ORIGINAL_REQUEST.md`
- `c:\Users\RACHIT\OneDrive\Desktop\Febeboo\.agents\teamwork\PROJECT.md`
- `c:\Users\RACHIT\OneDrive\Desktop\Febeboo\.agents\teamwork\TEST_READY.md`
- Implementation files:
  - `febebo-app/src/screens/Food.jsx` & `Food.css`
  - `febebo-app/src/utils/vacationUtils.js`
  - `febebo-staff/src/pages/StaffApp.jsx`
  - `febebo-staff/src/utils/vacationUtils.js`
  - `Febebo-admin/src/pages/MessHeadcount.jsx`
  - `Febebo-admin/src/pages/ManageTenants.jsx`
  - `Febebo-admin/src/utils/vacationUtils.js`
  - `firestore.rules`

## Review Checklist
1. **R1: Tenant Food Vacation Booking**:
   - Verify modal opens from Food tab in `febebo-app`.
   - Verify date picker enforces Start <= End and min 1 day.
   - Verify granular meal selection (Full day vs individual checkboxes).
   - Verify vacation record is saved to `food_vacations` with status `active`.
2. **R2: Student In-Pause Experience & Early Resume**:
   - Verify "Food Vacation Active" banner renders with dates and countdown.
   - Verify paused meals disable/lock daily meal actions (Pack, Cancel, eat buttons).
   - Verify QR pass generation (`MEALPASS`) and reverse QR scanner are blocked.
   - Verify "Shorten Return Date" and "Resume Meals Now" functions update Firestore and unlock UI.
   - Verify non-food modules (`Account`, `Complaints`, `Chat`, `RequestBox`) remain 100% untouched.
3. **R3: Kitchen & Headcount Sync**:
   - Verify `febebo-staff` deducts vacationing students from `requested` eating count.
   - Verify `febebo-staff` displays dedicated "On Food Vacation" counter and paused student roster.
   - Verify manual mark-eaten modal excludes vacationing students.
   - Verify `Febebo-admin` updates mess headcount and displays leave status.
   - Verify real-time responsiveness when vacation is shortened or resumed.
4. **Build and Test Verification**:
   - Run `node tests/e2e/test_vacation_suite.mjs` (must pass 100%).
   - Run `npm run build` in `febebo-app`, `febebo-staff`, and `Febebo-admin` (all must exit 0).

Provide a verdict: **APPROVE** or **REQUEST_CHANGES** in `c:\Users\RACHIT\OneDrive\Desktop\Febeboo\.agents\teamwork\reviewer_1\handoff.md`.
