import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBY7-A07i_k0KI9AB8fWvF-1fSoJzdpEH4",
  authDomain: "febebo-2026.firebaseapp.com",
  projectId: "febebo-2026",
  storageBucket: "febebo-2026.firebasestorage.app"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const tSnap = await getDocs(collection(db, "tenants"));
  console.log("Total tenants:", tSnap.size);
  tSnap.forEach(d => {
    const t = d.data();
    console.log("Tenant " + t.name + " (status: " + t.status + "): roomNo=" + t.roomNo + ", room=" + t.room);
  });
  process.exit(0);
}
check();
