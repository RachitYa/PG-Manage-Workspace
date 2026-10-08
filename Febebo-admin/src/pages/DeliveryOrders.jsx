import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, onSnapshot, doc, updateDoc, setDoc, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export default function DeliveryOrders() {
  const navigate = useNavigate();
  const { user, activePgId } = useAuth();

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [mealTab, setMealTab] = useState(() => {
    const hr = new Date().getHours();
    if (hr < 11) return 'breakfast';
    if (hr < 16) return 'lunch';
    if (hr < 19) return 'snacks';
    return 'dinner';
  });

  const [filterType, setFilterType] = useState('all'); // 'all' | 'other_pg' | 'college' | 'workplace' | 'pack_later'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'picked_up' | 'delivered'
  const [searchQuery, setSearchQuery] = useState('');

  const [orders, setOrders] = useState([]);
  const [deliveryStaffList, setDeliveryStaffList] = useState([]);
  const [rawTenants, setRawTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showQRModal, setShowQRModal] = useState(false);
  const [showAddOrderModal, setShowAddOrderModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // New Order Form state
  const [newOrderForm, setNewOrderForm] = useState({
    studentId: '',
    destinationType: 'other_pg', // 'other_pg' | 'college' | 'workplace' | 'pack_later'
    destination: '',
    assignedStaff: '',
    specialNotes: ''
  });

  const formatTime = (iso) => {
    if (!iso) return '--:--';
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const calcDuration = (startIso, endIso) => {
    if (!startIso || !endIso) return null;
    const diffMs = new Date(endIso) - new Date(startIso);
    const mins = Math.max(1, Math.round(diffMs / 60000));
    return `${mins} min${mins > 1 ? 's' : ''}`;
  };

  const matchesPg = (itemPgId) => {
    if (!activePgId || activePgId === 'primary') {
      return !itemPgId || itemPgId === 'primary' || itemPgId === user?.uid;
    }
    return itemPgId === activePgId;
  };

  // 1. Listen to Delivery Orders for admin
  useEffect(() => {
    if (!user?.uid) return;
    setLoading(true);

    const q = query(
      collection(db, 'delivery_orders'),
      where('adminId', '==', user.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setOrders(list);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching delivery orders:', err);
      setLoading(false);
    });

    return () => unsub();
  }, [user?.uid]);

  // 2. Fetch staff members with delivery duty
  useEffect(() => {
    if (!user?.uid) return;
    const qStaff = query(
      collection(db, 'staff_tokens'),
      where('ownerUid', '==', user.uid)
    );
    const unsub = onSnapshot(qStaff, (snap) => {
      const allStaff = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const deliveryEligible = allStaff.filter(s => s.role === 'Delivery Boy' || s.isDeliveryBoy === true || s.role === 'Manager');
      setDeliveryStaffList(deliveryEligible);
    });
    return () => unsub();
  }, [user?.uid]);

  // 3. Fetch active tenants for creating orders
  useEffect(() => {
    if (!user?.uid) return;
    const qTenants = query(
      collection(db, 'tenants'),
      where('adminId', '==', user.uid)
    );
    const unsub = onSnapshot(qTenants, (snap) => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(d => matchesPg(d.pgId) && d.status !== 'Past' && d.status !== 'Rejected' && d.status !== 'Archived');
      setRawTenants(list);
    });
    return () => unsub();
  }, [user?.uid, activePgId]);

  // Filter orders for Current Date, Meal, and Category
  const currentOrders = useMemo(() => {
    return orders.filter(o => {
      if (o.date !== selectedDate) return false;
      if (o.meal?.toLowerCase() !== mealTab.toLowerCase()) return false;

      // Category filter (Separating Tiffins vs Pack for Later as requested)
      if (filterType !== 'all') {
        if (filterType === 'pack_later') {
          if (o.destinationType !== 'pack_later' && o.packType !== 'pack_later') return false;
        } else {
          if (o.destinationType !== filterType) return false;
        }
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'pending' && (o.status && o.status !== 'pending')) return false;
        if (statusFilter === 'picked_up' && o.status !== 'picked_up') return false;
        if (statusFilter === 'delivered' && o.status !== 'delivered') return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (o.studentName || '').toLowerCase().includes(q) ||
          (o.destination || '').toLowerCase().includes(q) ||
          (o.roomNumber || '').toLowerCase().includes(q) ||
          (o.studentPhone || '').includes(q) ||
          (o.assignedStaff || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [orders, selectedDate, mealTab, filterType, statusFilter, searchQuery]);

  // Summary counts
  const stats = useMemo(() => {
    const total = currentOrders.length;
    const pending = currentOrders.filter(o => !o.status || o.status === 'pending').length;
    const inTransit = currentOrders.filter(o => o.status === 'picked_up').length;
    const delivered = currentOrders.filter(o => o.status === 'delivered').length;
    const packLater = currentOrders.filter(o => o.destinationType === 'pack_later' || o.packType === 'pack_later').length;
    const otherPg = currentOrders.filter(o => o.destinationType === 'other_pg').length;
    return { total, pending, inTransit, delivered, packLater, otherPg };
  }, [currentOrders]);

  // Action: Mark Picked Up
  const handleMarkPickedUp = async (orderId) => {
    setActionLoading(true);
    try {
      const now = new Date().toISOString();
      await updateDoc(doc(db, 'delivery_orders', orderId), {
        status: 'picked_up',
        pickedUpAt: now,
        pickedUpBy: 'Admin / Dispatch'
      });
    } catch (e) {
      console.error(e);
      alert('Error updating status: ' + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Mark Delivered
  const handleMarkDelivered = async (order) => {
    setActionLoading(true);
    try {
      const now = new Date().toISOString();
      const mLower = (order.meal || mealTab).toLowerCase();

      // 1. Update delivery order record
      await updateDoc(doc(db, 'delivery_orders', order.id), {
        status: 'delivered',
        deliveredAt: now,
        deliveredBy: 'Admin / Dispatch',
        confirmedVia: 'admin_manual_confirm'
      });

      // 2. Mark student as eaten in mess_headcount with audit trail
      const activeAdmin = order.adminId || user.uid;
      const headcountDocRef = doc(db, 'mess_headcount', `${activeAdmin}_${order.date}`);
      await setDoc(headcountDocRef, {
        [`${order.studentId}_${mLower}_eaten`]: true,
        [`${order.studentId}_${mLower}_audit`]: {
          confirmedVia: 'delivery_boy',
          markedByName: order.assignedStaff || 'Admin',
          markedByRole: 'Delivery Partner',
          timestamp: now,
          destination: order.destination || order.destinationType
        }
      }, { merge: true });

    } catch (e) {
      console.error(e);
      alert('Error marking delivered: ' + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Create New Delivery Order
  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!newOrderForm.studentId) {
      alert('Please select a student');
      return;
    }

    const tenant = rawTenants.find(t => t.id === newOrderForm.studentId);
    if (!tenant) return;

    setActionLoading(true);
    try {
      const now = new Date().toISOString();
      const payload = {
        adminId: user.uid,
        pgId: activePgId || tenant.pgId || 'primary',
        date: selectedDate,
        meal: mealTab.toLowerCase(),
        studentId: tenant.id,
        studentName: tenant.name || 'Student',
        studentPhone: tenant.phone || '',
        roomNumber: tenant.roomNo || tenant.room || 'N/A',
        destinationType: newOrderForm.destinationType,
        destination: newOrderForm.destination || (newOrderForm.destinationType === 'pack_later' ? 'Room Takeaway' : 'Other Branch'),
        packType: newOrderForm.destinationType === 'pack_later' ? 'pack_later' : 'tiffin',
        assignedStaff: newOrderForm.assignedStaff || (deliveryStaffList[0]?.name || 'Delivery Partner'),
        specialNotes: newOrderForm.specialNotes || '',
        status: 'pending',
        createdAt: now
      };

      await addDoc(collection(db, 'delivery_orders'), payload);
      setShowAddOrderModal(false);
      setNewOrderForm({
        studentId: '',
        destinationType: 'other_pg',
        destination: '',
        assignedStaff: '',
        specialNotes: ''
      });
    } catch (err) {
      console.error(err);
      alert('Failed to create delivery order: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const qrPassValue = `FEBEBO_DELIVERY|${user?.uid}|${selectedDate}|${mealTab}|Admin`;

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk', sans-serif", paddingBottom: 80 }}>

      {/* ── TOP NAV ────────────────────────────────────────────────── */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '12px 20px', position: 'sticky', top: 0, zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate(-1)}
            style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#0f172a' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
          </button>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#ea580c' }}>two_wheeler</span>
              Tiffin & Food Delivery Operations
            </h2>
            <p style={{ margin: 0, fontSize: 11, color: '#64748b', fontWeight: 600 }}>Deliver packaged meals to other PGs & campuses</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setShowQRModal(true)}
            style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: '#c2410c', padding: '7px 12px', borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>qr_code_2</span>
            Delivery QR
          </button>
          <button
            onClick={() => setShowAddOrderModal(true)}
            style={{ background: '#ea580c', border: 'none', color: '#ffffff', padding: '7px 14px', borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, boxShadow: '0 2px 8px rgba(234,88,12,0.25)' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
            New Order
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 840, margin: '20px auto', padding: '0 16px' }}>

        {/* ── HERO BANNER ────────────────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
          borderRadius: 20,
          padding: '24px 24px 20px',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(234,88,12,0.18)',
          marginBottom: 16
        }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px dashed rgba(255,255,255,0.25)', paddingBottom: 14, marginBottom: 14 }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#ffedd5', textTransform: 'uppercase', letterSpacing: 1 }}>
                Standalone Delivery Module
              </span>
              <h1 style={{ margin: '4px 0 2px', fontSize: 22, fontWeight: 900, color: '#ffffff' }}>
                Delivery & Tiffin Logistics
              </h1>
              <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
                Track delivery boy dispatch, transit duration & student receipt
              </p>
            </div>

            <button
              onClick={() => navigate('/meal-audit-log', { state: { date: selectedDate, meal: mealTab } })}
              style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff', padding: '6px 12px', borderRadius: 10, fontSize: 11.5, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>fact_check</span>
              Audit Trail
            </button>
          </div>

          {/* Date & Meal Slot */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.15)', borderRadius: 12, padding: '6px 12px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#fed7aa' }}>calendar_month</span>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', fontWeight: 700, fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.15)', borderRadius: 12, padding: 3 }}>
              {['breakfast', 'lunch', 'snacks', 'dinner'].map(slot => {
                const active = mealTab === slot;
                return (
                  <button
                    key={slot}
                    onClick={() => setMealTab(slot)}
                    style={{
                      background: active ? '#ffffff' : 'transparent',
                      color: active ? '#c2410c' : '#ffffff',
                      border: 'none',
                      borderRadius: 9,
                      padding: '6px 12px',
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: 'pointer',
                      textTransform: 'capitalize'
                    }}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          </div>

          {/* KPI Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '10px 12px' }}>
              <p style={{ margin: 0, fontSize: 10, color: '#ffedd5', fontWeight: 700, textTransform: 'uppercase' }}>Total Orders</p>
              <p style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 900 }}>{stats.total}</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '10px 12px' }}>
              <p style={{ margin: 0, fontSize: 10, color: '#ffedd5', fontWeight: 700, textTransform: 'uppercase' }}>Pending Dispatch</p>
              <p style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 900 }}>{stats.pending}</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '10px 12px' }}>
              <p style={{ margin: 0, fontSize: 10, color: '#ffedd5', fontWeight: 700, textTransform: 'uppercase' }}>In Transit</p>
              <p style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 900 }}>{stats.inTransit}</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '10px 12px' }}>
              <p style={{ margin: 0, fontSize: 10, color: '#ffedd5', fontWeight: 700, textTransform: 'uppercase' }}>Delivered</p>
              <p style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 900 }}>{stats.delivered}</p>
            </div>
          </div>
        </div>

        {/* ── DELIVERY STAFF ON DUTY BANNER ──────────────────────────── */}
        <div style={{ background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ffedd5', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>sports_motorsports</span>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                Delivery Boys & Staff on Duty ({deliveryStaffList.length})
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b' }}>
                Staff members authorized to deliver tiffins & scan confirmation
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {deliveryStaffList.map(s => (
              <span
                key={s.id}
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  padding: '4px 10px',
                  borderRadius: 8,
                  color: '#334155',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 13, color: '#ea580c' }}>person</span>
                {s.name} ({s.role})
              </span>
            ))}
          </div>
        </div>

        {/* ── CATEGORY SEPARATION TABS (Directly requested by user) ──── */}
        <div style={{ background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '16px', marginBottom: 16 }}>
          <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Filter by Destination & Package Type:
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {[
              { id: 'all',        label: 'All Deliveries', icon: 'all_inclusive', count: orders.filter(o => o.date === selectedDate && o.meal?.toLowerCase() === mealTab).length },
              { id: 'other_pg',   label: 'Other PG Branches', icon: 'domain', count: orders.filter(o => o.date === selectedDate && o.meal?.toLowerCase() === mealTab && o.destinationType === 'other_pg').length },
              { id: 'college',    label: 'College / Campus', icon: 'school', count: orders.filter(o => o.date === selectedDate && o.meal?.toLowerCase() === mealTab && o.destinationType === 'college').length },
              { id: 'workplace',  label: 'Workplace / Office', icon: 'business_center', count: orders.filter(o => o.date === selectedDate && o.meal?.toLowerCase() === mealTab && o.destinationType === 'workplace').length },
              { id: 'pack_later', label: 'Pack for Later (Takeaway)', icon: 'takeout_dining', count: orders.filter(o => o.date === selectedDate && o.meal?.toLowerCase() === mealTab && (o.destinationType === 'pack_later' || o.packType === 'pack_later')).length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                style={{
                  background: filterType === tab.id ? (tab.id === 'pack_later' ? '#fef3c7' : '#ffedd5') : '#f8fafc',
                  color: filterType === tab.id ? (tab.id === 'pack_later' ? '#92400e' : '#c2410c') : '#475569',
                  border: `1.5px solid ${filterType === tab.id ? (tab.id === 'pack_later' ? '#fcd34d' : '#fed7aa') : '#e2e8f0'}`,
                  borderRadius: 12,
                  padding: '8px 14px',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{tab.icon}</span>
                {tab.label}
                <span style={{ fontSize: 10, background: 'rgba(0,0,0,0.06)', padding: '1px 6px', borderRadius: 6 }}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search & Status Pill Filter */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 220, display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '7px 12px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#94a3b8' }}>search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search student, destination, delivery boy..."
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 12.5, fontWeight: 600, width: '100%', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 4 }}>
              {[
                { id: 'all', label: 'All Status' },
                { id: 'pending', label: 'Pending' },
                { id: 'picked_up', label: 'In Transit' },
                { id: 'delivered', label: 'Delivered' },
              ].map(st => (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id)}
                  style={{
                    background: statusFilter === st.id ? '#0f172a' : '#f8fafc',
                    color: statusFilter === st.id ? '#ffffff' : '#475569',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: '6px 10px',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── ORDERS LIST WITH EXTRA DETAILS ─────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {currentOrders.length === 0 ? (
            <div style={{ background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#cbd5e1' }}>delivery_dining</span>
              <p style={{ margin: '8px 0 2px', fontSize: 14, fontWeight: 800, color: '#475569' }}>
                No delivery orders for {mealTab} on this date.
              </p>
              <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>
                Click "+ New Order" to assign a tiffin delivery or pack for later.
              </p>
            </div>
          ) : (
            currentOrders.map(order => {
              const isDelivered = order.status === 'delivered';
              const isInTransit = order.status === 'picked_up';
              const isPackLater = order.destinationType === 'pack_later' || order.packType === 'pack_later';
              const durationStr = calcDuration(order.pickedUpAt || order.createdAt, order.deliveredAt);

              return (
                <div
                  key={order.id}
                  style={{
                    background: '#ffffff',
                    border: `1px solid ${isDelivered ? '#bbf7d0' : isInTransit ? '#fed7aa' : '#e2e8f0'}`,
                    borderRadius: 16,
                    padding: '16px 18px',
                    boxShadow: '0 2px 8px rgba(15,23,42,0.03)',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <h4 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#0f172a' }}>{order.studentName}</h4>
                        <span style={{ fontSize: 11, fontWeight: 700, background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 6 }}>
                          Rm {order.roomNumber}
                        </span>
                        {isPackLater ? (
                          <span style={{ fontSize: 10.5, fontWeight: 800, background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '2px 8px', borderRadius: 6 }}>
                            📦 Pack for Later (Takeaway)
                          </span>
                        ) : (
                          <span style={{ fontSize: 10.5, fontWeight: 800, background: '#ffedd5', color: '#c2410c', border: '1px solid #fed7aa', padding: '2px 8px', borderRadius: 6 }}>
                            🛵 Tiffin Delivery
                          </span>
                        )}
                      </div>

                      {/* Destination information */}
                      <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#ea580c' }}>
                          {order.destinationType === 'college' ? 'school' : order.destinationType === 'workplace' ? 'business_center' : order.destinationType === 'pack_later' ? 'takeout_dining' : 'domain'}
                        </span>
                        <span>{order.destination}</span>
                        {order.destinationType && (
                          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>({order.destinationType.replace('_', ' ')})</span>
                        )}
                      </p>
                    </div>

                    {/* Status Pill */}
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        padding: '4px 10px',
                        borderRadius: 8,
                        background: isDelivered ? '#dcfce7' : isInTransit ? '#ffedd5' : '#f1f5f9',
                        color: isDelivered ? '#15803d' : isInTransit ? '#c2410c' : '#64748b',
                        border: `1px solid ${isDelivered ? '#bbf7d0' : isInTransit ? '#fed7aa' : '#e2e8f0'}`,
                        letterSpacing: 0.5
                      }}
                    >
                      {isDelivered ? 'DELIVERED ✅' : isInTransit ? 'IN TRANSIT 🛵' : 'PENDING DISPATCH'}
                    </span>
                  </div>

                  {/* ── TIMELINE & EXTRA DETAILS ─────────────────────────────── */}
                  <div style={{ background: '#f8fafc', borderRadius: 12, padding: '12px 14px', border: '1px solid #f1f5f9', marginBottom: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                      <div>
                        <p style={{ margin: 0, fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Assigned Delivery Boy</p>
                        <p style={{ margin: '2px 0 0', fontSize: 12.5, fontWeight: 800, color: '#0f172a' }}>
                          {order.assignedStaff || 'Delivery Boy'}
                        </p>
                      </div>

                      <div>
                        <p style={{ margin: 0, fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Kitchen Picked Up</p>
                        <p style={{ margin: '2px 0 0', fontSize: 12.5, fontWeight: 800, color: order.pickedUpAt ? '#0f172a' : '#94a3b8' }}>
                          {order.pickedUpAt ? formatTime(order.pickedUpAt) : 'Pending pickup'}
                        </p>
                      </div>

                      <div>
                        <p style={{ margin: 0, fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Delivery Completed</p>
                        <p style={{ margin: '2px 0 0', fontSize: 12.5, fontWeight: 800, color: order.deliveredAt ? '#15803d' : '#94a3b8' }}>
                          {order.deliveredAt ? `${formatTime(order.deliveredAt)} (${durationStr})` : 'In progress'}
                        </p>
                      </div>
                    </div>

                    {order.specialNotes && (
                      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed #e2e8f0', fontSize: 11.5, color: '#64748b' }}>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>Notes: </span>{order.specialNotes}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    {order.studentPhone && (
                      <a
                        href={`tel:${order.studentPhone}`}
                        style={{
                          background: '#f1f5f9',
                          color: '#0f172a',
                          border: '1px solid #cbd5e1',
                          padding: '7px 12px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 700,
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 15 }}>call</span>
                        Call Student
                      </a>
                    )}

                    {!isDelivered && !isInTransit && (
                      <button
                        onClick={() => handleMarkPickedUp(order.id)}
                        disabled={actionLoading}
                        style={{
                          background: '#ffedd5',
                          color: '#c2410c',
                          border: '1px solid #fed7aa',
                          padding: '7px 12px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 15 }}>check</span>
                        Mark Picked Up from Kitchen
                      </button>
                    )}

                    {!isDelivered && (
                      <button
                        onClick={() => handleMarkDelivered(order)}
                        disabled={actionLoading}
                        style={{
                          background: '#10b981',
                          color: '#ffffff',
                          border: 'none',
                          padding: '7px 14px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          boxShadow: '0 2px 6px rgba(16,185,129,0.25)'
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 15 }}>done_all</span>
                        Mark Delivered
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* ── DYNAMIC DELIVERY QR MODAL ───────────────────────────────── */}
      {showQRModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#ffffff', borderRadius: 24, width: '100%', maxWidth: 380, padding: 24, textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: '#0f172a' }}>
                Delivery Verification QR 🛵
              </h3>
              <button onClick={() => setShowQRModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>

            <p style={{ margin: '0 0 16px', fontSize: 12, color: '#64748b' }}>
              Students scan this QR code with their Febeboo App when receiving their tiffin to verify receipt instantly.
            </p>

            <div style={{ background: '#f8fafc', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0', display: 'inline-block', marginBottom: 16 }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrPassValue)}`}
                alt="Delivery QR"
                style={{ width: 190, height: 190, display: 'block', margin: '0 auto' }}
              />
            </div>

            <div style={{ background: '#f1f5f9', borderRadius: 10, padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 14 }}>
              Meal: {mealTab.toUpperCase()} · Date: {selectedDate}
            </div>

            <button
              onClick={() => setShowQRModal(false)}
              style={{ width: '100%', background: '#0f172a', color: '#ffffff', padding: '12px', borderRadius: 12, fontSize: 13, fontWeight: 800, border: 'none', cursor: 'pointer' }}
            >
              Done / Close
            </button>
          </div>
        </div>
      )}

      {/* ── CREATE NEW DELIVERY ORDER MODAL ─────────────────────────── */}
      {showAddOrderModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#ffffff', borderRadius: 24, width: '100%', maxWidth: 460, padding: 24, boxShadow: '0 20px 50px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>
                New Delivery / Pack Order
              </h3>
              <button onClick={() => setShowAddOrderModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>

            <form onSubmit={handleCreateOrder} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Select Student */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  Select Student:
                </label>
                <select
                  value={newOrderForm.studentId}
                  onChange={e => setNewOrderForm({ ...newOrderForm, studentId: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, fontWeight: 700, outline: 'none', fontFamily: 'inherit' }}
                >
                  <option value="">-- Choose student --</option>
                  {rawTenants.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} (Room {t.roomNo || t.room})
                    </option>
                  ))}
                </select>
              </div>

              {/* Destination Type */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  Destination Category:
                </label>
                <select
                  value={newOrderForm.destinationType}
                  onChange={e => setNewOrderForm({ ...newOrderForm, destinationType: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, fontWeight: 700, outline: 'none', fontFamily: 'inherit' }}
                >
                  <option value="other_pg">🏢 Other PG Branch</option>
                  <option value="college">🎓 College / Campus</option>
                  <option value="workplace">💼 Workplace / Office</option>
                  <option value="pack_later">📦 Pack for Later (Takeaway in Room)</option>
                </select>
              </div>

              {/* Destination Details / Location */}
              {newOrderForm.destinationType !== 'pack_later' && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                    Destination Address / Building:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Greenwood PG Block B or ABES Campus Library"
                    value={newOrderForm.destination}
                    onChange={e => setNewOrderForm({ ...newOrderForm, destination: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, fontWeight: 600, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>
              )}

              {/* Assign Delivery Staff */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  Assign Delivery Staff / Boy:
                </label>
                <select
                  value={newOrderForm.assignedStaff}
                  onChange={e => setNewOrderForm({ ...newOrderForm, assignedStaff: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, fontWeight: 700, outline: 'none', fontFamily: 'inherit' }}
                >
                  <option value="">-- Auto-assign or pick staff --</option>
                  {deliveryStaffList.map(s => (
                    <option key={s.id} value={`${s.name} (${s.role})`}>
                      {s.name} ({s.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Special Notes */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  Special Instructions / Packing Note:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Extra napkins, deliver before 1 PM"
                  value={newOrderForm.specialNotes}
                  onChange={e => setNewOrderForm({ ...newOrderForm, specialNotes: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, fontWeight: 600, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #ea580c, #c2410c)',
                  color: '#ffffff',
                  fontSize: 14,
                  fontWeight: 800,
                  border: 'none',
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(234,88,12,0.3)',
                  marginTop: 6
                }}
              >
                {actionLoading ? 'Creating Order...' : '🚀 Dispatch Delivery Order'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
