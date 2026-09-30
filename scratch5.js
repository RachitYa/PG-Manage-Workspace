const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/ManageRooms.jsx";
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "beds: parseInt(roomBeds) || 1,",
  "beds: parseInt(roomBeds) || 1,\n        roomType: roomType,"
);

content = content.replace(
  "setRoomBeds(1);",
  "setRoomBeds(1);\n      setRoomType('Non AC Room');"
);

fs.writeFileSync(file, content);
