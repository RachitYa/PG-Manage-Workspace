import re

file_path = 'Febebo-admin/src/pages/Chat.jsx'
with open(file_path, 'r') as f:
    content = f.read()

# Replace the inline style of the action buttons container
# Current: style={{ position: 'fixed', bottom: 65, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: 'linear-gradient(to top, white 60%, rgba(255,255,255,0))', padding: '10px 12px 10px', boxSizing: 'border-box', zIndex: 39, display: 'flex', gap: '8px' }}
search_str = "bottom: 65, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: 'linear-gradient(to top, white 60%, rgba(255,255,255,0))', padding: '10px 12px 10px', boxSizing: 'border-box', zIndex: 39, display: 'flex', gap: '8px'"
replace_str = "bottom: 65, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: 'linear-gradient(to top, white 60%, rgba(255,255,255,0))', padding: '10px 12px 10px', boxSizing: 'border-box', zIndex: 41, display: 'flex', gap: '8px', paddingBottom: 'env(safe-area-inset-bottom, 10px) + 10px'"

# Actually, the safest way is to put the buttons INSIDE the input container so they stack perfectly.
# Let's extract the buttons block again.
buttons_regex = r"\s*\{\/\* Demand Token and Allot Room Actions \*\/\}[\s\S]*?\n\s*\)\}\n"
match = re.search(buttons_regex, content)
if match:
    buttons_block = match.group(0)
    # Remove from original location
    content = content.replace(buttons_block, "")
    
    # Redefine them without position:fixed, because they will go inside the input's fixed container
    new_buttons = """
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
"""
    
    # Replace the input container
    input_search = """        {/* Input */}
        <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: 'white', borderTop: '1px solid #e2e8f0', padding: '8px 12px', boxSizing: 'border-box', zIndex: 40, display: 'flex', alignItems: 'center', gap: 8 }}>"""
    
    input_replace = """        {/* Input */}
        <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: 'white', borderTop: '1px solid #e2e8f0', padding: '8px 12px', paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))', boxSizing: 'border-box', zIndex: 40, display: 'flex', flexDirection: 'column' }}>
""" + new_buttons + """
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>"""
    
    content = content.replace(input_search, input_replace)
    
    # The end of the input container div needs to close the inner flex row
    # The original ends with:
    #           <button ...>
    #             <span ...>send</span>
    #           </button>
    #         </div>
    
    content = content.replace("""            <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'white' }}>send</span>
          </button>
        </div>""", """            <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'white' }}>send</span>
          </button>
          </div>
        </div>""")
        
    with open(file_path, 'w') as f:
        f.write(content)
    print("Fixed layout of action buttons")
else:
    print("Could not find buttons block")
