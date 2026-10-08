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
    <div style={{ background: '#f8fafc', minHeight: '100vh', paddingBottom: 100, fontFamily: "'Hanken Grotesk', sans-serif" }}>
      
      {/* Top Header */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '14px 16px', position: 'sticky', top: 0, zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onBack} style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#0f172a' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
          </button>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>🛵</span> Tiffin & Food Delivery
            </h2>
            <p style={{ margin: 0, fontSize: 11, color: '#64748b', fontWeight: 600 }}>Deliver packaged meals to other PGs & campuses</p>
          </div>
        </div>

        {/* Show QR Pass Button */}
        <button
          onClick={() => setShowQRModal(true)}
          style={{
            background: 'linear-gradient(135deg, #ea580c, #c2410c)',
            color: 'white',
            border: 'none',
            borderRadius: 12,
            padding: '8px 12px',
            fontSize: 12,
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 4px 12px rgba(234, 88, 12, 0.25)'
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>qr_code_2</span>
          Delivery QR
        </button>
      </div>

      {/* Main Tabs (Live vs History) */}
      <div style={{ padding: '12px 16px 0', display: 'flex', gap: 8 }}>
        <button
          onClick={() => setActiveTab('live')}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: 12,
            border: activeTab === 'live' ? '2px solid #ea580c' : '1px solid #e2e8f0',
            background: activeTab === 'live' ? '#fff7ed' : '#ffffff',
            color: activeTab === 'live' ? '#ea580c' : '#64748b',
            fontSize: 13,
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>local_shipping</span>
          Live Deliveries ({stats.total})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: 12,
            border: activeTab === 'history' ? '2px solid #ea580c' : '1px solid #e2e8f0',
            background: activeTab === 'history' ? '#fff7ed' : '#ffffff',
            color: activeTab === 'history' ? '#ea580c' : '#64748b',
            fontSize: 13,
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>history</span>
          Delivery History ({historyOrders.length})
        </button>
      </div>

      {/* Content based on Active Tab */}
      {activeTab === 'live' ? (
        <div style={{ padding: '12px 16px' }}>

          {/* Date Picker & Meal Tabs */}
          <div style={{ background: '#ffffff', borderRadius: 16, padding: '12px 14px', border: '1px solid #e2e8f0', marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: 0.5 }}>Date & Meal</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ padding: '4px 8px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12, fontWeight: 700, color: '#0f172a', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {['breakfast', 'lunch', 'snacks', 'dinner'].map(m => {
                const isSel = mealTab === m;
                return (
                  <button
                    key={m}
                    onClick={() => setMealTab(m)}
                    style={{
                      padding: '8px 2px',
                      borderRadius: 10,
                      border: 'none',
                      background: isSel ? '#0f172a' : '#f1f5f9',
                      color: isSel ? '#ffffff' : '#64748b',
                      fontSize: 12,
                      fontWeight: 800,
                      textTransform: 'capitalize',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
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
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '10px 8px', textAlign: 'center' }}>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>Total</span>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>{stats.total}</div>
            </div>
            <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: 14, padding: '10px 8px', textAlign: 'center' }}>
              <span style={{ fontSize: 11, color: '#854d0e', fontWeight: 700 }}>Pending</span>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#ca8a04' }}>{stats.pending}</div>
            </div>
            <div style={{ background: '#ffedd5', border: '1px solid #fed7aa', borderRadius: 14, padding: '10px 8px', textAlign: 'center' }}>
              <span style={{ fontSize: 11, color: '#9a3412', fontWeight: 700 }}>In Transit</span>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#ea580c' }}>{stats.inTransit}</div>
            </div>
            <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 14, padding: '10px 8px', textAlign: 'center' }}>
              <span style={{ fontSize: 11, color: '#065f46', fontWeight: 700 }}>Delivered</span>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#059669' }}>{stats.delivered}</div>
            </div>
          </div>

          {/* Big Batch Action: Mark Received from Kitchen */}
          {stats.pending > 0 && (
            <div style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', borderRadius: 18, padding: '14px 16px', color: 'white', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>Kitchen Ready</span>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#fde047' }}>{stats.pending} Tiffins to Pick Up</div>
              </div>
              <button
                onClick={handleMarkPickedUpAll}
                disabled={actionLoading}
                style={{
                  background: 'linear-gradient(135deg, #ea580c, #c2410c)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  padding: '10px 14px',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 4px 12px rgba(234, 88, 12, 0.4)'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>takeout_dining</span>
                Receive All from Mess
              </button>
            </div>
          )}

          {/* Search & Filter pills */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <span className="material-symbols-outlined" style={{ position: 'absolute', left: 10, top: 10, color: '#94a3b8', fontSize: 18 }}>search</span>
              <input
                type="text"
                placeholder="Search student, room, address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '9px 10px 9px 34px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#fff' }}
              />
            </div>
          </div>

          {/* Destination Type Filter Tabs */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6, marginBottom: 12 }}>
            {[
              { id: 'all', label: 'All Destinations' },
              { id: 'other_pg', label: '🏢 Other PGs' },
              { id: 'college', label: '🎓 Colleges' },
              { id: 'workplace', label: '💼 Workplaces' },
              { id: 'pack_later', label: '🥡 Pack for Later' },
            ].map(ft => (
              <button
                key={ft.id}
                onClick={() => setFilterType(ft.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 20,
                  border: filterType === ft.id ? '1.5px solid #ea580c' : '1px solid #e2e8f0',
                  background: filterType === ft.id ? '#fff7ed' : '#ffffff',
                  color: filterType === ft.id ? '#ea580c' : '#64748b',
                  fontSize: 11.5,
                  fontWeight: 800,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer'
                }}
              >
                {ft.label}
              </button>
            ))}
          </div>

          {/* Order Cards List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: 14 }}>Loading delivery dispatches...</div>
          ) : currentOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', background: '#ffffff', borderRadius: 18, border: '1.5px dashed #cbd5e1' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 44, color: '#cbd5e1', marginBottom: 8 }}>two_wheeler</span>
              <h4 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: '#0f172a' }}>No Deliveries for {mealTab}</h4>
              <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>When students request tiffins to other PGs or colleges, they appear here.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {currentOrders.map(order => {
                const isDelivered = order.status === 'delivered';
                const isPickedUp = order.status === 'picked_up';
                const isPending = !order.status || order.status === 'pending';

                return (
                  <div
                    key={order.id}
                    style={{
                      background: '#ffffff',
                      border: isDelivered ? '1.5px solid #a7f3d0' : isPickedUp ? '1.5px solid #fed7aa' : '1px solid #e2e8f0',
                      borderRadius: 18,
                      padding: '14px 16px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      transition: 'all 0.15s'
                    }}
                  >
                    {/* Header Row: Student + Status Badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 15, fontWeight: 900, color: '#0f172a' }}>{order.studentName}</span>
                          <span style={{ fontSize: 11, background: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: 6, fontWeight: 700 }}>
                            Room {order.roomNumber || 'N/A'}
                          </span>
                        </div>
                        {order.studentPhone && (
                          <a
                            href={`tel:${order.studentPhone}`}
                            style={{ fontSize: 12, color: '#0891b2', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 2 }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>call</span>
                            {order.studentPhone}
                          </a>
                        )}
                      </div>

                      {/* Status Badge */}
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          padding: '4px 10px',
                          borderRadius: 20,
                          textTransform: 'uppercase',
                          letterSpacing: 0.4,
                          background: isDelivered ? '#ecfdf5' : isPickedUp ? '#ffedd5' : '#fefce8',
                          color: isDelivered ? '#059669' : isPickedUp ? '#ea580c' : '#ca8a04',
                          border: `1px solid ${isDelivered ? '#a7f3d0' : isPickedUp ? '#fed7aa' : '#fef08a'}`
                        }}
                      >
                        {isDelivered ? '✓ Delivered' : isPickedUp ? '🛵 In Transit' : '⏳ Ready at Mess'}
                      </span>
                    </div>

                    {/* Destination Banner */}
                    <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 12, border: '1px solid #f1f5f9', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#ea580c' }}>
                          {order.destinationType === 'college' ? 'school' : order.destinationType === 'workplace' ? 'business_center' : 'domain'}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#1e293b' }}>
                          {order.destination}
                        </span>
                      </div>
                      {order.notes && (
                        <p style={{ margin: '3px 0 0', fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>
                          Note: "{order.notes}"
                        </p>
                      )}
                    </div>

                    {/* Timestamp Info */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 12 }}>
                      <div>
                        {order.pickedUpAt ? `Picked up: ${formatTime(order.pickedUpAt)}` : 'Waiting for kitchen pickup'}
                      </div>
                      {order.deliveredAt && (
                        <div style={{ color: '#059669', fontWeight: 800 }}>
                          Delivered: {formatTime(order.deliveredAt)} ({calcDuration(order.pickedUpAt, order.deliveredAt)})
                        </div>
                      )}
                    </div>

                    {/* Action Controls */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      {isPending && (
                        <button
                          onClick={() => handleMarkPickedUpSingle(order.id)}
                          disabled={actionLoading}
                          style={{
                            flex: 1,
                            padding: '10px',
                            background: '#fff7ed',
                            color: '#ea580c',
                            border: '1.5px solid #fed7aa',
                            borderRadius: 12,
                            fontSize: 12,
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>takeout_dining</span>
                          Receive from Mess
                        </button>
                      )}

                      {!isDelivered && (
                        <button
                          onClick={() => handleMarkDelivered(order)}
                          disabled={actionLoading}
                          style={{
                            flex: 1,
                            padding: '10px',
                            background: 'linear-gradient(135deg, #059669, #10b981)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 12,
                            fontSize: 12,
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                          Mark Delivered
                        </button>
                      )}

                      {isDelivered && (
                        <div style={{ width: '100%', background: '#ecfdf5', borderRadius: 10, padding: '8px', textAlign: 'center', fontSize: 12, color: '#059669', fontWeight: 800 }}>
                          ✓ Confirmed Delivered ({order.confirmedVia === 'delivery_qr' ? 'Scanned Delivery QR' : 'Marked by Delivery Boy'})
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ══════════════════════════════════════════════════════════════════════
           DELIVERY HISTORY TAB
           ══════════════════════════════════════════════════════════════════════ */
        <div style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 900, color: '#0f172a' }}>Completed Deliveries Log</span>
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>{historyOrders.length} Completed</span>
          </div>

          {historyOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', background: '#ffffff', borderRadius: 18, border: '1.5px dashed #cbd5e1' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 44, color: '#cbd5e1', marginBottom: 8 }}>history</span>
              <h4 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: '#0f172a' }}>No History Yet</h4>
              <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Completed deliveries with timestamps will be logged here.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {historyOrders.map(order => (
                <div
                  key={order.id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 16,
                    padding: '12px 14px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{order.studentName}</span>
                      <span style={{ fontSize: 11, background: '#ede9fe', color: '#6d28d9', padding: '1px 6px', borderRadius: 6, fontWeight: 800, textTransform: 'capitalize' }}>
                        {order.meal}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{order.date}</span>
                  </div>

                  <div style={{ fontSize: 12, color: '#334155', fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#ea580c' }}>location_on</span>
                    {order.destination}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '6px 10px', borderRadius: 8, fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                    <div>
                      Pickup: <strong style={{ color: '#0f172a' }}>{formatTime(order.pickedUpAt)}</strong>
                    </div>
                    <div>
                      Drop: <strong style={{ color: '#059669' }}>{formatTime(order.deliveredAt)}</strong>
                    </div>
                    {calcDuration(order.pickedUpAt, order.deliveredAt) && (
                      <div style={{ color: '#ea580c', fontWeight: 800 }}>
                        ⏱️ {calcDuration(order.pickedUpAt, order.deliveredAt)}
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: 6, fontSize: 10.5, color: '#94a3b8', textAlign: 'right' }}>
                    Verified via: {order.confirmedVia === 'delivery_qr' ? '📱 Student Scanned QR' : '🔘 Delivery Partner Pressed Delivered'} · By {order.deliveredBy || 'Partner'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Delivery Boy QR Pass Modal ── */}
      {showQRModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 28, width: '100%', maxWidth: 360, padding: '24px 20px', textAlign: 'center', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)' }}>
            <button
              onClick={() => setShowQRModal(false)}
              style={{ position: 'absolute', top: 16, right: 16, background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
            </button>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#ffedd5', color: '#ea580c', padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ea580c' }} />
              Delivery Handover Pass
            </div>

            <h3 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 900, color: '#0f172a' }}>
              {mealTab.toUpperCase()} Delivery QR
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: '#64748b', fontWeight: 600 }}>
              Show this QR to students to scan and confirm receipt
            </p>

            <div style={{ background: '#ffffff', padding: 18, borderRadius: 22, border: '2px solid #fed7aa', display: 'inline-block', boxShadow: '0 8px 20px rgba(234,88,12,0.1)', marginBottom: 16 }}>
              <QRCode value={qrPassValue} size={200} level="M" />
            </div>

            <div style={{ background: '#f8fafc', borderRadius: 14, padding: '10px 14px', marginBottom: 12, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ textAlign: 'left' }}>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>Delivered in Batch</span>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#059669' }}>{stats.delivered} / {stats.total}</div>
              </div>
              <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#059669' }}>verified</span>
            </div>

            <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>
              Partner: {staffName || 'Delivery Partner'} · Date: {selectedDate}
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
