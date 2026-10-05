import re

with open('febebo-staff/src/pages/StaffApp.jsx', 'r') as f:
    content = f.read()

# Add import
content = content.replace("class ErrorBoundary extends React.Component {", "import VisitorLog from './VisitorLog';\n\nclass ErrorBoundary extends React.Component {")

# Add render logic
render_logic = """
      {/* --- MANAGER: VISITOR VIEW --- */}
      {view === 'visitor' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'white', overflowY: 'auto' }}>
          <VisitorLog onClose={() => setView('dashboard')} />
        </div>
      )}

      {/* ─── MANAGER: ENQUIRY VIEW ─── */}
"""

content = content.replace("{/* ─── MANAGER: ENQUIRY VIEW ─── */}", render_logic)

with open('febebo-staff/src/pages/StaffApp.jsx', 'w') as f:
    f.write(content)

print("Visitor Log injected!")
