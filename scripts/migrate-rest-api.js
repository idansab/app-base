#!/usr/bin/env node
/**
 * Migrate places data using Supabase REST API (no SDK needed)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://gsbbtrknnkdihdlojwbd.supabase.co';
const ANON_KEY = 'sb_publishable_G0UPR4Y5Jpw4TUCar37XrQ_kU2R6GjT';

async function migrateData() {
  try {
    console.log('📍 Starting migration via REST API...\n');

    // Read places data
    const placesPath = path.join(__dirname, '../data/places.json');
    const placesData = JSON.parse(fs.readFileSync(placesPath, 'utf-8'));

    console.log(`📦 Found ${placesData.length} places to migrate`);

    // Insert places one by one via REST API
    let successCount = 0;
    for (const place of placesData) {
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/places`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${ANON_KEY}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            id: place.id,
            name: place.name,
            description: place.description,
            short_description: place.short_description,
            category: place.category,
            city: place.city,
            address: place.address,
            lat: place.lat,
            lng: place.lng,
            image_url: place.image_url,
            rating: place.rating,
            price_level: place.price_level || 'moderate',
            opening_hours: place.opening_hours || '24/7',
            phone: place.phone,
            tags: place.tags || [place.category],
            status: place.status || 'approved',
            created_by_id: place.created_by_id || 'import-script',
          })
        });

        if (response.ok) {
          successCount++;
          if (successCount % 10 === 0) {
            console.log(`  ✅ ${successCount}/${placesData.length} places inserted`);
          }
        } else {
          const error = await response.text();
          console.error(`  ❌ Failed to insert ${place.name}: ${response.status} - ${error}`);
        }
      } catch (error) {
        console.error(`  ❌ Error inserting ${place.name}:`, error.message);
      }
    }

    console.log(`\n✅ Migration complete! ${successCount}/${placesData.length} places inserted`);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrateData();
