import sys

food_path = r'c:\Users\RACHIT\OneDrive\Desktop\Febeboo\febebo-app\src\screens\Food.jsx'
with open(food_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add foodMenuImages state
old_state = "  const [foodData, setFoodData] = useState({});"
new_state = "  const [foodData, setFoodData] = useState({});\n  const [foodMenuImages, setFoodMenuImages] = useState({});"

if old_state not in content:
    print('Failed to find old_state')
    sys.exit(1)

content = content.replace(old_state, new_state, 1)

# 2. Update unsubMenu listener
old_listener = """    const unsubMenu = onSnapshot(pgDocRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().foodMenu) {
        setFoodData(docSnap.data().foodMenu);
      }
    });"""

new_listener = """    const unsubMenu = onSnapshot(pgDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.foodMenu) setFoodData(data.foodMenu);
        if (data.foodMenuImages) setFoodMenuImages(data.foodMenuImages);
      }
    });"""

if old_listener not in content:
    print('Failed to find old_listener')
    sys.exit(1)

content = content.replace(old_listener, new_listener, 1)

# 3. Update renderTodayMealCard
old_today_card = """        {mealsList.map(meal => {
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
              
              <div style={{ padding: '12px', display: 'flex', gap: '10px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', minHeight: '110px' }}>"""

new_today_card = """        {mealsList.map(meal => {
          const foodItem = foodData[currentDayStr]?.[meal] || 'Not set yet';
          const status = todayRequests[meal]; // 'pack', 'cancel', or null
          const items = foodItem !== 'Not set yet' ? foodItem.split(/[,;]/).map(s => s.trim()).filter(Boolean) : [];
          const accent = mealAccents[meal] || { bg: '#f8fafc', border: '#e2e8f0', label: '#334155' };
          const mealPhoto = foodMenuImages?.[currentDayStr]?.[meal];
          
          return (
            <div key={meal} className={`today-meal-subcard-modern ${status ? 'has-status' : ''}`} style={{ flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
              <div style={{ background: accent.bg, padding: '12px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontWeight: '800', color: accent.label, textTransform: 'uppercase', fontSize: '13px', letterSpacing: '1px' }}>{meal}</span>
                  {mealPhoto && (
                    <span style={{ fontSize: '10px', background: '#dcfce7', color: '#166534', padding: '1px 6px', borderRadius: '6px', fontWeight: '800' }}>📸 Live Photo</span>
                  )}
                </div>
                {status && (
                  <span style={{ fontSize: '11px', fontWeight: '800', padding: '2px 8px', borderRadius: '12px', color: 'white', background: status === 'pack' ? '#0891b2' : '#e11d48' }}>
                    {status === 'pack' ? 'PACKED' : 'CANCELED'}
                  </span>
                )}
              </div>
              
              {mealPhoto && (
                <div style={{ position: 'relative', width: '100%', height: '140px', overflow: 'hidden', background: '#000' }}>
                  <img src={mealPhoto} alt={meal} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', bottom: 8, left: 12, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', color: 'white', padding: '3px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>👨‍🍳 Fresh from Mess Kitchen</span>
                  </div>
                </div>
              )}

              <div style={{ padding: '12px', display: 'flex', gap: '10px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', minHeight: '110px' }}>"""

if old_today_card not in content:
    print('Failed to find old_today_card')
    sys.exit(1)

content = content.replace(old_today_card, new_today_card, 1)

# 4. Update weekly view
old_weekly = """                        {meals.map(meal => {
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
                              </div>"""

new_weekly = """                        {meals.map(meal => {
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
                                {mealPhoto && (
                                  <span style={{ fontSize: '10px', background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '6px', fontWeight: '800' }}>📸 Photo Added</span>
                                )}
                                <span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: '700', color: accent.label, background: 'rgba(0,0,0,0.06)', padding: '2px 8px', borderRadius: '10px' }}>
                                  {items.length} item{items.length > 1 ? 's' : ''}
                                </span>
                              </div>

                              {mealPhoto && (
                                <div style={{ padding: '0 18px 8px' }}>
                                  <img src={mealPhoto} alt={meal} style={{ width: '100%', maxHeight: '130px', objectFit: 'cover', borderRadius: '12px', border: `1px solid ${accent.border}`, boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }} />
                                </div>
                              )}"""

if old_weekly not in content:
    print('Failed to find old_weekly')
    sys.exit(1)

content = content.replace(old_weekly, new_weekly, 1)

with open(food_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Successfully patched Food.jsx!')
