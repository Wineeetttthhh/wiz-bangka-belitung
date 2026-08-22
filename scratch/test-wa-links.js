// Test WhatsApp link text formatting across modules
function testWhatsAppLink(title, desc, url) {
  const caption = `*${title}*\n\n${desc}\n\n${url}`;
  const encoded = encodeURIComponent(caption);
  const waUrl = 'https://api.whatsapp.com/send?text=' + encoded;
  
  // Verification checks:
  const parts = caption.split('\n\n');
  const lastPart = parts[parts.length - 1].trim();
  const isUrlAtBottom = lastPart.startsWith('https://www.wizbangkabelitung.or.id');
  const hasDoubleNewline = caption.includes('\n\n');
  const noTrailingChars = lastPart === url.trim();
  
  return {
    isUrlAtBottom,
    hasDoubleNewline,
    noTrailingChars,
    captionLength: caption.length,
    waUrl
  };
}

console.log('Quote/Flyer Share Test:', testWhatsAppLink(
  'HR. Muslim no. 2588',
  '"Sedekah itu tidak akan mengurangi harta..."',
  'https://www.wizbangkabelitung.or.id/flyer/quote-1?ref=MITRA01'
));

console.log('News Share Test:', testWhatsAppLink(
  'Penyaluran Beras Santri Tahfidz',
  'WIZ Bangka Belitung menyalurkan bantuan beras...',
  'https://www.wizbangkabelitung.or.id/berita/1?ref=MITRA01'
));

console.log('Program Share Test:', testWhatsAppLink(
  'Santunan Anak Yatim',
  'Mari bersama menyalurkan kepedulian untuk anak yatim...',
  'https://www.wizbangkabelitung.or.id/program/santunan-anak-yatim?ref=MITRA01'
));
