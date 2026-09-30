const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/UserProfile.jsx";
let content = fs.readFileSync(file, 'utf8');

const lines = content.split('\n');
console.log("Total lines:", lines.length);

// Find ALL lines matching the comment  
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('SUB-VIEW: ROOM DETAILS REDIRECT')) {
    console.log("Found at 0-based index:", i, "=> line", i+1, "content:", lines[i]);
  }
}

// Also log lines around 403-410
for (let i = 400; i < 420; i++) {
  console.log(`Line ${i+1}:`, JSON.stringify(lines[i]));
}
