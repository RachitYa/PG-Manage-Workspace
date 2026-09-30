const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/UserProfile.jsx";
let content = fs.readFileSync(file, 'utf8');

const lines = content.split('\n');

// We want:
// - Keep lines 0-404 (indices 0-403 = lines 1-404)
// - Delete lines 405-523 (0-indexed 404-522) = the first comment through orphaned code
// - Keep from line 524 onwards (0-indexed 523) = second SUB-VIEW comment and RoomPreviewView

// Actually:
// Keep: indices 0-402 (the new MeterHistoryView + its closing })
// Skip: indices 403-522 (blank, first comment, orphaned body)
// Keep: indices 523 onwards (second comment = RoomPreviewView, etc.)

const newLines = [
  ...lines.slice(0, 403),   // new MeterHistoryView ends at } on line 403 (index 402), keep through index 402 + blank
  '',
  ...lines.slice(523)        // second SUB-VIEW comment and beyond
];

fs.writeFileSync(file, newLines.join('\n'));
console.log("Done! New total lines:", newLines.length);
// Verify fix
const check = fs.readFileSync(file, 'utf8').split('\n');
for (let i = 400; i < 415; i++) {
  console.log(`Line ${i+1}:`, JSON.stringify(check[i]));
}
