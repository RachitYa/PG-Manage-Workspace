const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function check() {
  const snapshot = await db.collection('users').limit(10).get();
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`USER: ${doc.id}`);
    console.log(`  photoURL: ${data.photoURL}`);
    console.log(`  kyc.profilePhoto: ${data.kyc?.profilePhoto ? 'YES' : 'NO'}`);
    if (data.kyc?.profilePhoto) console.log(`  => ${data.kyc.profilePhoto.substring(0, 50)}...`);
  });
}
check();
