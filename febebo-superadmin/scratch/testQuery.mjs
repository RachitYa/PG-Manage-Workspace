import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";

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
  const snap = await getDocs(query(collection(db, 'admins'), where('role', '==', 'admin')));
  console.log("Total admins:", snap.size);
  snap.forEach(doc => console.log(doc.id, doc.data()));
}
check();
