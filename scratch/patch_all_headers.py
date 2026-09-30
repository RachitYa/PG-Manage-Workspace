import os
import glob
import re

pages_dir = 'Febebo-admin/src/pages'
files = glob.glob(os.path.join(pages_dir, '*.jsx'))

for filepath in files:
    with open(filepath, 'r') as f:
        content = f.read()
    
    def replacer(match):
        style_content = match.group(1)
        if "paddingTop: 'max(env(" in style_content:
            return match.group(0)
            
        return "style={{" + style_content + ", paddingTop: 'max(env(safe-area-inset-top), 44px)'}}"
    
    new_content = content
    pattern = re.compile(r'style=\{\{([^}]*?position:\s*[\'"]sticky[\'"][^}]*?top:\s*0[^}]*?)\}\}')
    new_content = pattern.sub(replacer, new_content)
    
    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Patched {os.path.basename(filepath)}")
