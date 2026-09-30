const fs = require('fs');
const file = '/Users/shreyassingh/Downloads/PG MANAGE @/febebo-backend/server.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "methods: ['GET', 'POST', 'OPTIONS']",
  "methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']"
);

fs.writeFileSync(file, content, 'utf8');
