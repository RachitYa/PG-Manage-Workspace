const fs = require('fs');
const file = '/Users/shreyassingh/Downloads/PG MANAGE @/febebo-superadmin/src/pages/PGOwners.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "console.error(error);\n      setLoading(false);",
  "console.error(error);\n      alert('Error fetching PG owners: ' + error.message);\n      setLoading(false);"
);

fs.writeFileSync(file, content, 'utf8');
