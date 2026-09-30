const fs = require('fs');

let code = fs.readFileSync('/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/ManageAccount.jsx', 'utf8');

const targetStr = `            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {loadingRents ? (`;

const sumLogic = `
            {!loadingRents && rentData[rentTab].length > 0 && (
               <div style={{ background: '#f8fafc', padding: '16px', borderRadius: 12, marginBottom: 16, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#475569' }}>Total {activeTab.label}</span>
                  <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 22, fontWeight: 800, color: activeTab.color }}>
                     ₹{rentData[rentTab].reduce((acc, curr) => acc + (parseInt(String(curr.amount).replace(/,/g, '')) || 0), 0).toLocaleString('en-IN')}
                  </span>
               </div>
            )}
`;

const newStr = sumLogic + "\n" + targetStr;

code = code.replace(targetStr, newStr);

fs.writeFileSync('/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/ManageAccount.jsx', code);
