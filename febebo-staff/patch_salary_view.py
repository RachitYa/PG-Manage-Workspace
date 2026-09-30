import re
import sys

with open("src/pages/StaffApp.jsx", "r") as f:
    content = f.read()

salary_start = content.find("      {view === 'salary' && (() => {")
salary_end = content.find("      {/* ══════════════════════════════════════════════════════════════════════\n          PERFORMANCE", salary_start)

if salary_start == -1 or salary_end == -1:
    print("Could not find salary view bounds")
    sys.exit(1)

new_salary = """      {view === 'salary' && (() => {
        const payDate = user?.payDate || 1;
        const baseSal = user.salary || 0;
        
        // Calculate the current billing cycle
        const today = new Date();
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
        
        // Ensure cycleEnd isn't completely crazy for short months
        if (cycleEndDate.getDate() < payDate - 1) {
           cycleEndDate = new Date(cycleStartYear, cycleStartMonth + 2, 0); // Last day of next month
        }

        const standardDailyWage = baseSal / 30; // standard approximation
        
        let earnedThisCycle = 0;
        const cycleLogs = [];

        // Check logs that fall within this cycle
        allAttendanceLogs.forEach(log => {
           const logDate = new Date(log.date);
           logDate.setHours(0,0,0,0);
           
           if (logDate >= cycleStartDate && logDate <= cycleEndDate) {
              let dailyEarned = 0;
              if (log.status === 'present') {
                 if (log.dailyPay !== undefined) {
                    dailyEarned = Number(log.dailyPay);
                 } else {
                    dailyEarned = standardDailyWage;
                 }
              }
              
              if (dailyEarned > 0) {
                 earnedThisCycle += dailyEarned;
                 cycleLogs.push({
                    date: new Date(log.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
                    amount: dailyEarned,
                    type: log.dailyPay !== undefined ? 'Partial Day Pay' : 'Full Day Pay'
                 });
              }
           }
        });

        // Sort cycleLogs descending
        cycleLogs.sort((a,b) => new Date(b.date) - new Date(a.date));

        const monthName = cycleEndDate.toLocaleDateString('en-US', { month: 'short' });

        return (
          <div style={{padding:'14px 14px 32px',display:'flex',flexDirection:'column',gap:14}}>
            
            {/* Main Salary Card */}
            <div style={{background:'#1a1500', borderRadius:20, padding:'24px', color:'#fff', boxShadow:'0 10px 25px rgba(26,21,0,0.2)', position:'relative', overflow:'hidden'}}>
              <div style={{position:'absolute', top:-20, right:-20, opacity:0.1, transform:'rotate(15deg)'}}>
                <span className="material-symbols-outlined" style={{fontSize:140}}>account_balance_wallet</span>
              </div>
              <div style={{position:'relative', zIndex:10}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                  <div>
                    <p style={{margin:0, fontSize:13, fontWeight:700, color:'#fde047', textTransform:'uppercase', letterSpacing:1}}>Current Cycle</p>
                    <p style={{margin:'2px 0 0', fontSize:12, fontWeight:500, color:'#94a3b8'}}>{cycleStartDate.toLocaleDateString('en-US', {day:'numeric', month:'short'})} - {cycleEndDate.toLocaleDateString('en-US', {day:'numeric', month:'short'})}</p>
                  </div>
                  <div style={{padding:'4px 12px', borderRadius:20, background:'rgba(253,224,71,0.1)', border:'1px solid rgba(253,224,71,0.2)', color:'#fde047', fontSize:11, fontWeight:800}}>
                    Pay Date: {payDate}
                  </div>
                </div>
                
                <h1 style={{margin:'20px 0 0', fontSize:46, fontWeight:900, lineHeight:1, letterSpacing:-1}}>₹{Math.round(earnedThisCycle).toLocaleString()}</h1>
                <p style={{margin:'6px 0 0', fontSize:14, fontWeight:600, color:'#94a3b8'}}>Base Salary: ₹{baseSal.toLocaleString()}</p>
              </div>
            </div>

            {/* Breakdown List */}
            <div style={{background:'#fff', borderRadius:18, border:'1.5px solid #f1f5f9', padding:18, boxShadow:'0 4px 16px rgba(0,0,0,0.03)', marginTop:8}}>
              <p style={{margin:0, fontSize:15, fontWeight:800, color:'#000'}}>💰 Daily Earnings ({cycleLogs.length} days)</p>
              <p style={{margin:'4px 0 16px', fontSize:12, fontWeight:600, color:'#64748b'}}>Showing earnings for current billing cycle</p>

              <div style={{display:'flex', flexDirection:'column', gap:12}}>
                {cycleLogs.length === 0 ? (
                  <div style={{textAlign:'center', padding:'20px 0', color:'#94a3b8', fontSize:13}}>No earnings recorded in this cycle yet.</div>
                ) : (
                  cycleLogs.map((log, idx) => (
                    <div key={idx} style={{display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom:12, borderBottom: idx === cycleLogs.length - 1 ? 'none' : '1px solid #f1f5f9'}}>
                      <div style={{display:'flex', alignItems:'center', gap:12}}>
                        <div style={{width:40, height:40, borderRadius:12, background:'#f0fdf4', display:'flex', alignItems:'center', justifyContent:'center'}}>
                          <span className="material-symbols-outlined" style={{fontSize:20, color:'#10b981'}}>payments</span>
                        </div>
                        <div>
                          <p style={{margin:0, fontSize:14, fontWeight:800, color:'#0f172a'}}>{log.date}</p>
                          <p style={{margin:'2px 0 0', fontSize:11, fontWeight:600, color:'#64748b'}}>{log.type}</p>
                        </div>
                      </div>
                      <p style={{margin:0, fontSize:15, fontWeight:800, color:'#10b981'}}>+₹{Math.round(log.amount)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
            
          </div>
        );
      })}
\n"""

content = content[:salary_start] + new_salary + content[salary_end:]

with open("src/pages/StaffApp.jsx", "w") as f:
    f.write(content)
