with open('Febebo-admin/src/pages/VendorTransactions.jsx', 'r') as f:
    for i, line in enumerate(f):
        if 'unpaid' in line.lower():
            print(f"{i+1}: {line.strip()}")
