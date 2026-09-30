const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/febebo-app/src/screens/StudentDashboard.css";
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "overflow-y: visible;",
  "overflow-y: visible;\n  scroll-snap-type: x mandatory;"
);

content = content.replace(
  "border: 1px solid rgba(22, 101, 52, 0.06);",
  "border: 1px solid rgba(22, 101, 52, 0.06);\n  scroll-snap-align: center;"
);

fs.writeFileSync(file, content);
