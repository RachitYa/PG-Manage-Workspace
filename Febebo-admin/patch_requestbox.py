import re

with open("src/pages/RequestBox.jsx", "r") as f:
    content = f.read()

# 1. Add states for Pay Modal
state_injection = """  const [payReviewModal, setPayReviewModal] = useState(null);
  const [customPayAmount, setCustomPayAmount] = useState('');"""
content = content.replace("  const [activeTab, setActiveTab] = useState('Pending');", "  const [activeTab, setActiveTab] = useState('Pending');\n" + state_injection)

# 2. Modify handleAttendanceReview
handle_att_old = """  const handleAttendanceReview = async (req, newStatus) => {
    try {
      if (req.attDocId) {
        await updateDoc(doc(db, 'staff_attendance', req.attDocId), { status: newStatus });
      }
      await updateDoc(doc(db, 'notifications', req.id), { resolved: true });
      setRequests(prev => prev.map(r => r.id === req.id ? { ...r, resolved: true } : r));
    } catch (e) { console.error('Failed to review attendance:', e); }
  };"""

handle_att_new = """  const handleAttendanceReview = async (req, newStatus) => {
    if (newStatus === 'present') {
      setPayReviewModal(req);
      setCustomPayAmount('');
      return;
    }
    try {
      if (req.attDocId) {
        await updateDoc(doc(db, 'staff_attendance', req.attDocId), { status: newStatus });
      }
      await updateDoc(doc(db, 'notifications', req.id), { resolved: true });
      setRequests(prev => prev.map(r => r.id === req.id ? { ...r, resolved: true } : r));
    } catch (e) { console.error('Failed to review attendance:', e); }
  };

  const submitPayReview = async (amount) => {
    if (!payReviewModal) return;
    try {
      if (payReviewModal.attDocId) {
        await updateDoc(doc(db, 'staff_attendance', payReviewModal.attDocId), { 
           status: 'present', 
           dailyPay: Number(amount)
        });
      }
      await updateDoc(doc(db, 'notifications', payReviewModal.id), { resolved: true });
      
      // Notify staff
      if (payReviewModal.staffId) {
        await addDoc(collection(db, 'notifications'), {
           staffId: payReviewModal.staffId,
           adminId: payReviewModal.adminId,
           title: 'Payment Received',
           desc: `You were marked present and paid ₹${amount} for your partial work today.`,
           type: 'Attendance',
           date: new Date().toISOString(),
           resolved: false
        });
      }

      setRequests(prev => prev.map(r => r.id === payReviewModal.id ? { ...r, resolved: true } : r));
      setPayReviewModal(null);
    } catch (e) {
      console.error(e);
      alert('Failed to save pay.');
    }
  };"""
content = content.replace(handle_att_old, handle_att_new)

# 3. Add Modal UI at the end of the component
modal_ui = """
      {/* Pay Review Modal */}
      {payReviewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
          <div style={{ background: 'white', width: '100%', maxWidth: 480, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: '24px 20px', animation: 'slideUp 0.3s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Pay Staff (Partial Day)</h3>
              <span className="material-symbols-outlined" onClick={() => setPayReviewModal(null)} style={{ cursor: 'pointer', color: '#94a3b8' }}>close</span>
            </div>
            
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
              This staff member logged fewer hours than a full shift. You are marking them Present. Please specify their pay for today.
            </p>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 6 }}>Custom Pay Amount (₹)</label>
              <input type="number" placeholder="Enter amount..." value={customPayAmount} onChange={e => setCustomPayAmount(e.target.value)} style={{ width: '100%', padding: '14px', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 16, fontFamily: 'inherit', background: 'white', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                onClick={() => submitPayReview(Number(customPayAmount))}
                disabled={!customPayAmount}
                style={{ flex: 1, padding: '16px', background: customPayAmount ? '#0891b2' : '#cbd5e1', color: 'white', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: customPayAmount ? 'pointer' : 'not-allowed' }}
              >
                Pay Custom Amount
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}"""

content = re.sub(r"    </div>\s*\n\s*\);\s*\n\}\s*$", modal_ui, content)

with open("src/pages/RequestBox.jsx", "w") as f:
    f.write(content)
