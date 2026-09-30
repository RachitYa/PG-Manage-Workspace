import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Field = ({ label, placeholder, type = 'text', value, onChange, required = false }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#1a1500', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 }}>
      {label} {required && <span style={{ color: '#e11d48' }}>*</span>}
    </label>
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      style={{
        width: '100%', padding: '14px',
        border: `1.5px solid #e8df9a`,
        borderRadius: 12, fontSize: 15, fontFamily: "'Hanken Grotesk',sans-serif",
        background: 'white', color: '#1a1500',
        outline: 'none', boxSizing: 'border-box',
        transition: 'all 0.2s'
      }}
    />
  </div>
);

const TextArea = ({ label, placeholder, value, onChange, required = false }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#1a1500', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 }}>
      {label} {required && <span style={{ color: '#e11d48' }}>*</span>}
    </label>
    <textarea
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      rows={3}
      style={{
        width: '100%', padding: '14px',
        border: `1.5px solid #e8df9a`,
        borderRadius: 12, fontSize: 15, fontFamily: "'Hanken Grotesk',sans-serif",
        background: 'white', color: '#1a1500',
        outline: 'none', boxSizing: 'border-box',
        transition: 'all 0.2s', resize: 'vertical'
      }}
    />
  </div>
);

export default function StaffOnboarding() {
  const { user, completeProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: '',
    dob: '',
    gender: 'Male',
    bloodGroup: '',
    maritalStatus: 'Single',
    aadharNo: '',
    panNo: '',
    permanentAddress: '',
    correspondingAddress: '',
    
    fatherName: '',
    fatherPhone: '',
    motherName: '',
    motherPhone: '',
    fatherOccupation: '',
    homeAddress: '',

    relativeName: '',
    relativePhone: '',
    relativeRelation: '',
    relativeAddress: '',
    
    workExp1Company: '',
    workExp1Duration: '',
    workExp1Location: '',
    workExp1Resp: '',

    workExp2Company: '',
    workExp2Duration: '',
    workExp2Location: '',
    workExp2Resp: '',

    aadharFrontUrl: '',
    aadharBackUrl: '',
    panCardUrl: ''
  });

  const [files, setFiles] = useState({
    profilePicture: null,
    aadharFront: null,
    aadharBack: null,
    panCard: null
  });

  const handleFileChange = (field) => (e) => {
    if (e.target.files[0]) {
      setFiles(prev => ({ ...prev, [field]: e.target.files[0] }));
    }
  };

  const handleChange = (field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const uploadFile = async (file, path) => {
    // Compress image and return Base64 instead of using Firebase Storage
    // This avoids hangs if Firebase Storage isn't initialized on the project
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Validate required files
    if (!files.aadharFront || !files.aadharBack) {
      alert("Please upload both front and back images of your Aadhar Card.");
      setLoading(false);
      return;
    }

    try {
      let finalData = { ...formData };
      // Upload files
      if (files.profilePicture) {
        finalData.profilePictureUrl = await uploadFile(files.profilePicture, `staff_docs/${user?.id}/profile_${Date.now()}`);
      }
      if (files.aadharFront) {
        finalData.aadharFrontUrl = await uploadFile(files.aadharFront, `staff_docs/${user?.id}/aadhar_front_${Date.now()}`);
      }
      if (files.aadharBack) {
        finalData.aadharBackUrl = await uploadFile(files.aadharBack, `staff_docs/${user?.id}/aadhar_back_${Date.now()}`);
      }
      if (files.panCard) {
        finalData.panCardUrl = await uploadFile(files.panCard, `staff_docs/${user?.id}/pan_card_${Date.now()}`);
      }

      await completeProfile(finalData);
      navigate('/staff-app');
    } catch (err) {
      console.error(err);
      alert('Failed to save profile. Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      backgroundColor: '#fffdf0',
      fontFamily: "'Hanken Grotesk',sans-serif", padding: '0 0 40px'
    }}>
      {/* Header */}
      <div style={{ padding: '40px 24px 24px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 28, color: '#1a1500', margin: '0 0 8px', letterSpacing: -0.5 }}>
          Complete Profile
        </h1>
        <p style={{ color: '#78680a', fontSize: 14, margin: 0, fontWeight: 500 }}>
          Welcome! Please provide your comprehensive details to complete your profile.
        </p>
      </div>

      {/* Form Container */}
      <div style={{
        margin: '0 20px', background: 'white',
        borderRadius: 24, padding: '28px 24px',
        border: '1px solid #e8df9a',
        boxShadow: '0 8px 24px rgba(120, 104, 10, 0.06)'
      }}>
        <form onSubmit={handleSubmit}>
          
          {/* Section 1 */}
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0891b2', marginBottom: 16, borderBottom: '2px solid #ecfeff', paddingBottom: 8 }}>Personal Details</h3>
          <Field label="Full Name" value={formData.name} onChange={handleChange('name')} required />
          <Field label="Email Address" type="email" placeholder="example@email.com" value={formData.email} onChange={handleChange('email')} />
          <Field label="Date of Birth" type="date" value={formData.dob} onChange={handleChange('dob')} required />
          
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#1a1500', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 }}>
              Gender <span style={{ color: '#e11d48' }}>*</span>
            </label>
            <select value={formData.gender} onChange={handleChange('gender')} style={{ width: '100%', padding: '14px', border: `1.5px solid #e8df9a`, borderRadius: 12, fontSize: 15, fontFamily: "'Hanken Grotesk',sans-serif", background: 'white', color: '#1a1500', outline: 'none', boxSizing: 'border-box' }}>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#1a1500', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 }}>
              Marital Status <span style={{ color: '#e11d48' }}>*</span>
            </label>
            <select value={formData.maritalStatus} onChange={handleChange('maritalStatus')} style={{ width: '100%', padding: '14px', border: `1.5px solid #e8df9a`, borderRadius: 12, fontSize: 15, fontFamily: "'Hanken Grotesk',sans-serif", background: 'white', color: '#1a1500', outline: 'none', boxSizing: 'border-box' }}>
              <option value="Single">Single</option>
              <option value="Married">Married</option>
            </select>
          </div>

          <Field label="Blood Group" placeholder="e.g., B+" value={formData.bloodGroup} onChange={handleChange('bloodGroup')} />
          <Field label="Aadhar No." placeholder="XXXX XXXX XXXX" value={formData.aadharNo} onChange={handleChange('aadharNo')} required />
          <Field label="PAN No." placeholder="ABCDE1234F" value={formData.panNo} onChange={handleChange('panNo')} />
          <Field label="Permanent Address" placeholder="Full Home Address" value={formData.permanentAddress} onChange={handleChange('permanentAddress')} required />
          <Field label="Corresponding Address" placeholder="Current Address" value={formData.correspondingAddress} onChange={handleChange('correspondingAddress')} required />

          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0891b2', marginTop: 32, marginBottom: 16, borderBottom: '2px solid #ecfeff', paddingBottom: 8 }}>Documents Upload</h3>
          
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#1a1500', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 }}>
              Profile Picture
            </label>
            <input type="file" accept="image/*" onChange={handleFileChange('profilePicture')} style={{ width: '100%', padding: '10px', border: `1.5px solid #e8df9a`, borderRadius: 12, fontSize: 14, fontFamily: "'Hanken Grotesk',sans-serif", background: 'white' }} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#1a1500', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 }}>
              Aadhar Card (Front) <span style={{ color: '#e11d48' }}>*</span>
            </label>
            <input type="file" accept="image/*,.pdf" onChange={handleFileChange('aadharFront')} required style={{ width: '100%', padding: '10px', border: `1.5px solid #e8df9a`, borderRadius: 12, fontSize: 14, fontFamily: "'Hanken Grotesk',sans-serif", background: 'white' }} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#1a1500', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 }}>
              Aadhar Card (Back) <span style={{ color: '#e11d48' }}>*</span>
            </label>
            <input type="file" accept="image/*,.pdf" onChange={handleFileChange('aadharBack')} required style={{ width: '100%', padding: '10px', border: `1.5px solid #e8df9a`, borderRadius: 12, fontSize: 14, fontFamily: "'Hanken Grotesk',sans-serif", background: 'white' }} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#1a1500', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 }}>
              PAN Card (Optional)
            </label>
            <input type="file" accept="image/*,.pdf" onChange={handleFileChange('panCard')} style={{ width: '100%', padding: '10px', border: `1.5px solid #e8df9a`, borderRadius: 12, fontSize: 14, fontFamily: "'Hanken Grotesk',sans-serif", background: 'white' }} />
          </div>

          {/* Section 2 */}
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0891b2', marginTop: 32, marginBottom: 16, borderBottom: '2px solid #ecfeff', paddingBottom: 8 }}>Parents Details</h3>
          <Field label="Father's Name" value={formData.fatherName} onChange={handleChange('fatherName')} required />
          <Field label="Father's Phone" type="tel" value={formData.fatherPhone} onChange={handleChange('fatherPhone')} />
          <Field label="Mother's Name" value={formData.motherName} onChange={handleChange('motherName')} required />
          <Field label="Mother's Phone" type="tel" value={formData.motherPhone} onChange={handleChange('motherPhone')} />
          <Field label="Father's Occupation" value={formData.fatherOccupation} onChange={handleChange('fatherOccupation')} />
          <Field label="Home Address (Parents)" value={formData.homeAddress} onChange={handleChange('homeAddress')} />

          {/* Section 3 */}
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0891b2', marginTop: 32, marginBottom: 16, borderBottom: '2px solid #ecfeff', paddingBottom: 8 }}>Relative Details</h3>
          <Field label="Relative's Name" value={formData.relativeName} onChange={handleChange('relativeName')} required />
          <Field label="Relative's Number" type="tel" value={formData.relativePhone} onChange={handleChange('relativePhone')} required />
          <Field label="Relation" placeholder="e.g. Brother, Uncle" value={formData.relativeRelation} onChange={handleChange('relativeRelation')} required />
          <Field label="Relative's Address" value={formData.relativeAddress} onChange={handleChange('relativeAddress')} />

          {/* Section 4 */}
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0891b2', marginTop: 32, marginBottom: 16, borderBottom: '2px solid #ecfeff', paddingBottom: 8 }}>Work Experience 1</h3>
          <Field label="Company/Employer" value={formData.workExp1Company} onChange={handleChange('workExp1Company')} />
          <Field label="Duration" placeholder="e.g. Jan 2020 - Mar 2022" value={formData.workExp1Duration} onChange={handleChange('workExp1Duration')} />
          <Field label="Location" value={formData.workExp1Location} onChange={handleChange('workExp1Location')} />
          <TextArea label="Responsibilities" value={formData.workExp1Resp} onChange={handleChange('workExp1Resp')} />

          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0891b2', marginTop: 32, marginBottom: 16, borderBottom: '2px solid #ecfeff', paddingBottom: 8 }}>Work Experience 2 (Optional)</h3>
          <Field label="Company/Employer" value={formData.workExp2Company} onChange={handleChange('workExp2Company')} />
          <Field label="Duration" placeholder="e.g. Apr 2022 - Present" value={formData.workExp2Duration} onChange={handleChange('workExp2Duration')} />
          <Field label="Location" value={formData.workExp2Location} onChange={handleChange('workExp2Location')} />
          <TextArea label="Responsibilities" value={formData.workExp2Resp} onChange={handleChange('workExp2Resp')} />

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '16px', borderRadius: 12,
            background: loading ? '#fde04780' : '#fde047',
            color: '#1a1500', border: '1px solid #e8df9a', fontSize: 16, fontWeight: 800,
            cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            boxShadow: '0 4px 12px rgba(253, 224, 71, 0.25)',
            outline: 'none', transition: 'all 0.15s', marginTop: 24
          }}>
            {loading ? 'Saving Profile...' : 'Complete Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}
