import re

file_path = 'Febebo-admin/src/pages/Chat.jsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Remove from top right corner
top_right_search = """          {(activeContact?.role !== 'staff') && (
            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
              <button 
                onClick={openDemandModal}
                style={{ padding: '6px 10px', background: 'rgba(245,158,11,0.15)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 10, fontWeight: 700, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                🏠 {existingDemand ? 'Edit' : 'Demand'}
              </button>
              <button 
                onClick={openAllotModal}
                style={{ padding: '6px 10px', background: 'rgba(34,197,94,0.15)', color: '#86efac', border: '1px solid rgba(34,197,94,0.4)', borderRadius: 10, fontWeight: 700, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check_circle</span>
                Allot
              </button>
            </div>
          )}
"""
content = content.replace(top_right_search, "")

# 2. Add back to the bottom input bar container
# We need to find the input container
input_search = """        {/* Input */}
        <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: 'white', borderTop: '1px solid #e2e8f0', padding: '8px 12px', paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))', boxSizing: 'border-box', zIndex: 40, display: 'flex', flexDirection: 'column' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>"""

new_buttons_bottom = """        {/* Input */}
        <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: 'white', borderTop: '1px solid #e2e8f0', padding: '8px 12px', paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))', boxSizing: 'border-box', zIndex: 40, display: 'flex', flexDirection: 'column' }}>

          {/* Demand Token and Allot Room Actions */}
          {(activeContact?.role === 'enquiry' || activeContact?.role === 'applicant') && (
            <div style={{ display: 'flex', gap: '8px', width: '100%', paddingBottom: 8 }}>
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

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>"""

content = content.replace(input_search, new_buttons_bottom)

with open(file_path, 'w') as f:
    f.write(content)

print("Reverted buttons to the bottom inside the input container.")
