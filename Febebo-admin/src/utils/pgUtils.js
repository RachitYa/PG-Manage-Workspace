import { doc, getDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * fetchAllAdminPgs
 * Exhaustively discovers all PGs owned by or associated with an admin across all
 * schemas: primary doc (pg_owners/{uid}), sub-collection (pg_owners/{uid}/pgs),
 * top-level pg_owners (adminId, ownerUid, userId, email), and pg_profiles.
 */
export const fetchAllAdminPgs = async (user) => {
  if (!user?.uid) return [];
  const pgsMap = new Map();

  const addPg = (id, data, source = 'main') => {
    if (!data) return;
    const effectiveId = (id === user.uid || id === 'primary') ? 'primary' : id;
    const pgName = data.pgName || data.name || data.fullName || 'PG Property';
    const pgType = data.pgType || data.type || '';
    const status = data.status || 'Active';
    const location = data.location?.city || data.city || data.location?.address || '';

    // If not already in map or if replacing placeholder
    if (!pgsMap.has(effectiveId)) {
      pgsMap.set(effectiveId, {
        id: effectiveId,
        actualDocId: id,
        pgName,
        pgType,
        status,
        location,
        source,
        raw: data
      });
    } else {
      // Merge extra details if available
      const existing = pgsMap.get(effectiveId);
      if ((!existing.pgName || existing.pgName === 'My PG') && pgName) {
        existing.pgName = pgName;
      }
      if (!existing.pgType && pgType) existing.pgType = pgType;
      if (!existing.location && location) existing.location = location;
    }
  };

  try {
    // 1. Primary PG from pg_owners/{user.uid}
    const primarySnap = await getDoc(doc(db, 'pg_owners', user.uid)).catch(() => null);
    if (primarySnap?.exists()) {
      addPg('primary', primarySnap.data(), 'primary');
    }
  } catch (e) {}

  try {
    // 2. PG from pg_profiles/{user.uid}
    const profileSnap = await getDoc(doc(db, 'pg_profiles', user.uid)).catch(() => null);
    if (profileSnap?.exists()) {
      addPg('primary', profileSnap.data(), 'profile');
    }
  } catch (e) {}

  // Parallel fetch from multiple collections & query keys
  const promises = [
    // Top-level pg_owners with adminId == user.uid
    getDocs(query(collection(db, 'pg_owners'), where('adminId', '==', user.uid))).catch(() => ({ docs: [] })),
    // Top-level pg_owners with ownerUid == user.uid
    getDocs(query(collection(db, 'pg_owners'), where('ownerUid', '==', user.uid))).catch(() => ({ docs: [] })),
    // Top-level pg_owners with userId == user.uid
    getDocs(query(collection(db, 'pg_owners'), where('userId', '==', user.uid))).catch(() => ({ docs: [] })),
    // Sub-collection pg_owners/{uid}/pgs (legacy multi-PG location)
    getDocs(collection(db, 'pg_owners', user.uid, 'pgs')).catch(() => ({ docs: [] })),
    // Top-level pg_profiles with adminId == user.uid
    getDocs(query(collection(db, 'pg_profiles'), where('adminId', '==', user.uid))).catch(() => ({ docs: [] })),
    // Top-level pg_profiles with ownerUid == user.uid
    getDocs(query(collection(db, 'pg_profiles'), where('ownerUid', '==', user.uid))).catch(() => ({ docs: [] }))
  ];

  if (user.email) {
    promises.push(
      getDocs(query(collection(db, 'pg_owners'), where('email', '==', user.email))).catch(() => ({ docs: [] })),
      getDocs(query(collection(db, 'pg_profiles'), where('email', '==', user.email))).catch(() => ({ docs: [] }))
    );
  }

  const results = await Promise.all(promises);
  results.forEach(snap => {
    snap.docs?.forEach(d => {
      addPg(d.id, d.data(), 'sub');
    });
  });

  const pgs = Array.from(pgsMap.values());
  if (pgs.length === 0) {
    pgs.push({ id: 'primary', pgName: 'My PG', pgType: '', status: 'Active', location: '' });
  }

  return pgs;
};
