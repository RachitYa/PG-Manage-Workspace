import re

with open('febebo-staff/src/pages/StaffApp.jsx', 'r') as f:
    content = f.read()

old_block = """              ...(staffRole === 'Manager' ? [
                {id:'enquiry',    label:'Enquiry',      icon:'contact_support',        bg:'#ecfeff', c:'#0891b2'},
                {id:'add_tenant', label:'Add Tenant',   icon:'person_add',             bg:'#f0fdf4', c:'#16a34a'},
              ] : []),"""

new_block = """              ...(staffRole === 'Manager' ? [
                {id:'enquiry',    label:'Enquiry',      icon:'contact_support',        bg:'#ecfeff', c:'#0891b2'},
                {id:'add_tenant', label:'Add Tenant',   icon:'person_add',             bg:'#f0fdf4', c:'#16a34a'},
                {id:'visitor',    label:'Visitors',     icon:'recent_actors',          bg:'#fffbeb', c:'#d97706'},
              ] : []),"""

if old_block in content:
    content = content.replace(old_block, new_block)
    with open('febebo-staff/src/pages/StaffApp.jsx', 'w') as f:
        f.write(content)
    print("Replaced!")
else:
    print("Not found!")
