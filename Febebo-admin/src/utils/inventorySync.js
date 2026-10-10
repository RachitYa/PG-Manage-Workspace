import { collection, query, where, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';

/**
 * Checks if a purchase category or list of items is related to the kitchen/mess.
 */
export const isKitchenRelatedCategory = (category = '', items = []) => {
  const cat = (category || '').trim().toLowerCase();
  const kitchenCategories = ['groceries', 'vegetables', 'dairy', 'water', 'kitchen', 'food', 'provisions', 'fruits'];
  if (kitchenCategories.includes(cat)) {
    return true;
  }

  const foodKeywords = [
    'rice', 'aata', 'flour', 'dal', 'oil', 'masala', 'mirch', 'haldi', 'salt', 'sugar',
    'tea', 'milk', 'paneer', 'dahi', 'curd', 'ghee', 'potato', 'aalu', 'onion', 'pyaaz',
    'tomato', 'veggie', 'vegetable', 'besan', 'poha', 'butter', 'bread', 'gas', 'cylinder',
    'spice', 'ro water', 'camper', 'cheese', 'paneer', 'sooji', 'maida', 'rajma', 'chana'
  ];

  return items.some(it => {
    const name = (it.item || it.name || it.itemName || '').trim().toLowerCase();
    return foodKeywords.some(k => name.includes(k));
  });
};

/**
 * Calculates item purchase total considering units (e.g. grams/ml conversion against standard per-kg/per-litre rates)
 */
export const calculateItemTotal = (qty, unit, rate) => {
  const q = parseFloat(qty) || 0;
  const r = parseFloat(rate) || 0;
  if (q <= 0 || r <= 0) return 0;

  const u = String(unit || '').toLowerCase().trim();
  if (u === 'g' || u === 'gm' || u === 'gram' || u === 'grams') {
    // Rate is per kg (e.g. 500 g at ₹30/kg = 0.5 * 30 = ₹15)
    return Math.round(((q / 1000) * r) * 100) / 100;
  }
  if (u === 'ml' || u === 'millilitre' || u === 'milliliter') {
    // Rate is per litre (e.g. 500 ml at ₹60/L = 0.5 * 60 = ₹30)
    return Math.round(((q / 1000) * r) * 100) / 100;
  }
  return Math.round((q * r) * 100) / 100;
};

/**
 * Synchronizes purchased or requested items directly into pg_inventory_master
 */
export const syncItemsToKitchenInventory = async (db, {
  adminId,
  pgId = 'primary',
  items = [],
  source = 'Purchase',
  actorName = 'Admin',
  vendorName = '',
  date = null,
  monthKey = null,
  category = 'kitchen'
}) => {
  if (!db || !adminId || !items || !items.length) return;

  const txnDate = date || new Date().toISOString();
  const currentMonthKey = monthKey || (typeof txnDate === 'string' ? txnDate.slice(0, 7) : new Date().toISOString().slice(0, 7));

  try {
    // 1. Fetch all existing inventory items for this PG admin & category
    const q = query(
      collection(db, 'pg_inventory_master'),
      where('adminId', '==', adminId),
      where('category', '==', category || 'kitchen')
    );
    const snap = await getDocs(q);
    const existingList = snap.docs.map(d => ({ docId: d.id, ...d.data() }));

    // 2. Process each item
    for (const item of items) {
      const rawName = (item.item || item.name || item.itemName || '').trim();
      if (!rawName) continue;

      const rawQty = item.qty !== undefined ? item.qty : (item.quantity !== undefined ? item.quantity : 1);
      const parsedQty = parseFloat(String(rawQty).replace(/[^0-9.]/g, '')) || 1;
      const unit = (item.unit || String(rawQty).replace(/[0-9.]/g, '').trim() || 'kg').toLowerCase();
      const itemRate = parseFloat(item.rate) || 0;
      const itemPrice = parseFloat(item.price) || calculateItemTotal(parsedQty, unit, itemRate);

      const purchaseEntry = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        date: txnDate,
        monthKey: currentMonthKey,
        qty: parsedQty,
        unit: unit,
        rate: itemRate,
        price: itemPrice,
        purchasedBy: actorName || 'Admin',
        vendorName: vendorName || '',
        source: source || 'Purchase',
        createdAt: new Date().toISOString()
      };

      // Case-insensitive name match
      const matched = existingList.find(ex => (ex.name || '').trim().toLowerCase() === rawName.toLowerCase());

      if (matched) {
        const currentQty = parseFloat(matched.totalQty) || 0;
        const matchedUnit = (matched.unit || unit || 'kg').toLowerCase();

        // Normalize quantity if units differ between inventory and purchase
        let normalizedIncomingQty = parsedQty;
        if ((unit === 'g' || unit === 'gm') && (matchedUnit === 'kg')) {
          normalizedIncomingQty = parsedQty / 1000;
        } else if ((unit === 'kg') && (matchedUnit === 'g' || matchedUnit === 'gm')) {
          normalizedIncomingQty = parsedQty * 1000;
        } else if ((unit === 'ml') && (matchedUnit === 'litre' || matchedUnit === 'l')) {
          normalizedIncomingQty = parsedQty / 1000;
        } else if ((unit === 'litre' || unit === 'l') && (matchedUnit === 'ml')) {
          normalizedIncomingQty = parsedQty * 1000;
        }

        const newQty = Math.round((currentQty + normalizedIncomingQty) * 100) / 100;
        const existingHistory = Array.isArray(matched.purchaseHistory) ? matched.purchaseHistory : [];
        const updatedHistory = [purchaseEntry, ...existingHistory];

        await updateDoc(doc(db, 'pg_inventory_master', matched.docId), {
          totalQty: newQty,
          unit: matchedUnit,
          lastUpdated: new Date().toISOString(),
          lastUpdatedBy: actorName,
          lastSource: source,
          lastPurchasedDate: txnDate,
          lastVendorName: vendorName || matched.lastVendorName || '',
          monthKey: currentMonthKey,
          purchaseHistory: updatedHistory
        });
        matched.totalQty = newQty;
        matched.purchaseHistory = updatedHistory;
      } else {
        const newDocRef = await addDoc(collection(db, 'pg_inventory_master'), {
          adminId,
          pgId: pgId || 'primary',
          category: category || 'kitchen',
          name: rawName,
          totalQty: parsedQty,
          unit: unit,
          icon: category === 'kitchen' ? 'kitchen' : 'inventory_2',
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          lastUpdatedBy: actorName,
          lastSource: source,
          lastPurchasedDate: txnDate,
          lastVendorName: vendorName || '',
          monthKey: currentMonthKey,
          purchaseHistory: [purchaseEntry]
        });
        existingList.push({
          docId: newDocRef.id,
          name: rawName,
          totalQty: parsedQty,
          unit,
          adminId,
          category: category || 'kitchen',
          purchaseHistory: [purchaseEntry]
        });
      }
    }
  } catch (err) {
    console.error('Error syncing items to kitchen inventory in Firestore:', err);
  }
};
