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

async function resetAdminProfiles() {
  const adminsCol = collection(db, 'admins');
  const snapshot = await getDocs(adminsCol);
  
  let count = 0;
  for (const docSnap of snapshot.docs) {
    const adminRef = doc(db, 'admins', docSnap.id);
    await updateDoc(adminRef, { hasProfile: false });
    count++;
  }
  
  console.log(`Successfully reset hasProfile to false for ${count} admin accounts.`);
  process.exit(0);
}

resetAdminProfiles();
