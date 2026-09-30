const fs = require('fs');
const file = '/Users/shreyassingh/Downloads/PG MANAGE @/febebo-app/src/screens/Account.jsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('import { X, Upload, CheckCircle2 }')) {
  content = content.replace("import { ReceiptText, ChevronDown, ChevronUp } from 'lucide-react';", "import { ReceiptText, ChevronDown, ChevronUp, X, Upload, CheckCircle2, DollarSign } from 'lucide-react';");
}

if (!content.includes('import { addDoc, setDoc, doc }')) {
  content = content.replace("import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';", "import { collection, query, orderBy, onSnapshot, addDoc, setDoc, doc } from 'firebase/firestore';");
}

const compressImageCode = `
const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const MAX_WIDTH = 800;
        let width = img.width;
        let height = img.height;
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};
`;

if (!content.includes('const compressImage =')) {
  content = content.replace('const Account = () => {', compressImageCode + '\nconst Account = () => {');
}

const newStates = `
  const [showRentModal, setShowRentModal] = useState(false);
  const [rentAmount, setRentAmount] = useState('');
  const [rentMode, setRentMode] = useState('Online');
  const [rentReceivedBy, setRentReceivedBy] = useState('');
  const [rentScreenshot, setRentScreenshot] = useState(null);
  const [isSubmittingRent, setIsSubmittingRent] = useState(false);
  const [rentSuccess, setRentSuccess] = useState(false);
`;

content = content.replace("  const [loading, setLoading] = useState(true);", "  const [loading, setLoading] = useState(true);" + newStates);

const rentLogic = `
  const currentMonthStr = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const isPaidThisMonth = payments.some(p => {
    const isRent = p.paymentType === 'monthly_rent' || p.paymentType === 'token' || p.paymentType === 'first_month';
    return isRent && p.date && p.date.includes(currentMonthStr);
  });

  const baseRent = user?.subscribedPG?.leaseAmount || user?.profileData?.roomDetails?.monthlyRent || '';

  const handlePayRentClick = () => {
    if (isPaidThisMonth) {
      alert("You already paid this month's rent!");
      return;
    }
    setRentAmount(baseRent);
    setShowRentModal(true);
  };

  const submitRent = async (e) => {
    e.preventDefault();
    if (rentMode === 'Online' && !rentScreenshot) {
      return alert("Please upload a payment screenshot.");
    }
    if (!rentReceivedBy) {
      return alert("Please enter who received the payment.");
    }
    setIsSubmittingRent(true);
    try {
      let base64Img = null;
      if (rentScreenshot) {
        base64Img = await compressImage(rentScreenshot);
      }
      
      const paymentObj = {
        amount: Number(rentAmount),
        date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
        name: 'Monthly Rent Payment',
        paymentMode: rentMode,
        paymentType: 'monthly_rent',
        pgName: user?.subscribedPG?.pgName || 'PG',
        receivedBy: rentReceivedBy,
        status: 'Pending Verification',
        type: 'Debit',
        createdAt: new Date().toISOString()
      };
      if (base64Img) paymentObj.screenshot = base64Img;

      // Add to user's payments
      await addDoc(collection(db, 'users', user.uid, 'payments'), paymentObj);

      // Add to rent_receipts for admin
      if (user?.subscribedPG?.pgId) {
        await addDoc(collection(db, 'rent_receipts'), {
          ...paymentObj,
          adminId: user.subscribedPG.pgId,
          tenantId: user.uid,
          tenantName: user.name || 'Student',
          roomNo: user?.subscribedPG?.roomNo || 'Unknown'
        });

        // Notify Admin
        await addDoc(collection(db, 'notifications'), {
          adminId: user.subscribedPG.pgId,
          tenantId: user.uid,
          tenantName: user.name || 'Student',
          title: '💸 Monthly Rent Received',
          desc: \`\${user.name || 'A student'} has submitted a monthly rent payment of ₹\${rentAmount} via \${rentMode}.\`,
          type: 'monthly_rent',
          action: 'VIEW_TRANSACTIONS',
          unread: true,
          createdAt: new Date().toISOString(),
          resolved: false,
          screenshot: base64Img || null
        });
      }

      setRentSuccess(true);
      setTimeout(() => {
        setShowRentModal(false);
        setRentSuccess(false);
        setRentScreenshot(null);
        setRentReceivedBy('');
      }, 2500);

    } catch (err) {
      console.error("Error submitting rent:", err);
      alert("Error submitting rent: " + err.message);
    } finally {
      setIsSubmittingRent(false);
    }
  };
`;

content = content.replace("  // Stats", rentLogic + "\n  // Stats");

const payRentCard = `
        {/* Pay Monthly Rent Card */}
        <div 
          onClick={handlePayRentClick}
          style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', borderRadius: '16px', padding: '16px 20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(15,23,42,0.15)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={24} color="#818cf8" />
            </div>
            <div>
              <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: '800', color: 'white' }}>Pay Monthly Rent</h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>
                {isPaidThisMonth ? '✓ You already paid this month' : 'Submit your rent securely'}
              </p>
            </div>
          </div>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronDown size={16} color="white" style={{ transform: 'rotate(-90deg)' }} />
          </div>
        </div>
`;

content = content.replace('        <h3 style={{ margin: \'0 0 12px\', fontSize: \'16px\', fontWeight: \'800\', color: \'#0f172a\' }}>Transaction History</h3>', payRentCard + '\n        <h3 style={{ margin: \'0 0 12px\', fontSize: \'16px\', fontWeight: \'800\', color: \'#0f172a\' }}>Transaction History</h3>');

const modalJSX = `
      {showRentModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'flex-end', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'white', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: '24px', width: '100%', maxHeight: '90vh', overflowY: 'auto', animation: 'slideUp 0.3s ease-out' }}>
            {rentSuccess ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', textAlign: 'center' }}>
                <CheckCircle2 size={64} color="#16a34a" style={{ marginBottom: '16px' }} />
                <h2 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>Payment Submitted!</h2>
                <p style={{ margin: 0, fontSize: '15px', color: '#64748b' }}>Your rent payment has been sent for verification.</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>Pay Monthly Rent</h2>
                  <button onClick={() => setShowRentModal(false)} style={{ background: '#f1f5f9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={18} color="#475569" />
                  </button>
                </div>
                
                <form onSubmit={submitRent} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Rent Amount</label>
                    <input type="number" value={rentAmount} onChange={e => setRentAmount(e.target.value)} required style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '16px', fontWeight: '600', outline: 'none' }} />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Payment Mode</label>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button type="button" onClick={() => setRentMode('Online')} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: \`2px solid \${rentMode === 'Online' ? '#3b82f6' : '#e2e8f0'}\`, background: rentMode === 'Online' ? '#eff6ff' : 'white', color: rentMode === 'Online' ? '#1d4ed8' : '#64748b', fontWeight: '700', fontSize: '15px' }}>Online</button>
                      <button type="button" onClick={() => setRentMode('Cash')} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: \`2px solid \${rentMode === 'Cash' ? '#16a34a' : '#e2e8f0'}\`, background: rentMode === 'Cash' ? '#f0fdf4' : 'white', color: rentMode === 'Cash' ? '#15803d' : '#64748b', fontWeight: '700', fontSize: '15px' }}>Cash</button>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Received By</label>
                    <input type="text" placeholder="Name of Admin/Staff" value={rentReceivedBy} onChange={e => setRentReceivedBy(e.target.value)} required style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '15px', outline: 'none' }} />
                  </div>

                  {rentMode === 'Online' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Payment Screenshot</label>
                      <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', border: '2px dashed #cbd5e1', borderRadius: '16px', background: '#f8fafc', cursor: 'pointer' }}>
                        {rentScreenshot ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#16a34a', fontWeight: '600' }}>
                            <CheckCircle2 size={20} /> Screenshot Selected
                          </div>
                        ) : (
                          <>
                            <Upload size={24} color="#94a3b8" style={{ marginBottom: '8px' }} />
                            <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>Tap to upload screenshot</span>
                          </>
                        )}
                        <input type="file" accept="image/*" onChange={e => setRentScreenshot(e.target.files[0])} style={{ display: 'none' }} />
                      </label>
                    </div>
                  )}

                  <button type="submit" disabled={isSubmittingRent} style={{ marginTop: '8px', width: '100%', padding: '16px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '800', opacity: isSubmittingRent ? 0.7 : 1 }}>
                    {isSubmittingRent ? 'Submitting...' : 'Submit Payment'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
      <style>{'@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }'}</style>
`;

content = content.replace("    </div>\n  );\n};", modalJSX + "\n    </div>\n  );\n};");

fs.writeFileSync(file, content, 'utf8');
