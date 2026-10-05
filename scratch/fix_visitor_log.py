import re

with open('febebo-staff/src/pages/VisitorLog.jsx', 'r') as f:
    content = f.read()

content = content.replace("() => if(onClose) onClose();", "() => { if(onClose) onClose(); }")

with open('febebo-staff/src/pages/VisitorLog.jsx', 'w') as f:
    f.write(content)

print("Fixed syntax error!")
