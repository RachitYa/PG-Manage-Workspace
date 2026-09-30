const fs = require('fs');
const path = require('path');

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walkDir(file));
        } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
            results.push(file);
        }
    });
    return results;
}

const files = walkDir('/Users/shreyassingh/Downloads/PG MANAGE @/febebo-app/src');
files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('where(')) {
        // check if where is imported
        const importRegex = /import\s+{[^}]*}\s+from\s+['"]firebase\/firestore['"]/g;
        let match;
        let imported = false;
        while ((match = importRegex.exec(content)) !== null) {
            if (match[0].includes('where')) {
                imported = true;
            }
        }
        if (!imported) {
            console.log("MISSING where IN", file);
        }
    }
});
