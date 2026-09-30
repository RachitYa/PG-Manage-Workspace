import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { TimelineView, CookView, CleanerView, TicketView, PurchaseManagerView } from './StaffWork';

export default function StaffWorkDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const staff = location.state?.staff || { name: 'Unknown', role: 'Helper', id: '1' };

  const role = staff.role.toLowerCase();
  let cat = 'A';
  if (role === 'purchase manager') cat = 'D';
  else if (role === 'cook') cat = 'B_cook';
  else if (role === 'cleaner') cat = 'B_clean';
  else if (['plumber', 'electrician', 'carpenter', 'ro waterboy'].includes(role)) cat = 'C';

  const commonProps = {
    staffId: staff.id.toString(),
    staffName: staff.name,
    role: staff.role,
    onBack: () => navigate('/manage-staff', { state: { mainMenu: 'work' } }),
  };

  if (cat === 'A') return <TimelineView {...commonProps} />;
  if (cat === 'B_cook') return <CookView {...commonProps} />;
  if (cat === 'B_clean') return <CleanerView {...commonProps} />;
  if (cat === 'C') return <TicketView {...commonProps} />;
  if (cat === 'D') return <PurchaseManagerView {...commonProps} />;

  return null;
}
