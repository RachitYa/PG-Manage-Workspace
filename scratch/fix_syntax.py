import os
import glob
import re

pages_dir = 'Febebo-admin/src/pages'
files = glob.glob(os.path.join(pages_dir, '*.jsx'))

for filepath in files:
    with open(filepath, 'r') as f:
        content = f.read()
    
    new_content = re.sub(r',\s*,\s*paddingTop:', r', paddingTop:', content)
    
    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Fixed {os.path.basename(filepath)}")
