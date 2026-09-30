const fs = require('fs');

function updateBubble(file) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes("whiteSpace: 'pre-wrap'")) return;
  // find: <p style={{ margin: 0, fontSize: 14.5,
  content = content.replace(
    /margin:\s*0,\s*fontSize:\s*14\.5,/g,
    "margin: 0, fontSize: 14.5, whiteSpace: 'pre-wrap',"
  );
  content = content.replace(
    /margin:\s*0,\s*fontSize:\s*14,/g,
    "margin: 0, fontSize: 14, whiteSpace: 'pre-wrap',"
  );
  fs.writeFileSync(file, content);
}

updateBubble("/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/Chat.jsx");
updateBubble("/Users/shreyassingh/Downloads/PG MANAGE @/febebo-app/src/screens/Chat.jsx");
