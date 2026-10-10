import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, setDoc, getDocs } from 'firebase/firestore';
import QRCode from 'react-qr-code';
import { db } from '../../firebase';

export default function StaffDeliveryView({ adminId, activePgId, staffName, onBack, showToast }) {
  const [activeTab, setActiveTab] = useState('live'); // 'live' | 'history'
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [mealTab, setMealTab] = useState(() => {
    const hr = new Date().getHours();
    if (hr < 11) return 'breakfast';
    if (hr < 16) return 'lunch';
    if (hr < 19) return 'snacks';
    return 'dinner';
  });

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQRModal, setShowQRModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'other_pg' | 'college' | 'workplace'

  // Format ISO timestamp to 12-hour AM/PM
  const formatTime = (iso) => {
    if (!iso) return '--:--';
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  // Calculate transit duration in minutes
  const calcDuration = (startIso, endIso) => {
    if (!startIso || !endIso) return null;
    const diffMs = new Date(endIso) - new Date(startIso);
    const mins = Math.max(1, Math.round(diffMs / 60000));
    return `${mins} min${mins > 1 ? 's' : ''}`;
  };

  // Real-time listener for delivery orders
  useEffect(() => {
    if (!adminId) return;
    setLoading(true);

    const q = query(
      collection(db, 'delivery_orders'),
      where('adminId', '==', adminId)
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
  }, [adminId]);

  // Filter orders for Current Meal & Date (Live view)
  const currentOrders = useMemo(() => {
    return orders.filter(o => {
      if (o.date !== selectedDate) return false;
      if (o.meal !== mealTab.toLowerCase()) return false;
      if (filterType !== 'all' && o.destinationType !== filterType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (o.studentName || '').toLowerCase().includes(q) ||
          (o.destination || '').toLowerCase().includes(q) ||
          (o.roomNumber || '').toLowerCase().includes(q) ||
          (o.studentPhone || '').includes(q)
        );
      }
      return true;
    });
  }, [orders, selectedDate, mealTab, filterType, searchQuery]);

  // Filter orders for History view
  const historyOrders = useMemo(() => {
    return orders.filter(o => {
      if (o.status !== 'delivered') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (o.studentName || '').toLowerCase().includes(q) ||
          (o.destination || '').toLowerCase().includes(q) ||
          (o.studentPhone || '').includes(q)
        );
      }
      return true;
    });
  }, [orders, searchQuery]);

  // Summary counts for current meal
  const stats = useMemo(() => {
    const total = currentOrders.length;
    const pending = currentOrders.filter(o => !o.status || o.status === 'pending').length;
    const inTransit = currentOrders.filter(o => o.status === 'picked_up').length;
    const delivered = currentOrders.filter(o => o.status === 'delivered').length;
    return { total, pending, inTransit, delivered };
  }, [currentOrders]);

  // Action: Mark all or single order as Picked Up / Received from kitchen
  const handleMarkPickedUpAll = async () => {
    const unpicked = currentOrders.filter(o => !o.status || o.status === 'pending');
    if (unpicked.length === 0) {
      showToast?.('All orders are already marked as picked up!', 'info');
      return;
    }
    setActionLoading(true);
    try {
      const now = new Date().toISOString();
      await Promise.all(unpicked.map(o => 
        updateDoc(doc(db, 'delivery_orders', o.id), {
          status: 'picked_up',
          pickedUpAt: now,
          pickedUpBy: staffName || 'Delivery Partner'
        })
      ));
      showToast?.(`Picked up ${unpicked.length} tiffins from kitchen! 🛵`, 'success');
    } catch (err) {
      console.error('Error marking picked up:', err);
      showToast?.('Failed to mark picked up: ' + err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkPickedUpSingle = async (orderId) => {
    setActionLoading(true);
    try {
      const now = new Date().toISOString();
      await updateDoc(doc(db, 'delivery_orders', orderId), {
        status: 'picked_up',
        pickedUpAt: now,
        pickedUpBy: staffName || 'Delivery Partner'
      });
      showToast?.('Marked tiffin picked up! 🛵', 'success');
    } catch (err) {
      console.error('Error marking single picked up:', err);
      showToast?.('Failed to update: ' + err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Delivery Boy presses "Mark Delivered" button
  const handleMarkDelivered = async (order) => {
    setActionLoading(true);
    try {
      const now = new Date().toISOString();
      const mLower = (order.meal || mealTab).toLowerCase();

      // 1. Update delivery order record
      await updateDoc(doc(db, 'delivery_orders', order.id), {
        status: 'delivered',
        deliveredAt: now,
        deliveredBy: staffName || 'Delivery Partner',
        confirmedVia: 'delivery_boy_button'
      });

      // 2. Mark student as eaten in mess_headcount with audit trail
      const activeAdmin = order.adminId || adminId;
      const headcountDocRef = doc(db, 'mess_headcount', `${activeAdmin}_${order.date}`);
      await setDoc(headcountDocRef, {
        [`${order.studentId}_${mLower}_eaten`]: true,
        [`${order.studentId}_${mLower}_audit`]: {
          confirmedVia: 'delivery_boy',
          markedByName: staffName || 'Delivery Partner',
          markedByRole: 'Delivery Partner',
          timestamp: now,
          destination: order.destination || ''
        }
      }, { merge: true });

      showToast?.(`Tiffin marked delivered to ${order.studentName}! 🎉`, 'success');
    } catch (err) {
      console.error('Error marking delivered:', err);
      showToast?.('Failed to mark delivered: ' + err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // QR Pass String for students to scan
  const qrPassValue = `FEBEBO_DELIVERY|${adminId}|${selectedDate}|${mealTab}|${staffName || 'Delivery Partner'}`;

  return (
    <div style={{ background: '#ffffff', minHeight: '100vh', paddingBottom: 60, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Roboto, sans-serif', color: '#000000' }}>
      
      {/* ── TOP NAV BAR (APPLE STYLE BLURRED HEADER) ── */}
      <div style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'saturate(180%) blur(20px)',
        borderBottom: '1px solid #f2f2f7',
        padding: '12px 16px',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={onBack}
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
              {stats.total} {mealTab} orders
            </p>
          </div>
        </div>

        {/* Show QR Pass Button */}
        <button
          onClick={() => setShowQRModal(true)}
          style={{
            background: '#000000',
            color: '#ffffff',
            border: 'none',
            borderRadius: 20,
            padding: '6px 14px',
            fontSize: 12.5,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>qr_code_2</span>
          QR Pass
        </button>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '14px 16px' }}>

        {/* ── iOS SEGMENTED TABS (LIVE VS HISTORY) ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          background: '#f2f2f7',
          borderRadius: 12,
          padding: 3,
          border: '1px solid #ebebf0',
          marginBottom: 14
        }}>
          <button
            onClick={() => setActiveTab('live')}
            style={{
              padding: '8px 10px',
              borderRadius: 9,
              border: 'none',
              background: activeTab === 'live' ? '#ffffff' : 'transparent',
              color: activeTab === 'live' ? '#000000' : '#8e8e93',
              fontSize: 13,
              fontWeight: activeTab === 'live' ? 700 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              boxShadow: activeTab === 'live' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            Live ({stats.total})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              padding: '8px 10px',
              borderRadius: 9,
              border: 'none',
              background: activeTab === 'history' ? '#ffffff' : 'transparent',
              color: activeTab === 'history' ? '#000000' : '#8e8e93',
              fontSize: 13,
              fontWeight: activeTab === 'history' ? 700 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              boxShadow: activeTab === 'history' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            History ({historyOrders.length})
          </button>
        </div>

        {/* Content based on Active Tab */}
        {activeTab === 'live' ? (
          <div>

            {/* Date Picker & Meal Tabs */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
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
                    onChange={(e) => setSelectedDate(e.target.value)}
                    style={{ background: 'transparent', border: 'none', color: '#000000', fontSize: 13, fontWeight: 600, outline: 'none', fontFamily: 'inherit' }}
                  />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#8e8e93' }}>
                  {new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}
                </span>
              </div>

              {/* iOS Segmented Meal Slot Tabs */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                background: '#f2f2f7',
                borderRadius: 12,
                padding: 3,
                border: '1px solid #ebebf0'
              }}>
                {['breakfast', 'lunch', 'snacks', 'dinner'].map(m => {
                  const isSel = mealTab === m;
                  return (
                    <button
                      key={m}
                      onClick={() => setMealTab(m)}
                      style={{
                        padding: '8px 4px',
                        borderRadius: 9,
                        border: 'none',
                        background: isSel ? '#ffffff' : 'transparent',
                        color: isSel ? '#000000' : '#8e8e93',
                        fontSize: 12.5,
                        fontWeight: isSel ? 700 : 500,
                        textTransform: 'capitalize',
                        cursor: 'pointer',
                        boxShadow: isSel ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Summary Metric Strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
              <div style={{ background: '#fbfbfd', border: '1px solid #ebebf0', borderRadius: 14, padding: '12px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 10.5, color: '#8e8e93', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>Total</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#000000', marginTop: 2 }}>{stats.total}</div>
              </div>
              <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 14, padding: '12px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 10.5, color: '#d97706', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3 }}>Pending</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#b45309', marginTop: 2 }}>{stats.pending}</div>
              </div>
              <div style={{ background: '#fff7ed', border: '1px solid #ffedd5', borderRadius: 14, padding: '12px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 10.5, color: '#ea580c', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3 }}>Transit</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#ea580c', marginTop: 2 }}>{stats.inTransit}</div>
              </div>
              <div style={{ background: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: 14, padding: '12px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 10.5, color: '#16a34a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3 }}>Delivered</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#15803d', marginTop: 2 }}>{stats.delivered}</div>
              </div>
            </div>

            {/* Kitchen Ready Batch Pickup Action */}
            {stats.pending > 0 && (
              <div style={{
                background: '#fffbeb',
                border: '1px solid #fef3c7',
                borderRadius: 14,
                padding: '12px 14px',
                marginBottom: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>
                    {stats.pending} Tiffins Ready at Mess
                  </div>
                  <div style={{ fontSize: 11, color: '#b45309' }}>
                    Pick up all to start delivery
                  </div>
                </div>
                <button
                  onClick={handleMarkPickedUpAll}
                  disabled={actionLoading}
                  style={{
                    background: '#000000',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 10,
                    padding: '8px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>takeout_dining</span>
                  Pick Up All
                </button>
              </div>
            )}

            {/* Search Input */}
            <div style={{ position: 'relative', marginBottom: 10 }}>
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
                placeholder="Search student, room, address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px 8px 34px',
                  borderRadius: 12,
                  border: 'none',
                  fontSize: 12.5,
                  fontWeight: 500,
                  outline: 'none',
                  boxSizing: 'border-box',
                  background: '#f2f2f7',
                  color: '#000000',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            {/* Destination Type Filter Tabs */}
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 12 }}>
              {[
                { id: 'all', label: 'All' },
                { id: 'other_pg', label: '🏢 PGs' },
                { id: 'college', label: '🎓 College' },
                { id: 'workplace', label: '💼 Work' },
                { id: 'pack_later', label: '🥡 Takeaway' },
              ].map(ft => {
                const active = filterType === ft.id;
                return (
                  <button
                    key={ft.id}
                    onClick={() => setFilterType(ft.id)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 20,
                      border: 'none',
                      background: active ? '#000000' : '#f2f2f7',
                      color: active ? '#ffffff' : '#636366',
                      fontSize: 11.5,
                      fontWeight: active ? 700 : 500,
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {ft.label}
                  </button>
                );
              })}
            </div>

            {/* Order Cards List */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#8e8e93', fontSize: 13 }}>Loading...</div>
            ) : currentOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 16px', background: '#ffffff', borderRadius: 16, border: '1px solid #ebebf0' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#d1d1d6' }}>two_wheeler</span>
                <p style={{ margin: '8px 0 0', fontSize: 13, fontWeight: 500, color: '#8e8e93' }}>No deliveries for {mealTab}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {currentOrders.map(order => {
                  const isDelivered = order.status === 'delivered';
                  const isPickedUp = order.status === 'picked_up';
                  const isPending = !order.status || order.status === 'pending';

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
                      {/* Header Row: Student + Status Badge */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: '#000000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {order.studentName}
                            </span>
                            <span style={{ fontSize: 11, background: '#f2f2f7', color: '#636366', padding: '1px 6px', borderRadius: 4, fontWeight: 600, flexShrink: 0 }}>
                              R-{order.roomNumber || 'N/A'}
                            </span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div style={{ flexShrink: 0 }}>
                          {isDelivered ? (
                            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 12, background: '#e8f5e9', color: '#2e7d32' }}>
                              ✓ Delivered
                            </span>
                          ) : isPickedUp ? (
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

                      {/* Destination */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: '#1c1c1e', marginBottom: 6 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#ea580c', flexShrink: 0 }}>
                          {order.destinationType === 'college' ? 'school' : order.destinationType === 'workplace' ? 'business_center' : 'location_on'}
                        </span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {order.destination}
                        </span>
                      </div>

                      {order.notes && (
                        <p style={{ margin: '0 0 8px', fontSize: 11.5, color: '#636366', background: '#f8fafc', padding: '6px 10px', borderRadius: 8 }}>
                          Note: "{order.notes}"
                        </p>
                      )}

                      {/* Timestamps */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#8e8e93', marginBottom: 10 }}>
                        <div>
                          {order.pickedUpAt ? `Picked: ${formatTime(order.pickedUpAt)}` : 'Awaiting mess pickup'}
                        </div>
                        {order.deliveredAt && (
                          <div style={{ color: '#16a34a', fontWeight: 600 }}>
                            Delivered: {formatTime(order.deliveredAt)}
                          </div>
                        )}
                      </div>

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

                        {isPending && (
                          <button
                            onClick={() => handleMarkPickedUpSingle(order.id)}
                            disabled={actionLoading}
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              background: '#f2f2f7',
                              color: '#000000',
                              border: 'none',
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
                            Pick Up
                          </button>
                        )}

                        {!isDelivered && (
                          <button
                            onClick={() => handleMarkDelivered(order)}
                            disabled={actionLoading}
                            style={{
                              flex: 1,
                              padding: '8px 14px',
                              background: '#000000',
                              color: '#ffffff',
                              border: 'none',
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
                })}
              </div>
            )}
          </div>
        ) : (
          /* ── DELIVERY HISTORY TAB ── */
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#000000' }}>Completed Deliveries</span>
              <span style={{ fontSize: 12, color: '#8e8e93', fontWeight: 600 }}>{historyOrders.length} Done</span>
            </div>

            {historyOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 16px', background: '#ffffff', borderRadius: 16, border: '1px solid #ebebf0' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#d1d1d6' }}>history</span>
                <p style={{ margin: '8px 0 0', fontSize: 13, fontWeight: 500, color: '#8e8e93' }}>No history yet</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {historyOrders.map(order => (
                  <div
                    key={order.id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #ebebf0',
                      borderRadius: 16,
                      padding: '12px 14px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#000000' }}>{order.studentName}</span>
                        <span style={{ fontSize: 11, background: '#f2f2f7', color: '#636366', padding: '1px 6px', borderRadius: 4, fontWeight: 600, textTransform: 'capitalize' }}>
                          {order.meal}
                        </span>
                      </div>
                      <span style={{ fontSize: 11, color: '#8e8e93' }}>{order.date}</span>
                    </div>

                    <div style={{ fontSize: 12, color: '#1c1c1e', fontWeight: 500, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#ea580c' }}>location_on</span>
                      {order.destination}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#8e8e93' }}>
                      <span>Pick: {formatTime(order.pickedUpAt)}</span>
                      <span style={{ color: '#16a34a', fontWeight: 600 }}>Drop: {formatTime(order.deliveredAt)}</span>
                      {calcDuration(order.pickedUpAt, order.deliveredAt) && (
                        <span>⏱️ {calcDuration(order.pickedUpAt, order.deliveredAt)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── DELIVERY QR PASS MODAL (CLEAN APPLE DIALOG) ── */}
      {showQRModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#ffffff', borderRadius: 24, width: '100%', maxWidth: 340, padding: '24px 20px', textAlign: 'center', position: 'relative', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
            <button
              onClick={() => setShowQRModal(false)}
              style={{ position: 'absolute', top: 16, right: 16, background: '#f2f2f7', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#636366' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
            </button>

            <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: '#000000' }}>
              {mealTab.toUpperCase()} QR Pass
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: '#8e8e93' }}>
              Show this QR to student to scan and verify
            </p>

            <div style={{ background: '#ffffff', padding: 16, borderRadius: 18, border: '1px solid #ebebf0', display: 'inline-block', marginBottom: 16 }}>
              <QRCode value={qrPassValue} size={180} level="M" />
            </div>

            <div style={{ background: '#f8fafc', borderRadius: 12, padding: '8px 12px', marginBottom: 14, border: '1px solid #ebebf0', fontSize: 12, color: '#1c1c1e', fontWeight: 600 }}>
              Delivered: {stats.delivered} / {stats.total}
            </div>

            <button
              onClick={() => setShowQRModal(false)}
              style={{ width: '100%', background: '#000000', color: '#ffffff', padding: '12px', borderRadius: 14, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer' }}
            >
              Done
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
