import re

with open('Febebo-admin/src/pages/RequestBox.jsx', 'r') as f:
    content = f.read()

# 1. Stop auto-resolving everything
auto_resolve_pattern = r"""          // Auto-resolve pure informational notifications so they stop showing in the badge count
          if \(data\.resolved === false && data\.type !== 'Attendance_Review' && data\.action !== 'VIEW_TENANTS'\) \{
              batch\.update\(d\.ref, \{ resolved: true \}\);
              hasUpdates = true;
          \}"""

# Replace it with something that auto-resolves nothing by default, or only specific things?
# Let's just remove the auto-resolve completely, so the admin has to dismiss notifications.
auto_resolve_replacement = r"""          // We don't auto-resolve anymore, so they show up in the pending list for the admin to dismiss
          """
content = re.sub(auto_resolve_pattern, auto_resolve_replacement, content)


# 2. Add a Dismiss button at the end of the button list for ANY unresolved notification
# Let's find the end of the button list:
button_list_end_pattern = r"""                            \{!req\.resolved && req\.source === 'staff_request' && \(
                              <button
                                onClick=\{\(\) => handleResolve\(req\)\}
                                style=\{\{ flex: 1, background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: 9, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 \}\}\>
                                <span className="material-symbols-outlined" style=\{\{ fontSize: 15 \}\}\>open_in_new\</span\>
                                Review Request
                              \</button\>
                            \)\}
                          \</div\>"""

button_list_end_replacement = r"""                            {!req.resolved && req.source === 'staff_request' && (
                              <button
                                onClick={() => handleResolve(req)}
                                style={{ flex: 1, background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: 9, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>open_in_new</span>
                                Review Request
                              </button>
                            )}
                            
                            {!req.resolved && req.source === 'notification' && !['Attendance_Review', 'partial_payment_request', 'full_remaining_payment'].includes(req.type) && req.action !== 'VIEW_TENANTS' && (
                              <button
                                onClick={async () => {
                                  try {
                                    await updateDoc(doc(db, 'notifications', req.id), { resolved: true });
                                    setRequests(prev => prev.filter(r => r.id !== req.id));
                                  } catch (e) { console.error(e); }
                                }}
                                style={{ flex: 1, background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 9, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>done_all</span>
                                Dismiss
                              </button>
                            )}
                          </div>"""

content = re.sub(button_list_end_pattern, button_list_end_replacement, content)

with open('Febebo-admin/src/pages/RequestBox.jsx', 'w') as f:
    f.write(content)
