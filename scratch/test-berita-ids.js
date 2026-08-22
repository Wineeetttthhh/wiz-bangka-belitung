async function testBeritaIds() {
    const ids = ['mt11blb1z2pdog', 'mt11ggm30p4qxc', 'news-beasiswa-anak-sekolah', 'news-pangan-beras-masyarakat'];
    for (const id of ids) {
        console.log('\n=== Testing /berita/' + id + ' ===');
        const res = await fetch('https://www.wizbangkabelitung.or.id/berita/' + id, {
            headers: { 'User-Agent': 'WhatsApp/2.21.12.21 N' }
        });
        console.log('Status:', res.status);
        const html = await res.text();
        const ogTitle = (html.match(/<meta property="og:title" content="([^"]*)"/i) || [])[1];
        const ogImg = (html.match(/<meta property="og:image" content="([^"]*)"/i) || [])[1];
        const ogType = (html.match(/<meta property="og:type" content="([^"]*)"/i) || [])[1];
        const twCard = (html.match(/<meta name="twitter:card" content="([^"]*)"/i) || [])[1];
        console.log('og:type:', ogType);
        console.log('twitter:card:', twCard);
        console.log('og:title:', ogTitle);
        console.log('og:image:', ogImg);
        if (ogImg) {
            const imgRes = await fetch(ogImg, { headers: { 'User-Agent': 'WhatsApp/2.21.12.21 N' } });
            const buf = await imgRes.arrayBuffer();
            console.log('Image status:', imgRes.status, 'Content-Type:', imgRes.headers.get('content-type'), 'Length:', buf.byteLength);
        }
    }
}
testBeritaIds().catch(console.error);
