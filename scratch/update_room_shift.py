import re

with open('Febebo-admin/src/pages/Approvals.jsx', 'r') as f:
    content = f.read()

action_old = r"""  const handleRoomChangeAction = async \(id, action\) => \{
    setActionLoading\(id \+ action\);
    try \{
      await updateDoc\(doc\(db, 'room_change_requests', id\), \{ status: action \}\);
      setRoomRequests\(prev => prev\.map\(r => r\.id === id \? \{ \.\.\.r, status: action \} : r\)\);
    \} catch \(err\) \{
      console\.error\('Error updating request:', err\);
    \} finally \{
      setActionLoading\(null\);
    \}
  \};"""

action_new = r"""  const handleRoomChangeAction = async (id, action) => {
    setActionLoading(id + action);
    try {
      await updateDoc(doc(db, 'room_change_requests', id), { status: action });
      setRoomRequests(prev => prev.map(r => r.id === id ? { ...r, status: action } : r));

      if (action === 'Approved') {
        const req = roomRequests.find(r => r.id === id);
        if (req && req.tenantId && req.requestedRoom) {
          try {
            await updateDoc(doc(db, 'tenants', req.tenantId), {
              roomNo: req.requestedRoom,
              room: req.requestedRoom
            });
            await addDoc(collection(db, 'users', req.tenantId, 'notifications'), {
              title: "Room Shift Approved! 🏡",
              desc: `Your request to move to Room ${req.requestedRoom} has been approved by admin.`,
              type: "success",
              action: "VIEW_PROFILE",
              unread: true,
              createdAt: new Date().toISOString()
            });
          } catch(e) { console.error(e) }
        }
      }
    } catch (err) {
      console.error('Error updating request:', err);
    } finally {
      setActionLoading(null);
    }
  };"""

content = re.sub(action_old, action_new, content)

with open('Febebo-admin/src/pages/Approvals.jsx', 'w') as f:
    f.write(content)
