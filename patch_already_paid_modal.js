const fs = require('fs');
const file = '/Users/shreyassingh/Downloads/PG MANAGE @/febebo-app/src/screens/Account.jsx';
let content = fs.readFileSync(file, 'utf8');

// Add rentAlreadyPaid state
content = content.replace(
  "const [rentSuccess, setRentSuccess] = useState(false);",
  "const [rentSuccess, setRentSuccess] = useState(false);\n  const [rentAlreadyPaid, setRentAlreadyPaid] = useState(false);"
);

// Update handlePayRentClick
content = content.replace(
  /if \(isPaidThisMonth\) \{\s*alert\("You already paid this month's rent!"\);\s*return;\s*\}/,
  `if (isPaidThisMonth) {
      setRentAlreadyPaid(true);
      return;
    }`
);

// Add modal JSX right after rentSuccess modal
const alreadyPaidJSX = `
      {/* Rent Already Paid Modal */}
      {rentAlreadyPaid && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '24px' }}>
          <div style={{ background: 'white', borderRadius: '24px', padding: '32px 24px', width: '100%', maxWidth: '360px', textAlign: 'center', animation: 'slideUp 0.3s ease-out' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <CheckCircle2 size={32} color="#16a34a" />
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>Rent Already Paid!</h2>
            <p style={{ margin: '0 0 24px', fontSize: '15px', color: '#64748b', fontWeight: '500', lineHeight: 1.5 }}>
              You have already paid your rent for this month. Thank you!
            </p>
            <button 
              onClick={() => setRentAlreadyPaid(false)}
              style={{ width: '100%', padding: '14px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '15px', cursor: 'pointer' }}
            >
              Okay
            </button>
          </div>
        </div>
      )}
`;

content = content.replace(
  "<style>{'@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }'}</style>",
  alreadyPaidJSX + "\n      <style>{'@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }'}</style>"
);

fs.writeFileSync(file, content, 'utf8');
