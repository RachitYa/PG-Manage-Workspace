const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/febebo-app/src/screens/Account.jsx";
let content = fs.readFileSync(file, 'utf8');

if (!content.includes("updateDoc")) {
  content = content.replace(
    /import { getFirestore, collection, addDoc, query, onSnapshot, orderBy } from 'firebase\/firestore';/g,
    `import { getFirestore, collection, addDoc, query, onSnapshot, orderBy, updateDoc, doc, where } from 'firebase/firestore';`
  );
}
if (!content.includes("where")) {
  content = content.replace(
    /import { collection, addDoc, query, onSnapshot, orderBy } from 'firebase\/firestore';/g,
    `import { collection, addDoc, query, onSnapshot, orderBy, updateDoc, doc, where } from 'firebase/firestore';`
  );
}

content = content.replace(
  /await addDoc\(collection\(db, 'users', user\.uid, 'payments'\), paymentObj\);/g,
  `const docRef = await addDoc(collection(db, 'users', user.uid, 'payments'), paymentObj);
      if (isMeter) {
        for (const mb of meterBills) {
          await updateDoc(doc(db, 'meter_bills', mb.docId), {
            status: 'Paid',
            paymentId: docRef.id
          });
        }
      }`
);

fs.writeFileSync(file, content);
console.log("Added updateDoc");
