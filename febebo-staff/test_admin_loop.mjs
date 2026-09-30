import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

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

const emails = ["febebo.in@gmail.com", "febebo@gmail.com", "admin@febebo.com", "febebo.in@gmail.com "];
const passwords = ["Febebo@2026", "febebo@2026", "FebeboPawan@2026"];

async function test() {
  for (let e of emails) {
    for (let p of passwords) {
      try {
        console.log(`Trying ${e} : ${p}`);
        const cred = await signInWithEmailAndPassword(auth, e, p);
        console.log("!!! SUCCESS !!! ->", e, p);
        process.exit(0);
      } catch (err) {
        // ignore and continue
      }
    }
  }
  console.log("All failed.");
  process.exit(1);
}

test();
