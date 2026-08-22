const ogHandler = require('../api/og-image.js');
const beritaHandler = require('../api/berita.js');
const quoteHandler = require('../api/quote.js');
const programHandler = require('../api/program.js');

async function testOg(url) {
  let headers = {};
  let body = null;
  let status = 200;
  const req = { url, headers: { host: 'www.wizbangkabelitung.or.id' } };
  const res = {
    setHeader(k, v) { headers[k] = v; },
    status(c) { status = c; return this; },
    writeHead(c, h) { status = c; if (h) headers = {...headers, ...h}; return this; },
    end(b) { body = b; }
  };
  await ogHandler(req, res);
  const isJpeg = body && body[0] === 0xFF && body[1] === 0xD8 && body[2] === 0xFF;
  return {
    url,
    status,
    size: body ? body.length : 0,
    under300kb: body && body.length < 300000,
    isJpeg,
    mime: headers['Content-Type']
  };
}

async function testSsr(handler, url, label) {
  let headers = {};
  let html = '';
  let status = 200;
  const req = { url, headers: { host: 'www.wizbangkabelitung.or.id' }, query: {} };
  const res = {
    setHeader(k, v) { headers[k] = v; },
    status(c) { status = c; return this; },
    writeHead(c, h) { status = c; if (h) headers = {...headers, ...h}; return this; },
    send(h) { html = h; return this; },
    end(b) { html = b; }
  };
  await handler(req, res);
  
  const hasOgType = html.includes('og:type');
  const hasOgTitle = html.includes('og:title');
  const hasOgDesc = html.includes('og:description');
  const hasOgImg = html.includes('og:image') && html.includes('/api/og-image');
  const hasOgSecure = html.includes('og:image:secure_url');
  const hasOgMime = html.includes('og:image:type') && html.includes('image/jpeg');
  const hasOgW = html.includes('og:image:width') && html.includes('1200');
  const hasOgH = html.includes('og:image:height') && html.includes('630');
  const hasRefParam = url.includes('ref=') ? html.includes(url.split('ref=')[1]) : true;

  return {
    label,
    status,
    hasOgType,
    hasOgTitle,
    hasOgDesc,
    hasOgImg,
    hasOgSecure,
    hasOgMime,
    hasOgW,
    hasOgH,
    hasRefParam,
    htmlLen: html.length
  };
}

(async () => {
  console.log('=== 1. TESTING OG IMAGE PROXY ===');
  const ogResults = await Promise.all([
    testOg('/api/og-image?type=news&id=1'),
    testOg('/api/og-image?type=quote&id=quote-1'),
    testOg('/api/og-image?type=flyer&id=quote-2'),
    testOg('/api/og-image?type=program&id=santunan-yatim'),
    testOg('/api/og-image?type=program&id=pembangunan-markaz'),
    testOg('/api/og-image')
  ]);
  console.table(ogResults);

  console.log('\n=== 2. TESTING SSR HEAD OPEN GRAPH TAGS ===');
  const ssrResults = await Promise.all([
    testSsr(beritaHandler, '/berita/1?ref=MITRA88', 'Berita SSR'),
    testSsr(quoteHandler, '/flyer/quote-1?ref=MITRA88', 'Flyer SSR'),
    testSsr(programHandler, '/program/santunan-yatim?ref=MITRA88', 'Program SSR')
  ]);
  console.table(ssrResults);
})().catch(console.error);
