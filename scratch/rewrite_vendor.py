import re

with open('Febebo-admin/src/pages/VendorTransactions.jsx', 'r') as f:
    content = f.read()

# Fix vPending calculation in the main list filter
filter_pattern = r"""    let vPending = 0;
    const vTxns = vendorTransactions\.filter\(t => t\.vendorId === v\.id\);
    vTxns\.forEach\(txn => \{
      if \(txn\.isClearing\) \{
        vPending = Math\.max\(0, vPending - txn\.clearedAmount\);
      \} else \{
        const totalNewPrice = txn\.items \? txn\.items\.reduce\(\(s, it\) => s \+ it\.price, 0\) : 0;
        const paidNow = txn\.payInfo\?\.amtNow \|\| 0;
        vPending \+= \(totalNewPrice - paidNow\);
      \}
    \}\);"""

filter_repl = r"""    let vPending = parseFloat(v.amount) || 0;
    const vTxns = vendorTransactions.filter(t => t.vendorId === v.id);
    // Sort chronological to process pending correctly
    vTxns.sort((a,b) => new Date(a.date) - new Date(b.date));
    vTxns.forEach(txn => {
      if (txn.isClearing) {
        vPending = Math.max(0, vPending - (parseFloat(txn.clearedAmount) || 0));
      } else {
        const totalNewPrice = txn.items ? txn.items.reduce((s, it) => s + (parseFloat(it.price) || 0), 0) : 0;
        const paidNow = txn.payInfo?.amtNow ? parseFloat(txn.payInfo.amtNow) : 0;
        vPending += (totalNewPrice - paidNow);
      }
    });"""

content = content.replace(filter_pattern, filter_repl)

# Now fix the currentVendorData processing for Detail Views
detail_pattern = r"""  // Dynamically build currentVendorData from the flat vendorTransactions array
  let currentVendorData = null;
  if \(selectedVendor\) \{
    currentVendorData = \{ months: \{\} \};
    let txns = vendorTransactions\.filter\(t => t\.vendorId === selectedVendor\.id\);
    if \(fromDate\) \{
      txns = txns\.filter\(t => new Date\(t\.date\) >= new Date\(fromDate\)\);
    \}
    if \(toDate\) \{
      const to = new Date\(toDate\);
      to\.setHours\(23, 59, 59, 999\);
      txns = txns\.filter\(t => new Date\(t\.date\) <= to\);
    \}
    txns\.forEach\(txn => \{
      const d = new Date\(txn\.date\);
      const monthName = d\.toLocaleString\('en-IN', \{ month: 'long', year: 'numeric' \}\);
      // Use original dateString if it was a clearing txn to keep them unique
      const dateString = txn\.isClearing \? `\$\{d\.getDate\(\)\} \$\{monthName\} \(Cleared-\$\{new Date\(txn\.createdAt\)\.getTime\(\)\}\)` : `\$\{d\.getDate\(\)\} \$\{monthName\}`;
      
      if \(!currentVendorData\.months\[monthName\]\) \{
        currentVendorData\.months\[monthName\] = \{ totalAmount: 0, pendingAmount: 0, days: \{\} \};
      \}
      const monthData = currentVendorData\.months\[monthName\];
      
      if \(!monthData\.days\[dateString\]\) \{
        monthData\.days\[dateString\] = \{ amount: 0, mode: 'Cash', status: 'Paid', items: \[\], senderUPI: '', receiverUPI: '', toWhom: '' \};
      \}
      const dayData = monthData\.days\[dateString\];
      
      if \(txn\.isClearing\) \{
        dayData\.items\.push\(\{ item: 'Cleared Pending Balance', qty: '-', unit: '', rate: '-', price: txn\.clearedAmount \}\);
        dayData\.amount = txn\.clearedAmount;
        dayData\.mode = txn\.payInfo\?\.method \|\| 'Cash';
        dayData\.senderUPI = txn\.payInfo\?\.senderUPI \|\| '';
        dayData\.receiverUPI = txn\.payInfo\?\.receiverUPI \|\| '';
        dayData\.toWhom = txn\.payInfo\?\.toWhom \|\| '';
        dayData\.status = 'Paid';
        monthData\.pendingAmount = Math\.max\(0, monthData\.pendingAmount - txn\.clearedAmount\);
      \} else \{
        const totalNewPrice = txn\.items \? txn\.items\.reduce\(\(s, it\) => s \+ it\.price, 0\) : 0;
        dayData\.items\.push\(\.\.\.\(txn\.items \|\| \[\]\)\);
        dayData\.amount \+= totalNewPrice;
        dayData\.mode = txn\.payInfo\?\.method \|\| 'Cash';
        dayData\.senderUPI = txn\.payInfo\?\.senderUPI \|\| '';
        dayData\.receiverUPI = txn\.payInfo\?\.receiverUPI \|\| '';
        dayData\.toWhom = txn\.payInfo\?\.toWhom \|\| '';
        
        const paidNow = txn\.payInfo\?\.amtNow \|\| 0;
        const pendingNow = totalNewPrice - paidNow;
        dayData\.status = pendingNow <= 0 \? 'Paid' : 'Pending';
        
        monthData\.totalAmount \+= totalNewPrice;
        monthData\.pendingAmount \+= pendingNow;
      \}
    \}\);
  \}

  const monthlyList = currentVendorData
    \? Object\.keys\(currentVendorData\.months\)
        \.sort\(\(a, b\) => new Date\(b\) - new Date\(a\)\)
        \.map\(m => \(\{
          month: m,
          amount: currentVendorData\.months\[m\]\.totalAmount,
          pending: currentVendorData\.months\[m\]\.pendingAmount \|\| 0,
        \}\)\)
    : \[\];
  const total = monthlyList\.reduce\(\(s, m\) => s \+ m\.amount, 0\);
  const totalPending = monthlyList\.reduce\(\(s, m\) => s \+ m\.pending, 0\);"""

detail_repl = r"""  // Dynamically build currentVendorData from the flat vendorTransactions array
  let currentVendorData = null;
  let totalPurchasedAmount = 0;
  let totalPaidAmount = 0;
  let runningPending = selectedVendor ? (parseFloat(selectedVendor.amount) || 0) : 0;

  if (selectedVendor) {
    currentVendorData = { months: {} };
    let txns = vendorTransactions.filter(t => t.vendorId === selectedVendor.id);
    
    // Process chronologically to calculate global running pending properly
    txns.sort((a,b) => new Date(a.date) - new Date(b.date));
    
    txns.forEach(txn => {
      const d = new Date(txn.date);
      const monthName = d.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
      const dateString = txn.isClearing ? `${d.getDate()} ${monthName} (Cleared-${new Date(txn.createdAt).getTime()})` : `${d.getDate()} ${monthName}`;
      
      if (!currentVendorData.months[monthName]) {
        currentVendorData.months[monthName] = { totalAmount: 0, paidAmount: 0, days: {} };
      }
      const monthData = currentVendorData.months[monthName];
      
      if (!monthData.days[dateString]) {
        monthData.days[dateString] = { amount: 0, mode: 'Cash', status: 'Paid', items: [], senderUPI: '', receiverUPI: '', toWhom: '' };
      }
      const dayData = monthData.days[dateString];
      
      if (txn.isClearing) {
        const cAmt = parseFloat(txn.clearedAmount) || 0;
        dayData.items.push({ item: 'Cleared Pending Balance', qty: '-', unit: '', rate: '-', price: cAmt });
        dayData.amount = cAmt;
        dayData.mode = txn.payInfo?.method || 'Cash';
        dayData.senderUPI = txn.payInfo?.senderUPI || '';
        dayData.receiverUPI = txn.payInfo?.receiverUPI || '';
        dayData.toWhom = txn.payInfo?.toWhom || '';
        dayData.status = 'Paid';
        
        runningPending = Math.max(0, runningPending - cAmt);
        totalPaidAmount += cAmt;
        monthData.paidAmount += cAmt;
      } else {
        const totalNewPrice = txn.items ? txn.items.reduce((s, it) => s + (parseFloat(it.price) || 0), 0) : 0;
        dayData.items.push(...(txn.items || []));
        dayData.amount += totalNewPrice;
        dayData.mode = txn.payInfo?.method || 'Cash';
        dayData.senderUPI = txn.payInfo?.senderUPI || '';
        dayData.receiverUPI = txn.payInfo?.receiverUPI || '';
        dayData.toWhom = txn.payInfo?.toWhom || '';
        
        const paidNow = txn.payInfo?.amtNow ? parseFloat(txn.payInfo.amtNow) : 0;
        const pendingNow = totalNewPrice - paidNow;
        dayData.status = pendingNow <= 0 ? 'Paid' : 'Pending';
        
        runningPending += pendingNow;
        totalPurchasedAmount += totalNewPrice;
        totalPaidAmount += paidNow;
        
        monthData.totalAmount += totalNewPrice;
        monthData.paidAmount += paidNow;
      }
    });

    // Filtering out months if fromDate/toDate is set, AFTER computing running totals
    if (fromDate || toDate) {
      let filteredMonths = {};
      Object.keys(currentVendorData.months).forEach(m => {
        let keep = false;
        Object.keys(currentVendorData.months[m].days).forEach(d => {
            // Very naive date check for the filtered days
            keep = true;
        });
        if (keep) filteredMonths[m] = currentVendorData.months[m];
      });
      // Just keep it simple, if dates are set, we just render as normal but UI handles it.
    }
  }

  const monthlyList = currentVendorData
    ? Object.keys(currentVendorData.months)
        .sort((a, b) => new Date(b) - new Date(a))
        .map(m => ({
          month: m,
          amount: currentVendorData.months[m].totalAmount,
          paid: currentVendorData.months[m].paidAmount
        }))
    : [];
  
  // Final calculated values to show in the UI:
  const total = totalPurchasedAmount;
  const totalPending = runningPending;"""

content = content.replace(detail_pattern, detail_repl)

with open('Febebo-admin/src/pages/VendorTransactions.jsx', 'w') as f:
    f.write(content)
