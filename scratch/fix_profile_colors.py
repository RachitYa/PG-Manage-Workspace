import re
with open('Febebo-admin/src/pages/StaffProfile.jsx', 'r') as f:
    content = f.read()

old_colors = r"""if \(log\.status === 'present'\) \{ bg = '#dcfce7'; col = '#15803d'; \}
                else if \(log\.status === 'absent'\) \{ bg = '#fee2e2'; col = '#b91c1c'; \}
                else if \(log\.status === 'half_day'\) \{ bg = '#fef9c3'; col = '#a16207'; \}"""

new_colors = r"""if (log.status === 'present' || log.status === 'working' || log.status === 'resting') { bg = '#dcfce7'; col = '#15803d'; }
                else if (log.status === 'absent') { bg = '#fee2e2'; col = '#b91c1c'; }
                else if (log.status === 'half_day' || log.status === 'pending_review') { bg = '#fef9c3'; col = '#a16207'; }"""

content = re.sub(old_colors, new_colors, content)

with open('Febebo-admin/src/pages/StaffProfile.jsx', 'w') as f:
    f.write(content)
