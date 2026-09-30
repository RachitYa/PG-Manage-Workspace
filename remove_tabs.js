const fs = require('fs');

let code = fs.readFileSync('/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/RequestBox.jsx', 'utf8');

// 1. Change shown to requests
code = code.replace(
  "const shown = activeTab === 'Pending' ? pending : resolved;",
  "const shown = requests;"
);

// 2. Remove tabs UI
const tabsRegex = /\{\/\* Tabs \*\/\}\s*<div style=\{\{ display: 'flex', background: 'rgba\(255,255,255,0\.08\)'[\s\S]*?<\/div>\s*<\/div>/;
code = code.replace(tabsRegex, "</div>");

// 3. Update subtitle
code = code.replace(
  "{pending.length} pending requests",
  "{requests.length} notifications"
);

// 4. Update the inbox pill to show total requests length
code = code.replace(
  "{pending.length > 0 && (",
  "{requests.length > 0 && ("
);
code = code.replace(
  "<span style={{ fontSize: 13, fontWeight: 700, color: '#d97706' }}>{pending.length}</span>",
  "<span style={{ fontSize: 13, fontWeight: 700, color: '#d97706' }}>{requests.length}</span>"
);

// 5. Update empty state text
code = code.replace(
  "{activeTab === 'Pending' ? 'You are all caught up!' : 'No resolved notifications yet.'}",
  "'No notifications yet.'"
);

fs.writeFileSync('/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/RequestBox.jsx', code);
