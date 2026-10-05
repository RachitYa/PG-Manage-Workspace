import re

with open('febebo-staff/src/pages/VisitorLog.jsx', 'r') as f:
    content = f.read()

# Replace user.uid with user.ownerUid for adminId logic
content = content.replace("where('adminId', '==', user.uid)", "where('adminId', '==', user.ownerUid)")
content = content.replace("adminId: user.uid", "adminId: user.ownerUid")
# Check if there's any other user.uid
content = content.replace("if (!user?.uid) return;", "if (!user?.ownerUid) return;")

# Replace definition
content = content.replace("export default function VisitorLog() {", "export default function VisitorLog({ onClose }) {")

# Replace navigation
content = content.replace("navigate(-1)", "if(onClose) onClose();")
content = content.replace("navigate('/admin-dashboard')", "if(onClose) onClose();")

with open('febebo-staff/src/pages/VisitorLog.jsx', 'w') as f:
    f.write(content)
