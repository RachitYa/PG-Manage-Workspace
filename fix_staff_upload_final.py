import re

file_path = "/Users/shreyassingh/Downloads/PG MANAGE @/febebo-staff/src/pages/StaffApp.jsx"

with open(file_path, "r") as f:
    content = f.read()

old_code = """              onChange={async e => {
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

new_code = """              onChange={async e => {
                const file = e.target.files[0];
                if (file) {
                  try {
                    const reader = new FileReader();
                    reader.onload = async () => {
                        try {
                            const compressed = await compressImage(file, 400);
                            setProfilePic(compressed);
                            
                            if (user?.id || user?.uid) {
                              const uid = user?.id || user?.uid;
                              
                              // Update local storage so it persists immediately on reload
                              const localUserStr = localStorage.getItem('febebo_user');
                              if (localUserStr) {
                                  try {
                                      const localUser = JSON.parse(localUserStr);
                                      localUser.photoUrl = compressed;
                                      localStorage.setItem('febebo_user', JSON.stringify(localUser));
                                  } catch (e) {}
                              }

                              await updateDoc(doc(db, 'staff_tokens', uid), { photoUrl: compressed });
                              
                              if (user?.ownerUid) {
                                await updateDoc(doc(db, 'staff', uid), { photoUrl: compressed }).catch(err => console.warn('Could not update staff doc', err));
                              }
                              
                              alert("Profile picture updated successfully!");
                            }
                        } catch (err) {
                            console.error(err);
                            alert("Failed to compress or upload image.");
                        }
                    };
                    reader.onerror = () => alert("Failed to read file.");
                    reader.readAsDataURL(file);
                  } catch(err) {
                    console.error('Error saving profile picture:', err);
                    alert("Error saving profile picture: " + err.message);
                  }
                }
              }}"""

if old_code in content:
    content = content.replace(old_code, new_code)
    print("Patch applied to StaffApp.jsx.")
else:
    print("Could not find the target code to patch in StaffApp.jsx!")

with open(file_path, "w") as f:
    f.write(content)
