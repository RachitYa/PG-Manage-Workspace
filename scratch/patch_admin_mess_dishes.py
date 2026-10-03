import sys

admin_file = r'c:\Users\RACHIT\OneDrive\Desktop\Febeboo\Febebo-admin\src\pages\MessHeadcount.jsx'
with open(admin_file, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add import
old_import = "import { useAuth } from '../context/AuthContext';"
new_import = """import { useAuth } from '../context/AuthContext';
import { COMMON_PG_DISHES, DISH_CATEGORIES, getDishPresetImage } from '../data/commonFoodDishes';"""

if old_import in content:
    content = content.replace(old_import, new_import, 1)

# 2. Add states
old_states = """  // Menu editing state
  const [selectedMenuDay, setSelectedMenuDay] = useState(() => getDayName(getTodayStr()));
  const [editingMeal, setEditingMeal] = useState(null); // { day, meal }
  const [editValue, setEditValue] = useState('');
  const [editImage, setEditImage] = useState(null);
  const [savingMenu, setSavingMenu] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);"""

new_states = """  // Menu editing state
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
  const [showItemPhotoPicker, setShowItemPhotoPicker] = useState(false);"""

if old_states in content:
    content = content.replace(old_states, new_states, 1)

# 3. Add foodItemImages to Firestore onSnapshot listener
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

# 4. Replace openEditMeal, handlePhotoSelect, handleSaveMenu
idx_h_start = content.find('  // ── 8. Open Edit Modal with Meal & Photo')
idx_h_end = content.find('  const handleResetToDefaultMenu = async () =>')

if idx_h_start == -1 or idx_h_end == -1:
    print('Failed to find handler block')
    sys.exit(1)

new_handlers = """  // ── 8. Open Edit Modal with Per-Item Dishes & Photos ───────────────────────
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

      await setDoc(doc(db, 'pg_owners', pgDocId), {
        foodMenu: updatedMenu,
        foodItemImages: updatedItemImages
      }, { merge: true });

      showToast(`Saved ${editItems.length} dish items & photos for ${day} ${meal}!`);
      setEditingMeal(null);
    } catch (err) {
      console.error('Failed to update food menu:', err);
      showToast('Failed to save menu changes');
    } finally {
      setSavingMenu(false);
    }
  };

"""

content = content[:idx_h_start] + new_handlers + content[idx_h_end:]

# 5. Update Today's Menu Pill in Live Mess Card
start_pill_marker = '{/* Current Menu Item Pill with Photo Thumbnail */}'
idx_p_start = content.find(start_pill_marker)
end_pill_marker = '{/* Interactive Stat Breakdown Cards (Cook App style) */}'
idx_p_end = content.find(end_pill_marker)

if idx_p_start == -1 or idx_p_end == -1:
    print('Failed to find pill markers')
    sys.exit(1)

new_pill = """{/* Current Menu Item Pill with Per-Item Photos */}
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
                            <img src={dImg} alt={dish} style={{ width: '26px', height: '26px', borderRadius: '6px', objectFit: 'cover' }} />
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

          """

content = content[:idx_p_start] + new_pill + content[idx_p_end:]

# 6. Update Diet Schedule Cards (Per-Item Photos instead of single whole-meal banner)
start_slot_photo = '{/* Photo Header (if present) */}'
idx_sp_start = content.find(start_slot_photo)
end_slot_photo = '<div style={{ padding: \'16px\' }}>'
idx_sp_end = content.find(end_slot_photo, idx_sp_start)

if idx_sp_start != -1 and idx_sp_end != -1:
    content = content[:idx_sp_start] + content[idx_sp_end:]

# Add Per-Item dish photos inside the slot card
slot_content_marker = '{menuContent}\n                      </p>'
idx_sc = content.find(slot_content_marker)
if idx_sc != -1:
    full_sc_end = idx_sc + len(slot_content_marker)
    per_item_thumb_code = """

                      {/* Per-Item Dish Photo Thumbnails */}
                      {(() => {
                        if (menuContent === 'Not set') return null;
                        const slotDishes = menuContent.split(/[,;]/).map(s => s.trim()).filter(Boolean);
                        const slotImgs = foodItemImages[selectedMenuDay]?.[mealSlot.id] || {};
                        if (slotDishes.length === 0) return null;

                        return (
                          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '4px', marginTop: '8px' }}>
                            {slotDishes.map((dish, i) => {
                              const dImg = slotImgs[dish] || getDishPresetImage(dish);
                              return (
                                <div key={i} style={{ flexShrink: 0, width: '68px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                  <div style={{
                                    width: '58px',
                                    height: '58px',
                                    borderRadius: '10px',
                                    backgroundImage: `url(${dImg || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop'})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    border: '1.5px solid #e2e8f0',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
                                  }} />
                                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#475569', textAlign: 'center', lineHeight: 1.2, width: '66px', wordBreak: 'break-word' }}>
                                    {dish}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}"""
    content = content[:full_sc_end] + per_item_thumb_code + content[full_sc_end:]

# 7. Replace the Edit Modal with the new Per-Item & Preset Dishes Editor Modal
modal_start_target = '{/* ── EDIT MENU & PHOTO MODAL ──────────────────────────────────────── */}'
idx_m_start = content.find(modal_start_target)
if idx_m_start == -1:
    print('Failed to find modal start')
    sys.exit(1)

closing_target = '            <button\n              onClick={handleSaveMenu}\n              disabled={savingMenu}'
idx_m_end = content.find(closing_target, idx_m_start)
if idx_m_end == -1:
    print('Failed to find closing_target')
    sys.exit(1)

idx_m_full_end = content.find('      )}', idx_m_end) + len('      )}')

new_modal_code = '''{/* ── EDIT MENU & PER-ITEM PHOTOS MODAL ──────────────────────────────── */}
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
      )}'''

content = content[:idx_m_start] + new_modal_code + content[idx_m_full_end:]

with open(admin_file, 'w', encoding='utf-8') as f:
    f.write(content)

print('Successfully patched MessHeadcount.jsx!')
