with open('scratch/StaffProfile2.jsx', 'r') as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    if i == 540: # line 541 (index 540) is '      </div>\n'
        new_lines.append("          </>\n")
    elif i == 541: # line 542 is '          </>\n'
        new_lines.append("        )}\n")
    elif i == 542: # line 543 is '        )}\n'
        new_lines.append("      </div>\n")
    else:
        new_lines.append(line)

with open('Febebo-admin/src/pages/StaffProfile.jsx', 'w') as f:
    f.writelines(new_lines)
