const fs = require('fs');
const file = '/Users/shreyassingh/Downloads/PG MANAGE @/febebo-staff/src/pages/StaffApp.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /const markMealEaten = async \(uid, meal\) => \{[\s\S]*?showToast\('Error', 'error'\);\n\s*\}\n\s*\};\n/,
  ""
);

content = content.replace(
  /function getTodayStr2\(\) \{[\s\S]*?return `\$\{yyyy\}-\$\{mm\}-\$\{dd\}`;?\n\s*\}/,
  ""
);

content = content.replace(
  /const markMealEaten = async \(tenantId, mealKey\) => \{[\s\S]*?showToast\('Failed to update meal status', 'error'\);\n\s*\}\n\s*\};/,
  `const markMealEaten = async (tenantId, mealKey) => {
    try {
      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const todayStr = \`\${yyyy}-\${mm}-\${dd}\`;

      const mealStr = mealKey.startsWith('status') 
        ? { statusB: 'breakfast', statusL: 'lunch', statusS: 'snacks', statusD: 'dinner' }[mealKey]
        : mealKey;

      if (!mealStr) return;

      const docRef = doc(db, 'mess_headcount', \`\${user.ownerUid}_\${todayStr}\`);
      await setDoc(docRef, { [\`\${tenantId}_\${mealStr}_eaten\`]: true }, { merge: true });
      showToast('Marked as Eaten!', 'success');
    } catch (e) {
      console.error(e);
      showToast('Failed to update meal status', 'error');
    }
  };`
);

fs.writeFileSync(file, content, 'utf8');
