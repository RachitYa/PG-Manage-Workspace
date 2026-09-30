const fs = require('fs');
const file = '/Users/shreyassingh/Downloads/PG MANAGE @/febebo-app/src/screens/Food.jsx';
let content = fs.readFileSync(file, 'utf8');

// Add QRCode import
if (!content.includes("import QRCode")) {
  content = content.replace("import { ChevronLeft", "import QRCode from 'react-qr-code';\nimport { ChevronLeft");
}

// Add state for messHeadcount and qrModal
content = content.replace(
  "const [todayRequests, setTodayRequests] = useState(null);",
  "const [todayRequests, setTodayRequests] = useState(null);\n  const [eatenStatus, setEatenStatus] = useState({});\n  const [showQRModal, setShowQRModal] = useState(false);\n  const [activeMealQR, setActiveMealQR] = useState('');"
);

// Add getTodayStr helper
if (!content.includes("function getTodayStr")) {
  content = content.replace(
    "export default function Food() {",
    "function getTodayStr() {\n  const d = new Date();\n  const yyyy = d.getFullYear();\n  const mm = String(d.getMonth() + 1).padStart(2, '0');\n  const dd = String(d.getDate()).padStart(2, '0');\n  return `${yyyy}-${mm}-${dd}`;\n}\n\nexport default function Food() {"
  );
}

// Listen to mess_headcount
content = content.replace(
  "// Listen to Student's specific Food Requests",
  `// Listen to eaten status
    const headcountDocRef = doc(db, 'mess_headcount', \`\${user.subscribedPG.pgId}_\${getTodayStr()}\`);
    const unsubHeadcount = onSnapshot(headcountDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setEatenStatus({
          breakfast: !!data[\`\${user.uid}_breakfast_eaten\`],
          lunch: !!data[\`\${user.uid}_lunch_eaten\`],
          snacks: !!data[\`\${user.uid}_snacks_eaten\`],
          dinner: !!data[\`\${user.uid}_dinner_eaten\`],
        });
      }
    });

    // Listen to Student's specific Food Requests`
);

content = content.replace(
  "unsubReq();",
  "unsubReq();\n      unsubHeadcount();"
);

// Add Generate QR Code button for active meals today
// In the map function where it renders meals: {meals.map(meal => ...
// The meal string is 'Breakfast', 'Lunch', 'Snacks', 'Dinner'
// We will check if it's today (selectedWeeklyDay === currentDayStr)
content = content.replace(
  /<div className="food-item-content">[\s\S]*?<p className="food-item-desc">\{foodItem\}<\/p>\n\s*<\/div>/,
  `<div className="food-item-content" style={{ flex: 1 }}>
                                  <h4 className="food-item-title">{meal}</h4>
                                  <p className="food-item-desc">{foodItem}</p>
                                </div>
                                {selectedWeeklyDay === currentDayStr && (
                                  <div style={{ marginLeft: 'auto' }}>
                                    {eatenStatus[meal.toLowerCase()] ? (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontSize: '13px', fontWeight: '800', background: '#dcfce7', padding: '6px 12px', borderRadius: '12px' }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check_circle</span>
                                        Eaten
                                      </div>
                                    ) : (
                                      <button 
                                        onClick={() => { setActiveMealQR(meal); setShowQRModal(true); }}
                                        style={{ background: '#0f172a', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                                      >
                                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>qr_code</span>
                                        Pass
                                      </button>
                                    )}
                                  </div>
                                )}`
);

// Add Modal JSX at the end of return
content = content.replace(
  /<\/div>\n\s*\);\n\}\n$/,
  `      {/* QR Modal */}
      {showQRModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'white', borderRadius: '24px', padding: '32px 24px', width: '85%', maxWidth: '320px', textAlign: 'center', position: 'relative' }}>
            <button onClick={() => setShowQRModal(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
            </button>
            <h3 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: '900', color: '#0f172a' }}>{activeMealQR} Pass</h3>
            <p style={{ margin: '0 0 24px', fontSize: '14px', color: '#64748b', fontWeight: '500' }}>Show this QR code to the Cook.</p>
            <div style={{ background: 'white', padding: '16px', borderRadius: '16px', border: '2px solid #e2e8f0', display: 'inline-block', marginBottom: '24px' }}>
              <QRCode value={\`MEALPASS|\${activeMealQR.toLowerCase()}|\${user.uid}|\${user.name || 'Student'}|\${user.room || ''}\`} size={200} />
            </div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>{user.name}</div>
            <div style={{ fontSize: '14px', color: '#64748b' }}>Room {user.room}</div>
          </div>
        </div>
      )}
    </div>
  );
}
`
);

fs.writeFileSync(file, content, 'utf8');
