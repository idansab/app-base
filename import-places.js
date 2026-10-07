/**
 * Import script: Convert data.js format to Express API format
 * Reads from mah-sheyesh-pah/public/js/data.js
 * Writes to base-ma-app/data/places.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read data.js - it's a module file, so we need to extract the array
const dataJsPath = path.join(__dirname, '..', 'mah-sheyesh-pah', 'public', 'js', 'data.js');
const dataJsContent = fs.readFileSync(dataJsPath, 'utf-8');

// Extract the PLACES array from the file
const match = dataJsContent.match(/const PLACES = \[([\s\S]*?)\];/);
if (!match) {
  console.error('❌ Could not find PLACES array in data.js');
  process.exit(1);
}

// Evaluate the array
const PLACES = eval('[' + match[1] + ']');

console.log(`📦 Found ${PLACES.length} places in data.js`);

// Convert to Express API format (simplified for compatibility)
const convertedPlaces = PLACES.map((place, index) => ({
  id: String(place.id || index),
  name: place.name,
  category: place.category,
  city: place.region || place.location?.address?.split(',')[0] || 'Unknown',
  address: place.address || place.location?.address || '',
  lat: place.lat || place.location?.lat || 0,
  lng: place.lng || place.location?.lng || 0,
  description: place.description?.full || place.description || '',
  short_description: place.description?.short || place.name,
  image_url: place.image || 'https://picsum.photos/seed/' + place.id + '/400/300',
  rating: place.rating || 4.5,
  price_level: place.cost?.level || 'medium',
  opening_hours: place.hours?.note || '24/7',
  phone: place.phone || '',
  status: 'approved', // All imported places are approved
  tags: place.tags || [place.category],
  amenities: place.amenities || {},
  suitableFor: place.suitableFor || {},
  created_at: new Date().toISOString(),
  created_by_id: 'import-script',
  updatedAt: place.updatedAt || new Date().toISOString()
}));

// Save to database
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const placesPath = path.join(dataDir, 'places.json');
fs.writeFileSync(placesPath, JSON.stringify(convertedPlaces, null, 2));

console.log(`✅ Imported ${convertedPlaces.length} places to data/places.json`);
console.log(`📍 Sample places:`);
console.log(`   - ${convertedPlaces[0].name} (${convertedPlaces[0].category})`);
console.log(`   - ${convertedPlaces[Math.floor(convertedPlaces.length / 2)].name}`);
console.log(`   - ${convertedPlaces[convertedPlaces.length - 1].name}`);
