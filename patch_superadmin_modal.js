const fs = require('fs');
const file = '/Users/shreyassingh/Downloads/PG MANAGE @/febebo-superadmin/src/pages/PGOwners.jsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('AlertTriangle')) {
  content = content.replace("import { Trash2, Building2, FileText, Filter }", "import { Trash2, Building2, FileText, Filter, AlertTriangle, Loader2 }");
}

content = content.replace("const [loading, setLoading] = useState(true);", "const [loading, setLoading] = useState(true);\n  const [deleteConfirmId, setDeleteConfirmId] = useState(null);\n  const [isDeleting, setIsDeleting] = useState(false);");

const oldHandleDelete = `  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this PG Owner? This will permanently delete their account.')) return;
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated as Superadmin");
      const token = await user.getIdToken();
      
      const res = await fetch(\`http://\${window.location.hostname}:3000/api/account/\${id}?role=admin\`, {
        method: 'DELETE',
        headers: {
          'Authorization': \`Bearer \${token}\`
        }
      });
      
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setAdmins(admins.filter(a => a.id !== id));
    } catch (error) {
      console.error('Error deleting admin:', error);
      alert('Failed to delete PG Owner: ' + error.message);
    }
  };`;

const newHandleDelete = `  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    setIsDeleting(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated as Superadmin");
      const token = await user.getIdToken();
      
      const res = await fetch(\`http://\${window.location.hostname}:3000/api/account/\${deleteConfirmId}?role=admin\`, {
        method: 'DELETE',
        headers: {
          'Authorization': \`Bearer \${token}\`
        }
      });
      
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setAdmins(admins.filter(a => a.id !== deleteConfirmId));
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Error deleting admin:', error);
      alert('Failed to delete PG Owner: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };`;

content = content.replace(oldHandleDelete, newHandleDelete);

// Modify the trash button onClick
content = content.replace(/onClick=\{\(\) \=\> handleDelete\(admin.id\)\}/g, "onClick={() => setDeleteConfirmId(admin.id)}");

// Add Modal to the bottom
const modalJSX = `
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
    </div>
  );
}`;

content = content.replace("    </div>\n  );\n}", modalJSX);

fs.writeFileSync(file, content, 'utf8');
