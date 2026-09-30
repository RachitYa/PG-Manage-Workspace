import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  signOut,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { PushNotifications } from '@capacitor/push-notifications';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activePgId, setActivePgIdState] = useState(() => localStorage.getItem('activePgId') || 'primary');

  const switchPg = (pgId) => {
    localStorage.setItem('activePgId', pgId);
    setActivePgIdState(pgId);
    // Reload to ensure all components remount with new pgId data
    window.location.reload();
  };

  // Setup push notifications
  const setupPushNotifications = async (uid) => {
    if (!Capacitor.isNativePlatform()) return;

    try {
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.warn('User denied push notification permissions');
        return;
      }

      await PushNotifications.register();

      // Listener for registration
      PushNotifications.addListener('registration', async (token) => {
        console.log('Push registration success, token: ' + token.value);
        try {
          await updateDoc(doc(db, 'admins', uid), {
            fcmToken: token.value
          });
        } catch (e) {
          console.error('Error saving FCM token:', e);
        }
      });

      PushNotifications.addListener('registrationError', (error) => {
        console.error('Error on registration: ' + JSON.stringify(error));
      });

    } catch (err) {
      console.error('Error setting up push notifications:', err);
    }
  };

  useEffect(() => {
    let docUnsub = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const docRef = doc(db, 'admins', firebaseUser.uid);
        
        // Initial setup for doc if it doesn't exist
        try {
          const initialSnap = await getDoc(docRef);
          if (!initialSnap.exists()) {
            await setDoc(docRef, {
              role: 'admin',
              email: firebaseUser.email,
              name: firebaseUser.displayName || 'Admin User',
              hasProfile: false,
              isApproved: false // explicitly unapproved
            });
          }
        } catch (err) {
          console.warn('Could not fetch or set initial admin doc (likely offline):', err);
        }

        // Setup Real-time listener for this admin document
        docUnsub = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            const profileData = docSnap.data();
            setUser({
              id: firebaseUser.uid,
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: profileData.name || firebaseUser.displayName || 'Admin User',
              role: 'admin',
              hasProfile: profileData.hasProfile || false,
              isApproved: profileData.isApproved || false,
              ...profileData
            });
            setLoading(false);
          } else {
            // Should not happen since we just created it, but just in case
            setUser({
              id: firebaseUser.uid,
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: firebaseUser.displayName || 'Admin User',
              role: 'admin',
              hasProfile: false,
              isApproved: false
            });
            setLoading(false);
          }
        }, (error) => {
          console.error("Firestore onSnapshot error:", error);
          setLoading(false);
        });

        // Request Push Notification Permissions now that we are authenticated
        setupPushNotifications(firebaseUser.uid);

      } else {
        if (docUnsub) {
          docUnsub();
          docUnsub = null;
        }
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (docUnsub) docUnsub();
    };
  }, []);

  const loginWithEmail = async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signupWithEmail = async (email, password, firstName, lastName) => {
    const res = await createUserWithEmailAndPassword(auth, email, password);
    const fullName = `${firstName} ${lastName}`.trim();
    if (fullName) {
      await updateProfile(res.user, { displayName: fullName });
    }
    
    await setDoc(doc(db, 'admins', res.user.uid), {
      role: 'admin',
      email,
      name: fullName || 'Admin User',
      hasProfile: false,
      isApproved: false,
      createdAt: new Date().toISOString()
    });
  };

  const loginWithGoogle = async () => {
    if (Capacitor.isNativePlatform()) {
      const result = await FirebaseAuthentication.signInWithGoogle({ useCredentialManager: false });
      const credential = GoogleAuthProvider.credential(result.credential?.idToken);
      await signInWithCredential(auth, credential);
    } else {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    }
  };

  const logout = async () => {
    await signOut(auth);
    if (Capacitor.isNativePlatform()) {
      await FirebaseAuthentication.signOut();
    }
  };

  const completeProfile = async () => {
    if (user) {
      // Intentionally setting hasProfile to true, but keeping isApproved as false (or omitting to let it default)
      await setDoc(doc(db, 'admins', user.uid), { hasProfile: true, isApproved: false }, { merge: true });
      // The onSnapshot will automatically update the `user` context!
    }
  };

  const login = (email, role, extraData) => {
    console.warn("Using legacy login(), please migrate to loginWithEmail or loginWithGoogle.");
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      activePgId,
      switchPg,
      login,
      loginWithEmail, 
      signupWithEmail, 
      loginWithGoogle, 
      logout, 
      completeProfile, 
      loading 
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
