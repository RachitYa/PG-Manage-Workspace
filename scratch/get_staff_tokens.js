import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyBY7-A07i_k0KI9AB8fWvF-1fSoJzdpEH4",
    authDomain: "febebo-2026.firebaseapp.com",
    projectId: "febebo-2026",
    databaseURL: "https://febebo-2026-default-rtdb.asia-southeast1.firebasedatabase.app",
    storageBucket: "febebo-2026.firebasestorage.app",
    messagingSenderId: "167335453073",
    appId: "1:167335453073:web:1e3ec6a4b4b1e1c4173a30",
    measurementId: "G-QX4TXXDJ9E"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
    const snap = await getDocs(collection(db, 'staff_tokens'));
    snap.forEach(d => console.log(d.id, d.data()));
    process.exit(0);
}
check();
