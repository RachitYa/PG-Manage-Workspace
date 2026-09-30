import re

with open('Febebo-admin/src/pages/Approvals.jsx', 'r') as f:
    content = f.read()

action_old = r"""          try {
            await updateDoc(doc(db, 'tenants', req.tenantId), {
              roomNo: req.requestedRoom,
              room: req.requestedRoom
            });
            await addDoc(collection(db, 'users', req.tenantId, 'notifications'), {"""

action_new = r"""          try {
            await updateDoc(doc(db, 'tenants', req.tenantId), {
              roomNo: req.requestedRoom,
              room: req.requestedRoom
            });
            
            // Try to update users doc too
            try {
               const uDoc = await getDoc(doc(db, 'users', req.tenantId));
               if (uDoc.exists()) {
                   const uData = uDoc.data();
                   if (uData.subscribedPG) {
                       await updateDoc(doc(db, 'users', req.tenantId), {
                           'subscribedPG.roomNumber': req.requestedRoom
                       });
                   }
                   if (uData.profileData && uData.profileData.roomDetails) {
                       await updateDoc(doc(db, 'users', req.tenantId), {
                           'profileData.roomDetails.roomNumber': req.requestedRoom
                       });
                   }
               }
            } catch(ue) { console.error("users update error", ue); }

            await addDoc(collection(db, 'users', req.tenantId, 'notifications'), {"""

content = content.replace(action_old, action_new)

with open('Febebo-admin/src/pages/Approvals.jsx', 'w') as f:
    f.write(content)
