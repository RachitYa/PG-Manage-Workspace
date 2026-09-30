const fs = require('fs');
const file = '/Users/shreyassingh/Downloads/PG MANAGE @/febebo-staff/src/pages/StaffApp.jsx';
let content = fs.readFileSync(file, 'utf8');

const startStr = "<p style={{margin:'0 0 12px', fontSize:14, fontWeight:900, color:C.text}}>🔎 Open Issues by Department</p>";
const endStr = "</div>\n              ))}\n            </div>";

if (content.includes(startStr)) {
  const startIndex = content.indexOf(startStr);
  const beforeStart = content.substring(0, startIndex - 14); // remove the padding/border div too maybe? Wait.
  
  // The structure is:
  // <div style={{background:'#fff', borderRadius:16, border:'1px solid #e2e8f0', padding:16, boxShadow:'0 4px 16px rgba(15,23,42,0.05)', marginBottom:16}}>
  //   <p>🔎 Open Issues...</p>
  //   {[...].map(...) ...}
  // </div>
  
  // Let's just use string replacement for the exact lines.
  const lines = content.split('\n');
  let newLines = [];
  let skip = false;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('🔎 Open Issues by Department')) {
      skip = true;
      // remove the preceding <div ... > line
      newLines.pop();
    }
    
    if (skip) {
      if (lines[i].includes('Attendance Quick View')) {
        skip = false;
        // add the current line
        newLines.push(lines[i]);
      }
      continue;
    }
    
    newLines.push(lines[i]);
  }
  
  fs.writeFileSync(file, newLines.join('\n'), 'utf8');
}
