/**
 * SearchPanel — Custom search & replace panel
 * Uses CodeMirror 6's search API under the hood
 * Integrates AnNotePad "Find All" mode.
 * @module search/search-panel
 */

import { SearchCursor, RegExpCursor } from '@codemirror/search';
import { EditorSelection } from '@codemirror/state';

const SEARCH_HISTORY_KEY = 'mypad_search_history';

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
  /** @type {Array<{from:number, to:number, lineNum?:number, col?:number, matchLen?:number, text?:string}>} */
  let matches = [];
  
  let isFindAllMode = false;
  let isLayoutVertical = false;

  // Load search history
  let searchHistory = [];
  try {
    searchHistory = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY)) || [];
  } catch(e) {}

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
  findInput.setAttribute('list', 'search-history-list');

  const datalist = document.createElement('datalist');
  datalist.id = 'search-history-list';
  function updateDatalist() {
    datalist.innerHTML = '';
    searchHistory.forEach(q => {
      const opt = document.createElement('option');
      opt.value = q;
      datalist.appendChild(opt);
    });
  }
  updateDatalist();

  const caseBtn = _createToggle('Aa', 'Case Sensitive', 'search-case-btn');
  const wordBtn = _createToggle('W', 'Whole Word', 'search-word-btn');
  const regexBtn = _createToggle('.*', 'Regular Expression', 'search-regex-btn');

  const findAllBtn = document.createElement('button');
  findAllBtn.className = 'btn';
  findAllBtn.textContent = 'Find All';
  findAllBtn.title = 'Show all results in a list (Disables syntax highlighting)';
  findAllBtn.style.padding = '2px 8px';

  const layoutBtn = _createToggle('Layout: Side', 'Toggle Results Layout (Bottom/Side)', 'search-layout-btn');
  layoutBtn.style.display = 'none';

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
  closeBtn.innerHTML = '&times;';
  closeBtn.title = 'Close (Escape)';

  findRow.append(findInput, datalist, caseBtn, wordBtn, regexBtn, findAllBtn, layoutBtn, countSpan, prevBtn, nextBtn, closeBtn);

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

  // ---- Find All Results Panel ----
  const resultsContainer = document.createElement('div');
  resultsContainer.className = 'annotepad-results';
  resultsContainer.style.display = 'none'; // Hidden initially

  panel.append(findRow, replaceRow, resultsContainer);

  // ---- Event Handlers ----

  findInput.addEventListener('input', () => {
    if (isFindAllMode) {
      // Don't auto-run Find All on every keystroke, let user press Enter
      _runNormalSearch();
    } else {
      _runNormalSearch();
    }
  });

  findInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveSearchHistory(findInput.value);
      if (isFindAllMode) {
        _runFindAll();
      } else {
        if (e.shiftKey) _findPrev();
        else _findNext();
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
    isFindAllMode ? _runFindAll() : _runNormalSearch();
  });

  wordBtn.addEventListener('click', () => {
    wholeWord = !wholeWord;
    wordBtn.classList.toggle('active', wholeWord);
    isFindAllMode ? _runFindAll() : _runNormalSearch();
  });

  regexBtn.addEventListener('click', () => {
    useRegex = !useRegex;
    regexBtn.classList.toggle('active', useRegex);
    isFindAllMode ? _runFindAll() : _runNormalSearch();
  });

  findAllBtn.addEventListener('click', () => {
    isFindAllMode = !isFindAllMode;
    findAllBtn.classList.toggle('active', isFindAllMode);
    
    if (isFindAllMode) {
      saveSearchHistory(findInput.value);
      editorManager.setSyntaxHighlightingEnabled(false);
      resultsContainer.style.display = 'block';
      layoutBtn.style.display = 'inline-block';
      _setLayout(isLayoutVertical ? 'vertical' : 'horizontal');
      _runFindAll();
    } else {
      editorManager.setSyntaxHighlightingEnabled(true);
      resultsContainer.style.display = 'none';
      layoutBtn.style.display = 'none';
      const container = document.getElementById('workspace');
      if (container) container.classList.remove('annotepad-horizontal', 'annotepad-vertical');
      _runNormalSearch();
    }
  });

  layoutBtn.addEventListener('click', () => {
    isLayoutVertical = !isLayoutVertical;
    layoutBtn.textContent = isLayoutVertical ? 'Layout: Bottom' : 'Layout: Side';
    _setLayout(isLayoutVertical ? 'vertical' : 'horizontal');
  });

  function _setLayout(layout) {
    const container = document.getElementById('workspace');
    if (!container) return;
    container.classList.remove('annotepad-horizontal', 'annotepad-vertical');
    if (isVisible && isFindAllMode) {
      container.classList.add(`annotepad-${layout}`);
    }
  }

  nextBtn.addEventListener('click', () => _findNext());
  prevBtn.addEventListener('click', () => _findPrev());
  closeBtn.addEventListener('click', () => hide());
  replaceBtn.addEventListener('click', () => _replaceNext());
  replaceAllBtn.addEventListener('click', () => _replaceAll());

  function saveSearchHistory(query) {
    if (!query) return;
    searchHistory = searchHistory.filter(q => q !== query);
    searchHistory.unshift(query);
    if (searchHistory.length > 20) searchHistory.pop();
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(searchHistory));
    updateDatalist();
  }

  // ---- Search Logic ----

  function _runNormalSearch() {
    const view = editorManager.view;
    if (!view) return;

    const query = findInput.value;
    if (!query) {
      matches = [];
      matchCount = 0;
      currentMatch = 0;
      countSpan.textContent = 'No results';
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
    _goToMatch(currentMatch);
  }

  function _runFindAll() {
    const view = editorManager.view;
    if (!view) return;
    const doc = view.state.doc;
    const query = findInput.value;
    
    resultsContainer.innerHTML = '';
    
    if (!query) {
      countSpan.textContent = 'No results';
      return;
    }

    countSpan.textContent = 'Searching...';
    
    setTimeout(() => {
      matches = [];
      let CursorClass = SearchCursor;
      let args = [doc, query, 0, doc.length];
      
      if (useRegex) {
        CursorClass = RegExpCursor;
        args = [doc, query, {}, 0, doc.length];
      } else {
        if (!caseSensitive || wholeWord) {
          CursorClass = RegExpCursor;
          const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          let rxStr = escapeRegExp(query);
          if (wholeWord) rxStr = `\\b${rxStr}\\b`;
          args = [doc, rxStr, {ignoreCase: !caseSensitive}, 0, doc.length];
        }
      }

      try {
        const cursor = new CursorClass(...args);
        while (!cursor.next().done) {
          const { from, to } = cursor.value;
          const line = doc.lineAt(from);
          matches.push({
            from, to,
            lineNum: line.number,
            col: from - line.from,
            matchLen: to - from,
            text: line.text
          });
          if (matches.length > 2000) break; // limit
        }
        
        matchCount = matches.length;
        _updateCount();
        _renderResults();
      } catch (e) {
        countSpan.textContent = `Error: ${e.message}`;
      }
    }, 10);
  }

  function _renderResults() {
    resultsContainer.innerHTML = '';
    if (matches.length === 0) {
      resultsContainer.innerHTML = '<div style="padding: 10px; color: var(--text-tertiary);">No results found.</div>';
      return;
    }

    const escapeHtml = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    matches.forEach(res => {
      const item = document.createElement('div');
      item.className = 'annotepad-result-item';

      const lineNo = document.createElement('span');
      lineNo.className = 'annotepad-result-line';
      lineNo.textContent = `${res.lineNum}: `;

      const textSpan = document.createElement('span');
      textSpan.className = 'annotepad-result-text';
      
      let html = escapeHtml(res.text);
      if (res.matchLen) {
        const matchCol = res.col;
        const matchLen = res.matchLen;
        const before = escapeHtml(res.text.substring(0, matchCol));
        const match = escapeHtml(res.text.substring(matchCol, matchCol + matchLen));
        const after = escapeHtml(res.text.substring(matchCol + matchLen));
        html = `${before}<span class="annotepad-result-hl">${match}</span>${after}`;
      }
      textSpan.innerHTML = html;

      item.append(lineNo, textSpan);
      item.addEventListener('click', () => {
        // Go to line
        const view = editorManager.view;
        if (!view) return;
        view.dispatch({
          selection: { anchor: res.from, head: res.to },
          effects: EditorView.scrollIntoView(res.from, {y: 'center'})
        });
      });
      resultsContainer.appendChild(item);
    });
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

    if (isFindAllMode) _runFindAll();
    else _runNormalSearch();
  }

  function _replaceAll() {
    const view = editorManager.view;
    if (!view || matches.length === 0) return;

    const replacement = replaceInput.value;

    const changes = matches.slice().reverse().map((m) => ({
      from: m.from,
      to: m.to,
      insert: replacement,
    }));

    view.dispatch({ changes });
    if (isFindAllMode) _runFindAll();
    else _runNormalSearch();
  }

  function _updateCount() {
    if (matchCount === 0) {
      countSpan.textContent = 'No results';
    } else {
      if (isFindAllMode) {
        countSpan.textContent = `Found ${matchCount}${matchCount > 2000 ? '+' : ''}`;
      } else {
        countSpan.textContent = `${currentMatch + 1} of ${matchCount}`;
      }
    }
  }

  // ---- Public API ----

  function show(m = 'find') {
    mode = m;
    isVisible = true;
    panel.style.display = '';
    replaceRow.style.display = mode === 'replace' ? '' : 'none';
    
    // Add layout class if Find All mode is active
    if (isFindAllMode) {
      _setLayout(isLayoutVertical ? 'vertical' : 'horizontal');
    }

    findInput.focus();
    findInput.select();

    // If there's selected text, use it as search query
    const selectedText = editorManager.getSelectionText?.();
    if (selectedText && selectedText.length < 200) {
      findInput.value = selectedText;
      // Auto-trigger Find All if requested
      if (!isFindAllMode) {
        findAllBtn.click(); // This enables Find All mode and searches
      } else {
        _runFindAll();
      }
    } else {
      if (isFindAllMode) _runFindAll();
    }
  }

  function hide() {
    isVisible = false;
    panel.style.display = 'none';
    matches = [];
    matchCount = 0;
    currentMatch = 0;
    const container = document.getElementById('workspace');
    if (container) container.classList.remove('annotepad-horizontal', 'annotepad-vertical');
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
