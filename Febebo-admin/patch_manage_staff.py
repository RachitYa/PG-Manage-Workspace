with open("src/pages/ManageStaff.jsx", "r") as f:
    content = f.read()

content = content.replace(
    "const [newStaff, setNewStaff] = useState({ name: '', role: '', phone: '', salary: '', payDate: '1' });",
    "const [newStaff, setNewStaff] = useState({ name: '', role: '', phone: '', salary: '', payDate: '1', joinDate: new Date().toISOString().split('T')[0] });"
)

content = content.replace(
    "setNewStaff({ name: '', role: '', phone: '', salary: '', payDate: '1' });",
    "setNewStaff({ name: '', role: '', phone: '', salary: '', payDate: '1', joinDate: new Date().toISOString().split('T')[0] });"
)

content = content.replace(
    "createdAt: new Date().toISOString()",
    "createdAt: new Date(newStaff.joinDate || Date.now()).toISOString()"
)

new_input = """                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 6 }}>Join Date <span style={{ color: '#e11d48' }}>*</span></label>
                  <input type="date" required value={newStaff.joinDate} onChange={(e) => setNewStaff({ ...newStaff, joinDate: e.target.value })} style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 15, fontFamily: 'inherit', background: 'white', outline: 'none', boxSizing: 'border-box' }} />
                </div>"""

content = content.replace(
    "                <div style={{ marginBottom: 24 }}>\n                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 6 }}>Pay Date (1-31) <span style={{ color: '#e11d48' }}>*</span></label>",
    new_input + "\n                <div style={{ marginBottom: 24 }}>\n                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 6 }}>Pay Date (1-31) <span style={{ color: '#e11d48' }}>*</span></label>"
)

with open("src/pages/ManageStaff.jsx", "w") as f:
    f.write(content)
