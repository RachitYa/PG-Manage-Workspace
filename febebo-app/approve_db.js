import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBY7-A07i_k0KI9AB8fWvF-1fSoJzdpEH4",
  authDomain: "febebo-2026.firebaseapp.com",
  databaseURL: "https://febebo-2026-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "febebo-2026",
  storageBucket: "febebo-2026.firebasestorage.app",
  messagingSenderId: "167335453073",
  appId: "1:167335453073:web:1e3ec6a4b4b1e1c4173a30",
  measurementId: "G-QX4TXXDJ9E"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function approveLegacy() {
  const querySnapshot = await getDocs(collection(db, 'pg_owners'));
  let count = 0;
  for (const document of querySnapshot.docs) {
    const data = document.data();
    if (data.status === undefined) {
      await updateDoc(doc(db, 'pg_owners', document.id), {
        status: 'Approved'
      });
      count++;
      console.log(`Updated PG ${data.pgName} to Approved`);
    }
  }
  console.log(`Total updated: ${count}`);
}

approveLegacy().catch(console.error);
