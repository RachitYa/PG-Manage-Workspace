import os
import glob

def patch_file(filepath, replacements):
    with open(filepath, 'r') as f:
        content = f.read()
    
    new_content = content
    for target, replacement in replacements.items():
        new_content = new_content.replace(target, replacement)
        
    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Patched {os.path.basename(filepath)}")

# 1. AdminDashboard
patch_file("Febebo-admin/src/pages/AdminDashboard.jsx", {
    "paddingTop: 16": "paddingTop: 'calc(16px + calc(32px + env(safe-area-inset-top, 0px)))'"
})

# 2. AddTenant
patch_file("Febebo-admin/src/pages/AddTenant.jsx", {
    "padding: '16px 20px',": "padding: '16px 20px',\n    paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))',"
})

# 3. MeterReading
patch_file("Febebo-admin/src/pages/MeterReading.jsx", {
    "padding: '20px 20px',": "padding: '20px 20px', paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))',"
})

# 4. StaffWorkDetails
patch_file("Febebo-admin/src/pages/StaffWorkDetails.jsx", {
    "padding: '16px 20px',": "padding: '16px 20px', paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))',"
})

# 5. StaffDashboard
patch_file("Febebo-admin/src/pages/StaffDashboard.jsx", {
    "padding: '24px 20px',": "padding: '24px 20px', paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))',"
})

# 6. CustomerDashboard
patch_file("Febebo-admin/src/pages/CustomerDashboard.jsx", {
    "padding: '20px',": "padding: '20px', paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))',"
})

# 7. PendingScreen
patch_file("Febebo-admin/src/pages/PendingScreen.jsx", {
    "padding: '60px 24px',": "padding: 'calc(60px + env(safe-area-inset-top, 0px)) 24px 60px',"
})

# 8. RequestBox
patch_file("Febebo-admin/src/pages/RequestBox.jsx", {
    "padding: '16px 20px',": "padding: '16px 20px', paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))',"
})

# 9. MessHeadcount
patch_file("Febebo-admin/src/pages/MessHeadcount.jsx", {
    "padding: '16px 20px',": "padding: '16px 20px', paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))',"
})

# 10. StaffApp
patch_file("Febebo-admin/src/pages/StaffApp.jsx", {
    "padding: '20px',": "padding: '20px', paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))',"
})

# 11. MeterHistory
patch_file("Febebo-admin/src/pages/MeterHistory.jsx", {
    "padding: '16px 20px',": "padding: '16px 20px', paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))',"
})

# 12. Chat
patch_file("Febebo-admin/src/pages/Chat.jsx", {
    "padding: '16px 20px',": "padding: '16px 20px', paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))',"
})

# 13. HelpSupport
patch_file("Febebo-admin/src/pages/HelpSupport.jsx", {
    "padding: '16px 20px',": "padding: '16px 20px', paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))',"
})

# 14. MoveOutFlow
patch_file("Febebo-admin/src/pages/MoveOutFlow.jsx", {
    "padding: '16px 20px',": "padding: '16px 20px', paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))',"
})

# 15. Login
patch_file("Febebo-admin/src/pages/Login.jsx", {
    "padding: '40px 24px',": "padding: '40px 24px', paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))',"
})

# 16. Subscription
patch_file("Febebo-admin/src/pages/Subscription.jsx", {
    "padding: '16px 20px',": "padding: '16px 20px', paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))',"
})

# 17. Enquiry
patch_file("Febebo-admin/src/pages/Enquiry.jsx", {
    "padding: '16px 20px',": "padding: '16px 20px', paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))',"
})

# 18. AdminProfile
patch_file("Febebo-admin/src/pages/AdminProfile.jsx", {
    "padding: '0 20px 32px',": "padding: '0 20px 32px', paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))',"
})

# 19. Complain
patch_file("Febebo-admin/src/pages/Complain.jsx", {
    "padding: '0 16px 0',": "padding: '0 16px 0', paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))',"
})

