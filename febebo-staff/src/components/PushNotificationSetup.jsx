import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Capacitor } from '@capacitor/core';

export default function PushNotificationSetup() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || Capacitor.getPlatform() === 'web') return;

    const setupPush = async () => {
      try {
        let permStatus = await PushNotifications.checkPermissions();
        
        if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
          console.log('Push notification permission denied');
          return;
        }

        await PushNotifications.register();
      } catch (err) {
        console.error("Push Notifications Setup Error:", err);
      }
    };

    setupPush();

    const addListeners = async () => {
      await PushNotifications.addListener('registration', async (token) => {
        try {
          if (user.uid || user.id) {
            await updateDoc(doc(db, 'users', user.uid || user.id), {
              fcmToken: token.value
            });
          }
        } catch (e) {
          console.error("Error saving FCM token:", e);
        }
      });

      await PushNotifications.addListener('registrationError', (err) => {
        console.error('Registration error: ', err.error);
      });

      await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push notification received: ', notification);
      });

      await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Push notification action performed', notification.actionId, notification.inputValue);
      });
    };

    addListeners();

    return () => {
      if (Capacitor.getPlatform() !== 'web') {
        PushNotifications.removeAllListeners();
      }
    };
  }, [user]);

  return null;
}
