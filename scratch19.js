const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/febebo-app/src/screens/RoomDescription.jsx";
let content = fs.readFileSync(file, 'utf8');

if (!content.includes("showImageModal")) {
  content = content.replace(
    "const [isFavorite, setIsFavorite] = useState(false);",
    "const [isFavorite, setIsFavorite] = useState(false);\n  const [showImageModal, setShowImageModal] = useState(false);"
  );
}

const targetStart = `      {/* Image Slider */}`;
const targetEnd = `          No images uploaded
        </div>
      )}`;

const replacement = `      {/* Image Slider */}
      {images.length > 0 ? (
        <div className="room-slider" style={{ position: 'relative' }}>
          <img 
            src={images[currentImageIndex]} 
            alt="Room" 
            className="slider-image" 
            onClick={() => setShowImageModal(true)} 
            style={{ cursor: 'pointer' }}
          />

        {!user?.hasPG && (
          <button
            className="favorite-btn"
            onClick={toggleFavorite}
            style={{ background: isFavorite ? '#ef4444' : 'rgba(0,0,0,0.4)' }}
          >
            <Heart size={20} fill={isFavorite ? '#fff' : 'none'} color="#fff" />
          </button>
        )}
        
        {images.length > 1 && (
          <div className="slider-dots">
            {images.map((_, index) => (
              <div
                key={index}
                className={\`dot \${currentImageIndex === index ? 'active-dot' : ''}\`}
                onClick={() => setCurrentImageIndex(index)}
              />
            ))}
          </div>
        )}
      </div>
      ) : (
        <div className="room-slider" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', color: '#94a3b8', fontSize: '14px', fontWeight: 'bold' }}>
          No images uploaded
        </div>
      )}`;

let sIdx = content.indexOf(targetStart);
let eIdx = content.indexOf(targetEnd) + targetEnd.length;
if(sIdx !== -1 && eIdx !== -1) {
  content = content.substring(0, sIdx) + replacement + content.substring(eIdx);
}

// Now add the modal at the end of the return statement
const modalHtml = `
      {/* Fullscreen Image Modal */}
      {showImageModal && images.length > 0 && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.95)', zIndex: 9999,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center'
        }}>
          <button 
            onClick={() => setShowImageModal(false)}
            style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', zIndex: 10000 }}
          >
            <span className="material-symbols-outlined">close</span>
          </button>

          <img 
            src={images[currentImageIndex]} 
            alt="Room Fullscreen" 
            style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain' }} 
          />

          {images.length > 1 && (
            <>
              <button
                onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
                style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}
              >
                <ChevronLeft size={32} />
              </button>
              <button
                onClick={() => setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
                style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}
              >
                <ChevronRight size={32} />
              </button>
              
              <div style={{ position: 'absolute', bottom: 40, display: 'flex', gap: 8 }}>
                {images.map((_, index) => (
                  <div
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    style={{ width: 10, height: 10, borderRadius: '50%', background: currentImageIndex === index ? '#fff' : 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};`;

content = content.replace("    </div>\n  );\n};", modalHtml);

fs.writeFileSync(file, content);
