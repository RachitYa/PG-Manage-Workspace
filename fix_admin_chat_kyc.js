const fs = require('fs');
const file = '/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/Chat.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /'subscribedPG.remainingAmount': rem,/g,
  `'subscribedPG.remainingAmount': rem,
        'subscribedPG.kycStatus': rem === 0 ? 'payment_approved_kyc_pending' : null,`
);

fs.writeFileSync(file, content, 'utf8');
