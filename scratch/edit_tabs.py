import re

with open('scratch/StaffProfile2.jsx', 'r') as f:
    content = f.read()

# Add profileTab state
content = content.replace("const [activeTab, setActiveTab] = useState('home');", 
                          "const [activeTab, setActiveTab] = useState('home');\n  const [profileTab, setProfileTab] = useState('details');")

# The boundary between Profile Card and Attendance Card
# Look for line: </div> (end of top profile card)
# followed by {/* Attendance Card */}

split_pattern = r'(<\/div>\s*)({\/\* Attendance Card \*\/})'

# We'll replace it with the segmented control
segmented_control = """</div>

        {/* Tab Toggle */}
        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 12, padding: 6, marginBottom: 20, boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
          <button 
            onClick={() => setProfileTab('details')}
            style={{ flex: 1, padding: '12px 0', background: profileTab === 'details' ? 'white' : 'transparent', border: 'none', borderRadius: 8, fontWeight: 700, color: profileTab === 'details' ? '#0891b2' : '#64748b', boxShadow: profileTab === 'details' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span className="material-symbols-outlined" style={{fontSize: 20}}>badge</span>
            Details
          </button>
          <button 
            onClick={() => setProfileTab('attendance')}
            style={{ flex: 1, padding: '12px 0', background: profileTab === 'attendance' ? 'white' : 'transparent', border: 'none', borderRadius: 8, fontWeight: 700, color: profileTab === 'attendance' ? '#0891b2' : '#64748b', boxShadow: profileTab === 'attendance' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span className="material-symbols-outlined" style={{fontSize: 20}}>calendar_month</span>
            Attendance
          </button>
        </div>
        
        {profileTab === 'attendance' && (
          {/* Attendance Card */}"""

content = re.sub(split_pattern, segmented_control, content)

# Now we need to end the attendance card and start the details tab
# The attendance card ends just before {/* Personal Details */}
end_attendance_pattern = r'(\s*)({\/\* Personal Details \*\/})'

end_attendance_replacement = r"""
        )}
        
        {profileTab === 'details' && (
          <>
\1\2"""

content = re.sub(end_attendance_pattern, end_attendance_replacement, content)

# The details tab ends just before {/* ADD TENANT POPUP MENU */}
end_details_pattern = r'(\s*)({\/\* ADD TENANT POPUP MENU \*\/})'
end_details_replacement = r"""
          </>
        )}
\1\2"""

content = re.sub(end_details_pattern, end_details_replacement, content)

# Now improve the UI of the Attendance Card
# Find the start of Attendance Card
attendance_card_pattern = r'<div style={{ background: \'white\', borderRadius: 16, padding: \'16px\', boxShadow: \'0 4px 6px -1px rgba\(0,0,0,0\.1\)\', marginBottom: 20 }}>'
better_attendance_ui = r'<div style={{ background: \'white\', borderRadius: 20, padding: \'20px\', boxShadow: \'0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.01)\', marginBottom: 20, border: \'1px solid #e2e8f0\' }}>'
content = content.replace(attendance_card_pattern, better_attendance_ui)

# Update day cell UI
old_cell = r"""return \(
                <div key={day} onClick={\(\) => !isBeforeJoined && !isFuture && handleDayClick\(day\)} style={{
                  height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: bg, color: col, borderRadius: 8, fontSize: 14, fontWeight: 600,
                  cursor: \(!isBeforeJoined && !isFuture\) \? 'pointer' : 'default'
                }}>
                  {inner}
                </div>
              \);"""

new_cell = r"""return (
                <div key={day} onClick={() => !isBeforeJoined && !isFuture && handleDayClick(day)} style={{
                  height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: bg, color: col, borderRadius: 10, fontSize: 15, fontWeight: 700,
                  cursor: (!isBeforeJoined && !isFuture) ? 'pointer' : 'default',
                  border: selectedDateStr === dateStr ? '2px solid #0891b2' : 'none',
                  boxShadow: (!isBeforeJoined && !isFuture && bg !== '#f1f5f9') ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                  transition: 'all 0.2s'
                }}>
                  {inner}
                </div>
              );"""

content = re.sub(old_cell, new_cell, content)

# Update selected day details
old_details = r"""<div style={{ marginTop: 16, padding: 12, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
                Details for {new Date\(selectedDateStr\)\.toLocaleDateString\('en-US', \{ day: 'numeric', month: 'short', year: 'numeric' \}\)}
              </div>
              \{!selectedDayLog \|\| selectedDayLog\.status === 'absent' \? \(
                <div style=\{\{ fontSize: 13, color: '#ef4444', fontWeight: 600 \}\}>Staff was absent on this date</div>
              \) : \(
                <div style=\{\{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 \}\}>
                  <div style=\{\{ display: 'flex', justifyContent: 'space-between' \}\}>
                    <span style=\{\{ color: '#64748b' \}\}>Punched In:</span>
                    <span style=\{\{ fontWeight: 600, color: '#0f172a' \}\}>\{selectedDayLog\.clockIn \? new Date\(selectedDayLog\.clockIn\)\.toLocaleTimeString\(\[\], \{hour: '2-digit', minute:'2-digit'\}\) : 'N/A'\}</span>
                  </div>
                  <div style=\{\{ display: 'flex', justifyContent: 'space-between' \}\}>
                    <span style=\{\{ color: '#64748b' \}\}>Punched Out:</span>
                    <span style=\{\{ fontWeight: 600, color: '#0f172a' \}\}>\{selectedDayLog\.clockOut \? new Date\(selectedDayLog\.clockOut\)\.toLocaleTimeString\(\[\], \{hour: '2-digit', minute:'2-digit'\}\) : 'N/A'\}</span>
                  </div>
                  <div style=\{\{ display: 'flex', justifyContent: 'space-between' \}\}>
                    <span style=\{\{ color: '#64748b' \}\}>Took Rest At:</span>
                    <span style=\{\{ fontWeight: 600, color: '#0f172a' \}\}>\{selectedDayLog\.restStart \? new Date\(selectedDayLog\.restStart\)\.toLocaleTimeString\(\[\], \{hour: '2-digit', minute:'2-digit'\}\) : 'None'\}</span>
                  </div>
                  <div style=\{\{ display: 'flex', justifyContent: 'space-between' \}\}>
                    <span style=\{\{ color: '#64748b' \}\}>Resumed At:</span>
                    <span style=\{\{ fontWeight: 600, color: '#0f172a' \}\}>\{selectedDayLog\.restEnd \? new Date\(selectedDayLog\.restEnd\)\.toLocaleTimeString\(\[\], \{hour: '2-digit', minute:'2-digit'\}\) : 'None'\}</span>
                  </div>
                  <div style=\{\{ display: 'flex', justifyContent: 'space-between' \}\}>
                    <span style=\{\{ color: '#64748b' \}\}>Hours Worked:</span>
                    <span style=\{\{ fontWeight: 600, color: '#0f172a' \}\}>\{selectedDayLog\.totalHoursWorked \? `\$\{selectedDayLog\.totalHoursWorked\.toFixed\(1\)\} hrs` : 'N/A'\}</span>
                  </div>
                  \{selectedDayTasks\.length > 0 && \(
                    <div style=\{\{ marginTop: 8 \}\}>
                      <span style=\{\{ color: '#64748b', display: 'block', marginBottom: 4 \}\}>Completed Tasks:</span>
                      <ul style=\{\{ margin: 0, paddingLeft: 16, color: '#0f172a' \}\}>
                        \{selectedDayTasks\.map\(t => <li key=\{t\.id\}>\{t\.title \|\| t\.name \|\| 'Assigned Task'\}</li>\)\}
                      </ul>
                    </div>
                  \)\}
                </div>
              \)\}
            </div>"""


new_details = r"""<div style={{ marginTop: 24, paddingTop: 20, borderTop: '2px dashed #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#ecfeff', color: '#0891b2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>event_note</span>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                    {new Date(selectedDateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>Detailed Timeline</div>
                </div>
              </div>
              
              {!selectedDayLog || selectedDayLog.status === 'absent' ? (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="material-symbols-outlined" style={{ color: '#ef4444' }}>cancel</span>
                  <span style={{ fontSize: 14, color: '#b91c1c', fontWeight: 700 }}>Staff was absent on this date</span>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 12, border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 12, marginBottom: 4 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>login</span> Punched In
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{selectedDayLog.clockIn ? new Date(selectedDayLog.clockIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}</div>
                  </div>
                  
                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 12, border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 12, marginBottom: 4 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>logout</span> Punched Out
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{selectedDayLog.clockOut ? new Date(selectedDayLog.clockOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}</div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 12, border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 12, marginBottom: 4 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>coffee</span> Took Rest
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{selectedDayLog.restStart ? new Date(selectedDayLog.restStart).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'None'}</div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 12, border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 12, marginBottom: 4 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>work_history</span> Resumed
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{selectedDayLog.restEnd ? new Date(selectedDayLog.restEnd).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'None'}</div>
                  </div>

                  <div style={{ gridColumn: '1 / -1', background: '#ecfeff', padding: 12, borderRadius: 12, border: '1px solid #cffafe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#0e7490', fontSize: 13, fontWeight: 700 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>schedule</span> Hours Worked
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#0891b2' }}>{selectedDayLog.totalHoursWorked ? `${selectedDayLog.totalHoursWorked.toFixed(1)} hrs` : 'N/A'}</div>
                  </div>

                  {selectedDayTasks.length > 0 && (
                    <div style={{ gridColumn: '1 / -1', marginTop: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>task_alt</span> Completed Tasks
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {selectedDayTasks.map(t => (
                          <div key={t.id} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 12px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#16a34a' }}>check_circle</span>
                            <span style={{ fontSize: 14, fontWeight: 600, color: '#15803d' }}>{t.title || t.name || 'Assigned Task'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>"""

content = re.sub(old_details, new_details, content)


# Update Salary Summary
old_salary = r"""<div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div style={{ fontSize: 13, color: '#64748b' }}>Total Salary: <br/><strong style={{color:'#0f172a', fontSize:14}}>₹\{\(staff\.salary \|\| 0\)\.toLocaleString\(\)\}</strong></div>
               <div style={{ fontSize: 13, color: '#64748b', textAlign: 'right' }}>This Month Till Date: <br/><strong style={{color:'#059669', fontSize:14}}>₹\{salaryTillDate\.toLocaleString\(\)\}</strong></div>
             </div>
          </div>"""

new_salary = r"""<div style={{ marginTop: 20, paddingTop: 20, borderTop: '2px dashed #e2e8f0' }}>
             <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: '0 0 16px' }}>Salary Summary</h3>
             <div style={{ display: 'flex', gap: 12 }}>
               <div style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
                   <span className="material-symbols-outlined" style={{ fontSize: 16 }}>account_balance</span> Base Salary
                 </div>
                 <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>₹{(staff.salary || 0).toLocaleString()}</div>
               </div>
               <div style={{ flex: 1, background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 12, padding: 16 }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#059669', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
                   <span className="material-symbols-outlined" style={{ fontSize: 16 }}>payments</span> Earned Till Date
                 </div>
                 <div style={{ fontSize: 20, fontWeight: 800, color: '#10b981' }}>₹{salaryTillDate.toLocaleString()}</div>
               </div>
             </div>
          </div>"""

content = re.sub(old_salary, new_salary, content)

with open('scratch/StaffProfile2.jsx', 'w') as f:
    f.write(content)

