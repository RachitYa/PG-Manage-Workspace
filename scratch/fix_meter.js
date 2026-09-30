const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/MeterReading.jsx";
let content = fs.readFileSync(file, 'utf8');

// 1. Update fetchData push
content = content.replace(
  /tenantsByRoom\[rKey\]\.push\(\{ name: t\.name, dateOfJoining: t\.dateOfJoining \}\);/g,
  `tenantsByRoom[rKey].push({ name: t.name, dateOfJoining: t.dateOfJoining, tenantId: d.id });`
);

// 2. Add notifications collection import if not present
if (!content.includes("'notifications'")) {
  // It's probably using addDoc(collection(db, 'meter_bills'... so we can just use the same pattern.
}

// 3. Update single bill generation
content = content.replace(
  /await addDoc\(collection\(db, 'meter_bills'\), \{\s*adminId: user\.uid,[\s\S]*?tenantSplits\s*\}\);/g,
  `// Create individual bills for each tenant
      for (const split of tenantSplits) {
        if (!split.tenantId) continue;
        const tenantAmt = split.amount || 0;
        await addDoc(collection(db, 'meter_bills'), {
          adminId: user.uid,
          tenantId: split.tenantId,
          meterId: m.id,
          roomName: m.roomName,
          prevReading: m.prevReading,
          currReading: Number(m.currReading),
          consumedUnits: units,
          totalAmount: tenantAmt,
          ratePerUnit: Number(m.ratePerUnit),
          fixedCharge: fixedCharge,
          date: readingDateIso,
          status: 'Unpaid',
          billMonth: new Date(m.readingDate).toLocaleString('default', { month: 'long', year: 'numeric' })
        });
        
        // Send notification
        await addDoc(collection(db, 'notifications'), {
          adminId: user.uid,
          userId: split.tenantId,
          title: 'New Meter Bill',
          message: \`Your electricity meter bill for \${new Date(m.readingDate).toLocaleString('default', { month: 'long' })} is ₹\${tenantAmt.toFixed(2)}. Please pay it from the payments section.\`,
          createdAt: new Date().toISOString(),
          isRead: false,
          type: 'meter_bill'
        });
      }`
);

// 4. Also fix tenantSplits creation to include tenantId
content = content.replace(
  /return \{ name: t\.name, days \};/g,
  `return { name: t.name, days, tenantId: t.tenantId };`
);
content = content.replace(
  /tenantSplits = tenantProportions\.map\(t => \(\{\s*name: t\.name,\s*days: t\.days,\s*amount: \(t\.days \/ totalTenantDays\) \* totalBillAmount\s*\}\)\);/g,
  `tenantSplits = tenantProportions.map(t => ({
              name: t.name,
              days: t.days,
              tenantId: t.tenantId,
              amount: (t.days / totalTenantDays) * totalBillAmount
           }));`
);
content = content.replace(
  /tenantSplits = m\.tenants\.map\(t => \(\{\ name: t\.name, days: 0, amount: split \}\)\);/g,
  `tenantSplits = m.tenants.map(t => ({ name: t.name, days: 0, tenantId: t.tenantId, amount: split }));`
);

// 5. Update Add New Meter Label
content = content.replace(
  /Initial Meter Reading/g,
  `Today's Meter Reading`
);


fs.writeFileSync(file, content);
console.log("MeterReading updated.");
