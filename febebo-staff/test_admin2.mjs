import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, updateDoc } from "firebase/firestore";

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
const auth = getAuth(app);
const db = getFirestore(app);

async function test() {
  try {
    const cred = await signInWithEmailAndPassword(auth, "superadmin_backend_hidden@febebo.com", "FebeboSuperadminSecret2026!");
    console.log("SUCCESS logging in as:", cred.user.email);
    
    // Now try to update a staff token (replace with a real token if you know one, but just updating non-existent should give NOT_FOUND instead of PERMISSION_DENIED)
    try {
      await updateDoc(doc(db, 'staff_tokens', 'dummy_token'), { hasProfile: true });
      console.log("SUCCESS updated staff_tokens");
    } catch (e) {
      console.log("FAILED to update staff_tokens:", e.code, e.message);
    }
    process.exit(0);
  } catch (e) {
    console.log("FAILED to log in:", e.code, e.message);
    process.exit(1);
  }
}

test();
