import os
import re

files_to_check = [
    'febebo-app/android/variables.gradle',
    'febebo-app/android/app/build.gradle',
    'Febebo-admin/android/variables.gradle',
    'Febebo-admin/android/app/build.gradle'
]

for file_path in files_to_check:
    if not os.path.exists(file_path): continue
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Check for JavaVersion.VERSION_21 and 21
    content = content.replace("JavaVersion.VERSION_21", "JavaVersion.VERSION_17")
    content = content.replace("jvmTarget = '21'", "jvmTarget = '17'")
    content = content.replace("jvmTarget = \"21\"", "jvmTarget = \"17\"")
    
    # Also if it's set in compileOptions
    content = re.sub(r"sourceCompatibility JavaVersion\.VERSION_21", "sourceCompatibility JavaVersion.VERSION_17", content)
    content = re.sub(r"targetCompatibility JavaVersion\.VERSION_21", "targetCompatibility JavaVersion.VERSION_17", content)
    
    with open(file_path, 'w') as f:
        f.write(content)
