import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";

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
    console.log("Signing in...");
    await signInWithEmailAndPassword(auth, "febebo.in@gmail.com", "Febebo.in@2026");
    console.log("Sign in successful!");
    
    console.log("Fetching staff token...");
    // We don't have a specific PIN, but we can try reading a dummy one.
    // If it returns "not exists", the connection works. If it hangs, the connection is the issue.
    const docSnap = await getDoc(doc(db, 'staff_tokens', '123456'));
    console.log("Fetch complete. Exists:", docSnap.exists());
    process.exit(0);
  } catch(e) {
    console.error("Error:", e.message);
    process.exit(1);
  }
}

test();
