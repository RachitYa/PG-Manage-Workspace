const fs = require('fs');
let content = fs.readFileSync('Febebo-admin/src/components/DetailedReceiptModal.jsx', 'utf8');

// 1. Parse `totalDue` properly if it's a string like "12,000"
content = content.replace(
  `const totalDue = dueData.amount || 10000;`,
  `const totalDue = typeof dueData.amount === 'string' ? parseFloat(dueData.amount.replace(/,/g, '')) : (dueData.amount || 0);`
);

// 2. Add security state
content = content.replace(
  `const [fine,         setFine]         = useState(dueData?.fine         || '');`,
  `const [fine,         setFine]         = useState(dueData?.fine         || '');\n  const [security,     setSecurity]     = useState(dueData?.security     || '');`
);

// 3. Add security to currentSum
content = content.replace(
  `const currentSum = [rent, meter, food, extraPlates, amenities, laundry, housekeeping, fine, other]`,
  `const currentSum = [rent, meter, food, extraPlates, amenities, laundry, housekeeping, fine, security, other]`
);

// 4. Add security to FIELDS
content = content.replace(
  `['Fines',        fine,        setFine],`,
  `['Fines',        fine,        setFine],\n    ['Security Deposit', security, setSecurity],`
);

fs.writeFileSync('Febebo-admin/src/components/DetailedReceiptModal.jsx', content);
console.log('Fixed DetailedReceiptModal');
