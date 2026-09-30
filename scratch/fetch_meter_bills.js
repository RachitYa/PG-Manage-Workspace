const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/febebo-app/src/screens/Account.jsx";
let content = fs.readFileSync(file, 'utf8');

// Add state for meter bills
content = content.replace(
  /const \[payments, setPayments\] = useState\(\[\]\);/g,
  `const [payments, setPayments] = useState([]);
  const [meterBills, setMeterBills] = useState([]);
  const [paymentTypeOption, setPaymentTypeOption] = useState('Rent'); // 'Rent' or 'Meter'`
);

// Fetch meter bills
content = content.replace(
  /const unsub = onSnapshot\(q, \(snap\) => \{[\s\S]*?\}\);/m,
  `const unsub = onSnapshot(q, (snap) => {
        const p = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
        p.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        setPayments(p);
      });

      const qMeter = query(collection(db, 'meter_bills'), where('tenantId', '==', user.uid), where('status', '==', 'Unpaid'));
      const unsubMeter = onSnapshot(qMeter, (snap) => {
        const m = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
        setMeterBills(m);
      });`
);

content = content.replace(
  /return \(\) => unsub\(\);/g,
  `return () => { unsub(); unsubMeter && unsubMeter(); };`
);

// Update open modal logic
content = content.replace(
  /setRentAmount\(baseRent\);\n\s*setShowRentModal\(true\);/g,
  `setRentAmount(baseRent);
    setPaymentTypeOption('Rent');
    setShowRentModal(true);`
);

// Update modal UI to include payment type selection
content = content.replace(
  /<div>\s*<label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Rent Amount<\/label>\s*<input type="number" value=\{rentAmount\} readOnly/m,
  `<div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Payment For</label>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                      <button type="button" onClick={() => setPaymentTypeOption('Rent')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: \`1px solid \${paymentTypeOption === 'Rent' ? '#818cf8' : '#e2e8f0'}\`, background: paymentTypeOption === 'Rent' ? '#e0e7ff' : '#f8fafc', color: paymentTypeOption === 'Rent' ? '#4f46e5' : '#64748b', fontWeight: '600' }}>Monthly Rent</button>
                      <button type="button" onClick={() => setPaymentTypeOption('Meter')} disabled={meterBills.length === 0} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: \`1px solid \${paymentTypeOption === 'Meter' ? '#818cf8' : '#e2e8f0'}\`, background: paymentTypeOption === 'Meter' ? '#e0e7ff' : '#f8fafc', color: paymentTypeOption === 'Meter' ? '#4f46e5' : '#64748b', fontWeight: '600', opacity: meterBills.length === 0 ? 0.5 : 1 }}>Meter Bill</button>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>{paymentTypeOption === 'Rent' ? 'Rent Amount' : 'Meter Bill Amount'}</label>
                    <input type="number" value={paymentTypeOption === 'Rent' ? rentAmount : meterBills.reduce((acc, b) => acc + (b.totalAmount || 0), 0)} readOnly`
);

// Update submit logic
content = content.replace(
  /const paymentObj = \{\s*amount: Number\(rentAmount\),\s*date: new Date\(\)\.toLocaleDateString\('en-US', \{ day: 'numeric', month: 'short', year: 'numeric' \}\),\s*name: 'Monthly Rent Payment',\s*paymentMode: rentMode,\s*paymentType: 'monthly_rent',/m,
  `const isMeter = paymentTypeOption === 'Meter';
      const actualAmt = isMeter ? meterBills.reduce((acc, b) => acc + (b.totalAmount || 0), 0) : Number(rentAmount);
      
      const paymentObj = {
        amount: actualAmt,
        date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
        name: isMeter ? 'Meter Bill Payment' : 'Monthly Rent Payment',
        paymentMode: rentMode,
        paymentType: isMeter ? 'meter_bill' : 'monthly_rent',`
);

content = content.replace(
  /await addDoc\(collection\(db, 'tenant_payments'\), paymentObj\);[\s\S]*?setRentSuccess\(true\);/m,
  `const docRef = await addDoc(collection(db, 'tenant_payments'), paymentObj);
      
      if (isMeter) {
        for (const mb of meterBills) {
          await updateDoc(doc(db, 'meter_bills', mb.docId), {
            status: 'Pending Verification',
            paymentId: docRef.id
          });
        }
      }
      
      setRentSuccess(true);`
);


fs.writeFileSync(file, content);
console.log("Account.jsx updated for meter payments.");
