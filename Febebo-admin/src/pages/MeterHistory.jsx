import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

export default function MeterHistory() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, activePgId } = useAuth();
  
  const [bills, setBills] = useState([]);
  const [meter, setMeter] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid || !id) return;
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const mDoc = await getDoc(doc(db, 'meters', id));
        if (mDoc.exists()) setMeter(mDoc.data());

        const q = query(collection(db, 'meter_bills'), where('meterId', '==', id));
        const snap = await getDocs(q);
        const fetched = [];
        snap.forEach(d => fetched.push({ id: d.id, ...d.data() }));
        fetched.sort((a,b) => new Date(b.date) - new Date(a.date));
        setBills(fetched);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [user, id]);

  return (
    <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", backgroundColor: '#f1f5f9', minHeight: '100vh', maxWidth: 480, margin: '0 auto', paddingBottom: 40, position: 'relative' }}>
      <div style={{ background: 'linear-gradient(135deg, #0c1a2e, #0f2847)', color: 'white', paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))', padding: '20px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: 8, borderRadius: '50%', display: 'flex', cursor: 'pointer' }}>
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", margin: 0, fontSize: '1.4rem', fontWeight: 600 }}>Meter History</h1>
          <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>Room {meter?.roomName || '...'}</p>
        </div>
      </div>

      <div style={{ padding: 20 }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: '#64748b' }}>Loading history...</p>
        ) : bills.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: 'white', borderRadius: 16 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#cbd5e1', marginBottom: 12 }}>history</span>
            <h3 style={{ margin: '0 0 8px', color: '#0f172a' }}>No History Yet</h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Bills generated will appear here.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {bills.map(b => (
              <div key={b.id} style={{ background: 'white', borderRadius: 16, padding: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <p style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>{new Date(b.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  <p style={{ margin: 0, fontWeight: 800, color: '#0891b2', fontSize: '1.1rem' }}>₹{Number(b.billAmount).toFixed(2)}</p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b', background: '#f8fafc', padding: '8px 12px', borderRadius: 8 }}>
                  <span>Prev: <strong>{b.prevReading}</strong></span>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_right_alt</span>
                  <span>Curr: <strong>{b.currReading}</strong></span>
                  <span>Used: <strong>{b.currReading - b.prevReading}</strong></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
