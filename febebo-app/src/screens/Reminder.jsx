import React, { useState, useEffect } from 'react';
import { TopBar } from '../App';
import BottomNav from '../components/BottomNav';
import { Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import './Reminder.css';

const Reminder = () => {
  const { user } = useAuth();
  const [reminders, setReminders] = useState([]);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, 'users', user.uid, 'reminders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReminders(snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  return (
    <div className="page-content pb-nav" style={{ background: '#f8fafc', minHeight: '100vh' }}>
      <TopBar title="Reminders" />

      {reminders.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 32px', gap: '16px', textAlign: 'center' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bell size={36} color="#0891b2" />
          </div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>No Reminders Yet</h3>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748b', lineHeight: '1.6' }}>
            Payment reminders and due dates will appear here once your account is connected to your PG.
          </p>
        </div>
      ) : (
        <div style={{ padding: '16px' }}>
          {reminders.map(reminder => (
            <div key={reminder.docId} style={{ background: '#fff', padding: '16px', borderRadius: '12px', marginBottom: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>{reminder.title}</h4>
                <span style={{ fontSize: '12px', color: '#64748b' }}>{reminder.date}</span>
              </div>
              <p style={{ margin: 0, fontSize: '14px', color: '#475569' }}>{reminder.message}</p>
            </div>
          ))}
        </div>
      )}

      <BottomNav activeNav="reminder" />
    </div>
  );
};

export default Reminder;
