import re

file_path = "/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/StaffProfile.jsx"

with open(file_path, "r") as f:
    content = f.read()

content = content.replace(
    "staff.profileData?.profilePictureUrl || staff.profileUrl",
    "staff.profileData?.profilePictureUrl || staff.profileUrl || staff.photoUrl"
)

with open(file_path, "w") as f:
    f.write(content)

print("Patch applied for StaffProfile.jsx.")
