const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'pages');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

for (const file of files) {
  const fp = path.join(dir, file);
  let content = fs.readFileSync(fp, 'utf8');

  let changed = false;

  // Add pgId to payloads that have adminId: user.uid
  const regex1 = /adminId\s*:\s*user(?:\?)?\.uid\s*,/g;
  if (regex1.test(content)) {
    content = content.replace(regex1, (match) => {
      // If it already contains pgId next to it, skip
      return match + " pgId: activePgId, ";
    });
    changed = true;
  }

  // Add pgId to payloads that have ownerUid: user.uid
  const regex2 = /ownerUid\s*:\s*user(?:\?)?\.uid\s*,/g;
  if (regex2.test(content)) {
    content = content.replace(regex2, (match) => {
      return match + " pgId: activePgId, ";
    });
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(fp, content, 'utf8');
    console.log('Updated writes in ' + file);
  }
}
