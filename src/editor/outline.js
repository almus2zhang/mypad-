/**
 * @module outline
 * Simple regex-based symbol extractor for MyPad++ sidebar.
 */

export function extractOutline(content, language) {
  const symbols = [];
  const lines = content.split('\n');
  const lang = (language || '').toLowerCase();

  // Very basic regex-based extraction
  for (let i = 0; i < lines.length; i++) {
    const lineStr = lines[i];
    const lineNum = i + 1;
    let match;

    if (lang.includes('javascript') || lang.includes('typescript')) {
      // function foo() or const foo = () =>
      if ((match = lineStr.match(/^(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s*\(/))) {
        symbols.push({ name: match[1], type: 'function', line: lineNum });
      } else if ((match = lineStr.match(/^(?:export\s+)?class\s+([a-zA-Z_$][0-9a-zA-Z_$]*)/))) {
        symbols.push({ name: match[1], type: 'class', line: lineNum });
      } else if ((match = lineStr.match(/(?:const|let|var)\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z_$][0-9a-zA-Z_$]*)\s*=>/))) {
        symbols.push({ name: match[1], type: 'function', line: lineNum });
      }
    } else if (lang.includes('python')) {
      if ((match = lineStr.match(/^\s*def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/))) {
        symbols.push({ name: match[1], type: 'function', line: lineNum });
      } else if ((match = lineStr.match(/^\s*class\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:\(|:)/))) {
        symbols.push({ name: match[1], type: 'class', line: lineNum });
      }
    } else if (lang.includes('c') || lang.includes('cpp')) {
      // Basic C/C++ function: Type name(args) {
      if ((match = lineStr.match(/^[a-zA-Z_][a-zA-Z0-9_:\s\*&]+\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*\{?/))) {
        // Exclude return, if, while, for etc.
        const name = match[1];
        if (!['if', 'while', 'for', 'switch', 'return', 'catch'].includes(name)) {
          symbols.push({ name, type: 'function', line: lineNum });
        }
      }
    } else if (lang.includes('java')) {
      if ((match = lineStr.match(/^\s*(?:public|private|protected|static|final|\s)*\s+[a-zA-Z_][a-zA-Z0-9_<>\s]*\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*\{?/))) {
        const name = match[1];
        if (!['if', 'while', 'for', 'switch', 'return', 'catch'].includes(name)) {
          symbols.push({ name, type: 'function', line: lineNum });
        }
      } else if ((match = lineStr.match(/^\s*(?:public|private|protected|static|final|\s)*\s*class\s+([a-zA-Z_][a-zA-Z0-9_]*)/))) {
        symbols.push({ name: match[1], type: 'class', line: lineNum });
      }
    }
  }

  return symbols;
}
