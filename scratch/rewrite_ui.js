const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/MeterReading.jsx";
let content = fs.readFileSync(file, 'utf8');

// Update state changes for readingDate and ratePerUnit
content = content.replace(
  /const handleReadingChange = \(id, value\) => {[\s\S]*?};/m,
  `const handleReadingChange = (id, field, value) => {
    if (field === 'currReading') {
       value = value.replace(/[^0-9]/g, '');
    }
    setMeters(meters.map(m => m.id === id ? { ...m, [field]: value } : m));
  };`
);

// Update UI rendering for meters
const uiRegex = /<div style={{ flex: 1 }}>\s*<label style={{ display: 'flex'[\s\S]*?<\/div>\s*<\/div>\s*\)\s*\}\)}/m;

const newUI = `<div style={{ flex: 1 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', color: '#64748b', marginBottom: 4 }}>
                        Prev: 
                        {!meter.isPrevEditing ? (
                           <><span style={{fontWeight: 700}}>{meter.prevReading}</span> 
                           <span className="material-symbols-outlined" onClick={() => setMeters(meters.map(m => m.id === meter.id ? {...m, isPrevEditing: true} : m))} style={{ fontSize: 14, cursor: 'pointer', color: '#0891b2' }}>edit</span></>
                        ) : (
                           <div style={{ display: 'flex', gap: 4 }}>
                             <input type="text" value={meter.tempPrev} onChange={(e) => handlePrevReadingChange(meter.id, e.target.value)} style={{ width: 60, padding: 2, border: '1px solid #ccc' }} />
                             <span className="material-symbols-outlined" onClick={() => savePrevReading(meter.id, meter.tempPrev)} style={{ fontSize: 16, cursor: 'pointer', color: '#10b981' }}>check</span>
                           </div>
                        )}
                      </label>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                        <input 
                          type="text" 
                          placeholder="Current" 
                          value={meter.currReading}
                          onChange={(e) => handleReadingChange(meter.id, 'currReading', e.target.value)}
                          style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                         <input
                           type="date"
                           value={meter.readingDate}
                           onChange={(e) => handleReadingChange(meter.id, 'readingDate', e.target.value)}
                           style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.85rem' }}
                         />
                         <input
                           type="number"
                           step="0.1"
                           placeholder="Rate"
                           value={meter.ratePerUnit}
                           onChange={(e) => handleReadingChange(meter.id, 'ratePerUnit', e.target.value)}
                           style={{ width: 60, padding: '8px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.85rem' }}
                         />
                        {isValid && (
                          <button onClick={() => handleGenerateSingleBill(meter)} style={{ background: '#0891b2', color: 'white', border: 'none', padding: '10px 14px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
                            Add
                          </button>
                        )}
                      </div>
                    </div>
                    {isValid && (
                      <div style={{ flex: 1.5, background: '#f8fafc', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Units used: <strong>{units}</strong></p>
                        <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: '#0891b2', fontWeight: 600 }}>Total: ₹{(units * Number(meter.ratePerUnit || rate) + fixedCharge).toFixed(2)}</p>
                        {meter.tenants.length > 0 && (
                          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #e2e8f0' }}>
                            {(() => {
                              const totalBillAmount = units * Number(meter.ratePerUnit || rate) + fixedCharge;
                              const readingDateIso = new Date(meter.readingDate).toISOString();
                              const prevDateObj = new Date(meter.prevReadingDate || new Date());
                              let totalTenantDays = 0;
                              const tenantProportions = meter.tenants.map(t => {
                                 const joinDate = new Date(t.dateOfJoining || prevDateObj);
                                 const startDate = joinDate > prevDateObj ? joinDate : prevDateObj;
                                 const days = Math.max(0, (new Date(meter.readingDate) - startDate) / (1000 * 60 * 60 * 24));
                                 totalTenantDays += days;
                                 return { name: t.name, days };
                              });
                              if (totalTenantDays === 0) {
                                 const split = totalBillAmount / meter.tenants.length;
                                 return meter.tenants.map(t => (
                                   <div key={t.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 2 }}>
                                     <span>{t.name} (0 days)</span>
                                     <strong>₹{split.toFixed(2)}</strong>
                                   </div>
                                 ));
                              }
                              return tenantProportions.map(t => (
                                <div key={t.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 2 }}>
                                  <span>{t.name} ({Math.round(t.days)}d)</span>
                                  <strong>₹{((t.days / totalTenantDays) * totalBillAmount).toFixed(2)}</strong>
                                </div>
                              ));
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}`;

content = content.replace(uiRegex, newUI);

// Fix onChange binding for old function
content = content.replace(/onChange=\{\(e\) => handleReadingChange\(meter\.id, e\.target\.value\)\}/g, "onChange={(e) => handleReadingChange(meter.id, 'currReading', e.target.value)}");

// We need to also update handleGenerateBills to match handleGenerateSingleBill logic
content = content.replace(
  /const handleGenerateBills = async \(\) => {[\s\S]*?alert\('Error generating bills'\);\n\s*\}/m,
  `const handleGenerateBills = async () => {
    if (!user?.uid || !anyFilled) return;
    try {
      for (let m of metersWithReadings) {
        const units = Number(m.currReading) - m.prevReading;
        const totalBillAmount = units * Number(m.ratePerUnit) + fixedCharge;
        
        const readingDateIso = new Date(m.readingDate).toISOString();
        const prevDateObj = new Date(m.prevReadingDate);
        
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
      }
      
      setMeters(meters.map(m => {
        if (m.currReading !== '' && Number(m.currReading) >= m.prevReading) {
          const readingDateIso = new Date(m.readingDate).toISOString();
          return { ...m, prevReading: Number(m.currReading), prevReadingDate: readingDateIso, currReading: '', tempPrev: Number(m.currReading) };
        }
        return m;
      }));
      
      setShowSuccess(true);
    } catch(e) {
      console.error(e);
      alert('Error generating bills');
    }
  }`
);

fs.writeFileSync(file, content);
console.log('UI rewritten');
