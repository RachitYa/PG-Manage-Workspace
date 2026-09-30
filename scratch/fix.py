with open('Febebo-admin/src/pages/StaffProfile.jsx', 'r') as f:
    content = f.read()

content = content.replace("{profileTab === 'attendance' && (\n          {/* Attendance Card */}", 
                          "{profileTab === 'attendance' && (")
                          
with open('Febebo-admin/src/pages/StaffProfile.jsx', 'w') as f:
    f.write(content)
