import re

with open('febebo-staff/src/pages/StaffApp.jsx', 'r') as f:
    content = f.read()

# 1. Add notification for Punch IN
# Let's find: setClocked(true); inside Punch IN
punch_in_pattern = r"""          setClocked\(true\);
          showToast\('Punched In Successfully', 'success'\);"""

punch_in_replacement = r"""          setClocked(true);
          try {
            await addDoc(collection(db, 'notifications'), {
              adminId: user?.ownerUid,
              title: 'Staff Punched In',
              desc: `${user?.name || staffName} (${staffRole}) has punched in and started their shift at ${now}.`,
              type: 'Attendance',
              date: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              pgId: 'primary',
              resolved: false
            });
          } catch(e) { console.error('Punch in notif failed', e); }
          showToast('Punched In Successfully', 'success');"""

content = re.sub(punch_in_pattern, punch_in_replacement, content)

# 2. Fix Punch OUT notification
punch_out_pattern = r"""          // Send notification to Admin on punch out
          try \{
            if \(isFullDay\) \{
              await addDoc\(collection\(db, 'notifications'\), \{
                adminId: user\?\.ownerUid,
                title: 'Staff Punched Out',
                desc: `\$\{user\?\.name \|\| staffName\} \(\$\{staffRole\}\) punched out at \$\{now\}\. Worked for \$\{hoursWorked\.toFixed\(1\)\} hours \(Present\)\.`,
                type: 'Attendance',
                date: new Date\(\)\.toISOString\(\),
                resolved: false
              \}\);
            \} else \{
              await addDoc\(collection\(db, 'notifications'\), \{
                adminId: user\?\.ownerUid,
                title: 'Staff Punched Out Early',
                desc: `\$\{user\?\.name \|\| staffName\} \(\$\{staffRole\}\) punched out at \$\{now\}, working only \$\{hoursWorked\.toFixed\(1\)\} hours\. Please review\.`,
                type: 'Attendance_Review',
                attDocId: attDocId,
                staffId: user\?\.id \|\| user\?\.uid,
                staffName: user\?\.name \|\| staffName,
                date: new Date\(\)\.toISOString\(\),
                resolved: false
              \}\);
            \}"""

punch_out_replacement = r"""          // Send notification to Admin on punch out
          try {
            if (isFullDay) {
              await addDoc(collection(db, 'notifications'), {
                adminId: user?.ownerUid,
                title: 'Staff Punched Out',
                desc: `${user?.name || staffName} (${staffRole}) punched out at ${now}. Worked for ${hoursWorked.toFixed(1)} hours (Present).`,
                type: 'Attendance',
                date: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                pgId: 'primary',
                resolved: false
              });
            } else {
              await addDoc(collection(db, 'notifications'), {
                adminId: user?.ownerUid,
                title: 'Staff Punched Out Early',
                desc: `${user?.name || staffName} (${staffRole}) punched out at ${now}, working only ${hoursWorked.toFixed(1)} hours. Please review.`,
                type: 'Attendance_Review',
                attDocId: attDocId,
                staffId: user?.id || user?.uid,
                staffName: user?.name || staffName,
                date: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                pgId: 'primary',
                resolved: false
              });
            }"""

content = re.sub(punch_out_pattern, punch_out_replacement, content)

with open('febebo-staff/src/pages/StaffApp.jsx', 'w') as f:
    f.write(content)
