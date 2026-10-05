import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export default function ManagerStaffView({ adminId, onBack, showToast }) {
  const [staffList, setStaffList] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Roster'); // 'Roster' | 'Tasks' | 'Attendance'
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Task form
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskPriority, setTaskPriority] = useState('Medium');

  const todayStr = new Date().toISOString().split('T')[0];

  // Real-time listener for staff_tokens, staff_tasks, staff_attendance
  useEffect(() => {
    if (!adminId) return;
    setLoading(true);

    const qStaff = query(collection(db, 'staff_tokens'), where('ownerUid', '==', adminId));
    const unsubStaff = onSnapshot(qStaff, (snap) => {
      setStaffList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error('Staff tokens fetch error:', err);
      setLoading(false);
    });

    const qTasks = query(collection(db, 'staff_tasks'), where('adminId', '==', adminId));
    const unsubTasks = onSnapshot(qTasks, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setTasks(list);
    }, (err) => {
      console.error('Staff tasks fetch error:', err);
    });

    const qAtt = query(collection(db, 'staff_attendance'), where('adminId', '==', adminId), where('date', '==', todayStr));
    const unsubAtt = onSnapshot(qAtt, (snap) => {
      setAttendance(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.error('Staff attendance fetch error:', err);
    });

    return () => {
      unsubStaff();
      unsubTasks();
      unsubAtt();
    };
  }, [adminId, todayStr]);

  // Aggregate counts
  const onDutyCount = useMemo(() => {
    return attendance.filter(a => a.status === 'working' || (a.clockIn && !a.clockOut)).length;
  }, [attendance]);

  const verifiedCount = useMemo(() => {
    return staffList.filter(s => s.policeVerification === 'verified').length;
  }, [staffList]);

  // Handle Assign Task
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!taskTitle.trim() || !taskAssignee) {
      showToast?.('Please provide task title and assignee', 'warning');
      return;
    }
    setActionLoading(true);
    try {
      const staffMember = staffList.find(s => s.id === taskAssignee);
      await addDoc(collection(db, 'staff_tasks'), {
        adminId,
        assignedTo: taskAssignee,
        staffName: staffMember?.name || 'Staff',
        staffRole: staffMember?.role || 'Staff',
        title: taskTitle.trim(),
        description: taskDesc.trim(),
        priority: taskPriority,
        status: 'Pending',
        createdAt: new Date().toISOString()
      });

      showToast?.(`Task assigned to ${staffMember?.name || 'Staff'}!`, 'success');
      setShowTaskModal(false);
      setTaskTitle('');
      setTaskDesc('');
      setTaskAssignee('');
    } catch (err) {
      console.error('Task create error:', err);
      showToast?.('Failed to create task', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle Police Verification
  const handleTogglePolice = async (staffMember) => {
    const nextStatus = staffMember.policeVerification === 'verified' ? 'unverified' : 'verified';
    try {
      await updateDoc(doc(db, 'staff_tokens', staffMember.id), {
        policeVerification: nextStatus
      });
      showToast?.(`${staffMember.name}: Police verification updated to ${nextStatus}`, 'success');
    } catch (err) {
      console.error('Error updating verification:', err);
      showToast?.('Failed to update police verification', 'error');
    }
  };

  return (
    <div style={{ padding: '0 0 calc(32px + env(safe-area-inset-bottom, 0px))', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '16px 16px', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={onBack} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#0f172a' }}>arrow_back</span>
            </button>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>Staff & Work</h2>
              <p style={{ margin: 0, fontSize: 11, color: '#64748b', fontWeight: 600 }}>Roster, Attendance & Tasks</p>
            </div>
          </div>
          <button
            onClick={() => setShowTaskModal(true)}
            style={{
              background: '#0891b2',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '8px 14px',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              boxShadow: '0 2px 6px rgba(8,145,178,0.25)'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>assignment_add</span>
            Assign
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 10 }}>
          <div style={{ background: '#f8fafc', borderRadius: 12, padding: '8px 10px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>{staffList.length}</p>
            <p style={{ margin: '2px 0 0', fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Total Staff</p>
          </div>
          <div style={{ background: '#ecfdf5', borderRadius: 12, padding: '8px 10px', textAlign: 'center', border: '1px solid #a7f3d0' }}>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#047857' }}>{onDutyCount}</p>
            <p style={{ margin: '2px 0 0', fontSize: 10, fontWeight: 800, color: '#047857', textTransform: 'uppercase' }}>On Duty</p>
          </div>
          <div style={{ background: '#ecfeff', borderRadius: 12, padding: '8px 10px', textAlign: 'center', border: '1px solid #cffafe' }}>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0891b2' }}>{verifiedCount}</p>
            <p style={{ margin: '2px 0 0', fontSize: 10, fontWeight: 800, color: '#0891b2', textTransform: 'uppercase' }}>Police Ver.</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { id: 'Roster', label: `Staff Roster (${staffList.length})` },
            { id: 'Tasks', label: `Tasks (${tasks.length})` },
            { id: 'Attendance', label: `Today's Punches (${attendance.length})` }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: 10,
                border: 'none',
                background: activeTab === t.id ? '#0f172a' : '#f1f5f9',
                color: activeTab === t.id ? '#fff' : '#475569',
                fontSize: 11.5,
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTop: '3px solid #0891b2', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Loading Staff Data...</p>
          </div>
        ) : activeTab === 'Roster' ? (
          staffList.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, margin: 20 }}>No staff members registered.</p>
          ) : (
            staffList.map(s => {
              const att = attendance.find(a => a.staffId === s.id || a.staffToken === s.id);
              const isOnDuty = att?.status === 'working' || (att?.clockIn && !att?.clockOut);
              const isVerified = s.policeVerification === 'verified';

              return (
                <div
                  key={s.id}
                  style={{
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 16,
                    padding: 14,
                    boxShadow: '0 3px 10px rgba(15,23,42,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 14, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#0891b2' }}>badge</span>
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: '#0f172a' }}>{s.name}</h4>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                          Role: <b>{s.role}</b> {s.department ? `· ${s.department}` : ''}
                        </p>
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: 8,
                        background: isOnDuty ? '#dcfce7' : '#f1f5f9',
                        color: isOnDuty ? '#166534' : '#64748b'
                      }}
                    >
                      {isOnDuty ? '🟢 On Duty' : '⚪ Off Duty'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid #f1f5f9' }}>
                    <button
                      onClick={() => handleTogglePolice(s)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 8,
                        border: 'none',
                        background: isVerified ? '#ecfeff' : '#fef9c3',
                        color: isVerified ? '#0891b2' : '#854d0e',
                        fontSize: 11,
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                        {isVerified ? 'verified' : 'pending'}
                      </span>
                      {isVerified ? 'Police Verified' : 'Unverified'}
                    </button>

                    {s.phone && (
                      <a
                        href={`tel:${s.phone}`}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 8,
                          background: '#ecfeff',
                          color: '#0891b2',
                          fontSize: 11.5,
                          fontWeight: 800,
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>call</span> Call ({s.phone})
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          )
        ) : activeTab === 'Tasks' ? (
          tasks.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, margin: 20 }}>No tasks assigned yet. Tap "Assign" to create one.</p>
          ) : (
            tasks.map(t => (
              <div
                key={t.id}
                style={{
                  background: '#fff',
                  border: `1px solid ${t.status === 'Completed' ? '#bbf7d0' : '#e2e8f0'}`,
                  borderRadius: 14,
                  padding: 14,
                  boxShadow: '0 3px 10px rgba(15,23,42,0.04)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 12
                }}
              >
                <div>
                  <h4 style={{ margin: 0, fontSize: 14.5, fontWeight: 900, color: t.status === 'Completed' ? '#15803d' : '#0f172a' }}>
                    {t.title}
                  </h4>
                  {t.description && <p style={{ margin: '4px 0', fontSize: 12, color: '#64748b' }}>{t.description}</p>}
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8' }}>
                    Assigned to: <b>{t.staffName}</b> ({t.staffRole || 'Staff'}) · {t.priority || 'Normal'}
                  </p>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: 8,
                    background: t.status === 'Completed' ? '#dcfce7' : '#fef3c7',
                    color: t.status === 'Completed' ? '#166534' : '#92400e',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {t.status || 'Pending'}
                </span>
              </div>
            ))
          )
        ) : (
          attendance.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, margin: 20 }}>No staff have clocked in today yet.</p>
          ) : (
            attendance.map(a => (
              <div
                key={a.id}
                style={{
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 14,
                  padding: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 900, color: '#0f172a' }}>
                    {a.staffName || a.name || 'Staff Member'}
                  </h4>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b' }}>
                    In: <b>{a.clockIn || '--'}</b> · Out: <b>{a.clockOut || 'Working now'}</b>
                  </p>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: 8,
                    background: a.clockOut ? '#f1f5f9' : '#dcfce7',
                    color: a.clockOut ? '#64748b' : '#166534'
                  }}
                >
                  {a.clockOut ? 'Clocked Out' : 'Active Duty'}
                </span>
              </div>
            ))
          )
        )}
      </div>

      {/* ── Assign Task Modal ── */}
      {showTaskModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <form onSubmit={handleCreateTask} style={{ background: '#fff', borderRadius: 20, padding: 20, width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: '#0f172a' }}>Assign New Task</h3>
              <button type="button" onClick={() => setShowTaskModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, width: 30, height: 30, cursor: 'pointer' }}>✕</button>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Assign To Staff *</label>
              <select
                required
                value={taskAssignee}
                onChange={e => setTaskAssignee(e.target.value)}
                style={{ width: '100%', marginTop: 4, padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700, background: '#fff' }}
              >
                <option value="">-- Choose Staff Member --</option>
                {staffList.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Task Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Deep clean Room 204, Fix Geyser"
                value={taskTitle}
                onChange={e => setTaskTitle(e.target.value)}
                style={{ width: '100%', marginTop: 4, padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Description / Instructions</label>
              <textarea
                rows={3}
                placeholder="Details of the job..."
                value={taskDesc}
                onChange={e => setTaskDesc(e.target.value)}
                style={{ width: '100%', marginTop: 4, padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 13, resize: 'none' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Priority</label>
              <select
                value={taskPriority}
                onChange={e => setTaskPriority(e.target.value)}
                style={{ width: '100%', marginTop: 4, padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700, background: '#fff' }}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High (Urgent)</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button type="button" onClick={() => setShowTaskModal(false)} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', fontWeight: 800, color: '#64748b', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={actionLoading} style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: '#0891b2', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
                {actionLoading ? 'Assigning...' : 'Assign Task'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
