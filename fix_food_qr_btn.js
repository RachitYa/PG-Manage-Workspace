const fs = require('fs');
const file = '/Users/shreyassingh/Downloads/PG MANAGE @/febebo-app/src/screens/Food.jsx';
let content = fs.readFileSync(file, 'utf8');

const target = `              <div className="subcard-actions" style={{ padding: '12px', borderTop: '1px solid #f1f5f9', background: 'white' }}>
                <button 
                  className={\`meal-btn pack-btn \${status === 'pack' ? 'active' : ''}\`}
                  onClick={() => handleMealAction(meal, 'pack')}
                >
                  <ShoppingBag size={14} />
                  {status === 'pack' ? 'Packed' : 'Pack / Take Away'}
                </button>
                <button 
                  className={\`meal-btn cancel-btn \${status === 'cancel' ? 'active' : ''}\`}
                  onClick={() => handleMealAction(meal, 'cancel')}
                >
                  <Ban size={14} />
                  {status === 'cancel' ? 'Canceled' : 'Cancel Meal'}
                </button>
              </div>`;

const replacement = `              <div className="subcard-actions" style={{ padding: '12px', borderTop: '1px solid #f1f5f9', background: 'white' }}>
                {eatenStatus[meal.toLowerCase()] ? (
                  <button className="meal-btn" style={{ background: '#10b981', color: 'white', border: 'none', width: '100%', padding: '10px', borderRadius: '12px', fontWeight: '800', cursor: 'default' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', verticalAlign: 'middle', marginRight: '6px' }}>check_circle</span>
                    Eaten ✓
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={() => { setActiveMealQR(meal); setShowQRModal(true); }}
                      className="meal-btn" style={{ background: 'linear-gradient(135deg, #0f172a, #334155)', color: 'white', border: 'none', width: '100%', padding: '10px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', marginBottom: '8px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', verticalAlign: 'middle', marginRight: '6px' }}>qr_code_2</span>
                      Generate Pass
                    </button>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className={\`meal-btn pack-btn \${status === 'pack' ? 'active' : ''}\`}
                        onClick={() => handleMealAction(meal, 'pack')}
                        style={{ flex: 1 }}
                      >
                        <ShoppingBag size={14} />
                        {status === 'pack' ? 'Packed' : 'Pack'}
                      </button>
                      <button 
                        className={\`meal-btn cancel-btn \${status === 'cancel' ? 'active' : ''}\`}
                        onClick={() => handleMealAction(meal, 'cancel')}
                        style={{ flex: 1 }}
                      >
                        <Ban size={14} />
                        {status === 'cancel' ? 'Canceled' : 'Cancel'}
                      </button>
                    </div>
                  </>
                )}
              </div>`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content, 'utf8');
