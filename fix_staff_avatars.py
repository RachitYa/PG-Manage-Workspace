import re

file_path = "/Users/shreyassingh/Downloads/PG MANAGE @/febebo-staff/src/pages/StaffApp.jsx"

with open(file_path, "r") as f:
    content = f.read()

# Fix 1: Sidebar top profile
old_sidebar = """          <div style={{width:52, height:52, borderRadius:12, background: meta.accentBg, border: '1px solid #e2e8f0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, marginBottom:12, boxShadow: '0 2px 8px rgba(15,23,42,0.04)'}}>
            {meta.emoji}
          </div>"""

new_sidebar = """          {profilePic ? (
            <img src={profilePic} alt="Profile" style={{width:52, height:52, borderRadius:12, objectFit:'cover', marginBottom:12, border:'1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(15,23,42,0.04)'}} />
          ) : (
            <div style={{width:52, height:52, borderRadius:12, background: meta.accentBg, border: '1px solid #e2e8f0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, marginBottom:12, boxShadow: '0 2px 8px rgba(15,23,42,0.04)'}}>
              {meta.emoji}
            </div>
          )}"""

content = content.replace(old_sidebar, new_sidebar)

# Fix 2: Greeting card
old_greeting = """            <div style={{display:'flex', alignItems:'center', gap:10, marginTop:4}}>
              <div style={{width:40, height:40, borderRadius:12, background: meta.accentBg, border: '1.5px solid #e8df9a', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, boxShadow:'0 2px 6px rgba(0,0,0,0.05)'}}>
                {meta.emoji}
              </div>"""

new_greeting = """            <div style={{display:'flex', alignItems:'center', gap:10, marginTop:4}}>
              {profilePic ? (
                <img src={profilePic} alt="Profile" style={{width:40, height:40, borderRadius:12, objectFit:'cover', border: '1.5px solid #e8df9a', boxShadow:'0 2px 6px rgba(0,0,0,0.05)'}} />
              ) : (
                <div style={{width:40, height:40, borderRadius:12, background: meta.accentBg, border: '1.5px solid #e8df9a', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, boxShadow:'0 2px 6px rgba(0,0,0,0.05)'}}>
                  {meta.emoji}
                </div>
              )}"""

content = content.replace(old_greeting, new_greeting)

with open(file_path, "w") as f:
    f.write(content)

print("Patch applied for UI avatars.")
