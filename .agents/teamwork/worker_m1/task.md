# Milestone 1 Task Assignment: Shared Vacation Utilities

## Goal
Implement shared vacation helper utilities across `febebo-app`, `febebo-staff`, and `Febebo-admin` according to `c:\Users\RACHIT\OneDrive\Desktop\Febeboo\.agents\teamwork\PROJECT.md`.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Target Files (Write Ownership)
- `febebo-app/src/utils/vacationUtils.js`
- `febebo-staff/src/utils/vacationUtils.js`
- `Febebo-admin/src/utils/vacationUtils.js`

## Required Functionality
1. `formatDateStr(date)`:
   Returns local `YYYY-MM-DD` string using `getFullYear()`, `getMonth() + 1`, and `getDate()`.
2. `getTodayStr()`:
   Returns today's date in local `YYYY-MM-DD`.
3. `generateDateRange(startDateStr, endDateStr)`:
   Returns array of all date strings `[startDateStr, ..., endDateStr]` inclusive.
4. `validateVacationRange(startDateStr, endDateStr)`:
   Validates:
   - `startDateStr` must be >= today (`getTodayStr()`).
   - `endDateStr` must be >= `startDateStr`.
   Returns `{ valid: boolean, error?: string }`.
5. `isMealPausedOnDate(vacation, targetDateStr, mealName)`:
   - Checks if `vacation` status is `'active'` or `'shortened'`.
   - Checks if `targetDateStr >= vacation.startDate` and `targetDateStr <= vacation.endDate`.
   - Checks if `vacation.isAllMeals || !vacation.meals || vacation.meals.length === 0`.
   - Or if `vacation.meals.map(m => m.toLowerCase()).includes(mealName.toLowerCase())`.
   - Returns boolean.
6. `isStudentOnVacation(vacationsList, studentId, targetDateStr, mealName)`:
   - Finds any active/shortened vacation in `vacationsList` for `tenantId === studentId` or `id === studentId`.
   - Returns result of `isMealPausedOnDate`.
7. `buildVacationDoc(...)`:
   - Builds complete schema object per `PROJECT.md § Interface Contracts`.

## Build Verification
- Run `npm run build` in `febebo-app`, `febebo-staff`, and `Febebo-admin` and ensure all pass with exit code 0.
- Deliver `handoff.md` with build logs and verification evidence.
