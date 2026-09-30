const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/Chat.jsx";
let content = fs.readFileSync(file, 'utf8');

// 1. Add showSendOptionsModal state
if (!content.includes('showSendOptionsModal')) {
  content = content.replace(
    "const [showRoomDetailsModal, setShowRoomDetailsModal] = useState(false);",
    "const [showSendOptionsModal, setShowSendOptionsModal] = useState(false);\n  const [showRoomDetailsModal, setShowRoomDetailsModal] = useState(false);"
  );
}

// 2. Add sendMessMenu and sendPGDetails functions after sendRoomDetails
const newFunctions = `
  const sendMessMenu = async () => {
    setActionLoading('sending_details');
    try {
      const pgSnap = await getDoc(doc(db, 'pg_owners', user.uid));
      const pgData = pgSnap.data() || {};
      // Wait, food menu in admin could be 'foodMenu' or 'foodTimetable'
      const foodMenu = pgData.foodMenu || pgData.foodTimetable; 
      
      if (!foodMenu) {
        alert("No Mess Menu found for your PG.");
        setActionLoading(null);
        return;
      }
      
      let text = "🍽️ *Weekly Mess Menu*\\n\\n";
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      days.forEach(day => {
        // Some might use lowercase keys, so check case insensitive
        const dayKey = Object.keys(foodMenu).find(k => k.toLowerCase() === day.toLowerCase());
        if (dayKey && foodMenu[dayKey]) {
           text += \`*__\${day}__*\\n\`;
           if (foodMenu[dayKey].breakfast) text += \`☕ Breakfast: \${foodMenu[dayKey].breakfast}\\n\`;
           if (foodMenu[dayKey].lunch) text += \`🍛 Lunch: \${foodMenu[dayKey].lunch}\\n\`;
           if (foodMenu[dayKey].snacks) text += \`🥪 Snacks: \${foodMenu[dayKey].snacks}\\n\`;
           if (foodMenu[dayKey].dinner) text += \`🍲 Dinner: \${foodMenu[dayKey].dinner}\\n\`;
           text += '\\n';
        }
      });

      if (text === "🍽️ *Weekly Mess Menu*\\n\\n") {
         text += "Menu is currently empty.";
      }

      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text: text.trim(),
        senderId: user.uid,
        timestamp: new Date().toISOString()
      });

      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: "Sent Mess Menu",
        lastTimestamp: new Date().toISOString()
      });

      setShowSendOptionsModal(false);
    } catch (e) {
      console.error(e);
      alert("Failed to send mess menu");
    }
    setActionLoading(null);
  };

  const sendPGDetails = async () => {
    setActionLoading('sending_details');
    try {
      const pgSnap = await getDoc(doc(db, 'pg_owners', user.uid));
      const pg = pgSnap.data();
      if (!pg) {
        alert("No PG Details found.");
        setActionLoading(null);
        return;
      }

      let minRent = '—';
      if (pg.propertyDetails?.rents?.length) {
        minRent = \`₹\${Math.min(...pg.propertyDetails.rents.map(r=>Number(r.rent)).filter(v=>v>0)).toLocaleString()}/mo\`;
      }
      
      let text = \`🏢 *\${pg.pgName || 'Febebo PG'}*\\n\`;
      text += \`📍 \${pg.location?.city || 'New Delhi'}\\n\`;
      text += \`🏷️ Starting at: \${minRent}\\n\\n\`;
      if (pg.amenities && pg.amenities.length > 0) {
        text += \`✨ Amenities: \${pg.amenities.join(', ')}\\n\`;
      }

      const imageUrl = (pg.images && pg.images.length > 0) ? pg.images[0] : (pg.image || null);

      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text: text.trim(),
        imageUrl: imageUrl,
        senderId: user.uid,
        timestamp: new Date().toISOString()
      });

      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: "Sent PG Details",
        lastTimestamp: new Date().toISOString()
      });

      setShowSendOptionsModal(false);
    } catch (e) {
      console.error(e);
      alert("Failed to send PG details");
    }
    setActionLoading(null);
  };
`;

if (!content.includes('sendMessMenu')) {
  // insert after sendRoomDetails
  const insertIndex = content.indexOf('setActionLoading(null);\n  };\n\n  // Handle image upload');
  if (insertIndex !== -1) {
    content = content.slice(0, insertIndex + 30) + newFunctions + content.slice(insertIndex + 30);
  } else {
    // try finding just setActionLoading(null);\n  }; after sendRoomDetails
    const sendRoomDetailsEnd = content.indexOf('setActionLoading(null);\n  };', content.indexOf('const sendRoomDetails = async (roomId) =>'));
    if (sendRoomDetailsEnd !== -1) {
        content = content.slice(0, sendRoomDetailsEnd + 28) + newFunctions + content.slice(sendRoomDetailsEnd + 28);
    }
  }
}

// 3. Change "Send Details" button onClick to open options modal
content = content.replace(
  "onClick={() => setShowRoomDetailsModal(true)}",
  "onClick={() => setShowSendOptionsModal(true)}"
);

// 4. Add the options modal JSX before RoomDetails modal
const optionsModalJSX = `
      {/* Send Options Modal */}
      {showSendOptionsModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 20 }}>
          <div onClick={() => setShowSendOptionsModal(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }} />
          <div style={{ position: 'relative', background: 'white', borderRadius: 24, padding: 24, zIndex: 201, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 20, color: '#0f172a', fontWeight: 800 }}>📤 Send Details</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button 
                onClick={() => { setShowSendOptionsModal(false); setShowRoomDetailsModal(true); }}
                style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left' }}
              >
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                  <span className="material-symbols-outlined">bed</span>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Room Details</h4>
                  <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Select a room and send its details</p>
                </div>
              </button>

              <button 
                onClick={sendMessMenu}
                disabled={actionLoading === 'sending_details'}
                style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left', opacity: actionLoading === 'sending_details' ? 0.7 : 1 }}
              >
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
                  <span className="material-symbols-outlined">restaurant</span>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Mess Menu</h4>
                  <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Send weekly food timetable</p>
                </div>
              </button>

              <button 
                onClick={sendPGDetails}
                disabled={actionLoading === 'sending_details'}
                style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left', opacity: actionLoading === 'sending_details' ? 0.7 : 1 }}
              >
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                  <span className="material-symbols-outlined">apartment</span>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>PG Details</h4>
                  <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Send PG info and cover image</p>
                </div>
              </button>
            </div>

            <button 
              onClick={() => setShowSendOptionsModal(false)} 
              style={{ width: '100%', marginTop: 20, padding: 14, background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
`;

if (!content.includes('Send Options Modal')) {
  content = content.replace(
    "{/* Send Room Details Modal */}",
    optionsModalJSX + "\n      {/* Send Room Details Modal */}"
  );
}

fs.writeFileSync(file, content);
