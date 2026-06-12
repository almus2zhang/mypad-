/**
 * SearchPanel — Custom search & replace panel
 * Uses CodeMirror 6's search API under the hood
 * @module search/search-panel
 */

import {
  SearchCursor,
} from '@codemirror/search';
import {
  EditorSelection,
} from '@codemirror/state';
import {
  Decoration,
  ViewPlugin,
  MatchDecorator,
} from '@codemirror/view';

/**
 * Create a search panel for the editor
 * @param {import('../editor/editor-manager').EditorManager} editorManager
 * @returns {{ show(mode?:string):void, hide():void, toggle(mode?:string):void, element: HTMLElement }}
 */
export function createSearchPanel(editorManager) {
  let isVisible = false;
  let mode = 'find'; // 'find' or 'replace'
  let caseSensitive = false;
  let wholeWord = false;
  let useRegex = false;
  let matchCount = 0;
  let currentMatch = 0;
  /** @type {Array<{from:number, to:number}>} */
  let matches = [];

  // Build DOM
  const panel = document.createElement('div');
  panel.className = 'search-panel';
  panel.style.display = 'none';

  // ---- Find Row ----
  const findRow = document.createElement('div');
  findRow.className = 'search-row';

  const findInput = document.createElement('input');
  findInput.className = 'search-input';
  findInput.placeholder = 'Find...';
  findInput.id = 'search-find-input';
  findInput.setAttribute('aria-label', 'Find');

  const caseBtn = _createToggle('Aa', 'Case Sensitive', 'search-case-btn');
  const wordBtn = _createToggle('W', 'Whole Word', 'search-word-btn');
  const regexBtn = _createToggle('.*', 'Regular Expression', 'search-regex-btn');

  const countSpan = document.createElement('span');
  countSpan.className = 'search-count';
  countSpan.textContent = 'No results';

  const prevBtn = document.createElement('button');
  prevBtn.className = 'search-nav-btn';
  prevBtn.innerHTML = '&#x2191;';
  prevBtn.title = 'Previous (Shift+Enter)';

  const nextBtn = document.createElement('button');
  nextBtn.className = 'search-nav-btn';
  nextBtn.innerHTML = '&#x2193;';
  nextBtn.title = 'Next (Enter)';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'search-close';
  closeBtn.innerHTML = '×';
  closeBtn.title = 'Close (Escape)';

  findRow.append(findInput, caseBtn, wordBtn, regexBtn, countSpan, prevBtn, nextBtn, closeBtn);

  // ---- Replace Row ----
  const replaceRow = document.createElement('div');
  replaceRow.className = 'search-row';

  const replaceInput = document.createElement('input');
  replaceInput.className = 'search-input';
  replaceInput.placeholder = 'Replace with...';
  replaceInput.id = 'search-replace-input';
  replaceInput.setAttribute('aria-label', 'Replace');

  const replaceBtn = document.createElement('button');
  replaceBtn.className = 'btn';
  replaceBtn.textContent = 'Replace';
  replaceBtn.title = 'Replace current match';

  const replaceAllBtn = document.createElement('button');
  replaceAllBtn.className = 'btn';
  replaceAllBtn.textContent = 'All';
  replaceAllBtn.title = 'Replace all matches';

  replaceRow.append(replaceInput, replaceBtn, replaceAllBtn);

  panel.append(findRow, replaceRow);

  // ---- Event Handlers ----

  findInput.addEventListener('input', () => _runSearch());

  findInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        _findPrev();
      } else {
        _findNext();
      }
    } else if (e.key === 'Escape') {
      hide();
    }
  });

  replaceInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hide();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      _replaceNext();
    }
  });

  caseBtn.addEventListener('click', () => {
    caseSensitive = !caseSensitive;
    caseBtn.classList.toggle('active', caseSensitive);
    _runSearch();
  });

  wordBtn.addEventListener('click', () => {
    wholeWord = !wholeWord;
    wordBtn.classList.toggle('active', wholeWord);
    _runSearch();
  });

  regexBtn.addEventListener('click', () => {
    useRegex = !useRegex;
    regexBtn.classList.toggle('active', useRegex);
    _runSearch();
  });

  nextBtn.addEventListener('click', () => _findNext());
  prevBtn.addEventListener('click', () => _findPrev());
  closeBtn.addEventListener('click', () => hide());
  replaceBtn.addEventListener('click', () => _replaceNext());
  replaceAllBtn.addEventListener('click', () => _replaceAll());

  // ---- Search Logic ----

  function _runSearch() {
    const view = editorManager.view;
    if (!view) return;

    const query = findInput.value;
    if (!query) {
      matches = [];
      matchCount = 0;
      currentMatch = 0;
      countSpan.textContent = 'No results';
      _clearHighlights();
      return;
    }

    matches = [];
    const doc = view.state.doc;

    try {
      if (useRegex) {
        const flags = caseSensitive ? 'g' : 'gi';
        const re = new RegExp(query, flags);
        const text = doc.toString();
        let m;
        while ((m = re.exec(text)) !== null) {
          if (m[0].length === 0) break; // avoid infinite loop on empty match
          if (wholeWord && !_isWholeWord(text, m.index, m[0].length)) continue;
          matches.push({ from: m.index, to: m.index + m[0].length });
        }
      } else {
        const searchStr = caseSensitive ? query : query.toLowerCase();
        const text = doc.toString();
        const searchText = caseSensitive ? text : text.toLowerCase();
        let pos = 0;
        while (pos < text.length) {
          const idx = searchText.indexOf(searchStr, pos);
          if (idx < 0) break;
          if (!wholeWord || _isWholeWord(text, idx, searchStr.length)) {
            matches.push({ from: idx, to: idx + searchStr.length });
          }
          pos = idx + 1;
        }
      }
    } catch (e) {
      // Invalid regex
      matches = [];
    }

    matchCount = matches.length;

    if (matchCount === 0) {
      currentMatch = 0;
      countSpan.textContent = 'No results';
      _clearHighlights();
      return;
    }

    // Find closest match to cursor
    const cursorPos = view.state.selection.main.head;
    currentMatch = 0;
    for (let i = 0; i < matches.length; i++) {
      if (matches[i].from >= cursorPos) {
        currentMatch = i;
        break;
      }
      currentMatch = i;
    }

    _updateCount();
    _highlightMatches();
    _goToMatch(currentMatch);
  }

  function _isWholeWord(text, index, length) {
    const before = index > 0 ? text[index - 1] : ' ';
    const after = index + length < text.length ? text[index + length] : ' ';
    const wordChar = /\w/;
    return !wordChar.test(before) && !wordChar.test(after);
  }

  function _findNext() {
    if (matches.length === 0) return;
    currentMatch = (currentMatch + 1) % matches.length;
    _updateCount();
    _goToMatch(currentMatch, true);
  }

  function _findPrev() {
    if (matches.length === 0) return;
    currentMatch = (currentMatch - 1 + matches.length) % matches.length;
    _updateCount();
    _goToMatch(currentMatch, true);
  }

  function _goToMatch(index, focusEditor = false) {
    const view = editorManager.view;
    if (!view || !matches[index]) return;

    const { from, to } = matches[index];
    view.dispatch({
      selection: EditorSelection.single(from, to),
      scrollIntoView: true,
    });
    if (focusEditor) {
      view.focus();
    }
  }

  function _replaceNext() {
    const view = editorManager.view;
    if (!view || matches.length === 0) return;

    const match = matches[currentMatch];
    if (!match) return;

    const replacement = replaceInput.value;
    view.dispatch({
      changes: { from: match.from, to: match.to, insert: replacement },
    });

    // Re-run search after replacement
    _runSearch();
  }

  function _replaceAll() {
    const view = editorManager.view;
    if (!view || matches.length === 0) return;

    const replacement = replaceInput.value;

    // Replace from end to start to maintain positions
    const changes = matches.slice().reverse().map((m) => ({
      from: m.from,
      to: m.to,
      insert: replacement,
    }));

    view.dispatch({ changes });
    _runSearch();
  }

  function _updateCount() {
    if (matchCount === 0) {
      countSpan.textContent = 'No results';
    } else {
      countSpan.textContent = `${currentMatch + 1} of ${matchCount}`;
    }
  }

  function _highlightMatches() {
    // We rely on CodeMirror's built-in selection match highlighting
    // and the cursor position to show the current match
  }

  function _clearHighlights() {
    // No-op since we use CM's built-in highlighting
  }

  // ---- Public API ----

  function show(m = 'find') {
    mode = m;
    isVisible = true;
    panel.style.display = '';
    replaceRow.style.display = mode === 'replace' ? '' : 'none';
    findInput.focus();
    findInput.select();

    // If there's selected text, use it as search query
    const selectedText = editorManager.getSelectionText?.();
    if (selectedText && selectedText.length < 200) {
      findInput.value = selectedText;
      _runSearch();
    }
  }

  function hide() {
    isVisible = false;
    panel.style.display = 'none';
    matches = [];
    matchCount = 0;
    currentMatch = 0;
    editorManager.focus?.();
  }

  function toggle(m = 'find') {
    if (isVisible && mode === m) {
      hide();
    } else {
      show(m);
    }
  }

  return { show, hide, toggle, element: panel };
}

/**
 * Create a toggle button
 * @param {string} label
 * @param {string} title
 * @param {string} id
 * @returns {HTMLButtonElement}
 */
function _createToggle(label, title, id) {
  const btn = document.createElement('button');
  btn.className = 'search-toggle';
  btn.textContent = label;
  btn.title = title;
  btn.id = id;
  return btn;
}
