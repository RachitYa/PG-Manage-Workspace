const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/febebo-app/src/screens/StudentDashboard.jsx";
let content = fs.readFileSync(file, 'utf8');

const regex = /\/\* All PGs — Vertical List \*\/(.*?)\s*<\/section>\s*\)/s;
content = content.replace(regex, "");

fs.writeFileSync(file, content);
