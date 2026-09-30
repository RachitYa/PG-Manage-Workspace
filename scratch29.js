const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/febebo-staff/src/pages/StaffApp.jsx";
let content = fs.readFileSync(file, 'utf8');

// 1. Remove the wrongly placed logout button
const wrongLogoutButton = `          <button 
            onClick={logout} 
            style={{marginTop:16, width:'100%', padding:'16px', background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:18, display:'flex', alignItems:'center', justifyContent:'center', gap:8, cursor:'pointer', color:'#991b1b', fontSize:16, fontWeight:800, fontFamily:'inherit', boxShadow:'0 4px 12px rgba(239, 68, 68, 0.1)'}}
          >
            <span className="material-symbols-outlined" style={{fontSize:22}}>logout</span>
            Sign Out securely
          </button>`;

content = content.replace(wrongLogoutButton + '\n', '');

// 2. Find the end of profile_view and add it there
// Let's find exactly the line where profile_view ends.
// In profile view, the last thing is the documents list map.
// Let's look for "Updated docs map" or similar...
// We can use a regex or specific text.
const profileViewMarker = `                            }
                          }}
                        />
                      </>
                    )}
                  </div>

                </div>
              ))}
            </div>
          </div>
        </div>
      )}`;

const replacement = `                            }
                          }}
                        />
                      </>
                    )}
                  </div>

                </div>
              ))}
            </div>
          </div>

          <button 
            onClick={logout} 
            style={{marginTop:16, width:'100%', padding:'16px', background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:18, display:'flex', alignItems:'center', justifyContent:'center', gap:8, cursor:'pointer', color:'#991b1b', fontSize:16, fontWeight:800, fontFamily:'inherit', boxShadow:'0 4px 12px rgba(239, 68, 68, 0.1)'}}
          >
            <span className="material-symbols-outlined" style={{fontSize:22}}>logout</span>
            Sign Out securely
          </button>
        </div>
      )}`;

if(content.includes(profileViewMarker)) {
    content = content.replace(profileViewMarker, replacement);
    fs.writeFileSync(file, content);
    console.log("Success");
} else {
    console.log("Profile view marker not found");
}

