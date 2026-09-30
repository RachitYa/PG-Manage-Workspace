const fs = require('fs');

let code = fs.readFileSync('/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/AdminDashboard.jsx', 'utf8');

const endOfUseEffect = `    // ── Real-time listener for Enquiries ──
    const qEnquiries = query(collection(db, 'enquiries'), where('adminId', '==', user.uid));
    const unsubEnq = onSnapshot(qEnquiries, (snap) => {
      const newEnquiriesCount = snap.docs.filter(d => (d.data().enquiryStatus || 'New') === 'New').length;
      setEnquiryCount(newEnquiriesCount);
    });

    return () => unsubEnq();
  }, [user]);`;

const newEndOfUseEffect = `    // ── Real-time listener for Enquiries ──
    const qEnquiries = query(collection(db, 'enquiries'), where('adminId', '==', user.uid));
    const unsubEnq = onSnapshot(qEnquiries, (snap) => {
      const newEnquiriesCount = snap.docs.filter(d => (d.data().enquiryStatus || 'New') === 'New').length;
      setEnquiryCount(newEnquiriesCount);
    });

    // ── Real-time listener for Notifications Count ──
    const unsubNotifs = onSnapshot(
        query(collection(db, 'notifications'), where('adminId', '==', user.uid), where('resolved', '==', false)),
        (snap) => {
            // Also need to get reqs count statically if we want total.
            // A better way: just get it in real-time.
            getDocs(query(collection(db, 'staff_requisitions'), where('adminId', '==', user.uid), where('status', '==', 'Pending Rate')))
              .then(reqSnap => {
                  setPendingNotifsCount(snap.size + reqSnap.size);
              });
        }
    );

    return () => { unsubEnq(); unsubNotifs(); };
  }, [user]);`;

code = code.replace(endOfUseEffect, newEndOfUseEffect);

fs.writeFileSync('/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/AdminDashboard.jsx', code);
console.log("Success")
