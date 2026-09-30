import re

with open('Febebo-admin/src/pages/StaffProfile.jsx', 'r') as f:
    content = f.read()

pattern = r"""         if \(log\) \{
            if \(log\.status === 'present' \|\| log\.status === 'working' \|\| log\.status === 'resting' \|\| log\.status === 'pending_review'\) \{
               earnedThisCycle \+= standardDailyWage;
            \} else if \(log\.status === 'half_day'\) \{
               earnedThisCycle \+= \(standardDailyWage / 2\);
            \}
         \}"""

replacement = r"""         if (log) {
            if (log.dailyPay !== undefined) {
               earnedThisCycle += Number(log.dailyPay);
            } else if (log.status === 'present' || log.status === 'working' || log.status === 'resting' || log.status === 'pending_review') {
               earnedThisCycle += standardDailyWage;
            } else if (log.status === 'half_day') {
               earnedThisCycle += (standardDailyWage / 2);
            }
         }"""

content = re.sub(pattern, replacement, content)

with open('Febebo-admin/src/pages/StaffProfile.jsx', 'w') as f:
    f.write(content)
