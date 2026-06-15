import { EditorView } from '@codemirror/view';

/**
 * Creates a CodeMirror 6 extension that listens for Ctrl+Click to trigger Go To Definition.
 * @param {Function} onGoToDefinition - Callback triggered when definition is requested.
 *                                      Passed (word, currentTabId).
 */
export function goToDefinition(onGoToDefinition) {
  return EditorView.domEventHandlers({
    mousedown(event, view) {
      if (!event.ctrlKey && !event.metaKey) return false;

      // Ensure left click
      if (event.button !== 0) return false;

      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
      if (pos === null) return false;

      const state = view.state;
      const word = state.wordAt(pos);
      
      if (!word) return false;

      const wordText = state.doc.sliceString(word.from, word.to);
      
      // Ignore very short words or purely numeric ones
      if (wordText.length < 2 || !isNaN(Number(wordText))) return false;

      event.preventDefault();

      // Trigger search and jump
      onGoToDefinition(wordText);

      return true;
    }
  });
}

/**
 * Regex-based search for definition across opened files.
 * @param {string} word - The word to search for.
 * @param {string} content - The file content.
 * @returns {{line: number, col: number} | null} - The line and column of the definition, if found.
 */
export function findDefinitionInContent(word, content) {
  // Escape special regex characters in word just in case
  const safeWord = word.replace(/[-\\/\\\\^$*+?.()|[\\]{}]/g, '\\\\$&');
  
  const patterns = [
    // JS/Python/Go/Rust: function/def/fn/func/class/struct foo
    new RegExp(`(?:function|func|fn|def|class|struct|interface|type|trait|enum|impl)\\s+${safeWord}\\b`),
    // JS: const/let/var foo =
    new RegExp(`(?:const|let|var)\\s+${safeWord}\\s*=`),
    // JS: foo: function or foo = function or foo = () =>
    new RegExp(`${safeWord}\\s*[:=]\\s*(?:function|\\(|\\w+\\s*=>)`),
    // C/C++/Java/TS methods/functions: Type foo(args) { ... }
    new RegExp(`\\b${safeWord}\\s*\\([^)]*\\)\\s*(?:const\\s*)?(?:->[^{]+)?(?::\\s*[^{]+)?\\{`),
    // Go/Rust methods: func (r Receiver) foo() { ... }
    new RegExp(`\\)\\s+${safeWord}\\s*\\(`),
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(content);
    if (match) {
      // Calculate line and col
      const index = match.index;
      const beforeMatch = content.substring(0, index);
      const lines = beforeMatch.split('\\n');
      return {
        line: lines.length, // 1-indexed
        col: lines[lines.length - 1].length + 1 // 1-indexed
      };
    }
  }

  return null;
}
