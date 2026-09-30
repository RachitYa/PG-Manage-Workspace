const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/febebo-app/src/screens/StudentDashboard.jsx";
let content = fs.readFileSync(file, 'utf8');

const targetStr = `                <div className="pg-h-scroll">
                  {filteredPGs.map(pg => (
                    <div
                      key={pg.id}
                      className="pg-card-h"
                      onClick={() => navigate('/room-description', { state: { pg } })}
                    >
                      <div className="pg-card-img-wrap">
                        <ImageSlider
                          images={pg.images}
                          fallback={pg.image}
                          className="pg-card-img"
                        />
                        <span className="pg-type-badge glass-badge" data-type={pg.pgType?.toLowerCase()}>
                          {pg.pgType || 'UNISEX'}
                        </span>
                        {pg.distanceKm !== null && (
                          <span className="pg-dist-badge glass-badge">
                            <Navigation size={10} /> {pg.distanceKm} km
                          </span>
                        )}
                        <div className="pg-card-price-overlay">
                          {pg.propertyDetails?.rents?.length ? \`Starts ₹\${Math.min(...pg.propertyDetails.rents.map(r=>Number(r.rent)).filter(v=>v>0)).toLocaleString()}\` : '₹ —'}<span>/mo</span>
                        </div>
                      </div>
                      <div className="pg-card-body">
                        <div className="pg-card-top-row">
                          <h3 className="pg-card-name">{pg.pgName || 'Febebo PG'}</h3>
                          <span className="pg-card-rating">
                            <Star size={12} fill="currentColor" /> 4.5
                          </span>
                        </div>
                        <p className="pg-card-loc">
                          <MapPin size={11} /> {pg.location?.city || 'New Delhi'}
                        </p>
                        <div className="pg-card-footer">
                          <button
                            className="btn-view-pg"
                            onClick={e => { e.stopPropagation(); navigate('/room-description', { state: { pg } }); }}
                          >
                            View Details →
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>`;

const replaceStr = `                <div className="pg-v-list">
                  {filteredPGs.map(pg => (
                    <div
                      key={pg.id}
                      className="pg-card-v"
                      onClick={() => navigate('/room-description', { state: { pg } })}
                    >
                      <div className="pg-v-img-wrap">
                        <ImageSlider
                          images={pg.images}
                          fallback={pg.image || 'https://images.unsplash.com/photo-1522771731478-44633239c878?auto=format&fit=crop&q=80&w=400'}
                        />
                      </div>
                      <div className="pg-v-info">
                        <div className="pg-v-header-row">
                          <h4 className="pg-v-name">{pg.pgName || 'Febebo PG'}</h4>
                          <span className="pg-v-rating-pill"><Star size={10} fill="currentColor" /> {pg.rating || '4.5'}</span>
                        </div>
                        <p className="pg-v-loc"><MapPin size={12} /> {pg.location?.city || 'New Delhi'}</p>
                        
                        <div className="pg-v-footer-row">
                          <div className="pg-v-price-block">
                            <span className="pg-v-price-label">Starting at</span>
                            <p className="pg-v-price">
                              {pg.propertyDetails?.rents?.length ? \`₹\${Math.min(...pg.propertyDetails.rents.map(r=>Number(r.rent)).filter(v=>v>0)).toLocaleString()}\` : '—'}
                              <span>/mo</span>
                            </p>
                          </div>
                          {pg.distanceKm !== null && (
                            <div className="pg-v-dist-pill">
                              <Navigation size={12} /> {pg.distanceKm} km
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>`;

content = content.replace(targetStr, replaceStr);
fs.writeFileSync(file, content);
