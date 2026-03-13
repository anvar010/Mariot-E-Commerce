const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    try {
        const url = 'http://localhost:3000/ar';
        await page.goto(url, { waitUntil: 'networkidle2' });

        const rootError = await page.evaluate(() => {
            const el = document.getElementById('__next') || document.body;
            return el.innerText || el.textContent;
        });
        console.log('--- PAGE TEXT EXTRACT ---');
        console.log(rootError.substring(0, 1000));
        console.log('-------------------------');
    } catch (e) {
        console.log('Error loading page:', e.message);
    }
    await browser.close();
})();
