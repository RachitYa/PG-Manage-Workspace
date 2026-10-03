import sys

food_file = r'c:\Users\RACHIT\OneDrive\Desktop\Febeboo\febebo-app\src\screens\Food.jsx'
with open(food_file, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add import
old_import = "import './Food.css';"
new_import = """import './Food.css';
import { COMMON_PG_DISHES, getDishPresetImage } from '../data/commonFoodDishes';"""

if old_import in content:
    content = content.replace(old_import, new_import, 1)

# 2. Add foodItemImages state
old_state = "  const [foodMenuImages, setFoodMenuImages] = useState({});"
new_state = """  const [foodMenuImages, setFoodMenuImages] = useState({});
  const [foodItemImages, setFoodItemImages] = useState({});"""

if old_state in content:
    content = content.replace(old_state, new_state, 1)

# 3. Add foodItemImages to unsubMenu snapshot listener
old_snap = """        if (data.foodMenu) setFoodData(data.foodMenu);
        if (data.foodMenuImages) setFoodMenuImages(data.foodMenuImages);"""

new_snap = """        if (data.foodMenu) setFoodData(data.foodMenu);
        if (data.foodMenuImages) setFoodMenuImages(data.foodMenuImages);
        if (data.foodItemImages) setFoodItemImages(data.foodItemImages);"""

if old_snap in content:
    content = content.replace(old_snap, new_snap, 1)

# 4. Update renderTodayMealCard items list and remove whole-meal banner
old_today_block_start = "              <div style={{ background: accent.bg, padding: '12px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>"
idx_t_start = content.find(old_today_block_start)
idx_t_items_end = content.find("              <div className=\"subcard-actions\"", idx_t_start)

if idx_t_start != -1 and idx_t_items_end != -1:
    new_today_items_ui = """              <div style={{ background: accent.bg, padding: '12px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontWeight: '800', color: accent.label, textTransform: 'uppercase', fontSize: '13px', letterSpacing: '1px' }}>{meal}</span>
                  <span style={{ fontSize: '11px', color: accent.label, opacity: 0.8, fontWeight: 700 }}>({items.length} items)</span>
                </div>
                {status && (
                  <span style={{ fontSize: '11px', fontWeight: '800', padding: '2px 8px', borderRadius: '12px', color: 'white', background: status === 'pack' ? '#0891b2' : '#e11d48' }}>
                    {status === 'pack' ? 'PACKED' : 'CANCELED'}
                  </span>
                )}
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
              
"""
    content = content[:idx_t_start] + new_today_items_ui + content[idx_t_items_end:]

# 5. Update Weekly View (remove whole-meal banner and display per-item photos)
weekly_slot_start = "                              {/* Meal section header */}"
idx_w_start = content.find(weekly_slot_start)
idx_w_end = content.find("                            </div>\n                          );\n                        })}", idx_w_start)

if idx_w_start != -1 and idx_w_end != -1:
    new_weekly_slot_ui = """                              {/* Meal section header */}
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
                              </div>"""
    content = content[:idx_w_start] + new_weekly_slot_ui + content[idx_w_end:]

with open(food_file, 'w', encoding='utf-8') as f:
    f.write(content)

print('Successfully patched Food.jsx!')
