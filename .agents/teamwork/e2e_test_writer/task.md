# E2E Testing Track: Febeboo Food Vacation Test Suite

## Goal
Design and implement an automated opaque-box E2E test verification suite for the Febeboo Long-Term Food Vacation feature based strictly on `c:\Users\RACHIT\OneDrive\Desktop\Febeboo\.agents\teamwork\ORIGINAL_REQUEST.md` and `c:\Users\RACHIT\OneDrive\Desktop\Febeboo\.agents\teamwork\PROJECT.md`.

## Methodology (4 Tiers)
1. **Tier 1 - Feature Coverage (>=5 tests per feature)**:
   - F1: Vacation booking with date range (start <= end, min 1 day).
   - F2: Full-day vs granular meal selection (Breakfast, Lunch, Snacks, Dinner).
   - F3: Active vacation card display and paused meals list.
   - F4: Daily meal actions (Pack, Cancel, QR Pass, QR scan) blocked/locked for paused meals.
   - F5: Early resume ("Resume Meals Now") immediate restoration.
   - F6: Shorten return date adjustment.
   - F7: Cook headcount exclusion of vacationing students.
   - F8: Cook dedicated "On Food Vacation" counter and roster.
   - F9: Admin headcount exclusion and leave status.
   - F10: Non-food module independence.
2. **Tier 2 - Boundary & Corner Cases (>=5 tests per feature)**:
   - Same-day single-day vacation (`startDate === endDate === today`).
   - Cross-month vacation (e.g., Oct 28 to Nov 5).
   - Leap year / month boundary handling.
   - Only 1 specific meal paused (e.g. only Dinner or only Lunch + Snacks).
   - Resuming on the exact first day of vacation.
   - Shortening to today's date vs past date rejection.
   - Invalid range rejection (Start > End or past dates).
3. **Tier 3 - Cross-Feature Combinations (Pairwise)**:
   - Vacation + Daily cancellation on non-paused meals.
   - Shorten vacation followed by immediate resume.
   - Multiple students on overlapping vacations with different meal subsets.
   - Real-time sync event handling across simulated Cook and Admin listeners.
4. **Tier 4 - Real-World Application Scenarios**:
   - Scenario A: Student leaves for Diwali / 10-day holiday, returns 3 days early, resumes meals.
   - Scenario B: Student only skips Dinner for 5 days due to fasting/classes; breakfast, lunch, snacks remain active and counted.
   - Scenario C: Cook prepares lunch with 20 tenants: 3 on full vacation, 2 on lunch-only vacation -> exactly 15 lunch portions counted.

## Deliverables
- Executable test script (e.g. Node.js runner `test-e2e-vacation.js` or suite in `tests/e2e/`) that tests all logic invariants programmatically.
- Run the test suite and verify test runner execution.
- Create `TEST_INFRA.md` and `TEST_READY.md` in `c:\Users\RACHIT\OneDrive\Desktop\Febeboo\.agents\teamwork\` summarizing coverage and execution command.
- Deliver `handoff.md`.
