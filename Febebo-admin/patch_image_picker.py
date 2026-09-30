import re

# ─────────────────────────────────────────────
# The reusable image picker popup state + logic
# ─────────────────────────────────────────────

PICKER_STATE = """
  // Image picker popup: { id, type } where type = 'inventory' | 'amenity'
  const [imgPickerFor, setImgPickerFor] = useState(null);

  const openImagePicker = (id, type) => setImgPickerFor({ id, type });
  const closeImagePicker = () => setImgPickerFor(null);

  const handlePickedFile = async (e, id, type, setter) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setter(prev => {
        if (type === 'inventory') {
          return { ...prev, inventory: { ...prev.inventory, [id]: compressed } };
        } else {
          const cur = prev.amenityImages || {};
          return { ...prev, amenityImages: { ...cur, [id]: compressed } };
        }
      });
    } catch(err) { console.error('Compression failed', err); }
    closeImagePicker();
  };
"""

PICKER_MODAL = """
      {/* ── CAMERA / FOLDER PICKER POPUP ── */}
      {imgPickerFor && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={closeImagePicker} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(2px)' }} />
          <div style={{ position: 'relative', background: 'white', borderRadius: '20px 20px 0 0', padding: '20px 20px 36px', width: '100%', maxWidth: 480, zIndex: 1 }}>
            <p style={{ margin: '0 0 16px', fontWeight: 800, fontSize: 16, color: '#0f172a', textAlign: 'center' }}>Upload Photo</p>
            <div style={{ display: 'flex', gap: 12 }}>
              {/* Camera option */}
              <label style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '18px 0', borderRadius: 14, border: '1.5px solid #e2e8f0', cursor: 'pointer', background: '#f8fafc' }}>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: 'none' }}
                  onChange={(e) => handlePickedFile(e, imgPickerFor.id, imgPickerFor.type, imgPickerFor.type === 'inventory' ? setAllotForm : setApproveForm)}
                />
                <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#0891b2' }}>photo_camera</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>Camera</span>
              </label>
              {/* Folder option */}
              <label style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '18px 0', borderRadius: 14, border: '1.5px solid #e2e8f0', cursor: 'pointer', background: '#f8fafc' }}>
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => handlePickedFile(e, imgPickerFor.id, imgPickerFor.type, imgPickerFor.type === 'inventory' ? setAllotForm : setApproveForm)}
                />
                <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#7c3aed' }}>folder_open</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>Gallery</span>
              </label>
            </div>
            <button onClick={closeImagePicker} style={{ marginTop: 14, width: '100%', padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, color: '#64748b', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}
"""

# ─────────────────────────────────────────────
# PATCH Approvals.jsx
# ─────────────────────────────────────────────
with open("src/pages/Approvals.jsx", "r") as f:
    content = f.read()

# 1. Add useState import for imgPickerFor
content = content.replace(
    "import React, { useState, useEffect } from 'react';",
    "import React, { useState, useEffect } from 'react';"
)

# 2. Add picker state after existing state declarations (after allotForm state)
content = content.replace(
    "  const [customInventory, setCustomInventory] = useState([]);",
    "  const [customInventory, setCustomInventory] = useState([]);\n" + PICKER_STATE
)

# 3. Replace the plain file input inside inventory chip with openImagePicker button
OLD_INV_LABEL = """                         {isSelected && (
                          <label style={{ padding: '8px 12px', borderLeft: `1px solid #0891b2`, cursor: 'pointer', display: 'flex', alignItems: 'center', background: hasImage ? '#0891b2' : 'transparent', color: hasImage ? 'white' : '#0891b2' }} title=\"Upload Condition Picture\">
                            <input type=\"file\" accept=\"image/*\" onChange={(e) => handleInventoryItemImage(item.id, e)} style={{ display: 'none' }} />
                            <span className=\"material-symbols-outlined\" style={{ fontSize: 16 }}>{hasImage ? 'check_circle' : 'add_a_photo'}</span>
                          </label>
                         )}"""

NEW_INV_LABEL = """                         {isSelected && (
                          <button type="button" onClick={() => openImagePicker(item.id, 'inventory')} style={{ padding: '8px 12px', borderLeft: `1px solid #0891b2`, cursor: 'pointer', display: 'flex', alignItems: 'center', background: hasImage ? '#0891b2' : 'transparent', color: hasImage ? 'white' : '#0891b2', border: 'none', borderLeft: '1px solid #0891b2' }} title="Upload Condition Picture">
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{hasImage ? 'check_circle' : 'add_a_photo'}</span>
                          </button>
                         )}"""

content = content.replace(OLD_INV_LABEL, NEW_INV_LABEL)

# 4. Insert picker modal just before the allot modal closing tag area — before the HEADER comment
content = content.replace(
    "      {/* ── HEADER ── */}",
    PICKER_MODAL + "\n      {/* ── HEADER ── */}"
)

with open("src/pages/Approvals.jsx", "w") as f:
    f.write(content)

print("Approvals.jsx patched successfully!")


# ─────────────────────────────────────────────
# PATCH ManageTenants.jsx
# ─────────────────────────────────────────────
with open("src/pages/ManageTenants.jsx", "r") as f:
    content = f.read()

# 1. Add picker state after customInventory state
MT_PICKER_STATE = """
  // Image picker popup: { id, type } where type = 'inventory' | 'amenity'
  const [imgPickerFor, setImgPickerFor] = useState(null);

  const openImagePicker = (id, type) => setImgPickerFor({ id, type });
  const closeImagePicker = () => setImgPickerFor(null);

  const handlePickedFile = async (e, id, type) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setApproveForm(prev => {
        if (type === 'inventory') {
          return { ...prev, inventory: { ...prev.inventory, [id]: compressed } };
        } else {
          const cur = prev.amenityImages || {};
          return { ...prev, amenityImages: { ...cur, [id]: compressed } };
        }
      });
    } catch(err) { console.error('Compression failed', err); }
    closeImagePicker();
  };
"""

content = content.replace(
    "  const [customInventory, setCustomInventory] = useState([]);\n",
    "  const [customInventory, setCustomInventory] = useState([]);\n" + MT_PICKER_STATE
)

# 2. Replace plain file input in inventory chip
OLD_INV = """                    {isSelected && (
                      <label style={{ padding: '8px 12px', borderLeft: `1px solid ${cyan}`, cursor: 'pointer', display: 'flex', alignItems: 'center', background: hasImage ? '#0ea5e9' : 'transparent', color: hasImage ? 'white' : cyan }} title=\"Upload Condition Picture\">
                        <input type=\"file\" accept=\"image/*\" onChange={(e) => handleInventoryItemImage(item.id, e)} style={{ display: 'none' }} />
                        <span className=\"material-symbols-outlined\" style={{ fontSize: 16 }}>{hasImage ? 'check_circle' : 'add_a_photo'}</span>
                      </label>
                    )}"""

NEW_INV = """                    {isSelected && (
                      <button type="button" onClick={() => openImagePicker(item.id, 'inventory')} style={{ padding: '8px 12px', borderLeft: `1px solid ${cyan}`, cursor: 'pointer', display: 'flex', alignItems: 'center', background: hasImage ? '#0ea5e9' : 'transparent', color: hasImage ? 'white' : cyan, border: 'none', borderLeft: `1px solid ${cyan}` }} title="Upload Photo">
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{hasImage ? 'check_circle' : 'add_a_photo'}</span>
                      </button>
                    )}"""

content = content.replace(OLD_INV, NEW_INV)

# 3. Replace amenity plain buttons with chip + photo button (like inventory)
OLD_AMENITY_SECTION = """            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Amenities Allotted</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {allAmenities.map(amenity => (
                <button
                  key={amenity.id}
                  onClick={() => setApproveForm(prev => ({
                    ...prev,
                    amenities: prev.amenities.includes(amenity.id) ? prev.amenities.filter(a => a !== amenity.id) : [...prev.amenities, amenity.id]
                  }))}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 20, border: approveForm.amenities.includes(amenity.id) ? `1.5px solid ${cyan}` : '1px solid #e2e8f0', background: approveForm.amenities.includes(amenity.id) ? 'rgba(14,165,233,0.1)' : 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#334155' }}
                >
                  <span>{amenity.icon}</span> {amenity.label}
                </button>
              ))}
              <button
                onClick={handleAddCustomAmenity}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', borderRadius: 20, border: '1px dashed #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#64748b' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                Add
              </button>
            </div>"""

NEW_AMENITY_SECTION = """            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Amenities Allotted (Select & Add Photo)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {allAmenities.map(amenity => {
                const isAmenitySelected = approveForm.amenities.includes(amenity.id);
                const hasAmenityImage = isAmenitySelected && (approveForm.amenityImages || {})[amenity.id];
                return (
                  <div key={amenity.id} style={{ display: 'flex', alignItems: 'center', borderRadius: 20, border: isAmenitySelected ? `1.5px solid ${cyan}` : '1px solid #e2e8f0', background: isAmenitySelected ? 'rgba(14,165,233,0.1)' : 'white', overflow: 'hidden' }}>
                    <button
                      type="button"
                      onClick={() => setApproveForm(prev => ({
                        ...prev,
                        amenities: prev.amenities.includes(amenity.id) ? prev.amenities.filter(a => a !== amenity.id) : [...prev.amenities, amenity.id]
                      }))}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#334155' }}
                    >
                      <span>{amenity.icon}</span> {amenity.label}
                    </button>
                    {isAmenitySelected && (
                      <button type="button" onClick={() => openImagePicker(amenity.id, 'amenity')} style={{ padding: '8px 12px', borderLeft: `1px solid ${cyan}`, cursor: 'pointer', display: 'flex', alignItems: 'center', background: hasAmenityImage ? '#0ea5e9' : 'transparent', color: hasAmenityImage ? 'white' : cyan, border: 'none', borderLeft: `1px solid ${cyan}` }} title="Upload Photo">
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{hasAmenityImage ? 'check_circle' : 'add_a_photo'}</span>
                      </button>
                    )}
                  </div>
                );
              })}
              <button
                type="button"
                onClick={handleAddCustomAmenity}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', borderRadius: 20, border: '1px dashed #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#64748b' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                Add
              </button>
            </div>"""

content = content.replace(OLD_AMENITY_SECTION, NEW_AMENITY_SECTION)

# 4. Add MT picker modal just before the Approve modal's closing tags
MT_PICKER_MODAL = """
      {/* ── CAMERA / FOLDER PICKER POPUP ── */}
      {imgPickerFor && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={closeImagePicker} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(2px)' }} />
          <div style={{ position: 'relative', background: 'white', borderRadius: '20px 20px 0 0', padding: '20px 20px 36px', width: '100%', maxWidth: 480, zIndex: 1 }}>
            <p style={{ margin: '0 0 16px', fontWeight: 800, fontSize: 16, color: '#0f172a', textAlign: 'center' }}>Upload Photo</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <label style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '18px 0', borderRadius: 14, border: '1.5px solid #e2e8f0', cursor: 'pointer', background: '#f8fafc' }}>
                <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => handlePickedFile(e, imgPickerFor.id, imgPickerFor.type)} />
                <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#0891b2' }}>photo_camera</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>Camera</span>
              </label>
              <label style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '18px 0', borderRadius: 14, border: '1.5px solid #e2e8f0', cursor: 'pointer', background: '#f8fafc' }}>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handlePickedFile(e, imgPickerFor.id, imgPickerFor.type)} />
                <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#7c3aed' }}>folder_open</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>Gallery</span>
              </label>
            </div>
            <button onClick={closeImagePicker} style={{ marginTop: 14, width: '100%', padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, color: '#64748b', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}
"""

# Insert just before the collectModalData modal
content = content.replace(
    "      {collectModalData && (",
    MT_PICKER_MODAL + "      {collectModalData && ("
)

# 5. Also save amenityImages in Firestore when confirming
content = content.replace(
    "        inventory: approveForm.inventory\n      });",
    "        inventory: approveForm.inventory,\n        amenityImages: approveForm.amenityImages || {}\n      });"
)

with open("src/pages/ManageTenants.jsx", "w") as f:
    f.write(content)

print("ManageTenants.jsx patched successfully!")
