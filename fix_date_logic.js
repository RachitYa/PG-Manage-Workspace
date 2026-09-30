const fs = require('fs');
const file = '/Users/shreyassingh/Downloads/PG MANAGE @/febebo-app/src/screens/Account.jsx';
let content = fs.readFileSync(file, 'utf8');

const oldLogic = `  const currentMonthStr = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const isPaidThisMonth = payments.some(p => {
    const isRent = p.paymentType === 'monthly_rent' || p.paymentType === 'token' || p.paymentType === 'first_month';
    return isRent && p.date && p.date.includes(currentMonthStr);
  });`;

const newLogic = `  const currentMonth = new Date().toLocaleString('en-US', { month: 'short' });
  const currentYear = new Date().getFullYear().toString();
  const isPaidThisMonth = payments.some(p => {
    const isRent = p.paymentType === 'monthly_rent' || p.paymentType === 'token' || p.paymentType === 'first_month';
    return isRent && p.date && p.date.includes(currentMonth) && p.date.includes(currentYear);
  });`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync(file, content, 'utf8');
