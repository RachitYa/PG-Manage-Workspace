import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  collection, query, where, onSnapshot, addDoc, orderBy,
  doc, setDoc, serverTimestamp, getDocs, getDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { logAppEvent } from '../analytics';
import StudentPackageFormModal from '../components/StudentPackageFormModal';
const primaryGreen = '#166534';
const gold = '#d3a429';

// Generates a consistent chat ID from two UIDs
const getChatId = (uid1, uid2) => [uid1, uid2].sort().join('_');

// Message Bubble
function MessageBubble({ msg, isMe, onFillForm }) {
  const [imgOpen, setImgOpen] = useState(false);

  if (msg.type === 'admission_summary') {
    const sum = msg.summaryData || {};
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
        <div style={{ background: isMe ? primaryGreen : 'white', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px', padding: '16px', maxWidth: '85%', color: isMe ? 'white' : '#0f172a', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: isMe ? 'none' : '1px solid #e2e8f0' }}>
          <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:12, borderBottom: isMe ? '1px dashed rgba(255,255,255,0.3)' : '1px dashed #cbd5e1', paddingBottom: 10}}>
             <span className="material-symbols-outlined" style={{fontSize:20, color: isMe?'#dcfce7':'#10b981'}}>check_circle</span>
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
        <p style={{ margin: '3px 4px 0', fontSize: 10, color: '#94a3b8' }}>
          {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
        </p>
        
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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
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
        <p style={{ margin: '3px 4px 0', fontSize: 10, color: '#94a3b8' }}>
          {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
        </p>
      </div>
    );
  }

  if (msg.type === 'package') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
        <div style={{ background: isMe ? primaryGreen : 'white', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px', padding: '14px', maxWidth: '80%', color: isMe ? 'white' : '#0f172a', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: isMe ? 'none' : '1px solid #e2e8f0' }}>
          <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:8}}>
             <span className="material-symbols-outlined" style={{fontSize:20, color: isMe?'#dcfce7':'#10b981'}}>receipt_long</span>
             <strong style={{fontSize:14}}>Registration Package</strong>
          </div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.4 }}>{msg.text}</p>
          <div style={{background: isMe ? 'rgba(255,255,255,0.2)' : '#f8fafc', padding: '10px', borderRadius: 8, marginTop: 12}}>
             <p style={{margin:0, fontSize:11, fontWeight:600}}>Includes custom pricing for {msg.packageData?.rents?.length || 0} room types.</p>
             <p style={{margin:'4px 0 0', fontSize:11, fontWeight:600}}>Security Deposit: ₹{msg.packageData?.securityAmount || 0}</p>
          </div>
          {!isMe && (
            <button onClick={() => onFillForm(msg.packageData)} style={{marginTop: 12, width: '100%', padding: '10px', background: '#10b981', color: 'white', borderRadius: 8, border: 'none', fontWeight: 800, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6}}>
               Fill Admission Form <span className="material-symbols-outlined" style={{fontSize: 16}}>arrow_forward</span>
            </button>
          )}
        </div>
        <p style={{ margin: '3px 4px 0', fontSize: 10, color: '#94a3b8' }}>
          {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
      <div style={{
        background: isMe ? primaryGreen : 'white',
        color: isMe ? 'white' : '#0f172a',
        padding: '10px 14px',
        borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        fontSize: 14, maxWidth: '80%',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        lineHeight: 1.5,
        wordBreak: 'break-word',
        whiteSpace: 'pre-wrap'
      }}>
        {msg.imageUrl && (
          <img src={msg.imageUrl} alt="Attachment" style={{ width: '100%', borderRadius: 12, marginBottom: msg.text ? 8 : 0, border: '1px solid rgba(0,0,0,0.1)' }} />
        )}
        {msg.text}
        {msg.screenshot && (
          <img src={msg.screenshot} alt="Payment Screenshot" style={{ width: '100%', borderRadius: 12, marginTop: 8, border: '1px solid rgba(0,0,0,0.1)' }} />
        )}
      </div>
      <p style={{ margin: '3px 4px 0', fontSize: 10, color: '#94a3b8' }}>
        {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
      </p>
    </div>
  );
}

export default function Chat() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [view, setView] = useState('list'); // 'list' | 'chat'
  const [contacts, setContacts] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'pg' | 'enquiry'
  const [showAttach, setShowAttach] = useState(false);
  
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [activePackageData, setActivePackageData] = useState(null);

  const bottomRef = useRef(null);
  const msgUnsubRef = useRef(null);
  const chatDocUnsubRef = useRef(null);

  // Token payment states
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenAmount, setTokenAmount] = useState('');
  const [paymentScreenshot, setPaymentScreenshot] = useState(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [dateOfJoining, setDateOfJoining] = useState('');

  const [paymentMode, setPaymentMode] = useState('Online');
  const [transactionId, setTransactionId] = useState('');
  const [receivedBy, setReceivedBy] = useState('');

  const [successMessage, setSuccessMessage] = useState('');

  // Demanded token info from admin
  const [demandedToken, setDemandedToken] = useState(null);

  const handleScreenshotUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setSuccessMessage('Please select an image file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        } else {
          if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        setPaymentScreenshot(dataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Load contacts
  useEffect(() => {
    if (!user?.uid) return;
    setLoading(true);

    const loadContacts = async () => {
      try {
        const allContacts = [];
        const seen = new Set();

        // 1. From subscribed PG (current PG admin)
        if (user?.subscribedPG?.pgId) {
          seen.add(user.subscribedPG.adminId || user.subscribedPG.pgId);
          allContacts.push({
            id: user.subscribedPG.adminId || user.subscribedPG.pgId,
            name: user.subscribedPG.pgName || 'My PG',
            role: 'pg',
            sub: 'Your Current PG Admin',
            phone: '',
            initials: (user.subscribedPG.pgName || 'PG').substring(0, 2).toUpperCase(),
            color: '#059669'
          });
        }

        // 2. From enquiries sent by this student
        const enqSnap = await getDocs(query(collection(db, 'enquiries'), where('tenantId', '==', user.uid)));
        enqSnap.forEach(d => {
          const data = d.data();
          if (data.adminId && !seen.has(data.adminId)) {
            seen.add(data.adminId);
            allContacts.push({
              id: data.adminId,
              name: data.pgName || 'PG Admin',
              role: 'enquiry',
              sub: 'Sent Enquiry',
              phone: '',
              initials: (data.pgName || 'PG').substring(0, 2).toUpperCase(),
              color: '#f59e0b'
            });
          }
        });

        // 3. From pg_applications
        const appSnap = await getDocs(query(collection(db, 'pg_applications'), where('tenantId', '==', user.uid)));
        appSnap.forEach(d => {
          const data = d.data();
          if (data.adminId && !seen.has(data.adminId)) {
            seen.add(data.adminId);
            allContacts.push({
              id: data.adminId,
              name: data.pgName || 'PG Admin',
              role: 'enquiry',
              sub: `Applied for ${data.pgName || 'PG'}`,
              phone: '',
              initials: (data.pgName || 'PG').substring(0, 2).toUpperCase(),
              color: '#f59e0b'
            });
          }
        });

        // 4. From existing chats where this student is tenantId
        const chatsSnap = await getDocs(query(collection(db, 'chats'), where('tenantId', '==', user.uid)));
        chatsSnap.forEach(d => {
          const data = d.data();
          if (data.adminId && !seen.has(data.adminId)) {
            seen.add(data.adminId);
            allContacts.push({
              id: data.adminId,
              name: 'PG Admin',
              role: 'enquiry',
              sub: data.lastMessage || 'Tap to chat',
              phone: '',
              initials: 'PG',
              color: gold
            });
          }
        });

        setContacts(allContacts);
      } catch (err) {
        console.error('Error loading contacts:', err);
      } finally {
        setLoading(false);
      }
    };

    loadContacts();
  }, [user]);

  // Auto-open contact from navigation state
  useEffect(() => {
    if (location.state && (location.state.contactId || location.state.name) && contacts.length > 0) {
      const match = contacts.find(c =>
        (location.state.contactId && c.id === location.state.contactId) ||
        (location.state.name && c.name.toLowerCase() === location.state.name.toLowerCase())
      );
      if (match) {
        openChat(match);
      } else if (location.state.contactId) {
        const tempContact = {
          id: location.state.contactId,
          name: location.state.name || 'PG Admin',
          role: 'enquiry',
          sub: 'New Chat',
          phone: location.state.phone || '',
          initials: (location.state.name || 'PG').substring(0, 2).toUpperCase(),
          color: gold
        };
        openChat(tempContact);
      }
    }
  }, [location.state, contacts]);

  const openChat = (contact) => {
    setActiveContact(contact);
    setView('chat');
    setMessages([]);
    setDemandedToken(null);

    // Unsubscribe from previous
    if (msgUnsubRef.current) { msgUnsubRef.current(); msgUnsubRef.current = null; }
    if (chatDocUnsubRef.current) { chatDocUnsubRef.current(); chatDocUnsubRef.current = null; }

    if (!user?.uid || !contact.id) return;
    const chatId = getChatId(user.uid, contact.id);

    // Listen to messages
    const msgsRef = collection(db, 'chats', chatId, 'messages');
    const msgsQuery = query(msgsRef, orderBy('timestamp', 'asc'));
    msgUnsubRef.current = onSnapshot(msgsQuery, (snap) => {
      const msgs = snap.docs.map(d => {
        const data = d.data({ serverTimestampBehavior: 'estimate' });
        return { id: d.id, ...data };
      });
      msgs.sort((a, b) => {
        const getTs = (t) => t ? (t.toMillis ? t.toMillis() : (typeof t === 'string' ? new Date(t).getTime() : Date.now())) : Date.now();
        return getTs(a.timestamp) - getTs(b.timestamp);
      });
      setMessages(msgs);
    });

    // Listen to chat doc for demandedToken
    chatDocUnsubRef.current = onSnapshot(doc(db, 'chats', chatId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.demandedToken && (data.tokenPaid === undefined || data.tokenPaid === null)) {
          setDemandedToken(data.demandedToken);
        } else {
          setDemandedToken(null);
        }
      }
    });
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (msgUnsubRef.current) msgUnsubRef.current();
      if (chatDocUnsubRef.current) chatDocUnsubRef.current();
    };
  }, []);

  const logTokenPayment = async () => {
    if (!tokenAmount || isNaN(tokenAmount) || Number(tokenAmount) <= 0) {
      return setSuccessMessage('Please enter a valid token amount');
    }
    if (paymentMode === 'Online' && !paymentScreenshot) {
      return setSuccessMessage('Please attach a screenshot of your online payment');
    }
    if (!dateOfJoining) {
      return setSuccessMessage('Please select your date of joining the PG');
    }

    const rent = demandedToken?.rent || 0;
    const security = demandedToken?.security || 0;
    const totalAmt = demandedToken?.totalAmount || rent;
    const remainingAmount = totalAmt - Number(tokenAmount);


    setTokenLoading(true);
    
    // Log analytics event
    logAppEvent('feature_used', { feature: 'Pay Token', amount: tokenAmount });
    try {
      const chatId = getChatId(user.uid, activeContact.id);
      const now = new Date();
      const isoString = now.toISOString();
      const dateString = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

      // 1. Save to student's own payment history (users/{uid}/payments)
      await addDoc(collection(db, 'users', user.uid, 'payments'), {
        paymentMode: paymentMode,
        transactionId: transactionId,
        receivedBy: receivedBy,
        name: `Token Payment - ${activeContact.name}`,
        amount: Number(tokenAmount),
        type: 'Debit',
        date: dateString,
        contact: activeContact.name,
        pgName: activeContact.name,
        adminId: activeContact.id,
        rent,
        security,
        totalAmount: totalAmt,
        remainingAmount: remainingAmount,
        seaterLabel: demandedToken?.seaterLabel || '',
        screenshot: paymentScreenshot || null,
        paymentType: 'token',
        dateOfJoining: dateOfJoining,
        createdAt: isoString
      });

      // 2. Notification for Admin
      await addDoc(collection(db, 'notifications'), {
        adminId: activeContact.id,
        title: 'New Token Payment',
        desc: `${user.name || 'Student'} paid token of ₹${tokenAmount} out of ₹${totalAmt}. Please verify and allot a room.`,
        type: 'info', action: 'VIEW_ENQUIRIES', unread: true,
        createdAt: isoString, resolved: false
      });

      // 3. Notification for Student (Self)
      await addDoc(collection(db, 'users', user.uid, 'notifications'), {
        title: 'Token Payment Logged',
        desc: `Your token payment of ₹${tokenAmount} to ${activeContact.name} has been recorded.`,
        type: 'success', action: 'VIEW_PAYMENTS', unread: true,
        createdAt: isoString
      });

      // 4. Add a system message in the chat and store token/remaining details
      await setDoc(doc(db, 'chats', chatId), {
        participants: [user.uid, activeContact.id],
        lastMessage: `Token Payment: ₹${tokenAmount}`,
        lastTimestamp: serverTimestamp(),
        adminId: activeContact.id,
        tenantId: user.uid,
        tokenPaid: Number(tokenAmount),
        remainingAmount: remainingAmount <= 0 ? 0 : remainingAmount,
        totalAmount: totalAmt,
        rentAmount: rent,
        securityAmount: security,
        demandedToken: demandedToken,
        dateOfJoining: dateOfJoining
      }, { merge: true });

      if (remainingAmount <= 0) {
        await setDoc(doc(db, 'users', user.uid), {
          hasPG: true,
          pgStatus: 'Upcoming User',
          subscribedPG: {
            pgId: activeContact.id,
            pgName: activeContact.name || 'PG',
            roomNo: 'To be allotted',
            seaterLabel: demandedToken?.seaterLabel || '',
            rent: rent,
            securityAmount: security,
            leaseAmount: totalAmt,
            tokenPaid: Number(tokenAmount),
            remainingAmount: 0,
            paymentVerificationPending: false,
            fullPaymentPaid: true,
            kycStatus: 'payment_approved_kyc_pending',
            paymentMethod: paymentMode,
            paymentScreenshot: paymentScreenshot || null,
            status: 'Upcoming User'
          }
        }, { merge: true });

        await setDoc(doc(db, 'tenants', user.uid), {
          adminId: activeContact.id,
          tenantId: user.uid,
          name: user.name || 'Student',
          phone: user.phone || '',
          roomNo: 'To be allotted',
          seaterLabel: demandedToken?.seaterLabel || '',
          rentAmount: totalAmt,
          rent: rent,
          securityDeposit: security,
          dateOfJoining: dateOfJoining,
          status: 'Upcoming User',
          remainingAmount: 0,
          paymentVerificationPending: false,
          paymentStatus: 'Paid'
        }, { merge: true });
      }

      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text: `💰 Token Payment Logged\n` +
              `Rent: ₹${rent}/month\n` +
              `Security: ₹${security}\n` +
              `Total First Month: ₹${totalAmt}\n` +
              `\n---\n` +
              `Token Paid: ₹${tokenAmount}\n` +
              `Remaining Amount: ₹${remainingAmount}\n` +
              `Date of Joining: ${dateOfJoining}\n` +
              `Payment Mode: ${paymentMode}\n` +
              (paymentMode === 'Online' && transactionId ? `Transaction ID: ${transactionId}\n` : '') +
              (receivedBy ? `Received By: ${receivedBy}\n` : '') +
              `\nPlease verify and allot my room.`,
        screenshot: paymentScreenshot || null,
        senderId: user.uid,
        senderName: user.name || 'Student',
        timestamp: serverTimestamp(),
        read: false,
        isSystem: true
      });

      setShowTokenModal(false);
      setTokenAmount('');
      setDateOfJoining('');
      setPaymentScreenshot(null);
      setSuccessMessage('Token payment logged successfully! The admin has been notified.');
    } catch (err) {
      console.error(err);
      setSuccessMessage('Failed to log payment.');
    } finally {
      setTokenLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !activeContact || !user?.uid) return;
    const chatId = getChatId(user.uid, activeContact.id);
    const text = inputText.trim();
    setInputText('');
    try {
      await Promise.all([
        setDoc(doc(db, 'chats', chatId), {
          participants: [user.uid, activeContact.id],
          lastMessage: text,
          lastTimestamp: serverTimestamp(),
          adminId: activeContact.id,
          tenantId: user.uid
        }, { merge: true }),
        addDoc(collection(db, 'chats', chatId, 'messages'), {
          text,
          senderId: user.uid,
          senderName: user.name || 'Student',
          timestamp: serverTimestamp(),
          read: false
        })
      ]);
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const filteredContacts = contacts.filter(c => {
    if (filter === 'all') return true;
    if (filter === 'pg') return c.role === 'pg';
    if (filter === 'enquiry') return c.role === 'enquiry';
    return true;
  });

  const ROLE_COLORS = { pg: '#059669', enquiry: '#f59e0b' };

  // ── CHAT VIEW ──
  if (view === 'chat' && activeContact) {
    return (
      <div style={{ width: '100%', height: '100vh', background: '#f4fbf7', fontFamily: "'Hanken Grotesk', sans-serif", display: 'flex', flexDirection: 'column' }}>

        
        {/* Success/Error Modal */}
        {successMessage && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.3s ease-out' }}>
            <div onClick={() => {
                setSuccessMessage('');
                if (successMessage.includes('Admission Request')) navigate('/student-dashboard');
              }} 
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} 
            />
            <div style={{ background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(16px)', borderRadius: 24, padding: 32, width: '85%', maxWidth: 320, position: 'relative', zIndex: 1, boxShadow: '0 20px 40px rgba(0,0,0,0.15)', textAlign: 'center', border: '1px solid rgba(255,255,255,0.5)' }}>
              <div style={{ background: '#ecfeff', width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 8px 16px rgba(8, 145, 178, 0.15)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#0891b2' }}>check_circle</span>
              </div>
              <h3 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 800, color: '#0f172a', fontFamily: "'Bricolage Grotesque', sans-serif" }}>Success!</h3>
              <p style={{ margin: '0 0 28px', fontSize: 14, color: '#475569', lineHeight: 1.5, fontWeight: 500 }}>
                {successMessage}
              </p>
              <button 
                onClick={() => {
                  setSuccessMessage('');
                  if (successMessage.includes('Admission Request')) navigate('/student-dashboard');
                }} 
                style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)', border: 'none', borderRadius: 14, fontWeight: 800, fontSize: 15, color: 'white', cursor: 'pointer', boxShadow: '0 4px 12px rgba(8,145,178,0.25)', transition: 'transform 0.15s' }}
                onMouseOver={e => e.currentTarget.style.transform = 'scale(0.98)'}
                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                Okay, Thanks!
              </button>
            </div>
          </div>
        )}

        {/* Token Payment Modal */}
        {showTokenModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 20 }}>
            <div onClick={() => setShowTokenModal(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }} />
            <div style={{ position: 'relative', background: 'white', borderRadius: 24, padding: 24, zIndex: 101, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 20, color: '#0f172a', fontWeight: 800 }}>💰 Pay Token</h3>
              <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748b' }}>Review the amounts set by your PG admin and enter how much token you are paying today.</p>

              {demandedToken ? (
                <>
                  {/* Summary Card */}
                  <div style={{ background: 'linear-gradient(135deg, #064e3b, #166534)', borderRadius: 16, padding: 16, marginBottom: 20, color: 'white' }}>
                    <p style={{ margin: '0 0 8px', fontSize: 12, opacity: 0.8, fontWeight: 600, letterSpacing: 1 }}>ROOM DETAILS</p>
                    <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700 }}>{demandedToken.seaterLabel || `${demandedToken.seater} Seater Room`}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, gap: 8 }}>
                      <div style={{ flex: 1, background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '10px 12px' }}>
                        <p style={{ margin: 0, fontSize: 11, opacity: 0.8 }}>Monthly Rent</p>
                        <p style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 800 }}>₹{demandedToken.rent}</p>
                      </div>
                      <div style={{ flex: 1, background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '10px 12px' }}>
                        <p style={{ margin: 0, fontSize: 11, opacity: 0.8 }}>Security</p>
                        <p style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 800 }}>₹{demandedToken.security}</p>
                      </div>
                    </div>
                    <div style={{ marginTop: 8, background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Total First Month</p>
                      <p style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>₹{demandedToken.totalAmount}</p>
                    </div>
                  </div>

                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Date of Joining PG *</label>
                  <input
                    type="date"
                    value={dateOfJoining}
                    onChange={e => setDateOfJoining(e.target.value)}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid #cbd5e1', marginBottom: 16, fontSize: 15, boxSizing: 'border-box', outline: 'none' }}
                  />

                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Token Amount You Are Paying Now (₹) *</label>
                  <input
                    type="number"
                    value={tokenAmount}
                    onChange={e => setTokenAmount(e.target.value)}
                    placeholder="e.g. 2000"
                    style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid #d1fae5', marginBottom: 16, fontSize: 15, boxSizing: 'border-box', outline: 'none' }}
                  />

                  <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Payment Mode *</label>
                      <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none' }}>
                        <option value="Online">Online</option>
                        <option value="Cash">Cash</option>
                      </select>
                    </div>
                    {paymentMode === 'Online' && (
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Transaction ID</label>
                        <input type="text" value={transactionId} onChange={e => setTransactionId(e.target.value)} placeholder="e.g. UPI Ref" style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 14, boxSizing: 'border-box', outline: 'none' }} />
                      </div>
                    )}
                  </div>

                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Payment Received By (Name / Role)</label>
                  <input type="text" value={receivedBy} onChange={e => setReceivedBy(e.target.value)} placeholder="e.g. Rahul (Manager)" style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', marginBottom: 16, fontSize: 14, boxSizing: 'border-box', outline: 'none' }} />

                </>
              ) : (
                <div style={{ background: '#fef9c3', borderRadius: 12, padding: 16, marginBottom: 20, border: '1px solid #fde68a' }}>
                  <p style={{ margin: 0, fontSize: 14, color: '#92400e', fontWeight: 600 }}>⏳ Waiting for Admin</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#92400e' }}>The admin has not yet set your room details and token amount. Please wait for them to send a token demand first.</p>
                </div>
              )}

              {demandedToken && paymentMode === 'Online' && (
                <>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Payment Screenshot *</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleScreenshotUpload}
                    style={{ width: '100%', padding: '8px', border: '1px dashed #cbd5e1', borderRadius: 12, marginBottom: 16, fontSize: 13 }}
                  />
                  {paymentScreenshot && (
                    <img src={paymentScreenshot} alt="Screenshot preview" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 12, marginBottom: 16, border: '1px solid #e2e8f0' }} />
                  )}
                </>
              )}

              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setShowTokenModal(false)} style={{ flex: 1, padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: 12, fontWeight: 700, color: '#475569', cursor: 'pointer' }}>Cancel</button>
                {demandedToken && (
                  <button onClick={logTokenPayment} disabled={tokenLoading} style={{ flex: 1, padding: '12px', background: '#166534', border: 'none', borderRadius: 12, fontWeight: 700, color: 'white', cursor: 'pointer', opacity: tokenLoading ? 0.7 : 1 }}>
                    {tokenLoading ? 'Saving...' : 'Submit Payment'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Chat Header */}
        <div style={{ background: 'linear-gradient(135deg, #064e3b 0%, #166534 50%, #15803d 100%)', padding: '0 16px', display: 'flex', alignItems: 'center', gap: 12, height: 'auto', minHeight: 64, flexShrink: 0, paddingTop: 'max(env(safe-area-inset-top), 40px)', paddingBottom: 10 }}>
          <button onClick={() => { setView('list'); if (msgUnsubRef.current) { msgUnsubRef.current(); msgUnsubRef.current = null; } if (chatDocUnsubRef.current) { chatDocUnsubRef.current(); chatDocUnsubRef.current = null; } }} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back_ios_new</span>
          </button>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: activeContact.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 15, flexShrink: 0, border: '2px solid rgba(255,255,255,0.2)' }}>
            {activeContact.initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeContact.name}</p>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>{activeContact.sub}</p>
          </div>

          {activeContact.phone && (
            <a href={`tel:${activeContact.phone}`} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', textDecoration: 'none', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>call</span>
            </a>
          )}
        </div>

        {/* Action Banners */}
        {demandedToken && (
          <div style={{ background: 'linear-gradient(135deg, #059669, #047857)', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <div>
              <p style={{ margin: 0, fontSize: 13, color: 'white', fontWeight: 700 }}>🏠 Token Required</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>{demandedToken.seaterLabel} · ₹{demandedToken.totalAmount} total first month</p>
            </div>
            <button onClick={() => setShowTokenModal(true)} style={{ background: 'white', border: 'none', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 800, color: '#047857', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>Pay Token</button>
          </div>
        )}

        {/* Chat Messages */}
        <div style={{ flex: 1, minHeight: 0, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 100 }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', paddingTop: 60 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#dcfce7' }}>chat</span>
              <p style={{ color: '#166534', fontSize: 14, marginTop: 8, fontWeight: 600 }}>No messages yet. Say hello!</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <MessageBubble 
              key={msg.id || i} 
              msg={msg} 
              isMe={msg.senderId === user.uid} 
              onFillForm={(pkgData) => {
                 setActivePackageData(pkgData);
                 setShowPackageModal(true);
              }}
            />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input – constrained to 480px, safe-area-bottom handled */}
        <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 'min(480px, 100vw)', background: 'white', borderTop: '1px solid #e2e8f0', padding: '10px 16px', paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))', boxSizing: 'border-box', zIndex: 40, display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
            style={{ flex: 1, padding: '12px 18px', borderRadius: 24, border: '1.5px solid #dcfce7', outline: 'none', fontSize: 15, background: '#f4fbf7', fontFamily: 'inherit', color: '#0f172a' }}
          />
          <button onClick={sendMessage} style={{ width: 44, height: 44, borderRadius: '50%', background: primaryGreen, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(22,101,52,0.2)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'white' }}>send</span>
          </button>
        </div>

        {showPackageModal && activePackageData && (
           <StudentPackageFormModal 
              packageData={activePackageData} 
              adminId={activeContact.id} 
              adminName={activeContact.name} 
              onClose={() => setShowPackageModal(false)}
              onSuccess={() => {
                 setShowPackageModal(false);
                 setSuccessMessage('Admission Request Submitted Successfully!');
              }}
           />
        )}
      </div>
    );
  }

  // ── LIST VIEW ──
  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#f4fbf7', fontFamily: "'Hanken Grotesk', sans-serif", paddingBottom: 40 }}>
      <div style={{ background: 'linear-gradient(135deg, #064e3b 0%, #166534 50%, #15803d 100%)', padding: '0 16px 20px', borderBottomLeftRadius: 24, borderBottomRightRadius: 24, boxShadow: '0 8px 24px rgba(6,78,59,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, height: 72 }}>
          <button onClick={() => navigate('/student-dashboard')} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 12, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>arrow_back_ios_new</span>
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'white' }}>Messages</h1>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{contacts.length} conversations</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[['all', 'All'], ['pg', 'My PG'], ['enquiry', 'Enquiries']].map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)}
              style={{ flex: 1, padding: '7px 4px', border: 'none', borderRadius: 10, background: filter === val ? 'rgba(255,255,255,0.2)' : 'transparent', color: filter === val ? 'white' : 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {loading ? (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#94a3b8', animation: 'spin 1s linear infinite', display: 'block', marginBottom: 12 }}>sync</span>
            <p style={{ color: '#94a3b8', fontSize: 14 }}>Loading conversations...</p>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 56, color: '#dcfce7' }}>chat</span>
            <p style={{ color: '#166534', fontSize: 15, fontWeight: 600, marginTop: 12 }}>No conversations yet.</p>
            <p style={{ color: '#94a3b8', fontSize: 13 }}>Send an enquiry to a PG to start chatting.</p>
          </div>
        ) : (
          filteredContacts.map(contact => (
            <div key={contact.id} onClick={() => openChat(contact)}
              style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', marginBottom: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.04)', transition: 'transform 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.01)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: contact.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 17, flexShrink: 0 }}>
                {contact.initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 15, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contact.name}</p>
                <p style={{ margin: 0, fontSize: 12, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contact.sub}</p>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 8, background: (ROLE_COLORS[contact.role] || '#94a3b8') + '20', color: ROLE_COLORS[contact.role] || '#94a3b8', flexShrink: 0 }}>
                {contact.role === 'pg' ? 'My PG' : 'Enquiry'}
              </span>
            </div>
          ))
        )}
      </div>
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
