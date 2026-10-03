import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { 
  BILL_TYPES, 
  formatCurrency, 
  formatDateDisplay, 
  getTodayStr, 
  getDuesAgingStyles,
  generateDuesShareText, 
  printOrDownloadDuesStatement 
} from '../utils/duesUtils';

export default function StudentOutstandingDuesModal({
  isOpen,
  onClose,
  tenant,
  duesData,
  pgName = 'Febeboo PG',
  onRefresh
}) {
  const [requestingItem, setRequestingItem] = useState(null);
  const [requestForm, setRequestForm] = useState({
    reason: '',
    requestedDueDate: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !tenant) return null;

  const tenantId = tenant.tenantId || tenant.id || tenant.uid;
  const tenantName = tenant.name || 'Resident';
  const roomNo = tenant.roomNo || tenant.subscribedPG?.roomNo || 'N/A';
  const adminId = tenant.adminId || tenant.subscribedPG?.adminId || tenant.subscribedPG?.pgId;

  const handleRequestPayLater = async (e) => {
    e.preventDefault();
    if (!requestingItem || !requestForm.reason.trim()) {
      alert('Please provide a reason for requesting later payment.');
      return;
    }

    setIsSubmitting(true);
    try {
      const nowStr = new Date().toISOString();
      const reqPayload = {
        reason: requestForm.reason.trim(),
        requestedDueDate: requestForm.requestedDueDate || null,
        requestedAt: nowStr
      };

      if (requestingItem.source === 'firestore_dues' && requestingItem.docId) {
        await updateDoc(doc(db, 'outstanding_dues', requestingItem.docId), {
          status: 'pay_later_requested',
          payLaterRequest: reqPayload
        });
      } else if (requestingItem.source === 'meter_bill' && requestingItem.docId) {
        await updateDoc(doc(db, 'meter_bills', requestingItem.docId), {
          status: 'pay_later_requested',
          payLaterRequest: reqPayload
        });
      } else {
        // Auto-generated rent -> create document in outstanding_dues
        await addDoc(collection(db, 'outstanding_dues'), {
          adminId: adminId || 'admin',
          pgId: tenant.subscribedPG?.pgId || 'primary',
          tenantId: tenantId,
          tenantName: tenantName,
          roomNo: roomNo,
          type: requestingItem.type,
          title: requestingItem.title,
          description: requestingItem.description || '',
          amount: requestingItem.amount,
          originalDueDate: requestingItem.originalDueDate,
          dueDate: requestingItem.dueDate,
          status: 'pay_later_requested',
          rentMonth: requestingItem.rentMonth || null,
          createdAt: nowStr,
          payLaterRequest: reqPayload
        });
      }

      // Notify Admin
      if (adminId) {
        await addDoc(collection(db, 'notifications'), {
          adminId: adminId,
          pgId: tenant.subscribedPG?.pgId || 'primary',
          tenantId: tenantId,
          tenantName: tenantName,
          roomNo: roomNo,
          title: `⏳ Pay Later Request: ${tenantName}`,
          desc: `${tenantName} (Room ${roomNo}) requested to pay "${requestingItem.title}" (${formatCurrency(requestingItem.amount)}) later. Reason: "${requestForm.reason.trim()}".`,
          type: 'pay_later_request',
          action: 'VIEW_ACCOUNT',
          unread: true,
          createdAt: nowStr
        });
      }

      alert('Your pay later request has been sent to the management for approval.');
      setRequestingItem(null);
      setRequestForm({ reason: '', requestedDueDate: '' });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error requesting pay later:', err);
      alert('Failed to submit request: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShare = async () => {
    const text = generateDuesShareText({ tenantName, roomNo, duesData, pgName });
    if (navigator.share) {
      try {
        await navigator.share({
          title: `My Dues - ${tenantName}`,
          text: text
        });
      } catch (err) {
        navigator.clipboard.writeText(text);
        alert('Dues statement copied to clipboard!');
      }
    } else {
      navigator.clipboard.writeText(text);
      alert('Dues statement copied to clipboard!');
    }
  };

  const handlePrint = () => {
    printOrDownloadDuesStatement({
      tenantName,
      roomNo,
      studentId: tenant.studentId || tenant.id,
      duesData,
      pgName,
      adminName: 'Febeboo PG Management'
    });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }} />

      {/* Sheet Container */}
      <div style={{ position: 'relative', background: '#f8fafc', width: '100%', maxWidth: 480, maxHeight: '90vh', borderTopLeftRadius: 28, borderTopRightRadius: 28, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 -8px 32px rgba(0,0,0,0.15)', animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)' }}>
        
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', padding: '20px 20px 16px', color: 'white', position: 'relative' }}>
          {/* Pull Handle */}
          <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.3)', borderRadius: 4, margin: '0 auto 14px' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'white' }}>My Outstanding Dues</h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>Room {roomNo} · {pgName}</p>
            </div>

            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
            </button>
          </div>

          {/* Aggregated Total Balance Bar */}
          <div style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)', borderRadius: 16, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.15)' }}>
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Unpaid Balance</p>
              <h2 style={{ margin: '2px 0 0', fontSize: 24, fontWeight: 900, color: '#f87171' }}>
                {formatCurrency(duesData.totalOutstanding)}
              </h2>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={handleShare} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 4, color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>share</span>
                Share
              </button>
              <button onClick={handlePrint} style={{ background: 'white', border: 'none', borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 4, color: '#0f172a', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>
                Slip
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Items List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' }}>
          {duesData.items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#10b981', marginBottom: 8 }}>check_circle</span>
              <h4 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: '#0f172a' }}>All Clear! 🎉</h4>
              <p style={{ margin: 0, fontSize: 13 }}>You have no outstanding dues. Thank you for paying on time!</p>
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

                  {/* Description */}
                  {item.description && (
                    <p style={{ margin: 0, fontSize: 12, color: '#64748b', background: '#f8fafc', padding: '6px 10px', borderRadius: 8 }}>
                      {item.description}
                    </p>
                  )}

                  {/* Dates & Status Tags */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, fontSize: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#94a3b8' }}>calendar_month</span>
                      <span style={{ color: '#64748b' }}>Due Date: <strong>{formatDateDisplay(item.originalDueDate || item.dueDate)}</strong></span>
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
                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#92400e' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#d97706' }}>hourglass_top</span>
                        Pay Later Requested (Pending Admin Approval)
                      </div>
                      <p style={{ margin: '3px 0 0', fontSize: 11, color: '#78350f', fontStyle: 'italic' }}>
                        Reason: "{item.payLaterRequest?.reason || 'Need extra time'}"
                      </p>
                    </div>
                  )}

                  {/* Pay Later Approved Box */}
                  {hasPayLaterApproved && item.payLaterApproval && (
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '8px 12px', fontSize: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#166534', fontWeight: 800 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>verified</span>
                        Extension Granted until {formatDateDisplay(item.payLaterApproval.newDueDate)}
                      </div>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: '#15803d' }}>
                        Approved by <strong>{item.payLaterApproval.approvedBy}</strong> ({item.payLaterApproval.approvedByRole || 'Admin'})
                      </p>
                    </div>
                  )}

                  {/* Request Pay Later Action Button */}
                  {!hasPayLaterReq && !hasPayLaterApproved && (
                    <div style={{ paddingTop: 4, borderTop: '1px solid #f1f5f9' }}>
                      <button
                        onClick={() => {
                          setRequestingItem(item);
                          setRequestForm({ reason: '', requestedDueDate: '' });
                        }}
                        style={{ width: '100%', background: '#fff7ed', color: '#c2410c', border: '1.5px solid #fed7aa', borderRadius: 10, padding: '8px 12px', fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>schedule</span>
                        Request Pay Later (Need More Time?)
                      </button>
                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>

        {/* ── SUB-MODAL: REQUEST PAY LATER ── */}
        {requestingItem && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.65)', zIndex: 10000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <div style={{ background: 'white', width: '100%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: '24px 20px calc(24px + env(safe-area-inset-bottom, 0px))' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Request Pay Later</h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>{requestingItem.title} — {formatCurrency(requestingItem.amount)}</p>
                </div>
                <button onClick={() => setRequestingItem(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                </button>
              </div>

              <form onSubmit={handleRequestPayLater} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                    Reason for Delay *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="e.g. Salary credited on 10th, waiting for parents to transfer, etc."
                    value={requestForm.reason}
                    onChange={e => setRequestForm(p => ({ ...p, reason: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                    Suggested Payment Date (Optional)
                  </label>
                  <input
                    type="date"
                    min={getTodayStr()}
                    value={requestForm.requestedDueDate}
                    onChange={e => setRequestForm(p => ({ ...p, requestedDueDate: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ background: '#f8fafc', borderRadius: 10, padding: '8px 12px', fontSize: 11, color: '#64748b' }}>
                  ℹ️ This request will be sent to the PG manager/admin. You will be notified once they review and approve the new due date.
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ background: '#ea580c', color: 'white', border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Pay Later Request'}
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
