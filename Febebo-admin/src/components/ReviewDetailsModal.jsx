import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function ReviewDetailsModal({ isOpen, onClose, userId, onApprove, approveLoading }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!isOpen || !userId) return;
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const docSnap = await getDoc(doc(db, 'users', userId));
        if (docSnap.exists()) {
          setData(docSnap.data());
        }
      } catch (err) {
        console.error('Error fetching student details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const DetailRow = ({ label, value }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
      <span style={{ fontSize: 13, color: '#64748b' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', textAlign: 'right', wordBreak: 'break-word', maxWidth: '60%' }}>{value || 'N/A'}</span>
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)' }} />
      <div style={{ position: 'relative', background: 'white', borderRadius: '24px 24px 0 0', padding: '24px 20px', maxHeight: '85vh', overflowY: 'auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Student Details</h3>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#475569' }}>close</span>
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>Loading...</div>
        ) : !data ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#ef4444' }}>Details not found.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            {/* Basic Info */}
            <div>
              <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 800, color: '#334155' }}>Basic Information</h4>
              <div style={{ background: '#f8fafc', padding: '4px 12px', borderRadius: 12 }}>
                <DetailRow label="Full Name" value={data.name || data.studentName} />
                <DetailRow label="Phone" value={data.phone || data.studentPhone} />
                {data.email && <DetailRow label="Email" value={data.email} />}
                {data.dob && <DetailRow label="Date of Birth" value={data.dob} />}
              </div>
            </div>

            {/* Personal & Parents */}
            <div>
              <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 800, color: '#334155' }}>Parents Details</h4>
              <div style={{ background: '#f8fafc', padding: '4px 12px', borderRadius: 12 }}>
                <DetailRow label="Father's Name" value={data.parentsDetails?.fatherName} />
                <DetailRow label="Father's Phone" value={data.parentsDetails?.fatherPhone} />
                <DetailRow label="Mother's Name" value={data.parentsDetails?.motherName} />
                <DetailRow label="Mother's Phone" value={data.parentsDetails?.motherPhone} />
              </div>
            </div>

            {/* Addresses */}
            {(data.permanentAddress || data.correspondingAddress || data.kycData?.permanentAddress || data.kycData?.correspondingAddress) && (
              <div>
                <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 800, color: '#334155' }}>Address Details</h4>
                <div style={{ background: '#f8fafc', padding: '4px 12px', borderRadius: 12 }}>
                  <DetailRow label="Permanent Address" value={data.permanentAddress || data.kycData?.permanentAddress} />
                  <DetailRow label="Corresponding Address" value={data.correspondingAddress || data.kycData?.correspondingAddress} />
                </div>
              </div>
            )}

            {/* Occupation */}
            {data.occupation?.type && (
              <div>
                <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 800, color: '#334155' }}>Occupation ({data.occupation.type})</h4>
                <div style={{ background: '#f8fafc', padding: '4px 12px', borderRadius: 12 }}>
                  <DetailRow label={data.occupation.type === 'student' ? 'College' : data.occupation.type === 'working' ? 'Company' : 'Desc'} value={data.occupation.details} />
                  {data.occupation.role && (
                    <DetailRow label={data.occupation.type === 'student' ? 'Course' : 'Role'} value={data.occupation.role} />
                  )}
                  {data.occupation.address && (
                    <DetailRow label="Institution Address" value={data.occupation.address} />
                  )}
                </div>
              </div>
            )}

            {/* Identity & Emergency */}
            <div>
              <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 800, color: '#334155' }}>Identity & Emergency</h4>
              <div style={{ background: '#f8fafc', padding: '4px 12px', borderRadius: 12 }}>
                <DetailRow label="Aadhaar Number" value={data.kyc?.aadharNumber || data.kyc?.aadhaarNumber || data.kycData?.aadharNumber} />
                <DetailRow label="Emergency Name" value={data.emergencyContact?.name} />
                <DetailRow label="Emergency Phone" value={data.emergencyContact?.phone} />
                <DetailRow label="Blood Group" value={data.emergencyContact?.bloodGroup || data.kycData?.bloodGroup} />
              </div>
            </div>

            {/* Documents */}
            {(data.kyc?.aadharFront || data.kyc?.aadhaarFront || data.kycData?.aadharFront) && (
              <div>
                <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 800, color: '#334155' }}>Aadhaar Photos</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <img src={data.kyc?.aadharFront || data.kyc?.aadhaarFront || data.kycData?.aadharFront} alt="Front" style={{ width: '100%', borderRadius: 8, border: '1px solid #e2e8f0' }} />
                    <p style={{ margin: '4px 0 0', fontSize: 11, textAlign: 'center', color: '#64748b' }}>Front</p>
                  </div>
                  <div>
                    <img src={data.kyc?.aadharBack || data.kyc?.aadhaarBack || data.kycData?.aadharBack} alt="Back" style={{ width: '100%', borderRadius: 8, border: '1px solid #e2e8f0' }} />
                    <p style={{ margin: '4px 0 0', fontSize: 11, textAlign: 'center', color: '#64748b' }}>Back</p>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #f1f5f9', display: 'flex', gap: 12 }}>
          <button 
            onClick={onClose} 
            style={{ flex: 1, background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
          >
            Close
          </button>
          {onApprove && (
            <button 
              onClick={onApprove} 
              disabled={approveLoading}
              style={{
                flex: 2,
                background: approveLoading ? '#94a3b8' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                padding: '14px',
                fontSize: 15,
                fontWeight: 700,
                cursor: approveLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>check_circle</span>
              {approveLoading ? 'Approving...' : 'Approve & Unlock'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
