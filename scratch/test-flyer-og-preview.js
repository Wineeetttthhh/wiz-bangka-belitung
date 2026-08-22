const handler = require('../api/quote.js');

async function testQuoteOgPreview() {
    console.log('=== TEST 1: SSR Open Graph Meta Tags for quote-1787310017947 ===');

    let htmlOutput = '';
    let statusCode = 0;
    const headers = {};

    const mockReq = {
        url: '/api/quote?id=quote-1787310017947&ref=MITRA001',
        headers: { host: 'www.wizbangkabelitung.or.id' }
    };

    const mockRes = {
        setHeader: (k, v) => { headers[k] = v; },
        status: (code) => {
            statusCode = code;
            return {
                send: (body) => { htmlOutput = body; },
                end: (buf) => { htmlOutput = buf; }
            };
        }
    };

    await handler(mockReq, mockRes);

    console.log('Status code:', statusCode);
    console.log('Content-Type:', headers['Content-Type']);

    const ogTitle = (htmlOutput.match(/<meta property="og:title" content="([^"]+)"/) || [])[1];
    const ogDesc = (htmlOutput.match(/<meta property="og:description" content="([^"]+)"/) || [])[1];
    const ogImg = (htmlOutput.match(/<meta property="og:image" content="([^"]+)"/) || [])[1];
    const ogImgSecure = (htmlOutput.match(/<meta property="og:image:secure_url" content="([^"]+)"/) || [])[1];
    const ogImgType = (htmlOutput.match(/<meta property="og:image:type" content="([^"]+)"/) || [])[1];
    const ogWidth = (htmlOutput.match(/<meta property="og:image:width" content="([^"]+)"/) || [])[1];
    const ogHeight = (htmlOutput.match(/<meta property="og:image:height" content="([^"]+)"/) || [])[1];
    const ogUrl = (htmlOutput.match(/<meta property="og:url" content="([^"]+)"/) || [])[1];

    console.log('og:title:', ogTitle);
    console.log('og:description:', ogDesc);
    console.log('og:image:', ogImg);
    console.log('og:image:secure_url:', ogImgSecure);
    console.log('og:image:type:', ogImgType);
    console.log('og:image:width:', ogWidth);
    console.log('og:image:height:', ogHeight);
    console.log('og:url:', ogUrl);

    const isOgValid = ogTitle && ogDesc && ogImg && ogImg.startsWith('https://') && ogImgSecure && ogImgType && ogWidth === '1200' && ogHeight === '630' && ogUrl;
    console.log('✅ Open Graph Tags Valid:', isOgValid);

    console.log('\n=== TEST 2: Direct Binary Image Endpoint (?img=1) ===');
    let imgBuffer = null;
    let imgStatusCode = 0;
    const imgHeaders = {};

    const mockImgReq = {
        url: '/api/quote?id=quote-1787310017947&img=1',
        headers: { host: 'www.wizbangkabelitung.or.id' }
    };

    const mockImgRes = {
        setHeader: (k, v) => { imgHeaders[k] = v; },
        status: (code) => {
            imgStatusCode = code;
            return {
                end: (buf) => { imgBuffer = buf; }
            };
        },
        writeHead: (code, hdrs) => {
            imgStatusCode = code;
            Object.assign(imgHeaders, hdrs);
        },
        end: () => {}
    };

    await handler(mockImgReq, mockImgRes);

    console.log('Image status code:', imgStatusCode);
    console.log('Image Content-Type:', imgHeaders['Content-Type']);
    console.log('Image Buffer length:', imgBuffer ? imgBuffer.length : '0', 'bytes');

    const isImgValid = imgStatusCode === 200 && imgHeaders['Content-Type'] && imgBuffer && imgBuffer.length > 1000;
    console.log('✅ Image binary served successfully:', isImgValid);

    if (isOgValid && isImgValid) {
        console.log('\n🎉 ALL FLYER / QUOTE OPEN GRAPH & BINARY IMAGE SERVING TESTS PASSED!');
    } else {
        console.error('\n❌ SOME FLYER TESTS FAILED!');
        process.exit(1);
    }
}

testQuoteOgPreview().catch(e => {
    console.error('Test error:', e);
    process.exit(1);
});
