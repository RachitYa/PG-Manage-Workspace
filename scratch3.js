const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/Chat.jsx";
let content = fs.readFileSync(file, 'utf8');

const roomDetailsModal = `
      {/* Send Room Details Modal */}
      {showRoomDetailsModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 20 }}>
          <div onClick={() => setShowRoomDetailsModal(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }} />
          <div style={{ position: 'relative', background: 'white', borderRadius: 24, padding: 24, zIndex: 201, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 20, color: '#0f172a', fontWeight: 800 }}>🛏️ Send Room Details</h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748b' }}>Select a room to send its details to <strong>{activeContact.name}</strong>.</p>
            
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              style={{ width: '100%', padding: '14px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 15, fontFamily: 'inherit', outline: 'none', marginBottom: 20 }}
            >
              <option value="">Select a room...</option>
              {availableRooms.map(r => (
                <option key={r.id} value={r.id}>Room {r.roomNo} ({r.roomBeds} Seater)</option>
              ))}
            </select>

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowRoomDetailsModal(false)} style={{ flex: 1, padding: 14, background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Cancel</button>
              <button 
                onClick={() => {
                  if (!selectedRoomId) return alert('Please select a room');
                  sendRoomDetails(selectedRoomId);
                }}
                disabled={actionLoading === 'sending_details'}
                style={{ flex: 1, padding: 14, background: '#0891b2', color: 'white', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: 'pointer', opacity: actionLoading === 'sending_details' ? 0.7 : 1 }}
              >
                {actionLoading === 'sending_details' ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Demand Token Modal */}`;

content = content.replace("{/* Demand Token Modal */}", roomDetailsModal);
fs.writeFileSync(file, content);
