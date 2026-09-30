const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/MeterReading.jsx";
let content = fs.readFileSync(file, 'utf8');

// I will add a debug array state
content = content.replace(
  "const [availableRooms, setAvailableRooms] = useState([]);",
  "const [availableRooms, setAvailableRooms] = useState([]);\n  const [debugTenants, setDebugTenants] = useState([]);"
);

// I will populate the debug array inside fetchData
content = content.replace(
  "      const tenantsByRoom = {};",
  "      const tenantsByRoom = {};\n      const debugList = [];"
);

content = content.replace(
  "      tenantsSnap.forEach(d => {",
  "      tenantsSnap.forEach(d => {\n        const raw = d.data();\n        debugList.push({ id: d.id, name: raw.name, roomNo: raw.roomNo, room: raw.room, status: raw.status });"
);

content = content.replace(
  "      setAvailableRooms(",
  "      setDebugTenants(debugList);\n      setAvailableRooms("
);

// I will render the debugList at the very bottom
content = content.replace(
  "      {/* FAB */}",
  `      {/* DEBUG SECTION */}
      <div style={{ margin: 16, padding: 16, background: 'white', borderRadius: 12, border: '1px dashed red' }}>
        <h4 style={{ margin: '0 0 8px', color: 'red' }}>Debug: All Tenants in PG</h4>
        {debugTenants.map(t => (
          <div key={t.id} style={{ fontSize: 12, borderBottom: '1px solid #eee', padding: '4px 0' }}>
            {t.name} — Room: '{String(t.roomNo || t.room)}' — Status: '{t.status}'
          </div>
        ))}
      </div>
      
      {/* FAB */}`
);

fs.writeFileSync(file, content);
console.log("Debug injected");
