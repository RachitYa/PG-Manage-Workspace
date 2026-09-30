import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const mockRooms = [
  { id: 1, roomNo: '101', type: 'Double Sharing', availableBeds: [2], rent: 8000 },
  { id: 2, roomNo: '102', type: 'Triple Sharing', availableBeds: [1, 3], rent: 6500 },
  { id: 3, roomNo: '201', type: 'AC Single', availableBeds: [1], rent: 12000 },
  { id: 4, roomNo: '205', type: 'AC Double', availableBeds: [1, 2], rent: 10000 },
];

export default function AddTenant() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const totalSteps = 5;

  const [formData, setFormData] = useState({
    // Step 1
    fullName: '',
    phone: '',
    email: '',
    dob: '',
    gender: 'Male',
    // Step 2
    idType: 'Aadhar',
    idNumber: '',
    // Step 3
    emergencyName: '',
    emergencyRelation: 'Parent',
    emergencyPhone: '',
    emergencyAddress: '',
    // Step 4
    selectedRoomId: null,
    selectedBed: null,
    // Step 5
    securityDeposit: '',
    monthlyRent: '',
    rentGenDay: '1',
    joiningDate: '',
    messIncluded: false,
    agreementSigned: false,
  });

  const [isSuccess, setIsSuccess] = useState(false);

  // Update step 5 default values when room is selected
  useEffect(() => {
    if (formData.selectedRoomId) {
      const room = mockRooms.find(r => r.id === formData.selectedRoomId);
      if (room) {
        setFormData(prev => ({
          ...prev,
          monthlyRent: room.rent,
          securityDeposit: room.rent * 2,
        }));
      }
    }
  }, [formData.selectedRoomId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
    else handleSubmit();
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = () => {
    setIsSuccess(true);
  };

  if (isSuccess) {
    const selectedRoom = mockRooms.find(r => r.id === formData.selectedRoomId);
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span 
              className="material-symbols-outlined" 
              style={{ color: '#fff', cursor: 'pointer' }}
              onClick={() => navigate(-1)}
            >
              arrow_back
            </span>
            <h1 style={{ margin: 0, fontSize: '20px', color: '#fff', fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              Success
            </h1>
          </div>
        </div>
        
        <div style={{ padding: '60px 20px', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
            <span className="material-symbols-outlined" style={{ color: '#16a34a', fontSize: '40px' }}>check_circle</span>
          </div>
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '24px', color: '#0f172a', marginBottom: '12px', marginTop: 0 }}>
            Tenant Added Successfully!
          </h2>
          <p style={{ color: '#64748b', fontSize: '16px', marginBottom: '32px' }}>
            {formData.fullName} has been allocated to Room {selectedRoom?.roomNo} (Bed {formData.selectedBed}).
          </p>
          
          <button 
            style={{ ...styles.primaryBtn, width: '100%' }}
            onClick={() => navigate('/manage-tenants')}
          >
            Go to Tenant List
          </button>
        </div>
      </div>
    );
  }

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div style={styles.stepContainer}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <div style={styles.photoPlaceholder}>
                <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#94a3b8' }}>photo_camera</span>
                <span style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Add Photo</span>
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Full Name</label>
              <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} style={styles.input} placeholder="Enter full name" />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Phone Number</label>
              <div style={{ display: 'flex' }}>
                <span style={styles.prefix}>+91</span>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} style={{ ...styles.input, flex: 1, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderLeft: 'none' }} placeholder="10-digit number" />
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Email Address</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} style={styles.input} placeholder="name@example.com" />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Date of Birth</label>
              <input type="date" name="dob" value={formData.dob} onChange={handleChange} style={styles.input} />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Gender</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['Male', 'Female', 'Other'].map(g => (
                  <button 
                    key={g} 
                    onClick={() => setFormData(prev => ({ ...prev, gender: g }))}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '8px',
                      border: formData.gender === g ? '1px solid #0891b2' : '1px solid #e2e8f0',
                      backgroundColor: formData.gender === g ? '#ecfeff' : '#fff',
                      color: formData.gender === g ? '#0891b2' : '#64748b',
                      fontWeight: formData.gender === g ? '600' : '400',
                      cursor: 'pointer'
                    }}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div style={styles.stepContainer}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>ID Type</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {['Aadhar', 'PAN', 'Passport', 'Driving License'].map(id => (
                  <button 
                    key={id} 
                    onClick={() => setFormData(prev => ({ ...prev, idType: id }))}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '20px',
                      border: formData.idType === id ? 'none' : '1px solid #e2e8f0',
                      backgroundColor: formData.idType === id ? '#0891b2' : '#fff',
                      color: formData.idType === id ? '#fff' : '#64748b',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    {id}
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>{formData.idType} Number</label>
              <input type="text" name="idNumber" value={formData.idNumber} onChange={handleChange} style={styles.input} placeholder={`Enter ${formData.idType} number`} />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
              <div style={styles.uploadBox}>
                <span className="material-symbols-outlined" style={{ color: '#0891b2', marginBottom: '8px' }}>upload_file</span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Tap to upload front</span>
              </div>
              <div style={styles.uploadBox}>
                <span className="material-symbols-outlined" style={{ color: '#0891b2', marginBottom: '8px' }}>upload_file</span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Tap to upload back</span>
              </div>
            </div>

            <div style={{ backgroundColor: '#dcfce7', color: '#16a34a', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>lock</span>
              ID documents are stored securely.
            </div>
          </div>
        );
      case 3:
        return (
          <div style={styles.stepContainer}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Contact Name</label>
              <input type="text" name="emergencyName" value={formData.emergencyName} onChange={handleChange} style={styles.input} placeholder="Emergency contact name" />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Relationship</label>
              <select name="emergencyRelation" value={formData.emergencyRelation} onChange={handleChange} style={styles.input}>
                <option>Parent</option>
                <option>Spouse</option>
                <option>Sibling</option>
                <option>Friend</option>
                <option>Other</option>
              </select>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Phone Number</label>
              <input type="tel" name="emergencyPhone" value={formData.emergencyPhone} onChange={handleChange} style={styles.input} placeholder="10-digit number" />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Address</label>
              <textarea name="emergencyAddress" value={formData.emergencyAddress} onChange={handleChange} style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }} placeholder="Full address" />
            </div>
          </div>
        );
      case 4:
        return (
          <div style={{...styles.stepContainer, paddingBottom: '80px'}}>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '16px', marginTop: 0 }}>
              Select an available room and bed.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {mockRooms.map(room => (
                <div key={room.id} style={styles.roomCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <h3 style={{ margin: 0, color: '#0f172a', fontSize: '16px', fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                        Room {room.roomNo}
                      </h3>
                      <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>{room.type}</p>
                    </div>
                    <div style={{ color: '#0891b2', fontWeight: '600', fontSize: '16px' }}>
                      ₹{room.rent}<span style={{ fontSize: '12px', color: '#64748b', fontWeight: '400' }}>/mo</span>
                    </div>
                  </div>
                  
                  <div>
                    <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#94a3b8' }}>Available Beds</p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {room.availableBeds.map(bedNo => {
                        const isSelected = formData.selectedRoomId === room.id && formData.selectedBed === bedNo;
                        return (
                          <button
                            key={bedNo}
                            onClick={() => setFormData(prev => ({ ...prev, selectedRoomId: room.id, selectedBed: bedNo }))}
                            style={{
                              padding: '6px 16px',
                              borderRadius: '20px',
                              border: isSelected ? 'none' : '1px solid #cbd5e1',
                              backgroundColor: isSelected ? '#0891b2' : '#fff',
                              color: isSelected ? '#fff' : '#475569',
                              fontSize: '14px',
                              fontWeight: isSelected ? '600' : '400',
                              cursor: 'pointer'
                            }}
                          >
                            Bed {bedNo}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {formData.selectedRoomId && (
              <div style={{
                position: 'fixed',
                bottom: '80px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '100%',
                maxWidth: '480px',
                padding: '0 20px',
                boxSizing: 'border-box'
              }}>
                <div style={{
                  backgroundColor: '#0c1a2e',
                  color: '#fff',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}>
                  <span className="material-symbols-outlined" style={{ color: '#22d3ee' }}>bed</span>
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>
                    Selected: Room {mockRooms.find(r => r.id === formData.selectedRoomId)?.roomNo}, Bed {formData.selectedBed}
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      case 5:
        return (
          <div style={styles.stepContainer}>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ ...styles.inputGroup, flex: 1 }}>
                <label style={styles.label}>Monthly Rent (₹)</label>
                <input type="number" name="monthlyRent" value={formData.monthlyRent} onChange={handleChange} style={styles.input} />
              </div>
              <div style={{ ...styles.inputGroup, flex: 1 }}>
                <label style={styles.label}>Security Deposit (₹)</label>
                <input type="number" name="securityDeposit" value={formData.securityDeposit} onChange={handleChange} style={styles.input} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ ...styles.inputGroup, flex: 1 }}>
                <label style={styles.label}>Joining Date</label>
                <input type="date" name="joiningDate" value={formData.joiningDate} onChange={handleChange} style={styles.input} />
              </div>
              <div style={{ ...styles.inputGroup, flex: 1 }}>
                <label style={styles.label}>Rent Cycle Date</label>
                <select name="rentGenDay" value={formData.rentGenDay} onChange={handleChange} style={styles.input}>
                  {Array.from({length: 28}, (_, i) => i + 1).map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ ...styles.inputGroup, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div>
                <label style={{ ...styles.label, marginBottom: '4px', display: 'block' }}>Mess Included</label>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Include meals in the package</span>
              </div>
              <label style={styles.toggleSwitch}>
                <input type="checkbox" name="messIncluded" checked={formData.messIncluded} onChange={handleChange} style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{ ...styles.slider, backgroundColor: formData.messIncluded ? '#0891b2' : '#cbd5e1' }}></span>
              </label>
            </div>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginTop: '24px', cursor: 'pointer' }}>
              <input type="checkbox" name="agreementSigned" checked={formData.agreementSigned} onChange={handleChange} style={{ marginTop: '4px' }} />
              <span style={{ fontSize: '14px', color: '#475569', lineHeight: '1.5' }}>
                I confirm that the tenant has signed the physical agreement and provided valid ID proofs.
              </span>
            </label>
          </div>
        );
      default:
        return null;
    }
  };

  const stepTitles = [
    'Personal Details',
    'ID Proof',
    'Emergency Contact',
    'Bed Allocation',
    'Financial & Terms'
  ];

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <span 
            className="material-symbols-outlined" 
            style={{ color: '#fff', cursor: 'pointer' }}
            onClick={() => navigate(-1)}
          >
            arrow_back
          </span>
          <h1 style={{ margin: 0, fontSize: '20px', color: '#fff', fontFamily: "'Bricolage Grotesque', sans-serif" }}>
            Add Tenant
          </h1>
        </div>
        
        {/* Progress Bar */}
        <div style={{ padding: '0 8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: '#cbd5e1', fontSize: '13px' }}>Step {step} of {totalSteps}</span>
            <span style={{ color: '#fff', fontSize: '13px', fontWeight: '500' }}>{stepTitles[step - 1]}</span>
          </div>
          <div style={{ height: '6px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '3px', overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: `${(step / totalSteps) * 100}%`, backgroundColor: '#22d3ee', transition: 'width 0.3s ease' }} />
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {renderStep()}
      </div>

      {/* Bottom Bar */}
      <div style={styles.bottomBar}>
        <button 
          style={{ ...styles.secondaryBtn, visibility: step === 1 ? 'hidden' : 'visible' }}
          onClick={handleBack}
        >
          Back
        </button>
        <button 
          style={styles.primaryBtn}
          onClick={handleNext}
          disabled={step === 4 && !formData.selectedRoomId}
        >
          {step === totalSteps ? 'Confirm & Add Tenant' : 'Next'}
        </button>
      </div>

      {/* Global styles for toggle switch */}
      <style>{`
        input[type="checkbox"] + span::before {
          content: "";
          position: absolute;
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          border-radius: 50%;
          transition: .3s;
        }
        input:checked + span::before {
          transform: translateX(20px);
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '480px',
    margin: '0 auto',
    backgroundColor: '#f1f5f9',
    minHeight: '100vh',
    fontFamily: "'Hanken Grotesk', sans-serif",
    display: 'flex',
    flexDirection: 'column',
    position: 'relative'
  },
  header: {
    background: 'linear-gradient(135deg, #0c1a2e, #0f2847)',
    padding: '24px 20px',
    borderBottomLeftRadius: '24px',
    borderBottomRightRadius: '24px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
  },
  stepContainer: {
    padding: '24px 20px',
  },
  photoPlaceholder: {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    backgroundColor: '#e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    border: '2px dashed #cbd5e1'
  },
  inputGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    color: '#475569',
    marginBottom: '8px',
    fontWeight: '500'
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#fff',
    fontSize: '15px',
    fontFamily: "'Hanken Grotesk', sans-serif",
    color: '#0f172a',
    boxSizing: 'border-box',
    outline: 'none',
  },
  prefix: {
    backgroundColor: '#f8fafc',
    border: '1px solid #cbd5e1',
    borderRight: 'none',
    padding: '12px 16px',
    borderTopLeftRadius: '12px',
    borderBottomLeftRadius: '12px',
    color: '#475569',
    fontSize: '15px',
    display: 'flex',
    alignItems: 'center'
  },
  uploadBox: {
    flex: 1,
    height: '100px',
    border: '2px dashed #cbd5e1',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    cursor: 'pointer'
  },
  roomCard: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '16px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
  },
  bottomBar: {
    padding: '16px 20px',
    backgroundColor: '#fff',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    position: 'sticky',
    bottom: 0,
    zIndex: 10
  },
  primaryBtn: {
    flex: 2,
    backgroundColor: '#0891b2',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    padding: '14px',
    fontSize: '16px',
    fontWeight: '600',
    fontFamily: "'Hanken Grotesk', sans-serif",
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: 'none',
    borderRadius: '12px',
    padding: '14px',
    fontSize: '16px',
    fontWeight: '600',
    fontFamily: "'Hanken Grotesk', sans-serif",
    cursor: 'pointer',
  },
  toggleSwitch: {
    position: 'relative',
    display: 'inline-block',
    width: '44px',
    height: '24px',
  },
  slider: {
    position: 'absolute',
    cursor: 'pointer',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: '24px',
    transition: '.3s',
  }
};
