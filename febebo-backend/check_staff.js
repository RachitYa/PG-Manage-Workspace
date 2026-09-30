const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function check() {
  const staff = await db.collection('staff_tokens').limit(1).get();
  for (const s of staff.docs) {
    console.log(s.data());
  }
}
check();
