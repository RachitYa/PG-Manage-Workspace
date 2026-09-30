const fs = require('fs');
const file = '/Users/shreyassingh/Downloads/PG MANAGE @/febebo-app/src/screens/Account.jsx';
let content = fs.readFileSync(file, 'utf8');

const oldLogic = `  const currentMonth = new Date().toLocaleString('en-US', { month: 'short' });
  const currentYear = new Date().getFullYear().toString();
  const isPaidThisMonth = payments.some(p => {
    const isRent = p.paymentType === 'monthly_rent' || p.paymentType === 'token' || p.paymentType === 'first_month';
    return isRent && p.date && p.date.includes(currentMonth) && p.date.includes(currentYear);
  });`;

const newLogic = `  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 25); // Giving a 5 day grace period for 30 days

  const isPaidThisMonth = payments.some(p => {
    if (!p.createdAt) return false;
    const pDate = new Date(p.createdAt);
    
    if (p.paymentType === 'monthly_rent') {
      return pDate.getMonth() === new Date().getMonth() && pDate.getFullYear() === new Date().getFullYear();
    }
    
    if (p.paymentType === 'first_month' || p.paymentType === 'token') {
      return pDate > thirtyDaysAgo;
    }
    
    return false;
  });`;

content = content.replace(oldLogic, newLogic);

// Also make rentAmount not editable
content = content.replace(
  "<input type=\"number\" value={rentAmount} onChange={e => setRentAmount(e.target.value)} required style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '16px', fontWeight: '600', outline: 'none' }} />",
  "<input type=\"number\" value={rentAmount} readOnly style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: '16px', fontWeight: '600', outline: 'none' }} />"
);

fs.writeFileSync(file, content, 'utf8');
