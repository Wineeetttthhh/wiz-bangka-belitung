async function verifyFullHtml() {
    console.log('=== FULL LIVE HTML VERIFICATION ===');
    const url = 'https://www.wizbangkabelitung.or.id/flyer/quote-1787310017947?ref=MITRA001';
    const res = await fetch(url, {
        headers: { 'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)' }
    });
    console.log('HTTP Status:', res.status);
    console.log('Content-Type:', res.headers.get('content-type'));
    const html = await res.text();

    const tags = [
        'og:type',
        'og:site_name',
        'og:locale',
        'og:title',
        'og:description',
        'og:image',
        'og:image:secure_url',
        'og:image:type',
        'og:image:width',
        'og:image:height',
        'og:image:alt',
        'og:url',
        'twitter:card',
        'twitter:site',
        'twitter:title',
        'twitter:description',
        'twitter:image'
    ];

    console.log('\n--- META TAGS FOUND IN SERVER-SIDE RENDERED HTML ---');
    for (const tag of tags) {
        const regex = new RegExp(`<meta property="${tag}" content="([^"]*)"`, 'i');
        const twitterRegex = new RegExp(`<meta name="${tag}" content="([^"]*)"`, 'i');
        const match = html.match(regex) || html.match(twitterRegex);
        console.log(`${tag.padEnd(22)} : ${match ? match[1] : '❌ NOT FOUND'}`);
    }

    console.log('\n--- VERIFYING DIRECT BINARY IMAGE ACCESS ---');
    const imgUrl = (html.match(/<meta property="og:image" content="([^"]*)"/i) || [])[1];
    if (imgUrl) {
        const t0 = Date.now();
        const imgRes = await fetch(imgUrl, {
            headers: { 'User-Agent': 'WhatsApp/2.21.12.21 N' }
        });
        const elapsed = Date.now() - t0;
        const buf = await imgRes.arrayBuffer();
        console.log('Image URL          :', imgUrl);
        console.log('Image HTTP Status  :', imgRes.status);
        console.log('Image Content-Type :', imgRes.headers.get('content-type'));
        console.log('Image Byte Length  :', buf.byteLength, 'bytes');
        console.log('Image Response Time:', elapsed, 'ms (< 2000ms threshold)');
        console.log('Access-Control     :', imgRes.headers.get('access-control-allow-origin'));
        console.log('Cache-Control      :', imgRes.headers.get('cache-control'));
    }

    console.log('\n--- VERIFYING /quote/:id ROUTE ---');
    const quoteUrl = 'https://www.wizbangkabelitung.or.id/quote/quote-1787310017947?ref=MITRA001';
    const qRes = await fetch(quoteUrl);
    console.log('HTTP Status:', qRes.status);
    const qHtml = await qRes.text();
    const qImg = (qHtml.match(/<meta property="og:image" content="([^"]*)"/i) || [])[1];
    const qUrl = (qHtml.match(/<meta property="og:url" content="([^"]*)"/i) || [])[1];
    console.log('og:image   :', qImg);
    console.log('og:url     :', qUrl);

    console.log('\n--- VERIFYING /program/:slug ROUTE ---');
    const progUrl = 'https://www.wizbangkabelitung.or.id/program/pembangunan-markaz?ref=MITRA001';
    const pRes = await fetch(progUrl);
    console.log('HTTP Status:', pRes.status);
    const pHtml = await pRes.text();
    const pImg = (pHtml.match(/<meta property="og:image" content="([^"]*)"/i) || [])[1];
    const pUrl = (pHtml.match(/<meta property="og:url" content="([^"]*)"/i) || [])[1];
    console.log('og:image   :', pImg);
    console.log('og:url     :', pUrl);
}

verifyFullHtml().catch(console.error);
