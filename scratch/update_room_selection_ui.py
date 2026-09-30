import re

with open('febebo-app/src/screens/MyProfile.jsx', 'r') as f:
    content = f.read()

# Add showRoomGrid state
state_old = r"""  const \[isSubmittingReq, setIsSubmittingReq\] = useState\(false\);"""
state_new = r"""  const [isSubmittingReq, setIsSubmittingReq] = useState(false);
  const [showRoomGrid, setShowRoomGrid] = useState(false);"""
content = re.sub(state_old, state_new, content)

# Reset showRoomGrid when modal opens
modal_open_old = r"""onClick=\{\(\) => setIsRoomChangeModalOpen\(true\)\}"""
modal_open_new = r"""onClick={() => { setIsRoomChangeModalOpen(true); setShowRoomGrid(false); setReqRoom(''); setReqReason(''); }}"""
content = re.sub(modal_open_old, modal_open_new, content)

# Modify the UI block
ui_old = r"""              <div style=\{\{ display: 'flex', flexDirection: 'column', gap: '8px' \}\}>
                <span style=\{\{ fontSize: '13px', fontWeight: '700', color: '#166534', marginLeft: '4px' \}\}>Select Vacant Room</span>
                \{isLoadingRooms \? \(
                  <div style=\{\{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' \}\}>Loading rooms\.\.\.</div>
                \) : vacantRoomsList\.length === 0 \? \(
                  <div style=\{\{ padding: '16px', borderRadius: '12px', background: '#fef2f2', border: '1px dashed #fca5a5', textAlign: 'center', color: '#ef4444', fontSize: '14px', fontWeight: '600' \}\}>No vacant rooms available</div>
                \) : \(
                  <div style=\{\{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', maxHeight: '180px', overflowY: 'auto', padding: '4px' \}\}>
                    \{vacantRoomsList\.map\(r => \(
                       <div 
                         key=\{r\.roomNo\} 
                         onClick=\{\(\) => setReqRoom\(r\.roomNo\)\}
                         style=\{\{ 
                           padding: '12px', borderRadius: '12px', cursor: 'pointer',
                           border: reqRoom === r\.roomNo \? '2px solid #16a34a' : '1\.5px solid #e2e8f0',
                           background: reqRoom === r\.roomNo \? '#dcfce7' : '#f8fafc',
                           display: 'flex', flexDirection: 'column', gap: '4px'
                         \}\}
                       >
                         <span style=\{\{ fontSize: '14px', fontWeight: '800', color: reqRoom === r\.roomNo \? '#166534' : '#0f172a' \}\}>Room \{r\.roomNo\}</span>
                         <span style=\{\{ fontSize: '12px', fontWeight: '600', color: reqRoom === r\.roomNo \? '#15803d' : '#64748b' \}\}>\{r\.vacant\} Bed\{r\.vacant > 1 \? 's' : ''\} left</span>
                       </div>
                    \)\)\}
                  </div>
                \)\}
              </div>"""

ui_new = r"""              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#166534', marginLeft: '4px' }}>Requested Room</span>
                
                <div 
                  onClick={() => setShowRoomGrid(!showRoomGrid)}
                  style={{ 
                    padding: '16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: 'white', 
                    cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}
                >
                  {reqRoom ? (
                    <span style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Room {reqRoom}</span>
                  ) : (
                    <span style={{ fontSize: '15px', color: '#94a3b8' }}>Tap to select a vacant room</span>
                  )}
                  <ChevronRight size={18} color="#64748b" style={{ transform: showRoomGrid ? 'rotate(90deg)' : 'rotate(0deg)', transition: '0.2s' }} />
                </div>

                {showRoomGrid && (
                  <div style={{ marginTop: '4px' }}>
                    {isLoadingRooms ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>Loading rooms...</div>
                    ) : vacantRoomsList.length === 0 ? (
                      <div style={{ padding: '16px', borderRadius: '12px', background: '#fef2f2', border: '1px dashed #fca5a5', textAlign: 'center', color: '#ef4444', fontSize: '14px', fontWeight: '600' }}>No vacant rooms available</div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', maxHeight: '200px', overflowY: 'auto', padding: '4px' }}>
                        {vacantRoomsList.map(r => (
                           <div 
                             key={r.roomNo} 
                             onClick={() => { setReqRoom(r.roomNo); setShowRoomGrid(false); }}
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
                  </div>
                )}
              </div>"""
content = re.sub(ui_old, ui_new, content)

with open('febebo-app/src/screens/MyProfile.jsx', 'w') as f:
    f.write(content)

