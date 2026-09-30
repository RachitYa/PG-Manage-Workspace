const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

async function checkPgData() {
  const users = await db.collection('pg_owners').limit(1).get();
  users.forEach(doc => {
    console.log("PG Data:", JSON.stringify(doc.data(), null, 2));
  });
}
checkPgData().then(() => process.exit());
