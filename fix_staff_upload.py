import re

file_path = "/Users/shreyassingh/Downloads/PG MANAGE @/febebo-staff/src/pages/StaffApp.jsx"

with open(file_path, "r") as f:
    content = f.read()

old_code = """              onChange={async e => {
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

new_code = """              onChange={async e => {
                const file = e.target.files[0];
                if (file) {
                  try {
                    const compressed = await compressImage(file, 400);
                    setProfilePic(compressed);
                    
                    if (user?.id || user?.uid) {
                      const uid = user?.id || user?.uid;
                      await updateDoc(doc(db, 'staff_tokens', uid), { photoUrl: compressed });
                      
                      if (user?.ownerUid) {
                        await updateDoc(doc(db, 'staff', uid), { photoUrl: compressed }).catch(err => console.warn('Could not update staff doc', err));
                      }
                    }
                  } catch(err) {
                    console.error('Error saving profile picture:', err);
                  }
                }
              }}"""

if old_code in content:
    content = content.replace(old_code, new_code)
    print("Patch applied.")
else:
    print("Could not find the target code to patch!")

with open(file_path, "w") as f:
    f.write(content)
