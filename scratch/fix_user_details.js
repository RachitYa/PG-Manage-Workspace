const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/UserProfile.jsx";
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /const \[realUnits, setRealUnits\] = useState\(0\);/g,
  `const [realUnits, setRealUnits] = useState(0);\n  const [realAmount, setRealAmount] = useState(0);\n  const [realMonth, setRealMonth] = useState('');`
);

content = content.replace(
  /if\(bills\.length > 0\) setRealUnits\(bills\[0\]\.consumedUnits \|\| 0\);/g,
  `if(bills.length > 0) {
        setRealUnits(bills[0].consumedUnits || 0);
        setRealAmount(bills[0].totalAmount || (bills[0].consumedUnits * (bills[0].ratePerUnit || 8)));
        setRealMonth(bills[0].billMonth || new Date(bills[0].date).toLocaleString('default', { month: 'long' }));
      }`
);

content = content.replace(
  /const currentMonthAmt   = currentMonthUnits \* profile\.meterRatePerUnit;/g,
  `const currentMonthAmt   = realAmount;`
);

content = content.replace(
  /<p style={{ fontSize: 11, color: '#64748b', margin: '0 0 4px' }}>This Month \(June\)<\/p>/g,
  `<p style={{ fontSize: 11, color: '#64748b', margin: '0 0 4px' }}>This Month ({realMonth || new Date().toLocaleString('default', { month: 'long' })})</p>`
);

fs.writeFileSync(file, content);
console.log("Updated UserProfile.");
