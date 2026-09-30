import re

with open('Febebo-admin/src/pages/Approvals.jsx', 'r') as f:
    content = f.read()

action_old = r"""          try {
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
            } catch\(ue\) \{ console.error\("users update error", ue\); \}"""

action_new = r"""          try {
            // Get new room's rent
            let newRent = null;
            const rq = query(collection(db, 'rooms'), where('adminId', '==', user.uid), where('pgId', '==', activePgId), where('roomNo', '==', req.requestedRoom));
            const rs = await getDocs(rq);
            if (!rs.empty) {
               newRent = Number(rs.docs[0].data().price) || null;
            }

            const tUpdate = {
              roomNo: req.requestedRoom,
              room: req.requestedRoom
            };
            if (newRent !== null) tUpdate.rentAmount = newRent;

            await updateDoc(doc(db, 'tenants', req.tenantId), tUpdate);
            
            // Try to update users doc too
            try {
               const uDoc = await getDoc(doc(db, 'users', req.tenantId));
               if (uDoc.exists()) {
                   const uData = uDoc.data();
                   const uUpdate = {};
                   if (uData.subscribedPG) {
                       uUpdate['subscribedPG.roomNumber'] = req.requestedRoom;
                       if (newRent !== null) uUpdate['subscribedPG.leaseAmount'] = newRent;
                   }
                   if (uData.profileData && uData.profileData.roomDetails) {
                       uUpdate['profileData.roomDetails.roomNumber'] = req.requestedRoom;
                   }
                   if (Object.keys(uUpdate).length > 0) {
                       await updateDoc(doc(db, 'users', req.tenantId), uUpdate);
                   }
               }
            } catch(ue) { console.error("users update error", ue); }"""

content = re.sub(action_old, action_new, content)

with open('Febebo-admin/src/pages/Approvals.jsx', 'w') as f:
    f.write(content)
