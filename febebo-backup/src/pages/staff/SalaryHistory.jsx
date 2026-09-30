import React from 'react';
import TopBar from '../../components/TopBar';
import { Check } from 'lucide-react';
import './SalaryHistory.css';

const SalaryHistory = () => {
  const dummyHistory = [
    { id: 1, name: 'Mohammad Shamsher', role: 'Salary', date: '15/03/2025', amount: '10,000', status: 'Received' },
    { id: 2, name: 'Mohammad Shamsher', role: 'Salary', date: '03/03/2025', amount: '10,000', status: 'Received' },
    { id: 3, name: 'Mohammad Shamsher', role: 'Salary', date: '15/02/2025', amount: '20,000', status: 'Received' },
    { id: 4, name: 'Mohammad Shamsher', role: 'Salary', date: '03/01/2025', amount: '20,000', status: 'Received' },
    { id: 5, name: 'Mohammad Shamsher', role: 'Salary', date: '03/12/2024', amount: '20,000', status: 'Received' },
  ];

  return (
    <div className="app-container">
      <TopBar title="Salary History" />
      
      <div className="padding-16 page-content">
        <div className="salary-stats mb-16">
          <div className="card salary-card text-center" style={{ border: '1px solid var(--success-light)' }}>
            <div className="text-muted" style={{ fontSize: '12px', marginBottom: '8px' }}>Monthly Paid</div>
            <div className="text-success" style={{ fontSize: '20px', fontWeight: 'bold' }}>₹ 20,000</div>
          </div>
          <div className="card salary-card text-center" style={{ border: '1px solid var(--danger-light)' }}>
            <div className="text-muted" style={{ fontSize: '12px', marginBottom: '8px' }}>Monthly Pending</div>
            <div className="text-danger" style={{ fontSize: '20px', fontWeight: 'bold' }}>₹ 0</div>
          </div>
        </div>

        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Payment History</h3>
        
        <div className="history-list">
          {dummyHistory.map((item) => (
            <div key={item.id} className="history-item">
              <div className="history-icon bg-primary">
                <Check size={16} color="white" />
              </div>
              <div className="history-details">
                <div style={{ fontWeight: '600', fontSize: '14px' }}>{item.name}</div>
                <div className="text-muted" style={{ fontSize: '12px' }}>{item.role}, {item.date}</div>
              </div>
              <div className="history-amount">
                <div style={{ fontWeight: '600', fontSize: '14px' }}>₹ {item.amount}</div>
                <div className="text-success" style={{ fontSize: '12px' }}>{item.status}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SalaryHistory;
