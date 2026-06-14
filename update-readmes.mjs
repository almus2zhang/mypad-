import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ICONS } from './src/ui/toolbar.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let readmeEn = fs.readFileSync(path.join(__dirname, 'README.md'), 'utf-8');
let readmeZh = fs.readFileSync(path.join(__dirname, 'README_zh.md'), 'utf-8');

for (const [key, svg] of Object.entries(ICONS)) {
  // Use regex to replace the SVG string, escaping necessary regex characters
  // Because the string might have minor variations in quotes, it's safer to just split and join if exact match, or use a simpler replace strategy.
  // Actually, we inserted the exact SVG string verbatim!
  
  const imgTag = `<img src="docs/icons/${key}.svg" width="18" height="18" alt="${key}">`;
  
  // We need to replace it. We can do exact string replace since we pasted it exactly.
  readmeEn = readmeEn.split(svg).join(imgTag);
  readmeZh = readmeZh.split(svg).join(imgTag);
}

fs.writeFileSync(path.join(__dirname, 'README.md'), readmeEn);
fs.writeFileSync(path.join(__dirname, 'README_zh.md'), readmeZh);
console.log('READMEs updated with image tags.');
