import re

with open("src/pages/AdminDashboard.jsx", "r") as f:
    content = f.read()

# Add a toast state and previous count state
state_repl = """  const [visitorCount, setVisitorCount] = useState(0);
  const [vendorCount, setVendorCount] = useState(0);
  const [vendorPrevCount, setVendorPrevCount] = useState(null);
  const [toastMsg, setToastMsg] = useState('');
"""
content = content.replace("  const [visitorCount, setVisitorCount] = useState(0);\n  const [vendorCount, setVendorCount] = useState(0);", state_repl)

# Update the vendor listener to trigger the toast
hook_old = """    const unsub = onSnapshot(qReqs, (snap) => {
      setVendorCount(snap.docs.length);
    });"""

hook_new = """    const unsub = onSnapshot(qReqs, (snap) => {
      const currentCount = snap.docs.length;
      setVendorCount(currentCount);
      setVendorPrevCount(prev => {
        if (prev !== null && currentCount > prev) {
          setToastMsg('New Staff Requisition received!');
          setTimeout(() => setToastMsg(''), 5000);
        }
        return currentCount;
      });
    });"""

content = content.replace(hook_old, hook_new)

# Add the toast UI before the closing tag of AdminDashboard
toast_ui = """
      {toastMsg && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: '#0891b2', color: 'white', padding: '12px 20px',
          borderRadius: 8, fontWeight: 700, fontSize: 14,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex', alignItems: 'center', gap: 8,
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <span className="material-symbols-outlined">info</span>
          {toastMsg}
        </div>
      )}
    </div>
  );
}
"""

content = re.sub(r"    </div>\s*\n\s*\);\s*\n\}\s*$", toast_ui, content)

with open("src/pages/AdminDashboard.jsx", "w") as f:
    f.write(content)
