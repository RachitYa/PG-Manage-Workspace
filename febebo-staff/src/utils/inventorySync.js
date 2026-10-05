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
 * Synchronizes purchased or requested items directly into pg_inventory_master under category: 'kitchen'
 */
export const syncItemsToKitchenInventory = async (db, { adminId, pgId = 'primary', items = [], source = 'Purchase', actorName = 'Staff' }) => {
  if (!db || !adminId || !items || !items.length) return;

  try {
    // 1. Fetch all existing kitchen inventory items for this PG admin
    const q = query(
      collection(db, 'pg_inventory_master'),
      where('adminId', '==', adminId),
      where('category', '==', 'kitchen')
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

      // Case-insensitive name match
      const matched = existingList.find(ex => (ex.name || '').trim().toLowerCase() === rawName.toLowerCase());

      if (matched) {
        const currentQty = parseFloat(matched.totalQty) || 0;
        const newQty = Math.round((currentQty + parsedQty) * 100) / 100;
        await updateDoc(doc(db, 'pg_inventory_master', matched.docId), {
          totalQty: newQty,
          unit: unit || matched.unit || 'kg',
          lastUpdated: new Date().toISOString(),
          lastUpdatedBy: actorName,
          lastSource: source
        });
        matched.totalQty = newQty;
      } else {
        const newDocRef = await addDoc(collection(db, 'pg_inventory_master'), {
          adminId,
          pgId: pgId || 'primary',
          category: 'kitchen',
          name: rawName,
          totalQty: parsedQty,
          unit: unit,
          icon: 'kitchen',
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          lastUpdatedBy: actorName,
          lastSource: source
        });
        existingList.push({
          docId: newDocRef.id,
          name: rawName,
          totalQty: parsedQty,
          unit,
          adminId,
          category: 'kitchen'
        });
      }
    }
  } catch (err) {
    console.error('Error syncing items to kitchen inventory in Firestore:', err);
  }
};
