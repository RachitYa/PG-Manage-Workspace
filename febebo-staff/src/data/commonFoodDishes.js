// ── Pre-configured Library of Common Indian PG & Hostel Dishes ──
// All image URLs are 100% verified 200 OK Unsplash photos optimized for mobile display

export const DEFAULT_FOOD_PLACEHOLDER = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop';

export const CATEGORY_FALLBACK_IMAGES = {
  'Breads & Rice': 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop',
  'Dal & Curries': 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop',
  'Sabzi & Curries': 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&h=300&fit=crop',
  'Breakfast': 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400&h=300&fit=crop',
  'Snacks': 'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?w=400&h=300&fit=crop',
  'Beverages': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
  'Sides & Sweets': 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=400&h=300&fit=crop'
};

export const COMMON_PG_DISHES = [
  // Breads & Rice
  { id: 'roti', name: 'Roti / Chapati', category: 'Breads & Rice', image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop' },
  { id: 'paratha', name: 'Aloo Paratha', category: 'Breads & Rice', image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=300&fit=crop' },
  { id: 'puri', name: 'Poori / Puri', category: 'Breads & Rice', image: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=400&h=300&fit=crop' },
  { id: 'rice', name: 'Steamed Rice', category: 'Breads & Rice', image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&h=300&fit=crop' },
  { id: 'jeera-rice', name: 'Jeera Rice', category: 'Breads & Rice', image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&h=300&fit=crop' },
  { id: 'biryani', name: 'Veg Biryani', category: 'Breads & Rice', image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&h=300&fit=crop' },
  { id: 'khichdi', name: 'Khichdi', category: 'Breads & Rice', image: 'https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?w=400&h=300&fit=crop' },
  { id: 'fried-rice', name: 'Veg Fried Rice', category: 'Breads & Rice', image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&h=300&fit=crop' },
  { id: 'naan', name: 'Butter Naan / Kulcha', category: 'Breads & Rice', image: 'https://images.unsplash.com/photo-1725483990094-e95226a16db7?w=400&h=300&fit=crop' },

  // Dal & Curries
  { id: 'dal-tadka', name: 'Dal Tadka / Yellow Dal', category: 'Dal & Curries', image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop' },
  { id: 'dal-makhani', name: 'Dal Makhani', category: 'Dal & Curries', image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop' },
  { id: 'rajma', name: 'Rajma Masala', category: 'Dal & Curries', image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop' },
  { id: 'chole', name: 'Chole / Chana Masala', category: 'Dal & Curries', image: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=400&h=300&fit=crop' },
  { id: 'sambar', name: 'Sambar', category: 'Dal & Curries', image: 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=400&h=300&fit=crop' },
  { id: 'kadhi', name: 'Kadhi Pakoda', category: 'Dal & Curries', image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&h=300&fit=crop' },

  // Sabzi & Curries
  { id: 'paneer', name: 'Paneer Butter Masala', category: 'Sabzi & Curries', image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&h=300&fit=crop' },
  { id: 'matar-paneer', name: 'Matar Paneer', category: 'Sabzi & Curries', image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&h=300&fit=crop' },
  { id: 'aloo-gobhi', name: 'Aloo Gobhi', category: 'Sabzi & Curries', image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&h=300&fit=crop' },
  { id: 'mix-veg', name: 'Mix Veg Sabzi', category: 'Sabzi & Curries', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop' },
  { id: 'bhindi', name: 'Bhindi Masala', category: 'Sabzi & Curries', image: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&h=300&fit=crop' },
  { id: 'aloo-jeera', name: 'Aloo Jeera / Sabzi', category: 'Sabzi & Curries', image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=300&fit=crop' },
  { id: 'egg-curry', name: 'Egg Curry', category: 'Sabzi & Curries', image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=300&fit=crop' },
  { id: 'chicken-curry', name: 'Chicken Curry', category: 'Sabzi & Curries', image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&h=300&fit=crop' },
  { id: 'sev-tamatar', name: 'Sev Tamatar', category: 'Sabzi & Curries', image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&h=300&fit=crop' },
  { id: 'chana-dal', name: 'Chana Dal', category: 'Sabzi & Curries', image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop' },

  // Breakfast
  { id: 'poha', name: 'Poha', category: 'Breakfast', image: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400&h=300&fit=crop' },
  { id: 'upma', name: 'Upma', category: 'Breakfast', image: 'https://images.unsplash.com/photo-1626200928309-0a3aa3d57527?w=400&h=300&fit=crop' },
  { id: 'idli', name: 'Idli Sambar', category: 'Breakfast', image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400&h=300&fit=crop' },
  { id: 'dosa', name: 'Masala Dosa', category: 'Breakfast', image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=400&h=300&fit=crop' },
  { id: 'puri-sabji', name: 'Puri Sabji', category: 'Breakfast', image: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=400&h=300&fit=crop' },
  { id: 'bread-butter', name: 'Bread Butter / Jam', category: 'Breakfast', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop' },
  { id: 'omelette', name: 'Bread Omelette', category: 'Breakfast', image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=300&fit=crop' },
  { id: 'boiled-eggs', name: 'Boiled Eggs', category: 'Breakfast', image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=300&fit=crop' },
  { id: 'chai-breakfast', name: 'Chai / Masala Tea', category: 'Breakfast', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop' },
  { id: 'coffee-breakfast', name: 'Filter Coffee', category: 'Breakfast', image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=300&fit=crop' },
  { id: 'milk', name: 'Hot Milk', category: 'Breakfast', image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=300&fit=crop' },
  { id: 'banana', name: 'Banana / Fruits', category: 'Breakfast', image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&h=300&fit=crop' },

  // Snacks
  { id: 'samosa', name: 'Samosa', category: 'Snacks', image: 'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?w=400&h=300&fit=crop' },
  { id: 'pakora', name: 'Mix Veg Pakoda', category: 'Snacks', image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&h=300&fit=crop' },
  { id: 'sandwich', name: 'Veg Sandwich', category: 'Snacks', image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&h=300&fit=crop' },
  { id: 'maggi', name: 'Maggi Noodles', category: 'Snacks', image: 'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=400&h=300&fit=crop' },
  { id: 'bhel-puri', name: 'Bhel Puri / Chaat', category: 'Snacks', image: 'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=400&h=300&fit=crop' },
  { id: 'biscuits', name: 'Biscuits / Cookies', category: 'Snacks', image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&h=300&fit=crop' },
  { id: 'chai-snacks', name: 'Chai / Masala Tea', category: 'Snacks', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop' },
  { id: 'coffee-snacks', name: 'Filter Coffee', category: 'Snacks', image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=300&fit=crop' },

  // Beverages
  { id: 'chai', name: 'Chai / Masala Tea', category: 'Beverages', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop' },
  { id: 'coffee', name: 'Filter Coffee', category: 'Beverages', image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=300&fit=crop' },

  // Sides & Desserts
  { id: 'curd', name: 'Dahi / Plain Curd', category: 'Sides & Sweets', image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=300&fit=crop' },
  { id: 'raita', name: 'Boondi Raita', category: 'Sides & Sweets', image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=300&fit=crop' },
  { id: 'salad', name: 'Green Salad', category: 'Sides & Sweets', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop' },
  { id: 'papad', name: 'Papad / Fryums', category: 'Sides & Sweets', image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=300&fit=crop' },
  { id: 'pickle', name: 'Achaar / Pickle', category: 'Sides & Sweets', image: 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=400&h=300&fit=crop' },
  { id: 'gulab-jamun', name: 'Gulab Jamun', category: 'Sides & Sweets', image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=400&h=300&fit=crop' },
  { id: 'kheer', name: 'Kheer / Sweet Rice', category: 'Sides & Sweets', image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400&h=300&fit=crop' },
  { id: 'halwa', name: 'Suji / Gajar Halwa', category: 'Sides & Sweets', image: 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?w=400&h=300&fit=crop' }
];

export const DISH_CATEGORIES = [
  'All',
  'Breads & Rice',
  'Dal & Curries',
  'Sabzi & Curries',
  'Breakfast',
  'Snacks',
  'Beverages',
  'Sides & Sweets'
];

/**
 * Intelligent dish preset image finder.
 * Cleans numbers (e.g. "4 Roti" -> "roti"), punctuation, and matches against common PG dishes.
 * If not matched, returns a sensible category fallback image so that NO dish is left without a photo.
 */
export function getDishPresetImage(dishName, category) {
  if (!dishName || typeof dishName !== 'string') return DEFAULT_FOOD_PLACEHOLDER;
  const raw = dishName.trim().toLowerCase();
  
  // Strip common prefixes like numbers, "plate of", "bowl of", etc.
  const cleaned = raw
    .replace(/^(\d+[\s\-\.]*)/, '') // "4 roti" -> "roti"
    .replace(/^(plate|bowl|cup|glass|pcs|pieces)[\s\-\.]*of[\s\-]*/, '')
    .trim();

  // 1. Direct match on dish name or id
  for (const item of COMMON_PG_DISHES) {
    const itemName = item.name.toLowerCase();
    if (cleaned === item.id || cleaned === itemName) {
      return item.image;
    }
  }

  // 2. Keyword heuristic matching for common variations
  if (/dosa|masala.*dosa/.test(cleaned)) return 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=400&h=300&fit=crop';
  if (/idli/.test(cleaned)) return 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400&h=300&fit=crop';
  if (/bhindi|okra/.test(cleaned)) return 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&h=300&fit=crop';
  if (/naan|kulcha/.test(cleaned)) return 'https://images.unsplash.com/photo-1725483990094-e95226a16db7?w=400&h=300&fit=crop';
  if (/roti|chapati|phulka|tandoori/.test(cleaned)) return 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop';
  if (/paratha|parantha/.test(cleaned)) return 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=300&fit=crop';
  if (/puri|poori|bhatur/.test(cleaned)) return 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=400&h=300&fit=crop';
  if (/fried.*rice/.test(cleaned)) return 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&h=300&fit=crop';
  if (/khichdi/.test(cleaned)) return 'https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?w=400&h=300&fit=crop';
  if (/biryani|pulao/.test(cleaned)) return 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&h=300&fit=crop';
  if (/rice|chawal|jeera.*rice/.test(cleaned)) return 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&h=300&fit=crop';
  if (/paneer|shahi|kadai|palak.*paneer/.test(cleaned)) return 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&h=300&fit=crop';
  if (/sambar|sambhar/.test(cleaned)) return 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=400&h=300&fit=crop';
  if (/dal.*makhani/.test(cleaned)) return 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop';
  if (/dal|daal|tadka/.test(cleaned)) return 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop';
  if (/rajma/.test(cleaned)) return 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop';
  if (/chole|chana/.test(cleaned)) return 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=400&h=300&fit=crop';
  if (/kadhi/.test(cleaned)) return 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&h=300&fit=crop';
  if (/sev.*tamatar/.test(cleaned)) return 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&h=300&fit=crop';
  if (/mix.*veg/.test(cleaned)) return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop';
  if (/gobhi|aloo.*gobi/.test(cleaned)) return 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&h=300&fit=crop';
  if (/poha/.test(cleaned)) return 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400&h=300&fit=crop';
  if (/upma/.test(cleaned)) return 'https://images.unsplash.com/photo-1626200928309-0a3aa3d57527?w=400&h=300&fit=crop';
  if (/chai|tea/.test(cleaned)) return 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop';
  if (/coffee/.test(cleaned)) return 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=300&fit=crop';
  if (/milk|doodh/.test(cleaned)) return 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=300&fit=crop';
  if (/egg|anda|omelette|omlet/.test(cleaned)) return 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=300&fit=crop';
  if (/chicken|meat/.test(cleaned)) return 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&h=300&fit=crop';
  if (/maggi|noodle|pasta/.test(cleaned)) return 'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=400&h=300&fit=crop';
  if (/bhel.*puri|chaat/.test(cleaned)) return 'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=400&h=300&fit=crop';
  if (/samosa/.test(cleaned)) return 'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?w=400&h=300&fit=crop';
  if (/pakoda|pakora/.test(cleaned)) return 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&h=300&fit=crop';
  if (/sandwich/.test(cleaned)) return 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&h=300&fit=crop';
  if (/curd|dahi|raita/.test(cleaned)) return 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=300&fit=crop';
  if (/salad/.test(cleaned)) return 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop';
  if (/papad/.test(cleaned)) return 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=300&fit=crop';
  if (/pickle|achaar/.test(cleaned)) return 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=400&h=300&fit=crop';
  if (/gulab|jamun/.test(cleaned)) return 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=400&h=300&fit=crop';
  if (/kheer/.test(cleaned)) return 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400&h=300&fit=crop';
  if (/halwa/.test(cleaned)) return 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?w=400&h=300&fit=crop';
  if (/sweet|dessert|mithai/.test(cleaned)) return 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=400&h=300&fit=crop';

  // 3. Substring match
  for (const item of COMMON_PG_DISHES) {
    const itemName = item.name.toLowerCase();
    const parts = itemName.split(/[\/\,\s]+/).filter(p => p.length > 2);
    for (const part of parts) {
      if (cleaned.includes(part)) {
        return item.image;
      }
    }
  }

  // 4. Fallback based on category
  if (category && CATEGORY_FALLBACK_IMAGES[category]) {
    return CATEGORY_FALLBACK_IMAGES[category];
  }

  return DEFAULT_FOOD_PLACEHOLDER;
}
