import { doc, getDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * fetchAllAdminPgs
 * Exhaustively discovers all PGs owned by or associated with an admin across all
 * schemas: primary doc (pg_owners/{uid}), sub-collection (pg_owners/{uid}/pgs),
 * top-level pg_owners (adminId, ownerUid, userId, email), and pg_profiles.
 */
export const fetchAllAdminPgs = async (userOrUid) => {
  const uid = typeof userOrUid === 'string' ? userOrUid : userOrUid?.uid;
  const user = typeof userOrUid === 'object' ? userOrUid : { uid };
  if (!uid) return [];
  const pgsMap = new Map();

  const addPg = (id, data, source = 'main') => {
    if (!data) return;
    const effectiveId = (id === uid || id === 'primary') ? 'primary' : id;
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
      if ((!existing.pgName || existing.pgName === 'My PG' || existing.pgName === 'PG Property') && pgName) {
        existing.pgName = pgName;
      }
      if (!existing.pgType && pgType) existing.pgType = pgType;
      if (!existing.location && location) existing.location = location;
    }
  };

  try {
    // 1. Primary PG from pg_owners/{uid}
    const primarySnap = await getDoc(doc(db, 'pg_owners', uid)).catch(() => null);
    if (primarySnap?.exists()) {
      addPg('primary', primarySnap.data(), 'primary');
    }
  } catch (e) {}

  try {
    // 2. PG from pg_profiles/{uid}
    const profileSnap = await getDoc(doc(db, 'pg_profiles', uid)).catch(() => null);
    if (profileSnap?.exists()) {
      addPg('primary', profileSnap.data(), 'profile');
    }
  } catch (e) {}

  // Parallel fetch from multiple collections & query keys
  const promises = [
    // Top-level pg_owners with adminId == uid
    getDocs(query(collection(db, 'pg_owners'), where('adminId', '==', uid))).catch(() => ({ docs: [] })),
    // Top-level pg_owners with ownerUid == uid
    getDocs(query(collection(db, 'pg_owners'), where('ownerUid', '==', uid))).catch(() => ({ docs: [] })),
    // Top-level pg_owners with userId == uid
    getDocs(query(collection(db, 'pg_owners'), where('userId', '==', uid))).catch(() => ({ docs: [] })),
    // Sub-collection pg_owners/{uid}/pgs (legacy multi-PG location)
    getDocs(collection(db, 'pg_owners', uid, 'pgs')).catch(() => ({ docs: [] })),
    // Top-level pg_profiles with adminId == uid
    getDocs(query(collection(db, 'pg_profiles'), where('adminId', '==', uid))).catch(() => ({ docs: [] })),
    // Top-level pg_profiles with ownerUid == uid
    getDocs(query(collection(db, 'pg_profiles'), where('ownerUid', '==', uid))).catch(() => ({ docs: [] }))
  ];

  if (user?.email) {
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

  // Guarantee: Primary/Main PG must ALWAYS be present in the switcher!
  if (!pgsMap.has('primary')) {
    let mainPgName = 'Main Branch';
    try {
      const adminSnap = await getDoc(doc(db, 'admins', uid)).catch(() => null);
      if (adminSnap?.exists() && adminSnap.data().pgName) {
        mainPgName = adminSnap.data().pgName;
      }
    } catch (e) {}
    pgsMap.set('primary', {
      id: 'primary',
      actualDocId: uid,
      pgName: mainPgName,
      pgType: 'Main',
      status: 'Active',
      location: '',
      source: 'primary',
      raw: {}
    });
  }

  const pgs = Array.from(pgsMap.values());
  return pgs;
};
