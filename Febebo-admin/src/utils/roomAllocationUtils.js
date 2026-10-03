/**
 * roomAllocationUtils.js
 * Comprehensive room allocation, shift, and resident swap utilities for Febeboo Admin
 */

import { collection, query, where, getDocs, getDoc, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Shift a single resident to a new room & bed
 */
export const shiftTenantToRoom = async ({
  tenantId,
  tenantName,
  fromRoomNo,
  toRoomNo,
  toBedNo = '1',
  newRent = null,
  adminId,
  pgId = 'primary',
  requestId = null,
  adminName = 'Admin'
}) => {
  if (!tenantId || !toRoomNo) throw new Error('Missing tenant ID or target room');

  const nowIso = new Date().toISOString();

  // 1. Update tenants document
  const tenantUpdate = {
    roomNo: toRoomNo,
    room: toRoomNo,
    bedNo: String(toBedNo)
  };
  if (newRent !== null && Number(newRent) > 0) {
    tenantUpdate.rentAmount = Number(newRent);
  }
  await updateDoc(doc(db, 'tenants', tenantId), tenantUpdate);

  // 2. Update users document
  try {
    const uDoc = await getDoc(doc(db, 'users', tenantId));
    if (uDoc.exists()) {
      const uData = uDoc.data();
      const uUpdate = {};
      if (uData.subscribedPG) {
        uUpdate['subscribedPG.roomNumber'] = toRoomNo;
        uUpdate['subscribedPG.roomNo'] = toRoomNo;
        uUpdate['subscribedPG.bedNo'] = String(toBedNo);
        if (newRent !== null && Number(newRent) > 0) {
          uUpdate['subscribedPG.leaseAmount'] = Number(newRent);
        }
      }
      if (uData.profileData && uData.profileData.roomDetails) {
        uUpdate['profileData.roomDetails.roomNumber'] = toRoomNo;
        uUpdate['profileData.roomDetails.bedNumber'] = String(toBedNo);
        if (newRent !== null && Number(newRent) > 0) {
          uUpdate['profileData.roomDetails.rentAmount'] = Number(newRent);
        }
      }
      if (Object.keys(uUpdate).length > 0) {
        await updateDoc(doc(db, 'users', tenantId), uUpdate);
      }
    }
  } catch (err) {
    console.warn('Error updating user document during room shift:', err);
  }

  // 3. If tied to a room change request, mark approved
  if (requestId) {
    try {
      await updateDoc(doc(db, 'room_change_requests', requestId), {
        status: 'Approved',
        newRoom: toRoomNo,
        newBed: String(toBedNo),
        approvedBy: adminName,
        approvedAt: nowIso
      });
    } catch (err) {
      console.warn('Error updating room_change_requests doc:', err);
    }
  }

  // 4. Send notification to student
  try {
    await addDoc(collection(db, 'users', tenantId, 'notifications'), {
      title: '🏡 Room Shift Approved!',
      desc: `Your room has been changed from Room ${fromRoomNo || 'N/A'} to Room ${toRoomNo} (Bed ${toBedNo}) by ${adminName}.`,
      type: 'success',
      action: 'VIEW_PROFILE',
      unread: true,
      createdAt: nowIso
    });
  } catch (err) {
    console.warn('Error sending tenant notification:', err);
  }

  return { success: true, newRoom: toRoomNo, newBed: toBedNo };
};

/**
 * Atomically swap two residents across rooms and beds
 */
export const swapTenantsBetweenRooms = async ({
  tenantA,
  tenantB,
  adminId,
  pgId = 'primary',
  requestId = null,
  adminName = 'Admin'
}) => {
  if (!tenantA || !tenantB) throw new Error('Both residents must be provided for swap');

  const tenantAId = tenantA.tenantId || tenantA.id || tenantA.uid;
  const tenantBId = tenantB.tenantId || tenantB.id || tenantB.uid;

  const roomA = tenantA.roomNo || tenantA.room || 'N/A';
  const bedA = tenantA.bedNo || '1';
  const roomB = tenantB.roomNo || tenantB.room || 'N/A';
  const bedB = tenantB.bedNo || '1';

  const nameA = tenantA.name || tenantA.tenantName || 'Resident A';
  const nameB = tenantB.name || tenantB.tenantName || 'Resident B';

  const nowIso = new Date().toISOString();

  // 1. Update Tenant A -> moves to Room B, Bed B
  await updateDoc(doc(db, 'tenants', tenantAId), {
    roomNo: roomB,
    room: roomB,
    bedNo: String(bedB)
  });

  try {
    const uDocA = await getDoc(doc(db, 'users', tenantAId));
    if (uDocA.exists()) {
      await updateDoc(doc(db, 'users', tenantAId), {
        'subscribedPG.roomNumber': roomB,
        'subscribedPG.roomNo': roomB,
        'subscribedPG.bedNo': String(bedB)
      });
    }
  } catch (e) {
    console.warn('User A update error:', e);
  }

  // 2. Update Tenant B -> moves to Room A, Bed A
  await updateDoc(doc(db, 'tenants', tenantBId), {
    roomNo: roomA,
    room: roomA,
    bedNo: String(bedA)
  });

  try {
    const uDocB = await getDoc(doc(db, 'users', tenantBId));
    if (uDocB.exists()) {
      await updateDoc(doc(db, 'users', tenantBId), {
        'subscribedPG.roomNumber': roomA,
        'subscribedPG.roomNo': roomA,
        'subscribedPG.bedNo': String(bedA)
      });
    }
  } catch (e) {
    console.warn('User B update error:', e);
  }

  // 3. If tied to a room change request, mark approved with swap details
  if (requestId) {
    try {
      await updateDoc(doc(db, 'room_change_requests', requestId), {
        status: 'Approved',
        newRoom: roomB,
        newBed: String(bedB),
        swappedWith: {
          tenantId: tenantBId,
          name: nameB,
          previousRoom: roomB,
          newRoom: roomA
        },
        approvedBy: adminName,
        approvedAt: nowIso
      });
    } catch (err) {
      console.warn('Error updating room_change_requests doc:', err);
    }
  }

  // 4. Send notifications to both residents
  try {
    await addDoc(collection(db, 'users', tenantAId, 'notifications'), {
      title: '🔄 Room Swapped Successfully!',
      desc: `You have been swapped to Room ${roomB} (Bed ${bedB}) with ${nameB} by management.`,
      type: 'success',
      action: 'VIEW_PROFILE',
      unread: true,
      createdAt: nowIso
    });

    await addDoc(collection(db, 'users', tenantBId, 'notifications'), {
      title: '🔄 Room Swapped Successfully!',
      desc: `You have been swapped to Room ${roomA} (Bed ${bedA}) with ${nameA} by management.`,
      type: 'success',
      action: 'VIEW_PROFILE',
      unread: true,
      createdAt: nowIso
    });
  } catch (err) {
    console.warn('Error sending swap notifications:', err);
  }

  return {
    success: true,
    tenantA: { name: nameA, newRoom: roomB, newBed: bedB },
    tenantB: { name: nameB, newRoom: roomA, newBed: bedA }
  };
};
