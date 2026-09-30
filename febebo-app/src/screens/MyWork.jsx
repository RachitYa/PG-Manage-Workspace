import React, { useState } from 'react';
import { TopBar } from '../App';
import { Mail, Phone, Plus, Eye } from 'lucide-react';

const MyWork = () => {
  const [activeTab, setActiveTab] = useState('All');

  const tabs = [
    { id: 'All', label: 'All', count: 30 },
    { id: 'Follow Up', label: 'Follow Up', count: 1, color: 'text-warning' },
    { id: 'Complete', label: 'Complete', count: 1, color: 'text-success' },
    { id: 'Pending', label: 'Pending', count: 1, color: 'text-danger' },
  ];

  const tasks = [
    {
      id: 1,
      name: 'Ravi Kumar',
      date: '05/02/2025',
      phone: '+91-9123456765',
      email: 'ravi@kumargmail.com',
      status: 'Follow Up',
      desc: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry.'
    },
    {
      id: 2,
      name: 'Ravi Kumar',
      date: '05/02/2025',
      phone: '+91-9123456765',
      email: 'ravi@kumargmail.com',
      status: 'Complete',
      desc: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry.'
    }
  ];

  const filtered = tasks.filter(t => activeTab === 'All' || t.status === activeTab);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopBar title="My Work" />
      <div className="page-content">
        
        <div className="tabs-container" style={{ justifyContent: 'space-between' }}>
          {tabs.map(tab => (
            <div 
              key={tab.id}
              className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              style={{ flex: 1, minWidth: 'auto', padding: '10px 8px' }}
            >
              <div className="tab-title">{tab.label}</div>
              <div className={`tab-count ${activeTab !== tab.id && tab.color ? tab.color : ''}`}>
                {tab.count}
              </div>
            </div>
          ))}
        </div>

        <div>
          {filtered.map(task => (
            <div key={task.id} className="card">
              <div className="card-header" style={{ marginBottom: '12px' }}>
                <div className="card-title" style={{ fontSize: '18px' }}>{task.name}</div>
                <div className="card-subtitle" style={{ marginBottom: 0 }}>{task.date}</div>
              </div>
              
              <div className="info-row">
                <Mail className="info-icon" size={16} />
                <span>{task.email}</span>
              </div>
              <div className="info-row" style={{ marginBottom: '12px' }}>
                <Phone className="info-icon" size={16} />
                <span>{task.phone}</span>
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <div className={`badge ${
                  task.status === 'Follow Up' ? 'bg-warning-light' : 'bg-success-light'
                }`}>
                  {task.status}
                </div>
              </div>
              
              <div className="card-body" style={{ color: 'var(--text-muted)' }}>
                {task.desc}
              </div>
              
              <div className="card-footer">
                <button className="btn btn-primary"><Plus size={16}/> Add</button>
                <button className="btn btn-primary"><Eye size={16}/> View</button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default MyWork;
