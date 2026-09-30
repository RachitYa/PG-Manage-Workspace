import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const cyan = '#0891b2';

// ─────────────────────────────────────────────────────────────────────────────
// VIEW RECEIPT MODAL  (opened when clicking an existing paid receipt)
// ─────────────────────────────────────────────────────────────────────────────
export default function DetailedReceiptModal({ receipt, onClose }) {
  const [imgFullscreen, setImgFullscreen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [meterBill, setMeterBill] = useState(null);

  // Print listeners
  useEffect(() => {
    const handleAfterPrint = () => setIsPrinting(false);
    const handleFocus = () => { if (isPrinting) setIsPrinting(false); };
    window.addEventListener('afterprint', handleAfterPrint);
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isPrinting]);

  // Fetch meter bill for this tenant & month
  useEffect(() => {
    if (!receipt) return;
    const fetchMeter = async () => {
      try {
        const tId = receipt.tenantId || receipt.userId || receipt.tenant?.uid || receipt.tenant?.id;
        const m = receipt.month || receipt.rentMonth || receipt.billMonth;
        if (!tId || !m) return;
        const q = query(
          collection(db, 'meter_bills'),
          where('tenantId', '==', tId),
          where('billMonth', '==', m)
        );
        const snap = await getDocs(q);
        if (!snap.empty) setMeterBill(snap.docs[0].data());
        else setMeterBill(null);
      } catch (e) {
        setMeterBill(null);
      }
    };
    fetchMeter();
  }, [receipt]);

  if (!receipt) return null;

  // ── Header fields ──────────────────────────────────────────────────────────
  const tenantName = receipt.tenantName || receipt.tenant?.name
    || (receipt.name && !receipt.name.includes('Payment') ? receipt.name : 'Unknown');
  const room       = receipt.room || receipt.roomNo || receipt.tenant?.roomNo || '';
  const month      = receipt.month || receipt.rentMonth || '';
  const rawDate    = receipt.datePaid || receipt.date || receipt.createdAt || receipt.timestamp;

  let date = '—';
  if (rawDate) {
    const d = new Date(rawDate?.toDate ? rawDate.toDate() : rawDate);
    if (!isNaN(d.getTime())) {
      date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } else {
      date = String(rawDate);
    }
  }

  const paymentMode   = receipt.paymentMode || receipt.paymentMethod || 'N/A';
  const isOnline      = paymentMode === 'Online' || paymentMode === 'UPI';
  const receivedBy    = receipt.receivedBy || '';
  const senderUPI     = receipt.senderUPI || '';
  const receiverUPI   = receipt.receiverUPI || '';
  const transactionId = receipt.transactionId || receipt.upiRef || '';
  const screenshot    = receipt.screenshot || receipt.paymentScreenshot || null;
  const note          = receipt.note || receipt.remarks || receipt.approvalRemarks || '';
  const pgName        = receipt.pgName || receipt.tenant?.pgName || 'PG Management';
  const receiptNo     = receipt.id
    ? receipt.id.substring(0, 8).toUpperCase()
    : Math.random().toString(36).substring(2, 10).toUpperCase();

  // ── Build bill breakdown – show EVERY category, always with a value (₹0 if absent) ──
  // Helper: look inside items[] first, then fall back to top-level field
  const getAmt = (labels, fallback) => {
    if (receipt.items && receipt.items.length > 0) {
      const found = receipt.items.find(i => labels.includes(i.label));
      if (found !== undefined) return Number(found.amount || 0);
    }
    return Number(fallback || 0);
  };

  const BILL_ROWS = [
    { label: 'Room Rent',       icon: '🏠', amount: getAmt(['Room Rent'],                          receipt.rent) },
    { label: 'Meter Charges',   icon: '⚡', amount: getAmt(['Meter Unit','Meter Charges'],          receipt.meterAmt || receipt.meter) },
    { label: 'Food Charge',     icon: '🍽️', amount: getAmt(['Food Charge'],                        receipt.foodAmt || receipt.food) },
    { label: 'Extra Plates',    icon: '🍛', amount: getAmt(['Extra Plates'],                       receipt.extraPlates) },
    { label: 'Amenities',       icon: '✨', amount: getAmt(['Amenities'],                          receipt.amenities) },
    { label: 'Laundry',         icon: '👕', amount: getAmt(['Laundry'],                            receipt.laundry) },
    { label: 'House Keeping',   icon: '🧹', amount: getAmt(['House Keeping'],                      receipt.housekeeping) },
    { label: 'Fines',           icon: '⚠️', amount: getAmt(['Fines'],                              receipt.fine || receipt.fines) },
    { label: 'Security Deposit',icon: '🔐', amount: getAmt(['Security Deposit'],                   receipt.security) },
    { label: 'Other Charges',   icon: '📋', amount: getAmt(['Other Charges'],                      receipt.other) },
  ];

  const paidAmount    = Number(receipt.amountPaid || receipt.amount || receipt.totalAmount
    || BILL_ROWS.reduce((s, r) => s + r.amount, 0));
  const pendingAmount = Number(receipt.pendingAmount || receipt.remainingAmount || 0);

  // ── UI helpers ─────────────────────────────────────────────────────────────
  const InfoRow = ({ label, value }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, padding: '4px 0' }}>
      <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 700, textAlign: 'right', maxWidth: '60%', wordBreak: 'break-word', fontFamily: "'JetBrains Mono', monospace" }}>{value || '—'}</span>
    </div>
  );

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => window.print(), 10);
  };

  return (
    <>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @media print {
          body * { visibility: hidden; }
          #printable-receipt, #printable-receipt * { visibility: visible; }
          #printable-receipt {
            position: absolute !important;
            left: 50% !important; top: 0 !important;
            transform: translateX(-50%) !important;
            width: 100% !important; max-width: 400px !important;
            max-height: none !important; overflow: visible !important;
            box-shadow: none !important; border: none !important; margin: 0 !important;
          }
        }
      `}</style>

      <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.75)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(6px)' }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}>

        <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

          {/* Receipt Paper */}
          <div id="printable-receipt" style={{ background: '#fff', width: '100%', borderRadius: 8, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', maxHeight: '85vh', overflowY: 'auto', fontFamily: "'Hanken Grotesk', sans-serif", position: 'relative' }}>

            {/* ── Header ─────────────────────────────────────────────────── */}
            <div style={{ padding: '24px 24px 16px', textAlign: 'center', background: 'linear-gradient(135deg,#0c1a2e,#0f2847)', borderBottom: '2px dashed rgba(255,255,255,0.15)' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: cyan, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 24 }}>receipt_long</span>
              </div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: 'white', textTransform: 'uppercase', letterSpacing: 1 }}>{pgName}</h2>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>PAYMENT RECEIPT</p>
            </div>

            <div style={{ padding: '20px 24px' }}>

              {/* Receipt No + Date */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <p style={{ fontSize: 10, color: '#94a3b8', margin: '0 0 2px', fontWeight: 700, textTransform: 'uppercase' }}>Receipt No.</p>
                  <p style={{ fontSize: 13, color: '#0f172a', margin: 0, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>#{receiptNo}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 10, color: '#94a3b8', margin: '0 0 2px', fontWeight: 700, textTransform: 'uppercase' }}>Date</p>
                  <p style={{ fontSize: 13, color: '#0f172a', margin: 0, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>{date}</p>
                </div>
              </div>

              {/* Billed To */}
              <div style={{ background: '#f1f5f9', padding: '12px 16px', borderRadius: 10, marginBottom: 18, border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: 10, color: '#94a3b8', margin: '0 0 4px', fontWeight: 700, textTransform: 'uppercase' }}>Billed To</p>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{tenantName}</h3>
                {room && <p style={{ fontSize: 13, color: '#475569', margin: '2px 0 0', fontWeight: 600 }}>Room {room}</p>}
                {month && <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0', fontWeight: 500 }}>{month}</p>}
              </div>

              {/* ── Payment Breakdown section ─────────────────────────────── */}
              <p style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.8, margin: '0 0 10px', borderBottom: '2px solid #0f172a', paddingBottom: 6 }}>Payment Breakdown</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                {BILL_ROWS.map((row, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 10px', borderRadius: 8, background: row.amount > 0 ? '#f8fafc' : 'transparent' }}>
                    <span style={{ fontSize: 13, color: row.amount > 0 ? '#334155' : '#94a3b8', fontWeight: row.amount > 0 ? 600 : 400 }}>
                      {row.icon} {row.label}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: row.amount > 0 ? 800 : 500, color: row.amount > 0 ? '#0f172a' : '#94a3b8', fontFamily: "'JetBrains Mono', monospace" }}>
                      ₹{row.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>

              {/* ── Meter Reading section (fetched live) ─────────────────── */}
              {meterBill ? (
                <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 800, color: '#065f46', textTransform: 'uppercase', letterSpacing: 0.8, margin: '0 0 10px', borderBottom: '1px dashed #6ee7b7', paddingBottom: 6 }}>
                    ⚡ Meter Reading — {meterBill.billMonth || month}
                  </p>

                  {/* Reading table */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
                    {[
                      { label: 'Prev. Reading', value: meterBill.meterReadingAtBillStart ?? '—' },
                      { label: 'Curr. Reading', value: meterBill.meterReadingAtBillEnd ?? '—' },
                      { label: 'Rate / Unit', value: `₹${meterBill.ratePerUnit ?? 8}` },
                    ].map(c => (
                      <div key={c.label} style={{ background: 'white', borderRadius: 8, padding: '8px 10px', textAlign: 'center', border: '1px solid #d1fae5' }}>
                        <p style={{ fontSize: 10, color: '#059669', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 4px' }}>{c.label}</p>
                        <p style={{ fontSize: 14, fontWeight: 900, color: '#0f172a', margin: 0 }}>{c.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Whole-room total */}
                  {(() => {
                    const start = Number(meterBill.meterReadingAtBillStart || 0);
                    const end   = Number(meterBill.meterReadingAtBillEnd   || 0);
                    const rate  = Number(meterBill.ratePerUnit || 8);
                    const totalUnits = end - start;
                    const totalRoomBill = (totalUnits * rate).toFixed(2);
                    return (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                          <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>Total Room Units</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{totalUnits.toFixed(2)} kWh</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', marginBottom: 6 }}>
                          <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>Total Room Bill</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>₹{totalRoomBill}</span>
                        </div>
                      </>
                    );
                  })()}

                  {/* Divider */}
                  <div style={{ borderTop: '1px dashed #6ee7b7', margin: '6px 0' }} />

                  {/* Tenant share */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: 12, color: '#065f46', fontWeight: 700 }}>Your Share</span>
                      <span style={{ fontSize: 11, color: '#059669', fontWeight: 500, marginLeft: 6 }}>({meterBill.consumedUnits ?? 0} units)</span>
                    </div>
                    <span style={{ fontSize: 16, fontWeight: 900, color: '#059669', fontFamily: "'JetBrains Mono', monospace" }}>
                      ₹{Number(meterBill.totalAmount || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ background: '#f8fafc', border: '1px dashed #e2e8f0', borderRadius: 10, padding: '10px 14px', marginBottom: 16, textAlign: 'center' }}>
                  <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>⚡ Meter Bill: ₹0 (not linked for this month)</span>
                </div>
              )}

              {/* ── Dashed separator ─────────────────────────────────────── */}
              <div style={{ borderTop: '2px dashed #cbd5e1', margin: '6px 0 16px' }} />

              {/* ── Total Paid + Balance Due ──────────────────────────────── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a', padding: '12px 16px', borderRadius: 10 }}>
                  <span style={{ fontWeight: 800, fontSize: 14, color: 'white', textTransform: 'uppercase' }}>Total Paid</span>
                  <span style={{ fontWeight: 900, fontSize: 22, color: '#34d399', fontFamily: "'JetBrains Mono', monospace" }}>₹{Number(paidAmount).toLocaleString('en-IN')}</span>
                </div>
                {pendingAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fef2f2', padding: '10px 16px', borderRadius: 10, border: '1px solid #fecaca' }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#ef4444', textTransform: 'uppercase' }}>Balance Due</span>
                    <span style={{ fontWeight: 800, fontSize: 16, color: '#ef4444', fontFamily: "'JetBrains Mono', monospace" }}>₹{Number(pendingAmount).toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>

              {/* ── Transaction Details ───────────────────────────────────── */}
              <p style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.8, margin: '0 0 8px', borderBottom: '1px solid #e2e8f0', paddingBottom: 6 }}>Transaction Details</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 24 }}>
                <InfoRow label="Payment Mode" value={paymentMode} />
                {receivedBy && <InfoRow label="Received By" value={receivedBy} />}
                {isOnline && transactionId && <InfoRow label="Ref ID" value={transactionId} />}
                {isOnline && senderUPI && <InfoRow label="Sender UPI" value={senderUPI} />}
                {isOnline && receiverUPI && <InfoRow label="Receiver UPI" value={receiverUPI} />}
                {note && <InfoRow label="Note" value={note} />}
              </div>

              {/* PAID/PARTIAL stamp */}
              <div style={{ position: 'absolute', top: 130, right: 28, border: `3px solid ${pendingAmount > 0 ? '#ef4444' : '#10b981'}`, color: pendingAmount > 0 ? '#ef4444' : '#10b981', fontSize: 22, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 2, padding: '6px 14px', borderRadius: 8, transform: 'rotate(15deg)', opacity: 0.18, pointerEvents: 'none' }}>
                {pendingAmount > 0 ? 'PARTIAL' : 'PAID'}
              </div>

              {/* Payment Screenshot */}
              {screenshot && (
                <>
                  <div style={{ borderTop: '2px dashed #cbd5e1', margin: '0 0 16px 0' }} />
                  <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5 }}>Payment Proof</p>
                  <div style={{ borderRadius: 8, overflow: 'hidden', cursor: 'pointer', border: '1px solid #e2e8f0' }} onClick={() => setImgFullscreen(true)}>
                    <img src={screenshot} alt="Payment Proof" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', display: 'block' }} />
                  </div>
                </>
              )}

              <div style={{ textAlign: 'center', marginTop: 28 }}>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, fontWeight: 500 }}>Generated by Febebo</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="no-print" style={{ display: 'flex', gap: 12, width: '100%', marginTop: 16 }}>
            <button onClick={onClose} style={{ flex: 1, padding: 14, background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              Close
            </button>
            <button onClick={handlePrint} disabled={isPrinting} style={{ flex: 2, padding: 14, background: cyan, color: 'white', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: isPrinting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 14px rgba(8,145,178,0.3)', opacity: isPrinting ? 0.7 : 1 }}>
              {isPrinting
                ? <span className="material-symbols-outlined" style={{ fontSize: 18, animation: 'spin 1s linear infinite' }}>autorenew</span>
                : <span className="material-symbols-outlined" style={{ fontSize: 18 }}>print</span>
              }
              {isPrinting ? 'Preparing...' : 'Print / Save PDF'}
            </button>
          </div>
        </div>

        {/* Fullscreen screenshot */}
        {imgFullscreen && screenshot && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setImgFullscreen(false)}>
            <img src={screenshot} alt="Full Payment Screenshot" style={{ maxWidth: '95%', maxHeight: '85vh', objectFit: 'contain', borderRadius: 12 }} />
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 12 }}>Tap anywhere to close</p>
          </div>
        )}
      </div>
    </>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// COLLECT PAYMENT MODAL  (opened when marking a due as paid — fill breakdown)
// ─────────────────────────────────────────────────────────────────────────────
export function CollectPaymentModal({ dueData, onClose, onConfirm }) {
  if (!dueData) return null;

  const totalDue = typeof dueData.amount === 'string' ? parseFloat(dueData.amount.replace(/,/g, '')) : (dueData.amount || 0);

  const [rent,         setRent]         = useState(dueData?.rent         || '');
  const [meter,        setMeter]        = useState(dueData?.meter        || '');
  const [food,         setFood]         = useState(dueData?.food         || '');
  const [extraPlates,  setExtraPlates]  = useState(dueData?.extraPlates  || '');
  const [amenities,    setAmenities]    = useState(dueData?.amenities    || '');
  const [laundry,      setLaundry]      = useState(dueData?.laundry      || '');
  const [housekeeping, setHousekeeping] = useState(dueData?.housekeeping || '');
  const [fine,         setFine]         = useState(dueData?.fine         || '');
  const [security,     setSecurity]     = useState(dueData?.security     || '');
  const [other,        setOther]        = useState(dueData?.other        || '');

  const [paymentMode,   setPaymentMode]   = useState('UPI');
  const [receivedBy,    setReceivedBy]    = useState('');
  const [senderUPI,     setSenderUPI]     = useState('');
  const [receiverUPI,   setReceiverUPI]   = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [note,          setNote]          = useState('');

  const currentSum = [rent, meter, food, extraPlates, amenities, laundry, housekeeping, fine, security, other]
    .reduce((acc, v) => acc + (parseFloat(v) || 0), 0);
  const remainingPending = Math.max(0, totalDue - currentSum);
  const isUPI = paymentMode === 'UPI';

  const FIELDS = [
    ['Room Rent',    rent,        setRent],
    ['Meter Unit',   meter,       setMeter],
    ['Food Charge',  food,        setFood],
    ['Extra Plates', extraPlates, setExtraPlates],
    ['Amenities',    amenities,   setAmenities],
    ['Laundry',      laundry,     setLaundry],
    ['House Keeping',housekeeping,setHousekeeping],
    ['Fines',        fine,        setFine],
    ['Security Deposit', security, setSecurity],
    ['Other Charges',other,       setOther],
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    const receiptData = {
      tenantName:  dueData.name  || '',
      tenantId:    dueData.tenantId || '',
      room:        dueData.room  || '',
      month:       dueData.month || '',
      rentMonth:   dueData.month || '',
      datePaid:    new Date().toISOString(),
      date:        new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      paymentMode,
      receivedBy,
      senderUPI,
      receiverUPI,
      transactionId,
      note,
      items: FIELDS.map(([label, val]) => ({ label, amount: parseFloat(val) || 0 })),
      totalAmount:    currentSum,
      amountPaid:     currentSum,
      pendingAmount:  remainingPending,
    };
    onConfirm(receiptData);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: 'white', width: '100%', maxWidth: 440, borderRadius: 24, padding: '24px 20px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', maxHeight: '92vh', overflowY: 'auto', fontFamily: "'Hanken Grotesk', sans-serif" }}>

        {/* Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Mark as Paid &amp; Fill Breakdown</h3>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>{dueData.name} ({dueData.room || ''})</p>
          </div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#64748b' }}>close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Summary box */}
          <div style={{ background: '#ecfeff', border: '1px solid #a5f3fc', borderRadius: 14, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 11, color: cyan, fontWeight: 700, textTransform: 'uppercase', margin: '0 0 2px' }}>Total Due Amount</p>
              <p style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: 0 }}>₹ {totalDue.toLocaleString('en-IN')}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 11, color: '#64748b', fontWeight: 700, margin: '0 0 2px' }}>Collected Total</p>
              <p style={{ fontSize: 18, fontWeight: 800, color: currentSum === totalDue ? '#10b981' : cyan, margin: 0 }}>₹ {currentSum.toLocaleString('en-IN')}</p>
            </div>
          </div>

          <p style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5, margin: '4px 0 -4px' }}>Fill Breakdown Charges (₹)</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {FIELDS.map(([label, val, setter]) => (
              <div key={label}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>{label}</label>
                <input
                  type="number" min="0" value={val}
                  onChange={e => setter(e.target.value)}
                  placeholder="0"
                  style={{ width: '100%', padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontWeight: 700 }}
                />
              </div>
            ))}
          </div>

          <p style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5, margin: '4px 0 -4px' }}>Payment &amp; Receiver Details</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>Payment Mode</label>
              <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)} style={{ width: '100%', padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, outline: 'none', background: 'white', fontWeight: 700 }}>
                <option value="UPI">📱 UPI</option>
                <option value="Cash">💵 Cash</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>Received By</label>
              <input value={receivedBy} onChange={e => setReceivedBy(e.target.value)} placeholder="Staff / Admin name" style={{ width: '100%', padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontWeight: 700 }} />
            </div>
          </div>

          {isUPI && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>Sender UPI</label>
                  <input value={senderUPI} onChange={e => setSenderUPI(e.target.value)} placeholder="tenant@upi" style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>Receiver UPI</label>
                  <input value={receiverUPI} onChange={e => setReceiverUPI(e.target.value)} placeholder="pg@upi" style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>Transaction / UPI Ref ID</label>
                <input value={transactionId} onChange={e => setTransactionId(e.target.value)} placeholder="e.g. UPI/1234567890" style={{ width: '100%', padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontWeight: 600 }} />
              </div>
            </>
          )}

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>Note / Remark (Optional)</label>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Partial payment, late fee waived…" style={{ width: '100%', padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <button type="submit" style={{ width: '100%', marginTop: 8, padding: 14, background: cyan, color: 'white', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(8,145,178,0.25)' }}>
            Confirm Payment &amp; View Receipt 🧾
          </button>
        </form>
      </div>
    </div>
  );
}
