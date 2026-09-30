import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const cyan = '#0891b2';

const CONTACTS = [
  { id: 'admin', name: 'Admin (You)', role: 'admin', avatar: '👑', color: '#0891b2', initials: 'AD' },
  { id: 'e1', name: 'Rohit Sharma',  role: 'enquiry', source: 'WhatsApp', phone: '9876543210', initials: 'RS', color: '#ec4899', isPinned: true, reminder: 'Reconnect Today 5:00 PM' },
  { id: 'e2', name: 'Priya Mehta',   role: 'enquiry', source: 'NoBroker', phone: '9123456789', initials: 'PM', color: '#8b5cf6' },
  { id: 'e3', name: 'Arun Verma',    role: 'enquiry', source: 'MagicBricks', phone: '9012345678', initials: 'AV', color: '#10b981' },
  { id: 'e4', name: 'Kavya Singh',   role: 'enquiry', source: 'Instagram', phone: '9444556677', initials: 'KS', color: '#f59e0b' },
  { id: 'e5', name: 'Deepak Rathi',  role: 'enquiry', source: 'Walk-in', phone: '9777888001', initials: 'DR', color: '#06b6d4' },
  { id: 'u1', name: 'Arjun Mehta',   role: 'student', room: '101', initials: 'AM', color: '#6366f1' },
  { id: 'u2', name: 'Priya Sharma',  role: 'student', room: '202', initials: 'PS', color: '#f43f5e' },
  { id: 'u3', name: 'Ravi Kumar',    role: 'student', room: '305', initials: 'RK', color: '#10b981' },
  { id: 'u4', name: 'Sneha Kapoor',  role: 'student', room: '108', initials: 'SK', color: '#f59e0b' },
  { id: 's1', name: 'Ramesh Yadav',  role: 'staff', dept: 'Cook',    initials: 'RY', color: '#8b5cf6' },
  { id: 's2', name: 'Mohan Das',     role: 'staff', dept: 'Cleaner', initials: 'MD', color: '#06b6d4' },
  { id: 's3', name: 'Vikram Sharma', role: 'staff', dept: 'Manager', initials: 'VS', color: '#64748b' },
  { id: 's4', name: 'Dinesh Patel',  role: 'staff', dept: 'Plumber', initials: 'DP', color: '#dc2626' },
];

const INITIAL_MESSAGES = {
  e1: [
    { id: 1, from: 'e1',   type: 'text', text: 'Hi, looking for a single room with AC. Budget around ₹10,000.', time: '11:20 AM', date: '2026-07-22' },
    { id: 2, from: 'admin',type: 'text', text: 'Yes, Room 201 single AC is available at ₹10,000/month.', time: '11:25 AM', date: '2026-07-22' },
    { id: 3, from: 'e1',   type: 'text', text: 'Great! Please call me at 5 PM to discuss deposit.', time: '11:30 AM', date: '2026-07-22' },
  ],
  e2: [
    { id: 1, from: 'e2',   type: 'text', text: 'Do you have double sharing available near metro station?', time: '02:00 PM', date: '2026-07-21' },
    { id: 2, from: 'admin',type: 'text', text: 'Yes double sharing is available on 2nd floor, 2 mins from Metro.', time: '02:05 PM', date: '2026-07-21' },
  ],
  e3: [
    { id: 1, from: 'e3',   type: 'text', text: 'What is the security deposit for triple sharing?', time: '04:15 PM', date: '2026-07-20' },
    { id: 2, from: 'admin',type: 'text', text: 'Security deposit is 1 month rent (refundable).', time: '04:20 PM', date: '2026-07-20' },
  ],
  e4: [
    { id: 1, from: 'e4',   type: 'text', text: 'Need a working girls PG with food. Any availability?', time: '10:00 AM', date: '2026-07-22' },
    { id: 2, from: 'admin',type: 'text', text: 'Hi Kavya! Yes 2 beds available in Girls Wing with 3 meals daily.', time: '10:10 AM', date: '2026-07-22' },
  ],
  e5: [
    { id: 1, from: 'e5',   type: 'text', text: 'Looking for long stay of 12 months. Any discount?', time: '01:30 PM', date: '2026-07-21' },
    { id: 2, from: 'admin',type: 'text', text: 'We offer 5% flat discount for 1 year upfront stay.', time: '01:45 PM', date: '2026-07-21' },
  ],
  u1: [
    { id: 1, from: 'u1',   type: 'text', text: 'Hello admin, my room heater is not working.', time: '10:05 AM', date: '2026-07-18' },
    { id: 2, from: 'admin',type: 'text', text: "I'll send the electrician today. Please be available after 3 PM.", time: '10:12 AM', date: '2026-07-18' },
    { id: 3, from: 'u1',   type: 'text', text: 'Sure, thank you!', time: '10:13 AM', date: '2026-07-18' },
  ],
  u2: [
    { id: 1, from: 'u2',   type: 'text', text: 'Sir, when is the rent due this month?', time: '09:30 AM', date: '2026-07-17' },
    { id: 2, from: 'admin',type: 'text', text: '5th of every month. You have ₹2,500 pending.', time: '09:35 AM', date: '2026-07-17' },
  ],
  s1: [
    { id: 1, from: 's1',   type: 'text', text: 'Breakfast is ready sir. Poha + Chai today.', time: '08:00 AM', date: '2026-07-18' },
    { id: 2, from: 'admin',type: 'text', text: 'Great, noted. Please add less oil tomorrow.', time: '08:15 AM', date: '2026-07-18' },
    { id: 3, from: 's1',   type: 'image', url: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=300&fit=crop', text: 'Today\'s breakfast', time: '08:20 AM', date: '2026-07-18' },
  ],
  s2: [
    { id: 1, from: 'admin',type: 'text', text: 'Mohan, please clean Room 203 today extra.', time: '09:00 AM', date: '2026-07-18' },
    { id: 2, from: 's2',   type: 'text', text: 'Yes sir, will do it by 11 AM.', time: '09:05 AM', date: '2026-07-18' },
  ],
  u3: [], u4: [], s3: [], s4: [],
};

const STAFF_STUDENT_CONVERSATIONS = [
  {
    id: 'c_s1_u1',
    staff: { id: 's1', name: 'Ramesh Yadav', role: 'Cook' },
    student: { id: 'u1', name: 'Arjun Mehta', room: '101' },
    messages: [
      { id: 1, from: 'Arjun Mehta (Student)', text: 'Bhaiya, please pack my lunch today, I have exam at 12 PM.', time: '08:30 AM', date: '2026-07-22' },
      { id: 2, from: 'Ramesh Yadav (Cook)', text: 'Okay Arjun, tiffin will be packed by 11:30 AM at gate.', time: '08:35 AM', date: '2026-07-22' },
    ]
  },
  {
    id: 'c_s2_u2',
    staff: { id: 's2', name: 'Mohan Das', role: 'Cleaner' },
    student: { id: 'u2', name: 'Priya Sharma', room: '202' },
    messages: [
      { id: 1, from: 'Priya Sharma (Student)', text: 'Bhaiya, please clean bathroom today around 2 PM.', time: '10:00 AM', date: '2026-07-22' },
      { id: 2, from: 'Mohan Das (Cleaner)', text: 'Ji didi, I will come at 2:15 PM.', time: '10:10 AM', date: '2026-07-22' },
    ]
  }
];

const GROUP_MESSAGES = {
  broadcast: [
    { id: 1, from: 'admin', type: 'text', text: 'Reminder: Rent is due by 5th. Please pay on time.', time: '10:00 AM', date: '2026-07-18' },
    { id: 2, from: 'u1',   type: 'text', text: "I'll pay today!", time: '10:05 AM', date: '2026-07-18' },
  ],
  staff_group: [
    { id: 1, from: 'admin', type: 'text', text: 'All staff meeting at 6 PM today in common area.', time: '08:30 AM', date: '2026-07-18' },
    { id: 2, from: 's1',   type: 'text', text: 'Noted sir.', time: '08:35 AM', date: '2026-07-18' },
    { id: 3, from: 's3',   type: 'text', text: 'Will be there.', time: '08:40 AM', date: '2026-07-18' },
  ],
};

const GROUPS = [
  { id: 'broadcast',   name: 'All Residents', icon: 'campaign', color: '#0891b2', desc: 'Announcements to all' },
  { id: 'staff_group', name: 'Staff Group',   icon: 'groups',   color: '#8b5cf6', desc: 'All staff members' },
];

// ─── Message bubble renderer ────────────────────────────────────────
function MessageBubble({ msg, isMe }) {
  const [imgOpen, setImgOpen] = useState(false);
  const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  if (msg.type === 'image') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
        <div onClick={() => setImgOpen(true)} style={{ cursor: 'pointer', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px', overflow: 'hidden', maxWidth: 220, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
          <img src={msg.url} alt={msg.text || 'Image'} style={{ width: '100%', display: 'block', maxHeight: 200, objectFit: 'cover' }} />
          {msg.text && <div style={{ background: isMe ? cyan : 'white', padding: '6px 10px', fontSize: 12, color: isMe ? 'white' : '#475569' }}>{msg.text}</div>}
        </div>
        <p style={{ margin: '3px 4px 0', fontSize: 10, color: '#94a3b8' }}>{msg.time}</p>
        {imgOpen && (
          <div onClick={() => setImgOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={msg.url} alt="" style={{ maxWidth: '90%', maxHeight: '85vh', borderRadius: 12 }} />
          </div>
        )}
      </div>
    );
  }

  if (msg.type === 'video') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
        <div style={{ borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px', overflow: 'hidden', maxWidth: 240, background: '#1e293b', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
          <video src={msg.url} controls style={{ width: '100%', display: 'block', maxHeight: 180 }} />
          {msg.text && <div style={{ padding: '6px 10px', fontSize: 12, color: 'white' }}>{msg.text}</div>}
        </div>
        <p style={{ margin: '3px 4px 0', fontSize: 10, color: '#94a3b8' }}>{msg.time}</p>
      </div>
    );
  }

  if (msg.type === 'file') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
        <a href={msg.url || '#'} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
          <div style={{ background: isMe ? cyan : 'white', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', maxWidth: 240 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: isMe ? 'rgba(255,255,255,0.2)' : '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: isMe ? 'white' : cyan }}>description</span>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: isMe ? 'white' : '#0f172a' }}>{msg.fileName || 'Document'}</p>
              <p style={{ margin: 0, fontSize: 11, color: isMe ? 'rgba(255,255,255,0.7)' : '#64748b' }}>{msg.fileSize || 'File'}</p>
            </div>
          </div>
        </a>
        <p style={{ margin: '3px 4px 0', fontSize: 10, color: '#94a3b8' }}>{msg.time}</p>
      </div>
    );
  }

  if (msg.type === 'location') {
    const mapUrl = `https://www.google.com/maps?q=${msg.lat},${msg.lng}`;
    const staticMap = `https://maps.googleapis.com/maps/api/staticmap?center=${msg.lat},${msg.lng}&zoom=15&size=300x160&markers=${msg.lat},${msg.lng}&key=DEMO`;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
        <a href={mapUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
          <div style={{ borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px', overflow: 'hidden', width: 220, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
            {/* Placeholder map tile */}
            <div style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)', height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg,rgba(0,0,0,0.04) 0px,rgba(0,0,0,0.04) 1px,transparent 1px,transparent 24px), repeating-linear-gradient(90deg,rgba(0,0,0,0.04) 0px,rgba(0,0,0,0.04) 1px,transparent 1px,transparent 24px)' }} />
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#ef4444', border: '3px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', position: 'relative', zIndex: 1 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'white' }}>location_on</span>
              </div>
            </div>
            <div style={{ background: isMe ? cyan : 'white', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: isMe ? 'white' : cyan }}>location_on</span>
              <div>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: isMe ? 'white' : '#0f172a' }}>{msg.label || 'Location'}</p>
                <p style={{ margin: 0, fontSize: 10, color: isMe ? 'rgba(255,255,255,0.7)' : '#64748b' }}>Tap to open in Maps</p>
              </div>
            </div>
          </div>
        </a>
        <p style={{ margin: '3px 4px 0', fontSize: 10, color: '#94a3b8' }}>{msg.time}</p>
      </div>
    );
  }

  // Default text
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
      <div style={{ background: isMe ? cyan : 'white', color: isMe ? 'white' : '#0f172a', padding: '10px 14px', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px', fontSize: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', maxWidth: 280 }}>
        {msg.text}
      </div>
      <p style={{ margin: '3px 4px 0', fontSize: 10, color: '#94a3b8' }}>{msg.time}</p>
    </div>
  );
}

// ─── Attachment Menu ────────────────────────────────────────────────
function AttachMenu({ onSendImage, onSendVideo, onSendFile, onSendLocation, onClose }) {
  const imgRef   = useRef(null);
  const videoRef = useRef(null);
  const fileRef  = useRef(null);

  const ITEMS = [
    { icon: 'photo_camera',  label: 'Photo',    color: '#0891b2', bg: '#ecfeff',  action: () => imgRef.current?.click() },
    { icon: 'videocam',      label: 'Video',    color: '#8b5cf6', bg: '#f5f3ff',  action: () => videoRef.current?.click() },
    { icon: 'attach_file',   label: 'File',     color: '#f59e0b', bg: '#fffbeb',  action: () => fileRef.current?.click() },
    { icon: 'location_on',   label: 'Location', color: '#10b981', bg: '#ecfdf5',  action: onSendLocation },
  ];

  const handleImg = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onSendImage(url, file.name);
    onClose();
  };

  const handleVideo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onSendVideo(url, file.name);
    onClose();
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const size = file.size < 1024 * 1024
      ? `${(file.size / 1024).toFixed(1)} KB`
      : `${(file.size / 1024 / 1024).toFixed(1)} MB`;
    onSendFile(url, file.name, size);
    onClose();
  };

  return (
    <>
      {/* hidden inputs */}
      <input ref={imgRef}   type="file" accept="image/*"         style={{ display: 'none' }} onChange={handleImg} />
      <input ref={videoRef} type="file" accept="video/*"         style={{ display: 'none' }} onChange={handleVideo} />
      <input ref={fileRef}  type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip" style={{ display: 'none' }} onChange={handleFile} />

      {/* slide-up panel */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} onClick={onClose} />
      <div style={{ position: 'fixed', bottom: 68, left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 32px)', maxWidth: 448, background: 'white', borderRadius: 20, padding: 16, boxShadow: '0 -4px 32px rgba(0,0,0,0.12)', zIndex: 60, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
        {ITEMS.map(it => (
          <button key={it.label} onClick={() => { it.action(); }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: it.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 26, color: it.color }}>{it.icon}</span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', fontFamily: "'Hanken Grotesk', sans-serif" }}>{it.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}

// ─── Chat Input Bar ─────────────────────────────────────────────────
function ChatInputBar({ inputText, setInputText, onSend, onSendImage, onSendVideo, onSendFile, onSendLocation }) {
  const [showAttach, setShowAttach] = useState(false);

  return (
    <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: 'white', borderTop: '1px solid #e2e8f0', padding: '8px 12px', boxSizing: 'border-box', zIndex: 40 }}>
      {showAttach && (
        <AttachMenu
          onSendImage={onSendImage}
          onSendVideo={onSendVideo}
          onSendFile={onSendFile}
          onSendLocation={() => { onSendLocation(); setShowAttach(false); }}
          onClose={() => setShowAttach(false)}
        />
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={() => setShowAttach(v => !v)}
          style={{ width: 40, height: 40, borderRadius: '50%', background: showAttach ? cyan : '#f1f5f9', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 22, color: showAttach ? 'white' : '#64748b' }}>
            {showAttach ? 'close' : 'attach_file'}
          </span>
        </button>
        <input
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onSend()}
          placeholder="Type a message..."
          style={{ flex: 1, padding: '10px 16px', borderRadius: 24, border: '1.5px solid #e2e8f0', outline: 'none', fontSize: 14, background: '#f8fafc', fontFamily: 'inherit' }}
        />
        <button onClick={onSend}
          style={{ width: 42, height: 42, borderRadius: '50%', background: cyan, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(8,145,178,0.3)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'white' }}>send</span>
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function Chat() {
  const navigate = useNavigate();
  const location = useLocation();
  const [view, setView] = useState('list'); // 'list' | 'chat' | 'group_chat' | 'monitor_list' | 'monitor_chat'
  const [contacts, setContacts] = useState(CONTACTS);
  const [activeContact, setActiveContact] = useState(null);
  const [activeGroup, setActiveGroup] = useState(null);
  const [activeMonitorConv, setActiveMonitorConv] = useState(null);
  
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [groupMessages, setGroupMessages] = useState(GROUP_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [filter, setFilter] = useState('enquiry'); // 'enquiry' | 'student' | 'staff'
  const [search, setSearch] = useState('');

  // Auto-open contact passed via location state (e.g. from /enquiry)
  useEffect(() => {
    if (location.state && (location.state.contactId || location.state.name)) {
      const match = contacts.find(c => 
        (location.state.contactId && c.id === location.state.contactId) ||
        (location.state.name && c.name.toLowerCase() === location.state.name.toLowerCase())
      );
      if (match) {
        setActiveContact(match);
        setView('chat');
      }
    }
  }, [location.state, contacts]);

  // Reminder modal state
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderTarget, setReminderTarget] = useState(null);
  const [reminderDate, setReminderDate] = useState(new Date().toISOString().split('T')[0]);
  const [reminderTime, setReminderTime] = useState('17:00');
  const [reminderReason, setReminderReason] = useState('');

  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, groupMessages, activeContact, activeGroup, activeMonitorConv]);

  const now = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const today = () => new Date().toISOString().split('T')[0];

  const pushMsg = (msg) => {
    if (activeGroup) {
      setGroupMessages(prev => ({ ...prev, [activeGroup.id]: [...(prev[activeGroup.id] || []), msg] }));
    } else if (activeContact) {
      setMessages(prev => ({ ...prev, [activeContact.id]: [...(prev[activeContact.id] || []), msg] }));
    }
  };

  const sendMessage = () => {
    if (!inputText.trim()) return;
    pushMsg({ id: Date.now(), from: 'admin', type: 'text', text: inputText.trim(), time: now(), date: today() });
    setInputText('');
  };

  const sendImage = (url, name) => {
    pushMsg({ id: Date.now(), from: 'admin', type: 'image', url, text: name, time: now(), date: today() });
  };

  const sendVideo = (url, name) => {
    pushMsg({ id: Date.now(), from: 'admin', type: 'video', url, text: name, time: now(), date: today() });
  };

  const sendFile = (url, fileName, fileSize) => {
    pushMsg({ id: Date.now(), from: 'admin', type: 'file', url, fileName, fileSize, time: now(), date: today() });
  };

  const sendLocation = () => {
    if (!navigator.geolocation) {
      pushMsg({ id: Date.now(), from: 'admin', type: 'location', lat: 28.6139, lng: 77.2090, label: 'Current Location', time: now(), date: today() });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        pushMsg({ id: Date.now(), from: 'admin', type: 'location', lat: pos.coords.latitude, lng: pos.coords.longitude, label: 'My Location', time: now(), date: today() });
      },
      () => {
        pushMsg({ id: Date.now(), from: 'admin', type: 'location', lat: 28.6139, lng: 77.2090, label: 'PG Location (Demo)', time: now(), date: today() });
      }
    );
  };

  const openReminderModal = (target) => {
    setReminderTarget(target);
    setActiveContact(target);
    setView('chat');
    if (target.reminder) {
      setReminderReason(target.reminder);
    } else {
      setReminderReason('');
    }
    setShowReminderModal(true);
  };

  const handleSetReminder = (e) => {
    e.preventDefault();
    if (!reminderTarget) return;
    const reminderStr = `${reminderReason ? `${reminderReason} — ` : ''}${reminderDate} ${reminderTime}`;
    setContacts(prev => prev.map(c => c.id === reminderTarget.id ? { ...c, isPinned: true, reminder: reminderStr } : c));
    setActiveContact({ ...reminderTarget, isPinned: true, reminder: reminderStr });
    setView('chat');
    setShowReminderModal(false);
    setReminderReason('');
  };

  const handleClearReminder = (id) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, isPinned: false, reminder: null } : c));
    if (activeContact && activeContact.id === id) {
      setActiveContact(prev => ({ ...prev, isPinned: false, reminder: null }));
    }
  };

  const renderReminderModal = () => {
    if (!showReminderModal || !reminderTarget) return null;
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ width: '100%', maxWidth: 420, background: 'white', borderRadius: 20, padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>Set Reconnect Reminder</h3>
              <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>Target: <b>{reminderTarget.name}</b> ({reminderTarget.phone || 'Contact'})</p>
            </div>
            <button onClick={() => setShowReminderModal(false)} style={{ background: 'none', border: 'none', fontSize: 24, color: '#64748b', cursor: 'pointer', padding: 0 }}>&times;</button>
          </div>

          <form onSubmit={handleSetReminder} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Date *</label>
                <input required type="date" value={reminderDate} onChange={e => setReminderDate(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Time *</label>
                <input required type="time" value={reminderTime} onChange={e => setReminderTime(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Reason / Note for Reconnect</label>
              <input type="text" placeholder="e.g. Call back for AC room availability & advance payment" value={reminderReason} onChange={e => setReminderReason(e.target.value)} style={{ width: '100%', padding: '12px 14px', border: '1px solid #cbd5e1', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { label: 'In 2 Hours', time: '19:00', reason: 'Quick Call Back' },
                { label: 'Today 5 PM', time: '17:00', reason: 'Confirm Room Booking' },
                { label: 'Tomorrow 10 AM', dateOffset: 1, time: '10:00', reason: 'Follow Up Visit' },
              ].map(preset => (
                <button type="button" key={preset.label} onClick={() => {
                  if (preset.dateOffset) {
                    const d = new Date(); d.setDate(d.getDate() + preset.dateOffset);
                    setReminderDate(d.toISOString().split('T')[0]);
                  }
                  setReminderTime(preset.time);
                  setReminderReason(preset.reason);
                }} style={{ padding: '6px 10px', background: '#ecfeff', border: `1px solid ${cyan}`, borderRadius: 8, fontSize: 12, color: cyan, fontWeight: 700, cursor: 'pointer' }}>
                  {preset.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button type="button" onClick={() => setShowReminderModal(false)} style={{ flex: 1, padding: 12, background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button type="submit" style={{ flex: 1, padding: 12, background: cyan, color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Set & Pin to Top ⏰</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const getLastMsg = (contactId) => {
    const msgs = messages[contactId] || [];
    return msgs[msgs.length - 1];
  };

  const lastMsgPreview = (msg) => {
    if (!msg) return 'No messages yet';
    const prefix = msg.from === 'admin' ? 'You: ' : '';
    if (msg.type === 'image')    return prefix + '📷 Photo';
    if (msg.type === 'video')    return prefix + '🎥 Video';
    if (msg.type === 'file')     return prefix + `📎 ${msg.fileName || 'File'}`;
    if (msg.type === 'location') return prefix + '📍 Location';
    return prefix + msg.text;
  };

  // Sort contacts so pinned/reminder chats appear in UPPER section!
  const filteredContacts = contacts.filter(c => {
    if (c.id === 'admin') return false;
    if (filter === 'enquiry' && c.role !== 'enquiry') return false;
    if (filter === 'student' && c.role !== 'student') return false;
    if (filter === 'staff'   && c.role !== 'staff')   return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));

  const getContact = (id) => contacts.find(c => c.id === id);

  // ── Admin Monitoring Chat View ────────────────────────────────────
  if (view === 'monitor_chat' && activeMonitorConv) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk',sans-serif", display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '0 16px', height: 64, display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 20 }}>
          <button onClick={() => setView('monitor_list')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: cyan }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>arrow_back_ios_new</span>
          </button>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: '#0f172a' }}>{activeMonitorConv.staff.name} ↔ {activeMonitorConv.student.name}</p>
            <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>{activeMonitorConv.staff.role} · Room {activeMonitorConv.student.room}</p>
          </div>
          <span style={{ background: '#fef3c7', color: '#d97706', fontSize: 11, fontWeight: 800, padding: '4px 8px', borderRadius: 8, border: '1px solid #fde68a' }}>
            👁️ Read Only
          </span>
        </div>

        {/* Read-Only Notice Banner */}
        <div style={{ background: '#fffbeb', borderBottom: '1px solid #fde68a', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#d97706' }}>visibility</span>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#92400e', margin: 0 }}>Admin Monitoring Mode: You are viewing this chat in read-only mode and cannot send messages.</p>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {activeMonitorConv.messages.map(m => (
            <div key={m.id} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: m.from.includes('Cook') || m.from.includes('Cleaner') ? '#8b5cf6' : '#6366f1' }}>{m.from}</span>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{m.time} · {m.date}</span>
              </div>
              <p style={{ fontSize: 14, color: '#0f172a', margin: 0, lineHeight: 1.5 }}>{m.text}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Admin Monitoring List View ────────────────────────────────────
  if (view === 'monitor_list') {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 40 }}>
        <div style={{ background: 'linear-gradient(135deg, #0c1a2e, #0f2847)', padding: '0 16px 16px', color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, height: 64 }}>
            <button onClick={() => setView('list')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back_ios_new</span>
            </button>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Staff ↔ Student Conversations</h2>
              <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>Admin Monitoring (Read-Only Mode)</p>
            </div>
          </div>
        </div>

        <div style={{ padding: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {STAFF_STUDENT_CONVERSATIONS.map(conv => (
              <div key={conv.id} onClick={() => { setActiveMonitorConv(conv); setView('monitor_chat'); }}
                   style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 16, padding: 16, cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{conv.staff.name} ({conv.staff.role})</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: cyan }}>Room {conv.student.room}</span>
                </div>
                <p style={{ fontSize: 13, color: '#475569', margin: '0 0 8px' }}>Student: <b>{conv.student.name}</b></p>
                <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: 8, fontSize: 12, color: '#64748b' }}>
                  💬 Last msg: "{conv.messages[conv.messages.length - 1]?.text}"
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Individual Chat View ──────────────────────────────────────────
  if (view === 'chat' && activeContact) {
    const msgs = messages[activeContact.id] || [];
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk',sans-serif", display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '0 16px', height: 64, display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 20 }}>
          <button onClick={() => { setView('list'); setActiveContact(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: cyan }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>arrow_back_ios_new</span>
          </button>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: activeContact.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14 }}>{activeContact.initials}</div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{activeContact.name}</p>
            <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>{activeContact.role === 'student' ? `Room ${activeContact.room}` : activeContact.role === 'enquiry' ? activeContact.source : activeContact.dept}</p>
          </div>
          
          <button onClick={() => openReminderModal(activeContact)} style={{ background: activeContact.reminder ? '#fef3c7' : '#ecfeff', border: `1px solid ${activeContact.reminder ? '#fde68a' : cyan}`, borderRadius: 10, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: activeContact.reminder ? '#b45309' : cyan, fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>alarm</span>
            {activeContact.reminder ? 'Edit Reminder' : 'Reminder'}
          </button>

          <a href={`tel:+91${activeContact.phone || '9999999999'}`} style={{ background: '#ecfeff', border: 'none', borderRadius: 10, padding: 8, cursor: 'pointer', display: 'flex', color: cyan, textDecoration: 'none' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>call</span>
          </a>
        </div>

        {/* Reconnect Reminder Bar if active */}
        {activeContact.reminder && (
          <div style={{ background: '#fef3c7', borderBottom: '1px solid #fde68a', padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }} onClick={() => openReminderModal(activeContact)}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#d97706' }}>alarm_on</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#92400e' }}>Reminder: {activeContact.reminder}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => openReminderModal(activeContact)} style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#b45309', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>Edit</button>
              <button onClick={() => handleClearReminder(activeContact.id)} style={{ background: 'none', border: 'none', color: '#d97706', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>Clear</button>
            </div>
          </div>
        )}

        {/* Messages */}
        <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 80 }}>
          {msgs.length === 0 && (
            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 14, marginTop: 60 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#e2e8f0' }}>chat</span>
              <p>No messages yet. Say hello!</p>
            </div>
          )}
          {msgs.map(msg => (
            <div key={msg.id} style={{ display: 'flex', justifyContent: msg.from === 'admin' ? 'flex-end' : 'flex-start' }}>
              <MessageBubble msg={msg} isMe={msg.from === 'admin'} />
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <ChatInputBar
          inputText={inputText} setInputText={setInputText}
          onSend={sendMessage}
          onSendImage={sendImage} onSendVideo={sendVideo}
          onSendFile={sendFile} onSendLocation={sendLocation}
        />

        {renderReminderModal()}
      </div>
    );
  }

  // ── Group Chat View ───────────────────────────────────────────────
  if (view === 'group_chat' && activeGroup) {
    const msgs = groupMessages[activeGroup.id] || [];
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk',sans-serif", display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '0 16px', height: 64, display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 20 }}>
          <button onClick={() => { setView('list'); setActiveGroup(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: cyan }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>arrow_back_ios_new</span>
          </button>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: activeGroup.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22, color: 'white' }}>{activeGroup.icon}</span>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{activeGroup.name}</p>
            <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>{activeGroup.desc}</p>
          </div>
        </div>

        <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 80 }}>
          {msgs.map(msg => {
            const isMe = msg.from === 'admin';
            const sender = getContact(msg.from);
            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', gap: 8, alignItems: 'flex-end' }}>
                {!isMe && sender && (
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: sender.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{sender.initials}</div>
                )}
                <div style={{ maxWidth: '70%' }}>
                  {!isMe && sender && <p style={{ margin: '0 0 2px 2px', fontSize: 11, color: '#64748b', fontWeight: 600 }}>{sender.name}</p>}
                  <MessageBubble msg={msg} isMe={isMe} />
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <ChatInputBar
          inputText={inputText} setInputText={setInputText}
          onSend={sendMessage}
          onSendImage={sendImage} onSendVideo={sendVideo}
          onSendFile={sendFile} onSendLocation={sendLocation}
        />

        {renderReminderModal()}
      </div>
    );
  }

  // ── Contact List ──────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0c1a2e, #0f2847)', padding: '0 16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, height: 64 }}>
          <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back_ios_new</span>
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'white' }}>Messages</h1>
            <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>Enquiries · Reminders · Admin Monitoring</p>
          </div>
          <button onClick={() => setView('monitor_list')} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: 10, padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#38bdf8' }}>visibility</span>
            Monitor
          </button>
        </div>
        <div style={{ position: 'relative' }}>
          <span className="material-symbols-outlined" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: '#64748b' }}>search</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search people or leads..."
            style={{ width: '100%', padding: '10px 12px 10px 40px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.08)', color: 'white', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {/* Groups */}
        <p style={{ fontSize: 12, fontWeight: 800, color: '#64748b', letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 10px' }}>Group Chats</p>
        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          {GROUPS.map(g => (
            <button key={g.id} onClick={() => { setActiveGroup(g); setView('group_chat'); }}
              style={{ flex: 1, background: 'white', border: '1px solid #e2e8f0', borderRadius: 16, padding: 14, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: g.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22, color: 'white' }}>{g.icon}</span>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{g.name}</p>
                <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>{g.desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Filter tabs: Enquiries, Students, Staff */}
        <div style={{ display: 'flex', background: 'white', borderRadius: 12, padding: 4, marginBottom: 14, border: '1px solid #e2e8f0' }}>
          {['enquiry', 'student', 'staff'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ flex: 1, padding: '8px 0', border: 'none', borderRadius: 9, background: filter === f ? cyan : 'transparent', color: filter === f ? 'white' : '#64748b', fontSize: 13, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.2s', fontFamily: 'inherit' }}>
              {f === 'enquiry' ? 'Enquiries' : f === 'student' ? 'Students' : 'Staff'}
            </button>
          ))}
        </div>

        {/* Contact list with UPPER SECTION PINNING for Reminders */}
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {filteredContacts.map((contact, i) => {
            const lastMsg = getLastMsg(contact.id);
            return (
              <div key={contact.id} onClick={() => { setActiveContact(contact); setView('chat'); }}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer', borderBottom: i < filteredContacts.length - 1 ? '1px solid #f1f5f9' : 'none', background: contact.isPinned ? '#fffbeb' : 'white', transition: 'background 0.15s' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: contact.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>{contact.initials}</div>
                  {contact.isPinned && (
                    <div style={{ position: 'absolute', top: -2, right: -2, width: 18, height: 18, background: '#f59e0b', borderRadius: '50%', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 11, color: 'white' }}>alarm</span>
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{contact.name}</p>
                      {contact.isPinned && <span style={{ fontSize: 10, background: '#fef3c7', color: '#b45309', padding: '1px 6px', borderRadius: 4, fontWeight: 800 }}>📌 Remind</span>}
                    </div>
                    {lastMsg && <span style={{ fontSize: 10, color: '#94a3b8' }}>{lastMsg.time}</span>}
                  </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                      <p style={{ margin: 0, fontSize: 12, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                        {contact.reminder ? `⏰ ${contact.reminder}` : lastMsgPreview(lastMsg)}
                      </p>
                      <span style={{ fontSize: 11, color: contact.role === 'enquiry' ? '#ec4899' : contact.role === 'student' ? '#6366f1' : '#8b5cf6', background: contact.role === 'enquiry' ? '#fce7f3' : contact.role === 'student' ? '#eef2ff' : '#f5f3ff', padding: '2px 7px', borderRadius: 6, fontWeight: 600 }}>
                        {contact.role === 'enquiry' ? 'Enquiry' : contact.role === 'student' ? `Rm ${contact.room}` : contact.dept}
                      </span>
                    </div>
                </div>
              </div>
            );
          })}
          {filteredContacts.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>No contacts found in this category.</div>
          )}
        </div>
      </div>

      {/* Set Reconnect Reminder Modal */}
      {renderReminderModal()}
    </div>
  );
}
