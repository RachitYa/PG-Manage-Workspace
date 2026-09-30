const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/Chat.jsx";
let content = fs.readFileSync(file, 'utf8');

// Replace updateDoc with setDoc(..., { merge: true }) in sendRoomDetails, sendMessMenu, and sendPGDetails

content = content.replace(
  /await updateDoc\(doc\(db, 'chats', chatId\), \{([\s\S]*?)\}\);/g,
  "await setDoc(doc(db, 'chats', chatId), {$1}, { merge: true });"
);

fs.writeFileSync(file, content);
