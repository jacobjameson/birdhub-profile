/**
 * Fetch eBird Life List
 * 
 * This script uses Playwright to log into eBird, download your life list CSV,
 * and convert it to data.json for the Big Year visualization.
 * 
 * Required environment variables:
 *   EBIRD_USERNAME - Your eBird username/email
 *   EBIRD_PASSWORD - Your eBird password
 * 
 * Run manually: EBIRD_USERNAME=you@email.com EBIRD_PASSWORD=xxx node scripts/fetch-ebird.js
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const EBIRD_USERNAME = process.env.EBIRD_USERNAME;
const EBIRD_PASSWORD = process.env.EBIRD_PASSWORD;

if (!EBIRD_USERNAME || !EBIRD_PASSWORD) {
  console.error('❌ Missing EBIRD_USERNAME or EBIRD_PASSWORD environment variables');
  console.error('   Set these as GitHub Secrets or export them locally');
  process.exit(1);
}

/**
 * Parse eBird date format "14 Dec 2025" to "2025-12-14"
 */
function parseEbirdDate(dateStr) {
  const months = {
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
    'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
    'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
  };
  
  const parts = dateStr.trim().split(' ');
  if (parts.length !== 3) return null;
  
  const day = parts[0].padStart(2, '0');
  const month = months[parts[1]];
  const year = parts[2];
  
  if (!month) return null;
  return `${year}-${month}-${day}`;
}

/**
 * Parse CSV content into observations array
 */
function parseCSV(csvContent) {
  const lines = csvContent.split('\n');
  const observations = [];
  
  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse CSV with proper quote handling
    const columns = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        columns.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    columns.push(current.trim());
    
    // Extract fields: Common Name (3), Scientific Name (4), Location (6), S/P (7), Date (8)
    if (columns.length >= 9) {
      const date = parseEbirdDate(columns[8]);
      if (date) {
        observations.push({
          date: date,
          sciName: columns[4],
          common: columns[3],
          location: columns[6].replace(/"/g, ''),
          region: columns[7]
        });
      }
    }
  }
  
  return observations.sort((a, b) => new Date(a.date) - new Date(b.date));
}

async function fetchEbirdLifeList() {
  console.log('🐦 Starting eBird life list fetch...\n');
  
  const browser = await chromium.launch({ 
    headless: true 
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  const page = await context.newPage();
  
  try {
    // Step 1: Go to eBird login
    console.log('📡 Navigating to eBird...');
    await page.goto('https://secure.birds.cornell.edu/cassso/login?service=https://ebird.org/login/cas?portal=ebird', {
      waitUntil: 'networkidle'
    });
    
    // Step 2: Fill in credentials
    console.log('🔐 Logging in...');
    await page.fill('input[name="username"]', EBIRD_USERNAME);
    await page.fill('input[name="password"]', EBIRD_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Wait for login to complete
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 });
    
    // Check if login was successful
    const currentUrl = page.url();
    if (currentUrl.includes('login') || currentUrl.includes('cassso')) {
      throw new Error('Login failed - check your credentials');
    }
    
    console.log('✅ Login successful!\n');
    
    // Step 3: Navigate to life list CSV download
    console.log('📥 Downloading life list...');
    
    // Set up download handling
    const downloadPromise = page.waitForEvent('download');
    
    // Navigate to CSV export URL
    await page.goto('https://ebird.org/lifelist?r=world&time=life&fmt=csv', {
      waitUntil: 'networkidle'
    });
    
    // Wait for download
    const download = await downloadPromise;
    
    // Save to temp file
    const tempPath = path.join(__dirname, '..', 'temp_lifelist.csv');
    await download.saveAs(tempPath);
    
    console.log('✅ Download complete!\n');
    
    // Step 4: Parse CSV
    console.log('🔄 Parsing CSV...');
    const csvContent = fs.readFileSync(tempPath, 'utf-8');
    const observations = parseCSV(csvContent);
    
    // Clean up temp file
    fs.unlinkSync(tempPath);
    
    console.log(`✅ Parsed ${observations.length} species\n`);
    
    // Step 5: Save as data.json
    const dataJson = {
      profile: {
        lastSync: new Date().toISOString()
      },
      observations: observations,
      exportedAt: new Date().toISOString()
    };
    
    const outputPath = path.join(__dirname, '..', 'data.json');
    fs.writeFileSync(outputPath, JSON.stringify(dataJson, null, 2));
    
    console.log(`✨ Saved to data.json`);
    console.log(`   Species: ${observations.length}`);
    if (observations.length > 0) {
      console.log(`   Latest: ${observations[observations.length - 1].common} (${observations[observations.length - 1].date})`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    // Take screenshot for debugging
    const screenshotPath = path.join(__dirname, '..', 'error-screenshot.png');
    await page.screenshot({ path: screenshotPath });
    console.error(`   Screenshot saved to ${screenshotPath}`);
    
    process.exit(1);
  } finally {
    await browser.close();
  }
}

fetchEbirdLifeList();
