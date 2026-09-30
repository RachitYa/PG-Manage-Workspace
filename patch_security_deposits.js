const fs = require('fs');

let code = fs.readFileSync('/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/ManageAccount.jsx', 'utf8');

const targetStr = `          <SubHeader title="Security Deposits" onBack={() => setActiveModule(null)} color="#2563eb" />
          <div style={{ padding: '16px' }}>
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>`;

const sumLogic = `          <SubHeader title="Security Deposits" onBack={() => setActiveModule(null)} color="#2563eb" />
          <div style={{ padding: '16px' }}>
            {activeTenants.length > 0 && (
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: 12, marginBottom: 16, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#475569' }}>Total Deposits Held</span>
                <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 22, fontWeight: 800, color: '#2563eb' }}>
                  ₹{activeTenants.reduce((acc, curr) => acc + (Number(curr.securityDeposit) || 0), 0).toLocaleString('en-IN')}
                </span>
              </div>
            )}
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>`;

code = code.replace(targetStr, sumLogic);

fs.writeFileSync('/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/ManageAccount.jsx', code);
