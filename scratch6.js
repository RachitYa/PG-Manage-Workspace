const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/ManageRooms.jsx";
let content = fs.readFileSync(file, 'utf8');

const roomTypeSelect = `            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Room Type (e.g. AC / Non-AC) <span style={{ color: '#e11d48' }}>*</span></label>
              <select value={roomType} onChange={e => setRoomType(e.target.value)} required style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 15, fontFamily: 'inherit', background: 'white', outline: 'none', boxSizing: 'border-box' }}>
                <option value="Non AC Room">Non AC Room</option>
                <option value="AC Room">AC Room</option>
                <option value="Cooler Room">Cooler Room</option>
                <option value="Standard Room">Standard Room</option>
              </select>
            </div>
`;

content = content.replace(
  "            <div style={{ marginBottom: 16 }}>\n              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Bed Numbers (e.g. 1, 2, 3 or A, B, C)</label>",
  roomTypeSelect + "            <div style={{ marginBottom: 16 }}>\n              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Bed Numbers (e.g. 1, 2, 3 or A, B, C)</label>"
);

fs.writeFileSync(file, content);
