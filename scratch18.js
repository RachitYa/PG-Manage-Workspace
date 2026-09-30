const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/febebo-app/src/screens/RoomDescription.jsx";
let content = fs.readFileSync(file, 'utf8');

// 1. Add showModal state
content = content.replace(
  "const [isFavorite, setIsFavorite] = useState(false);",
  "const [isFavorite, setIsFavorite] = useState(false);\n  const [showImageModal, setShowImageModal] = useState(false);"
);

// 2. Remove the Chevron buttons in the slider, add onClick to image
const sliderStart = `<img src={images[currentImageIndex]} alt="Room" className="slider-image" />`;
const sliderReplacement = `<img src={images[currentImageIndex]} alt="Room" className="slider-image" onClick={() => setShowImageModal(true)} style={{ cursor: 'pointer' }} />`;

content = content.replace(sliderStart, sliderReplacement);

// Regex to remove the buttons:
const buttonRegex = /<button\s+onClick=\{\(\) => setCurrentImageIndex\(\(prev\) => \(prev === 0 \? images\.length - 1 : prev - 1\)\)\}[\s\S]*?<ChevronLeft size=\{20\} color="#000" \/>\s*<\/button>\s*<button\s+onClick=\{\(\) => setCurrentImageIndex\(\(prev\) => \(prev === images\.length - 1 \? 0 : prev \+ 1\)\)\}[\s\S]*?<ChevronRight size=\{20\} color="#000" \/>\s*<\/button>/g;
content = content.replace(buttonRegex, "");

// Also remove `{images.length > 1 && ( <>` and `</> )}` if they are dangling.
// The easiest is just replacing the exact block of the old slider.
