const fs = require('fs');
const path = require('path');

// Read the TTF font (adjust the path if needed)
const fontPath = path.join(__dirname, '../public/fonts/amiri-regular.ttf');

if (!fs.existsSync(fontPath)) {
  console.error('Font file not found at', fontPath);
  process.exit(1);
}

const fontData = fs.readFileSync(fontPath);
const base64Font = fontData.toString('base64');

// Write Base64 file inside lib/fonts/
const outputPath = path.join(__dirname, 'fonts', 'amiriRegularBase64.ts');

fs.writeFileSync(
  outputPath,
  `const amiriRegular = "${base64Font}";\nexport default amiriRegular;\n`
);

console.log('Base64 font file created at:', outputPath);
