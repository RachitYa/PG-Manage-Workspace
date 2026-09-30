const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/MeterReading.jsx";
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /await updateDoc\(doc\(db, 'meters', m\.id\), \{/g,
  `for (const split of tenantSplits) {
        if (!split.tenantId) continue;
        await updateDoc(doc(db, 'tenants', split.tenantId), {
          meterReading: Number(m.currReading)
        });
      }
      await updateDoc(doc(db, 'meters', m.id), {`
);

fs.writeFileSync(file, content);
console.log("Updated tenant baselines");
