const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/components/DetailedReceiptModal.jsx";
let content = fs.readFileSync(file, 'utf8');
content = content.replace('    </div>\n  );\n}\n\nexport function CollectPaymentModal', '    </div>\n    </>\n  );\n}\n\nexport function CollectPaymentModal');
fs.writeFileSync(file, content);
