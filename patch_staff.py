import re

with open('febebo-staff/src/pages/StaffApp.jsx', 'r') as f:
    content = f.read()

# 1. Update initial state for myReqs
content = re.sub(
    r"const \[myReqs,setMyReqs\]\s*=\s*useState\(\[\s*\{id:1[^\}]+\},\s*\{id:2[^\}]+\},\s*\]\);",
    "const [myReqs,setMyReqs]      = useState([]);",
    content
)

# 2. Add listener in the useEffect
# Find qComplaints and add qMyReqs before it
LISTENER_CODE = """
    // My Requests
    const qMyReqs = query(collection(db, 'staff_requests'), where('staffId', '==', user.uid));
    const unsubMyReqs = onSnapshot(qMyReqs, (snap) => {
      setMyReqs(snap.docs.map(d => ({ docId: d.id, ...d.data() })).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)));
    });

    // 2. Complaints"""
content = content.replace("    // 2. Complaints", LISTENER_CODE)

# Also need to add unsubMyReqs to the cleanup function
# Let's see the cleanup function
cleanup_match = re.search(r'return \(\) => \{\n\s*unsubCleaning\(\);\n\s*unsubComplaints\(\);', content)
if cleanup_match:
    content = content.replace(
        "unsubCleaning();\n      unsubComplaints();",
        "unsubCleaning();\n      unsubComplaints();\n      unsubMyReqs();"
    )

# 3. Update submitRequest function
SUBMIT_REQUEST_OLD = """  const submitRequest = e=>{
    e.preventDefault();
    if(!reqReason.trim()) return;
    setMyReqs(p=>[{id:Date.now(),type:reqType,date:new Date().toLocaleDateString('en-GB'),status:'Pending',amt:reqAmt?`₹${reqAmt}`:'-'},...p]);
    setReqReason(''); setReqAmt('');
    showToast('Request submitted!', 'success');
  };"""

SUBMIT_REQUEST_NEW = """  const submitRequest = async (e) => {
    e.preventDefault();
    if(!reqReason.trim()) return;
    try {
      await addDoc(collection(db, 'staff_requests'), {
        staffId: user.uid,
        adminId: user.ownerUid,
        staffName: user.name || 'Staff',
        type: reqType,
        reason: reqReason,
        amt: reqAmt ? `₹${reqAmt}` : '-',
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        status: 'Pending',
        createdAt: new Date().toISOString()
      });
      setReqReason(''); setReqAmt('');
      showToast('Request submitted!', 'success');
    } catch(err) {
      console.error(err);
      showToast('Error submitting', 'error');
    }
  };"""
content = content.replace(SUBMIT_REQUEST_OLD, SUBMIT_REQUEST_NEW)

# Fix the map key in JSX
content = content.replace("{myReqs.map(r=>(", "{myReqs.map(r=>(")
content = content.replace("key={r.id}", "key={r.docId || r.id}")

with open('febebo-staff/src/pages/StaffApp.jsx', 'w') as f:
    f.write(content)
print("StaffApp.jsx patched successfully")
