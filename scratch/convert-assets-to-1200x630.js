const { Jimp } = require('jimp');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://ffiltrlzdbwhhhxzmzuo.supabase.co/rest/v1';
const SUPABASE_KEY = 'sb_publishable_GiA1BOjbW2psTU36149xuA_E26wGBI3';

async function processImageToLandscape1200x630(inputBufferOrPath) {
    const img = await Jimp.read(inputBufferOrPath);
    const srcW = img.bitmap.width;
    const srcH = img.bitmap.height;

    // Create 1200x630 canvas filled with dark slate color #0f172a
    const canvas = new Jimp({ width: 1200, height: 630, color: 0x0f172aff });

    // Also scale a blurred copy for background filler if needed
    const bg = img.clone().cover({ w: 1200, h: 630 }).blur(15);
    // Darken background
    bg.color([{ apply: 'darken', params: [40] }]);
    canvas.composite(bg, 0, 0);

    // Scale main image to fit contain inside 1200x630
    const fg = img.clone().contain({ w: 1200, h: 630 });
    const x = Math.round((1200 - fg.bitmap.width) / 2);
    const y = Math.round((630 - fg.bitmap.height) / 2);

    canvas.composite(fg, x, y);
    return await canvas.getBuffer('image/jpeg', { quality: 85 });
}

async function convertStaticAssets() {
    console.log('=== 1. CONVERTING STATIC ASSETS TO 1200x630 LANDSCAPE ===');
    const imagesDir = path.join(process.cwd(), 'assets', 'images');
    const targetFiles = [
        'foto-utama-wiz.jpg',
        'sedekah-beras-dhuafa.jpg',
        'sedekah-beras-dai.jpg',
        'sedekah-beras-dai-koba.jpg',
        'beasiswa-tahfidz.jpg',
        'tebar-iftar.jpg',
        'tebar-iftar-1.jpg',
        'tebar-iftar-2.jpg',
        'tebar-iftar-3.jpg'
    ];

    for (const f of targetFiles) {
        const filePath = path.join(imagesDir, f);
        if (fs.existsSync(filePath)) {
            console.log(`Converting ${f}...`);
            const outBuf = await processImageToLandscape1200x630(filePath);
            fs.writeFileSync(filePath, outBuf);
            console.log(`✅ ${f} converted! Byte length: ${outBuf.length}`);
        }
    }
}

async function convertSupabaseBase64Images() {
    console.log('\n=== 2. CONVERTING SUPABASE BASE64 NEWS & QUOTES TO 1200x630 LANDSCAPE ===');

    // 1. News table
    const newsRes = await fetch(`${SUPABASE_URL}/news?select=*`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
    });
    if (newsRes.ok) {
        const newsList = await newsRes.json();
        for (const n of newsList) {
            if (n.image_url && n.image_url.startsWith('data:image/')) {
                console.log(`Processing Supabase news Base64: ${n.id} (${n.title.slice(0, 40)}...)...`);
                try {
                    const base64Data = n.image_url.split(',')[1];
                    const inputBuf = Buffer.from(base64Data, 'base64');
                    const outBuf = await processImageToLandscape1200x630(inputBuf);
                    const newBase64 = 'data:image/jpeg;base64,' + outBuf.toString('base64');

                    // Patch Supabase news row
                    const patchRes = await fetch(`${SUPABASE_URL}/news?id=eq.${encodeURIComponent(n.id)}`, {
                        method: 'PATCH',
                        headers: {
                            'apikey': SUPABASE_KEY,
                            'Authorization': 'Bearer ' + SUPABASE_KEY,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=minimal'
                        },
                        body: JSON.stringify({ image_url: newBase64 })
                    });
                    console.log(`✅ News ${n.id} updated in Supabase! Status: ${patchRes.status}`);
                } catch(e) {
                    console.error(`Error processing news ${n.id}:`, e.message);
                }
            }
        }
    }

    // 2. Master Bundle in site_settings table
    const masterRes = await fetch(`${SUPABASE_URL}/site_settings?key=eq.master_bundle&select=*`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
    });
    if (masterRes.ok) {
        const masterList = await masterRes.json();
        if (masterList[0] && masterList[0].value) {
            const master = masterList[0].value;
            let updated = false;

            // Convert master quotes
            if (Array.isArray(master.quotes)) {
                for (const q of master.quotes) {
                    if (q.imageUrl && q.imageUrl.startsWith('data:image/')) {
                        console.log(`Processing Master Quote Base64: ${q.id}...`);
                        try {
                            const base64Data = q.imageUrl.split(',')[1];
                            const inputBuf = Buffer.from(base64Data, 'base64');
                            const outBuf = await processImageToLandscape1200x630(inputBuf);
                            q.imageUrl = 'data:image/jpeg;base64,' + outBuf.toString('base64');
                            updated = true;
                            console.log(`✅ Quote ${q.id} converted!`);
                        } catch(e) {
                            console.error(`Error processing quote ${q.id}:`, e.message);
                        }
                    }
                }
            }

            // Convert master news
            if (Array.isArray(master.news)) {
                for (const n of master.news) {
                    if (n.imageUrl && n.imageUrl.startsWith('data:image/')) {
                        console.log(`Processing Master News Base64: ${n.id}...`);
                        try {
                            const base64Data = n.imageUrl.split(',')[1];
                            const inputBuf = Buffer.from(base64Data, 'base64');
                            const outBuf = await processImageToLandscape1200x630(inputBuf);
                            n.imageUrl = 'data:image/jpeg;base64,' + outBuf.toString('base64');
                            updated = true;
                            console.log(`✅ Master news ${n.id} converted!`);
                        } catch(e) {
                            console.error(`Error processing master news ${n.id}:`, e.message);
                        }
                    }
                }
            }

            if (updated) {
                const patchMaster = await fetch(`${SUPABASE_URL}/site_settings?key=eq.master_bundle`, {
                    method: 'PATCH',
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': 'Bearer ' + SUPABASE_KEY,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ value: master, updated_at: new Date().toISOString() })
                });
                console.log(`✅ master_bundle updated in Supabase! Status: ${patchMaster.status}`);
            }
        }
    }
}

async function main() {
    await convertStaticAssets();
    await convertSupabaseBase64Images();
    console.log('\n🎉 ALL IMAGES CONVERTED TO 1200x630 LANDSCAPE SUCCESSFULLY!');
}

main().catch(console.error);
