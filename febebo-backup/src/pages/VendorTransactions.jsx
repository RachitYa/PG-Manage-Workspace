import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ─── Category-specific item lists (alphabetical) ──────────────────────────────
const CATEGORY_ITEMS = {
  Groceries: [
    'Besan', 'Biscuits', 'Coffee Powder', 'Cooking Oil (Mustard)', 'Cooking Oil (Sunflower)',
    'Coriander Powder', 'Cumin Seeds', 'Dal (Chana)', 'Dal (Moong)', 'Dal (Toor)',
    'Garam Masala', 'Ghee', 'Maida', 'Mustard Seeds', 'Poha', 'Rajma',
    'Red Chilli Powder', 'Rice (Basmati)', 'Rice (Regular)', 'Salt', 'Sooji',
    'Sugar', 'Tea Leaves', 'Turmeric Powder', 'Vermicelli', 'Wheat Flour (Aata)',
  ],
  Vegetables: [
    'Bitter Gourd (Karela)', 'Bottle Gourd (Lauki)', 'Brinjal (Baingan)', 'Capsicum',
    'Carrot (Gajar)', 'Cauliflower (Gobhi)', 'Coriander Leaves', 'Garlic (Lehsun)',
    'Ginger (Adrak)', 'Green Beans (Beans)', 'Green Chilli', 'Lady Finger (Bhindi)',
    'Lemon (Nimbu)', 'Onion (Pyaaz)', 'Peas (Matar)', 'Potato (Aalu)',
    'Ridge Gourd (Tori)', 'Spinach (Palak)', 'Tomato',
  ],
  Dairy: [
    'Butter', 'Buttermilk (Chaas)', 'Cheese Slices', 'Condensed Milk', 'Cream',
    'Curd (Dahi)', 'Ghee', 'Lassi', 'Milk (Full Cream)', 'Milk (Toned)',
    'Paneer', 'Skimmed Milk Powder', 'Whey Protein',
  ],
  Water: [
    'RO Water (20L Camper)',
  ],
};

const VENDORS = [
  { id: 1, name: 'Sunil Kumar',  store: 'The Local Market',    phone: '+91 9234876543', upi: 'sunilkumar@upi', amount: '5,000', status: 'Paid',    category: 'Groceries' },
  { id: 2, name: 'Akash Kumar',  store: 'Daily Harvest Store', phone: '+91 9123456789', upi: 'akash123@paytm', amount: '3,000', status: 'Paid',    category: 'Vegetables' },
  { id: 3, name: 'Sunil Kumar',  store: 'The Local Market',    phone: '+91 9234876543', upi: 'sunilkumar@upi', amount: '5,000', status: 'Paid',    category: 'Laundry' },
  { id: 4, name: 'Meena Devi',   store: 'Shree Dairy Farm',   phone: '+91 9876543210', upi: 'meena.dairy@gpay', amount: '3,000', status: 'Paid',  category: 'Dairy' },
  { id: 5, name: 'Raju Verma',   store: 'Fresh Picks',        phone: '+91 9345678901', upi: 'rajuverma@upi', amount: '5,000', status: 'Paid',    category: 'Groceries' },
  { id: 6, name: 'Pintu Sahu',   store: 'Green Valley Farm',  phone: '+91 9456789012', upi: 'pintusahu@phonepe', amount: '3,000', status: 'Pending', category: 'Vegetables' },
  { id: 7, name: 'Anil Gupta',   store: 'RO Water Supplier',  phone: '+91 9111222333', upi: 'anil@upi', amount: '2,000', status: 'Pending', category: 'Water' },
];

const MONTHS_LIST = [
  'January 2025','February 2025','March 2025','April 2025','May 2025','June 2025',
  'July 2025','August 2025','September 2025','October 2025','November 2025','December 2025',
];

const INITIAL_VENDOR_DATA = {};
VENDORS.forEach(v => {
  INITIAL_VENDOR_DATA[v.id] = { months: {} };
  MONTHS_LIST.forEach(m => {
    INITIAL_VENDOR_DATA[v.id].months[m] = { totalAmount: 25000, pendingAmount: 3000, days: {} };
  });
  const janDays = {};
  for (let i = 1; i <= 15; i++) {
    const dStr = `${i} January 2025`;
    janDays[dStr] = {
      amount: 5300,
      mode: i % 2 === 0 ? 'UPI' : 'Cash',
      status: i % 3 === 0 ? 'Pending' : 'Paid',
      senderUPI: i % 2 === 0 ? 'admin@febebo' : '',
      receiverUPI: i % 2 === 0 ? v.upi : '',
      toWhom: i % 2 !== 0 ? v.name : '',
      items: [
        { item: 'Garam Masala', qty: '50', unit: 'g',  rate: 2,   price: 100 },
        { item: 'Rice (Basmati)', qty: '5', unit: 'kg', rate: 50, price: 250 },
        { item: 'Dal (Toor)',   qty: '2', unit: 'kg', rate: 140,  price: 280 },
        { item: 'Ghee',        qty: '4', unit: 'kg', rate: 300,  price: 1200 },
      ],
    };
  }
  INITIAL_VENDOR_DATA[v.id].months['January 2025'].days = janDays;
});

// ─── Shared Payment Modal (Cash / UPI) ───────────────────────────────────────
function PaymentModal({ title, totalAmt, defaultToWhom, defaultReceiverUPI, onConfirm, onClose }) {
  const [amtNow, setAmtNow]       = useState(String(totalAmt || ''));
  const [method, setMethod]       = useState('Cash');
  const [toWhom, setToWhom]       = useState(defaultToWhom || '');
  const [senderUPI, setSenderUPI] = useState('');
  const [receiverUPI, setReceiverUPI] = useState(defaultReceiverUPI || '');
  const remaining = (totalAmt || 0) - (parseFloat(amtNow) || 0);

  const handleConfirm = () => {
    if (!amtNow) return;
    onConfirm({ amtNow: parseFloat(amtNow), method, toWhom, senderUPI, receiverUPI });
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 70, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(3px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: 'white', width: '100%', maxWidth: 480, borderRadius: '20px 20px 0 0', padding: '20px 20px 36px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ width: 40, height: 4, background: '#e2e8f0', borderRadius: 99, margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <p style={{ fontWeight: 800, fontSize: 17, color: '#0f172a', margin: 0 }}>{title}</p>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', borderRadius: 8, padding: 6, display: 'flex' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#64748b' }}>close</span>
          </button>
        </div>

        {/* Total & Amount Now */}
        <div style={{ background: '#f8fafc', borderRadius: 12, padding: '14px 16px', marginBottom: 16, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Total Pending</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>₹ {(totalAmt || 0).toLocaleString('en-IN')}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Remaining after payment</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: remaining > 0 ? '#ef4444' : '#16a34a' }}>₹ {remaining.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Amount Paying Now (₹)</label>
        <input type="number" value={amtNow} onChange={e => setAmtNow(e.target.value)} placeholder="Enter amount"
          style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 16, fontWeight: 700, outline: 'none', boxSizing: 'border-box', marginBottom: 16, color: '#0f172a' }} />

        {/* Method toggle */}
        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 8 }}>Payment Method</label>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          {['Cash', 'UPI'].map(m => (
            <button key={m} onClick={() => setMethod(m)}
              style={{ flex: 1, padding: '11px', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', border: method === m ? 'none' : '1.5px solid #e2e8f0', background: method === m ? '#0891b2' : 'white', color: method === m ? 'white' : '#64748b' }}>
              {m === 'Cash' ? '💵 Cash' : '📱 UPI'}
            </button>
          ))}
        </div>

        {method === 'Cash' ? (
          <>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>To Whom</label>
            <input value={toWhom} onChange={e => setToWhom(e.target.value)} placeholder="Vendor / person name"
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 15, outline: 'none', boxSizing: 'border-box', marginBottom: 16, color: '#0f172a', fontFamily: 'inherit' }} />
          </>
        ) : (
          <>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Sender Phone / UPI ID</label>
            <input value={senderUPI} onChange={e => setSenderUPI(e.target.value)} placeholder="e.g. 9876543210 or name@upi"
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 15, outline: 'none', boxSizing: 'border-box', marginBottom: 12, color: '#0f172a', fontFamily: 'inherit' }} />
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Receiver Phone / UPI ID</label>
            <input value={receiverUPI} onChange={e => setReceiverUPI(e.target.value)} placeholder="e.g. vendor@paytm"
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 15, outline: 'none', boxSizing: 'border-box', marginBottom: 16, color: '#0f172a', fontFamily: 'inherit' }} />
          </>
        )}

        <button onClick={handleConfirm}
          style={{ width: '100%', padding: '15px', background: '#0891b2', border: 'none', borderRadius: 12, color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(8,145,178,0.25)' }}>
          Confirm Payment
        </button>
      </div>
    </div>
  );
}

// ─── New Checklist Purchase Modal ─────────────────────────────────────────────
function PurchaseModal({ vendor, onClose, onSave }) {
  const baseItems = (CATEGORY_ITEMS[vendor.category] || []).slice().sort();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  // selected: { [itemName]: { qty, unit, rate } }
  const [selected, setSelected] = useState({});
  const [customItems, setCustomItems] = useState([]);
  const [showCustom, setShowCustom] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [showPayment, setShowPayment] = useState(false);

  const allItems = [...baseItems, ...customItems].sort();

  const toggleItem = (name) => {
    setSelected(prev => {
      if (prev[name]) {
        const n = { ...prev };
        delete n[name];
        return n;
      }
      return { ...prev, [name]: { qty: '', unit: 'kg', rate: '' } };
    });
  };

  const updateField = (name, field, val) => {
    setSelected(prev => ({ ...prev, [name]: { ...prev[name], [field]: val } }));
  };

  const addCustomItem = () => {
    const n = newItemName.trim();
    if (!n || allItems.includes(n)) return;
    setCustomItems(prev => [...prev, n]);
    setNewItemName('');
    setShowCustom(false);
    setSelected(prev => ({ ...prev, [n]: { qty: '', unit: 'kg', rate: '' } }));
  };

  const validRows = Object.entries(selected).filter(([, v]) => v.qty && v.rate);
  const grandTotal = validRows.reduce((s, [, v]) => s + (parseFloat(v.qty) || 0) * (parseFloat(v.rate) || 0), 0);

  const handleMakePurchase = () => {
    if (!validRows.length) return;
    setShowPayment(true);
  };

  const handlePaymentConfirm = (payInfo) => {
    const items = validRows.map(([name, v]) => ({
      item: name, qty: v.qty, unit: v.unit, rate: parseFloat(v.rate),
      price: parseFloat(v.qty) * parseFloat(v.rate),
    }));
    onSave({ date, items, vendorId: vendor.id, payInfo });
    onClose();
  };

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(3px)' }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div style={{ background: 'white', width: '100%', maxWidth: 480, borderRadius: '20px 20px 0 0', padding: '20px 20px 0', maxHeight: '92vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ width: 40, height: 4, background: '#e2e8f0', borderRadius: 99, margin: '0 auto 16px' }} />

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <p style={{ fontWeight: 800, fontSize: 17, color: '#0f172a', margin: '0 0 2px' }}>Add Items</p>
              <p style={{ fontSize: 12, color: '#0891b2', fontWeight: 600, margin: 0 }}>{vendor.category} · {vendor.store}</p>
            </div>
            <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', borderRadius: 8, padding: 6, display: 'flex' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#64748b' }}>close</span>
            </button>
          </div>

          {/* Date */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 5 }}>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', color: '#0f172a' }} />
          </div>

          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 72px 60px 60px', gap: 6, marginBottom: 6, paddingRight: 4 }}>
            <span />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>ITEM</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textAlign: 'center' }}>QTY/UNIT</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textAlign: 'center' }}>RATE(₹)</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textAlign: 'right' }}>TOTAL</span>
          </div>

          {/* Item list */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12, paddingRight: 2 }}>
            {allItems.map(name => {
              const isSelected = !!selected[name];
              const v = selected[name] || {};
              const rowTotal = isSelected ? (parseFloat(v.qty) || 0) * (parseFloat(v.rate) || 0) : 0;
              return (
                <div key={name} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 72px 60px 60px', gap: 6, alignItems: 'center', padding: '6px 4px', borderRadius: 8, background: isSelected ? '#f0fdfe' : 'transparent', border: isSelected ? '1px solid #a5f3fc' : '1px solid transparent', transition: 'all 0.15s' }}>
                  {/* Checkbox */}
                  <button onClick={() => toggleItem(name)}
                    style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${isSelected ? '#0891b2' : '#cbd5e1'}`, background: isSelected ? '#0891b2' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0 }}>
                    {isSelected && <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'white' }}>check</span>}
                  </button>
                  {/* Name */}
                  <span style={{ fontSize: 13, fontWeight: isSelected ? 700 : 500, color: isSelected ? '#0f172a' : '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                  {/* Qty + unit */}
                  {isSelected ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <input type="number" min="0" step="0.1" value={v.qty} onChange={e => updateField(name, 'qty', e.target.value)} placeholder="Qty"
                        style={{ width: '100%', padding: '5px 6px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 12, fontWeight: 700, textAlign: 'center', outline: 'none', boxSizing: 'border-box' }} />
                      <select value={v.unit} onChange={e => updateField(name, 'unit', e.target.value)}
                        style={{ width: '100%', padding: '3px 4px', border: '1.5px solid #0891b2', borderRadius: 7, fontSize: 11, fontWeight: 700, color: '#0891b2', background: 'white', outline: 'none', appearance: 'none', textAlign: 'center', cursor: 'pointer' }}>
                        <option>kg</option><option>g</option><option>litre</option><option>piece</option>
                      </select>
                    </div>
                  ) : <span />}
                  {/* Rate */}
                  {isSelected ? (
                    <input type="number" min="0" value={v.rate} onChange={e => updateField(name, 'rate', e.target.value)} placeholder="₹"
                      style={{ padding: '5px 6px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 12, fontWeight: 700, textAlign: 'center', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                  ) : <span />}
                  {/* Total */}
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', textAlign: 'right' }}>{rowTotal > 0 ? `₹${rowTotal.toFixed(0)}` : '-'}</span>
                </div>
              );
            })}

            {/* Add custom item */}
            {showCustom ? (
              <div style={{ display: 'flex', gap: 8, padding: '6px 4px' }}>
                <input value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="Item name" autoFocus
                  onKeyDown={e => e.key === 'Enter' && addCustomItem()}
                  style={{ flex: 1, padding: '10px 12px', border: '1.5px solid #0891b2', borderRadius: 10, fontSize: 14, outline: 'none', fontFamily: 'inherit', color: '#0f172a' }} />
                <button onClick={addCustomItem}
                  style={{ padding: '10px 14px', background: '#0891b2', border: 'none', borderRadius: 10, color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Add</button>
                <button onClick={() => setShowCustom(false)}
                  style={{ padding: '10px 12px', background: '#f1f5f9', border: 'none', borderRadius: 10, cursor: 'pointer' }}>✕</button>
              </div>
            ) : (
              <button onClick={() => setShowCustom(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: '#f8fafc', border: '1.5px dashed #cbd5e1', borderRadius: 10, color: '#64748b', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', marginTop: 4 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span> Add item not in list
              </button>
            )}
          </div>

          {/* Footer */}
          <div style={{ borderTop: '1px solid #f1f5f9', padding: '14px 0 28px', position: 'sticky', bottom: 0, background: 'white' }}>
            {grandTotal > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ecfeff', border: '1px solid #a5f3fc', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: '#0e7490', fontWeight: 600 }}>{validRows.length} item{validRows.length !== 1 ? 's' : ''} selected</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#0891b2' }}>₹ {grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </div>
            )}
            <button onClick={handleMakePurchase} disabled={!validRows.length}
              style={{ width: '100%', padding: '15px', background: validRows.length ? 'linear-gradient(135deg,#0891b2,#0e7490)' : '#e2e8f0', color: validRows.length ? 'white' : '#94a3b8', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: validRows.length ? 'pointer' : 'default', fontFamily: 'inherit', boxShadow: validRows.length ? '0 4px 14px rgba(8,145,178,0.25)' : 'none' }}>
              Make Purchase
            </button>
          </div>
        </div>
      </div>

      {showPayment && (
        <PaymentModal
          title="Purchase Payment"
          totalAmt={grandTotal}
          defaultToWhom={vendor.name}
          defaultReceiverUPI={vendor.upi}
          onConfirm={handlePaymentConfirm}
          onClose={() => setShowPayment(false)}
        />
      )}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function VendorTransactions() {
  const navigate = useNavigate();
  const [selectedVendor, setSelectedVendor]     = useState(null);
  const [search, setSearch]                     = useState('');
  const [fromDate, setFromDate]                 = useState('2025-02-02');
  const [toDate, setToDate]                     = useState('2025-02-02');
  const [categories, setCategories]             = useState(['Groceries', 'Laundry', 'Vegetables', 'Dairy', 'Water']);
  const [activeCategory, setActiveCategory]     = useState('Groceries');
  const [purchaseModalVendor, setPurchaseModalVendor] = useState(null);
  const [vendorData, setVendorData]             = useState(INITIAL_VENDOR_DATA);
  const [selectedMonth, setSelectedMonth]       = useState(null);
  const [selectedDate, setSelectedDate]         = useState(null);
  const [filterOpen, setFilterOpen]             = useState(false);
  const [filterStatus, setFilterStatus]         = useState('All Payments');
  const [pendingModal, setPendingModal]         = useState(null); // { vendor, month }
  
  const [showAnalytics, setShowAnalytics]       = useState(false);
  const [analyticsPeriod, setAnalyticsPeriod]   = useState('Monthly'); // 'Weekly', 'Monthly', 'Yearly'

  const handleAddCategory = () => {
    const newCat = window.prompt('Enter new category name:');
    if (newCat && newCat.trim() && !categories.includes(newCat.trim())) {
      setCategories([...categories, newCat.trim()]);
    }
    if (newCat) setActiveCategory(newCat.trim());
  };

  const filtered = VENDORS.filter(v => {
    const matchSearch = v.name.toLowerCase().includes(search.toLowerCase()) || v.store.toLowerCase().includes(search.toLowerCase());
    const matchCat    = v.category === activeCategory;
    const matchStatus = filterStatus === 'All Payments' ? true : (filterStatus === 'Paid Payments' ? v.status === 'Paid' : v.status === 'Pending');
    return matchSearch && matchCat && matchStatus;
  });

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const currentVendorData = selectedVendor ? vendorData[selectedVendor.id] : null;
  const monthlyList = currentVendorData
    ? Object.keys(currentVendorData.months)
        .sort((a, b) => new Date(b) - new Date(a))
        .map(m => ({
          month: m,
          amount: currentVendorData.months[m].totalAmount,
          pending: currentVendorData.months[m].pendingAmount || 0,
        }))
    : [];
  const total = monthlyList.reduce((s, m) => s + m.amount, 0);
  const totalPending = monthlyList.reduce((s, m) => s + m.pending, 0);

  const onSavePurchase = ({ date, items, vendorId, payInfo }) => {
    setVendorData(prev => {
      const newData = JSON.parse(JSON.stringify(prev));
      const vData = newData[vendorId];
      const d = new Date(date);
      const monthName = d.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
      const dateString = `${d.getDate()} ${monthName}`;
      if (!vData.months[monthName]) vData.months[monthName] = { totalAmount: 0, pendingAmount: 0, days: {} };
      const monthData = vData.months[monthName];
      if (!monthData.days[dateString]) monthData.days[dateString] = { amount: 0, mode: payInfo.method, status: 'Pending', items: [], senderUPI: '', receiverUPI: '', toWhom: '' };
      const dayData = monthData.days[dateString];
      const totalNewPrice = items.reduce((s, it) => s + it.price, 0);
      const paidNow = payInfo.amtNow || 0;
      const pendingNow = totalNewPrice - paidNow;
      dayData.items.push(...items);
      dayData.amount += totalNewPrice;
      dayData.mode = payInfo.method;
      dayData.senderUPI = payInfo.senderUPI || '';
      dayData.receiverUPI = payInfo.receiverUPI || '';
      dayData.toWhom = payInfo.toWhom || '';
      dayData.status = pendingNow <= 0 ? 'Paid' : 'Pending';
      monthData.totalAmount += totalNewPrice;
      monthData.pendingAmount = (monthData.pendingAmount || 0) + pendingNow;
      return newData;
    });
  };

  const onClearPending = (payInfo) => {
    if (!selectedVendor || !payInfo.month) return;
    setVendorData(prev => {
      const newData = JSON.parse(JSON.stringify(prev));
      const mData = newData[selectedVendor.id].months[payInfo.month];
      if (mData) {
        mData.pendingAmount = Math.max(0, (mData.pendingAmount || 0) - payInfo.amtNow);
        
        // Add a clearing entry so it shows in the transaction history
        const d = new Date();
        const dateKey = `${d.getDate()} ${payInfo.month} (Cleared-${d.getTime()})`;
        mData.days[dateKey] = {
           amount: payInfo.amtNow,
           mode: payInfo.method,
           status: 'Paid',
           items: [{ item: 'Cleared Pending Balance', qty: '-', unit: '', rate: '-', price: payInfo.amtNow }],
           senderUPI: payInfo.senderUPI || '',
           receiverUPI: payInfo.receiverUPI || '',
           toWhom: payInfo.toWhom || ''
        };
      }
      return newData;
    });
    setPendingModal(null);
  };

  // ── Detail View 4: Item Analytics ──
  if (selectedVendor && showAnalytics) {
    const allItemsMap = {};
    if (currentVendorData) {
      Object.values(currentVendorData.months).forEach(m => {
        Object.values(m.days).forEach(d => {
          d.items.forEach(it => {
            if (!allItemsMap[it.item]) {
              allItemsMap[it.item] = { qty: 0, unit: it.unit, total: 0 };
            }
            allItemsMap[it.item].qty += parseFloat(it.qty) || 0;
            allItemsMap[it.item].total += it.price || 0;
          });
        });
      });
    }

    const aggregatedItems = Object.keys(allItemsMap)
      .sort((a, b) => a.localeCompare(b))
      .map(name => ({
        name,
        qty: allItemsMap[name].qty,
        unit: allItemsMap[name].unit,
        total: allItemsMap[name].total,
      }));

    const totalSpend = aggregatedItems.reduce((acc, it) => acc + it.total, 0);

    return (
      <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 32 }}>
        <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
          <button onClick={() => setShowAnalytics(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0891b2', display: 'flex' }}>
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: 18, color: '#0f172a', margin: 0, flex: 1, textAlign: 'center' }}>Item Analytics</p>
          <div style={{ width: 32 }} />
        </div>

        <div style={{ padding: 16 }}>
          {/* Period Toggle */}
          <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: 12, padding: 4, marginBottom: 20 }}>
            {['Weekly', 'Monthly', 'Yearly'].map(p => (
              <button key={p} onClick={() => setAnalyticsPeriod(p)}
                style={{ flex: 1, padding: '8px 0', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', background: analyticsPeriod === p ? 'white' : 'transparent', color: analyticsPeriod === p ? '#0f172a' : '#64748b', boxShadow: analyticsPeriod === p ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}>
                {p}
              </button>
            ))}
          </div>

          <p style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 8 }}>Overview ({analyticsPeriod})</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
            <div style={{ background: 'white', borderRadius: 16, padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#64748b', margin: '0 0 6px', textTransform: 'uppercase' }}>Total Spend</p>
              <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 20, color: '#0f172a', margin: 0 }}>₹ {totalSpend.toLocaleString('en-IN')}</p>
            </div>
            <div style={{ background: 'white', borderRadius: 16, padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#64748b', margin: '0 0 6px', textTransform: 'uppercase' }}>Total Items</p>
              <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 20, color: '#0f172a', margin: 0 }}>{aggregatedItems.length}</p>
            </div>
          </div>

          <p style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 12 }}>Detailed Spend by Item</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {aggregatedItems.length === 0 ? (
               <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>No items purchased yet.</p>
            ) : (
              aggregatedItems.map((it, i) => (
                <div key={i} style={{ background: 'white', borderRadius: 16, padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <p style={{ fontWeight: 800, fontSize: 16, color: '#0f172a', margin: '0 0 4px' }}>{it.name}</p>
                      <p style={{ fontSize: 13, color: '#64748b', margin: 0, fontWeight: 600 }}>Total Qty: {it.qty.toLocaleString('en-IN')} {it.unit}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 16, color: '#0891b2', margin: '0 0 4px' }}>₹ {it.total.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                  
                  {/* Dummy comparison logic */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f0fdf4', padding: '6px 10px', borderRadius: 8, width: 'fit-content' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#16a34a' }}>trending_up</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#16a34a' }}>12% vs last {analyticsPeriod.toLowerCase().replace('ly', '')}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Detail View 3: Payment Details (Itemised Bill) ──
  if (selectedDate && selectedMonth && currentVendorData) {
    const dayData = currentVendorData.months[selectedMonth].days[selectedDate] || { items: [], amount: 0, status: 'Pending', mode: 'Cash' };
    const receiptDetails = dayData.items;
    const totalReceipt = receiptDetails.reduce((s, r) => s + r.price, 0);
    const paidReceipt  = dayData.status === 'Paid' ? totalReceipt : (totalReceipt > 2000 ? 2000 : 0);
    const pendingReceipt = totalReceipt - paidReceipt;

    return (
      <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 32 }}>
        <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
          <button onClick={() => setSelectedDate(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0891b2', display: 'flex' }}>
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: 18, color: '#0f172a', margin: 0, flex: 1, textAlign: 'center' }}>Payment Details</p>
          <div style={{ width: 32 }} />
        </div>

        <div style={{ padding: 16 }}>
          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
            {[
              { icon: 'check_circle', label: 'Paid', amt: paidReceipt, border: '#bbf7d0', color: '#16a34a' },
              { icon: 'error', label: 'Pending', amt: pendingReceipt, border: '#fecaca', color: '#ef4444' },
              { icon: 'account_balance_wallet', label: 'Total', amt: totalReceipt, border: '#a5f3fc', color: '#0891b2' },
            ].map(s => (
              <div key={s.label} style={{ background: 'white', border: `1px solid ${s.border}`, borderRadius: 12, padding: '12px 8px', textAlign: 'center' }}>
                <span className="material-symbols-outlined" style={{ color: s.color, fontSize: 20, display: 'block', marginBottom: 4 }}>{s.icon}</span>
                <p style={{ fontSize: 14, fontWeight: 800, color: s.color, margin: '0 0 2px' }}>₹ {s.amt.toLocaleString('en-IN')}</p>
                <p style={{ fontSize: 10, fontWeight: 600, color: s.color, margin: 0 }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Payment mode info */}
          <div style={{ background: 'white', borderRadius: 12, padding: '12px 16px', marginBottom: 16, border: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Payment Info</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 13, color: '#64748b' }}>Method</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{dayData.mode || 'Cash'}</span>
            </div>
            {dayData.mode === 'UPI' ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: '#64748b' }}>Sender (UPI/Phone)</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0891b2' }}>{dayData.senderUPI || '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: '#64748b' }}>Receiver (UPI/Phone)</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0891b2' }}>{dayData.receiverUPI || '—'}</span>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: '#64748b' }}>Paid To</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{dayData.toWhom || selectedVendor?.name || '—'}</span>
              </div>
            )}
          </div>

          {/* Items */}
          <div style={{ background: '#0891b2', padding: '10px 16px', borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
            <p style={{ margin: 0, color: 'white', fontSize: 14, fontWeight: 700 }}>{selectedDate}</p>
          </div>
          <div style={{ background: 'white', borderBottomLeftRadius: 16, borderBottomRightRadius: 16, border: '1px solid #e2e8f0', borderTop: 'none', padding: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {receiptDetails.map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flex: 1 }}>
                    <span style={{ fontSize: 14, color: '#475569', fontWeight: 500, width: '45%' }}>{r.item} :</span>
                    <span style={{ fontSize: 14, color: '#0f172a', fontWeight: 600 }}>{r.qty}{r.unit}</span>
                  </div>
                  <span style={{ fontSize: 14, color: '#0f172a', fontWeight: 700 }}>₹ {r.price}</span>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '1px dashed #cbd5e1', margin: '16px 0', paddingTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 15, color: '#0f172a', fontWeight: 700 }}>Total</span>
                <span style={{ fontSize: 16, color: '#0f172a', fontWeight: 800 }}>₹ {totalReceipt.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 14, color: '#16a34a', fontWeight: 600 }}>Paid</span>
                <span style={{ fontSize: 14, color: '#16a34a', fontWeight: 700 }}>₹ {paidReceipt.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, color: '#ef4444', fontWeight: 600 }}>Pending</span>
                <span style={{ fontSize: 14, color: '#ef4444', fontWeight: 700 }}>₹ {pendingReceipt.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Detail View 2: Vendor Transactions (Day List) ──
  if (selectedMonth && currentVendorData) {
    const monthData = currentVendorData.months[selectedMonth];
    const dailyList = Object.keys(monthData.days)
      .sort((a, b) => new Date(b) - new Date(a))
      .map(d => ({ date: d, ...monthData.days[d] }));
    const monthPending = monthData.pendingAmount || 0;

    return (
      <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 32 }}>
        <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
          <button onClick={() => setSelectedMonth(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0891b2', display: 'flex' }}>
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: 18, color: '#0f172a', margin: 0, flex: 1, textAlign: 'center' }}>{selectedMonth}</p>
          <div style={{ width: 32 }} />
        </div>

        <div style={{ padding: 16 }}>
          {/* Pending banner */}
          {monthPending > 0 && (
            <button onClick={() => setPendingModal({ vendor: selectedVendor, month: selectedMonth })}
              style={{ width: '100%', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, cursor: 'pointer', fontFamily: 'inherit' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-symbols-outlined" style={{ color: '#ef4444', fontSize: 20 }}>warning</span>
                <span style={{ fontSize: 13, color: '#ef4444', fontWeight: 700 }}>Pending Amount — Tap to Clear</span>
              </div>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#ef4444' }}>₹ {monthPending.toLocaleString('en-IN')}</span>
            </button>
          )}

          <div style={{ background: 'white', border: '1.5px solid #0891b2', borderRadius: 12, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#0891b2', margin: 0 }}>Total Amount</p>
            <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>₹ {monthData.totalAmount.toLocaleString('en-IN')}</p>
          </div>

          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            {dailyList.length === 0 && (
              <p style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>No transactions logged for this month.</p>
            )}
            {dailyList.map((txn, i) => (
              <div key={i} onClick={() => setSelectedDate(txn.date)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: i < dailyList.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ background: '#ecfeff', padding: 8, borderRadius: 10, display: 'flex' }}>
                    <span className="material-symbols-outlined" style={{ color: '#0891b2', fontSize: 18 }}>receipt_long</span>
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 3px' }}>{txn.date}</p>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 13, color: '#64748b' }}>payments</span>
                      <span style={{ fontSize: 12, color: '#64748b' }}>{txn.mode}</span>
                      {txn.mode === 'UPI' && txn.receiverUPI && (
                        <span style={{ fontSize: 11, color: '#0891b2', fontWeight: 600 }}>→ {txn.receiverUPI}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>₹ {txn.amount.toLocaleString('en-IN')}</p>
                  <span style={{ fontSize: 11, fontWeight: 700, color: txn.status === 'Paid' ? '#16a34a' : '#ef4444' }}>{txn.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {pendingModal && (
          <PaymentModal
            title={`Clear Pending — ${pendingModal.month}`}
            totalAmt={monthPending}
            defaultToWhom={pendingModal.vendor?.name}
            defaultReceiverUPI={pendingModal.vendor?.upi}
            onConfirm={(payInfo) => onClearPending({ ...payInfo, month: pendingModal.month })}
            onClose={() => setPendingModal(null)}
          />
        )}
      </div>
    );
  }

  // ── Detail View 1 (monthly payment list) ──
  if (selectedVendor) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 32 }}>
        <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
          <button onClick={() => setSelectedVendor(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0891b2', display: 'flex' }}>
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: 18, color: '#0f172a', margin: 0, flex: 1, textAlign: 'center' }}>Monthly Payment List</p>
          <button onClick={() => setShowAnalytics(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0891b2', display: 'flex' }}>
            <span className="material-symbols-outlined">analytics</span>
          </button>
        </div>

        <div style={{ padding: 16 }}>
          {/* Vendor chip + Add Items */}
          <div style={{ background: 'white', borderRadius: 14, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 46, height: 46, borderRadius: 12, background: 'linear-gradient(135deg,#0891b2,#0e7490)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22, color: 'white' }}>store</span>
              </div>
              <div>
                <p onClick={() => setPurchaseModalVendor(selectedVendor)} style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', margin: '0 0 2px', cursor: 'pointer', textDecoration: 'underline' }}>{selectedVendor.name}</p>
                <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{selectedVendor.store}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setPurchaseModalVendor(selectedVendor)}
                style={{ padding: '9px 14px', background: '#0891b2', border: 'none', borderRadius: 10, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, fontFamily: 'inherit', flex: 1, justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add_shopping_cart</span>
                Add Items
              </button>
            </div>
          </div>

          {/* Overall totals */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            <div style={{ background: 'white', border: '1.5px solid #0891b2', borderRadius: 12, padding: '14px 16px' }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#0891b2', margin: '0 0 4px' }}>Total Amount</p>
              <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>₹ {total.toLocaleString('en-IN')}</p>
            </div>
            <div style={{ background: totalPending > 0 ? '#fef2f2' : '#f0fdf4', border: `1.5px solid ${totalPending > 0 ? '#fecaca' : '#bbf7d0'}`, borderRadius: 12, padding: '14px 16px' }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: totalPending > 0 ? '#ef4444' : '#16a34a', margin: '0 0 4px' }}>Total Pending</p>
              <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>₹ {totalPending.toLocaleString('en-IN')}</p>
            </div>
          </div>

          {/* Date filters */}
          <p style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 10 }}>Filter By</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {[{ label: 'From Date', val: fromDate, set: setFromDate }, { label: 'To Date', val: toDate, set: setToDate }].map(f => (
              <label key={f.label} style={{ display: 'block', background: 'white', border: '1.5px solid #0891b2', borderRadius: 10, padding: '10px 12px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="material-symbols-outlined" style={{ color: '#0891b2', fontSize: 18 }}>calendar_month</span>
                  <div>
                    <p style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}>{f.label}</p>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0 }}>{fmtDate(f.val)}</p>
                  </div>
                </div>
                <input type="date" value={f.val} onChange={e => f.set(e.target.value)} style={{ display: 'none' }} />
              </label>
            ))}
          </div>

          {/* Monthly list */}
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            {monthlyList.map((row, i) => (
              <div key={i} style={{ borderBottom: i < monthlyList.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                <div onClick={() => setSelectedMonth(row.month)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="material-symbols-outlined" style={{ color: '#0891b2', fontSize: 18 }}>calendar_month</span>
                    <div>
                      <span style={{ fontSize: 14, color: '#1e293b', fontWeight: 600 }}>{row.month}</span>
                      {row.pending > 0 && (
                        <p style={{ fontSize: 12, color: '#ef4444', fontWeight: 600, margin: '2px 0 0' }}>Pending: ₹{row.pending.toLocaleString('en-IN')}</p>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 14, fontWeight: 700, color: '#0f172a', display: 'block' }}>₹ {row.amount.toLocaleString('en-IN')}</span>
                    </div>
                    <span className="material-symbols-outlined" style={{ color: '#cbd5e1', fontSize: 18 }}>chevron_right</span>
                  </div>
                </div>
                {/* Clear pending inline button for yearly view */}
                {row.pending > 0 && (
                  <button onClick={() => setPendingModal({ vendor: selectedVendor, month: row.month })}
                    style={{ width: '100%', padding: '9px 16px', background: '#fef2f2', border: 'none', borderTop: '1px solid #fecaca', color: '#ef4444', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>payments</span>
                    Clear ₹{row.pending.toLocaleString('en-IN')} Pending
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Purchase Modal */}
        {purchaseModalVendor && (
          <PurchaseModal vendor={purchaseModalVendor} onClose={() => setPurchaseModalVendor(null)} onSave={onSavePurchase} />
        )}

        {/* Clear Pending Modal */}
        {pendingModal && (
          <PaymentModal
            title={`Clear Pending — ${pendingModal.month}`}
            totalAmt={currentVendorData?.months[pendingModal.month]?.pendingAmount || 0}
            defaultToWhom={pendingModal.vendor?.name}
            defaultReceiverUPI={pendingModal.vendor?.upi}
            onConfirm={(payInfo) => onClearPending({ ...payInfo, month: pendingModal.month })}
            onClose={() => setPendingModal(null)}
          />
        )}
      </div>
    );
  }

  // ── List View ──
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 32 }}>
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => navigate('/manage-account')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0891b2', display: 'flex' }}>
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: 18, color: '#0f172a', margin: 0, flex: 1, textAlign: 'center' }}>Vendor Account</p>
        <div style={{ width: 32 }} />
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#64748b', margin: 0 }}>Payment History</p>
          <button onClick={() => setFilterOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'white', border: '1px solid #cbd5e1', borderRadius: 20, padding: '6px 12px', fontSize: 13, fontWeight: 600, color: '#0f172a', cursor: 'pointer' }}>
            {filterStatus} <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#0891b2' }}>expand_more</span>
          </button>
        </div>

        <div style={{ background: 'white', border: '1.5px solid #0891b2', borderRadius: 12, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#0891b2', margin: 0 }}>Total Amount</p>
          <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>₹ 2,000,000</p>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <span className="material-symbols-outlined" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#0891b2', fontSize: 20, pointerEvents: 'none' }}>search</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search Vendor"
            style={{ width: '100%', paddingLeft: 40, paddingRight: 16, paddingTop: 12, paddingBottom: 12, border: '1.5px solid #0891b2', borderRadius: 12, fontSize: 15, fontFamily: 'inherit', background: 'white', color: '#1e293b', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {/* Category tabs */}
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 12, marginBottom: 16, msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              style={{ whiteSpace: 'nowrap', padding: '8px 16px', borderRadius: 20, fontSize: 14, fontWeight: 600, cursor: 'pointer', border: activeCategory === cat ? 'none' : '1px solid #cbd5e1', background: activeCategory === cat ? '#0891b2' : 'white', color: activeCategory === cat ? 'white' : '#64748b', transition: 'all 0.2s' }}>
              {cat}
            </button>
          ))}
          <button onClick={handleAddCategory}
            style={{ whiteSpace: 'nowrap', padding: '8px 16px', borderRadius: 20, fontSize: 14, fontWeight: 600, cursor: 'pointer', border: '1.5px dashed #0891b2', background: '#ecfeff', color: '#0891b2', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>New Tab
          </button>
        </div>

        {/* Vendor list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.length === 0 ? (
            <div style={{ background: 'white', borderRadius: 16, padding: '32px 16px', textAlign: 'center', color: '#94a3b8', border: '1px solid #e2e8f0' }}>
              No vendors found for {activeCategory}
            </div>
          ) : (
            filtered.map(v => (
              <div key={v.id} style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div onClick={() => setSelectedVendor(v)} style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer' }}>
                  <div style={{ flex: 1 }}>
                    <p onClick={(e) => { e.stopPropagation(); setPurchaseModalVendor(v); }} style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', margin: '0 0 4px', cursor: 'pointer', textDecoration: 'underline' }}>{v.name}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#0891b2' }}>store</span>
                      <span style={{ fontSize: 13, color: '#64748b' }}>{v.store}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#0891b2' }}>phone</span>
                      <span style={{ fontSize: 13, color: '#64748b' }}>{v.phone}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#0891b2' }}>currency_rupee</span>
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>UPI: {v.upi}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                    <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: 15, color: '#0f172a', margin: '0 0 4px' }}>₹ {v.amount}</p>
                    <span style={{ fontSize: 12, fontWeight: 600, color: v.status === 'Paid' ? '#059669' : '#e11d48', background: v.status === 'Paid' ? '#dcfce7' : '#fee2e2', padding: '3px 10px', borderRadius: 20 }}>{v.status}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Filter Bottom Sheet */}
      {filterOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(3px)' }}
          onClick={e => { if (e.target === e.currentTarget) setFilterOpen(false); }}>
          <div style={{ background: 'white', width: '100%', maxWidth: 480, borderRadius: '24px 24px 0 0', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#0f172a' }}>Filter by</h2>
              <button onClick={() => setFilterOpen(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#64748b' }}>close</span>
              </button>
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#64748b', marginBottom: 12 }}>Payment Status</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
              {['All Payments', 'Paid Payments', 'Pending Payments'].map(status => (
                <label key={status} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => setFilterStatus(status)}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${filterStatus === status ? '#0891b2' : '#cbd5e1'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {filterStatus === status && <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#0891b2' }} />}
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 500, color: '#0f172a' }}>{status}</span>
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setFilterOpen(false)} style={{ flex: 1, padding: 14, background: 'white', border: '1.5px solid #cbd5e1', borderRadius: 12, fontSize: 15, fontWeight: 700, color: '#475569', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => setFilterOpen(false)} style={{ flex: 1, padding: 14, background: '#0891b2', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, color: 'white', cursor: 'pointer' }}>Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
