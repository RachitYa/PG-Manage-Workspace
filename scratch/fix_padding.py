import os
import glob

pages_dir = 'Febebo-admin/src/pages'
files = glob.glob(os.path.join(pages_dir, '*.jsx'))

for filepath in files:
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Replace invalid max(env(...), ...) with calc(...)
    new_content = content.replace(
        "paddingTop: 'max(env(safe-area-inset-top), 44px)'",
        "paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))'"
    )
    
    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Fixed {os.path.basename(filepath)}")
