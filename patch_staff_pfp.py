import re

file_path = "/Users/shreyassingh/Downloads/PG MANAGE @/febebo-staff/src/pages/StaffApp.jsx"

with open(file_path, "r") as f:
    content = f.read()

# Replace profilePic state initialization
content = re.sub(
    r"const \[profilePic,\s*setProfilePic\]\s*=\s*useState\(localStorage\.getItem\('febebo_profile_pic'\)\s*\|\|\s*null\);",
    r"const [profilePic, setProfilePic] = useState(user?.photoUrl || null);\n  useEffect(() => {\n    if (staffProfile?.photoUrl) setProfilePic(staffProfile.photoUrl);\n  }, [staffProfile?.photoUrl]);",
    content
)

# Replace the input onChange handler
old_handler = """              onChange={e => {
                const file = e.target.files[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = () => {
                    setProfilePic(reader.result);
                    localStorage.setItem('febebo_profile_pic', reader.result);
                  };
                  reader.readAsDataURL(file);
                }
              }}"""

new_handler = """              onChange={async e => {
                const file = e.target.files[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = async () => {
                    setProfilePic(reader.result);
                    // Upload to Firestore
                    try {
                      if (user?.id || user?.uid) {
                        const uid = user?.id || user?.uid;
                        await updateDoc(doc(db, 'staff_tokens', uid), { photoUrl: reader.result });
                        // Also try to update the main staff doc if possible
                        if (user?.ownerUid) {
                          await updateDoc(doc(db, 'staff', uid), { photoUrl: reader.result }).catch(e => console.warn('Could not update staff doc', e));
                        }
                      }
                    } catch(err) {
                      console.error('Error saving profile picture:', err);
                    }
                  };
                  reader.readAsDataURL(file);
                }
              }}"""

if old_handler in content:
    content = content.replace(old_handler, new_handler)
else:
    print("Could not find the onChange handler for the avatar input!")
    
with open(file_path, "w") as f:
    f.write(content)

print("Patch applied.")
