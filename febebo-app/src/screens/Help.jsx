import React, { useState } from 'react';
import { TopBar } from '../App';
import { ChevronDown, ChevronUp, Headset, Mail, FileText, Monitor } from 'lucide-react';
import supportImg from '../assets/support_illustration.png';
import './Help.css';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

const Help = () => {
  const { user } = useAuth();
  const [openSection, setOpenSection] = useState(null);

  const toggleSection = (section) => {
    setOpenSection(openSection === section ? null : section);
  };

  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailMessage, setEmailMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  // Custom Notification Modal State
  const [notification, setNotification] = useState({ show: false, title: '', message: '', type: 'success' });

  const handleSendEmail = async () => {
    if (!emailMessage.trim()) {
      setNotification({ show: true, title: 'Hold on', message: 'Please enter a message before sending.', type: 'error' });
      return;
    }
    
    setIsSending(true);
    try {
      // 1. Log to 'mail' collection (Trigger Email extension)
      await addDoc(collection(db, 'mail'), {
        to: 'febebo.in@gmail.com',
        message: {
          subject: `App Support Request from ${user?.name || 'Student'}`,
          text: `User Email: ${user?.email || 'N/A'}\nUser UID: ${user?.uid || 'N/A'}\n\nMessage:\n${emailMessage}`,
        },
        createdAt: serverTimestamp()
      });

      // 2. Also log to 'support_tickets' for dashboard fallback
      await addDoc(collection(db, 'support_tickets'), {
        userId: user?.uid || null,
        userName: user?.name || 'Student',
        userEmail: user?.email || '',
        message: emailMessage,
        status: 'open',
        createdAt: serverTimestamp()
      });

      setIsEmailModalOpen(false);
      setEmailMessage('');
      setNotification({ show: true, title: 'Sent Successfully!', message: 'Your message has been sent to our support team.', type: 'success' });
    } catch (err) {
      console.error(err);
      setNotification({ show: true, title: 'Error', message: 'Failed to send message. Please try again.', type: 'error' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="help-page-wrapper">
      {/* Background Waves */}
      <div className="help-wave-top"></div>
      <div className="help-wave-bottom"></div>

      <TopBar title="Help" />

      <div className="help-container">
        
        {/* Main Illustration Area */}
        <div className="help-illustration">
          <img 
            src={supportImg} 
            alt="Customer Support" 
            className="illus-generated" 
          />
        </div>

        {/* Greeting Text */}
        <h2 className="help-greeting">
          Hello, How can we<br/>Help you?
        </h2>

        {/* Accordions */}
        <div className="help-menu">

          <div className="help-item">
            <div className="help-item-header" onClick={() => toggleSection('contact')}>
              <div className="help-item-left">
                <Headset size={22} className="help-icon" strokeWidth={1.5} />
                <span>Contact us</span>
              </div>
              {openSection === 'contact' ? <ChevronUp size={20} className="help-chevron" /> : <ChevronDown size={20} className="help-chevron" />}
            </div>
            {openSection === 'contact' && (
              <div className="help-item-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ margin: 0, fontSize: 14, color: '#475569' }}>Have a question? We are here to help!</p>
                <a href="tel:+919599753435" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: '#ecfdf5', color: '#10b981', borderRadius: '12px', textDecoration: 'none', fontWeight: 700, border: '1px solid #d1fae5' }}>
                  <Headset size={18} strokeWidth={2.5} />
                  Call Support
                </a>
              </div>
            )}
          </div>

          <div className="help-item">
            <div className="help-item-header" onClick={() => setIsEmailModalOpen(true)}>
              <div className="help-item-left">
                <Mail size={22} className="help-icon" strokeWidth={1.5} />
                <span>Send us an E-mail</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Email Popup Modal */}
      {isEmailModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setIsEmailModalOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }} />
          <div style={{ background: 'white', borderRadius: 24, padding: 24, width: '90%', maxWidth: 360, position: 'relative', zIndex: 1, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                  <Mail size={20} strokeWidth={2.5} />
                </div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#064e3b' }}>Write to us</h3>
              </div>
              <button onClick={() => setIsEmailModalOpen(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569' }}>✕</button>
            </div>

            <p style={{ margin: '0 0 16px', fontSize: 14, color: '#475569', lineHeight: 1.5 }}>
              Describe the problem you are facing in the app, and our team will get back to you shortly.
            </p>

            <textarea 
              autoFocus
              placeholder="E.g., I'm unable to view my payment history..."
              value={emailMessage}
              onChange={(e) => setEmailMessage(e.target.value)}
              style={{ width: '100%', height: 120, padding: 14, borderRadius: 16, border: '2px solid #e2e8f0', background: '#f8fafc', fontSize: 14, resize: 'none', fontFamily: 'inherit', color: '#0f172a', marginBottom: 16, boxSizing: 'border-box' }}
            />

            <button 
              onClick={handleSendEmail}
              disabled={isSending}
              style={{ width: '100%', padding: 16, background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: 16, fontWeight: 800, fontSize: 16, color: 'white', cursor: isSending ? 'not-allowed' : 'pointer', opacity: isSending ? 0.7 : 1, boxShadow: '0 4px 12px rgba(16,185,129,0.3)', transition: 'transform 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {isSending ? 'Sending...' : 'Send E-mail'}
              {!isSending && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>}
            </button>
          </div>
        </div>
      )}

      {/* Success/Error Modal */}
      {notification.show && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setNotification({ ...notification, show: false })} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }} />
          <div style={{ background: 'white', borderRadius: 20, padding: 24, width: '90%', maxWidth: 340, position: 'relative', zIndex: 1, boxShadow: '0 10px 25px rgba(0,0,0,0.1)', textAlign: 'center' }}>
            <div style={{ background: notification.type === 'success' ? '#166534' : '#ef4444', width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              {notification.type === 'success' ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
              )}
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, color: notification.type === 'success' ? '#166534' : '#ef4444' }}>{notification.title}</h3>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: '#475569', lineHeight: 1.5 }}>
              {notification.message}
            </p>
            <button 
              onClick={() => setNotification({ ...notification, show: false })} 
              style={{ width: '100%', padding: '12px', background: notification.type === 'success' ? '#166534' : '#ef4444', border: 'none', borderRadius: 12, fontWeight: 700, color: 'white', cursor: 'pointer' }}
            >
              Done
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Help;
