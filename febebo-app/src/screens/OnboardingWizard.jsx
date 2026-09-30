import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc, getDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useLoading } from '../context/LoadingContext';
import { Camera, ImageIcon, CheckCircle2, RefreshCw } from 'lucide-react';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import './OnboardingWizard.css';

const OnboardingWizard = () => {
  const navigate = useNavigate();
  const { user, completeProfile } = useAuth();
  const { startLoading, stopLoading } = useLoading();
  
  const [loading, setLoading] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [error, setError] = useState('');

  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          const MAX_SIZE = 600;
          if (width > height) {
            if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
          } else {
            if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
      };
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      e.target.value = '';
      startLoading();
      try {
        const compressedDataUrl = await compressImage(file);
        setProfilePhoto(compressedDataUrl);
      } catch (err) {
        console.error("Error compressing image", err);
      } finally {
        stopLoading();
      }
    }
  };

  // Camera button — uses Capacitor Camera plugin on Android (real camera),
  // falls back to file input on web browser
  const triggerCamera = async () => {
    if (Capacitor.isNativePlatform()) {
      startLoading();
      try {
        const photo = await CapCamera.getPhoto({
          quality: 80,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,   // opens camera directly, not gallery
          width: 600,
          height: 600,
          correctOrientation: true,
        });
        if (photo.dataUrl) {
          setProfilePhoto(photo.dataUrl);
        }
      } catch (err) {
        // User cancelled or permission denied — do nothing silently
        if (!String(err).includes('cancelled') && !String(err).includes('cancel')) {
          console.error('Camera error:', err);
        }
      } finally {
        stopLoading();
      }
    } else {
      // Web fallback: use file input with capture hint
      if (cameraInputRef.current) cameraInputRef.current.click();
    }
  };

  const triggerGallery = () => {
    if (galleryInputRef.current) galleryInputRef.current.click();
  };

  const clearPhoto = (e) => {
    e.stopPropagation();
    setProfilePhoto(null);
  };


  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    startLoading();
    
    setError('');
    
    // Check if phone number is already used by another user
    try {
      const q = query(collection(db, 'users'), where('phone', '==', phone));
      const snap = await getDocs(q);
      const isUsedByOther = snap.docs.some(doc => doc.id !== user.uid);
      if (isUsedByOther) {
        setError('This phone number is already registered to another user.');
        setLoading(false);
        stopLoading();
        return;
      }
    } catch (err) {
      console.error("Error checking phone", err);
    }

    let finalProfileData = {
      profileCompleted: true,
      joinDate: new Date().toISOString(),
      name: name,
      email: email,
      phone: phone,
      kyc: {
        profilePhoto: profilePhoto,
        policeVerification: 'Pending'
      }
    };

    try {
      await setDoc(doc(db, 'users', user.uid), finalProfileData, { merge: true });
      if (completeProfile) completeProfile();
    } catch (err) {
      console.error("Error saving profile: ", err);
      alert("Error saving profile. The file size might be too large or permissions failed.");
    } finally {
      setLoading(false);
      stopLoading();
    }
  };

  const isFormValid = () => {
    return name && email && phone && profilePhoto;
  };

  const PhotoPicker = ({ image }) => (
    <div className="wizard-photo-picker">
      {image ? (
        <div className="wizard-photo-preview">
          <img src={image} alt="Profile" className="wizard-preview-img" />
          <div className="wizard-photo-preview-overlay">
            <CheckCircle2 size={28} color="#fff" />
            <span className="wizard-preview-label">Looks great!</span>
          </div>
          <button className="wizard-retake-btn" onClick={clearPhoto}>
            <RefreshCw size={14} />
            Retake
          </button>
        </div>
      ) : (
        <div className="wizard-photo-options">
          <button className="wizard-photo-option camera" onClick={triggerCamera}>
            <div className="wizard-photo-option-icon">
              <Camera size={26} color="#166534" />
            </div>
            <span className="wizard-photo-option-title">Camera</span>
            <span className="wizard-photo-option-sub">Take a selfie now</span>
          </button>
          <button className="wizard-photo-option gallery" onClick={triggerGallery}>
            <div className="wizard-photo-option-icon">
              <ImageIcon size={26} color="#166534" />
            </div>
            <span className="wizard-photo-option-title">Gallery</span>
            <span className="wizard-photo-option-sub">Pick from device</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="wizard-root">
      <div className="wizard-glass-card">
        {/* Hidden camera input – uses front-facing camera on mobile */}
        <input
          type="file"
          accept="image/*"
          capture="user"
          ref={cameraInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        {/* Hidden gallery input – opens file picker */}
        <input
          type="file"
          accept="image/*"
          ref={galleryInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        <div className="wizard-header-row">
          <div style={{ width: 40 }} />
          <h2 className="wizard-title">Setup Profile</h2>
          <div style={{ width: 40 }} />
        </div>

        <div className="wizard-step-content">
          <h1 className="wizard-step-heading">Personal Details</h1>
          <p className="wizard-step-subtext">Just a few details before you get started.</p>
          
          <div className="wizard-input-group">
            <label className="wizard-label">Full Name</label>
            <input type="text" className="wizard-input" value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" />
          </div>

          <div className="wizard-input-group">
            <label className="wizard-label">Email Address</label>
            <input type="email" className="wizard-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="john@example.com" />
          </div>

          <div className="wizard-input-group">
            <label className="wizard-label">Phone Number</label>
            <input type="tel" className="wizard-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="10-digit number" />
          </div>

          <div className="wizard-input-group">
            <label className="wizard-label">Your Profile Photo</label>
            <PhotoPicker image={profilePhoto} />
          </div>

          {error && <div className="error-message" style={{ color: '#ef4444', fontSize: '14px', marginTop: '16px', textAlign: 'center' }}>{error}</div>}
        </div>

        <div className="wizard-footer">
          <button 
            className="wizard-btn-primary"
            onClick={handleSubmit} 
            disabled={!isFormValid() || loading}
          >
            {loading ? 'Submitting...' : 'Complete Profile'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;
