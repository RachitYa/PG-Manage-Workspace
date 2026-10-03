import { db, auth } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export const logAppEvent = async (eventName, eventData = {}) => {
  try {
    if (!auth?.currentUser) {
      // Skip firestore write if user is not authenticated yet
      return;
    }
    const analyticsRef = collection(db, 'analytics_events');
    await addDoc(analyticsRef, {
      eventName,
      userId: auth.currentUser?.uid || 'anonymous',
      ...eventData,
      timestamp: serverTimestamp(),
      app: 'febebo-app',
      platform: 'web'
    });
  } catch (error) {
    // Suppress background analytics logging errors
    console.debug("Analytics event skipped:", error?.code || error?.message);
  }
};
