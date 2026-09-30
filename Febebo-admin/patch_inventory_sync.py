with open("src/pages/Approvals.jsx", "r") as f:
    content = f.read()

# Add import for getDocs, deleteDoc (needed for clearing old allocations before writing new ones)
content = content.replace(
    "import { collection, query, where, getDocs, doc, updateDoc, setDoc, addDoc } from 'firebase/firestore';",
    "import { collection, query, where, getDocs, doc, updateDoc, setDoc, addDoc, deleteDoc } from 'firebase/firestore';"
)

# ICON MAP to convert inventory id → material icon name
ICON_MAP_CODE = """
  const INVENTORY_ICON_MAP = {
    bed: 'bed', mattress: 'bed', table: 'table_restaurant',
    chair: 'chair', cupboard: 'door_sliding', ac_remote: 'air',
    keys: 'key', dustbin: 'delete'
  };
"""

# inject icon map right after existing state declarations
content = content.replace(
    "  const allInventoryItems = [...INVENTORY_ITEMS, ...customInventory];",
    ICON_MAP_CODE + "\n  const allInventoryItems = [...INVENTORY_ITEMS, ...customInventory];"
)

# After tenant record is created (after inventory: allotForm.inventory in setDoc), 
# write inventory_allocations records
OLD_BLOCK = """      // Create Receipt for Joining Month"""

NEW_BLOCK = """      // 2b. Write each selected inventory item to inventory_allocations
      //     (so it shows up in Inventory → User Inventory page)
      {
        const tenantId = app.tenantId;
        // First clear any existing allocations for this tenant
        const qOld = query(
          collection(db, 'inventory_allocations'),
          where('adminId', '==', user.uid),
          where('targetId', '==', tenantId)
        );
        const snapOld = await getDocs(qOld);
        await Promise.all(snapOld.docs.map(d => deleteDoc(d.ref)));

        // Now write fresh allocations from the selected inventory
        const selectedItems = Object.keys(allotForm.inventory);
        if (selectedItems.length > 0) {
          const allItems = [...INVENTORY_ITEMS, ...customInventory];
          await Promise.all(selectedItems.map(itemId => {
            const itemMeta = allItems.find(i => i.id === itemId);
            return addDoc(collection(db, 'inventory_allocations'), {
              adminId: user.uid,
              targetId: tenantId,
              targetType: 'tenant',
              itemName: itemMeta?.label || itemId,
              qty: 1,
              icon: INVENTORY_ICON_MAP[itemId] || 'inventory_2',
              conditionImage: allotForm.inventory[itemId] || null,
              assignedAt: new Date().toISOString()
            });
          }));
        }
      }

      // Create Receipt for Joining Month"""

content = content.replace(OLD_BLOCK, NEW_BLOCK)

with open("src/pages/Approvals.jsx", "w") as f:
    f.write(content)

print("Approvals.jsx patched!")


# ─────────────────────────────────────────────
# PATCH ManageTenants.jsx (Upcoming → Current approval)
# ─────────────────────────────────────────────
with open("src/pages/ManageTenants.jsx", "r") as f:
    content = f.read()

# Add deleteDoc to imports if not already there
content = content.replace(
    "import { collection, query, where, getDocs, doc, updateDoc, getDoc, addDoc } from 'firebase/firestore';",
    "import { collection, query, where, getDocs, doc, updateDoc, getDoc, addDoc, deleteDoc } from 'firebase/firestore';"
)

# Also try alternate import line
content = content.replace(
    "import { collection, query, where, getDocs, getDoc, doc, updateDoc, addDoc } from 'firebase/firestore';",
    "import { collection, query, where, getDocs, getDoc, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';"
)

MT_ICON_MAP = """
  const INVENTORY_ICON_MAP = {
    bed: 'bed', mattress: 'bed', table: 'table_restaurant',
    chair: 'chair', cupboard: 'door_sliding', ac_remote: 'air',
    keys: 'key', dustbin: 'delete'
  };
"""

content = content.replace(
    "  const allInventoryItems = [...INVENTORY_ITEMS, ...customInventory];",
    MT_ICON_MAP + "\n  const allInventoryItems = [...INVENTORY_ITEMS, ...customInventory];"
)

# In confirmApprove, after the updateDoc for tenant status, add the inventory_allocations write
OLD_CONFIRM = """      setUsers(prev => prev.map(u => u.id === uId ? { ...u, status: 'Approved' } : u));
      setApproveUser(null);"""

NEW_CONFIRM = """      // Write inventory_allocations so Inventory → User Inventory page shows them
      {
        const qOld = query(
          collection(db, 'inventory_allocations'),
          where('adminId', '==', user.uid),
          where('targetId', '==', uId)
        );
        const snapOld = await getDocs(qOld);
        await Promise.all(snapOld.docs.map(d => deleteDoc(d.ref)));

        const selectedItems = Object.keys(approveForm.inventory || {});
        if (selectedItems.length > 0) {
          const allItems = [...INVENTORY_ITEMS, ...customInventory];
          await Promise.all(selectedItems.map(itemId => {
            const itemMeta = allItems.find(i => i.id === itemId);
            return addDoc(collection(db, 'inventory_allocations'), {
              adminId: user.uid,
              targetId: uId,
              targetType: 'tenant',
              itemName: itemMeta?.label || itemId,
              qty: 1,
              icon: INVENTORY_ICON_MAP[itemId] || 'inventory_2',
              conditionImage: (approveForm.inventory || {})[itemId] || null,
              assignedAt: new Date().toISOString()
            });
          }));
        }
      }

      setUsers(prev => prev.map(u => u.id === uId ? { ...u, status: 'Approved' } : u));
      setApproveUser(null);"""

content = content.replace(OLD_CONFIRM, NEW_CONFIRM)

with open("src/pages/ManageTenants.jsx", "w") as f:
    f.write(content)

print("ManageTenants.jsx patched!")
