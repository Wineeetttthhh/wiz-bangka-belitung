// Verification test for pure URL payload across all WhatsApp share functions

function checkWaPayload(rawUrl) {
  const encoded = encodeURIComponent(rawUrl);
  const fullWaUrl = 'https://api.whatsapp.com/send?text=' + encoded;
  const decodedText = decodeURIComponent(encoded);
  
  const isPureUrl = decodedText === rawUrl && !decodedText.includes('\n') && !decodedText.includes('*');
  const hasHttps = decodedText.startsWith('https://');
  const hasRefParam = decodedText.includes('ref=');
  
  return {
    rawUrl,
    isPureUrl,
    hasHttps,
    hasRefParam,
    fullWaUrl
  };
}

console.log('1. Program Share:', checkWaPayload('https://www.wizbangkabelitung.or.id/program/santunan-yatim?ref=MITRA01'));
console.log('2. News Share:', checkWaPayload('https://www.wizbangkabelitung.or.id/berita/penyaluran-beras-dhuafa?ref=MITRA01'));
console.log('3. Quote/Flyer Share:', checkWaPayload('https://www.wizbangkabelitung.or.id/flyer/quote-1?ref=MITRA01'));
console.log('4. Program Catalog Share:', checkWaPayload('https://www.wizbangkabelitung.or.id/program.html?ref=MITRA01'));
