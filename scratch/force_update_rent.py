with open('Febebo-admin/src/pages/Approvals.jsx', 'r') as f:
    lines = f.readlines()

out = []
skip = False
for line in lines:
    if "await updateDoc(doc(db, 'tenants', req.tenantId), {" in line:
        skip = True
        out.append("""            // Get new room's rent
            let newRent = null;
            try {
              const rq = query(collection(db, 'rooms'), where('adminId', '==', user.uid), where('pgId', '==', activePgId), where('roomNo', '==', req.requestedRoom));
              const rs = await getDocs(rq);
              if (!rs.empty) {
                 newRent = Number(rs.docs[0].data().price) || null;
              }
            } catch(re) {}

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
                       if (newRent !== null) uUpdate['profileData.roomDetails.rentAmount'] = newRent;
                   }
                   if (Object.keys(uUpdate).length > 0) {
                       await updateDoc(doc(db, 'users', req.tenantId), uUpdate);
                   }
               }
            } catch(ue) { console.error("users update error", ue); }
""")
        continue
    
    if skip and "} catch(ue) { console.error(\"users update error\", ue); }" in line:
        skip = False
        continue
        
    if not skip:
        out.append(line)

with open('Febebo-admin/src/pages/Approvals.jsx', 'w') as f:
    f.writelines(out)
