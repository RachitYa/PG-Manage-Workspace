const fs = require('fs');
let content = fs.readFileSync('febebo-superadmin/src/pages/PGOwners.jsx', 'utf8');

const oldSubPgButtons = `                      {admin.isSubPg ? (
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

const newSubPgButtons = `                      {admin.isSubPg ? (
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
                              onClick={() => navigate(\`/pg-owners/\${admin.id}\`)}
                              className="flex items-center gap-1.5 text-blue-700 bg-blue-50 hover:bg-blue-600 hover:text-white transition-all duration-300 px-3 py-1.5 rounded-lg text-[11px] font-bold shadow-sm cursor-pointer"
                            >
                              <FileText className="w-3 h-3" /> Review Details
                            </button>
                          </div>
                        )
                      ) : (
                        <button
                          onClick={() => navigate(\`/pg-owners/\${admin.id}\`)}
                          className="flex items-center gap-2 text-blue-700 bg-blue-50 hover:bg-blue-600 hover:text-white transition-all duration-300 px-4 py-2 rounded-xl text-sm font-bold shadow-sm cursor-pointer"
                        >
                          <FileText className="w-4 h-4" /> Review Details
                        </button>
                      )}`;

content = content.replace(oldSubPgButtons, newSubPgButtons);
fs.writeFileSync('febebo-superadmin/src/pages/PGOwners.jsx', content);
console.log('Fixed PGOwners subPg buttons');
