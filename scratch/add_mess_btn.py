import re

with open('febebo-staff/src/pages/StaffApp.jsx', 'r') as f:
    content = f.read()

old_block = """              ...(staffRole === 'Manager' ? [
                {id:'enquiry',    label:'Enquiry',      icon:'contact_support',        bg:'#ecfeff', c:'#0891b2'},
                {id:'add_tenant', label:'Add Tenant',   icon:'person_add',             bg:'#f0fdf4', c:'#16a34a'},
                {id:'visitor',    label:'Visitors',     icon:'recent_actors',          bg:'#fffbeb', c:'#d97706'},
              ] : []),"""

new_block = """              ...(staffRole === 'Manager' ? [
                {id:'enquiry',    label:'Enquiry',      icon:'contact_support',        bg:'#ecfeff', c:'#0891b2'},
                {id:'add_tenant', label:'Add Tenant',   icon:'person_add',             bg:'#f0fdf4', c:'#16a34a'},
                {id:'visitor',    label:'Visitors',     icon:'recent_actors',          bg:'#fffbeb', c:'#d97706'},
                {id:'mess',       label:'Mess',         icon:'restaurant',             bg:'#fce7f3', c:'#be185d'},
              ] : []),"""

if old_block in content:
    content = content.replace(old_block, new_block)
    
    # Add import
    content = content.replace("import VisitorLog from './VisitorLog';", "import VisitorLog from './VisitorLog';\nimport MessHeadcount from './MessHeadcount';")
    
    # Add render logic
    render_logic = """
      {/* --- MANAGER: MESS VIEW --- */}
      {view === 'mess' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'white', overflowY: 'auto' }}>
          <MessHeadcount onClose={() => setView('home')} />
        </div>
      )}

      {/* --- MANAGER: VISITOR VIEW --- */}
"""
    content = content.replace("{/* --- MANAGER: VISITOR VIEW --- */}", render_logic)
    
    with open('febebo-staff/src/pages/StaffApp.jsx', 'w') as f:
        f.write(content)
    print("Mess option added to StaffApp.jsx")
else:
    print("Block not found!")
