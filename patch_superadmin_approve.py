import re

files = [
    "/Users/shreyassingh/Downloads/PG MANAGE @/febebo-superadmin/src/pages/PGOwners.jsx",
    "/Users/shreyassingh/Downloads/PG MANAGE @/febebo-superadmin/src/pages/PGOwnerDetails.jsx"
]

for file_path in files:
    with open(file_path, "r") as f:
        content = f.read()

    # Import setDoc
    if "setDoc" not in content and "updateDoc" in content:
        content = content.replace("updateDoc", "updateDoc, setDoc")

    # In PGOwners.jsx
    if "PGOwners.jsx" in file_path:
        old_approve_sub = """await updateDoc(doc(db, 'pg_owners', pgId), {
           status: 'Approved',
           visibility
         });"""
        new_approve_sub = """await setDoc(doc(db, 'pg_owners', pgId), {
           status: 'Approved',
           visibility
         }, { merge: true });"""
        content = content.replace(old_approve_sub, new_approve_sub)

        old_approve_pri1 = """await updateDoc(doc(db, 'admins', adminUid), { isApproved: true });"""
        new_approve_pri1 = """await setDoc(doc(db, 'admins', adminUid), { isApproved: true }, { merge: true });"""
        content = content.replace(old_approve_pri1, new_approve_pri1)
        
        old_approve_pri2 = """await updateDoc(doc(db, 'pg_owners', pgId), { status: 'Approved', visibility });"""
        new_approve_pri2 = """await setDoc(doc(db, 'pg_owners', pgId), { status: 'Approved', visibility }, { merge: true });"""
        content = content.replace(old_approve_pri2, new_approve_pri2)

    # In PGOwnerDetails.jsx
    if "PGOwnerDetails.jsx" in file_path:
        old_det1 = """await updateDoc(doc(db, 'admins', adminData.id), { isApproved: true });"""
        new_det1 = """await setDoc(doc(db, 'admins', adminData.id), { isApproved: true }, { merge: true });"""
        content = content.replace(old_det1, new_det1)
        
        old_det2 = """await updateDoc(doc(db, 'pg_owners', id), { status: 'Approved', visibility });"""
        new_det2 = """await setDoc(doc(db, 'pg_owners', id), { status: 'Approved', visibility }, { merge: true });"""
        content = content.replace(old_det2, new_det2)

    with open(file_path, "w") as f:
        f.write(content)

print("Patch applied to PGOwners and PGOwnerDetails.")
