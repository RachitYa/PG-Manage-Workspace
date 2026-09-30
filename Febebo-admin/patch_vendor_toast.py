import re

with open("src/pages/VendorTransactions.jsx", "r") as f:
    content = f.read()

# Add toastMsg state
state_match = "  const [vendorTransactions, setVendorTransactions] = useState([]);"
state_replace = "  const [vendorTransactions, setVendorTransactions] = useState([]);\n  const [toastMsg, setToastMsg] = useState(null);\n  const showToast = (msg, type='success') => { setToastMsg({msg, type}); setTimeout(() => setToastMsg(null), 3000); };"
content = content.replace(state_match, state_replace)

# Replace alert with showToast
content = content.replace("alert(`Rate ₹${req.rate || 0} saved for ${req.item}! Approved & sent to vendor.`);", "showToast(`Rate ₹${req.rate || 0} saved for ${req.item}! Approved & sent to vendor.`, 'success');")
content = content.replace("alert('Failed to approve request.');", "showToast('Failed to approve request.', 'error');")

# Add toast UI at the end
toast_ui = """
      {toastMsg && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: toastMsg.type === 'error' ? '#ef4444' : '#10b981', 
          color: 'white', padding: '12px 20px',
          borderRadius: 8, fontWeight: 700, fontSize: 14,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex', alignItems: 'center', gap: 8,
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <span className="material-symbols-outlined">{toastMsg.type === 'error' ? 'error' : 'check_circle'}</span>
          {toastMsg.msg}
        </div>
      )}
    </div>
  );
}
"""
content = re.sub(r"    </div>\s*\n\s*\);\s*\n\}\s*$", toast_ui, content)

with open("src/pages/VendorTransactions.jsx", "w") as f:
    f.write(content)
