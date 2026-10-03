import sys

staff_file = r'c:\Users\RACHIT\OneDrive\Desktop\Febeboo\febebo-staff\src\pages\StaffApp.jsx'
with open(staff_file, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add import
old_import = "import { db } from '../firebase';"
new_import = """import { db } from '../firebase';
import { COMMON_PG_DISHES, DISH_CATEGORIES, getDishPresetImage } from '../data/commonFoodDishes';"""

if old_import in content:
    content = content.replace(old_import, new_import, 1)

# 2. Add states
old_states = """  const [foodMenuImages, setFoodMenuImages] = useState({});
  const [showWeeklyMenuEdit, setShowWeeklyMenuEdit] = useState(false);
  const [editWeeklyMenuDay, setEditWeeklyMenuDay] = useState('');
  const [editWeeklyMenuMeal, setEditWeeklyMenuMeal] = useState('');
  const [editWeeklyMenuVal, setEditWeeklyMenuVal] = useState('');
  const [cookPhotoInputRef] = [useRef(null)];
  const [editWeeklyMenuImage, setEditWeeklyMenuImage] = useState(null);
  const [isProcessingCookPhoto, setIsProcessingCookPhoto] = useState(false);"""

# Let's check how the states were defined around line 790
# Let's find foodMenuImages
f_idx = content.find("const [foodMenuImages, setFoodMenuImages] = useState({});")
if f_idx != -1:
    f_end = content.find("const [isProcessingCookPhoto, setIsProcessingCookPhoto] = useState(false);", f_idx)
    if f_end != -1:
        f_full_end = f_end + len("const [isProcessingCookPhoto, setIsProcessingCookPhoto] = useState(false);")
        new_states_code = """const [foodMenuImages, setFoodMenuImages] = useState({});
  const [foodItemImages, setFoodItemImages] = useState({});
  const [showWeeklyMenuEdit, setShowWeeklyMenuEdit] = useState(false);
  const [editWeeklyMenuDay, setEditWeeklyMenuDay] = useState('');
  const [editWeeklyMenuMeal, setEditWeeklyMenuMeal] = useState('');
  const [editWeeklyMenuItems, setEditWeeklyMenuItems] = useState([]); // [{ id, name, image }]
  const [cookCustomItemInput, setCookCustomItemInput] = useState('');
  const [cookPresetSearch, setCookPresetSearch] = useState('');
  const [cookPresetCategory, setCookPresetCategory] = useState('All');
  const [activeCookPhotoIndex, setActiveCookPhotoIndex] = useState(null);
  const [showCookItemPhotoPicker, setShowCookItemPhotoPicker] = useState(false);
  const cookPhotoInputRef = useRef(null);
  const [isProcessingCookPhoto, setIsProcessingCookPhoto] = useState(false);"""
        content = content[:f_idx] + new_states_code + content[f_full_end:]

# 3. Add foodItemImages to snapshot listener
old_snap = """        if (data.foodMenuImages) {
          setFoodMenuImages(data.foodMenuImages);
        } else if (data.foodImages) {
          setFoodMenuImages(data.foodImages);
        }"""

new_snap = """        if (data.foodMenuImages) {
          setFoodMenuImages(data.foodMenuImages);
        } else if (data.foodImages) {
          setFoodMenuImages(data.foodImages);
        }
        if (data.foodItemImages) {
          setFoodItemImages(data.foodItemImages);
        }"""

if old_snap in content:
    content = content.replace(old_snap, new_snap, 1)

# 4. Add openCookEditModal and handlers right after isProcessingCookPhoto
handler_anchor = "const [isProcessingCookPhoto, setIsProcessingCookPhoto] = useState(false);"
h_idx = content.find(handler_anchor)
if h_idx != -1:
    h_end = h_idx + len(handler_anchor)
    cook_handlers = """

  // Open cook meal editor modal with parsed items
  const openCookEditModal = (day, meal) => {
    setEditWeeklyMenuDay(day);
    setEditWeeklyMenuMeal(meal);
    const raw = weeklyFoodMenu?.[day]?.[meal] || '';
    const itemNames = raw.split(/[,;]/).map(s => s.trim()).filter(Boolean);
    const currentImages = foodItemImages?.[day]?.[meal] || {};
    const parsed = itemNames.map(name => ({
      id: Math.random().toString(36).substring(2, 9),
      name,
      image: currentImages[name] || getDishPresetImage(name) || null
    }));
    setEditWeeklyMenuItems(parsed);
    setCookCustomItemInput('');
    setCookPresetSearch('');
    setCookPresetCategory('All');
    setActiveCookPhotoIndex(null);
    setShowCookItemPhotoPicker(false);
    setShowWeeklyMenuEdit(true);
  };

  const handleCookPhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || activeCookPhotoIndex === null) return;
    setIsProcessingCookPhoto(true);
    try {
      const compressed = await compressImage(file, 750);
      setEditWeeklyMenuItems(prev => prev.map((item, idx) => 
        idx === activeCookPhotoIndex ? { ...item, image: compressed } : item
      ));
      setShowCookItemPhotoPicker(false);
    } catch (err) {
      console.error('Cook photo processing error:', err);
    } finally {
      setIsProcessingCookPhoto(false);
      if (cookPhotoInputRef.current) cookPhotoInputRef.current.value = '';
    }
  };

  const handleCookSaveMenu = async () => {
    const namesStr = editWeeklyMenuItems.map(i => i.name.trim()).filter(Boolean).join(', ');
    const imagesMap = {};
    editWeeklyMenuItems.forEach(i => {
      const cleanName = i.name.trim();
      if (cleanName && i.image) {
        imagesMap[cleanName] = i.image;
      }
    });

    const newMenu = {
      ...weeklyFoodMenu,
      [editWeeklyMenuDay]: {
        ...(weeklyFoodMenu[editWeeklyMenuDay] || {}),
        [editWeeklyMenuMeal]: namesStr
      }
    };
    const newItemImages = {
      ...foodItemImages,
      [editWeeklyMenuDay]: {
        ...(foodItemImages[editWeeklyMenuDay] || {}),
        [editWeeklyMenuMeal]: imagesMap
      }
    };

    setWeeklyFoodMenu(newMenu);
    setFoodItemImages(newItemImages);
    setShowWeeklyMenuEdit(false);

    if (user?.ownerUid) {
      try {
        await setDoc(doc(db, 'pg_owners', user.ownerUid), { 
          foodMenu: newMenu,
          foodItemImages: newItemImages
        }, { merge: true });
      } catch (e) {
        console.error('Failed to update menu', e);
      }
    }
  };"""
    content = content[:h_end] + cook_handlers + content[h_end:]

# 5. Update Cook Daily & Weekly view cards
daily_target_start = "{dayOfWeek}'s Menu</h3>"
d_idx = content.find(daily_target_start)
if d_idx != -1:
    d_map_start = content.find("{['Breakfast', 'Lunch', 'Snacks', 'Dinner'].map(meal => {", d_idx)
    d_map_end = content.find("              {cookMenuTab === 'weekly' && (", d_map_start)
    if d_map_start != -1 and d_map_end != -1:
        new_daily_body = """{['Breakfast', 'Lunch', 'Snacks', 'Dinner'].map(meal => {
                      const mealDishes = (mealsForDay?.[meal] || '').split(/[,;]/).map(s => s.trim()).filter(Boolean);
                      const dishImgs = foodItemImages?.[dayOfWeek]?.[meal] || {};

                      return (
                        <div key={meal} style={{padding:'10px 0', borderBottom:'1px solid #f8fafc'}}>
                          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:10}}>
                            <div style={{flex:1, minWidth:0}}>
                              <span style={{fontSize:11, fontWeight:800, color:C.muted, textTransform:'uppercase'}}>{meal}</span>
                              <p style={{margin:'2px 0 0', fontSize:14, fontWeight:700, color:'#1e293b'}}>{mealsForDay?.[meal] || 'Not Set'}</p>
                            </div>
                            <button 
                              onClick={() => openCookEditModal(dayOfWeek, meal)}
                              style={{background:C.bg, border: '1px solid #e2e8f0', borderRadius:10, padding:'6px 12px', fontSize:12, fontWeight:800, color:C.sub, cursor:'pointer', display:'flex', alignItems:'center', gap:4, flexShrink:0}}>
                              <span className="material-symbols-outlined" style={{fontSize:14}}>photo_camera</span> Edit
                            </button>
                          </div>

                          {mealDishes.length > 0 && (
                            <div style={{display:'flex', gap:8, overflowX:'auto', WebkitOverflowScrolling:'touch', marginTop:8, paddingBottom:2}}>
                              {mealDishes.map((dish, i) => {
                                const dImg = dishImgs[dish] || getDishPresetImage(dish);
                                return (
                                  <div key={i} style={{flexShrink:0, display:'flex', alignItems:'center', gap:6, background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:8, padding:'4px 8px'}}>
                                    {dImg ? (
                                      <img src={dImg} alt={dish} style={{width:24, height:24, borderRadius:6, objectFit:'cover'}} />
                                    ) : (
                                      <div style={{width:24, height:24, borderRadius:6, background:'#e2e8f0', display:'flex', alignItems:'center', justifyContent:'center'}}>
                                        <span className="material-symbols-outlined" style={{fontSize:14, color:'#64748b'}}>restaurant</span>
                                      </div>
                                    )}
                                    <span style={{fontSize:11, fontWeight:700, color:'#334155'}}>{dish}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

"""
        content = content[:d_map_start] + new_daily_body + content[d_map_end:]

# Update weekly view inside cookHistory
weekly_target_start = "{cookMenuTab === 'weekly' && ("
w_idx = content.find(weekly_target_start)
if w_idx != -1:
    w_map_start = content.find("{['Breakfast', 'Lunch', 'Snacks', 'Dinner'].map(meal => {", w_idx)
    w_map_end = content.find("              {view === 'work' && (", w_map_start)
    if w_map_start != -1 and w_map_end != -1:
        # find the end of the map inside weekly
        w_inner_end = content.find("                  </div>\n                </div>\n              )}", w_map_start)
        if w_inner_end != -1:
            new_weekly_body = """{['Breakfast', 'Lunch', 'Snacks', 'Dinner'].map(meal => {
                            const dMealDishes = (dMeals?.[meal] || '').split(/[,;]/).map(s => s.trim()).filter(Boolean);
                            const dDishImgs = foodItemImages?.[dDay]?.[meal] || {};

                            return (
                              <div key={meal} style={{padding:'8px 0', borderBottom:'1px solid #f8fafc'}}>
                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:10}}>
                                  <div style={{flex:1, minWidth:0}}>
                                    <span style={{fontSize:11, fontWeight:800, color:C.muted, textTransform:'uppercase'}}>{meal}</span>
                                    <p style={{margin:'2px 0 0', fontSize:14, fontWeight:700, color:'#334155'}}>{dMeals?.[meal] || 'Not Set'}</p>
                                  </div>
                                  <button 
                                    onClick={() => openCookEditModal(dDay, meal)}
                                    style={{background:'#f0fdf4', border: '1px solid #bbf7d0', borderRadius:10, padding:'6px 12px', fontSize:12, fontWeight:800, color:'#16a34a', cursor:'pointer', display:'flex', alignItems:'center', gap:4, flexShrink:0}}>
                                    <span className="material-symbols-outlined" style={{fontSize:14}}>photo_camera</span> Edit
                                  </button>
                                </div>

                                {dMealDishes.length > 0 && (
                                  <div style={{display:'flex', gap:8, overflowX:'auto', WebkitOverflowScrolling:'touch', marginTop:6, paddingBottom:2}}>
                                    {dMealDishes.map((dish, i) => {
                                      const dImg = dDishImgs[dish] || getDishPresetImage(dish);
                                      return (
                                        <div key={i} style={{flexShrink:0, display:'flex', alignItems:'center', gap:6, background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:8, padding:'4px 8px'}}>
                                          {dImg ? (
                                            <img src={dImg} alt={dish} style={{width:24, height:24, borderRadius:6, objectFit:'cover'}} />
                                          ) : (
                                            <div style={{width:24, height:24, borderRadius:6, background:'#e2e8f0', display:'flex', alignItems:'center', justifyContent:'center'}}>
                                              <span className="material-symbols-outlined" style={{fontSize:14, color:'#64748b'}}>restaurant</span>
                                            </div>
                                          )}
                                          <span style={{fontSize:11, fontWeight:700, color:'#334155'}}>{dish}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}"""
            w_block_end = w_inner_end + len("                  </div>\n                </div>\n              )}")
            content = content[:w_map_start] + new_weekly_body + content[w_block_end:]

# 6. Update Cook Today's Menu card in view === 'work'
card_marker = "{/* Menu Display */}"
c_idx = content.find(card_marker)
if c_idx != -1:
    c_end = content.find("{/* Stat Cards & Filtered List */}", c_idx)
    if c_end != -1:
        new_cook_today_card = """{/* Menu Display */}
            {(() => {
              const currentRawStr = weeklyFoodMenu?.[todayName]?.[mealTab] || '';
              const todayDishes = currentRawStr.split(/[,;]/).map(s => s.trim()).filter(Boolean);
              const dishImgs = foodItemImages?.[todayName]?.[mealTab] || {};

              return (
                <div style={{background:'#fff', borderRadius:16, border: '1px solid #e2e8f0', padding:14, boxShadow:'0 2px 8px rgba(15,23,42,0.03)'}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
                    <p style={{margin:0, fontSize:12, fontWeight:800, color:meta.accent, textTransform:'uppercase'}}>Today's {mealTab}</p>
                    <button 
                      onClick={() => openCookEditModal(todayName, mealTab)} 
                      style={{background:C.bg, border: '1px solid #e2e8f0', borderRadius:10, padding:'6px 12px', fontSize:12, fontWeight:800, color:C.sub, cursor:'pointer', display:'flex', alignItems:'center', gap:4, flexShrink:0}}>
                      <span className="material-symbols-outlined" style={{fontSize:15}}>photo_camera</span> Edit Items &amp; Photos
                    </button>
                  </div>

                  {todayDishes.length === 0 ? (
                    <p style={{margin:0, fontSize:13, color:C.muted, fontWeight:600}}>No menu set for today's {mealTab}</p>
                  ) : (
                    <div style={{display:'flex', gap:8, overflowX:'auto', WebkitOverflowScrolling:'touch', paddingBottom:2}}>
                      {todayDishes.map((dish, i) => {
                        const dImg = dishImgs[dish] || getDishPresetImage(dish);
                        return (
                          <div key={i} style={{flexShrink:0, display:'flex', alignItems:'center', gap:6, background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, padding:'5px 9px'}}>
                            {dImg ? (
                              <img src={dImg} alt={dish} style={{width:26, height:26, borderRadius:6, objectFit:'cover'}} />
                            ) : (
                              <div style={{width:26, height:26, borderRadius:6, background:'#e2e8f0', display:'flex', alignItems:'center', justifyContent:'center'}}>
                                <span className="material-symbols-outlined" style={{fontSize:15, color:'#64748b'}}>restaurant</span>
                              </div>
                            )}
                            <span style={{fontSize:12, fontWeight:700, color:C.text}}>{dish}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            """
        content = content[:c_idx] + new_cook_today_card + content[c_end:]

# 7. Replace showWeeklyMenuEdit modal at bottom with the new Per-Item Cook Editor & Photo Picker
cook_modal_marker = "{/* Edit Modal for Cook with Photo Picker */}"
cm_idx = content.find(cook_modal_marker)
if cm_idx != -1:
    cm_end = content.find("<Sheet show={showPackEdit}", cm_idx)
    if cm_end != -1:
        new_cook_modal = """{/* ── COOK EDIT MENU & PER-ITEM PHOTOS MODAL ── */}
      {showWeeklyMenuEdit && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 999,
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '24px 24px 0 0',
            padding: 22,
            paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
            animation: 'slideUp 0.3s ease',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            {/* Hidden Photo Input for Camera/Gallery */}
            <input
              type="file"
              ref={cookPhotoInputRef}
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={handleCookPhotoSelect}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 800, color: meta.accent, textTransform: 'uppercase' }}>Kitchen Menu &amp; Photos</span>
                <h3 style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 900, color: '#000' }}>
                  Edit {editWeeklyMenuDay} {editWeeklyMenuMeal}
                </h3>
              </div>
              <span className="material-symbols-outlined" onClick={() => setShowWeeklyMenuEdit(false)} style={{ cursor: 'pointer', color: '#64748b' }}>close</span>
            </div>

            {/* Current Items List */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 800, color: '#1e293b', textTransform: 'uppercase' }}>
                  Items in this Meal ({editWeeklyMenuItems.length})
                </label>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Tap photo to take/change</span>
              </div>

              {editWeeklyMenuItems.length === 0 ? (
                <div style={{ padding: 14, background: '#f8fafc', borderRadius: 12, textAlign: 'center', border: '1.5px dashed #cbd5e1', color: '#64748b', fontSize: 13, fontWeight: 600 }}>
                  No items added yet. Click dishes below to add them with photos!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto', paddingRight: 2 }}>
                  {editWeeklyMenuItems.map((item, idx) => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '8px 10px' }}>
                      {/* Dish Photo Thumbnail */}
                      <div
                        onClick={() => {
                          setActiveCookPhotoIndex(idx);
                          setShowCookItemPhotoPicker(true);
                        }}
                        style={{
                          width: 44, height: 44, borderRadius: 10,
                          backgroundImage: `url(${item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop'})`,
                          backgroundSize: 'cover', backgroundPosition: 'center',
                          border: '1.5px solid #cbd5e1', cursor: 'pointer', flexShrink: 0,
                          position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end'
                        }}
                      >
                        <div style={{ background: 'rgba(15,23,42,0.7)', color: '#fff', borderRadius: 4, padding: '1px 3px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 12 }}>photo_camera</span>
                        </div>
                      </div>

                      {/* Name input */}
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditWeeklyMenuItems(prev => prev.map((it, i) => i === idx ? { ...it, name: val } : it));
                        }}
                        placeholder="e.g. 4 Roti"
                        style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700, outline: 'none', fontFamily: 'inherit', background: '#fff' }}
                      />

                      {/* Photo change button */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveCookPhotoIndex(idx);
                          setShowCookItemPhotoPicker(true);
                        }}
                        style={{ background: '#ede9fe', color: '#7c3aed', border: 'none', borderRadius: 8, padding: '7px 9px', fontSize: 11, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>photo_camera</span>
                        Photo
                      </button>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => setEditWeeklyMenuItems(prev => prev.filter((_, i) => i !== idx))}
                        style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: 8, padding: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Pick Common PG Dishes */}
            <div style={{ marginBottom: 16, background: '#f8fafc', borderRadius: 16, padding: 12, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                  ⚡ Quick Add Common Dishes
                </span>
                <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 700 }}>Pre-made Photos</span>
              </div>

              {/* Categories */}
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 6, marginBottom: 8 }}>
                {DISH_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCookPresetCategory(cat)}
                    style={{
                      padding: '4px 10px', borderRadius: 16, border: 'none',
                      background: cookPresetCategory === cat ? '#000' : '#fff',
                      color: cookPresetCategory === cat ? C.primary : '#64748b',
                      fontSize: 11, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap'
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Search */}
              <input
                type="text"
                placeholder="Search dish (e.g. Paneer, Roti, Dal, Poha)..."
                value={cookPresetSearch}
                onChange={e => setCookPresetSearch(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12, fontWeight: 600, outline: 'none', fontFamily: 'inherit', marginBottom: 8, boxSizing: 'border-box' }}
              />

              {/* Grid of Dishes */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8, maxHeight: 150, overflowY: 'auto', paddingRight: 2 }}>
                {COMMON_PG_DISHES
                  .filter(d => cookPresetCategory === 'All' || d.category === cookPresetCategory)
                  .filter(d => !cookPresetSearch || d.name.toLowerCase().includes(cookPresetSearch.toLowerCase()))
                  .map(dish => {
                    const isAdded = editWeeklyMenuItems.some(it => it.name.toLowerCase() === dish.name.toLowerCase());
                    return (
                      <div
                        key={dish.id}
                        onClick={() => {
                          if (isAdded) return;
                          setEditWeeklyMenuItems(prev => [
                            ...prev,
                            { id: Math.random().toString(36).substring(2, 9), name: dish.name, image: dish.image }
                          ]);
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          background: isAdded ? '#f0fdf4' : '#fff',
                          border: `1px solid ${isAdded ? '#86efac' : '#e2e8f0'}`,
                          borderRadius: 10, padding: '5px 8px', cursor: isAdded ? 'default' : 'pointer'
                        }}
                      >
                        <img src={dish.image} alt={dish.name} style={{ width: 30, height: 30, borderRadius: 6, objectFit: 'cover' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: isAdded ? '#15803d' : '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {dish.name}
                          </p>
                          <span style={{ fontSize: 10, fontWeight: 700, color: isAdded ? '#16a34a' : meta.accent }}>
                            {isAdded ? 'Added ✓' : '+ Add'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Custom Item Adder */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input
                type="text"
                placeholder="Or type custom dish..."
                value={cookCustomItemInput}
                onChange={e => setCookCustomItemInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && cookCustomItemInput.trim()) {
                    e.preventDefault();
                    const name = cookCustomItemInput.trim();
                    const presetImg = getDishPresetImage(name);
                    setEditWeeklyMenuItems(prev => [
                      ...prev,
                      { id: Math.random().toString(36).substring(2, 9), name, image: presetImg || null }
                    ]);
                    setCookCustomItemInput('');
                  }
                }}
                style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: 13, fontWeight: 700, outline: 'none', fontFamily: 'inherit' }}
              />
              <button
                type="button"
                onClick={() => {
                  if (!cookCustomItemInput.trim()) return;
                  const name = cookCustomItemInput.trim();
                  const presetImg = getDishPresetImage(name);
                  setEditWeeklyMenuItems(prev => [
                    ...prev,
                    { id: Math.random().toString(36).substring(2, 9), name, image: presetImg || null }
                  ]);
                  setCookCustomItemInput('');
                }}
                style={{ background: '#000', color: C.primary, border: 'none', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                + Add Dish
              </button>
            </div>

            {/* Save Button */}
            <button
              onClick={handleCookSaveMenu}
              style={{
                width: '100%', padding: 16, borderRadius: 14,
                background: '#000', color: C.primary, fontSize: 15, fontWeight: 800,
                border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>save</span>
              Save {editWeeklyMenuItems.length} Dishes &amp; Photos
            </button>
          </div>
        </div>
      )}

      {/* ── COOK ITEM PHOTO PICKER DRAWER ── */}
      {showCookItemPhotoPicker && activeCookPhotoIndex !== null && editWeeklyMenuItems[activeCookPhotoIndex] && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.65)', zIndex: 1050,
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '24px 24px 0 0',
            padding: 20,
            paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
            maxHeight: '85vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 800, color: meta.accent, textTransform: 'uppercase' }}>Dish Photo</span>
                <h3 style={{ margin: '2px 0 0', fontSize: 17, fontWeight: 900, color: '#000' }}>
                  Photo for "{editWeeklyMenuItems[activeCookPhotoIndex]?.name}"
                </h3>
              </div>
              <span className="material-symbols-outlined" onClick={() => setShowCookItemPhotoPicker(false)} style={{ cursor: 'pointer', color: '#64748b' }}>close</span>
            </div>

            {/* Current Photo Preview */}
            {editWeeklyMenuItems[activeCookPhotoIndex]?.image && (
              <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1.5px solid #e2e8f0', marginBottom: 14, height: 110 }}>
                <img src={editWeeklyMenuItems[activeCookPhotoIndex].image} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button
                  type="button"
                  onClick={() => {
                    setEditWeeklyMenuItems(prev => prev.map((it, i) => i === activeCookPhotoIndex ? { ...it, image: null } : it));
                  }}
                  style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(239,68,68,0.9)', color: '#fff', border: 'none', borderRadius: 8, padding: '4px 8px', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}
                >
                  Remove Photo
                </button>
              </div>
            )}

            {/* Action 1: Snap photo with Camera */}
            <button
              type="button"
              onClick={() => cookPhotoInputRef.current?.click()}
              disabled={isProcessingCookPhoto}
              style={{
                width: '100%', padding: 14, borderRadius: 12,
                border: '2px dashed #000', background: '#f8fafc',
                color: '#000', fontSize: 13, fontWeight: 800,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, marginBottom: 14
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 22, color: meta.accent }}>photo_camera</span>
              {isProcessingCookPhoto ? 'Compressing photo...' : 'Snap with Camera (Back Lens) or Upload'}
            </button>

            {/* Action 2: Choose from Preset Library */}
            <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 800, color: '#334155', textTransform: 'uppercase' }}>
              Or Choose Pre-made Photo:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(95px, 1fr))', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
              {COMMON_PG_DISHES.map(dish => (
                <div
                  key={dish.id}
                  onClick={() => {
                    setEditWeeklyMenuItems(prev => prev.map((it, i) => i === activeCookPhotoIndex ? { ...it, image: dish.image } : it));
                    setShowCookItemPhotoPicker(false);
                  }}
                  style={{ border: '1.5px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', cursor: 'pointer', background: '#f8fafc', textAlign: 'center' }}
                >
                  <img src={dish.image} alt={dish.name} style={{ width: '100%', height: 65, objectFit: 'cover' }} />
                  <p style={{ margin: '4px 2px', fontSize: 10, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {dish.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      """
        content = content[:cm_idx] + new_cook_modal + content[cm_end:]

with open(staff_file, 'w', encoding='utf-8') as f:
    f.write(content)

print('Successfully patched StaffApp.jsx!')
