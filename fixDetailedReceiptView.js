const fs = require('fs');
let content = fs.readFileSync('Febebo-admin/src/components/DetailedReceiptModal.jsx', 'utf8');

const oldItemsBlock = `  // Build items list
  let items = [];
  if (receipt.items && receipt.items.length > 0) {
    items = receipt.items.filter(it => Number(it.amount || 0) > 0);
  } else {
    items = [
      receipt.rent        && { label: 'Room Rent',      amount: receipt.rent },
      receipt.meterAmt    && { label: 'Meter Charges',  amount: receipt.meterAmt },
      receipt.foodAmt     && { label: 'Food Charge',    amount: receipt.foodAmt },
      receipt.amenities   && { label: 'Amenities',      amount: receipt.amenities },
      receipt.laundry     && { label: 'Laundry',        amount: receipt.laundry },
      receipt.housekeeping && { label: 'House Keeping', amount: receipt.housekeeping },
      receipt.security    && { label: 'Security Deposit', amount: receipt.security },
    ].filter(Boolean);
    
    // If we couldn't derive any items, just show a generic 'Payment' line
    if (items.length === 0) {
      items.push({
        label: receipt.name?.includes('Payment') ? receipt.name : 'Payment',
        amount: receipt.amountPaid || receipt.amount || receipt.totalAmount || 0
      });
    }
  }`;

const newItemsBlock = `  // Build items list
  let items = [
    { label: 'Room Rent',      amount: receipt.items?.find(i => i.label === 'Room Rent')?.amount || receipt.rent || 0 },
    { label: 'Meter Charges',  amount: receipt.items?.find(i => i.label === 'Meter Unit' || i.label === 'Meter Charges')?.amount || receipt.meterAmt || receipt.meter || 0 },
    { label: 'Food Charge',    amount: receipt.items?.find(i => i.label === 'Food Charge')?.amount || receipt.foodAmt || receipt.food || 0 },
    { label: 'Extra Plates',   amount: receipt.items?.find(i => i.label === 'Extra Plates')?.amount || receipt.extraPlates || 0 },
    { label: 'Amenities',      amount: receipt.items?.find(i => i.label === 'Amenities')?.amount || receipt.amenities || 0 },
    { label: 'Laundry',        amount: receipt.items?.find(i => i.label === 'Laundry')?.amount || receipt.laundry || 0 },
    { label: 'House Keeping',  amount: receipt.items?.find(i => i.label === 'House Keeping')?.amount || receipt.housekeeping || 0 },
    { label: 'Fines',          amount: receipt.items?.find(i => i.label === 'Fines')?.amount || receipt.fine || receipt.fines || 0 },
    { label: 'Other Charges',  amount: receipt.items?.find(i => i.label === 'Other Charges')?.amount || receipt.other || 0 },
    { label: 'Security Deposit', amount: receipt.items?.find(i => i.label === 'Security Deposit')?.amount || receipt.security || 0 }
  ];`;

content = content.replace(oldItemsBlock, newItemsBlock);

fs.writeFileSync('Febebo-admin/src/components/DetailedReceiptModal.jsx', content);
console.log('Fixed DetailedReceiptModal items block');
