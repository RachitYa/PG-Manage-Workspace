const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'pages');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

for (const file of files) {
  const fp = path.join(dir, file);
  let content = fs.readFileSync(fp, 'utf8');

  // Skip AdminDashboard since it's already done
  if (file === 'AdminDashboard.jsx') continue;

  let changed = false;

  // Update useAuth destructuring
  if (content.includes('useAuth()') && !content.includes('activePgId')) {
    content = content.replace(/(const\s+\{[^}]*)\}\s*=\s*useAuth\(\);/g, (match, p1) => {
      // Avoid duplicate activePgId if somehow it's there
      if(p1.includes('activePgId')) return match;
      return p1.trim() + (p1.trim().endsWith('{') ? ' activePgId ' : ', activePgId ') + '} = useAuth();';
    });
    changed = true;
  }

  // Update queries
  const q1 = "where('adminId', '==', user.uid)";
  const q2 = "where('adminId', '==', user.uid), where('pgId', '==', activePgId)";
  if (content.includes(q1)) {
    content = content.split(q1).join(q2);
    changed = true;
  }
  
  const q3 = "where('ownerUid', '==', user.uid)";
  const q4 = "where('ownerUid', '==', user.uid), where('pgId', '==', activePgId)";
  if (content.includes(q3)) {
    content = content.split(q3).join(q4);
    changed = true;
  }

  // Double quotes
  const q5 = 'where("adminId", "==", user.uid)';
  const q6 = 'where("adminId", "==", user.uid), where("pgId", "==", activePgId)';
  if (content.includes(q5)) {
    content = content.split(q5).join(q6);
    changed = true;
  }

  const q7 = 'where("ownerUid", "==", user.uid)';
  const q8 = 'where("ownerUid", "==", user.uid), where("pgId", "==", activePgId)';
  if (content.includes(q7)) {
    content = content.split(q7).join(q8);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(fp, content, 'utf8');
    console.log('Updated ' + file);
  }
}
