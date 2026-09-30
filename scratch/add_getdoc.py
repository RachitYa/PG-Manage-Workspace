import re

with open('Febebo-admin/src/pages/Approvals.jsx', 'r') as f:
    content = f.read()

content = content.replace("getDocs, doc,", "getDoc, getDocs, doc,")

with open('Febebo-admin/src/pages/Approvals.jsx', 'w') as f:
    f.write(content)
