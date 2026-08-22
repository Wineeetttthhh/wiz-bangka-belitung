async function verifyLive() {
  const urls = [
    'https://www.wizbangkabelitung.or.id/program/santunan-yatim?ref=MITRA01',
    'https://www.wizbangkabelitung.or.id/berita/1?ref=MITRA01',
    'https://www.wizbangkabelitung.or.id/flyer/quote-1?ref=MITRA01'
  ];
  for (const url of urls) {
    const res = await fetch(url, { headers: { 'User-Agent': 'WhatsApp/2.21.12.21 N' } });
    const html = await res.text();
    const ogImg = (html.match(/property="og:image"\s+content="([^"]+)"/) || [])[1];
    const ogTitle = (html.match(/property="og:title"\s+content="([^"]+)"/) || [])[1];
    const ogType = (html.match(/property="og:type"\s+content="([^"]+)"/) || [])[1];
    const ogMime = (html.match(/property="og:image:type"\s+content="([^"]+)"/) || [])[1];
    console.log(url, '=> status:', res.status, '\n  ogTitle:', ogTitle, '\n  ogImg:', ogImg, '\n  ogType:', ogType, '\n  ogMime:', ogMime);
  }
}

verifyLive().catch(console.error);
