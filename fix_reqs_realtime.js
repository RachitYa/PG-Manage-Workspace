const fs = require('fs');

let code = fs.readFileSync('/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/AdminDashboard.jsx', 'utf8');

const targetStr = `    const unsub = onSnapshot(qReqs, (snap) => {
      const currentCount = snap.docs.length;
      setVendorCount(currentCount);`;

const newStr = `    const unsub = onSnapshot(qReqs, (snap) => {
      const currentCount = snap.docs.length;
      setVendorCount(currentCount);
      
      // Update pending notifs count too
      getDocs(query(collection(db, 'notifications'), where('adminId', '==', user.uid), where('resolved', '==', false)))
        .then(nSnap => setPendingNotifsCount(nSnap.size + currentCount));`;

code = code.replace(targetStr, newStr);
fs.writeFileSync('/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/AdminDashboard.jsx', code);
