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

async function syncApproval() {
  const adminSnap = await getDocs(collection(db, 'admins'));
  let count = 0;
  for (const document of adminSnap.docs) {
    const adminData = document.data();
    if (adminData.isApproved) {
      try {
        await updateDoc(doc(db, 'pg_owners', document.id), {
          status: 'Approved'
        });
        count++;
        console.log(`Synced Approved status for admin ${document.id}`);
      } catch (err) {
        // Might not have a pg_owners doc yet
      }
    }
  }
  console.log(`Total synced: ${count}`);
}

syncApproval().catch(console.error);
