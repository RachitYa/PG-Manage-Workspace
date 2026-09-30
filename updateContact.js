const fs = require('fs');
let content = fs.readFileSync('Febebo-admin/src/pages/VisitorLog.jsx', 'utf8');

const oldContactBlock = `              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: 6 }}>Contact Number</label>
                <input type="tel" placeholder="10-digit number" value={contact} onChange={(e) => setContact(e.target.value)} style={{ width: '100%', padding: 14, borderRadius: 12, border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>`;

const newContactBlock = `              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: 6 }}>Contact Number*</label>
                <input 
                  type="tel" 
                  placeholder="10-digit number" 
                  value={contact} 
                  onChange={(e) => {
                    const val = e.target.value.replace(/\\D/g, '');
                    if (val.length <= 10) setContact(val);
                  }} 
                  style={{ width: '100%', padding: 14, borderRadius: 12, border: (contact && contact.length !== 10) ? '1px solid #ef4444' : '1px solid #cbd5e1', fontSize: '1rem', outline: 'none', boxSizing: 'border-box', background: (contact && contact.length !== 10) ? '#fef2f2' : 'white' }} 
                />
                {(contact && contact.length !== 10) ? (
                  <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>error</span>
                    Phone number must be exactly 10 digits
                  </p>
                ) : null}
              </div>`;

content = content.replace(oldContactBlock, newContactBlock);

const oldButtonCondition = `disabled={submitting || !visitorName || !selectedTenantId || !visitDate}`;
const newButtonCondition = `disabled={submitting || !visitorName || !selectedTenantId || !visitDate || contact.length !== 10}`;

content = content.replace(/disabled=\{submitting \|\| !visitorName \|\| !selectedTenantId \|\| !visitDate\}/g, newButtonCondition);

const oldButtonColor = `(submitting || !visitorName || !selectedTenantId || !visitDate) ? '#cbd5e1' : '#0891b2'`;
const newButtonColor = `(submitting || !visitorName || !selectedTenantId || !visitDate || contact.length !== 10) ? '#cbd5e1' : '#0891b2'`;

content = content.replace(/\(submitting \|\| !visitorName \|\| !selectedTenantId \|\| !visitDate\) \? '#cbd5e1' : '#0891b2'/g, newButtonColor);

const oldCursor = `cursor: (submitting || !visitorName || !selectedTenantId || !visitDate) ? 'not-allowed' : 'pointer'`;
const newCursor = `cursor: (submitting || !visitorName || !selectedTenantId || !visitDate || contact.length !== 10) ? 'not-allowed' : 'pointer'`;

content = content.replace(/cursor: \(submitting \|\| !visitorName \|\| !selectedTenantId \|\| !visitDate\) \? 'not-allowed' : 'pointer'/g, newCursor);

fs.writeFileSync('Febebo-admin/src/pages/VisitorLog.jsx', content);
console.log('Done replacement');
