const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));

    try {
        const url = 'http://localhost:3000/ar/profile';
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });

        await new Promise(r => setTimeout(r, 2000));
        const title = await page.title();
        console.log(`Page title is: ${title}`);
    } catch (e) {
        console.log('Error loading page:', e.message);
    }
    await browser.close(); c
})();
