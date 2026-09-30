import re
import os

def patch_file(file_path, search, replace):
    if not os.path.exists(file_path): return
    with open(file_path, 'r') as f:
        content = f.read()
    new_content = content.replace(search, replace)
    if new_content != content:
        with open(file_path, 'w') as f:
            f.write(new_content)
        print(f"Patched {file_path}")

# --- STUDENT APP ---
# 1. App.css (TopBar)
patch_file(
    'febebo-app/src/App.css',
    "padding: calc(16px + env(safe-area-inset-top, 24px)) 16px 16px 16px;",
    "padding: calc(16px + max(env(safe-area-inset-top), 40px)) 16px 16px 16px;"
)

# 2. StudentDashboard.jsx
patch_file(
    'febebo-app/src/screens/StudentDashboard.jsx',
    "padding: '24px 20px 32px'",
    "padding: `calc(24px + max(env(safe-area-inset-top), 40px)) 20px 32px`"
)

# 3. Chat.jsx (Student)
patch_file(
    'febebo-app/src/screens/Chat.jsx',
    "background: 'linear-gradient(135deg, #166534, #14532d)', padding: '0 16px', display: 'flex', alignItems: 'center', gap: 12, height: 64, flexShrink: 0",
    "background: 'linear-gradient(135deg, #166534, #14532d)', padding: '0 16px', display: 'flex', alignItems: 'center', gap: 12, height: 'auto', minHeight: 64, flexShrink: 0, paddingTop: 'max(env(safe-area-inset-top), 40px)', paddingBottom: 10"
)

# 4. RoomDescription.jsx
# Has a back button floating: style={{ position: 'absolute', top: 16, left: 16
patch_file(
    'febebo-app/src/screens/RoomDescription.jsx',
    "style={{ position: 'absolute', top: 16, left: 16, ",
    "style={{ position: 'absolute', top: 'calc(16px + max(env(safe-area-inset-top), 40px))', left: 16, "
)

# --- ADMIN APP ---
# Let's write a generic regex for the admin app headers.
# Most Admin app headers have `height: 64` and `padding: '0 16px'` or `padding: '0 16px 20px'`.
import glob

admin_files = glob.glob('Febebo-admin/src/pages/*.jsx')

for file_path in admin_files:
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Dashboard Header
    content = content.replace(
        "padding: '16px 20px 24px'",
        "padding: `calc(16px + max(env(safe-area-inset-top), 40px)) 20px 24px`"
    )
    
    # Chat Header & other headers with `height: 64`
    content = re.sub(
        r"background: '(linear-gradient[^']+)', padding: '0 16px', display: 'flex', alignItems: 'center', gap: 12, height: 64",
        r"background: '\1', padding: '0 16px', display: 'flex', alignItems: 'center', gap: 12, height: 'auto', minHeight: 64, paddingTop: 'max(env(safe-area-inset-top), 40px)', paddingBottom: 10",
        content
    )
    
    # Headers with `padding: '0 16px 20px'` (like Enquiries, StaffApp list view etc.)
    content = re.sub(
        r"background: '(linear-gradient[^']+)', padding: '0 16px 20px'",
        r"background: '\1', padding: '0 16px 20px', paddingTop: 'max(env(safe-area-inset-top), 40px)'",
        content
    )
    
    # Any fixed/absolute back buttons that might be floating at the top left
    content = content.replace(
        "top: 16, left: 16",
        "top: 'calc(16px + max(env(safe-area-inset-top), 40px))', left: 16"
    )

    # Some generic headers in admin might have `padding: '16px'` or `padding: 16`
    # We will just manually target the known ones if needed, but the gradient ones cover almost all pages (Reports, AddTenant, ManageRooms, Chat, Enquiry, StaffApp, etc.)
    
    with open(file_path, 'w') as f:
        f.write(content)
        
print("Applied top safe area inset paddings across both apps!")
