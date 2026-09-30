import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, deleteDoc, query, where, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Trash2, Building2, FileText, Filter, AlertTriangle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Format ISO or Firestore timestamp → "17 Aug 2026, 2:05 PM"
function formatDateTime(raw) {
  if (!raw) return null;
  const d = typeof raw === 'string' ? new Date(raw)
    : raw?.toDate ? raw.toDate()
    : raw?.seconds ? new Date(raw.seconds * 1000)
    : new Date(raw);
  if (isNaN(d)) return null;
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });
}

export default function PGOwners() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');
  const [approvingSubPgId, setApprovingSubPgId] = useState(null); // tracks which sub-PG is being approved
  const navigate = useNavigate();

  const [debugLog, setDebugLog] = useState('Starting fetch...');

  const fetchAdmins = async () => {
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
      setDebugLog(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };


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
  };

  useEffect(() => {
    fetchAdmins();
    const fallbackTimer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(fallbackTimer);
  }, []);

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    setIsDeleting(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated as Superadmin");
      const token = await user.getIdToken();
      
      const res = await fetch(`http://${window.location.hostname}:3000/api/account/${deleteConfirmId}?role=admin`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setAdmins(prev => prev.filter(a => a.id !== deleteConfirmId));
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Error deleting admin:', error);
      alert('Failed to delete PG Owner: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const displayedAdmins = useMemo(() => {
    let result = [...admins];
    
    // Sort: pending (false/undefined) at the top, approved (true) at the bottom
    result.sort((a, b) => {
      const aApproved = !!a.isApproved;
      const bApproved = !!b.isApproved;
      if (aApproved === bApproved) return 0;
      return aApproved ? 1 : -1;
    });

    // Filter by status
    if (filterStatus === 'Pending') {
      result = result.filter(a => !a.isApproved);
    } else if (filterStatus === 'Approved') {
      result = result.filter(a => a.isApproved);
    }

    return result;
  }, [admins, filterStatus]);

  if (loading) return (
    <div className="flex flex-col h-[80vh] items-center justify-center gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <div className="text-gray-500 font-medium">{debugLog}</div>
    </div>
  );

  return (
    <div className="animate-slide-up pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-3 rounded-2xl shadow-lg shadow-blue-500/30">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 tracking-tight">
            PG Owners & Verification
          </h1>
        </div>

        <div className="flex items-center gap-3 glass-card px-5 py-2.5 rounded-xl">
          <Filter className="w-4 h-4 text-blue-600" />
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-transparent text-sm font-bold text-gray-700 outline-none cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending Verification</option>
            <option value="Approved">Approved</option>
          </select>
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/40 border-b border-gray-200/50">
              <tr>
                <th className="px-6 py-4 text-sm font-extrabold text-gray-500 tracking-wider uppercase">Name</th>
                <th className="px-6 py-4 text-sm font-extrabold text-gray-500 tracking-wider uppercase">Email</th>
                <th className="px-6 py-4 text-sm font-extrabold text-gray-500 tracking-wider uppercase">Registered On</th>
                <th className="px-6 py-4 text-sm font-extrabold text-gray-500 tracking-wider uppercase">Status</th>
                <th className="px-6 py-4 text-sm font-extrabold text-gray-500 tracking-wider uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/30">
              {displayedAdmins.map(admin => (
                <tr key={admin.id} className="hover:bg-white/60 transition-colors duration-200 group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border shrink-0 ${admin.isSubPg ? 'bg-gradient-to-tr from-cyan-100 to-blue-100 text-cyan-700 border-cyan-200/50' : 'bg-gradient-to-tr from-blue-100 to-indigo-100 text-blue-700 border-blue-200/50'}`}>
                        {admin.name ? admin.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">{admin.name || 'Unknown'}</span>
                          {admin.isSubPg && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700 border border-cyan-200">Additional PG</span>
                          )}
                        </div>
                        {admin.pgData?.pgName && (
                          <span className="text-xs text-gray-500 font-medium flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3" /> {admin.pgData.pgName}
                            {admin.pgData?.pgType && <span className="ml-1 text-[10px] font-bold text-indigo-600">· {admin.pgData.pgType}</span>}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-gray-600 font-medium">{admin.email}</td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-1">
                      {admin.accountCreatedAt ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide w-16 shrink-0">Account</span>
                          <span className="text-xs font-semibold text-gray-700">{formatDateTime(admin.accountCreatedAt)}</span>
                        </div>
                      ) : null}
                      {admin.pgCreatedAt ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wide w-16 shrink-0">PG Profile</span>
                          <span className="text-xs font-semibold text-orange-700">{formatDateTime(admin.pgCreatedAt)}</span>
                        </div>
                      ) : null}
                      {!admin.accountCreatedAt && !admin.pgCreatedAt && (
                        <span className="text-xs text-gray-400 italic">Not recorded</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    {admin.isApproved ? (
                      <span className="inline-flex items-center gap-1.5 py-1.5 px-4 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200 shadow-sm">
                        Approved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 py-1.5 px-4 rounded-full text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200 shadow-sm animate-pulse">
                        Pending Verification
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-5 text-right space-x-3">
                    <div className="flex justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                      {admin.isSubPg ? (
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
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] font-bold text-green-600 px-1 flex flex-col items-end">
                              ✓ Active
                              {admin.pgData?.visibility === 'private' && <span className="text-[9px] text-gray-400">Hidden from Students</span>}
                            </span>
                            <button
                              onClick={() => navigate(`/pg-owners/${admin.id}`)}
                              className="flex items-center gap-1.5 text-blue-700 bg-blue-50 hover:bg-blue-600 hover:text-white transition-all duration-300 px-3 py-1.5 rounded-lg text-[11px] font-bold shadow-sm cursor-pointer"
                            >
                              <FileText className="w-3 h-3" /> Review Details
                            </button>
                          </div>
                        )
                      ) : (
                        <button
                          onClick={() => navigate(`/pg-owners/${admin.id}`)}
                          className="flex items-center gap-2 text-blue-700 bg-blue-50 hover:bg-blue-600 hover:text-white transition-all duration-300 px-4 py-2 rounded-xl text-sm font-bold shadow-sm cursor-pointer"
                        >
                          <FileText className="w-4 h-4" /> Review Details
                        </button>
                      )}
                      {!admin.isSubPg && (
                        <button
                          onClick={() => setDeleteConfirmId(admin.id)}
                          className="text-red-500 bg-red-50 hover:bg-red-500 hover:text-white transition-all duration-300 p-2 rounded-xl shadow-sm cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {displayedAdmins.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-500 font-medium bg-white/30">
                    {filterStatus === 'All' ? 'No PG Owners found.' : `No ${filterStatus.toLowerCase()} PG Owners found.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '24px', padding: '32px 24px', width: '100%', maxWidth: '360px', textAlign: 'center', boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              {isDeleting ? <Loader2 size={32} color="#ef4444" className="animate-spin" /> : <AlertTriangle size={32} color="#ef4444" />}
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>Delete PG Owner?</h3>
            <p style={{ margin: '0 0 24px', fontSize: '15px', color: '#64748b', fontWeight: '500', lineHeight: 1.5 }}>
              Are you sure you want to delete this PG Owner? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => !isDeleting && setDeleteConfirmId(null)}
                disabled={isDeleting}
                style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '15px', cursor: isDeleting ? 'not-allowed' : 'pointer', opacity: isDeleting ? 0.6 : 1 }}
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete}
                disabled={isDeleting}
                style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '15px', cursor: isDeleting ? 'not-allowed' : 'pointer', opacity: isDeleting ? 0.8 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

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
}
