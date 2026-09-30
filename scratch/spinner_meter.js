const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/MeterReading.jsx";
let content = fs.readFileSync(file, 'utf8');

// Add state
content = content.replace(
  /const \[newMeter, setNewMeter\] = useState/g,
  `const [isAdding, setIsAdding] = useState(false);\n  const [newMeter, setNewMeter] = useState`
);

// Update handleAddMeter
content = content.replace(
  /const handleAddMeter = async \(\) => {/g,
  `const handleAddMeter = async () => {
    setIsAdding(true);`
);
content = content.replace(
  /alert\('Failed to add meter'\);\n\s*}/g,
  `alert('Failed to add meter');\n    }\n    setIsAdding(false);`
);
content = content.replace(
  /fetchData\(\); \/\/ Refresh list/g,
  `fetchData(); // Refresh list\n      setIsAdding(false);`
);

// Update button UI
content = content.replace(
  /<button onClick=\{handleAddMeter\}.*?>Add Meter<\/button>/g,
  `<button onClick={handleAddMeter} disabled={!newMeter.roomName || !newMeter.initialReading || isAdding} style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: (!newMeter.roomName || !newMeter.initialReading) ? '#cbd5e1' : '#0891b2', color: 'white', fontSize: '1rem', fontWeight: 600, cursor: (!newMeter.roomName || !newMeter.initialReading || isAdding) ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {isAdding ? <div style={{ width: 20, height: 20, border: '3px solid rgba(255,255,255,0.3)', borderTop: '3px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> : 'Add Meter'}
            </button>`
);

fs.writeFileSync(file, content);
console.log("Added spinner");
