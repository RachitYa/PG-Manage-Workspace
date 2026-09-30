import React from 'react';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import { Phone, Mail, ChevronDown } from 'lucide-react';

const Help = () => {
  return (
    <div className="app-container bg-white page-content">
      <TopBar title="Help" />
      
      <div className="padding-16 text-center" style={{ paddingTop: '40px' }}>
        <div style={{ width: '120px', height: '120px', backgroundColor: 'var(--primary-light)', borderRadius: '50%', margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <HeadphonesIcon size={64} className="text-primary" />
        </div>
        
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--primary)', marginBottom: '40px' }}>
          Hello, How can we<br/>Help you?
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="icon-wrapper" style={{ border: '1px solid var(--primary)', borderRadius: '50%', padding: '6px', color: 'var(--primary)' }}>
                <Phone size={18} />
              </div>
              <span className="font-semibold">Contact us</span>
            </div>
            <ChevronDown size={20} className="text-muted" />
          </div>

          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="icon-wrapper" style={{ border: '1px solid var(--primary)', borderRadius: '50%', padding: '6px', color: 'var(--primary)' }}>
                <Mail size={18} />
              </div>
              <span className="font-semibold">Sent us an E-mail</span>
            </div>
            <ChevronDown size={20} className="text-muted" />
          </div>
        </div>
      </div>

      <BottomNav activeNav="help" />
    </div>
  );
};

// Dummy icon for illustration matching screenshot
const HeadphonesIcon = ({ size, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>
  </svg>
);

export default Help;
