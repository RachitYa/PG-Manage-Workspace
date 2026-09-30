import re

with open('src/pages/AddTenant.jsx', 'r') as f:
    content = f.read()

# Add addDoc to imports if missing
if "addDoc" not in content.split("from 'firebase/firestore'")[0]:
    content = content.replace("setDoc } from 'firebase/firestore'", "setDoc, addDoc } from 'firebase/firestore'")

# Locate the tenant data save and inject the payment records
target = """      await setDoc(doc(db, 'tenants', newStudentUid), tenantData, { merge: true });"""

payment_code = """      await setDoc(doc(db, 'tenants', newStudentUid), tenantData, { merge: true });

      // 4. Create the payment record so it shows in Student App Account
      if (amountPaid > 0) {
        const paymentObj = {
          amount: amountPaid,
          date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
          name: formData.paymentMode === 'Token Only' ? 'Token Payment' : 'First Month Payment',
          paymentMode: formData.paymentMethod,
          paymentType: formData.paymentMode === 'Token Only' ? 'token' : 'first_month',
          pgName: user.name || 'PG',
          receivedBy: 'Admin (Manual Entry)',
          rent: customRent,
          security: Number(formData.securityDeposit) || 0,
          totalAmount: leaseAmount,
          remainingAmount: remainingAmount,
          seaterLabel: selectedRoom.seaterLabel || `${selectedRoom.beds} Seater`,
          status: 'Verified',
          type: 'Debit',
          createdAt: new Date().toISOString()
        };
        
        if (screenshotUrl) {
          paymentObj.screenshot = screenshotUrl;
        }

        await addDoc(collection(db, 'users', newStudentUid, 'payments'), paymentObj);
        
        // Add to rent_receipts so admin sees it in Total Rents module
        await addDoc(collection(db, 'rent_receipts'), {
          ...paymentObj,
          adminId: user.uid,
          tenantId: newStudentUid,
          tenantName: formData.name,
          roomNo: selectedRoom.roomNo
        });
      }"""

content = content.replace(target, payment_code)

with open('src/pages/AddTenant.jsx', 'w') as f:
    f.write(content)

print("AddTenant.jsx patched.")
