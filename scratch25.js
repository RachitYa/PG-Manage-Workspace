const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/Chat.jsx";
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "const pgSnap = await getDoc(doc(db, 'pg_owners', user.uid));\n      const pgData = pgSnap.data() || {};",
  "const chatId = user.uid < activeContact.id ? `${user.uid}_${activeContact.id}` : `${activeContact.id}_${user.uid}`;\n      const pgSnap = await getDoc(doc(db, 'pg_owners', user.uid));\n      const pgData = pgSnap.data() || {};"
);

content = content.replace(
  "const pgSnap = await getDoc(doc(db, 'pg_owners', user.uid));\n      const pg = pgSnap.data();",
  "const chatId = user.uid < activeContact.id ? `${user.uid}_${activeContact.id}` : `${activeContact.id}_${user.uid}`;\n      const pgSnap = await getDoc(doc(db, 'pg_owners', user.uid));\n      const pg = pgSnap.data();"
);

fs.writeFileSync(file, content);
