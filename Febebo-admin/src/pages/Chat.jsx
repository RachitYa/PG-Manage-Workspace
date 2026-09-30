import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, doc, setDoc, addDoc, serverTimestamp, getDocs, updateDoc, getDoc } from 'firebase/firestore';

const cyan = '#0891b2';

// ─── Attach Menu ────────────────────────────────────────────────────
function AttachMenu({ onSendImage, onClose }) {
  const imgRef = useRef(null);

  const handleFile = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (type === 'image') onSendImage(url, file.name);
    onClose();
  };

  const ITEMS = [
    { icon: 'photo_camera',  label: 'Photo',    color: '#0891b2', bg: '#ecfeff',  action: () => imgRef.current?.click() },
  ];

  return (
    <div style={{ position: 'absolute', bottom: 64, left: 16, background: 'white', borderRadius: 16, padding: 16, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)', display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: 16, zIndex: 50 }}>
      {ITEMS.map(it => (
        <div key={it.label} onClick={it.action} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: it.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ color: it.color, fontSize: 24 }}>{it.icon}</span>
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>{it.label}</span>
        </div>
      ))}
      <input type="file" ref={imgRef} accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e, 'image')} />
    </div>
  );
}

// ─── Message bubble renderer ────────────────────────────────────────
function MessageBubble({ msg, isMe }) {
  const [imgOpen, setImgOpen] = useState(false);

  if (msg.type === 'admission_summary') {
    const sum = msg.summaryData || {};
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
        <div style={{ background: isMe ? cyan : 'white', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px', padding: '16px', maxWidth: '85%', color: isMe ? 'white' : '#0f172a', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: isMe ? 'none' : '1px solid #e2e8f0' }}>
          <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:12, borderBottom: isMe ? '1px dashed rgba(255,255,255,0.3)' : '1px dashed #cbd5e1', paddingBottom: 10}}>
             <span className="material-symbols-outlined" style={{fontSize:20, color: isMe?'#cffafe':cyan}}>check_circle</span>
             <strong style={{fontSize:15}}>Admission Form Submitted</strong>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}><span>Room:</span> <strong>{sum.seater} Seater</strong></div>
             <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}><span>Rent:</span> <strong>₹{sum.rent}</strong></div>
             <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}><span>Security:</span> <strong>₹{sum.security}</strong></div>
             <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}><span>Plan:</span> <strong>{sum.paymentMode}</strong></div>
             {sum.paymentMode === 'Token Only' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, color: isMe ? '#fde047' : '#d97706' }}><span>Remaining:</span> <strong>₹{sum.remainingAmount}</strong></div>
             )}
             <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}><span>Paid Now:</span> <strong>₹{sum.amountPaid}</strong></div>
             <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}><span>Method:</span> <strong>{sum.method}</strong></div>
             <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}><span>Received By:</span> <strong>{sum.receivedBy}</strong></div>
          </div>

          {sum.screenshot && (
             <div style={{ marginTop: 12, borderTop: isMe ? '1px dashed rgba(255,255,255,0.3)' : '1px dashed #cbd5e1', paddingTop: 12 }}>
                <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600 }}>Payment Screenshot:</p>
                <img src={sum.screenshot} alt="Screenshot" style={{ width: '100%', borderRadius: 8, cursor: 'pointer' }} onClick={() => setImgOpen(true)} />
             </div>
          )}
        </div>
        <p style={{ margin: '3px 4px 0', fontSize: 10, color: '#94a3b8' }}>{msg.time}</p>
        
        {imgOpen && sum.screenshot && (
          <div onClick={() => setImgOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
             <img src={sum.screenshot} alt="Full Screenshot" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 12 }} />
          </div>
        )}
      </div>
    );
  }

  if (msg.type === 'food_menu') {
    const menu = msg.foodMenu || {};
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const meals = ['Breakfast', 'Lunch', 'Snacks', 'Dinner'];
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px', padding: 16, minWidth: 260, maxWidth: '85%' }}>
          <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
            <span>🍽️</span> Weekly Food Menu
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {days.filter(d => menu[d]).map(day => (
              <div key={day} style={{ background: 'white', border: '1px solid #f1f5f9', borderRadius: 8, padding: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#334155', marginBottom: 4 }}>{day}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {meals.filter(m => menu[day][m]).map(meal => (
                    <div key={meal} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>{meal}:</span>
                      <span style={{ color: '#0f172a', textAlign: 'right', flex: 1, marginLeft: 8 }}>{menu[day][meal]}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {Object.keys(menu).length === 0 && (
               <div style={{ fontSize: 12, color: '#64748b', textAlign: 'center' }}>No food menu configured.</div>
            )}
          </div>
        </div>
        <p style={{ margin: '3px 4px 0', fontSize: 10, color: '#94a3b8' }}>{msg.time}</p>
      </div>
    );
  }

  if (msg.type === 'package') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
        <div style={{ background: isMe ? cyan : 'white', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px', padding: '14px', maxWidth: '80%', color: isMe ? 'white' : '#0f172a', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: isMe ? 'none' : '1px solid #e2e8f0' }}>
          <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:8}}>
             <span className="material-symbols-outlined" style={{fontSize:20, color: isMe?'#cffafe':cyan}}>receipt_long</span>
             <strong style={{fontSize:14}}>Registration Package</strong>
          </div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.4 }}>{msg.text}</p>
          <div style={{background: isMe ? 'rgba(255,255,255,0.2)' : '#f8fafc', padding: '10px', borderRadius: 8, marginTop: 12}}>
             <p style={{margin:0, fontSize:11, fontWeight:600}}>Includes custom pricing for {msg.packageData?.rents?.length || 0} room types.</p>
             <p style={{margin:'4px 0 0', fontSize:11, fontWeight:600}}>Security Deposit: ₹{msg.packageData?.securityAmount || 0}</p>
          </div>
        </div>
        <p style={{ margin: '3px 4px 0', fontSize: 10, color: '#94a3b8' }}>{msg.time}</p>
      </div>
    );
  }

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
      <div style={{
        background: isMe ? cyan : 'white',
        color: isMe ? 'white' : '#0f172a',
        padding: '10px 14px',
        borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        maxWidth: '85%',
        fontSize: 14,
        lineHeight: '1.4',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
      }}>
        {msg.text}
      </div>
      <p style={{ margin: '3px 4px 0', fontSize: 10, color: '#94a3b8' }}>{msg.time}</p>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function Chat() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, activePgId } = useAuth();
  
  const [view, setView] = useState('list'); // 'list' | 'chat'
  const [contacts, setContacts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  
  const [inputText, setInputText] = useState('');
  const [filter, setFilter] = useState('enquiry'); // 'enquiry' | 'student' | 'staff'
  const [search, setSearch] = useState('');
  const [showAttach, setShowAttach] = useState(false);

  // Allot Room State
  const [showAllotModal, setShowAllotModal] = useState(false);
  const [allotForm, setAllotForm] = useState({ roomNo: '', bedNo: '', rentAmount: '', securityAmount: '', tokenAmount: '0', dateOfJoining: new Date().toISOString().split('T')[0] });
  const [actionLoading, setActionLoading] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [packageRents, setPackageRents] = useState([]);
  const [packageSecurity, setPackageSecurity] = useState('');
  
  const [showDetailsOptions, setShowDetailsOptions] = useState(false);
  const [showRoomSelect, setShowRoomSelect] = useState(false);
  const [adminRooms, setAdminRooms] = useState([]);
  const [foodMenu, setFoodMenu] = useState({});
  const [pgDetails, setPgDetails] = useState(null);

  const msgUnsubRef = useRef(null);
  const bottomRef = useRef(null);

  // Fetch Contacts & PG Rents
  useEffect(() => {
    if (!user?.uid) return;
    const uid = user.uid;

    const unsubPg = onSnapshot(doc(db, 'pg_owners', uid), d => {
       if (d.exists()) {
         const data = d.data();
         if (data.propertyDetails?.rents) setPackageRents(data.propertyDetails.rents);
         setPgDetails(data.propertyDetails || null);
         setFoodMenu(data.foodMenu || {});
       }
    });

    const unsubRooms = onSnapshot(query(collection(db, 'rooms'), where('adminId', '==', uid)), snap => {
       setAdminRooms(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    let merged = [];
    const merge = (items) => {
      items.forEach(item => {
        const idx = merged.findIndex(c => c.id === item.id);
        if (idx === -1) merged.push(item);
        else merged[idx] = { ...merged[idx], ...item };
      });
      setContacts([...merged].sort((a,b) => (b.lastTimestamp?.toMillis() || 0) - (a.lastTimestamp?.toMillis() || 0)));
    };
    
    const unsub1 = onSnapshot(query(collection(db, 'enquiries'), where('adminId', '==', uid)), snap => {
      merge(snap.docs.map(d => ({ id: d.data().tenantId || d.id, ...d.data(), role: 'enquiry', name: d.data().name || d.data().tenantName || 'Enquiry', color: '#ec4899', initials: 'EN' })));
    });
    const unsub2 = onSnapshot(query(collection(db, 'tenants'), where('adminId', '==', uid), where('status', '==', 'Approved')), snap => {
      merge(snap.docs.map(d => ({ id: d.data().tenantId || d.id, ...d.data(), role: 'student', name: d.data().name || d.data().tenantName || 'Student', color: '#6366f1', initials: 'ST' })));
    });
    const unsub3 = onSnapshot(query(collection(db, 'staff_tokens'), where('ownerUid', '==', uid)), snap => {
      merge(snap.docs.map(d => ({ id: d.data().uid || d.id, ...d.data(), role: 'staff', name: d.data().name || 'Staff', color: '#8b5cf6', initials: 'SF' })));
    });
    return () => { unsub1(); unsub2(); unsub3(); unsubPg(); unsubRooms(); };
  }, [user?.uid]);

  // Load Messages
  useEffect(() => {
    if (view === 'chat' && activeContact && user?.uid) {
      if (msgUnsubRef.current) msgUnsubRef.current();
      const chatId = [user.uid, activeContact.id].sort().join('_');
      msgUnsubRef.current = onSnapshot(query(collection(db, 'chats', chatId, 'messages'), orderBy('timestamp', 'asc')), snap => {
        setMessages(snap.docs.map(d => {
           const data = d.data({ serverTimestampBehavior: 'estimate' });
           return { 
             id: d.id, 
             ...data,
             from: data.senderId === user.uid ? 'admin' : activeContact.id, 
             type: data.type || (data.imageUrl ? 'image' : 'text'), 
             url: data.imageUrl, 
             time: data.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
           };
        }));
      });
    }
  }, [view, activeContact, user?.uid]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeContact]);

  const handleSendPackage = async (e) => {
    e.preventDefault();
    setActionLoading('sending');
    try {
      const chatId = [user.uid, activeContact.id].sort().join('_');
      await setDoc(doc(db, 'chats', chatId), {
        participants: [user.uid, activeContact.id],
        lastMessage: "Sent Registration Package",
        lastTimestamp: serverTimestamp(),
        adminId: user.uid, pgId: activePgId, 
        tenantId: activeContact.id
      }, { merge: true });
      
      let msgObj = { 
        senderId: user.uid, 
        senderName: user.name || 'Admin', 
        timestamp: serverTimestamp(), 
        read: false,
        type: 'package',
        text: 'Fill this form as discussed to be the part of this PG',
        packageData: {
           rents: packageRents,
           securityAmount: packageSecurity
        }
      };
      await addDoc(collection(db, 'chats', chatId, 'messages'), msgObj);
      setShowPackageModal(false);
    } catch(err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendSpecificDetails = async (type, data = null) => {
    if (!activeContact || !user?.uid) return;
    try {
      let detailsText = "";
      let imageUrl = null;
      let customType = null;
      let extraPayload = {};
      
      if (type === 'room' && data) {
        detailsText = `🏠 Room Details\nRoom No: ${data.name || data.roomNo || 'N/A'}\nType: ${data.roomType || 'Standard'} • ${data.seaterLabel || (data.beds ? data.beds + ' Seater' : 'N/A')}\nRent: ₹${data.price || data.rent || 'N/A'}`;
        if (data.image) imageUrl = data.image;
        if (data.facilities && data.facilities.length > 0) {
          detailsText += `\nFacilities: ${Array.isArray(data.facilities) ? data.facilities.join(', ') : data.facilities}`;
        }
      } else if (type === 'food') {
        detailsText = `🍽️ Weekly Food Menu`;
        customType = 'food_menu';
        extraPayload = { foodMenu: foodMenu };
      } else if (type === 'pg') {
        detailsText = `🏢 PG Details\n`;
        if (pgDetails) {
          detailsText += `Name: ${pgDetails.pgName || 'Our PG'}\n`;
          detailsText += `Address: ${pgDetails.address || 'N/A'}\n`;
          if (pgDetails.amenities && pgDetails.amenities.length > 0) {
            detailsText += `Amenities: ${pgDetails.amenities.join(', ')}\n`;
          }
          if (pgDetails.rules && pgDetails.rules.length > 0) {
            detailsText += `Rules: ${pgDetails.rules.join(', ')}\n`;
          }
          if (pgDetails.coverImage) imageUrl = pgDetails.coverImage;
          if (pgDetails.images && pgDetails.images.length > 0 && !imageUrl) imageUrl = pgDetails.images[0];
        }
      }
      
      const chatId = [user.uid, activeContact.id].sort().join('_');
      await setDoc(doc(db, 'chats', chatId), {
        participants: [user.uid, activeContact.id],
        lastMessage: detailsText.substring(0, 40) + (detailsText.length > 40 ? '...' : ''),
        lastTimestamp: serverTimestamp(),
        adminId: user.uid, pgId: activePgId, 
        tenantId: activeContact.id
      }, { merge: true });

      let msgObj = {
        senderId: user.uid,
        senderName: user.name || 'Admin',
        text: detailsText,
        timestamp: serverTimestamp(),
        read: false,
        ...extraPayload
      };
      
      if (customType) {
        msgObj.type = customType;
      } else if (imageUrl) {
        msgObj.type = 'image';
        msgObj.imageUrl = imageUrl;
      } else {
        msgObj.type = 'text';
      }
      
      await addDoc(collection(db, 'chats', chatId, 'messages'), msgObj);
      
      setShowDetailsOptions(false);
      setShowRoomSelect(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSend = async (type = 'text', content) => {
    if ((type === 'text' && !inputText.trim()) || !activeContact || !user?.uid) return;
    const chatId = [user.uid, activeContact.id].sort().join('_');
    const textMsg = type === 'text' ? inputText.trim() : '';
    if (type === 'text') setInputText('');
    
    try {
      await setDoc(doc(db, 'chats', chatId), {
        participants: [user.uid, activeContact.id],
        lastMessage: type === 'text' ? textMsg : `Sent ${type}`,
        lastTimestamp: serverTimestamp(),
        adminId: user.uid, pgId: activePgId, 
        tenantId: activeContact.id
      }, { merge: true });
      
      let msgObj = { senderId: user.uid, senderName: user.name || 'Admin', timestamp: serverTimestamp(), read: false };
      if (type === 'text') msgObj.text = textMsg;
      if (type === 'image') msgObj.imageUrl = content;
      await addDoc(collection(db, 'chats', chatId, 'messages'), msgObj);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAllotRoom = async (e) => {
    e.preventDefault();
    setActionLoading('alloting');
    try {
      const contactId = activeContact.id;
      const rent = Number(allotForm.rentAmount) || 0;
      const sec = Number(allotForm.securityAmount) || 0;
      const token = Number(allotForm.tokenAmount) || 0;
      const rem = rent + sec - token;

      const querySnapshot = await getDocs(query(collection(db, 'pg_applications'), where('tenantId', '==', contactId)));
      if (!querySnapshot.empty) {
        await updateDoc(doc(db, 'pg_applications', querySnapshot.docs[0].id), { status: 'approved' });
      }

      const enqQuery = await getDocs(query(collection(db, 'enquiries'), where('tenantId', '==', contactId)));
      if (!enqQuery.empty) {
        await updateDoc(doc(db, 'enquiries', enqQuery.docs[0].id), { status: 'Admitted' });
      }

      await setDoc(doc(db, 'tenants', contactId), {
        tenantId: contactId,
        adminId: user.uid, pgId: activePgId, 
        status: 'Upcoming User',
        plan: 'Monthly',
        roomNo: allotForm.roomNo,
        bedNo: allotForm.bedNo,
        dateOfJoining: allotForm.dateOfJoining,
        rentAmount: rent,
        securityAmount: sec,
        paymentVerificationPending: rem > 0,
        remainingAmount: rem
      }, { merge: true });

      await updateDoc(doc(db, 'users', contactId), {
        status: 'Upcoming User',
        pgStatus: 'Upcoming User',
        'subscribedPG.adminId': user.uid,
        'subscribedPG.pgId': activePgId === 'primary' ? user.uid : activePgId,
        'subscribedPG.status': 'Upcoming User',
        'subscribedPG.roomNo': allotForm.roomNo,
        'subscribedPG.bedNo': allotForm.bedNo || '',
        'subscribedPG.remainingAmount': rem,
        'subscribedPG.kycStatus': rem === 0 ? 'payment_approved_kyc_pending' : null,
        'subscribedPG.paymentVerificationPending': rem > 0
      });

      const chatId = [user.uid, contactId].sort().join('_');
      await setDoc(doc(db, 'chats', chatId), {
        lastMessage: `🎉 Room Allotted: ${allotForm.roomNo}${allotForm.bedNo ? ` (Bed ${allotForm.bedNo})` : ''}`,
        lastTimestamp: serverTimestamp()
      }, { merge: true });

      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: user.uid,
        isSystem: true,
        text: `🎉 Room Allotted!\\n\\nRoom No: ${allotForm.roomNo}\\nBed No: ${allotForm.bedNo || 'N/A'}\\nRent: ₹${rent}\\nSecurity: ₹${sec}\\nToken Paid: ₹${token}\\nRemaining: ₹${rem}`,
        timestamp: serverTimestamp()
      });

      setSuccessMessage("Room Allotted successfully!");
      setTimeout(() => setShowAllotModal(false), 2000);
    } catch(err) {
      console.error(err);
      setSuccessMessage("Failed to allot room: " + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const getLastMsgPreview = (contactId) => {
    const c = contacts.find(x => x.id === contactId);
    if (!c || !c.lastMessage) return null;
    return c.lastMessage;
  };
  
  const getLastMsgTime = (contactId) => {
    const c = contacts.find(x => x.id === contactId);
    if (!c || !c.lastTimestamp) return null;
    return c.lastTimestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const filteredContacts = contacts.filter(c => {
    if (filter === 'enquiry' && c.role !== 'enquiry') return false;
    if (filter === 'student' && c.role !== 'student') return false;
    if (filter === 'staff'   && c.role !== 'staff')   return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // ─── Render: Chat View ──────────────────────────────────────────────
  if (view === 'chat' && activeContact) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Hanken Grotesk',sans-serif", display: 'flex', flexDirection: 'column' }}>
        {/* Chat Header */}
        <div style={{ background: 'white', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <button onClick={() => setView('list')} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back_ios_new</span>
          </button>
          <div style={{ width: 42, height: 42, borderRadius: '50%', background: activeContact.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14 }}>
            {activeContact.initials}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 16, color: '#0f172a' }}>{activeContact.name}</h2>
            <p style={{ margin: 0, fontSize: 12, color: '#64748b', textTransform: 'capitalize' }}>{activeContact.role}</p>
          </div>
        </div>

        {/* Chat Messages */}
        <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 140 }}>
          {messages.map((msg, i) => {
            const isMe = msg.from === 'admin';
            return <MessageBubble key={msg.id} msg={msg} isMe={isMe} />;
          })}
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', marginTop: 40, color: '#94a3b8', fontSize: 14 }}>
              Say hi to start the conversation!
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input Bar */}
        <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: 'white', borderTop: '1px solid #e2e8f0', padding: '8px 12px', paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 16px))', boxSizing: 'border-box', zIndex: 40 }}>
          
          {activeContact.role === 'enquiry' && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 8, paddingBottom: 4, overflowX: 'auto', scrollbarWidth: 'none' }}>
               <button onClick={() => setShowDetailsOptions(true)} style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 16, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
                 <span className="material-symbols-outlined" style={{ fontSize: 18 }}>bed</span> Send Details
               </button>
               <button onClick={() => setShowPackageModal(true)} style={{ background: '#ecfeff', color: cyan, border: '1px solid #cffafe', borderRadius: 16, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
                 <span className="material-symbols-outlined" style={{ fontSize: 18 }}>receipt_long</span> Send Package
               </button>
            </div>
          )}

          {showAttach && (
            <AttachMenu onSendImage={(url, name) => handleSend('image', url)} onClose={() => setShowAttach(false)} />
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
              onKeyDown={e => e.key === 'Enter' && handleSend('text')}
              placeholder="Type a message..."
              style={{ flex: 1, padding: '10px 16px', borderRadius: 24, border: '1.5px solid #e2e8f0', outline: 'none', fontSize: 14, background: '#f8fafc', fontFamily: 'inherit' }}
            />
            <button onClick={() => handleSend('text')}
              style={{ width: 42, height: 42, borderRadius: '50%', background: cyan, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(8,145,178,0.3)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'white' }}>send</span>
            </button>
          </div>
        </div>

        {/* SEND PACKAGE MODAL */}
        {showPackageModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
            <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 400, padding: 20, maxHeight: '90vh', overflowY: 'auto' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>Send Registration Package</h3>
              <form onSubmit={handleSendPackage} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{margin:0, fontSize:13, fontWeight:600, color:'#64748b'}}>Edit rent prices for this student if needed:</p>
                {packageRents.map((r, i) => (
                  <div key={i} style={{display:'flex', alignItems:'center', gap:10}}>
                     <div style={{width: 80, fontSize:14, fontWeight:700}}>{r.seater} Seater</div>
                     <input type="number" value={r.rent} onChange={e => {
                        const newRents = [...packageRents];
                        newRents[i].rent = e.target.value;
                        setPackageRents(newRents);
                     }} style={{flex:1, padding:10, borderRadius:8, border:'1px solid #cbd5e1'}} />
                  </div>
                ))}
                
                <p style={{margin:'10px 0 0', fontSize:13, fontWeight:600, color:'#64748b'}}>Security Deposit for this student:</p>
                <input type="number" placeholder="e.g. 5000" value={packageSecurity} onChange={e => setPackageSecurity(e.target.value)} required style={{ padding: 12, borderRadius: 8, border: '1px solid #cbd5e1' }} />
                
                <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                  <button type="button" onClick={() => setShowPackageModal(false)} style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid #cbd5e1', background: 'white', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" disabled={actionLoading === 'sending'} style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: cyan, color: 'white', fontWeight: 600, cursor: 'pointer' }}>{actionLoading === 'sending' ? 'Sending...' : 'Send Package'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* SEND DETAILS OPTIONS MODAL */}
        {showDetailsOptions && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
            <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 400, padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>Send Details</h3>
                <span className="material-symbols-outlined" style={{ cursor: 'pointer', color: '#94a3b8' }} onClick={() => setShowDetailsOptions(false)}>close</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <button onClick={() => { setShowDetailsOptions(false); setShowRoomSelect(true); }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-symbols-outlined" style={{ color: '#2563eb' }}>bed</span>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#1e293b' }}>Room Details</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Select and send a room's details</div>
                  </div>
                </button>
                <button onClick={() => handleSendSpecificDetails('food')} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-symbols-outlined" style={{ color: '#d97706' }}>restaurant</span>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#1e293b' }}>Food Menu</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Send weekly timetable</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ROOM SELECT MODAL */}
        {showRoomSelect && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
            <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 400, padding: 24, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>Select Room</h3>
                <span className="material-symbols-outlined" style={{ cursor: 'pointer', color: '#94a3b8' }} onClick={() => setShowRoomSelect(false)}>close</span>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {adminRooms.length === 0 ? (
                  <p style={{ color: '#64748b', textAlign: 'center', fontSize: 14 }}>No rooms available.</p>
                ) : (
                  adminRooms.map(room => (
                    <button key={room.id} onClick={() => handleSendSpecificDetails('room', room)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, cursor: 'pointer', textAlign: 'left' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#1e293b' }}>Room {room.roomNo || room.name}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{room.roomType || 'Standard'} • {room.seaterLabel || (room.beds ? room.beds + ' Seater' : 'N/A')} • ₹{room.price || room.rent || 'N/A'}</div>
                      </div>
                      <span className="material-symbols-outlined" style={{ color: '#cbd5e1' }}>chevron_right</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}


        {/* ALLOT ROOM MODAL */}
        {showAllotModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
            <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 400, padding: 20, maxHeight: '90vh', overflowY: 'auto' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>Allot Room to {activeContact?.name}</h3>
              {successMessage && <div style={{background: '#10b981', color: 'white', padding: 12, borderRadius: 8, textAlign: 'center', marginBottom: 16}}>{successMessage}</div>}
              <form onSubmit={handleAllotRoom} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input type="text" placeholder="Room No" value={allotForm.roomNo} onChange={e => setAllotForm({...allotForm, roomNo: e.target.value})} required style={{ padding: 12, borderRadius: 8, border: '1px solid #cbd5e1' }} />
                <input type="text" placeholder="Bed No (Optional)" value={allotForm.bedNo} onChange={e => setAllotForm({...allotForm, bedNo: e.target.value})} style={{ padding: 12, borderRadius: 8, border: '1px solid #cbd5e1' }} />
                <input type="number" placeholder="Rent Amount" value={allotForm.rentAmount} onChange={e => setAllotForm({...allotForm, rentAmount: e.target.value})} required style={{ padding: 12, borderRadius: 8, border: '1px solid #cbd5e1' }} />
                <input type="number" placeholder="Security Deposit" value={allotForm.securityAmount} onChange={e => setAllotForm({...allotForm, securityAmount: e.target.value})} required style={{ padding: 12, borderRadius: 8, border: '1px solid #cbd5e1' }} />
                <input type="number" placeholder="Token Paid" value={allotForm.tokenAmount} onChange={e => setAllotForm({...allotForm, tokenAmount: e.target.value})} style={{ padding: 12, borderRadius: 8, border: '1px solid #cbd5e1' }} />
                <input type="date" value={allotForm.dateOfJoining} onChange={e => setAllotForm({...allotForm, dateOfJoining: e.target.value})} required style={{ padding: 12, borderRadius: 8, border: '1px solid #cbd5e1' }} />
                
                <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                  <button type="button" onClick={() => setShowAllotModal(false)} style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid #cbd5e1', background: 'white', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" disabled={actionLoading} style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: cyan, color: 'white', fontWeight: 600, cursor: 'pointer' }}>{actionLoading ? 'Saving...' : 'Confirm & Allot Room'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Render: Contact List View ──────────────────────────────────────
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
            <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>Enquiries · Students · Staff</p>
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <span className="material-symbols-outlined" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: '#64748b' }}>search</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search people..."
            style={{ width: '100%', padding: '10px 12px 10px 40px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.08)', color: 'white', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {/* Filter tabs: Enquiries, Students, Staff */}
        <div style={{ display: 'flex', background: 'white', borderRadius: 12, padding: 4, marginBottom: 14, border: '1px solid #e2e8f0' }}>
          {['enquiry', 'student', 'staff'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ flex: 1, padding: '8px 0', border: 'none', borderRadius: 9, background: filter === f ? cyan : 'transparent', color: filter === f ? 'white' : '#64748b', fontSize: 13, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.2s', fontFamily: 'inherit' }}>
              {f === 'enquiry' ? 'Enquiries' : f === 'student' ? 'Students' : 'Staff'}
            </button>
          ))}
        </div>

        {/* Contact list */}
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {filteredContacts.map((contact, i) => {
            const preview = getLastMsgPreview(contact.id);
            const time = getLastMsgTime(contact.id);
            return (
              <div key={contact.id} onClick={() => { setActiveContact(contact); setView('chat'); }}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer', borderBottom: i < filteredContacts.length - 1 ? '1px solid #f1f5f9' : 'none', background: 'white', transition: 'background 0.15s' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: contact.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                  {contact.initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{contact.name}</p>
                    {time && <span style={{ fontSize: 10, color: '#94a3b8' }}>{time}</span>}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                    <p style={{ margin: 0, fontSize: 12, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                      {preview}
                    </p>
                    <span style={{ fontSize: 11, color: contact.role === 'enquiry' ? '#ec4899' : contact.role === 'student' ? '#6366f1' : '#8b5cf6', background: contact.role === 'enquiry' ? '#fce7f3' : contact.role === 'student' ? '#eef2ff' : '#f5f3ff', padding: '2px 7px', borderRadius: 6, fontWeight: 600 }}>
                      {contact.role === 'enquiry' ? 'Enquiry' : contact.role === 'student' ? 'Student' : 'Staff'}
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
    </div>
  );
}
