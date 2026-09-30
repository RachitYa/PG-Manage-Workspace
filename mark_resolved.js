const fs = require('fs');

let code = fs.readFileSync('/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/RequestBox.jsx', 'utf8');

// Ensure writeBatch is imported
if (!code.includes('writeBatch')) {
    code = code.replace("updateDoc, orderBy }", "updateDoc, orderBy, writeBatch }");
}

const fetchNotifStr = `        const qNotif = query(collection(db, 'notifications'), where('adminId', '==', user.uid));
        const snapNotif = await getDocs(qNotif);
        snapNotif.forEach(d => {
          results.push({ id: d.id, ...d.data(), source: 'notification' });
        });`;

const newFetchNotifStr = `        const qNotif = query(collection(db, 'notifications'), where('adminId', '==', user.uid));
        const snapNotif = await getDocs(qNotif);
        const batch = writeBatch(db);
        let hasUpdates = false;
        
        snapNotif.forEach(d => {
          const data = d.data();
          
          // Auto-resolve pure informational notifications so they stop showing in the badge count
          if (data.resolved === false && data.type !== 'Attendance_Review' && data.action !== 'VIEW_TENANTS') {
              batch.update(d.ref, { resolved: true });
              hasUpdates = true;
          }
          
          results.push({ id: d.id, ...data, source: 'notification' });
        });
        
        if (hasUpdates) {
            batch.commit().catch(e => console.error("Failed to auto-resolve notifications", e));
        }`;

code = code.replace(fetchNotifStr, newFetchNotifStr);
fs.writeFileSync('/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/RequestBox.jsx', code);
