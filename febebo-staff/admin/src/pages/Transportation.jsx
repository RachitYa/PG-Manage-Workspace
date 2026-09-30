import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const cyan = '#0891b2';

const DRIVERS = [
  {
    id: 'd1',
    name: 'Suresh Thakur',
    phone: '+91 9876543210',
    altPhone: '+91 9812345600',
    vehicle: 'Alto K10',
    plateNo: 'DL 01 AB 1234',
    route: 'Laxmi Nagar - Noida Sector 62',
    joinDate: '12 Mar 2024',
    photo: null,
    initials: 'ST',
    color: '#6366f1',
    payment: {
      monthly: 8000,
      lastPaid: '1 Jul 2026',
      status: 'Paid',
      mode: 'Cash',
      paidTo: 'Admin',
    },
    students: [
      { name: 'Arjun Mehta', room: '101', pickup: '8:30 AM', drop: '6:30 PM', fee: 1500 },
      { name: 'Priya Sharma', room: '202', pickup: '8:30 AM', drop: '6:30 PM', fee: 1500 },
      { name: 'Ravi Kumar', room: '305', pickup: '8:45 AM', drop: '7:00 PM', fee: 1500 },
    ],
  },
  {
    id: 'd2',
    name: 'Mohan Lal',
    phone: '+91 9988776655',
    altPhone: null,
    vehicle: 'Dzire Tour',
    plateNo: 'DL 02 CD 5678',
    route: 'Dwarka - Connaught Place',
    joinDate: '5 Jan 2025',
    photo: null,
    initials: 'ML',
    color: '#10b981',
    payment: {
      monthly: 9000,
      lastPaid: '28 Jun 2026',
      status: 'Pending',
      mode: 'UPI',
      paidTo: 'Manager',
    },
    students: [
      { name: 'Sneha Kapoor', room: '108', pickup: '9:00 AM', drop: '7:30 PM', fee: 2000 },
      { name: 'Amit Bose', room: '207', pickup: '9:00 AM', drop: '7:30 PM', fee: 2000 },
    ],
  },
  {
    id: 'd3',
    name: 'Rajesh Singh',
    phone: '+91 9111222333',
    altPhone: null,
    vehicle: 'Ertiga',
    plateNo: 'UP 14 EF 9012',
    route: 'Rajouri Garden - Gurugram',
    joinDate: '18 Jun 2023',
    photo: null,
    initials: 'RS',
    color: '#f59e0b',
    payment: {
      monthly: 12000,
      lastPaid: '2 Jul 2026',
      status: 'Paid',
      mode: 'Cash',
      paidTo: 'Admin',
    },
    students: [
      { name: 'Vikram Rao', room: '301', pickup: '7:30 AM', drop: '8:00 PM', fee: 2500 },
    ],
  },
];

function DriverCard({ driver, onClick }) {
  const total = driver.students.reduce((s, st) => s + st.fee, 0);
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
          <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{driver.students.length}</p>
        </div>
        <div style={{ flex: 1, padding: '10px 16px', textAlign: 'center', borderRight: '1px solid #f1f5f9' }}>
          <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Monthly Pay</p>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>₹{driver.payment.monthly.toLocaleString()}</p>
        </div>
        <div style={{ flex: 1, padding: '10px 16px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Status</p>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: driver.payment.status === 'Paid' ? '#059669' : '#e11d48' }}>{driver.payment.status}</p>
        </div>
      </div>
    </div>
  );
}

function DriverDetail({ driver, onBack }) {
  const [tab, setTab] = useState('info'); // info | students | payment
  const total = driver.students.reduce((s, st) => s + st.fee, 0);

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
            {t === 'info' ? 'Driver Info' : t === 'students' ? `Students (${driver.students.length})` : 'Payment'}
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
            {driver.students.map((st, i) => (
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
                { label: 'Monthly Salary', value: `₹${driver.payment.monthly.toLocaleString()}` },
                { label: 'Last Paid', value: driver.payment.lastPaid },
                { label: 'Payment Mode', value: driver.payment.mode },
                { label: 'Paid To', value: driver.payment.paidTo },
              ].map((row, i, arr) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: i < arr.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <span style={{ fontSize: 13, color: '#64748b' }}>{row.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{row.value}</span>
                </div>
              ))}
            </div>
            <button style={{ background: cyan, color: 'white', border: 'none', borderRadius: 14, padding: '14px', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>payments</span>
              Mark as Paid
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Transportation() {
  const navigate = useNavigate();
  const [selectedDriver, setSelectedDriver] = useState(null);

  if (selectedDriver) return <DriverDetail driver={selectedDriver} onBack={() => setSelectedDriver(null)} />;

  const totalDrivers = DRIVERS.length;
  const totalStudents = DRIVERS.reduce((s, d) => s + d.students.length, 0);
  const totalPaid = DRIVERS.filter(d => d.payment.status === 'Paid').length;

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
          <button style={{ background: cyan, border: 'none', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', color: 'white', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
            Add Driver
          </button>
        </div>

        {/* Stats pills */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[
            { label: 'Drivers', value: totalDrivers, icon: 'directions_car', color: '#38bdf8' },
            { label: 'Students', value: totalStudents, icon: 'groups', color: '#a78bfa' },
            { label: 'Paid', value: `${totalPaid}/${totalDrivers}`, icon: 'payments', color: '#4ade80' },
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
        {DRIVERS.map(driver => (
          <DriverCard key={driver.id} driver={driver} onClick={() => setSelectedDriver(driver)} />
        ))}
      </div>
    </div>
  );
}
