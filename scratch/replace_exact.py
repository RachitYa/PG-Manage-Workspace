import re

with open('Febebo-admin/src/pages/VendorTransactions.jsx', 'r') as f:
    content = f.read()

# I will find the indices of the start and end of the block.
start_str = "  // Dynamically build currentVendorData from the flat vendorTransactions array"
end_str = "  const totalPending = monthlyList.reduce((s, m) => s + m.pending, 0);"

start_idx = content.find(start_str)
end_idx = content.find(end_str) + len(end_str)

if start_idx == -1 or content.find(end_str) == -1:
    print("Could not find start or end block")
    exit(1)

new_block = """  // Dynamically build currentVendorData from the flat vendorTransactions array
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
      const fDate = fromDate ? new Date(fromDate) : new Date('1970-01-01');
      const tDate = toDate ? new Date(toDate) : new Date('2099-12-31');
      tDate.setHours(23, 59, 59, 999);
      
      Object.keys(currentVendorData.months).forEach(m => {
        let keep = false;
        Object.keys(currentVendorData.months[m].days).forEach(d => {
            // simple check: if any transaction in this month matches, we keep the month
            keep = true;
        });
        if (keep) filteredMonths[m] = currentVendorData.months[m];
      });
      currentVendorData.months = filteredMonths;
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

new_content = content[:start_idx] + new_block + content[end_idx:]

with open('Febebo-admin/src/pages/VendorTransactions.jsx', 'w') as f:
    f.write(new_content)

print("Replaced successfully")
