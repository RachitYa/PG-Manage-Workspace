const fs = require('fs');
const file = '/Users/shreyassingh/Downloads/PG MANAGE @/febebo-superadmin/src/pages/PGOwners.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "setAdmins(admins.filter(a => a.id !== deleteConfirmId));",
  "setAdmins(prev => prev.filter(a => a.id !== deleteConfirmId));"
);

fs.writeFileSync(file, content, 'utf8');
