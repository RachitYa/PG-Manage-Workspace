import re

with open('Febebo-admin/src/pages/Approvals.jsx', 'r') as f:
    content = f.read()

# Fix Room Change Requests query
old_rc = r"""      const qRC = query(collection(db, 'room_change_requests'), where('adminId', '==', user.uid), where('pgId', '==', activePgId));
      const snapRC = await getDocs(qRC);
      setRoomRequests(snapRC.docs.map(d => ({ id: d.id, ...d.data() })));"""

new_rc = r"""      const qRC = query(collection(db, 'room_change_requests'), where('adminId', '==', user.uid));
      const snapRC = await getDocs(qRC);
      let rcDocs = snapRC.docs.map(d => ({ id: d.id, ...d.data() }));
      rcDocs = rcDocs.filter(d => d.pgId === activePgId || (activePgId === 'primary' && d.pgId === user.uid) || (!d.pgId));
      setRoomRequests(rcDocs);"""

content = content.replace(old_rc, new_rc)

# Fix PG Applications query
old_pa = r"""      const qPA = query(collection(db, 'pg_applications'), where('adminId', '==', user.uid), where('pgId', '==', activePgId));
      const snapPA = await getDocs(qPA);
      setPgApplications(snapPA.docs.map(d => ({ id: d.id, ...d.data() })));"""

new_pa = r"""      const qPA = query(collection(db, 'pg_applications'), where('adminId', '==', user.uid));
      const snapPA = await getDocs(qPA);
      let paDocs = snapPA.docs.map(d => ({ id: d.id, ...d.data() }));
      paDocs = paDocs.filter(d => d.pgId === activePgId || (activePgId === 'primary' && d.pgId === user.uid) || (!d.pgId));
      setPgApplications(paDocs);"""

content = content.replace(old_pa, new_pa)

with open('Febebo-admin/src/pages/Approvals.jsx', 'w') as f:
    f.write(content)

