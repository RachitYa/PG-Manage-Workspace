const fs = require('fs');
let content = fs.readFileSync('febebo-superadmin/src/pages/PGOwners.jsx', 'utf8');

// Replace fetchAdmins
const oldFetchAdmins = `  const fetchAdmins = async () => {
    try {
      setDebugLog('Fetching admins...');
      const adminSnap = await getDocs(query(collection(db, 'admins'), where('role', '==', 'admin')));
      const adminsList = adminSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDebugLog(\`Found \${adminsList.length} admins. Fetching pg_owners...\`);

      // Fetch primary pg_owners/{uid} doc + sub-collection PGs in parallel
      const [pgSnaps, subPgResults] = await Promise.all([
        Promise.all(adminsList.map(admin => getDoc(doc(db, 'pg_owners', admin.id)))),
        Promise.all(adminsList.map(admin =>
          getDocs(collection(db, 'pg_owners', admin.id, 'pgs'))
            .catch(() => ({ docs: [] }))
        ))
      ]);
      setDebugLog('Fetched pg_owners. Combining...');

      const combined = [];

      adminsList.forEach((admin, index) => {
        const pgDoc = pgSnaps[index];
        const pgData = pgDoc.exists() ? pgDoc.data() : {};

        // Primary PG row (one per admin account)
        combined.push({
          id: admin.id,
          name: admin.name || pgData.adminName || 'Unknown Admin',
          email: admin.email || pgData.email || '',
          isApproved: admin.isApproved || false,
          role: admin.role || 'admin',
          ...admin,
          pgData,
          hasProfile: admin.hasProfile || pgDoc.exists(),
          accountCreatedAt: admin.createdAt || null,
          pgCreatedAt: pgData.createdAt || null,
          isSubPg: false,
        });

        // Additional PG rows from sub-collection
        subPgResults[index].docs.forEach(subDoc => {
          const subData = subDoc.data();
          const isSubApproved = subData.status === 'Active' || subData.status === 'Approved';
          combined.push({
            id: \`\${admin.id}__\${subDoc.id}\`,  // composite key: adminUid__pgDocId
            adminUid: admin.id,
            subPgDocId: subDoc.id,
            name: admin.name || 'Unknown Admin',
            email: admin.email || '',
            isApproved: isSubApproved,
            pgData: subData,
            hasProfile: true,
            accountCreatedAt: null,
            pgCreatedAt: subData.createdAt || null,
            isSubPg: true, // mark as additional PG
          });
        });
      });

      setAdmins(combined);
      setDebugLog('Done.');
    } catch (error) {
      console.error('Error fetching admins/pg_owners:', error);
      setDebugLog(\`Error: \${error.message}\`);
    } finally {
      setLoading(false);
    }
  };`;

const newFetchAdmins = `  const fetchAdmins = async () => {
    try {
      setDebugLog('Fetching admins...');
      const adminSnap = await getDocs(query(collection(db, 'admins'), where('role', '==', 'admin')));
      const adminsList = adminSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const pgOwnersSnap = await getDocs(collection(db, 'pg_owners'));
      const pgOwnersList = pgOwnersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const combined = [];
      
      pgOwnersList.forEach(pgDoc => {
        const adminDoc = adminsList.find(a => a.id === pgDoc.adminId) || adminsList.find(a => a.id === pgDoc.id);
        if (!adminDoc) return; 
        
        const isPrimary = pgDoc.id === adminDoc.id;
        
        combined.push({
          id: pgDoc.id, 
          adminUid: adminDoc.id,
          name: adminDoc.name || pgDoc.adminName || 'Unknown Admin',
          email: adminDoc.email || pgDoc.email || '',
          isApproved: pgDoc.status === 'Approved' || pgDoc.status === 'Active' || adminDoc.isApproved,
          role: adminDoc.role || 'admin',
          ...adminDoc,
          pgData: pgDoc,
          hasProfile: true,
          accountCreatedAt: adminDoc.createdAt || null,
          pgCreatedAt: pgDoc.createdAt || null,
          isSubPg: !isPrimary,
          visibility: pgDoc.visibility || 'public',
        });
      });

      adminsList.forEach(admin => {
          if (!combined.some(c => c.adminUid === admin.id && !c.isSubPg)) {
            combined.push({
              id: admin.id,
              adminUid: admin.id,
              name: admin.name || 'Unknown Admin',
              email: admin.email || '',
              isApproved: admin.isApproved || false,
              role: admin.role || 'admin',
              ...admin,
              pgData: {},
              hasProfile: false,
              accountCreatedAt: admin.createdAt || null,
              pgCreatedAt: null,
              isSubPg: false
            });
          }
      });

      setAdmins(combined);
      setDebugLog('Done.');
    } catch (error) {
      console.error('Error fetching admins/pg_owners:', error);
      setDebugLog(\`Error: \${error.message}\`);
    } finally {
      setLoading(false);
    }
  };`;

content = content.replace(oldFetchAdmins, newFetchAdmins);

// Remove handleApproveSubPg definition completely to rewrite it later
const oldHandleApproveSubPg = `  // Approve an additional sub-collection PG
  const handleApproveSubPg = async (adminUid, subPgDocId, compositeId) => {
    setApprovingSubPgId(compositeId);
    try {
      await updateDoc(doc(db, 'pg_owners', adminUid, 'pgs', subPgDocId), {
        status: 'Active'
      });
      setAdmins(prev => prev.map(a =>
        a.id === compositeId ? { ...a, isApproved: true, pgData: { ...a.pgData, status: 'Active' } } : a
      ));
    } catch (e) {
      alert('Failed to approve PG: ' + e.message);
    } finally {
      setApprovingSubPgId(null);
    }
  };`;

const newHandleApproveSubPg = `
  const [approveModalData, setApproveModalData] = useState(null);

  const handleOpenApproveModal = (pgId, adminUid, isSubPg) => {
    setApproveModalData({ pgId, adminUid, isSubPg });
  };

  const executeApprove = async (visibility) => {
    if (!approveModalData) return;
    const { pgId, adminUid, isSubPg } = approveModalData;
    
    setApprovingSubPgId(pgId);
    try {
      if (isSubPg) {
         // Additional PG
         await updateDoc(doc(db, 'pg_owners', pgId), {
           status: 'Approved',
           visibility
         });
         setAdmins(prev => prev.map(a =>
           a.id === pgId ? { ...a, isApproved: true, pgData: { ...a.pgData, status: 'Approved', visibility } } : a
         ));
      } else {
         // Primary PG (from PGOwners list)
         await updateDoc(doc(db, 'admins', adminUid), { isApproved: true });
         await updateDoc(doc(db, 'pg_owners', pgId), { status: 'Approved', visibility });
         setAdmins(prev => prev.map(a =>
           a.id === pgId ? { ...a, isApproved: true, pgData: { ...a.pgData, status: 'Approved', visibility } } : a
         ));
      }
    } catch (e) {
      alert('Failed to approve PG: ' + e.message);
    } finally {
      setApprovingSubPgId(null);
      setApproveModalData(null);
    }
  };`;
content = content.replace(oldHandleApproveSubPg, newHandleApproveSubPg);

// Update Approve buttons in PGOwners.jsx table
const oldTableButtons = `                      {admin.isSubPg ? (
                        // Additional PG — show Approve button if pending, or Approved badge if done
                        !admin.isApproved ? (
                          <button
                            onClick={() => handleApproveSubPg(admin.adminUid, admin.subPgDocId, admin.id)}
                            disabled={approvingSubPgId === admin.id}
                            className="flex items-center gap-2 text-green-700 bg-green-50 hover:bg-green-600 hover:text-white transition-all duration-300 px-4 py-2 rounded-xl text-sm font-bold shadow-sm cursor-pointer disabled:opacity-60"
                          >
                            {approvingSubPgId === admin.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            {approvingSubPgId === admin.id ? 'Approving...' : '✓ Approve PG'}
                          </button>
                        ) : (
                          <span className="text-xs font-bold text-green-600 px-4 py-2">✓ Active</span>
                        )
                      ) : (
                        // Primary PG — Review Details button
                        <button
                          onClick={() => navigate(\`/pg-owners/\${admin.id}\`)}
                          className="flex items-center gap-2 text-blue-700 bg-blue-50 hover:bg-blue-600 hover:text-white transition-all duration-300 px-4 py-2 rounded-xl text-sm font-bold shadow-sm cursor-pointer"
                        >
                          <FileText className="w-4 h-4" /> Review Details
                        </button>
                      )}`;

const newTableButtons = `                      {admin.isSubPg ? (
                        !admin.isApproved ? (
                          <button
                            onClick={() => handleOpenApproveModal(admin.id, admin.adminUid, true)}
                            disabled={approvingSubPgId === admin.id}
                            className="flex items-center gap-2 text-green-700 bg-green-50 hover:bg-green-600 hover:text-white transition-all duration-300 px-4 py-2 rounded-xl text-sm font-bold shadow-sm cursor-pointer disabled:opacity-60"
                          >
                            {approvingSubPgId === admin.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            {approvingSubPgId === admin.id ? 'Approving...' : '✓ Approve PG'}
                          </button>
                        ) : (
                          <span className="text-xs font-bold text-green-600 px-4 py-2 flex flex-col items-end">
                            ✓ Active
                            {admin.pgData?.visibility === 'private' && <span className="text-[10px] text-gray-500">Hidden from Students</span>}
                          </span>
                        )
                      ) : (
                        <button
                          onClick={() => navigate(\`/pg-owners/\${admin.id}\`)}
                          className="flex items-center gap-2 text-blue-700 bg-blue-50 hover:bg-blue-600 hover:text-white transition-all duration-300 px-4 py-2 rounded-xl text-sm font-bold shadow-sm cursor-pointer"
                        >
                          <FileText className="w-4 h-4" /> Review Details
                        </button>
                      )}`;
content = content.replace(oldTableButtons, newTableButtons);

// Add modal logic to the end of PGOwners.jsx
const approveModalUI = `
      {approveModalData && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '24px', padding: '32px 24px', width: '100%', maxWidth: '360px', textAlign: 'center', boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>Approve PG</h3>
            <p style={{ margin: '0 0 24px', fontSize: '14px', color: '#64748b', fontWeight: '500', lineHeight: 1.5 }}>
              Choose how this PG should be visible after approval.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button 
                onClick={() => executeApprove('public')}
                style={{ padding: '16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                Show to Students
              </button>
              <button 
                onClick={() => executeApprove('private')}
                style={{ padding: '16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                Hide from Students (Private)
              </button>
              <button 
                onClick={() => setApproveModalData(null)}
                style={{ padding: '12px', background: 'transparent', color: '#ef4444', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', marginTop: '8px' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}`;

content = content.replace(/    <\/div>\n  \);\n}/, approveModalUI);

fs.writeFileSync('febebo-superadmin/src/pages/PGOwners.jsx', content);
console.log('Fixed PGOwners.jsx');
