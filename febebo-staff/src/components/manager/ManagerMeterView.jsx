import React, { useState, useEffect } from 'react';

import { collection, query, where, getDocs, doc, updateDoc, setDoc, getDoc, addDoc , documentId} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';

const cyan = '#0891b2';
const navy = '#0c1a2e';

// ─── CORE BILLING ALGORITHM ───────────────────────────────────────────────────
// Period-based distribution: each tenant's share is computed per "period" formed
// by the sorted milestones (lastReading + each new joiner's meterReadingAtJoin + currReading).
// Tenants who joined BEFORE the billing period start (meterReadingAtJoin <= lastReading)
// are present from the very start of this period and share equally with others present.
function calculateBills(tenants, lastReading, currReading, ratePerUnit) {
  if (!tenants || tenants.length === 0 || currReading <= lastReading) return [];

  // Each tenant's effective start for THIS billing period:
  //   - if they joined before the last billing → they start from lastReading
  //   - if they joined during this period → they start from their meterReadingAtJoin
  const withEffective = tenants.map(t => ({
    ...t,
    effectiveStart: Math.max(Number(t.meterReadingAtJoin) || lastReading, lastReading)
  }));

  // Build sorted unique milestones within [lastReading, currReading]
  const milestoneSet = new Set([
    lastReading,
    ...withEffective.map(t => t.effectiveStart),
    currReading
  ]);
  const milestones = [...milestoneSet]
    .filter(m => m >= lastReading && m <= currReading)
    .sort((a, b) => a - b);

  // Accumulate units per tenant
  const unitMap = {};
  withEffective.forEach(t => { unitMap[t.tenantId] = 0; });

  for (let i = 0; i < milestones.length - 1; i++) {
    const pStart = milestones[i];
    const pEnd   = milestones[i + 1];
    const pUnits = pEnd - pStart;
    const active = withEffective.filter(t => t.effectiveStart <= pStart);
    if (!active.length) continue;
    const share = pUnits / active.length;
    active.forEach(t => { unitMap[t.tenantId] += share; });
  }

  return withEffective.map(t => ({
    ...t,
    consumedUnits: Math.round(unitMap[t.tenantId] * 100) / 100,
    totalAmount:   Math.round(unitMap[t.tenantId] * ratePerUnit * 100) / 100
  }));
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function ManagerMeterView({ adminId, pgId, onBack, showToast }) {
  const user = { uid: adminId };
  const activePgId = pgId || "primary";

  const [meters, setMeters]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [globalRate, setGlobalRate]   = useState(8.5);
  const [showConfig, setShowConfig]   = useState(false);
  const [tempRate, setTempRate]       = useState(8.5);
  const [showAddMeter, setShowAddMeter] = useState(false);
  const [isAdding, setIsAdding]       = useState(false);
  const [successMsg, setSuccessMsg]   = useState('');
  const [availableRooms, setAvailableRooms] = useState([]);

  const [newMeter, setNewMeter] = useState({
    roomId: '', roomName: '', initialReading: '', ratePerUnit: '',
    dateAdded: new Date().toISOString().split('T')[0]
  });

  useEffect(() => { if (adminId) fetchData(); }, [adminId, pgId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Load global rate
      const settingsSnap = await getDoc(doc(db, 'adminSettings', user.uid));
      if (settingsSnap.exists() && settingsSnap.data().meterSettings) {
        const ms = settingsSnap.data().meterSettings;
        setGlobalRate(ms.rate || 8.5);
        setTempRate(ms.rate || 8.5);
      }

      const pgId = activePgId === 'primary' ? user.uid : activePgId;

      const [metersSnap, tenantsSnap, roomsSnap] = await Promise.all([
        getDocs(query(collection(db, 'meters'), where('adminId', '==', user.uid), where('pgId', '==', pgId))),
        getDocs(query(collection(db, 'tenants'), where('adminId', '==', user.uid), where('pgId', '==', pgId))),
        getDocs(query(collection(db, 'rooms'),   where('adminId', '==', user.uid)))
      ]);

      const fetchedMeters = metersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const meterRoomSet  = new Set(fetchedMeters.map(m => String(m.roomName).trim().toLowerCase()));

      // Build tenants by room key
      // Fetch user docs to enrich tenants (just like ManageTenants)
      // Fetch user docs to enrich tenants
      const usersMap = {};
      const tenantIds = [];
      tenantsSnap.forEach(d => {
        const tId = d.data().tenantId || d.id;
        if (tId) tenantIds.push(tId);
      });
      // Fetch users in chunks of 30
      for (let i = 0; i < tenantIds.length; i += 30) {
        const chunk = tenantIds.slice(i, i + 30);
        if (chunk.length > 0) {
          const uSnap = await getDocs(query(collection(db, 'users'), where(documentId(), 'in', chunk)));
          uSnap.forEach(u => { usersMap[u.id] = u.data(); });
        }
      }

      const tenantsByRoom = {};
      tenantsSnap.forEach(d => {
        const t = { id: d.id, ...d.data() };
        const uData = usersMap[t.tenantId || t.id];
        
        if (uData) {
          if (!t.roomNo) t.roomNo = uData.subscribedPG?.roomNo || '';
          if (t.meterReadingAtJoin === undefined || t.meterReadingAtJoin === null || t.meterReadingAtJoin === '') {
             t.meterReadingAtJoin = uData.subscribedPG?.meterReadingAtJoin !== undefined ? uData.subscribedPG.meterReadingAtJoin : (t.meterReading || 0);
          }
          if (!t.status) t.status = uData.status || 'Current User';
        }
        const rNo = String(t.roomNo || t.room || '').trim();
        if (!rNo) return;
        // Exclude moved out or rejected, allow all active variants
        const inactive = ['Moved Out', 'Rejected', 'Deleted', 'Archived'];
        if (inactive.includes(t.status)) return;
        const key = rNo.toLowerCase();
        if (!tenantsByRoom[key]) tenantsByRoom[key] = [];
        tenantsByRoom[key].push({
          name:               t.name || 'Unknown',
          tenantId:           d.id,
          meterReadingAtJoin: Number(t.meterReadingAtJoin) || 0,
          dateOfJoining:      t.dateOfJoining || ''
        });
      });

      // Sort tenants within each room by their joining reading ASC
      Object.keys(tenantsByRoom).forEach(k =>
        tenantsByRoom[k].sort((a, b) => a.meterReadingAtJoin - b.meterReadingAtJoin)
      );

      // Map meters → add tenants + UI state
      const mapped = fetchedMeters.map(m => {
        const key = String(m.roomName).trim().toLowerCase();
        return {
          id:              m.id,
          roomName:        m.roomName,
          ratePerUnit:     Number(m.ratePerUnit) || globalRate,
          lastReading:     Number(m.lastReading  || m.setupReading  || 0),
          lastReadingDate: m.lastReadingDate || m.dateAdded || new Date().toISOString(),
          setupReading:    Number(m.setupReading  || m.lastReading   || 0),
          tenants:         tenantsByRoom[key] || [],
          // per-card UI state
          showForm:        false,
          currReading:     '',
          preview:         null,
          isGenerating:    false
        };
      }).sort((a, b) => a.roomName.localeCompare(b.roomName, undefined, { numeric: true }));

      setMeters(mapped);

      // Rooms not yet having a meter
      setAvailableRooms(
        roomsSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(r => !meterRoomSet.has(String(r.roomNo).trim().toLowerCase()))
          .sort((a, b) => String(a.roomNo).localeCompare(String(b.roomNo), undefined, { numeric: true }))
      );
    } catch (e) {
      console.error('fetchData error:', e);
    } finally {
      setLoading(false);
    }
  };

  // Update currReading on a card + compute live bill preview
  const handleReadingInput = (meterId, val) => {
    setMeters(prev => prev.map(m => {
      if (m.id !== meterId) return m;
      const curr    = Number(val);
      const preview = (!isNaN(curr) && curr > m.lastReading && m.tenants.length > 0)
        ? calculateBills(m.tenants, m.lastReading, curr, m.ratePerUnit)
        : null;
      return { ...m, currReading: val, preview };
    }));
  };

  // Generate bills for one room
  const handleGenerateBill = async (meter) => {
    const curr = Number(meter.currReading);
    if (!curr || curr <= meter.lastReading) {
      return alert(`Current reading must be greater than last reading (${meter.lastReading} kWh).`);
    }
    if (!meter.tenants.length) {
      return alert('No approved residents in this room. Add residents first.');
    }

    setMeters(prev => prev.map(m => m.id === meter.id ? { ...m, isGenerating: true } : m));
    try {
      const pgId        = activePgId === 'primary' ? user.uid : activePgId;
      const now         = new Date();
      const readingDate = now.toISOString();
      const billMonth   = now.toLocaleString('default', { month: 'long', year: 'numeric' });
      const bills       = calculateBills(meter.tenants, meter.lastReading, curr, meter.ratePerUnit);

      for (const b of bills) {
        await addDoc(collection(db, 'meter_bills'), {
          adminId:                user.uid,
          pgId,
          tenantId:               b.tenantId,
          tenantName:             b.name,
          meterId:                meter.id,
          roomName:               meter.roomName,
          meterReadingAtJoin:     b.meterReadingAtJoin,   // permanent: when this tenant joined
          meterReadingAtBillStart: meter.lastReading,      // where this billing period started
          meterReadingAtBillEnd:  curr,                    // where this billing period ended
          consumedUnits:          b.consumedUnits,
          totalAmount:            b.totalAmount,
          ratePerUnit:            meter.ratePerUnit,
          billMonth,
          date:                   readingDate,
          status:                 'Unpaid'
        });

        // In-app notification
        await addDoc(collection(db, 'notifications'), {
          adminId:   user.uid,
          pgId,
          userId:    b.tenantId,
          title:     'New Electricity Bill',
          message:   `Your electricity bill for ${billMonth} is ₹${b.totalAmount.toFixed(2)} (${b.consumedUnits} kWh). Pay from My Account.`,
          createdAt: readingDate,
          isRead:    false,
          type:      'meter_bill'
        });
      }

      // Advance the meter's last reading
      await updateDoc(doc(db, 'meters', meter.id), {
        lastReading:     curr,
        lastReadingDate: readingDate
      });

      const msg = `Bills generated for ${bills.length} resident${bills.length > 1 ? 's' : ''} in Room ${meter.roomName}`;
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(''), 5000);

      setMeters(prev => prev.map(m =>
        m.id === meter.id
          ? { ...m, lastReading: curr, lastReadingDate: readingDate, currReading: '', showForm: false, preview: null, isGenerating: false }
          : m
      ));
    } catch (e) {
      console.error(e);
      alert('Error generating bills. Please try again.');
      setMeters(prev => prev.map(m => m.id === meter.id ? { ...m, isGenerating: false } : m));
    }
  };

  // Add a new meter for a room
  const handleAddMeter = async () => {
    if (!newMeter.roomName) return alert('Please select or enter a room number.');
    if (newMeter.initialReading === '') return alert('Please enter the current meter reading.');
    const init = Number(newMeter.initialReading);
    if (isNaN(init) || init < 0) return alert('Enter a valid non-negative meter reading.');

    setIsAdding(true);
    try {
      const pgId = activePgId === 'primary' ? user.uid : activePgId;
      await addDoc(collection(db, 'meters'), {
        adminId:         user.uid,
        pgId,
        roomName:        newMeter.roomName,
        roomId:          newMeter.roomId || '',
        ratePerUnit:     newMeter.ratePerUnit ? Number(newMeter.ratePerUnit) : globalRate,
        setupReading:    init,
        lastReading:     init,
        lastReadingDate: new Date(newMeter.dateAdded).toISOString(),
        dateAdded:       new Date(newMeter.dateAdded).toISOString()
      });

      setNewMeter({ roomId: '', roomName: '', initialReading: '', ratePerUnit: '', dateAdded: new Date().toISOString().split('T')[0] });
      setShowAddMeter(false);
      fetchData();
    } catch (e) {
      console.error(e);
      alert('Error adding meter.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleConfigSave = async () => {
    const r = Number(tempRate);
    if (isNaN(r) || r <= 0) return alert('Enter a valid rate.');
    setGlobalRate(r);
    setShowConfig(false);
    try {
      await setDoc(doc(db, 'adminSettings', user.uid), { meterSettings: { rate: r } }, { merge: true });
    } catch (e) { console.error(e); }
  };

  // ─── FORMAT DATE ────────────────────────────────────────────────────────────
  const fmtDate = iso => {
    try { return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return iso || '—'; }
  };

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", background: '#f1f5f9', minHeight: '100vh', maxWidth: 480, margin: '0 auto', paddingBottom: 100 }}>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${navy}, #0f2847)`, color: 'white', padding: '20px 16px', paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: 'white', width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
          </button>
          <div>
            <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", margin: 0, fontSize: '1.3rem', fontWeight: 700 }}>Meter Readings</h1>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>Rate: ₹{globalRate}/unit</p>
          </div>
        </div>
        <button onClick={() => setShowConfig(true)} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: 'white', width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>settings</span>
        </button>
      </div>

      {/* Success Toast */}
      {successMsg !== '' && (
        <div style={{ margin: '12px 16px 0', background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="material-symbols-outlined" style={{ color: '#059669', fontSize: 20 }}>check_circle</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#065f46' }}>{successMsg}</span>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 12 }}>
          <div style={{ width: 36, height: 36, border: `3px solid ${cyan}33`, borderTop: `3px solid ${cyan}`, borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>Loading meter data…</p>
        </div>
      ) : meters.length === 0 ? (
        /* Empty State */
        <div style={{ margin: 24, background: 'white', borderRadius: 16, padding: 32, textAlign: 'center', border: '1px dashed #cbd5e1' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 52, color: '#cbd5e1' }}>electric_meter</span>
          <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", color: navy, margin: '12px 0 8px' }}>No Meters Yet</h3>
          <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 20px', lineHeight: 1.5 }}>Tap the + button below to add a meter for a room. Once added, you can record monthly readings and auto-generate individual bills.</p>
          <button onClick={() => setShowAddMeter(true)} style={{ background: cyan, color: 'white', border: 'none', borderRadius: 12, padding: '12px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            + Add First Meter
          </button>
        </div>
      ) : (
        /* Room Cards */
        <div style={{ padding: '16px 16px 0' }}>
          {meters.map(meter => (
            <RoomMeterCard
              key={meter.id}
              meter={meter}
              globalRate={globalRate}
              onReadingInput={val => handleReadingInput(meter.id, val)}
              onToggleForm={() => setMeters(prev => prev.map(m => m.id === meter.id ? { ...m, showForm: !m.showForm, currReading: '', preview: null } : m))}
              onGenerate={() => handleGenerateBill(meter)}
              fmtDate={fmtDate}
            />
          ))}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setShowAddMeter(true)}
        style={{ position: 'fixed', right: 20, bottom: 90, width: 56, height: 56, borderRadius: '50%', background: `linear-gradient(135deg, ${cyan}, #06b6d4)`, color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(8,145,178,0.4)', cursor: 'pointer', zIndex: 40 }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 28 }}>add</span>
      </button>

      {/* ── Add Meter Modal ── */}
      {showAddMeter && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', maxWidth: 480, margin: '0 auto' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowAddMeter(false)} />
          <div style={{ background: 'white', padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24, position: 'relative', zIndex: 10, maxHeight: '85vh', overflowY: 'auto' }}>
            <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", margin: '0 0 4px', fontSize: '1.3rem', color: navy }}>Add Room Meter</h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748b', lineHeight: 1.4 }}>Set up a meter for a room. Enter today's reading — this becomes the baseline for future billing.</p>

            {/* Room select */}
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Room</label>
              {availableRooms.length > 0 ? (
                <select
                  value={newMeter.roomId}
                  onChange={e => {
                    const r = availableRooms.find(x => x.id === e.target.value);
                    setNewMeter(prev => ({ ...prev, roomId: e.target.value, roomName: r ? String(r.roomNo) : prev.roomName }));
                  }}
                  style={inp}
                >
                  <option value="">Select a room…</option>
                  {availableRooms.map(r => (
                    <option key={r.id} value={r.id}>Room {r.roomNo} ({r.seaterLabel || `${r.beds} Seater`})</option>
                  ))}
                  <option value="__manual__">Enter manually…</option>
                </select>
              ) : (
                <input type="text" placeholder="e.g. 101" value={newMeter.roomName} onChange={e => setNewMeter(p => ({ ...p, roomName: e.target.value }))} style={inp} />
              )}
              {newMeter.roomId === '__manual__' && (
                <input type="text" placeholder="Type room number" value={newMeter.roomName} onChange={e => setNewMeter(p => ({ ...p, roomName: e.target.value }))} style={{ ...inp, marginTop: 8 }} />
              )}
            </div>

            {/* Initial reading */}
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Current Meter Reading (kWh)</label>
              <p style={{ margin: '0 0 6px', fontSize: 11, color: '#94a3b8' }}>The reading shown on the physical meter today. This is the starting baseline.</p>
              <input type="number" min="0" placeholder="e.g. 5240" value={newMeter.initialReading} onChange={e => setNewMeter(p => ({ ...p, initialReading: e.target.value }))} style={inp} />
            </div>

            {/* Rate per unit */}
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Rate per Unit (₹/kWh)</label>
              <input type="number" min="0" step="0.1" placeholder={`Default: ₹${globalRate}`} value={newMeter.ratePerUnit} onChange={e => setNewMeter(p => ({ ...p, ratePerUnit: e.target.value }))} style={inp} />
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8' }}>Leave blank to use global rate (₹{globalRate}/unit)</p>
            </div>

            {/* Date */}
            <div style={{ marginBottom: 24 }}>
              <label style={lbl}>Setup Date</label>
              <input type="date" value={newMeter.dateAdded} onChange={e => setNewMeter(p => ({ ...p, dateAdded: e.target.value }))} style={inp} />
            </div>

            <button onClick={handleAddMeter} disabled={isAdding || !newMeter.initialReading || (!newMeter.roomName && !newMeter.roomId)} style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: (!newMeter.initialReading || (!newMeter.roomName && !newMeter.roomId)) ? '#cbd5e1' : cyan, color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {isAdding ? <Spinner /> : <><span className="material-symbols-outlined" style={{ fontSize: 18 }}>electric_meter</span> Add Meter</>}
            </button>
          </div>
        </div>
      )}

      {/* ── Rate Config Sheet ── */}
      {showConfig && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', maxWidth: 480, margin: '0 auto' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowConfig(false)} />
          <div style={{ background: 'white', padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24, position: 'relative', zIndex: 10 }}>
            <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", margin: '0 0 4px', fontSize: '1.3rem', color: navy }}>Global Rate Settings</h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748b' }}>This rate applies to all rooms unless a room has its own rate set.</p>
            <div style={{ marginBottom: 24 }}>
              <label style={lbl}>Default Rate per Unit (₹/kWh)</label>
              <input type="number" step="0.1" value={tempRate} onChange={e => setTempRate(e.target.value)} style={inp} />
            </div>
            <button onClick={handleConfigSave} style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: cyan, color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Save</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
    </div>
  );
}

// ─── ROOM METER CARD ──────────────────────────────────────────────────────────
function RoomMeterCard({ meter, globalRate, onReadingInput, onToggleForm, onGenerate, fmtDate }) {
  const curr         = Number(meter.currReading);
  const isValidInput = !isNaN(curr) && curr > meter.lastReading;

  return (
    <div style={{ background: 'white', borderRadius: 16, marginBottom: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      {/* Room header bar */}
      <div style={{ background: `linear-gradient(135deg, ${navy}, #1e3a5f)`, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="material-symbols-outlined" style={{ color: '#38bdf8', fontSize: 22 }}>electric_meter</span>
          <div>
            <span style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>Room {meter.roomName}</span>
            <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>₹{meter.ratePerUnit}/unit</p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>Last Reading</p>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#38bdf8' }}>{meter.lastReading.toLocaleString()} kWh</p>
        </div>
      </div>

      {/* Last reading date */}
      <div style={{ padding: '8px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#94a3b8' }}>calendar_today</span>
        <span style={{ fontSize: 12, color: '#64748b' }}>Last recorded: {fmtDate(meter.lastReadingDate)}</span>
      </div>

      {/* Tenants list */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
        <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Residents</p>
        {meter.tenants.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>No approved residents in this room yet</p>
        ) : (
          meter.tenants.map(t => (
            <div key={t.tenantId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#0891b2' }}>person</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{t.name}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>Joined @</p>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0891b2' }}>{t.meterReadingAtJoin.toLocaleString()} kWh</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Reading form (collapsed by default) */}
      {!meter.showForm ? (
        <div style={{ padding: '12px 16px' }}>
          <button onClick={onToggleForm} style={{ width: '100%', padding: '10px', background: '#ecfeff', border: `1.5px solid #0891b2`, borderRadius: 10, color: '#0891b2', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'inherit' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>bolt</span>
            Add This Month's Reading
          </button>
        </div>
      ) : (
        <div style={{ padding: '14px 16px', background: '#f8fafc' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Enter Current Reading</p>
            <button onClick={onToggleForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <input
              type="number"
              min={meter.lastReading + 1}
              placeholder={`> ${meter.lastReading} kWh`}
              value={meter.currReading}
              onChange={e => onReadingInput(e.target.value)}
              style={{ flex: 1, padding: '12px 14px', borderRadius: 10, border: `1.5px solid ${!meter.currReading ? '#e2e8f0' : isValidInput ? '#0891b2' : '#ef4444'}`, fontSize: 15, fontWeight: 700, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
            <span style={{ fontSize: 12, color: '#94a3b8', flexShrink: 0 }}>kWh</span>
          </div>

          {meter.currReading && !isValidInput && (
            <p style={{ margin: '0 0 10px', fontSize: 12, color: '#ef4444' }}>⚠ Must be greater than {meter.lastReading} kWh</p>
          )}

          {/* Bill Preview */}
          {meter.preview && (
            <div style={{ background: 'white', borderRadius: 10, border: '1px solid #e2e8f0', padding: '12px 14px', marginBottom: 12 }}>
              <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Bill Preview — {curr - meter.lastReading} kWh total
              </p>
              {meter.preview.map(b => (
                <div key={b.tenantId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #f8fafc' }}>
                  <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 600 }}>{b.name}</span>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 11, color: '#64748b' }}>{b.consumedUnits} kWh · </span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#0891b2' }}>₹{b.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              ))}
              <p style={{ margin: '8px 0 0', fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>Bills are distributed based on each resident's joining reading</p>
            </div>
          )}

          <button
            onClick={onGenerate}
            disabled={!isValidInput || meter.isGenerating || !meter.tenants.length}
            style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: (!isValidInput || !meter.tenants.length) ? '#cbd5e1' : '#0891b2', color: 'white', fontSize: 14, fontWeight: 700, cursor: (!isValidInput || !meter.tenants.length || meter.isGenerating) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}
          >
            {meter.isGenerating ? <Spinner /> : <><span className="material-symbols-outlined" style={{ fontSize: 17 }}>send</span> Generate & Send Bills</>}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── SHARED STYLES ────────────────────────────────────────────────────────────
const lbl = { display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 };
const inp = { width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: "'Hanken Grotesk', sans-serif", color: '#0f172a', background: 'white' };

function Spinner() {
  return <div style={{ width: 18, height: 18, border: '2.5px solid rgba(255,255,255,0.3)', borderTop: '2.5px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />;
}
