import re

file_path = "/Users/shreyassingh/Downloads/PG MANAGE @/febebo-staff/src/context/AuthContext.jsx"

with open(file_path, "r") as f:
    content = f.read()

old_code = """              assignedPgs: assignedIds,
              assignedPgNames: assignedNames,
            };"""

new_code = """              assignedPgs: assignedIds,
              assignedPgNames: assignedNames,
              photoUrl: data.photoUrl || user.photoUrl
            };"""

if old_code in content:
    content = content.replace(old_code, new_code)
    print("Patch applied to AuthContext.jsx.")
else:
    print("Could not find the target code to patch in AuthContext.jsx!")

with open(file_path, "w") as f:
    f.write(content)
