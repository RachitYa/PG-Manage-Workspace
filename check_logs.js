const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./febebo-backend/serviceAccountKey.json');
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
async function run() {
  const atts = await db.collection('staff_attendance').get();
  atts.forEach(d => console.log(d.id, d.data().status, d.data().dailyPay));
}
run();
