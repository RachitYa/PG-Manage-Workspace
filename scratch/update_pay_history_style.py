import re

with open('Febebo-admin/src/pages/AdminDashboard.jsx', 'r') as f:
    content = f.read()

# Replace the payHistory mapping
old_style = r"""              <div style=\{\{ background: '#f8fafc', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' \}\}>
                \{duesSheet\.payHistory\.map\(\(ph, i\) => \{
                  const amtVal = typeof ph\.amount === 'number' \? ph\.amount : parseInt\(String\(ph\.amount\)\.replace\(/,/g, ''\)\) \|\| 0;
                  const rawDate = ph\.date \|\| '';
                  const displayDate = rawDate \? \(\(\) => \{ try \{ return new Date\(rawDate\?\.toDate \? rawDate\.toDate\(\) : rawDate\)\.toLocaleDateString\('en-GB', \{ day: 'numeric', month: 'short', year: 'numeric' \}\); \} catch \{ return rawDate; \} \}\)\(\) : '—';
                  return \(
                    <div key=\{i\} onClick=\{\(\) => setActiveReceipt\(\{
                      id: ph\.id,
                      tenantName: ph\.tenantName \|\| duesSheet\.name,
                      tenantId: ph\.tenantId \|\| duesSheet\.id,
                      room: ph\.roomNo \|\| duesSheet\.room,
                      month: ph\.month,
                      rentMonth: ph\.month,
                      datePaid: ph\.date,
                      paymentMode: ph\.mode,
                      receivedBy: ph\.receivedBy \|\| '',
                      senderUPI: ph\.senderUPI \|\| '',
                      receiverUPI: ph\.receiverUPI \|\| '',
                      transactionId: ph\.transactionId \|\| '',
                      note: ph\.note \|\| '',
                      items: ph\.items && ph\.items\.length > 0 \? ph\.items : \[\{ label: 'Room Rent', amount: amtVal \}\],
                      totalAmount: amtVal,
                      amountPaid: amtVal,
                      pendingAmount: ph\.pendingAmount \|\| 0,
                    \}\)\} style=\{\{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 16px', borderBottom: i < duesSheet\.payHistory\.length - 1 \? '1px solid #e2e8f0' : 'none', cursor: 'pointer' \}\}>
                      <div>
                        <p style=\{\{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 2px' \}\}>\{ph\.month\}</p>
                        <p style=\{\{ fontSize: 12, color: '#64748b', margin: 0 \}\}>\{ph\.date\} · \{ph\.mode\}</p>
                      </div>
                      <div style=\{\{ textAlign: 'right' \}\}>
                        <p style=\{\{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: '0 0 2px' \}\}>₹\{ph\.amount\}</p>
                        <span style=\{\{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: ph\.status === 'Paid' \? '#ecfdf5' : '#fffbeb', color: payStatusColor\(ph\.status\) \}\}>\{ph\.status\}</span>
                      </div>
                    </div>
                  \);
                \}\)\}
              </div>"""

new_style = r"""              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {duesSheet.payHistory.map((ph, i) => {
                  const amtVal = typeof ph.amount === 'number' ? ph.amount : parseInt(String(ph.amount).replace(/,/g, '')) || 0;
                  const rawDate = ph.date || '';
                  const displayDate = rawDate ? (() => { try { return new Date(rawDate?.toDate ? rawDate.toDate() : rawDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return rawDate; } })() : '—';
                  const isToken = ph.name?.toLowerCase().includes('token') || ph.paymentType === 'token';
                  return (
                    <div key={i} onClick={() => setActiveReceipt({
                      id: ph.id,
                      tenantName: ph.tenantName || duesSheet.name,
                      tenantId: ph.tenantId || duesSheet.id,
                      room: ph.roomNo || duesSheet.room,
                      month: ph.month,
                      rentMonth: ph.month,
                      datePaid: ph.date,
                      paymentMode: ph.mode,
                      receivedBy: ph.receivedBy || '',
                      senderUPI: ph.senderUPI || '',
                      receiverUPI: ph.receiverUPI || '',
                      transactionId: ph.transactionId || '',
                      note: ph.note || '',
                      items: ph.items && ph.items.length > 0 ? ph.items : [{ label: 'Room Rent', amount: amtVal }],
                      totalAmount: amtVal,
                      amountPaid: amtVal,
                      pendingAmount: ph.pendingAmount || 0,
                    })} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', padding: '12px 16px', borderRadius: 12, border: `1px solid ${isToken ? '#fef3c7' : '#e2e8f0'}`, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: isToken ? '#fef9c3' : '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                          {isToken ? '💰' : '💸'}
                        </div>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: '0 0 2px' }}>{ph.name || ph.month || 'Payment'}</p>
                          <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{displayDate}{ph.mode ? ` · ${ph.mode}` : ''}{ph.screenshot ? ' · 📸' : ''}</p>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>₹{Number(amtVal).toLocaleString()}</p>
                        <p style={{ fontSize: 11, color: ph.status === 'Paid' ? '#16a34a' : '#ef4444', fontWeight: 600, margin: 0 }}>
                          {ph.status === 'Paid' ? '✓ Paid' : ph.status}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>"""

content = re.sub(old_style, new_style, content)

with open('Febebo-admin/src/pages/AdminDashboard.jsx', 'w') as f:
    f.write(content)
