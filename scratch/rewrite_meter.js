const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/MeterReading.jsx";
let content = fs.readFileSync(file, 'utf8');

// Update fetchData
content = content.replace(
  /tenantsByRoom\[rKey\]\.push\(t\.name\);/g,
  `tenantsByRoom[rKey].push({ name: t.name, dateOfJoining: t.dateOfJoining });`
);

content = content.replace(
  /tempPrev: m\.prevReading \|\| 0\n\s*};/g,
  `tempPrev: m.prevReading || 0,
          prevReadingDate: m.prevReadingDate || m.dateAdded || new Date().toISOString(),
          readingDate: new Date().toISOString().split('T')[0],
          ratePerUnit: mSettings?.rate || 8.5
        };`
);
content = content.replace(/const mSettings = settingsDoc\.data\(\)\.meterSettings;/g, `const mSettings = settingsDoc.data().meterSettings; window.tempMSettings = mSettings;`);
content = content.replace(/ratePerUnit: mSettings\?\.rate \|\| 8\.5/g, `ratePerUnit: (window.tempMSettings && window.tempMSettings.rate) ? window.tempMSettings.rate : 8.5`);


// Update handleGenerateSingleBill
content = content.replace(
  /const handleGenerateSingleBill = async \(m\) => {[\s\S]*?setShowSuccess\(true\);\n\s*\} catch\(e\) {/m,
  `const handleGenerateSingleBill = async (m) => {
    if (!user?.uid || !m.currReading || Number(m.currReading) < m.prevReading) return;
    try {
      const units = Number(m.currReading) - m.prevReading;
      const totalBillAmount = units * Number(m.ratePerUnit) + fixedCharge;
      
      const readingDateIso = new Date(m.readingDate).toISOString();
      const prevDateObj = new Date(m.prevReadingDate);
      
      // Calculate tenant proportions
      let totalTenantDays = 0;
      const tenantProportions = m.tenants.map(t => {
         const joinDate = new Date(t.dateOfJoining || m.prevReadingDate);
         const startDate = joinDate > prevDateObj ? joinDate : prevDateObj;
         const days = Math.max(0, (new Date(m.readingDate) - startDate) / (1000 * 60 * 60 * 24));
         totalTenantDays += days;
         return { name: t.name, days };
      });
      
      let tenantSplits = [];
      if (totalTenantDays > 0) {
         tenantSplits = tenantProportions.map(t => ({
            name: t.name,
            days: t.days,
            amount: (t.days / totalTenantDays) * totalBillAmount
         }));
      } else {
         if (m.tenants.length > 0) {
            const split = totalBillAmount / m.tenants.length;
            tenantSplits = m.tenants.map(t => ({ name: t.name, days: 0, amount: split }));
         }
      }

      await addDoc(collection(db, 'meter_bills'), {
        adminId: user.uid,
        meterId: m.id,
        roomName: m.roomName,
        prevReading: m.prevReading,
        currReading: Number(m.currReading),
        billAmount: totalBillAmount,
        ratePerUnit: Number(m.ratePerUnit),
        fixedCharge: fixedCharge,
        date: readingDateIso,
        tenantSplits
      });

      await updateDoc(doc(db, 'meters', m.id), {
        prevReading: Number(m.currReading),
        prevReadingDate: readingDateIso
      });
      
      setMeters(meters.map(meter => meter.id === m.id ? { ...meter, prevReading: Number(m.currReading), prevReadingDate: readingDateIso, currReading: '', tempPrev: Number(m.currReading) } : meter));
      
      setShowSuccess(true);
    } catch(e) {`
);


fs.writeFileSync(file, content);
console.log('Done replacement');
