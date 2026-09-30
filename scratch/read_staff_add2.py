import re
with open('Febebo-admin/src/pages/ManageStaff.jsx', 'r') as f:
    content = f.read()
    
# Find where staffData is defined
lines = content.split('\n')
for i, line in enumerate(lines):
    if 'const staffData =' in line:
        start = max(0, i-5)
        end = min(len(lines), i+15)
        for j in range(start, end):
            print(f"{j}: {lines[j]}")
        break
