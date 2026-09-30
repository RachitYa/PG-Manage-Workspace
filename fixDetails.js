const fs = require('fs');
let content = fs.readFileSync('febebo-superadmin/src/pages/PGOwnerDetails.jsx', 'utf8');

const oldApprove = `  const handleApprove = async () => {
    setApproving(true);
    try {
      await updateDoc(doc(db, 'admins', id), { isApproved: true });
      if (pgData) {
        await updateDoc(doc(db, 'pg_owners', id), { status: 'Approved' });
        setPgData(prev => ({ ...prev, status: 'Approved' }));
      }
      setAdminData(prev => ({ ...prev, isApproved: true }));
    } catch (error) {
      console.error('Error approving admin:', error);
      alert('Failed to approve PG Owner.');
    } finally {
      setApproving(false);
    }
  };`;

const newApprove = `  const [showApproveOptions, setShowApproveOptions] = useState(false);

  const handleApprove = async (visibility) => {
    setShowApproveOptions(false);
    setApproving(true);
    try {
      await updateDoc(doc(db, 'admins', id), { isApproved: true });
      if (pgData) {
        await updateDoc(doc(db, 'pg_owners', id), { status: 'Approved', visibility });
        setPgData(prev => ({ ...prev, status: 'Approved', visibility }));
      }
      setAdminData(prev => ({ ...prev, isApproved: true }));
    } catch (error) {
      console.error('Error approving admin:', error);
      alert('Failed to approve PG Owner.');
    } finally {
      setApproving(false);
    }
  };`;
content = content.replace(oldApprove, newApprove);

const oldBtn = `        {!isApproved && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900 mb-1">Pending Approval</h3>
              <p className="text-sm text-gray-500 font-medium">Review the details and approve this PG Owner to activate their account.</p>
            </div>
            <button
              onClick={handleApprove}
              disabled={approving}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-sm shadow-green-200 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {approving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
              {approving ? 'Approving...' : 'Approve PG Owner'}
            </button>
          </div>
        )}`;

const newBtn = `        {!isApproved && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-gray-900 mb-1">Pending Approval</h3>
              <p className="text-sm text-gray-500 font-medium">Review the details and approve this PG Owner.</p>
            </div>
            
            {showApproveOptions ? (
              <div className="flex gap-2">
                <button onClick={() => handleApprove('public')} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm shadow-sm">Show to Students</button>
                <button onClick={() => handleApprove('private')} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-bold text-sm shadow-sm">Hide (Private)</button>
                <button onClick={() => setShowApproveOptions(false)} className="px-4 py-2 bg-white text-red-500 rounded-xl font-bold text-sm">Cancel</button>
              </div>
            ) : (
              <button
                onClick={() => setShowApproveOptions(true)}
                disabled={approving}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-sm shadow-green-200 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {approving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                {approving ? 'Approving...' : 'Approve PG Owner'}
              </button>
            )}
          </div>
        )}`;
content = content.replace(oldBtn, newBtn);

fs.writeFileSync('febebo-superadmin/src/pages/PGOwnerDetails.jsx', content);
console.log('Fixed PGOwnerDetails.jsx');
