const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/febebo-app/src/screens/Chat.jsx";
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "{msg.text}",
  \`{msg.imageUrl && (
          <img src={msg.imageUrl} alt="Attachment" style={{ width: '100%', borderRadius: 12, marginBottom: msg.text ? 8 : 0, border: '1px solid rgba(0,0,0,0.1)' }} />
        )}
        {msg.text}\`
);

fs.writeFileSync(file, content);
