import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection, query, where, getDocs, getDoc,
  doc, setDoc, updateDoc, addDoc, onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

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
    Breakfast: 'Poha, Jalebi, Tea',
    Lunch: 'Rajma Chawal, Roti, Salad',
    Snacks: 'Samosa, Coffee',
    Dinner: 'Paneer Butter Masala, Roti, Dal'
  },
  Tuesday: {
    Breakfast: 'Aloo Paratha, Curd, Pickle',
    Lunch: 'Kadi Pakoda, Steamed Rice, Papad',
    Snacks: 'Veg Puff, Masala Tea',
    Dinner: 'Mix Veg, Arhar Dal, Tawa Roti'
  },
  Wednesday: {
    Breakfast: 'Idli, Sambhar, Coconut Chutney',
    Lunch: 'Chole Bhature, Boondi Raita',
    Snacks: 'Namkeen Mix, Filter Coffee',
    Dinner: 'Dal Makhani, Jeera Rice, Butter Roti'
  },
  Thursday: {
    Breakfast: 'Bread Omelette / Veg Sandwich, Tea',
    Lunch: 'Dal Fry, Rice, Seasonal Sabzi',
    Snacks: 'Biscuits, Ginger Tea',
    Dinner: 'Egg Curry / Kofta Curry, Roti, Rice'
  },
  Friday: {
    Breakfast: 'Upma, Coconut Chutney, Tea',
    Lunch: 'Veg Biryani, Raita, Salad',
    Snacks: 'Bhel Puri, Lemon Tea',
    Dinner: 'Matar Paneer, Tawa Roti, Dal Tadka'
  },
  Saturday: {
    Breakfast: 'Puri Sabji, Halwa, Pickle',
    Lunch: 'Moong Dal, Jeera Rice, Bhindi Masala',
    Snacks: 'Mix Pakoda, Cutting Chai',
    Dinner: 'Aloo Gobi, Dal Fry, Phulka'
  },
  Sunday: {
    Breakfast: 'Masala Dosa, Sambhar, Chutney',
    Lunch: 'Special Thali (Paneer/Chicken, Sweet)',
    Snacks: 'Pastry / Cake, Coffee',
    Dinner: 'Shahi Paneer, Pulao, Butter Naan'
  }
};

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const QUICK_FOOD_TAGS = [
  'Paneer Butter Masala', 'Dal Makhani', 'Rajma Chawal', 'Chole Bhature',
  'Aloo Paratha', 'Poori Sabji', 'Veg Biryani', 'Kadi Pakoda',
  'Mix Veg', 'Dal Tadka', 'Gulab Jamun', 'Boondi Raita', 'Masala Dosa', 'Poha & Tea'
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
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  // Menu editing state
  const [selectedMenuDay, setSelectedMenuDay] = useState(() => getDayName(getTodayStr()));
  const [editingMeal, setEditingMeal] = useState(null); // { day, meal }
  const [editValue, setEditValue] = useState('');
  const [editImage, setEditImage] = useState(null);
  const [savingMenu, setSavingMenu] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);

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

  // ── 1. Listen to PG Owner Doc (Name, Capacity, Food Menu, Food Photos) ──────
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
      }
    }, (err) => console.error('PG details error:', err));
    return () => unsub();
  }, [pgDocId]);

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

  // ── 5. Build Unified Student Meal Attendance List ──────────────────────────
  const students = useMemo(() => {
    return rawTenants.map(t => {
      const mealLog = mealStatusLogs.find(m => m.tenantId === t.id);
      const isEatenB = !!eatenData[`${t.id}_breakfast_eaten`];
      const isEatenL = !!eatenData[`${t.id}_lunch_eaten`];
      const isEatenS = !!eatenData[`${t.id}_snacks_eaten`];
      const isEatenD = !!eatenData[`${t.id}_dinner_eaten`];

      const getStatus = (isEaten, val) => {
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
        statusB: getStatus(isEatenB, mealLog?.breakfast),
        statusL: getStatus(isEatenL, mealLog?.lunch),
        statusS: getStatus(isEatenS, mealLog?.snacks),
        statusD: getStatus(isEatenD, mealLog?.dinner),
        detailsB: mealLog?.breakfastDetails || '',
        detailsL: mealLog?.lunchDetails || '',
        detailsS: mealLog?.snacksDetails || '',
        detailsD: mealLog?.dinnerDetails || '',
      };
    });
  }, [rawTenants, mealStatusLogs, eatenData]);

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

  // ── 8. Open Edit Modal with Meal & Photo ───────────────────────────────────
  const openEditMeal = (day, meal) => {
    setEditingMeal({ day, meal });
    setEditValue(weeklyFoodMenu[day]?.[meal] || '');
    setEditImage(foodMenuImages[day]?.[meal] || null);
  };

  // ── 9. Handle Photo Selection & Compression ───────────────────────────────
  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingPhoto(true);
    try {
      const compressedDataUrl = await compressImage(file, 750);
      setEditImage(compressedDataUrl);
      showToast('Photo added! Click Save to apply.');
    } catch (err) {
      console.error('Failed to process image:', err);
      showToast('Failed to process selected image');
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  // ── 10. Save Menu & Photo Edits ───────────────────────────────────────────
  const handleSaveMenu = async () => {
    if (!editingMeal) return;
    setSavingMenu(true);
    try {
      const { day, meal } = editingMeal;
      const updatedMenu = {
        ...weeklyFoodMenu,
        [day]: {
          ...(weeklyFoodMenu[day] || {}),
          [meal]: editValue.trim()
        }
      };

      const updatedImages = {
        ...foodMenuImages,
        [day]: {
          ...(foodMenuImages[day] || {}),
          [meal]: editImage || null
        }
      };

      setWeeklyFoodMenu(updatedMenu);
      setFoodMenuImages(updatedImages);

      await setDoc(doc(db, 'pg_owners', pgDocId), {
        foodMenu: updatedMenu,
        foodMenuImages: updatedImages
      }, { merge: true });

      showToast(`Updated ${day} ${meal} and photo successfully!`);
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

          <button
            onClick={() => {
              setBroadcastMeal(mealTab.charAt(0).toUpperCase() + mealTab.slice(1));
              setShowBroadcastModal(true);
            }}
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              border: 'none',
              borderRadius: '12px',
              padding: '8px 12px',
              color: '#000',
              fontWeight: 800,
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(245,158,11,0.3)'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>campaign</span>
            Broadcast
          </button>
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
            Headcount &amp; Attendance
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
            Food Menu &amp; Photos
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
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#94a3b8' }}>
                    / {students.length} students eaten
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

          {/* Current Menu Item Pill with Photo Thumbnail */}
          <div style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '12px 14px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 2px 8px rgba(15,23,42,0.03)'
          }}>
            {currentMealPhoto && (
              <img
                src={currentMealPhoto}
                alt="Meal item"
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '10px',
                  objectFit: 'cover',
                  flexShrink: 0,
                  border: '1.5px solid #e2e8f0'
                }}
              />
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <p style={{ margin: 0, fontSize: '11px', fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase' }}>
                  {currentSelectedDayName}'s {mealTab}
                </p>
                {currentMealPhoto && (
                  <span style={{ fontSize: '10px', background: '#dcfce7', color: '#166534', padding: '1px 6px', borderRadius: '6px', fontWeight: 800 }}>
                    📷 Photo Attached
                  </span>
                )}
              </div>
              <p style={{
                margin: '2px 0 0',
                fontSize: '13px',
                fontWeight: 700,
                color: '#0f172a',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {currentDayMenu[currentActiveMealKey] || 'No menu item set'}
              </p>
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
                padding: '6px 10px',
                fontSize: '11px',
                fontWeight: 800,
                color: '#475569',
                cursor: 'pointer',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit</span>
              Edit / Photo
            </button>
          </div>

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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
            {[
              { id: 'requested', label: 'Requested', val: statsCount.requested, bg: '#fef9c3', border: '#eab308' },
              { id: 'eaten',     label: 'Eaten',     val: statsCount.eaten,     bg: '#dcfce7', border: '#22c55e' },
              { id: 'notEaten',  label: 'Not Eaten', val: statsCount.notEaten,  bg: '#fee2e2', border: '#ef4444' },
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
                              background: isEaten ? '#dcfce7' : currentStatus === 'notEaten' ? '#fee2e2' : currentStatus === 'pack' ? '#fef08a' : currentStatus === 'extra' ? '#cffafe' : '#fef9c3',
                              color: isEaten ? '#166534' : currentStatus === 'notEaten' ? '#991b1b' : currentStatus === 'pack' ? '#854d0e' : currentStatus === 'extra' ? '#0e7490' : '#854d0e'
                            }}>
                              {isEaten ? 'Eaten ✅' : currentStatus === 'notEaten' ? 'Not Eaten' : currentStatus === 'pack' ? 'To Pack 📦' : currentStatus === 'extra' ? 'Extra Plate ➕' : 'Requested'}
                            </span>

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
                  {/* Photo Header (if present) */}
                  {mealPhoto && (
                    <div style={{ position: 'relative', width: '100%', height: '140px', overflow: 'hidden' }}>
                      <img
                        src={mealPhoto}
                        alt={`${mealSlot.label} dish`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: 'rgba(15,23,42,0.75)',
                        color: '#fff',
                        padding: '4px 8px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: 800,
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>photo_camera</span>
                        Item Photo
                      </div>
                    </div>
                  )}

                  <div style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
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
                          <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                            {mealSlot.label}
                          </h4>
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
                        Edit / Photo
                      </button>
                    </div>

                    <div style={{
                      background: '#f8fafc',
                      borderRadius: '12px',
                      padding: '12px',
                      border: '1px solid #f1f5f9',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <p style={{
                        margin: 0,
                        fontSize: '14px',
                        fontWeight: 700,
                        color: menuContent === 'Not set' ? '#94a3b8' : '#1e293b',
                        lineHeight: 1.5,
                        flex: 1
                      }}>
                        {menuContent}
                      </p>

                      {!mealPhoto && (
                        <button
                          onClick={() => {
                            openEditMeal(selectedMenuDay, mealSlot.id);
                            setTimeout(() => fileInputRef.current?.click(), 250);
                          }}
                          style={{
                            background: '#ede9fe',
                            border: '1px solid #ddd6fe',
                            borderRadius: '8px',
                            padding: '4px 8px',
                            color: '#7c3aed',
                            fontSize: '11px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginLeft: '8px',
                            flexShrink: 0
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add_a_photo</span>
                          + Photo
                        </button>
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
      {/* ── EDIT MENU & PHOTO MODAL ──────────────────────────────────────── */}
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
            maxWidth: '480px',
            padding: '24px',
            paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
            boxShadow: '0 -10px 40px rgba(0,0,0,0.2)',
            animation: 'slideUp 0.25s cubic-bezier(0.16,1,0.3,1)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase' }}>
                  Edit Diet &amp; Photo
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

            {/* Photo Section */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                Item Photo:
              </label>

              {editImage ? (
                <div style={{ position: 'relative', borderRadius: '14px', overflow: 'hidden', border: '1.5px solid #e2e8f0', marginBottom: '8px' }}>
                  <img
                    src={editImage}
                    alt="Preview"
                    style={{ width: '100%', height: '140px', objectFit: 'cover', display: 'block' }}
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: '8px',
                    right: '8px',
                    display: 'flex',
                    gap: '6px'
                  }}>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        background: 'rgba(15,23,42,0.8)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        fontSize: '11px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit</span>
                      Change Photo
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditImage(null)}
                      style={{
                        background: 'rgba(239,68,68,0.9)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        fontSize: '11px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>delete</span>
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingPhoto}
                  style={{
                    width: '100%',
                    padding: '16px',
                    borderRadius: '14px',
                    border: '2px dashed #cbd5e1',
                    background: '#f8fafc',
                    color: '#475569',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#0891b2' }}>
                    add_a_photo
                  </span>
                  <span>{isProcessingPhoto ? 'Compressing photo...' : 'Take or Upload Food Photo'}</span>
                  <span style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8' }}>
                    Camera or gallery photo of the dish
                  </span>
                </button>
              )}
            </div>

            {/* Menu Items Input */}
            <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
              Menu Items (comma-separated):
            </p>
            <textarea
              rows={3}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder="e.g. Rajma Chawal, Roti, Salad, Sweet"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                border: '2px solid #e2e8f0',
                fontSize: '14px',
                fontWeight: 700,
                outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                marginBottom: '12px'
              }}
            />

            {/* Quick Suggestions Chips */}
            <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: 700, color: '#64748b' }}>
              Quick Suggestions:
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px', maxHeight: '100px', overflowY: 'auto' }}>
              {QUICK_FOOD_TAGS.map(tag => (
                <span
                  key={tag}
                  onClick={() => {
                    const current = editValue.trim();
                    setEditValue(current ? `${current}, ${tag}` : tag);
                  }}
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    background: '#f1f5f9',
                    color: '#334155',
                    padding: '4px 8px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    border: '1px solid #e2e8f0'
                  }}
                >
                  + {tag}
                </span>
              ))}
            </div>

            <button
              onClick={handleSaveMenu}
              disabled={savingMenu}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '14px',
                background: '#0f172a',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 800,
                border: 'none',
                cursor: savingMenu ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                boxShadow: '0 4px 16px rgba(15,23,42,0.2)'
              }}
            >
              {savingMenu ? 'Saving...' : 'Save & Sync Menu'}
            </button>
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

    </div>
  );
}
