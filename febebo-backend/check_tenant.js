const admin = require('firebase-admin');
const serviceAccount = require('serviceAccountKey.json'); // Might need to adjust path

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (e) {}

const db = admin.firestore();

async function check() {
  const t = await db.collection('tenants').limit(5).get();
  t.docs.forEach(doc => {
    console.log(doc.id, '->', Object.keys(doc.data()));
    if (doc.data().kyc) {
      console.log('kyc:', doc.data().kyc);
    }
    if (doc.data().image) console.log('image:', doc.data().image);
    if (doc.data().profilePhoto) console.log('profilePhoto:', doc.data().profilePhoto);
    if (doc.data().photoURL) console.log('photoURL:', doc.data().photoURL);
  });
}
check();
