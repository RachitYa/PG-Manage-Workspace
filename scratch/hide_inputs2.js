const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/MeterReading.jsx";
let content = fs.readFileSync(file, 'utf8');

// Hide inputs in the map
content = content.replace(
  /<div style=\{\{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 \}\}>\s*<input \s*type="text" \s*placeholder="Current"[\s\S]*?<\/button>\s*\)\}\s*<\/div>/g,
  `{meter.isAddingReading ? (
                        <>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                            <input 
                              type="text" 
                              placeholder="Current" 
                              value={meter.currReading}
                              onChange={(e) => handleReadingChange(meter.id, 'currReading', e.target.value)}
                              style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }}
                            />
                            <button onClick={() => setMeters(meters.map(m => m.id === meter.id ? {...m, isAddingReading: false, currReading: ''} : m))} style={{ background: '#f1f5f9', color: '#64748b', border: 'none', padding: '10px 14px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
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
                        </>
                      ) : (
                        <div style={{ marginTop: 12 }}>
                          <button onClick={() => setMeters(meters.map(m => m.id === meter.id ? {...m, isAddingReading: true} : m))} style={{ padding: '8px 12px', borderRadius: 8, border: '1px dashed #0891b2', color: '#0891b2', background: 'rgba(8,145,178,0.05)', cursor: 'pointer', fontSize: 13, fontWeight: 600, width: '100%' }}>+ Add Reading</button>
                        </div>
                      )}`
);

fs.writeFileSync(file, content);
console.log("Updated meter card to hide inputs properly");
