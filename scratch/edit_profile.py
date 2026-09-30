import re

with open('scratch/StaffProfile.jsx', 'r') as f:
    content = f.read()

# Add states and logic inside StaffProfile
logic_to_insert = """
  // Attendance & Salary State
  const today = new Date();
  const [calMonth, setCalMonth] = useState(today.getMonth() + 1); // 1-indexed
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [staffTasks, setStaffTasks] = useState([]);
  
  const [selectedDateStr, setSelectedDateStr] = useState(null);
  const [selectedDayLog, setSelectedDayLog] = useState(null);
  const [selectedDayTasks, setSelectedDayTasks] = useState([]);
  
  const [salaryTillDate, setSalaryTillDate] = useState(0);

  useEffect(() => {
    if (!staff.id) return;
    
    const fetchData = async () => {
      // Fetch attendance for this month
      const mStr = String(calMonth).padStart(2, '0');
      const prefix = `${calYear}-${mStr}`;
      
      const qAtt = query(collection(db, 'staff_attendance'), where('staffId', '==', staff.id));
      const snapAtt = await getDocs(qAtt);
      const logs = snapAtt.docs.map(d => d.data());
      setAttendanceLogs(logs); // keeping all for salary calc, or filter if we want

      const qTasks = query(collection(db, 'staff_tasks'), where('assignedTo', '==', staff.id));
      const snapTasks = await getDocs(qTasks);
      const tks = snapTasks.docs.map(d => ({id: d.id, ...d.data()}));
      setStaffTasks(tks);

      // Calculate this month salary till date
      const payDate = staff.profileData?.payDate || 1;
      const baseSal = staff.salary || 0;
      
      let cycleStartMonth = today.getMonth();
      let cycleStartYear = today.getFullYear();
      if (today.getDate() < payDate) {
        cycleStartMonth--;
        if (cycleStartMonth < 0) {
          cycleStartMonth = 11;
          cycleStartYear--;
        }
      }
      
      const cycleStartDate = new Date(cycleStartYear, cycleStartMonth, payDate);
      let cycleEndDate = new Date(cycleStartYear, cycleStartMonth + 1, payDate - 1);
      if (cycleEndDate.getDate() < payDate - 1) {
         cycleEndDate = new Date(cycleStartYear, cycleStartMonth + 2, 0); 
      }

      const standardDailyWage = baseSal / 30;
      let earnedThisCycle = 0;
      const iterateEndDate = today < cycleEndDate ? today : cycleEndDate;
      
      for (let d = new Date(cycleStartDate); d <= iterateEndDate; d.setDate(d.getDate() + 1)) {
         const jDate = new Date(staff.createdAt || Date.now());
         jDate.setHours(0,0,0,0);
         const iterDate = new Date(d);
         iterDate.setHours(0,0,0,0);
         
         if (iterDate < jDate) continue;

         const dateStr = `${iterDate.getFullYear()}-${String(iterDate.getMonth()+1).padStart(2,'0')}-${String(iterDate.getDate()).padStart(2,'0')}`;
         const log = logs.find(l => l.date === dateStr);

         if (log) {
            if (log.status === 'present' || log.status === 'pending_review') {
               earnedThisCycle += standardDailyWage;
            } else if (log.status === 'half_day') {
               earnedThisCycle += (standardDailyWage / 2);
            }
         }
      }
      setSalaryTillDate(Math.round(earnedThisCycle));
    };
    fetchData();
  }, [staff.id, calMonth, calYear]);

  const handleDayClick = (day) => {
    const mStr = String(calMonth).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    const fullDate = `${calYear}-${mStr}-${dStr}`;
    
    setSelectedDateStr(fullDate);
    const log = attendanceLogs.find(l => l.date === fullDate);
    setSelectedDayLog(log || null);
    
    const dTasks = staffTasks.filter(t => t.completedAt && t.completedAt.startsWith(fullDate));
    setSelectedDayTasks(dTasks);
  };

  const getDaysInMonth = (month, year) => new Date(year, month, 0).getDate();
  const getFirstDayOfMonth = (month, year) => new Date(year, month - 1, 1).getDay();
  
  const daysInCalMonth = getDaysInMonth(calMonth, calYear);
  const firstDay = getFirstDayOfMonth(calMonth, calYear);
  
  const calDays = [];
  for (let i = 0; i < firstDay; i++) calDays.push(null);
  for (let i = 1; i <= daysInCalMonth; i++) calDays.push(i);

  const prevMonth = () => {
    if (calMonth === 1) { setCalMonth(12); setCalYear(y => y - 1); }
    else { setCalMonth(m => m - 1); }
  };
  const nextMonth = () => {
    if (calMonth === 12) { setCalMonth(1); setCalYear(y => y + 1); }
    else { setCalMonth(m => m + 1); }
  };
"""

content = re.sub(
    r'(const staff = location\.state\?\.staff \|\| \{\};)',
    r'\1\n' + logic_to_insert,
    content
)

# Remove the old fetchAttendance logic in StaffProfile
old_use_effect = r'''  useEffect\(\(\) => \{
    if \(!staff\.id\) return;
    const fetchAttendance = async \(\) => \{
      const q = query\(collection\(db, 'staff_attendance'\), where\('staffId', '==', staff\.id\)\);
      const snap = await getDocs\(q\);
      const logs = snap\.docs\.map\(d => d\.data\(\)\);
      // count unique days in current month
      const days = new Set\(\);
      logs\.forEach\(log => \{
        if \(log\.date && log\.date\.startsWith\(currentMonth\)\) \{
          days\.add\(log\.date\);
        \}
      \}\);
      setWorkingDays\(days\.size\);
    \};
    fetchAttendance\(\);
  \}, \[staff\.id, currentMonth\]\);'''

content = re.sub(old_use_effect, '', content, flags=re.DOTALL)


ui_to_insert = """
        {/* Attendance Card */}
        <div style={{ background: 'white', borderRadius: 16, padding: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#0f172a' }}>Attendance & Salary</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}><span className="material-symbols-outlined" style={{ fontSize: 20 }}>chevron_left</span></button>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{new Date(calYear, calMonth - 1).toLocaleString('default', { month: 'short' })} {calYear}</span>
              <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}><span className="material-symbols-outlined" style={{ fontSize: 20 }}>chevron_right</span></button>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center', marginBottom: 8 }}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <div key={d} style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center' }}>
            {calDays.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} />;
              
              const dateStr = `${calYear}-${String(calMonth).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
              const jDate = new Date(staff.createdAt || Date.now());
              jDate.setHours(0,0,0,0);
              
              const iterDate = new Date(calYear, calMonth - 1, day);
              iterDate.setHours(0,0,0,0);
              
              const isBeforeJoined = iterDate < jDate;
              
              const isFuture = iterDate > new Date();

              const log = attendanceLogs.find(l => l.date === dateStr);
              let bg = '#f1f5f9';
              let col = '#0f172a';
              let inner = day;
              
              if (isBeforeJoined) {
                inner = <span className="material-symbols-outlined" style={{fontSize: 16, color: '#94a3b8'}}>close</span>;
                col = '#94a3b8';
              } else if (isFuture) {
                col = '#cbd5e1';
              } else if (log) {
                if (log.status === 'present') { bg = '#dcfce7'; col = '#15803d'; }
                else if (log.status === 'absent') { bg = '#fee2e2'; col = '#b91c1c'; }
                else if (log.status === 'half_day') { bg = '#fef9c3'; col = '#a16207'; }
              }
              
              return (
                <div key={day} onClick={() => !isBeforeJoined && !isFuture && handleDayClick(day)} style={{
                  height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: bg, color: col, borderRadius: 8, fontSize: 14, fontWeight: 600,
                  cursor: (!isBeforeJoined && !isFuture) ? 'pointer' : 'default'
                }}>
                  {inner}
                </div>
              );
            })}
          </div>

          {selectedDateStr && (
            <div style={{ marginTop: 16, padding: 12, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
                Details for {new Date(selectedDateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
              {!selectedDayLog || selectedDayLog.status === 'absent' ? (
                <div style={{ fontSize: 13, color: '#ef4444', fontWeight: 600 }}>Staff was absent on this date</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Punched In:</span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{selectedDayLog.clockIn ? new Date(selectedDayLog.clockIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Punched Out:</span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{selectedDayLog.clockOut ? new Date(selectedDayLog.clockOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Took Rest At:</span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{selectedDayLog.restStart ? new Date(selectedDayLog.restStart).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'None'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Resumed At:</span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{selectedDayLog.restEnd ? new Date(selectedDayLog.restEnd).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'None'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Hours Worked:</span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{selectedDayLog.totalHoursWorked ? `${selectedDayLog.totalHoursWorked.toFixed(1)} hrs` : 'N/A'}</span>
                  </div>
                  {selectedDayTasks.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <span style={{ color: '#64748b', display: 'block', marginBottom: 4 }}>Completed Tasks:</span>
                      <ul style={{ margin: 0, paddingLeft: 16, color: '#0f172a' }}>
                        {selectedDayTasks.map(t => <li key={t.id}>{t.title || t.name || 'Assigned Task'}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div style={{ fontSize: 13, color: '#64748b' }}>Total Salary: <br/><strong style={{color:'#0f172a', fontSize:14}}>₹{(staff.salary || 0).toLocaleString()}</strong></div>
               <div style={{ fontSize: 13, color: '#64748b', textAlign: 'right' }}>This Month Till Date: <br/><strong style={{color:'#059669', fontSize:14}}>₹{salaryTillDate.toLocaleString()}</strong></div>
             </div>
          </div>
        </div>
"""

content = re.sub(
    r'(\{\/\* Salary & Pay Slips \*\/\})',
    ui_to_insert + r'\n        \1',
    content
)

# Replace the "Salary & Pay Slips" accordion completely since we moved salary info to Attendance Card
content = re.sub(r'\{\/\* Salary & Pay Slips \*\/.*?<\/Accordion>', '', content, flags=re.DOTALL)

with open('scratch/StaffProfile.jsx', 'w') as f:
    f.write(content)

