import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROLES, ROLE_CATS, ROLE_GRADIENTS, STAFF_MEMBERS } from './StaffWork';

export default function ManageStaff() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 32 }}>
      {/* Header */}
      <div style={{ background: 'white', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10, borderBottom: '1px solid #e2e8f0' }}>
        <button onClick={() => navigate('/admin-dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#0891b2' }}>
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <p style={{ fontWeight: 800, fontSize: 20, color: '#0891b2', margin: 0, flex: 1, textAlign: 'center' }}>Staff Work</p>
        <div style={{ width: 24 }} />
      </div>

      <div style={{ padding: '16px' }}>
        <WorkStaffView search={search} setSearch={setSearch} />
      </div>
    </div>
  );
}

// ─── WORK STAFF VIEW (ROLE MENU) ───────────────────────
function WorkStaffView({ search, setSearch }) {
  const navigate = useNavigate();

  return (
    <div style={{ paddingBottom: 20 }}>
      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 24 }}>
        <span className="material-symbols-outlined" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#0891b2', fontSize: 20, pointerEvents: 'none' }}>search</span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search Roles" style={{ width: '100%', paddingLeft: 40, paddingRight: 16, paddingTop: 12, paddingBottom: 12, border: '1.5px solid #0891b2', borderRadius: 8, fontSize: 15, fontFamily: 'inherit', background: 'white', color: '#1e293b', outline: 'none', boxSizing: 'border-box' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {ROLE_CATS.map(cat => {
          const matchingRoles = ROLES.filter(r => cat.ids.includes(r.id) && r.label.toLowerCase().includes(search.toLowerCase()));
          if (matchingRoles.length === 0) return null;

          return (
            <div key={cat.key} style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 12, fontWeight: 800, color: '#64748b', letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 12px' }}>{cat.label}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {matchingRoles.map(role => {
                  const members = STAFF_MEMBERS[role.id] || [];
                  const count = members.length;
                  const grad = ROLE_GRADIENTS[role.id] || '#0891b2';

                  return (
                    <div key={role.id} onClick={() => navigate('/staff-work', { state: { role } })}
                      style={{ position: 'relative', width: '100%', paddingTop: '100%', cursor: 'pointer', transition: 'transform 0.2s' }}
                      onTouchStart={e => e.currentTarget.style.transform = 'scale(0.96)'}
                      onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'white', border: `1px solid #e2e8f0`, borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', textAlign: 'center', overflow: 'hidden', padding: 4 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 12, background: grad, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'white' }}>{role.icon}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                          <p style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', margin: '0 0 2px', lineHeight: 1.1, width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{role.label}</p>
                          <p style={{ fontSize: 10, color: '#64748b', margin: 0, width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{count} member{count !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
