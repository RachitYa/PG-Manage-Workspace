const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/UserProfile.jsx";
let content = fs.readFileSync(file, 'utf8');

// Find and remove lines 407-525 (the orphaned old MeterHistoryView body)
// These lines contain: blank lines + // comment + orphaned old return() block
const lines = content.split('\n');

// Find the line index for the second "// ─── SUB-VIEW: ROOM DETAILS" marker
let firstFound = false;
let removeStart = -1;
let removeEnd = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('// ─── SUB-VIEW: ROOM DETAILS REDIRECT')) {
    if (!firstFound) {
      firstFound = true;
      // Remove from 2 lines before (the blank lines after new function}) up to this comment
      // Actually we want to remove the orphaned block between line ~407 and ~525
      // The orphaned block starts around line 407 (0-indexed 406) with blank lines
      // and ends at line 525 (0-indexed 524) with '}'
      // We want to KEEP lines 0-403 (up to and including the new MeterHistoryView closing })
      // and DELETE lines 404-524 (3 blank lines, old comment, old code, closing })
      // The new comment is at line 526 (0-indexed 525) "// ─── SUB-VIEW: ROOM DETAILS REDIRECT"
      // Let's find where the new MeterHistoryView ends (the '}' after the new function)
    } else {
      // This is the second occurrence (line 526)
      removeEnd = i;
      break;
    }
  }
}

// The first MeterHistoryView function's closing } is at line 403 (1-indexed) = index 402
// The orphaned block is lines 404-525 (1-indexed) = indices 403-524
// We want to delete indices 403-524 (up to but not including the second comment at removeEnd)

// Actually let's find the orphaned block by searching for the dangling "return (" after a comment
// The safest approach: remove from line 404 to line 525 (indices 403 to 524)
// Line 404 is blank (after the new MeterHistoryView closing })
// Line 526 is "// ─── SUB-VIEW: ROOM DETAILS REDIRECT" — we want to keep from line 526

// Find line 526 (the second SUB-VIEW comment)
const secondCommentIdx = lines.findIndex((l, idx) => idx > 400 && l.includes('// ─── SUB-VIEW: ROOM DETAILS REDIRECT'));

if (secondCommentIdx === -1) {
  console.error("Could not find second SUB-VIEW comment");
  process.exit(1);
}

// Find the end of the new MeterHistoryView (closing }) just before the orphaned block
// The new MeterHistoryView ends at line 402 (index 402, 0-based)
// Let's find it by searching backward from secondCommentIdx for '}'
let meterEndIdx = -1;
for (let i = secondCommentIdx - 1; i >= 380; i--) {
  if (lines[i].trim() === '}') {
    meterEndIdx = i;
    break;
  }
}

console.log('meterEndIdx (0-based):', meterEndIdx, '=> line', meterEndIdx+1);
console.log('secondCommentIdx (0-based):', secondCommentIdx, '=> line', secondCommentIdx+1);
console.log('Removing lines', meterEndIdx+2, 'through', secondCommentIdx, '(1-indexed)');

// Remove the orphaned block (from meterEndIdx+1 to secondCommentIdx-1, 0-based inclusive)
const newLines = [
  ...lines.slice(0, meterEndIdx + 1),
  '',
  ...lines.slice(secondCommentIdx)
];

fs.writeFileSync(file, newLines.join('\n'));
console.log("Done! New total lines:", newLines.length);
