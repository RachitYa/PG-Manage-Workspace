import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const cyan = '#0891b2';

const AVATAR_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#e11d48', '#0891b2', '#8b5cf6'];

function DriverCard({ driver, onClick }) {
  const total = (driver.students || []).reduce((s, st) => s + (st.fee || 0), 0);
  return (
    <div onClick={onClick} style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: 12, cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <div style={{ padding: 16, display: 'flex', gap: 14, alignItems: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: driver.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>{driver.initials}</div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: '#0f172a' }}>{driver.name}</p>
          <p style={{ margin: '2px 0', fontSize: 12, color: '#64748b' }}>{driver.vehicle} · {driver.plateNo}</p>
          <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{driver.route}</p>
        </div>
        <span className="material-symbols-outlined" style={{ color: '#94a3b8', fontSize: 20 }}>chevron_right</span>
      </div>
      <div style={{ display: 'flex', borderTop: '1px solid #f1f5f9' }}>
        <div style={{ flex: 1, padding: '10px 16px', textAlign: 'center', borderRight: '1px solid #f1f5f9' }}>
          <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Students</p>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{(driver.students || []).length}</p>
        </div>
        <div style={{ flex: 1, padding: '10px 16px', textAlign: 'center', borderRight: '1px solid #f1f5f9' }}>
          <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Monthly Pay</p>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>₹{(driver.payment.monthly || 0).toLocaleString()}</p>
        </div>
        <div style={{ flex: 1, padding: '10px 16px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Status</p>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: driver.payment.status === 'Paid' ? '#059669' : '#e11d48' }}>{driver.payment.status}</p>
        </div>
      </div>
    </div>
  );
}

function DriverDetail({ driver, onBack, onMarkPaid }) {
  const [tab, setTab] = useState('info'); // info | students | payment
  const [marking, setMarking] = useState(false);
  const total = (driver.students || []).reduce((s, st) => s + (st.fee || 0), 0);

  const handleMarkPaid = async () => {
    setMarking(true);
    try {
      await onMarkPaid(driver.id);
    } finally {
      setMarking(false);
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 40 }}>
      {/* Hero */}
      <div style={{ background: `linear-gradient(135deg, #0c1a2e, #0f2847)`, padding: '0 16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, height: 64 }}>
          <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back_ios_new</span>
          </button>
          <h1 style={{ flex: 1, margin: 0, fontSize: 18, fontWeight: 800, color: 'white' }}>Driver Details</h1>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', background: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: driver.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 22, flexShrink: 0 }}>{driver.initials}</div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'white' }}>{driver.name}</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>{driver.vehicle} · {driver.plateNo}</p>
          </div>
          <a href={`tel:${driver.phone}`} style={{ background: cyan, borderRadius: 12, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6, color: 'white', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>call</span>
            Call
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: 'white', borderBottom: '1px solid #e2e8f0' }}>
        {['info', 'students', 'payment'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ flex: 1, padding: '14px 0', border: 'none', background: 'transparent', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: tab === t ? cyan : '#64748b', borderBottom: tab === t ? `2px solid ${cyan}` : '2px solid transparent', fontFamily: 'inherit', textTransform: 'capitalize', transition: 'all 0.2s' }}>
            {t === 'info' ? 'Driver Info' : t === 'students' ? `Students (${(driver.students || []).length})` : 'Payment'}
          </button>
        ))}
      </div>

      <div style={{ padding: 16 }}>
        {tab === 'info' && (
          <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            {[
              { label: 'Phone', value: driver.phone, isPhone: true },
              driver.altPhone && { label: 'Alt Phone', value: driver.altPhone, isPhone: true },
              { label: 'Vehicle', value: driver.vehicle },
              { label: 'Plate No.', value: driver.plateNo },
              { label: 'Route', value: driver.route },
              { label: 'Joining Date', value: driver.joinDate },
            ].filter(Boolean).map((row, i, arr) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: i < arr.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                <span style={{ fontSize: 13, color: '#64748b' }}>{row.label}</span>
                {row.isPhone ? (
                  <a href={`tel:${row.value}`} style={{ fontSize: 13, fontWeight: 700, color: cyan, textDecoration: 'none' }}>{row.value}</a>
                ) : (
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', textAlign: 'right', maxWidth: '60%' }}>{row.value}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'students' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ background: '#ecfeff', border: '1px solid #a5f3fc', borderRadius: 12, padding: '10px 14px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: '#0e7490' }}>Total Student Fees Collected</span>
              <span style={{ fontWeight: 800, fontSize: 15, color: '#0891b2' }}>₹{total.toLocaleString()}/mo</span>
            </div>
            {(driver.students || []).length === 0 && (
              <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8', fontSize: 14 }}>No students assigned yet</div>
            )}
            {(driver.students || []).map((st, i) => (
              <div key={i} style={{ background: 'white', borderRadius: 14, border: '1px solid #e2e8f0', padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{st.name}</p>
                  <span style={{ background: '#eef2ff', color: '#6366f1', padding: '2px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>Room {st.room}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: 10, color: '#94a3b8' }}>Pickup</p>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{st.pickup}</p>
                  </div>
                  <div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: 10, color: '#94a3b8' }}>Drop</p>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{st.drop}</p>
                  </div>
                  <div style={{ background: '#ecfdf5', borderRadius: 8, padding: '8px', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: 10, color: '#94a3b8' }}>Fee/Mo</p>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#059669' }}>₹{st.fee}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'payment' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: driver.payment.status === 'Paid' ? '#ecfdf5' : '#fff1f2', border: `1px solid ${driver.payment.status === 'Paid' ? '#a7f3d0' : '#fecaca'}`, borderRadius: 14, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Payment Status</p>
                <p style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 900, color: driver.payment.status === 'Paid' ? '#059669' : '#e11d48' }}>{driver.payment.status}</p>
              </div>
              <span className="material-symbols-outlined" style={{ fontSize: 40, color: driver.payment.status === 'Paid' ? '#059669' : '#e11d48', opacity: 0.4 }}>
                {driver.payment.status === 'Paid' ? 'task_alt' : 'pending'}
              </span>
            </div>
            <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              {[
                { label: 'Monthly Salary', value: `₹${(driver.payment.monthly || 0).toLocaleString()}` },
                { label: 'Last Paid', value: driver.payment.lastPaid || '-' },
                { label: 'Payment Mode', value: driver.payment.mode || '-' },
                { label: 'Paid To', value: driver.payment.paidTo || '-' },
              ].map((row, i, arr) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: i < arr.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <span style={{ fontSize: 13, color: '#64748b' }}>{row.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{row.value}</span>
                </div>
              ))}
            </div>
            {driver.payment.status !== 'Paid' && (
              <button
                onClick={handleMarkPaid}
                disabled={marking}
                style={{ background: cyan, color: 'white', border: 'none', borderRadius: 14, padding: '14px', fontSize: 15, fontWeight: 700, cursor: marking ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit', opacity: marking ? 0.7 : 1 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>payments</span>
                {marking ? 'Saving...' : 'Mark as Paid'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Add Driver Bottom Sheet
function AddDriverSheet({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', phone: '', vehicle: '', plateNo: '', route: '', salary: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name || !form.phone) return alert('Name and phone are required');
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (e) {
      console.error(e);
      alert('Failed to save driver');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = { width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: '#f8fafc' };
  const labelStyle = { fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)' }} />
      <div style={{ position: 'relative', background: 'white', borderRadius: '24px 24px 0 0', maxHeight: '90vh', overflowY: 'auto', paddingBottom: 40 }}>
        <div style={{ position: 'sticky', top: 0, background: 'white', padding: '16px 20px 12px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 2 , paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))'}}>
          <p style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>Add New Driver</p>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#475569' }}>close</span>
          </button>
        </div>
        <div style={{ padding: '20px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Full Name *</label>
            <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Suresh Thakur" />
          </div>
          <div>
            <label style={labelStyle}>Phone *</label>
            <input style={inputStyle} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 9876543210" type="tel" />
          </div>
          <div>
            <label style={labelStyle}>Vehicle</label>
            <input style={inputStyle} value={form.vehicle} onChange={e => set('vehicle', e.target.value)} placeholder="e.g. Alto K10" />
          </div>
          <div>
            <label style={labelStyle}>Plate Number</label>
            <input style={inputStyle} value={form.plateNo} onChange={e => set('plateNo', e.target.value)} placeholder="e.g. DL 01 AB 1234" />
          </div>
          <div>
            <label style={labelStyle}>Route</label>
            <input style={inputStyle} value={form.route} onChange={e => set('route', e.target.value)} placeholder="e.g. Laxmi Nagar - Noida" />
          </div>
          <div>
            <label style={labelStyle}>Monthly Salary (₹)</label>
            <input style={inputStyle} value={form.salary} onChange={e => set('salary', e.target.value)} placeholder="e.g. 8000" type="number" />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ background: cyan, color: 'white', border: 'none', borderRadius: 14, padding: '14px', fontSize: 15, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1, marginTop: 4 }}>
            {saving ? 'Saving...' : 'Save Driver'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Transportation() {
  const navigate = useNavigate();
  const { user, activePgId } = useAuth();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [showAddSheet, setShowAddSheet] = useState(false);

  const fetchDrivers = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'staff'),
        where('adminId', '==', user.uid), where('pgId', '==', activePgId),
        where('role', '==', 'Driver')
      );
      const snap = await getDocs(q);
      const data = snap.docs.map((d, idx) => {
        const r = d.data();
        const name = r.name || 'Unknown';
        return {
          id: d.id,
          name,
          phone: r.phone || '',
          altPhone: r.altPhone || null,
          vehicle: r.vehicleType || r.vehicle || '-',
          plateNo: r.plateNo || '-',
          route: r.route || '-',
          joinDate: r.joinDate || '-',
          initials: name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase(),
          color: AVATAR_COLORS[idx % AVATAR_COLORS.length],
          students: r.assignedStudents || [],
          payment: {
            monthly: r.salary || 0,
            lastPaid: r.lastPaid || '-',
            status: r.paymentStatus || 'Pending',
            mode: r.paymentMode || '-',
            paidTo: r.paidTo || '-',
          },
        };
      });
      setDrivers(data);
    } catch (e) {
      console.error('Failed to fetch drivers:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, [user]);

  const handleAddDriver = async (form) => {
    await addDoc(collection(db, 'staff'), {
      adminId: user.uid, pgId: activePgId, 
      role: 'Driver',
      name: form.name,
      phone: form.phone,
      vehicle: form.vehicle,
      vehicleType: form.vehicle,
      plateNo: form.plateNo,
      route: form.route,
      salary: Number(form.salary) || 0,
      paymentStatus: 'Pending',
      assignedStudents: [],
      createdAt: Date.now(),
    });
    await fetchDrivers();
  };

  const handleMarkPaid = async (driverId) => {
    const ref = doc(db, 'staff', driverId);
    await updateDoc(ref, { paymentStatus: 'Paid', lastPaid: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) });
    // Update local state optimistically
    setDrivers(prev => prev.map(d => d.id === driverId ? { ...d, payment: { ...d.payment, status: 'Paid', lastPaid: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) } } : d));
    // Also update the selected driver detail view
    setSelectedDriver(prev => prev ? { ...prev, payment: { ...prev.payment, status: 'Paid', lastPaid: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) } } : prev);
  };

  if (selectedDriver) return (
    <DriverDetail
      driver={selectedDriver}
      onBack={() => setSelectedDriver(null)}
      onMarkPaid={handleMarkPaid}
    />
  );

  const totalDrivers = drivers.length;
  const totalStudents = drivers.reduce((s, d) => s + (d.students || []).length, 0);
  const totalPaid = drivers.filter(d => d.payment.status === 'Paid').length;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0c1a2e, #0f2847)', padding: '0 16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, height: 64 }}>
          <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back_ios_new</span>
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'white' }}>Transportation</h1>
            <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Drivers & Routes</p>
          </div>
          <button onClick={() => setShowAddSheet(true)} style={{ background: cyan, border: 'none', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', color: 'white', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
            Add Driver
          </button>
        </div>

        {/* Stats pills */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[
            { label: 'Drivers', value: loading ? '-' : totalDrivers, icon: 'directions_car', color: '#38bdf8' },
            { label: 'Students', value: loading ? '-' : totalStudents, icon: 'groups', color: '#a78bfa' },
            { label: 'Paid', value: loading ? '-' : `${totalPaid}/${totalDrivers}`, icon: 'payments', color: '#4ade80' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '12px 10px', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22, color: s.color }}>{s.icon}</span>
              <p style={{ margin: '4px 0 0', fontWeight: 800, fontSize: 18, color: 'white' }}>{s.value}</p>
              <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: 16 }}>
        <p style={{ fontSize: 12, fontWeight: 800, color: '#64748b', letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 14px' }}>All Drivers</p>

        {loading && (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 36, display: 'block', marginBottom: 8, animation: 'spin 1s linear infinite' }}>sync</span>
            Loading drivers...
          </div>
        )}

        {!loading && drivers.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 48, display: 'block', marginBottom: 12, color: '#cbd5e1' }}>directions_car</span>
            <p style={{ fontWeight: 700, color: '#475569', margin: '0 0 6px' }}>No drivers yet</p>
            <p style={{ fontSize: 13, margin: 0 }}>Tap "Add Driver" to get started</p>
          </div>
        )}

        {!loading && drivers.map(driver => (
          <DriverCard key={driver.id} driver={driver} onClick={() => setSelectedDriver(driver)} />
        ))}
      </div>

      {showAddSheet && (
        <AddDriverSheet
          onClose={() => setShowAddSheet(false)}
          onSave={handleAddDriver}
        />
      )}
    </div>
  );
}
