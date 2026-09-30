import re

with open('src/pages/ManageRooms.jsx', 'r') as f:
    content = f.read()

# 1. Add pgRents state
if "const [pgRents, setPgRents] = useState([]);" not in content:
    content = content.replace(
        "const [loading, setLoading] = useState(true);",
        "const [loading, setLoading] = useState(true);\n  const [pgRents, setPgRents] = useState([]);"
    )

# 2. Extract rents in fetchData
FETCH_REPLACE = """        setPgStats({
          totalSeats: parseInt(pd.totalSeats) || 0,
          totalRooms: parseInt(pd.totalRooms) || 0
        });
        if (pd.rents) setPgRents(pd.rents);"""

content = content.replace("""        setPgStats({
          totalSeats: parseInt(pd.totalSeats) || 0,
          totalRooms: parseInt(pd.totalRooms) || 0
        });""", FETCH_REPLACE)

# 3. Add seaterType and roomRent states (replacing roomBeds and bedNumbers conceptually, though we can just reuse roomBeds for the seater value and add roomRent)
STATES_REPLACE = """  const [roomNo, setRoomNo] = useState('');
  const [seaterType, setSeaterType] = useState('');
  const [roomRent, setRoomRent] = useState('');
  const [roomType, setRoomType] = useState('Non AC Room');"""

content = re.sub(
    r"const \[roomNo, setRoomNo\].*?const \[roomType, setRoomType\] = useState\('Non AC Room'\);",
    STATES_REPLACE,
    content,
    flags=re.DOTALL
)

# 4. Remove bedNumbers check in handleAddRoom
BED_NUMBERS_CHECK = """    if (bedNumbers) {
      const bedsArray = bedNumbers.split(',').map(s => s.trim()).filter(Boolean);
      if (bedsArray.length !== parseInt(roomBeds)) {
        setErrorMsg(`Capacity is ${roomBeds}, but you gave ${bedsArray.length} bed names. Please fix this.`);
        return;
      }
    }"""
content = content.replace(BED_NUMBERS_CHECK, "")

# 5. Modify addDoc in handleAddRoom
ADD_DOC_OLD = """      await addDoc(collection(db, 'rooms'), {
        adminId: user.uid,
        name: roomNo,
        roomNo: roomNo,
        beds: parseInt(roomBeds) || 1,
        roomType: roomType,
        bedNumbers: bedNumbers,
        facilities: selectedFacilities,
        inventory: selectedInventory,
        image: imagePreview || null,
        createdAt: new Date().toISOString()
      });"""

ADD_DOC_NEW = """      await addDoc(collection(db, 'rooms'), {
        adminId: user.uid,
        name: roomNo,
        roomNo: roomNo,
        beds: parseInt(seaterType) || 1,
        seaterLabel: `${seaterType} Seater`,
        price: Number(roomRent) || 0,
        roomType: roomType,
        facilities: selectedFacilities,
        inventory: selectedInventory,
        image: imagePreview || null,
        createdAt: new Date().toISOString()
      });"""

content = content.replace(ADD_DOC_OLD, ADD_DOC_NEW)

# Reset state in handleAddRoom
RESET_STATE_OLD = """      setRoomNo('');
      setRoomBeds(1);
      setRoomType('Non AC Room');
      setBedNumbers('');"""

RESET_STATE_NEW = """      setRoomNo('');
      setSeaterType('');
      setRoomRent('');
      setRoomType('Non AC Room');"""

content = content.replace(RESET_STATE_OLD, RESET_STATE_NEW)


# 6. Replace form fields
FORM_FIELDS_OLD = """            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Number of Beds (Capacity) <span style={{ color: '#e11d48' }}>*</span></label>
              <input type="number" min="1" value={roomBeds} onChange={e => setRoomBeds(e.target.value)} required style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 15, fontFamily: 'inherit', background: 'white', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Room Type (e.g. AC / Non-AC) <span style={{ color: '#e11d48' }}>*</span></label>
              <select value={roomType} onChange={e => setRoomType(e.target.value)} required style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 15, fontFamily: 'inherit', background: 'white', outline: 'none', boxSizing: 'border-box' }}>
                <option value="Non AC Room">Non AC Room</option>
                <option value="AC Room">AC Room</option>
                <option value="Cooler Room">Cooler Room</option>
                <option value="Standard Room">Standard Room</option>
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Bed Numbers (e.g. 1, 2, 3 or A, B, C)</label>
              <input value={bedNumbers} onChange={e => setBedNumbers(e.target.value)} placeholder="Comma separated, optional" style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 15, fontFamily: 'inherit', background: 'white', outline: 'none', boxSizing: 'border-box' }} />
            </div>"""

FORM_FIELDS_NEW = """            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Seater Type <span style={{ color: '#e11d48' }}>*</span></label>
              <select value={seaterType} onChange={e => {
                const val = e.target.value;
                setSeaterType(val);
                const selectedRentObj = pgRents.find(r => String(r.seater) === String(val));
                if (selectedRentObj) {
                  setRoomRent(selectedRentObj.rent);
                } else {
                  setRoomRent('');
                }
              }} required style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 15, fontFamily: 'inherit', background: 'white', outline: 'none', boxSizing: 'border-box' }}>
                <option value="">Select Seater Type</option>
                {pgRents.map((r, i) => (
                  <option key={i} value={r.seater}>{r.seater} Seater</option>
                ))}
              </select>
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Price <span style={{ color: '#e11d48' }}>*</span></label>
              <input type="number" value={roomRent} readOnly placeholder="Auto-filled from PG Registration" style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 15, fontFamily: 'inherit', background: '#f8fafc', color: '#475569', outline: 'none', boxSizing: 'border-box', cursor: 'not-allowed' }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Room Type (e.g. AC / Non-AC) <span style={{ color: '#e11d48' }}>*</span></label>
              <select value={roomType} onChange={e => setRoomType(e.target.value)} required style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 15, fontFamily: 'inherit', background: 'white', outline: 'none', boxSizing: 'border-box' }}>
                <option value="Non AC Room">Non AC Room</option>
                <option value="AC Room">AC Room</option>
                <option value="Cooler Room">Cooler Room</option>
                <option value="Standard Room">Standard Room</option>
              </select>
            </div>"""

content = content.replace(FORM_FIELDS_OLD, FORM_FIELDS_NEW)

with open('src/pages/ManageRooms.jsx', 'w') as f:
    f.write(content)

print("Modified ManageRooms.jsx")
