import os
import re

enquiry_file = 'Febebo-admin/src/pages/Enquiry.jsx'
chat_file = 'Febebo-admin/src/pages/Chat.jsx'

with open(enquiry_file, 'r') as f:
    enquiry_code = f.read()

with open(chat_file, 'r') as f:
    chat_code = f.read()

# 1. Enquiry.jsx removals
# Remove state variables
enquiry_code = re.sub(r"const \[allotModal, setAllotModal\] = useState\(null\);\n?", "", enquiry_code)
enquiry_code = re.sub(r"const \[allotForm, setAllotForm\] = useState\(\{.*?\}\);\n?", "", enquiry_code, flags=re.DOTALL)
enquiry_code = re.sub(r"const \[actionLoading, setActionLoading\] = useState\(null\);\n?", "", enquiry_code)
enquiry_code = re.sub(r"const \[allotLoading, setAllotLoading\] = useState\(false\);\n?", "", enquiry_code)

# Remove allot logic (openAllotModal)
enquiry_code = re.sub(r"const openAllotModal = async \(enq\) => \{.*?\n  \};\n", "", enquiry_code, flags=re.DOTALL)

# Remove approveApplication
enquiry_code = re.sub(r"const approveApplication = async \(e\) => \{.*?\n  \};\n", "", enquiry_code, flags=re.DOTALL)

# Remove allot modal UI (lines 286-341 roughly)
enquiry_code = re.sub(r"\{allotModal && \(.*?\}\)\n\s*\{/\* Header \*/\}", "{/* Header */}", enquiry_code, flags=re.DOTALL)

# Remove buttons from Enquiry cards
enquiry_code = re.sub(r"\{enq\.status === 'New' && \(.*?Mark Contacted\n\s*</button>\n\s*\)\}", "", enquiry_code, flags=re.DOTALL)
enquiry_code = re.sub(r"\{enq\.status !== 'Closed' && \(.*?Allot Room\n\s*</button>\n\s*\)\}", "", enquiry_code, flags=re.DOTALL)
enquiry_code = re.sub(r"\{enq\.status !== 'Closed' && \(.*?Close Lead\n\s*</button>\n\s*\)\}", "", enquiry_code, flags=re.DOTALL)
enquiry_code = re.sub(r"\{enq\.status === 'Closed' && \(.*?\)\}", "", enquiry_code, flags=re.DOTALL)

# 2. Chat.jsx additions
# Add state variables
state_vars = """
  // Allot Room states
  const [allotModal, setAllotModal] = useState(null);
  const [allotForm, setAllotForm] = useState({ roomNo: '', rentAmount: '', dateOfJoining: new Date().toISOString().split('T')[0], tokenPaid: '', securityAmount: '', totalAmount: '', remainingAmount: '' });
  const [actionLoading, setActionLoading] = useState(null);
  const [allotLoading, setAllotLoading] = useState(false);
  const [availableRooms, setAvailableRooms] = useState([]);
"""
if "const [allotModal" not in chat_code:
    chat_code = chat_code.replace("const [selectedSeater, setSelectedSeater] = useState(null);", "const [selectedSeater, setSelectedSeater] = useState(null);\n" + state_vars)


# Add fetch available rooms in useEffect
rooms_fetch = """
    // fetch rooms for allot
    getDocs(query(collection(db, 'rooms'), where('adminId', '==', user.uid))).then(snap => {
      setAvailableRooms(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
"""
if "setAvailableRooms(snap.docs" not in chat_code:
    chat_code = chat_code.replace("if (!user?.uid) return;", "if (!user?.uid) return;\n" + rooms_fetch)


# Add logic
logic = """
  const openAllotModal = async () => {
    if (!activeContact) return;
    setAllotLoading(true);
    setAllotModal(activeContact); // Treat activeContact as the enquiry
    
    let rent = '';
    let token = '';
    let security = '';
    let totalAmt = '';
    let remAmt = '';
    
    // Check if current chat has token data
    if (activeContact && user?.uid) {
      try {
        const chatId1 = [user.uid, activeContact.id].sort().join('_');
        const chatId2 = user.uid > activeContact.id ? user.uid + "_" + activeContact.id : activeContact.id + "_" + user.uid;
        
        let chatDoc = await getDoc(doc(db, 'chats', chatId1));
        if (!chatDoc.exists() && chatId1 !== chatId2) {
          chatDoc = await getDoc(doc(db, 'chats', chatId2));
        }

        let foundToken = false;
        if (chatDoc.exists()) {
          const data = chatDoc.data();
          if (data.tokenPaid !== undefined && data.tokenPaid !== null) {
            token = data.tokenPaid;
            rent = data.rentAmount || data.demandedToken?.rent || '';
            security = data.securityAmount || data.demandedToken?.security || '';
            totalAmt = data.totalAmount || data.demandedToken?.totalAmount || '';
            remAmt = data.remainingAmount || '';
            foundToken = true;
          } else if (data.demandedToken) {
            rent = data.demandedToken.rent || '';
            security = data.demandedToken.security || '';
            totalAmt = data.demandedToken.totalAmount || '';
            token = 0;
          }
        }

        if (!foundToken) {
          try {
            const msgsQuery = query(collection(db, 'chats', chatDoc.id, 'messages'), orderBy('timestamp', 'desc'), limit(20));
            const msgsSnap = await getDocs(msgsQuery);
            msgsSnap.forEach(doc => {
              const msgData = doc.data();
              if (msgData.isSystem && msgData.text && msgData.text.includes('Token Payment Logged') && !foundToken) {
                const tokenMatch = msgData.text.match(/Token Paid:\\s*₹(\d+)/);
                if (tokenMatch) { token = Number(tokenMatch[1]); foundToken = true; }
                const rentMatch = msgData.text.match(/Rent:\\s*₹(\d+)/);
                if (rentMatch && !rent) rent = Number(rentMatch[1]);
                const securityMatch = msgData.text.match(/Security:\\s*₹(\d+)/);
                if (securityMatch && !security) security = Number(securityMatch[1]);
              }
            });
          } catch (err) {
            console.error("Error fetching older messages for token", err);
          }
        }
      } catch (e) {
        console.error("Error fetching chat data for allotment", e);
      }
    }
    
    setAllotForm({ roomNo: '', rentAmount: rent, tokenPaid: token, securityAmount: security, totalAmount: totalAmt, remainingAmount: remAmt, dateOfJoining: new Date().toISOString().split('T')[0] });
    setAllotLoading(false);
  };

  const approveApplication = async (e) => {
    e.preventDefault();
    if (!allotForm.roomNo || !allotForm.rentAmount) return alert('Please fill all fields');
    setActionLoading('approving');
    const contactId = activeContact.id;
    const contactName = activeContact.name || activeContact.name;
    const contactPhone = activeContact.phone || activeContact.mobile;
    try {
      // we don't strictly know if it's application or enquiry here, so update both if they exist, or just enquiry
      try { await updateDoc(doc(db, 'pg_applications', contactId), { status: 'approved' }); } catch(e){}
      try { await updateDoc(doc(db, 'enquiries', contactId), { enquiryStatus: 'Closed' }); } catch(e){}
      
      const rent = Number(allotForm.rentAmount);
      const token = Number(allotForm.tokenPaid) || 0;
      const security = Number(allotForm.securityAmount) || 0;
      const totalAmt = Number(allotForm.totalAmount) || (rent + security);
      const remainingAmt = Number(allotForm.remainingAmount) || (totalAmt - token);
      
      let userKyc = null;
      let userImage = null;
      try {
        const uDoc = await getDoc(doc(db, 'users', contactId));
        if (uDoc.exists()) {
          userKyc = uDoc.data().kyc || null;
          userImage = uDoc.data().kyc?.profilePhoto || uDoc.data().photoURL || null;
        }
      } catch (e) { }

      await setDoc(doc(db, 'tenants', contactId), {
        tenantId: contactId, adminId: user.uid, name: contactName, phone: contactPhone,
        roomNo: allotForm.roomNo, rentAmount: rent, tokenPaid: token,
        securityDeposit: security, totalAmount: totalAmt, remainingAmount: remainingAmt,
        dateOfJoining: allotForm.dateOfJoining, status: 'Upcoming User',
        plan: 'Monthly', paymentStatus: 'Pending',
        ...(userKyc ? { kyc: userKyc } : {}),
        ...(userImage ? { image: userImage } : {})
      }, { merge: true });
      
      await updateDoc(doc(db, 'users', contactId), {
        subscribedPG: { pgId: user.uid, pgName: 'Your PG', leaseAmount: rent, securityAmount: security, tokenPaid: token, totalAmount: totalAmt, remainingAmount: remainingAmt, status: 'Upcoming User' }
      });
      
      await addDoc(collection(db, 'users', contactId, 'notifications'), {
        title: '🎉 Room Allotted!',
        desc: `You have been allotted Room ${allotForm.roomNo}. Please check your Upcoming Dashboard to clear the balance.`,
        type: 'success', action: 'VISIT_DASHBOARD', unread: true, createdAt: new Date().toISOString()
      });
      
      setAllotModal(null);
      setAllotForm({ roomNo: '', rentAmount: '', dateOfJoining: new Date().toISOString().split('T')[0], tokenPaid: '' });
      alert("Room Allotted successfully!");
    } catch (err) {
      console.error('Error approving:', err);
      alert('Failed to allot room: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };
"""

if "const openAllotModal =" not in chat_code:
    chat_code = chat_code.replace("const handleSend = async () => {", logic + "\n  const handleSend = async () => {")


# UI Additions
button_addition = """
          {/* Demand Token and Allot Room */}
          {(activeContact?.type === 'enquiry' || activeContact?.type === 'applicant') && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={openDemandModal}
                style={{ flex: 1, padding: '12px', background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}
              >
                🏠 {existingDemand ? 'Edit Offer' : 'Demand Token'}
              </button>
              <button 
                onClick={openAllotModal}
                style={{ flex: 1, padding: '12px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
                Allot Room
              </button>
            </div>
          )}
"""

chat_code = re.sub(r"\{\/\* Demand Token Button.*?(?:Demand Token|Edit Offer)'\}\n\s*</button>\n\s*\)\}", button_addition, chat_code, flags=re.DOTALL)


modal_ui = """
      {/* Allot Room Modal */}
      {allotModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setAllotModal(null)}>
          <div style={{ background: 'white', width: '100%', maxWidth: 500, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: '24px', boxSizing: 'border-box', animation: 'slideUp 0.3s ease-out', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0 }}>Allot Room</p>
              <button onClick={() => setAllotModal(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>
            {allotLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: 16 }}>
                <div style={{ width: 48, height: 48, border: '4px solid #e2e8f0', borderTop: '4px solid #0891b2', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <p style={{ margin: 0, fontSize: 14, color: '#64748b', fontWeight: 600 }}>Fetching payment data from chat...</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : (<>
            <form onSubmit={approveApplication}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8, textTransform: 'uppercase' }}>Select Room *</label>
                <select value={allotForm.roomNo} onChange={e => setAllotForm(p => ({ ...p, roomNo: e.target.value }))} style={{ width: '100%', padding: '14px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 15, fontFamily: 'inherit', outline: 'none' }} required>
                  <option value="">Choose a room...</option>
                  {availableRooms.map(r => (<option key={r.id} value={r.roomNo}>Room {r.roomNo}</option>))}
                </select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8, textTransform: 'uppercase' }}>Monthly Rent (₹) *</label>
                <input type="number" value={allotForm.rentAmount} readOnly style={{ width: '100%', padding: '14px', borderRadius: 12, border: '1px solid #cbd5e1', background: '#e2e8f0', color: '#475569', fontSize: 15, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', fontWeight: 600 }} required />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8, textTransform: 'uppercase' }}>Security Deposit (₹)</label>
                <input type="number" value={allotForm.securityAmount} readOnly style={{ width: '100%', padding: '14px', borderRadius: 12, border: '1px solid #cbd5e1', background: '#e2e8f0', color: '#475569', fontSize: 15, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', fontWeight: 600 }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8, textTransform: 'uppercase' }}>Token Amount Paid (₹)</label>
                <input type="number" value={allotForm.tokenPaid} readOnly style={{ width: '100%', padding: '14px', borderRadius: 12, border: '1px solid #cbd5e1', background: '#e2e8f0', color: '#475569', fontSize: 15, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', fontWeight: 600 }} />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8, textTransform: 'uppercase' }}>Date of Joining</label>
                <input type="date" value={allotForm.dateOfJoining} onChange={e => setAllotForm(p => ({ ...p, dateOfJoining: e.target.value }))} style={{ width: '100%', padding: '14px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 15, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} required />
              </div>
              <button type="submit" disabled={actionLoading === 'approving'} style={{ width: '100%', padding: '16px', background: '#0891b2', color: 'white', border: 'none', borderRadius: 16, fontWeight: 800, fontSize: 16, cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.7 : 1 }}>
                {actionLoading === 'approving' ? 'Approving...' : 'Confirm & Allot Room'}
              </button>
            </form>
            </>)}
          </div>
        </div>
      )}
"""

if "{/* Allot Room Modal */}" not in chat_code:
    chat_code = chat_code.replace("{/* Demand Token Modal */}", modal_ui + "\n      {/* Demand Token Modal */}")


with open(enquiry_file, 'w') as f:
    f.write(enquiry_code)

with open(chat_file, 'w') as f:
    f.write(chat_code)

print("Files patched successfully.")
