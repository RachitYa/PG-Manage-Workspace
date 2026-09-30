const fs = require('fs');
const file = '/Users/shreyassingh/Downloads/PG MANAGE @/febebo-backend/server.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "app.listen(PORT, () => console.log(`Server running on port ${PORT}`));",
  "app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));"
);

fs.writeFileSync(file, content, 'utf8');
