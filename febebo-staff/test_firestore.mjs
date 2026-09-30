import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

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
const auth = getAuth(app);

async function test() {
  try {
    await signInAnonymously(auth);
    console.log("Signed in anonymously as", auth.currentUser.uid);
    
    try {
      await setDoc(doc(db, 'staff_profiles', 'test-doc'), { test: true });
      console.log("SUCCESS writing to staff_profiles");
    } catch (e) {
      console.log("FAILED writing to staff_profiles:", e.message);
    }
    
    try {
      await setDoc(doc(db, 'users', 'test-doc'), { test: true });
      console.log("SUCCESS writing to users");
    } catch (e) {
      console.log("FAILED writing to users:", e.message);
    }
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

test();
