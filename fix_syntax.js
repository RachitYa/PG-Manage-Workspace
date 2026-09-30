const fs = require('fs');
let code = fs.readFileSync('/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/RequestBox.jsx', 'utf8');

const badStr = `      {reviewModalData && <ReviewDetailsModal
      </div>

      <ReviewDetailsModal`;

const goodStr = `      <ReviewDetailsModal`;

code = code.replace(badStr, goodStr);
fs.writeFileSync('/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/RequestBox.jsx', code);
