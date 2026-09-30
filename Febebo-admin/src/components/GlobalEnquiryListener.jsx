import React, { useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

export default function GlobalEnquiryListener() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    let initialLoad = true;
    const q = query(collection(db, 'enquiries'), where('adminId', '==', user.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!initialLoad) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            
            // Show notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('New Enquiry', { body: `${data.tenantName || 'A student'} sent an enquiry!` });
            } else {
              // Fallback to custom event for PWA toast or standard alert
              alert(`New Enquiry from ${data.tenantName || 'A student'}!`);
            }
          }
        });
      }
      initialLoad = false;
    });

    // Request notification permission if possible
    if ('Notification' in window && Notification.permission !== 'denied' && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    let initialLoadApps = true;
    const qApps = query(collection(db, 'pg_applications'), where('adminId', '==', user.uid));
    
    const unsubApps = onSnapshot(qApps, (snapshot) => {
      if (!initialLoadApps) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('New Application', { body: `${data.tenantName || 'A student'} submitted a PG application!` });
            } else {
              alert(`New PG Application from ${data.tenantName || 'A student'}!`);
            }
          }
        });
      }
      initialLoadApps = false;
    });

    return () => unsubApps();
  }, [user]);

  return null;
}
