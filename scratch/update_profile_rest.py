import re
with open('Febebo-admin/src/pages/StaffProfile.jsx', 'r') as f:
    content = f.read()

content = content.replace('{formatTime(selectedDayLog.restStart)}', '{formatTime(selectedDayLog.restStartLog || selectedDayLog.lastRestStart || selectedDayLog.restStart)}')
content = content.replace('{formatTime(selectedDayLog.restEnd)}', '{formatTime(selectedDayLog.restEndLog || selectedDayLog.restEnd)}')

with open('Febebo-admin/src/pages/StaffProfile.jsx', 'w') as f:
    f.write(content)
