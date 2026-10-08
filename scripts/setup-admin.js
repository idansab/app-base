#!/usr/bin/env node

/**
 * Setup script to create admin user in Supabase
 * Usage: node scripts/setup-admin.js
 */

const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function setupAdmin() {
  try {
    // Get Supabase credentials from environment
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      console.error('❌ Missing Supabase credentials in .env');
      console.error('Set VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_KEY');
      process.exit(1);
    }

    // Create admin client with service role key
    const admin = createClient(supabaseUrl, supabaseServiceKey);

    console.log('\n🔐 Admin User Setup\n');

    // Get admin email
    const email = await question('Admin email: ');
    if (!email.includes('@')) {
      console.error('❌ Invalid email');
      process.exit(1);
    }

    // Get admin password
    const password = await question('Admin password (min 6 chars): ');
    if (password.length < 6) {
      console.error('❌ Password must be at least 6 characters');
      process.exit(1);
    }

    rl.close();

    console.log('\n⏳ Creating admin user...\n');

    // Create user
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      console.error('❌ Failed to create user:', authError.message);
      process.exit(1);
    }

    console.log('✅ User created:', authData.user.id);

    // Update profile to admin
    const { data: profileData, error: profileError } = await admin
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', authData.user.id)
      .select();

    if (profileError) {
      console.error('❌ Failed to update profile:', profileError.message);
      process.exit(1);
    }

    console.log('✅ Profile updated to admin role\n');

    console.log('🎉 Admin user created successfully!\n');
    console.log('Login with:');
    console.log(`  Email: ${email}`);
    console.log(`  Password: ${password}\n`);
    console.log('Navigate to: http://localhost:5173/admin-login\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setupAdmin();
