import sys

file_path = "Febebo-admin/src/pages/VisitorLog.jsx"
with open(file_path, "r") as f:
    content = f.read()

old_list = """        {/* Visitor List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {visitors.map(visitor => (
            <div key={visitor.id} style={{ background: 'white', borderRadius: 16, padding: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', color: '#1e293b', fontFamily: "'Bricolage Grotesque', sans-serif" }}>{visitor.name}</h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>phone</span> {visitor.phone}
                  </p>
                </div>
                <div style={{ background: visitor.purpose === 'Delivery' ? '#fef3c7' : '#e0f2fe', color: visitor.purpose === 'Delivery' ? '#d97706' : '#0284c7', padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600 }}>
                  {visitor.purpose}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, padding: '8px 12px', background: '#f8fafc', borderRadius: 8 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#94a3b8' }}>person</span>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569' }}>Visiting: <strong>{visitor.visiting}</strong></p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10b981', fontSize: '0.8rem', fontWeight: 600 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>login</span> {visitor.timeIn}
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
          ))}"""

new_list = """        {/* Visitor List */}
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

content = content.replace(old_list, new_list)

with open(file_path, "w") as f:
    f.write(content)
print("Updated VisitorLog.jsx successfully")
