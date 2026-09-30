const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function check() {
  const snapshot = await db.collection('admins').where('role', '==', 'admin').get();
  console.log(`Found ${snapshot.size} admins.`);
  snapshot.forEach(doc => {
    console.log(doc.id, doc.data().email);
  });
}
check();
