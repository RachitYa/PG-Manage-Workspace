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
    <div style={{ minHeight: '100vh', background: '#ffffff', color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif', paddingBottom: 60 }}>

      {/* ── TOP NAV BAR (APPLE STYLE BLURRED HEADER) ── */}
      <div style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'saturate(180%) blur(20px)',
        borderBottom: '1px solid #f2f2f7',
        padding: '12px 16px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: '#f2f2f7',
              border: 'none',
              borderRadius: '50%',
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#000000'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#000000', letterSpacing: -0.3 }}>
              Deliveries
            </h1>
            <p style={{ margin: 0, fontSize: 11, color: '#8e8e93', fontWeight: 500 }}>
              {currentOrders.length} {mealTab} orders
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setShowQRModal(true)}
            style={{
              background: '#f2f2f7',
              border: 'none',
              color: '#000000',
              padding: '6px 12px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>qr_code_2</span>
            QR Pass
          </button>
          <button
            onClick={() => setShowAddOrderModal(true)}
            style={{
              background: '#000000',
              border: 'none',
              color: '#ffffff',
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
            Order
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '16px' }}>

        {/* ── DATE PICKER & AUDIT SHORTCUT ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: '#f2f2f7',
            borderRadius: 12,
            padding: '6px 12px',
            border: '1px solid #ebebf0'
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#636366' }}>calendar_today</span>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#000000',
                fontWeight: 600,
                fontSize: 13,
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <button
            onClick={() => navigate('/meal-audit-log', { state: { date: selectedDate, meal: mealTab } })}
            style={{
              background: '#f2f2f7',
              border: 'none',
              color: '#000000',
              padding: '6px 12px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>fact_check</span>
            Audit
          </button>
        </div>

        {/* ── iOS SEGMENTED MEAL TABS ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          background: '#f2f2f7',
          borderRadius: 12,
          padding: 3,
          border: '1px solid #ebebf0',
          marginBottom: 14
        }}>
          {['breakfast', 'lunch', 'snacks', 'dinner'].map(slot => {
            const active = mealTab === slot;
            return (
              <button
                key={slot}
                onClick={() => setMealTab(slot)}
                style={{
                  background: active ? '#ffffff' : 'transparent',
                  color: active ? '#000000' : '#8e8e93',
                  border: 'none',
                  borderRadius: 9,
                  padding: '8px 4px',
                  fontSize: 12.5,
                  fontWeight: active ? 700 : 500,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {slot}
              </button>
            );
          })}
        </div>

        {/* ── KPI METRICS (CLEAN APPLE CARDS) ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
          <div style={{ background: '#fbfbfd', border: '1px solid #ebebf0', borderRadius: 14, padding: '12px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: 0.3 }}>Total</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#000000', marginTop: 2 }}>{stats.total}</div>
          </div>
          <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 14, padding: '12px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: 0.3 }}>Pending</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#b45309', marginTop: 2 }}>{stats.pending}</div>
          </div>
          <div style={{ background: '#fff7ed', border: '1px solid #ffedd5', borderRadius: 14, padding: '12px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: '#ea580c', textTransform: 'uppercase', letterSpacing: 0.3 }}>In Transit</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#ea580c', marginTop: 2 }}>{stats.inTransit}</div>
          </div>
          <div style={{ background: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: 14, padding: '12px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: 0.3 }}>Delivered</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#15803d', marginTop: 2 }}>{stats.delivered}</div>
          </div>
        </div>

        {/* ── STAFF ON DUTY (MINIMAL CHIP ROW) ── */}
        {deliveryStaffList.length > 0 && (
          <div style={{
            background: '#f8fafc',
            border: '1px solid #ebebf0',
            borderRadius: 12,
            padding: '8px 12px',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            overflowX: 'auto'
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', flexShrink: 0 }}>
              🛵 Staff:
            </span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap' }}>
              {deliveryStaffList.map(s => (
                <span
                  key={s.id}
                  style={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    padding: '2px 8px',
                    borderRadius: 6,
                    color: '#0f172a',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── DESTINATION CATEGORY PILLS ── */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 10 }}>
          {[
            { id: 'all',        label: 'All Destinations' },
            { id: 'other_pg',   label: '🏢 Other PGs' },
            { id: 'college',    label: '🎓 Colleges' },
            { id: 'workplace',  label: '💼 Workplaces' },
            { id: 'pack_later', label: '🥡 Takeaway' },
          ].map(tab => {
            const active = filterType === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                style={{
                  background: active ? '#000000' : '#f2f2f7',
                  color: active ? '#ffffff' : '#636366',
                  border: 'none',
                  borderRadius: 20,
                  padding: '6px 12px',
                  fontSize: 11.5,
                  fontWeight: active ? 700 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── SEARCH & STATUS FILTER ── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <span className="material-symbols-outlined" style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: 17,
              color: '#8e8e93'
            }}>search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search student, room, address..."
              style={{
                width: '100%',
                background: '#f2f2f7',
                border: 'none',
                borderRadius: 12,
                padding: '8px 10px 8px 34px',
                fontSize: 12.5,
                fontWeight: 500,
                color: '#000000',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            {[
              { id: 'all', label: 'All' },
              { id: 'pending', label: 'Pending' },
              { id: 'picked_up', label: 'Transit' },
              { id: 'delivered', label: 'Done' },
            ].map(st => {
              const active = statusFilter === st.id;
              return (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id)}
                  style={{
                    background: active ? '#000000' : '#f2f2f7',
                    color: active ? '#ffffff' : '#636366',
                    border: 'none',
                    borderRadius: 10,
                    padding: '6px 10px',
                    fontSize: 11,
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer'
                  }}
                >
                  {st.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── ORDERS LIST (CLEAN APPLE CARDS) ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {currentOrders.length === 0 ? (
            <div style={{ background: '#ffffff', borderRadius: 16, border: '1px solid #ebebf0', padding: '36px 16px', textAlign: 'center', color: '#8e8e93' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#d1d1d6' }}>local_shipping</span>
              <p style={{ margin: '8px 0 0', fontSize: 13, fontWeight: 500 }}>No delivery orders</p>
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
                    border: '1px solid #ebebf0',
                    borderRadius: 16,
                    padding: '14px 16px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                  }}
                >
                  {/* Card Header: Student + Status Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#000000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {order.studentName}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 600, background: '#f2f2f7', color: '#636366', padding: '1px 6px', borderRadius: 4, flexShrink: 0 }}>
                        R-{order.roomNumber || 'N/A'}
                      </span>
                      {isPackLater && (
                        <span style={{ fontSize: 10.5, fontWeight: 700, background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: 4, flexShrink: 0 }}>
                          Takeaway
                        </span>
                      )}
                    </div>

                    {/* Status Pill */}
                    <div style={{ flexShrink: 0 }}>
                      {isDelivered ? (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 12, background: '#e8f5e9', color: '#2e7d32' }}>
                          ✓ Delivered
                        </span>
                      ) : isInTransit ? (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 12, background: '#fff3e0', color: '#e65100' }}>
                          🛵 In Transit
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 12, background: '#f2f2f7', color: '#8e8e93' }}>
                          Ready at Mess
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Destination Row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: '#1c1c1e', marginBottom: 6 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#ea580c', flexShrink: 0 }}>
                      {order.destinationType === 'college' ? 'school' : order.destinationType === 'workplace' ? 'business_center' : order.destinationType === 'pack_later' ? 'takeout_dining' : 'location_on'}
                    </span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {order.destination || 'Campus Location'}
                    </span>
                  </div>

                  {/* Micro Metadata Row */}
                  <div style={{ fontSize: 11, color: '#8e8e93', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 4 }}>
                    <div>
                      <span>Boy: <strong>{order.assignedStaff || 'Unassigned'}</strong></span>
                      {order.pickedUpAt && <span> · Picked: {formatTime(order.pickedUpAt)}</span>}
                    </div>
                    {isDelivered && (
                      <span style={{ color: '#16a34a', fontWeight: 600 }}>
                        Done: {formatTime(order.deliveredAt)} {durationStr ? `(${durationStr})` : ''}
                      </span>
                    )}
                  </div>

                  {order.specialNotes && (
                    <div style={{ background: '#f8fafc', padding: '6px 10px', borderRadius: 8, fontSize: 11.5, color: '#636366', marginBottom: 10 }}>
                      Note: {order.specialNotes}
                    </div>
                  )}

                  {/* Action Controls */}
                  <div style={{ display: 'flex', gap: 8, borderTop: '1px solid #f2f2f7', paddingTop: 10 }}>
                    {order.studentPhone && (
                      <a
                        href={`tel:${order.studentPhone}`}
                        style={{
                          background: '#f2f2f7',
                          color: '#000000',
                          padding: '7px 12px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 15 }}>call</span>
                        Call
                      </a>
                    )}

                    {!isDelivered && !isInTransit && (
                      <button
                        onClick={() => handleMarkPickedUp(order.id)}
                        disabled={actionLoading}
                        style={{
                          flex: 1,
                          background: '#f2f2f7',
                          color: '#000000',
                          border: 'none',
                          padding: '8px 12px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 15 }}>takeout_dining</span>
                        Pick Up from Mess
                      </button>
                    )}

                    {!isDelivered && (
                      <button
                        onClick={() => handleMarkDelivered(order)}
                        disabled={actionLoading}
                        style={{
                          flex: 1,
                          background: '#000000',
                          color: '#ffffff',
                          border: 'none',
                          padding: '8px 14px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 15 }}>check_circle</span>
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

      {/* ── DELIVERY QR MODAL (CLEAN APPLE DIALOG) ── */}
      {showQRModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#ffffff', borderRadius: 24, width: '100%', maxWidth: 360, padding: '24px 20px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#000000' }}>
                Delivery QR Pass
              </h3>
              <button onClick={() => setShowQRModal(false)} style={{ background: '#f2f2f7', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#636366' }}>close</span>
              </button>
            </div>

            <div style={{ background: '#ffffff', padding: 16, borderRadius: 18, border: '1px solid #ebebf0', display: 'inline-block', marginBottom: 14 }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrPassValue)}`}
                alt="Delivery QR"
                style={{ width: 180, height: 180, display: 'block', margin: '0 auto' }}
              />
            </div>

            <p style={{ margin: '0 0 16px', fontSize: 12, color: '#8e8e93' }}>
              Student scans this pass to verify receipt for {mealTab} ({selectedDate}).
            </p>

            <button
              onClick={() => setShowQRModal(false)}
              style={{ width: '100%', background: '#000000', color: '#ffffff', padding: '12px', borderRadius: 14, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer' }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ── CREATE NEW ORDER MODAL (CLEAN APPLE SHEET) ── */}
      {showAddOrderModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#ffffff', borderRadius: 24, width: '100%', maxWidth: 420, padding: 22, boxShadow: '0 20px 40px rgba(0,0,0,0.15)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#000000' }}>
                New Delivery Order
              </h3>
              <button onClick={() => setShowAddOrderModal(false)} style={{ background: '#f2f2f7', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#636366' }}>close</span>
              </button>
            </div>

            <form onSubmit={handleCreateOrder} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Select Student */}
              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#8e8e93', marginBottom: 4 }}>
                  Student
                </label>
                <select
                  value={newOrderForm.studentId}
                  onChange={e => setNewOrderForm({ ...newOrderForm, studentId: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #ebebf0', background: '#f2f2f7', fontSize: 13, fontWeight: 600, outline: 'none', fontFamily: 'inherit' }}
                >
                  <option value="">Select student</option>
                  {rawTenants.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} (Room {t.roomNo || t.room})
                    </option>
                  ))}
                </select>
              </div>

              {/* Destination Type */}
              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#8e8e93', marginBottom: 4 }}>
                  Category
                </label>
                <select
                  value={newOrderForm.destinationType}
                  onChange={e => setNewOrderForm({ ...newOrderForm, destinationType: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #ebebf0', background: '#f2f2f7', fontSize: 13, fontWeight: 600, outline: 'none', fontFamily: 'inherit' }}
                >
                  <option value="other_pg">🏢 Other PG Branch</option>
                  <option value="college">🎓 College / Campus</option>
                  <option value="workplace">💼 Workplace / Office</option>
                  <option value="pack_later">🥡 Pack for Later (Takeaway)</option>
                </select>
              </div>

              {/* Destination Details */}
              {newOrderForm.destinationType !== 'pack_later' && (
                <div>
                  <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#8e8e93', marginBottom: 4 }}>
                    Address / Drop Location
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Greenwood PG Block B or Library Gate"
                    value={newOrderForm.destination}
                    onChange={e => setNewOrderForm({ ...newOrderForm, destination: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #ebebf0', background: '#f2f2f7', fontSize: 13, fontWeight: 500, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>
              )}

              {/* Assign Delivery Staff */}
              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#8e8e93', marginBottom: 4 }}>
                  Assign Delivery Partner
                </label>
                <select
                  value={newOrderForm.assignedStaff}
                  onChange={e => setNewOrderForm({ ...newOrderForm, assignedStaff: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #ebebf0', background: '#f2f2f7', fontSize: 13, fontWeight: 600, outline: 'none', fontFamily: 'inherit' }}
                >
                  <option value="">Auto-assign or choose</option>
                  {deliveryStaffList.map(s => (
                    <option key={s.id} value={`${s.name} (${s.role})`}>
                      {s.name} ({s.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Special Notes */}
              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#8e8e93', marginBottom: 4 }}>
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Call when outside"
                  value={newOrderForm.specialNotes}
                  onChange={e => setNewOrderForm({ ...newOrderForm, specialNotes: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #ebebf0', background: '#f2f2f7', fontSize: 13, fontWeight: 500, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 14,
                  background: '#000000',
                  color: '#ffffff',
                  fontSize: 14,
                  fontWeight: 600,
                  border: 'none',
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  marginTop: 6
                }}
              >
                {actionLoading ? 'Creating...' : 'Dispatch Order'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
