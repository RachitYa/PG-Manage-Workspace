import os

file_path = 'febebo-app/src/screens/StudentDashboard.css'
with open(file_path, 'r') as f:
    content = f.read()

content = content.replace("padding: 52px 20px 48px;", "padding: calc(24px + max(env(safe-area-inset-top), 40px)) 20px 48px;")

with open(file_path, 'w') as f:
    f.write(content)

print("Patched StudentDashboard.css")
