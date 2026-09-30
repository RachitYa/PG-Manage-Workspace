import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// ─── SHARED DATA (mirrors Inventory.jsx) ─────────────────────────
const cyan = '#0891b2';

const ROOMS_DATA = [
  { id: 1, roomNo: '15', name: 'Staircase Front', type: 'Double Bed Room', beds: 2, status: 'occupied', img: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=220&fit=crop', residentIds: [1, 5] },
  { id: 2, roomNo: '16', name: 'Staircase Front', type: 'Triple Bed Room', beds: 3, status: 'occupied', img: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=400&h=220&fit=crop', residentIds: [2] },
  { id: 3, roomNo: '17', name: 'Staircase Front', type: 'Four Bed Room',   beds: 4, status: 'occupied', img: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=400&h=220&fit=crop', residentIds: [3] },
  { id: 4, roomNo: '18', name: 'Staircase Front', type: 'Double Bed Room', beds: 2, status: 'occupied', img: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=220&fit=crop', residentIds: [4] },
  { id: 5, roomNo: '19', name: 'Staircase Front', type: 'Double Bed Room', beds: 2, status: 'vacated', img:  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=220&fit=crop', residentIds: [] },
  { id: 6, roomNo: '20', name: 'Back Side',       type: 'Triple Bed Room', beds: 3, status: 'vacated', img:  'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=400&h=220&fit=crop', residentIds: [] },
];

const USERS_DATA = [
  { id: 1, name: 'Ravi Kumar',   phone: '+91 9234567681', bed: 'Bed No. 4', room: 'Room No. 15', img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&h=120&fit=crop' },
  { id: 2, name: 'Priya Sharma', phone: '+91 9234567682', bed: 'Bed No. 2', room: 'Room No. 16', img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop' },
  { id: 3, name: 'Amit Verma',   phone: '+91 9234567683', bed: 'Bed No. 1', room: 'Room No. 17', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop' },
  { id: 4, name: 'Sneha Kapoor', phone: '+91 9234567684', bed: 'Bed No. 3', room: 'Room No. 18', img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&h=120&fit=crop' },
  { id: 5, name: 'Karan Singh',  phone: '+91 9234567685', bed: 'Bed No. 2', room: 'Room No. 15', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop' },
];

const ROOM_ITEMS_DATA = [
  { name: 'Bed',       icon: 'bed',               assignedTo: 'Room',        img: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=600&h=400&fit=crop' },
  { name: 'Mattress',  icon: 'airline_seat_flat', assignedTo: 'Room',        img: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=400&fit=crop' },
  { name: 'Bedsheet',  icon: 'layers',            assignedTo: 'Ravi Kumar',  img: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&h=400&fit=crop' },
  { name: 'Pillow',    icon: 'weekend',           assignedTo: 'Karan Singh', img: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=600&h=400&fit=crop' },
  { name: 'Chair',     icon: 'chair',             assignedTo: 'Room',        img: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=600&h=400&fit=crop' },
  { name: 'Almirah',   icon: 'door_sliding',      assignedTo: 'Room',        img: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=400&fit=crop' },
  { name: 'Table',     icon: 'table_restaurant',  assignedTo: 'Room',        img: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=400&fit=crop' },
  { name: 'T.V',       icon: 'tv',                assignedTo: 'Room',        img: 'https://images.unsplash.com/photo-1593359677879-a4bb92f4834f?w=600&h=400&fit=crop' },
];

const EXCHANGE_DATA = {
  'Pillow':    [{ date: '8 Jul 2025', note: 'Old one torn', img: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=600&h=400&fit=crop' }, { date: '2 Mar 2025', note: 'Permanent stain', img: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=600&h=400&fit=crop' }, { date: '5 Oct 2024', note: 'Foam degraded', img: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=600&h=400&fit=crop' }],
  'Bedsheet':  [{ date: '5 Jul 2025', note: 'Requested by tenant', img: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&h=400&fit=crop' }, { date: '10 Jan 2025', note: 'Wear & tear', img: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&h=400&fit=crop' }],
  'Mattress':  [{ date: '1 Jun 2025', note: 'Sagging issue', img: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=400&fit=crop' }],
  'Chair':     [{ date: '12 May 2025', note: 'Broken leg', img: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=600&h=400&fit=crop' }],
};

const USER_ALLOTTED_DATA = [
  { name: 'Bed',       icon: 'bed',               qty: 1, img: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=600&h=400&fit=crop', assignedTo: 'User' },
  { name: 'Mattress',  icon: 'airline_seat_flat', qty: 1, img: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=400&fit=crop', assignedTo: 'User' },
  { name: 'Bedsheet',  icon: 'layers',            qty: 2, img: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&h=400&fit=crop', assignedTo: 'User' },
  { name: 'Pillow',    icon: 'weekend',           qty: 4, img: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=600&h=400&fit=crop', assignedTo: 'User' },
  { name: 'Chair',     icon: 'chair',             qty: 2, img: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=600&h=400&fit=crop', assignedTo: 'User' },
  { name: 'Almirah',   icon: 'door_sliding',      qty: 1, img: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=400&fit=crop', assignedTo: 'User' },
  { name: 'Kettle',    icon: 'coffee_maker',      qty: 1, img: 'https://images.unsplash.com/photo-1544731612-de7f96afe55f?w=600&h=400&fit=crop', assignedTo: 'User' },
  { name: 'Table',     icon: 'table_restaurant',  qty: 1, img: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=400&fit=crop', assignedTo: 'User' },
];

const ROOM_TYPES = ['Single Bed', 'Double Bed', 'Triple Bed', 'Four Sharing'];
const FACILITIES = ['AC', 'WiFi', 'Attached Washroom', 'Hot Water', 'Balcony', 'TV', 'Fridge', 'Study Table', 'Chair', 'Wardrobe', 'Bed', 'Mattress', 'Geyser'];
const INVENTORY_OPTIONS = ['Mattress', 'Pillow', 'Bedsheet', 'Bucket', 'Chair', 'Table'];
const DEFAULT_IMG = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=400&fit=crop';

// ─── SHARED UI HELPERS ────────────────────────────────────────────
function Header({ title, onBack, action }) {
  return (
    <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: cyan, display: 'flex' }}>
        <span className="material-symbols-outlined">arrow_back</span>
      </button>
      <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: 18, color: '#0f172a', margin: 0, flex: 1, textAlign: 'center' }}>{title}</p>
      {action || <div style={{ width: 32 }} />}
    </div>
  );
}

const BASE = { maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 40 };

// ─── LEVEL 5: Exchange photo viewer ──────────────────────────────
function ExchangePhotoView({ exchange, itemName, onBack }) {
  return (
    <div style={BASE}>
      <Header title="New Item Photo" onBack={onBack} />
      <div style={{ padding: 16 }}>
        <div style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
          <img src={exchange.img || DEFAULT_IMG} alt={itemName}
            style={{ width: '100%', height: 300, objectFit: 'cover', display: 'block' }}
            onError={e => { e.target.src = DEFAULT_IMG; }} />
        </div>
        <div style={{ background: 'white', borderRadius: 16, padding: '16px', border: '1px solid #e2e8f0' }}>
          <p style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', margin: '0 0 12px' }}>Exchange Record</p>
          {[{ icon: 'swap_horiz', label: 'Note', val: exchange.note }, { icon: 'calendar_today', label: 'Date', val: exchange.date }, { icon: 'inventory_2', label: 'Item', val: itemName }].map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < 2 ? '1px solid #f1f5f9' : 'none' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#ca8a04' }}>{r.icon}</span>
              <div>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{r.label}</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: 0 }}>{r.val}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── LEVEL 4: Item Detail (picture + assigned to + exchange list) ─
function ItemDetailView({ item, roomNo, onBack }) {
  const [viewingExchange, setViewingExchange] = useState(null);
  const history = EXCHANGE_DATA[item.name] || [];
  if (viewingExchange) return <ExchangePhotoView exchange={viewingExchange} itemName={item.name} onBack={() => setViewingExchange(null)} />;
  return (
    <div style={BASE}>
      <Header title={item.name} onBack={onBack} />
      <div style={{ padding: 16 }}>
        {/* Item image */}
        <div style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
          <img src={item.img || DEFAULT_IMG} alt={item.name}
            style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }}
            onError={e => { e.target.src = DEFAULT_IMG; }} />
        </div>

        {/* Item info */}
        <div style={{ background: 'white', borderRadius: 16, padding: '16px', marginBottom: 16, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22, color: cyan }}>{item.icon}</span>
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', margin: 0 }}>{item.name}</p>
              <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>in {roomNo}</p>
            </div>
          </div>
          {[{ icon: 'person', label: 'Currently Assigned To', val: item.assignedTo || 'Room' }, { icon: 'numbers', label: 'Quantity', val: item.qty ?? '—' }].map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: '1px solid #f1f5f9' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: cyan }}>{r.icon}</span>
              <div>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{r.label}</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: 0 }}>{String(r.val)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Exchange history */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <p style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', margin: 0 }}>Exchange History</p>
          {history.length > 0 && (
            <span style={{ background: '#fef9c3', color: '#ca8a04', fontWeight: 700, fontSize: 12, padding: '3px 10px', borderRadius: 20 }}>{history.length}x</span>
          )}
        </div>
        {history.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e2e8f0', padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 36, display: 'block', marginBottom: 6 }}>history</span>
            No exchanges yet
          </div>
        ) : (
          <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            {history.map((ex, i) => (
              <div key={i} onClick={() => setViewingExchange(ex)}
                style={{ display: 'flex', gap: 12, padding: '13px 16px', borderBottom: i < history.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer', alignItems: 'center' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fef9c3', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#ca8a04' }}>swap_horiz</span>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: '0 0 2px' }}>{ex.note}</p>
                  <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>{ex.date}</p>
                </div>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#94a3b8' }}>photo_camera</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── LEVEL 4: User Inventory Detail ──────────────────────────────
function UserInventoryView({ user, onBack }) {
  const [items] = useState(USER_ALLOTTED_DATA.map(i => ({ ...i })));
  const [selectedItem, setSelectedItem] = useState(null);
  if (selectedItem !== null) {
    return <ItemDetailView item={{ ...items[selectedItem], assignedTo: user.name }} roomNo={user.room} onBack={() => setSelectedItem(null)} />;
  }
  return (
    <div style={BASE}>
      <Header title="Allotted Items" onBack={onBack} />
      <div style={{ padding: 16 }}>
        {/* User profile card */}
        <div style={{ background: cyan, borderRadius: 16, padding: '16px', display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16 }}>
          <img src={user.img} alt={user.name} style={{ width: 70, height: 70, borderRadius: 12, objectFit: 'cover', border: '3px solid rgba(255,255,255,0.3)', flexShrink: 0 }} />
          <div>
            <p style={{ fontWeight: 700, fontSize: 16, color: 'white', margin: '0 0 4px' }}>{user.name}</p>
            {[{ icon: 'phone', text: user.phone }, { icon: 'bed', text: user.bed }, { icon: 'meeting_room', text: user.room }].map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{r.icon}</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)' }}>{r.text}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          {items.map((item, idx) => (
            <div key={item.name} onClick={() => setSelectedItem(idx)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderBottom: idx < items.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: cyan }}>{item.icon}</span>
                </div>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>{item.name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ background: '#f1f5f9', color: '#475569', fontWeight: 700, fontSize: 14, padding: '4px 10px', borderRadius: 8 }}>{item.qty}</span>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#94a3b8' }}>chevron_right</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── LEVEL 3: Room Detail — Residents + Items tabs ────────────────
function RoomDetailView({ room, onBack }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState('residents');
  const [selectedItem, setSelectedItem] = useState(null);
  const residents = USERS_DATA.filter(u => room.residentIds.includes(u.id));

  if (selectedItem !== null) {
    return <ItemDetailView item={ROOM_ITEMS_DATA[selectedItem]} roomNo={`Room No. ${room.roomNo}`} onBack={() => setSelectedItem(null)} />;
  }

  return (
    <div style={BASE}>
      <Header title={`Room No. ${room.roomNo}`} onBack={onBack} action={<button style={{ background: cyan, color: 'white', border: 'none', borderRadius: 8, padding: '6px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Save</button>} />
      <div style={{ padding: 16 }}>
        {/* Room photo + info */}
        <div style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
          <img src={room.img} alt={room.name} style={{ width: '100%', height: 190, objectFit: 'cover', display: 'block' }}
            onError={e => { e.target.src = DEFAULT_IMG; }} />
          <div style={{ background: 'white', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', margin: 0 }}>{room.name}</p>
              <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>{room.type}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 12, fontWeight: 700, background: room.status === 'occupied' ? '#dcfce7' : '#f1f5f9', color: room.status === 'occupied' ? '#059669' : '#64748b', padding: '4px 12px', borderRadius: 20 }}>
                {room.status === 'occupied' ? 'Occupied' : 'Vacated'}
              </span>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0' }}>{room.beds} beds · {residents.length} residents</p>
            </div>
          </div>
        </div>

        {/* Tab toggle */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[{ id: 'residents', label: 'Residents', icon: 'people' }, { id: 'items', label: 'Room Items', icon: 'inventory_2' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding: '12px', borderRadius: 12, border: tab === t.id ? `2px solid ${cyan}` : '1.5px solid #e2e8f0', background: tab === t.id ? '#ecfeff' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: tab === t.id ? cyan : '#94a3b8' }}>{t.icon}</span>
              <span style={{ fontWeight: 700, fontSize: 14, color: tab === t.id ? cyan : '#64748b' }}>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Residents tab */}
        {tab === 'residents' && (
          residents.length === 0 ? (
            <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e2e8f0', padding: '36px', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 44, color: '#cbd5e1', display: 'block', marginBottom: 8 }}>person_off</span>
              <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>No residents in this room</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {residents.map(user => (
                <div key={user.id} onClick={() => navigate(`/user/${user.id}`, { state: { user } })}
                  style={{ background: 'white', borderRadius: 14, border: '1px solid #e2e8f0', padding: 12, display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                  <img src={user.img} alt={user.name} style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', margin: '0 0 4px' }}>{user.name}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 13, color: cyan }}>bed</span>
                      <span style={{ fontSize: 12, color: '#475569' }}>{user.bed}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 13, color: cyan }}>phone</span>
                      <span style={{ fontSize: 12, color: '#475569' }}>{user.phone}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#94a3b8' }}>chevron_right</span>
                    <span style={{ fontSize: 10, color: '#94a3b8' }}>inventory</span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Items tab */}
        {tab === 'items' && (
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            {ROOM_ITEMS_DATA.map((item, idx) => {
              const exchangeCount = (EXCHANGE_DATA[item.name] || []).length;
              const latestDate = exchangeCount > 0 ? EXCHANGE_DATA[item.name][0].date : null;
              return (
                <div key={item.name} onClick={() => setSelectedItem(idx)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderBottom: idx < ROOM_ITEMS_DATA.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 20, color: cyan }}>{item.icon}</span>
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 14, color: '#0f172a', margin: '0 0 2px' }}>{item.name}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 12, color: '#94a3b8' }}>person</span>
                        <span style={{ fontSize: 12, color: '#64748b' }}>{item.assignedTo}</span>
                      </div>
                      {latestDate && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 11, color: '#ca8a04' }}>swap_horiz</span>
                          <span style={{ fontSize: 11, color: '#ca8a04', fontWeight: 600 }}>Last exchanged: {latestDate}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {exchangeCount > 0 && (
                      <span style={{ background: '#fef9c3', color: '#ca8a04', fontWeight: 700, fontSize: 11, padding: '3px 8px', borderRadius: 20 }}>{exchangeCount}x</span>
                    )}
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#94a3b8' }}>chevron_right</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


// ─── LEVEL 2: Room Grid List ──────────────────────────────────────
function RoomListView({ onBack, onAddRoom }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'occupied' | 'vacated'
  const [selectedRoom, setSelectedRoom] = useState(null);

  if (selectedRoom) return <RoomDetailView room={selectedRoom} onBack={() => setSelectedRoom(null)} />;

  const totalSeats = ROOMS_DATA.reduce((s, r) => s + r.beds, 0);
  const occupiedSeats = ROOMS_DATA.filter(r => r.status === 'occupied').reduce((s, r) => s + r.residentIds.length, 0);
  const vacatedSeats = totalSeats - occupiedSeats;

  const filtered = ROOMS_DATA.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = r.roomNo.includes(q) || r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q);
    if (filter === 'occupied') return matchSearch && r.status === 'occupied';
    if (filter === 'vacated')  return matchSearch && r.status === 'vacated';
    return matchSearch;
  });

  return (
    <div style={BASE}>
      <Header title="Seats" onBack={onBack} action={
        <button onClick={onAddRoom} style={{ background: cyan, color: 'white', border: 'none', borderRadius: 8, padding: '6px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+ Add</button>
      } />
      <div style={{ padding: 16 }}>
        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <span className="material-symbols-outlined" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: cyan, fontSize: 20, pointerEvents: 'none' }}>search</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by room no / type"
            style={{ width: '100%', paddingLeft: 40, paddingRight: 16, paddingTop: 12, paddingBottom: 12, border: `1.5px solid ${cyan}`, borderRadius: 12, fontSize: 15, fontFamily: 'inherit', background: 'white', color: '#1e293b', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
          {[{ label: 'Total Seats', val: totalSeats, color: cyan }, { label: 'Occupied', val: occupiedSeats, color: '#059669' }, { label: 'Vacated', val: vacatedSeats, color: '#e11d48' }].map((s, i) => (
            <div key={i} style={{ background: 'white', border: `1.5px solid ${i === 0 ? cyan : '#e2e8f0'}`, borderRadius: 12, padding: '12px 8px', textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 4px', fontWeight: 500 }}>{s.label}</p>
              <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 24, fontWeight: 800, color: s.color, margin: 0 }}>{s.val}</p>
            </div>
          ))}
        </div>

        {/* Action pills */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Add\nRoom',      icon: 'add_home',  action: onAddRoom,                                        active: false },
            { label: 'Complete\nRoom', icon: 'home',       action: () => setFilter(f => f === 'occupied' ? 'all' : 'occupied'), active: filter === 'occupied' },
            { label: 'Pending\nRoom',  icon: 'search',     action: () => setFilter(f => f === 'vacated'  ? 'all' : 'vacated'),  active: filter === 'vacated'  },
          ].map((pill, i) => (
            <button key={i} onClick={pill.action}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: pill.active ? '#ecfeff' : 'white', border: pill.active ? `1.5px solid ${cyan}` : '1px solid #e2e8f0', borderRadius: 14, padding: '14px 8px', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', fontFamily: 'inherit' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: pill.active ? cyan : '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ color: pill.active ? 'white' : cyan, fontSize: 22 }}>{pill.icon}</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: pill.active ? cyan : '#1e293b', textAlign: 'center', whiteSpace: 'pre-line', lineHeight: 1.3 }}>{pill.label}</span>
            </button>
          ))}
        </div>

        {/* Room cards */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 48, display: 'block', marginBottom: 8 }}>search_off</span>
            No rooms found
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(room => {
              const residents = USERS_DATA.filter(u => room.residentIds.includes(u.id));
              return (
                <div key={room.id} onClick={() => setSelectedRoom(room)} style={{ background: 'white', borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                  {/* Room image */}
                  <div style={{ position: 'relative' }}>
                    <img src={room.img} alt={room.name} style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }}
                      onError={e => { e.target.src = DEFAULT_IMG; }} />
                    <span style={{ position: 'absolute', top: 10, right: 10, background: room.status === 'occupied' ? '#059669' : '#64748b', color: 'white', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20 }}>
                      {room.status === 'occupied' ? 'Occupied' : 'Vacated'}
                    </span>
                    <div style={{ position: 'absolute', bottom: 10, left: 12, background: 'rgba(0,0,0,0.55)', borderRadius: 8, padding: '4px 10px' }}>
                      <span style={{ color: 'white', fontWeight: 700, fontSize: 13 }}>Room No. {room.roomNo}</span>
                    </div>
                  </div>
                  {/* Room info */}
                  <div style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', margin: '0 0 2px' }}>{room.name}</p>
                        <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{room.type} · {room.beds} beds</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14, color: cyan }}>chevron_right</span>
                      </div>
                    </div>
                    {/* Resident avatar row */}
                    {residents.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ display: 'flex' }}>
                          {residents.slice(0, 3).map((u, i) => (
                            <img key={u.id} src={u.img} alt={u.name}
                              style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: '2px solid white', marginLeft: i > 0 ? -8 : 0 }} />
                          ))}
                        </div>
                        <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>
                          {residents.length === 1 ? residents[0].name : `${residents.length} residents`}
                        </span>
                      </div>
                    )}
                    {residents.length === 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#94a3b8' }}>person_off</span>
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>No residents assigned</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN — Add Room form ─────────────────────────────────────────
export default function ManageRooms() {
  const navigate = useNavigate();
  const [view, setView] = useState('listing'); // 'listing' | 'add'
  const [selectedFacilities, setSelectedFacilities] = useState([]);
  const [selectedInventory, setSelectedInventory] = useState([]);
  const [showFacilityDrop, setShowFacilityDrop] = useState(false);
  const [showInventoryDrop, setShowInventoryDrop] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const fileRef = useRef(null);

  const toggleFacility = f => setSelectedFacilities(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  const toggleInventory = f => setSelectedInventory(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);

  const handleImage = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  // ── Add Room View ──
  if (view === 'add') {
    return (
      <div style={{ ...BASE, paddingBottom: 80 }}>
        <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
          <button onClick={() => { setView('listing'); setImagePreview(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: cyan }}>
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: 18, color: '#0f172a', margin: 0, flex: 1, textAlign: 'center' }}>Add Room</p>
          <div style={{ width: 32 }} />
        </div>
        <div style={{ padding: 16 }}>
          <form onSubmit={e => { e.preventDefault(); setView('listing'); setImagePreview(null); }}>
            {/* Room Name */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Room Name</label>
              <input placeholder="e.g. Staircase Front" style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 15, fontFamily: 'inherit', background: 'white', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Room Number <span style={{ color: '#e11d48' }}>*</span></label>
              <input placeholder="e.g. 21" required style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 15, fontFamily: 'inherit', background: 'white', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Room Type <span style={{ color: '#e11d48' }}>*</span></label>
              <select required style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 15, fontFamily: 'inherit', background: 'white', outline: 'none', boxSizing: 'border-box', appearance: 'auto' }}>
                {ROOM_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>

            {/* Facility multi-select */}
            <div style={{ marginBottom: 16, position: 'relative' }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Facility</label>
              <div onClick={() => setShowFacilityDrop(!showFacilityDrop)} style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 15, fontFamily: 'inherit', background: 'white', cursor: 'pointer', boxSizing: 'border-box', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: selectedFacilities.length ? '#0f172a' : '#94a3b8' }}>{selectedFacilities.length ? `${selectedFacilities.length} selected` : 'Select facilities'}</span>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#64748b' }}>expand_more</span>
              </div>
              {showFacilityDrop && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 20, maxHeight: 200, overflowY: 'auto' }}>
                  {FACILITIES.map(f => (
                    <div key={f} onClick={() => toggleFacility(f)} style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #f1f5f9', background: selectedFacilities.includes(f) ? '#ecfeff' : 'white' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18, color: selectedFacilities.includes(f) ? cyan : '#cbd5e1' }}>{selectedFacilities.includes(f) ? 'check_box' : 'check_box_outline_blank'}</span>
                      <span style={{ fontSize: 14, color: '#0f172a' }}>{f}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Inventory multi-select */}
            <div style={{ marginBottom: 16, position: 'relative' }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Inventory</label>
              <div onClick={() => setShowInventoryDrop(!showInventoryDrop)} style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 15, fontFamily: 'inherit', background: 'white', cursor: 'pointer', boxSizing: 'border-box', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: selectedInventory.length ? '#0f172a' : '#94a3b8' }}>{selectedInventory.length ? `${selectedInventory.length} selected` : 'Select inventory'}</span>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#64748b' }}>expand_more</span>
              </div>
              {showInventoryDrop && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 20, maxHeight: 200, overflowY: 'auto' }}>
                  {INVENTORY_OPTIONS.map(f => (
                    <div key={f} onClick={() => toggleInventory(f)} style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #f1f5f9', background: selectedInventory.includes(f) ? '#ecfeff' : 'white' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18, color: selectedInventory.includes(f) ? cyan : '#cbd5e1' }}>{selectedInventory.includes(f) ? 'check_box' : 'check_box_outline_blank'}</span>
                      <span style={{ fontSize: 14, color: '#0f172a' }}>{f}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Image upload */}
            <div style={{ marginBottom: 28 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Room Photo</label>
              <input type="file" accept="image/*" ref={fileRef} onChange={handleImage} style={{ display: 'none' }} />
              <div onClick={() => fileRef.current?.click()} style={{ border: `2px dashed ${cyan}`, borderRadius: 14, overflow: 'hidden', minHeight: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#f8fafc' }}>
                {imagePreview ? (
                  <img src={imagePreview} alt="Room" style={{ width: '100%', height: 180, objectFit: 'cover' }} />
                ) : (
                  <div style={{ textAlign: 'center', padding: 24 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#94a3b8', display: 'block', marginBottom: 8 }}>cloud_upload</span>
                    <p style={{ fontSize: 14, color: '#94a3b8', margin: 0 }}>Tap to upload room photo</p>
                  </div>
                )}
              </div>
            </div>

            <button type="submit" style={{ width: '100%', padding: '16px', background: `linear-gradient(135deg,${cyan},#0e7490)`, color: 'white', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: `0 6px 20px rgba(8,145,178,0.3)` }}>
              Save Room
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Room Listing ──
  return (
    <RoomListView
      onBack={() => navigate('/admin-dashboard')}
      onAddRoom={() => setView('add')}
    />
  );
}
