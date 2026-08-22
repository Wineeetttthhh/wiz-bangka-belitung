async function testLive() {
    console.log('--- Checking Live Berita ---');
    const r1 = await fetch('https://www.wizbangkabelitung.or.id/berita/mt11ggm30p4qxc');
    console.log('Berita status:', r1.status);
    const text1 = await r1.text();
    const ogImg1 = (text1.match(/<meta property="og:image" content="([^"]+)"/) || [])[1];
    console.log('Berita og:image:', ogImg1);
    if (ogImg1) {
        const rImg1 = await fetch(ogImg1);
        console.log('Berita Image status:', rImg1.status, 'content-type:', rImg1.headers.get('content-type'), 'size:', (await rImg1.arrayBuffer()).byteLength);
    }

    console.log('\n--- Checking Live Flyer/Quote ---');
    const r2 = await fetch('https://www.wizbangkabelitung.or.id/flyer/quote-1787310017947');
    console.log('Flyer status:', r2.status);
    const text2 = await r2.text();
    const ogImg2 = (text2.match(/<meta property="og:image" content="([^"]+)"/) || [])[1];
    console.log('Flyer og:image:', ogImg2);
    if (ogImg2) {
        const rImg2 = await fetch(ogImg2);
        console.log('Flyer Image status:', rImg2.status, 'content-type:', rImg2.headers.get('content-type'));
    }

    console.log('\n--- Checking Direct API /api/quote?id=quote-1787310017947&img=1 ---');
    const r3 = await fetch('https://www.wizbangkabelitung.or.id/api/quote?id=quote-1787310017947&img=1');
    console.log('API img=1 status:', r3.status, 'content-type:', r3.headers.get('content-type'), 'size:', (await r3.arrayBuffer()).byteLength);
}

testLive();
