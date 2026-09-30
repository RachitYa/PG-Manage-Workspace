const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./febebo-backend/serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function check() {
  const users = await db.collection('users').limit(10).get();
  for (const user of users.docs) {
    const payments = await db.collection('users').doc(user.id).collection('payments').get();
    if (payments.size > 0) {
      console.log(`User ${user.id}:`);
      payments.forEach(p => {
        console.log(`  - ${p.data().paymentType} | Date: ${p.data().date}`);
      });
    }
  }
}
check();
