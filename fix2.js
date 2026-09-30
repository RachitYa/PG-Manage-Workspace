const fs = require('fs');
const file = '/Users/shreyassingh/Downloads/PG MANAGE @/febebo-staff/src/pages/StaffApp.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /\$\{getTodayStr2\(\)\}/g,
  "${new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0')}"
);

fs.writeFileSync(file, content, 'utf8');
