const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/components/DetailedReceiptModal.jsx";
let content = fs.readFileSync(file, 'utf8');
content = content.replace('    </>\n  );\n}\n\nexport function CollectPaymentModal', '  );\n}\n\nexport function CollectPaymentModal');
fs.writeFileSync(file, content);
