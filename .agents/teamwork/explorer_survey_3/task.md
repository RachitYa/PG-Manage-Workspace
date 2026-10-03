# Survey Task Assignment: Firestore Data Schema, Security Rules & Build Toolchains

Focus on shared infrastructure across Febeboo:
1. Read `c:\Users\RACHIT\OneDrive\Desktop\Febeboo\.agents\teamwork\ORIGINAL_REQUEST.md` thoroughly.
2. Investigate Firestore data model & Security Rules:
   - Existing collections (`meals`, `food_cancellations`, `tenants`, `food_attendance`, etc.).
   - `firestore.rules` structure, security model, and current permissions.
   - Recommended schema design for Long-Term Food Vacation (e.g. `food_vacations` collection or subcollection, fields: `tenantId`, `tenantName`, `startDate`, `endDate`, `meals`, `status: "active"|"cancelled"|"shortened"`, `createdAt`, `updatedAt`).
3. Investigate build toolchains and package scripts:
   - Check `package.json` scripts and dependencies across `febebo-app`, `febebo-staff`, `Febebo-admin`.
   - Verify what build commands exist (`npm run build`, etc.) and how they are configured.
4. Output your detailed findings to `c:\Users\RACHIT\OneDrive\Desktop\Febeboo\.agents\teamwork\explorer_survey_3\survey_report.md` and deliver `handoff.md`.
