const fs = require('fs');

const file = '/Users/shreyassingh/Downloads/PG MANAGE @/febebo-app/src/screens/Account.jsx';
const content = fs.readFileSync(file, 'utf8');

const usedVariables = ['where', 'updateDoc', 'addDoc', 'setDoc', 'doc', 'collection', 'query', 'orderBy', 'onSnapshot', 'getDoc', 'getDocs', 'deleteDoc', 'serverTimestamp'];

const importRegex = /import\s+{([^}]*)}\s+from\s+['"]firebase\/firestore['"]/;
const match = content.match(importRegex);

if (match) {
    const importedVars = match[1].split(',').map(s => s.trim());
    usedVariables.forEach(v => {
        // check if used
        if (content.includes(v + '(')) {
            if (!importedVars.includes(v)) {
                console.log("MISSING:", v);
            }
        }
    });
}
