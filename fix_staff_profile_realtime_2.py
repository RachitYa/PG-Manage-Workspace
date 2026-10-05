import re

file_path = "/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/StaffProfile.jsx"

with open(file_path, "r") as f:
    content = f.read()

old_str = """const initialStaff = location.state?.staff || {};
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

new_str = """const initialStaff = location.state?.staff || {};
  const [staff, setStaff] = useState(initialStaff);
  
  useEffect(() => {
    if (initialStaff.id) {
      import('firebase/firestore').then(({ onSnapshot }) => {
        const unsub = onSnapshot(doc(db, 'staff_tokens', initialStaff.id), (docSnap) => {
          if (docSnap.exists()) {
            setStaff({ id: docSnap.id, ...docSnap.data() });
          }
        });
        return () => unsub();
      });
    }
  }, [initialStaff.id]);"""

if old_str in content:
    content = content.replace(old_str, new_str)
    print("Fixed the real-time listener.")
else:
    print("Could not find the block to fix!")

with open(file_path, "w") as f:
    f.write(content)
