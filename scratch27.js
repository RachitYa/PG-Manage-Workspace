const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/febebo-staff/src/pages/StaffApp.jsx";
let content = fs.readFileSync(file, 'utf8');

const targetEnd = `            </div>
          </div>
        </div>
      )}`;

const replacement = `            </div>
          </div>

          <button 
            onClick={logout} 
            style={{marginTop:16, width:'100%', padding:'16px', background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:18, display:'flex', alignItems:'center', justifyContent:'center', gap:8, cursor:'pointer', color:'#991b1b', fontSize:16, fontWeight:800, fontFamily:'inherit', boxShadow:'0 4px 12px rgba(239, 68, 68, 0.1)'}}
          >
            <span className="material-symbols-outlined" style={{fontSize:22}}>logout</span>
            Sign Out securely
          </button>
        </div>
      )}`;

let idx = content.lastIndexOf(targetEnd);
if (idx !== -1) {
  content = content.substring(0, idx) + replacement + content.substring(idx + targetEnd.length);
  fs.writeFileSync(file, content);
  console.log("Success");
} else {
  console.log("Target not found");
}
