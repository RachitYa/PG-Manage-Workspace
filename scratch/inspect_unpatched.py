import os
import glob

pages_dir = 'Febebo-admin/src/pages'
files = glob.glob(os.path.join(pages_dir, '*.jsx'))
unpatched = []

for filepath in files:
    with open(filepath, 'r') as f:
        content = f.read()
    if "calc(44px" not in content:
        unpatched.append(filepath)

for filepath in unpatched:
    with open(filepath, 'r') as f:
        lines = f.readlines()
        
    print(f"--- {os.path.basename(filepath)} ---")
    for i, line in enumerate(lines):
        if "padding:" in line or "padding :" in line:
            print(f"Line {i+1}: {line.strip()}")
