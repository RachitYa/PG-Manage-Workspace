const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/AddTenant.jsx";
let content = fs.readFileSync(file, 'utf8');

const target = `<div style={styles.inputGroup}>
              <label style={styles.label}>Amount Paid Now (₹)</label>
              <input type="number" name="amountPaid" value={formData.amountPaid} onChange={handleChange} placeholder="e.g. 5000" style={styles.input} />
            </div>`;
const replacement = `<div style={styles.inputGroup}>
              <label style={styles.label}>Amount Paid Now (₹)</label>
              <input type="number" name="amountPaid" value={formData.amountPaid} onChange={handleChange} placeholder="e.g. 5000" style={{ ...styles.input, ...(formData.paymentMode === 'Full Payment' ? { backgroundColor: '#f1f5f9', cursor: 'not-allowed', color: '#94a3b8' } : {}) }} disabled={formData.paymentMode === 'Full Payment'} />
            </div>`;

content = content.replace(target, replacement);

fs.writeFileSync(file, content);
console.log("Input disabled for Full Payment.");
