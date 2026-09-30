import os
import re

file_path = 'febebo-app/src/screens/Chat.jsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Add state variables
states_to_add = """
  const [paymentMode, setPaymentMode] = useState('Online');
  const [transactionId, setTransactionId] = useState('');
  const [receivedBy, setReceivedBy] = useState('');
"""
content = content.replace("const [tokenLoading, setTokenLoading] = useState(false);", "const [tokenLoading, setTokenLoading] = useState(false);\n" + states_to_add)


# 2. Modify logTokenPayment logic
log_logic_search = """      // 1. Save to student's own payment history (users/{uid}/payments)
      await addDoc(collection(db, 'users', user.uid, 'payments'), {"""

log_logic_replace = """      // 1. Save to student's own payment history (users/{uid}/payments)
      await addDoc(collection(db, 'users', user.uid, 'payments'), {
        paymentMode: paymentMode,
        transactionId: transactionId,
        receivedBy: receivedBy,"""
content = content.replace(log_logic_search, log_logic_replace)

# Modify system message payload
sys_msg_search = """      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: user.uid,
        text: `Token Payment Logged\\n\\nToken Paid: ₹${tokenAmount}\\nRent: ₹${rent}\\nSecurity: ₹${security}\\nTotal First Month: ₹${totalAmt}\\nRemaining: ₹${remainingAmount}`,
        timestamp: serverTimestamp(),
        isSystem: true,
        image: paymentScreenshot || null
      });"""

sys_msg_replace = """      let detailsText = `Token Payment Logged\\n\\nToken Paid: ₹${tokenAmount}\\nPayment Mode: ${paymentMode}`;
      if (paymentMode === 'Online' && transactionId) detailsText += `\\nTransaction ID: ${transactionId}`;
      if (receivedBy) detailsText += `\\nReceived By: ${receivedBy}`;
      detailsText += `\\n\\nRent: ₹${rent}\\nSecurity: ₹${security}\\nTotal First Month: ₹${totalAmt}\\nRemaining: ₹${remainingAmount}`;

      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: user.uid,
        text: detailsText,
        timestamp: serverTimestamp(),
        isSystem: true,
        image: paymentScreenshot || null
      });"""
content = content.replace(sys_msg_search, sys_msg_replace)

# Clear state on success
clear_state_search = """      setPaymentScreenshot(null);
      setTokenAmount('');"""
clear_state_replace = """      setPaymentScreenshot(null);
      setTokenAmount('');
      setPaymentMode('Online');
      setTransactionId('');
      setReceivedBy('');"""
content = content.replace(clear_state_search, clear_state_replace)

# 3. Modify UI
ui_search = """                  <label style="display: block; fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6">Token Amount You Are Paying Now (₹)</label>"""
ui_search_regex = r"<label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Token Amount You Are Paying Now \(₹\)</label>\s*<input\s*type=\"number\"\s*value=\{tokenAmount\}\s*onChange=\{e => setTokenAmount\(e.target.value\)\}\s*placeholder=\"e\.g\. 2000\"\s*style=\{\{.*?\}\}\s*/>"

ui_replace = """<label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Token Amount You Are Paying Now (₹) *</label>
                  <input
                    type="number"
                    value={tokenAmount}
                    onChange={e => setTokenAmount(e.target.value)}
                    placeholder="e.g. 2000"
                    style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid #d1fae5', marginBottom: 16, fontSize: 15, boxSizing: 'border-box', outline: 'none' }}
                  />

                  <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Payment Mode *</label>
                      <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none' }}>
                        <option value="Online">Online</option>
                        <option value="Cash">Cash</option>
                      </select>
                    </div>
                    {paymentMode === 'Online' && (
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Transaction ID</label>
                        <input type="text" value={transactionId} onChange={e => setTransactionId(e.target.value)} placeholder="e.g. UPI Ref" style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 14, boxSizing: 'border-box', outline: 'none' }} />
                      </div>
                    )}
                  </div>

                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Payment Received By (Name / Role)</label>
                  <input type="text" value={receivedBy} onChange={e => setReceivedBy(e.target.value)} placeholder="e.g. Rahul (Manager)" style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', marginBottom: 16, fontSize: 14, boxSizing: 'border-box', outline: 'none' }} />
"""

content = re.sub(ui_search_regex, ui_replace, content)

with open(file_path, 'w') as f:
    f.write(content)

print("Patch applied to febebo-app/src/screens/Chat.jsx")
