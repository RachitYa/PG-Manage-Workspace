# Orchestration Plan: Febeboo Long-Term Food Vacation

## Phase 0: Full Scope Survey
- Dispatch Explorer 1: Map `febebo-app` Food tab, meal booking flow, QR generation, meal status management.
- Dispatch Explorer 2: Map `febebo-staff` Cook mess headcount calculations, eating status, real-time listener mechanics, and `Febebo-admin` tenant/mess headcount views.
- Dispatch Explorer 3: Map Firestore schema (`meals`, `food_cancellations`, `tenants`, `attendance`), security rules (`firestore.rules`), and cross-app shared types/services.
- Synthesize survey findings into `PROJECT.md` (Feature Inventory, Architecture, Milestones, Contracts).

## Phase 1: Decomposition & Track Setup
- Milestone 1: Data Model & Firestore Rules (`food_vacations` collection or tenant profile pause records, query indexing, security rules via `firestore-rules-author`).
- Milestone 2: Tenant App Booking & In-Pause Experience (`febebo-app` Food Vacation modal, active pause banner/card, QR/eating action locking, early resume/shorten controls).
- Milestone 3: Cook Dashboard & Admin Synchronization (`febebo-staff` headcount subtraction + on-leave list/badge, `Febebo-admin` mess headcount updates, real-time sync).
- E2E Testing Track: Opaque-box / integration test runner and verification suite across all 3 tiers.

## Phase 2: Iteration Loop Execution (Workers, Reviewers, Challengers, Auditors)
- Per milestone: Explorer -> Worker -> Reviewers (2) -> Challengers (2) -> Auditor -> Gate.
- Require workers to run `npm run build` across all 3 apps (`febebo-app`, `febebo-staff`, `Febebo-admin`).

## Phase 3: Final Verification & Delivery
- 100% E2E tests pass.
- Clean build verification across all apps.
- Report completion to Sentinel.
