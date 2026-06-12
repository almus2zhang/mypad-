/**
 * @module statusbar
 * Bottom status bar for MyPad++.
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Format a byte count to a human-readable string.
 * @param {number} bytes
 * @returns {string}
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  if (bytes < 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1);
  const val = bytes / Math.pow(k, i);
  return `${i === 0 ? val : val.toFixed(1)} ${units[i]}`;
}

/**
 * Create a clickable status item.
 * @param {string} id
 * @param {string} text - Initial text content
 * @param {string} [tooltip]
 * @returns {HTMLButtonElement}
 */
function createStatusItem(id, text, tooltip = '') {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'statusbar-item';
  el.id = id;
  el.textContent = text;
  if (tooltip) el.title = tooltip;
  el.setAttribute('aria-label', tooltip || text);
  return el;
}

/**
 * Create a non-interactive status label.
 * @param {string} id
 * @param {string} text
 * @returns {HTMLSpanElement}
 */
function createStatusLabel(id, text) {
  const el = document.createElement('span');
  el.className = 'statusbar-label';
  el.id = id;
  el.textContent = text;
  return el;
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Create the application status bar.
 *
 * @returns {object} Status bar controller.
 * @property {HTMLElement} element - The status bar DOM element.
 * @property {Function} setCursorPosition - Update line/col display.
 * @property {Function} setSelection - Update selection info.
 * @property {Function} setEncoding - Update encoding display.
 * @property {Function} setLanguage - Update language display.
 * @property {Function} setLineEnding - Update line ending display.
 * @property {Function} setIndentation - Update indentation display.
 * @property {Function} setFileSize - Update file size display.
 */
export function createStatusBar() {
  const bar = document.createElement('div');
  bar.className = 'statusbar';
  bar.id = 'statusbar';
  bar.setAttribute('role', 'status');
  bar.setAttribute('aria-label', 'Editor status bar');

  // ── Left section ────────────────────────────────────────────────────────
  const leftSection = document.createElement('div');
  leftSection.className = 'statusbar-section statusbar-section--left';

  const cursorLabel = createStatusLabel('status-cursor', 'Ln 1, Col 1');
  cursorLabel.title = 'Cursor Position';

  const selectionLabel = createStatusLabel('status-selection', '');
  selectionLabel.title = 'Selection';

  leftSection.appendChild(cursorLabel);
  leftSection.appendChild(selectionLabel);

  // ── Right section ───────────────────────────────────────────────────────
  const rightSection = document.createElement('div');
  rightSection.className = 'statusbar-section statusbar-section--right';

  const encodingItem = createStatusItem('status-encoding', 'UTF-8', 'File Encoding');
  const languageItem = createStatusItem('status-language', 'Plain Text', 'Language Mode');
  const lineEndingItem = createStatusItem('status-line-ending', 'LF', 'Line Ending');
  const indentItem = createStatusItem('status-indentation', 'Spaces: 4', 'Indentation');
  const fileSizeLabel = createStatusLabel('status-file-size', '');
  fileSizeLabel.title = 'File Size';

  rightSection.appendChild(encodingItem);
  rightSection.appendChild(languageItem);
  rightSection.appendChild(lineEndingItem);
  rightSection.appendChild(indentItem);
  rightSection.appendChild(fileSizeLabel);

  bar.appendChild(leftSection);
  bar.appendChild(rightSection);

  // ── Track click listener references for cleanup ─────────────────────────
  let encodingClickCleanup = null;
  let languageClickCleanup = null;
  let lineEndingClickCleanup = null;
  let indentClickCleanup = null;

  /**
   * Replace click handler on a status item.
   * @param {HTMLElement} el
   * @param {Function|null} onClick
   * @returns {Function|null} cleanup function
   */
  function setClickHandler(el, onClick) {
    if (typeof onClick === 'function') {
      el.addEventListener('click', onClick);
      el.classList.add('statusbar-item--clickable');
      return () => {
        el.removeEventListener('click', onClick);
        el.classList.remove('statusbar-item--clickable');
      };
    }
    return null;
  }

  return {
    element: bar,

    /**
     * Update cursor position display.
     * @param {number} line - 1-based line number.
     * @param {number} col - 1-based column number.
     */
    setCursorPosition(line, col) {
      cursorLabel.textContent = `Ln ${line}, Col ${col}`;
    },

    /**
     * Update selection info display.
     * @param {string} text - Selected text (used for char count).
     * @param {number} lines - Number of lines in selection.
     */
    setSelection(text, lines) {
      if (!text || text.length === 0) {
        selectionLabel.textContent = '';
        selectionLabel.style.display = 'none';
        return;
      }
      const chars = text.length;
      const parts = [];
      if (lines > 1) parts.push(`${lines} lines`);
      parts.push(`${chars} char${chars !== 1 ? 's' : ''} selected`);
      selectionLabel.textContent = `(${parts.join(', ')})`;
      selectionLabel.style.display = '';
    },

    /**
     * Update encoding display.
     * @param {string} encoding
     * @param {Function} [onClick] - Click handler (e.g. open encoding picker).
     */
    setEncoding(encoding, onClick) {
      encodingItem.textContent = encoding;
      encodingItem.setAttribute('aria-label', `File Encoding: ${encoding}`);
      if (encodingClickCleanup) encodingClickCleanup();
      encodingClickCleanup = setClickHandler(encodingItem, onClick);
    },

    /**
     * Update language display.
     * @param {string} name
     * @param {Function} [onClick] - Click handler (e.g. open language picker).
     */
    setLanguage(name, onClick) {
      languageItem.textContent = name;
      languageItem.setAttribute('aria-label', `Language Mode: ${name}`);
      if (languageClickCleanup) languageClickCleanup();
      languageClickCleanup = setClickHandler(languageItem, onClick);
    },

    /**
     * Update line ending display.
     * @param {string} type - "LF" or "CRLF".
     * @param {Function} [onClick]
     */
    setLineEnding(type, onClick) {
      lineEndingItem.textContent = type;
      lineEndingItem.setAttribute('aria-label', `Line Ending: ${type}`);
      if (lineEndingClickCleanup) lineEndingClickCleanup();
      lineEndingClickCleanup = setClickHandler(lineEndingItem, onClick);
    },

    /**
     * Update indentation display.
     * @param {"spaces"|"tabs"} type
     * @param {number} size
     * @param {Function} [onClick]
     */
    setIndentation(type, size, onClick) {
      const label = type === 'tabs' ? `Tabs: ${size}` : `Spaces: ${size}`;
      indentItem.textContent = label;
      indentItem.setAttribute('aria-label', `Indentation: ${label}`);
      if (indentClickCleanup) indentClickCleanup();
      indentClickCleanup = setClickHandler(indentItem, onClick);
    },

    /**
     * Update file size display.
     * @param {number} bytes
     */
    setFileSize(bytes) {
      if (bytes == null || bytes < 0) {
        fileSizeLabel.textContent = '';
        fileSizeLabel.style.display = 'none';
        return;
      }
      fileSizeLabel.textContent = formatFileSize(bytes);
      fileSizeLabel.style.display = '';
    },
  };
}
