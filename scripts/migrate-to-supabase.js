#!/usr/bin/env node
/**
 * Migrate places data from places.json to Supabase
 *
 * Usage:
 *   npm run migrate:supabase
 *
 * Requires:
 *   SUPABASE_URL - Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key for admin access
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('   SUPABASE_URL or VITE_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Initialize Supabase client with service role key (admin access)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function migrateData() {
  try {
    console.log('📍 Starting migration to Supabase...\n');

    // Read places data
    const placesPath = path.join(__dirname, '../data/places.json');
    const placesData = JSON.parse(fs.readFileSync(placesPath, 'utf-8'));

    console.log(`📦 Found ${placesData.length} places to migrate`);

    // Insert places
    const { data, error } = await supabase
      .from('places')
      .insert(
        placesData.map(place => ({
          id: place.id || undefined,
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
          price_level: place.price_level,
          opening_hours: place.opening_hours,
          phone: place.phone,
          tags: place.tags || [place.category],
          status: place.status || 'approved',
          created_by_id: place.created_by_id,
          created_at: place.created_at,
        }))
      );

    if (error) {
      console.error('❌ Migration failed:', error.message);
      process.exit(1);
    }

    console.log(`✅ Successfully migrated ${placesData.length} places to Supabase!`);
    console.log('\n📊 Migration summary:');
    console.log(`   Total places: ${placesData.length}`);
    console.log(`   Approved: ${placesData.filter(p => p.status === 'approved').length}`);
    console.log(`   Pending: ${placesData.filter(p => p.status === 'pending').length}`);

    // Show category breakdown
    const categories = {};
    placesData.forEach(place => {
      categories[place.category] = (categories[place.category] || 0) + 1;
    });
    console.log('\n📈 By category:');
    Object.entries(categories).forEach(([cat, count]) => {
      console.log(`   ${cat}: ${count}`);
    });

  } catch (error) {
    console.error('❌ Error during migration:', error);
    process.exit(1);
  }
}

// Run migration
migrateData();
