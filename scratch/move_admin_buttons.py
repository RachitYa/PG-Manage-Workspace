import re

file_path = 'Febebo-admin/src/pages/Chat.jsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Extract the buttons block
buttons_regex = r"\s*\{\/\* Demand Token and Allot Room \*\/\}[\s\S]*?\n\s*\)\}\n"
match = re.search(buttons_regex, content)
if match:
    buttons_block = match.group(0)
    # Remove from header
    content = content.replace(buttons_block, "")
    
    # Ensure they have better styling for being at the bottom
    # We will wrap it in a div with background
    styled_buttons = """
        {/* Demand Token and Allot Room Actions */}
        {(activeContact?.role === 'enquiry' || activeContact?.role === 'applicant') && (
          <div style={{ position: 'fixed', bottom: 65, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: 'linear-gradient(to top, white 60%, rgba(255,255,255,0))', padding: '10px 12px 10px', boxSizing: 'border-box', zIndex: 39, display: 'flex', gap: '8px' }}>
            <button 
              onClick={openDemandModal}
              style={{ flex: 1, padding: '10px 12px', background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, boxShadow: '0 4px 12px rgba(217,119,6,0.15)' }}
            >
              🏠 {existingDemand ? 'Edit Offer' : 'Demand Token'}
            </button>
            <button 
              onClick={openAllotModal}
              style={{ flex: 1, padding: '10px 12px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, boxShadow: '0 4px 12px rgba(22,163,74,0.15)' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
              Allot Room
            </button>
          </div>
        )}
"""
    
    # 2. Inject right before {/* Input */}
    content = content.replace("{/* Input */}", styled_buttons + "\n        {/* Input */}")
    
    # 3. Increase paddingBottom of messages list to account for these buttons (from 80px to 130px)
    content = content.replace("padding: '16px 16px 80px'", "padding: '16px 16px 130px'")
    
    with open(file_path, 'w') as f:
        f.write(content)
    print("Buttons moved successfully.")
else:
    print("Could not find the buttons block to extract.")
