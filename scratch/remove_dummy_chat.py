import re

with open('febebo-staff/src/pages/StaffApp.jsx', 'r') as f:
    content = f.read()

# I will replace the INIT_CONTACTS and INIT_MESSAGES arrays/objects with empty ones.
# Find where they are declared and replace them.

old_contacts = """const INIT_CONTACTS = [
  {id:'c1', name:'Manager / Admin', role:'Property Admin', phone:'+91 99999 00000', isPinned:true, reminder:null, lastMsg:'Update daily logs by 6 PM today.', time:'09:00 AM', type:'admin'},
  {id:'c2', name:'Priya Sharma', role:'Student · Room 102', phone:'+91 98888 77777', isPinned:false, reminder:'Check AC remote today 5:00 PM', lastMsg:'Can room 102 bathroom be cleaned at 11 AM?', time:'09:15 AM', type:'student', room:'102'},
  {id:'c3', name:'Dinesh (Maint.)', role:'Staff · Electrician', phone:'+91 97777 66666', isPinned:false, reminder:null, lastMsg:'Room 201 AC issue has been resolved.', time:'11:30 AM', type:'staff'},
];"""

new_contacts = """const INIT_CONTACTS = [];"""

content = content.replace(old_contacts, new_contacts)

old_messages = """const INIT_MESSAGES = {
  'c1': [
    {id:1, text:'Good morning team! Update daily logs by 6 PM today.', time:'09:00 AM', me:false},
    {id:2, text:'Monthly salary will be credited on 1st Aug.', time:'10:00 AM', me:false}
  ],
  'c2': [
    {id:3, text:'Can room 102 bathroom be cleaned at 11 AM?', time:'09:15 AM', me:false}
  ],
  'c3': [
    {id:4, text:'Room 201 AC issue has been resolved.', time:'11:30 AM', me:false}
  ]
};"""

new_messages = """const INIT_MESSAGES = {};"""

content = content.replace(old_messages, new_messages)

# Also remove the fallback logic that re-inserts INIT_CONTACTS
old_sync_logic = """      // Keep starter contacts if no external contacts loaded yet
      if (map.size <= 1) {
        INIT_CONTACTS.forEach(ic => {
          if (!map.has(ic.id)) map.set(ic.id, ic);
        });
      }"""

new_sync_logic = """      // Starter contacts disabled"""

content = content.replace(old_sync_logic, new_sync_logic)

with open('febebo-staff/src/pages/StaffApp.jsx', 'w') as f:
    f.write(content)

print("Dummy data removed!")
