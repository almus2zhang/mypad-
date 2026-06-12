/**
 * AnNotePad UI Panel
 * Provides the search input, results list, and custom highlighting UI.
 */

export function createAnnotepadPanel(manager) {
  const panel = document.createElement('div');
  panel.className = 'annotepad-panel';
  panel.style.display = 'none';

  // ---- Header ----
  const header = document.createElement('div');
  header.className = 'annotepad-header';

  const title = document.createElement('div');
  title.className = 'annotepad-title';
  title.textContent = 'AnNotePad Mode';

  const layoutBtn = document.createElement('button');
  layoutBtn.className = 'annotepad-btn annotepad-layout-btn';
  layoutBtn.textContent = 'Layout: Side';
  layoutBtn.title = 'Toggle Horizontal/Vertical Layout';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'annotepad-btn annotepad-close-btn';
  closeBtn.textContent = '×';
  closeBtn.title = 'Exit AnNotePad Mode';

  header.append(title, layoutBtn, closeBtn);

  // ---- Search Controls ----
  const searchControls = document.createElement('div');
  searchControls.className = 'annotepad-search-controls';

  const searchInput = document.createElement('input');
  searchInput.className = 'annotepad-search-input settings-input';
  searchInput.placeholder = 'Search...';

  const regexBtn = _createToggle('.*', 'Regular Expression');
  const caseBtn = _createToggle('Aa', 'Case Sensitive');
  const wordBtn = _createToggle('W', 'Whole Word');

  const searchBtn = document.createElement('button');
  searchBtn.className = 'btn btn-primary';
  searchBtn.textContent = 'Find All';

  searchControls.append(searchInput, regexBtn, caseBtn, wordBtn, searchBtn);

  const statusEl = document.createElement('div');
  statusEl.className = 'annotepad-status';

  // ---- Custom Highlights ----
  const hlHeader = document.createElement('div');
  hlHeader.className = 'annotepad-hl-header';
  hlHeader.textContent = 'Custom Highlights';
  
  const addHlBtn = document.createElement('button');
  addHlBtn.className = 'btn';
  addHlBtn.style.padding = '2px 8px';
  addHlBtn.style.fontSize = '12px';
  addHlBtn.textContent = '+ Add Rule';
  hlHeader.appendChild(addHlBtn);

  const hlContainer = document.createElement('div');
  hlContainer.className = 'annotepad-hl-container';

  function renderHlRules() {
    hlContainer.innerHTML = '';
    const rules = manager.getHighlightRules();
    rules.forEach((rule, idx) => {
      const row = document.createElement('div');
      row.className = 'annotepad-hl-row';

      const colorInp = document.createElement('input');
      colorInp.type = 'color';
      colorInp.value = rule.color;
      colorInp.className = 'annotepad-hl-color';
      colorInp.addEventListener('change', () => {
        manager.updateHighlightRule(idx, { ...rule, color: colorInp.value });
      });

      const textInp = document.createElement('input');
      textInp.type = 'text';
      textInp.value = rule.pattern;
      textInp.placeholder = 'Regex or text';
      textInp.className = 'settings-input';
      textInp.style.flex = '1';
      textInp.addEventListener('input', () => {
        manager.updateHighlightRule(idx, { ...rule, pattern: textInp.value });
      });

      const rmBtn = document.createElement('button');
      rmBtn.className = 'annotepad-btn';
      rmBtn.textContent = '×';
      rmBtn.addEventListener('click', () => {
        manager.removeHighlightRule(idx);
        renderHlRules();
      });

      row.append(colorInp, textInp, rmBtn);
      hlContainer.appendChild(row);
    });
  }

  addHlBtn.addEventListener('click', () => {
    manager.addHighlightRule({ pattern: '', color: '#f38ba8' });
    renderHlRules();
  });

  // ---- Search Results ----
  const resultsContainer = document.createElement('div');
  resultsContainer.className = 'annotepad-results';

  panel.append(header, searchControls, statusEl, hlHeader, hlContainer, resultsContainer);

  let isLayoutVertical = false;

  layoutBtn.addEventListener('click', () => {
    isLayoutVertical = !isLayoutVertical;
    layoutBtn.textContent = isLayoutVertical ? 'Layout: Bottom' : 'Layout: Side';
    manager.setLayout(isLayoutVertical ? 'vertical' : 'horizontal');
  });

  closeBtn.addEventListener('click', () => {
    manager.deactivate();
  });

  searchBtn.addEventListener('click', () => {
    const query = searchInput.value;
    if (!query) return;
    const opts = {
      isRegex: regexBtn.classList.contains('active'),
      caseSensitive: caseBtn.classList.contains('active'),
      wholeWord: wordBtn.classList.contains('active')
    };
    manager.performSearch(query, opts);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      searchBtn.click();
    }
  });

  function _createToggle(text, title) {
    const btn = document.createElement('button');
    btn.className = 'annotepad-toggle-btn';
    btn.textContent = text;
    btn.title = title;
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
    });
    return btn;
  }

  // Escape HTML function
  function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  return {
    element: panel,
    show() {
      panel.style.display = 'flex';
      renderHlRules();
    },
    hide() {
      panel.style.display = 'none';
    },
    setStatus(text) {
      statusEl.textContent = text;
    },
    renderResults(results) {
      resultsContainer.innerHTML = '';
      if (results.length === 0) {
        resultsContainer.innerHTML = '<div style="padding: 10px; color: var(--text-tertiary);">No results found.</div>';
        return;
      }
      results.forEach(res => {
        const item = document.createElement('div');
        item.className = 'annotepad-result-item';

        const lineNo = document.createElement('span');
        lineNo.className = 'annotepad-result-line';
        lineNo.textContent = `${res.lineNum}: `;

        const textSpan = document.createElement('span');
        textSpan.className = 'annotepad-result-text';
        
        // Very basic highlight rendering for the context
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
          manager.goToLine(res.lineNum, res.col);
        });
        resultsContainer.appendChild(item);
      });
    }
  };
}
