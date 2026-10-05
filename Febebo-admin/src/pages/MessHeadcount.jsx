import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection, query, where, getDocs, getDoc,
  doc, setDoc, updateDoc, addDoc, onSnapshot,
  orderBy, limit
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { COMMON_PG_DISHES, DISH_CATEGORIES, getDishPresetImage, DEFAULT_FOOD_PLACEHOLDER } from '../data/commonFoodDishes';
import { isStudentOnVacation, getStudentActiveVacation, formatDateDisplay, isMealPausedOnDate } from '../utils/vacationUtils';

// ── Image Compressor Helper ───────────────────────────────────────────────
const compressImage = (file, maxWidth = 750) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.65));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// ── Default Weekly Menu Template ──────────────────────────────────────────
const DEFAULT_MENU = {
  Monday: {
    Breakfast: 'Poha, Jalebi, Chai / Masala Tea',
    Lunch: 'Rajma Chawal, Roti, Salad',
    Snacks: 'Samosa, Chai / Masala Tea',
    Dinner: 'Paneer Butter Masala, Roti, Dal'
  },
  Tuesday: {
    Breakfast: 'Aloo Paratha, Curd, Chai / Masala Tea',
    Lunch: 'Kadi Pakoda, Steamed Rice, Papad',
    Snacks: 'Veg Puff, Chai / Masala Tea',
    Dinner: 'Mix Veg, Arhar Dal, Tawa Roti'
  },
  Wednesday: {
    Breakfast: 'Idli, Sambhar, Coconut Chutney, Chai / Masala Tea',
    Lunch: 'Chole Bhature, Boondi Raita',
    Snacks: 'Bhel Puri, Chai / Masala Tea',
    Dinner: 'Dal Makhani, Jeera Rice, Butter Roti'
  },
  Thursday: {
    Breakfast: 'Bread Omelette / Veg Sandwich, Chai / Masala Tea',
    Lunch: 'Dal Fry, Rice, Seasonal Sabzi',
    Snacks: 'Biscuits, Chai / Masala Tea',
    Dinner: 'Egg Curry / Kofta Curry, Roti, Rice'
  },
  Friday: {
    Breakfast: 'Upma, Coconut Chutney, Chai / Masala Tea',
    Lunch: 'Veg Biryani, Raita, Salad',
    Snacks: 'Bhel Puri, Chai / Masala Tea',
    Dinner: 'Matar Paneer, Tawa Roti, Dal Tadka'
  },
  Saturday: {
    Breakfast: 'Puri Sabji, Halwa, Chai / Masala Tea',
    Lunch: 'Moong Dal, Jeera Rice, Bhindi Masala',
    Snacks: 'Mix Pakoda, Chai / Masala Tea',
    Dinner: 'Aloo Gobi, Dal Fry, Phulka'
  },
  Sunday: {
    Breakfast: 'Masala Dosa, Sambhar, Chutney, Chai / Masala Tea',
    Lunch: 'Special Thali (Paneer/Chicken, Sweet)',
    Snacks: 'Pastry / Cake, Filter Coffee',
    Dinner: 'Shahi Paneer, Pulao, Butter Naan'
  }
};

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const QUICK_FOOD_TAGS = [
  'Chai / Masala Tea', 'Filter Coffee', 'Paneer Butter Masala', 'Dal Makhani', 'Rajma Chawal', 'Chole Bhature',
  'Aloo Paratha', 'Poori Sabji', 'Veg Biryani', 'Kadi Pakoda', 'Butter Naan', 'Bhindi Masala',
  'Mix Veg', 'Dal Tadka', 'Gulab Jamun', 'Boondi Raita', 'Masala Dosa', 'Poha', 'Upma'
];

function getTodayStr() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getDayName(dateStr) {
  const [yyyy, mm, dd] = dateStr.split('-').map(Number);
  const d = new Date(yyyy, mm - 1, dd);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[d.getDay()];
}

export default function MessHeadcount() {
  const navigate = useNavigate();
  const { user, activePgId } = useAuth();
  const fileInputRef = useRef(null);

  // Active top view: 'attendance' (just like Cook app) or 'menu' (edit/change menu)
  const [activeMainTab, setActiveMainTab] = useState('attendance'); 
  const [selectedDate, setSelectedDate] = useState(getTodayStr());

  // Meal selection tab: 'breakfast' | 'lunch' | 'snacks' | 'dinner'
  const [mealTab, setMealTab] = useState(() => {
    const hr = new Date().getHours();
    if (hr < 11) return 'breakfast';
    if (hr < 16) return 'lunch';
    if (hr < 19) return 'snacks';
    return 'dinner';
  });

  // Selected filter on headcount stats: 'all' | 'eaten' | 'notEaten' | 'pack' | 'extra' | 'requested'
  const [selectedStatFilter, setSelectedStatFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Data states
  const [pgDetails, setPgDetails] = useState(null);
  const [weeklyFoodMenu, setWeeklyFoodMenu] = useState(DEFAULT_MENU);
  const [foodMenuImages, setFoodMenuImages] = useState({});
  const [rawTenants, setRawTenants] = useState([]);
  const [mealStatusLogs, setMealStatusLogs] = useState([]);
  const [eatenData, setEatenData] = useState({});
  const [vacations, setVacations] = useState([]);
  const [pausedMeals, setPausedMeals] = useState({});
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  // Menu editing state
  const [selectedMenuDay, setSelectedMenuDay] = useState(() => getDayName(getTodayStr()));
  const [editingMeal, setEditingMeal] = useState(null); // { day, meal }
  const [editValue, setEditValue] = useState('');
  const [editImage, setEditImage] = useState(null);
  const [savingMenu, setSavingMenu] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [foodItemImages, setFoodItemImages] = useState({});
  const [editItems, setEditItems] = useState([]); // [{ id, name, image }]
  const [customItemInput, setCustomItemInput] = useState('');
  const [presetSearch, setPresetSearch] = useState('');
  const [presetCategory, setPresetCategory] = useState('All');
  const [activePhotoItemIndex, setActivePhotoItemIndex] = useState(null);
  const [showItemPhotoPicker, setShowItemPhotoPicker] = useState(false);

  // Menu Edit History & Last Editor state
  const [lastMenuEdit, setLastMenuEdit] = useState(null);
  const [showMenuHistoryModal, setShowMenuHistoryModal] = useState(false);
  const [menuHistoryList, setMenuHistoryList] = useState([]);
  const [loadingMenuHistory, setLoadingMenuHistory] = useState(false);

  // Broadcast modal state
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastMeal, setBroadcastMeal] = useState('Lunch');
  const [broadcastTarget, setBroadcastTarget] = useState('all');
  const [broadcastMsg, setBroadcastMsg] = useState('Fresh hot meal is ready! Please head to the mess hall. 🍽️');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  // Determine active PG document ID
  const pgDocId = useMemo(() => {
    if (!activePgId || activePgId === 'primary') return user?.uid;
    return activePgId;
  }, [activePgId, user?.uid]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // ── Toggle Meal Pause for Today / Selected Date ──
  const handleToggleMealPause = async (targetMealKey) => {
    if (!pgDocId) return;
    const mKey = targetMealKey.toLowerCase();
    const dateKey = selectedDate;
    const currentlyPaused = !!(pausedMeals?.[dateKey]?.[mKey]);
    const nextVal = !currentlyPaused;

    const updatedPausedMeals = {
      ...pausedMeals,
      [dateKey]: {
        ...(pausedMeals?.[dateKey] || {}),
        [mKey]: nextVal
      }
    };
    setPausedMeals(updatedPausedMeals);

    try {
      await setDoc(doc(db, 'pg_owners', pgDocId), {
        pausedMeals: updatedPausedMeals
      }, { merge: true });

      await setDoc(doc(db, 'mess_headcount', `${pgDocId}_${dateKey}`), {
        pausedMeals: updatedPausedMeals[dateKey]
      }, { merge: true });

      showToast(`${targetMealKey.toUpperCase()} is now ${nextVal ? 'PAUSED ⏸️' : 'RESUMED ▶️'} for ${dateKey}!`);
    } catch (err) {
      console.error('Failed to toggle meal pause:', err);
      showToast('Error updating meal pause state');
    }
  };

  // ── 1. Listen to PG Owner Doc (Name, Capacity, Food Menu, Food Photos, Last Edit) ──────
  useEffect(() => {
    if (!pgDocId) return;
    const unsub = onSnapshot(doc(db, 'pg_owners', pgDocId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setPgDetails(data);
        if (data.foodMenu && Object.keys(data.foodMenu).length > 0) {
          setWeeklyFoodMenu(data.foodMenu);
        }
        if (data.foodMenuImages) {
          setFoodMenuImages(data.foodMenuImages);
        } else if (data.foodImages) {
          setFoodMenuImages(data.foodImages);
        }
        if (data.foodItemImages) {
          setFoodItemImages(data.foodItemImages);
        }
        if (data.lastMenuEdit) {
          setLastMenuEdit(data.lastMenuEdit);
        }
        if (data.pausedMeals) {
          setPausedMeals(data.pausedMeals);
        }
      }
    }, (err) => console.error('PG details error:', err));
    return () => unsub();
  }, [pgDocId]);

  const fetchMenuHistory = async () => {
    if (!pgDocId) return;
    setLoadingMenuHistory(true);
    try {
      const qHistory = query(
        collection(db, 'pg_owners', pgDocId, 'food_menu_history'),
        orderBy('editedAt', 'desc'),
        limit(50)
      );
      const snap = await getDocs(qHistory);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMenuHistoryList(list);
    } catch (err) {
      console.warn('Ordered history fetch failed, falling back client-side sort:', err);
      try {
        const snap = await getDocs(collection(db, 'pg_owners', pgDocId, 'food_menu_history'));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => new Date(b.editedAt || 0) - new Date(a.editedAt || 0));
        setMenuHistoryList(list);
      } catch (e2) {
        console.error('Fallback history fetch failed:', e2);
      }
    } finally {
      setLoadingMenuHistory(false);
    }
  };

  // ── 2. Listen to Tenants (Filter by PG) ─────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) return;
    setLoading(true);

    const matchesPg = (t) => {
      if (!activePgId || activePgId === 'primary') {
        return !t.pgId || t.pgId === 'primary' || t.pgId === user.uid;
      }
      return t.pgId === activePgId;
    };

    const qTenants = query(collection(db, 'tenants'), where('adminId', '==', user.uid));
    const unsub = onSnapshot(qTenants, async (snap) => {
      const raw = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const current = raw.filter(t => {
        const s = t.status;
        return matchesPg(t) && (s === 'Approved' || s === 'Current User' || !s);
      });

      // Enrich with users collection for room number, bed, profile photo
      const enriched = await Promise.all(current.map(async (t) => {
        try {
          const uid = t.tenantId || t.id;
          if (uid) {
            const uSnap = await getDoc(doc(db, 'users', uid));
            if (uSnap.exists()) {
              const u = uSnap.data();
              if (!t.name || t.name === 'Tenant') t.name = u.name || u.displayName || t.name;
              if (!t.roomNo) t.roomNo = u.subscribedPG?.roomNo || u.profileData?.roomDetails?.roomNumber || '';
              if (!t.bedNo)  t.bedNo  = u.subscribedPG?.bedNo || u.profileData?.roomDetails?.bedNumber || '';
              if (!t.phone)  t.phone  = u.phone || u.phoneNumber || '';
              t.image = u.photoURL || u.kyc?.profilePhoto || null;
            }
          }
        } catch (_) {}
        return t;
      }));

      setRawTenants(enriched);
      setLoading(false);
    }, (err) => {
      console.error('Tenants fetch error:', err);
      setLoading(false);
    });

    return () => unsub();
  }, [user?.uid, activePgId]);

  // ── 3. Listen to Meal Status collection for selectedDate ───────────────────
  useEffect(() => {
    if (!user?.uid) return;
    const qMeal = query(
      collection(db, 'meal_status'),
      where('adminId', '==', user.uid),
      where('date', '==', selectedDate)
    );
    const unsub = onSnapshot(qMeal, (snap) => {
      setMealStatusLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error('Meal status error:', err));
    return () => unsub();
  }, [user?.uid, selectedDate]);

  // ── 4. Listen to mess_headcount doc for selectedDate (Eaten records) ────────
  useEffect(() => {
    if (!pgDocId) return;
    const docRef = doc(db, 'mess_headcount', `${pgDocId}_${selectedDate}`);
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setEatenData(docSnap.data() || {});
      } else {
        setEatenData({});
      }
    }, (err) => console.error('mess_headcount error:', err));
    return () => unsub();
  }, [pgDocId, selectedDate]);

  // ── 4b. Listen to food_vacations collection for active leaves ────────
  useEffect(() => {
    if (!user?.uid) return;
    const qVac = query(
      collection(db, 'food_vacations'),
      where('adminId', '==', user.uid),
      where('status', 'in', ['active', 'shortened'])
    );
    const unsub = onSnapshot(qVac, (snap) => {
      setVacations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error('MessHeadcount food_vacations error:', err));
    return () => unsub();
  }, [user?.uid]);

  // ── 5. Build Unified Student Meal Attendance List ──────────────────────────
  const students = useMemo(() => {
    return rawTenants.map(t => {
      const mealLog = mealStatusLogs.find(m => m.tenantId === t.id);
      const isEatenB = !!eatenData[`${t.id}_breakfast_eaten`];
      const isEatenL = !!eatenData[`${t.id}_lunch_eaten`];
      const isEatenS = !!eatenData[`${t.id}_snacks_eaten`];
      const isEatenD = !!eatenData[`${t.id}_dinner_eaten`];

      const isVacB = isStudentOnVacation(vacations, t.id, selectedDate, 'breakfast') || isMealPausedOnDate(t.foodVacation, selectedDate, 'breakfast');
      const isVacL = isStudentOnVacation(vacations, t.id, selectedDate, 'lunch') || isMealPausedOnDate(t.foodVacation, selectedDate, 'lunch');
      const isVacS = isStudentOnVacation(vacations, t.id, selectedDate, 'snacks') || isMealPausedOnDate(t.foodVacation, selectedDate, 'snacks');
      const isVacD = isStudentOnVacation(vacations, t.id, selectedDate, 'dinner') || isMealPausedOnDate(t.foodVacation, selectedDate, 'dinner');

      const currentVac = getStudentActiveVacation(vacations, t.id, selectedDate) || t.foodVacation || null;
      const isFoodIncluded = t.foodIncluded !== false;

      const getStatus = (isVac, isEaten, val) => {
        if (!isFoodIncluded) return 'selfCooking';
        if (isVac) return 'onVacation';
        if (isEaten) return 'eaten';
        if (val === 'not_eating') return 'notEaten';
        if (val === 'pack') return 'pack';
        if (val === 'extra') return 'extra';
        return 'requested';
      };

      return {
        id: t.id,
        name: t.name || 'Tenant',
        room: t.roomNo || t.room || 'N/A',
        bed: t.bedNo || t.bed || 'A',
        phone: t.phone || '',
        image: t.image || null,
        foodIncluded: isFoodIncluded,
        includedFoodPersons: t.includedFoodPersons || 1,
        foodVacation: currentVac,
        statusB: getStatus(isVacB, isEatenB, mealLog?.breakfast),
        statusL: getStatus(isVacL, isEatenL, mealLog?.lunch),
        statusS: getStatus(isVacS, isEatenS, mealLog?.snacks),
        statusD: getStatus(isVacD, isEatenD, mealLog?.dinner),
        detailsB: mealLog?.breakfastDetails || '',
        detailsL: mealLog?.lunchDetails || '',
        detailsS: mealLog?.snacksDetails || '',
        detailsD: mealLog?.dinnerDetails || '',
      };
    });
  }, [rawTenants, mealStatusLogs, eatenData, vacations, selectedDate]);

  // ── 6. Filter Students for Current Meal Tab ────────────────────────────────
  const mealKey = mealTab === 'breakfast' ? 'statusB' : mealTab === 'lunch' ? 'statusL' : mealTab === 'snacks' ? 'statusS' : 'statusD';
  const detailsKey = mealTab === 'breakfast' ? 'detailsB' : mealTab === 'lunch' ? 'detailsL' : mealTab === 'snacks' ? 'detailsS' : 'detailsD';

  const statsCount = useMemo(() => {
    return {
      all: students.length,
      requested: students.filter(s => s[mealKey] === 'requested').length,
      pack: students.filter(s => s[mealKey] === 'pack').length,
      extra: students.filter(s => s[mealKey] === 'extra').length,
      eaten: students.filter(s => s[mealKey] === 'eaten').length,
      notEaten: students.filter(s => s[mealKey] === 'notEaten').length,
      onVacation: students.filter(s => s[mealKey] === 'onVacation').length,
      selfCooking: students.filter(s => s[mealKey] === 'selfCooking').length,
    };
  }, [students, mealKey]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      // Filter by stat selection
      if (selectedStatFilter !== 'all' && s[mealKey] !== selectedStatFilter) return false;
      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (s.name || '').toLowerCase().includes(q);
        const matchesRoom = String(s.room || '').toLowerCase().includes(q);
        const matchesPhone = String(s.phone || '').includes(q);
        if (!matchesName && !matchesRoom && !matchesPhone) return false;
      }
      return true;
    });
  }, [students, mealKey, selectedStatFilter, searchQuery]);

  // ── 7. Toggle Meal Eaten Action ────────────────────────────────────────────
  const handleToggleEaten = async (studentId, currentIsEaten) => {
    try {
      const docRef = doc(db, 'mess_headcount', `${pgDocId}_${selectedDate}`);
      const nextVal = !currentIsEaten;
      await setDoc(docRef, { [`${studentId}_${mealTab}_eaten`]: nextVal }, { merge: true });

      // If marked eaten, send student a confirmation notification
      if (nextVal) {
        const student = students.find(s => s.id === studentId);
        await addDoc(collection(db, 'users', studentId, 'notifications'), {
          title: `Meal Status: ${mealTab.charAt(0).toUpperCase() + mealTab.slice(1)} Eaten ✅`,
          desc: `You have been marked as having eaten your ${mealTab}.`,
          type: 'Food',
          action: 'VIEW_FOOD',
          unread: true,
          createdAt: new Date().toISOString()
        }).catch(() => {});
        showToast(`${student?.name || 'Student'} marked as Eaten!`);
      } else {
        showToast('Meal status unmarked.');
      }
    } catch (err) {
      console.error('Failed to toggle meal eaten:', err);
      showToast('Error updating meal status');
    }
  };

  // ── 8. Open Edit Modal with Per-Item Dishes & Photos ───────────────────────
  const openEditMeal = (day, meal) => {
    setEditingMeal({ day, meal });
    const raw = weeklyFoodMenu[day]?.[meal] || '';
    const itemNames = raw.split(/[,;]/).map(s => s.trim()).filter(Boolean);
    const currentImages = foodItemImages[day]?.[meal] || {};
    const parsed = itemNames.map(name => ({
      id: Math.random().toString(36).substring(2, 9),
      name,
      image: currentImages[name] || getDishPresetImage(name) || null
    }));
    setEditItems(parsed);
    setEditValue(raw);
    setCustomItemInput('');
    setPresetSearch('');
    setPresetCategory('All');
    setActivePhotoItemIndex(null);
    setShowItemPhotoPicker(false);
  };

  // ── 9. Handle Photo Selection for specific item ───────────────────────────
  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || activePhotoItemIndex === null) return;
    setIsProcessingPhoto(true);
    try {
      const compressedDataUrl = await compressImage(file, 750);
      setEditItems(prev => prev.map((item, idx) => 
        idx === activePhotoItemIndex ? { ...item, image: compressedDataUrl } : item
      ));
      showToast('Custom photo attached to dish!');
      setShowItemPhotoPicker(false);
    } catch (err) {
      console.error('Failed to process image:', err);
      showToast('Failed to process selected image');
    } finally {
      setIsProcessingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── 10. Save Menu & Per-Item Photo Edits ──────────────────────────────────
  const handleSaveMenu = async () => {
    if (!editingMeal) return;
    setSavingMenu(true);
    try {
      const { day, meal } = editingMeal;
      const namesStr = editItems.map(i => i.name.trim()).filter(Boolean).join(', ');
      const imagesMap = {};
      editItems.forEach(i => {
        const cleanName = i.name.trim();
        if (cleanName && i.image) {
          imagesMap[cleanName] = i.image;
        }
      });

      const updatedMenu = {
        ...weeklyFoodMenu,
        [day]: {
          ...(weeklyFoodMenu[day] || {}),
          [meal]: namesStr
        }
      };

      const updatedItemImages = {
        ...foodItemImages,
        [day]: {
          ...(foodItemImages[day] || {}),
          [meal]: imagesMap
        }
      };

      setWeeklyFoodMenu(updatedMenu);
      setFoodItemImages(updatedItemImages);

      const editorName = user?.name || user?.displayName || user?.email?.split('@')[0] || 'Admin';
      const editorRole = 'Admin';
      const editTimestamp = new Date().toISOString();

      const editRecord = {
        editedBy: editorName,
        editorRole,
        editorUid: user?.uid || 'admin',
        editedAt: editTimestamp,
        day,
        meal,
        dishesSummary: namesStr || 'Cleared',
        itemsCount: editItems.length,
        hasPhotos: Object.keys(imagesMap).length > 0
      };

      setLastMenuEdit(editRecord);

      await setDoc(doc(db, 'pg_owners', pgDocId), {
        foodMenu: updatedMenu,
        foodItemImages: updatedItemImages,
        lastMenuEdit: editRecord
      }, { merge: true });

      // Save into food_menu_history audit subcollection
      try {
        await addDoc(collection(db, 'pg_owners', pgDocId, 'food_menu_history'), editRecord);
      } catch (histErr) {
        console.warn('Failed to record menu history entry:', histErr);
      }

      // Notify all active students of this PG
      if (students && students.length > 0) {
        const notifPromises = students.map(student =>
          addDoc(collection(db, 'users', student.id, 'notifications'), {
            title: '🍽️ Food Menu Updated',
            desc: `${day} ${meal} was updated by ${editorRole} (${editorName}): ${namesStr || 'Updated dishes'}`,
            type: 'food_menu',
            action: 'FOOD_TAB',
            unread: true,
            createdAt: editTimestamp
          }).catch(err => console.warn('Student menu notif error:', err))
        );
        Promise.all(notifPromises).catch(err => console.warn('Bulk menu notif error:', err));
      }

      showToast(`Saved ${editItems.length} dishes for ${day} ${meal} & notified students!`);
      setEditingMeal(null);
    } catch (err) {
      console.error('Failed to update food menu:', err);
      showToast('Failed to save menu changes');
    } finally {
      setSavingMenu(false);
    }
  };

  const handleResetToDefaultMenu = async () => {
    if (!window.confirm('Reset this PG food menu to recommended defaults?')) return;
    try {
      setWeeklyFoodMenu(DEFAULT_MENU);
      await setDoc(doc(db, 'pg_owners', pgDocId), { foodMenu: DEFAULT_MENU }, { merge: true });
      showToast('Reset to recommended weekly food menu!');
    } catch (err) {
      console.error('Reset error:', err);
      showToast('Failed to reset menu');
    }
  };

  // ── 11. Send Broadcast Notification ────────────────────────────────────────
  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    setSendingBroadcast(true);
    try {
      const targets = broadcastTarget === 'all' 
        ? students 
        : students.filter(s => s.id === broadcastTarget);

      if (targets.length === 0) {
        showToast('No students to broadcast to');
        setSendingBroadcast(false);
        return;
      }

      const now = new Date().toISOString();
      await Promise.all(targets.map(student =>
        addDoc(collection(db, 'users', student.id, 'notifications'), {
          title: `🍽️ ${broadcastMeal} is Ready!`,
          desc: broadcastMsg || `Freshly prepared hot ${broadcastMeal} is ready. Head to the mess hall!`,
          type: 'info',
          action: 'FOOD_TAB',
          unread: true,
          createdAt: now
        })
      ));

      showToast(`📢 Broadcast sent to ${targets.length} students!`);
      setShowBroadcastModal(false);
    } catch (err) {
      console.error('Broadcast error:', err);
      showToast('Failed to send broadcast');
    } finally {
      setSendingBroadcast(false);
    }
  };

  const currentSelectedDayName = getDayName(selectedDate);
  const currentDayMenu = weeklyFoodMenu[currentSelectedDayName] || {};
  const currentActiveMealKey = mealTab.charAt(0).toUpperCase() + mealTab.slice(1);
  const currentMealPhoto = foodMenuImages[currentSelectedDayName]?.[currentActiveMealKey];

  return (
    <div style={{
      fontFamily: "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
      maxWidth: '480px',
      margin: '0 auto',
      backgroundColor: '#f8fafc',
      minHeight: '100vh',
      paddingBottom: '80px',
      position: 'relative'
    }}>

      {/* Hidden File Input for Taking / Picking Photos */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handlePhotoSelect}
      />

      {/* ── Toast Notification ── */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          padding: '12px 24px',
          borderRadius: '30px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
          zIndex: 1000,
          fontSize: '14px',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'fadeInDown 0.25s ease'
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#10b981' }}>check_circle</span>
          {toastMessage}
        </div>
      )}

      {/* ── Header ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0c1a2e, #0f2847)',
        padding: '16px 20px 16px',
        paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))',
        color: 'white',
        borderBottomLeftRadius: '24px',
        borderBottomRightRadius: '24px',
        boxShadow: '0 4px 20px rgba(12,26,46,0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                background: 'rgba(255,255,255,0.12)',
                border: 'none',
                borderRadius: '50%',
                width: '38px',
                height: '38px',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>arrow_back</span>
            </button>
            <div>
              <h1 style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                margin: 0,
                fontSize: '20px',
                fontWeight: 800,
                letterSpacing: '-0.3px'
              }}>
                Food &amp; Mess
              </h1>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>
                {pgDetails?.pgName || pgDetails?.name || 'My Property'} · {students.length} Students
              </p>
            </div>
          </div>

        </div>

        {/* Segmented Tab Switcher */}
        <div style={{
          display: 'flex',
          background: 'rgba(255,255,255,0.1)',
          padding: '4px',
          borderRadius: '14px',
          backdropFilter: 'blur(8px)'
        }}>
          <button
            onClick={() => setActiveMainTab('attendance')}
            style={{
              flex: 1,
              padding: '9px 0',
              borderRadius: '10px',
              border: 'none',
              background: activeMainTab === 'attendance' ? '#ffffff' : 'transparent',
              color: activeMainTab === 'attendance' ? '#0f172a' : '#cbd5e1',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>group</span>
            Head Count
          </button>
          <button
            onClick={() => setActiveMainTab('menu')}
            style={{
              flex: 1,
              padding: '9px 0',
              borderRadius: '10px',
              border: 'none',
              background: activeMainTab === 'menu' ? '#ffffff' : 'transparent',
              color: activeMainTab === 'menu' ? '#0f172a' : '#cbd5e1',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>restaurant_menu</span>
            Food Menu
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ── TAB 1: HEADCOUNT & ATTENDANCE (JUST LIKE COOK APP) ────────────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeMainTab === 'attendance' && (
        <div style={{ padding: '16px' }}>

          {/* Live Mess Counter Card */}
          <div style={{
            background: 'linear-gradient(135deg, #1e293b, #0f172a)',
            borderRadius: '20px',
            padding: '20px',
            color: '#fff',
            boxShadow: '0 10px 25px rgba(15,23,42,0.12)',
            marginBottom: '16px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', right: -12, bottom: -12, opacity: 0.08, pointerEvents: 'none' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '130px' }}>restaurant</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ position: 'relative', display: 'flex', height: '10px', width: '10px' }}>
                    <span style={{
                      position: 'absolute',
                      display: 'inline-flex',
                      height: '100%',
                      width: '100%',
                      borderRadius: '50%',
                      background: '#ef4444',
                      opacity: 0.75,
                      animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite'
                    }} />
                    <span style={{
                      position: 'relative',
                      display: 'inline-flex',
                      borderRadius: '50%',
                      height: '10px',
                      width: '10px',
                      background: '#dc2626'
                    }} />
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#f8fafc' }}>
                    Live Headcount
                  </span>
                </div>
                <h3 style={{ margin: '4px 0 0', fontSize: '16px', fontWeight: 800, color: '#f8fafc', textTransform: 'capitalize' }}>
                  Current Meal ({mealTab})
                </h3>
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.1)',
                padding: '6px 10px',
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#e2e8f0'
              }}>
                {selectedDate === getTodayStr() ? 'Today' : selectedDate}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: '6px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <h1 style={{ margin: 0, fontSize: '48px', fontWeight: 900, lineHeight: 1, color: '#fde047' }}>
                    {statsCount.eaten}
                  </h1>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: '#94a3b8' }}>
                    / {students.length - statsCount.onVacation} active eating ({statsCount.onVacation} on leave)
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  setBroadcastMeal(mealTab.charAt(0).toUpperCase() + mealTab.slice(1));
                  setShowBroadcastModal(true);
                }}
                style={{
                  background: '#10b981',
                  color: '#fff',
                  border: 'none',
                  padding: '9px 14px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(16,185,129,0.3)'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>notifications_active</span>
                Alert All
              </button>
            </div>
          </div>

          {/* Date Selector & Shortcut Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '16px',
            background: '#ffffff',
            padding: '8px 12px',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(15,23,42,0.03)'
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#0891b2' }}>calendar_month</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                fontSize: '13px',
                fontWeight: 800,
                color: '#0f172a',
                outline: 'none',
                flex: 1,
                fontFamily: 'inherit',
                cursor: 'pointer'
              }}
            />
            {selectedDate !== getTodayStr() && (
              <button
                onClick={() => setSelectedDate(getTodayStr())}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#0891b2',
                  cursor: 'pointer'
                }}
              >
                Today
              </button>
            )}
          </div>

          {/* Meal Selection Tabs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px' }}>
            {[
              { id: 'breakfast', label: 'Breakfast', icon: 'coffee' },
              { id: 'lunch',     label: 'Lunch',     icon: 'lunch_dining' },
              { id: 'snacks',    label: 'Snacks',    icon: 'bakery_dining' },
              { id: 'dinner',    label: 'Dinner',    icon: 'dinner_dining' },
            ].map(m => {
              const active = mealTab === m.id;
              return (
                <div
                  key={m.id}
                  onClick={() => setMealTab(m.id)}
                  style={{
                    background: active ? '#ede9fe' : '#ffffff',
                    border: `1.5px solid ${active ? '#8b5cf6' : '#e2e8f0'}`,
                    borderRadius: '12px',
                    padding: '10px 4px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: active ? '0 4px 12px rgba(139,92,246,0.15)' : 'none'
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: '22px', color: active ? '#7c3aed' : '#64748b' }}
                  >
                    {m.icon}
                  </span>
                  <p style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: active ? '#7c3aed' : '#64748b',
                    margin: '4px 0 0',
                    textTransform: 'uppercase'
                  }}>
                    {m.label}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Admin Meal Pause Control Banner */}
          {(() => {
            const isPaused = !!(pausedMeals?.[selectedDate]?.[mealTab.toLowerCase()]);
            return (
              <div style={{
                background: isPaused ? '#fff1f2' : '#f0fdf4',
                border: `1.5px solid ${isPaused ? '#fecaca' : '#bbf7d0'}`,
                borderRadius: '14px',
                padding: '10px 14px',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                boxShadow: isPaused ? '0 4px 12px rgba(225,29,72,0.08)' : '0 4px 12px rgba(22,163,74,0.06)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '10px',
                    background: isPaused ? '#ffe4e6' : '#dcfce7',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: isPaused ? '#e11d48' : '#16a34a'
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
                      {isPaused ? 'pause_circle' : 'check_circle'}
                    </span>
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: isPaused ? '#9f1239' : '#166534', textTransform: 'capitalize' }}>
                      {mealTab} is {isPaused ? 'Paused for Today ⏸️' : 'Active & Serving ✅'}
                    </div>
                    <div style={{ fontSize: '11px', color: isPaused ? '#be123c' : '#15803d', fontWeight: 600 }}>
                      {isPaused ? 'Students cannot place requests or scan QR for this meal' : 'Students can view menu, request pack/extra & eat'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleToggleMealPause(mealTab)}
                  style={{
                    background: isPaused ? '#10b981' : '#e11d48',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: isPaused ? '0 2px 8px rgba(16,185,129,0.25)' : '0 2px 8px rgba(225,29,72,0.25)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                    {isPaused ? 'play_arrow' : 'pause'}
                  </span>
                  {isPaused ? 'Resume Meal' : 'Pause Meal'}
                </button>
              </div>
            );
          })()}

          {/* Current Menu Item Pill with Per-Item Photos */}
          {(() => {
            const rawDishStr = currentDayMenu[currentActiveMealKey] || '';
            const todayDishes = rawDishStr ? rawDishStr.split(/[,;]/).map(s => s.trim()).filter(Boolean) : [];
            const dishImgs = foodItemImages[currentSelectedDayName]?.[currentActiveMealKey] || {};

            return (
              <div style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                padding: '14px',
                marginBottom: '16px',
                boxShadow: '0 2px 8px rgba(15,23,42,0.03)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase' }}>
                      {currentSelectedDayName}'s {mealTab}
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>({todayDishes.length} items)</span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedMenuDay(currentSelectedDayName);
                      openEditMeal(currentSelectedDayName, currentActiveMealKey);
                      setActiveMainTab('menu');
                    }}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '5px 10px',
                      fontSize: '11px',
                      fontWeight: 800,
                      color: '#475569',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit</span>
                    Edit Menu
                  </button>
                </div>

                {todayDishes.length === 0 ? (
                  <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>No menu items set for this meal.</p>
                ) : (
                  <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '2px' }}>
                    {todayDishes.map((dish, i) => {
                      const dImg = dishImgs[dish] || getDishPresetImage(dish);
                      return (
                        <div key={i} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '5px 9px' }}>
                          {dImg ? (
                            <img
                              src={dImg}
                              alt={dish}
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = DEFAULT_FOOD_PLACEHOLDER;
                              }}
                              style={{ width: '26px', height: '26px', borderRadius: '6px', objectFit: 'cover' }}
                            />
                          ) : (
                            <div style={{ width: '26px', height: '26px', borderRadius: '6px', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#64748b' }}>restaurant</span>
                            </div>
                          )}
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>{dish}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Interactive Stat Breakdown Cards (Cook App style) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div
              onClick={() => setSelectedStatFilter(selectedStatFilter === 'pack' ? 'all' : 'pack')}
              style={{
                background: selectedStatFilter === 'pack' ? '#fef08a' : '#ffffff',
                border: `2px solid ${selectedStatFilter === 'pack' ? '#000' : '#e2e8f0'}`,
                borderRadius: '14px',
                padding: '12px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <p style={{ fontSize: '24px', fontWeight: 900, color: '#000', margin: 0 }}>{statsCount.pack}</p>
              <p style={{ fontSize: '11px', fontWeight: 800, color: '#475569', margin: '2px 0 0', textTransform: 'uppercase' }}>
                📦 To Pack
              </p>
            </div>

            <div
              onClick={() => setSelectedStatFilter(selectedStatFilter === 'extra' ? 'all' : 'extra')}
              style={{
                background: selectedStatFilter === 'extra' ? '#cffafe' : '#ffffff',
                border: `2px solid ${selectedStatFilter === 'extra' ? '#000' : '#e2e8f0'}`,
                borderRadius: '14px',
                padding: '12px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <p style={{ fontSize: '24px', fontWeight: 900, color: '#000', margin: 0 }}>{statsCount.extra}</p>
              <p style={{ fontSize: '11px', fontWeight: 800, color: '#475569', margin: '2px 0 0', textTransform: 'uppercase' }}>
                ➕ Extra Plate
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '16px' }}>
            {[
              { id: 'requested',  label: 'Requested', val: statsCount.requested,  bg: '#fef9c3', border: '#eab308' },
              { id: 'onVacation', label: 'On Leave',  val: statsCount.onVacation, bg: '#f5f3ff', border: '#7c3aed' },
              { id: 'eaten',      label: 'Eaten',     val: statsCount.eaten,      bg: '#dcfce7', border: '#22c55e' },
              { id: 'notEaten',   label: 'Not Eaten', val: statsCount.notEaten,   bg: '#fee2e2', border: '#ef4444' },
            ].map(s => {
              const isSelected = selectedStatFilter === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedStatFilter(isSelected ? 'all' : s.id)}
                  style={{
                    background: isSelected ? s.bg : '#ffffff',
                    border: `2px solid ${isSelected ? '#000' : '#e2e8f0'}`,
                    borderRadius: '14px',
                    padding: '10px 4px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <p style={{ fontSize: '20px', fontWeight: 900, color: '#000', margin: 0 }}>{s.val}</p>
                  <p style={{ fontSize: '10px', fontWeight: 800, color: '#475569', margin: '2px 0 0', textTransform: 'uppercase' }}>
                    {s.label}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Search & Active Filter Info */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '14px',
            boxShadow: '0 4px 16px rgba(15,23,42,0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                  Student Roster ({filteredStudents.length})
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#64748b' }}>
                  {selectedStatFilter === 'all' ? 'Showing all students' : `Filtered: ${selectedStatFilter.toUpperCase()}`}
                </p>
              </div>

              {selectedStatFilter !== 'all' && (
                <button
                  onClick={() => setSelectedStatFilter('all')}
                  style={{
                    background: '#f1f5f9',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  Clear filter ✕
                </button>
              )}
            </div>

            {/* Search Input */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#f8fafc',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              padding: '8px 12px',
              marginBottom: '14px'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#94a3b8' }}>search</span>
              <input
                type="text"
                placeholder="Search by student name or room..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  width: '100%',
                  fontFamily: 'inherit'
                }}
              />
              {searchQuery && (
                <span
                  className="material-symbols-outlined"
                  onClick={() => setSearchQuery('')}
                  style={{ fontSize: '16px', color: '#94a3b8', cursor: 'pointer' }}
                >
                  close
                </span>
              )}
            </div>

            {/* Student List */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#0891b2' }}>hourglass_top</span>
                <p style={{ fontSize: '13px', margin: '8px 0 0' }}>Loading students...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 12px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '36px', color: '#cbd5e1' }}>person_off</span>
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#64748b', margin: '8px 0 0' }}>No students found</p>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0' }}>Try changing the status filter or search query</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '450px', overflowY: 'auto', paddingRight: '2px' }}>
                {filteredStudents.map(s => {
                  const currentStatus = s[mealKey];
                  const isEaten = currentStatus === 'eaten';
                  const details = s[detailsKey];

                  return (
                    <div
                      key={s.id}
                      style={{
                        background: isEaten ? '#f0fdf4' : '#ffffff',
                        border: `1.5px solid ${isEaten ? '#bbf7d0' : '#e2e8f0'}`,
                        borderRadius: '14px',
                        padding: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        boxShadow: '0 2px 6px rgba(15,23,42,0.03)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                        {/* Avatar */}
                        {s.image ? (
                          <img
                            src={s.image}
                            alt={s.name}
                            style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: isEaten ? '#dcfce7' : '#f1f5f9',
                            color: isEaten ? '#166534' : '#475569',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '15px'
                          }}>
                            {s.name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                        )}

                        <div style={{ minWidth: 0, flex: 1 }}>
                          <h4 style={{
                            margin: 0,
                            fontSize: '14px',
                            fontWeight: 800,
                            color: '#0f172a',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {s.name}
                          </h4>
                          <p style={{ margin: '2px 0 4px', fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                            Room {s.room} · Bed {s.bed}
                          </p>

                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                            {/* Status Chip */}
                            <span style={{
                              fontSize: '10px',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              background: isEaten ? '#dcfce7' : currentStatus === 'selfCooking' ? '#fff7ed' : currentStatus === 'onVacation' ? '#f5f3ff' : currentStatus === 'notEaten' ? '#fee2e2' : currentStatus === 'pack' ? '#fef08a' : currentStatus === 'extra' ? '#cffafe' : '#fef9c3',
                              color: isEaten ? '#166534' : currentStatus === 'selfCooking' ? '#ea580c' : currentStatus === 'onVacation' ? '#7c3aed' : currentStatus === 'notEaten' ? '#991b1b' : currentStatus === 'pack' ? '#854d0e' : currentStatus === 'extra' ? '#0e7490' : '#854d0e',
                              border: currentStatus === 'selfCooking' ? '1px solid #fed7aa' : currentStatus === 'onVacation' ? '1px solid #ddd6fe' : 'none'
                            }}>
                              {isEaten ? 'Eaten ✅' : currentStatus === 'selfCooking' ? '🍳 Self-Cooking' : currentStatus === 'onVacation' ? '🏖️ On Leave' : currentStatus === 'notEaten' ? 'Not Eaten' : currentStatus === 'pack' ? 'To Pack 📦' : currentStatus === 'extra' ? 'Extra Plate ➕' : 'Requested'}
                            </span>

                            {s.includedFoodPersons > 1 && s.foodIncluded && (
                              <span style={{ fontSize: '10px', fontWeight: 800, color: '#0369a1', background: '#e0f2fe', padding: '2px 6px', borderRadius: '4px', border: '1px solid #bae6fd' }}>
                                👥 {s.includedFoodPersons} Meals
                              </span>
                            )}

                            {currentStatus === 'onVacation' && s.foodVacation && (
                              <span style={{ fontSize: '10px', fontWeight: 700, color: '#7c3aed', background: '#f5f3ff', padding: '2px 6px', borderRadius: '4px', border: '1px solid #ede9fe' }}>
                                Paused: {formatDateDisplay(s.foodVacation.startDate)} → {formatDateDisplay(s.foodVacation.endDate)}
                              </span>
                            )}

                            {details && (
                              <span style={{ fontSize: '10px', fontWeight: 700, color: '#475569', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                                {details}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons: Call & Mark Eaten */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        {s.phone && (
                          <a
                            href={`tel:${s.phone.replace(/\s+/g, '')}`}
                            style={{
                              background: '#f1f5f9',
                              color: '#0f172a',
                              textDecoration: 'none',
                              borderRadius: '10px',
                              width: '34px',
                              height: '34px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '1px solid #e2e8f0'
                            }}
                            title="Call Student"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>call</span>
                          </a>
                        )}

                        {currentStatus === 'onVacation' ? (
                          <span style={{
                            background: '#ede9fe',
                            color: '#7c3aed',
                            padding: '8px 12px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: 800,
                            border: '1px solid #ddd6fe',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            🏖️ On Leave
                          </span>
                        ) : (
                          <button
                            onClick={() => handleToggleEaten(s.id, isEaten)}
                            style={{
                              background: isEaten ? '#dcfce7' : '#0f172a',
                              color: isEaten ? '#166534' : '#f8fafc',
                              border: isEaten ? '1.5px solid #86efac' : 'none',
                              borderRadius: '10px',
                              padding: '8px 12px',
                              fontSize: '11px',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                              {isEaten ? 'undo' : 'check'}
                            </span>
                            {isEaten ? 'Undo' : 'Mark Eaten'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ── TAB 2: FOOD MENU MANAGEMENT & PHOTOS (EDIT & CHANGE MENU) ────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeMainTab === 'menu' && (
        <div style={{ padding: '16px' }}>

          {/* Day Selector Pills */}
          <div style={{
            display: 'flex',
            overflowX: 'auto',
            gap: '8px',
            paddingBottom: '12px',
            scrollbarWidth: 'none'
          }}>
            {DAYS_OF_WEEK.map(day => {
              const active = selectedMenuDay === day;
              const isToday = getDayName(getTodayStr()) === day;
              return (
                <button
                  key={day}
                  onClick={() => setSelectedMenuDay(day)}
                  style={{
                    flexShrink: 0,
                    padding: '8px 14px',
                    borderRadius: '12px',
                    border: `1.5px solid ${active ? '#0f172a' : '#e2e8f0'}`,
                    background: active ? '#0f172a' : '#ffffff',
                    color: active ? '#ffffff' : '#475569',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                    boxShadow: active ? '0 4px 12px rgba(15,23,42,0.15)' : 'none'
                  }}
                >
                  {day.slice(0, 3)}
                  {isToday && (
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: active ? '#fde047' : '#0891b2' }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected Day Banner */}
          <div style={{
            background: '#ffffff',
            borderRadius: '18px',
            padding: '16px',
            border: '1px solid #e2e8f0',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 4px 16px rgba(15,23,42,0.03)'
          }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase' }}>
                Diet Schedule &amp; Photos
              </span>
              <h2 style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                margin: '2px 0 0',
                fontSize: '20px',
                fontWeight: 800,
                color: '#0f172a'
              }}>
                {selectedMenuDay} Menu
              </h2>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  fetchMenuHistory();
                  setShowMenuHistoryModal(true);
                }}
                style={{
                  background: '#ede9fe',
                  border: '1px solid #ddd6fe',
                  borderRadius: '10px',
                  padding: '7px 12px',
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#6d28d9',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title="View audit history of who edited menu and when"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>history</span>
                Edit History
              </button>

              <button
                onClick={handleResetToDefaultMenu}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '7px 12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title="Reset all days to default menu template"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>restart_alt</span>
                Reset Template
              </button>
            </div>
          </div>

          {/* Last Edited by Banner */}
          {lastMenuEdit && (
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '10px 14px',
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#6366f1' }}>manage_accounts</span>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                    Last edited by <span style={{ color: lastMenuEdit.editorRole === 'Cook' ? '#16a34a' : '#7c3aed' }}>{lastMenuEdit.editedBy} ({lastMenuEdit.editorRole})</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    {lastMenuEdit.day} {lastMenuEdit.meal} · {lastMenuEdit.editedAt ? new Date(lastMenuEdit.editedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Recently'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  fetchMenuHistory();
                  setShowMenuHistoryModal(true);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6366f1',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                View History
              </button>
            </div>
          )}

          {/* 4 Meal Slots for Selected Day */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { id: 'Breakfast', label: 'Breakfast', timing: '8:00 AM – 10:30 AM', icon: 'coffee', accent: '#f59e0b', bg: '#fef3c7' },
              { id: 'Lunch',     label: 'Lunch',     timing: '12:30 PM – 3:00 PM',  icon: 'lunch_dining', accent: '#0891b2', bg: '#ecfeff' },
              { id: 'Snacks',    label: 'Snacks',    timing: '5:00 PM – 6:30 PM',   icon: 'bakery_dining', accent: '#8b5cf6', bg: '#f3e8ff' },
              { id: 'Dinner',    label: 'Dinner',    timing: '8:00 PM – 10:30 PM',  icon: 'dinner_dining', accent: '#10b981', bg: '#ecfdf5' },
            ].map(mealSlot => {
              const menuContent = weeklyFoodMenu[selectedMenuDay]?.[mealSlot.id] || 'Not set';
              const mealPhoto = foodMenuImages[selectedMenuDay]?.[mealSlot.id];
              const slotDishes = menuContent !== 'Not set' ? menuContent.split(/[,;]/).map(s => s.trim()).filter(Boolean) : [];
              const slotImgs = foodItemImages[selectedMenuDay]?.[mealSlot.id] || {};

              return (
                <div
                  key={mealSlot.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: '18px',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    boxShadow: '0 4px 16px rgba(15,23,42,0.03)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '10px',
                          background: mealSlot.bg,
                          color: mealSlot.accent,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{mealSlot.icon}</span>
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                              {mealSlot.label}
                            </h4>
                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>
                              ({slotDishes.length} items)
                            </span>
                          </div>
                          <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                            {mealSlot.timing}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => openEditMeal(selectedMenuDay, mealSlot.id)}
                        style={{
                          background: '#0f172a',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '7px 12px',
                          fontSize: '11px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          boxShadow: '0 2px 8px rgba(15,23,42,0.1)'
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit</span>
                        Edit Dishes &amp; Photos
                      </button>
                    </div>

                    {/* ONLY Name + Photo Per Dish (NO redundant text list!) */}
                    <div style={{
                      background: '#f8fafc',
                      borderRadius: '12px',
                      padding: '12px',
                      border: '1px solid #f1f5f9'
                    }}>
                      {slotDishes.length === 0 ? (
                        <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', fontWeight: 600, padding: '6px 0' }}>
                          No dishes configured for {mealSlot.label}. Click "Edit Dishes &amp; Photos" to add.
                        </p>
                      ) : (
                        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '2px' }}>
                          {slotDishes.map((dish, i) => {
                            const dImg = slotImgs[dish] || getDishPresetImage(dish);
                            return (
                              <div key={i} style={{ flexShrink: 0, width: '72px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                                <div style={{
                                  width: '64px',
                                  height: '64px',
                                  borderRadius: '12px',
                                  overflow: 'hidden',
                                  border: '1.5px solid #e2e8f0',
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                                  background: '#f8fafc',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  <img
                                    src={dImg || DEFAULT_FOOD_PLACEHOLDER}
                                    alt={dish}
                                    onError={(e) => {
                                      e.currentTarget.onerror = null;
                                      e.currentTarget.src = DEFAULT_FOOD_PLACEHOLDER;
                                    }}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                  />
                                </div>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#334155', textAlign: 'center', lineHeight: 1.25, width: '70px', wordBreak: 'break-word' }}>
                                  {dish}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ── EDIT MENU & PER-ITEM PHOTOS MODAL ──────────────────────────────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {editingMeal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,23,42,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          alignItems: 'center'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px 24px 0 0',
            width: '100%',
            maxWidth: '520px',
            padding: '22px',
            paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
            boxShadow: '0 -10px 40px rgba(0,0,0,0.2)',
            animation: 'slideUp 0.25s cubic-bezier(0.16,1,0.3,1)',
            maxHeight: '92vh',
            overflowY: 'auto'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase' }}>
                  Dish Items &amp; Photos Editor
                </span>
                <h3 style={{ margin: '2px 0 0', fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>
                  {editingMeal.day} · {editingMeal.meal}
                </h3>
              </div>
              <button
                onClick={() => setEditingMeal(null)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#64748b' }}>close</span>
              </button>
            </div>

            {/* Current Items List */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Items in this Meal ({editItems.length})
                </label>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Tap photo to change/upload</span>
              </div>

              {editItems.length === 0 ? (
                <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '14px', textAlign: 'center', border: '1.5px dashed #cbd5e1', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>
                  No items added yet. Click from common dishes below or add custom item!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '230px', overflowY: 'auto', paddingRight: '2px' }}>
                  {editItems.map((item, idx) => (
                    <div key={item.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '8px 10px'
                    }}>
                      {/* Dish Photo Thumbnail (clickable) */}
                      <div
                        onClick={() => {
                          setActivePhotoItemIndex(idx);
                          setShowItemPhotoPicker(true);
                        }}
                        style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '10px',
                          backgroundImage: `url(${item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop'})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          border: '1.5px solid #cbd5e1',
                          cursor: 'pointer',
                          flexShrink: 0,
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'flex-end',
                          justifyContent: 'flex-end'
                        }}
                      >
                        <div style={{
                          background: 'rgba(15,23,42,0.7)',
                          color: '#fff',
                          borderRadius: '4px',
                          padding: '1px 3px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>photo_camera</span>
                        </div>
                      </div>

                      {/* Name input */}
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditItems(prev => prev.map((it, i) => i === idx ? { ...it, name: val } : it));
                        }}
                        placeholder="Item name (e.g. 4 Roti)"
                        style={{
                          flex: 1,
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '13px',
                          fontWeight: 700,
                          outline: 'none',
                          fontFamily: 'inherit',
                          background: '#fff'
                        }}
                      />

                      {/* Photo Change button */}
                      <button
                        type="button"
                        onClick={() => {
                          setActivePhotoItemIndex(idx);
                          setShowItemPhotoPicker(true);
                        }}
                        style={{
                          background: '#ede9fe',
                          color: '#7c3aed',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '7px 9px',
                          fontSize: '11px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>image</span>
                        Photo
                      </button>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => setEditItems(prev => prev.filter((_, i) => i !== idx))}
                        style={{
                          background: '#fee2e2',
                          color: '#ef4444',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '7px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Add Common PG Dishes Section */}
            <div style={{ marginBottom: '16px', background: '#f8fafc', borderRadius: '16px', padding: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                  ⚡ Quick Pick: Common PG Dishes
                </span>
                <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700 }}>Pre-loaded Photos</span>
              </div>

              {/* Category tabs */}
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '6px', marginBottom: '8px' }}>
                {DISH_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setPresetCategory(cat)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '16px',
                      border: 'none',
                      background: presetCategory === cat ? '#7c3aed' : '#ffffff',
                      color: presetCategory === cat ? '#ffffff' : '#64748b',
                      fontSize: '11px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      boxShadow: presetCategory === cat ? '0 2px 6px rgba(124,58,237,0.25)' : 'none'
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Search filter */}
              <input
                type="text"
                placeholder="Search dish (e.g. Paneer, Roti, Dal, Poha)..."
                value={presetSearch}
                onChange={e => setPresetSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  fontWeight: 600,
                  outline: 'none',
                  fontFamily: 'inherit',
                  marginBottom: '10px',
                  boxSizing: 'border-box'
                }}
              />

              {/* Preset dishes grid/cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: '8px',
                maxHeight: '160px',
                overflowY: 'auto',
                paddingRight: '2px'
              }}>
                {COMMON_PG_DISHES
                  .filter(d => presetCategory === 'All' || d.category === presetCategory)
                  .filter(d => !presetSearch || d.name.toLowerCase().includes(presetSearch.toLowerCase()))
                  .map(dish => {
                    const isAdded = editItems.some(it => it.name.toLowerCase() === dish.name.toLowerCase());
                    return (
                      <div
                        key={dish.id}
                        onClick={() => {
                          if (isAdded) return;
                          setEditItems(prev => [
                            ...prev,
                            { id: Math.random().toString(36).substring(2, 9), name: dish.name, image: dish.image }
                          ]);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: isAdded ? '#f0fdf4' : '#ffffff',
                          border: `1px solid ${isAdded ? '#86efac' : '#e2e8f0'}`,
                          borderRadius: '10px',
                          padding: '6px 8px',
                          cursor: isAdded ? 'default' : 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <img src={dish.image} alt={dish.name} style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: '11px', fontWeight: 800, color: isAdded ? '#15803d' : '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {dish.name}
                          </p>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: isAdded ? '#16a34a' : '#7c3aed' }}>
                            {isAdded ? 'Added ✓' : '+ Add'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Custom Item Adder */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
              <input
                type="text"
                placeholder="Or type custom dish (e.g. Matar Mushroom)..."
                value={customItemInput}
                onChange={e => setCustomItemInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && customItemInput.trim()) {
                    e.preventDefault();
                    const name = customItemInput.trim();
                    const presetImg = getDishPresetImage(name);
                    setEditItems(prev => [
                      ...prev,
                      { id: Math.random().toString(36).substring(2, 9), name, image: presetImg || null }
                    ]);
                    setCustomItemInput('');
                  }
                }}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '13px',
                  fontWeight: 700,
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
              <button
                type="button"
                onClick={() => {
                  if (!customItemInput.trim()) return;
                  const name = customItemInput.trim();
                  const presetImg = getDishPresetImage(name);
                  setEditItems(prev => [
                    ...prev,
                    { id: Math.random().toString(36).substring(2, 9), name, image: presetImg || null }
                  ]);
                  setCustomItemInput('');
                }}
                style={{
                  background: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                + Add Item
              </button>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveMenu}
              disabled={savingMenu}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                color: '#ffffff',
                fontSize: '15px',
                fontWeight: 800,
                border: 'none',
                cursor: savingMenu ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 16px rgba(124,58,237,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>save</span>
              {savingMenu ? 'Saving Changes...' : `Save ${editItems.length} Dishes & Photos`}
            </button>
          </div>
        </div>
      )}

      {/* ── ITEM PHOTO PICKER MODAL (FOR A SPECIFIC DISH) ───────────────────── */}
      {showItemPhotoPicker && activePhotoItemIndex !== null && editItems[activePhotoItemIndex] && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,23,42,0.7)',
          backdropFilter: 'blur(4px)',
          zIndex: 1050,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          alignItems: 'center'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px 24px 0 0',
            width: '100%',
            maxWidth: '500px',
            padding: '20px',
            paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
            maxHeight: '85vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase' }}>Select Photo</span>
                <h3 style={{ margin: '2px 0 0', fontSize: '17px', fontWeight: 900, color: '#0f172a' }}>
                  Photo for "{editItems[activePhotoItemIndex]?.name}"
                </h3>
              </div>
              <button
                onClick={() => setShowItemPhotoPicker(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#64748b' }}>close</span>
              </button>
            </div>

            {/* Current Selected Photo Preview */}
            {editItems[activePhotoItemIndex]?.image && (
              <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1.5px solid #e2e8f0', marginBottom: '14px', height: '110px' }}>
                <img src={editItems[activePhotoItemIndex].image} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button
                  type="button"
                  onClick={() => {
                    setEditItems(prev => prev.map((it, i) => i === activePhotoItemIndex ? { ...it, image: null } : it));
                  }}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: 'rgba(239,68,68,0.9)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  Remove Photo
                </button>
              </div>
            )}

            {/* Action 1: Upload / Snap Photo */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessingPhoto}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                border: '2px dashed #8b5cf6',
                background: '#f5f3ff',
                color: '#6d28d9',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '14px'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>photo_camera</span>
              {isProcessingPhoto ? 'Compressing photo...' : 'Take with Camera or Upload File'}
            </button>

            {/* Action 2: Choose from Preset Library */}
            <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 800, color: '#334155', textTransform: 'uppercase' }}>
              Or Pick Pre-made Photo from Library:
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(95px, 1fr))',
              gap: '8px',
              maxHeight: '220px',
              overflowY: 'auto',
              paddingRight: '2px'
            }}>
              {COMMON_PG_DISHES.map(dish => (
                <div
                  key={dish.id}
                  onClick={() => {
                    setEditItems(prev => prev.map((it, i) => i === activePhotoItemIndex ? { ...it, image: dish.image } : it));
                    setShowItemPhotoPicker(false);
                  }}
                  style={{
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    background: '#f8fafc',
                    textAlign: 'center'
                  }}
                >
                  <img src={dish.image} alt={dish.name} style={{ width: '100%', height: '65px', objectFit: 'cover' }} />
                  <p style={{ margin: '4px 2px', fontSize: '10px', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {dish.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ── BROADCAST NOTIFICATION MODAL ─────────────────────────────────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {showBroadcastModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,23,42,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          alignItems: 'center'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px 24px 0 0',
            width: '100%',
            maxWidth: '480px',
            padding: '24px',
            paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
            boxShadow: '0 -10px 40px rgba(0,0,0,0.2)',
            animation: 'slideUp 0.25s cubic-bezier(0.16,1,0.3,1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase' }}>
                  Student Alert
                </span>
                <h3 style={{ margin: '2px 0 0', fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>
                  Broadcast "Food is Ready!" 📢
                </h3>
              </div>
              <button
                onClick={() => setShowBroadcastModal(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#64748b' }}>close</span>
              </button>
            </div>

            <form onSubmit={handleSendBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Select Meal:
                </label>
                <select
                  value={broadcastMeal}
                  onChange={(e) => setBroadcastMeal(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1.5px solid #e2e8f0',
                    fontSize: '14px',
                    fontWeight: 700,
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                >
                  <option value="Breakfast">Breakfast</option>
                  <option value="Lunch">Lunch</option>
                  <option value="Snacks">Snacks</option>
                  <option value="Dinner">Dinner</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Recipients:
                </label>
                <select
                  value={broadcastTarget}
                  onChange={(e) => setBroadcastTarget(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1.5px solid #e2e8f0',
                    fontSize: '14px',
                    fontWeight: 700,
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                >
                  <option value="all">All Students ({students.length})</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} (Rm {s.room})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Custom Notification Message:
                </label>
                <textarea
                  rows={2}
                  value={broadcastMsg}
                  onChange={(e) => setBroadcastMsg(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1.5px solid #e2e8f0',
                    fontSize: '13px',
                    fontWeight: 600,
                    outline: 'none',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={sendingBroadcast}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#000',
                  fontSize: '14px',
                  fontWeight: 900,
                  border: 'none',
                  cursor: sendingBroadcast ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  boxShadow: '0 4px 16px rgba(245,158,11,0.3)',
                  marginTop: '6px'
                }}
              >
                {sendingBroadcast ? 'Sending Broadcast...' : '📢 Send Notification Now'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ── MENU EDIT HISTORY MODAL ────────────────────────────────────────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {showMenuHistoryModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,23,42,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 1001,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '480px',
            maxHeight: '82vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
            overflow: 'hidden',
            animation: 'fadeInDown 0.2s ease'
          }}>
            <div style={{
              padding: '18px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#ffffff'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: '#ede9fe', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>history</span>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>Food Menu Edit History</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#64748b' }}>Audit trail of who edited the food menu &amp; when</p>
                </div>
              </div>
              <button
                onClick={() => setShowMenuHistoryModal(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
              </button>
            </div>

            <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {loadingMenuHistory ? (
                <div style={{ textAlign: 'center', padding: '36px 0', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>
                  Loading edit logs...
                </div>
              ) : menuHistoryList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 16px', color: '#94a3b8' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '42px', color: '#cbd5e1' }}>history_toggle_off</span>
                  <p style={{ margin: '10px 0 0', fontSize: '14px', fontWeight: 700, color: '#475569' }}>No menu edits recorded yet</p>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>Edits made by Admin or Cook will appear here chronologically.</p>
                </div>
              ) : (
                menuHistoryList.map((entry, idx) => (
                  <div key={entry.id || idx} style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        padding: '3px 9px',
                        borderRadius: '6px',
                        background: entry.editorRole === 'Cook' ? '#dcfce7' : '#ede9fe',
                        color: entry.editorRole === 'Cook' ? '#166534' : '#6d28d9',
                        textTransform: 'uppercase'
                      }}>
                        {entry.editorRole || 'Staff'}: {entry.editedBy || 'Unknown'}
                      </span>
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>
                        {entry.editedAt ? new Date(entry.editedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Recently'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#6366f1' }}>restaurant_menu</span>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                        {entry.day} · {entry.meal}
                      </span>
                      {entry.hasPhotos && (
                        <span style={{ fontSize: '10px', background: '#ecfdf5', color: '#059669', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                          📷 Photos Attached
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.4, background: '#ffffff', padding: '8px 10px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                      <span style={{ fontWeight: 700, color: '#1e293b' }}>Items: </span>
                      {entry.dishesSummary || 'Updated'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
