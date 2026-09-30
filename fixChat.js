const fs = require('fs');
const path = require('path');

const dir = 'febebo-app/src/screens';

function replaceInFile(filePath, search, replacement) {
  const content = fs.readFileSync(filePath, 'utf8');
  const newContent = content.replace(search, replacement);
  fs.writeFileSync(filePath, newContent);
}

// Fix StudentDashboard.jsx
replaceInFile(path.join(dir, 'StudentDashboard.jsx'),
  /const adminId = user\.subscribedPG\.pgId;/g,
  "const adminId = user.subscribedPG.adminId || user.subscribedPG.pgId;\n      const pgId = user.subscribedPG.adminId ? user.subscribedPG.pgId : 'primary';");

replaceInFile(path.join(dir, 'StudentDashboard.jsx'),
  /adminId,\s*tenantId: user\.uid/g,
  "adminId, pgId, tenantId: user.uid");

replaceInFile(path.join(dir, 'StudentDashboard.jsx'),
  /contact: user\.subscribedPG\.pgName, pgName: user\.subscribedPG\.pgName, adminId/g,
  "contact: user.subscribedPG.pgName, pgName: user.subscribedPG.pgName, adminId, pgId");

replaceInFile(path.join(dir, 'StudentDashboard.jsx'),
  /activeContact={{ id: user\.subscribedPG\.pgId, name: user\.subscribedPG\.pgName }}/g,
  "activeContact={{ id: user.subscribedPG.adminId || user.subscribedPG.pgId, name: user.subscribedPG.pgName }}");

replaceInFile(path.join(dir, 'StudentDashboard.jsx'),
  /chatId={\[user\.uid, user\.subscribedPG\.pgId\]/g,
  "chatId={[user.uid, user.subscribedPG.adminId || user.subscribedPG.pgId]");


// Fix Student Chat.jsx
replaceInFile(path.join(dir, 'Chat.jsx'),
  /id: user\.subscribedPG\.pgId,/g,
  "id: user.subscribedPG.adminId || user.subscribedPG.pgId,");

replaceInFile(path.join(dir, 'Chat.jsx'),
  /seen\.add\(user\.subscribedPG\.pgId\);/g,
  "seen.add(user.subscribedPG.adminId || user.subscribedPG.pgId);");

console.log('Fixed Student Chat!');
