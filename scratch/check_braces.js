const fs = require('fs');
const content = fs.readFileSync('/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/MeterReading.jsx', 'utf8');

let count = 0;
for (let i = 0; i < content.length; i++) {
  if (content[i] === '{') count++;
  else if (content[i] === '}') count--;
}
console.log("Brace balance:", count);

let count2 = 0;
for (let i = 0; i < content.length; i++) {
  if (content[i] === '<') count2++;
  else if (content[i] === '>') count2--;
}
console.log("Tag balance:", count2);
