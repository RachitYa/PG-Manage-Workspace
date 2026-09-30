with open('Febebo-admin/src/pages/StaffProfile.jsx', 'r') as f:
    lines = f.readlines()

for i in range(535, 545):
    print(f"{i}: {lines[i].strip()}")

