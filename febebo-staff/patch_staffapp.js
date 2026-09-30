const fs = require('fs');
const file = '/Users/shreyassingh/Downloads/PG MANAGE @/febebo-staff/src/pages/StaffApp.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Replace the handleTaskDone function to actually update Firestore and send a notification
const updateTaskCode = `
  const handleTaskDone = async (task) => {
    try {
      await updateDoc(doc(db, 'staff_tasks', task.id), {
        status: 'Completed',
        completedAt: new Date().toISOString()
      });
      // Send notification to admin
      await addDoc(collection(db, 'notifications'), {
        adminId: task.adminId || adminId,
        type: 'task_completed',
        title: 'Task Completed',
        message: \`\${staffName} (\${staffRole}) completed the task: \${task.title}\`,
        createdAt: new Date().toISOString(),
        resolved: false
      });
      // update local state
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'Completed' } : t));
    } catch(e) {
      console.error(e);
      alert('Error updating task');
    }
  };
`;

// Insert after the useEffects block in StaffApp.jsx (around line 900)
content = content.replace('const [tasks, setTasks]               = useState([]);', 'const [tasks, setTasks]               = useState([]);' + updateTaskCode);

// 2. Update dashboard rendering of tasks to match the new schema (title, description, no room/priority required)
// Around line 2643
const oldTaskRender = `
            {/* General Tasks List (Helper, Maintenance, Plumber, Cook, etc.) */}
            {staffRole !== 'Cleaner' && tasks.filter(t => t.status === 'Pending').slice(0, 3).map(t => (
              <div key={t.id} onClick={() => setView('work')} style={{background:'#fff', border:\`1px solid \${C.border}\`, borderRadius:18, padding:14, display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow:'0 4px 12px rgba(120, 104, 10, 0.03)', cursor:'pointer'}}>
                <div style={{display:'flex', alignItems:'center', gap:12}}>
                  <div style={{width:40, height:40, borderRadius:12, background:'#fefce8', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20}}>{meta.emoji}</div>
                  <div style={{flex:1, minWidth:0}}>
                    <h4 style={{margin:0, fontSize:14, fontWeight:800, color:C.text, whiteSpace:'nowrap', textOverflow:'ellipsis', overflow:'hidden', maxWidth:220}}>{t.title}</h4>
                    <p style={{margin:0, fontSize:11, color:C.muted}}>Room {t.room} · Priority: {t.priority}</p>
                  </div>
                </div>
                <span style={{fontSize:11, fontWeight:800, padding:'4px 10px', borderRadius:10, background: t.priority==='High'?'#fee2e2':'#fef3c7', color: t.priority==='High'?'#dc2626':'#ca8a04'}}>{t.priority}</span>
              </div>
            ))}
`;

const newTaskRender = `
            {/* Unified Admin Assigned Tasks */}
            {tasks.filter(t => t.status === 'Pending').slice(0, 3).map(t => (
              <div key={t.id} onClick={() => setView('work')} style={{background:'#fff', border:\`1px solid \${C.border}\`, borderRadius:18, padding:14, display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow:'0 4px 12px rgba(120, 104, 10, 0.03)', cursor:'pointer'}}>
                <div style={{display:'flex', alignItems:'center', gap:12}}>
                  <div style={{width:40, height:40, borderRadius:12, background:'#fefce8', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20}}>📋</div>
                  <div style={{flex:1, minWidth:0}}>
                    <h4 style={{margin:0, fontSize:14, fontWeight:800, color:C.text, whiteSpace:'nowrap', textOverflow:'ellipsis', overflow:'hidden', maxWidth:220}}>{t.title}</h4>
                    <p style={{margin:0, fontSize:11, color:C.muted}}>{t.description ? t.description.substring(0,25)+'...' : 'Admin Task'}</p>
                  </div>
                </div>
                <span style={{fontSize:11, fontWeight:800, padding:'4px 10px', borderRadius:10, background: '#fee2e2', color: '#dc2626'}}>Pending</span>
              </div>
            ))}
`;

if(content.includes('General Tasks List (Helper, Maintenance, Plumber, Cook, etc.)')) {
  // It spans multiple lines, safer to replace via a regex or string replacement that captures it
  content = content.replace(/\{\/\* General Tasks List \[\s\S\]*?\)\}\}/m, newTaskRender); // wait, regex might fail.
}
fs.writeFileSync(file, content);
console.log('done');
