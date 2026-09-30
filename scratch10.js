const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/febebo-staff/src/pages/StaffApp.jsx";
let content = fs.readFileSync(file, 'utf8');

const targetStr = `<h1 style={{margin:'24px 0 12px', fontSize:56, fontWeight:900, lineHeight:1, letterSpacing:-2, color:'#fff'}}>₹{Math.round(totalLifetimeEarnings).toLocaleString()}</h1>`;
const replaceStr = `<h1 style={{margin:'24px 0 12px', fontSize:48, fontWeight:900, lineHeight:1, letterSpacing:-1.5, color:'#fff'}}>₹{Math.round(totalLifetimeEarnings).toLocaleString()}</h1>`;

content = content.replace(targetStr, replaceStr);

fs.writeFileSync(file, content);
