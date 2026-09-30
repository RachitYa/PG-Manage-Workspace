const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/febebo-staff/src/pages/StaffApp.jsx";
let content = fs.readFileSync(file, 'utf8');

const targetStr = `                <h1 style={{margin:'20px 0 0', fontSize:46, fontWeight:900, lineHeight:1, letterSpacing:-1}}>₹{Math.round(totalLifetimeEarnings).toLocaleString()}</h1>
                <div style={{display:'flex', gap: 16, marginTop: 12}}>
                  <p style={{margin:0, fontSize:14, fontWeight:600, color:'#94a3b8'}}>Base Salary: ₹{baseSal.toLocaleString()}</p>
                  <p style={{margin:0, fontSize:14, fontWeight:600, color:'#fde047'}}>This Month: ₹{Math.round(earnedThisCycle).toLocaleString()}</p>
                </div>`;

const replaceStr = `                <h1 style={{margin:'16px 0 0', fontSize:46, fontWeight:900, lineHeight:1, letterSpacing:-1}}>₹{Math.round(earnedThisCycle).toLocaleString()}</h1>
                <p style={{margin:'8px 0 0', fontSize:14, fontWeight:600, color:'#cbd5e1'}}>Lifetime Earned: ₹{Math.round(totalLifetimeEarnings).toLocaleString()}</p>
                <div style={{display:'flex', gap: 16, marginTop: 12}}>
                  <p style={{margin:0, fontSize:14, fontWeight:600, color:'#94a3b8'}}>Base Salary: ₹{baseSal.toLocaleString()}</p>
                  <p style={{margin:0, fontSize:14, fontWeight:600, color:'#fde047'}}>This Month: ₹{Math.round(earnedThisCycle).toLocaleString()}</p>
                </div>`;

content = content.replace(targetStr, replaceStr);

fs.writeFileSync(file, content);
