import re

with open('Febebo-admin/src/pages/VendorTransactions.jsx', 'r') as f:
    content = f.read()

# Replace the 2-column stats with 3-column stats
old_stats = r"""          {/\* Overall totals \*/}
          <div style=\{\{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 \}\}\>
            <div style=\{\{ background: 'white', border: '1\.5px solid #0891b2', borderRadius: 12, padding: '14px 16px' \}\}\>
              <p style=\{\{ fontSize: 12, fontWeight: 600, color: '#0891b2', margin: '0 0 4px' \}\}\>Total Amount</p>
              <p style=\{\{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 \}\}\>₹ \{total\.toLocaleString\('en-IN'\)\}</p>
            \</div\>
            <div style=\{\{ background: totalPending > 0 \? '#fef2f2' : '#f0fdf4', border: `1\.5px solid \$\{totalPending > 0 \? '#fecaca' : '#bbf7d0'\}`, borderRadius: 12, padding: '14px 16px' \}\}\>
              <p style=\{\{ fontSize: 12, fontWeight: 600, color: totalPending > 0 \? '#ef4444' : '#16a34a', margin: '0 0 4px' \}\}\>Total Pending</p>
              <p style=\{\{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 \}\}\>₹ \{totalPending\.toLocaleString\('en-IN'\)\}</p>
            \</div\>
          \</div\>"""

new_stats = r"""          {/* Overall totals */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
            <div style={{ background: 'white', border: '1.5px solid #0891b2', borderRadius: 12, padding: '14px 10px', textAlign: 'center' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#0891b2', margin: '0 0 4px', textTransform: 'uppercase' }}>Purchase</p>
              <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0 }}>₹ {total.toLocaleString('en-IN')}</p>
            </div>
            <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 12, padding: '14px 10px', textAlign: 'center' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', margin: '0 0 4px', textTransform: 'uppercase' }}>Paid</p>
              <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 15, fontWeight: 800, color: '#16a34a', margin: 0 }}>₹ {totalPaidAmount.toLocaleString('en-IN')}</p>
            </div>
            <div style={{ background: totalPending > 0 ? '#fef2f2' : '#f8fafc', border: `1.5px solid ${totalPending > 0 ? '#fecaca' : '#e2e8f0'}`, borderRadius: 12, padding: '14px 10px', textAlign: 'center' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: totalPending > 0 ? '#ef4444' : '#64748b', margin: '0 0 4px', textTransform: 'uppercase' }}>Pending</p>
              <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 15, fontWeight: 800, color: totalPending > 0 ? '#ef4444' : '#64748b', margin: 0 }}>₹ {totalPending.toLocaleString('en-IN')}</p>
            </div>
          </div>"""
content = re.sub(old_stats, new_stats, content)

# Fix monthlyList map (row.pending > 0 -> row.paid > 0 or whatever)
# Let's just remove the pending row from monthly list entirely, as it's globally calculated now.
old_month_list = r"""                    <div>
                      <span style=\{\{ fontSize: 14, color: '#1e293b', fontWeight: 600 \}\}\>\{row\.month\}</span>
                      \{row\.pending > 0 && \(
                        <p style=\{\{ fontSize: 12, color: '#ef4444', fontWeight: 600, margin: '2px 0 0' \}\}\>Pending: ₹\{row\.pending\.toLocaleString\('en-IN'\)\}</p>
                      \)\}
                    \</div\>
                  \</div\>
                  <div style=\{\{ display: 'flex', alignItems: 'center', gap: 10 \}\}\>
                    <div style=\{\{ textAlign: 'right' \}\}\>
                      <span style=\{\{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 14, fontWeight: 700, color: '#0f172a', display: 'block' \}\}\>₹ \{row\.amount\.toLocaleString\('en-IN'\)\}</span>
                    \</div\>
                    <span className="material-symbols-outlined" style=\{\{ color: '#cbd5e1', fontSize: 18 \}\}\>chevron_right\</span\>
                  \</div\>
                \</div\>
                \{/\* Clear pending inline button for yearly view \*/}
                \{row\.pending > 0 && \(
                  <button onClick=\{\(\) => setPendingModal\(\{ vendor: selectedVendor, month: row\.month \}\)\}
                    style=\{\{ width: 'calc\(100% - 32px\)', margin: '0 16px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontFamily: 'inherit' \}\}\>
                    <span style=\{\{ fontSize: 12, color: '#ef4444', fontWeight: 700 \}\}\>Clear pending for \{row\.month\}</span>
                    <span className="material-symbols-outlined" style=\{\{ color: '#ef4444', fontSize: 16 \}\}\>arrow_forward\</span\>
                  \</button\>
                \)\}"""

new_month_list = r"""                    <div>
                      <span style={{ fontSize: 14, color: '#1e293b', fontWeight: 600 }}>{row.month}</span>
                      <p style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, margin: '2px 0 0' }}>Paid: ₹{row.paid.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 14, fontWeight: 700, color: '#0f172a', display: 'block' }}>₹ {row.amount.toLocaleString('en-IN')}</span>
                    </div>
                    <span className="material-symbols-outlined" style={{ color: '#cbd5e1', fontSize: 18 }}>chevron_right</span>
                  </div>
                </div>"""
content = re.sub(old_month_list, new_month_list, content)

# Now, we also need to fix `monthPending` in Detail View 2 (the day list)
# since `monthPending` is no longer computed. 
# We should just show the GLOBAL pending banner there, or just remove the pending banner from the monthly drill-down since it's global now!
old_month_banner = r"""          {/\* Pending banner \*/}
          \{monthPending > 0 && \(
            <button onClick=\{\(\) => setPendingModal\(\{ vendor: selectedVendor, month: selectedMonth \}\)\}
              style=\{\{ width: '100%', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, cursor: 'pointer', fontFamily: 'inherit' \}\}\>
              <div style=\{\{ display: 'flex', alignItems: 'center', gap: 8 \}\}\>
                <span className="material-symbols-outlined" style=\{\{ color: '#ef4444', fontSize: 20 \}\}\>warning\</span\>
                <span style=\{\{ fontSize: 13, color: '#ef4444', fontWeight: 700 \}\}\>Pending Amount — Tap to Clear\</span\>
              \</div\>
              <span style=\{\{ fontSize: 15, fontWeight: 800, color: '#ef4444' \}\}\>₹ \{monthPending\.toLocaleString\('en-IN'\)\}\</span\>
            \</button\>
          \)\}"""

# Since pending is now global, if runningPending > 0, we can show a global banner instead.
new_month_banner = r"""          {/* Global Pending banner */}
          {totalPending > 0 && (
            <button onClick={() => setPendingModal({ vendor: selectedVendor, month: selectedMonth })}
              style={{ width: '100%', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, cursor: 'pointer', fontFamily: 'inherit' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-symbols-outlined" style={{ color: '#ef4444', fontSize: 20 }}>warning</span>
                <span style={{ fontSize: 13, color: '#ef4444', fontWeight: 700 }}>Total Pending — Tap to Clear</span>
              </div>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#ef4444' }}>₹ {totalPending.toLocaleString('en-IN')}</span>
            </button>
          )}"""
content = re.sub(old_month_banner, new_month_banner, content)

with open('Febebo-admin/src/pages/VendorTransactions.jsx', 'w') as f:
    f.write(content)

