const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/febebo-app/src/screens/Account.jsx";
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /status: 'Pending Verification',/g,
  `status: isMeter ? 'Paid' : 'Pending Verification',`
);

fs.writeFileSync(file, content);
console.log("Account.jsx meter status to Paid");
