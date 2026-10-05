import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';

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
  Laundry: [
    'Detergent Powder', 'Liquid Detergent', 'Fabric Softener', 'Bleach',
  ],
};

const CATEGORY_ICONS = {
  Groceries: 'local_grocery_store',
  Vegetables: 'nutrition',
  Dairy: 'water_drop',
  Water: 'local_drink',
  Laundry: 'local_laundry_service',
  Hardware: 'build',
  Other: 'storefront'
};

export default function ManagerVendorsView({ adminId, onBack, showToast, currentStaffName = 'Manager' }) {
  const [vendors, setVendors] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & State
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedVendorForLedger, setSelectedVendorForLedger] = useState(null);

  // Modals
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [newVendorForm, setNewVendorForm] = useState({
    name: '',
    store: '',
    category: 'Groceries',
    phone: '',
    upi: '',
    initialAmount: ''
  });
  const [addVendorLoading, setAddVendorLoading] = useState(false);

  // Purchase Modal
  const [purchaseVendor, setPurchaseVendor] = useState(null);
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedItems, setSelectedItems] = useState({}); // { [name]: { qty, unit, rate } }
  const [customItems, setCustomItems] = useState([]);
  const [newCustomItemName, setNewCustomItemName] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [paymentOption, setPaymentOption] = useState('Pending'); // 'Pending' | 'Cash' | 'UPI'
  const [payerSenderUpi, setPayerSenderUpi] = useState('');
  const [purchaseSubmitting, setPurchaseSubmitting] = useState(false);

  // Settle / Clearing Modal
  const [settleVendor, setSettleVendor] = useState(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleMethod, setSettleMethod] = useState('Cash'); // 'Cash' | 'UPI'
  const [settleSenderUpi, setSettleSenderUpi] = useState('');
  const [settleReceiverUpi, setSettleReceiverUpi] = useState('');
  const [settleLoading, setSettleLoading] = useState(false);

  // Real-time synchronization with Firestore
  useEffect(() => {
    if (!adminId) {
      setLoading(false);
      return;
    }

    const qVendors = query(collection(db, 'vendors'), where('adminId', '==', adminId));
    const unsubVendors = onSnapshot(qVendors, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setVendors(list);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching vendors in ManagerVendorsView:', err);
      setLoading(false);
    });

    const qTxns = query(collection(db, 'vendor_transactions'), where('adminId', '==', adminId));
    const unsubTxns = onSnapshot(qTxns, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTransactions(list);
    }, (err) => {
      console.error('Error fetching vendor transactions:', err);
    });

    return () => {
      unsubVendors();
      unsubTxns();
    };
  }, [adminId]);

  // Compute pending balance for a vendor
  const getVendorPending = (vendorId) => {
    let pending = 0;
    const vTxns = transactions.filter(t => t.vendorId === vendorId);
    vTxns.forEach(txn => {
      if (txn.isClearing) {
        pending = Math.max(0, pending - (parseFloat(txn.clearedAmount) || 0));
      } else {
        const totalNewPrice = txn.items ? txn.items.reduce((s, it) => s + (parseFloat(it.price) || 0), 0) : (parseFloat(txn.totalAmount) || 0);
        const paidNow = txn.payInfo?.amtNow ? parseFloat(txn.payInfo.amtNow) : (txn.paid ? totalNewPrice : 0);
        const unpaid = Math.max(0, totalNewPrice - paidNow);
        pending += unpaid;
      }
    });
    return Math.round(pending);
  };

  // Compute total purchases for a vendor
  const getVendorTotalPurchases = (vendorId) => {
    const vTxns = transactions.filter(t => t.vendorId === vendorId && !t.isClearing);
    return vTxns.reduce((sum, t) => {
      const price = t.items ? t.items.reduce((s, it) => s + (parseFloat(it.price) || 0), 0) : (parseFloat(t.totalAmount) || 0);
      return sum + price;
    }, 0);
  };

  // Categories list
  const categoriesList = useMemo(() => {
    const set = new Set(['All', 'Groceries', 'Vegetables', 'Dairy', 'Water', 'Laundry']);
    vendors.forEach(v => { if (v.category) set.add(v.category); });
    return Array.from(set);
  }, [vendors]);

  // Filtered vendors
  const filteredVendors = useMemo(() => {
    return vendors.filter(v => {
      const matchCat = activeCategory === 'All' || v.category === activeCategory;
      const q = search.trim().toLowerCase();
      const matchSearch = !q || (v.name || '').toLowerCase().includes(q) || (v.store || '').toLowerCase().includes(q) || (v.phone || '').includes(q);
      return matchCat && matchSearch;
    });
  }, [vendors, activeCategory, search]);

  // Total Outstanding across all vendors
  const totalOutstanding = useMemo(() => {
    return vendors.reduce((sum, v) => sum + getVendorPending(v.id), 0);
  }, [vendors, transactions]);

  // Handle Add New Vendor
  const handleAddVendorSubmit = async (e) => {
    e.preventDefault();
    if (!newVendorForm.name.trim() || !newVendorForm.store.trim()) {
      alert('Please fill vendor name and store name.');
      return;
    }
    setAddVendorLoading(true);
    try {
      const docData = {
        adminId,
        name: newVendorForm.name.trim(),
        store: newVendorForm.store.trim(),
        category: newVendorForm.category || 'Groceries',
        phone: newVendorForm.phone.trim(),
        upi: newVendorForm.upi.trim(),
        amount: parseFloat(newVendorForm.initialAmount) || 0,
        createdAt: new Date().toISOString(),
        createdBy: currentStaffName
      };
      await addDoc(collection(db, 'vendors'), docData);
      showToast?.('Vendor added successfully and synced with Admin!', 'success');
      setShowAddVendorModal(false);
      setNewVendorForm({ name: '', store: '', category: 'Groceries', phone: '', upi: '', initialAmount: '' });
    } catch (err) {
      console.error('Error adding vendor:', err);
      alert('Failed to add vendor: ' + err.message);
    } finally {
      setAddVendorLoading(false);
    }
  };

  // Open Purchase Modal for vendor
  const handleOpenPurchase = (vendor) => {
    setPurchaseVendor(vendor);
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setSelectedItems({});
    setCustomItems([]);
    setNewCustomItemName('');
    setShowCustomInput(false);
    setPaymentOption('Pending');
    setPayerSenderUpi('');
  };

  // Toggle item selection in purchase modal
  const toggleItem = (name) => {
    setSelectedItems(prev => {
      if (prev[name]) {
        const next = { ...prev };
        delete next[name];
        return next;
      }
      return { ...prev, [name]: { qty: '', unit: 'kg', rate: '' } };
    });
  };

  const updateItemField = (name, field, val) => {
    setSelectedItems(prev => ({
      ...prev,
      [name]: { ...prev[name], [field]: val }
    }));
  };

  const handleAddCustomItem = () => {
    const val = newCustomItemName.trim();
    if (!val) return;
    setCustomItems(prev => [...prev, val]);
    setSelectedItems(prev => ({ ...prev, [val]: { qty: '', unit: 'kg', rate: '' } }));
    setNewCustomItemName('');
    setShowCustomInput(false);
  };

  const purchaseValidRows = Object.entries(selectedItems).filter(([, v]) => v.qty && v.rate);
  const purchaseGrandTotal = purchaseValidRows.reduce((sum, [, v]) => sum + (parseFloat(v.qty) || 0) * (parseFloat(v.rate) || 0), 0);

  // Submit Purchase
  const handleSubmitPurchase = async () => {
    if (!purchaseValidRows.length) {
      alert('Please select at least 1 item with quantity and rate.');
      return;
    }
    setPurchaseSubmitting(true);
    try {
      const items = purchaseValidRows.map(([name, v]) => ({
        item: name,
        qty: v.qty,
        unit: v.unit,
        rate: parseFloat(v.rate),
        price: parseFloat(v.qty) * parseFloat(v.rate)
      }));

      const isPaid = paymentOption !== 'Pending';
      const paidAmt = isPaid ? purchaseGrandTotal : 0;

      const newTxn = {
        adminId,
        vendorId: purchaseVendor.id,
        vendorName: purchaseVendor.name || purchaseVendor.store,
        vendorStore: purchaseVendor.store || purchaseVendor.name,
        date: purchaseDate,
        items,
        totalAmount: purchaseGrandTotal,
        payInfo: {
          amtNow: paidAmt,
          method: isPaid ? paymentOption : 'Pending',
          toWhom: purchaseVendor.name,
          senderUPI: payerSenderUpi,
          receiverUPI: purchaseVendor.upi || ''
        },
        source: 'Manager Staff App',
        purchasedBy: currentStaffName,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'vendor_transactions'), newTxn);
      showToast?.('Purchase order saved and synced with Admin!', 'success');
      setPurchaseVendor(null);
    } catch (err) {
      console.error('Error saving purchase order:', err);
      alert('Failed to save purchase: ' + err.message);
    } finally {
      setPurchaseSubmitting(false);
    }
  };

  // Open Settle Due Modal
  const handleOpenSettle = (vendor) => {
    const due = getVendorPending(vendor.id);
    setSettleVendor(vendor);
    setSettleAmount(String(due));
    setSettleMethod('Cash');
    setSettleSenderUpi('');
    setSettleReceiverUpi(vendor.upi || '');
  };

  // Submit Settle Due
  const handleSubmitSettle = async () => {
    const amt = parseFloat(settleAmount);
    if (!amt || amt <= 0) {
      alert('Please enter a valid amount.');
      return;
    }
    setSettleLoading(true);
    try {
      const clearingTxn = {
        adminId,
        vendorId: settleVendor.id,
        vendorName: settleVendor.name || settleVendor.store,
        vendorStore: settleVendor.store || settleVendor.name,
        date: new Date().toISOString().split('T')[0],
        isClearing: true,
        clearedAmount: amt,
        payInfo: {
          amtNow: amt,
          method: settleMethod,
          toWhom: settleVendor.name,
          senderUPI: settleSenderUpi,
          receiverUPI: settleReceiverUpi
        },
        source: 'Manager Staff App',
        settledBy: currentStaffName,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'vendor_transactions'), clearingTxn);
      showToast?.(`Cleared ₹${amt.toLocaleString()} for ${settleVendor.name}!`, 'success');
      setSettleVendor(null);
    } catch (err) {
      console.error('Error clearing balance:', err);
      alert('Failed to settle balance: ' + err.message);
    } finally {
      setSettleLoading(false);
    }
  };

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', paddingBottom: 'calc(90px + env(safe-area-inset-bottom, 0px))' }}>
      
      {/* ── Sticky Top Bar ──────────────────────────────────────── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '14px 18px', position: 'sticky', top: 0, zIndex: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={onBack} style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#0891b2' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
            </button>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>Vendors & Supply</h2>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#64748b' }}>{vendors.length} Registered · Realtime Synced</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddVendorModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0891b2', color: '#fff', border: 'none', borderRadius: 12, padding: '8px 14px', fontSize: 13, fontWeight: 800, cursor: 'pointer', boxShadow: '0 3px 8px rgba(8,145,178,0.25)' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person_add</span>
            <span>+ Add Vendor</span>
          </button>
        </div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>

        {/* ── KPI Summary Cards ─────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 14, boxShadow: '0 2px 8px rgba(15,23,42,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4 }}>Total Vendors</p>
                <p style={{ margin: '4px 0 0', fontSize: 24, fontWeight: 900, color: '#0f172a' }}>{vendors.length}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#0891b2', fontWeight: 700 }}>Active suppliers</p>
              </div>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0891b2' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>storefront</span>
              </div>
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 14, boxShadow: '0 2px 8px rgba(15,23,42,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', letterSpacing: 0.4 }}>Pending Payable</p>
                <p style={{ margin: '4px 0 0', fontSize: 24, fontWeight: 900, color: '#dc2626' }}>₹ {totalOutstanding.toLocaleString('en-IN')}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b', fontWeight: 700 }}>Total supplier dues</p>
              </div>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>payments</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Search Bar ────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '10px 14px', marginBottom: 14 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#94a3b8' }}>search</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vendor name, store, or phone..."
            style={{ border: 'none', outline: 'none', width: '100%', fontSize: 14, fontFamily: 'inherit', color: '#0f172a' }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
            </button>
          )}
        </div>

        {/* ── Category Filter Pills ─────────────────────────────── */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6, marginBottom: 14 }}>
          {categoriesList.map(cat => {
            const isSel = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 20,
                  border: isSel ? 'none' : '1px solid #e2e8f0',
                  background: isSel ? '#0891b2' : '#fff',
                  color: isSel ? '#fff' : '#64748b',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s'
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* ── Vendor Cards List ─────────────────────────────────── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 36, color: '#0891b2', animation: 'spin 1s linear infinite' }}>progress_activity</span>
            <p style={{ marginTop: 8, fontSize: 13, fontWeight: 700 }}>Loading vendors...</p>
          </div>
        ) : filteredVendors.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px dashed #cbd5e1', padding: 36, textAlign: 'center', color: '#94a3b8' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 44, color: '#cbd5e1', marginBottom: 8 }}>storefront</span>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#475569' }}>No vendors found</p>
            <p style={{ margin: '4px 0 16px', fontSize: 12 }}>Tap "+ Add Vendor" above to register a new vendor.</p>
            <button
              onClick={() => setShowAddVendorModal(true)}
              style={{ background: '#0891b2', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 18px', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}
            >
              + Add First Vendor
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredVendors.map(vendor => {
              const pendingDue = getVendorPending(vendor.id);
              const totalPurchased = getVendorTotalPurchases(vendor.id);
              const iconName = CATEGORY_ICONS[vendor.category] || 'storefront';

              return (
                <div key={vendor.id} style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 16, boxShadow: '0 2px 10px rgba(15,23,42,0.03)' }}>
                  
                  {/* Vendor Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0891b2' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 24 }}>{iconName}</span>
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#0f172a' }}>{vendor.name}</h3>
                          <span style={{ fontSize: 10, fontWeight: 800, color: '#0891b2', background: '#ecfeff', padding: '2px 8px', borderRadius: 12 }}>
                            {vendor.category || 'General'}
                          </span>
                        </div>
                        <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                          🏪 {vendor.store || 'Store'}
                        </p>
                      </div>
                    </div>

                    {/* Pending Due Badge */}
                    <div style={{ textAlign: 'right' }}>
                      {pendingDue > 0 ? (
                        <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 10, padding: '4px 10px' }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', display: 'block' }}>Pending Due</span>
                          <span style={{ fontSize: 14, fontWeight: 900, color: '#dc2626' }}>₹ {pendingDue.toLocaleString('en-IN')}</span>
                        </div>
                      ) : (
                        <div style={{ background: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: 10, padding: '4px 10px' }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', display: 'block' }}>Status</span>
                          <span style={{ fontSize: 12, fontWeight: 800, color: '#16a34a' }}>✓ All Clear</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Vendor Details Row */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, padding: '10px 0', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', marginBottom: 12, fontSize: 12 }}>
                    {vendor.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#64748b' }}>call</span>
                        <a href={`tel:${vendor.phone}`} style={{ color: '#0891b2', fontWeight: 700, textDecoration: 'none' }}>
                          {vendor.phone}
                        </a>
                        <a
                          href={`https://wa.me/91${vendor.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ background: '#25D366', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', marginLeft: 2 }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 12 }}>chat</span>
                        </a>
                      </div>
                    )}
                    {vendor.upi && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#475569' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#7c3aed' }}>account_balance</span>
                        <span style={{ fontWeight: 600 }}>UPI: {vendor.upi}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(vendor.upi);
                            showToast?.('UPI copied to clipboard!', 'success');
                          }}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#7c3aed', display: 'flex' }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>content_copy</span>
                        </button>
                      </div>
                    )}
                    <div style={{ marginLeft: 'auto', color: '#64748b', fontWeight: 600 }}>
                      Total Bought: <b style={{ color: '#0f172a' }}>₹ {totalPurchased.toLocaleString('en-IN')}</b>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleOpenPurchase(vendor)}
                      style={{
                        flex: 1,
                        padding: '10px 0',
                        borderRadius: 10,
                        background: '#0891b2',
                        color: '#fff',
                        border: 'none',
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add_shopping_cart</span>
                      <span>+ Purchase</span>
                    </button>

                    {pendingDue > 0 && (
                      <button
                        onClick={() => handleOpenSettle(vendor)}
                        style={{
                          flex: 1,
                          padding: '10px 0',
                          borderRadius: 10,
                          background: '#fef2f2',
                          color: '#dc2626',
                          border: '1px solid #fecaca',
                          fontSize: 12,
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>payments</span>
                        <span>Pay Due</span>
                      </button>
                    )}

                    <button
                      onClick={() => setSelectedVendorForLedger(vendor)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 10,
                        background: '#f8fafc',
                        color: '#475569',
                        border: '1px solid #e2e8f0',
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>receipt_long</span>
                      <span>Ledger</span>
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* ── Modal: Add New Vendor ───────────────────────────────── */}
      {showAddVendorModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(3px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddVendorModal(false); }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: 480, borderRadius: '24px 24px 0 0', padding: '20px 20px 32px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ width: 40, height: 4, background: '#e2e8f0', borderRadius: 99, margin: '0 auto 16px' }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: '#0f172a' }}>Register New Vendor</h3>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#64748b' }}>Will automatically sync with Admin</p>
              </div>
              <button onClick={() => setShowAddVendorModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#64748b' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
              </button>
            </div>

            <form onSubmit={handleAddVendorSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>Vendor / Person Name *</label>
                <input
                  type="text"
                  required
                  value={newVendorForm.name}
                  onChange={e => setNewVendorForm({ ...newVendorForm, name: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>Store / Shop Name *</label>
                <input
                  type="text"
                  required
                  value={newVendorForm.store}
                  onChange={e => setNewVendorForm({ ...newVendorForm, store: e.target.value })}
                  placeholder="e.g. Ramesh Kirana & Provisions"
                  style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>Supply Category *</label>
                <select
                  value={newVendorForm.category}
                  onChange={e => setNewVendorForm({ ...newVendorForm, category: e.target.value })}
                  style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, outline: 'none', background: '#fff', boxSizing: 'border-box', fontWeight: 600 }}
                >
                  <option value="Groceries">Groceries (Dal, Rice, Spices, Oil)</option>
                  <option value="Vegetables">Vegetables & Fruits</option>
                  <option value="Dairy">Dairy (Milk, Paneer, Curd)</option>
                  <option value="Water">Water (RO 20L Campers)</option>
                  <option value="Laundry">Laundry & Cleaning</option>
                  <option value="Hardware">Hardware & Maintenance</option>
                  <option value="Other">Other Miscellaneous</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>Phone Number</label>
                  <input
                    type="tel"
                    value={newVendorForm.phone}
                    onChange={e => setNewVendorForm({ ...newVendorForm, phone: e.target.value })}
                    placeholder="10-digit mobile"
                    style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>UPI ID (Optional)</label>
                  <input
                    type="text"
                    value={newVendorForm.upi}
                    onChange={e => setNewVendorForm({ ...newVendorForm, upi: e.target.value })}
                    placeholder="e.g. vendor@upi"
                    style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>Total Amount Paid Till Date (₹)</label>
                <input
                  type="number"
                  value={newVendorForm.initialAmount}
                  onChange={e => setNewVendorForm({ ...newVendorForm, initialAmount: e.target.value })}
                  placeholder="0"
                  style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <button
                type="submit"
                disabled={addVendorLoading}
                style={{
                  marginTop: 10,
                  width: '100%',
                  padding: '14px',
                  background: '#0891b2',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 800,
                  cursor: addVendorLoading ? 'default' : 'pointer',
                  opacity: addVendorLoading ? 0.7 : 1,
                  boxShadow: '0 4px 12px rgba(8,145,178,0.3)'
                }}
              >
                {addVendorLoading ? 'Saving...' : 'Add Vendor to PG'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Record Purchase ─────────────────────────────── */}
      {purchaseVendor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(3px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setPurchaseVendor(null); }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: 480, borderRadius: '24px 24px 0 0', padding: '20px 20px 24px', maxHeight: '92vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{ width: 40, height: 4, background: '#e2e8f0', borderRadius: 99, margin: '0 auto 14px' }} />

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: '#0f172a' }}>Purchase From Vendor</h3>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#0891b2' }}>{purchaseVendor.name} · {purchaseVendor.store}</p>
              </div>
              <button onClick={() => setPurchaseVendor(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#64748b' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
              </button>
            </div>

            {/* Date Picker */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>Date of Purchase</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={e => setPurchaseDate(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {/* Item Checklist Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '26px 1fr 70px 60px 60px', gap: 6, marginBottom: 6, paddingRight: 4 }}>
              <span />
              <span style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8' }}>ITEM</span>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textAlign: 'center' }}>QTY/UNIT</span>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textAlign: 'center' }}>RATE(₹)</span>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textAlign: 'right' }}>TOTAL</span>
            </div>

            {/* Item Checklist Scroll Area */}
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '35vh', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12, paddingRight: 2 }}>
              {[...(CATEGORY_ITEMS[purchaseVendor.category] || CATEGORY_ITEMS.Groceries), ...customItems].map(name => {
                const isSelected = !!selectedItems[name];
                const v = selectedItems[name] || {};
                const rowTotal = isSelected ? (parseFloat(v.qty) || 0) * (parseFloat(v.rate) || 0) : 0;

                return (
                  <div key={name} style={{ display: 'grid', gridTemplateColumns: '26px 1fr 70px 60px 60px', gap: 6, alignItems: 'center', padding: '6px 4px', borderRadius: 8, background: isSelected ? '#ecfeff' : 'transparent', border: isSelected ? '1px solid #a5f3fc' : '1px solid transparent' }}>
                    <button
                      type="button"
                      onClick={() => toggleItem(name)}
                      style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${isSelected ? '#0891b2' : '#cbd5e1'}`, background: isSelected ? '#0891b2' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                    >
                      {isSelected && <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'white' }}>check</span>}
                    </button>

                    <span style={{ fontSize: 12.5, fontWeight: isSelected ? 800 : 600, color: isSelected ? '#0f172a' : '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {name}
                    </span>

                    {isSelected ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          placeholder="Qty"
                          value={v.qty}
                          onChange={e => updateItemField(name, 'qty', e.target.value)}
                          style={{ width: '100%', padding: '4px 4px', border: '1.5px solid #e2e8f0', borderRadius: 6, fontSize: 11, fontWeight: 700, textAlign: 'center', outline: 'none', boxSizing: 'border-box' }}
                        />
                        <select
                          value={v.unit}
                          onChange={e => updateItemField(name, 'unit', e.target.value)}
                          style={{ width: '100%', padding: '2px 2px', border: '1px solid #0891b2', borderRadius: 6, fontSize: 10, fontWeight: 700, color: '#0891b2', outline: 'none' }}
                        >
                          <option>kg</option>
                          <option>g</option>
                          <option>litre</option>
                          <option>piece</option>
                          <option>pack</option>
                        </select>
                      </div>
                    ) : <span />}

                    {isSelected ? (
                      <input
                        type="number"
                        min="0"
                        placeholder="₹"
                        value={v.rate}
                        onChange={e => updateItemField(name, 'rate', e.target.value)}
                        style={{ width: '100%', padding: '4px 4px', border: '1.5px solid #e2e8f0', borderRadius: 6, fontSize: 11, fontWeight: 700, textAlign: 'center', outline: 'none', boxSizing: 'border-box' }}
                      />
                    ) : <span />}

                    <span style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', textAlign: 'right' }}>
                      {rowTotal > 0 ? `₹${rowTotal.toFixed(0)}` : '-'}
                    </span>
                  </div>
                );
              })}

              {/* Add Custom Item */}
              {showCustomInput ? (
                <div style={{ display: 'flex', gap: 6, padding: '4px 0' }}>
                  <input
                    type="text"
                    value={newCustomItemName}
                    onChange={e => setNewCustomItemName(e.target.value)}
                    placeholder="Enter custom item name..."
                    autoFocus
                    style={{ flex: 1, padding: '8px 10px', border: '1.5px solid #0891b2', borderRadius: 8, fontSize: 12, outline: 'none' }}
                  />
                  <button onClick={handleAddCustomItem} style={{ background: '#0891b2', color: '#fff', border: 'none', borderRadius: 8, padding: '0 12px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
                    Add
                  </button>
                  <button onClick={() => setShowCustomInput(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '0 10px', cursor: 'pointer' }}>
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCustomInput(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 8, padding: '8px 10px', color: '#64748b', fontSize: 12, fontWeight: 700, cursor: 'pointer', marginTop: 4 }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                  <span>Add item not in list</span>
                </button>
              )}
            </div>

            {/* Payment Method Selector */}
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 10, marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Payment Option</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                {[
                  { id: 'Pending', label: '⏳ Pay Later (Due)' },
                  { id: 'Cash', label: '💵 Paid (Cash)' },
                  { id: 'UPI', label: '📱 Paid (UPI)' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPaymentOption(opt.id)}
                    style={{
                      padding: '8px 4px',
                      borderRadius: 8,
                      border: paymentOption === opt.id ? '2px solid #0891b2' : '1px solid #e2e8f0',
                      background: paymentOption === opt.id ? '#ecfeff' : '#fff',
                      color: paymentOption === opt.id ? '#0891b2' : '#64748b',
                      fontSize: 11,
                      fontWeight: 800,
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {paymentOption === 'UPI' && (
                <input
                  type="text"
                  value={payerSenderUpi}
                  onChange={e => setPayerSenderUpi(e.target.value)}
                  placeholder="Sender UPI ID or Phone"
                  style={{ width: '100%', marginTop: 8, padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
                />
              )}
            </div>

            {/* Footer Summary & Submit */}
            <div style={{ background: '#f8fafc', borderRadius: 12, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                {purchaseValidRows.length} item(s) selected
              </span>
              <span style={{ fontSize: 16, fontWeight: 900, color: '#0891b2' }}>
                ₹ {purchaseGrandTotal.toLocaleString('en-IN')}
              </span>
            </div>

            <button
              type="button"
              onClick={handleSubmitPurchase}
              disabled={purchaseSubmitting || !purchaseValidRows.length}
              style={{
                width: '100%',
                padding: '14px',
                background: purchaseValidRows.length ? '#0891b2' : '#e2e8f0',
                color: purchaseValidRows.length ? '#fff' : '#94a3b8',
                border: 'none',
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 800,
                cursor: purchaseValidRows.length ? 'pointer' : 'default',
                boxShadow: purchaseValidRows.length ? '0 4px 12px rgba(8,145,178,0.3)' : 'none'
              }}
            >
              {purchaseSubmitting ? 'Saving Order...' : 'Confirm & Save Purchase'}
            </button>

          </div>
        </div>
      )}

      {/* ── Modal: Settle Due / Clear Balance ───────────────────── */}
      {settleVendor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(3px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setSettleVendor(null); }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: 480, borderRadius: '24px 24px 0 0', padding: '20px 20px 32px' }}>
            <div style={{ width: 40, height: 4, background: '#e2e8f0', borderRadius: 99, margin: '0 auto 16px' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: '#0f172a' }}>Pay Outstanding Due</h3>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#dc2626' }}>{settleVendor.name} · {settleVendor.store}</p>
              </div>
              <button onClick={() => setSettleVendor(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#64748b' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
              </button>
            </div>

            <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 12, padding: '12px 14px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#dc2626' }}>Total Outstanding Due:</span>
              <span style={{ fontSize: 18, fontWeight: 900, color: '#dc2626' }}>₹ {getVendorPending(settleVendor.id).toLocaleString('en-IN')}</span>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>Amount Being Paid (₹)</label>
              <input
                type="number"
                value={settleAmount}
                onChange={e => setSettleAmount(e.target.value)}
                placeholder="Enter amount"
                style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 16, fontWeight: 800, color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Payment Mode</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {['Cash', 'UPI'].map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSettleMethod(m)}
                    style={{
                      padding: '10px 0',
                      borderRadius: 10,
                      border: settleMethod === m ? '2px solid #0891b2' : '1.5px solid #e2e8f0',
                      background: settleMethod === m ? '#ecfeff' : '#fff',
                      color: settleMethod === m ? '#0891b2' : '#64748b',
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    {m === 'Cash' ? '💵 Cash' : '📱 UPI'}
                  </button>
                ))}
              </div>
            </div>

            {settleMethod === 'UPI' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                <input
                  type="text"
                  value={settleSenderUpi}
                  onChange={e => setSettleSenderUpi(e.target.value)}
                  placeholder="Sender UPI / Mobile"
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                />
                <input
                  type="text"
                  value={settleReceiverUpi}
                  onChange={e => setSettleReceiverUpi(e.target.value)}
                  placeholder="Vendor UPI / Mobile"
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmitSettle}
              disabled={settleLoading}
              style={{
                width: '100%',
                padding: '14px',
                background: '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(22,163,74,0.3)'
              }}
            >
              {settleLoading ? 'Recording Payment...' : 'Confirm Payment & Update Balance'}
            </button>

          </div>
        </div>
      )}

      {/* ── Modal / View: Vendor Ledger (History) ──────────────── */}
      {selectedVendorForLedger && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(3px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedVendorForLedger(null); }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: 480, borderRadius: '24px 24px 0 0', padding: '20px 20px 32px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ width: 40, height: 4, background: '#e2e8f0', borderRadius: 99, margin: '0 auto 16px' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: '#0f172a' }}>Vendor Ledger</h3>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#0891b2' }}>{selectedVendorForLedger.name} · {selectedVendorForLedger.store}</p>
              </div>
              <button onClick={() => setSelectedVendorForLedger(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#64748b' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
              </button>
            </div>

            {/* Quick Stats for this vendor */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 10 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Total Purchases</span>
                <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 900, color: '#0f172a' }}>
                  ₹ {getVendorTotalPurchases(selectedVendorForLedger.id).toLocaleString('en-IN')}
                </p>
              </div>
              <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 12, padding: 10 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#dc2626', textTransform: 'uppercase' }}>Current Due</span>
                <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 900, color: '#dc2626' }}>
                  ₹ {getVendorPending(selectedVendorForLedger.id).toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            {/* Transactions Timeline */}
            <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Transaction History</p>
            {(() => {
              const vendorTxns = transactions.filter(t => t.vendorId === selectedVendorForLedger.id).sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

              if (!vendorTxns.length) {
                return (
                  <div style={{ textAlign: 'center', padding: 24, color: '#94a3b8', fontStyle: 'italic', fontSize: 13 }}>
                    No transactions recorded yet for this vendor.
                  </div>
                );
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {vendorTxns.map(t => {
                    const isClearing = t.isClearing;
                    const items = t.items || [];
                    const totalAmt = isClearing ? t.clearedAmount : (t.items ? t.items.reduce((s, it) => s + (parseFloat(it.price) || 0), 0) : t.totalAmount);
                    const paidNow = t.payInfo?.amtNow || (t.paid ? totalAmt : 0);

                    return (
                      <div key={t.id} style={{ background: isClearing ? '#f0fdf4' : '#fff', border: `1px solid ${isClearing ? '#bbf7d0' : '#e2e8f0'}`, borderRadius: 12, padding: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                          <div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>📅 {t.date || t.createdAt?.split('T')[0]}</span>
                            <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 800, color: isClearing ? '#16a34a' : '#0f172a' }}>
                              {isClearing ? '💳 Payment / Cleared Due' : '🛒 Purchase Order'}
                            </p>
                            <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>
                              By: {t.purchasedBy || t.settledBy || t.source || 'Staff'}
                            </span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ margin: 0, fontSize: 15, fontWeight: 900, color: isClearing ? '#16a34a' : '#0f172a' }}>
                              {isClearing ? '-' : ''}₹ {(parseFloat(totalAmt) || 0).toLocaleString('en-IN')}
                            </p>
                            <span style={{ fontSize: 10, fontWeight: 800, color: isClearing ? '#16a34a' : paidNow >= totalAmt ? '#16a34a' : '#dc2626' }}>
                              {isClearing ? 'Paid' : paidNow >= totalAmt ? `Paid (${t.payInfo?.method || 'Cash'})` : paidNow > 0 ? `Partial ₹${paidNow}` : 'Pending Due'}
                            </span>
                          </div>
                        </div>

                        {/* Items listed */}
                        {!isClearing && items.length > 0 && (
                          <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px dashed #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {items.map((it, idx) => (
                              <span key={idx} style={{ fontSize: 11, background: '#f1f5f9', color: '#334155', padding: '2px 6px', borderRadius: 6, fontWeight: 600 }}>
                                {it.item || it.name} ({it.qty}{it.unit}) - ₹{it.price || (it.qty * it.rate)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}

          </div>
        </div>
      )}

    </div>
  );
}
