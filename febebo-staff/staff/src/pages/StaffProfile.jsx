import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// ─── Header ─────────────────────────────────────────────────────────
function Header({ onBack }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', background: '#0891b2', position: 'sticky', top: 0, zIndex: 50 }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', color: 'white', position: 'relative', zIndex: 10 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 24, fontWeight: 300 }}>arrow_back_ios_new</span>
      </button>
      <h1 style={{ flex: 1, textAlign: 'center', margin: '0 0 0 -24px', fontSize: 18, fontWeight: 700, color: 'white' }}>Staff Details</h1>
      <div style={{ position: 'relative', zIndex: 10, background: 'white', color: '#0891b2', padding: '4px 10px', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700, fontSize: 13 }}>
        4.3 <span className="material-symbols-outlined" style={{ fontSize: 14 }}>star</span>
      </div>
    </div>
  );
}

// ─── Accordion ───────────────────────────────────────────────────────
function Accordion({ icon, title, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, marginBottom: 12, overflow: 'hidden' }}>
      <div onClick={() => setIsOpen(!isOpen)} style={{ display: 'flex', alignItems: 'center', padding: '16px', cursor: 'pointer', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: '50%', background: '#ecfeff', color: '#0891b2' }}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <p style={{ flex: 1, margin: 0, fontWeight: 600, fontSize: 15, color: '#0f172a' }}>{title}</p>
        <span className="material-symbols-outlined" style={{ color: '#0891b2', transition: 'transform 0.3s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          arrow_drop_down
        </span>
      </div>
      {isOpen && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px dashed #e2e8f0', paddingTop: 16 }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Info Row ────────────────────────────────────────────────────────
function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '120px 10px 1fr', marginBottom: 12, fontSize: 14 }}>
      <span style={{ color: '#475569' }}>{label}</span>
      <span style={{ color: '#94a3b8' }}>:</span>
      <span style={{ color: '#0891b2', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────
export default function StaffProfile() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('home');

  const staff = location.state?.staff || {
    name: 'Sachin Kumar',
    empId: '#1234567',
    role: 'House Keeping',
    email: 'sachin@gmail.com',
    phone: '+91 9234567681',
    img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&h=150&fit=crop'
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Hanken Grotesk',sans-serif", paddingBottom: 80 }}>

      <Header onBack={() => navigate(-1)} />

      <div style={{ padding: '16px' }}>
        {/* Top Profile Card */}
        <div style={{ background: 'white', borderRadius: 16, padding: '16px', display: 'flex', gap: 16, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', marginBottom: 20 }}>
          <img src={staff.img} alt={staff.name} style={{ width: 110, height: 130, borderRadius: 12, objectFit: 'cover' }} />
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
            <p style={{ fontWeight: 700, fontSize: 18, color: '#0f172a', margin: '0 0 4px' }}>{staff.name}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#38bdf8' }}>badge</span> {staff.empId}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#38bdf8' }}>person</span> {staff.role}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#38bdf8' }}>mail</span> {staff.email || 'sachin@gmail.com'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#38bdf8' }}>call</span> {staff.phone}
            </div>
          </div>
        </div>

        {/* Personal Details */}
        <Accordion icon="person" title="Personal Details">
          <InfoRow label="Full Name" value="Sachin Kumar" />
          <InfoRow label="Date of Birth" value="14 March 1995" />
          <InfoRow label="Gender" value="Male" />
          <InfoRow label="Blood Group" value="B+" />
          <InfoRow label="Aadhar No." value="XXXX XXXX 4523" />
          <InfoRow label="PAN No." value="ABCDE1234F" />
          <InfoRow label="Marital Status" value="Single" />
          <InfoRow label="Permanent Address" value="H.No 45, Govindpuri, New Delhi – 110019" />
          <InfoRow label="Corresponding Address" value="Flat 3B, Kailash Colony, New Delhi – 110048" />
        </Accordion>

        {/* Parents Details */}
        <Accordion icon="diversity_3" title="Parents Details">
          <InfoRow label="Father's Name" value="Ram Kumar" />
          <InfoRow label="Father's Phone" value="+91 9812345670" />
          <InfoRow label="Mother's Name" value="Sunita Devi" />
          <InfoRow label="Mother's Phone" value="+91 9812345671" />
          <InfoRow label="Father's Occupation" value="Farmer" />
          <InfoRow label="Home Address" value="Village Rampur, Dist. Saharanpur, UP – 247001" />
        </Accordion>

        {/* Relative Details */}
        <Accordion icon="family_restroom" title="Relative Details">
          <InfoRow label="Name" value="Anil Kumar" />
          <InfoRow label="Number" value="+91 9876543232" />
          <InfoRow label="Relation" value="Brother" />
          <InfoRow label="Address" value="New Ashok Nagar, Delhi" />
        </Accordion>

        {/* Work Experience */}
        <Accordion icon="work" title="Work Experience">
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontWeight: 700, color: '#0f172a', fontSize: 14, margin: '0 0 8px' }}>Hotel Sunrise — Housekeeper</p>
            <InfoRow label="Duration" value="Jan 2020 – Mar 2022" />
            <InfoRow label="Location" value="Saket, New Delhi" />
            <InfoRow label="Responsibilities" value="Room cleaning, laundry, floor maintenance" />
          </div>
          <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: 14 }}>
            <p style={{ fontWeight: 700, color: '#0f172a', fontSize: 14, margin: '0 0 8px' }}>PG Nest Residency — Caretaker</p>
            <InfoRow label="Duration" value="Apr 2022 – Present" />
            <InfoRow label="Location" value="Lajpat Nagar, New Delhi" />
            <InfoRow label="Responsibilities" value="Guest assistance, facility management, daily chores" />
          </div>
        </Accordion>

        {/* Password */}
        <Accordion icon="lock" title="Password" />

        {/* Police Verification */}
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, marginBottom: 12, display: 'flex', alignItems: 'center', padding: '16px', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: '50%', background: '#ecfeff', color: '#0891b2' }}>
            <span className="material-symbols-outlined">local_police</span>
          </div>
          <p style={{ flex: 1, margin: 0, fontWeight: 600, fontSize: 15, color: '#0f172a' }}>Police Verification</p>
          <div style={{ background: '#dcfce7', color: '#16a34a', padding: '4px 12px', borderRadius: 16, fontSize: 12, fontWeight: 700 }}>
            Verified
          </div>
        </div>

        {/* Document Section */}
        <div style={{ marginTop: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>Document</p>
            <div style={{ background: '#dcfce7', color: '#16a34a', padding: '4px 12px', borderRadius: 16, fontSize: 12, fontWeight: 700 }}>
              Verified
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
            <div style={{ flexShrink: 0, width: 200, height: 125, background: '#f1f5f9', borderRadius: 12, border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 36, color: '#94a3b8' }}>id_card</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Aadhaar Card</span>
              <span style={{ fontSize: 10, color: '#94a3b8' }}>XXXX XXXX 4523</span>
            </div>
            <div style={{ flexShrink: 0, width: 200, height: 125, background: '#f1f5f9', borderRadius: 12, border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 36, color: '#94a3b8' }}>credit_card</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>PAN Card</span>
              <span style={{ fontSize: 10, color: '#94a3b8' }}>ABCDE1234F</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Nav — same as dashboard */}
      <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '8px 0 20px', zIndex: 50 }}>
        {[
          { tab: 'home',    icon: 'home',            label: 'Dashboard', path: '/admin-dashboard' },
          { tab: 'pending', icon: 'pending_actions', label: 'Pending',   path: '/staff-work' },
          { tab: 'review',  icon: 'rate_review',     label: 'Review',    path: '/complain' },
          { tab: 'profile', icon: 'person',          label: 'Profile',   path: null },
        ].map(item => (
          <div key={item.tab} onClick={() => { setActiveTab(item.tab); if (item.path) navigate(item.path); }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '4px 16px', cursor: 'pointer', color: activeTab === item.tab ? '#0891b2' : '#94a3b8', transition: 'color 0.2s' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 24, fontVariationSettings: activeTab === item.tab ? "'FILL' 1" : "'FILL' 0" }}>
              {item.icon}
            </span>
            <span style={{ fontSize: 10, fontWeight: activeTab === item.tab ? 700 : 500 }}>{item.label}</span>
          </div>
        ))}
      </nav>
    </div>
  );
}
