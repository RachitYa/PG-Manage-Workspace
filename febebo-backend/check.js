const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function check() {
  const snapshot = await db.collection('admins').where('role', '==', 'admin').get();
  console.log(`Found ${snapshot.size} admins.`);
  snapshot.forEach(doc => {
    console.log(doc.id, doc.data().email);
  });
}
check();
