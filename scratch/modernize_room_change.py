import re

with open('febebo-app/src/screens/MyProfile.jsx', 'r') as f:
    content = f.read()

# Fix the query (remove pId restriction to prevent empty results if pgId mismatch)
old_query = r"""           const rQ = query(collection(db, 'rooms'), where('adminId', '==', aId), where('pgId', '==', pId));
           const tQ = query(collection(db, 'tenants'), where('adminId', '==', aId), where('pgId', '==', pId));"""
new_query = r"""           const rQ = query(collection(db, 'rooms'), where('adminId', '==', aId));
           const tQ = query(collection(db, 'tenants'), where('adminId', '==', aId));"""
content = content.replace(old_query, new_query)

# Fix the occ matching (use String)
old_occ = r"""const occ = tenants.filter(t => t.roomNo === r.roomNo || t.room === r.roomNo).length;"""
new_occ = r"""const occ = tenants.filter(t => String(t.roomNo) === String(r.roomNo) || String(t.room) === String(r.roomNo)).length;"""
content = content.replace(old_occ, new_occ)

# Replace the select input with a modern UI
old_ui = r"""              <div className="price-input-wrapper">
                <span style={{ color: '#166534' }}>Request</span>
                <select 
                  value={reqRoom} 
                  onChange={e => setReqRoom(e.target.value)} 
                  style={{ paddingLeft: '80px', width: '100%', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '12px', fontSize: '15px', color: '#1e293b', outline: 'none', background: 'transparent', position: 'relative', zIndex: 2, cursor: 'pointer' }}
                >
                  <option value="" disabled>{isLoadingRooms ? 'Loading vacant rooms...' : 'Select a vacant room'}</option>
                  {vacantRoomsList.map(r => (
                     <option key={r.roomNo} value={r.roomNo}>Room {r.roomNo} ({r.vacant} bed{r.vacant > 1 ? 's' : ''} left)</option>
                  ))}
                </select>
              </div>"""

new_ui = r"""              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#166534', marginLeft: '4px' }}>Select Vacant Room</span>
                {isLoadingRooms ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>Loading rooms...</div>
                ) : vacantRoomsList.length === 0 ? (
                  <div style={{ padding: '16px', borderRadius: '12px', background: '#fef2f2', border: '1px dashed #fca5a5', textAlign: 'center', color: '#ef4444', fontSize: '14px', fontWeight: '600' }}>No vacant rooms available</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', maxHeight: '180px', overflowY: 'auto', padding: '4px' }}>
                    {vacantRoomsList.map(r => (
                       <div 
                         key={r.roomNo} 
                         onClick={() => setReqRoom(r.roomNo)}
                         style={{ 
                           padding: '12px', borderRadius: '12px', cursor: 'pointer',
                           border: reqRoom === r.roomNo ? '2px solid #16a34a' : '1.5px solid #e2e8f0',
                           background: reqRoom === r.roomNo ? '#dcfce7' : '#f8fafc',
                           display: 'flex', flexDirection: 'column', gap: '4px'
                         }}
                       >
                         <span style={{ fontSize: '14px', fontWeight: '800', color: reqRoom === r.roomNo ? '#166534' : '#0f172a' }}>Room {r.roomNo}</span>
                         <span style={{ fontSize: '12px', fontWeight: '600', color: reqRoom === r.roomNo ? '#15803d' : '#64748b' }}>{r.vacant} Bed{r.vacant > 1 ? 's' : ''} left</span>
                       </div>
                    ))}
                  </div>
                )}
              </div>"""
content = content.replace(old_ui, new_ui)

with open('febebo-app/src/screens/MyProfile.jsx', 'w') as f:
    f.write(content)

