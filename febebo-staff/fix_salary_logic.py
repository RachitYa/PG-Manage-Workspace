with open("src/pages/StaffApp.jsx", "r") as f:
    content = f.read()

old_logic = """           } else {
              // No log means automatically accrued standard pay
              dailyEarned = standardDailyWage;
              typeLabel = 'Full Day Pay (Auto)';
           }"""

new_logic = """           } else {
              // No log means absent / unpaid
              dailyEarned = 0;
              typeLabel = 'Absent';
           }"""

content = content.replace(old_logic, new_logic)

with open("src/pages/StaffApp.jsx", "w") as f:
    f.write(content)
