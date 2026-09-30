import re

with open('febebo-staff/src/pages/StaffApp.jsx', 'r') as f:
    content = f.read()

# Fix Punch IN
content = re.sub(
    r"title: 'Staff Punched In',.*?date: new Date\(\)\.toISOString\(\),.*?resolved: false",
    r"title: 'Staff Punched In',\n              desc: `${user?.name || staffName} (${staffRole}) punched in at ${now}.`,\n              type: 'Attendance',\n              date: new Date().toISOString(),\n              createdAt: new Date().toISOString(),\n              pgId: 'primary',\n              resolved: false",
    content,
    flags=re.DOTALL
)

# Fix Punch OUT
content = re.sub(
    r"title: 'Staff Punched Out',.*?date: new Date\(\)\.toISOString\(\),.*?resolved: false",
    r"title: 'Staff Punched Out',\n                desc: `${user?.name || staffName} (${staffRole}) punched out at ${now}. Worked for ${hoursWorked.toFixed(1)} hours (Present).`,\n                type: 'Attendance',\n                date: new Date().toISOString(),\n                createdAt: new Date().toISOString(),\n                pgId: 'primary',\n                resolved: false",
    content,
    flags=re.DOTALL
)

# Fix Punch OUT Early
content = re.sub(
    r"title: 'Staff Punched Out Early',.*?date: new Date\(\)\.toISOString\(\),.*?resolved: false",
    r"title: 'Staff Punched Out Early',\n                desc: `${user?.name || staffName} (${staffRole}) punched out at ${now}, working only ${hoursWorked.toFixed(1)} hours. Please review.`,\n                type: 'Attendance_Review',\n                attDocId: attDocId,\n                staffId: user?.id || user?.uid,\n                staffName: user?.name || staffName,\n                date: new Date().toISOString(),\n                createdAt: new Date().toISOString(),\n                pgId: 'primary',\n                resolved: false",
    content,
    flags=re.DOTALL
)

with open('febebo-staff/src/pages/StaffApp.jsx', 'w') as f:
    f.write(content)

