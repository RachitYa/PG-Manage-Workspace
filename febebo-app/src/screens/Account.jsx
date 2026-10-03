import React, { useState, useEffect } from 'react';
import { TopBar } from '../App';
import BottomNav from '../components/BottomNav';
import { ReceiptText, ChevronDown, ChevronUp, X, Upload, CheckCircle2, DollarSign } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { collection, query, orderBy, onSnapshot, addDoc, setDoc, doc, where, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import StudentOutstandingDuesModal from '../components/StudentOutstandingDuesModal';
import StudentOutstandingDuesBar from '../components/StudentOutstandingDuesBar';
import { aggregateTenantDues } from '../utils/duesUtils';
import './Account.css';

// ── Payment Card Component ──
function PaymentCard({ payment }) {
  const [expanded, setExpanded] = useState(false);
  const isToken = payment.paymentType === 'token';
  const isRemaining = payment.paymentType === 'remaining_balance';
  const isDebit = payment.type === 'Debit';

  return (
    <div style={{ background: '#fff', border: `1px solid ${isToken ? '#fef3c7' : '#f1f5f9'}`, borderRadius: '16px', marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
      <div onClick={() => setExpanded(!expanded)} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 16px', cursor: 'pointer', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1, minWidth: 0 }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: isToken ? '#fef9c3' : (isDebit ? '#fef2f2' : '#f0fdf4'), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '20px' }}>
            {isToken ? '💰' : (isDebit ? '💸' : '💵')}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{payment.name}</h4>
              {isToken && <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 7px', borderRadius: '6px', background: '#fef3c7', color: '#b45309', flexShrink: 0 }}>TOKEN</span>}
              {isRemaining && <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 7px', borderRadius: '6px', background: '#dcfce7', color: '#166534', flexShrink: 0 }}>BALANCE</span>}
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94a3b8' }}>
              {payment.date}{payment.seaterLabel ? ` · ${payment.seaterLabel}` : (payment.contact ? ` · ${payment.contact}` : '')}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', marginLeft: '8px', flexShrink: 0 }}>
          <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: isDebit ? '#ef4444' : '#16a34a' }}>
            {isDebit ? '-' : '+'}₹{Number(payment.amount).toLocaleString('en-IN')}
          </h4>
          {expanded ? <ChevronUp size={14} color="#94a3b8" /> : <ChevronDown size={14} color="#94a3b8" />}
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid #f8fafc', padding: '12px 16px', background: '#fafafa' }}>
          {isToken && (
            <div style={{ background: 'linear-gradient(135deg, #064e3b, #166534)', borderRadius: '12px', padding: '12px 14px', marginBottom: '10px' }}>
              <p style={{ margin: '0 0 8px', fontSize: '11px', color: 'rgba(255,255,255,0.7)', fontWeight: '700', letterSpacing: 1 }}>ROOM BREAKDOWN</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>Monthly Rent</span>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'white' }}>₹{payment.rent || '—'}/mo</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>Security Deposit</span>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'white' }}>₹{payment.security || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '8px', marginTop: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'white' }}>Total First Month</span>
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#86efac' }}>₹{payment.totalAmount || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed rgba(255,255,255,0.15)', paddingTop: '8px', marginTop: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#fef08a' }}>Remaining Balance</span>
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#fef08a' }}>₹{payment.remainingAmount ?? '—'}</span>
              </div>
            </div>
          )}

          {payment.paymentMode && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Payment Mode</span>
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#0f172a' }}>{payment.paymentMode}</span>
            </div>
          )}
          {payment.transactionId && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Transaction ID</span>
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#0f172a' }}>{payment.transactionId}</span>
            </div>
          )}
          {payment.receivedBy && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Received By</span>
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#0f172a' }}>{payment.receivedBy}</span>
            </div>
          )}
          {payment.status && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Status</span>
              <span style={{ fontSize: '12px', fontWeight: '700', color: payment.status === 'Verified' ? '#16a34a' : '#d97706' }}>{payment.status}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>{isToken ? 'Token Paid' : 'Amount Paid'}</span>
            <span style={{ fontSize: '13px', fontWeight: '700', color: isDebit ? '#ef4444' : '#16a34a' }}>₹{Number(payment.amount).toLocaleString('en-IN')}</span>
          </div>
          {payment.pgName && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>PG</span>
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#0f172a' }}>{payment.pgName}</span>
            </div>
          )}

          {payment.screenshot && (
            <div style={{ marginTop: '10px' }}>
              <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: '700', color: '#475569', letterSpacing: 1 }}>PAYMENT SCREENSHOT</p>
              <img
                src={payment.screenshot}
                alt="Payment proof"
                style={{ width: '100%', borderRadius: '10px', border: '1px solid #e2e8f0', maxHeight: '220px', objectFit: 'cover' }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}


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
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

const Account = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [meterBills, setMeterBills] = useState([]);
  const [customDues, setCustomDues] = useState([]);
  const [showDuesModal, setShowDuesModal] = useState(false);
  const [duesRefreshKey, setDuesRefreshKey] = useState(0);
  const [paymentTypeOption, setPaymentTypeOption] = useState('Rent'); // 'Rent' or 'Meter'
  const [loading, setLoading] = useState(true);
  const [showRentModal, setShowRentModal] = useState(false);
  const [rentAmount, setRentAmount] = useState('');
  const [rentMode, setRentMode] = useState('Online');
  const [rentReceivedBy, setRentReceivedBy] = useState('');
  const [rentScreenshot, setRentScreenshot] = useState(null);
  const [isSubmittingRent, setIsSubmittingRent] = useState(false);
  const [rentSuccess, setRentSuccess] = useState(false);
  const [rentAlreadyPaid, setRentAlreadyPaid] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    setLoading(true);
    const q = query(collection(db, 'users', user.uid, 'payments'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPayments(snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() })));
      setLoading(false);
    });
    
    // Fetch unpaid meter bills
    const qM = query(collection(db, 'meter_bills'), where('tenantId', '==', user.uid), where('status', '==', 'Unpaid'));
    const unsubM = onSnapshot(qM, (snapshot) => {
      setMeterBills(snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() })));
    });

    // Fetch custom / recorded dues
    const qD = query(collection(db, 'outstanding_dues'), where('tenantId', '==', user.uid));
    const unsubD = onSnapshot(qD, (snapshot) => {
      setCustomDues(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    
    return () => {
      unsubscribe();
      unsubM();
      unsubD();
    };
  }, [user, duesRefreshKey]);


  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 25); // Giving a 5 day grace period for 30 days

  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const adminPaidTill = user?.subscribedPG?.paidTillMonth || '';
  const isPaidByAdmin = adminPaidTill >= currentMonthStr;

  const isPaidThisMonth = isPaidByAdmin || payments.some(p => {
    if (!p.createdAt) return false;
    const pDate = new Date(p.createdAt);
    
    if (p.paymentType === 'monthly_rent') {
      return pDate.getMonth() === new Date().getMonth() && pDate.getFullYear() === new Date().getFullYear();
    }
    
    if (p.paymentType === 'first_month' || p.paymentType === 'token') {
      return pDate > thirtyDaysAgo;
    }
    
    return false;
  });

  const baseRent = user?.subscribedPG?.rent || user?.subscribedPG?.leaseAmount || user?.profileData?.roomDetails?.monthlyRent || '';

  const handlePayRentClick = () => {
    if (isPaidThisMonth) {
      setRentAlreadyPaid(true);
      return;
    }
    setRentAmount(baseRent);
    setPaymentTypeOption('Rent');
    setShowRentModal(true);
  };

  const submitRent = async (e) => {
    e.preventDefault();
    if (rentMode === 'Online' && !rentScreenshot) {
      return alert("Please upload a payment screenshot.");
    }
    if (!rentReceivedBy) {
      return alert("Please enter who received the payment.");
    }
    setIsSubmittingRent(true);
    try {
      let base64Img = null;
      if (rentScreenshot) {
        base64Img = await compressImage(rentScreenshot);
      }
      
      const isMeter = paymentTypeOption === 'Meter';
      const actualAmt = isMeter ? meterBills.reduce((acc, b) => acc + (b.totalAmount || 0), 0) : Number(rentAmount);
      
      const paymentObj = {
        amount: actualAmt,
        date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
        name: isMeter ? 'Meter Bill Payment' : 'Monthly Rent Payment',
        paymentMode: rentMode,
        paymentType: isMeter ? 'meter_bill' : 'monthly_rent',
        pgName: user?.subscribedPG?.pgName || 'PG',
        receivedBy: rentReceivedBy,
        status: isMeter ? 'Paid' : 'Pending Verification',
        type: 'Debit',
        createdAt: new Date().toISOString()
      };
      if (base64Img) paymentObj.screenshot = base64Img;

      // Add to user's payments
      const docRef = await addDoc(collection(db, 'users', user.uid, 'payments'), paymentObj);
      if (isMeter) {
        for (const mb of meterBills) {
          await updateDoc(doc(db, 'meter_bills', mb.docId), {
            status: 'Paid',
            paymentId: docRef.id
          });
        }
      }

      // Add to rent_receipts for admin
      if (user?.subscribedPG?.pgId) {
        await addDoc(collection(db, 'rent_receipts'), {
          ...paymentObj,
          adminId: user.subscribedPG.adminId || user.subscribedPG.pgId,
          pgId: user.subscribedPG.adminId ? user.subscribedPG.pgId : 'primary',
          tenantId: user.uid,
          tenantName: user.name || 'Student',
          roomNo: user?.subscribedPG?.roomNo || 'Unknown'
        });

        // Notify Admin
        await addDoc(collection(db, 'notifications'), {
          adminId: user.subscribedPG.adminId || user.subscribedPG.pgId,
          pgId: user.subscribedPG.adminId ? user.subscribedPG.pgId : 'primary',
          tenantId: user.uid,
          tenantName: user.name || 'Student',
          title: '💸 Monthly Rent Received',
          desc: `${user.name || 'A student'} has submitted a monthly rent payment of ₹${rentAmount} via ${rentMode}.`,
          type: 'monthly_rent',
          action: 'VIEW_TRANSACTIONS',
          unread: true,
          createdAt: new Date().toISOString(),
          resolved: false,
          screenshot: base64Img || null
        });
      }

      setRentSuccess(true);
      setTimeout(() => {
        setShowRentModal(false);
        setRentSuccess(false);
        setRentScreenshot(null);
        setRentReceivedBy('');
      }, 2500);

    } catch (err) {
      console.error("Error submitting rent:", err);
      alert("Error submitting rent: " + err.message);
    } finally {
      setIsSubmittingRent(false);
    }
  };

  // Stats
  const totalPaid = payments
    .filter(p => p.type === 'Debit')
    .reduce((sum, p) => sum + parseFloat(String(p.amount).replace(/,/g, '') || 0), 0);

  const tokenPayments = payments.filter(p => p.paymentType === 'token');
  const rentPayments = payments.filter(p => p.paymentType !== 'token' && p.type === 'Debit');

  const duesData = aggregateTenantDues({
    tenant: user,
    rentReceipts: payments,
    meterBills: meterBills,
    customDues: customDues
  });

  return (
    <div className="page-content bg-white pb-nav">
      <TopBar title="My Payments" />

      <div className="account-container">
        {/* ── UNIFIED OUTSTANDING DUES BAR ── */}
        <StudentOutstandingDuesBar
          duesData={duesData}
          onClick={() => setShowDuesModal(true)}
        />

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          <div style={{ background: 'linear-gradient(135deg, #064e3b, #166534)', borderRadius: '16px', padding: '14px 12px' }}>
            <p style={{ margin: '0 0 4px', fontSize: '11px', color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>Total Paid</p>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: 'white' }}>₹{totalPaid.toLocaleString('en-IN')}</h3>
          </div>
          <div style={{ background: '#fef9c3', borderRadius: '16px', padding: '14px 12px', border: '1px solid #fde68a' }}>
            <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#92400e', fontWeight: '600' }}>Tokens</p>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#b45309' }}>{tokenPayments.length}</h3>
          </div>
          <div style={{ background: '#f0fdf4', borderRadius: '16px', padding: '14px 12px', border: '1px solid #bbf7d0' }}>
            <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#166534', fontWeight: '600' }}>Rent Paid</p>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#166534' }}>{rentPayments.length}</h3>
          </div>
        </div>


        {/* Pay Monthly Rent Card */}
        <div 
          onClick={handlePayRentClick}
          style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', borderRadius: '16px', padding: '16px 20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(15,23,42,0.15)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={24} color="#818cf8" />
            </div>
            <div>
              <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: '800', color: 'white' }}>Pay Monthly Rent</h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>
                {isPaidThisMonth ? '✓ You already paid this month' : 'Submit your rent securely'}
              </p>
            </div>
          </div>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronDown size={16} color="white" style={{ transform: 'rotate(-90deg)' }} />
          </div>
        </div>

        <h3 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>Transaction History</h3>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 24px', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid #dcfce7', borderTop: '3px solid #166534', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>Loading payments...</p>
          </div>
        ) : payments.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', gap: '16px', textAlign: 'center' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ReceiptText size={32} color="#166534" />
            </div>
            <p style={{ color: '#94a3b8', fontSize: '15px', fontWeight: '600', margin: 0 }}>No payment history yet</p>
            <p style={{ color: '#cbd5e1', fontSize: '13px', margin: 0 }}>Your token and rent payments will appear here automatically when you pay via chat.</p>
          </div>
        ) : (
          <div style={{ marginTop: '4px' }}>
            {payments.map(payment => (
              <PaymentCard key={payment.docId} payment={payment} />
            ))}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      <BottomNav activeNav="" />

      {showRentModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'flex-end', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'white', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: '24px', width: '100%', maxHeight: '90vh', overflowY: 'auto', animation: 'slideUp 0.3s ease-out' }}>
            {rentSuccess ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', textAlign: 'center' }}>
                <CheckCircle2 size={64} color="#16a34a" style={{ marginBottom: '16px' }} />
                <h2 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>Payment Submitted!</h2>
                <p style={{ margin: 0, fontSize: '15px', color: '#64748b' }}>Your rent payment has been sent for verification.</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>Pay Monthly Rent</h2>
                  <button onClick={() => setShowRentModal(false)} style={{ background: '#f1f5f9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={18} color="#475569" />
                  </button>
                </div>
                
                <form onSubmit={submitRent} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Payment For</label>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                      <button type="button" onClick={() => setPaymentTypeOption('Rent')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${paymentTypeOption === 'Rent' ? '#818cf8' : '#e2e8f0'}`, background: paymentTypeOption === 'Rent' ? '#e0e7ff' : '#f8fafc', color: paymentTypeOption === 'Rent' ? '#4f46e5' : '#64748b', fontWeight: '600' }}>Monthly Rent</button>
                      <button type="button" onClick={() => setPaymentTypeOption('Meter')} disabled={meterBills.length === 0} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${paymentTypeOption === 'Meter' ? '#818cf8' : '#e2e8f0'}`, background: paymentTypeOption === 'Meter' ? '#e0e7ff' : '#f8fafc', color: paymentTypeOption === 'Meter' ? '#4f46e5' : '#64748b', fontWeight: '600', opacity: meterBills.length === 0 ? 0.5 : 1 }}>Meter Bill</button>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>{paymentTypeOption === 'Rent' ? 'Rent Amount' : 'Meter Bill Amount'}</label>
                    <input type="number" value={paymentTypeOption === 'Rent' ? rentAmount : meterBills.reduce((acc, b) => acc + (b.totalAmount || 0), 0)} readOnly style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: '16px', fontWeight: '600', outline: 'none' }} />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Payment Mode</label>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button type="button" onClick={() => setRentMode('Online')} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: `2px solid ${rentMode === 'Online' ? '#3b82f6' : '#e2e8f0'}`, background: rentMode === 'Online' ? '#eff6ff' : 'white', color: rentMode === 'Online' ? '#1d4ed8' : '#64748b', fontWeight: '700', fontSize: '15px' }}>Online</button>
                      <button type="button" onClick={() => setRentMode('Cash')} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: `2px solid ${rentMode === 'Cash' ? '#16a34a' : '#e2e8f0'}`, background: rentMode === 'Cash' ? '#f0fdf4' : 'white', color: rentMode === 'Cash' ? '#15803d' : '#64748b', fontWeight: '700', fontSize: '15px' }}>Cash</button>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Received By</label>
                    <input type="text" placeholder="Name of Admin/Staff" value={rentReceivedBy} onChange={e => setRentReceivedBy(e.target.value)} required style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '15px', outline: 'none' }} />
                  </div>

                  {rentMode === 'Online' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Payment Screenshot</label>
                      <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', border: '2px dashed #cbd5e1', borderRadius: '16px', background: '#f8fafc', cursor: 'pointer' }}>
                        {rentScreenshot ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#16a34a', fontWeight: '600' }}>
                            <CheckCircle2 size={20} /> Screenshot Selected
                          </div>
                        ) : (
                          <>
                            <Upload size={24} color="#94a3b8" style={{ marginBottom: '8px' }} />
                            <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>Tap to upload screenshot</span>
                          </>
                        )}
                        <input type="file" accept="image/*" onChange={e => setRentScreenshot(e.target.files[0])} style={{ display: 'none' }} />
                      </label>
                    </div>
                  )}

                  <button type="submit" disabled={isSubmittingRent} style={{ marginTop: '8px', width: '100%', padding: '16px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '800', opacity: isSubmittingRent ? 0.7 : 1 }}>
                    {isSubmittingRent ? 'Submitting...' : 'Submit Payment'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Rent Already Paid Modal */}
      {rentAlreadyPaid && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '24px' }}>
          <div style={{ background: 'white', borderRadius: '24px', padding: '32px 24px', width: '100%', maxWidth: '360px', textAlign: 'center', animation: 'slideUp 0.3s ease-out' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <CheckCircle2 size={32} color="#16a34a" />
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>Rent Already Paid!</h2>
            <p style={{ margin: '0 0 24px', fontSize: '15px', color: '#64748b', fontWeight: '500', lineHeight: 1.5 }}>
              You have already paid your rent for this month. Thank you!
            </p>
            <button 
              onClick={() => setRentAlreadyPaid(false)}
              style={{ width: '100%', padding: '14px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '15px', cursor: 'pointer' }}
            >
              Okay
            </button>
          </div>
        </div>
      )}

      {/* ── OUTSTANDING DUES BREAKDOWN MODAL ── */}
      {showDuesModal && (
        <StudentOutstandingDuesModal
          isOpen={showDuesModal}
          onClose={() => setShowDuesModal(false)}
          tenant={user}
          duesData={duesData}
          pgName={user?.subscribedPG?.pgName}
          onRefresh={() => setDuesRefreshKey(p => p + 1)}
        />
      )}

      <style>{'@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }'}</style>

    </div>
  );
};

export default Account;
