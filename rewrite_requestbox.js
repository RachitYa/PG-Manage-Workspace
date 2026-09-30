const fs = require('fs');

let code = fs.readFileSync('/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/RequestBox.jsx', 'utf8');

// The render method currently has:
// shown.map(req => {
// Let's replace the whole list rendering section.
const mapStartIndex = code.indexOf("{loading ? (");
const modalStartIndex = code.indexOf("ReviewDetailsModal", mapStartIndex);

if(mapStartIndex !== -1 && modalStartIndex !== -1) {
    const p1 = code.substring(0, mapStartIndex);
    const p2 = code.substring(code.lastIndexOf("}", modalStartIndex) + 1);

    const replacement = `{loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ display: 'inline-block', width: 30, height: 30, border: '3px solid #e2e8f0', borderTopColor: cyan, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : shown.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 56, color: '#e2e8f0' }}>notifications_off</span>
            <p style={{ color: '#94a3b8', fontSize: 15, fontWeight: 600 }}>
              {activeTab === 'Pending' ? 'You are all caught up!' : 'No resolved notifications yet.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {Object.entries(
                shown.reduce((acc, req) => {
                    const timeVal = req.timestamp || req.date || req.createdAt || '';
                    const label = getCategoryLabel(timeVal);
                    if (!acc[label]) acc[label] = [];
                    acc[label].push(req);
                    return acc;
                }, {})
            ).map(([dateLabel, reqs]) => (
              <div key={dateLabel} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h3 style={{ margin: '0 4px', fontSize: 14, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>{dateLabel}</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {reqs.map((req) => {
                    const cat = CATEGORY_CONFIG[req.category] || CATEGORY_CONFIG.amenity;
                    const timeVal = req.timestamp || req.date || req.createdAt || '';

                    return (
                      <div key={req.id} style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', marginBottom: 12, overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.05)', borderLeft: \`4px solid \${cat.color}\` }}>
                        <div style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 32, height: 32, borderRadius: 9, background: cat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 17, color: cat.color }}>{cat.icon}</span>
                              </div>
                              <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{req.type}</p>
                            </div>
                            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>{formatTime(timeVal)}</span>
                          </div>
                          
                          <p style={{ margin: '0 0 6px', fontSize: 12, color: '#64748b' }}>
                            {req.tenant} {(req.room && req.room !== 'N/A') && \`· Room \${req.room}\`}
                          </p>
                          <p style={{ margin: '0 0 12px', fontSize: 13, color: '#475569' }}>{req.desc || req.message}</p>
                          
                          <div style={{ display: 'flex', gap: 8 }}>
                            {req.phone && (
                              <a href={\`tel:\${req.phone}\`} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#ecfeff', color: cyan, border: '1px solid #a5f3fc', borderRadius: 9, padding: '7px 12px', textDecoration: 'none', fontSize: 12, fontWeight: 700 }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>call</span>
                                Call
                              </a>
                            )}
                            
                            {!req.resolved && req.type === 'Attendance_Review' && (
                              <>
                                <button
                                  onClick={() => handleAttendanceReview(req, 'present')}
                                  style={{ flex: 1, background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: 9, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>check_circle</span>
                                  Mark Present
                                </button>
                                <button
                                  onClick={() => handleAttendanceReview(req, 'absent')}
                                  style={{ flex: 1, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 9, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>cancel</span>
                                  Mark Absent
                                </button>
                              </>
                            )}
                            
                            {req.type === 'Student Details Review' && (
                              <button
                                onClick={() => handleResolve(req)}
                                style={{ flex: 1, background: '#0f172a', color: 'white', border: 'none', borderRadius: 9, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                                Review Details
                              </button>
                            )}

                            {!req.resolved && req.source === 'notification' && req.action === 'VIEW_TENANTS' && (
                              <button
                                onClick={() => handleResolve(req)}
                                style={{ flex: 1, background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: 9, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>open_in_new</span>
                                View Upcoming User
                              </button>
                            )}

                            {!req.resolved && req.source === 'staff' && (
                              <button
                                onClick={() => handleResolve(req)}
                                style={{ flex: 1, background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: 9, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>open_in_new</span>
                                Review & Action
                              </button>
                            )}

                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {reviewModalData && <`;

    fs.writeFileSync('/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/RequestBox.jsx', p1 + replacement + "ReviewDetailsModal" + p2);
    console.log("Success");
}
