import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function fixAuth() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.createBrowserContext();
  const page = await context.newPage();

  try {
    console.log('🔐 Step 1: Getting Supabase ANON_KEY...');

    // Navigate to Supabase
    await page.goto('https://supabase.com/dashboard');

    // Wait for login or already logged in
    await page.waitForTimeout(2000);

    // Navigate to API settings
    await page.goto('https://supabase.com/dashboard/project/gsbbtrknnkdihdlojwbd/settings/api', {
      waitUntil: 'networkidle'
    });

    await page.waitForTimeout(3000);

    // Look for anon key
    const anonKeyElement = await page.$('text=anon');
    if (anonKeyElement) {
      console.log('✅ Found ANON key section');

      // Try to find the key value
      const keyValue = await page.textContent('[data-testid="api-key-anon"]')
        || await page.textContent('.copy-button');

      if (keyValue) {
        console.log('✅ ANON Key found');
      }
    }

    // Screenshot for manual inspection
    await page.screenshot({ path: 'supabase-api.png' });
    console.log('📸 Screenshot saved: supabase-api.png');
    console.log('👉 Look at the screenshot and COPY the "anon" key value');

    console.log('\n🔄 Step 2: Going to Cloudflare for rebuild...');
    await page.goto('https://dash.cloudflare.com');
    await page.waitForTimeout(3000);

    // Navigate to Pages
    await page.goto('https://dash.cloudflare.com/pages');
    await page.waitForTimeout(3000);

    // Look for app-base project
    const projectLink = await page.$('a:has-text("app-base")');
    if (projectLink) {
      console.log('✅ Found app-base project');
      await projectLink.click();
      await page.waitForTimeout(2000);
    }

    // Take screenshot of deployments
    await page.screenshot({ path: 'cloudflare-pages.png' });
    console.log('📸 Screenshot saved: cloudflare-pages.png');

    // Look for redeploy button
    const redeployBtn = await page.$('button:has-text("Redeploy")');
    if (redeployBtn) {
      console.log('✅ Found Redeploy button');
      await redeployBtn.click();
      console.log('🔄 Triggering rebuild...');
      await page.waitForTimeout(2000);
    }

    // Look for confirmation
    const confirmBtn = await page.$('button:has-text("Redeploy")')
      || await page.$('button:has-text("Confirm")');
    if (confirmBtn) {
      await confirmBtn.click();
      console.log('✅ Rebuild triggered!');
    }

    await page.screenshot({ path: 'cloudflare-rebuild.png' });
    console.log('📸 Screenshot saved: cloudflare-rebuild.png');

    console.log('\n⏳ Keeping browser open for 30 seconds...');
    console.log('🔍 Inspect the screenshots and dashboards');
    console.log('📋 Next: Copy the ANON_KEY from supabase-api.png and update .env');

    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

fixAuth().catch(console.error);
