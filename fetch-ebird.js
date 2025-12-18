/**
 * Fetch eBird Life List
 * 
 * Uses Playwright to log into eBird, download life list CSV,
 * and convert it to data.json for BirdHub visualization.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const EBIRD_USERNAME = process.env.EBIRD_USERNAME;
const EBIRD_PASSWORD = process.env.EBIRD_PASSWORD;

if (!EBIRD_USERNAME || !EBIRD_PASSWORD) {
  console.error('❌ Missing EBIRD_USERNAME or EBIRD_PASSWORD environment variables');
  process.exit(1);
}

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

function parseCSV(csvContent) {
  const lines = csvContent.split('\n');
  const observations = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
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
    
    // eBird CSV: Row #, Species Code, Taxonomic Order, Common Name, Scientific Name, Subspecies, Location, S/P, Date
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

// Preserve existing profile info from data.json
function getExistingProfile() {
  try {
    const dataPath = path.join(__dirname, 'data.json');
    const existing = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    return existing.profile || {};
  } catch (e) {
    return {};
  }
}

async function fetchEbirdLifeList() {
  console.log('🐦 Starting eBird life list fetch...\n');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  
  try {
    // Go directly to life list - it will redirect to login
    console.log('📡 Navigating to eBird life list...');
    await page.goto('https://ebird.org/lifelist?time=life&r=world', {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    // Check if we need to login
    const currentUrl = page.url();
    console.log('📍 Current URL:', currentUrl);
    
    if (currentUrl.includes('login') || currentUrl.includes('cassso')) {
      console.log('🔐 Login required, filling credentials...');
      
      // Wait for the login form - use the correct ID selectors
      await page.waitForSelector('#input-user-name', { timeout: 30000 });
      
      // Fill username
      await page.fill('#input-user-name', EBIRD_USERNAME);
      console.log('   ✓ Username filled');
      
      // Fill password
      await page.fill('#input-password', EBIRD_PASSWORD);
      console.log('   ✓ Password filled');
      
      // Click submit - it's an input[type="submit"] with id="form-submit"
      console.log('   Clicking sign in...');
      await page.click('#form-submit');
      
      // Wait for navigation after login
      console.log('   Waiting for login to complete...');
      await page.waitForURL(/ebird\.org\/(?!.*login)/, { timeout: 60000 });
      
      console.log('✅ Login successful!\n');
    }
    
    // Now navigate to CSV download
    console.log('📥 Downloading life list CSV...');
    
    // Set up download handling BEFORE triggering the download
    const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
    
    // Click the download link on the page (or navigate - but we need to not wait for load)
    // Use page.evaluate to trigger navigation without waiting
    page.evaluate(() => {
      window.location.href = 'https://ebird.org/lifelist?time=life&r=world&fmt=csv';
    });
    
    // Wait for download to start
    const download = await downloadPromise;
    
    // Save to temp file
    const tempPath = path.join(__dirname, 'temp_lifelist.csv');
    await download.saveAs(tempPath);
    
    console.log('✅ Download complete!\n');
    
    // Parse CSV
    console.log('🔄 Parsing CSV...');
    const csvContent = fs.readFileSync(tempPath, 'utf-8');
    const observations = parseCSV(csvContent);
    
    // Clean up temp file
    fs.unlinkSync(tempPath);
    
    console.log(`✅ Parsed ${observations.length} species\n`);
    
    // Preserve existing profile info
    const existingProfile = getExistingProfile();
    
    // Save as data.json
    const dataJson = {
      profile: {
        ...existingProfile,
        lastSync: new Date().toISOString()
      },
      observations: observations,
      exportedAt: new Date().toISOString()
    };
    
    const outputPath = path.join(__dirname, 'data.json');
    fs.writeFileSync(outputPath, JSON.stringify(dataJson, null, 2));
    
    console.log(`✨ Saved to data.json`);
    console.log(`   Species: ${observations.length}`);
    if (observations.length > 0) {
      console.log(`   Latest: ${observations[observations.length - 1].common} (${observations[observations.length - 1].date})`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    // Take screenshot for debugging
    const screenshotPath = path.join(__dirname, 'error-screenshot.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.error(`   Screenshot saved to ${screenshotPath}`);
    
    process.exit(1);
  } finally {
    await browser.close();
  }
}

fetchEbirdLifeList();
