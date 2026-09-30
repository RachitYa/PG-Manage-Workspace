import React from 'react';
import TopBar from '../../components/TopBar';

const SalesInventory = () => {
  return (
    <div className="app-container">
      <TopBar title="PG Inventory" />
      <div className="padding-16 page-content">
        <h3 className="font-semibold mb-16">Available Beds</h3>
        
        <div className="card mb-16" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="font-bold">Room 101</div>
            <div className="text-muted" style={{ fontSize: '12px' }}>Double Sharing (1 Vacant)</div>
          </div>
          <div className="text-success font-bold">₹ 7,500</div>
        </div>

        <div className="card mb-16" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="font-bold">Room 205</div>
            <div className="text-muted" style={{ fontSize: '12px' }}>Single Room (1 Vacant)</div>
          </div>
          <div className="text-success font-bold">₹ 12,000</div>
        </div>

      </div>
    </div>
  );
};

export default SalesInventory;
