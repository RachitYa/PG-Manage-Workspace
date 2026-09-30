import React, { useState } from 'react';

const cyan = '#0891b2';

export default function DetailedReceiptModal({ receipt, onClose }) {
  if (!receipt) return null;

  const {
    tenantName = 'Raj Verma',
    room = 'Room 104 - AC Double',
    month = 'June 2025',
    date = '05 Jun 2025',
    paymentMode = 'Cash',
    receivedBy = 'Ravi Kumar (Manager)',
    senderUPI = '',
    receiverUPI = '',
    items = [
      { label: 'Room Rent', amount: 6000 },
      { label: 'Amenities', amount: 1000 },
      { label: 'Food Charge', amount: 1000 },
      { label: 'Meter Unit', amount: 1000 },
      { label: 'Laundry', amount: 500 },
      { label: 'House Keeping', amount: 500 },
      { label: 'Other Charges', amount: 0 },
    ],
    totalAmount = 10000,
    pendingAmount = 0,
  } = receipt;

  const calcTotal = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const displayTotal = totalAmount || calcTotal;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: 'white', width: '100%', maxWidth: 440, borderRadius: 24, padding: '24px 20px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', maxHeight: '90vh', overflowY: 'auto', fontFamily: "'Hanken Grotesk', sans-serif" }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: cyan }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>verified</span>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Paid Successfully</h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>{date} · {month}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#64748b' }}>close</span>
          </button>
        </div>

        {/* Card Container */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* Tenant Name */}
          <div>
            <h2 style={{ fontWeight: 800, fontSize: 20, margin: '0 0 4px', color: '#0f172a' }}>{tenantName}</h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 6px', fontWeight: 600 }}>{room}</p>
            <p style={{ fontSize: 13, color: '#0f172a', margin: 0, fontWeight: 600 }}>Payment: <b>{paymentMode}</b></p>
          </div>

          <div style={{ borderTop: '1px dashed #cbd5e1' }} />

          {/* Received by */}
          <div>
            <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 4px', fontWeight: 700, textTransform: 'uppercase' }}>Received by</p>
            <p style={{ fontWeight: 800, fontSize: 17, color: '#0f172a', margin: '0 0 4px' }}>{receivedBy}</p>
            <p style={{ fontSize: 13, color: '#0f172a', margin: 0, fontWeight: 500 }}>Payment: <b>{paymentMode}</b></p>
            {paymentMode === 'UPI' && (senderUPI || receiverUPI) && (
              <p style={{ fontSize: 12, color: cyan, margin: '4px 0 0', fontWeight: 600 }}>
                {senderUPI && `From: ${senderUPI} `} {receiverUPI && `To: ${receiverUPI}`}
              </p>
            )}
          </div>

          <div style={{ borderTop: '1px dashed #cbd5e1' }} />

          {/* Detailed Itemized Breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '2px 0' }}>
            {items.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, color: '#334155', fontWeight: 500 }}>{item.label} :</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>₹ {Number(item.amount || 0).toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1.5px solid #cbd5e1' }} />

          {/* Total & Pending */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: 17, color: '#0f172a' }}>Total</span>
              <span style={{ fontWeight: 900, fontSize: 19, color: '#0f172a' }}>₹ {Number(displayTotal).toLocaleString('en-IN')}</span>
            </div>
            {pendingAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: '#ef4444' }}>Pending</span>
                <span style={{ fontWeight: 800, fontSize: 15, color: '#ef4444' }}>₹ {Number(pendingAmount).toLocaleString('en-IN')}</span>
              </div>
            )}
          </div>

        </div>

        {/* Done / Close Button */}
        <button onClick={onClose}
          style={{ width: '100%', marginTop: 20, padding: 14, background: cyan, color: 'white', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(8,145,178,0.25)' }}>
          Close Receipt
        </button>

      </div>
    </div>
  );
}

export function CollectPaymentModal({ dueData, onClose, onConfirm }) {
  if (!dueData) return null;

  const totalDue = dueData.amount || 10000;
  const [rent, setRent] = useState(String(Math.round(totalDue * 0.6)));
  const [meter, setMeter] = useState(String(Math.round(totalDue * 0.1)));
  const [food, setFood] = useState(String(Math.round(totalDue * 0.1)));
  const [amenities, setAmenities] = useState(String(Math.round(totalDue * 0.1)));
  const [laundry, setLaundry] = useState(String(Math.round(totalDue * 0.05)));
  const [housekeeping, setHousekeeping] = useState(String(Math.round(totalDue * 0.05)));
  const [other, setOther] = useState('0');
  
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [receivedBy, setReceivedBy] = useState('Ravi Kumar (Manager)');
  const [senderUPI, setSenderUPI] = useState('');
  const [receiverUPI, setReceiverUPI] = useState('febebo@upi');

  const currentSum = (parseFloat(rent) || 0) + (parseFloat(meter) || 0) + (parseFloat(food) || 0) + (parseFloat(amenities) || 0) + (parseFloat(laundry) || 0) + (parseFloat(housekeeping) || 0) + (parseFloat(other) || 0);
  const remainingPending = Math.max(0, totalDue - currentSum);

  const handleSubmit = (e) => {
    e.preventDefault();
    const receiptData = {
      tenantName: dueData.name || 'Raj Verma',
      room: dueData.room || 'Room 104 - AC Double',
      month: dueData.month || 'June 2025',
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      paymentMode,
      receivedBy,
      senderUPI,
      receiverUPI,
      items: [
        { label: 'Room Rent', amount: parseFloat(rent) || 0 },
        { label: 'Amenities', amount: parseFloat(amenities) || 0 },
        { label: 'Food Charge', amount: parseFloat(food) || 0 },
        { label: 'Meter Unit', amount: parseFloat(meter) || 0 },
        { label: 'Laundry', amount: parseFloat(laundry) || 0 },
        { label: 'House Keeping', amount: parseFloat(housekeeping) || 0 },
        { label: 'Other Charges', amount: parseFloat(other) || 0 },
      ],
      totalAmount: currentSum,
      pendingAmount: remainingPending,
    };
    onConfirm(receiptData);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: 'white', width: '100%', maxWidth: 440, borderRadius: 24, padding: '24px 20px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', maxHeight: '92vh', overflowY: 'auto', fontFamily: "'Hanken Grotesk', sans-serif" }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Mark as Paid & Fill Breakdown</h3>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>{dueData.name} ({dueData.room || 'Room 104'})</p>
          </div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#64748b' }}>close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Summary Box */}
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
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>Room Rent</label>
              <input type="number" value={rent} onChange={e => setRent(e.target.value)} style={{ width: '100%', padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontWeight: 700 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>Meter Unit</label>
              <input type="number" value={meter} onChange={e => setMeter(e.target.value)} style={{ width: '100%', padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontWeight: 700 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>Food Charge</label>
              <input type="number" value={food} onChange={e => setFood(e.target.value)} style={{ width: '100%', padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontWeight: 700 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>Amenities</label>
              <input type="number" value={amenities} onChange={e => setAmenities(e.target.value)} style={{ width: '100%', padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontWeight: 700 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>Laundry</label>
              <input type="number" value={laundry} onChange={e => setLaundry(e.target.value)} style={{ width: '100%', padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontWeight: 700 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>House Keeping</label>
              <input type="number" value={housekeeping} onChange={e => setHousekeeping(e.target.value)} style={{ width: '100%', padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontWeight: 700 }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>Other Charges (₹)</label>
            <input type="number" value={other} onChange={e => setOther(e.target.value)} style={{ width: '100%', padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontWeight: 700 }} />
          </div>

          <p style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5, margin: '4px 0 -4px' }}>Payment & Receiver Details</p>

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
              <input value={receivedBy} onChange={e => setReceivedBy(e.target.value)} style={{ width: '100%', padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontWeight: 700 }} />
            </div>
          </div>

          {paymentMode === 'UPI' && (
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
          )}

          <button type="submit"
            style={{ width: '100%', marginTop: 8, padding: 14, background: cyan, color: 'white', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(8,145,178,0.25)' }}>
            Confirm Payment & View Receipt 🧾
          </button>
        </form>

      </div>
    </div>
  );
}
