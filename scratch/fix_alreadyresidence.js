const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/AlreadyResidence.jsx";
let content = fs.readFileSync(file, 'utf8');

// 1. Add roomMeter state and auto-fetch
content = content.replace(
  `  const [loadingRooms, setLoadingRooms] = useState(true);`,
  `  const [loadingRooms, setLoadingRooms] = useState(true);
  
  // Meter for selected room — used to validate minimum meter reading
  const [roomMeter, setRoomMeter] = useState(null);
  const [fetchingMeter, setFetchingMeter] = useState(false);`
);

// 2. Add useEffect to fetch meter when room is selected
content = content.replace(
  `  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };`,
  `  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // When a room is selected, fetch its meter to know the minimum allowed reading
  useEffect(() => {
    const fetchRoomMeter = async () => {
      if (!formData.selectedRoomId || !user) { setRoomMeter(null); return; }
      const selectedRoom = rooms.find(r => r.id === formData.selectedRoomId);
      if (!selectedRoom) { setRoomMeter(null); return; }
      setFetchingMeter(true);
      try {
        const pgId = activePgId === 'primary' ? user.uid : activePgId;
        const meterSnap = await getDocs(query(
          collection(db, 'meters'),
          where('adminId', '==', user.uid),
          where('pgId',   '==', pgId),
          where('roomName', '==', String(selectedRoom.roomNo))
        ));
        if (!meterSnap.empty) {
          const m = meterSnap.docs[0].data();
          setRoomMeter({ lastReading: Number(m.lastReading || m.setupReading || 0) });
        } else {
          setRoomMeter(null); // no meter set up for this room yet
        }
      } catch(e) { console.error(e); setRoomMeter(null); }
      finally { setFetchingMeter(false); }
    };
    fetchRoomMeter();
  }, [formData.selectedRoomId, rooms, user]);`
);

// 3. Replace the meter reading input block
const OLD_METER_INPUT = `            <div style={styles.inputGroup}>
              <label style={styles.label}>Current Meter Reading</label>
              <input type="number" name="meterReading" value={formData.meterReading} onChange={handleChange} placeholder="e.g. 1500" style={styles.input} />
            </div>`;

const NEW_METER_INPUT = `            <div style={styles.inputGroup}>
              <label style={styles.label}>Room Meter Reading at Time of Joining (kWh)</label>
              {roomMeter !== null && (
                <p style={{ margin: '0 0 6px', fontSize: 12, color: '#0891b2', fontWeight: 600 }}>
                  ⚡ Room's last recorded reading: {roomMeter.lastReading.toLocaleString()} kWh — you must enter ≥ this value
                </p>
              )}
              {roomMeter === null && !fetchingMeter && (
                <p style={{ margin: '0 0 6px', fontSize: 12, color: '#94a3b8' }}>
                  No meter set up for this room yet. Enter today's reading on the physical meter.
                </p>
              )}
              <input 
                type="number" 
                name="meterReading" 
                value={formData.meterReading} 
                min={roomMeter ? roomMeter.lastReading : 0}
                onChange={handleChange} 
                placeholder={roomMeter ? \`Minimum: \${roomMeter.lastReading} kWh\` : "e.g. 1500"} 
                style={{
                  ...styles.input,
                  borderColor: (formData.meterReading && roomMeter && Number(formData.meterReading) < roomMeter.lastReading) ? '#ef4444' : undefined
                }} 
              />
              {formData.meterReading && roomMeter && Number(formData.meterReading) < roomMeter.lastReading && (
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#ef4444', fontWeight: 600 }}>
                  ⚠ Reading cannot be less than {roomMeter.lastReading} kWh (room's last recorded reading)
                </p>
              )}
            </div>`;

content = content.replace(OLD_METER_INPUT, NEW_METER_INPUT);

// 4. Add validation in handleNext (Step 2)
// In AlreadyResidence, the validation is in the 'Next' button click or a specific function.
// Let's check how 'handleNext' or step navigation is implemented.
fs.writeFileSync(file, content);
console.log("AlreadyResidence updated successfully part 1");
