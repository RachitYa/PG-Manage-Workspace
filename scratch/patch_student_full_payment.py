import re

file_path = 'febebo-app/src/screens/StudentDashboard.jsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Inject state variables
state_search = "  const [showPayModal, setShowPayModal] = useState(false);"
state_inject = """  const [showPayModal, setShowPayModal] = useState(false);
  const [fullPaymentMode, setFullPaymentMode] = useState('Online');
  const [fullTransactionId, setFullTransactionId] = useState('');
  const [fullReceivedBy, setFullReceivedBy] = useState('');"""
content = content.replace(state_search, state_inject)

# 2. Modify submitFullPayment notification and chat text
submit_search = """      // 2. Notification for Admin
      await addDoc(collection(db, 'notifications'), {
        adminId: adminId,
        title: 'Full Payment Received',
        desc: `${user.name || 'Student'} paid ₹${amountToPay} for their remaining balance. Please make a record of the payment you received and approve them.`,
        type: 'success', action: 'VIEW_TENANTS', unread: true, createdAt: isoString,
        resolved: false
      });
      
      // 3. Notification for Student
      await addDoc(collection(db, 'users', user.uid, 'notifications'), {
        title: 'Payment Logged',
        desc: `You paid ₹${amountToPay} for the remaining balance. The admin has been notified.`,
        type: 'success', action: 'VIEW_PAYMENTS', unread: true, createdAt: isoString
      });
      
      // 4. System Chat Message with Screenshot
      const chatId = user.uid > adminId ? user.uid + "_" + adminId : adminId + "_" + user.uid;
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text: `[SYSTEM] I have logged a payment of ₹${amountToPay} towards my pending balance. Please verify and unlock my dashboard.`,
        screenshot: payScreenshot || null,"""

submit_inject = """      // 2. Notification for Admin
      await addDoc(collection(db, 'notifications'), {
        adminId: adminId,
        title: 'Full Payment Received',
        desc: `${user.name || 'Student'} paid ₹${amountToPay} for their remaining balance. Mode: ${fullPaymentMode}${fullPaymentMode === 'Online' && fullTransactionId ? ` (Txn ID: ${fullTransactionId})` : ''}. Received By: ${fullReceivedBy || 'Not specified'}. Please verify.`,
        type: 'success', action: 'VIEW_TENANTS', unread: true, createdAt: isoString,
        resolved: false
      });
      
      // 3. Notification for Student
      await addDoc(collection(db, 'users', user.uid, 'notifications'), {
        title: 'Payment Logged',
        desc: `You paid ₹${amountToPay} for the remaining balance via ${fullPaymentMode}. The admin has been notified.`,
        type: 'success', action: 'VIEW_PAYMENTS', unread: true, createdAt: isoString
      });
      
      // 4. System Chat Message with Screenshot
      const chatId = user.uid > adminId ? user.uid + "_" + adminId : adminId + "_" + user.uid;
      const chatMessageText = `💰 Full Payment Logged\\n` +
        `Amount Paid: ₹${amountToPay}\\n` +
        `Payment Mode: ${fullPaymentMode}\\n` +
        (fullPaymentMode === 'Online' && fullTransactionId ? `Transaction ID: ${fullTransactionId}\\n` : '') +
        (fullReceivedBy ? `Received By: ${fullReceivedBy}\\n` : '') +
        `\\nPlease verify and unlock my dashboard.`;

      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text: chatMessageText,
        screenshot: payScreenshot || null,"""
content = content.replace(submit_search, submit_inject)

# 3. Clear states on success
clear_search = """      setShowPayModal(false);
      setPayAmount('');
      setPayScreenshot(null);"""
clear_inject = """      setShowPayModal(false);
      setPayAmount('');
      setPayScreenshot(null);
      setFullPaymentMode('Online');
      setFullTransactionId('');
      setFullReceivedBy('');"""
content = content.replace(clear_search, clear_inject)

# Clear states on cancel
cancel_search = "onClick={() => { setShowPayModal(false); setPayScreenshot(null); }}"
cancel_inject = "onClick={() => { setShowPayModal(false); setPayScreenshot(null); setFullPaymentMode('Online'); setFullTransactionId(''); setFullReceivedBy(''); }}"
content = content.replace(cancel_search, cancel_inject)

# 4. Inject UI in Modal
modal_search = """            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Payment Screenshot *</label>"""
modal_inject = """            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Payment Mode *</label>
                <select value={fullPaymentMode} onChange={e => setFullPaymentMode(e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none' }}>
                  <option value="Online">Online</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>
              {fullPaymentMode === 'Online' && (
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Transaction ID</label>
                  <input type="text" value={fullTransactionId} onChange={e => setFullTransactionId(e.target.value)} placeholder="e.g. UPI Ref" style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 14, boxSizing: 'border-box', outline: 'none' }} />
                </div>
              )}
            </div>

            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Payment Received By (Name / Role)</label>
            <input type="text" value={fullReceivedBy} onChange={e => setFullReceivedBy(e.target.value)} placeholder="e.g. Rahul (Manager)" style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', marginBottom: 16, fontSize: 14, boxSizing: 'border-box', outline: 'none' }} />

            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Payment Screenshot *</label>"""
content = content.replace(modal_search, modal_inject)


with open(file_path, 'w') as f:
    f.write(content)

print("Patched StudentDashboard.jsx for Log Full Payment details")
