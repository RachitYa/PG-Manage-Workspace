with open('febebo-staff/src/pages/StaffApp.jsx', 'r') as f:
    lines = f.readlines()

new_lines = []
for i in range(len(lines)):
    if "pgId: 'primary'," in lines[i]:
        # Check previous line
        prev_idx = len(new_lines) - 1
        if prev_idx >= 0:
            prev_line = new_lines[prev_idx].rstrip('\n')
            if prev_line.strip() and not prev_line.endswith(',') and not prev_line.endswith('{'):
                new_lines[prev_idx] = prev_line + ',\n'
    new_lines.append(lines[i])

with open('febebo-staff/src/pages/StaffApp.jsx', 'w') as f:
    f.writelines(new_lines)

