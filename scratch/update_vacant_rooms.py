import re

with open('febebo-app/src/screens/MyProfile.jsx', 'r') as f:
    content = f.read()

# 1. Update imports
old_import = r"import \{ collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, where \} from 'firebase/firestore';"
new_import = r"import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, where, getDocs } from 'firebase/firestore';"
content = re.sub(old_import, new_import, content)

# 2. Add state
old_state = r"""  const \[isRoomChangeModalOpen, setIsRoomChangeModalOpen\] = useState\(false\);"""
new_state = r"""  const [isRoomChangeModalOpen, setIsRoomChangeModalOpen] = useState(false);
  const [vacantRoomsList, setVacantRoomsList] = useState([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);"""
content = re.sub(old_state, new_state, content)

# 3. Add useEffect
# We can just put it before `useEffect(() => { if (!user?.uid) return;` which is around line 150.
old_effect = r"""  useEffect\(\(\) => \{
    if \(!user\?\.uid\) return;"""
new_effect = r"""  useEffect(() => {
    if (isRoomChangeModalOpen && user?.uid) {
       const loadVacantRooms = async () => {
         setIsLoadingRooms(true);
         try {
           const aId = user?.subscribedPG?.adminId || user?.subscribedPG?.pgId || 'none';
           const pId = user?.subscribedPG?.adminId ? user.subscribedPG.pgId : 'primary';
           
           const rQ = query(collection(db, 'rooms'), where('adminId', '==', aId), where('pgId', '==', pId));
           const tQ = query(collection(db, 'tenants'), where('adminId', '==', aId), where('pgId', '==', pId));
           
           const [rSnap, tSnap] = await Promise.all([getDocs(rQ), getDocs(tQ)]);
           const rooms = rSnap.docs.map(d => d.data());
           const tenants = tSnap.docs.map(d => d.data()).filter(t => t.status === 'Approved' || t.status === 'Current User' || t.status === 'Notice' || t.status === 'On Notice Period' || t.status === 'Upcoming User');
           
           const vList = [];
           rooms.forEach(r => {
             const occ = tenants.filter(t => t.roomNo === r.roomNo || t.room === r.roomNo).length;
             const vac = (r.beds || 0) - occ;
             if (vac > 0 && String(r.roomNo) !== String(roomNumber)) {
                vList.push({ roomNo: r.roomNo, vacant: vac });
             }
           });
           setVacantRoomsList(vList);
         } catch(e) { console.error("Error loading rooms", e); }
         setIsLoadingRooms(false);
       };
       loadVacantRooms();
    }
  }, [isRoomChangeModalOpen, user, roomNumber]);

  useEffect(() => {
    if (!user?.uid) return;"""
content = content.replace("  useEffect(() => {\n    if (!user?.uid) return;", new_effect)

# 4. Replace input with select
old_input = r"""                <input 
                  type="text" 
                  value=\{reqRoom\} 
                  onChange=\{e => setReqRoom\(e\.target\.value\)\} 
                  placeholder="e\.g\. Room 205 or 2-seater"
                  style=\{\{ paddingLeft: '80px' \}\}
                />"""

new_input = r"""                <select 
                  value={reqRoom} 
                  onChange={e => setReqRoom(e.target.value)} 
                  style={{ paddingLeft: '80px', width: '100%', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '12px', fontSize: '15px', color: '#1e293b', outline: 'none', background: 'transparent', appearance: 'none', position: 'relative', zIndex: 2 }}
                >
                  <option value="" disabled>{isLoadingRooms ? 'Loading vacant rooms...' : 'Select a vacant room'}</option>
                  {vacantRoomsList.map(r => (
                     <option key={r.roomNo} value={r.roomNo}>Room {r.roomNo} ({r.vacant} bed{r.vacant > 1 ? 's' : ''} left)</option>
                  ))}
                </select>"""
content = re.sub(old_input, new_input, content)

with open('febebo-app/src/screens/MyProfile.jsx', 'w') as f:
    f.write(content)
