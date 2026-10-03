import React, { useState, useEffect } from 'react';
import { doc, updateDoc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const cyan = '#14b8a6'; // Matching primary app color or use '#0891b2'

export default function StudentDetailsModal({ isOpen, onClose, user, activeContact, chatId, setSuccessMessage }) {
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('student'); // student, working, others

  // Form State
  const [fatherName, setFatherName] = useState('');
  const [fatherPhone, setFatherPhone] = useState('');
  const [motherName, setMotherName] = useState('');
  const [motherPhone, setMotherPhone] = useState('');
  
  const [collegeName, setCollegeName] = useState('');
  const [course, setCourse] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState('');
  const [otherDesc, setOtherDesc] = useState('');
  
  const [aadharNumber, setAadharNumber] = useState('');
  const [aadharFront, setAadharFront] = useState('');
  const [aadharBack, setAadharBack] = useState('');
  
  const [dob, setDob] = useState('');
  
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [permanentAddress, setPermanentAddress] = useState('');
  const [correspondingAddress, setCorrespondingAddress] = useState('');
  const [institutionAddress, setInstitutionAddress] = useState('');

  // Prefill existing personal/KYC details if student was previously registered or removed
  useEffect(() => {
    if (!user) return;
    const pd = user.profileData || {};
    const kd = user.kycData || pd.kycData || {};
    const k = user.kyc || pd.kyc || {};
    const parents = user.parentsDetails || pd.parentsDetails || {};
    const emg = user.emergencyContact || pd.emergencyContact || {};
    const occ = user.occupation || pd.occupation || {};

    if (kd.fatherName || parents.fatherName) setFatherName(kd.fatherName || parents.fatherName || '');
    if (kd.fatherPhone || parents.fatherPhone) setFatherPhone(kd.fatherPhone || parents.fatherPhone || '');
    if (kd.motherName || parents.motherName) setMotherName(kd.motherName || parents.motherName || '');
    if (kd.motherPhone || parents.motherPhone) setMotherPhone(kd.motherPhone || parents.motherPhone || '');

    if (kd.collegeName || occ.details) setCollegeName(kd.collegeName || (occ.type === 'student' ? occ.details : '') || '');
    if (occ.role) setCourse(occ.role || '');
    if (kd.companyName || occ.details) setCompanyName(kd.companyName || (occ.type === 'working' ? occ.details : '') || '');
    if (occ.role) setRole(occ.role || '');
    if (occ.details && occ.type === 'others') setOtherDesc(occ.details || '');
    if (occ.type) setTab(occ.type);
    else if (kd.occupationType) setTab(kd.occupationType === 'Working Professional' ? 'working' : 'student');

    if (kd.aadharNumber || k.aadharNumber || user.aadhar) setAadharNumber(kd.aadharNumber || k.aadharNumber || user.aadhar || '');
    if (kd.aadharFront || k.aadharFront) setAadharFront(kd.aadharFront || k.aadharFront || '');
    if (kd.aadharBack || k.aadharBack) setAadharBack(kd.aadharBack || k.aadharBack || '');

    if (kd.dob || user.dob || pd.dob) setDob(kd.dob || user.dob || pd.dob || '');

    if (emg.name) setEmergencyName(emg.name || '');
    if (emg.phone) setEmergencyPhone(emg.phone || '');
    if (emg.bloodGroup || kd.bloodGroup) setBloodGroup(emg.bloodGroup || kd.bloodGroup || '');

    if (user.email || pd.email) setEmail(user.email || pd.email || '');
    if (kd.permanentAddress || user.permanentAddress || pd.permanentAddress) setPermanentAddress(kd.permanentAddress || user.permanentAddress || pd.permanentAddress || '');
    if (kd.correspondingAddress || user.correspondingAddress || pd.correspondingAddress) setCorrespondingAddress(kd.correspondingAddress || user.correspondingAddress || pd.correspondingAddress || '');
    if (occ.address) setInstitutionAddress(occ.address || '');
  }, [user, isOpen]);

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const max_size = 800;

          if (width > height) {
            if (width > max_size) {
              height *= max_size / width;
              width = max_size;
            }
          } else {
            if (height > max_size) {
              width *= max_size / height;
              height = max_size;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleImageChange = async (e, type) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const compressedDataUrl = await compressImage(file);
        if (type === 'front') setAadharFront(compressedDataUrl);
        else setAadharBack(compressedDataUrl);
      } catch (err) {
        console.error("Error compressing image", err);
        alert("Failed to process image.");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.uid || !chatId) return;

    if (!aadharNumber || !aadharFront || !aadharBack) {
      alert("Aadhaar details and photos are required.");
      return;
    }

    setLoading(true);
    try {
      // 1. Update user document
      const userRef = doc(db, 'users', user.uid);
            const updateData = {
        parentsDetails: { fatherName, fatherPhone, motherName, motherPhone },
        emergencyContact: { name: emergencyName, phone: emergencyPhone, bloodGroup },
        occupation: {
          type: tab,
          details: tab === 'student' ? collegeName : tab === 'working' ? companyName : otherDesc,
          role: tab === 'student' ? course : tab === 'working' ? role : '',
          address: institutionAddress
        },
        'kyc.aadharNumber': aadharNumber,
        'kyc.aadharFront': aadharFront,
        'kyc.aadharBack': aadharBack,
        'kycData.aadharNumber': aadharNumber,
        'kycData.aadharFront': aadharFront,
        'kycData.aadharBack': aadharBack,
        'kycData.bloodGroup': bloodGroup,
        'kycData.permanentAddress': permanentAddress,
        'kycData.correspondingAddress': correspondingAddress,
        dob: dob,
        email: email,
        permanentAddress: permanentAddress,
        correspondingAddress: correspondingAddress,
        detailsFilled: true,
        'subscribedPG.kycStatus': 'under_review'
      };

      await updateDoc(userRef, updateData);

      const targetAdminId = activeContact?.id || user?.subscribedPG?.adminId || user?.subscribedPG?.pgId;
      const targetPgId = activeContact?.pgId || user?.subscribedPG?.pgId || targetAdminId;

      try {
        await setDoc(doc(db, 'tenants', user.uid), {
          adminId: targetAdminId,
          pgId: targetPgId,
          detailsFilled: true
        }, { merge: true });
      } catch (e) {
        console.warn('Could not merge tenants doc:', e);
      }

      // Send notification to admin
      await addDoc(collection(db, 'notifications'), {
        adminId: targetAdminId,
        pgId: targetPgId,
        tenantId: user.uid,
        studentName: user.name || 'Student',
        type: 'Student Details Review',
        title: 'Review Student Details',
        desc: `${user.name || 'Student'} has filled out their registration details and is waiting for approval.`,
        timestamp: serverTimestamp(),
        resolved: false
      });

      // Also send a system message to chat for context
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text: `✅ Registration details have been submitted and sent to admin for approval.`,
        senderId: user.uid,
        senderName: user.name || 'Student',
        timestamp: serverTimestamp(),
        read: false,
        isSystem: true
      });

      setSuccessMessage('Registration details submitted successfully!');
      onClose();
    } catch (err) {
      console.error('Error submitting details:', err);
      alert('Failed to submit details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const inputStyle = { width: '100%', padding: '12px', borderRadius: 12, border: '1.5px solid #e2e8f0', outline: 'none', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 4, textTransform: 'uppercase' };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={() => { if (user?.detailsFilled) onClose(); }} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)' }} />
      <div style={{ position: 'relative', background: 'white', borderRadius: '24px 24px 0 0', padding: '24px 20px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        
        <div style={{ padding: 24, borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white', zIndex: 10, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: '#0f172a' }}>Resident Details</h2>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Complete your profile for KYC verification.</p>
          </div>
          {user?.detailsFilled && (
            <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#475569' }}>close</span>
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Parents Details */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#334155', marginBottom: 12 }}>Parents Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Father's Name</label>
                <input required style={inputStyle} value={fatherName} onChange={e=>setFatherName(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Father's Phone</label>
                <input required type="tel" style={inputStyle} value={fatherPhone} onChange={e=>setFatherPhone(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Mother's Name (Optional)</label>
                <input style={inputStyle} value={motherName} onChange={e=>setMotherName(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Mother's Phone (Optional)</label>
                <input type="tel" style={inputStyle} value={motherPhone} onChange={e=>setMotherPhone(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Occupation */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#334155', marginBottom: 12 }}>Occupation</h3>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, background: '#f1f5f9', padding: 4, borderRadius: 12 }}>
              {['student', 'working', 'others'].map(t => (
                <button key={t} type="button" onClick={() => setTab(t)} style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 10, background: tab === t ? 'white' : 'transparent', color: tab === t ? cyan : '#64748b', fontWeight: 700, fontSize: 13, textTransform: 'capitalize', boxShadow: tab === t ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', cursor: 'pointer', transition: 'all 0.2s' }}>
                  {t}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {tab === 'student' && (
                <>
                  <div><label style={labelStyle}>College / School Name</label><input required style={inputStyle} value={collegeName} onChange={e=>setCollegeName(e.target.value)} /></div>
                  <div><label style={labelStyle}>Course / Degree</label><input required style={inputStyle} value={course} onChange={e=>setCourse(e.target.value)} /></div>
                </>
              )}
              {tab === 'working' && (
                <>
                  <div><label style={labelStyle}>Company Name</label><input required style={inputStyle} value={companyName} onChange={e=>setCompanyName(e.target.value)} /></div>
                  <div><label style={labelStyle}>Designation / Role</label><input required style={inputStyle} value={role} onChange={e=>setRole(e.target.value)} /></div>
                </>
              )}
              {tab === 'others' && (
                <div><label style={labelStyle}>Description</label><input required style={inputStyle} value={otherDesc} onChange={e=>setOtherDesc(e.target.value)} placeholder="E.g., Preparing for exams" /></div>
              )}
            </div>
          </div>

          {/* Identity & Emergency */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#334155', marginBottom: 12 }}>Identity & Emergency</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={labelStyle}>Aadhaar Number</label><input required style={inputStyle} value={aadharNumber} onChange={e=>setAadharNumber(e.target.value)} /></div>
                <div><label style={labelStyle}>Date of Birth</label><input required type="date" style={inputStyle} value={dob} onChange={e=>setDob(e.target.value)} /></div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Aadhaar Front Photo</label>
                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 100, border: '2px dashed #cbd5e1', borderRadius: 12, background: '#f8fafc', cursor: 'pointer', overflow: 'hidden' }}>
                    {aadharFront ? <img src={aadharFront} alt="Front" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <><span className="material-symbols-outlined" style={{ color: '#94a3b8' }}>upload</span><span style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Upload</span></>}
                    <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, 'front')} style={{ display: 'none' }} />
                  </label>
                </div>
                <div>
                  <label style={labelStyle}>Aadhaar Back Photo</label>
                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 100, border: '2px dashed #cbd5e1', borderRadius: 12, background: '#f8fafc', cursor: 'pointer', overflow: 'hidden' }}>
                    {aadharBack ? <img src={aadharBack} alt="Back" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <><span className="material-symbols-outlined" style={{ color: '#94a3b8' }}>upload</span><span style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Upload</span></>}
                    <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, 'back')} style={{ display: 'none' }} />
                  </label>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
                <div><label style={labelStyle}>Emergency Contact</label><input required style={inputStyle} placeholder="Name" value={emergencyName} onChange={e=>setEmergencyName(e.target.value)} /></div>
                <div><label style={labelStyle}>Emergency Phone</label><input required type="tel" style={inputStyle} placeholder="Phone" value={emergencyPhone} onChange={e=>setEmergencyPhone(e.target.value)} /></div>
              </div>

              {/* Blood Group */}
              <div>
                <label style={labelStyle}>Blood Group</label>
                <select required style={{ ...inputStyle, background: 'white', appearance: 'none', WebkitAppearance: 'none' }} value={bloodGroup} onChange={e => setBloodGroup(e.target.value)}>
                  <option value="">-- Select Blood Group --</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>
              
            </div>
          </div>

          {/* Address Details */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#334155', marginBottom: 12 }}>Address Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={labelStyle}>Permanent Address</label>
                <textarea
                  required
                  rows={3}
                  style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }}
                  placeholder="House No., Street, City, State, PIN"
                  value={permanentAddress}
                  onChange={e => setPermanentAddress(e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>Corresponding Address <span style={{ textTransform: 'none', fontWeight: 400, color: '#94a3b8' }}>(if different)</span></label>
                <textarea
                  rows={3}
                  style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }}
                  placeholder="Leave blank if same as permanent address"
                  value={correspondingAddress}
                  onChange={e => setCorrespondingAddress(e.target.value)}
                />
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} style={{ padding: '16px', background: cyan, color: 'white', border: 'none', borderRadius: 16, fontWeight: 800, fontSize: 16, marginTop: 12, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Submitting...' : 'Submit Details'}
          </button>
        </form>
      </div>
    </div>
  );
}
