import React, { useState, useEffect } from 'react';
import { TopBar } from '../App';
import BottomNav from '../components/BottomNav';
import { Bus, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const Transport = () => {
  const { user } = useAuth();
  const [willUse, setWillUse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      if (!user?.uid) return;
      try {
        const docRef = doc(db, 'transport_status', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          // Check if the status is for tomorrow (or just generally assume it's current)
          // For simplicity, we just bind to the boolean.
          setWillUse(data.status || false);
        } else {
          setWillUse(false);
        }
      } catch (e) {
        console.error("Error fetching transport status:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, [user]);

  const handleUpdateStatus = async (status) => {
    if (!user?.uid || !user?.subscribedPG?.pgId) return;
    setSaving(true);
    setWillUse(status);
    
    try {
      const docRef = doc(db, 'transport_status', user.uid);
      await setDoc(docRef, {
        adminId: user.subscribedPG.adminId || user.subscribedPG.pgId,
        pgId: user.subscribedPG.adminId ? user.subscribedPG.pgId : 'primary',
        tenantId: user.uid,
        tenantName: user.name || 'Student',
        roomNo: user?.profileData?.roomDetails?.roomNumber || 'Unassigned',
        status: status,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.error("Error updating transport status:", e);
      alert("Failed to update status. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <div className="page-content bg-white pb-nav">
      <TopBar title="Transport" />
      
      <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center' }}>
        
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
          <Bus size={40} color="#166534" />
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '22px', fontWeight: '800' }}>Tomorrow's Transport</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '15px' }}>
            {tomorrowStr}
          </p>
        </div>

        <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', width: '100%', textAlign: 'center' }}>
          <p style={{ margin: '0 0 16px 0', color: '#334155', fontSize: '15px', fontWeight: '600' }}>Will you be using the PG vehicle?</p>
          
          {loading ? (
            <div style={{ color: '#94a3b8' }}>Loading your status...</div>
          ) : (
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => handleUpdateStatus(true)}
                disabled={saving}
                style={{
                  flex: 1, padding: '16px', borderRadius: '12px', border: '2px solid transparent',
                  background: willUse === true ? '#166534' : '#ffffff',
                  borderColor: willUse === true ? '#166534' : '#e2e8f0',
                  color: willUse === true ? '#ffffff' : '#64748b',
                  fontWeight: '700', fontSize: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                <CheckCircle2 size={24} color={willUse === true ? '#ffffff' : '#94a3b8'} />
                Yes, I'm going
              </button>

              <button 
                onClick={() => handleUpdateStatus(false)}
                disabled={saving}
                style={{
                  flex: 1, padding: '16px', borderRadius: '12px', border: '2px solid transparent',
                  background: willUse === false ? '#ef4444' : '#ffffff',
                  borderColor: willUse === false ? '#ef4444' : '#e2e8f0',
                  color: willUse === false ? '#ffffff' : '#64748b',
                  fontWeight: '700', fontSize: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                <XCircle size={24} color={willUse === false ? '#ffffff' : '#94a3b8'} />
                No, I'll skip
              </button>
            </div>
          )}
        </div>

        {willUse !== null && !loading && (
          <div style={{ marginTop: '12px', textAlign: 'center', padding: '12px 20px', background: willUse ? '#dcfce7' : '#fee2e2', borderRadius: '12px', color: willUse ? '#166534' : '#b91c1c', fontSize: '14px', fontWeight: '600', animation: 'fadeIn 0.3s' }}>
            {willUse ? "✅ Seat reserved for tomorrow." : "❌ You are marked as skipping tomorrow."}
          </div>
        )}

      </div>
      
      <BottomNav activeNav="" />
    </div>
  );
};

export default Transport;
