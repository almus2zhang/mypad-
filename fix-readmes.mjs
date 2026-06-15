import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tableData = [
  // Toolbar
  { icon: 'newFile', name: 'New File' },
  { icon: 'open', name: 'Open' },
  { icon: 'save', name: 'Save' },
  { icon: 'saveAs', name: 'Save As' },
  { icon: 'undo', name: 'Undo' },
  { icon: 'redo', name: 'Redo' },
  { icon: 'wordWrap', name: 'Word Wrap' },
  { icon: 'statusBar', name: 'Status Bar' },
  { icon: 'keyboardOff', name: 'Virtual Keyboard' },
  { icon: 'fullscreen', name: 'Fullscreen' },
  { icon: 'zoomIn', name: 'Zoom In/Out', combined: ['zoomIn', 'zoomOut'] },
  { icon: 'themeLight', name: 'Theme', combined: ['themeLight', 'themeDark'] },
  
  // Advanced
  { icon: 'explorer', name: 'File Explorer' },
  { icon: 'find', name: 'Find' },
  { icon: 'replace', name: 'Replace' },
  { icon: 'nextError', name: 'Next Error' },
  { icon: 'compare', name: 'Compare Mode' },
  { icon: 'webdav', name: 'WebDAV' },
  { icon: 'workspace', name: 'Server Workspace' },
  { icon: 'highlights', name: 'Highlights' },
];

function replaceInFile(filename) {
  let content = fs.readFileSync(path.join(__dirname, filename), 'utf-8');
  
  // We just replace every <svg ...</svg> line by line in the markdown file.
  // Actually, we can use regex to replace all <svg ...</svg> 
  
  const regex = /<svg[\s\S]*?<\/svg>/g;
  
  // We need to map the matched svg string to the right icon name.
  // The easiest way is to re-build the table text entirely. But doing it blindly via regex is hard.
  // Instead, since I know the exact content that I put via replace_file_content earlier,
  // I will just read the file, line by line, and if it matches an SVG, I'll replace it with the img tag.
  // But wait, there's multiple SVGs on the zoom/theme lines!
}

replaceInFile('README.md');
