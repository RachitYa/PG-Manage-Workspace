import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/TopBar';

const ApplyLeave = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fromDate: '',
    toDate: '',
    description: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('Leave application submitted!');
    navigate('/');
  };

  return (
    <div className="app-container">
      <TopBar title="Apply Leave" />
      
      <div className="padding-16 page-content" style={{ padding: '24px 20px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>Leave Application Form</h2>
          <p className="text-muted" style={{ fontSize: '14px' }}>Please provide information about your leave.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">From Date</label>
            <input 
              type="date" 
              className="form-control" 
              value={formData.fromDate}
              onChange={(e) => setFormData({...formData, fromDate: e.target.value})}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">To Date</label>
            <input 
              type="date" 
              className="form-control" 
              value={formData.toDate}
              onChange={(e) => setFormData({...formData, toDate: e.target.value})}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">Description</label>
            <textarea 
              className="form-control" 
              placeholder="Enter reason for leave..."
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              required
            ></textarea>
          </div>

          <div style={{ marginTop: '32px' }}>
            <button type="submit" className="btn-primary">Apply</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApplyLeave;
