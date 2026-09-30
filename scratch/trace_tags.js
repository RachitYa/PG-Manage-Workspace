const fs = require('fs');
const content = fs.readFileSync('/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/components/DetailedReceiptModal.jsx', 'utf8');

const openingTags = (content.match(/<[a-zA-Z]+/g) || []).map(t => t.substring(1));
const closingTags = (content.match(/<\/[a-zA-Z]+/g) || []).map(t => t.substring(2));
const selfClosingTags = (content.match(/<[a-zA-Z]+[^>]*\/>/g) || []).map(t => {
  const match = t.match(/<([a-zA-Z]+)/);
  return match ? match[1] : null;
});

let openCount = {};
let closeCount = {};

openingTags.forEach(t => openCount[t] = (openCount[t] || 0) + 1);
closingTags.forEach(t => closeCount[t] = (closeCount[t] || 0) + 1);
selfClosingTags.forEach(t => {
   if (t) {
     openCount[t] = (openCount[t] || 0) - 1; // remove self closing from open count
   }
});

for (let key in openCount) {
  if (openCount[key] !== (closeCount[key] || 0)) {
     console.log(`Mismatch in DetailedReceiptModal: <${key}> open: ${openCount[key]}, close: ${closeCount[key] || 0}`);
  }
}
