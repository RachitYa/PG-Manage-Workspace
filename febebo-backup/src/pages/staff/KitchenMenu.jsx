import React from 'react';
import TopBar from '../../components/TopBar';

const KitchenMenu = () => {
  return (
    <div className="app-container">
      <TopBar title="Kitchen Food Menu" />
      <div className="padding-16 page-content">
        <h3 className="font-semibold mb-16">Today's Menu</h3>
        <div className="card mb-16">
          <div className="font-bold text-primary mb-8">Breakfast (8:00 AM - 10:00 AM)</div>
          <p className="text-muted">Aloo Paratha, Curd, Tea</p>
        </div>
        <div className="card mb-16">
          <div className="font-bold text-primary mb-8">Lunch (1:00 PM - 3:00 PM)</div>
          <p className="text-muted">Rajma Chawal, Roti, Salad</p>
        </div>
        <div className="card mb-16">
          <div className="font-bold text-primary mb-8">Dinner (8:00 PM - 10:00 PM)</div>
          <p className="text-muted">Paneer Butter Masala, Roti, Dal</p>
        </div>
      </div>
    </div>
  );
};

export default KitchenMenu;
