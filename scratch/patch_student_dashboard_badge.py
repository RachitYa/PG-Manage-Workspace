import sys

file_path = "febebo-app/src/screens/StudentDashboard.jsx"
with open(file_path, "r") as f:
    content = f.read()

# 1. Update imports
content = content.replace(
    "import { collection, getDocs, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';",
    "import { collection, getDocs, doc, updateDoc, addDoc, serverTimestamp, query, where, onSnapshot } from 'firebase/firestore';"
)

# 2. Add unreadCount state
content = content.replace(
    "const [loading, setLoading] = useState(true);",
    "const [loading, setLoading] = useState(true);\n  const [unreadCount, setUnreadCount] = useState(0);"
)

# 3. Add useEffect for notifications
useEffect_anchor = "    fetchPGs();\n  }, [user]);"
new_useEffect = """    fetchPGs();
  }, [user]);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, 'users', user.uid, 'notifications'), where('unread', '==', true));
    const unsub = onSnapshot(q, (snap) => {
      setUnreadCount(snap.size);
    });
    return () => unsub();
  }, [user]);"""
content = content.replace(useEffect_anchor, new_useEffect)

# 4. Replace notification bell
old_bell = """            <button className="hero-icon-btn" onClick={() => navigate('/notifications')}>
              <Bell size={22} />
              <span className="notif-dot" />
            </button>"""

new_bell = """            <button className="hero-icon-btn" onClick={() => navigate('/notifications')} style={{ position: 'relative' }}>
              <Bell size={22} />
              {unreadCount > 0 && (
                <div style={{ position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 8, background: '#ef4444', color: 'white', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff', boxSizing: 'border-box' }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </div>
              )}
            </button>"""

content = content.replace(old_bell, new_bell)

with open(file_path, "w") as f:
    f.write(content)
print("Student Dashboard Updated Successfully")
