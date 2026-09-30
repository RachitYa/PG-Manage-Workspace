const fs = require('fs');
let content = fs.readFileSync('Febebo-admin/src/components/DetailedReceiptModal.jsx', 'utf8');

// 1. Add fetch for meter_bills
const importToReplace = `import React, { useState, useEffect } from 'react';`;
const newImport = `import React, { useState, useEffect } from 'react';\nimport { collection, query, where, getDocs } from 'firebase/firestore';\nimport { db } from '../firebase';`;
content = content.replace(importToReplace, newImport);

const stateToReplace = `  const [imgFullscreen, setImgFullscreen] = useState(false);\n  const [isPrinting, setIsPrinting] = useState(false);`;
const newState = `  const [imgFullscreen, setImgFullscreen] = useState(false);\n  const [isPrinting, setIsPrinting] = useState(false);\n  const [meterBill, setMeterBill] = useState(null);`;
content = content.replace(stateToReplace, newState);

const effectToReplace = `  useEffect(() => {
    const handleAfterPrint = () => setIsPrinting(false);
    
    // In some mobile browsers, focus/resume might be the only way to know we returned
    const handleFocus = () => {
      if (isPrinting) setIsPrinting(false);
    };

    window.addEventListener('afterprint', handleAfterPrint);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isPrinting]);`;
const newEffect = `  useEffect(() => {
    const handleAfterPrint = () => setIsPrinting(false);
    const handleFocus = () => { if (isPrinting) setIsPrinting(false); };
    window.addEventListener('afterprint', handleAfterPrint);
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isPrinting]);

  useEffect(() => {
    if (!receipt || !receipt.id) return;
    const fetchMeter = async () => {
      try {
        const tId = receipt.tenantId || receipt.userId || receipt.tenant?.uid || receipt.tenant?.id;
        const m = receipt.month || receipt.rentMonth || receipt.billMonth;
        if (!tId || !m) return;
        const q = query(collection(db, 'meter_bills'), where('tenantId', '==', tId), where('billMonth', '==', m));
        const snap = await getDocs(q);
        if (!snap.empty) {
           setMeterBill(snap.docs[0].data());
        }
      } catch(e) {}
    };
    fetchMeter();
  }, [receipt]);`;
content = content.replace(effectToReplace, newEffect);

// 2. Rewrite items array in View mode
const itemsRegex = /\/\/ Build items list[\s\S]*?\} else \{\s*items\.push\(\{\s*label: receipt\.name\?\.includes\('Payment'\) \? receipt\.name : 'Payment',\s*amount: receipt\.amountPaid \|\| receipt\.amount \|\| receipt\.totalAmount \|\| 0\s*\}\);\s*\}\s*\}/;
const newItemsStr = `// Build items list
  let items = [
    { label: 'Room Rent',      amount: receipt.items?.find(i => i.label === 'Room Rent')?.amount || receipt.rent || 0 },
    { label: 'Meter Charges',  amount: receipt.items?.find(i => i.label === 'Meter Unit' || i.label === 'Meter Charges')?.amount || receipt.meterAmt || receipt.meter || 0 },
    { label: 'Food Charge',    amount: receipt.items?.find(i => i.label === 'Food Charge')?.amount || receipt.foodAmt || receipt.food || 0 },
    { label: 'Extra Plates',   amount: receipt.items?.find(i => i.label === 'Extra Plates')?.amount || receipt.extraPlates || 0 },
    { label: 'Amenities',      amount: receipt.items?.find(i => i.label === 'Amenities')?.amount || receipt.amenities || 0 },
    { label: 'Laundry',        amount: receipt.items?.find(i => i.label === 'Laundry')?.amount || receipt.laundry || 0 },
    { label: 'House Keeping',  amount: receipt.items?.find(i => i.label === 'House Keeping')?.amount || receipt.housekeeping || 0 },
    { label: 'Fines',          amount: receipt.items?.find(i => i.label === 'Fines')?.amount || receipt.fine || receipt.fines || 0 },
    { label: 'Other Charges',  amount: receipt.items?.find(i => i.label === 'Other Charges')?.amount || receipt.other || 0 }
  ];`;
content = content.replace(itemsRegex, newItemsStr);

// 3. Render Meter details in View mode
const breakdownRegex = /<div style=\{\{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 \}\}>[\s\S]*?<\/div>\s*\)\}/;
const newBreakdown = `<div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
                {items.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: '#334155', fontWeight: 500 }}>{item.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', fontFamily: "'JetBrains Mono', monospace" }}>₹{Number(item.amount || 0).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            )}

            {meterBill && (
              <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 8, marginBottom: 16, border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 8px', borderBottom: '1px solid #e2e8f0', paddingBottom: 6 }}>Meter Reading</p>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>Previous Reading</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{meterBill.meterReadingAtBillStart}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>Current Reading</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{meterBill.meterReadingAtBillEnd}</span>
                </div>
                
                <div style={{ borderTop: '1px dashed #cbd5e1', margin: '6px 0' }} />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>Total Room Bill ({(meterBill.meterReadingAtBillEnd - meterBill.meterReadingAtBillStart).toFixed(2)} units)</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>₹{((meterBill.meterReadingAtBillEnd - meterBill.meterReadingAtBillStart) * (meterBill.ratePerUnit || 8)).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: '#0891b2', fontWeight: 700 }}>Tenant Share ({meterBill.consumedUnits} units)</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#0891b2' }}>₹{Number(meterBill.totalAmount).toFixed(2)}</span>
                </div>
              </div>
            )}`;
content = content.replace(breakdownRegex, newBreakdown);

// 4. Update Fill mode
const fillStatesRegex = /const \[housekeeping, setHousekeeping\] = useState\(dueData\?\.housekeeping \|\| ''\);/;
const newFillStates = `const [housekeeping, setHousekeeping] = useState(dueData?.housekeeping || '');\n  const [extraPlates, setExtraPlates] = useState(dueData?.extraPlates || '');\n  const [fine, setFine] = useState(dueData?.fine || '');`;
content = content.replace(fillStatesRegex, newFillStates);

const sumRegex = /Number\(rent \|\| 0\) \+ Number\(meter \|\| 0\) \+ Number\(food \|\| 0\) \+ Number\(amenities \|\| 0\) \+ Number\(laundry \|\| 0\) \+ Number\(housekeeping \|\| 0\) \+ Number\(other \|\| 0\)/;
const newSum = `Number(rent || 0) + Number(meter || 0) + Number(food || 0) + Number(extraPlates || 0) + Number(amenities || 0) + Number(laundry || 0) + Number(housekeeping || 0) + Number(fine || 0) + Number(other || 0)`;
content = content.replace(sumRegex, newSum);

const submitItemsRegex = /\{ label: 'House Keeping', amount: parseFloat\(housekeeping\) \|\| 0 \},/;
const newSubmitItems = `{ label: 'House Keeping', amount: parseFloat(housekeeping) || 0 },
        { label: 'Extra Plates',  amount: parseFloat(extraPlates) || 0 },
        { label: 'Fines',         amount: parseFloat(fine) || 0 },`;
content = content.replace(submitItemsRegex, newSubmitItems);

const gridRegex = /\{\[\['Room Rent', rent, setRent\], \['Meter Unit', meter, setMeter\], \['Food Charge', food, setFood\], \['Amenities', amenities, setAmenities\], \['Laundry', laundry, setLaundry\], \['House Keeping', housekeeping, setHousekeeping\]\]\.map\(\(\[label, val, setter\]\) => \(/;
const newGrid = `{[['Room Rent', rent, setRent], ['Meter Unit', meter, setMeter], ['Food Charge', food, setFood], ['Extra Plates', extraPlates, setExtraPlates], ['Amenities', amenities, setAmenities], ['Laundry', laundry, setLaundry], ['House Keeping', housekeeping, setHousekeeping], ['Fines', fine, setFine]].map(([label, val, setter]) => (`;
content = content.replace(gridRegex, newGrid);

fs.writeFileSync('Febebo-admin/src/components/DetailedReceiptModal.jsx', content);
console.log('Fixed DetailedReceiptModal');
