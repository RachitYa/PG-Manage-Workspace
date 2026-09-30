const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/MeterReading.jsx";
let content = fs.readFileSync(file, 'utf8');

// Update state
content = content.replace(
  /const \[newMeter, setNewMeter\] = useState\(\{ roomName: '', initialReading: '', dateAdded: new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\] \}\);/g,
  `const [newMeter, setNewMeter] = useState({ roomName: '', initialReading: '', dateAdded: new Date().toISOString().split('T')[0], ratePerUnit: '' });`
);

// Update handleAddMeter
content = content.replace(
  /const handleAddMeter = async \(\) => {[\s\S]*?fetchData\(\); \/\/ Refresh list/m,
  `const handleAddMeter = async () => {
    if (!newMeter.roomName || !newMeter.initialReading) return;
    try {
      await addDoc(collection(db, 'meters'), {
        adminId: user.uid,
        roomName: newMeter.roomName,
        prevReading: Number(newMeter.initialReading),
        dateAdded: newMeter.dateAdded,
        ratePerUnit: newMeter.ratePerUnit ? Number(newMeter.ratePerUnit) : rate,
        createdAt: Date.now()
      });
      setShowAddMeter(false);
      setNewMeter({ roomName: '', initialReading: '', dateAdded: new Date().toISOString().split('T')[0], ratePerUnit: '' });
      fetchData(); // Refresh list`
);

// Update modal UI
content = content.replace(
  /<div style={{ marginBottom: 24 }}>\s*<label style={{ display: 'block', fontSize: '0.9rem', color: '#64748b', marginBottom: 8 }}>Date Added<\/label>\s*<input type="date" value={newMeter.dateAdded} onChange={\(e\) => setNewMeter\(\{\.\.\.newMeter, dateAdded: e.target.value\}\)} style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }} \/>\s*<\/div>/m,
  `<div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.9rem', color: '#64748b', marginBottom: 8 }}>Date Added</label>
              <input type="date" value={newMeter.dateAdded} onChange={(e) => setNewMeter({...newMeter, dateAdded: e.target.value})} style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: '0.9rem', color: '#64748b', marginBottom: 8 }}>Price Per Unit (Optional)</label>
              <input type="number" step="0.1" placeholder={\`Leave blank to use global default (\${rate})\`} value={newMeter.ratePerUnit} onChange={(e) => setNewMeter({...newMeter, ratePerUnit: e.target.value})} style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }} />
            </div>`
);

// Update mappedMeters (fetchData) ratePerUnit assignment
content = content.replace(
  /ratePerUnit: \(window\.tempMSettings && window\.tempMSettings\.rate\) \? window\.tempMSettings\.rate : 8\.5/g,
  `ratePerUnit: m.ratePerUnit || ((window.tempMSettings && window.tempMSettings.rate) ? window.tempMSettings.rate : 8.5)`
);

fs.writeFileSync(file, content);
console.log("Updated add meter.");
