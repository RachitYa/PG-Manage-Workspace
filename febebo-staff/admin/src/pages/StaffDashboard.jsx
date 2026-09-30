import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Clock, CheckCircle, AlertCircle, ClipboardList } from 'lucide-react';

const MOCK_TASKS = [
  { id: 1, title: 'Fix Washing Machine', location: 'Room 101', status: 'pending' },
  { id: 2, title: 'Cleaning Check', location: '2nd Floor', status: 'done' },
  { id: 3, title: 'Replace Bulb', location: 'Common Area', status: 'pending' },
];

export default function StaffDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState(MOCK_TASKS);

  const toggle = (id) => setTasks(prev => prev.map(t => t.id === id ? { ...t, status: t.status === 'done' ? 'pending' : 'done' } : t));

  return (
    <div className="app-container">
      <div className="top-nav">
        <div className="flex items-center gap-4">
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--warning)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
            S
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Welcome</div>
            <div style={{ fontWeight: '600' }}>Staff Member</div>
          </div>
        </div>
        <button className="icon-btn" onClick={logout}>
          <LogOut size={20} />
        </button>
      </div>

      <div style={{ padding: '16px' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          <div className="card text-center" style={{ padding: '16px', marginBottom: 0, borderLeft: '4px solid var(--warning)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--warning)' }}>{tasks.filter(t => t.status === 'pending').length}</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Pending</div>
          </div>
          <div className="card text-center" style={{ padding: '16px', marginBottom: 0, borderLeft: '4px solid var(--success)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success)' }}>{tasks.filter(t => t.status === 'done').length}</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Completed</div>
          </div>
        </div>

        <h3 className="mb-4">My Work Today</h3>
        {tasks.map(task => (
          <div key={task.id} className="card flex justify-between items-center" style={{ borderLeft: `4px solid ${task.status === 'done' ? 'var(--success)' : 'var(--warning)'}` }}>
            <div>
              <div style={{ fontWeight: '600', marginBottom: '4px', textDecoration: task.status === 'done' ? 'line-through' : 'none', color: task.status === 'done' ? 'var(--text-muted)' : 'inherit' }}>
                {task.title}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {task.status === 'done' ? <CheckCircle size={14} /> : <Clock size={14} />} {task.location}
              </div>
            </div>
            <button
              onClick={() => toggle(task.id)}
              style={{
                padding: '6px 12px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '500',
                backgroundColor: task.status === 'done' ? 'rgba(16,185,129,0.1)' : 'rgba(14,165,233,0.1)',
                color: task.status === 'done' ? 'var(--success)' : 'var(--primary)'
              }}
            >
              {task.status === 'done' ? '✓ Done' : 'Mark Done'}
            </button>
          </div>
        ))}

        <h3 style={{ marginTop: '24px', marginBottom: '16px' }}>Quick Access</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="card text-center" style={{ cursor: 'pointer', padding: '16px' }} onClick={() => navigate('/staff-work')}>
            <ClipboardList size={24} style={{ color: 'var(--primary)', margin: '0 auto 8px' }} />
            <div style={{ fontWeight: '500', fontSize: '0.875rem' }}>My Tasks</div>
          </div>
          <div className="card text-center" style={{ cursor: 'pointer', padding: '16px' }} onClick={() => navigate('/leave')}>
            <AlertCircle size={24} style={{ color: 'var(--warning)', margin: '0 auto 8px' }} />
            <div style={{ fontWeight: '500', fontSize: '0.875rem' }}>Apply Leave</div>
          </div>
        </div>
      </div>
    </div>
  );
}
