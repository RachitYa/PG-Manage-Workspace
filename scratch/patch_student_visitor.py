import sys

file_path = "febebo-app/src/screens/Visitor.jsx"
with open(file_path, "r") as f:
    content = f.read()

# 1. Update Imports
content = content.replace(
    "import { collection, query, where, orderBy, onSnapshot, addDoc } from 'firebase/firestore';",
    "import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, doc } from 'firebase/firestore';"
)
content = content.replace(
    "import { UserPlus, Plus, X, Calendar, Clock, Phone, FileText, CheckCircle2, Clock as ClockIcon } from 'lucide-react';",
    "import { UserPlus, Plus, X, Calendar, Clock, Phone, FileText, CheckCircle2, Clock as ClockIcon, LogOut } from 'lucide-react';"
)

# 2. Update state variables
old_state = """  const [aadharNo, setAadharNo] = useState('');
  const [aadharFront, setAadharFront] = useState(null);
  const [aadharBack, setAadharBack] = useState(null);"""

new_state = """  const [idNo, setIdNo] = useState('');
  const [idCard, setIdCard] = useState(null);
  const [selectedVisitor, setSelectedVisitor] = useState(null);"""

content = content.replace(old_state, new_state)

# 3. Update handleSubmit
old_submit = """  const handleSubmit = async () => {
    if (!visitorName || !visitDate || !purpose) return;
    setSubmitting(true);
    
    try {
      const newVisitor = {
        adminId: user?.subscribedPG?.pgId || 'none',
        tenantId: user.uid,
        tenantName: user.name || 'Student',
        visitorName,
        visitDate,
        visitTime,
        contact,
        purpose,
        aadharNo,
        aadharFront,
        aadharBack,
        status: 'Pending',
        createdAt: new Date().toISOString()
      };
      
      await addDoc(collection(db, 'visitors'), newVisitor);
      
      setVisitorName('');
      setVisitDate('');
      setVisitTime('');
      setContact('');
      setPurpose('');
      setAadharNo('');
      setAadharFront(null);
      setAadharBack(null);
      setShowPopup(false);
    } catch (e) {
      console.error("Error saving visitor:", e);
      alert("Failed to save visitor. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };"""

new_submit = """  const handleSubmit = async () => {
    if (!visitorName || !visitDate || !purpose || !idCard) return;
    setSubmitting(true);
    
    try {
      const now = new Date();
      const timeIn = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

      const newVisitor = {
        adminId: user?.subscribedPG?.pgId || 'none',
        tenantId: user.uid,
        tenantName: user.name || 'Student',
        visitorName,
        visitDate,
        visitTime,
        contact,
        purpose,
        idNo,
        idCard,
        status: 'Inside',
        timeIn,
        timeOut: null,
        createdAt: now.getTime() // store as timestamp to sort easily
      };
      
      await addDoc(collection(db, 'visitors'), newVisitor);
      
      setVisitorName('');
      setVisitDate('');
      setVisitTime('');
      setContact('');
      setPurpose('');
      setIdNo('');
      setIdCard(null);
      setShowPopup(false);
    } catch (e) {
      console.error("Error saving visitor:", e);
      alert("Failed to save visitor. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckout = async () => {
    if (!selectedVisitor) return;
    const now = new Date();
    const timeOut = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    try {
      await updateDoc(doc(db, 'visitors', selectedVisitor.docId), {
        status: 'Exited',
        timeOut
      });
      setSelectedVisitor(null);
    } catch (e) {
      console.error("Error checking out visitor:", e);
      alert("Failed to check out visitor.");
    }
  };"""

content = content.replace(old_submit, new_submit)

# 4. Modify sorting and status display
old_sort = """      const data = snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() }));
      data.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setVisitors(data);"""

new_sort = """      const data = snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() }));
      data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setVisitors(data);"""

content = content.replace(old_sort, new_sort)

old_card = """            {visitors.map(v => (
              <div key={v.docId} className="visitor-card">
                <div className="v-card-header">
                  <h4 className="v-name">{v.visitorName}</h4>
                  <span className={`v-status ${v.status?.toLowerCase() === 'approved' ? 'status-approved' : 'status-pending'}`}>
                    {v.status?.toLowerCase() === 'approved' ? <CheckCircle2 size={12}/> : <ClockIcon size={12}/>}
                    {v.status || 'Pending'}
                  </span>
                </div>
                
                <div className="v-card-body">
                  <div className="v-info-row">
                    <Calendar size={14} color="#64748b" /> 
                    <span>{v.visitDate} {v.visitTime ? `at ${v.visitTime}` : ''}</span>
                  </div>
                  {v.contact && (
                    <div className="v-info-row">
                      <Phone size={14} color="#64748b" /> 
                      <span>{v.contact}</span>
                    </div>
                  )}
                  <div className="v-info-row">
                    <FileText size={14} color="#64748b" /> 
                    <span>{v.purpose}</span>
                  </div>
                </div>
              </div>
            ))}"""

new_card = """            {visitors.map(v => (
              <div key={v.docId} className="visitor-card" onClick={() => setSelectedVisitor(v)} style={{ cursor: 'pointer' }}>
                <div className="v-card-header">
                  <h4 className="v-name">{v.visitorName}</h4>
                  <span className={`v-status ${v.status === 'Inside' ? 'status-approved' : 'status-pending'}`}>
                    {v.status === 'Inside' ? <ClockIcon size={12}/> : <CheckCircle2 size={12}/>}
                    {v.status || 'Inside'}
                  </span>
                </div>
                
                <div className="v-card-body">
                  <div className="v-info-row">
                    <Calendar size={14} color="#64748b" /> 
                    <span>{v.visitDate} {v.timeIn ? `at ${v.timeIn}` : (v.visitTime ? `at ${v.visitTime}` : '')}</span>
                  </div>
                  {v.contact && (
                    <div className="v-info-row">
                      <Phone size={14} color="#64748b" /> 
                      <span>{v.contact}</span>
                    </div>
                  )}
                  <div className="v-info-row">
                    <FileText size={14} color="#64748b" /> 
                    <span>{v.purpose}</span>
                  </div>
                </div>
              </div>
            ))}"""

content = content.replace(old_card, new_card)

# 5. Modify popup form
old_form = """              <div>
                <label className="popup-label">Aadhar Number (Opt)</label>
                <input 
                  type="text" 
                  className="popup-input" 
                  value={aadharNo} 
                  onChange={e => setAadharNo(e.target.value)}
                  placeholder="12-digit Aadhar number"
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: 12 }}>
                <div style={{ flex: 1 }}>
                  <label className="popup-label">Aadhar Front (Opt)</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    className="popup-input" 
                    style={{ padding: '8px' }}
                    onChange={async (e) => {
                      if (e.target.files[0]) {
                        const compressed = await compressImage(e.target.files[0]);
                        setAadharFront(compressed);
                      }
                    }}
                  />
                  {aadharFront && <span style={{ fontSize: 10, color: 'green' }}>✓ Uploaded</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <label className="popup-label">Aadhar Back (Opt)</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    className="popup-input" 
                    style={{ padding: '8px' }}
                    onChange={async (e) => {
                      if (e.target.files[0]) {
                        const compressed = await compressImage(e.target.files[0]);
                        setAadharBack(compressed);
                      }
                    }}
                  />
                  {aadharBack && <span style={{ fontSize: 10, color: 'green' }}>✓ Uploaded</span>}
                </div>
              </div>

            </div>

            <button 
              className="btn-popup-submit-full"
              onClick={handleSubmit} 
              disabled={submitting || !visitorName || !visitDate || !purpose}
            >"""

new_form = """              <div>
                <label className="popup-label">ID Number (Opt)</label>
                <input 
                  type="text" 
                  className="popup-input" 
                  value={idNo} 
                  onChange={e => setIdNo(e.target.value)}
                  placeholder="ID Number"
                />
              </div>

              <div style={{ marginTop: 12 }}>
                <label className="popup-label">ID Card Image*</label>
                <input 
                  type="file" 
                  accept="image/*"
                  className="popup-input" 
                  style={{ padding: '8px', width: '100%' }}
                  onChange={async (e) => {
                    if (e.target.files[0]) {
                      const compressed = await compressImage(e.target.files[0]);
                      setIdCard(compressed);
                    }
                  }}
                />
                {idCard && <span style={{ fontSize: 10, color: '#16a34a', fontWeight: '600', display: 'block', marginTop: 4 }}>✓ ID Card Uploaded</span>}
              </div>

            </div>

            <button 
              className="btn-popup-submit-full"
              onClick={handleSubmit} 
              disabled={submitting || !visitorName || !visitDate || !purpose || !idCard}
            >"""

content = content.replace(old_form, new_form)

# 6. Add Detailed View Modal before BottomNav
detailed_modal = """      {selectedVisitor && (
        <div className="popup-overlay">
          <div className="popup-card" style={{ maxWidth: 400, padding: 0, overflow: 'hidden' }}>
            <div style={{ background: '#f8fafc', padding: '20px 20px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: 18, color: '#0f172a', fontWeight: 800 }}>{selectedVisitor.visitorName}</h3>
                <span className={`v-status ${selectedVisitor.status === 'Inside' ? 'status-approved' : 'status-pending'}`} style={{ display: 'inline-flex' }}>
                  {selectedVisitor.status}
                </span>
              </div>
              <button onClick={() => setSelectedVisitor(null)} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>
            
            <div style={{ padding: 20 }}>
              <div className="v-card-body" style={{ marginBottom: 20 }}>
                <div className="v-info-row">
                  <Calendar size={16} color="#64748b" /> 
                  <span style={{ fontSize: 14 }}>Date: <strong>{selectedVisitor.visitDate}</strong></span>
                </div>
                <div className="v-info-row">
                  <Clock size={16} color="#64748b" /> 
                  <span style={{ fontSize: 14 }}>Time In: <strong>{selectedVisitor.timeIn || 'N/A'}</strong></span>
                </div>
                {selectedVisitor.timeOut && (
                  <div className="v-info-row">
                    <LogOut size={16} color="#64748b" /> 
                    <span style={{ fontSize: 14 }}>Time Out: <strong>{selectedVisitor.timeOut}</strong></span>
                  </div>
                )}
                {selectedVisitor.contact && (
                  <div className="v-info-row">
                    <Phone size={16} color="#64748b" /> 
                    <span style={{ fontSize: 14 }}>Phone: <strong>{selectedVisitor.contact}</strong></span>
                  </div>
                )}
                <div className="v-info-row">
                  <FileText size={16} color="#64748b" /> 
                  <span style={{ fontSize: 14 }}>Purpose: <strong>{selectedVisitor.purpose}</strong></span>
                </div>
              </div>

              {selectedVisitor.idCard && (
                <div style={{ marginBottom: 24 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#475569', margin: '0 0 8px' }}>ID Card Document</p>
                  <div style={{ width: '100%', height: 180, borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0', background: '#f1f5f9' }}>
                    <img src={selectedVisitor.idCard} alt="ID Document" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                </div>
              )}

              {selectedVisitor.status === 'Inside' && (
                <button 
                  onClick={handleCheckout}
                  style={{ width: '100%', background: '#dc2626', color: 'white', padding: 14, borderRadius: 12, fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  <LogOut size={18} /> Mark as Exited (OUT)
                </button>
              )}
            </div>
          </div>
        </div>
      )}"""

content = content.replace("      <BottomNav activeNav=\"\" />", detailed_modal + "\n      <BottomNav activeNav=\"\" />")

with open(file_path, "w") as f:
    f.write(content)
print("Updated Visitor.jsx successfully")
