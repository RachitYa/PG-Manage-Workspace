const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/UserProfile.jsx";
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
  /bills\.sort\(\(a,b\) => new Date\(b\.billDate\) - new Date\(a\.billDate\)\);/g,
  `bills.sort((a,b) => new Date(b.date || b.billDate || 0) - new Date(a.date || a.billDate || 0));`
);
fs.writeFileSync(file, content);
console.log("Fixed sorting date");
