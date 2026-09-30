import re

file_path = 'Febebo-admin/src/pages/Chat.jsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Remove from bottom input bar
buttons_regex = r"\s*\{\/\* Demand Token and Allot Room Actions \*\/\}[\s\S]*?\n\s*\)\}\n"
match = re.search(buttons_regex, content)
if match:
    buttons_block = match.group(0)
    content = content.replace(buttons_block, "")
else:
    print("Warning: Could not find buttons block at bottom.")

# 2. Inject into header
# Find the call button in the header
call_btn_search = """          {activeContact.phone && (
            <a href={`tel:${activeContact.phone}`}"""

new_buttons = """          {(activeContact?.role === 'enquiry' || activeContact?.role === 'applicant') && (
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

content = content.replace(call_btn_search, new_buttons + call_btn_search)

with open(file_path, 'w') as f:
    f.write(content)

print("Moved buttons to top right corner.")
