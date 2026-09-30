const fs = require('fs');
const file = '/Users/shreyassingh/Downloads/PG MANAGE @/febebo-app/src/screens/Food.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "const [activeModal, setActiveModal] = useState(null); // 'rate', 'extra'",
  "const [activeModal, setActiveModal] = useState(null); // 'rate', 'extra'\n  const [showQRModal, setShowQRModal] = useState(false);\n  const [activeMealQR, setActiveMealQR] = useState('');\n  const [eatenStatus, setEatenStatus] = useState({});"
);

fs.writeFileSync(file, content, 'utf8');
