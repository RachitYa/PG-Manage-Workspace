import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection, query, where, onSnapshot,
  doc, updateDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

// ── helpers ──────────────────────────────────────────────────────────────────
function formatDate(val) {
  if (!val) return '—';
  // Support Firestore Timestamp or plain string
  if (val?.toDate) return val.toDate().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  return String(val);
}

// ─────────────────────────────────────────────────────────────────────────────

export default function Leave() {
  const navigate = useNavigate();
  const { user, activePgId } = useAuth();

  const [leaves, setLeaves]   = useState([]);
  const [tab, setTab]         = useState('pending');   // 'pending' | 'history'
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);       // which card is saving

  // ── Fetch leave requests (real-time) ─────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) return;

    setLoading(true);
    const unsub = onSnapshot(
      query(
        collection(db, 'leave_requests'),
        where('adminId', '==', user.uid), where('pgId', '==', activePgId)
      ),
      (snap) => {
        setLeaves(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error('Leave realtime error:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user?.uid]);

  // ── Approve / Reject ──────────────────────────────────────────────────────
  const updateStatus = async (leaveId, newStatus) => {
    setActionId(leaveId);
    try {
      await updateDoc(doc(db, 'leave_requests', leaveId), { status: newStatus });
      setLeaves(prev =>
        prev.map(l => l.id === leaveId ? { ...l, status: newStatus } : l)
      );
    } catch (err) {
      console.error('Status update error:', err);
    } finally {
      setActionId(null);
    }
  };

  // ── Derived lists ─────────────────────────────────────────────────────────
  const pending = leaves.filter(l => l.status === 'Pending');
  const approved = leaves.filter(l => l.status === 'Approved');
  const rejected = leaves.filter(l => l.status === 'Rejected');

  let displayed = pending;
  if (tab === 'approved') displayed = approved;
  if (tab === 'rejected') displayed = rejected;

  // ── Status badge colours ──────────────────────────────────────────────────
  const statusColors = {
    Approved: { bg: 'rgba(16,185,129,0.1)', text: '#059669', border: '#22c55e' },
    Rejected: { bg: 'rgba(239,68,68,0.1)',  text: '#dc2626', border: '#ef4444' },
    Pending:  { bg: 'rgba(245,158,11,0.1)', text: '#d97706', border: '#f59e0b' },
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      fontFamily: "'Hanken Grotesk', sans-serif",
      maxWidth: '480px',
      margin: '0 auto',
      backgroundColor: '#f1f5f9',
      minHeight: '100vh',
      paddingBottom: '40px',
    }}>

      {/* ── Header ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0c1a2e 0%, #0f2847 60%, #0891b2 100%)',
        padding: '20px 20px 28px',
        color: 'white',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
          <span
            className="material-symbols-outlined"
            onClick={() => navigate(-1)}
            style={{ cursor: 'pointer', fontSize: '24px' }}
          >
            arrow_back
          </span>
          <h1 style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            margin: 0,
            fontSize: '20px',
            fontWeight: '600',
          }}>
            Leave Requests
          </h1>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {[
            { label: 'Pending',  count: pending.length,  color: '#fbbf24', key: 'pending' },
            { label: 'Approved', count: approved.length, color: '#34d399', key: 'approved' },
            { label: 'Rejected', count: rejected.length, color: '#f87171', key: 'rejected' },
          ].map(s => (
            <div key={s.label} onClick={() => setTab(s.key)} style={{
              flex: 1,
              background: tab === s.key ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)',
              borderRadius: '10px',
              padding: '10px',
              textAlign: 'center',
              backdropFilter: 'blur(4px)',
              cursor: 'pointer',
              border: tab === s.key ? `1px solid ${s.color}` : '1px solid transparent',
              transition: 'all 0.2s ease',
            }}>
              <div style={{ fontSize: '22px', fontWeight: '700', color: s.color, fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                {s.count}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)', marginTop: '2px', fontWeight: tab === s.key ? 'bold' : 'normal' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tab switcher ── */}
      <div style={{
        display: 'flex',
        backgroundColor: 'white',
        borderBottom: '1px solid #e2e8f0',
        position: 'sticky',
        top: 0,
        zIndex: 10, paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))'}}>
        {[
          { key: 'pending', label: 'Pending', icon: 'pending' },
          { key: 'approved', label: 'Approved', icon: 'check_circle' },
          { key: 'rejected', label: 'Rejected', icon: 'cancel' },
        ].map(t => (
          <div
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '14px 0',
              fontWeight: '600',
              fontSize: '13px',
              color: tab === t.key ? '#0891b2' : '#64748b',
              borderBottom: tab === t.key ? '2px solid #0891b2' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'color 0.15s',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{t.icon}</span>
            {t.label}
          </div>
        ))}
      </div>

      {/* ── Content ── */}
      <div style={{ padding: '16px' }}>

        {loading ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '50vh',
            color: '#64748b',
            gap: '12px',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '40px', color: '#0891b2' }}>
              hourglass_top
            </span>
            <span>Loading leave requests…</span>
          </div>

        ) : displayed.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '40vh',
            color: '#94a3b8',
            gap: '12px',
            textAlign: 'center',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '52px', color: '#cbd5e1' }}>
              {tab === 'pending' ? 'event_available' : 'manage_history'}
            </span>
            <div style={{ fontWeight: '600', fontSize: '15px', color: '#64748b' }}>
              {tab === 'pending' ? 'No pending requests' : 'No history yet'}
            </div>
            <div style={{ fontSize: '13px' }}>
              {tab === 'pending'
                ? 'All leave requests have been handled.'
                : 'Approved and rejected requests will appear here.'}
            </div>
          </div>

        ) : (
          displayed.map(leave => {
            const col = statusColors[leave.status] || statusColors.Pending;
            const saving = actionId === leave.id;
            return (
              <div
                key={leave.id}
                style={{
                  background: 'white',
                  borderRadius: '14px',
                  marginBottom: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  borderLeft: `4px solid ${col.border}`,
                  overflow: 'hidden',
                  opacity: saving ? 0.7 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                <div style={{ padding: '16px' }}>
                  {/* Top row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                      <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '15px' }}>
                        {leave.staffName || leave.name || '—'}
                      </div>
                      <div style={{ color: '#64748b', fontSize: '12px', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>badge</span>
                        {leave.role || '—'}
                      </div>
                    </div>

                    {/* Status badge */}
                    <span style={{
                      fontSize: '11px',
                      fontWeight: '700',
                      padding: '3px 10px',
                      borderRadius: '20px',
                      backgroundColor: col.bg,
                      color: col.text,
                      letterSpacing: '0.3px',
                    }}>
                      {leave.status}
                    </span>
                  </div>

                  {/* Date range */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    color: '#475569',
                    marginBottom: '8px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    padding: '8px 10px',
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#0891b2' }}>calendar_month</span>
                    <span>{formatDate(leave.from)}</span>
                    <span style={{ color: '#94a3b8' }}>→</span>
                    <span>{formatDate(leave.to)}</span>
                  </div>

                  {/* Reason */}
                  <div style={{
                    fontSize: '13px',
                    color: '#475569',
                    marginBottom: leave.status === 'Pending' ? '14px' : '0',
                    lineHeight: '1.5',
                  }}>
                    <span style={{ fontWeight: '600', color: '#334155' }}>Reason: </span>
                    {leave.reason || '—'}
                  </div>

                  {/* Approve / Reject buttons — only for Pending */}
                  {leave.status === 'Pending' && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        disabled={saving}
                        onClick={() => updateStatus(leave.id, 'Approved')}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '10px 0',
                          backgroundColor: '#059669',
                          color: 'white',
                          border: 'none',
                          borderRadius: '10px',
                          fontWeight: '600',
                          fontSize: '13px',
                          cursor: saving ? 'not-allowed' : 'pointer',
                          transition: 'opacity 0.15s',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check_circle</span>
                        Approve
                      </button>
                      <button
                        disabled={saving}
                        onClick={() => updateStatus(leave.id, 'Rejected')}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '10px 0',
                          backgroundColor: 'white',
                          color: '#dc2626',
                          border: '1.5px solid #ef4444',
                          borderRadius: '10px',
                          fontWeight: '600',
                          fontSize: '13px',
                          cursor: saving ? 'not-allowed' : 'pointer',
                          transition: 'opacity 0.15s',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>cancel</span>
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
