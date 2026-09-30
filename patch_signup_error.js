const fs = require('fs');
const file = '/Users/shreyassingh/Downloads/PG MANAGE @/febebo-app/src/screens/SignUp.jsx';
let content = fs.readFileSync(file, 'utf8');

const targetCheck = `    try {
      if (isLoginMode) {`;

const newCheck = `    try {
      if (!isLoginMode && phone.length !== 10) {
        setError('Please enter a valid 10-digit phone number.');
        stopLoading();
        setLoading(false);
        return;
      }
      if (isLoginMode) {`;

content = content.replace(targetCheck, newCheck);

const errorElement = `{error && <div className="error-message"><AlertCircle size={16} />{error}</div>}`;

const errorModal = `{error && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '24px', padding: '32px 24px', width: '100%', maxWidth: '320px', textAlign: 'center', position: 'relative', boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <AlertCircle size={32} color="#ef4444" />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: '900', color: '#0f172a' }}>Error</h3>
            <p style={{ margin: '0 0 24px', fontSize: '15px', color: '#64748b', fontWeight: '500', lineHeight: 1.5 }}>{error}</p>
            <button 
              onClick={() => setError('')} 
              style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: 'white', border: 'none', width: '100%', padding: '14px', borderRadius: '14px', fontWeight: '800', fontSize: '16px', cursor: 'pointer', boxShadow: '0 8px 16px rgba(239,68,68,0.25)' }}
            >
              Okay
            </button>
          </div>
        </div>
      )}`;

content = content.replace(errorElement, errorModal);

fs.writeFileSync(file, content, 'utf8');
