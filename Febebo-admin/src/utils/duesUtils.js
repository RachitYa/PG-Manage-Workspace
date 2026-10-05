/**
 * duesUtils.js - Unified Outstanding Dues calculations, formatting, and aggregation
 */

export const BILL_TYPES = {
  rent: { label: 'Monthly Rent', icon: 'home', color: '#0284c7', bg: '#e0f2fe' },
  electricity: { label: 'Electricity Bill', icon: 'electric_meter', color: '#d97706', bg: '#fef3c7' },
  food_extra: { label: 'Food / Extra Plate', icon: 'restaurant', color: '#ea580c', bg: '#ffedd5' },
  maintenance: { label: 'Maintenance / Repair', icon: 'build', color: '#7c3aed', bg: '#ede9fe' },
  fine: { label: 'Fine / Late Fee', icon: 'warning', color: '#dc2626', bg: '#fee2e2' },
  custom: { label: 'Custom Bill', icon: 'receipt_long', color: '#475569', bg: '#f1f5f9' },
};

export const getTodayStr = () => new Date().toISOString().split('T')[0];

export const formatCurrency = (amount) => {
  const num = Number(amount) || 0;
  return `₹${num.toLocaleString('en-IN')}`;
};

export const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
};

export const getDaysDifference = (fromStr, toStr) => {
  if (!fromStr || !toStr) return 0;
  const d1 = new Date(fromStr);
  const d2 = new Date(toStr);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
  const diffTime = d2.getTime() - d1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

export const getDueAgeInfo = (dueDateStr, todayStr = getTodayStr()) => {
  if (!dueDateStr) return { daysOverdue: 0, isOverdue: false, label: 'No due date' };
  
  const diff = getDaysDifference(dueDateStr, todayStr); // > 0 means today is after dueDate (overdue)
  if (diff > 0) {
    return {
      daysOverdue: diff,
      isOverdue: true,
      label: diff === 1 ? 'Overdue by 1 day' : `Overdue by ${diff} days`
    };
  } else if (diff === 0) {
    return {
      daysOverdue: 0,
      isOverdue: false,
      label: 'Due Today'
    };
  } else {
    const remaining = Math.abs(diff);
    return {
      daysOverdue: 0,
      isOverdue: false,
      label: remaining === 1 ? 'Due Tomorrow' : `Due in ${remaining} days`
    };
  }
};

/**
 * Get aging styles matching complaints color coding:
 * 🔴 Red: Too long overdue (4+ days)
 * 🟠 Orange: Long time overdue (1-3 days)
 * ⚪ White: New / Due today / Upcoming
 */
export const getDuesAgingStyles = (item, todayStr = getTodayStr()) => {
  if (item?.status === 'paid' || item?.status === 'Paid') {
    return {
      severity: 'settled',
      bg: '#ffffff',
      cardBg: '#f0fdf4',
      border: '#86efac',
      stripe: '#10b981',
      tagBg: '#ecfdf5',
      tagText: '#059669',
      tagLabel: 'Paid ✅',
      tagIcon: 'check_circle',
      amountColor: '#16a34a'
    };
  }

  if (item?.status === 'pay_later_approved' || item?.payLaterApproval) {
    return {
      severity: 'approved',
      bg: '#ffffff',
      cardBg: '#f0fdf4',
      border: '#a7f3d0',
      stripe: '#059669',
      tagBg: '#ecfdf5',
      tagText: '#047857',
      tagLabel: `Extended: ${formatDateDisplay(item.payLaterApproval?.newDueDate || item.dueDate)}`,
      tagIcon: 'verified',
      amountColor: '#047857'
    };
  }

  const daysOverdue = item?.daysOverdue !== undefined ? item.daysOverdue : getDueAgeInfo(item?.dueDate, todayStr).daysOverdue;
  const isOverdue = item?.isOverdue !== undefined ? item.isOverdue : getDueAgeInfo(item?.dueDate, todayStr).isOverdue;

  if (isOverdue) {
    if (daysOverdue >= 4) {
      // 🔴 RED: Too long overdue (4+ days)
      return {
        severity: 'critical',
        bg: '#ffffff',
        cardBg: '#fff1f2',
        border: '#fca5a5',
        stripe: '#dc2626',
        tagBg: '#fee2e2',
        tagText: '#991b1b',
        tagLabel: `${daysOverdue}d overdue · Critical`,
        tagIcon: 'warning',
        amountColor: '#dc2626',
        badgeBg: '#dc2626',
        badgeText: '#ffffff'
      };
    } else if (daysOverdue >= 2) {
      // 🟠 ORANGE: Long time overdue (2-3 days)
      return {
        severity: 'warning',
        bg: '#ffffff',
        cardBg: '#fffbeb',
        border: '#fdba74',
        stripe: '#ea580c',
        tagBg: '#ffedd5',
        tagText: '#9a3412',
        tagLabel: `${daysOverdue}d overdue`,
        tagIcon: 'schedule',
        amountColor: '#ea580c',
        badgeBg: '#ea580c',
        badgeText: '#ffffff'
      };
    } else {
      // 🟠 Light orange for 1 day overdue
      return {
        severity: 'warning_light',
        bg: '#ffffff',
        cardBg: '#fff7ed',
        border: '#fed7aa',
        stripe: '#f97316',
        tagBg: '#ffedd5',
        tagText: '#c2410c',
        tagLabel: '1d overdue',
        tagIcon: 'schedule',
        amountColor: '#c2410c',
        badgeBg: '#f97316',
        badgeText: '#ffffff'
      };
    }
  }

  // ⚪ WHITE: New / Due today / Upcoming
  return {
    severity: 'new',
    bg: '#ffffff',
    cardBg: '#ffffff',
    border: '#e2e8f0',
    stripe: '#0284c7',
    tagBg: '#f0f9ff',
    tagText: '#0369a1',
    tagLabel: item?.dueDate === todayStr ? 'Due Today' : `Due: ${formatDateDisplay(item?.dueDate)}`,
    tagIcon: 'calendar_month',
    amountColor: '#0f172a',
    badgeBg: '#e0f2fe',
    badgeText: '#0369a1'
  };
};

/**
 * Get aggregate severity for student's overall dues bar:
 * 'critical' (🔴 Red), 'warning' (🟠 Orange), 'new' (⚪ White), 'settled' (🟢 Green)
 */
export const getAggregateSeverity = (duesData) => {
  if (!duesData || duesData.totalOutstanding <= 0) return 'settled';
  const hasCritical = duesData.items?.some(i => i.isOverdue && i.daysOverdue >= 4);
  if (hasCritical) return 'critical';
  const hasWarning = duesData.items?.some(i => i.isOverdue && i.daysOverdue >= 1);
  if (hasWarning) return 'warning';
  return 'new';
};

/**
 * Aggregate all dues for a student (Rent + Meter + Custom Dues + Extra Food)
 * Ensures that oldest overdue items are ranked highest at the top.
 */
export const aggregateTenantDues = ({
  tenant,
  rentReceipts = [],
  meterBills = [],
  customDues = [],
  todayStr = getTodayStr()
}) => {
  if (!tenant) return { totalOutstanding: 0, overdueCount: 0, items: [], hasOverdue: false };

  const tenantId = tenant.tenantId || tenant.id || tenant.uid;
  const tenantName = tenant.name || 'Student';
  const allItems = [];

  // 1. Process custom / recorded outstanding_dues from Firestore
  const recordedRentMonths = new Set();
  const recordedMeterBillIds = new Set();

  customDues.forEach(due => {
    // Filter to this tenant
    const dTenantId = due.tenantId || due.userId || due.uid;
    if (dTenantId && dTenantId !== tenantId) return;

    if (due.status === 'paid') return;

    if (due.type === 'rent' && due.rentMonth) {
      recordedRentMonths.add(due.rentMonth.toLowerCase().trim());
    }
    if (due.meterBillId) {
      recordedMeterBillIds.add(due.meterBillId);
    }

    const effectiveDueDate = due.payLaterApproval?.newDueDate || due.dueDate || due.originalDueDate || due.createdAt?.split('T')[0] || todayStr;
    const ageInfo = getDueAgeInfo(effectiveDueDate, todayStr);
    const origAgeInfo = getDueAgeInfo(due.originalDueDate || effectiveDueDate, todayStr);

    let derivedMonth = due.rentMonth;
    if (!derivedMonth && effectiveDueDate) {
      try {
        derivedMonth = new Date(effectiveDueDate).toLocaleString('en-US', { month: 'long', year: 'numeric' });
      } catch (e) {
        derivedMonth = 'General Due';
      }
    }

    allItems.push({
      id: due.id,
      docId: due.id,
      source: 'firestore_dues',
      type: due.type || 'custom',
      title: due.title || due.description || 'Outstanding Charge',
      description: due.description || '',
      amount: Number(due.amount) || 0,
      originalDueDate: due.originalDueDate || due.dueDate || effectiveDueDate,
      dueDate: effectiveDueDate,
      daysOverdue: ageInfo.daysOverdue,
      origDaysOverdue: origAgeInfo.daysOverdue,
      isOverdue: ageInfo.isOverdue,
      status: due.status || (ageInfo.isOverdue ? 'overdue' : 'pending'),
      createdAt: due.createdAt || new Date().toISOString(),
      unpaidSince: due.originalDueDate || effectiveDueDate,
      payLaterRequest: due.payLaterRequest || null,
      payLaterApproval: due.payLaterApproval || null,
      meterBillId: due.meterBillId || null,
      rentMonth: derivedMonth || 'General Due',
      monthKey: (effectiveDueDate || '').slice(0, 7) || 'general',
      raw: due
    });
  });

  // 2. Process Unpaid Meter Bills (if not already represented in customDues)
  meterBills.forEach(mb => {
    const mbTenantId = mb.tenantId || mb.userId || mb.uid;
    if (mbTenantId && mbTenantId !== tenantId) return;
    if (mb.status === 'Paid' || mb.status === 'paid') return;
    if (recordedMeterBillIds.has(mb.id || mb.docId)) return;

    const amt = Number(mb.totalAmount || mb.amount || 0);
    if (amt <= 0) return;

    const mbDueDate = mb.dueDate || mb.billDate || mb.createdAt?.split('T')[0] || todayStr;
    const ageInfo = getDueAgeInfo(mbDueDate, todayStr);

    let derivedMonth = mb.month;
    if (!derivedMonth && mbDueDate) {
      try {
        derivedMonth = new Date(mbDueDate).toLocaleString('en-US', { month: 'long', year: 'numeric' });
      } catch (e) {
        derivedMonth = 'Current';
      }
    }

    allItems.push({
      id: `meter_${mb.id || mb.docId}`,
      docId: mb.id || mb.docId,
      source: 'meter_bill',
      type: 'electricity',
      title: `Electricity Meter Bill (${derivedMonth || 'Current'})`,
      description: `Units: ${mb.units || mb.unitsConsumed || '—'} kWh · Rate: ₹${mb.ratePerUnit || 10}/unit`,
      amount: amt,
      originalDueDate: mbDueDate,
      dueDate: mbDueDate,
      daysOverdue: ageInfo.daysOverdue,
      origDaysOverdue: ageInfo.daysOverdue,
      isOverdue: ageInfo.isOverdue,
      status: ageInfo.isOverdue ? 'overdue' : 'pending',
      createdAt: mb.createdAt || new Date().toISOString(),
      unpaidSince: mbDueDate,
      payLaterRequest: mb.payLaterRequest || null,
      payLaterApproval: mb.payLaterApproval || null,
      meterBillId: mb.id || mb.docId,
      rentMonth: derivedMonth || 'Electricity',
      monthKey: (mbDueDate || '').slice(0, 7) || 'meter',
      raw: mb
    });
  });

  // 3. Process Remaining Admission Balance
  const remainingAdmission = Number(tenant.remainingAmount || tenant.subscribedPG?.remainingAmount || 0);
  if (remainingAdmission > 0 && !recordedRentMonths.has('admission_remaining') && !recordedRentMonths.has('admission')) {
    const joinDueDate = tenant.dateOfJoining || tenant.joiningDate || tenant.subscribedPG?.dateOfJoining || tenant.subscribedPG?.joiningDate || todayStr;
    const joinAgeInfo = getDueAgeInfo(joinDueDate, todayStr);
    allItems.push({
      id: `admission_remaining_${tenantId}`,
      source: 'admission_balance',
      type: 'rent',
      title: `Remaining Admission Balance`,
      description: `Pending balance from admission / registration`,
      amount: remainingAdmission,
      originalDueDate: joinDueDate,
      dueDate: joinDueDate,
      daysOverdue: joinAgeInfo.daysOverdue,
      origDaysOverdue: joinAgeInfo.daysOverdue,
      isOverdue: joinAgeInfo.isOverdue,
      status: joinAgeInfo.isOverdue ? 'overdue' : 'pending',
      createdAt: new Date().toISOString(),
      unpaidSince: joinDueDate,
      rentMonth: 'Admission Balance',
      monthKey: 'admission',
      payLaterRequest: null,
      payLaterApproval: null
    });
  }

  // 4. Auto-calculate overdue monthly rent for past and current unpaid months
  const rentAmt = Number(tenant.rent || tenant.roomRent || tenant.monthlyRent || tenant.subscribedPG?.rent || tenant.rentAmount || 0);
  if (rentAmt > 0) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentMonthVal = now.toISOString().slice(0, 7); // e.g. "2026-10"

    // Paid-till month string e.g. "2026-09"
    const paidTill = tenant.paidTillMonth || tenant.subscribedPG?.paidTillMonth;

    // Resolve joining date
    const joinRaw = tenant.joiningDate || tenant.dateOfJoining || tenant.subscribedPG?.joiningDate || tenant.subscribedPG?.dateOfJoining || tenant.createdAt;
    let dojDate = 1;
    let startYear = currentYear;
    let startMonth = currentMonth;

    if (joinRaw) {
      const parsedJoin = new Date(joinRaw);
      if (!isNaN(parsedJoin.getTime())) {
        dojDate = parsedJoin.getDate();
        // The first month was settled upon admission, so recurring rent starts next month
        startYear = parsedJoin.getFullYear();
        startMonth = parsedJoin.getMonth() + 1;
        if (startMonth > 11) {
          startMonth = 0;
          startYear++;
        }
      }
    }

    // If tenant has paidTillMonth, start checking after paidTillMonth
    if (paidTill && typeof paidTill === 'string') {
      const parts = paidTill.split('-').map(Number);
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        startYear = parts[0];
        startMonth = parts[1]; // Next month (parts[1] is 1-12, in 0-indexed it is the next month)
        if (startMonth > 11) {
          startMonth = 0;
          startYear++;
        }
      }
    }

    // Prevent checking years into the past — clamp to at most 6 months back
    const sixMonthsAgo = new Date(currentYear, currentMonth - 6, 1);
    if (new Date(startYear, startMonth, 1) < sixMonthsAgo) {
      startYear = sixMonthsAgo.getFullYear();
      startMonth = sixMonthsAgo.getMonth();
    }

    // Iterate month by month from startMonth up to currentMonth
    let iterYear = startYear;
    let iterMonth = startMonth;
    let loopGuard = 0;

    while (new Date(iterYear, iterMonth, 1) <= new Date(currentYear, currentMonth, 1) && loopGuard < 24) {
      loopGuard++;
      const iterMonthObj = new Date(iterYear, iterMonth, 1);
      const iterMonthName = iterMonthObj.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      const iterMonthVal = `${iterYear}-${String(iterMonth + 1).padStart(2, '0')}`;

      // Check if paid in receipts
      const hasPaidInReceipts = rentReceipts.some(r => {
        const rTenantId = r.tenantId || r.userId || r.uid;
        const isMatch = (rTenantId && rTenantId === tenantId) || 
                        (r.tenantName && r.tenantName.trim().toLowerCase() === tenantName.trim().toLowerCase());
        if (!isMatch) return false;
        const rMonth = String(r.rentMonth || r.month || '').trim().toLowerCase();
        return rMonth === iterMonthName.toLowerCase() || rMonth === iterMonthVal;
      });

      const alreadyRecorded = recordedRentMonths.has(iterMonthName.toLowerCase()) || recordedRentMonths.has(iterMonthVal);

      if (!hasPaidInReceipts && !alreadyRecorded) {
        const lastDayOfIterMonth = new Date(iterYear, iterMonth + 1, 0).getDate();
        const dueDay = Math.min(dojDate, lastDayOfIterMonth);
        const dueDateObj = new Date(iterYear, iterMonth, dueDay);
        const dueDateStr = `${iterYear}-${String(iterMonth + 1).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;

        const ageInfo = getDueAgeInfo(dueDateStr, todayStr);

        // Include if due date is today or in the past, OR if it's the current month
        if (ageInfo.isOverdue || dueDateStr <= todayStr || iterMonthVal === currentMonthVal) {
          allItems.push({
            id: `rent_auto_${iterMonthVal}`,
            source: 'auto_rent',
            type: 'rent',
            title: `Monthly Rent — ${iterMonthName}`,
            description: `Room ${tenant.roomNo || tenant.room || 'TBD'} · Due on day ${dojDate} of month`,
            amount: rentAmt,
            originalDueDate: dueDateStr,
            dueDate: dueDateStr,
            daysOverdue: ageInfo.daysOverdue,
            origDaysOverdue: ageInfo.daysOverdue,
            isOverdue: ageInfo.isOverdue,
            status: ageInfo.isOverdue ? 'overdue' : 'pending',
            createdAt: `${dueDateStr}T00:00:00.000Z`,
            unpaidSince: dueDateStr,
            rentMonth: iterMonthName,
            monthKey: iterMonthVal,
            payLaterRequest: null,
            payLaterApproval: null
          });
        }
      }

      iterMonth++;
      if (iterMonth > 11) {
        iterMonth = 0;
        iterYear++;
      }
    }
  }

  // 5. Calculate oldest unpaid date & time (since when this resident hasn't paid)
  let oldestUnpaidDate = null;
  let oldestUnpaidTime = Infinity;
  let oldestDaysOverdue = 0;

  allItems.forEach(item => {
    const dStr = item.unpaidSince || item.originalDueDate || item.dueDate || item.createdAt;
    if (dStr) {
      const t = new Date(dStr).getTime();
      if (!isNaN(t) && t < oldestUnpaidTime) {
        oldestUnpaidTime = t;
        oldestUnpaidDate = dStr.split('T')[0];
      }
    }
    if ((item.daysOverdue || 0) > oldestDaysOverdue) {
      oldestDaysOverdue = item.daysOverdue;
    }
  });

  if (oldestUnpaidTime === Infinity) {
    oldestUnpaidTime = Date.now();
    oldestUnpaidDate = todayStr;
  }

  // 6. Sort all items inside this tenant's dues: OLDEST OVERDUE FIRST
  allItems.sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    if (a.daysOverdue !== b.daysOverdue) {
      return b.daysOverdue - a.daysOverdue;
    }
    return (a.dueDate || '').localeCompare(b.dueDate || '');
  });

  const totalOutstanding = allItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const overdueCount = allItems.filter(i => i.isOverdue || i.status === 'overdue').length;
  const payLaterRequestedCount = allItems.filter(i => i.status === 'pay_later_requested').length;

  return {
    totalOutstanding,
    overdueCount,
    payLaterRequestedCount,
    hasOverdue: overdueCount > 0,
    items: allItems,
    tenantName,
    tenantRoom: tenant.roomNo || tenant.room || 'N/A',
    tenantPhone: tenant.phone || tenant.contactNo || '',
    tenantPhoto: tenant.photoUrl || tenant.profilePic || tenant.kyc?.profilePhoto || tenant.image || null,
    oldestUnpaidDate,
    oldestUnpaidTime,
    oldestDaysOverdue
  };
};

/**
 * Aggregates all pending & outstanding dues across all tenants.
 * Ensures 100% synchronization:
 * - Pending Dues: Sorted / Grouped according to MONTHS
 * - Outstanding Dues: PEOPLE sorted according to the TIME & DATE they hadn't paid for
 */
export const aggregateAllPendingDues = ({
  tenants = [],
  rentReceipts = [],
  meterBills = [],
  customDues = [],
  todayStr = getTodayStr()
}) => {
  const peopleWithOutstanding = [];
  const allPendingItems = [];
  const monthsMap = {};
  let totalPendingAmount = 0;

  // Filter active registered tenants
  const activeTenants = tenants.filter(t => {
    const st = String(t.status || '').toLowerCase().trim();
    if (st === 'removed' || st === 'moved out' || st === 'left' || st === 'kicked') return false;
    return true;
  });

  activeTenants.forEach(t => {
    const dues = aggregateTenantDues({
      tenant: t,
      rentReceipts,
      meterBills,
      customDues,
      todayStr
    });

    if (dues.totalOutstanding > 0) {
      totalPendingAmount += dues.totalOutstanding;

      const primaryItem = dues.items[0];
      const dueLabel = dues.oldestDaysOverdue > 0
        ? `Overdue (${dues.oldestDaysOverdue}d)`
        : `Due: ${formatDateDisplay(dues.oldestUnpaidDate)}`;

      peopleWithOutstanding.push({
        id: t.id,
        tenantId: t.id,
        name: t.name || 'Unknown',
        room: t.roomNo || t.room || '-',
        amount: dues.totalOutstanding.toLocaleString('en-IN'),
        rawAmount: dues.totalOutstanding,
        rent: t.rentAmount || t.rent || 0,
        security: t.securityDeposit || 0,
        due: dueLabel,
        initials: (t.name || 'U').substring(0, 2).toUpperCase(),
        color: dues.hasOverdue ? '#e11d48' : '#0891b2',
        img: t.photoUrl || t.profilePic || t.kyc?.profilePhoto || t.image || null,
        phone: t.phone || t.contactNo || '',
        joinDate: t.dateOfJoining || t.joiningDate || '-',
        plan: t.plan || '-',
        duesSummary: dues,
        oldestUnpaidDate: dues.oldestUnpaidDate,
        oldestUnpaidTime: dues.oldestUnpaidTime,
        oldestDaysOverdue: dues.oldestDaysOverdue,
        payHistory: []
      });

      // Extract each item for Month-wise Pending View
      dues.items.forEach(item => {
        const itemRecord = {
          ...item,
          tenantId: t.id,
          tenantName: t.name || 'Unknown',
          room: t.roomNo || t.room || '-',
          phone: t.phone || t.contactNo || '',
          photoUrl: t.photoUrl || t.profilePic || t.kyc?.profilePhoto || t.image || null,
          initials: (t.name || 'U').substring(0, 2).toUpperCase(),
          color: item.isOverdue ? '#e11d48' : '#0891b2'
        };

        allPendingItems.push(itemRecord);

        // Group by month
        const mKey = item.monthKey || 'other';
        const mLabel = item.rentMonth || 'General Pending';
        if (!monthsMap[mKey]) {
          monthsMap[mKey] = {
            monthKey: mKey,
            monthLabel: mLabel,
            totalAmount: 0,
            items: []
          };
        }
        monthsMap[mKey].totalAmount += Number(item.amount) || 0;
        monthsMap[mKey].items.push(itemRecord);
      });
    }
  });

  // 1. Sort peopleWithOutstanding strictly according to the time and date they hadn't paid the money for:
  // Earliest unpaid date/time (longest duration unpaid) at the top!
  peopleWithOutstanding.sort((a, b) => {
    if (a.oldestUnpaidTime !== b.oldestUnpaidTime) {
      return a.oldestUnpaidTime - b.oldestUnpaidTime;
    }
    return b.rawAmount - a.rawAmount;
  });

  // 2. Sort monthsList according to months (e.g. reverse chronological: October 2026, September 2026, August 2026, Admission):
  const monthsList = Object.values(monthsMap).sort((a, b) => {
    if (a.monthKey === 'admission') return 1;
    if (b.monthKey === 'admission') return -1;
    return b.monthKey.localeCompare(a.monthKey); // Latest month first
  });

  // Within each month, sort items by due date / days overdue
  monthsList.forEach(m => {
    m.items.sort((a, b) => (b.daysOverdue || 0) - (a.daysOverdue || 0));
  });

  return {
    totalPendingAmount,
    totalOutstandingAmount: totalPendingAmount,
    uniqueTenantsCount: peopleWithOutstanding.length,
    peopleWithOutstanding,
    monthsList,
    allPendingItems
  };
};

/**
 * Generate formatted text for sharing on WhatsApp or SMS
 */
export const generateDuesShareText = ({ tenantName, roomNo, duesData, pgName = 'Febeboo PG' }) => {
  if (!duesData || !duesData.items || duesData.items.length === 0) {
    return `Hello ${tenantName || 'Resident'}, you have no outstanding dues with ${pgName}. All clear! ✅`;
  }

  const lines = [
    `📋 *OUTSTANDING DUES STATEMENT*`,
    `🏢 *${pgName}*`,
    `👤 *Student:* ${tenantName || 'Resident'} (Room ${roomNo || 'N/A'})`,
    `📅 *Generated On:* ${formatDateDisplay(getTodayStr())}`,
    `--------------------------------`,
    `*TOTAL OUTSTANDING: ${formatCurrency(duesData.totalOutstanding)}*`,
    `--------------------------------`,
    `*Itemized Breakdown:*`
  ];

  duesData.items.forEach((item, index) => {
    const typeMeta = BILL_TYPES[item.type] || BILL_TYPES.custom;
    const ageText = item.isOverdue 
      ? `⚠️ Overdue by ${item.daysOverdue} day${item.daysOverdue !== 1 ? 's' : ''}`
      : `📅 Due: ${formatDateDisplay(item.dueDate)}`;
    
    let statusExtra = '';
    if (item.status === 'pay_later_approved' && item.payLaterApproval?.newDueDate) {
      statusExtra = `\n   ⏳ Pay Later Granted until ${formatDateDisplay(item.payLaterApproval.newDueDate)}`;
    } else if (item.status === 'pay_later_requested') {
      statusExtra = `\n   ⏳ Pay Later Requested (Pending Admin Approval)`;
    }

    lines.push(
      `${index + 1}. *${item.title}* — ${formatCurrency(item.amount)}\n   ${typeMeta.label} · ${ageText}${statusExtra}`
    );
  });

  lines.push(
    `--------------------------------`,
    `💡 *Note:* Please clear the dues at your earliest to avoid service interruption. You can pay directly through the Febeboo App or contact the management.`
  );

  return lines.join('\n');
};

/**
 * Generate HTML document for downloading/printing
 */
export const printOrDownloadDuesStatement = ({ tenantName, roomNo, studentId, duesData, pgName = 'Febeboo PG', adminName = 'Management' }) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow pop-ups to print or download the statement.');
    return;
  }

  const itemsHtml = duesData.items.map((item, idx) => {
    const typeMeta = BILL_TYPES[item.type] || BILL_TYPES.custom;
    return `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px 8px; font-size: 13px; color: #64748b;">${idx + 1}</td>
        <td style="padding: 12px 8px;">
          <div style="font-weight: 700; color: #0f172a; font-size: 14px;">${item.title}</div>
          <div style="font-size: 12px; color: #64748b;">${item.description || typeMeta.label}</div>
        </td>
        <td style="padding: 12px 8px; font-size: 13px; color: #334155;">${formatDateDisplay(item.originalDueDate || item.dueDate)}</td>
        <td style="padding: 12px 8px; font-size: 12px;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 6px; font-weight: 700; background: ${item.isOverdue ? '#fee2e2' : '#ecfeff'}; color: ${item.isOverdue ? '#dc2626' : '#0891b2'};">
            ${item.isOverdue ? `Overdue (${item.daysOverdue}d)` : 'Current'}
          </span>
        </td>
        <td style="padding: 12px 8px; text-align: right; font-weight: 800; font-size: 14px; color: #0f172a;">${formatCurrency(item.amount)}</td>
      </tr>
    `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Dues Statement - ${tenantName}</title>
        <style>
          body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; margin: 0; padding: 32px; background: #fff; color: #0f172a; }
          .container { max-width: 680px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; box-shadow: 0 4px 16px rgba(0,0,0,0.04); }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0284c7; padding-bottom: 16px; margin-bottom: 24px; }
          .total-box { background: #f8fafc; border: 1.5px solid #0284c7; border-radius: 12px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          th { text-align: left; padding: 8px; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 800; border-bottom: 2px solid #cbd5e1; }
          .footer { font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px; }
          @media print {
            body { padding: 0; }
            .container { border: none; box-shadow: none; padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div>
              <h1 style="margin: 0; font-size: 24px; color: #0284c7; font-weight: 900;">${pgName}</h1>
              <p style="margin: 4px 0 0; color: #64748b; font-size: 13px;">Official Outstanding Dues Statement</p>
            </div>
            <div style="text-align: right;">
              <p style="margin: 0; font-weight: 700; font-size: 14px;">Statement Date</p>
              <p style="margin: 2px 0 0; color: #64748b; font-size: 13px;">${formatDateDisplay(getTodayStr())}</p>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 13px;">
            <div>
              <span style="color: #64748b;">Resident Name:</span> <strong style="color: #0f172a;">${tenantName}</strong><br/>
              <span style="color: #64748b;">Room:</span> <strong style="color: #0f172a;">Room ${roomNo || 'N/A'}</strong>
            </div>
            <div style="text-align: right;">
              <span style="color: #64748b;">Student ID:</span> <strong>${studentId || '—'}</strong><br/>
              <span style="color: #64748b;">Status:</span> <strong style="color: ${duesData.hasOverdue ? '#dc2626' : '#16a34a'};">${duesData.hasOverdue ? 'Overdue Bills Pending' : 'Current'}</strong>
            </div>
          </div>

          <div class="total-box">
            <div>
              <div style="font-size: 12px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Total Balance Due</div>
              <div style="font-size: 11px; color: #94a3b8;">Includes all unpaid rent, electricity & charges</div>
            </div>
            <div style="font-size: 26px; font-weight: 900; color: #dc2626;">${formatCurrency(duesData.totalOutstanding)}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 30px;">#</th>
                <th>Bill Description</th>
                <th>Due Date</th>
                <th>Status</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="footer">
            <p style="margin: 0 0 4px;">This is a computer-generated statement issued by ${adminName} for ${pgName}.</p>
            <p style="margin: 0;">For queries, please contact management.</p>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 500);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
};
