import re

with open('febebo-app/src/screens/MyProfile.jsx', 'r') as f:
    content = f.read()

old_req = r"""      const newReq = {
        adminId: user\?\.subscribedPG\?\.pgId \|\| 'none',
        tenantId: user\.uid,
        tenantName: user\.name \|\| 'Student',
        currentRoom: roomNumber !== '—' \? roomNumber : 'Unassigned',
        requestedRoom: reqRoom,
        reason: reqReason,
        status: 'Pending',
        date: new Date\(\)\.toISOString\(\)
      \};
      await addDoc\(collection\(db, 'room_change_requests'\), newReq\);
      setIsRoomChangeModalOpen\(false\);
      setReqRoom\(''\);
      setReqReason\(''\);
    \} catch \(err\) \{"""

new_req = r"""      const newReq = {
        adminId: user?.subscribedPG?.adminId || user?.subscribedPG?.pgId || 'none',
        pgId: user?.subscribedPG?.adminId ? user.subscribedPG.pgId : 'primary',
        tenantId: user.uid,
        tenantName: user.name || 'Student',
        currentRoom: roomNumber !== '—' ? roomNumber : 'Unassigned',
        requestedRoom: reqRoom,
        reason: reqReason,
        status: 'Pending',
        date: new Date().toISOString()
      };
      await addDoc(collection(db, 'room_change_requests'), newReq);
      setIsRoomChangeModalOpen(false);
      setReqRoom('');
      setReqReason('');
      alert("Room change request sent successfully!");
      // Optionally reload requests locally if they were showing
    } catch (err) {"""

content = re.sub(old_req, new_req, content)

with open('febebo-app/src/screens/MyProfile.jsx', 'w') as f:
    f.write(content)
