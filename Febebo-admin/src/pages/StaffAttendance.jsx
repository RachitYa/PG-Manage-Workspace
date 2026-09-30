import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function StaffAttendance() {
  const navigate = useNavigate();
  const { user, activePgId } = useAuth();
  const today = new Date();

  const [staffList, setStaffList] = useState([]);
  const [selectedStaffToken, setSelectedStaffToken] = useState('');
  
  const [calMonth, setCalMonth] = useState(today.getMonth() + 1); // 1-indexed
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [filterMonth, setFilterMonth] = useState(String(today.getMonth() + 1));
  const [filterYear, setFilterYear] = useState(String(today.getFullYear()));

  const [presentDays, setPresentDays] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStaffList();
    }
  }, [user]);

  useEffect(() => {
    if (selectedStaffToken) {
      fetchAttendanceData(calYear, calMonth, selectedStaffToken);
    }
  }, [calYear, calMonth, selectedStaffToken]);

  const fetchStaffList = async () => {
    try {
      const ownerId = user.uid || user.id || 'admin';
      const q = query(collection(db, 'staff_tokens'), where('ownerUid', '==', ownerId));
      const querySnapshot = await getDocs(q);
      const staffs = [];
      querySnapshot.forEach((doc) => {
        staffs.push({ id: doc.id, ...doc.data() });
      });
      setStaffList(staffs);
      if (staffs.length > 0) {
        setSelectedStaffToken(staffs[0].token);
      }
    } catch (err) {
      console.error("Error fetching staff:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceData = async (year, month, token) => {
    try {
      const q = query(
        collection(db, 'staff_attendance'), 
        where('staffToken', '==', token),
        where('year', '==', year),
        where('month', '==', month)
      );
      const querySnapshot = await getDocs(q);
      const present = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.status === 'present') {
          present.push(data.day);
        }
      });
      setPresentDays(present);
    } catch (err) {
      console.error("Error fetching attendance:", err);
      setPresentDays([]);
    }
  };

  const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate();
  const totalDays = getDaysInMonth(calYear, calMonth);

  // Absent days = all past days in the month that are not present
  const getAbsentDays = () => {
    const absent = [];
    for (let d = 1; d <= totalDays; d++) {
      if (calYear > today.getFullYear() || (calYear === today.getFullYear() && calMonth > today.getMonth() + 1)) {
        continue;
      }
      if (calYear === today.getFullYear() && calMonth === today.getMonth() + 1 && d >= today.getDate()) {
        continue;
      }
      if (!presentDays.includes(d)) {
        absent.push(d);
      }
    }
    return absent;
  };

  const absentDays = getAbsentDays();

  // Calendar offset: day-of-week for the 1st of the month (0=Mon … 6=Sun)
  const firstDayOffset = (() => {
    const jsDay = new Date(calYear, calMonth - 1, 1).getDay(); // 0=Sun
    return jsDay === 0 ? 6 : jsDay - 1; // convert to Mon-based
  })();

  const isToday = (day) => {
    return day === today.getDate() && calMonth === today.getMonth() + 1 && calYear === today.getFullYear();
  };

  const isFuture = (day) => {
    const d = new Date(calYear, calMonth - 1, day);
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return d > todayMidnight;
  };

  const prevMonth = () => {
    if (calMonth === 1) { setCalMonth(12); setCalYear(y => y - 1); }
    else { setCalMonth(m => m - 1); }
  };
  const nextMonth = () => {
    if (calMonth === 12) { setCalMonth(1); setCalYear(y => y + 1); }
    else { setCalMonth(m => m + 1); }
  };

  const handleSubmit = () => {
    setCalMonth(Number(filterMonth));
    setCalYear(Number(filterYear));
  };

  const selectedStaffObj = staffList.find(s => s.token === selectedStaffToken);
  const baseSalary = selectedStaffObj?.salary || 0;
  
  // Calculate salary accurately
  const presentSalary = totalDays > 0 ? Math.round((baseSalary / totalDays) * presentDays.length) : 0;
  const absentSalary = totalDays > 0 ? Math.round((baseSalary / totalDays) * absentDays.length) : 0;

  const selectStyle = {
    flex: 1,
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    backgroundColor: 'white',
    fontSize: '0.95rem',
    color: '#1e293b',
    outline: 'none',
    appearance: 'auto',
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '14px 16px',
        backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 10
      , paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))'}}>
        <button onClick={() => navigate('/manage-staff')} style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#0891b2', display: 'flex', alignItems: 'center'
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 26 }}>arrow_back</span>
        </button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: '1.25rem', fontWeight: 600, color: '#0891b2', marginRight: 30 }}>
          Attendance
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {/* Staff dropdown */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b', marginBottom: 6, display: 'block' }}>Staff Member</label>
          {loading ? (
            <div style={{ padding: '10px', color: '#64748b' }}>Loading staff...</div>
          ) : staffList.length === 0 ? (
            <div style={{ padding: '10px', color: '#64748b', fontStyle: 'italic' }}>No staff found. Please add a staff member first.</div>
          ) : (
            <select
              value={selectedStaffToken}
              onChange={e => setSelectedStaffToken(e.target.value)}
              style={{ ...selectStyle, width: '100%', flex: 'unset' }}
            >
              {staffList.map(s => (
                <option key={s.token} value={s.token}>{s.name} ({s.role})</option>
              ))}
            </select>
          )}
        </div>

        {/* Month / Year / Submit row */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b', marginBottom: 6, display: 'block' }}>Month</label>
            <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={selectStyle}>
              {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b', marginBottom: 6, display: 'block' }}>Year</label>
            <select value={filterYear} onChange={e => setFilterYear(e.target.value)} style={selectStyle}>
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button onClick={handleSubmit} style={{
            padding: '10px 20px', backgroundColor: '#0891b2', color: 'white', border: 'none',
            borderRadius: 8, fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', whiteSpace: 'nowrap'
          }}>
            Submit
          </button>
        </div>

        {/* Salary card */}
        <div style={{
          backgroundColor: 'white', borderRadius: 12, padding: '16px 20px', marginBottom: 16,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0'
        }}>
          <div>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Total Salary</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0891b2', marginTop: 2 }}>₹ {baseSalary.toLocaleString('en-IN')}</div>
          </div>
        </div>

        {/* Present / Absent stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div style={{
            backgroundColor: '#dcfce7', borderRadius: 12, padding: 16, textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
          }}>
            <div style={{ fontSize: '0.85rem', color: '#15803d', fontWeight: 500 }}>Present</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#15803d', margin: '4px 0 2px' }}>{presentDays.length} days</div>
            <div style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: 600 }}>₹{presentSalary.toLocaleString('en-IN')}</div>
          </div>
          <div style={{
            backgroundColor: '#fee2e2', borderRadius: 12, padding: 16, textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
          }}>
            <div style={{ fontSize: '0.85rem', color: '#b91c1c', fontWeight: 500 }}>Absent</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#b91c1c', margin: '4px 0 2px' }}>{absentDays.length} days</div>
            <div style={{ fontSize: '0.85rem', color: '#dc2626', fontWeight: 600 }}>-₹{absentSalary.toLocaleString('en-IN')}</div>
          </div>
        </div>

        {/* Calendar */}
        <div style={{
          backgroundColor: 'white', borderRadius: 12, padding: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0'
        }}>
          {/* Month nav */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#0891b2', display: 'flex' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>chevron_left</span>
            </button>
            <div style={{ fontWeight: 600, fontSize: '1.1rem', color: '#1e293b' }}>
              {MONTH_NAMES[calMonth - 1]} {calYear}
            </div>
            <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#0891b2', display: 'flex' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>chevron_right</span>
            </button>
          </div>

          {/* Day headers */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center',
            gap: 8, marginBottom: 10, fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600
          }}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <div key={d}>{d}</div>)}
          </div>

          {/* Day grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', gap: '8px 4px' }}>
            {/* Empty offset cells */}
            {Array.from({ length: firstDayOffset }).map((_, i) => <div key={`e${i}`} />)}

            {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => {
              const todayOrFuture = isToday(day) || isFuture(day);
              const isPresent = presentDays.includes(day);
              let bg = 'white';
              let color = '#94a3b8';
              
              if (!todayOrFuture) {
                bg = isPresent ? '#dcfce7' : '#fee2e2';
                color = isPresent ? '#15803d' : '#b91c1c';
              } else if (isPresent) {
                bg = '#dcfce7';
                color = '#15803d';
              }
              
              return (
                <div key={day} style={{
                  width: 34, height: 34, margin: '0 auto',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '50%', backgroundColor: bg, color,
                  fontWeight: 500, fontSize: '0.875rem',
                  border: isToday(day) ? '2px solid #0891b2' : 'none'
                }}>
                  {day}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
