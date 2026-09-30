const fs = require('fs');

let code = fs.readFileSync('/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/ManageAccount.jsx', 'utf8');

const targetStr = `const activeTenants = usersList.filter(t => t.securityDeposit > 0 && ['Approved', 'Current User', 'Notice', 'On Notice Period', 'Upcoming User'].includes(t.status));`;
const newStr = `const activeTenants = usersList.filter(t => t.securityDeposit > 0 && ['Approved', 'Current User', 'Notice', 'On Notice Period', 'Upcoming User', 'Verified'].includes(t.status));`;

code = code.replace(targetStr, newStr);

fs.writeFileSync('/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/ManageAccount.jsx', code);
