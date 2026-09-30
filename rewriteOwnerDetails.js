const fs = require('fs');
let content = fs.readFileSync('febebo-superadmin/src/pages/PGOwnerDetails.jsx', 'utf8');

// 1. Rewrite fetchData
const oldFetchData = `  useEffect(() => {
    const fetchData = async () => {
      try {
        const adminSnap = await getDoc(doc(db, 'admins', id));
        if (adminSnap.exists()) {
          setAdminData({ id: adminSnap.id, ...adminSnap.data() });
        }
        
        const pgSnap = await getDoc(doc(db, 'pg_owners', id));
        if (pgSnap.exists()) {
          setPgData({ id: pgSnap.id, ...pgSnap.data() });
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);`;

const newFetchData = `  useEffect(() => {
    const fetchData = async () => {
      try {
        const pgSnap = await getDoc(doc(db, 'pg_owners', id));
        let adminIdToFetch = id;
        if (pgSnap.exists()) {
          const data = pgSnap.data();
          setPgData({ id: pgSnap.id, ...data });
          if (data.adminId) {
            adminIdToFetch = data.adminId;
          }
        }
        
        const adminSnap = await getDoc(doc(db, 'admins', adminIdToFetch));
        if (adminSnap.exists()) {
          setAdminData({ id: adminSnap.id, ...adminSnap.data() });
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);`;
content = content.replace(oldFetchData, newFetchData);


// 2. Rewrite handleApprove & add toggleVisibility
const oldHandleApprove = `  const handleApprove = async () => {
    if (!adminData) return;
    setApproving(true);
    try {
      await updateDoc(doc(db, 'admins', id), { isApproved: true });
      if (pgData) {
        await updateDoc(doc(db, 'pg_owners', id), { status: 'Approved' });
        setPgData(prev => ({ ...prev, status: 'Approved' }));
      }
      setAdminData(prev => ({ ...prev, isApproved: true }));
      alert("PG Owner has been approved!");
    } catch (error) {
      console.error("Error approving admin:", error);
      alert("Error approving admin.");
    } finally {
      setApproving(false);
    }
  };`;

const newHandleApprove = `  const [showApproveOptions, setShowApproveOptions] = useState(false);

  const handleApprove = async (visibility) => {
    setApproving(true);
    setShowApproveOptions(false);
    try {
      if (adminData && adminData.id) {
        await updateDoc(doc(db, 'admins', adminData.id), { isApproved: true });
      }
      if (pgData) {
        await updateDoc(doc(db, 'pg_owners', id), { status: 'Approved', visibility });
        setPgData(prev => ({ ...prev, status: 'Approved', visibility }));
      }
      setAdminData(prev => ({ ...prev, isApproved: true }));
    } catch (error) {
      console.error("Error approving admin:", error);
      alert("Error approving admin.");
    } finally {
      setApproving(false);
    }
  };

  const toggleVisibility = async () => {
    if (!pgData) return;
    const newVis = pgData.visibility === 'private' ? 'public' : 'private';
    try {
      await updateDoc(doc(db, 'pg_owners', id), { visibility: newVis });
      setPgData(prev => ({ ...prev, visibility: newVis }));
    } catch(e) {
      alert("Error updating visibility");
    }
  };`;
content = content.replace(oldHandleApprove, newHandleApprove);


// 3. Rewrite header buttons
const oldHeaderButtonsBlock = `        {!isApproved && (
          <div className="mt-6 sm:mt-0 relative z-10">
            <button 
              onClick={handleApprove}
              disabled={approving}
              className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg shadow-green-500/30 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <CheckCircle className="w-5 h-5" />
              {approving ? 'Approving...' : 'Approve PG Owner'}
            </button>
          </div>
        )}`;

const newHeaderButtonsBlock = `        <div className="mt-6 sm:mt-0 relative z-10 flex flex-col items-end gap-2">
          {!isApproved ? (
            showApproveOptions ? (
              <div className="flex gap-2">
                <button onClick={() => handleApprove('public')} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm shadow-sm cursor-pointer">Show to Students</button>
                <button onClick={() => handleApprove('private')} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-bold text-sm shadow-sm cursor-pointer">Hide (Private)</button>
                <button onClick={() => setShowApproveOptions(false)} className="px-4 py-2 bg-white text-red-500 rounded-xl font-bold text-sm cursor-pointer">Cancel</button>
              </div>
            ) : (
              <button 
                onClick={() => setShowApproveOptions(true)}
                disabled={approving}
                className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg shadow-green-500/30 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <CheckCircle className="w-5 h-5" />
                {approving ? 'Approving...' : 'Approve PG Owner'}
              </button>
            )
          ) : (
            pgData && (
              <button
                onClick={toggleVisibility}
                className={\`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm shadow-sm cursor-pointer transition-colors \${pgData.visibility === 'private' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'}\`}
              >
                {pgData.visibility === 'private' ? '👁 Show in Student App' : '🙈 Hide from Student App'}
              </button>
            )
          )}
        </div>`;
content = content.replace(oldHeaderButtonsBlock, newHeaderButtonsBlock);

// 4. Update the "Pending Verification" badge logic slightly to show hidden status
const oldBadge = `              <span className={\`inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold shadow-sm \${isApproved ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-orange-100 text-orange-700 border border-orange-200 animate-pulse'}\`}>
                {isApproved ? 'Approved' : 'Pending Verification'}
              </span>`;

const newBadge = `              <div className="flex items-center gap-2">
                <span className={\`inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold shadow-sm \${isApproved ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-orange-100 text-orange-700 border border-orange-200 animate-pulse'}\`}>
                  {isApproved ? 'Approved' : 'Pending Verification'}
                </span>
                {isApproved && pgData?.visibility === 'private' && (
                  <span className="inline-flex items-center px-2 py-1 rounded-xl text-[10px] font-bold bg-gray-100 text-gray-500 border border-gray-200">
                    Hidden (Private)
                  </span>
                )}
              </div>`;
content = content.replace(oldBadge, newBadge);

fs.writeFileSync('febebo-superadmin/src/pages/PGOwnerDetails.jsx', content);
console.log('Rewrite complete!');
