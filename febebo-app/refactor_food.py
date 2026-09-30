import re

with open('src/screens/Food.jsx', 'r') as f:
    content = f.read()

# Extract the FOOD_IMAGES block from the weekly view
match = re.search(r'(// ── Food item image lookup.*?const getFoodImage =.*?\n                };\n)', content, re.DOTALL)
if match:
    food_images_block = match.group(1)
    # Remove it from its current location
    content = content.replace(food_images_block, "")
    
    # Indent it properly to fit inside `const Food = () => {`
    food_images_block_unindented = re.sub(r'^                ', '  ', food_images_block, flags=re.MULTILINE)
    
    # Insert it right after `const [extraDate, setExtraDate] = useState('');` (which is early in the component)
    content = content.replace("const [extraDate, setExtraDate] = useState('');\n", "const [extraDate, setExtraDate] = useState('');\n\n" + food_images_block_unindented + "\n")
    print("Lifted FOOD_IMAGES successfully.")
else:
    print("Could not find FOOD_IMAGES block!")

# Now rewrite renderTodayMealCard
OLD_RENDER_TODAY = """  const renderTodayMealCard = (title, icon, mealsList) => {
    return (
      <div className="today-meal-block">
        <div className="today-meal-header">
          {icon}
          <h4>{title}</h4>
        </div>
        
        {mealsList.map(meal => {
          const foodItem = foodData[currentDayStr]?.[meal] || 'Not set yet';
          const status = todayRequests[meal]; // 'pack', 'cancel', or null
          const imgUrl = mealImages[meal] || mealImages.Lunch;
          
          return (
            <div key={meal} className={`today-meal-subcard-modern ${status ? 'has-status' : ''}`}>
              <div className="modern-card-image" style={{ backgroundImage: `url(${imgUrl})` }}>
                <div className="modern-card-meal-tag">{meal}</div>
              </div>
              
              <div className="modern-card-content">
                <h5 className="modern-card-food-name">{foodItem}</h5>
                
                <div className="subcard-actions">
                  <button 
                    className={`meal-btn pack-btn ${status === 'pack' ? 'active' : ''}`}
                    onClick={() => handleMealAction(meal, 'pack')}
                  >
                    <ShoppingBag size={14} />
                    {status === 'pack' ? 'Packed' : 'Pack / Take Away'}
                  </button>
                  <button 
                    className={`meal-btn cancel-btn ${status === 'cancel' ? 'active' : ''}`}
                    onClick={() => handleMealAction(meal, 'cancel')}
                  >
                    <Ban size={14} />
                    {status === 'cancel' ? 'Canceled' : 'Cancel Meal'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };"""

NEW_RENDER_TODAY = """  const renderTodayMealCard = (title, icon, mealsList) => {
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
              
              <div className="subcard-actions" style={{ padding: '12px', borderTop: '1px solid #f1f5f9', background: 'white' }}>
                <button 
                  className={`meal-btn pack-btn ${status === 'pack' ? 'active' : ''}`}
                  onClick={() => handleMealAction(meal, 'pack')}
                >
                  <ShoppingBag size={14} />
                  {status === 'pack' ? 'Packed' : 'Pack / Take Away'}
                </button>
                <button 
                  className={`meal-btn cancel-btn ${status === 'cancel' ? 'active' : ''}`}
                  onClick={() => handleMealAction(meal, 'cancel')}
                >
                  <Ban size={14} />
                  {status === 'cancel' ? 'Canceled' : 'Cancel Meal'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };"""

content = content.replace(OLD_RENDER_TODAY, NEW_RENDER_TODAY)
if OLD_RENDER_TODAY in content:
    print("Failed to replace renderTodayMealCard!")
else:
    print("Replaced renderTodayMealCard!")

with open('src/screens/Food.jsx', 'w') as f:
    f.write(content)

