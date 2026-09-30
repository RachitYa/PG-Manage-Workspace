import re

with open('src/screens/Food.jsx', 'r') as f:
    content = f.read()

# Fresh images for the ones requested
NEW_ENTRIES = """
                  // User requested specific dishes
                  'roti':       'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop',
                  'chapati':    'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop',
                  'curd':       'https://images.unsplash.com/photo-1563630382894-3e9a584090b4?w=400&h=300&fit=crop',
                  'raita':      'https://images.unsplash.com/photo-1563630382894-3e9a584090b4?w=400&h=300&fit=crop',
                  'rice':       'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&h=300&fit=crop',
                  'papad':      'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop',
                  'upma':       'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400&h=300&fit=crop',
                  'bhel puri':  'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400&h=300&fit=crop',
                  'puri sabji': 'https://images.unsplash.com/photo-1626200919300-b8c3c89bddf8?w=400&h=300&fit=crop',
                  'aloo gobhi': 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&h=300&fit=crop',
                  'alooo gobhi':'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&h=300&fit=crop',
                  'gobi':       'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&h=300&fit=crop',
                  // Breakfast items"""

content = content.replace("// Breakfast items", NEW_ENTRIES)

with open('src/screens/Food.jsx', 'w') as f:
    f.write(content)
print("Updated Food.jsx")
