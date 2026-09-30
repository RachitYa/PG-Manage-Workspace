import re

with open('Febebo-admin/src/pages/Reports.jsx', 'r') as f:
    content = f.read()

# Fix dynamic menu kpi
kpi_old = r"""    if (item.key === 'finance') return { ...item, kpis: [`₹${(currentMonthRev/1000).toFixed(0)}k This Mth`, '₹78k Expenses', `₹${(totalPendingDues/1000).toFixed(0)}k Pending`] };"""

kpi_new = r"""    if (item.key === 'finance') {
      let mthExp = 0;
      const mStr = new Date().toLocaleString('default', { month: 'short' });
      if (dbData?.vendors) {
         dbData.vendors.forEach(v => {
            let d = new Date();
            if (v.date?.seconds) d = new Date(v.date.seconds * 1000);
            else if (v.date) d = new Date(v.date);
            else if (v.createdAt?.seconds) d = new Date(v.createdAt.seconds * 1000);
            if (d.toLocaleString('default', { month: 'short' }) === mStr) {
               let eA = 0;
               if (v.type === 'payment_out') eA = Number(v.amount) || 0;
               else if (v.isClearing) eA = Number(v.clearedAmount) || 0;
               else if (v.payInfo?.amtNow) eA = Number(v.payInfo.amtNow) || 0;
               mthExp += eA;
            }
         });
      }
      return { ...item, kpis: [`₹${(currentMonthRev/1000).toFixed(0)}k This Mth`, `₹${(mthExp/1000).toFixed(0)}k Expenses`, `₹${(totalPendingDues/1000).toFixed(0)}k Pending`] };
    }"""
content = content.replace(kpi_old, kpi_new)

with open('Febebo-admin/src/pages/Reports.jsx', 'w') as f:
    f.write(content)
