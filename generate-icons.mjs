import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ICONS } from './src/ui/toolbar.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dir = path.join(__dirname, 'docs', 'icons');

if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

for (const ObjectEntry of Object.entries(ICONS)) {
  const key = ObjectEntry[0];
  const svg = ObjectEntry[1];
  // GitHub renders markdown in a sandbox. The easiest way to have SVGs show up is to save them as actual .svg files.
  // currentColor inside an <img> tag will default to black, which is invisible on dark mode.
  // We will generate two versions of each icon, one for light mode (dark grey) and one for dark mode (light grey), or just use a neutral color like #888.
  // Let's replace 'currentColor' with '#888' which is a nice neutral grey visible on both themes.
  let modifiedSvg = svg.replace(/currentColor/g, '#8b949e'); // #8b949e is GitHub's neutral icon color
  
  // GitHub requires the xmlns attribute for SVGs to render in Markdown
  if (!modifiedSvg.includes('xmlns=')) {
    modifiedSvg = modifiedSvg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
  }
  
  fs.writeFileSync(path.join(dir, key + '.svg'), modifiedSvg);
}
console.log('Icons generated successfully.');
