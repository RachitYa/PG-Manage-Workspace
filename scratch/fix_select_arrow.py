import re
with open('febebo-app/src/screens/MyProfile.jsx', 'r') as f:
    c = f.read()
c = c.replace("appearance: 'none', position: 'relative', zIndex: 2", "position: 'relative', zIndex: 2, cursor: 'pointer'")
with open('febebo-app/src/screens/MyProfile.jsx', 'w') as f:
    f.write(c)
