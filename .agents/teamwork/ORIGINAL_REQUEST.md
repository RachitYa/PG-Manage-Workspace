# Original User Request

## 2026-10-02T07:25:47Z

Implement a comprehensive Long-Term Meal Cancellation / Food Vacation feature for tenants in Febeboo, allowing students to pause specific meals or all meals across a custom date range (e.g. 10 days) without recurring daily manual cancellations, locking daily meal actions during the pause with active options to shorten the duration or resume immediately, and automatically synchronizing headcounts across the Cook and Admin apps.

Working directory: c:\Users\RACHIT\OneDrive\Desktop\Febeboo
Integrity mode: development

## Requirements

### R1. Tenant Long-Term Food Pause / Vacation Booking
- Tenants can schedule meal leave across a custom calendar date range (Start Date to End Date).
- Granular selection allows pausing either:
  1. Full Day (all meals: Breakfast, Lunch, Snacks, Dinner), or
  2. Specific individual meals across the range (e.g., just Dinner or Lunch + Dinner).
- Submitting the leave records the active food pause in the tenant's profile / Firestore with status `active`.

### R2. Student App In-Pause Experience & Early Resume Controls
- When an active meal pause is in effect for the current day:
  - Daily eating actions and QR meal generation for the paused meals are disabled/locked.
  - A prominent "Food Vacation Active" card displays the active period (dates and paused meals).
  - The student can edit the pause period:
    - **Shorten Return Date**: Change the end date to an earlier date.
    - **Resume Meals Now**: One-click action to cancel the remaining leave and immediately restore normal meal ordering.
  - All non-food app modules (Rent, Maintenance Complaints, Inventory, Chat) remain fully active and unaffected.

### R3. Kitchen & Headcount Automatic Synchronization
- In the Cook / Staff app (`febebo-staff`) and Admin app (`Febebo-admin`):
  - Any tenant on an active food pause for a given date is automatically excluded from the "Eating / Requested" headcount for the paused meals.
  - The Cook headcount view displays a dedicated "On Food Vacation / Leave" counter and list of students on pause.
  - When a tenant shortens or resumes meals early, the change updates in real time in both the Cook and Admin dashboards.

## Acceptance Criteria

### Tenant Food Vacation Configuration
- [ ] Student can open a "Food Vacation / Long-Term Leave" modal from the Food tab in `febebo-app`.
- [ ] Date picker enforces valid ranges (Start Date <= End Date, minimum 1 day).
- [ ] Meal selector allows choosing all 4 meals or individual checkboxes for Breakfast, Lunch, Snacks, and Dinner.
- [ ] Successfully submitting saves the vacation window and updates the Food screen state.

### Active Vacation Controls & Safety
- [ ] For dates within an active pause, the Food tab displays an active status banner showing "Meals Paused until [End Date]" and the paused meal types.
- [ ] Paused meals cannot generate QR codes or trigger "Eat Meal" requests.
- [ ] "Shorten Period" button allows picking an earlier end date and successfully updates the record.
- [ ] "Resume Food" button prompts confirmation and immediately restores normal food functionality.
- [ ] Non-food sections (Complaints, Rent, Chat, Inventory) continue to work normally without interference.

### Multi-App Headcount Real-Time Sync
- [ ] In `febebo-staff` (Cook dashboard), headcount counters for breakfast, lunch, snacks, and dinner automatically account for students on vacation for that day.
- [ ] Cook dashboard headcount displays a badge/counter for students currently on leave.
- [ ] In `Febebo-admin` (Mess Headcount & Manage Tenants), food attendance logs accurately reflect the student's leave status.
- [ ] Early resume action in `febebo-app` updates the Cook headcount in real-time without requiring a page reload.

### Build Verification
- [ ] `febebo-app`, `febebo-staff`, and `Febebo-admin` all compile cleanly (`npm run build` exits with code 0).
