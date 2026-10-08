import re

file_path = "/Users/shreyassingh/Downloads/PG MANAGE @/febebo-staff/src/pages/StaffApp.jsx"

with open(file_path, "r") as f:
    content = f.read()

pattern = r"\{/\* Punch card \*/\}.*?</button>\s*</div>"

new_punch_card = """{/* Punch card */}
          {(() => {
            const _now = new Date();
            const _todayStr = `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,'0')}-${String(_now.getDate()).padStart(2,'0')}`;
            const _todayLog = allAttendanceLogs.find(l => l.date === _todayStr);
            const _isCompleted = _todayLog && _todayLog.clockOut;
            const _isMarkedExternally = _todayLog && !_todayLog.clockIn && (_todayLog.status === 'absent' || _todayLog.status === 'present');
            const hasCompletedShift = !clocked && (_isCompleted || _isMarkedExternally);

            if (hasCompletedShift) {
              return (
                <div style={{marginTop:18, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius:18, padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow: '0 4px 16px rgba(120, 104, 10, 0.04)'}}>
                  <div style={{display:'flex', flexDirection:'column', gap:2}}>
                    <div style={{display:'flex', alignItems:'center', gap:8}}>
                      <span style={{position:'relative', display:'flex', height:10, width:10}}>
                        <span style={{position:'relative', display:'inline-flex', borderRadius:'50%', height:10, width:10, background: '#16a34a'}}></span>
                      </span>
                      <span style={{fontSize:14, fontWeight:800, color: '#1a1500'}}>Shift Completed</span>
                    </div>
                    <span style={{fontSize:11, fontWeight:700, color: '#64748b', marginLeft:18}}>You have finished work for today</span>
                  </div>
                  <div style={{
                    padding:'8px 16px', 
                    borderRadius:12, 
                    background: '#e2e8f0', 
                    color: '#64748b', 
                    fontSize:12, 
                    fontWeight:900, 
                    display:'flex', 
                    alignItems:'center', 
                    gap:6
                  }}>
                    <span className="material-symbols-outlined" style={{fontSize:16}}>done_all</span>
                    Done
                  </div>
                </div>
              );
            }

            return (
              <div style={{marginTop:18, background: '#ffffff', border: '1.5px solid #e8df9a', borderRadius:18, padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow: '0 4px 16px rgba(120, 104, 10, 0.04)'}}>
                <div style={{display:'flex', flexDirection:'column', gap:2}}>
                  <div style={{display:'flex', alignItems:'center', gap:8}}>
                    <span style={{position:'relative', display:'flex', height:10, width:10}}>
                      {clocked && (
                        <span style={{animation:'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite', position:'absolute', display:'inline-flex', height:'100%', width:'100%', borderRadius:'50%', background:'#10b981', opacity:0.75}}></span>
                      )}
                      <span style={{position:'relative', display:'inline-flex', borderRadius:'50%', height:10, width:10, background: clocked ? '#10b981' : '#ef4444'}}></span>
                    </span>
                    <span style={{fontSize:14, fontWeight:800, color: '#1a1500'}}>{clocked ? 'On Duty' : 'Off Shift'}</span>
                  </div>
                  {clocked && (
                    <span style={{fontSize:11, fontWeight:700, color: '#64748b', marginLeft:18}}>Logged in at {clockIn}</span>
                  )}
                </div>
                
                <button 
                  onClick={() => {
                    if (clocked) {
                      setShowPunchOutConfirm(true);
                    } else {
                      punch();
                    }
                  }} 
                  disabled={isPunching}
                  style={{
                    padding:'8px 16px', 
                    borderRadius:12, 
                    border: 'none', 
                    background: clocked ? '#fee2e2' : '#dcfce7', 
                    color: clocked ? '#991b1b' : '#166534', 
                    fontSize:12, 
                    fontWeight:900, 
                    cursor:isPunching?'not-allowed':'pointer', 
                    fontFamily:'inherit', 
                    display:'flex', 
                    alignItems:'center', 
                    gap:6, 
                    boxShadow:'0 2px 6px rgba(0,0,0,0.03)',
                    opacity: isPunching ? 0.7 : 1
                  }}
                >
                  {isPunching ? (
                    <>
                      <div style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: clocked ? '#991b1b' : '#166534', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                      Wait...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined" style={{fontSize:16}}>
                        {clocked ? 'logout' : 'login'}
                      </span>
                      {clocked ? 'Punch Out' : 'Punch In'}
                    </>
                  )}
                </button>
              </div>
            );
          })()}"""

import re
if re.search(pattern, content, re.DOTALL):
    content = re.sub(pattern, new_punch_card, content, flags=re.DOTALL)
    with open(file_path, "w") as f:
        f.write(content)
    print("Success: Replaced punch card with hasCompletedShift logic.")
else:
    print("Error: Could not find the punch card string.")

