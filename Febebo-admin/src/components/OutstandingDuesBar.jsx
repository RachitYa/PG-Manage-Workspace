import React from 'react';
import { formatCurrency, getAggregateSeverity } from '../utils/duesUtils';

export default function OutstandingDuesBar({
  duesData,
  onClick,
  style = {}
}) {
  if (!duesData) return null;

  const total = duesData.totalOutstanding || 0;
  const count = duesData.items?.length || 0;
  const hasPayLater = duesData.payLaterRequestedCount > 0;
  const severity = getAggregateSeverity(duesData);

  // Complaint-matched color schemes:
  // 🔴 Red: Too long overdue (4+ days)
  // 🟠 Orange: Long time overdue (1-3 days)
  // ⚪ White: New / Due today / Upcoming
  // 🟢 Green: Settled / All Clear
  const STYLES = {
    critical: {
      bg: 'linear-gradient(135deg, #fff1f2, #ffe4e6)',
      border: '#fca5a5',
      iconBg: '#fee2e2',
      iconColor: '#dc2626',
      icon: 'error',
      titleColor: '#991b1b',
      subColor: '#881337',
      amtColor: '#dc2626',
      tagText: `${duesData.overdueCount} Overdue (Urgent)`,
      tagBg: '#fee2e2',
      tagColor: '#991b1b',
      shadow: '0 4px 14px rgba(220,38,38,0.1)'
    },
    warning: {
      bg: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
      border: '#fdba74',
      iconBg: '#ffedd5',
      iconColor: '#ea580c',
      icon: 'warning',
      titleColor: '#9a3412',
      subColor: '#78350f',
      amtColor: '#ea580c',
      tagText: `${duesData.overdueCount} Overdue`,
      tagBg: '#ffedd5',
      tagColor: '#9a3412',
      shadow: '0 4px 14px rgba(234,88,12,0.1)'
    },
    new: {
      bg: '#ffffff',
      border: '#e2e8f0',
      iconBg: '#f0f9ff',
      iconColor: '#0284c7',
      icon: 'receipt_long',
      titleColor: '#0369a1',
      subColor: '#64748b',
      amtColor: '#0f172a',
      tagText: 'New / Current',
      tagBg: '#f1f5f9',
      tagColor: '#475569',
      shadow: '0 2px 8px rgba(0,0,0,0.04)'
    },
    settled: {
      bg: '#f0fdf4',
      border: '#86efac',
      iconBg: '#dcfce7',
      iconColor: '#16a34a',
      icon: 'check_circle',
      titleColor: '#15803d',
      subColor: '#14532d',
      amtColor: '#16a34a',
      tagText: 'All Settled',
      tagBg: '#dcfce7',
      tagColor: '#166534',
      shadow: '0 2px 6px rgba(16,185,129,0.06)'
    }
  };

  const currentTheme = STYLES[severity] || STYLES.new;

  return (
    <div
      onClick={onClick}
      style={{
        background: currentTheme.bg,
        border: `1.5px solid ${currentTheme.border}`,
        borderRadius: 16,
        padding: '14px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: 'pointer',
        boxShadow: currentTheme.shadow,
        transition: 'transform 0.15s, box-shadow 0.15s',
        ...style
      }}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          background: currentTheme.iconBg,
          color: currentTheme.iconColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 24 }}>
            {currentTheme.icon}
          </span>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: currentTheme.titleColor, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Outstanding Dues
            </span>
            <span style={{ fontSize: 10, fontWeight: 800, background: currentTheme.tagBg, color: currentTheme.tagColor, padding: '1px 6px', borderRadius: 6 }}>
              {currentTheme.tagText}
            </span>
            {hasPayLater && (
              <span style={{ fontSize: 10, fontWeight: 800, background: '#fef3c7', color: '#b45309', padding: '1px 6px', borderRadius: 6, border: '1px solid #fde68a' }}>
                ⏳ Pay Later Req
              </span>
            )}
          </div>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: currentTheme.subColor, fontWeight: 600 }}>
            {total > 0 ? `${count} Unpaid Bill${count !== 1 ? 's' : ''} (Tap to view)` : 'All bills settled'}
          </p>
        </div>
      </div>

      <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: currentTheme.amtColor }}>
            {formatCurrency(total)}
          </p>
        </div>
        <span className="material-symbols-outlined" style={{ fontSize: 20, color: currentTheme.iconColor }}>
          chevron_right
        </span>
      </div>
    </div>
  );
}
