const fs = require('fs');
let content = fs.readFileSync('Febebo-admin/src/pages/VisitorLog.jsx', 'utf8');

// Update handleMarkVisitor
const oldHandleMark = `  const handleMarkVisitor = async (id) => {
    try {
      await updateDoc(doc(db, 'visitors', id), {
        status: 'Inside',
        marked: true
      });
      setSelectedVisitor(null);
    } catch (e) {
      console.error(e);
    }
  };`;

const newHandleMark = `  const handleMarkVisitor = async (id, currentVisitor) => {
    try {
      const now = new Date();
      const timeIn = currentVisitor?.timeIn || now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      await updateDoc(doc(db, 'visitors', id), {
        status: 'Inside',
        marked: true,
        timeIn
      });
      setSelectedVisitor(null);
    } catch (e) {
      console.error(e);
    }
  };`;
content = content.replace(oldHandleMark, newHandleMark);

// We need to pass selectedVisitor to handleMarkVisitor in the JSX.
content = content.replace(/handleMarkVisitor\(selectedVisitor\.id\)/g, "handleMarkVisitor(selectedVisitor.id, selectedVisitor)");

// Update the Checkout Button Condition
const oldCheckoutBtn = `{selectedVisitor.status === 'Inside' && (
                <button 
                  onClick={() => handleCheckout(selectedVisitor.id)}
                  style={{ width: '100%', background: '#ef4444', color: 'white', padding: 16, borderRadius: 12, fontWeight: 700, fontSize: '1rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 12px rgba(239,68,68,0.3)', marginBottom: 12 }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>logout</span> Mark as Exited (OUT)
                </button>
              )}`;

const newCheckoutBtn = `{(selectedVisitor.status === 'Inside' || selectedVisitor.status === 'Pending Exit') && (
                <button 
                  onClick={() => handleCheckout(selectedVisitor.id)}
                  style={{ width: '100%', background: '#ef4444', color: 'white', padding: 16, borderRadius: 12, fontWeight: 700, fontSize: '1rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 12px rgba(239,68,68,0.3)', marginBottom: 12 }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>logout</span> Approve / Mark as Exited (OUT)
                </button>
              )}`;
content = content.replace(oldCheckoutBtn, newCheckoutBtn);

// Update Mark as Verified condition to also show if Pending Entry
const oldVerifyBtn = `{!selectedVisitor.marked && selectedVisitor.status !== 'Exited' && (
                <button 
                  onClick={() => handleMarkVisitor(selectedVisitor.id, selectedVisitor)}
                  style={{ width: '100%', background: '#10b981', color: 'white', padding: 16, borderRadius: 12, fontWeight: 700, fontSize: '1rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>done_all</span> Mark as Verified
                </button>
              )}`;

const newVerifyBtn = `{(!selectedVisitor.marked || selectedVisitor.status === 'Pending Entry') && selectedVisitor.status !== 'Exited' && selectedVisitor.status !== 'Pending Exit' && (
                <button 
                  onClick={() => handleMarkVisitor(selectedVisitor.id, selectedVisitor)}
                  style={{ width: '100%', background: '#10b981', color: 'white', padding: 16, borderRadius: 12, fontWeight: 700, fontSize: '1rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 12px rgba(16,185,129,0.3)', marginBottom: 12 }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>done_all</span> Approve Entry (IN)
                </button>
              )}`;
content = content.replace(oldVerifyBtn, newVerifyBtn);


fs.writeFileSync('Febebo-admin/src/pages/VisitorLog.jsx', content);
console.log('Fixed statuses!');
