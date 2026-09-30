const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/febebo-staff/src/pages/StaffApp.jsx";
let content = fs.readFileSync(file, 'utf8');

const targetStart = `<div style={{display:'flex', alignItems:'center', justifyContent:'space-between', height:60, position:'relative'}}>`;
const targetEnd = `<button onClick={()=>setView('profile_view')}`;

let sIdx = content.indexOf(targetStart);
let eIdx = content.indexOf(targetEnd);

if (sIdx !== -1 && eIdx !== -1) {
  const replacement = `<div style={{display:'flex', alignItems:'center', justifyContent:'space-between', height:60, position:'relative'}}>
            <div style={{display:'flex', alignItems:'center', zIndex:10}}>
              <p style={{fontFamily:"'Hanken Grotesk',sans-serif", fontSize:24, fontWeight:900, color: '#1a1500', margin:0, letterSpacing:-.5}}>febebo</p>
            </div>
            `;
  content = content.substring(0, sIdx) + replacement + content.substring(eIdx);
}

fs.writeFileSync(file, content);
