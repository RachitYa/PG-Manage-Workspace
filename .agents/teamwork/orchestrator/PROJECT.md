# Project: Febeboo Long-Term Food Vacation

## Architecture
- **Distributed Full-Stack Multi-App Architecture**:
  - `febebo-app`: Vite + React 19 student mobile web app. Contains `Food.jsx` screen where students book vacations, view active vacation status, lock meal actions, and perform early resume/shorten operations.
  - `febebo-staff`: Vite + React 19 cook/staff mobile web app. Contains `StaffApp.jsx` which displays live kitchen mess headcounts, meal prep tallies, student rosters, and manual selection.
  - `Febebo-admin`: Vite + React 19 property management portal. Contains `MessHeadcount.jsx`, `ManageTenants.jsx`, `UserProfile.jsx`, and `Reports.jsx`.
  - **Shared Data Layer**: Firebase Firestore (`projectId: "febebo-2026"`).
    - Primary Collection: `food_vacations` (top-level collection).
    - Real-time reactive updates via Firestore `onSnapshot` listeners across all three client applications.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1.1 | Date Range Picker | Custom Start Date to End Date picker (min 1 day, start >= today, start <= end) | M2 | ORIGINAL_REQUEST §R1 |
| F1.2 | Granular Meal Selection | Option for Full Day (all 4 meals) or individual checkboxes (Breakfast, Lunch, Snacks, Dinner) | M2 | ORIGINAL_REQUEST §R1 |
| F1.3 | Vacation Persistence | Save active food pause in `food_vacations` collection and sync to tenant profile | M1, M2 | ORIGINAL_REQUEST §R1 |
| F1.4 | Vacation Booking Modal | Entry point card in "Food Services" grid in `febebo-app/src/screens/Food.jsx` | M2 | ORIGINAL_REQUEST §AC |
| F2.1 | "Food Vacation Active" Banner | Prominent banner at top of Food screen showing dates, countdown, and paused meal chips | M2 | ORIGINAL_REQUEST §R2 |
| F2.2 | Daily Meal Action Locking | Disables "Pack", "Cancel", and meal buttons during active vacation for paused meals | M2 | ORIGINAL_REQUEST §R2 |
| F2.3 | QR Pass & Scanner Protection | Disables/locks `MEALPASS` QR generation and reverse QR scanning for paused meals | M2 | ORIGINAL_REQUEST §R2 |
| F2.4 | Shorten Return Date Control | Modal to select an earlier end date and update the vacation record | M2 | ORIGINAL_REQUEST §R2 |
| F2.5 | Resume Meals Now Control | One-click button with confirmation to cancel vacation and immediately restore meal ordering | M2 | ORIGINAL_REQUEST §R2 |
| F2.6 | Non-Food Module Independence | Rent, Complaints, Chat, Inventory remain 100% unaffected | M2 | ORIGINAL_REQUEST §R2 |
| F3.1 | Cook Headcount Deduction | Students on vacation automatically deducted from "Requested / Eating" count in `febebo-staff` | M3 | ORIGINAL_REQUEST §R3 |
| F3.2 | Cook Dedicated Vacation Card | "On Food Vacation / Leave" stat card showing count of paused students for active meal | M3 | ORIGINAL_REQUEST §R3 |
| F3.3 | Cook Paused Student Roster | Dedicated filtered list showing vacationing students with room, dates, and paused meals | M3 | ORIGINAL_REQUEST §R3 |
| F3.4 | Cook Manual Selection Exclusion | Manual eater modal excludes vacationing students from pending selection | M3 | ORIGINAL_REQUEST §R3 |
| F3.5 | Admin Headcount Deduction | `MessHeadcount.jsx` excludes vacationing students from "Requested" for selected date | M3 | ORIGINAL_REQUEST §R3 |
| F3.6 | Admin Dedicated On-Leave View | Dedicated "On Leave" counter and vacation badge in student attendance list | M3 | ORIGINAL_REQUEST §R3 |
| F3.7 | Real-Time Multi-App Sync | Instant sync (<200ms) across Cook and Admin dashboards when vacation booked/shortened/resumed | M3 | ORIGINAL_REQUEST §R3 |
| F4.1 | febebo-app Build Verification | `npm run build` in `febebo-app` exits with code 0 | M4 | ORIGINAL_REQUEST §AC |
| F4.2 | febebo-staff Build Verification | `npm run build` in `febebo-staff` exits with code 0 | M4 | ORIGINAL_REQUEST §AC |
| F4.3 | Febebo-admin Build Verification | `npm run build` in `Febebo-admin` exits with code 0 | M4 | ORIGINAL_REQUEST §AC |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Data Model & Rules | Schema definition, date utility helpers, Firestore security rules | none | PLANNED |
| M2 | Student App Booking & In-Pause Experience | `febebo-app` Food Vacation modal, banner, locking, early resume/shorten | M1 | PLANNED |
| M3 | Kitchen & Headcount Real-Time Sync | `febebo-staff` & `Febebo-admin` headcount deduction, on-leave cards, real-time sync | M1, M2 | PLANNED |
| M4 | Final Milestone & Build Verification | Full integration testing, multi-app build pass, adversarial & forensic audit | M1, M2, M3 | PLANNED |

## Interface Contracts

### `food_vacations` Document Schema
```typescript
interface FoodVacationDoc {
  id: string;                      // Generated Firestore document ID
  tenantId: string;                // Student UID
  tenantName: string;              // Student Name
  tenantPhone?: string;            // Student Phone
  roomNumber: string;              // Room Number
  bedNumber?: string;              // Bed Number
  adminId: string;                 // PG Owner / Admin UID
  pgId: string;                    // Property ID
  startDate: string;               // YYYY-MM-DD (local)
  endDate: string;                 // YYYY-MM-DD (local)
  originalEndDate?: string;        // YYYY-MM-DD (recorded if shortened)
  dates: string[];                 // Array of all YYYY-MM-DD strings in the interval
  isAllMeals: boolean;             // true if all 4 meals are paused
  meals: string[];                 // ['breakfast', 'lunch', 'snacks', 'dinner'] (lowercase normalized)
  status: 'active' | 'shortened' | 'resumed' | 'cancelled';
  reason?: string;                 // Optional tenant note
  createdAt: string;               // ISO 8601 string
  updatedAt: string;               // ISO 8601 string
  resumedAt?: string | null;       // ISO 8601 string when resumed early
}
```

### Vacation Evaluation Contract (Shared Logic)
```javascript
export function isMealPausedOnDate(vacation, targetDateStr, mealName) {
  if (!vacation || vacation.status !== 'active' && vacation.status !== 'shortened') return false;
  if (targetDateStr < vacation.startDate || targetDateStr > vacation.endDate) return false;
  if (vacation.isAllMeals || !vacation.meals || vacation.meals.length === 0) return true;
  return vacation.meals.map(m => m.toLowerCase()).includes(mealName.toLowerCase());
}
```

## Code Layout
- `febebo-app/src/screens/Food.jsx`: Student food UI, vacation modal, vacation banner, action locking, resume/shorten handlers.
- `febebo-app/src/screens/Food.css`: Vacation modal and card styling.
- `febebo-app/src/utils/vacationUtils.js`: Vacation helper utilities.
- `febebo-staff/src/pages/StaffApp.jsx`: Cook dashboard real-time listener, headcount calculations, on-leave card, filtered roster.
- `febebo-staff/src/utils/vacationUtils.js`: Vacation evaluation helper for Cook app.
- `Febebo-admin/src/pages/MessHeadcount.jsx`: Admin mess headcount real-time listener, headcount calculations, on-leave card, attendance roster.
- `Febebo-admin/src/utils/vacationUtils.js`: Vacation evaluation helper for Admin app.
- `firestore.rules`: Security rules for `food_vacations` collection.
