const fs = require('fs');
const file = '/Users/shreyassingh/Downloads/PG MANAGE @/febebo-staff/src/pages/StaffApp.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add states
if (!content.includes('const [allStaff, setAllStaff] = useState([]);')) {
  content = content.replace(
    "const [totalStaff, setTotalStaff] = useState(0);",
    "const [totalStaff, setTotalStaff] = useState(0);\n  const [allStaff, setAllStaff] = useState([]);\n  const [allAttendance, setAllAttendance] = useState([]);\n  const [allLeaves, setAllLeaves] = useState([]);"
  );
}

// 2. Fetch data
if (!content.includes('setAllStaff(snap.docs.map')) {
  content = content.replace(
    "unsubTokens = onSnapshot(qTokens, (snap) => setTotalStaff(snap.docs.length));",
    "unsubTokens = onSnapshot(qTokens, (snap) => {\n        setTotalStaff(snap.docs.length);\n        setAllStaff(snap.docs.map(d => ({ id: d.id, ...d.data() })));\n      });"
  );
}

if (!content.includes('setAllAttendance(attList);')) {
  content = content.replace(
    "unsubAllAtt = onSnapshot(qAllAtt, (snap) => {\n        let dutyCount = 0;\n        snap.forEach(d => { if (d.data().status === 'working') dutyCount++; });\n        setStaffOnDuty(dutyCount);\n      });",
    `unsubAllAtt = onSnapshot(qAllAtt, (snap) => {
        let dutyCount = 0;
        const attList = [];
        snap.forEach(d => {
          if (d.data().status === 'working') dutyCount++;
          attList.push({ id: d.id, ...d.data() });
        });
        setStaffOnDuty(dutyCount);
        setAllAttendance(attList);
      });
      
      const qAllLeaves = query(collection(db, 'leave_requests'), where('adminId', '==', adminId), where('status', '==', 'Approved'));
      const unsubAllLeaves = onSnapshot(qAllLeaves, snap => setAllLeaves(snap.docs.map(d => d.data())));
`
  );
  
  // need to clean up unsubAllLeaves
  content = content.replace(
    "unsubAllAtt();\n      unsubComplaints();",
    "unsubAllAtt();\n      unsubAllLeaves();\n      unsubComplaints();"
  );
}

// 3. Update the Top Cards
// Remove "Open Tickets" and replace it with something else or just remove it.
// The user says: "remove open tickets , show vacant rooms , show new leads"
// In 'Manager' roleStats:
const managerStatsOld = "{l:'Open Tickets',v:tickets.filter(t=>t.status!=='Resolved').length+plumbingJobs.filter(t=>t.status==='Open').length+electricalJobs.filter(t=>t.status==='Open').length+carpenterJobs.filter(t=>t.status==='Open').length,icon:'confirmation_number'}";
const managerStatsNew = "{l:'New Leads',v:enquiries.filter(e=>e.status==='New').length,icon:'person_add'}";

content = content.replace(managerStatsOld, managerStatsNew);

// "Staff on Duty" is already there. Wait, "Staff on Duty show total staff" - wait, in role stats it has `v:staffOnDuty`.
// Change it to show `staffOnDuty / totalStaff` or just keep `staffOnDuty` since it's a number box.
// Let's change `staffOnDuty` to `${staffOnDuty} / ${totalStaff}`
content = content.replace(
  "{l:'Staff On Duty',v:staffOnDuty,icon:'groups'}",
  "{l:'Staff On Duty',v:staffOnDuty + ' / ' + totalStaff,icon:'groups'}"
);


// 4. In Operations Overview: Remove Open Issues by Department
const openIssuesRegex = /<p style={{margin:'0 0 12px', fontSize:14, fontWeight:900, color:C\.text}}>🔎 Open Issues by Department<\/p>.*?<\/div>\s*}\s*\)\s*}\s*<\/div>/s;
content = content.replace(openIssuesRegex, "");


// 5. Attendance Quick View logic
const oldAttendanceBlock = `{['Cook (2)', 'Cleaner (3)', 'Maintenance (2)', 'Security (2)', 'Helper (3)'].map(s => (
                <div key={s} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid #f1f5f9'}}>
                  <span style={{fontSize:13, fontWeight:700, color:C.text}}>{s}</span>
                  <Chip label="On Duty ✅" color="#166534" bg="#dcfce7"/>
                </div>
              ))}
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0'}}>
                <span style={{fontSize:13, fontWeight:700, color:C.text}}>HR (1)</span>
                <Chip label="On Leave" color="#b91c1c" bg="#fee2e2"/>
              </div>`;

const newAttendanceBlock = `{allStaff.length === 0 && <p style={{margin:0, fontSize:13, color:C.muted}}>No staff found.</p>}
              {allStaff.map(s => {
                const isWorkingToday = allAttendance.find(a => a.staffId === s.id || a.staffToken === s.id);
                const todayStr = new Date().toISOString().split('T')[0];
                const isOnLeave = allLeaves.find(l => (l.staffId === s.id || l.staffToken === s.id) && l.from <= todayStr && l.to >= todayStr);
                
                let statusLabel = 'Off Duty';
                let chipColor = '#64748b';
                let chipBg = '#f1f5f9';

                if (isOnLeave) {
                  statusLabel = 'On Leave';
                  chipColor = '#b91c1c';
                  chipBg = '#fee2e2';
                } else if (isWorkingToday && isWorkingToday.status === 'working') {
                  statusLabel = 'On Duty ✅';
                  chipColor = '#166534';
                  chipBg = '#dcfce7';
                }

                return (
                  <div key={s.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid #f1f5f9'}}>
                    <span style={{fontSize:13, fontWeight:700, color:C.text}}>{s.role} ({s.name})</span>
                    <Chip label={statusLabel} color={chipColor} bg={chipBg}/>
                  </div>
                );
              })}`;

content = content.replace(oldAttendanceBlock, newAttendanceBlock);

// 6. Mess Covers in top stats logic
// Wait, the user said "in mess covers show real data too and fetch alll data from where needed".
// Mess Covers is in `roleStats['Cook']`.
// Wait! `roleStats['Cook']` has `{label:'Mess Covers', value:\`\${students.filter(s=>s['status'+(mealTab||'Lunch').charAt(0)]!=='notEaten').length} / \${students.length}\`, ...}`
// This IS real data. It calculates exactly how many students are expected to eat.
// Is there another "Mess Covers"?
// Let's check `roleStats`.

fs.writeFileSync(file, content, 'utf8');
