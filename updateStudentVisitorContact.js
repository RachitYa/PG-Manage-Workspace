const fs = require('fs');
let content = fs.readFileSync('febebo-app/src/screens/Visitor.jsx', 'utf8');

const oldContactBlock = `              <div>
                <label className="popup-label">Contact Number (Opt)</label>
                <input 
                  type="tel" 
                  className="popup-input" 
                  value={contact} 
                  onChange={e => setContact(e.target.value)}
                  placeholder="10-digit mobile number"
                />
              </div>`;

const newContactBlock = `              <div>
                <label className="popup-label">Contact Number (Opt)</label>
                <input 
                  type="tel" 
                  className="popup-input" 
                  value={contact} 
                  onChange={e => {
                    const val = e.target.value.replace(/\\D/g, '');
                    if (val.length <= 10) setContact(val);
                  }}
                  placeholder="10-digit mobile number"
                  style={{ border: (contact && contact.length !== 10) ? '1px solid #ef4444' : undefined, background: (contact && contact.length !== 10) ? '#fef2f2' : undefined }}
                />
                {(contact && contact.length !== 10) ? (
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#ef4444', fontWeight: 'bold' }}>
                    Phone number must be exactly 10 digits
                  </p>
                ) : null}
              </div>`;

content = content.replace(oldContactBlock, newContactBlock);

content = content.replace(/disabled=\{submitting \|\| !visitorName \|\| !visitDate \|\| !purpose \|\| !idCard\}/g, `disabled={submitting || !visitorName || !visitDate || !purpose || !idCard || (contact && contact.length !== 10)}`);

fs.writeFileSync('febebo-app/src/screens/Visitor.jsx', content);
console.log('Done student replacement');
