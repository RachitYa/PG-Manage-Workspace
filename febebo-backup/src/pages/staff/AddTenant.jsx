import React from 'react';
import TopBar from '../../components/TopBar';

const AddTenant = () => {
  return (
    <div className="app-container bg-white page-content">
      <TopBar title="Add Tenant" />
      <div className="padding-16">
        <div className="input-group">
          <label className="input-label">Tenant Name</label>
          <input type="text" className="form-control" placeholder="Enter name" />
        </div>
        <div className="input-group">
          <label className="input-label">Mobile Number</label>
          <input type="tel" className="form-control" placeholder="+91" />
        </div>
        <div className="input-group">
          <label className="input-label">Room Allocated</label>
          <select className="form-control">
            <option>Select Room</option>
            <option>Room 101 - Bed 1</option>
            <option>Room 205 - Bed 1</option>
          </select>
        </div>
        <button className="btn-primary" style={{ marginTop: '24px' }}>Register Tenant</button>
      </div>
    </div>
  );
};

export default AddTenant;
