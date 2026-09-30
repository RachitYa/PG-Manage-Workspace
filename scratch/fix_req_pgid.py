import re

with open('febebo-app/src/screens/MyProfile.jsx', 'r') as f:
    content = f.read()

old_req = r"""      const newReq = {
        adminId: user\?\.subscribedPG\?\.adminId \|\| user\?\.subscribedPG\?\.pgId \|\| 'none',
        pgId: user\?\.subscribedPG\?\.adminId \? user\.subscribedPG\.pgId : 'primary',"""

new_req = r"""      const aId = user?.subscribedPG?.adminId || user?.subscribedPG?.pgId || 'none';
      const rawPgId = user?.subscribedPG?.pgId;
      const pId = (!rawPgId || rawPgId === aId) ? 'primary' : rawPgId;

      const newReq = {
        adminId: aId,
        pgId: pId,"""

content = re.sub(old_req, new_req, content)

with open('febebo-app/src/screens/MyProfile.jsx', 'w') as f:
    f.write(content)
