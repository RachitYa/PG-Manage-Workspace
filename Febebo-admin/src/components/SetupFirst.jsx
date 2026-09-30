import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function SetupFirst({ 
  moduleName, 
  title, 
  description, 
  initialData = {}, 
  children 
}) {
  const [loading, setLoading] = useState(true);
  const [isSetup, setIsSetup] = useState(false);
  const [settingUp, setSettingUp] = useState(false);

  useEffect(() => {
    const checkSetup = async () => {
      try {
        const docRef = doc(db, 'system_setup', moduleName);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().isSetup) {
          setIsSetup(true);
        }
      } catch (error) {
        console.error(`Error checking setup for ${moduleName}:`, error);
      } finally {
        setLoading(false);
      }
    };
    checkSetup();
  }, [moduleName]);

  const handleSetup = async () => {
    setSettingUp(true);
    try {
      // Create the setup document flag
      await setDoc(doc(db, 'system_setup', moduleName), { 
        isSetup: true,
        setupDate: new Date().toISOString()
      });
      
      // If there's a specific collection to initialize, we can also do that here
      // For now, setting the flag is enough to unblock the UI.
      // Individual pages will handle writing their actual initial arrays if needed,
      // or we can pass an `onSetup` callback.
      
      setIsSetup(true);
    } catch (error) {
      console.error(`Error setting up ${moduleName}:`, error);
      alert("Failed to setup module: " + error.message);
    } finally {
      setSettingUp(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '400px' }}>
        <div style={{ color: '#0f172a', fontWeight: 500 }}>Checking module status...</div>
      </div>
    );
  }

  if (isSetup) {
    return <>{children}</>;
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', padding: 24, fontFamily: "'Hanken Grotesk',sans-serif"
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)',
        borderRadius: 24, padding: 40, maxWidth: 480, width: '100%',
        boxShadow: '0 8px 32px rgba(161, 136, 17, 0.15)', border: '1px solid rgba(255, 255, 255, 0.6)',
        textAlign: 'center'
      }}>
        <div style={{
          width: 80, height: 80, background: '#fef08a', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px', color: '#a16207'
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 40 }}>settings_suggest</span>
        </div>
        
        <h2 style={{ margin: '0 0 16px 0', fontSize: 24, color: '#422006', fontWeight: 700 }}>
          Setup Required: {title}
        </h2>
        <p style={{ margin: '0 0 32px 0', fontSize: 16, color: '#713f12', lineHeight: 1.5 }}>
          {description || `This module needs to be configured before you can start managing ${title.toLowerCase()}. Click below to initialize the default settings and database collections.`}
        </p>

        <button 
          onClick={handleSetup}
          disabled={settingUp}
          style={{
            background: 'linear-gradient(135deg, #ca8a04 0%, #a16207 100%)',
            color: 'white', border: 'none', padding: '16px 32px', borderRadius: 12,
            fontSize: 16, fontWeight: 600, cursor: settingUp ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 12px rgba(202, 138, 4, 0.3)', width: '100%',
            transition: 'all 0.2s', opacity: settingUp ? 0.7 : 1
          }}
        >
          {settingUp ? 'Initializing...' : 'Setup Now'}
        </button>
      </div>
    </div>
  );
}
