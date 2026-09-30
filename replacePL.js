const fs = require('fs');

const file = 'Febebo-admin/src/pages/ManageAccount.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Replace fetchProfitLoss
const oldFetch = `      const fetchProfitLoss = async () => {
        setLoadingProfitLoss(true);
        try {
          const qRent = query(collection(db, 'rent_receipts'), where('adminId', '==', user.uid), where('pgId', '==', activePgId));
          const snapRent = await getDocs(qRent);
          
          const qStaff = query(collection(db, 'staff_salaries'), where('adminId', '==', user.uid), where('pgId', '==', activePgId));
          const snapStaff = await getDocs(qStaff);

          const monthlyData = {}; // Format: { "June 2026": { rent: 0, staff: 0, inventory: 0, maintenance: 0 } }

          // Aggregate Rent
          snapRent.docs.forEach(doc => {
            const data = doc.data();
            // Use rentMonth or datePaid
            const dateObj = data.datePaid ? new Date(data.datePaid) : new Date();
            const monthStr = data.rentMonth || dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' });
            
            if (!monthlyData[monthStr]) monthlyData[monthStr] = { rent: 0, staff: 0, inventory: 0, maintenance: 0, timestamp: dateObj.getTime() };
            monthlyData[monthStr].rent += (Number(data.amountPaid) || 0);
          });

          // Aggregate Staff Salaries
          snapStaff.docs.forEach(doc => {
            const data = doc.data();
            const monthStr = data.month || new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
            // Use datePaid for sorting
            const dateObj = data.datePaid ? new Date(data.datePaid) : new Date();
            
            if (!monthlyData[monthStr]) monthlyData[monthStr] = { rent: 0, staff: 0, inventory: 0, maintenance: 0, timestamp: dateObj.getTime() };
            monthlyData[monthStr].staff += (Number(data.amountPaid) || 0);
          });

          // Convert to Array and Calculate Net
          const processedData = Object.keys(monthlyData).map(monthStr => {
            const details = monthlyData[monthStr];
            const net = details.rent - details.staff - details.inventory - details.maintenance;
            return {
              id: monthStr,
              month: monthStr,
              type: net >= 0 ? 'profit' : 'loss',
              net: net,
              details,
              timestamp: details.timestamp
            };
          });

          // Sort descending by date
          processedData.sort((a, b) => b.timestamp - a.timestamp);

          setProfitLossData(processedData);
        } catch (e) {
          console.error("Error fetching profit-loss data:", e);
        } finally {
          setLoadingProfitLoss(false);
        }
      };`;

const newFetch = `      const fetchProfitLoss = async () => {
        setLoadingProfitLoss(true);
        try {
          const [snapRent, snapStaff, snapPetty, snapLease, snapVendor] = await Promise.all([
            getDocs(query(collection(db, 'rent_receipts'), where('adminId', '==', user.uid), where('pgId', '==', activePgId))),
            getDocs(query(collection(db, 'staff_salaries'), where('adminId', '==', user.uid), where('pgId', '==', activePgId))),
            getDocs(query(collection(db, 'petty_cash_transactions'), where('adminId', '==', user.uid), where('pgId', '==', activePgId))),
            getDocs(query(collection(db, 'lease_payments'), where('adminId', '==', user.uid), where('pgId', '==', activePgId))),
            getDocs(query(collection(db, 'vendor_transactions'), where('adminId', '==', user.uid))) // Vendor txns don't have pgId yet
          ]);

          const monthlyData = {}; // Format: { "June 2026": { rent: 0, staff: 0, petty: 0, pettyDetails: [], lease: 0, vendor: 0, timestamp: 0 } }

          const initMonth = (monthStr, dateObj) => {
            if (!monthlyData[monthStr]) {
              monthlyData[monthStr] = { rent: 0, staff: 0, petty: 0, pettyDetails: [], lease: 0, vendor: 0, timestamp: dateObj.getTime() };
            }
          };

          // Aggregate Rent (Income)
          snapRent.docs.forEach(doc => {
            const data = doc.data();
            const dateObj = data.datePaid ? new Date(data.datePaid) : new Date();
            const monthStr = data.rentMonth || dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' });
            initMonth(monthStr, dateObj);
            monthlyData[monthStr].rent += (Number(data.amountPaid) || 0);
          });

          // Aggregate Staff Salaries (Expense)
          snapStaff.docs.forEach(doc => {
            const data = doc.data();
            const monthStr = data.month || new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
            const dateObj = data.datePaid ? new Date(data.datePaid) : new Date();
            initMonth(monthStr, dateObj);
            monthlyData[monthStr].staff += (Number(data.amountPaid) || 0);
          });

          // Aggregate Petty Cash (Expense)
          snapPetty.docs.forEach(doc => {
            const data = doc.data();
            if (data.type === 'debit') return; // We only care about credit (given to staff) as expense for admin. Wait, debit is spent by staff. Actually, money given to staff is an expense. But what if staff returns it? 
            // For admin, money given to staff (credit to staff) is money out.
            if (data.type === 'credit') {
              const dateObj = data.date ? new Date(data.date) : new Date();
              const monthStr = dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' });
              initMonth(monthStr, dateObj);
              monthlyData[monthStr].petty += (Number(data.amount) || 0);
              monthlyData[monthStr].pettyDetails.push({ staffName: data.staffName || 'Staff', amount: Number(data.amount) || 0, date: dateObj });
            }
          });

          // Aggregate Lease Payments (Expense)
          snapLease.docs.forEach(doc => {
            const data = doc.data();
            const dateObj = data.datePaid ? new Date(data.datePaid) : new Date();
            const monthStr = dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' });
            initMonth(monthStr, dateObj);
            monthlyData[monthStr].lease += (Number(data.amount) || 0);
          });

          // Aggregate Vendor Transactions (Expense)
          snapVendor.docs.forEach(doc => {
            const data = doc.data();
            if (data.type === 'payment_out') { // Money paid to vendor
              const dateObj = data.date ? new Date(data.date) : new Date();
              const monthStr = dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' });
              initMonth(monthStr, dateObj);
              monthlyData[monthStr].vendor += (Number(data.amount) || 0);
            }
          });

          // Convert to Array and Calculate Net
          const processedData = Object.keys(monthlyData).map(monthStr => {
            const details = monthlyData[monthStr];
            const expenses = details.staff + details.petty + details.lease + details.vendor;
            const net = details.rent - expenses;
            return {
              id: monthStr,
              month: monthStr,
              type: net >= 0 ? 'profit' : 'loss',
              net: net,
              expenses,
              details,
              timestamp: details.timestamp
            };
          });

          processedData.sort((a, b) => b.timestamp - a.timestamp);
          setProfitLossData(processedData);
        } catch (e) {
          console.error("Error fetching profit-loss data:", e);
        } finally {
          setLoadingProfitLoss(false);
        }
      };`;

content = content.replace(oldFetch, newFetch);


// 2. Replace UI Render
const oldUI = `                <div style={{ padding: '16px' }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Breakdown</p>
                  {[['Rent Collected', selectedMonth.details.rent, '+', '#059669'], ['Paid to Staff', selectedMonth.details.staff, '-', '#e11d48']].map(([label, val, sign, color]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <span style={{ fontSize: 14, color: '#64748b' }}>{label}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color }}>{sign} ₹{val.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>`;

const newUI = `                <div style={{ padding: '16px' }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Income</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: 14, color: '#64748b' }}>Payments Received (Rent)</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#059669' }}>+ ₹{selectedMonth.details.rent.toLocaleString('en-IN')}</span>
                  </div>

                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '20px 0 16px' }}>Expenses</p>
                  
                  {selectedMonth.details.lease > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <span style={{ fontSize: 14, color: '#64748b' }}>PG Lease Paid</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#e11d48' }}>- ₹{selectedMonth.details.lease.toLocaleString('en-IN')}</span>
                    </div>
                  )}

                  {selectedMonth.details.vendor > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <span style={{ fontSize: 14, color: '#64748b' }}>Vendor / Misc Expenses</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#e11d48' }}>- ₹{selectedMonth.details.vendor.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 14, color: '#64748b' }}>Staff Salaries Paid</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#e11d48' }}>- ₹{selectedMonth.details.staff.toLocaleString('en-IN')}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 14, color: '#64748b' }}>Petty Cash Allotted</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#e11d48' }}>- ₹{selectedMonth.details.petty.toLocaleString('en-IN')}</span>
                  </div>
                  
                  {selectedMonth.details.pettyDetails?.length > 0 && (
                    <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, marginTop: 8, marginBottom: 16 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#475569', margin: '0 0 8px' }}>Petty Cash Breakdown:</p>
                      {selectedMonth.details.pettyDetails.map((pd, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, color: '#64748b' }}>{pd.staffName}</span>
                          <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>₹{pd.amount.toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Total Expenses</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#e11d48' }}>₹{selectedMonth.expenses.toLocaleString('en-IN')}</span>
                  </div>
                </div>`;

content = content.replace(oldUI, newUI);
fs.writeFileSync(file, content);
console.log('Profit Loss UI Updated');
