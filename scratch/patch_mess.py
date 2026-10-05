import re

with open('febebo-staff/src/pages/MessHeadcount.jsx', 'r') as f:
    content = f.read()

# Replace user.uid with user.ownerUid
content = content.replace("user.uid", "user.ownerUid")

# Remove !user?.uid if it exists
content = content.replace("!user?.uid", "!user?.ownerUid")

# Replace component definition
content = content.replace("export default function MessHeadcount() {", "export default function MessHeadcount({ onClose }) {")

# Replace navigate
content = content.replace("onClick={() => navigate(-1)}", "onClick={() => { if(onClose) onClose(); }}")

with open('febebo-staff/src/pages/MessHeadcount.jsx', 'w') as f:
    f.write(content)

print("MessHeadcount patched!")
