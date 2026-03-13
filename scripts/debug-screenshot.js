const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1280, height: 800 } });
    const page = await browser.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));

    try {
        const url = 'http://localhost:3000/ar';
        console.log(`Navigating to ${url}`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

        // Give react 2 more seconds
        await new Promise(r => setTimeout(r, 2000));

        const screenshotPath = path.join(__dirname, 'debug-screenshot.png');
        await page.screenshot({ path: screenshotPath, fullPage: true });

        console.log(`Screenshot saved to ${screenshotPath}`);

        const title = await page.title();
        console.log(`Page title is: ${title}`);
    } catch (e) {
        console.log('Error loading page:', e.message);
    }
    await browser.close();
})();
