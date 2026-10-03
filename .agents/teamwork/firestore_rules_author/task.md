# Firestore Rules Task Assignment

## Goal
Design and author production-grade Cloud Firestore Security Rules in `c:\Users\RACHIT\OneDrive\Desktop\Febeboo\firestore.rules`.

## Context & Inputs
- Read `c:\Users\RACHIT\OneDrive\Desktop\Febeboo\.agents\teamwork\ORIGINAL_REQUEST.md`
- Read `c:\Users\RACHIT\OneDrive\Desktop\Febeboo\.agents\teamwork\PROJECT.md`
- Check existing Firestore collections used across `febebo-app`, `febebo-staff`, and `Febebo-admin`:
  - `users/{uid}`
  - `tenants/{tenantId}`
  - `pg_owners/{pgId}`
  - `mess_headcount/{headcountId}`
  - `food_vacations/{vacationId}` (NEW)
  - `complaints/{complaintId}`
  - `payments/{paymentId}`

## Requirements for `food_vacations` Rules
1. **Read**:
   - Authenticated student can read their own vacation documents (`resource.data.tenantId == request.auth.uid`).
   - PG Admins and staff can read vacations belonging to their PG / admin account (`resource.data.adminId == request.auth.uid` or via staff ownership context).
2. **Create**:
   - `request.auth != null`
   - `request.resource.data.tenantId == request.auth.uid`
   - Valid schema: `startDate` is string, `endDate` is string, `status == 'active'`, `meals` is list, `adminId` is string, `pgId` is string.
3. **Update**:
   - Tenant can update their own vacation:
     - To shorten: `request.resource.data.endDate <= resource.data.endDate`
     - To resume/cancel: `request.resource.data.status in ['shortened', 'resumed', 'cancelled']`
   - Admin can update vacations for their property.
4. **Delete**:
   - Restricted to tenant owner or property admin.

## Deliverables
- Author/write `c:\Users\RACHIT\OneDrive\Desktop\Febeboo\firestore.rules`.
- Ensure clean syntax and structure.
- Write report and deliver `handoff.md` in `c:\Users\RACHIT\OneDrive\Desktop\Febeboo\.agents\teamwork\firestore_rules_author\handoff.md`.
