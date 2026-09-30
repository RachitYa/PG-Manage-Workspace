const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/Chat.jsx";
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "Type: ${room.roomBeds} Seater",
  "Type: ${room.roomType || 'Standard Room'} (${room.beds || room.roomBeds || 1} Seater)"
);

content = content.replace(
  "<option key={r.id} value={r.id}>Room {r.roomNo} ({r.roomBeds} Seater)</option>",
  "<option key={r.id} value={r.id}>Room {r.roomNo} - {r.roomType || 'Standard Room'} ({r.beds || r.roomBeds || 1} Seater)</option>"
);

fs.writeFileSync(file, content);
