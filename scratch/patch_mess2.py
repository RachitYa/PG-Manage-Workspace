import re

with open('febebo-staff/src/pages/MessHeadcount.jsx', 'r') as f:
    content = f.read()

# Replace user?.uid with user?.ownerUid
content = content.replace("user?.uid", "user?.ownerUid")

with open('febebo-staff/src/pages/MessHeadcount.jsx', 'w') as f:
    f.write(content)

print("MessHeadcount user?.uid patched!")
