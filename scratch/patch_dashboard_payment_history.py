import re

file_path = 'febebo-app/src/screens/StudentDashboard.jsx'
with open(file_path, 'r') as f:
    content = f.read()

# Modify users/{uid}/payments
add_doc_search = """      // 1. Save to student's own payment history (users/{uid}/payments)
      await addDoc(collection(db, 'users', user.uid, 'payments'), {
        name: `Remaining Balance Payment - ${user.subscribedPG.pgName}`,
        amount: Number(amountToPay),
        type: 'Debit',
        date: dateString,
        month: dateString,
        adminId: adminId,
        screenshot: payScreenshot || null,
        paymentType: 'remaining_balance',
        createdAt: isoString
      });"""

add_doc_inject = """      // 1. Save to student's own payment history (users/{uid}/payments)
      await addDoc(collection(db, 'users', user.uid, 'payments'), {
        paymentMode: fullPaymentMode,
        transactionId: fullTransactionId,
        receivedBy: fullReceivedBy,
        status: 'Pending Verification',
        name: `Remaining Balance Payment - ${user.subscribedPG.pgName}`,
        amount: Number(amountToPay),
        type: 'Debit',
        date: dateString,
        month: dateString,
        adminId: adminId,
        screenshot: payScreenshot || null,
        paymentType: 'remaining_balance',
        createdAt: isoString
      });"""

if add_doc_search in content:
    content = content.replace(add_doc_search, add_doc_inject)
    with open(file_path, 'w') as f:
        f.write(content)
    print("Patched StudentDashboard.jsx addDoc for payments")
else:
    print("Could not find the target string in StudentDashboard.jsx")
