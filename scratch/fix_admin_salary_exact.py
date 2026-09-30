with open('Febebo-admin/src/pages/StaffProfile.jsx', 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "if (log.status === 'present' || log.status === 'pending_review') {" in line:
        # replace the lines from i-1 to i+3
        new_logic = """         if (log) {
            if (log.dailyPay !== undefined) {
               earnedThisCycle += Number(log.dailyPay);
            } else if (log.status === 'present' || log.status === 'working' || log.status === 'resting' || log.status === 'pending_review') {
               earnedThisCycle += standardDailyWage;
            } else if (log.status === 'half_day') {
               earnedThisCycle += (standardDailyWage / 2);
            }
         }\n"""
        
        lines[i-1] = new_logic
        lines[i] = ""
        lines[i+1] = ""
        lines[i+2] = ""
        lines[i+3] = ""
        lines[i+4] = ""
        break

with open('Febebo-admin/src/pages/StaffProfile.jsx', 'w') as f:
    f.writelines(lines)
