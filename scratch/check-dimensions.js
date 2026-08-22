const http = require('https');

async function checkDimensions() {
    const res = await fetch('https://www.wizbangkabelitung.or.id/berita-image/mt11blb1z2pdog.jpg');
    const buf = Buffer.from(await res.arrayBuffer());
    console.log('mt11blb1z2pdog.jpg byte length:', buf.length);

    // Parse JPEG header for width and height
    let offset = 2;
    while (offset < buf.length) {
        if (buf[offset] !== 0xFF) break;
        const marker = buf[offset + 1];
        if (marker === 0xC0 || marker === 0xC2) { // SOF0 or SOF2
            const height = buf.readUInt16BE(offset + 5);
            const width = buf.readUInt16BE(offset + 7);
            console.log(`mt11blb1z2pdog.jpg physical dimensions: ${width}x${height}`);
            break;
        }
        const blockLength = buf.readUInt16BE(offset + 2);
        offset += 2 + blockLength;
    }

    const res2 = await fetch('https://www.wizbangkabelitung.or.id/berita-image/mt11ggm30p4qxc.jpg');
    const buf2 = Buffer.from(await res2.arrayBuffer());
    console.log('mt11ggm30p4qxc.jpg byte length:', buf2.length);

    let offset2 = 2;
    while (offset2 < buf2.length) {
        if (buf2[offset2] !== 0xFF) break;
        const marker = buf2[offset2 + 1];
        if (marker === 0xC0 || marker === 0xC2) {
            const height = buf2.readUInt16BE(offset2 + 5);
            const width = buf2.readUInt16BE(offset2 + 7);
            console.log(`mt11ggm30p4qxc.jpg physical dimensions: ${width}x${height}`);
            break;
        }
        const blockLength = buf2.readUInt16BE(offset2 + 2);
        offset2 += 2 + blockLength;
    }
}

checkDimensions().catch(console.error);
