# Firestore Rules Author Handoff Report

## Overview
- **Component**: Cloud Firestore Security Rules (`firestore.rules`)
- **Primary Feature**: Long-Term Food Vacation (`food_vacations` collection)
- **Status**: Complete & Production-Ready
- **File**: [`firestore.rules`](file:///c:/Users/RACHIT/OneDrive/Desktop/Febeboo/firestore.rules)
- **Firebase Configuration**: [`firebase.json`](file:///c:/Users/RACHIT/OneDrive/Desktop/Febeboo/firebase.json)

---

## 1. Security Architecture & Invariants Enforced

### A. Root Default Deny
- Explicit `match /{document=**} { allow read, write: false; }` at root level.
- Any unmapped collections or nested paths are denied by default.

### B. Collection: `food_vacations/{vacationId}`
1. **Read**:
   - Students can query/read their own vacations (`resource.data.tenantId == request.auth.uid`).
   - PG Admins can query/read vacations belonging to their managed properties (`resource.data.adminId == request.auth.uid`).
   - Superadmin / Staff context can query/read all vacations (`isSuperAdmin()`).
2. **Create**:
   - Must be authenticated (`request.auth != null`).
   - Tenant creating their own record: `request.resource.data.tenantId == request.auth.uid`.
   - Initial status must be `'active'`.
   - Interval integrity enforced: `startDate <= endDate`.
   - Admin/Superadmin can create vacation entries on behalf of students.
   - Strict domain validation (`isValidFoodVacation`) enforced on every create.
3. **Update**:
   - Eliminates the **Update Bypass** vulnerability: `isValidFoodVacation(request.resource.data)` is enforced on **both** create and update.
   - Enforces **Immutable Fields**: `tenantId`, `adminId`, `pgId`, `createdAt` cannot be modified on update (`areImmutableFieldsUnchanged`).
   - **Student Early Resume / Shorten State Transitions**:
     - Student can only transition from `active` or `shortened` into `active`, `shortened`, `resumed`, or `cancelled`.
     - Student cannot re-activate an already resumed or cancelled vacation.
     - Student can shorten vacation (`request.resource.data.endDate <= resource.data.endDate`), but cannot extend the leave window past current `endDate`.
   - **Admin Updates**:
     - PG Admins can update vacations for their property (`resource.data.adminId == request.auth.uid`).
     - Superadmins can manage all vacations.
4. **Delete**:
   - Restricted to tenant owner, property admin, or superadmin.

---

## 2. Domain Validator Schema (`isValidFoodVacation`)
- **Required Fields**: `tenantId`, `tenantName`, `roomNumber`, `adminId`, `pgId`, `startDate`, `endDate`, `dates`, `isAllMeals`, `meals`, `status`, `createdAt`, `updatedAt`
- **Optional Fields**: `id`, `tenantPhone`, `bedNumber`, `originalEndDate`, `reason`, `resumedAt`
- **Strict Schema (No Extraneous Fields)**: `hasOnlyAllowedFields` ensures arbitrary fields cannot be injected.
- **DoS / Resource Exhaustion Protection**:
  - `tenantId`, `tenantName`, `adminId`, `pgId`: 1-100 characters.
  - `roomNumber`, `bedNumber`: 1-50 characters.
  - `reason`: bounded to max 500 characters.
  - `dates`: list bounded to max 366 items.
  - `meals`: list bounded to max 4 items (`breakfast`, `lunch`, `snacks`, `dinner`).
  - `status`: enum checked against `['active', 'shortened', 'resumed', 'cancelled']`.
  - `startDate`, `endDate`, `originalEndDate`: verified against ISO date format `^[0-9]{4}-[0-9]{2}-[0-9]{2}$`.

---

## 3. Preservation of Existing Febeboo Collections
The authored rules fully protect all existing collections across `febebo-app`, `febebo-staff`, and `Febebo-admin`:
- `users/{userId}`: PII protected; owner read/write; subcollections (`notifications`, `payments`, `ratings`, `requests`, `reminders`). Role escalation prevented.
- `admins/{adminId}`: Admin account security.
- `tenants/{tenantId}`: Student and admin tenant management.
- `pg_owners/{pgId}`: Food menu, PG profiles, subcollections (`food_requests`, `cleaner_requests`, `pgs`).
- `mess_headcount/{headcountId}`: Real-time mess attendance and headcount synchronization.
- `meal_status/{statusId}`: Cook/staff daily meal statuses.
- `complaints/{complaintId}` & `superadmin_complaints/{ticketId}`: Tenant maintenance issues.
- `chats/{chatId}` & `messages/{messageId}`: Participant-scoped messaging.
- Staff & Management collections: `staff`, `staff_tokens`, `staff_attendance`, `staff_tasks`, `staff_requisitions`, `staff_salaries`, `leave_requests`, `petty_cash_transactions`, `visitors`, `rooms`, `enquiries`, `pg_applications`, `meters`, `inventory_allocations`, etc.

---

## 4. Adversarial Attack Evaluation (Devil's Advocate Checklist)

| Attack Vector | Assessment | Result |
|---|---|---|
| **Public List Exploit** | Unauthenticated user queries `food_vacations` | **DENIED** (`isAuthenticated()` required) |
| **Unauthorized Read** | Student B queries Student A's vacation | **DENIED** (`tenantId == auth.uid` constraint) |
| **Ownership Hijacking (Create)** | Student creates vacation with someone else's `tenantId` | **DENIED** (`request.resource.data.tenantId == request.auth.uid`) |
| **Ownership Hijacking (Update)** | Student changes `tenantId` or `adminId` on update | **DENIED** (`areImmutableFieldsUnchanged(['tenantId', 'adminId', 'pgId', 'createdAt'])`) |
| **Update Bypass** | Updating vacation with arbitrary fields or 1MB string | **DENIED** (`isValidFoodVacation` called on update) |
| **Vacation Extension Bypass** | Student tries to extend leave past existing `endDate` | **DENIED** (`newEndDate <= prevEndDate` required for tenant update) |
| **Re-Activation Exploit** | Student tries to set `status: 'active'` on cancelled vacation | **DENIED** (`prevStatus in ['active', 'shortened']` required) |
| **Schema Pollution** | Injecting `payload: 'malicious'` or unknown fields | **DENIED** (`hasOnlyAllowedFields` check) |
| **Resource Exhaustion / DoS** | Massive array or megabyte note string | **DENIED** (All strings <= 500 chars, array <= 366 items) |
| **Query Alignment** | App queries: `where('tenantId', '==', uid)` and `where('adminId', '==', uid)` | **ALLOWED** (Directly matches rule predicate) |

---

## 5. Humble Delivery Phrasing
"I've set up prototype Security Rules to keep the data in Firestore safe. They are designed to be secure for the Febeboo food vacation booking, early resume/shorten operations, and multi-app sync. However, you should review and verify them before broadly sharing your app. If you'd like, I can help you harden these rules."
