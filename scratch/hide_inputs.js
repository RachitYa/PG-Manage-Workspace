const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/MeterReading.jsx";
let content = fs.readFileSync(file, 'utf8');

// 1. Add isAddingReading to mappedMeters
content = content.replace(
  /isPrevEditing: false,/g,
  `isPrevEditing: false, isAddingReading: false,`
);

// 2. Hide Current Reading, Reading Date, and Rate per Unit inputs unless isAddingReading is true
content = content.replace(
  /<div style=\{\{ flex: 1 \}\}>\s*<p style=\{\{ margin: '0 0 6px', fontSize: 13, color: '#64748b', fontWeight: 600 \}\}>Current Reading<\/p>[\s\S]*?<div style=\{\{ padding: '0 20px 20px' \}\}>/g,
  `<div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 6px', fontSize: 13, color: '#64748b', fontWeight: 600 }}>Current Reading</p>
                {m.isAddingReading ? (
                  <input type="number" placeholder="Enter reading" value={m.currReading} onChange={(e) => handleReadingChange(m.id, 'currReading', e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 15, outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }} />
                ) : (
                  <button onClick={() => setMeters(meters.map(meter => meter.id === m.id ? { ...meter, isAddingReading: true } : meter))} style={{ padding: '8px 12px', borderRadius: 8, border: '1px dashed #0891b2', color: '#0891b2', background: 'rgba(8,145,178,0.05)', cursor: 'pointer', fontSize: 13, fontWeight: 600, width: '100%' }}>+ Add Reading</button>
                )}
              </div>
            </div>

            {m.isAddingReading && (
              <>
              <div style={{ padding: '0 20px 16px', display: 'flex', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 6px', fontSize: 13, color: '#64748b', fontWeight: 600 }}>Reading Date</p>
                  <input type="date" value={m.readingDate} onChange={(e) => handleReadingChange(m.id, 'readingDate', e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 6px', fontSize: 13, color: '#64748b', fontWeight: 600 }}>Rate / Unit (₹)</p>
                  <input type="number" step="0.1" value={m.ratePerUnit} onChange={(e) => handleReadingChange(m.id, 'ratePerUnit', e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ padding: '0 20px 20px', display: 'flex', gap: 8 }}>
                <button onClick={() => setMeters(meters.map(meter => meter.id === m.id ? { ...meter, isAddingReading: false, currReading: '' } : meter))} style={{ padding: '12px', borderRadius: 12, border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', flex: 1 }}>Cancel</button>
`
);

// 3. Fix the original Generate Bill button logic
content = content.replace(
  /<button onClick=\{handleGenerateBills\} disabled=\{\!anyFilled\}.*?>/g,
  `<button onClick={handleGenerateBills} disabled={!anyFilled} style={{ display: 'none' }}>` // Hide global button if we want, or leave it.
);
content = content.replace(
  /<button onClick=\{\(\) => handleGenerateSingleBill\(m\)\} disabled=\{\!m\.currReading \|\| Number\(m\.currReading\) < m\.prevReading\} style=\{\{ width: '100%', padding: 12, borderRadius: 12, border: 'none', background: \(\!m\.currReading \|\| Number\(m\.currReading\) < m\.prevReading\) \? '#cbd5e1' : '#0891b2', color: 'white', fontSize: '0.95rem', fontWeight: 600, cursor: \(\!m\.currReading \|\| Number\(m\.currReading\) < m\.prevReading\) \? 'not-allowed' : 'pointer' \}\}>/g,
  `<button onClick={() => handleGenerateSingleBill(m)} disabled={!m.currReading || Number(m.currReading) < m.prevReading} style={{ flex: 2, padding: 12, borderRadius: 12, border: 'none', background: (!m.currReading || Number(m.currReading) < m.prevReading) ? '#cbd5e1' : '#0891b2', color: 'white', fontSize: '0.95rem', fontWeight: 600, cursor: (!m.currReading || Number(m.currReading) < m.prevReading) ? 'not-allowed' : 'pointer' }}>`
);

fs.writeFileSync(file, content);
console.log("Inputs hidden successfully.");
