import re

with open('Febebo-admin/src/pages/VendorTransactions.jsx', 'r') as f:
    content = f.read()

# 1. Fix list filter calculation (running pending)
list_filter_old = r"""    let vPending = parseFloat(v.amount) || 0;
    const vTxns = vendorTransactions.filter(t => t.vendorId === v.id);
    // Sort chronological to process pending correctly
    vTxns.sort((a,b) => new Date(a.date) - new Date(b.date));
    vTxns.forEach(txn => {"""

list_filter_new = r"""    let vPending = 0; // Initialize pending to 0
    const vTxns = vendorTransactions.filter(t => t.vendorId === v.id);
    // Sort chronological to process pending correctly
    vTxns.sort((a,b) => new Date(a.date) - new Date(b.date));
    vTxns.forEach(txn => {"""
content = content.replace(list_filter_old, list_filter_new)

# 2. Fix Detail View variables
detail_old = r"""  // Dynamically build currentVendorData from the flat vendorTransactions array
  let currentVendorData = null;
  let totalPurchasedAmount = 0;
  let totalPaidAmount = 0;
  let runningPending = selectedVendor ? (parseFloat(selectedVendor.amount) || 0) : 0;

  if (selectedVendor) {"""

detail_new = r"""  // Dynamically build currentVendorData from the flat vendorTransactions array
  let currentVendorData = null;
  let totalPurchasedAmount = selectedVendor ? (parseFloat(selectedVendor.amount) || 0) : 0;
  let totalPaidAmount = selectedVendor ? (parseFloat(selectedVendor.amount) || 0) : 0;
  let runningPending = 0;

  if (selectedVendor) {"""
content = content.replace(detail_old, detail_new)

# 3. Rename the Add Vendor Modal label
label_old = r"""<label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Total Amount (₹)</label>"""
label_new = r"""<label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Total Amount Paid till date (₹)</label>"""
content = content.replace(label_old, label_new)

with open('Febebo-admin/src/pages/VendorTransactions.jsx', 'w') as f:
    f.write(content)

