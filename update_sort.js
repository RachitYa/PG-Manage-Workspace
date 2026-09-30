const fs = require('fs');

let code = fs.readFileSync('/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/RequestBox.jsx', 'utf8');

const oldSort = `        results.sort((a, b) => {
          const tA = a.timestamp || a.date || a.createdAt || '';
          const tB = b.timestamp || b.date || b.createdAt || '';
          return new Date(tB) - new Date(tA);
        });`;

const newSort = `        results.sort((a, b) => {
          const tA = a.timestamp || a.createdAt || a.date || '';
          const tB = b.timestamp || b.createdAt || b.date || '';
          const dateA = new Date(tA);
          const dateB = new Date(tB);
          
          if (isNaN(dateA) && isNaN(dateB)) return 0;
          if (isNaN(dateA)) return 1;
          if (isNaN(dateB)) return -1;
          
          return dateB - dateA;
        });`;

code = code.replace(oldSort, newSort);
fs.writeFileSync('/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/RequestBox.jsx', code);
