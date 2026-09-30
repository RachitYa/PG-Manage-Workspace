const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/MeterReading.jsx";
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /tenantsByRoom\[rKey\]\.push\(\{ name: t\.name, dateOfJoining: t\.dateOfJoining, tenantId: d\.id \}\);/g,
  `tenantsByRoom[rKey].push({ name: t.name, dateOfJoining: t.dateOfJoining, tenantId: d.id, meterReading: Number(t.meterReading) || Number(t.meterReadingAtJoin) || 0 });`
);

fs.writeFileSync(file, content);
console.log("Added meterReading to tenantsByRoom");
