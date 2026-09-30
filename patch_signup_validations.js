const fs = require('fs');
const file = '/Users/shreyassingh/Downloads/PG MANAGE @/febebo-app/src/screens/SignUp.jsx';
let content = fs.readFileSync(file, 'utf8');

const targetCheck = `    try {
      if (!isLoginMode && phone.length !== 10) {`;

const newCheck = `    try {
      if (!email.toLowerCase().endsWith('@gmail.com')) {
        setError('Please use a valid @gmail.com email address.');
        stopLoading();
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        stopLoading();
        setLoading(false);
        return;
      }
      if (!isLoginMode && phone.length !== 10) {`;

content = content.replace(targetCheck, newCheck);

fs.writeFileSync(file, content, 'utf8');
