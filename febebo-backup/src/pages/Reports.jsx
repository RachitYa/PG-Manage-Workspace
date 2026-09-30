import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileText, PieChart, TrendingUp } from 'lucide-react';

export default function Reports() {
  const navigate = useNavigate();

  const REPORT_TYPES = [
    { title: 'Inventory Report', icon: <FileText size={20} />, desc: 'Weekly, Monthly, Yearly inventory tracking' },
    { title: 'Payment Report', icon: <TrendingUp size={20} />, desc: 'Total revenue and pending dues' },
    { title: 'Staff Attendance', icon: <PieChart size={20} />, desc: 'Aggregated attendance and salary payouts' },
    { title: 'Expenses Report', icon: <TrendingUp size={20} style={{ transform: 'scaleY(-1)' }} />, desc: 'Vendor payouts, lease, and overheads' },
  ];

  return (
    <div className="app-container">
      <div className="top-nav">
        <div className="flex items-center gap-4">
          <button className="icon-btn" onClick={() => navigate('/admin-dashboard')}>
            <ArrowLeft size={24} />
          </button>
          <div className="nav-title">Reports & Analytics</div>
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        <h3 className="mb-4">Generate Reports</h3>
        
        {REPORT_TYPES.map((report, idx) => (
          <div key={idx} className="card flex justify-between items-center" style={{ padding: '20px 16px' }}>
            <div className="flex items-center gap-4">
              <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: 'var(--radius-md)', 
                backgroundColor: 'rgba(14, 165, 233, 0.1)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'var(--primary)'
              }}>
                {report.icon}
              </div>
              <div>
                <div style={{ fontWeight: '600' }}>{report.title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{report.desc}</div>
              </div>
            </div>
            <button className="icon-btn" style={{ color: 'var(--primary)' }}>
              <Download size={20} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
