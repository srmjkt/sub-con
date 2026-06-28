const fs = require('fs');
let f = 'c:\sub-con\components\AdminDataPage.tsx';
let c = fs.readFileSync(f, 'utf8');
let bad = "const isFromEditFields = editFields.some(ef => ef.key.toLowerCase().replace(/" + String.fromCharCode(92) + "s+/g, '')) === normalizedKey)";
let good = "const isFromEditFields = editFields.some(ef => ef.key.toLowerCase().replace(/" + String.fromCharCode(92) + "s+/g, '')) === normalizedKey)";
c = c.replace(bad, good);
fs.writeFileSync(f, c);
