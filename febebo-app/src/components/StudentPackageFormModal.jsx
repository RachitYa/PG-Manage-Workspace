import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, setDoc, addDoc, collection } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, Upload, ArrowRight, ArrowLeft, Building, Wallet, CalendarDays, Receipt } from 'lucide-react';

export default function StudentPackageFormModal({ packageData, adminId, adminName, onClose, onSuccess }) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [selectedSeater, setSelectedSeater] = useState(null);

  // Payment State
  const [paymentMode, setPaymentMode] = useState('Token Only');
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [receivedBy, setReceivedBy] = useState('');
  const [paymentScreenshot, setPaymentScreenshot] = useState(null);
  const [dateOfJoining, setDateOfJoining] = useState(new Date().toISOString().split('T')[0]);

  const rentsList = packageData?.rents || [];
  const securityDeposit = Number(packageData?.securityAmount) || 0;
  
  const currentRent = selectedSeater ? Number(selectedSeater.rent) : 0;
  const leaseAmount = currentRent + securityDeposit;
  const remainingAmount = paymentMode === 'Full Payment' ? 0 : (leaseAmount - Number(amountPaid));

  const handlePaymentModeChange = (mode) => {
    setPaymentMode(mode);
    if (mode === 'Full Payment') {
      setAmountPaid(leaseAmount.toString());
    } else {
      setAmountPaid('');
    }
  };

  const handleFile = (e, setter) => {
    if (e.target.files[0]) setter(e.target.files[0]);
  };

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const MAX_WIDTH = 800;
          let width = img.width;
          let height = img.height;
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
      };
      reader.onerror = reject;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (paymentMethod === 'Online' && !paymentScreenshot) {
      return alert("Please upload a payment screenshot.");
    }

    setLoading(true);
    try {
      let paymentBase64 = null;
      if (paymentScreenshot) paymentBase64 = await compressImage(paymentScreenshot);

      const isFull = paymentMode === 'Full Payment' || remainingAmount <= 0;
      const finalRemaining = isFull ? 0 : remainingAmount;

      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        hasPG: true,
        pgStatus: 'Upcoming User',
        subscribedPG: {
          pgId: adminId,
          pgName: adminName || 'PG',
          roomNo: 'To be allotted',
          seaterLabel: `${selectedSeater.seater} Seater`,
          rent: currentRent,
          securityAmount: securityDeposit,
          leaseAmount: leaseAmount,
          tokenPaid: Number(amountPaid),
          remainingAmount: finalRemaining,
          paymentVerificationPending: !isFull && Number(amountPaid) > 0,
          fullPaymentPaid: isFull,
          kycStatus: isFull ? 'payment_approved_kyc_pending' : null,
          paymentMode: paymentMode,
          paymentMethod: paymentMethod,
          paymentScreenshot: paymentBase64,
          status: 'Upcoming User'
        }
      }, { merge: true });

      await setDoc(doc(db, 'tenants', user.uid), {
        adminId: adminId,
        tenantId: user.uid,
        name: user?.name || 'Student',
        phone: user?.profileData?.phone || user?.phone || '',
        email: user?.email || user?.profileData?.email || '',
        kycData: user?.kycData || user?.profileData?.kycData || null,
        kyc: user?.kyc || user?.profileData?.kyc || null,
        parentsDetails: user?.parentsDetails || user?.profileData?.parentsDetails || null,
        emergencyContact: user?.emergencyContact || user?.profileData?.emergencyContact || null,
        occupation: user?.occupation || user?.profileData?.occupation || null,
        dob: user?.dob || user?.kycData?.dob || user?.profileData?.dob || null,
        permanentAddress: user?.permanentAddress || user?.kycData?.permanentAddress || user?.profileData?.permanentAddress || null,
        correspondingAddress: user?.correspondingAddress || user?.kycData?.correspondingAddress || user?.profileData?.correspondingAddress || null,
        roomNo: 'To be allotted',
        seaterLabel: `${selectedSeater.seater} Seater`,
        rentAmount: leaseAmount,
        rent: currentRent,
        securityDeposit: securityDeposit,
        dateOfJoining: dateOfJoining,
        status: 'Upcoming User',
        remainingAmount: finalRemaining,
        paymentVerificationPending: !isFull && Number(amountPaid) > 0,
        paymentStatus: isFull ? 'Paid' : 'Pending'
      }, { merge: true });

      await addDoc(collection(db, 'notifications'), {
        adminId: adminId,
        tenantId: user.uid,
        tenantName: user?.name || 'Student',
        title: isFull ? '💰 Full Payment Received' : 'New Admission Payment',
        desc: isFull 
          ? `${user?.name || 'Student'} paid the full amount of ₹${amountPaid} for ${selectedSeater.seater} Seater. Please allot a room.` 
          : `${user?.name || 'Student'} paid token of ₹${amountPaid} for ${selectedSeater.seater} Seater. Remaining: ₹${remainingAmount}.`,
        type: isFull ? 'full_remaining_payment' : 'token_payment',
        action: 'VIEW_TENANTS',
        unread: true,
        createdAt: new Date().toISOString(),
        resolved: false
      });

      if (Number(amountPaid) > 0) {
        await addDoc(collection(db, 'users', user.uid, 'payments'), {
          amount: Number(amountPaid),
          date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
          name: paymentMode === 'Token Only' ? 'Token Payment' : 'First Month Payment',
          paymentMode: paymentMethod,
          paymentType: paymentMode === 'Token Only' ? 'token' : 'first_month',
          pgName: adminName || 'PG',
          receivedBy: receivedBy || 'Admin (Pending Verification)',
          rent: currentRent,
          security: securityDeposit,
          totalAmount: leaseAmount,
          remainingAmount: remainingAmount,
          seaterLabel: `${selectedSeater.seater} Seater`,
          status: 'Pending',
          type: 'Debit',
          screenshot: paymentBase64,
          createdAt: new Date().toISOString()
        });
      }

      // Send Summary to Chat
      const chatId = [user.uid, adminId].sort().join('_');
      await setDoc(doc(db, 'chats', chatId), {
        lastMessage: "Admission Form Submitted",
        lastTimestamp: new Date()
      }, { merge: true });

      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: user.uid,
        senderName: user?.name || 'Student',
        timestamp: new Date(),
        read: false,
        type: 'admission_summary',
        summaryData: {
          seater: selectedSeater.seater,
          rent: currentRent,
          security: securityDeposit,
          paymentMode,
          amountPaid: Number(amountPaid),
          remainingAmount,
          method: paymentMethod,
          receivedBy: receivedBy || 'Admin',
          screenshot: paymentBase64
        }
      });

      onSuccess();
    } catch (err) {
      console.error(err);
      alert("Error submitting form. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', flexDirection: 'column', fontFamily: "'Hanken Grotesk', sans-serif" }}>
      <div style={{ background: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: '24px 20px', marginTop: 'auto', maxHeight: '92vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', boxShadow: '0 -10px 40px rgba(0,0,0,0.15)' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>Admission Form</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <div style={{ background: step === 1 ? '#10b981' : '#e2e8f0', height: 4, width: 32, borderRadius: 2, transition: 'all 0.3s' }} />
              <div style={{ background: step === 2 ? '#10b981' : '#e2e8f0', height: 4, width: 32, borderRadius: 2, transition: 'all 0.3s' }} />
              <span style={{ marginLeft: 6, fontSize: 12, color: '#64748b', fontWeight: 600 }}>Step {step} of 2</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569', transition: 'all 0.2s' }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>&times;</span>
          </button>
        </div>

        {/* --- STEP 1: ROOM SELECTION --- */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeIn 0.3s ease-out' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Building size={16} color="#10b981" /> Select Room Type
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b', fontWeight: 500 }}>Choose the seater option discussed with the admin.</p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {rentsList.map((r, idx) => {
                const isSelected = selectedSeater?.seater === r.seater;
                return (
                  <div 
                    key={idx} 
                    onClick={() => setSelectedSeater(r)}
                    style={{ 
                      border: isSelected ? '1.5px solid #10b981' : '1px solid #e2e8f0', 
                      background: isSelected ? '#f0fdf4' : '#ffffff',
                      borderRadius: 12, 
                      padding: '16px', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      cursor: 'pointer',
                      boxShadow: isSelected ? '0 4px 12px rgba(16, 185, 129, 0.1)' : '0 1px 3px rgba(0,0,0,0.02)',
                      transform: isSelected ? 'scale(1.01)' : 'scale(1)',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ 
                        width: 20, height: 20, borderRadius: '50%', 
                        border: isSelected ? '6px solid #10b981' : '1.5px solid #cbd5e1', 
                        background: 'white', boxSizing: 'border-box', transition: 'all 0.2s' 
                      }} />
                      <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: isSelected ? '#064e3b' : '#334155' }}>
                        {r.seater} Seater
                      </h4>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, color: isSelected ? '#10b981' : '#475569', fontSize: 17, letterSpacing: '-0.3px' }}>
                        ₹{r.rent}
                      </div>
                      <div style={{ fontSize: 11, color: isSelected ? '#059669' : '#94a3b8', fontWeight: 600, marginTop: -2 }}>
                        per month
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <button 
              onClick={() => setStep(2)} 
              disabled={!selectedSeater}
              style={{ 
                padding: '14px', 
                background: selectedSeater ? '#0f172a' : '#e2e8f0', 
                color: selectedSeater ? 'white' : '#94a3b8', 
                borderRadius: 12, 
                fontWeight: 700, 
                fontSize: 14,
                border: 'none', 
                cursor: selectedSeater ? 'pointer' : 'not-allowed', 
                marginTop: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: selectedSeater ? '0 4px 12px rgba(15, 23, 42, 0.15)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              Continue to Payment <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* --- STEP 2: RENT & PAYMENT --- */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeIn 0.3s ease-out' }}>
            
            {/* Rent Breakdown Card */}
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: 16, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                <Receipt size={16} color="#64748b" />
                <h3 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>Payment Summary</h3>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ color: '#64748b', fontWeight: 600, fontSize: 13 }}>Monthly Rent</span>
                <span style={{ fontWeight: 700, color: '#1e293b', fontSize: 14 }}>₹{currentRent}</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                <span style={{ color: '#64748b', fontWeight: 600, fontSize: 13 }}>Security Deposit</span>
                <span style={{ fontWeight: 700, color: '#1e293b', fontSize: 14 }}>₹{securityDeposit}</span>
              </div>
              
              <div style={{ borderTop: '1.5px dashed #cbd5e1', paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>Total Lease Amount</span>
                <span style={{ fontWeight: 800, color: '#10b981', fontSize: 18, lineHeight: 1, letterSpacing: '-0.3px' }}>₹{leaseAmount}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              {/* Payment Mode Toggles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                 <label style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                   <Wallet size={16} color="#10b981" /> Payment Plan
                 </label>
                 <div style={{ display: 'flex', gap: 8, background: '#f1f5f9', padding: 4, borderRadius: 12 }}>
                    <button 
                      type="button" 
                      onClick={() => handlePaymentModeChange('Token Only')} 
                      style={{ 
                        flex: 1, padding: '10px', borderRadius: 10, 
                        border: 'none',
                        background: paymentMode === 'Token Only' ? '#ffffff' : 'transparent', 
                        color: paymentMode === 'Token Only' ? '#0f172a' : '#64748b', 
                        fontWeight: 700, fontSize: 13, cursor: 'pointer', 
                        boxShadow: paymentMode === 'Token Only' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' 
                      }}>
                      Token Only
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handlePaymentModeChange('Full Payment')} 
                      style={{ 
                        flex: 1, padding: '10px', borderRadius: 10, 
                        border: 'none',
                        background: paymentMode === 'Full Payment' ? '#ffffff' : 'transparent', 
                        color: paymentMode === 'Full Payment' ? '#0f172a' : '#64748b', 
                        fontWeight: 700, fontSize: 13, cursor: 'pointer', 
                        boxShadow: paymentMode === 'Full Payment' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' 
                      }}>
                      Full Payment
                    </button>
                 </div>
              </div>

              {/* Amount Paying Now Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                 <label style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>Amount Paying Now</label>
                 <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, fontWeight: 800, color: '#94a3b8' }}>₹</span>
                    <input 
                      type="number" 
                      placeholder="0" 
                      value={amountPaid} 
                      onChange={e => setAmountPaid(e.target.value)} 
                      style={{ 
                        width: '100%', boxSizing: 'border-box',
                        padding: '12px 16px 12px 36px', borderRadius: 10, border: '1.5px solid #e2e8f0', 
                        fontSize: 15, fontWeight: 700, color: '#0f172a', outline: 'none',
                        background: '#f8fafc', transition: 'border-color 0.2s'
                      }} 
                      onFocus={(e) => e.target.style.borderColor = '#10b981'}
                      onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    />
                 </div>
              </div>
              
              {/* Payment Method Toggles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                 <label style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>Payment Method</label>
                 <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" onClick={() => setPaymentMethod('Cash')} style={{ flex: 1, padding: '12px', borderRadius: 10, border: paymentMethod === 'Cash' ? '1.5px solid #10b981' : '1.5px solid #f1f5f9', background: paymentMethod === 'Cash' ? '#f0fdf4' : '#f8fafc', color: paymentMethod === 'Cash' ? '#065f46' : '#64748b', fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s' }}>Cash</button>
                    <button type="button" onClick={() => setPaymentMethod('Online')} style={{ flex: 1, padding: '12px', borderRadius: 10, border: paymentMethod === 'Online' ? '1.5px solid #10b981' : '1.5px solid #f1f5f9', background: paymentMethod === 'Online' ? '#f0fdf4' : '#f8fafc', color: paymentMethod === 'Online' ? '#065f46' : '#64748b', fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s' }}>Online / UPI</button>
                 </div>
              </div>

              {paymentMethod === 'Online' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px', border: paymentScreenshot ? '1.5px solid #10b981' : '1.5px dashed #cbd5e1', borderRadius: 10, cursor: 'pointer', background: paymentScreenshot ? '#f0fdf4' : '#f8fafc', transition: 'all 0.2s' }}>
                  <div style={{ background: paymentScreenshot ? '#10b981' : '#e2e8f0', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
                     {paymentScreenshot ? <CheckCircle size={16} color="white" /> : <Upload size={16} color="#64748b" />}
                  </div>
                  <div style={{ flex: 1 }}>
                     <span style={{ display: 'block', color: paymentScreenshot ? '#065f46' : '#334155', fontSize: 13, fontWeight: 700 }}>{paymentScreenshot ? 'Screenshot Uploaded' : 'Upload Screenshot'}</span>
                     <span style={{ display: 'block', color: paymentScreenshot ? '#10b981' : '#94a3b8', fontSize: 11, fontWeight: 600, marginTop: 2 }}>{paymentScreenshot ? 'Tap to change' : 'Required for online payments'}</span>
                  </div>
                  <input type="file" accept="image/*" onChange={e => handleFile(e, setPaymentScreenshot)} style={{ display: 'none' }} />
                </label>
              )}

              {/* Received By Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                 <label style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>Received By</label>
                 <input 
                   type="text" 
                   placeholder="Name of person who received the payment" 
                   value={receivedBy} 
                   onChange={e => setReceivedBy(e.target.value)} 
                   style={{ 
                     width: '100%', boxSizing: 'border-box',
                     padding: '12px 16px', borderRadius: 10, border: '1.5px solid #e2e8f0', 
                     fontSize: 14, fontWeight: 700, color: '#0f172a', outline: 'none',
                     background: '#f8fafc', transition: 'border-color 0.2s'
                   }} 
                   onFocus={(e) => e.target.style.borderColor = '#10b981'}
                   onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                 />
              </div>

              {/* Shifting Date Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                 <label style={{ fontSize: 13, fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
                   <CalendarDays size={16} color="#0f172a" /> Date of Shifting (Arrival)
                 </label>
                 <input 
                   type="date" 
                   value={dateOfJoining} 
                   onChange={e => setDateOfJoining(e.target.value)} 
                   style={{ 
                     padding: '12px 16px', borderRadius: 10, border: '1.5px solid #e2e8f0', 
                     fontSize: 14, fontWeight: 700, color: '#0f172a', outline: 'none',
                     background: '#f8fafc', fontFamily: 'inherit', transition: 'border-color 0.2s'
                   }} 
                   onFocus={(e) => e.target.style.borderColor = '#0f172a'}
                   onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                 />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
              <button onClick={() => setStep(1)} style={{ padding: '14px', width: 56, background: '#f1f5f9', color: '#475569', borderRadius: 12, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} onMouseEnter={e => e.target.style.background = '#e2e8f0'} onMouseLeave={e => e.target.style.background = '#f1f5f9'}>
                 <ArrowLeft size={20} />
              </button>
              <button onClick={handleSubmit} disabled={loading} style={{ flex: 1, padding: '14px', background: '#0f172a', color: 'white', borderRadius: 12, border: 'none', fontWeight: 800, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'transform 0.1s' }} onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'} onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}>
                 {loading ? 'Submitting...' : 'Complete Admission'}
                 {!loading && <CheckCircle size={16} />}
              </button>
            </div>
          </div>
        )}

      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
