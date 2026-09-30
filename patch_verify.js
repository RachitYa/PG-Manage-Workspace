const fs = require('fs');
const file = '/Users/shreyassingh/Downloads/PG MANAGE @/febebo-backend/server.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "return res.status(401).json({ success: false, error: \"Unauthorized: Invalid or expired token\" });",
  "return res.status(401).json({ success: false, error: `Unauthorized: ${error.message}` });"
);

fs.writeFileSync(file, content, 'utf8');
