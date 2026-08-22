const fs = require('fs');
const content = fs.readFileSync('admin.html', 'utf8');
const matches = content.match(/id="section-[^"]+"/g) || [];
console.log('Sections in admin.html:', matches);
