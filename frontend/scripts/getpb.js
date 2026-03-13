const https = require('https');

function getMap(url) {
    https.get(url, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
            // Find window.APP_INITIALIZATION_STATE which holds the PB string in the source
            // Or just regex for pb=... inside the page content
            let match = data.match(/https:\/\/www\.google\.com\/maps\/embed\?pb=([^"\\]+)/);
            if (match) console.log(url, '\n', match[0]);
            else {
                // let's look for the CID or the array holding pb data
                // Usually it's deep in a script tag.
                let pbMatch = data.match(/!1s([^!]+)!2s([^!]+)/);
                if (pbMatch) {
                    console.log(url, '\n', 'Extracted parts:', pbMatch[1], pbMatch[2]);
                } else {
                    console.log(url, 'No PB found.');
                }
            }
        });
    }).on('error', console.error);
}

getMap('https://www.google.com/maps/place/Mariot+Kitchen+Equip/@24.502697,54.374451,15z/data=!4m6!3m5!1s0x3e5e66f6711522f7:0xba8c40636e4d1dc1!8m2!3d24.5026967!4d54.3744507!16s%2Fg%2F11b77st8gf');
getMap('https://www.google.com/maps/place/%D9%85%D8%A7%D8%B1%D9%8A%D9%88%D8%AA+%D9%84%D9%85%D8%B9%D8%AF%D8%A7%D8%AA+%D8%A7%D9%84%D9%85%D8%B7%D8%A7%D8%A8%D8%AE+%7C+Mariot+Kitchen+Equipment%E2%80%AD/@25.31719,55.382244,14z/data=!4m6!3m5!1s0x3e5f5b111a48b363:0xf594b5fad15d22af!8m2!3d25.3168016!4d55.3824161!16s%2Fg%2F11rq21r8r7');
getMap('https://www.google.com/maps/place/%D9%85%D8%A7%D8%B1%D9%8A%D9%88%D8%AA+%D9%84%D9%85%D8%B9%D8%AF%D8%A7%D8%AA+%D8%A7%D9%84%D9%85%D8%B7%D8%A7%D8%A8%D8%AE+%D8%A7%D9%84%D8%B4%D8%A7%D8%B1%D9%82%D8%A9+%7C+Mariot+Kitchen+Equipment%E2%80%AD/@25.292768,55.429508,15z/data=!4m6!3m5!1s0x3e5f5f1068f8c01d:0xfa273e3af48feb67!8m2!3d25.2927685!4d55.4295081!16s%2Fg%2F11fnyzw9vj');

