with open("src/pages/StaffApp.jsx", "r") as f:
    content = f.read()

# 1. Add staffProfile state and listener
state_injection = """  const {user,logout} = useAuth();
  const [staffProfile, setStaffProfile] = useState(user);

  useEffect(() => {
    if (user?.id) {
       const unsub = onSnapshot(doc(db, 'staff_tokens', user.id), (d) => {
         if (d.exists()) setStaffProfile({ ...user, ...d.data() });
       });
       return () => unsub();
    }
  }, [user?.id]);"""

content = content.replace("  const {user,logout} = useAuth();", state_injection)

# 2. Replace user.?createdAt with staffProfile.?createdAt in view === 'inout'
content = content.replace("const joinedDate = new Date(user?.createdAt || Date.now());", "const joinedDate = new Date(staffProfile?.createdAt || Date.now());")

# 3. Replace user.?payDate and user.salary with staffProfile in view === 'salary'
content = content.replace("const payDate = user?.payDate || 1;", "const payDate = staffProfile?.payDate || 1;")
content = content.replace("const baseSal = user.salary || 0;", "const baseSal = staffProfile?.salary || 0;")

with open("src/pages/StaffApp.jsx", "w") as f:
    f.write(content)
