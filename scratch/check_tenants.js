import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  authDomain: "febebo-app.firebaseapp.com",
  projectId: "febebo-app",
  storageBucket: "febebo-app.appspot.com",
  messagingSenderId: "xxxxxxxxxxxx",
  appId: "1:xxxxxxxxxxxx:web:xxxxxxxxxxxxxxxxxxxxxx",
  measurementId: "G-xxxxxxxxxx"
};

// I need to use the actual firebase config from the project.
