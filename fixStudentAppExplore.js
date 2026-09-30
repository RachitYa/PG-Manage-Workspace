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

  // Typically: const pgList = querySnapshot.docs.map(...).filter(pg => pg.status === 'Approved');
  // We'll replace `.filter(pg => pg.status === 'Approved')` with `.filter(pg => (pg.status === 'Approved' || pg.status === 'Active') && pg.visibility !== 'private')`

  // Regex to match the filter:
  content = content.replace(/\.filter\(\s*([a-zA-Z0-9_]+)\s*=>\s*\1\.status === 'Approved'\s*\)/g, 
    ".filter($1 => ($1.status === 'Approved' || $1.status === 'Active') && $1.visibility !== 'private')");
  
  // Just in case it was explicitly fetching all and mapping without filter
  // It's safer to just replace inside the getDocs mapping block if there's no filter. Let's see.
  
  // Let's actually look closely at AllPGs.jsx, ExplorePGs.jsx:
  
  fs.writeFileSync(file, content);
});

console.log('Fixed simple filters');
