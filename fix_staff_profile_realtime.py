import re

file_path = "/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/StaffProfile.jsx"

with open(file_path, "r") as f:
    content = f.read()

# We need to find the `staff` variable declaration and replace it with a real-time state
# Original: const staff = location.state?.staff || {};

old_staff_decl = "const staff = location.state?.staff || {};"

new_staff_decl = """const initialStaff = location.state?.staff || {};
  const [staff, setStaff] = useState(initialStaff);
  
  useEffect(() => {
    if (initialStaff.id) {
      import('firebase/firestore').then(({ doc, onSnapshot }) => {
        const { db } = require('../firebase');
        const unsub = onSnapshot(doc(db, 'staff_tokens', initialStaff.id), (docSnap) => {
          if (docSnap.exists()) {
            setStaff({ id: docSnap.id, ...docSnap.data() });
          }
        });
        return () => unsub();
      });
    }
  }, [initialStaff.id]);"""

if old_staff_decl in content:
    content = content.replace(old_staff_decl, new_staff_decl)
    print("Replaced staff state with real-time listener.")
else:
    print("Could not find the target code to patch!")

with open(file_path, "w") as f:
    f.write(content)
