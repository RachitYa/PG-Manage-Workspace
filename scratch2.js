const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/Chat.jsx";
let content = fs.readFileSync(file, 'utf8');

const sendDetailsBtn = `
              <button 
                onClick={() => setShowRoomDetailsModal(true)}
                style={{ flex: 1, minWidth: '30%', padding: '10px 8px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 12, fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, boxShadow: '0 4px 12px rgba(37,99,235,0.15)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>bed</span>
                Send Details
              </button>
            </div>
`;

content = content.replace("              )}\n            </div>", "              )}\n" + sendDetailsBtn);
fs.writeFileSync(file, content);
