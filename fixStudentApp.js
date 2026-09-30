const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, search, replacement) {
  const content = fs.readFileSync(filePath, 'utf8');
  const newContent = content.replace(search, replacement);
  fs.writeFileSync(filePath, newContent);
}

const dir = 'febebo-app/src/screens';

// Fix Complaints.jsx
replaceInFile(path.join(dir, 'Complaints.jsx'), 
  /adminId:\s*user\.subscribedPG\.pgId,/, 
  "adminId: user.subscribedPG.adminId || user.subscribedPG.pgId,\n        pgId: user.subscribedPG.adminId ? user.subscribedPG.pgId : 'primary',");

// Fix Transport.jsx
replaceInFile(path.join(dir, 'Transport.jsx'), 
  /adminId:\s*user\.subscribedPG\.pgId,/, 
  "adminId: user.subscribedPG.adminId || user.subscribedPG.pgId,\n        pgId: user.subscribedPG.adminId ? user.subscribedPG.pgId : 'primary',");

// Fix Cleaner.jsx
replaceInFile(path.join(dir, 'Cleaner.jsx'), 
  /adminId:\s*user\.subscribedPG\.pgId,/, 
  "adminId: user.subscribedPG.adminId || user.subscribedPG.pgId,\n        pgId: user.subscribedPG.adminId ? user.subscribedPG.pgId : 'primary',");

// Fix Visitor.jsx
replaceInFile(path.join(dir, 'Visitor.jsx'), 
  /adminId:\s*user\?\.subscribedPG\?\.pgId \|\| 'none',/, 
  "adminId: user?.subscribedPG?.adminId || user?.subscribedPG?.pgId || 'none',\n        pgId: user?.subscribedPG?.adminId ? user.subscribedPG.pgId : 'primary',");

// Fix Account.jsx (Notice/Leave)
replaceInFile(path.join(dir, 'Account.jsx'), 
  /adminId:\s*user\.subscribedPG\.pgId,/g, 
  "adminId: user.subscribedPG.adminId || user.subscribedPG.pgId,\n          pgId: user.subscribedPG.adminId ? user.subscribedPG.pgId : 'primary',");

console.log('Fixed Student App writes!');
