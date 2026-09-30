import re

with open('Febebo-admin/src/pages/RequestBox.jsx', 'r') as f:
    content = f.read()

# 1. State for modal
STATE_MODAL = """  const [payReviewModal, setPayReviewModal] = useState(null);
  const [customPayAmount, setCustomPayAmount] = useState('');
  const [staffReqModal, setStaffReqModal] = useState(null);"""
content = content.replace("  const [payReviewModal, setPayReviewModal] = useState(null);\n  const [customPayAmount, setCustomPayAmount] = useState('');", STATE_MODAL)

# 2. Fetch staff_requests
FETCH_CODE = """
        // 4. Fetch Staff Requests
        const qStaffReqs = query(collection(db, 'staff_requests'), where('adminId', '==', user.uid), where('status', '==', 'Pending'));
        const snapStaffReqs = await getDocs(qStaffReqs);
        snapStaffReqs.forEach(d => {
          const data = d.data();
          results.push({
            id: 'sreq_' + d.id,
            tenant: data.staffName || 'Staff',
            room: 'N/A',
            phone: '',
            type: data.type || 'Staff Request',
            desc: `Reason: ${data.reason}` + (data.amt && data.amt !== '-' ? ` | Amount: ${data.amt}` : ''),
            date: data.createdAt || data.date || new Date().toISOString(),
            resolved: false,
            category: 'staff',
            source: 'staff_request',
            originalId: d.id,
            rawData: data
          });
        });

        // Sort by date"""
content = content.replace("        // Sort by date", FETCH_CODE)

# 3. Handle Resolve
HANDLE_RESOLVE_OLD = """    } else if (req.source === 'requisition') {
      // Direct them to manage account -> staff to approve
      navigate('/manage-account');
    }
  };"""
HANDLE_RESOLVE_NEW = """    } else if (req.source === 'requisition') {
      // Direct them to manage account -> staff to approve
      navigate('/manage-account');
    } else if (req.source === 'staff_request') {
      setStaffReqModal(req);
    }
  };"""
content = content.replace(HANDLE_RESOLVE_OLD, HANDLE_RESOLVE_NEW)

# 4. Action logic
ACTION_LOGIC = """
  const handleStaffReqAction = async (status) => {
    if (!staffReqModal) return;
    try {
      await updateDoc(doc(db, 'staff_requests', staffReqModal.originalId), { status });
      // Notify staff
      await addDoc(collection(db, 'notifications'), {
         staffId: staffReqModal.rawData.staffId,
         adminId: user.uid,
         title: `Request ${status}`,
         desc: `Your request for ${staffReqModal.rawData.type} was ${status}.`,
         type: 'Staff Request',
         date: new Date().toISOString(),
         read: false
      });
      setRequests(prev => prev.filter(r => r.id !== staffReqModal.id));
      setStaffReqModal(null);
    } catch (e) {
      console.error(e);
    }
  };

  const submitPayReview ="""
content = content.replace("  const submitPayReview =", ACTION_LOGIC)

# 5. JSX Button for staff_request
BUTTON_CODE = """
                            {!req.resolved && req.source === 'staff_request' && (
                              <button
                                onClick={() => handleResolve(req)}
                                style={{ flex: 1, background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: 9, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>open_in_new</span>
                                Review & Action
                              </button>
                            )}
"""
# We'll inject this after req.source === 'staff'
content = content.replace("Review & Action\n                              </button>\n                            )}", "Review & Action\n                              </button>\n                            )}\n" + BUTTON_CODE)


# 6. JSX Modal for Staff Request
MODAL_JSX = """
      {/* Staff Request Modal */}
      {staffReqModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
          <div style={{ background: 'white', width: '100%', maxWidth: 480, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: '24px 20px', animation: 'slideUp 0.3s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Review Staff Request</h3>
              <span className="material-symbols-outlined" onClick={() => setStaffReqModal(null)} style={{ cursor: 'pointer', color: '#94a3b8' }}>close</span>
            </div>
            
            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, marginBottom: 24 }}>
              <p style={{ margin: '0 0 8px', fontSize: 14, color: '#475569' }}><strong>Staff:</strong> {staffReqModal.tenant}</p>
              <p style={{ margin: '0 0 8px', fontSize: 14, color: '#475569' }}><strong>Type:</strong> {staffReqModal.rawData.type}</p>
              {staffReqModal.rawData.amt && staffReqModal.rawData.amt !== '-' && (
                <p style={{ margin: '0 0 8px', fontSize: 14, color: '#475569' }}><strong>Amount:</strong> {staffReqModal.rawData.amt}</p>
              )}
              <p style={{ margin: 0, fontSize: 14, color: '#475569' }}><strong>Reason:</strong> {staffReqModal.rawData.reason}</p>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                onClick={() => handleStaffReqAction('Rejected')}
                style={{ flex: 1, padding: '16px', background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
              >
                Deny
              </button>
              <button 
                onClick={() => handleStaffReqAction('Approved')}
                style={{ flex: 1, padding: '16px', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pay Review Modal */}
"""
content = content.replace("{/* Pay Review Modal */}", MODAL_JSX)

# Ensure addDoc is imported!
if "addDoc" not in content.split("from 'firebase/firestore'")[0]:
    content = content.replace("updateDoc, orderBy, writeBatch } from 'firebase/firestore'", "updateDoc, orderBy, writeBatch, addDoc } from 'firebase/firestore'")

with open('Febebo-admin/src/pages/RequestBox.jsx', 'w') as f:
    f.write(content)
print("RequestBox.jsx updated!")
