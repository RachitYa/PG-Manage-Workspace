const fs = require('fs');

let code = fs.readFileSync('/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/RequestBox.jsx', 'utf8');

// 1. Fetch all notifications, not just unresolved
code = code.replace(
  "safeGetDocs(query(collection(db, 'notifications'), where('adminId', '==', user.uid), where('resolved', '==', false)), 'notifications')",
  "safeGetDocs(query(collection(db, 'notifications'), where('adminId', '==', user.uid)), 'notifications')"
);

// 2. Sort results by timestamp (client side) to show recent at top
const sortSnippet = `
        results.sort((a, b) => {
          const tA = a.timestamp || a.date || a.createdAt || '';
          const tB = b.timestamp || b.date || b.createdAt || '';
          return new Date(tB) - new Date(tA);
        });
        setRequests(results);`;
code = code.replace("setRequests(results);", sortSnippet);


// 3. Group by Date Helper
const formatTimeHelper = `
  const formatTime = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d)) return '';
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };
  
  const getCategoryLabel = (isoString) => {
    if (!isoString) return 'Older';
    const d = new Date(isoString);
    if (isNaN(d)) return 'Older';
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const groupedRequests = requests.reduce((acc, req) => {
    const timeVal = req.timestamp || req.date || req.createdAt || '';
    const label = getCategoryLabel(timeVal);
    if (!acc[label]) acc[label] = [];
    acc[label].push(req);
    return acc;
  }, {});
`;

if(!code.includes('groupedRequests = requests.reduce')) {
  code = code.replace("return (", formatTimeHelper + "\n  return (");
}

// 4. Replace rendering logic
const mapStartIndex = code.indexOf("{requests.length === 0 ? (");
const mapEndIndex = code.indexOf("</ReviewDetailsModal>") - 40; // Approx back up to the end of the div containing the map

if(mapStartIndex !== -1) {
  // Find the exact end of the main div
  const part1 = code.substring(0, mapStartIndex);
  
  // We know the modal starts with `{reviewModalData && (` or `<ReviewDetailsModal`
  let modalIndex = code.indexOf("{reviewModalData && (", mapStartIndex);
  if (modalIndex === -1) {
      modalIndex = code.indexOf("<ReviewDetailsModal", mapStartIndex);
  }
  
  const part2 = code.substring(modalIndex);
  
  const groupedMapReplacement = `{Object.keys(groupedRequests).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: '#fff', borderRadius: 20, border: '2px dashed #cbd5e1' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#94a3b8', marginBottom: 12 }}>inbox</span>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#475569' }}>No pending requests</p>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: '#64748b' }}>You're all caught up!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {Object.entries(groupedRequests).map(([dateLabel, reqs]) => (
              <div key={dateLabel} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h3 style={{ margin: '0 4px', fontSize: 14, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>{dateLabel}</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {reqs.map((req) => {
                    const config = CATEGORY_CONFIG[req.category] || CATEGORY_CONFIG.document;
                    const isAlert = req.priority === 'high' || req.type === 'Emergency';
                    const timeVal = req.timestamp || req.date || req.createdAt || '';

                    return (
                      <div key={req.id} style={{ background: '#fff', borderRadius: 16, padding: 16, border: isAlert ? '2px solid #fca5a5' : '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(15,23,42,0.03)', position: 'relative', overflow: 'hidden' }}>
                        {isAlert && <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: '#ef4444' }} />}
                        
                        <div style={{ display: 'flex', gap: 14 }}>
                          <div style={{ width: 44, height: 44, borderRadius: 12, background: config.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span className="material-symbols-outlined" style={{ color: config.color, fontSize: 22 }}>{config.icon}</span>
                          </div>
                          
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                              <span style={{ fontSize: 11, fontWeight: 800, color: config.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>{req.type || req.category}</span>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>{formatTime(timeVal)}</span>
                            </div>
                            <h4 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>{req.title}</h4>
                            <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.5 }}>{req.message}</p>
                          </div>
                        </div>

                        {/* Actions logic */}
                        {((req.type === 'Attendance_Review') || 
                          (req.type === 'Student Details Review') || 
                          (req.source === 'notification' && req.action === 'VIEW_TENANTS') || 
                          (req.source !== 'notification')) && (
                          
                          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                            {req.type === 'Attendance_Review' && (
                              <button
                                onClick={() => setReviewModalData(req)}
                                style={{ flex: 1, background: '#0f172a', color: 'white', border: 'none', borderRadius: 9, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                                Review Details
                              </button>
                            )}
                            {req.type === 'Student Details Review' && (
                              <button
                                onClick={() => handleResolve(req)}
                                style={{ flex: 1, background: '#0f172a', color: 'white', border: 'none', borderRadius: 9, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                                Review Details
                              </button>
                            )}
                            {req.source === 'notification' && req.action === 'VIEW_TENANTS' && (
                              <button
                                onClick={() => handleResolve(req)}
                                style={{ flex: 1, background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: 9, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>open_in_new</span>
                                View Upcoming User
                              </button>
                            )}
                            {req.source !== 'notification' && req.type !== 'Student Details Review' && req.type !== 'Attendance_Review' && (
                              <button
                                onClick={() => handleResolve(req)}
                                style={{ flex: 1, background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: 9, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>open_in_new</span>
                                Review & Action
                              </button>
                            )}
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      `;
  
  code = part1 + groupedMapReplacement + part2;
}

fs.writeFileSync('/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/RequestBox.jsx', code);
console.log('Done rewriting RequestBox.jsx');
