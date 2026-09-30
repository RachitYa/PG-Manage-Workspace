import sys

file_path = "Febebo-admin/src/pages/AdminDashboard.jsx"
with open(file_path, "r") as f:
    content = f.read()

# 1. State Variables
content = content.replace(
    "const [hasPendingNotifs, setHasPendingNotifs] = useState(false);",
    "const [pendingNotifsCount, setPendingNotifsCount] = useState(0);\n  const [visitorCount, setVisitorCount] = useState(0);\n  const [leaveCount, setLeaveCount] = useState(0);\n  const [complainCount, setComplainCount] = useState(0);\n  const [chatCount, setChatCount] = useState(0);"
)

# 2. Promise.all block
old_promise_block = """        const [
          qNotif, qUsers, qReqs,
          qAdmin, qOwner, qProfile,
          qReceipts, qStaff, qAttendance, qVisitors
        ] = await Promise.all([
          getDocs(query(collection(db, 'notifications'), where('adminId', '==', user.uid), where('resolved', '==', false))),
          getDocs(query(collection(db, 'tenants'), where('adminId', '==', user.uid))),
          getDocs(query(collection(db, 'staff_requisitions'), where('adminId', '==', user.uid), where('status', '==', 'Pending Rate'))),
          getDoc(doc(db, 'admins', user.uid)),
          getDoc(doc(db, 'pg_owners', user.uid)),
          getDoc(doc(db, 'pg_profiles', user.uid)),
          getDocs(query(collection(db, 'rent_receipts'), where('adminId', '==', user.uid), where('rentMonth', '==', currentMonthName))),
          getDocs(query(collection(db, 'staff_tokens'), where('ownerUid', '==', user.uid))),
          getDocs(query(collection(db, 'staff_attendance'), where('ownerUid', '==', user.uid), where('date', '==', todayStr), where('status', '==', 'Present'))),
          getDocs(query(collection(db, 'visitors'), where('adminId', '==', user.uid), where('status', '==', 'Inside')))
        ]);

        // Process Notifs & Reqs
        if (!qNotif.empty) setHasPendingNotifs(true);
        if (!qReqs.empty) setHasPendingNotifs(true);

        // Process Tenants & Enquiries
        let pendingCount = 0;
        const tenants = qUsers.docs.map(d => {
          const data = d.data();
          const s = data.status;
          if (s === 'Pending' || s === 'Upcoming User' || !s) pendingCount++;
          return { id: d.id, tenantId: d.id, ...data };
        });
        setEnquiryCount(pendingCount);
        if (pendingCount > 0) setHasPendingNotifs(true);"""

new_promise_block = """        const [
          qNotif, qUsers, qReqs,
          qAdmin, qOwner, qProfile,
          qReceipts, qStaff, qAttendance, qVisitorsInside,
          qVisitorsPending, qLeavePending, qComplaints
        ] = await Promise.all([
          getDocs(query(collection(db, 'notifications'), where('adminId', '==', user.uid), where('resolved', '==', false))),
          getDocs(query(collection(db, 'tenants'), where('adminId', '==', user.uid))),
          getDocs(query(collection(db, 'staff_requisitions'), where('adminId', '==', user.uid), where('status', '==', 'Pending Rate'))),
          getDoc(doc(db, 'admins', user.uid)),
          getDoc(doc(db, 'pg_owners', user.uid)),
          getDoc(doc(db, 'pg_profiles', user.uid)),
          getDocs(query(collection(db, 'rent_receipts'), where('adminId', '==', user.uid), where('rentMonth', '==', currentMonthName))),
          getDocs(query(collection(db, 'staff_tokens'), where('ownerUid', '==', user.uid))),
          getDocs(query(collection(db, 'staff_attendance'), where('ownerUid', '==', user.uid), where('date', '==', todayStr), where('status', '==', 'Present'))),
          getDocs(query(collection(db, 'visitors'), where('adminId', '==', user.uid), where('status', '==', 'Inside'))),
          getDocs(query(collection(db, 'visitors'), where('adminId', '==', user.uid), where('status', '==', 'Pending'))),
          getDocs(query(collection(db, 'leave_requests'), where('adminId', '==', user.uid), where('status', '==', 'Pending'))),
          getDocs(query(collection(db, 'complaints'), where('adminId', '==', user.uid)))
        ]);

        const complaintsPendingCount = qComplaints.docs.filter(d => d.data().status === 'Pending' || d.data().status === 'Active').length;
        
        setVisitorCount(qVisitorsPending.size);
        setLeaveCount(qLeavePending.size);
        setComplainCount(complaintsPendingCount);
        setChatCount(0); // Chat unread counts require schema updates to be fully exact

        // Process Tenants & Enquiries
        let pendingCount = 0;
        const tenants = qUsers.docs.map(d => {
          const data = d.data();
          const s = data.status;
          if (s === 'Pending' || s === 'Upcoming User' || !s) pendingCount++;
          return { id: d.id, tenantId: d.id, ...data };
        });
        setEnquiryCount(pendingCount);

        const totalNotifs = qNotif.size + qReqs.size + pendingCount + qVisitorsPending.size + qLeavePending.size + complaintsPendingCount;
        setPendingNotifsCount(totalNotifs);"""

content = content.replace(old_promise_block, new_promise_block)

# 3. Fix qVisitors -> qVisitorsInside
content = content.replace(
    "{ label: 'Visitors in PG', value: String(qVisitors.size)",
    "{ label: 'Visitors in PG', value: String(qVisitorsInside.size)"
)

# 4. MODULES array badgeCount
old_modules = """    { id: 'enquiry',        label: 'Enquiry',        desc: `${enquiryCount} New`,         icon: 'contact_support',        gradient: 'linear-gradient(135deg,#06b6d4,#0891b2)' },
    { id: 'visitor',        label: 'Visitors',       desc: 'Gate Log',       icon: 'recent_actors',          gradient: 'linear-gradient(135deg,#10b981,#047857)' },
    { id: 'meter',          label: 'Meters',         desc: 'Readings',       icon: 'electric_meter',         gradient: 'linear-gradient(135deg,#f59e0b,#b45309)' },
    { id: 'mess',           label: 'Mess',           desc: 'Headcount',      icon: 'restaurant',             gradient: 'linear-gradient(135deg,#ec4899,#be185d)' },
    { id: 'transportation', label: 'Transport',      desc: 'Drivers',        icon: 'directions_car',         gradient: 'linear-gradient(135deg,#16a34a,#15803d)' },
    { id: 'chat',           label: 'Chat',           desc: 'Messages',       icon: 'chat',                   gradient: 'linear-gradient(135deg,#ec4899,#db2777)' },
    { id: 'approvals',      label: 'Approvals',      desc: 'Room changes',   icon: 'verified',               gradient: 'linear-gradient(135deg,#eab308,#ca8a04)' },
    { id: 'hired_workers',  label: 'Workers',        desc: 'Shared Pool',    icon: 'engineering',            gradient: 'linear-gradient(135deg,#0ea5e9,#2563eb)' },
    { id: 'reports',        label: 'Reports',        desc: 'Analytics',      icon: 'bar_chart',              gradient: 'linear-gradient(135deg,#7c3aed,#6d28d9)' },
    { id: 'leave',          label: 'Leave',          desc: 'Requests',       icon: 'event_busy',             gradient: 'linear-gradient(135deg,#0891b2,#0e7490)' },
    { id: 'complain',       label: 'Complaints',     desc: '4 Critical',     icon: 'report',                 gradient: 'linear-gradient(135deg,#dc2626,#b91c1c)' },"""

new_modules = """    { id: 'enquiry',        label: 'Enquiry',        desc: 'Leads',          icon: 'contact_support',        gradient: 'linear-gradient(135deg,#06b6d4,#0891b2)', badgeCount: enquiryCount },
    { id: 'visitor',        label: 'Visitors',       desc: 'Gate Log',       icon: 'recent_actors',          gradient: 'linear-gradient(135deg,#10b981,#047857)', badgeCount: visitorCount },
    { id: 'meter',          label: 'Meters',         desc: 'Readings',       icon: 'electric_meter',         gradient: 'linear-gradient(135deg,#f59e0b,#b45309)' },
    { id: 'mess',           label: 'Mess',           desc: 'Headcount',      icon: 'restaurant',             gradient: 'linear-gradient(135deg,#ec4899,#be185d)' },
    { id: 'transportation', label: 'Transport',      desc: 'Drivers',        icon: 'directions_car',         gradient: 'linear-gradient(135deg,#16a34a,#15803d)' },
    { id: 'chat',           label: 'Chat',           desc: 'Messages',       icon: 'chat',                   gradient: 'linear-gradient(135deg,#ec4899,#db2777)', badgeCount: chatCount },
    { id: 'approvals',      label: 'Approvals',      desc: 'Room changes',   icon: 'verified',               gradient: 'linear-gradient(135deg,#eab308,#ca8a04)' },
    { id: 'hired_workers',  label: 'Workers',        desc: 'Shared Pool',    icon: 'engineering',            gradient: 'linear-gradient(135deg,#0ea5e9,#2563eb)' },
    { id: 'reports',        label: 'Reports',        desc: 'Analytics',      icon: 'bar_chart',              gradient: 'linear-gradient(135deg,#7c3aed,#6d28d9)' },
    { id: 'leave',          label: 'Leave',          desc: 'Requests',       icon: 'event_busy',             gradient: 'linear-gradient(135deg,#0891b2,#0e7490)', badgeCount: leaveCount },
    { id: 'complain',       label: 'Complaints',     desc: 'Issues',         icon: 'report',                 gradient: 'linear-gradient(135deg,#dc2626,#b91c1c)', badgeCount: complainCount },"""

content = content.replace(old_modules, new_modules)

# 5. Dashboard Notification Bell
old_bell = """            {hasPendingNotifs && (
              <span style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, background: '#f43f5e', borderRadius: '50%', border: '2px solid #0f2847' }} />
            )}"""

new_bell = """            {pendingNotifsCount > 0 && (
              <div style={{ position: 'absolute', top: -2, right: -2, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 8, background: '#ef4444', color: 'white', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #0f172a', boxSizing: 'border-box' }}>
                {pendingNotifsCount > 99 ? '99+' : pendingNotifsCount}
              </div>
            )}"""

content = content.replace(old_bell, new_bell)

# 6. Modal Badges
old_modal_badge = """                    {isEditingModules && isSelected && (
                      <div style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#0891b2', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check</span>
                      </div>
                    )}
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: mod.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>"""

new_modal_badge = """                    {isEditingModules && isSelected && (
                      <div style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#0891b2', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', zIndex: 10 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check</span>
                      </div>
                    )}
                    {!isEditingModules && mod.badgeCount > 0 && (
                      <div style={{ position: 'absolute', top: -6, right: -6, minWidth: 20, height: 20, padding: '0 6px', borderRadius: 10, background: '#ef4444', color: 'white', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(239,68,68,0.3)', zIndex: 5, boxSizing: 'border-box' }}>
                        {mod.badgeCount > 99 ? '99+' : mod.badgeCount}
                      </div>
                    )}
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: mod.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>"""

content = content.replace(old_modal_badge, new_modal_badge)

# 7. Grid Badges
old_grid_badge = """              <div style={{ width: 40, height: 40, borderRadius: 12, background: mod.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'white' }}>{mod.icon}</span>
              </div>"""

new_grid_badge = """              <div style={{ position: 'relative', width: 40, height: 40, borderRadius: 12, background: mod.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {mod.badgeCount > 0 && (
                  <div style={{ position: 'absolute', top: -6, right: -6, minWidth: 20, height: 20, padding: '0 6px', borderRadius: 10, background: '#ef4444', color: 'white', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(239,68,68,0.3)', zIndex: 5, boxSizing: 'border-box' }}>
                    {mod.badgeCount > 99 ? '99+' : mod.badgeCount}
                  </div>
                )}
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'white' }}>{mod.icon}</span>
              </div>"""

content = content.replace(old_grid_badge, new_grid_badge)

with open(file_path, "w") as f:
    f.write(content)
print("Updated successfully")
