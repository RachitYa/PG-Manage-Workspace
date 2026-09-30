with open('Febebo-admin/src/pages/ManageStaff.jsx', 'r') as f:
    for line in f:
        if 'setDoc(doc(db, \'staff_tokens\'' in line or 'addDoc' in line or 'pgId' in line:
            print(line.strip())
