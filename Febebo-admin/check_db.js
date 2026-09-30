import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "mock-api-key",
  authDomain: "pg-manage-23a7e.firebaseapp.com",
  projectId: "pg-manage-23a7e",
  storageBucket: "pg-manage-23a7e.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const tSnap = await getDocs(collection(db, 'tenants'));
  console.log("TENANTS:");
  tSnap.forEach(doc => {
    const data = doc.data();
    if(data.name && data.name.toLowerCase().includes('rishabh')) {
      console.log(doc.id, data.name, data.dateOfJoining, data.securityDeposit);
    }
  });

  const rSnap = await getDocs(collection(db, 'rent_receipts'));
  console.log("\nRECEIPTS:");
  rSnap.forEach(doc => {
    const data = doc.data();
    if(data.tenantName && data.tenantName.toLowerCase().includes('rishabh')) {
      console.log(doc.id, data.tenantName, data.rentMonth, data.amountPaid, data.totalAmount);
    }
  });
  process.exit(0);
}
check();
