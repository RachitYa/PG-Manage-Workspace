const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/febebo-app/src/screens/RoomDescription.css";
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "width: 100%;\n  height: 380px;\n  background: #0f172a;",
  "width: calc(100% - 32px);\n  height: 380px;\n  background: #0f172a;\n  margin: 16px;\n  border-radius: 24px;\n  overflow: hidden;\n  box-shadow: 0 10px 30px rgba(0,0,0,0.1);"
);

content = content.replace(
  "object-fit: contain;",
  "object-fit: cover;"
);

fs.writeFileSync(file, content);
