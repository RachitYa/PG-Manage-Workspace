import os
import re

files = [
    "StaffWorkDetails.jsx", "StaffDashboard.jsx", "CustomerDashboard.jsx",
    "PendingScreen.jsx", "RequestBox.jsx", "MessHeadcount.jsx",
    "StaffApp.jsx", "MeterHistory.jsx", "Chat.jsx",
    "HelpSupport.jsx", "MoveOutFlow.jsx", "Login.jsx",
    "Subscription.jsx", "Enquiry.jsx", "Complain.jsx"
]

for file in files:
    filepath = os.path.join('Febebo-admin/src/pages', file)
    if not os.path.exists(filepath):
        continue
        
    with open(filepath, 'r') as f:
        content = f.read()

    # Find the FIRST occurrence of style={{ ... }} that doesn't have calc(44px already
    # But ONLY if it belongs to the top-level div!
    # Instead, let's just find the first "padding: 'something'" inside the first 50 lines and inject paddingTop.
    lines = content.split('\n')
    patched = False
    for i, line in enumerate(lines[:120]):
        if ("padding:" in line or "padding :" in line) and "calc(44px" not in line and "paddingTop:" not in line:
            # Inject paddingTop right after it
            parts = line.split("padding:")
            prefix = parts[0]
            rest = parts[1]
            # find the first comma or quote closure
            if "padding: " in line:
                lines[i] = line.replace("padding: ", "paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))', padding: ")
            else:
                lines[i] = line.replace("padding:", "paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))', padding:")
            patched = True
            break
            
    if patched:
        new_content = '\n'.join(lines)
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Patched {file}")
    else:
        print(f"Failed to patch {file}")
