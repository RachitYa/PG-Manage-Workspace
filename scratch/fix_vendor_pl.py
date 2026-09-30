import re

with open('Febebo-admin/src/pages/ManageAccount.jsx', 'r') as f:
    content = f.read()

# Fix the vendor_transactions query logic in ManageAccount.jsx
vendor_pl_old = r"""          // Aggregate Vendor Transactions \(Expense\)
          snapVendor\.docs\.forEach\(doc => \{
            const data = doc\.data\(\);
            if \(data\.type === 'payment_out'\) \{ // Money paid to vendor
              const dateObj = data\.date \? new Date\(data\.date\) : new Date\(\);
              const monthStr = dateObj\.toLocaleString\('en-US', \{ month: 'long', year: 'numeric' \}\);
              initMonth\(monthStr, dateObj\);
              monthlyData\[monthStr\]\.vendor \+= \(Number\(data\.amount\) \|\| 0\);
            \}
          \}\);"""

vendor_pl_new = r"""          // Aggregate Vendor Transactions (Expense)
          snapVendor.docs.forEach(doc => {
            const data = doc.data();
            const dateObj = data.date ? new Date(data.date) : new Date();
            const monthStr = dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' });
            initMonth(monthStr, dateObj);
            
            // Handle both older 'payment_out' style and the new VendorTransactions style
            if (data.type === 'payment_out') {
              monthlyData[monthStr].vendor += (Number(data.amount) || 0);
            } else if (data.isClearing) {
              monthlyData[monthStr].vendor += (Number(data.clearedAmount) || 0);
            } else if (data.payInfo && data.payInfo.amtNow) {
              monthlyData[monthStr].vendor += (Number(data.payInfo.amtNow) || 0);
            }
          });"""

content = content.replace(vendor_pl_old, vendor_pl_new)

with open('Febebo-admin/src/pages/ManageAccount.jsx', 'w') as f:
    f.write(content)

