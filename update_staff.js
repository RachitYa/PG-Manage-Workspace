const fs = require('fs');
const file = '/Users/shreyassingh/Downloads/PG MANAGE @/febebo-staff/src/pages/StaffApp.jsx';
let content = fs.readFileSync(file, 'utf8');

// Add Scanner import
if (!content.includes("import { Scanner }")) {
  content = content.replace("import { auth, db }", "import { Scanner } from '@yudiel/react-qr-scanner';\nimport { auth, db }");
}

// Add state for scan and manual
if (!content.includes("const [showScan, setShowScan] = useState(false);")) {
content = content.replace(
  "const [students,setStudents]  = useState([]);",
  `const [students,setStudents]  = useState([]);
  const [showScan, setShowScan] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [activeMeal, setActiveMeal] = useState('');
  
  // get today meal based on hour
  useEffect(() => {
    const hr = new Date().getHours();
    if (hr >= 5 && hr < 11) setActiveMeal('breakfast');
    else if (hr >= 11 && hr < 16) setActiveMeal('lunch');
    else if (hr >= 16 && hr < 19) setActiveMeal('snacks');
    else setActiveMeal('dinner');
  }, []);

  const markMealEaten = async (uid, meal) => {
    if (!user?.ownerUid) return;
    try {
      const todayStr = getTodayStr2(); 
      const docRef = doc(db, 'mess_headcount', \`\${user.ownerUid}_\${todayStr}\`);
      await setDoc(docRef, { [\`\${uid}_\${meal}_eaten\`]: true }, { merge: true });
      showToast('Marked as Eaten!', 'success');
    } catch (e) {
      console.error(e);
      showToast('Error', 'error');
    }
  };

  function getTodayStr2() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return \`\${yyyy}-\${mm}-\${dd}\`;
  }
`
);
}

if (!content.includes("const [eatenData, setEatenData] = useState({});")) {
content = content.replace(
  "// ─── FIREBASE REALTIME SYNC (Ecosystem Connectivity) ───",
  `const [eatenData, setEatenData] = useState({});
  useEffect(() => {
    if (!user?.ownerUid) return;
    const docRef = doc(db, 'mess_headcount', \`\${user.ownerUid}_\${getTodayStr2()}\`);
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) setEatenData(docSnap.data());
    });
    return () => unsub();
  }, [user]);

  // ─── FIREBASE REALTIME SYNC (Ecosystem Connectivity) ───`
);
}


// Replace the specific Live Headcount Card
const cardRegex = /\{\/\* LIVE MESS HEADCOUNT CARD \*\/\}\n\s*<div style=\{\{background: 'linear-gradient\(135deg, #1e293b, #0f172a\)'[\s\S]*?<\/div>\n\s*<\/div>/;

content = content.replace(cardRegex, 
`{/* LIVE MESS HEADCOUNT CARD */}
            <div style={{background: 'linear-gradient(135deg, #1e293b, #0f172a)', borderRadius:20, padding:'24px', color:'#fff', boxShadow:'0 10px 25px rgba(15,23,42,0.15)', display:'flex', flexDirection:'column', gap:16, position:'relative', overflow:'hidden', marginBottom:14}}>
               <div style={{position:'absolute', right:-10, bottom:-10, opacity:0.1, pointerEvents:'none'}}>
                  <span className="material-symbols-outlined" style={{fontSize:120}}>group</span>
               </div>
               <div>
                  <div style={{display:'flex', alignItems:'center', gap:8}}>
                     <span style={{position:'relative', display:'flex', height:10, width:10}}>
                       <span style={{animation:'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite', position:'absolute', display:'inline-flex', height:'100%', width:'100%', borderRadius:'50%', background:'#ef4444', opacity:0.75}}></span>
                       <span style={{position:'relative', display:'inline-flex', borderRadius:'50%', height:10, width:10, background:'#dc2626'}}></span>
                     </span>
                     <span style={{fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:'#f8fafc'}}>Live Headcount</span>
                  </div>
                  <h3 style={{margin:'6px 0 0', fontSize:18, fontWeight:900, color:'#f8fafc'}}>Current Meal Eaten ({activeMeal})</h3>
               </div>
               <div style={{display:'flex', alignItems:'flex-end', gap:12}}>
                  <h1 style={{margin:0, fontSize:56, fontWeight:900, lineHeight:1, color:'#fde047'}}>
                    {Object.keys(eatenData).filter(k => k.includes(\`_\${activeMeal}_eaten\`)).length}
                  </h1>
               </div>

               <div style={{display:'flex', gap:12, marginTop:8, position:'relative', zIndex:1}}>
                  <button onClick={() => setShowScan(true)} style={{flex:1, background: '#10b981', color:'white', border:'none', padding:'12px', borderRadius:'14px', fontSize:14, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6, boxShadow:'0 4px 12px rgba(16,185,129,0.3)'}}>
                     <span className="material-symbols-outlined" style={{fontSize:20}}>qr_code_scanner</span> Scan QR
                  </button>
                  <button onClick={() => setShowManual(true)} style={{flex:1, background: 'rgba(255,255,255,0.1)', color:'white', border:'1px solid rgba(255,255,255,0.2)', padding:'12px', borderRadius:'14px', fontSize:14, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6}}>
                     <span className="material-symbols-outlined" style={{fontSize:20}}>list_alt</span> Select Manually
                  </button>
               </div>
            </div>`
);


if (!content.includes("{/* Scanner Modal */}")) {
// Add Modals
content = content.replace(
  /<\/div>\n\s*\);\n\}\n$/,
  `      {/* Scanner Modal */}
      {showScan && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'black', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.5)', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
            <h3 style={{ margin: 0, color: 'white', fontSize: '18px' }}>Scan Meal Pass</h3>
            <button onClick={() => setShowScan(false)} style={{ background: 'white', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
            </button>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'black' }}>
            <div style={{ width: '100%', maxWidth: '400px' }}>
              <Scanner
                onScan={(result) => {
                  if (result && result.length > 0) {
                    const text = result[0].rawValue;
                    if (text && text.startsWith('MEALPASS')) {
                      const parts = text.split('|');
                      const meal = parts[1];
                      const uid = parts[2];
                      markMealEaten(uid, meal);
                      setShowScan(false);
                    } else {
                      showToast('Invalid QR Code', 'error');
                    }
                  }
                }}
                onError={(error) => console.log(error)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Manual Selection Modal */}
      {showManual && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#f8fafc', borderRadius: '24px', width: '90%', maxWidth: '400px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
            
            <div style={{ padding: '20px', background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
                {selectedRoom ? \`Room \${selectedRoom}\` : 'Select Room'}
              </h3>
              <button onClick={() => { if(selectedRoom) setSelectedRoom(null); else setShowManual(false); }} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  {selectedRoom ? 'arrow_back' : 'close'}
                </span>
              </button>
            </div>

            <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
              {!selectedRoom ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  {Array.from(new Set(students.map(s => s.room))).filter(Boolean).sort().map(room => (
                    <button key={room} onClick={() => setSelectedRoom(room)} style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '16px 0', fontSize: '18px', fontWeight: '800', color: '#0f172a', cursor: 'pointer' }}>
                      {room}
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {students.filter(s => s.room === selectedRoom).map(s => {
                    const eaten = eatenData[\`\${s.id}_\${activeMeal}_eaten\`];
                    return (
                      <div key={s.id} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b' }}>{s.name}</div>
                          <div style={{ fontSize: '13px', color: '#64748b' }}>Room {s.room}</div>
                        </div>
                        {eaten ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontSize: '14px', fontWeight: '800', background: '#dcfce7', padding: '8px 12px', borderRadius: '12px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
                            Eaten
                          </div>
                        ) : (
                          <button onClick={() => markMealEaten(s.id, activeMeal)} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155', padding: '8px 16px', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                            Mark Eaten
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
`
);
}

fs.writeFileSync(file, content, 'utf8');
