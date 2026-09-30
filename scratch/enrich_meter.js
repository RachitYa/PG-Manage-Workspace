const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/MeterReading.jsx";
let content = fs.readFileSync(file, 'utf8');

const target1 = `      const tenantsByRoom = {};
      tenantsSnap.forEach(d => {
        const t   = d.data();`;

const replacement1 = `      // Fetch user docs to enrich tenants (just like ManageTenants)
      const usersSnap = await getDocs(query(collection(db, 'users')));
      const usersMap = {};
      usersSnap.forEach(u => { usersMap[u.id] = u.data(); });

      const tenantsByRoom = {};
      tenantsSnap.forEach(d => {
        const t = { id: d.id, ...d.data() };
        const uData = usersMap[t.tenantId || t.id];
        
        if (uData) {
          if (!t.roomNo) t.roomNo = uData.subscribedPG?.roomNo || '';
          if (t.meterReadingAtJoin === undefined || t.meterReadingAtJoin === null || t.meterReadingAtJoin === '') {
             t.meterReadingAtJoin = uData.subscribedPG?.meterReadingAtJoin !== undefined ? uData.subscribedPG.meterReadingAtJoin : (t.meterReading || 0);
          }
          if (!t.status) t.status = uData.status || 'Current User';
        }`;

content = content.replace(target1, replacement1);

fs.writeFileSync(file, content);
console.log("Enrichment logic injected");
