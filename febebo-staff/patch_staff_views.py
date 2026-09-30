import re
import sys

with open("src/pages/StaffApp.jsx", "r") as f:
    content = f.read()

# 1. Add allAttendanceLogs state
if "const [allAttendanceLogs, setAllAttendanceLogs] = useState([]);" not in content:
    content = content.replace(
        "const [punchHistory, setPunchHistory] = useState([]);",
        "const [punchHistory, setPunchHistory] = useState([]);\n  const [allAttendanceLogs, setAllAttendanceLogs] = useState([]);"
    )

if "setAllAttendanceLogs(logs);" not in content:
    content = content.replace(
        "logs.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));\n      logs = logs.slice(0, 14);",
        "logs.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));\n      setAllAttendanceLogs(logs);\n      logs = logs.slice(0, 14);"
    )

# 2. Extract and replace inout view
inout_start = content.find("      {view === 'inout' && (() => {")
inout_end = content.find("      {/* ══════════════════════════════════════════════════════════════════════\n          SALARY", inout_start)
if inout_end == -1:
    inout_end = content.find("      {view === 'salaryBreakdown'", inout_start)

if inout_start == -1 or inout_end == -1:
    print("Could not find inout view bounds")
    sys.exit(1)

new_inout = """      {view === 'inout' && (() => {
        const joinedDate = new Date(user?.createdAt || Date.now());
        const today = new Date();
        const curYear = today.getFullYear();
        const curMonth = today.getMonth(); // 0-indexed

        const daysInMonth = new Date(curYear, curMonth + 1, 0).getDate();
        
        let present = 0, absent = 0, leave = 0;
        const calendarData = {};

        // Calculate offset for the first day of the month (0 = Sunday, 1 = Monday)
        const firstDayOfMonth = new Date(curYear, curMonth, 1).getDay();

        for (let d = 1; d <= daysInMonth; d++) {
          const iterDate = new Date(curYear, curMonth, d);
          // Zero out time for comparison
          iterDate.setHours(0,0,0,0);
          
          const jDate = new Date(joinedDate);
          jDate.setHours(0,0,0,0);

          if (iterDate < jDate) {
            calendarData[d] = 'absent';
            absent++;
            continue;
          }

          if (iterDate > new Date().setHours(0,0,0,0)) {
            continue; // Future dates
          }

          // Check if there is a log for this day
          const dateStr = `${curYear}-${String(curMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
          const log = allAttendanceLogs.find(l => l.date === dateStr);
          
          if (log) {
            if (log.status === 'present') { calendarData[d] = 'present'; present++; }
            else if (log.status === 'pending_review') { calendarData[d] = 'present'; present++; } // Treating pending as present for now in calendar
            else { calendarData[d] = 'absent'; absent++; }
          } else {
            // No log and past joining date = absent
            calendarData[d] = 'absent';
            absent++;
          }
        }

        const monthName = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        return (
        <div style={{padding:'14px 14px 32px',display:'flex',flexDirection:'column',gap:14}}>
          {/* Shift Timer */}
          <div style={{background: C.primary, borderRadius:18, border: '1px solid #e2e8f0', padding:'20px 18px', color:'#000', boxShadow: '0 4px 16px rgba(15,23,42,0.05)'}}>
            <p style={{margin:0, fontSize:11, fontWeight:800, textTransform:'uppercase', color:'#000', letterSpacing:.5}}>Today's Shift Timer</p>
            <ShiftTimer clockIn={clockIn} clocked={clocked} />
            <p style={{margin:'0 0 14px', fontSize:12, fontWeight:700, color:'#333'}}>{clocked?`Punched IN at ${clockIn}`:'Not currently punched in'}</p>
            <button onClick={punch} style={{padding:'10px 20px', background:'#fff', border: '1px solid #e2e8f0', borderRadius: 10, color:'#000', fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'inherit', boxShadow: '0 2px 8px rgba(15,23,42,0.04)'}}>
              {clocked?'⏹ Punch Out Now':'▶ Punch In'}
            </button>
          </div>

          {/* Stats Row */}
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10}}>
            {[
              {l:'Present', v:present, bg:'#dcfce7', c:'#15803d'},
              {l:'Absent', v:absent, bg:'#fee2e2', c:'#b91c1c'},
              {l:'Leave', v:leave, bg:'#fefce8', c:'#ca8a04'}
            ].map(s=>(
              <div key={s.l} style={{background:s.bg, borderRadius:14, border: '1px solid #e2e8f0', padding:'14px 10px', textAlign:'center', boxShadow: '0 2px 8px rgba(15,23,42,0.04)'}}>
                <p style={{fontSize:26, fontWeight:900, color:s.c, margin:0}}>{s.v}</p>
                <p style={{fontSize:11, fontWeight:800, color:s.c, margin:'4px 0 0', textTransform:'uppercase'}}>{s.l}</p>
              </div>
            ))}
          </div>

          {/* Calendar View */}
          <div style={{background:'#fff', borderRadius:18, border:'1.5px solid #f1f5f9', padding:18, boxShadow:'0 4px 16px rgba(0,0,0,0.03)'}}>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16}}>
              <div style={{display:'flex', alignItems:'center', gap:8}}>
                <div style={{width:32, height:32, borderRadius:10, background:'#f8fafc', display:'flex', alignItems:'center', justifyContent:'center'}}>
                  <span className="material-symbols-outlined" style={{fontSize:18, color:'#1e293b'}}>calendar_month</span>
                </div>
                <div>
                  <p style={{margin:0, fontSize:14, fontWeight:900, color:'#1a1500'}}>Attendance Calendar</p>
                  <p style={{margin:'1px 0 0', fontSize:11, color:'#64748b', fontWeight:600}}>{monthName}</p>
                </div>
              </div>
            </div>

            {/* Day headers */}
            <div style={{display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3, marginBottom:6}}>
              {['S','M','T','W','T','F','S'].map((d,i)=>(
                <div key={i} style={{textAlign:'center', fontSize:10, fontWeight:800, color:'#94a3b8', padding:'4px 0'}}>{d}</div>
              ))}
            </div>
            
            {/* Day cells */}
            <div style={{display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3}}>
              {Array.from({length: firstDayOfMonth}).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({length: daysInMonth}, (_, i) => i+1).map(day => {
                const s = calendarData[day];
                const bg = s==='present'?'#dcfce7':s==='absent'?'#fee2e2':s==='leave'?'#fefce8':'#f8fafc';
                const c = s==='present'?'#15803d':s==='absent'?'#b91c1c':s==='leave'?'#ca8a04':'#94a3b8';
                return (
                  <div key={day} style={{aspectRatio:'1/1', borderRadius:8, background:bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:c}}>
                    {day}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        );
      })}
"""

content = content[:inout_start] + new_inout + content[inout_end:]

with open("src/pages/StaffApp.jsx", "w") as f:
    f.write(content)
