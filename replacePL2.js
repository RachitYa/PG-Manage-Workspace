const fs = require('fs');
const file = 'Febebo-admin/src/pages/ManageAccount.jsx';
let content = fs.readFileSync(file, 'utf8');

// We need to add `overallStats` to the state, but we can just compute it during render since we have `profitLossData`.
// Wait, `profitLossData` is an array. We can compute `overallIncome` and `overallExpense` from it.

const oldUI = `            ) : profitLossData.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>No financial records found.</div>
            ) : (
              <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                {profitLossData.map((item, i) => (
                  <div key={item.id} onClick={() => setSelectedMonth(item)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: i < profitLossData.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer' }}>`;

const newUI = `            ) : profitLossData.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>No financial records found.</div>
            ) : (
              <>
              <div style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', borderRadius: 16, padding: 20, marginBottom: 20, color: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>Overall PG Status (Till Date)</p>
                {(() => {
                  const totalIncome = profitLossData.reduce((acc, curr) => acc + curr.details.rent, 0);
                  const totalExpense = profitLossData.reduce((acc, curr) => acc + curr.expenses, 0);
                  const overallNet = totalIncome - totalExpense;
                  return (
                    <>
                      <p style={{ fontSize: 32, fontWeight: 800, margin: '0 0 16px', color: overallNet >= 0 ? '#10b981' : '#f43f5e' }}>
                        {overallNet >= 0 ? '+' : '-'} ₹{Math.abs(overallNet).toLocaleString('en-IN')}
                        <span style={{ fontSize: 14, fontWeight: 500, marginLeft: 8, color: '#94a3b8' }}>{overallNet >= 0 ? 'Profit' : 'Loss'}</span>
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12 }}>
                        <div>
                          <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 2px' }}>Total Income</p>
                          <p style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#10b981' }}>₹{totalIncome.toLocaleString('en-IN')}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 2px' }}>Total Expenses</p>
                          <p style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#f43f5e' }}>₹{totalExpense.toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
              <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                {profitLossData.map((item, i) => (
                  <div key={item.id} onClick={() => setSelectedMonth(item)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: i < profitLossData.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer' }}>`;

content = content.replace(oldUI, newUI);

// Replace Vendor label to PG Expenses
content = content.replace(/Vendor \/ Misc Expenses/g, 'PG Expenses');

// Update the detailed view bottom totals
const oldDetailedBottom = `                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Total Expenses</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#e11d48' }}>₹{selectedMonth.expenses.toLocaleString('en-IN')}</span>
                  </div>
                </div>`;

const newDetailedBottom = `                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Total Income</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#059669' }}>₹{selectedMonth.details.rent.toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingBottom: 16 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Total Expenses</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#e11d48' }}>₹{selectedMonth.expenses.toLocaleString('en-IN')}</span>
                  </div>
                </div>`;

content = content.replace(oldDetailedBottom, newDetailedBottom);

fs.writeFileSync(file, content);
console.log('Profit Loss UI Updated');
