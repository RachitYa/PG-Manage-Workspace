const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/MeterReading.jsx";
let content = fs.readFileSync(file, 'utf8');

const oldLogic = `      // Calculate tenant proportions
      let totalTenantDays = 0;
      const tenantProportions = m.tenants.map(t => {
         const joinDate = new Date(t.dateOfJoining || m.prevReadingDate);
         const startDate = joinDate > prevDateObj ? joinDate : prevDateObj;
         const days = Math.max(0, (new Date(m.readingDate) - startDate) / (1000 * 60 * 60 * 24));
         totalTenantDays += days;
         return { name: t.name, days, tenantId: t.tenantId };
      });
      
      let tenantSplits = [];
      if (totalTenantDays > 0) {
         tenantSplits = tenantProportions.map(t => ({
              name: t.name,
              days: t.days,
              tenantId: t.tenantId,
              amount: (t.days / totalTenantDays) * totalBillAmount
           }));
      } else {
         if (m.tenants.length > 0) {
            const split = totalBillAmount / m.tenants.length;
            tenantSplits = m.tenants.map(t => ({ name: t.name, days: 0, tenantId: t.tenantId, amount: split }));
         }
      }`;

const newLogic = `      // Calculate tenant bills based on their personal baseline
      let tenantSplits = [];
      if (m.tenants.length > 0) {
         tenantSplits = m.tenants.map(t => {
            // Fallback to room prevReading if tenant's personal reading is not set or invalid
            const personalBaseline = t.meterReading > 0 ? t.meterReading : m.prevReading;
            const tUnits = Math.max(0, Number(m.currReading) - personalBaseline);
            const tAmount = tUnits * Number(m.ratePerUnit);
            return {
               name: t.name,
               tenantId: t.tenantId,
               amount: tAmount,
               units: tUnits
            };
         });
      }`;

content = content.replace(oldLogic, newLogic);
// Also fix the loops setting meter_bills
content = content.replace(/consumedUnits: units,/g, `consumedUnits: split.units !== undefined ? split.units : units,`);

fs.writeFileSync(file, content);
console.log("Updated handleGenerateSingleBill");
