# Febeboo Food Vacation: Automated E2E Test Infrastructure

## Overview
This document specifies the architecture, execution model, simulation harnesses, and test coverage tiers of the automated opaque-box End-to-End (E2E) verification suite for the **Febeboo Long-Term Food Vacation / Meal Pause** feature.

The test suite is located at:
`tests/e2e/test_vacation_suite.mjs`

It is executed directly with Node.js ESM:
```bash
node tests/e2e/test_vacation_suite.mjs
```

---

## 1. Architectural Design & Philosophy

### 1.1 Opaque-Box E2E Testing
The verification suite is designed as an **opaque-box end-to-end harness**. It validates the external contracts, behavioral invariants, reactive synchronization, and data lifecycle of the Febeboo Food Vacation feature without mutating or coupling to private component implementations.

All expectations are strictly derived from authoritative specifications:
- `c:\Users\RACHIT\OneDrive\Desktop\Febeboo\.agents\teamwork\ORIGINAL_REQUEST.md`
- `c:\Users\RACHIT\OneDrive\Desktop\Febeboo\.agents\teamwork\PROJECT.md`

### 1.2 Zero External Test Dependencies
The test suite utilizes native Node.js 24 ESM features and `node:assert/strict`. It does not require Jest, Mocha, Playwright, or external test runners, guaranteeing:
- Instant execution (< 300 ms across 121 comprehensive test assertions).
- Zero flakiness from headless browser rendering or timing races.
- 100% deterministic test outcomes across Windows, Linux, and CI/CD runners.

---

## 2. High-Fidelity Simulation Engines

The suite includes five simulation engines modeling the full distributed architecture across `febebo-app`, `febebo-staff`, and `Febebo-admin`:

### 2.1 `InMemoryVacationStore` (Central Firestore Simulation)
- Implements the top-level `food_vacations` collection schema.
- Emulates Firestore `onSnapshot` multi-client pub/sub subscriptions.
- Manages atomic vacation lifecycle transitions: `active` ➔ `shortened` ➔ `resumed` / `cancelled`.
- Enforces interface contracts defined in `PROJECT.md § Interface Contracts`.

### 2.2 `StudentFoodScreenSimulation` (`febebo-app`)
- Simulates the resident student experience in `Food.jsx`.
- Validates date range constraints (start >= today, end >= start, min 1 day).
- Renders the active vacation card banner with countdown and paused meal chips.
- Blocks and locks daily actions ("Pack", "Cancel", "Eat Meal") during active pauses.
- Blocks `MEALPASS` QR code generation and Reverse QR Scanner for paused meals.
- Handles one-click "Resume Meals Now" and "Shorten Return Date" modal workflows.

### 2.3 `StaffAppCookSimulation` (`febebo-staff`)
- Simulates the Cook kitchen dashboard in `StaffApp.jsx`.
- Calculates real-time meal headcounts across work dates (`Breakfast`, `Lunch`, `Snacks`, `Dinner`).
- Automatically excludes students on active food vacation from the `requested` eater tally.
- Maintains the dedicated **"On Food Vacation / Leave"** counter.
- Generates the filtered vacation roster (showing room number, tenant name, dates, paused meals).
- Excludes vacationing students from the Cook manual eater selection modal.
- Computes exact prep portions: `Total Portions to Cook = Requested + Pack`.

### 2.4 `AdminMessHeadcountSimulation` (`Febebo-admin`)
- Simulates the property management portal in `MessHeadcount.jsx`.
- Calculates aggregate mess headcounts for any historical, current, or future `selectedDate`.
- Excludes vacationing students from "Requested" counts.
- Displays the dedicated "On Leave" counter and student attendance status badges.
- Prevents invalid admin attendance logging for paused meals.

### 2.5 `NonFoodModuleSimulation` (Isolation Verification)
- Validates that non-food modules (`Account` / payments, `Complaints`, `Chat`, `RequestBox` / inventory) are completely decoupled from food vacation states.

---

## 3. The 4-Tier Test Matrix

The suite exercises 121 programmatic assertions organized into 4 distinct verification tiers:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        E2E TEST VERIFICATION SUITE                     │
├────────────────────────────────────────────────────────────────────────┤
│  Tier 1: Feature Coverage (51 Tests)                                   │
│  - F1: Vacation Booking Range & Schema (6 tests)                       │
│  - F2: Full-Day vs Granular Meal Selection (5 tests)                   │
│  - F3: Active Vacation Banner & Display (5 tests)                      │
│  - F4: Daily Action & QR Locking (5 tests)                             │
│  - F5: Early Resume ("Resume Meals Now") (5 tests)                     │
│  - F6: Shorten Return Date Adjustment (5 tests)                        │
│  - F7: Cook Headcount Exclusion (5 tests)                              │
│  - F8: Cook Dedicated Vacation Counter & Roster (5 tests)              │
│  - F9: Admin Headcount Exclusion & Leave Status (5 tests)              │
│  - F10: Non-Food Module Independence (5 tests)                         │
├────────────────────────────────────────────────────────────────────────┤
│  Tier 2: Boundary & Corner Cases (35 Tests)                           │
│  - B1: Same-Day Single-Day Vacation (5 tests)                          │
│  - B2: Cross-Month Boundary Traversals (5 tests)                       │
│  - B3: Leap Year & New Year Rollovers (5 tests)                        │
│  - B4: Granular Single/Dual Meal Isolation (5 tests)                   │
│  - B5: Early Resume on Boundary Dates (5 tests)                        │
│  - B6: Shorten Boundary Dates & Past Date Rejections (5 tests)         │
│  - B7: Invalid Range Rejections & Malformed Inputs (5 tests)           │
├────────────────────────────────────────────────────────────────────────┤
│  Tier 3: Cross-Feature Combinations (20 Tests)                         │
│  - C1: Vacation + Daily Cancellations on Non-Paused Meals (5 tests)    │
│  - C2: Shorten Vacation Followed by Immediate Resume (5 tests)         │
│  - C3: Multiple Overlapping Student Vacations (5 tests)                │
│  - C4: Real-Time Sync Event Handling Across Reactive Listeners (5 tests)│
├────────────────────────────────────────────────────────────────────────┤
│  Tier 4: Real-World Application Scenarios (15 Tests)                   │
│  - Scenario A: 10-Day Diwali Holiday with 3-Day Early Return (5 tests)  │
│  - Scenario B: 5-Day Selective Dinner Fast (5 tests)                   │
│  - Scenario C: Cook Prepares Lunch for 20 Tenants (5 tests)            │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Cross-Application Utility Parity

The runner imports and validates `vacationUtils.js` from all three workspaces:
1. `febebo-app/src/utils/vacationUtils.js`
2. `febebo-staff/src/utils/vacationUtils.js`
3. `Febebo-admin/src/utils/vacationUtils.js`

It confirms:
- Identical function signatures and implementations across client apps.
- Identical date formatting (`formatDateStr`, `getTodayStr`) and range generation (`generateDateRange`).
- Consistent validation rules (`validateVacationRange`).
- Identical pause determination logic (`isMealPausedOnDate`, `isStudentOnVacation`, `getStudentActiveVacation`).
- Strict schema compliance (`buildVacationDoc`).

---

## 5. Execution & CI Integration

### Command Line Execution
```powershell
node tests/e2e/test_vacation_suite.mjs
```

### Exit Codes
- `0`: All assertions passed cleanly.
- `1`: One or more assertions failed (summary and stack traces output to stderr).
