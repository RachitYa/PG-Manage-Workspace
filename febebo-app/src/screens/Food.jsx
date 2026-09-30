import React, { useState, useEffect } from 'react';
import { TopBar } from '../App';
import BottomNav from '../components/BottomNav';
import { Utensils, Star, Users, X, Coffee, Sun, Moon, CheckCircle2, Ban, ShoppingBag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getFirestore, doc, onSnapshot, collection, addDoc, updateDoc, setDoc } from 'firebase/firestore';
import QRCode from 'react-qr-code';
import { db } from '../firebase';
import { useLoading } from '../context/LoadingContext';
import './Food.css';

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const Food = () => {
  const { user } = useAuth();
  const { startLoading, stopLoading } = useLoading();
  const [foodData, setFoodData] = useState({});
  const [todayRequests, setTodayRequests] = useState({}); // { Breakfast: 'pack', Lunch: 'cancel', ... }
  
  const [activeTab, setActiveTab] = useState('today'); // 'today' | 'weekly'
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const meals = ['Breakfast', 'Lunch', 'Snacks', 'Dinner'];

  const [activeModal, setActiveModal] = useState(null); // 'rate', 'extra'
  const [showQRModal, setShowQRModal] = useState(false);
  const [activeMealQR, setActiveMealQR] = useState('');
  const [eatenStatus, setEatenStatus] = useState({});
  
  // Rate state
  const [rating, setRating] = useState(0);
  const [rateComment, setRateComment] = useState('');

  // Extra state
  const [extraDate, setExtraDate] = useState('');

// ── Food item image lookup (Indian PG common items) ──────────────
  const FOOD_IMAGES = {
    
    // User requested specific dishes
    'roti':       'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop',
    'chapati':    'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop',
    'curd':       'https://images.unsplash.com/photo-1563630382894-3e9a584090b4?w=400&h=300&fit=crop',
    'raita':      'https://images.unsplash.com/photo-1563630382894-3e9a584090b4?w=400&h=300&fit=crop',
    'rice':       'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&h=300&fit=crop',
    'papad':      'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop',
    'upma':       'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400&h=300&fit=crop',
    'bhel puri':  'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400&h=300&fit=crop',
    'puri sabji': 'https://images.unsplash.com/photo-1626200919300-b8c3c89bddf8?w=400&h=300&fit=crop',
    'aloo gobhi': 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&h=300&fit=crop',
    'alooo gobhi':'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&h=300&fit=crop',
    'gobi':       'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&h=300&fit=crop',
    // Breakfast items
    'poha':       'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400&h=300&fit=crop',
    'upma':       'https://images.unsplash.com/photo-1626200928309-0a3aa3d57527?w=400&h=300&fit=crop',
    'idli':       'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400&h=300&fit=crop',
    'dosa':       'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&h=300&fit=crop',
    'paratha':    'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=300&fit=crop',
    'puri':       'https://images.unsplash.com/photo-1626200919300-b8c3c89bddf8?w=400&h=300&fit=crop',
    'aloo':       'https://images.unsplash.com/photo-1630400165756-71413c1ea29a?w=400&h=300&fit=crop',
    'samosa':     'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?w=400&h=300&fit=crop',
    'bread':      'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop',
    'egg':        'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=300&fit=crop',
    'omelette':   'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=300&fit=crop',
    'boiled egg': 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=300&fit=crop',
    'tea':        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
    'chai':       'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
    'milk':       'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=300&fit=crop',
    'banana':     'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&h=300&fit=crop',
    // Lunch / Dinner items
    'dal':        'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop',
    'rice':       'https://images.unsplash.com/photo-1536304993881-ff86e0c9c938?w=400&h=300&fit=crop',
    'roti':       'https://images.unsplash.com/photo-1601050690596-df0568f70950?w=400&h=300&fit=crop',
    'chapati':    'https://images.unsplash.com/photo-1601050690596-df0568f70950?w=400&h=300&fit=crop',
    'sabji':      'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop',
    'sabzi':      'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop',
    'paneer':     'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&h=300&fit=crop',
    'chole':      'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=400&h=300&fit=crop',
    'rajma':      'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop',
    'sambar':     'https://images.unsplash.com/photo-1626200928309-0a3aa3d57527?w=400&h=300&fit=crop',
    'curry':      'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&h=300&fit=crop',
    'biryani':    'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&h=300&fit=crop',
    'pulao':      'https://images.unsplash.com/photo-1536304993881-ff86e0c9c938?w=400&h=300&fit=crop',
    'khichdi':    'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop',
    'kadhi':      'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&h=300&fit=crop',
    'salad':      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop',
    'raita':      'https://images.unsplash.com/photo-1571167366136-b57e98d70f31?w=400&h=300&fit=crop',
    'curd':       'https://images.unsplash.com/photo-1571167366136-b57e98d70f31?w=400&h=300&fit=crop',
    'dahi':       'https://images.unsplash.com/photo-1571167366136-b57e98d70f31?w=400&h=300&fit=crop',
    'pickle':     'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=400&h=300&fit=crop',
    'achaar':     'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=400&h=300&fit=crop',
    'papad':      'https://images.unsplash.com/photo-1626200928309-0a3aa3d57527?w=400&h=300&fit=crop',
    'chicken':    'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&h=300&fit=crop',
    'mutton':     'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop',
    'fish':       'https://images.unsplash.com/photo-1544943910-4c1dc44aab44?w=400&h=300&fit=crop',
    'soup':       'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop',
    // Snacks
    'pakora':     'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&h=300&fit=crop',
    'bhajia':     'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&h=300&fit=crop',
    'vada':       'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400&h=300&fit=crop',
    'sandwich':   'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&h=300&fit=crop',
    'noodles':    'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=400&h=300&fit=crop',
    'maggi':      'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=400&h=300&fit=crop',
    'biscuit':    'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&h=300&fit=crop',
    'juice':      'https://images.unsplash.com/photo-1622597467836-f3285f2131b8?w=400&h=300&fit=crop',
    'coffee':     'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=300&fit=crop',
    // Sweets / Dessert
    'kheer':      'https://images.unsplash.com/photo-1560684352-8c2b26b71d5b?w=400&h=300&fit=crop',
    'halwa':      'https://images.unsplash.com/photo-1630400165756-71413c1ea29a?w=400&h=300&fit=crop',
    'sweet':      'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?w=400&h=300&fit=crop',
    'ladoo':      'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?w=400&h=300&fit=crop',
    'gulab jamun':'https://images.unsplash.com/photo-1489391386868-5ba3b0f3ee40?w=400&h=300&fit=crop',
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

  useEffect(() => {
    if (!user?.subscribedPG?.pgId) return;
    
    // Listen to Weekly Food Menu
    const pgDocRef = doc(db, 'pg_owners', user.subscribedPG.pgId);
    const unsubMenu = onSnapshot(pgDocRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().foodMenu) {
        setFoodData(docSnap.data().foodMenu);
      }
    });

    // Listen to eaten status
    const headcountDocRef = doc(db, 'mess_headcount', `${user.subscribedPG.pgId}_${getTodayStr()}`);
    const unsubHeadcount = onSnapshot(headcountDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setEatenStatus({
          breakfast: !!data[`${user.uid}_breakfast_eaten`],
          lunch: !!data[`${user.uid}_lunch_eaten`],
          snacks: !!data[`${user.uid}_snacks_eaten`],
          dinner: !!data[`${user.uid}_dinner_eaten`],
        });
      }
    });

    // Listen to Student's specific Food Requests
    const reqDocRef = doc(db, 'pg_owners', user.subscribedPG.pgId, 'food_requests', user.uid);
    const unsubReq = onSnapshot(reqDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.todayStatus) setTodayRequests(data.todayStatus);
      }
    });

    return () => {
      unsubMenu();
      unsubReq();
      unsubHeadcount();
    };
  }, [user]);

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
    if (!user?.subscribedPG?.pgId || !user?.uid) return;
    startLoading();
    try {
      const docRef = doc(db, 'pg_owners', user.subscribedPG.pgId, 'food_requests', user.uid);
      
      // If the current status is already the actionType, we "undo" it by setting it to null
      const currentStatus = todayRequests[meal];
      const newStatus = currentStatus === actionType ? null : actionType;

      const newTodayStatus = { ...todayRequests, [meal]: newStatus };
      
      await setDoc(docRef, {
        studentId: user.uid,
        studentName: user.name || 'Unknown',
        roomNumber: user.subscribedPG.roomNumber || 'Unknown',
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
    if (!user?.subscribedPG?.pgId || !user?.uid) return;
    startLoading();
    try {
      const docRef = doc(db, 'pg_owners', user.subscribedPG.pgId, 'food_requests', user.uid);
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

  const todayString = new Date().toISOString().split('T')[0];

  const renderModal = () => {
    if (!activeModal) return null;

    return (
      <>
        <div className="filter-modal-backdrop" onClick={() => setActiveModal(null)} />
        <div className="filter-modal" style={{ padding: '24px' }}>
          <div className="filter-modal-header" style={{ marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
              {activeModal === 'rate' && 'Rate Today\'s Food'}
              {activeModal === 'extra' && 'Request Extra Plates'}
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
          const items = foodItem !== 'Not set yet' ? foodItem.split(/[,;]/).map(s => s.trim()).filter(Boolean) : [];
          const accent = mealAccents[meal] || { bg: '#f8fafc', border: '#e2e8f0', label: '#334155' };
          
          return (
            <div key={meal} className={`today-meal-subcard-modern ${status ? 'has-status' : ''}`} style={{ flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
              <div style={{ background: accent.bg, padding: '12px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '800', color: accent.label, textTransform: 'uppercase', fontSize: '13px', letterSpacing: '1px' }}>{meal}</span>
                {status && (
                  <span style={{ fontSize: '11px', fontWeight: '800', padding: '2px 8px', borderRadius: '12px', color: 'white', background: status === 'pack' ? '#0891b2' : '#e11d48' }}>
                    {status === 'pack' ? 'PACKED' : 'CANCELED'}
                  </span>
                )}
              </div>
              
              <div style={{ padding: '12px', display: 'flex', gap: '10px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', minHeight: '110px' }}>
                {items.length > 0 ? items.map((item, idx) => {
                  const imgSrc = getFoodImage(item) || mealFallback[meal];
                  return (
                    <div key={idx} style={{ flexShrink: 0, width: '90px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <div style={{
                        width: '80px', height: '80px', borderRadius: '12px',
                        backgroundImage: `url(${imgSrc})`,
                        backgroundSize: 'cover', backgroundPosition: 'center',
                        border: `2px solid ${accent.border}`,
                        boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
                      }} />
                      <span style={{
                        fontSize: '12px', fontWeight: '700', color: '#334155',
                        textAlign: 'center', lineHeight: '1.2', textTransform: 'capitalize',
                        wordBreak: 'break-word', width: '88px'
                      }}>{item}</span>
                    </div>
                  );
                }) : (
                  <div style={{ width: '100%', textAlign: 'center', color: '#94a3b8', padding: '20px 0', fontSize: '14px', fontWeight: '600' }}>Not set yet</div>
                )}
              </div>
              
              <div className="subcard-actions" style={{ padding: '12px', borderTop: '1px solid #f1f5f9', background: 'white', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {eatenStatus[meal.toLowerCase()] ? (
                  <button className="meal-btn" style={{ background: '#10b981', color: 'white', border: 'none', width: '100%', padding: '10px', borderRadius: '12px', fontWeight: '800', cursor: 'default' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', verticalAlign: 'middle', marginRight: '6px' }}>check_circle</span>
                    Eaten ✓
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={() => { setActiveMealQR(meal); setShowQRModal(true); }}
                      className="meal-btn" style={{ background: 'linear-gradient(135deg, #0f172a, #334155)', color: 'white', border: 'none', width: '100%', padding: '10px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', verticalAlign: 'middle', marginRight: '6px' }}>qr_code_2</span>
                      Generate Pass
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
        {/* TODAY VIEW */}
        {activeTab === 'today' && (
          <div className="today-view-container">
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

                              {/* Individual items row (horizontal scroll) */}
                              <div style={{ display: 'flex', gap: '10px', padding: '4px 18px 14px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                                {items.map((item, idx) => {
                                  const imgSrc = getFoodImage(item) || mealFallback[meal];
                                  return (
                                    <div key={idx} style={{ flexShrink: 0, width: '90px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                      <div style={{
                                        width: '80px', height: '80px', borderRadius: '14px',
                                        backgroundImage: `url(${imgSrc})`,
                                        backgroundSize: 'cover', backgroundPosition: 'center',
                                        border: `2px solid ${accent.border}`,
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.10)'
                                      }} />
                                      <span style={{
                                        fontSize: '12px', fontWeight: '700', color: '#334155',
                                        textAlign: 'center', lineHeight: '1.3',
                                        textTransform: 'capitalize',
                                        wordBreak: 'break-word', width: '88px'
                                      }}>{item}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
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
          
          <div className="food-action-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
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
            <h3 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: '900', color: '#0f172a' }}>{activeMealQR} Pass</h3>
            <p style={{ margin: '0 0 24px', fontSize: '14px', color: '#64748b', fontWeight: '500' }}>Show this QR code to the Cook.</p>
            <div style={{ background: 'white', padding: '16px', borderRadius: '16px', border: '2px solid #e2e8f0', display: 'inline-block', marginBottom: '24px' }}>
              <QRCode value={`MEALPASS|${activeMealQR.toLowerCase()}|${user.uid}|${user.name || 'Student'}|${user?.profileData?.roomDetails?.roomNumber || user?.subscribedPG?.roomNo || ''}`} size={200} />
            </div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>{user.name}</div>
            <div style={{ fontSize: '14px', color: '#64748b', marginTop: '4px', fontWeight: '600' }}>
              Room {user?.profileData?.roomDetails?.roomNumber || user?.subscribedPG?.roomNo || 'Unassigned'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Food;
