const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/UserProfile.jsx";
let content = fs.readFileSync(file, 'utf8');

// 1. Add imports if needed
if(!content.includes("writeBatch")) {
    content = content.replace("updateDoc, doc", "updateDoc, doc, writeBatch, addDoc");
}

// 2. Add state
const stateToInject = `  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [noticeForm, setNoticeForm] = useState({ fromDate: '', toDate: '', leaveDate: '', message: '' });
  const [isSendingNotice, setIsSendingNotice] = useState(false);
  const [isKicking, setIsKicking] = useState(false);
  const [showKickConfirm, setShowKickConfirm] = useState(false);

  const handleSendNotice = async () => {
    if(!noticeForm.fromDate || !noticeForm.toDate || !noticeForm.leaveDate || !noticeForm.message) {
      alert('Please fill all fields');
      return;
    }
    setIsSendingNotice(true);
    try {
      const uid = user.tenantId || user.id || user.uid;
      const batch = writeBatch(db);
      
      // Update tenant status
      batch.update(doc(db, 'tenants', uid), {
        status: 'On Notice Period',
        noticeDate: noticeForm.leaveDate,
        noticeFrom: noticeForm.fromDate,
        noticeTo: noticeForm.toDate,
        noticeMessage: noticeForm.message
      });

      // Update user subscribedPG status
      if (fullUser?.subscribedPG) {
        batch.update(doc(db, 'users', uid), {
          'subscribedPG.status': 'On Notice Period'
        });
      }

      // Add Notification
      batch.set(doc(collection(db, 'users', uid, 'notifications')), {
        title: 'Notice Period Started',
        desc: \`\${noticeForm.message}\nClear your all dues before leaving the PG on \${noticeForm.leaveDate}.\`,
        type: 'warning',
        createdAt: new Date().toISOString(),
        unread: true
      });

      await batch.commit();
      setShowNoticeModal(false);
      alert('Notice sent successfully!');
    } catch(err) {
      console.error(err);
      alert('Failed to send notice.');
    } finally {
      setIsSendingNotice(false);
    }
  };

  const handleKickImmediately = async () => {
    setIsKicking(true);
    try {
      const uid = user.tenantId || user.id || user.uid;
      const batch = writeBatch(db);
      
      // Update tenant status to Moved Out
      batch.update(doc(db, 'tenants', uid), {
        status: 'Moved Out',
        movedOutDate: new Date().toISOString()
      });

      // Remove subscribedPG from users so they see main menu
      batch.update(doc(db, 'users', uid), {
        subscribedPG: null
      });

      // Add Notification
      batch.set(doc(collection(db, 'users', uid, 'notifications')), {
        title: 'Removed from PG',
        desc: 'You have been immediately removed from the PG by the Admin.',
        type: 'warning',
        createdAt: new Date().toISOString(),
        unread: true
      });

      await batch.commit();
      setShowKickConfirm(false);
      alert('Student kicked successfully!');
      onBack();
    } catch(err) {
      console.error(err);
      alert('Failed to kick student.');
    } finally {
      setIsKicking(false);
    }
  };
`;
content = content.replace("  const [realUnpaid, setRealUnpaid] = useState(0);", stateToInject + "\n  const [realUnpaid, setRealUnpaid] = useState(0);");

// 3. Add UI below name card
const uiToInject = `
        <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
          <button 
            onClick={() => {
              setNoticeForm(prev => ({...prev, message: 'Please clear your all dues before leaving the PG.'}));
              setShowNoticeModal(true);
            }}
            style={{ flex: 1, background: 'rgba(234, 179, 8, 0.15)', color: '#ca8a04', border: '1px solid #fef08a', padding: '10px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>assignment_late</span>
            Send Notice
          </button>
          
          <button 
            onClick={() => setShowKickConfirm(true)}
            style={{ flex: 1, background: 'rgba(239, 68, 68, 0.15)', color: '#dc2626', border: '1px solid #fecaca', padding: '10px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person_remove</span>
            Kick Student
          </button>
        </div>
`;
content = content.replace("        </div>\n      </div>\n\n      <div style={{ padding: 16 }}>", "        </div>" + uiToInject + "      </div>\n\n      <div style={{ padding: 16 }}>");

// 4. Add Modals at bottom of return
const modalsToInject = `
      {/* Notice Modal */}
      {showNoticeModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => !isSendingNotice && setShowNoticeModal(false)}></div>
          <div style={{ position: 'relative', background: 'white', width: '100%', maxWidth: 400, borderRadius: 20, padding: 20, boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18, color: '#0f172a' }}>Send Notice</h3>
            
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>Student Name</label>
              <input type="text" value={profile.name} disabled style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#94a3b8' }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>Phone Number</label>
              <input type="text" value={profile.phone !== '-' ? profile.phone : (user?.phone || '')} disabled style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#94a3b8' }} />
            </div>
            
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>Notice From</label>
                <input type="date" value={noticeForm.fromDate} onChange={e => setNoticeForm({...noticeForm, fromDate: e.target.value})} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', outlineColor: cyan }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>Notice To</label>
                <input type="date" value={noticeForm.toDate} onChange={e => setNoticeForm({...noticeForm, toDate: e.target.value})} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', outlineColor: cyan }} />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>Date Requested to Leave</label>
              <input type="date" value={noticeForm.leaveDate} onChange={e => setNoticeForm({...noticeForm, leaveDate: e.target.value})} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', outlineColor: cyan }} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>Message to Student</label>
              <textarea value={noticeForm.message} onChange={e => setNoticeForm({...noticeForm, message: e.target.value})} rows={3} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', outlineColor: cyan, resize: 'none', fontFamily: 'inherit' }} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowNoticeModal(false)} disabled={isSendingNotice} style={{ flex: 1, padding: 12, borderRadius: 10, background: '#f1f5f9', color: '#64748b', fontWeight: 600, border: 'none', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSendNotice} disabled={isSendingNotice} style={{ flex: 1, padding: 12, borderRadius: 10, background: cyan, color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {isSendingNotice ? <div style={{ width: 16, height: 16, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> : 'Send Notice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kick Confirm Modal */}
      {showKickConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => !isKicking && setShowKickConfirm(false)}></div>
          <div style={{ position: 'relative', background: 'white', width: '100%', maxWidth: 320, borderRadius: 20, padding: 24, textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 32 }}>person_remove</span>
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, color: '#0f172a' }}>Kick Student?</h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748b' }}>Are you sure you want to immediately remove <b>{profile.name}</b> from the PG? This action cannot be undone.</p>
            
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowKickConfirm(false)} disabled={isKicking} style={{ flex: 1, padding: 12, borderRadius: 10, background: '#f1f5f9', color: '#64748b', fontWeight: 600, border: 'none', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleKickImmediately} disabled={isKicking} style={{ flex: 1, padding: 12, borderRadius: 10, background: '#ef4444', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {isKicking ? <div style={{ width: 16, height: 16, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> : 'Kick Now'}
              </button>
            </div>
          </div>
        </div>
      )}
`;
content = content.replace("    </>\n  );\n}", modalsToInject + "    </>\n  );\n}");

fs.writeFileSync(file, content);
console.log("Kick and Notice functionality injected");
