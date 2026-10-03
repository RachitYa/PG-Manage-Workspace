import sys

staff_path = r'c:\Users\RACHIT\OneDrive\Desktop\Febeboo\febebo-staff\src\pages\StaffApp.jsx'
with open(staff_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Extract the showWeeklyMenuEdit modal code from cookHistory
modal_start = '{/* Edit Modal for Cook with Photo Picker */}'
modal_end = 'Save Changes &amp; Photo\n                  </button>\n                </div>\n              </div>\n            )}'

idx_start = content.find(modal_start)
idx_end = content.find(modal_end)

if idx_start == -1 or idx_end == -1:
    print('Failed to locate modal!')
    sys.exit(1)

full_modal_end = idx_end + len(modal_end)
modal_code = content[idx_start:full_modal_end]

# Remove modal from cookHistory
content_without_modal = content[:idx_start] + content[full_modal_end:]

# 2. Update the menu display card
old_card = '''            {/* Menu Display */}
            <div style={{background:'#fff', borderRadius:16, border: '1px solid #e2e8f0', padding:14, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <div>
                <p style={{margin:0, fontSize:12, fontWeight:800, color:meta.accent, textTransform:'uppercase'}}>Today's {mealTab}</p>
                <p style={{margin:'4px 0 0', fontSize:14, fontWeight:700, color:C.text}}>{weeklyFoodMenu?.[todayName]?.[mealTab] || 'No menu set'}</p>
              </div>
              <button onClick={()=>{setMenuEditVal(weeklyFoodMenu?.[todayName]?.[mealTab] || ''); setShowMenuEdit(true);}} style={{background:C.bg, border: '1px solid #e2e8f0', borderRadius:10, padding:'8px 12px', fontSize:12, fontWeight:800, color:C.sub, cursor:'pointer'}}>Edit</button>
            </div>'''

new_card = '''            {/* Menu Display */}
            {(() => {
              const currentPhoto = foodMenuImages?.[todayName]?.[mealTab];
              return (
                <div style={{background:'#fff', borderRadius:16, border: '1px solid #e2e8f0', padding:14, display:'flex', justifyContent:'space-between', alignItems:'center', gap:12}}>
                  {currentPhoto && (
                    <img 
                      src={currentPhoto} 
                      alt={mealTab} 
                      onClick={() => {
                        setEditWeeklyMenuDay(todayName);
                        setEditWeeklyMenuMeal(mealTab);
                        setEditWeeklyMenuVal(weeklyFoodMenu?.[todayName]?.[mealTab] || '');
                        setEditWeeklyMenuImage(foodMenuImages?.[todayName]?.[mealTab] || null);
                        setShowWeeklyMenuEdit(true);
                      }}
                      style={{width:54, height:54, borderRadius:12, objectFit:'cover', border:'1px solid #e2e8f0', flexShrink:0, cursor:'pointer'}} 
                    />
                  )}
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{display:'flex', alignItems:'center', gap:6}}>
                      <p style={{margin:0, fontSize:12, fontWeight:800, color:meta.accent, textTransform:'uppercase'}}>Today's {mealTab}</p>
                      {currentPhoto && (
                        <span style={{fontSize:10, background:'#dcfce7', color:'#166534', padding:'1px 5px', borderRadius:4, fontWeight:800}}>📷 Photo</span>
                      )}
                    </div>
                    <p style={{margin:'4px 0 0', fontSize:14, fontWeight:700, color:C.text}}>{weeklyFoodMenu?.[todayName]?.[mealTab] || 'No menu set'}</p>
                  </div>
                  <button 
                    onClick={()=>{
                      setEditWeeklyMenuDay(todayName);
                      setEditWeeklyMenuMeal(mealTab);
                      setEditWeeklyMenuVal(weeklyFoodMenu?.[todayName]?.[mealTab] || '');
                      setEditWeeklyMenuImage(foodMenuImages?.[todayName]?.[mealTab] || null);
                      setShowWeeklyMenuEdit(true);
                    }} 
                    style={{background:C.bg, border: '1px solid #e2e8f0', borderRadius:10, padding:'8px 12px', fontSize:12, fontWeight:800, color:C.sub, cursor:'pointer', display:'flex', alignItems:'center', gap:4, flexShrink:0}}>
                    <span className="material-symbols-outlined" style={{fontSize:15}}>photo_camera</span> Edit
                  </button>
                </div>
              );
            })()}'''

if old_card not in content_without_modal:
    print('Failed to locate old_card!')
    sys.exit(1)

content_updated_card = content_without_modal.replace(old_card, new_card)

# 3. Insert modal_code right before the showPackEdit Sheet
pack_target = '<Sheet show={showPackEdit}'
if pack_target not in content_updated_card:
    print('Failed to locate showPackEdit!')
    sys.exit(1)

content_final = content_updated_card.replace(pack_target, modal_code + '\n\n      ' + pack_target)

with open(staff_path, 'w', encoding='utf-8') as f:
    f.write(content_final)

print('Successfully patched StaffApp.jsx!')
