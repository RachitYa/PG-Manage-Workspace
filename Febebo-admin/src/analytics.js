import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export const logAppEvent = async (eventName, eventData = {}) => {
  try {
    const analyticsRef = collection(db, 'analytics_events');
    await addDoc(analyticsRef, {
      eventName,
      ...eventData,
      timestamp: serverTimestamp(),
      app: 'Febebo-admin',
      platform: 'web'
    });
  } catch (error) {
    console.error("Failed to log analytics event:", error);
  }
};
