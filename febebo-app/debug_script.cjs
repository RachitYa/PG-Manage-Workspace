const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log(`PAGE LOG: ${msg.type()} - ${msg.text()}`);
  });
  
  page.on('pageerror', error => {
    console.log(`PAGE ERROR: ${error.message}`);
  });

  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
    console.log("Page loaded successfully.");
    const html = await page.evaluate(() => document.body.innerHTML);
    console.log("BODY HTML LENGTH:", html.length);
    console.log("BODY HTML:", html.substring(0, 500));
  } catch (err) {
    console.error("Failed to load page:", err);
  }
  
  await browser.close();
})();
