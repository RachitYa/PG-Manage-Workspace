const fs = require('fs');
const file = '/Users/shreyassingh/Downloads/PG MANAGE @/febebo-staff/android/app/src/main/AndroidManifest.xml';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('android.permission.CAMERA')) {
  content = content.replace(
    '<uses-permission android:name="android.permission.INTERNET" />',
    '<uses-permission android:name="android.permission.INTERNET" />\n    <uses-permission android:name="android.permission.CAMERA" />'
  );
  fs.writeFileSync(file, content, 'utf8');
}
