import re
with open('febebo-staff/src/pages/Login.jsx', 'r') as f:
    content = f.read()
    
# Find where login() is called
lines = content.split('\n')
for i, line in enumerate(lines):
    if 'login(' in line:
        start = max(0, i-20)
        end = min(len(lines), i+20)
        for j in range(start, end):
            print(f"{j}: {lines[j]}")
        break
