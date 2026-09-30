import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, CreditCard, MessageSquare, Package, FileText, CheckCircle, Clock } from 'lucide-react';

export default function CustomerDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [paymentDone, setPaymentDone] = useState(false);
  const [complaintSent, setComplaintSent] = useState(false);

  return (
    <div className="app-container">
      <div className="top-nav">
        <div className="flex items-center gap-4">
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--success)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
            R
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Welcome Resident</div>
            <div style={{ fontWeight: '600' }}>Rahul Rastogi</div>
          </div>
        </div>
        <button className="icon-btn" onClick={logout}><LogOut size={20} /></button>
      </div>

      <div style={{ padding: '16px' }}>

        {/* Room Info Card */}
        <div className="card" style={{ background: 'linear-gradient(135deg, var(--primary), #0284c7)', color: 'white', marginBottom: '16px' }}>
          <div className="flex justify-between items-start">
            <div>
              <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>Your Room</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '4px 0' }}>Room 103, Bed 1</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Double Sharing · 2nd Floor</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Monthly Rent</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>₹ 6,500</div>
            </div>
          </div>
        </div>

        {/* Due Rent */}
        {!paymentDone ? (
          <div className="card flex justify-between items-center" style={{ borderLeft: '4px solid var(--danger)' }}>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Rent Due</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--danger)', margin: '4px 0' }}>₹ 15,000</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={12} /> Due Date: 10 Feb 2025
              </div>
            </div>
            <button className="btn-primary" style={{ width: 'auto', padding: '10px 20px' }} onClick={() => { setPaymentDone(true); alert('Payment of ₹15,000 recorded! (Demo mode)'); }}>
              Pay Now
            </button>
          </div>
        ) : (
          <div className="card flex items-center gap-3" style={{ borderLeft: '4px solid var(--success)' }}>
            <CheckCircle size={24} style={{ color: 'var(--success)' }} />
            <div>
              <div style={{ fontWeight: '600' }}>Rent Paid!</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>₹15,000 received successfully</div>
            </div>
          </div>
        )}

        <h3 style={{ margin: '24px 0 16px' }}>Services</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {[
            {
              label: complaintSent ? 'Complaint Sent ✓' : 'Raise Complaint',
              icon: <MessageSquare size={24} />,
              color: complaintSent ? 'var(--success)' : 'var(--primary)',
              action: () => { if (!complaintSent) { setComplaintSent(true); alert('Complaint submitted! Admin will contact you.'); } }
            },
            {
              label: 'Payment History',
              icon: <CreditCard size={24} />,
              color: 'var(--primary)',
              action: () => alert('Payment History:\n\n✓ Feb 2025 – ₹6,500 (Paid)\n✓ Jan 2025 – ₹6,500 (Paid)\n✓ Dec 2024 – ₹6,500 (Paid)')
            },
            {
              label: 'Inventory',
              icon: <Package size={24} />,
              color: 'var(--primary)',
              action: () => navigate('/inventory')
            },
            {
              label: 'Request Box',
              icon: <FileText size={24} />,
              color: 'var(--primary)',
              action: () => alert('Request submitted! Admin will action it shortly.')
            },
          ].map((svc, i) => (
            <div key={i} className="card text-center" style={{ padding: '20px 12px', cursor: 'pointer' }} onClick={svc.action}>
              <div style={{ color: svc.color, display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>{svc.icon}</div>
              <div style={{ fontWeight: '500', fontSize: '0.875rem', color: svc.color }}>{svc.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
