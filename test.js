const fs = require('fs');
let content = fs.readFileSync('Febebo-admin/src/pages/VisitorLog.jsx', 'utf8');
const { execSync } = require('child_process');

console.log("Analyzing...");
