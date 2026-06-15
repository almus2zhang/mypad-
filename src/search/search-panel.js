/**
 * SearchPanel — Custom search & replace panel
 * Uses CodeMirror 6's search API under the hood
 * Integrates AnNotePad "Find All" mode.
 * @module search/search-panel
 */

import { SearchCursor, RegExpCursor } from '@codemirror/search';
import { EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { t } from '../i18n.js';

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
  let returnPosition = null;

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

  const inputWrapper = document.createElement('div');
  inputWrapper.className = 'search-input-wrapper';
  inputWrapper.style.position = 'relative';
  inputWrapper.style.flex = '1';
  inputWrapper.style.minWidth = '100px';

  const findInput = document.createElement('input');
  findInput.className = 'search-input';
  findInput.placeholder = t('Search... (Regex supported)');
  findInput.id = 'search-find-input';
  findInput.setAttribute('aria-label', t('Find'));
  // findInput.setAttribute('list', 'search-history-list'); // Remove native datalist
  findInput.style.width = '100%';

  const historyDropdown = document.createElement('div');
  historyDropdown.className = 'search-history-dropdown';

  function updateHistoryDropdown() {
    historyDropdown.innerHTML = '';
    if (searchHistory.length === 0) {
      historyDropdown.style.display = 'none';
      return;
    }
    searchHistory.forEach((q, idx) => {
      const item = document.createElement('div');
      item.className = 'search-history-item';
      
      const num = document.createElement('span');
      num.className = 'search-history-num';
      num.textContent = idx + 1;
      
      const text = document.createElement('span');
      text.className = 'search-history-text';
      text.textContent = q;
      
      item.appendChild(num);
      item.appendChild(text);
      
      item.addEventListener('mousedown', (e) => {
        // use mousedown to prevent input blur
        e.preventDefault();
        findInput.value = q;
        historyDropdown.style.display = 'none';
        saveSearchHistory(q);
        if (isFindAllMode) _runFindAll();
        else _runNormalSearch();
      });
      
      historyDropdown.appendChild(item);
    });
  }
  updateHistoryDropdown();

  findInput.addEventListener('click', () => {
    if (searchHistory.length > 0) {
      updateHistoryDropdown();
      historyDropdown.style.display = 'block';
    }
  });

  findInput.addEventListener('blur', () => {
    historyDropdown.style.display = 'none';
  });

  inputWrapper.appendChild(findInput);
  inputWrapper.appendChild(historyDropdown);

  const caseBtn = _createToggle('Aa', t('Case Sensitive'), 'search-case-btn');
  const wordBtn = _createToggle('W', t('Whole Word'), 'search-word-btn');
  const regexBtn = _createToggle('.*', t('Regular Expression'), 'search-regex-btn');

  const findAllBtn = document.createElement('button');
  findAllBtn.className = 'btn';
  findAllBtn.textContent = t('Find All');
  const LAYOUT_SIDE_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="15" y1="3" x2="15" y2="21"></line></svg>`;
  const LAYOUT_BOTTOM_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="15" x2="21" y2="15"></line></svg>`;

  const layoutBtn = _createToggle('', t('Toggle Results Layout'), 'search-layout-btn');
  layoutBtn.innerHTML = LAYOUT_SIDE_SVG;
  layoutBtn.style.display = 'none';

  const countSpan = document.createElement('span');
  countSpan.className = 'search-count';
  countSpan.textContent = t('No results');

  const prevBtn = document.createElement('button');
  prevBtn.className = 'search-nav-btn';
  prevBtn.innerHTML = '&#x2191;';
  prevBtn.title = t('Previous');

  const nextBtn = document.createElement('button');
  nextBtn.className = 'search-nav-btn';
  nextBtn.innerHTML = '&#x2193;';
  nextBtn.title = t('Next');

  const closeBtn = document.createElement('button');
  closeBtn.className = 'search-close';
  closeBtn.innerHTML = '&times;';
  closeBtn.title = t('Close');

  findRow.append(inputWrapper, caseBtn, wordBtn, regexBtn, findAllBtn, layoutBtn, countSpan, prevBtn, nextBtn, closeBtn);

  // ---- Replace Row ----
  const replaceRow = document.createElement('div');
  replaceRow.className = 'search-row';

  const replaceInput = document.createElement('input');
  replaceInput.className = 'search-input';
  replaceInput.placeholder = t('Replace with...');
  replaceInput.id = 'search-replace-input';
  replaceInput.setAttribute('aria-label', t('Replace'));

  const replaceBtn = document.createElement('button');
  replaceBtn.className = 'btn';
  replaceBtn.textContent = t('Replace');
  replaceBtn.title = t('Replace current match');

  const replaceAllBtn = document.createElement('button');
  replaceAllBtn.className = 'btn';
  replaceAllBtn.textContent = t('All');
  replaceAllBtn.title = t('Replace all matches');

  replaceRow.append(replaceInput, replaceBtn, replaceAllBtn);

  // ---- Find All Results Panel ----
  const resultsContainer = document.createElement('div');
  resultsContainer.className = 'annotepad-results';
  resultsContainer.style.display = 'none'; // Hidden initially

  // ---- Resizer ----
  const resizer = document.createElement('div');
  resizer.className = 'panel-resizer';
  
  let isResizing = false;
  
  function onDragStart(e) {
    if (!isFindAllMode) return;
    isResizing = true;
    document.body.style.cursor = isLayoutVertical ? 'ns-resize' : 'ew-resize';
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchmove', onMouseMove, { passive: false });
    document.addEventListener('touchend', onMouseUp);
  }

  resizer.addEventListener('mousedown', onDragStart);
  resizer.addEventListener('touchstart', onDragStart, { passive: true });

  function onMouseMove(e) {
    if (!isResizing) return;
    
    // Prevent default scrolling on touch devices
    if (e.touches) e.preventDefault();
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    if (isLayoutVertical) {
      const newHeight = window.innerHeight - clientY;
      // Allow dragging up to 1 line of the editor (e.g. max height = window height - 100px)
      if (newHeight > 50 && newHeight < window.innerHeight - 100) {
        panel.style.flex = `0 0 ${newHeight}px`;
        panel.style.height = 'auto';
      }
    } else {
      const newWidth = window.innerWidth - clientX;
      if (newWidth > 50 && newWidth < window.innerWidth - 100) {
        panel.style.flex = `0 0 ${newWidth}px`;
        panel.style.width = 'auto';
      }
    }
  }

  function onMouseUp() {
    isResizing = false;
    document.body.style.cursor = '';
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.removeEventListener('touchmove', onMouseMove);
    document.removeEventListener('touchend', onMouseUp);
  }

  panel.append(resizer, findRow, replaceRow, resultsContainer);

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
    if (!isFindAllMode) {
      isFindAllMode = true;
      findAllBtn.classList.add('active');
      saveSearchHistory(findInput.value);
      resultsContainer.style.display = 'block';
      layoutBtn.style.display = 'inline-block';
      _setLayout(isLayoutVertical ? 'vertical' : 'horizontal');
      _runFindAll();
    } else {
      // Already in Find All mode, just refresh results
      saveSearchHistory(findInput.value);
      _runFindAll();
    }
  });

  layoutBtn.addEventListener('click', () => {
    isLayoutVertical = !isLayoutVertical;
    layoutBtn.innerHTML = isLayoutVertical ? LAYOUT_BOTTOM_SVG : LAYOUT_SIDE_SVG;
    
    // Reset any inline sizes set by dragging
    panel.style.width = '';
    panel.style.height = '';
    panel.style.flex = '';
    
    _setLayout(isLayoutVertical ? 'vertical' : 'horizontal');
  });

  function _setLayout(layout) {
    const container = document.getElementById('editor-layout-wrapper');
    if (!container) return;
    container.classList.remove('annotepad-horizontal', 'annotepad-vertical');
    if (isVisible && isFindAllMode) {
      container.classList.add(`annotepad-${layout}`);
    }
  }

  nextBtn.addEventListener('click', () => { saveSearchHistory(findInput.value); _findNext(); });
  prevBtn.addEventListener('click', () => { saveSearchHistory(findInput.value); _findPrev(); });
  closeBtn.addEventListener('click', () => { saveSearchHistory(findInput.value); hide(); });
  replaceBtn.addEventListener('click', () => { saveSearchHistory(findInput.value); _replaceNext(); });
  replaceAllBtn.addEventListener('click', () => { saveSearchHistory(findInput.value); _replaceAll(); });

  function saveSearchHistory(query) {
    if (!query) return;
    searchHistory = searchHistory.filter(q => q !== query);
    searchHistory.unshift(query);
    if (searchHistory.length > 20) searchHistory.pop();
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(searchHistory));
    updateHistoryDropdown();
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
      countSpan.textContent = t('No results');
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
      countSpan.textContent = t('No results');
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
      countSpan.textContent = t('No results');
      return;
    }

    countSpan.textContent = t('Searching...');
    
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
    
    if (returnPosition) {
      const backItem = document.createElement('div');
      backItem.className = 'annotepad-result-item';
      backItem.style.fontWeight = 'bold';
      backItem.style.backgroundColor = 'var(--bg-secondary)';
      backItem.style.position = 'sticky';
      backItem.style.top = '0';
      backItem.style.zIndex = '1';
      backItem.innerHTML = `<span>⬅️ ${t('Go Back')}</span>`;
      backItem.addEventListener('click', () => {
        const view = editorManager.view;
        if (view) {
          view.dispatch({
            selection: { anchor: returnPosition.pos },
            effects: EditorView.scrollIntoView(returnPosition.pos, {y: 'center'})
          });
        }
        hide();
      });
      resultsContainer.appendChild(backItem);
    }

    if (matches.length === 0) {
      const empty = document.createElement('div');
      empty.style.padding = '10px';
      empty.style.color = 'var(--text-tertiary)';
      empty.textContent = t('No results found.');
      resultsContainer.appendChild(empty);
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
      item.addEventListener('dblclick', () => {
        // Go to line
        const view = editorManager.view;
        if (!view) return;
        view.dispatch({
          selection: { anchor: res.from, head: res.to },
          effects: EditorView.scrollIntoView(res.from, {y: 'center'})
        });
        view.focus();
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
    _goToMatch(currentMatch, false);
  }

  function _findPrev() {
    if (matches.length === 0) return;
    currentMatch = (currentMatch - 1 + matches.length) % matches.length;
    _updateCount();
    _goToMatch(currentMatch, false);
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

  function show(m = 'find', initialQuery = '') {
    mode = m;
    isVisible = true;
    panel.style.display = '';
    replaceRow.style.display = mode === 'replace' ? '' : 'none';

    // Force Find All mode by default if not already active
    if (!isFindAllMode) {
      isFindAllMode = true;
      findAllBtn.classList.add('active');
      resultsContainer.style.display = 'block';
      layoutBtn.style.display = '';
    }

    _setLayout(isLayoutVertical ? 'vertical' : 'horizontal');

    findInput.focus();
    findInput.select();

    // If there's selected text, use it as search query
    const textToSearch = initialQuery || editorManager.getSelectionText?.() || window.getSelection().toString();
    if (textToSearch && textToSearch.length > 0 && textToSearch.length < 200) {
      findInput.value = textToSearch;
      saveSearchHistory(textToSearch);
    }
    
    // Auto-run search if there's text
    if (findInput.value) {
      _runFindAll();
    }
  }

  function hide() {
    isVisible = false;
    panel.style.display = 'none';
    matches = [];
    matchCount = 0;
    currentMatch = 0;
    
    // Reset Find All mode
    isFindAllMode = false;
    findAllBtn.classList.remove('active');
    returnPosition = null;
    resultsContainer.style.display = 'none';
    layoutBtn.style.display = 'none';
    
    const container = document.getElementById('workspace');
    if (container) container.classList.remove('annotepad-horizontal', 'annotepad-vertical');
    editorManager.focus?.();
  }

  function toggle(m = 'find', initialQuery = '') {
    if (isVisible && mode === m) {
      const isFocused = document.activeElement === findInput || document.activeElement === replaceInput;
      if (isFocused) {
        hide();
        return;
      }
    }
    show(m, initialQuery);
  }

  function showReference(query, pos) {
    mode = 'find';
    isVisible = true;
    panel.style.display = '';
    replaceRow.style.display = 'none';

    returnPosition = { pos };
    
    isFindAllMode = true;
    findAllBtn.classList.add('active');
    resultsContainer.style.display = 'block';
    layoutBtn.style.display = '';
    
    _setLayout(isLayoutVertical ? 'vertical' : 'horizontal');
    
    findInput.value = query;
    _runFindAll();
  }

  function setKeyboardEnabled(enabled) {
    if (enabled) {
      findInput.removeAttribute('inputmode');
      replaceInput.removeAttribute('inputmode');
    } else {
      findInput.setAttribute('inputmode', 'none');
      replaceInput.setAttribute('inputmode', 'none');
    }
  }

  return { show, hide, toggle, showReference, setKeyboardEnabled, element: panel };
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
