# BRIEFING — 2026-10-02T07:35:30Z

## Mission
Investigate `febebo-staff` and `Febebo-admin` to discover how mess headcounts, student lists, meal status tracking, and real-time listeners operate, and determine how to integrate food vacation deductions, counters, and real-time synchronization.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigator, synthesis
- Working directory: c:\Users\RACHIT\OneDrive\Desktop\Febeboo\.agents\teamwork\explorer_survey_2
- Original parent: 5f789ae3-639b-4567-89bb-4d2bf8ecaeb0
- Milestone: Food Vacation Feature Survey (Staff & Admin)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Inspect `febebo-staff` (Cook dashboard) and `Febebo-admin` (Admin dashboard)
- Provide exhaustive evidence chain: file paths, lines, logic, formulas, queries
- Output survey report to `survey_report.md` and handoff to `handoff.md`

## Current Parent
- Conversation ID: 5f789ae3-639b-4567-89bb-4d2bf8ecaeb0
- Updated: not yet

## Investigation State
- **Explored paths**:
  - `febebo-staff/src/pages/StaffApp.jsx`: Cook dashboard, Live Headcount card, QR counter pass, manual selection, `computeStudents`, `markMealEaten`.
  - `Febebo-admin/src/pages/MessHeadcount.jsx`: Admin live mess counter, meal tabs, student roster, date picker, meal toggling.
  - `Febebo-admin/src/pages/ManageTenants.jsx`: Tenant card badges and status filtering.
  - `Febebo-admin/src/pages/UserProfile.jsx`: `Cook — Food History` tab.
  - `Febebo-admin/src/pages/Reports.jsx`: `FoodTab` and `mess_headcount` aggregation.
  - `febebo-app/src/screens/Food.jsx`: Cross-app student food actions and synchronization.
- **Key findings**:
  - In both apps, every active tenant defaults to status `'requested'` (eating) unless marked eaten or cancelled for that single meal.
  - An `onSnapshot` listener on `food_vacations` collection instantly updates student status to `'onVacation'`, deducting them from `statsObj.requested` and `statsCount.requested`.
  - Dedicated "On Food Vacation / Leave" stat cards and student list views designed for both dashboards.
  - Shortening or early resuming in `febebo-app` updates the Cook and Admin views in ~100ms without page reloads.
  - `febebo-staff`, `Febebo-admin`, and `febebo-app` all compile with exit code 0 (`npm run build`).
- **Unexplored areas**: None within assigned scope. Full survey complete.

## Key Decisions Made
- Use `collection(db, 'food_vacations')` query with `onSnapshot` plus fallback to tenant `foodVacation` field for maximum robustness.
- Assign dedicated status `'onVacation'` so vacationing students are excluded from `requested` count and from manual meal selection.
- Produce comprehensive findings in `survey_report.md` and structured 5-section handoff in `handoff.md`.

## Artifact Index
- DISPATCH.md — record of initial dispatch message
- task.md — task assignment
- BRIEFING.md — persistent working memory
- progress.md — liveness heartbeat
- survey_report.md — detailed findings and implementation blueprint
- handoff.md — structured handoff report
