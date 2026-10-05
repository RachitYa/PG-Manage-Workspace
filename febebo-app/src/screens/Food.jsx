import React, { useState, useEffect } from 'react';
import { TopBar } from '../App';
import BottomNav from '../components/BottomNav';
import { Utensils, Star, Users, X, Coffee, Sun, Moon, Ban, ShoppingBag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getFirestore, doc, onSnapshot, collection, addDoc, updateDoc, setDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import QRCode from 'react-qr-code';
import { Scanner } from '@yudiel/react-qr-scanner';
import { db } from '../firebase';
import { useLoading } from '../context/LoadingContext';
import './Food.css';
import { COMMON_PG_DISHES, getDishPresetImage, DEFAULT_FOOD_PLACEHOLDER } from '../data/commonFoodDishes';
import {
  formatDateStr,
  getTodayStr,
  generateDateRange,
  validateVacationRange,
  isMealPausedOnDate,
  getStudentActiveVacation,
  formatDateDisplay,
  buildVacationDoc,
  ALL_MEALS,
  MEAL_LABELS
} from '../utils/vacationUtils';

// ── Default Weekly Menu Template (Fallback so students always see the mess timetable) ──
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

const Food = () => {
  const { user } = useAuth();
  const { startLoading, stopLoading } = useLoading();
  const [foodData, setFoodData] = useState(DEFAULT_MENU);
  const [foodMenuImages, setFoodMenuImages] = useState({});
  const [foodItemImages, setFoodItemImages] = useState({});
  const [adminPausedMeals, setAdminPausedMeals] = useState({});
  const [todayRequests, setTodayRequests] = useState({}); // { Breakfast: 'pack', Lunch: 'cancel', ... }

  // Resolve active PG doc ID
  const resolvedPgId = (() => {
    if (user?.subscribedPG?.pgId && user.subscribedPG.pgId !== 'primary') return user.subscribedPG.pgId;
    if (user?.subscribedPG?.adminId) return user.subscribedPG.adminId;
    if (user?.adminId) return user.adminId;
    if (user?.pgId && user.pgId !== 'primary') return user.pgId;
    return user?.subscribedPG?.pgId || null;
  })();

  // Menu Edit History & Last Editor state
  const [lastMenuEdit, setLastMenuEdit] = useState(null);
  const [showMenuHistoryModal, setShowMenuHistoryModal] = useState(false);
  const [menuHistoryList, setMenuHistoryList] = useState([]);
  const [loadingMenuHistory, setLoadingMenuHistory] = useState(false);

  const fetchMenuHistory = async () => {
    const pgId = resolvedPgId;
    if (!pgId) return;
    setLoadingMenuHistory(true);
    try {
      const qHistory = query(
        collection(db, 'pg_owners', pgId, 'food_menu_history'),
        orderBy('editedAt', 'desc'),
        limit(50)
      );
      const snap = await getDocs(qHistory);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMenuHistoryList(list);
    } catch (err) {
      console.warn('Food.jsx history fetch fallback:', err);
      try {
        const snap = await getDocs(collection(db, 'pg_owners', pgId, 'food_menu_history'));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => new Date(b.editedAt || 0) - new Date(a.editedAt || 0));
        setMenuHistoryList(list);
      } catch (e2) {
        console.error('Fallback history failed:', e2);
      }
    } finally {
      setLoadingMenuHistory(false);
    }
  };
  
  const [activeTab, setActiveTab] = useState('today'); // 'today' | 'weekly'
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const meals = ['Breakfast', 'Lunch', 'Snacks', 'Dinner'];

  const [activeModal, setActiveModal] = useState(null); // 'rate', 'extra', 'vacation', 'shorten', 'resumeConfirm'
  const [showQRModal, setShowQRModal] = useState(false);
  const [activeMealQR, setActiveMealQR] = useState('');
  const [eatenStatus, setEatenStatus] = useState({});

  // Food Vacation State
  const [vacationsList, setVacationsList] = useState([]);
  const [vacationStartDate, setVacationStartDate] = useState('');
  const [vacationEndDate, setVacationEndDate] = useState('');
  const [isFullDayVacation, setIsFullDayVacation] = useState(true);
  const [selectedMeals, setSelectedMeals] = useState(['breakfast', 'lunch', 'snacks', 'dinner']);
  const [vacationReason, setVacationReason] = useState('');
  const [shortenNewDate, setShortenNewDate] = useState('');

  // Reverse QR Scanner state
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [targetScanMeal, setTargetScanMeal] = useState('');
  const [scanResult, setScanResult] = useState(null); // { type: 'success' | 'error' | 'already', title: '', desc: '' }
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  
  // Rate state
  const [rating, setRating] = useState(0);
  const [rateComment, setRateComment] = useState('');

  // Extra state
  const [extraDate, setExtraDate] = useState('');

// ── Food item image lookup (Indian PG common items) ──────────────
// ── Food item image lookup (Indian PG common items) ──────────────
  const FOOD_IMAGES = {
    // Breads & Rice
    'roti':       'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop',
    'chapati':    'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop',
    'naan':       'https://images.unsplash.com/photo-1725483990094-e95226a16db7?w=400&h=300&fit=crop',
    'butter naan':'https://images.unsplash.com/photo-1725483990094-e95226a16db7?w=400&h=300&fit=crop',
    'paratha':    'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=300&fit=crop',
    'puri':       'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=400&h=300&fit=crop',
    'poori':      'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=400&h=300&fit=crop',
    'puri sabji': 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=400&h=300&fit=crop',
    'rice':       'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&h=300&fit=crop',
    'jeera rice': 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&h=300&fit=crop',
    'biryani':    'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&h=300&fit=crop',
    'pulao':      'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&h=300&fit=crop',
    'khichdi':    'https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?w=400&h=300&fit=crop',
    'fried rice': 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&h=300&fit=crop',

    // Dal & Curries
    'dal':        'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop',
    'dal tadka':  'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop',
    'dal fry':    'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop',
    'dal makhani':'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop',
    'rajma':      'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop',
    'chole':      'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=400&h=300&fit=crop',
    'sambar':     'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=400&h=300&fit=crop',
    'sambhar':    'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=400&h=300&fit=crop',
    'kadhi':      'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&h=300&fit=crop',

    // Sabzi & Curries
    'paneer':     'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&h=300&fit=crop',
    'shahi paneer':'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&h=300&fit=crop',
    'matar paneer':'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&h=300&fit=crop',
    'aloo gobhi': 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&h=300&fit=crop',
    'aloo gobi':  'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&h=300&fit=crop',
    'mix veg':    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop',
    'bhindi':     'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&h=300&fit=crop',
    'bhindi masala':'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&h=300&fit=crop',
    'aloo jeera': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=300&fit=crop',
    'sev tamatar':'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&h=300&fit=crop',
    'egg curry':  'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=300&fit=crop',
    'chicken':    'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&h=300&fit=crop',

    // Breakfast items
    'poha':       'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400&h=300&fit=crop',
    'upma':       'https://images.unsplash.com/photo-1626200928309-0a3aa3d57527?w=400&h=300&fit=crop',
    'idli':       'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400&h=300&fit=crop',
    'dosa':       'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=400&h=300&fit=crop',
    'masala dosa':'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=400&h=300&fit=crop',
    'bread':      'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop',
    'omelette':   'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=300&fit=crop',
    'tea':        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
    'chai':       'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
    'coffee':     'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=300&fit=crop',
    'milk':       'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=300&fit=crop',
    'banana':     'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&h=300&fit=crop',

    // Snacks
    'samosa':     'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?w=400&h=300&fit=crop',
    'pakora':     'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&h=300&fit=crop',
    'sandwich':   'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&h=300&fit=crop',
    'maggi':      'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=400&h=300&fit=crop',
    'bhel puri':  'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=400&h=300&fit=crop',
    'biscuits':   'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&h=300&fit=crop',

    // Sides & Desserts
    'curd':       'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=300&fit=crop',
    'dahi':       'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=300&fit=crop',
    'raita':      'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=300&fit=crop',
    'salad':      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop',
    'papad':      'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=300&fit=crop',
    'pickle':     'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=400&h=300&fit=crop',
    'gulab jamun':'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=400&h=300&fit=crop',
    'kheer':      'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400&h=300&fit=crop',
    'halwa':      'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?w=400&h=300&fit=crop'
  };

  // Fallback images per meal type
  const mealFallback = {
    Breakfast: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400&h=300&fit=crop',
    Lunch:     'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop',
    Snacks:    'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&h=300&fit=crop',
    Dinner:    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop',
  };

  const mealAccents = {
    Breakfast: { bg: '#fffbeb', border: '#fde68a', label: '#92400e', icon: '🌅' },
    Lunch:     { bg: '#f0f9ff', border: '#bae6fd', label: '#0c4a6e', icon: '☀️' },
    Snacks:    { bg: '#fdf4ff', border: '#e9d5ff', label: '#581c87', icon: '🍵' },
    Dinner:    { bg: '#f0fdf4', border: '#bbf7d0', label: '#14532d', icon: '🌙' },
  };

  const getFoodImage = (itemName) => {
    const key = itemName.trim().toLowerCase();
    // exact match
    if (FOOD_IMAGES[key]) return FOOD_IMAGES[key];
    // partial match — check if any keyword is contained in the item name
    for (const [k, url] of Object.entries(FOOD_IMAGES)) {
      if (key.includes(k) || k.includes(key)) return url;
    }
    return null;
  };

  const [extraMeal, setExtraMeal] = useState('');
  const [extraPlates, setExtraPlates] = useState(1);

  // Robust real-time listener for Food Menu & Headcount
  useEffect(() => {
    let unsubMenu = null;
    let unsubHeadcount = null;
    let unsubReq = null;

    const attachListeners = (targetPgId) => {
      if (!targetPgId || targetPgId === 'primary') return;

      // 1. Listen to Weekly Food Menu & Admin Settings from pg_owners
      const pgDocRef = doc(db, 'pg_owners', targetPgId);
      unsubMenu = onSnapshot(pgDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.foodMenu && Object.keys(data.foodMenu).length > 0) {
            setFoodData(data.foodMenu);
          }
          if (data.foodMenuImages) setFoodMenuImages(data.foodMenuImages);
          if (data.foodItemImages) setFoodItemImages(data.foodItemImages);
          if (data.lastMenuEdit) setLastMenuEdit(data.lastMenuEdit);
          if (data.pausedMeals) setAdminPausedMeals(data.pausedMeals);
        }
      }, (err) => console.warn('Student food menu listener warning:', err));

      // 2. Listen to eaten status & daily paused meals
      const currentToday = getTodayStr();
      const headcountDocRef = doc(db, 'mess_headcount', `${targetPgId}_${currentToday}`);
      unsubHeadcount = onSnapshot(headcountDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (user?.uid) {
            setEatenStatus({
              breakfast: !!data[`${user.uid}_breakfast_eaten`],
              lunch: !!data[`${user.uid}_lunch_eaten`],
              snacks: !!data[`${user.uid}_snacks_eaten`],
              dinner: !!data[`${user.uid}_dinner_eaten`],
            });
          }
          if (data.pausedMeals) {
            setAdminPausedMeals(prev => ({
              ...prev,
              [currentToday]: { ...(prev[currentToday] || {}), ...data.pausedMeals }
            }));
          }
        }
      }, (err) => console.warn('Student headcount listener warning:', err));

      // 3. Listen to Student's specific Food Requests
      if (user?.uid) {
        const reqDocRef = doc(db, 'pg_owners', targetPgId, 'food_requests', user.uid);
        unsubReq = onSnapshot(reqDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.todayStatus) setTodayRequests(data.todayStatus);
          }
        }, (err) => console.warn('Student request listener warning:', err));
      }
    };

    if (resolvedPgId && resolvedPgId !== 'primary') {
      attachListeners(resolvedPgId);
    } else if (user?.uid) {
      // Fallback discovery: query tenants collection for this student's admin/pg ID
      const discoverTenantPg = async () => {
        try {
          const qTen = query(collection(db, 'tenants'), where('tenantId', '==', user.uid));
          const snap = await getDocs(qTen);
          let targetId = null;
          if (!snap.empty) {
            const tData = snap.docs[0].data();
            targetId = (tData.pgId && tData.pgId !== 'primary') ? tData.pgId : (tData.adminId || tData.pgId);
          } else if (user?.phone) {
            const qPhone = query(collection(db, 'tenants'), where('phone', '==', user.phone));
            const snapP = await getDocs(qPhone);
            if (!snapP.empty) {
              const tData = snapP.docs[0].data();
              targetId = (tData.pgId && tData.pgId !== 'primary') ? tData.pgId : (tData.adminId || tData.pgId);
            }
          }
          if (targetId) {
            attachListeners(targetId);
          }
        } catch (e) {
          console.warn('Fallback tenant PG lookup error:', e);
        }
      };
      discoverTenantPg();
    }

    return () => {
      if (unsubMenu) unsubMenu();
      if (unsubReq) unsubReq();
      if (unsubHeadcount) unsubHeadcount();
    };
  }, [user, resolvedPgId]);

  // Listen to Food Vacations collection for this tenant
  useEffect(() => {
    if (!user?.uid) return;
    try {
      const vacQuery = query(
        collection(db, 'food_vacations'),
        where('tenantId', '==', user.uid)
      );
      const unsubVacations = onSnapshot(vacQuery, (snap) => {
        const list = [];
        snap.forEach(d => {
          list.push({ id: d.id, ...d.data() });
        });
        setVacationsList(list);
      }, (err) => {
        console.warn('food_vacations listener warning:', err);
      });
      return () => unsubVacations();
    } catch (err) {
      console.warn('Error setting up food_vacations listener:', err);
    }
  }, [user?.uid]);

  // Resolve active or upcoming food vacation
  const todayStr = getTodayStr();
  const currentOrUpcomingVacation = (() => {
    // 1. Check for active/shortened vacation covering today
    const activeToday = getStudentActiveVacation(vacationsList, user?.uid, todayStr);
    if (activeToday) return activeToday;

    // 2. Check for any active or shortened vacation ending on or after today
    const upcoming = vacationsList.find(v => (v.status === 'active' || v.status === 'shortened') && v.endDate >= todayStr);
    if (upcoming) return upcoming;

    // 3. Fallback to profile foodVacation data
    const profileVac = user?.profileData?.foodVacation || user?.foodVacation;
    if (profileVac && (profileVac.status === 'active' || profileVac.status === 'shortened') && profileVac.endDate >= todayStr) {
      return profileVac;
    }

    return null;
  })();

  const isMealPausedToday = (mealName) => {
    if (!currentOrUpcomingVacation) return false;
    return isMealPausedOnDate(currentOrUpcomingVacation, todayStr, mealName);
  };

  const isMealPausedByAdmin = (mealName) => {
    if (!mealName) return false;
    const mealKey = mealName.toLowerCase();
    const today = getTodayStr();
    return !!(adminPausedMeals?.[today]?.[mealKey] || adminPausedMeals?.[mealKey]);
  };

  const handleMealCheckboxToggle = (mealKey) => {
    setSelectedMeals(prev => {
      const exists = prev.includes(mealKey);
      let updated;
      if (exists) {
        updated = prev.filter(m => m !== mealKey);
      } else {
        updated = [...prev, mealKey];
      }
      setIsFullDayVacation(updated.length === ALL_MEALS.length);
      return updated;
    });
  };

  const handleFullDayToggle = (checked) => {
    setIsFullDayVacation(checked);
    if (checked) {
      setSelectedMeals([...ALL_MEALS]);
    }
  };

  const handleBookVacation = async () => {
    if (!user?.uid) return;
    const rangeCheck = validateVacationRange(vacationStartDate, vacationEndDate);
    if (!rangeCheck.valid) {
      alert(rangeCheck.error);
      return;
    }

    if (!isFullDayVacation && selectedMeals.length === 0) {
      alert('Please select at least one meal to pause.');
      return;
    }

    startLoading();
    try {
      const adminId = user.subscribedPG?.adminId || user.subscribedPG?.ownerUid || user.subscribedPG?.pgId || '';
      const pgId = user.subscribedPG?.pgId || '';
      const roomNumber = user.profileData?.roomDetails?.roomNumber || user.subscribedPG?.roomNumber || user.subscribedPG?.roomNo || '';
      const bedNumber = user.profileData?.roomDetails?.bedNumber || '';

      const vacationData = buildVacationDoc({
        tenantId: user.uid,
        tenantName: user.name || 'Student',
        tenantPhone: user.phone || user.profileData?.phoneNumber || '',
        roomNumber,
        bedNumber,
        adminId,
        pgId,
        startDate: vacationStartDate,
        endDate: vacationEndDate,
        isAllMeals: isFullDayVacation,
        meals: isFullDayVacation ? ALL_MEALS : selectedMeals,
        reason: vacationReason.trim(),
        status: 'active'
      });

      // 1. Save document to food_vacations collection
      await setDoc(doc(db, 'food_vacations', vacationData.id), vacationData);

      // 2. Sync to users/{uid}
      await setDoc(doc(db, 'users', user.uid), {
        foodVacation: vacationData
      }, { merge: true });

      // 3. Sync to tenants/{uid}
      await setDoc(doc(db, 'tenants', user.uid), {
        foodVacation: vacationData
      }, { merge: true });

      setActiveModal(null);
      // Reset form
      setVacationStartDate('');
      setVacationEndDate('');
      setVacationReason('');
      setIsFullDayVacation(true);
      setSelectedMeals([...ALL_MEALS]);
      alert('Food vacation scheduled successfully! Your daily meals are now paused.');
    } catch (err) {
      console.error('Error booking vacation:', err);
      alert('Failed to schedule food vacation. Please try again.');
    } finally {
      stopLoading();
    }
  };

  const handleShortenVacation = async () => {
    if (!currentOrUpcomingVacation || !user?.uid) return;
    if (!shortenNewDate) {
      alert('Please select a new return date.');
      return;
    }
    const today = getTodayStr();
    if (shortenNewDate < today) {
      alert('New return date cannot be in the past.');
      return;
    }
    if (shortenNewDate < currentOrUpcomingVacation.startDate) {
      alert('New return date cannot be earlier than vacation start date.');
      return;
    }
    if (shortenNewDate >= currentOrUpcomingVacation.endDate) {
      alert('New return date must be earlier than current end date.');
      return;
    }

    startLoading();
    try {
      const updatedVacation = {
        ...currentOrUpcomingVacation,
        originalEndDate: currentOrUpcomingVacation.originalEndDate || currentOrUpcomingVacation.endDate,
        endDate: shortenNewDate,
        dates: generateDateRange(currentOrUpcomingVacation.startDate, shortenNewDate),
        status: 'shortened',
        updatedAt: new Date().toISOString()
      };

      if (currentOrUpcomingVacation.id) {
        await setDoc(doc(db, 'food_vacations', currentOrUpcomingVacation.id), updatedVacation, { merge: true });
      }
      await setDoc(doc(db, 'users', user.uid), { foodVacation: updatedVacation }, { merge: true });
      await setDoc(doc(db, 'tenants', user.uid), { foodVacation: updatedVacation }, { merge: true });

      setActiveModal(null);
      setShortenNewDate('');
      alert('Food vacation shortened successfully!');
    } catch (err) {
      console.error('Error shortening vacation:', err);
      alert('Failed to update return date. Please try again.');
    } finally {
      stopLoading();
    }
  };

  const handleResumeMealsNow = async () => {
    if (!currentOrUpcomingVacation || !user?.uid) return;
    startLoading();
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = formatDateStr(yesterday);

      const updatedVacation = {
        ...currentOrUpcomingVacation,
        status: 'resumed',
        resumedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        endDate: yesterdayStr,
        dates: currentOrUpcomingVacation.startDate <= yesterdayStr ? generateDateRange(currentOrUpcomingVacation.startDate, yesterdayStr) : []
      };

      if (currentOrUpcomingVacation.id) {
        await setDoc(doc(db, 'food_vacations', currentOrUpcomingVacation.id), updatedVacation, { merge: true });
      }
      await setDoc(doc(db, 'users', user.uid), { foodVacation: updatedVacation }, { merge: true });
      await setDoc(doc(db, 'tenants', user.uid), { foodVacation: updatedVacation }, { merge: true });

      setActiveModal(null);
      alert('Meals resumed successfully! Normal food ordering is now active.');
    } catch (err) {
      console.error('Error resuming meals:', err);
      alert('Failed to resume meals. Please try again.');
    } finally {
      stopLoading();
    }
  };

  const hasAnyData = days.some(d => meals.some(m => foodData[d]?.[m]));

  // Get current day string matching the days array
  const todayDate = new Date();
  const jsDay = todayDate.getDay(); // 0 is Sunday, 1 is Monday
  const dayMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDayStr = dayMap[jsDay];

  // Determine active meal period based on time
  const currentHour = todayDate.getHours();
  const currentMinutes = todayDate.getMinutes();
  const timeInDecimal = currentHour + currentMinutes / 60;
  
  let activePeriod = 'evening';
  if (timeInDecimal < 11.5) {
    activePeriod = 'morning';
  } else if (timeInDecimal < 16) {
    activePeriod = 'afternoon';
  }

  const handleMealAction = async (meal, actionType) => {
    const targetPg = resolvedPgId;
    if (!targetPg || !user?.uid) return;
    if (isMealPausedByAdmin(meal)) {
      alert(`Cannot ${actionType}: ${meal} has been paused by PG Admin / Manager for today.`);
      return;
    }
    if (isMealPausedToday(meal)) {
      alert(`Cannot ${actionType}: You are currently on Food Vacation for ${meal}.`);
      return;
    }
    startLoading();
    try {
      const docRef = doc(db, 'pg_owners', targetPg, 'food_requests', user.uid);
      
      // If the current status is already the actionType, we "undo" it by setting it to null
      const currentStatus = todayRequests[meal];
      const newStatus = currentStatus === actionType ? null : actionType;

      const newTodayStatus = { ...todayRequests, [meal]: newStatus };
      
      await setDoc(docRef, {
        studentId: user.uid,
        studentName: user.name || 'Unknown',
        roomNumber: user.subscribedPG?.roomNumber || user.subscribedPG?.roomNo || 'Unknown',
        todayStatus: newTodayStatus,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
      
    } catch (err) {
      console.error('Error updating meal status:', err);
    } finally {
      stopLoading();
    }
  };

  const handleSubmitModal = async (type) => {
    const targetPg = resolvedPgId;
    if (!targetPg || !user?.uid) return;
    startLoading();
    try {
      const docRef = doc(db, 'pg_owners', targetPg, 'food_requests', user.uid);
      const timestamp = new Date().toISOString();
      
      if (type === 'rate') {
        await setDoc(docRef, {
          studentId: user.uid,
          studentName: user.name || 'Unknown',
          roomNumber: user.subscribedPG.roomNumber || 'Unknown',
          recentRating: { rating, comment: rateComment, timestamp }
        }, { merge: true });
      } else if (type === 'extra') {
        await setDoc(docRef, {
          studentId: user.uid,
          studentName: user.name || 'Unknown',
          roomNumber: user.subscribedPG.roomNumber || 'Unknown',
          extraPlatesRequest: { date: extraDate, meal: extraMeal, plates: extraPlates, timestamp }
        }, { merge: true });
      }

      setActiveModal(null);
      // Reset states
      setRating(0); setRateComment('');
      setExtraDate(''); setExtraMeal(''); setExtraPlates(1);
    } catch (err) {
      console.error(err);
    } finally {
      stopLoading();
    }
  };

  const handleStudentScan = async (result) => {
    if (isProcessingScan || !result || !result.length) return;
    const text = result[0]?.rawValue || '';
    if (!text) return;

    if (!text.startsWith('FEBEBO_MEAL')) {
      setScanResult({
        type: 'error',
        title: 'Invalid QR Code ❌',
        desc: 'This is not an official Febebo Cook QR pass. Please scan the QR code displayed at the mess counter.'
      });
      return;
    }

    setIsProcessingScan(true);
    const parts = text.split('|');
    // Format: FEBEBO_MEAL | ownerUid | meal | date
    const qrOwnerUid = parts[1];
    const qrMeal = (parts[2] || '').toLowerCase();
    const qrDate = parts[3];

    const studentPgId = user?.subscribedPG?.pgId || user?.subscribedPG?.adminId;

    if (qrOwnerUid && studentPgId && qrOwnerUid !== studentPgId && qrOwnerUid !== user?.subscribedPG?.adminId) {
      setScanResult({
        type: 'error',
        title: 'Mismatched PG 🏢',
        desc: 'This QR code belongs to a different PG. Please scan the QR code for your registered PG.'
      });
      setIsProcessingScan(false);
      return;
    }

    const today = getTodayStr();
    if (qrDate && qrDate !== today) {
      setScanResult({
        type: 'error',
        title: 'Expired QR Code ⏳',
        desc: `This QR code is for ${qrDate}, but today is ${today}. Please ask the cook to generate today's QR code.`
      });
      setIsProcessingScan(false);
      return;
    }

    if (isMealPausedToday(qrMeal)) {
      const mCap = qrMeal.charAt(0).toUpperCase() + qrMeal.slice(1);
      setScanResult({
        type: 'error',
        title: 'Meal Paused 🏖️',
        desc: `Cannot scan: You are currently on Food Vacation for ${mCap}. Please resume your meals in the Food tab if you wish to eat.`
      });
      setIsProcessingScan(false);
      return;
    }

    if (eatenStatus[qrMeal]) {
      const mCap = qrMeal.charAt(0).toUpperCase() + qrMeal.slice(1);
      setScanResult({
        type: 'already',
        title: 'Already Marked! 🍽️',
        desc: `You have already recorded your ${mCap} for today.`
      });
      setIsProcessingScan(false);
      return;
    }

    try {
      const activeAdminId = studentPgId || qrOwnerUid;
      const headcountDocRef = doc(db, 'mess_headcount', `${activeAdminId}_${today}`);
      await setDoc(headcountDocRef, { [`${user.uid}_${qrMeal}_eaten`]: true }, { merge: true });

      // Also update food_requests
      try {
        const reqRef = doc(db, 'pg_owners', activeAdminId, 'food_requests', user.uid);
        await setDoc(reqRef, {
          todayStatus: { [qrMeal]: 'eaten' },
          [`${qrMeal}EatenAt`]: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.warn('Could not update food_requests:', err);
      }

      // Add student notification
      try {
        await addDoc(collection(db, 'users', user.uid, 'notifications'), {
          title: 'Meal Verified! 🍽️',
          desc: `Your ${qrMeal} was successfully recorded. Enjoy your food!`,
          type: 'Food',
          action: 'VIEW_FOOD',
          unread: true,
          createdAt: new Date().toISOString()
        });
      } catch (err) {
        console.warn('Could not send notification:', err);
      }

      const mCap = qrMeal.charAt(0).toUpperCase() + qrMeal.slice(1);
      setScanResult({
        type: 'success',
        title: 'Meal Verified! ✅',
        desc: `Your ${mCap} has been recorded in the live headcount. Enjoy your meal!`
      });
      setShowScannerModal(false);
    } catch (err) {
      console.error('Error saving meal scan:', err);
      setScanResult({
        type: 'error',
        title: 'Failed to Record',
        desc: 'Could not record meal due to a network error. Please try again or ask the cook to mark you manually.'
      });
    } finally {
      setIsProcessingScan(false);
    }
  };

  const todayString = new Date().toISOString().split('T')[0];

  const renderModal = () => {
    if (!activeModal) return null;

    return (
      <>
        <div className="filter-modal-backdrop" onClick={() => setActiveModal(null)} />
        <div className="filter-modal" style={{ padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
          <div className="filter-modal-header" style={{ marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
              {activeModal === 'rate' && 'Rate Today\'s Food'}
              {activeModal === 'extra' && 'Request Extra Plates'}
              {activeModal === 'vacation' && 'Food Vacation / Long-Term Leave'}
              {activeModal === 'shorten' && 'Shorten Return Date'}
              {activeModal === 'resumeConfirm' && 'Resume Meals Confirmation'}
            </h3>
            <button onClick={() => setActiveModal(null)} className="close-btn"><X size={20}/></button>
          </div>

          {activeModal === 'rate' && (
            <div className="modal-form-content">
              <div className="rating-stars" style={{ display: 'flex', gap: '8px', marginBottom: '20px', justifyContent: 'center' }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <Star 
                    key={star} 
                    size={32} 
                    fill={star <= rating ? '#fbbf24' : 'transparent'} 
                    color={star <= rating ? '#fbbf24' : '#cbd5e1'}
                    onClick={() => setRating(star)}
                    style={{ cursor: 'pointer' }}
                  />
                ))}
              </div>
              <textarea 
                placeholder="Optional feedback..."
                value={rateComment}
                onChange={e => setRateComment(e.target.value)}
                className="form-input"
                style={{ width: '100%', minHeight: '80px', marginBottom: '20px', resize: 'none' }}
              />
              <button 
                className="btn-primary" 
                disabled={rating === 0} 
                onClick={() => handleSubmitModal('rate')}
                style={{ width: '100%' }}
              >
                Submit Rating
              </button>
            </div>
          )}

          {activeModal === 'extra' && (
            <div className="modal-form-content" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>Date</label>
                <input type="date" min={todayString} value={extraDate} onChange={e => setExtraDate(e.target.value)} className="form-input" />
              </div>
              <div className="form-group">
                <label>Meal</label>
                <div className="meal-chip-grid">
                  {meals.map(m => (
                    <button
                      key={m}
                      className={`meal-chip ${extraMeal === m ? 'active' : ''}`}
                      onClick={() => setExtraMeal(m)}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Number of Plates</label>
                <input type="number" min="1" max="10" value={extraPlates} onChange={e => setExtraPlates(e.target.value)} className="form-input" />
              </div>
              <button 
                className="btn-primary" 
                disabled={!extraDate || !extraMeal || extraPlates < 1} 
                onClick={() => handleSubmitModal('extra')}
                style={{ marginTop: '8px', width: '100%' }}
              >
                Confirm Request
              </button>
            </div>
          )}

          {/* VACATION BOOKING MODAL */}
          {activeModal === 'vacation' && (
            <div className="modal-form-content" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
                Pause your daily meals across a custom date range. Your meals will be automatically deducted from kitchen mess headcounts.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px', display: 'block' }}>
                    Start Date
                  </label>
                  <input 
                    type="date" 
                    min={getTodayStr()} 
                    value={vacationStartDate} 
                    onChange={e => {
                      setVacationStartDate(e.target.value);
                      if (vacationEndDate && e.target.value > vacationEndDate) {
                        setVacationEndDate(e.target.value);
                      }
                    }} 
                    className="form-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13px' }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px', display: 'block' }}>
                    End Date
                  </label>
                  <input 
                    type="date" 
                    min={vacationStartDate || getTodayStr()} 
                    value={vacationEndDate} 
                    onChange={e => setVacationEndDate(e.target.value)} 
                    className="form-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13px' }}
                  />
                </div>
              </div>

              {vacationStartDate && vacationEndDate && vacationStartDate <= vacationEndDate && (
                <div style={{ background: '#ecfdf5', borderRadius: '12px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#065f46' }}>Total Duration</span>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: '#047857', background: '#d1fae5', padding: '3px 10px', borderRadius: '20px' }}>
                    {generateDateRange(vacationStartDate, vacationEndDate).length} days
                  </span>
                </div>
              )}

              {/* Granular Meal Selection */}
              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', margin: 0 }}>
                    Meals to Pause
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '700', color: '#059669' }}>
                    <input 
                      type="checkbox" 
                      checked={isFullDayVacation}
                      onChange={e => handleFullDayToggle(e.target.checked)}
                      style={{ accentColor: '#059669', width: '16px', height: '16px' }}
                    />
                    Full Day (All Meals)
                  </label>
                </div>

                {!isFullDayVacation && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: '6px' }}>
                    {ALL_MEALS.map(mealKey => {
                      const isSelected = selectedMeals.includes(mealKey);
                      return (
                        <div 
                          key={mealKey} 
                          onClick={() => handleMealCheckboxToggle(mealKey)}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '12px',
                            border: isSelected ? '1.5px solid #059669' : '1.5px solid #e2e8f0',
                            background: isSelected ? '#ecfdf5' : '#f8fafc',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s'
                          }}
                        >
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => {}} // handled by parent div
                            style={{ accentColor: '#059669', width: '16px', height: '16px' }}
                          />
                          <span style={{ fontSize: '13px', fontWeight: isSelected ? '800' : '600', color: isSelected ? '#065f46' : '#475569' }}>
                            {MEAL_LABELS[mealKey]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Optional Reason */}
              <div className="form-group">
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px', display: 'block' }}>
                  Reason (Optional)
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. Going home, Exams, Vacation..." 
                  value={vacationReason} 
                  onChange={e => setVacationReason(e.target.value)} 
                  className="form-input"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13px' }}
                />
              </div>

              <button 
                type="button"
                className="btn-primary" 
                disabled={!vacationStartDate || !vacationEndDate || (!isFullDayVacation && selectedMeals.length === 0)} 
                onClick={handleBookVacation}
                style={{
                  marginTop: '8px',
                  width: '100%',
                  padding: '14px',
                  background: 'linear-gradient(135deg, #059669, #10b981)',
                  color: 'white',
                  borderRadius: '14px',
                  fontWeight: '800',
                  fontSize: '14px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(16,185,129,0.3)'
                }}
              >
                Schedule Food Vacation
              </button>
            </div>
          )}

          {/* SHORTEN VACATION MODAL */}
          {activeModal === 'shorten' && currentOrUpcomingVacation && (
            <div className="modal-form-content" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '14px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Current Vacation</span>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', marginTop: 4 }}>
                  {formatDateDisplay(currentOrUpcomingVacation.startDate)} – {formatDateDisplay(currentOrUpcomingVacation.endDate)}
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px', display: 'block' }}>
                  New Return Date
                </label>
                <input 
                  type="date" 
                  min={getTodayStr() > currentOrUpcomingVacation.startDate ? getTodayStr() : currentOrUpcomingVacation.startDate} 
                  max={currentOrUpcomingVacation.endDate}
                  value={shortenNewDate} 
                  onChange={e => setShortenNewDate(e.target.value)} 
                  className="form-input"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13px' }}
                />
                <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#64748b' }}>
                  Choose an earlier date to end your leave. Daily meals will resume immediately after this new date.
                </p>
              </div>

              <button 
                type="button"
                className="btn-primary" 
                disabled={!shortenNewDate || shortenNewDate >= currentOrUpcomingVacation.endDate} 
                onClick={handleShortenVacation}
                style={{
                  marginTop: '8px',
                  width: '100%',
                  padding: '14px',
                  background: 'linear-gradient(135deg, #059669, #10b981)',
                  color: 'white',
                  borderRadius: '14px',
                  fontWeight: '800',
                  fontSize: '14px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Update Return Date
              </button>
            </div>
          )}

          {/* EARLY RESUME CONFIRMATION MODAL */}
          {activeModal === 'resumeConfirm' && currentOrUpcomingVacation && (
            <div className="modal-form-content" style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 36 }}>restaurant</span>
              </div>

              <div>
                <h4 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                  Ready to eat again?
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
                  Resuming meals will immediately end your Food Vacation. You will be re-added to the kitchen mess headcount and daily meal ordering/QR passes will be unlocked.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button 
                  type="button"
                  onClick={() => setActiveModal(null)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    background: 'white',
                    color: '#475569',
                    fontWeight: '700',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Keep On Leave
                </button>

                <button 
                  type="button"
                  onClick={handleResumeMealsNow}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '12px',
                    border: 'none',
                    background: '#059669',
                    color: 'white',
                    fontWeight: '800',
                    fontSize: '13px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(5,150,105,0.3)'
                  }}
                >
                  Resume Meals Now
                </button>
              </div>
            </div>
          )}
        </div>
      </>
    );
  };

  const mealImages = {
    Breakfast: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=600&h=400&fit=crop',
    Lunch: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=400&fit=crop',
    Snacks: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600&h=400&fit=crop',
    Dinner: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&h=400&fit=crop'
  };

  const [selectedWeeklyDay, setSelectedWeeklyDay] = useState(currentDayStr);

  const renderTodayMealCard = (title, icon, mealsList) => {
    return (
      <div className="today-meal-block">
        <div className="today-meal-header">
          {icon}
          <h4>{title}</h4>
        </div>
        
        {mealsList.map(meal => {
          const foodItem = foodData[currentDayStr]?.[meal] || 'Not set yet';
          const status = todayRequests[meal]; // 'pack', 'cancel', or null
          const isPaused = isMealPausedToday(meal);
          const isAdminPaused = isMealPausedByAdmin(meal);
          const items = foodItem !== 'Not set yet' ? foodItem.split(/[,;]/).map(s => s.trim()).filter(Boolean) : [];
          const accent = mealAccents[meal] || { bg: '#f8fafc', border: '#e2e8f0', label: '#334155' };
          const mealPhoto = foodMenuImages?.[currentDayStr]?.[meal];
          
          return (
            <div key={meal} className={`today-meal-subcard-modern ${status ? 'has-status' : ''}`} style={{ flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
              <div style={{ background: accent.bg, padding: '12px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontWeight: '800', color: accent.label, textTransform: 'uppercase', fontSize: '13px', letterSpacing: '1px' }}>{meal}</span>
                  <span style={{ fontSize: '11px', color: accent.label, opacity: 0.8, fontWeight: 700 }}>({items.length} items)</span>
                </div>
                {isAdminPaused ? (
                  <span style={{ fontSize: '11px', fontWeight: '800', padding: '2px 8px', borderRadius: '12px', color: 'white', background: '#e11d48' }}>
                    PAUSED
                  </span>
                ) : status ? (
                  <span style={{ fontSize: '11px', fontWeight: '800', padding: '2px 8px', borderRadius: '12px', color: 'white', background: status === 'pack' ? '#0891b2' : '#e11d48' }}>
                    {status === 'pack' ? 'PACKED' : 'CANCELED'}
                  </span>
                ) : null}
              </div>

              <div style={{ padding: '14px 12px', display: 'flex', gap: '12px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', minHeight: '115px' }}>
                {items.length > 0 ? items.map((item, idx) => {
                  const customImg = foodItemImages?.[currentDayStr]?.[meal]?.[item];
                  const imgSrc = customImg || getDishPresetImage(item) || getFoodImage(item) || mealFallback[meal];

                  return (
                    <div key={idx} style={{ flexShrink: 0, width: '92px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <div style={{
                        width: '82px', height: '82px', borderRadius: '14px',
                        backgroundImage: `url(${imgSrc})`,
                        backgroundSize: 'cover', backgroundPosition: 'center',
                        border: `2px solid ${customImg ? '#10b981' : accent.border}`,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        position: 'relative'
                      }}>
                        {customImg && (
                          <div style={{
                            position: 'absolute', bottom: 3, right: 3,
                            background: 'rgba(16,185,129,0.9)', color: '#fff',
                            fontSize: '9px', fontWeight: 900, padding: '1px 5px',
                            borderRadius: '4px', display: 'flex', alignItems: 'center', gap: 2
                          }}>
                            📸
                          </div>
                        )}
                      </div>
                      <span style={{
                        fontSize: '12px', fontWeight: '700', color: '#334155',
                        textAlign: 'center', lineHeight: '1.25', textTransform: 'capitalize',
                        wordBreak: 'break-word', width: '90px'
                      }}>{item}</span>
                    </div>
                  );
                }) : (
                  <div style={{ width: '100%', textAlign: 'center', color: '#94a3b8', padding: '20px 0', fontSize: '14px', fontWeight: '600' }}>Not set yet</div>
                )}
              </div>
              
              <div className="subcard-actions" style={{ padding: '12px', borderTop: '1px solid #f1f5f9', background: 'white', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {isAdminPaused ? (
                  <div style={{
                    background: '#fff1f2',
                    border: '1.5px solid #fecaca',
                    borderRadius: '14px',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '10px',
                      background: '#ffe4e6', color: '#e11d48',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
                        pause_circle
                      </span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#9f1239' }}>
                        ⏸️ {meal} Paused Today
                      </div>
                      <div style={{ fontSize: '11px', color: '#be123c', fontWeight: '600', marginTop: '2px' }}>
                        This meal has been paused by PG Admin / Manager.
                      </div>
                    </div>
                  </div>
                ) : isPaused ? (
                  <div className="vacation-locked-action-box">
                    <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#059669', flexShrink: 0 }}>
                      beach_access
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#064e3b' }}>
                        🏖️ Meals Paused - On Food Vacation
                      </div>
                      <div style={{ fontSize: '11px', color: '#047857', fontWeight: '600', marginTop: '2px' }}>
                        Daily eating actions and meal pass are locked for this meal
                      </div>
                    </div>
                  </div>
                ) : eatenStatus[meal.toLowerCase()] ? (
                  <button className="meal-btn" style={{ background: '#10b981', color: 'white', border: 'none', width: '100%', padding: '11px', borderRadius: '12px', fontWeight: '800', cursor: 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
                    Eaten ✓
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={() => { setTargetScanMeal(meal.toLowerCase()); setShowScannerModal(true); }}
                      className="meal-btn" 
                      style={{ background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', border: 'none', width: '100%', padding: '11px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 4px 12px rgba(16,185,129,0.2)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>qr_code_scanner</span>
                      Scan Cook's QR to Eat
                    </button>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className={`meal-btn pack-btn ${status === 'pack' ? 'active' : ''}`}
                        onClick={() => handleMealAction(meal, 'pack')}
                        style={{ flex: 1 }}
                      >
                        <ShoppingBag size={14} />
                        {status === 'pack' ? 'Packed' : 'Pack'}
                      </button>
                      <button 
                        className={`meal-btn cancel-btn ${status === 'cancel' ? 'active' : ''}`}
                        onClick={() => handleMealAction(meal, 'cancel')}
                        style={{ flex: 1 }}
                      >
                        <Ban size={14} />
                        {status === 'cancel' ? 'Canceled' : 'Cancel'}
                      </button>
                    </div>
                    <div style={{ textAlign: 'center', marginTop: 2 }}>
                      <button 
                        onClick={() => { setActiveMealQR(meal); setShowQRModal(true); }} 
                        style={{ background: 'none', border: 'none', fontSize: 11, fontWeight: 700, color: '#94a3b8', cursor: 'pointer', textDecoration: 'underline' }}>
                        Or show my meal pass
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="page-content bg-white pb-nav">
      <TopBar title="Food Menu" />
      
      {/* Tab Switcher */}
      <div className="food-tab-switcher">
        <button 
          className={`food-tab ${activeTab === 'today' ? 'active' : ''}`} 
          onClick={() => setActiveTab('today')}
        >
          Today's Menu
        </button>
        <button 
          className={`food-tab ${activeTab === 'weekly' ? 'active' : ''}`} 
          onClick={() => { setActiveTab('weekly'); setSelectedWeeklyDay(currentDayStr); }}
        >
          Full Week
        </button>
      </div>

      <div className="food-scroll-area">
        {/* SELF COOKING / MESS EXCLUDED BANNER */}
        {(user?.subscribedPG?.foodIncluded === false || user?.foodIncluded === false) && (
          <div style={{ padding: '16px 16px 0' }}>
            <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '16px', padding: '14px 16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '24px', flexShrink: 0 }}>🍳</div>
              <div>
                <h4 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 800, color: '#92400e' }}>
                  Mess Not Included (Self-Cooking Plan)
                </h4>
                <p style={{ margin: 0, fontSize: '12.5px', color: '#b45309', lineHeight: 1.4 }}>
                  Your room package is registered as Self-Cooking without mess facility. You can browse the daily menu, but your meals are excluded from kitchen headcount. Contact PG Management to add mess facility.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ACTIVE FOOD VACATION BANNER */}
        {currentOrUpcomingVacation && (
          <div style={{ padding: '16px 16px 0' }}>
            <div className="food-vacation-active-banner">
              <div className="vacation-banner-top">
                <div className="vacation-icon-badge">🏖️</div>
                <div className="vacation-banner-content">
                  <div className="vacation-status-pill">
                    {currentOrUpcomingVacation.status === 'shortened' ? 'FOOD VACATION (SHORTENED)' : 'FOOD VACATION ACTIVE'}
                  </div>
                  <h4 className="vacation-dates-title">
                    Meals Paused until {formatDateDisplay(currentOrUpcomingVacation.endDate)}
                  </h4>
                  <p className="vacation-date-range">
                    {formatDateDisplay(currentOrUpcomingVacation.startDate)} – {formatDateDisplay(currentOrUpcomingVacation.endDate)}
                    {' · '}
                    <span className="vacation-days-tag">
                      {(() => {
                        const today = getTodayStr();
                        if (today >= currentOrUpcomingVacation.startDate) {
                          const diff = Math.max(1, Math.round((new Date(currentOrUpcomingVacation.endDate + 'T12:00:00') - new Date(today + 'T12:00:00')) / (1000 * 60 * 60 * 24)) + 1);
                          return `${diff} ${diff === 1 ? 'day' : 'days'} remaining`;
                        } else {
                          const count = generateDateRange(currentOrUpcomingVacation.startDate, currentOrUpcomingVacation.endDate).length;
                          return `Starts soon (${count} ${count === 1 ? 'day' : 'days'})`;
                        }
                      })()}
                    </span>
                  </p>
                </div>
              </div>

              {/* Paused Meals Chips */}
              <div className="vacation-paused-meals-row">
                <span className="paused-meals-label">Paused:</span>
                {currentOrUpcomingVacation.isAllMeals || !currentOrUpcomingVacation.meals || currentOrUpcomingVacation.meals.length === 4 ? (
                  <span className="meal-tag-pill all-meals">All Meals</span>
                ) : (
                  currentOrUpcomingVacation.meals.map(m => (
                    <span key={m} className="meal-tag-pill">
                      {MEAL_LABELS[m.toLowerCase()] || m}
                    </span>
                  ))
                )}
                {currentOrUpcomingVacation.reason && (
                  <span className="vacation-reason-tag">
                    {currentOrUpcomingVacation.reason}
                  </span>
                )}
              </div>

              {/* Early Resume & Shorten Controls */}
              <div className="vacation-banner-actions">
                <button 
                  type="button"
                  className="btn-vacation-shorten"
                  onClick={() => {
                    setShortenNewDate(currentOrUpcomingVacation.endDate);
                    setActiveModal('shorten');
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit_calendar</span>
                  Shorten Period
                </button>

                <button 
                  type="button"
                  className="btn-vacation-resume"
                  onClick={() => setActiveModal('resumeConfirm')}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>play_circle</span>
                  Resume Meals Now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* LAST EDITED BY BANNER */}
        {lastMenuEdit && (
          <div style={{ padding: '12px 16px 0' }}>
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '11px 15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#6366f1' }}>schedule</span>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                    Menu updated by <span style={{ color: lastMenuEdit.editorRole === 'Cook' ? '#16a34a' : '#7c3aed' }}>{lastMenuEdit.editedBy} ({lastMenuEdit.editorRole})</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    {lastMenuEdit.day} {lastMenuEdit.meal} · {lastMenuEdit.editedAt ? new Date(lastMenuEdit.editedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Recently'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  fetchMenuHistory();
                  setShowMenuHistoryModal(true);
                }}
                style={{
                  background: '#ede9fe',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '6px 12px',
                  color: '#6d28d9',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  whiteSpace: 'nowrap'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>history</span>
                History
              </button>
            </div>
          </div>
        )}

        {/* TODAY VIEW */}
        {activeTab === 'today' && (
          <div className="today-view-container">
            {/* Quick Scan Action Banner */}
            <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderRadius: 20, padding: '16px 18px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, boxShadow: '0 8px 20px rgba(15,23,42,0.12)' }}>
              <div>
                <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, color: '#38bdf8' }}>Mess Counter</span>
                <h4 style={{ margin: '3px 0 2px', fontSize: 16, fontWeight: 900, color: '#ffffff' }}>At the Dining Hall?</h4>
                <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>Scan Cook's QR to mark your food</p>
              </div>
              <button 
                onClick={() => { setTargetScanMeal(''); setShowScannerModal(true); }}
                style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: 14, padding: '10px 14px', fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 12px rgba(16,185,129,0.3)', whiteSpace: 'nowrap' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>qr_code_scanner</span>
                Scan QR
              </button>
            </div>

            {activePeriod === 'morning' && renderTodayMealCard('Morning', <Coffee size={20} color="#d97706" />, ['Breakfast'])}
            {activePeriod === 'afternoon' && renderTodayMealCard('Afternoon', <Sun size={20} color="#0284c7" />, ['Lunch'])}
            {activePeriod === 'evening' && renderTodayMealCard('Evening', <Moon size={20} color="#4338ca" />, ['Snacks', 'Dinner'])}
          </div>
        )}

        {/* WEEKLY VIEW */}
        {activeTab === 'weekly' && (
          !hasAnyData ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 32px', gap: '16px', textAlign: 'center' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Utensils size={36} color="#0891b2" />
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>Menu Not Set</h3>
              <p style={{ margin: 0, fontSize: '14px', color: '#64748b', lineHeight: '1.6' }}>
                Your PG's weekly food menu will appear here once the admin sets it up.
              </p>
            </div>
          ) : (
            <div className="weekly-list-container" style={{ padding: '0 16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Horizontal Day Selector */}
              <div style={{ display: 'flex', overflowX: 'auto', gap: '8px', paddingBottom: '8px', scrollbarWidth: 'none', msOverflowStyle: 'none' }} className="hide-scrollbar">
                {days.map(day => {
                  const isSelected = selectedWeeklyDay === day;
                  const isToday = day === currentDayStr;
                  const shortDay = day.substring(0, 3);
                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedWeeklyDay(day)}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '20px',
                        border: isSelected ? 'none' : '1px solid #e2e8f0',
                        background: isSelected ? '#166534' : 'white',
                        color: isSelected ? 'white' : '#64748b',
                        fontWeight: '800',
                        fontSize: '14px',
                        whiteSpace: 'nowrap',
                        boxShadow: isSelected ? '0 4px 10px rgba(22, 101, 52, 0.2)' : 'none',
                        position: 'relative',
                        cursor: 'pointer'
                      }}
                    >
                      {shortDay}
                      {isToday && !isSelected && <span style={{ position:'absolute', top: 0, right: 0, width: 8, height: 8, background: '#16a34a', borderRadius: '50%' }}></span>}
                    </button>
                  );
                })}
              </div>


              {/* Selected Day's Card */}
              {(() => {
                
                const isToday = selectedWeeklyDay === currentDayStr;
                const hasAnyMeal = meals.some(m => foodData[selectedWeeklyDay]?.[m]);

                return (
                  <div style={{ background: isToday ? '#f0fdf4' : 'white', borderRadius: '20px', border: isToday ? '1.5px solid #16a34a' : '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                    {/* Day Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', borderBottom: '1px solid #f1f5f9' }}>
                      <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: isToday ? '#166534' : '#0f172a' }}>
                        {selectedWeeklyDay}
                      </h4>
                      {isToday && (
                        <span style={{ fontSize: '10px', background: '#16a34a', color: 'white', padding: '4px 10px', borderRadius: '12px', fontWeight: '800', letterSpacing: '0.5px' }}>TODAY</span>
                      )}
                    </div>

                    {!hasAnyMeal ? (
                      <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '14px', fontWeight: '600', padding: '28px 0', margin: 0 }}>No menu set for this day.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                        {meals.map(meal => {
                          const foodItem = foodData[selectedWeeklyDay]?.[meal];
                          if (!foodItem) return null;
                          const accent = mealAccents[meal];
                          const mealPhoto = foodMenuImages?.[selectedWeeklyDay]?.[meal];
                          // Split comma/semicolon separated items
                          const items = foodItem.split(/[,;]/).map(s => s.trim()).filter(Boolean);

                          return (
                            <div key={meal} style={{ background: accent.bg, borderBottom: '1px solid #f1f5f9' }}>
                              {/* Meal section header */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 18px 8px' }}>
                                <span style={{ fontSize: '18px' }}>{accent.icon}</span>
                                <span style={{ fontSize: '13px', fontWeight: '800', color: accent.label, textTransform: 'uppercase', letterSpacing: '1px' }}>{meal}</span>
                                <span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: '700', color: accent.label, background: 'rgba(0,0,0,0.06)', padding: '2px 8px', borderRadius: '10px' }}>
                                  {items.length} item{items.length > 1 ? 's' : ''}
                                </span>
                              </div>

                              {/* Individual items row (horizontal scroll) with per-item photos */}
                              <div style={{ display: 'flex', gap: '12px', padding: '6px 18px 16px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                                {items.map((item, idx) => {
                                  const customImg = foodItemImages?.[selectedWeeklyDay]?.[meal]?.[item];
                                  const imgSrc = customImg || getDishPresetImage(item) || getFoodImage(item) || mealFallback[meal];

                                  return (
                                    <div key={idx} style={{ flexShrink: 0, width: '92px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                      <div style={{
                                        width: '82px', height: '82px', borderRadius: '14px',
                                        backgroundImage: `url(${imgSrc})`,
                                        backgroundSize: 'cover', backgroundPosition: 'center',
                                        border: `2px solid ${customImg ? '#10b981' : accent.border}`,
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                        position: 'relative'
                                      }}>
                                        {customImg && (
                                          <div style={{
                                            position: 'absolute', bottom: 3, right: 3,
                                            background: 'rgba(16,185,129,0.9)', color: '#fff',
                                            fontSize: '9px', fontWeight: 900, padding: '1px 5px',
                                            borderRadius: '4px'
                                          }}>
                                            📸
                                          </div>
                                        )}
                                      </div>
                                      <span style={{
                                        fontSize: '12px', fontWeight: '700', color: '#334155',
                                        textAlign: 'center', lineHeight: '1.25',
                                        textTransform: 'capitalize',
                                        wordBreak: 'break-word', width: '90px'
                                      }}>{item}</span>
                                    </div>
                                  );
                                })}
                              </div>                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

            </div>
          )
        )}

        {/* Food Services Section (Shared across both views) */}
        <div className="food-services-section">
          <h3 className="section-title">Food Services</h3>
          
          <div className="food-action-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="food-action-card" onClick={() => setActiveModal('rate')}>
              <div className="action-icon-wrap" style={{ background: '#fef3c7' }}>
                <Star size={24} color="#d97706" />
              </div>
              <span className="action-title">Rate Food</span>
            </div>

            <div className="food-action-card" onClick={() => setActiveModal('extra')}>
              <div className="action-icon-wrap" style={{ background: '#fce7f3' }}>
                <Users size={24} color="#be185d" />
              </div>
              <span className="action-title">Extra Plates</span>
            </div>

            <div 
              className="food-action-card" 
              onClick={() => setActiveModal('vacation')}
              style={{
                border: currentOrUpcomingVacation ? '1.5px solid #10b981' : '1px solid #f1f5f9',
                position: 'relative'
              }}
            >
              <div className="action-icon-wrap" style={{ background: currentOrUpcomingVacation ? '#ecfdf5' : '#f0fdf4' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#059669' }}>
                  beach_access
                </span>
              </div>
              <span className="action-title" style={{ color: currentOrUpcomingVacation ? '#065f46' : '#334155' }}>
                {currentOrUpcomingVacation ? 'Food Vacation' : 'Food Vacation'}
              </span>
              {currentOrUpcomingVacation && (
                <span style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  fontSize: '9px',
                  fontWeight: '900',
                  background: '#10b981',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  textTransform: 'uppercase'
                }}>
                  Active
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {renderModal()}
      
      <BottomNav activeNav="" />
      {/* QR Modal */}
      {showQRModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'white', borderRadius: '24px', padding: '32px 24px', width: '85%', maxWidth: '320px', textAlign: 'center', position: 'relative' }}>
            <button onClick={() => setShowQRModal(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
            </button>

            {isMealPausedByAdmin(activeMealQR) ? (
              <div style={{ padding: '12px 0' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 36 }}>pause_circle</span>
                </div>
                <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>Meal Paused</h3>
                <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#64748b', fontWeight: '500', lineHeight: '1.4' }}>
                  <strong>{activeMealQR}</strong> is paused by PG Admin / Manager for today. Meal pass generation is unavailable.
                </p>
                <button 
                  onClick={() => setShowQRModal(false)}
                  style={{ width: '100%', padding: '12px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', fontSize: '13px' }}
                >
                  Close
                </button>
              </div>
            ) : isMealPausedToday(activeMealQR) ? (
              <div style={{ padding: '12px 0' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 36 }}>block</span>
                </div>
                <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>Meal Pass Blocked</h3>
                <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#64748b', fontWeight: '500', lineHeight: '1.4' }}>
                  You are currently on Food Vacation for <strong>{activeMealQR}</strong>. Meal pass generation is locked.
                </p>
                <button 
                  onClick={() => { setShowQRModal(false); setActiveModal('resumeConfirm'); }}
                  style={{ width: '100%', padding: '12px', background: '#059669', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', fontSize: '13px' }}
                >
                  Resume Meals Now
                </button>
              </div>
            ) : (
              <>
                <h3 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: '900', color: '#0f172a' }}>{activeMealQR} Pass</h3>
                <p style={{ margin: '0 0 24px', fontSize: '14px', color: '#64748b', fontWeight: '500' }}>Show this QR code to the Cook.</p>
                <div style={{ background: 'white', padding: '16px', borderRadius: '16px', border: '2px solid #e2e8f0', display: 'inline-block', marginBottom: '24px' }}>
                  <QRCode value={`MEALPASS|${activeMealQR.toLowerCase()}|${user.uid}|${user.name || 'Student'}|${user?.profileData?.roomDetails?.roomNumber || user?.subscribedPG?.roomNo || ''}`} size={200} />
                </div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>{user.name}</div>
                <div style={{ fontSize: '14px', color: '#64748b', marginTop: '4px', fontWeight: '600' }}>
                  Room {user?.profileData?.roomDetails?.roomNumber || user?.subscribedPG?.roomNo || 'Unassigned'}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Student QR Scanner Modal */}
      {showScannerModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'black', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px', paddingTop: 'calc(20px + env(safe-area-inset-top, 0px))', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
            <div>
              <h3 style={{ margin: 0, color: 'white', fontSize: '18px', fontWeight: 800 }}>Scan Mess Counter QR</h3>
              <p style={{ margin: '2px 0 0', color: '#cbd5e1', fontSize: '12px' }}>Point camera at Cook's screen or counter QR</p>
            </div>
            <button 
              onClick={() => { setShowScannerModal(false); setIsProcessingScan(false); }} 
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
            </button>
          </div>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'black', position: 'relative' }}>
            <div style={{ width: '100%', maxWidth: '420px', overflow: 'hidden' }}>
              <Scanner
                onScan={handleStudentScan}
                onError={(err) => console.warn('QR Scanner warning:', err)}
              />
            </div>
            {isProcessingScan && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', zIndex: 20 }}>
                <div style={{ width: 44, height: 44, border: '4px solid rgba(255,255,255,0.3)', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: 12 }} />
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Verifying Meal...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scan Result Modal */}
      {scanResult && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(5px)', padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 28, width: '100%', maxWidth: 340, padding: '28px 22px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: scanResult.type === 'success' ? '#dcfce7' : scanResult.type === 'already' ? '#fef3c7' : '#fee2e2'
            }}>
              <span className="material-symbols-outlined" style={{
                fontSize: 34,
                color: scanResult.type === 'success' ? '#16a34a' : scanResult.type === 'already' ? '#d97706' : '#dc2626'
              }}>
                {scanResult.type === 'success' ? 'check_circle' : scanResult.type === 'already' ? 'restaurant' : 'error'}
              </span>
            </div>

            <h3 style={{ margin: '0 0 8px', fontSize: 19, fontWeight: 900, color: '#0f172a' }}>{scanResult.title}</h3>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: '#64748b', lineHeight: 1.5, fontWeight: 500 }}>
              {scanResult.desc}
            </p>

            <button
              onClick={() => setScanResult(null)}
              style={{
                width: '100%', padding: '14px', borderRadius: 14, border: 'none', fontWeight: 800, fontSize: 15, cursor: 'pointer',
                background: scanResult.type === 'success' ? '#10b981' : '#0f172a',
                color: 'white',
                boxShadow: scanResult.type === 'success' ? '0 4px 12px rgba(16,185,129,0.3)' : 'none'
              }}
            >
              {scanResult.type === 'success' ? 'Awesome, Thanks!' : 'Understood'}
            </button>
          </div>
        </div>
      )}

      {/* Menu Edit History Modal */}
      {showMenuHistoryModal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(5px)',
          zIndex: 10002, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16
        }}>
          <div style={{
            background: '#ffffff', borderRadius: 24, width: '100%', maxWidth: 440,
            maxHeight: '80vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden'
          }}>
            <div style={{
              padding: '18px 20px', borderBottom: '1px solid #f1f5f9',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ede9fe', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 22 }}>history</span>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#0f172a' }}>Menu Edit History</h3>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b' }}>Audit log of who edited the menu &amp; when</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMenuHistoryModal(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>

            <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {loadingMenuHistory ? (
                <div style={{ textAlign: 'center', padding: '36px 0', color: '#64748b', fontSize: 13, fontWeight: 600 }}>
                  Loading edit history...
                </div>
              ) : menuHistoryList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 16px', color: '#94a3b8' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#cbd5e1' }}>history_toggle_off</span>
                  <p style={{ margin: '8px 0 0', fontSize: 14, fontWeight: 800, color: '#475569' }}>No menu edits recorded yet</p>
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8' }}>Any menu changes made by Admin or Cook will appear here.</p>
                </div>
              ) : (
                menuHistoryList.map((entry, idx) => (
                  <div key={entry.id || idx} style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 14,
                    padding: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 900,
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: entry.editorRole === 'Cook' ? '#dcfce7' : '#ede9fe',
                        color: entry.editorRole === 'Cook' ? '#166534' : '#6d28d9',
                        textTransform: 'uppercase'
                      }}>
                        {entry.editorRole || 'Staff'}: {entry.editedBy || 'Unknown'}
                      </span>
                      <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                        {entry.editedAt ? new Date(entry.editedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Recently'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#6366f1' }}>restaurant_menu</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                        {entry.day} · {entry.meal}
                      </span>
                      {entry.hasPhotos && (
                        <span style={{ fontSize: 10, background: '#ecfdf5', color: '#059669', padding: '1px 6px', borderRadius: 4, fontWeight: 800 }}>
                          📷 Photos Attached
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.4, background: '#fff', padding: '6px 10px', borderRadius: 8, border: '1px solid #f1f5f9' }}>
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
};

export default Food;
