const fs = require('fs');

const files = [
  'febebo-app/src/screens/AllPGs.jsx',
  'febebo-app/src/screens/ExplorePGs.jsx',
  'febebo-app/src/screens/StudentDashboard.jsx',
  'febebo-app/src/screens/LikedPGs.jsx'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');

  // Replace `if (pgData.status !== 'Approved') return;`
  // With `if (pgData.status !== 'Approved' || pgData.visibility === 'private') return;`
  
  content = content.replace(/if\s*\(\s*pgData\.status\s*!==\s*'Approved'\s*\)\s*return;/g, 
    "if ((pgData.status !== 'Approved' && pgData.status !== 'Active') || pgData.visibility === 'private') return;");

  // Some files might use `const pgList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(pg => pg.status === 'Approved');`
  content = content.replace(/\.filter\(\s*([a-zA-Z0-9_]+)\s*=>\s*\1\.status === 'Approved'\s*\)/g, 
    ".filter($1 => ($1.status === 'Approved' || $1.status === 'Active') && $1.visibility !== 'private')");

  fs.writeFileSync(file, content);
});

console.log('Fixed properly');
