import os
import glob

pages_dir = 'Febebo-admin/src/pages'
files = glob.glob(os.path.join(pages_dir, '*.jsx'))

for filepath in files:
    with open(filepath, 'r') as f:
        content = f.read()

    if "calc(44px" not in content:
        print(f"Needs patch: {os.path.basename(filepath)}")
