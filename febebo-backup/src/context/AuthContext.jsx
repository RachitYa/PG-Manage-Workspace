import React, { createContext, useContext, useState, useEffect } from 'react';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext(null);


export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // We will store all users in a 'users' collection with a role attribute
          const docRef = doc(db, 'users', firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
             const data = docSnap.data();
             setUser({
               uid: firebaseUser.uid,
               email: firebaseUser.email,
               name: firebaseUser.displayName || data.name,
               photoURL: firebaseUser.photoURL,
               role: data.role,
               hasProfile: data.hasProfile || false
             });
          } else {
             // If user doc doesn't exist, we check if they were in the old pg_owners collection
             const ownerRef = doc(db, 'pg_owners', firebaseUser.uid);
             const ownerSnap = await getDoc(ownerRef);
             if (ownerSnap.exists()) {
               setUser({
                 uid: firebaseUser.uid,
                 email: firebaseUser.email,
                 name: firebaseUser.displayName,
                 photoURL: firebaseUser.photoURL,
                 role: 'admin',
                 hasProfile: true
               });
             } else {
               // Brand new user without a role yet
               setUser({
                 uid: firebaseUser.uid,
                 email: firebaseUser.email,
                 name: firebaseUser.displayName,
                 photoURL: firebaseUser.photoURL,
                 role: null, 
                 hasProfile: false
               });
             }
          }
        } catch (error) {
          console.error("Firestore Error:", error);
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            role: null,
            hasProfile: false
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    // Force account selection each time
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, provider);
  };



  const loginWithEmail = async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signupWithEmail = async (email, password, name) => {
    const res = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(res.user, { displayName: name });
    
    const docRef = doc(db, 'users', res.user.uid);
    await setDoc(docRef, { name, email, role: null, hasProfile: false }, { merge: true });

    setUser(prev => prev ? { ...prev, name } : null);
    
    return res;
  };

  const setRole = async (role) => {
    if (user) {
      const docRef = doc(db, 'users', user.uid);
      await setDoc(docRef, { role, name: user.name || '', email: user.email, hasProfile: false }, { merge: true });
      setUser(prev => ({ ...prev, role }));
    }
  };

  const completeProfile = async () => {
    if (user) {
      const docRef = doc(db, 'users', user.uid);
      await setDoc(docRef, { hasProfile: true }, { merge: true });
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

  return (
    <AuthContext.Provider value={{ user, loginWithGoogle, loginWithEmail, signupWithEmail, setRole, logout, completeProfile, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
