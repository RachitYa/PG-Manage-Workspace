import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";

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
  } catch(e) {
    if (e.code === 'auth/invalid-credential' || e.code === 'auth/user-not-found') {
      console.log("User not found or invalid credential. Creating user now...");
      try {
        await createUserWithEmailAndPassword(auth, "febebo.in@gmail.com", "Febebo.in@2026");
        console.log("Successfully created user: febebo.in@gmail.com");
      } catch (createErr) {
        console.error("Failed to create user:", createErr.message);
        process.exit(1);
      }
    } else {
      console.error("Error signing in:", e.message);
      process.exit(1);
    }
  }
  process.exit(0);
}

test();
