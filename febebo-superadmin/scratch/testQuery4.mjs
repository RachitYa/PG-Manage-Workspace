import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, limit, query } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBY7-A07i_k0KI9AB8fWvF-1fSoJzdpEH4",
  authDomain: "febebo-2026.firebaseapp.com",
  databaseURL: "https://febebo-2026-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "febebo-2026",
  storageBucket: "febebo-2026.firebasestorage.app",
  messagingSenderId: "167335453073",
  appId: "1:167335453073:web:1e3ec6a4b4b1e1c4173a30"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  try {
    const snap = await getDocs(query(collection(db, 'pg_owners'), limit(10)));
    console.log("Total pg_owners fetched:", snap.size);
    snap.forEach(doc => console.log(doc.id, doc.data().pgName, doc.data().images ? `Images: ${doc.data().images.length}` : 'No images'));
  } catch (e) {
    console.error(e);
  }
}
check();
