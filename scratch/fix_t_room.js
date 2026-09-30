const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/MeterReading.jsx";
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
  /if \(t\.status === 'Approved' && t\.room\) \{/g,
  `if (t.status === 'Approved' && (t.room || t.roomNo)) {`
);
content = content.replace(
  /const rKey = String\(t\.room\)\.trim\(\)\.toLowerCase\(\);/g,
  `const rKey = String(t.roomNo || t.room).trim().toLowerCase();`
);
fs.writeFileSync(file, content);
console.log("Fixed t.room to t.roomNo || t.room");
