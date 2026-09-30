import sys

file_path = "Febebo-admin/src/pages/VisitorLog.jsx"
with open(file_path, "r") as f:
    content = f.read()

# 1. Add selectedVisitor state and handleMarkVisitor
state_old = "  const [newVisitor, setNewVisitor] = useState({ name: '', phone: '', visiting: '', purpose: 'Personal Visit', note: '' });"
state_new = """  const [newVisitor, setNewVisitor] = useState({ name: '', phone: '', visiting: '', purpose: 'Personal Visit', note: '' });
  const [selectedVisitor, setSelectedVisitor] = useState(null);

  const handleMarkVisitor = async (id) => {
    try {
      await updateDoc(doc(db, 'visitors', id), {
        marked: true
      });
      setSelectedVisitor(null);
    } catch (e) {
      console.error(e);
    }
  };"""
content = content.replace(state_old, state_new)

# 2. Remove handleLogExit
handle_exit_old = """  const handleLogExit = async (id) => {
    const now = new Date();
    const timeOut = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    try {
      await updateDoc(doc(db, 'visitors', id), {
        status: 'Exited',
        timeOut
      });
    } catch (e) {
      console.error(e);
    }
  };"""
content = content.replace(handle_exit_old, "")

# 3. Simplify inline card and remove inline ID Card and inline Log Exit
list_old = """        {/* Visitor List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {visitors.map(visitor => {
            const vName = visitor.name || visitor.visitorName || 'Unknown';
            const vPhone = visitor.phone || visitor.contact || 'N/A';
            const vVisiting = visitor.visiting || visitor.tenantName || 'Unknown';
            return (
            <div key={visitor.id} style={{ background: 'white', borderRadius: 16, padding: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', color: '#1e293b', fontFamily: "'Bricolage Grotesque', sans-serif" }}>{vName}</h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>phone</span> {vPhone}
                  </p>
                </div>
                <div style={{ background: visitor.purpose === 'Delivery' ? '#fef3c7' : '#e0f2fe', color: visitor.purpose === 'Delivery' ? '#d97706' : '#0284c7', padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600 }}>
                  {visitor.purpose || 'Visit'}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, padding: '8px 12px', background: '#f8fafc', borderRadius: 8 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#94a3b8' }}>person</span>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569' }}>Visiting: <strong>{vVisiting}</strong></p>
                {visitor.tenantName && (
                  <span style={{ marginLeft: 'auto', background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: 12, fontSize: '0.7rem', fontWeight: 600 }}>App User</span>
                )}
              </div>

              {visitor.idCard && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ margin: '0 0 6px', fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>ID Document</p>
                  <img src={visitor.idCard} alt="ID Document" style={{ width: '100%', maxHeight: 140, objectFit: 'cover', borderRadius: 8, border: '1px solid #e2e8f0' }} onClick={() => window.open(visitor.idCard, '_blank')} />
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10b981', fontSize: '0.8rem', fontWeight: 600 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>login</span> {visitor.timeIn || 'Logged'}
                  </div>
                  {visitor.status === 'Exited' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748b', fontSize: '0.8rem' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>logout</span> {visitor.timeOut}
                    </div>
                  )}
                  {visitor.status === 'Inside' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#e11d48', fontSize: '0.8rem', fontWeight: 600 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>error</span> Still Inside
                    </div>
                  )}
                </div>
                {visitor.status === 'Inside' && (
                  <button onClick={() => handleLogExit(visitor.id)} style={{ background: '#0891b2', color: 'white', border: 'none', padding: '6px 16px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                    Log Exit
                  </button>
                )}
              </div>
            </div>
          )})}"""

list_new = """        {/* Visitor List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {visitors.map(visitor => {
            const vName = visitor.name || visitor.visitorName || 'Unknown';
            const vPhone = visitor.phone || visitor.contact || 'N/A';
            const vVisiting = visitor.visiting || visitor.tenantName || 'Unknown';
            return (
            <div key={visitor.id} onClick={() => setSelectedVisitor({ ...visitor, vName, vPhone, vVisiting })} style={{ background: 'white', borderRadius: 16, padding: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', color: '#1e293b', fontFamily: "'Bricolage Grotesque', sans-serif" }}>{vName}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: visitor.status === 'Inside' ? '#fef2f2' : '#f0fdf4', color: visitor.status === 'Inside' ? '#ef4444' : '#16a34a' }}>
                      {visitor.status || 'Inside'}
                    </span>
                    {!visitor.marked && (
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#d97706', background: '#fffbeb', padding: '2px 8px', borderRadius: 12 }}>Unmarked</span>
                    )}
                  </div>
                </div>
                <div style={{ background: visitor.purpose === 'Delivery' ? '#fef3c7' : '#e0f2fe', color: visitor.purpose === 'Delivery' ? '#d97706' : '#0284c7', padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600 }}>
                  {visitor.purpose || 'Visit'}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: '#f8fafc', borderRadius: 8 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#94a3b8' }}>person</span>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569' }}>Visiting: <strong>{vVisiting}</strong></p>
                {visitor.tenantName && (
                  <span style={{ marginLeft: 'auto', background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: 12, fontSize: '0.7rem', fontWeight: 600 }}>App User</span>
                )}
              </div>
            </div>
          )})}"""
content = content.replace(list_old, list_new)

# 4. Add SelectedVisitor Modal
modal_code = """      {/* Detailed Visitor Modal */}
      {selectedVisitor && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', maxWidth: 480, margin: '0 auto' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)' }} onClick={() => setSelectedVisitor(null)}></div>
          <div style={{ background: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 0, position: 'relative', zIndex: 11, animation: 'slideUp 0.3s ease-out', maxHeight: '90vh', overflowY: 'auto' }}>
            
            <div style={{ background: '#f8fafc', padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'sticky', top: 0, zIndex: 12 }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.2rem', color: '#0f172a', fontFamily: "'Bricolage Grotesque', sans-serif" }}>{selectedVisitor.vName}</h3>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: selectedVisitor.status === 'Inside' ? '#fef2f2' : '#f0fdf4', color: selectedVisitor.status === 'Inside' ? '#ef4444' : '#16a34a' }}>
                  {selectedVisitor.status || 'Inside'}
                </span>
              </div>
              <button onClick={() => setSelectedVisitor(null)} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>
            
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem', color: '#475569' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#64748b' }}>calendar_today</span> 
                  <span>Date: <strong>{selectedVisitor.visitDate || new Date(selectedVisitor.createdAt).toLocaleDateString()}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem', color: '#475569' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#64748b' }}>login</span> 
                  <span>Time In: <strong>{selectedVisitor.timeIn || 'N/A'}</strong></span>
                </div>
                {selectedVisitor.timeOut && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem', color: '#475569' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#64748b' }}>logout</span> 
                    <span>Time Out: <strong>{selectedVisitor.timeOut}</strong></span>
                  </div>
                )}
                {selectedVisitor.vPhone !== 'N/A' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem', color: '#475569' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#64748b' }}>call</span> 
                    <span>Phone: <strong>{selectedVisitor.vPhone}</strong></span>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem', color: '#475569' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#64748b' }}>description</span> 
                  <span>Purpose: <strong>{selectedVisitor.purpose || 'Visit'}</strong></span>
                </div>
              </div>

              {selectedVisitor.idCard && (
                <div style={{ marginBottom: 24 }}>
                  <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', margin: '0 0 8px' }}>ID Card Document</p>
                  <div style={{ width: '100%', height: 200, borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={selectedVisitor.idCard} alt="ID Document" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} onClick={() => window.open(selectedVisitor.idCard, '_blank')} />
                  </div>
                </div>
              )}

              {!selectedVisitor.marked && (
                <button 
                  onClick={() => handleMarkVisitor(selectedVisitor.id)}
                  style={{ width: '100%', background: '#10b981', color: 'white', padding: 16, borderRadius: 12, fontWeight: 700, fontSize: '1rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>done_all</span> Mark as Verified
                </button>
              )}
              {selectedVisitor.marked && (
                <div style={{ width: '100%', background: '#f0fdf4', color: '#16a34a', padding: 16, borderRadius: 12, fontWeight: 700, fontSize: '1rem', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>verified</span> Verified & Marked
                </div>
              )}
            </div>
          </div>
        </div>
      )}
"""
content = content.replace("      <style>{`", modal_code + "      <style>{`")

with open(file_path, "w") as f:
    f.write(content)
print("Updated VisitorLog.jsx successfully")
