import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, orderBy } from 'firebase/firestore';

const cyan = '#0891b2';
const dark = '#0f172a';

export default function HelpSupport() {
  const navigate = useNavigate();
  const { user, activePgId } = useAuth();
  
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) return;
      try {
        const q = query(collection(db, 'superadmin_complaints'), where('adminId', '==', user.uid), where('pgId', '==', activePgId));
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.createdAt - a.createdAt);
        setHistory(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchHistory();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return alert("Please fill in all fields");
    setLoading(true);
    try {
      const newTicket = {
        adminId: user.uid, pgId: activePgId, 
        adminName: user.name || user.email.split('@')[0],
        adminEmail: user.email,
        subject,
        message,
        status: 'Pending',
        createdAt: Date.now()
      };
      const docRef = await addDoc(collection(db, 'superadmin_complaints'), newTicket);
      setHistory([{ id: docRef.id, ...newTicket }, ...history]);
      setSubject('');
      setMessage('');
      alert("Your request has been submitted to the Superadmin!");
    } catch (err) {
      console.error(err);
      alert("Failed to submit request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk', sans-serif", paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(160deg, #0c1a2e 0%, #0f2847 60%, #0c3461 100%)', paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))', padding: '0 20px 32px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(56,189,248,0.1)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, height: 64 }}>
          <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back_ios_new</span>
          </button>
          <h1 style={{ flex: 1, margin: 0, fontSize: 20, fontWeight: 800, color: 'white' }}>Help & Support</h1>
        </div>
        <div style={{ marginTop: 8 }}>
          <p style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: 'white', fontFamily: "'Bricolage Grotesque',sans-serif" }}>Need Assistance?</p>
          <p style={{ margin: 0, fontSize: 13, color: '#94a3b8', lineHeight: 1.4 }}>Reach out directly to the Superadmin for technical support, billing issues, or feature requests.</p>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {/* Form */}
        <div style={{ background: 'white', borderRadius: 20, border: '1px solid #bfdbfe', padding: 20, marginBottom: 20, boxShadow: '0 4px 20px rgba(8,145,178,0.08)' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Subject</label>
              <input type="text" value={subject} onChange={e => setSubject(e.target.value)} required placeholder="e.g. Bug with billing system" style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Message</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)} required placeholder="Describe your issue in detail..." rows={4} style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#f8fafc', boxSizing: 'border-box', resize: 'vertical' }} />
            </div>
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px 0', background: 'linear-gradient(135deg,#0891b2,#0e7490)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Submitting...' : 'Submit to Superadmin'}
            </button>
          </form>
        </div>

        {/* History */}
        <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 15, fontWeight: 800, color: dark, margin: '0 0 12px 4px' }}>Previous Requests</p>
        {history.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 16, padding: 30, textAlign: 'center', border: '1px dashed #cbd5e1' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#94a3b8', marginBottom: 8 }}>inbox</span>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>No previous requests found.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {history.map(t => (
              <div key={t.id} style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: dark }}>{t.subject}</p>
                  <span style={{ fontSize: 10, fontWeight: 800, padding: '4px 8px', borderRadius: 20, background: t.status === 'Resolved' ? '#ecfdf5' : '#fffbeb', color: t.status === 'Resolved' ? '#059669' : '#d97706', textTransform: 'uppercase' }}>
                    {t.status}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.4 }}>{t.message}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
