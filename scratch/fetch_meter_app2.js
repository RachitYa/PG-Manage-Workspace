const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/febebo-app/src/screens/Account.jsx";
let content = fs.readFileSync(file, 'utf8');

const oldEffect = `  useEffect(() => {
    if (!user?.uid) return;
    setLoading(true);
    const q = query(collection(db, 'users', user.uid, 'payments'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPayments(snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);`;

const newEffect = `  useEffect(() => {
    if (!user?.uid) return;
    setLoading(true);
    const q = query(collection(db, 'users', user.uid, 'payments'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPayments(snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() })));
      setLoading(false);
    });
    
    // Fetch unpaid meter bills
    const qM = query(collection(db, 'meter_bills'), where('tenantId', '==', user.uid), where('status', '==', 'Unpaid'));
    const unsubM = onSnapshot(qM, (snapshot) => {
      setMeterBills(snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() })));
    });
    
    return () => {
      unsubscribe();
      unsubM();
    };
  }, [user]);`;

if (content.includes('setLoading(true);') && content.includes('setPayments(')) {
    content = content.replace(oldEffect, newEffect);
    fs.writeFileSync(file, content);
    console.log("Success");
} else {
    console.log("Not found");
}
