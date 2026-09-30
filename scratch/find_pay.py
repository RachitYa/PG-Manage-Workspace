import os
import re

for root, _, files in os.walk('Febebo-admin/src/pages'):
    for file in files:
        if file.endswith('.jsx'):
            with open(os.path.join(root, file), 'r') as f:
                content = f.read()
                if 'staff' in content.lower() and ('partial' in content.lower() or 'pay ' in content.lower() or 'payment' in content.lower()):
                    # find context around 'partial' or 'payment'
                    lines = content.split('\n')
                    for i, line in enumerate(lines):
                        if 'staff' in line.lower() and ('pay' in line.lower() or 'partial' in line.lower()):
                            print(f"{file}:{i+1}: {line.strip()}")
