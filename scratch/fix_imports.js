const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/febebo-app/src/screens/Account.jsx";
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /import { collection, query, orderBy, onSnapshot, addDoc, setDoc, doc } from 'firebase\/firestore';/,
  "import { collection, query, orderBy, onSnapshot, addDoc, setDoc, doc, where, updateDoc } from 'firebase/firestore';"
);

fs.writeFileSync(file, content);
console.log("Added where and updateDoc to imports");
