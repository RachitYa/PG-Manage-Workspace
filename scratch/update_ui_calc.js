const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/MeterReading.jsx";
let content = fs.readFileSync(file, 'utf8');

const oldLogic = `                              const totalBillAmount = units * Number(meter.ratePerUnit || rate) + fixedCharge;
                              const readingDateIso = new Date(meter.readingDate).toISOString();
                              const prevDateObj = new Date(meter.prevReadingDate || new Date());
                              let totalTenantDays = 0;
                              const tenantProportions = meter.tenants.map(t => {
                                 const joinDate = new Date(t.dateOfJoining || prevDateObj);
                                 const startDate = joinDate > prevDateObj ? joinDate : prevDateObj;
                                 const days = Math.max(0, (new Date(meter.readingDate) - startDate) / (1000 * 60 * 60 * 24));
                                 totalTenantDays += days;
                                 return { name: t.name, days, tenantId: t.tenantId };
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
                              ));`;

const newLogic = `                              return meter.tenants.map(t => {
                                 const personalBaseline = t.meterReading > 0 ? t.meterReading : meter.prevReading;
                                 const tUnits = Math.max(0, Number(meter.currReading) - personalBaseline);
                                 const tAmount = tUnits * Number(meter.ratePerUnit || rate);
                                 return (
                                   <div key={t.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 2 }}>
                                     <span>{t.name} ({tUnits} units)</span>
                                     <strong>₹{tAmount.toFixed(2)}</strong>
                                   </div>
                                 );
                              });`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync(file, content);
console.log("Updated UI calculation");
