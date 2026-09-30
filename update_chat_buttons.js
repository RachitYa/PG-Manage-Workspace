const fs = require('fs');

let code = fs.readFileSync('/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/Chat.jsx', 'utf8');

const demandTokenRegex = /\{\!hasPaidToken && \(\s*<button\s*onClick=\{openDemandModal\}[\s\S]*?🏠 \{existingDemand \? 'Edit Offer' : 'Demand Token'\}\s*<\/button>\s*\)\}/;

const sendDetailsRegex = /<button\s*onClick=\{\(\) => setShowSendOptionsModal\(true\)\}[\s\S]*?<span className="material-symbols-outlined" style=\{\{ fontSize: 18 \}\}>bed<\/span>\s*Send Details\s*<\/button>/;

const newDemandTokenCode = `
              {(!hasPaidToken && (!activeContact?.status || activeContact?.status === 'Pending')) && (
                <button 
                  onClick={openDemandModal}
                  style={{ flex: 1, minWidth: '30%', padding: '10px 8px', background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', borderRadius: 12, fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, boxShadow: '0 4px 12px rgba(217,119,6,0.15)' }}
                >
                  🏠 {existingDemand ? 'Edit Offer' : 'Demand Token'}
                </button>
              )}`;

const newSendDetailsCode = `
              {activeContact?.status !== 'Current User' && (
                <button 
                  onClick={() => setShowSendOptionsModal(true)}
                  style={{ flex: 1, minWidth: '30%', padding: '10px 8px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 12, fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, boxShadow: '0 4px 12px rgba(37,99,235,0.15)' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>bed</span>
                  Send Details
                </button>
              )}`;

code = code.replace(demandTokenRegex, newDemandTokenCode.trim());
code = code.replace(sendDetailsRegex, newSendDetailsCode.trim());

fs.writeFileSync('/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/Chat.jsx', code);
