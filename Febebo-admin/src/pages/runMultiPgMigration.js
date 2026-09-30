import { collection, query, where, getDocs, updateDoc, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const runMigration = async (adminId) => {
  if (!adminId) return alert('No admin logged in');
  if (!confirm('This will migrate your sub-PGs and existing data. Continue?')) return;
  
  try {
    let count = 0;
    
    // 1. Migrate Sub-PGs to top-level collection
    const subPgsSnap = await getDocs(collection(db, 'pg_owners', adminId, 'pgs'));
    for (const d of subPgsSnap.docs) {
      const data = d.data();
      // Set to top level pg_owners with the same document ID and auto-approve
      await setDoc(doc(db, 'pg_owners', d.id), { ...data, adminId: adminId, status: 'Approved' });
      // We could delete the old one, but let's keep it just in case, or delete it? Let's delete to avoid confusion.
      await deleteDoc(d.ref);
      count++;
    }

    const collectionsToMigrate = [
      'tenants', 'rooms', 'rent_receipts', 'staff', 'staff_tokens',
      'staff_attendance', 'visitors', 'leave_requests', 'complaints',
      'staff_requisitions', 'pg_applications', 'pg_inventory_master', 'pg_inventory_stock'
    ];

    for (const col of collectionsToMigrate) {
      const key = (col === 'staff_tokens' || col === 'staff_attendance') ? 'ownerUid' : 'adminId';
      const q = query(collection(db, col), where(key, '==', adminId));
      const snap = await getDocs(q);
      
      const batchPromises = snap.docs.map(d => {
        if (!d.data().pgId) {
          count++;
          return updateDoc(doc(db, col, d.id), { pgId: 'primary' });
        }
        return Promise.resolve();
      });
      await Promise.all(batchPromises);
    }
    
    alert(`Migration completed! Updated ${count} records.`);
  } catch (err) {
    console.error(err);
    alert('Migration failed: ' + err.message);
  }
};
