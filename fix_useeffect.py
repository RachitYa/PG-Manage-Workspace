import re

file_path = "/Users/shreyassingh/Downloads/PG MANAGE @/febebo-staff/src/pages/StaffApp.jsx"

with open(file_path, "r") as f:
    content = f.read()

content = content.replace(
    "if (staffProfile?.photoUrl) setProfilePic(staffProfile.photoUrl);",
    "setProfilePic(staffProfile?.photoUrl || null);"
)

with open(file_path, "w") as f:
    f.write(content)

print("Patch applied for useEffect.")
