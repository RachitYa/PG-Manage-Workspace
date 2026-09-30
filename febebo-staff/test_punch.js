import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBY7-A07i_k0KI9AB8fWvF-1fSoJzdpEH4",
  authDomain: "febebo-2026.firebaseapp.com",
  databaseURL: "https://febebo-2026-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "febebo-2026"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function test() {
  try {
    await signInWithEmailAndPassword(auth, "superadmin_backend_hidden@febebo.com", "FebeboSuperadminSecret2026!");
    console.log("Logged in");
    
    await setDoc(doc(db, "staff_attendance", "TEST_DOC_123"), {
      staffToken: "test",
      staffId:    "test",
      staffName:  "Test",
      adminId:    "test_admin",
      status:     "present",
    }, { merge: true });
    
    console.log("Write success");
  } catch (e) {
    console.error("Write Error:", e.message);
  }
  process.exit(0);
}
test();
