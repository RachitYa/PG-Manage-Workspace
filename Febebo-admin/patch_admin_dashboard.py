import re

with open("src/pages/AdminDashboard.jsx", "r") as f:
    content = f.read()

# Add vendorCount state
content = content.replace("const [visitorCount, setVisitorCount] = useState(0);", "const [visitorCount, setVisitorCount] = useState(0);\n  const [vendorCount, setVendorCount] = useState(0);")

# Add real-time listener for vendorCount (staff_requisitions)
hook_code = """
  useEffect(() => {
    if (!user) return;
    const qReqs = query(
      collection(db, 'staff_requisitions'),
      where('adminId', '==', user.uid),
      where('status', '==', 'Pending Rate')
    );
    const unsub = onSnapshot(qReqs, (snap) => {
      setVendorCount(snap.docs.length);
    });
    return () => unsub();
  }, [user]);
"""

content = content.replace("  const MODULES = [", hook_code + "\n  const MODULES = [")

# Add badgeCount to vendor module
content = re.sub(
    r"\{ id: 'vendor',\s*label: 'Vendor',\s*desc: 'Suppliers',\s*icon: 'local_shipping',\s*gradient: 'linear-gradient\(135deg,#8b5cf6,#7c3aed\)' \},",
    "{ id: 'vendor',         label: 'Vendor',         desc: 'Suppliers',      icon: 'local_shipping',         gradient: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', badgeCount: vendorCount },",
    content
)

with open("src/pages/AdminDashboard.jsx", "w") as f:
    f.write(content)
