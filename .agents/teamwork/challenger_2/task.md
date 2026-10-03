# Challenger 2 Task Assignment: Kitchen Headcount & Sync Adversarial Verification

## Mission
As Challenger 2, adversarially stress-test the kitchen mess headcount math and real-time synchronization invariants between `febebo-app`, `febebo-staff`, and `Febebo-admin`.

## Key Inputs
- `c:\Users\RACHIT\OneDrive\Desktop\Febeboo\.agents\teamwork\ORIGINAL_REQUEST.md`
- `c:\Users\RACHIT\OneDrive\Desktop\Febeboo\.agents\teamwork\PROJECT.md`
- `febebo-staff/src/pages/StaffApp.jsx`
- `Febebo-admin/src/pages/MessHeadcount.jsx`
- `febebo-staff/src/utils/vacationUtils.js`

## Verification Areas
1. Headcount Math Invariant:
   $$\text{Total Tenants} = \text{Requested (Active Eaters)} + \text{On Vacation} + \text{Not Eating (Cancellations)} + \text{Eaten}$$
   Verify that no student is double-counted as both "Requested" and "On Vacation".
2. Granular Meal Headcount Differential:
   Verify that a student on vacation for only Dinner is excluded from Dinner headcount but remains in Breakfast, Lunch, and Snacks headcounts.
3. Multi-Student Scenarios:
   Simulate a hostel with 50 tenants, 10 on various vacations (full-day, dinner-only, lunch-only), verify all four meal headcounts compute with 100% precision.
4. Execute empirical verification and confirm builds pass.

Provide a verdict: **APPROVE** or **REQUEST_CHANGES** in `c:\Users\RACHIT\OneDrive\Desktop\Febeboo\.agents\teamwork\challenger_2\handoff.md`.
