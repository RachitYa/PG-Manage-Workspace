const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/MeterReading.jsx";
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "const [availableRooms, setAvailableRooms] = useState([]);\n  const [debugTenants, setDebugTenants] = useState([]);",
  "const [availableRooms, setAvailableRooms] = useState([]);"
);

content = content.replace(
  "      const tenantsByRoom = {};\n      const debugList = [];",
  "      const tenantsByRoom = {};"
);

content = content.replace(
  "      tenantsSnap.forEach(d => {\n        const raw = d.data();\n        debugList.push({ id: d.id, name: raw.name, roomNo: raw.roomNo, room: raw.room, status: raw.status });",
  "      tenantsSnap.forEach(d => {"
);

content = content.replace(
  "      setDebugTenants(debugList);\n      setAvailableRooms(",
  "      setAvailableRooms("
);

const DEBUG_SECTION = `      {/* DEBUG SECTION */}
      <div style={{ margin: 16, padding: 16, background: 'white', borderRadius: 12, border: '1px dashed red' }}>
        <h4 style={{ margin: '0 0 8px', color: 'red' }}>Debug: All Tenants in PG</h4>
        {debugTenants.map(t => (
          <div key={t.id} style={{ fontSize: 12, borderBottom: '1px solid #eee', padding: '4px 0' }}>
            {t.name} — Room: '{String(t.roomNo || t.room)}' — Status: '{t.status}'
          </div>
        ))}
      </div>
      
      {/* FAB */}`;

content = content.replace(DEBUG_SECTION, "      {/* FAB */}");

fs.writeFileSync(file, content);
console.log("Debug removed");
