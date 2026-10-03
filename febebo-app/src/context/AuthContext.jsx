import React, { createContext, useContext, useState, useEffect } from 'react';
import { GoogleAuthProvider, signInWithPopup, signInWithCredential, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, query, where, getDocs, collection } from 'firebase/firestore';
import { auth, db } from '../firebase';

import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeUser = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const docRef = doc(db, 'users', firebaseUser.uid);
          
          unsubscribeUser = onSnapshot(docRef, (docSnap) => {
            let hasLoc = false;
            let locData = null;
            let profileData = null;
            if (docSnap.exists()) {
              profileData = docSnap.data();
              if (profileData.location) {
                hasLoc = true;
                locData = profileData.location;
              }
            }

            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: profileData?.name || firebaseUser.displayName, // Use firestore name first if edited
              photoURL: firebaseUser.photoURL,
              hasProfile: docSnap.exists() && profileData?.profileCompleted,
              hasLocation: hasLoc,
              locationData: locData,
              profileData: profileData,
              hasPG: docSnap.exists() && !!profileData?.subscribedPG,
              subscribedPG: profileData?.subscribedPG || null,
              pgStatus: profileData?.subscribedPG?.status || profileData?.pgStatus || null,
              detailsFilled: profileData?.detailsFilled || false,
              serviceType: profileData?.serviceType || 'all_services', // 'only_room' | 'all_services'
            });
            setLoading(false);
          }, (error) => {
            console.error("Firestore Permission Error:", error);
            // Fallback user if snapshot fails
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              hasProfile: false,
              hasLocation: false,
              locationData: null,
              profileData: null,
              hasPG: false,
              subscribedPG: null
            });
            setLoading(false);
          });
        } catch (error) {
          console.error("Error setting up snapshot:", error);
          setLoading(false);
        }
      } else {
        setUser(null);
        if (unsubscribeUser) {
          unsubscribeUser();
          unsubscribeUser = null;
        }
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, []);

  const loginWithGoogle = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const result = await FirebaseAuthentication.signInWithGoogle({ useCredentialManager: false });
        const credential = GoogleAuthProvider.credential(result.credential?.idToken);
        await signInWithCredential(auth, credential);
      } else {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        await signInWithPopup(auth, provider);
      }
    } catch (error) {
      console.error("Error signing in with Google", error);
      alert("Error signing in with Google: " + (error.message || error));
    }
  };

  const signupWithEmail = async (email, password, firstName, lastName, phone) => {
    try {
      // 1. Create the Firebase Auth user first (this authenticates the user session)
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // 2. Now that the user is authenticated, check phone uniqueness if provided
      if (phone) {
        try {
          const q = query(collection(db, 'users'), where('phone', '==', phone));
          const snap = await getDocs(q);
          const duplicates = snap.docs.filter(d => d.id !== userCredential.user.uid);
          if (duplicates.length > 0) {
            await userCredential.user.delete().catch(() => {});
            throw new Error('This phone number is already registered to another user.');
          }
        } catch (phoneErr) {
          if (phoneErr.message.includes('already registered')) {
            throw phoneErr;
          }
          // If firestore rules prevent querying entire users collection, proceed gracefully
          console.warn("Could not verify phone uniqueness:", phoneErr);
        }
      }

      await updateProfile(userCredential.user, {
        displayName: `${firstName} ${lastName}`.trim()
      });
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        name: `${firstName} ${lastName}`.trim(),
        email: email,
        phone: phone || '',
        createdAt: new Date().toISOString()
      }, { merge: true });
      // the onAuthStateChanged will handle the rest
    } catch (error) {
      console.error("Error signing up with email", error);
      throw error;
    }
  };

  const loginWithEmail = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Error logging in with email", error);
      alert(error.message);
      throw error;
    }
  };

  const completeProfile = () => {
    if (user) {
      setUser(prev => ({ ...prev, hasProfile: true }));
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  const subscribeToPG = async (pgId, pgData) => {
    if (!auth.currentUser) return;
    try {
      // 1. Update user profile
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        subscribedPG: { pgId, ...pgData }
      }, { merge: true });
      
      // 2. Add to top-level tenants collection for Admin App syncing
      const tenantData = {
        adminId: pgId,
        tenantId: auth.currentUser.uid,
        name: auth.currentUser.displayName || user?.name || 'Student',
        roomNo: user?.profileData?.roomDetails?.roomNumber || 'Unassigned',
        rentAmount: Number(pgData.leaseAmount) || 0,
        dateOfJoining: new Date().toISOString()
      };
      await setDoc(doc(db, 'tenants', auth.currentUser.uid), tenantData, { merge: true });

      setUser(prev => ({ ...prev, hasPG: true, subscribedPG: { pgId, ...pgData } }));
    } catch (error) {
      console.error('Error subscribing to PG:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loginWithGoogle, signupWithEmail, loginWithEmail, subscribeToPG, logout, completeProfile, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
