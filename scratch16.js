const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/febebo-app/src/components/ImageSlider.jsx";

const newContent = `import React from 'react';

const ImageSlider = ({ images, fallback, className }) => {
  let validImages = [];
  if (images && images.length > 0) {
    validImages = images;
  } else if (fallback) {
    validImages = [fallback];
  } else {
    validImages = ['https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&q=80&w=800'];
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <img
        src={validImages[0]}
        alt="PG"
        className={className}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </div>
  );
};

export default ImageSlider;
`;

fs.writeFileSync(file, newContent);
