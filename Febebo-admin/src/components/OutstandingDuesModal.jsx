import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { 
  BILL_TYPES, 
  formatCurrency, 
  formatDateDisplay, 
  getTodayStr, 
  getDuesAgingStyles,
  generateDuesShareText, 
  printOrDownloadDuesStatement 
} from '../utils/duesUtils';

export default function OutstandingDuesModal({
  isOpen,
  onClose,
  tenant,
  duesData,
  adminUser,
  activePgId,
  pgName = 'Febeboo PG',
  onRefresh
}) {
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [chargeForm, setChargeForm] = useState({
    type: 'food_extra',
    title: '',
    amount: '',
    dueDate: getTodayStr(),
    description: ''
  });
  const [isSubmittingCharge, setIsSubmittingCharge] = useState(false);

  // Pay Later Approval State
  const [approvingItem, setApprovingItem] = useState(null);
  const [payLaterForm, setPayLaterForm] = useState({
    newDueDate: '',
    remarks: ''
  });
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

  // Mark Paid State
  const [payingItem, setPayingItem] = useState(null);
  const [payForm, setPayForm] = useState({
    paymentMode: 'UPI',
    receivedBy: adminUser?.displayName || adminUser?.name || 'Admin',
    remarks: ''
  });
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);

  if (!isOpen || !tenant) return null;

  const tenantId = tenant.tenantId || tenant.id || tenant.uid;
  const tenantName = tenant.name || 'Resident';
  const roomNo = tenant.roomNo || 'N/A';

  // Handle Add New Bill/Charge
  const handleCreateCharge = async (e) => {
    e.preventDefault();
    if (!chargeForm.amount || Number(chargeForm.amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const typeMeta = BILL_TYPES[chargeForm.type] || BILL_TYPES.custom;
    const finalTitle = chargeForm.title.trim() || `${typeMeta.label} Charge`;

    setIsSubmittingCharge(true);
    try {
      const today = getTodayStr();
      const isPast = chargeForm.dueDate < today;

      const payload = {
        adminId: adminUser?.uid,
        pgId: activePgId || 'primary',
        tenantId: tenantId,
        tenantName: tenantName,
        roomNo: roomNo,
        type: chargeForm.type,
        title: finalTitle,
        description: chargeForm.description.trim(),
        amount: Number(chargeForm.amount),
        originalDueDate: chargeForm.dueDate,
        dueDate: chargeForm.dueDate,
        status: isPast ? 'overdue' : 'pending',
        createdAt: new Date().toISOString(),
        createdBy: adminUser?.displayName || adminUser?.name || 'Admin',
        paidAt: null
      };

      await addDoc(collection(db, 'outstanding_dues'), payload);

      // Notify student
      await addDoc(collection(db, 'users', tenantId, 'notifications'), {
        title: `💳 New Bill Added: ${finalTitle}`,
        desc: `A new charge of ${formatCurrency(chargeForm.amount)} has been added to your account. Due by ${formatDateDisplay(chargeForm.dueDate)}.`,
        type: 'bill',
        action: 'VIEW_ACCOUNT',
        unread: true,
        createdAt: new Date().toISOString()
      });

      setShowAddCharge(false);
      setChargeForm({ type: 'food_extra', title: '', amount: '', dueDate: getTodayStr(), description: '' });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error adding charge:', err);
      alert('Failed to add charge: ' + err.message);
    } finally {
      setIsSubmittingCharge(false);
    }
  };

  // Handle Pay Later Approval
  const handleApprovePayLater = async (e) => {
    e.preventDefault();
    if (!approvingItem || !payLaterForm.newDueDate) {
      alert('Please select a new extension date');
      return;
    }

    setIsSubmittingApproval(true);
    try {
      const approvalData = {
        approvedBy: adminUser?.displayName || adminUser?.name || 'Admin',
        approvedByRole: 'Admin',
        approvedAt: new Date().toISOString(),
        newDueDate: payLaterForm.newDueDate,
        remarks: payLaterForm.remarks.trim() || 'Approved extension request'
      };

      if (approvingItem.source === 'firestore_dues' && approvingItem.docId) {
        await updateDoc(doc(db, 'outstanding_dues', approvingItem.docId), {
          dueDate: payLaterForm.newDueDate,
          status: 'pay_later_approved',
          payLaterApproval: approvalData
        });
      } else if (approvingItem.source === 'meter_bill' && approvingItem.docId) {
        await updateDoc(doc(db, 'meter_bills', approvingItem.docId), {
          dueDate: payLaterForm.newDueDate,
          status: 'pay_later_approved',
          payLaterApproval: approvalData
        });
      } else {
        // For auto-generated rent or other items, create a formal doc in outstanding_dues
        await addDoc(collection(db, 'outstanding_dues'), {
          adminId: adminUser?.uid,
          pgId: activePgId || 'primary',
          tenantId: tenantId,
          tenantName: tenantName,
          roomNo: roomNo,
          type: approvingItem.type,
          title: approvingItem.title,
          description: approvingItem.description || '',
          amount: approvingItem.amount,
          originalDueDate: approvingItem.originalDueDate,
          dueDate: payLaterForm.newDueDate,
          status: 'pay_later_approved',
          rentMonth: approvingItem.rentMonth || null,
          createdAt: approvingItem.createdAt || new Date().toISOString(),
          payLaterApproval: approvalData
        });
      }

      // Send notification to tenant
      await addDoc(collection(db, 'users', tenantId, 'notifications'), {
        title: `✅ Pay Later Approved`,
        desc: `Your extension for "${approvingItem.title}" has been approved until ${formatDateDisplay(payLaterForm.newDueDate)} by ${approvalData.approvedBy}.`,
        type: 'success',
        action: 'VIEW_ACCOUNT',
        unread: true,
        createdAt: new Date().toISOString()
      });

      setApprovingItem(null);
      setPayLaterForm({ newDueDate: '', remarks: '' });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error approving pay later:', err);
      alert('Failed to approve extension: ' + err.message);
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  // Handle Mark Paid / Settle
  const handleMarkPaid = async (e) => {
    e.preventDefault();
    if (!payingItem) return;

    setIsSubmittingPay(true);
    try {
      const nowStr = new Date().toISOString();

      if (payingItem.source === 'firestore_dues' && payingItem.docId) {
        await updateDoc(doc(db, 'outstanding_dues', payingItem.docId), {
          status: 'paid',
          paidAt: nowStr,
          paidAmount: payingItem.amount,
          paymentMode: payForm.paymentMode,
          receivedBy: payForm.receivedBy,
          paymentRemarks: payForm.remarks
        });
      } else if (payingItem.source === 'meter_bill' && payingItem.docId) {
        await updateDoc(doc(db, 'meter_bills', payingItem.docId), {
          status: 'Paid',
          paidAt: nowStr,
          paymentMode: payForm.paymentMode,
          receivedBy: payForm.receivedBy
        });
      }

      // Add to rent_receipts for accounting
      await addDoc(collection(db, 'rent_receipts'), {
        adminId: adminUser?.uid,
        pgId: activePgId || 'primary',
        tenantId: tenantId,
        tenantName: tenantName,
        roomNo: roomNo,
        rentMonth: payingItem.rentMonth || new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
        amountPaid: payingItem.amount,
        totalAmount: payingItem.amount,
        paymentMode: payForm.paymentMode,
        receivedBy: payForm.receivedBy,
        datePaid: nowStr,
        items: [{ label: payingItem.title, amount: payingItem.amount }],
        remarks: `Cleared from Outstanding Dues: ${payForm.remarks || ''}`
      });

      // Send receipt notification
      await addDoc(collection(db, 'users', tenantId, 'notifications'), {
        title: `🧾 Payment Received: ${formatCurrency(payingItem.amount)}`,
        desc: `Your payment for "${payingItem.title}" was recorded via ${payForm.paymentMode}. All clear!`,
        type: 'receipt',
        action: 'VIEW_ACCOUNT',
        unread: true,
        createdAt: nowStr
      });

      setPayingItem(null);
      setPayForm({ paymentMode: 'UPI', receivedBy: adminUser?.displayName || 'Admin', remarks: '' });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error settling payment:', err);
      alert('Failed to settle payment: ' + err.message);
    } finally {
      setIsSubmittingPay(false);
    }
  };

  const handleShare = async () => {
    const text = generateDuesShareText({ tenantName, roomNo, duesData, pgName });
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Outstanding Dues - ${tenantName}`,
          text: text
        });
      } catch (err) {
        // Fallback to clipboard
        navigator.clipboard.writeText(text);
        alert('Dues summary copied to clipboard!');
      }
    } else {
      navigator.clipboard.writeText(text);
      alert('Dues summary copied to clipboard! You can paste it in WhatsApp.');
    }
  };

  const handlePrint = () => {
    printOrDownloadDuesStatement({
      tenantName,
      roomNo,
      studentId: tenant.studentId || tenant.id,
      duesData,
      pgName,
      adminName: adminUser?.displayName || 'Admin'
    });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)' }} />

      {/* Main Sheet / Modal Container */}
      <div style={{ position: 'relative', background: '#f8fafc', width: '92%', maxWidth: 480, maxHeight: '90vh', borderRadius: 24, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)' }}>
        
        {/* Modal Header */}
        <div style={{ background: 'linear-gradient(135deg, #0c4a6e, #0369a1)', padding: '20px 20px 16px', color: 'white', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22, color: 'white' }}>receipt_long</span>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'white' }}>Outstanding Dues</h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#bae6fd' }}>{tenantName} · Room {roomNo}</p>
              </div>
            </div>

            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
            </button>
          </div>

          {/* Aggregated Total Balance Bar */}
          <div style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', borderRadius: 16, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.2)' }}>
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#e0f2fe', textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Overdue Balance</p>
              <h2 style={{ margin: '2px 0 0', fontSize: 24, fontWeight: 900, color: '#ffffff' }}>
                {formatCurrency(duesData.totalOutstanding)}
              </h2>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={handleShare} title="Share on WhatsApp" style={{ background: '#22c55e', border: 'none', borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 4, color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>share</span>
                Share
              </button>
              <button onClick={handlePrint} title="Download / Print Statement" style={{ background: 'white', border: 'none', borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 4, color: '#0369a1', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>print</span>
                Slip
              </button>
            </div>
          </div>
        </div>

        {/* Action Controls Bar */}
        <div style={{ padding: '12px 16px', background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>
            {duesData.items.length} Due Item{duesData.items.length !== 1 ? 's' : ''} (Oldest Overdue First)
          </span>
          <button 
            onClick={() => setShowAddCharge(true)}
            style={{ background: '#0284c7', color: 'white', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add_circle</span>
            Add Bill / Charge
          </button>
        </div>

        {/* Scrollable Items List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {duesData.items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#10b981', marginBottom: 8 }}>check_circle</span>
              <h4 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: '#0f172a' }}>All Clear!</h4>
              <p style={{ margin: 0, fontSize: 13 }}>This student has no outstanding dues.</p>
            </div>
          ) : (
            duesData.items.map((item, idx) => {
              const typeMeta = BILL_TYPES[item.type] || BILL_TYPES.custom;
              const aging = getDuesAgingStyles(item);
              const hasPayLaterReq = item.status === 'pay_later_requested' || !!item.payLaterRequest;
              const hasPayLaterApproved = item.status === 'pay_later_approved' || !!item.payLaterApproval;

              return (
                <div 
                  key={item.id || idx} 
                  style={{ 
                    background: aging.cardBg || 'white', 
                    borderRadius: 16, 
                    border: `1.5px solid ${aging.border}`, 
                    borderLeft: `5px solid ${aging.stripe}`,
                    padding: '16px', 
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 10 
                  }}
                >
                  
                  {/* Item Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: typeMeta.bg, color: typeMeta.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{typeMeta.icon}</span>
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{item.title}</h4>
                        <span style={{ fontSize: 11, fontWeight: 700, color: typeMeta.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>{typeMeta.label}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: 0, fontSize: 17, fontWeight: 900, color: aging.amountColor || '#0f172a' }}>
                        {formatCurrency(item.amount)}
                      </p>
                    </div>
                  </div>

                  {/* Description / Subtext */}
                  {item.description && (
                    <p style={{ margin: 0, fontSize: 12, color: '#64748b', background: '#f8fafc', padding: '6px 10px', borderRadius: 8 }}>
                      {item.description}
                    </p>
                  )}

                  {/* Dates & Status Tags */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, fontSize: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#94a3b8' }}>calendar_month</span>
                      <span style={{ color: '#64748b' }}>Due: <strong>{formatDateDisplay(item.originalDueDate || item.dueDate)}</strong></span>
                    </div>

                    <div>
                      <span style={{ background: aging.tagBg, color: aging.tagText, padding: '3px 8px', borderRadius: 6, fontWeight: 800, fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{aging.tagIcon}</span>
                        {aging.tagLabel}
                      </span>
                    </div>
                  </div>

                  {/* Pay Later Request Status Box */}
                  {hasPayLaterReq && (
                    <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 12, padding: '10px 12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#b45309', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>hourglass_top</span>
                          PAY LATER REQUESTED BY STUDENT
                        </span>
                        <button 
                          onClick={() => {
                            setApprovingItem(item);
                            setPayLaterForm({ newDueDate: item.payLaterRequest?.requestedDueDate || '', remarks: '' });
                          }}
                          style={{ background: '#d97706', color: 'white', border: 'none', borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                        >
                          Review & Approve
                        </button>
                      </div>
                      <p style={{ margin: 0, fontSize: 12, color: '#78350f', fontStyle: 'italic' }}>
                        "{item.payLaterRequest?.reason || 'Need extra time for payment'}"
                      </p>
                    </div>
                  )}

                  {/* Pay Later Approved Box */}
                  {hasPayLaterApproved && item.payLaterApproval && (
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '8px 12px', fontSize: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#166534', fontWeight: 800 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>verified</span>
                        Extension Approved until {formatDateDisplay(item.payLaterApproval.newDueDate)}
                      </div>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: '#15803d' }}>
                        Approved by <strong>{item.payLaterApproval.approvedBy}</strong> ({item.payLaterApproval.approvedByRole || 'Admin'}) on {formatDateDisplay(item.payLaterApproval.approvedAt)}
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: 8, paddingTop: 4, borderTop: '1px solid #f1f5f9' }}>
                    <button
                      onClick={() => setPayingItem(item)}
                      style={{ flex: 1, background: '#10b981', color: 'white', border: 'none', borderRadius: 10, padding: '8px 10px', fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                      Mark as Paid
                    </button>

                    {!hasPayLaterReq && (
                      <button
                        onClick={() => {
                          setApprovingItem(item);
                          setPayLaterForm({ newDueDate: item.dueDate || getTodayStr(), remarks: '' });
                        }}
                        style={{ flex: 1, background: '#f8fafc', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: 10, padding: '8px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>event_repeat</span>
                        Extend Date
                      </button>
                    )}

                    {item.source === 'firestore_dues' && (
                      <button
                        onClick={async () => {
                          if (window.confirm(`Delete charge "${item.title}"?`)) {
                            await deleteDoc(doc(db, 'outstanding_dues', item.docId));
                            if (onRefresh) onRefresh();
                          }
                        }}
                        style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 10, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── SUB-MODAL 1: ADD NEW CHARGE / BILL ── */}
        {showAddCharge && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.65)', zIndex: 130, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <div style={{ background: 'white', width: '100%', borderRadius: '24px 24px 0 0', padding: '24px 20px', maxHeight: '85vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Add Bill / Charge</h3>
                <button onClick={() => setShowAddCharge(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                </button>
              </div>

              <form onSubmit={handleCreateCharge} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Bill Type</label>
                  <select
                    value={chargeForm.type}
                    onChange={e => setChargeForm(p => ({ ...p, type: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: 14, fontFamily: 'inherit', background: 'white' }}
                  >
                    <option value="food_extra">🍲 Food / Extra Plate</option>
                    <option value="electricity">⚡ Electricity Bill</option>
                    <option value="rent">🏠 Monthly Rent</option>
                    <option value="maintenance">🛠️ Maintenance / Repair</option>
                    <option value="fine">⚠️ Fine / Late Fee</option>
                    <option value="custom">📝 Other Custom Charge</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Title / Item Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Extra Lunch Plate or AC Filter Cleaning"
                    value={chargeForm.title}
                    onChange={e => setChargeForm(p => ({ ...p, title: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Amount (₹) *</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 150"
                      value={chargeForm.amount}
                      onChange={e => setChargeForm(p => ({ ...p, amount: e.target.value }))}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Due Date *</label>
                    <input
                      type="date"
                      required
                      value={chargeForm.dueDate}
                      onChange={e => setChargeForm(p => ({ ...p, dueDate: e.target.value }))}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Reason / Details (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="Provide context on why this charge is being added..."
                    value={chargeForm.description}
                    onChange={e => setChargeForm(p => ({ ...p, description: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingCharge}
                  style={{ background: '#0284c7', color: 'white', border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 800, cursor: 'pointer', marginTop: 6 }}
                >
                  {isSubmittingCharge ? 'Adding...' : 'Add to Outstanding Dues'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── SUB-MODAL 2: APPROVE / EXTEND PAY LATER ── */}
        {approvingItem && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.65)', zIndex: 130, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <div style={{ background: 'white', width: '100%', borderRadius: '24px 24px 0 0', padding: '24px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Grant Pay Later Extension</h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>{approvingItem.title} — {formatCurrency(approvingItem.amount)}</p>
                </div>
                <button onClick={() => setApprovingItem(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                </button>
              </div>

              {approvingItem.payLaterRequest?.reason && (
                <div style={{ background: '#fef3c7', borderRadius: 12, padding: '10px 14px', marginBottom: 14 }}>
                  <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>Student's Reason</p>
                  <p style={{ margin: 0, fontSize: 13, color: '#78350f' }}>"{approvingItem.payLaterRequest.reason}"</p>
                </div>
              )}

              <form onSubmit={handleApprovePayLater} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                    Select New Extension Date (Flexible) *
                  </label>
                  <input
                    type="date"
                    required
                    min={getTodayStr()}
                    value={payLaterForm.newDueDate}
                    onChange={e => setPayLaterForm(p => ({ ...p, newDueDate: e.target.value }))}
                    style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1.5px solid #0284c7', fontSize: 15, fontWeight: 700, color: '#0f172a', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Approval Remarks / Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Approved via phone conversation"
                    value={payLaterForm.remarks}
                    onChange={e => setPayLaterForm(p => ({ ...p, remarks: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ background: '#f8fafc', borderRadius: 10, padding: '8px 12px', fontSize: 11, color: '#64748b' }}>
                  ℹ️ This action will be recorded with your account <strong>({adminUser?.displayName || 'Admin'})</strong> for transparency.
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingApproval}
                  style={{ background: '#0284c7', color: 'white', border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}
                >
                  {isSubmittingApproval ? 'Saving...' : 'Confirm & Grant Extension'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── SUB-MODAL 3: MARK AS PAID / SETTLE ── */}
        {payingItem && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.65)', zIndex: 130, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <div style={{ background: 'white', width: '100%', borderRadius: '24px 24px 0 0', padding: '24px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Record Payment</h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>{payingItem.title}</p>
                </div>
                <button onClick={() => setPayingItem(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                </button>
              </div>

              <div style={{ background: '#ecfeff', border: '1px solid #a5f3fc', borderRadius: 14, padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0891b2' }}>Amount to Settle</span>
                <span style={{ fontSize: 20, fontWeight: 900, color: '#0369a1' }}>{formatCurrency(payingItem.amount)}</span>
              </div>

              <form onSubmit={handleMarkPaid} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Payment Mode</label>
                    <select
                      value={payForm.paymentMode}
                      onChange={e => setPayForm(p => ({ ...p, paymentMode: e.target.value }))}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: 14, fontFamily: 'inherit', background: 'white' }}
                    >
                      <option value="UPI">UPI / QR</option>
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Card">Debit / Credit Card</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Received By</label>
                    <input
                      type="text"
                      required
                      value={payForm.receivedBy}
                      onChange={e => setPayForm(p => ({ ...p, receivedBy: e.target.value }))}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Transaction ID / Note</label>
                  <input
                    type="text"
                    placeholder="e.g. UPI Ref # or Cash received at desk"
                    value={payForm.remarks}
                    onChange={e => setPayForm(p => ({ ...p, remarks: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingPay}
                  style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}
                >
                  {isSubmittingPay ? 'Settling...' : 'Confirm & Settle Payment'}
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
