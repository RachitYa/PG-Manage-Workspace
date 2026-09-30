const fs = require('fs');
const path = require('path');

const directoryPath = '/Users/shreyassingh/Downloads/PG MANAGE @/febebo-superadmin/src/pages';

fs.readdirSync(directoryPath).forEach(file => {
  const filePath = path.join(directoryPath, file);
  if (filePath.endsWith('.jsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('fetch(`/api/')) {
      content = content.replace(/fetch\(\`\/api\//g, "fetch(`http://${window.location.hostname}:3000/api/");
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Patched ${file}`);
    }
  }
});
