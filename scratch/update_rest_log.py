import re

with open('febebo-staff/src/pages/StaffApp.jsx', 'r') as f:
    content = f.read()

# Update resting logic to save restStartLog
rest_start_pattern = r"""lastRestStart: now.toISOString\(\)
\s*\}, \{ merge: true \}\);"""
rest_start_replacement = r"""lastRestStart: now.toISOString(),
          restStartLog: now.toISOString()
        }, { merge: true });"""
content = re.sub(rest_start_pattern, rest_start_replacement, content)

# Update resume logic to save restEndLog
rest_end_pattern = r"""totalRestMs: newTotalRestMs,
\s*lastRestStart: null
\s*\}, \{ merge: true \}\);"""
rest_end_replacement = r"""totalRestMs: newTotalRestMs,
          lastRestStart: null,
          restEndLog: now.toISOString()
        }, { merge: true });"""
content = re.sub(rest_end_pattern, rest_end_replacement, content)

# Also globally inject pgId: 'primary' into ALL addDoc(collection(db, 'notifications') where not already present.
# We'll just parse lines.
lines = content.split('\n')
new_lines = []
in_notif = False
has_pg_id = False
for i, line in enumerate(lines):
    if "addDoc(collection(db, 'notifications')" in line:
        in_notif = True
        has_pg_id = False
    
    if in_notif and "pgId:" in line:
        has_pg_id = True
        
    if in_notif and "});" in line:
        if not has_pg_id:
            # Inject pgId before this line
            new_lines.append("              pgId: 'primary',")
        in_notif = False
        
    new_lines.append(line)

content = '\n'.join(new_lines)

with open('febebo-staff/src/pages/StaffApp.jsx', 'w') as f:
    f.write(content)

