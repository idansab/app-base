// Migration script: Update database categories
// Maps old categories to new ones (or deletes if unmapped)

const categoryMap = {
  'cafe': 'coffee_food',
  'springs': 'culture',  // טבועות -> תרבות
  'nature': 'trips',      // טבע -> טיולים
  'other': null,          // Delete
  'beaches': 'trips',     // חופים -> טיולים
  'treatments': 'culture',// טיפולים -> תרבות
  'food': 'coffee_food',  // אוכל -> עגלות קפה ואוכל
  'family': 'trips',      // משפחה -> טיולים
  'shopping': 'shopping', // שווקים -> שווקים
  'nightlife': 'nightlife', // חיי לילה -> חיי לילה
};

const API_BASE = 'http://localhost:3001/api';

async function migrateCategories() {
  console.log('Starting category migration...');

  try {
    // Fetch all places
    const res = await fetch(`${API_BASE}/places`);
    if (!res.ok) throw new Error('Failed to fetch places');

    const places = await res.json();
    console.log(`Found ${places.length} places`);

    let updated = 0;
    let deleted = 0;

    for (const place of places) {
      const newCategory = categoryMap[place.category];

      if (newCategory === null) {
        // Delete place with unmapped category
        const deleteRes = await fetch(`${API_BASE}/places/${place.id}`, {
          method: 'DELETE',
        });
        if (deleteRes.ok) {
          deleted++;
          console.log(`Deleted: ${place.name} (old category: ${place.category})`);
        }
      } else if (newCategory && newCategory !== place.category) {
        // Update place with new category
        const updateRes = await fetch(`${API_BASE}/places/${place.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category: newCategory }),
        });
        if (updateRes.ok) {
          updated++;
          console.log(`Updated: ${place.name} (${place.category} → ${newCategory})`);
        }
      }
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`📊 Updated: ${updated}, Deleted: ${deleted}`);
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run migration
migrateCategories();
