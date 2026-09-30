import re

with open('Febebo-admin/src/pages/Reports.jsx', 'r') as f:
    content = f.read()

# 1. Add vendor_transactions to Promise.all in fetchData
fetch_old = r"""          getDocs(query(collection(db, 'leave_requests'), where('adminId', '==', adminId))),
          getDocs(query(collection(db, 'complaints'), where('adminId', '==', adminId))),
          getDocs(query(collection(db, 'mess_headcount'), where('adminId', '==', adminId)))
        ]);"""

fetch_new = r"""          getDocs(query(collection(db, 'leave_requests'), where('adminId', '==', adminId))),
          getDocs(query(collection(db, 'complaints'), where('adminId', '==', adminId))),
          getDocs(query(collection(db, 'mess_headcount'), where('adminId', '==', adminId))),
          getDocs(query(collection(db, 'vendor_transactions'), where('adminId', '==', adminId)))
        ]);"""
content = content.replace(fetch_old, fetch_new)

# 2. Extract vendorSnap from Promise.all result
var_old = r"""        const [receiptsSnap, roomsSnap, tenantsSnap, staffSnap, leavesSnap, complaintsSnap, messSnap] = await Promise.all(["""
var_new = r"""        const [receiptsSnap, roomsSnap, tenantsSnap, staffSnap, leavesSnap, complaintsSnap, messSnap, vendorSnap] = await Promise.all(["""
content = content.replace(var_old, var_new)

# 3. Add to setDbData
set_old = r"""          complaints: complaintsSnap.docs.map(d => d.data()),
          mess: messSnap.docs.map(d => d.data())
        });"""
set_new = r"""          complaints: complaintsSnap.docs.map(d => d.data()),
          mess: messSnap.docs.map(d => d.data()),
          vendors: vendorSnap.docs.map(d => d.data())
        });"""
content = content.replace(set_old, set_new)

# 4. Use it in FinanceTab
fin_old = r"""      const m = d.toLocaleString('default', { month: 'short' });
      if (!monthly[m]) monthly[m] = { month: m, revenue: 0, expenses: 70000, pending: 0 };
      monthly[m].revenue += (Number(r.amountPaid) || 0);"""

fin_new = r"""      const m = d.toLocaleString('default', { month: 'short' });
      if (!monthly[m]) monthly[m] = { month: m, revenue: 0, expenses: 0, pending: 0 }; // Removed 70000 dummy
      monthly[m].revenue += (Number(r.amountPaid) || 0);"""
content = content.replace(fin_old, fin_new)

# We also need to loop through dbData.vendors and add to expenses!
fin_loop_old = r"""      if (r.items && Array.isArray(r.items)) {
        r.items.forEach(item => {
          const lbl = item.label || 'Misc';
          breakdown[lbl] = (breakdown[lbl] || 0) + (Number(item.amount) || 0);
        });
      }
    });

    realFinanceMonthly = Object.values(monthly);"""

fin_loop_new = r"""      if (r.items && Array.isArray(r.items)) {
        r.items.forEach(item => {
          const lbl = item.label || 'Misc';
          breakdown[lbl] = (breakdown[lbl] || 0) + (Number(item.amount) || 0);
        });
      }
    });

    if (dbData.vendors) {
      dbData.vendors.forEach(v => {
        let d = new Date();
        if (v.date?.seconds) d = new Date(v.date.seconds * 1000);
        else if (v.date) d = new Date(v.date);
        else if (v.createdAt?.seconds) d = new Date(v.createdAt.seconds * 1000);
        
        const m = d.toLocaleString('default', { month: 'short' });
        if (!monthly[m]) monthly[m] = { month: m, revenue: 0, expenses: 0, pending: 0 };
        
        let expAmt = 0;
        if (v.type === 'payment_out') {
          expAmt = Number(v.amount) || 0;
        } else if (v.isClearing) {
          expAmt = Number(v.clearedAmount) || 0;
        } else if (v.payInfo && v.payInfo.amtNow) {
          expAmt = Number(v.payInfo.amtNow) || 0;
        }
        monthly[m].expenses += expAmt;
      });
    }

    realFinanceMonthly = Object.values(monthly);"""
content = content.replace(fin_loop_old, fin_loop_new)

with open('Febebo-admin/src/pages/Reports.jsx', 'w') as f:
    f.write(content)

