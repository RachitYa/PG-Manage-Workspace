const fs = require('fs');
const file = '/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/Chat.jsx';
let content = fs.readFileSync(file, 'utf8');

// The faulty code in Chat.jsx:
// await updateDoc(doc(db, 'users', contactId), {
//   status: 'Upcoming User',
//   pgStatus: 'Upcoming User',
//   subscribedPG: { adminId: user.uid, status: 'Upcoming User' }
// });

content = content.replace(
  /subscribedPG: \{ adminId: user\.uid, status: 'Upcoming User' \}/g,
  `'subscribedPG.adminId': user.uid,
        'subscribedPG.status': 'Upcoming User',
        'subscribedPG.roomNo': allotForm.roomNo,
        'subscribedPG.bedNo': allotForm.bedNo || '',
        'subscribedPG.remainingAmount': rem,
        'subscribedPG.paymentVerificationPending': rem > 0`
);

content = content.replace(
  /paymentVerificationPending: true\n\s*\}, \{ merge: true \}\);/g,
  `paymentVerificationPending: rem > 0,
        remainingAmount: rem
      }, { merge: true });`
);

fs.writeFileSync(file, content, 'utf8');
