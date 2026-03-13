const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));

    try {
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 30000 });
        console.log('Page loaded successfully vs networkidle0.');
        const content = await page.content();
        console.log('Page HTML length:', content.length);
    } catch (e) {
        console.log('Error loading page:', e.message);
    }
    await browser.close();
})();
