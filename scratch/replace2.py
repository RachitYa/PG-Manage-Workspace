import re

with open('Febebo-admin/src/pages/AdminDashboard.jsx', 'r') as f:
    content = f.read()

# I will replace the outer container and the inner map return block
content = re.sub(
    r"<div style={{ background: 'white', borderRadius: 20, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba\(0,0,0,0\.06\)', marginBottom: 28 }}>\s*\{dues\.map\(\(d, i\) => \(",
    r"<div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>\n          {dues.map((d, i) => (",
    content
)

content = re.sub(
    r"style=\{\{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', borderBottom: i < dues\.length - 1 \? '1px solid #f1f5f9' : 'none', cursor: 'pointer' \}\}>\s*<div style=\{\{ display: 'flex', alignItems: 'center', gap: 12 \}\}>\s*<div style=\{\{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', background: d\.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 15, fontWeight: 700, color: 'white' \}\}>\s*\{d\.img \? <img src=\{d\.img\} alt=\{d\.name\} style=\{\{ width: '100%', height: '100%', objectFit: 'cover' \}\} /> : d\.initials\}\s*</div>\s*<div>\s*<p style=\{\{ fontWeight: 700, color: '#0f172a', fontSize: 14, margin: 0 \}\}>\{d\.name\}</p>\s*<p style=\{\{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0' \}\}>Room \{d\.room\} · \{d\.plan\}</p>\s*</div>\s*</div>\s*<div style=\{\{ textAlign: 'right' \}\}>\s*<p style=\{\{ fontFamily: \"'Bricolage Grotesque',sans-serif\", fontWeight: 700, color: '#e11d48', fontSize: 16, margin: 0 \}\}>₹\{d\.amount\}</p>\s*<p style=\{\{ fontSize: 10, color: '#94a3b8', fontWeight: 500, margin: '2px 0 0', fontFamily: \"'JetBrains Mono',monospace\" \}\}>DUE \{d\.due\.toUpperCase\(\)\}</p>\s*</div>\s*</div>",
    r"""style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', padding: '12px 16px', borderRadius: 12, border: '1px solid #fee2e2', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                  ⚠️
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: '0 0 2px' }}>{d.name}</p>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>Room {d.room} · {d.due}</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>₹{d.amount}</p>
                <p style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, margin: 0 }}>Outstanding</p>
              </div>
            </div>""",
    content
)

with open('Febebo-admin/src/pages/AdminDashboard.jsx', 'w') as f:
    f.write(content)

print("Done")
