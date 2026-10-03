// ── Pre-configured Library of Common Indian PG & Hostel Dishes ──
export const COMMON_PG_DISHES = [
  // Breads & Rice
  { id: 'roti', name: 'Roti / Chapati', category: 'Breads & Rice', image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop' },
  { id: 'paratha', name: 'Aloo Paratha', category: 'Breads & Rice', image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=300&fit=crop' },
  { id: 'puri', name: 'Poori / Puri', category: 'Breads & Rice', image: 'https://images.unsplash.com/photo-1626200919300-b8c3c89bddf8?w=400&h=300&fit=crop' },
  { id: 'rice', name: 'Steamed Rice', category: 'Breads & Rice', image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&h=300&fit=crop' },
  { id: 'jeera-rice', name: 'Jeera Rice', category: 'Breads & Rice', image: 'https://images.unsplash.com/photo-1536304993881-ff86e0c9c938?w=400&h=300&fit=crop' },
  { id: 'biryani', name: 'Veg Biryani', category: 'Breads & Rice', image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&h=300&fit=crop' },
  { id: 'khichdi', name: 'Khichdi', category: 'Breads & Rice', image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop' },

  // Dal & Curries
  { id: 'dal-tadka', name: 'Dal Tadka / Yellow Dal', category: 'Dal & Curries', image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop' },
  { id: 'dal-makhani', name: 'Dal Makhani', category: 'Dal & Curries', image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop' },
  { id: 'rajma', name: 'Rajma Masala', category: 'Dal & Curries', image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop' },
  { id: 'chole', name: 'Chole / Chana Masala', category: 'Dal & Curries', image: 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=400&h=300&fit=crop' },
  { id: 'sambar', name: 'Sambar', category: 'Dal & Curries', image: 'https://images.unsplash.com/photo-1626200928309-0a3aa3d57527?w=400&h=300&fit=crop' },
  { id: 'kadhi', name: 'Kadhi Pakoda', category: 'Dal & Curries', image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&h=300&fit=crop' },

  // Sabzi & Curries
  { id: 'paneer', name: 'Paneer Butter Masala', category: 'Sabzi & Curries', image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&h=300&fit=crop' },
  { id: 'matar-paneer', name: 'Matar Paneer', category: 'Sabzi & Curries', image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&h=300&fit=crop' },
  { id: 'aloo-gobhi', name: 'Aloo Gobhi', category: 'Sabzi & Curries', image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&h=300&fit=crop' },
  { id: 'mix-veg', name: 'Mix Veg Sabzi', category: 'Sabzi & Curries', image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop' },
  { id: 'bhindi', name: 'Bhindi Masala', category: 'Sabzi & Curries', image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop' },
  { id: 'aloo-jeera', name: 'Aloo Jeera / Sabzi', category: 'Sabzi & Curries', image: 'https://images.unsplash.com/photo-1630400165756-71413c1ea29a?w=400&h=300&fit=crop' },
  { id: 'egg-curry', name: 'Egg Curry', category: 'Sabzi & Curries', image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=300&fit=crop' },
  { id: 'chicken-curry', name: 'Chicken Curry', category: 'Sabzi & Curries', image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&h=300&fit=crop' },

  // Breakfast
  { id: 'poha', name: 'Poha', category: 'Breakfast', image: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400&h=300&fit=crop' },
  { id: 'upma', name: 'Upma', category: 'Breakfast', image: 'https://images.unsplash.com/photo-1626200928309-0a3aa3d57527?w=400&h=300&fit=crop' },
  { id: 'idli', name: 'Idli Sambar', category: 'Breakfast', image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400&h=300&fit=crop' },
  { id: 'dosa', name: 'Masala Dosa', category: 'Breakfast', image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&h=300&fit=crop' },
  { id: 'puri-sabji', name: 'Puri Sabji', category: 'Breakfast', image: 'https://images.unsplash.com/photo-1626200928309-0a3aa3d57527?w=400&h=300&fit=crop' },
  { id: 'bread-butter', name: 'Bread Butter / Jam', category: 'Breakfast', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop' },
  { id: 'omelette', name: 'Bread Omelette', category: 'Breakfast', image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=300&fit=crop' },
  { id: 'boiled-eggs', name: 'Boiled Eggs', category: 'Breakfast', image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=300&fit=crop' },
  { id: 'chai', name: 'Chai / Masala Tea', category: 'Beverages', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop' },
  { id: 'coffee', name: 'Filter Coffee', category: 'Beverages', image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=300&fit=crop' },
  { id: 'milk', name: 'Hot Milk', category: 'Beverages', image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=300&fit=crop' },
  { id: 'banana', name: 'Banana / Fruits', category: 'Breakfast', image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&h=300&fit=crop' },

  // Snacks
  { id: 'samosa', name: 'Samosa', category: 'Snacks', image: 'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?w=400&h=300&fit=crop' },
  { id: 'pakora', name: 'Mix Veg Pakoda', category: 'Snacks', image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&h=300&fit=crop' },
  { id: 'sandwich', name: 'Veg Sandwich', category: 'Snacks', image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&h=300&fit=crop' },
  { id: 'maggi', name: 'Maggi Noodles', category: 'Snacks', image: 'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=400&h=300&fit=crop' },
  { id: 'bhel-puri', name: 'Bhel Puri / Chaat', category: 'Snacks', image: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400&h=300&fit=crop' },
  { id: 'biscuits', name: 'Biscuits / Cookies', category: 'Snacks', image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&h=300&fit=crop' },

  // Sides & Desserts
  { id: 'curd', name: 'Dahi / Plain Curd', category: 'Sides & Sweets', image: 'https://images.unsplash.com/photo-1563630382894-3e9a584090b4?w=400&h=300&fit=crop' },
  { id: 'raita', name: 'Boondi Raita', category: 'Sides & Sweets', image: 'https://images.unsplash.com/photo-1571167366136-b57e98d70f31?w=400&h=300&fit=crop' },
  { id: 'salad', name: 'Green Salad', category: 'Sides & Sweets', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop' },
  { id: 'papad', name: 'Papad / Fryums', category: 'Sides & Sweets', image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop' },
  { id: 'pickle', name: 'Achaar / Pickle', category: 'Sides & Sweets', image: 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=400&h=300&fit=crop' },
  { id: 'gulab-jamun', name: 'Gulab Jamun', category: 'Sides & Sweets', image: 'https://images.unsplash.com/photo-1489391386868-5ba3b0f3ee40?w=400&h=300&fit=crop' },
  { id: 'kheer', name: 'Kheer / Sweet Rice', category: 'Sides & Sweets', image: 'https://images.unsplash.com/photo-1560684352-8c2b26b71d5b?w=400&h=300&fit=crop' },
  { id: 'halwa', name: 'Suji / Gajar Halwa', category: 'Sides & Sweets', image: 'https://images.unsplash.com/photo-1630400165756-71413c1ea29a?w=400&h=300&fit=crop' }
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
 */
export function getDishPresetImage(dishName) {
  if (!dishName || typeof dishName !== 'string') return null;
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

  // 2. Substring keyword match
  for (const item of COMMON_PG_DISHES) {
    const itemName = item.name.toLowerCase();
    const parts = itemName.split(/[\/\,\s]+/).filter(p => p.length > 2);
    for (const part of parts) {
      if (cleaned.includes(part) || raw.includes(part)) {
        return item.image;
      }
    }
  }

  return null;
}
