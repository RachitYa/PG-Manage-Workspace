with open('Febebo-admin/src/pages/ManageAccount.jsx', 'r') as f:
    lines = f.readlines()

out = []
skip = False
for line in lines:
    if "// Aggregate Vendor Transactions (Expense)" in line:
        out.append(line)
        out.append("""          snapVendor.docs.forEach(doc => {
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
          });\n""")
        skip = True
        continue
    
    if skip and "// Convert to Array and Calculate Net" in line:
        skip = False
        out.append(line)
        continue
        
    if not skip:
        out.append(line)

with open('Febebo-admin/src/pages/ManageAccount.jsx', 'w') as f:
    f.writelines(out)

