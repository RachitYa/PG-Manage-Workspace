import React from 'react';

const ImageSlider = ({ images, fallback, className }) => {
  let validImages = [];
  if (Array.isArray(images) && images.length > 0) {
    validImages = images;
  } else if (typeof images === 'string' && images.trim() !== '') {
    validImages = [images];
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
