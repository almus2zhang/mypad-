import { t } from '../i18n.js';

export class HexEditorDialog {
  constructor() {
    this._overlay = null;
    this._data = null;
    this._bytesPerRow = 16;
    this._scrollTop = 0;
    this._rowHeight = 24;
    this._onSave = null;
    this._hasChanges = false;
  }

  /**
   * @param {Uint8Array} data
   * @param {string} filename
   * @param {function(Uint8Array): void} onSave
   */
  show(data, filename, onSave) {
    // Clone data so we don't mutate original until save
    this._data = new Uint8Array(data);
    this._filename = filename;
    this._onSave = onSave;
    this._hasChanges = false;
    this._bytesPerRow = 16;
    this._scrollTop = 0;
    this._buildUI();
    this._renderVirtual();
  }

  hide() {
    if (this._overlay) {
      this._overlay.remove();
      this._overlay = null;
    }
  }

  _buildUI() {
    this._overlay = document.createElement('div');
    this._overlay.className = 'dialog-overlay visible';
    this._overlay.style.zIndex = '10000';

    const dialog = document.createElement('div');
    dialog.className = 'dialog';
    dialog.style.width = '90vw';
    dialog.style.maxWidth = '1000px';
    dialog.style.height = '85vh';
    dialog.style.display = 'flex';
    dialog.style.flexDirection = 'column';
    dialog.style.backgroundColor = 'var(--bg-primary)';

    // Header
    const header = document.createElement('div');
    header.className = 'dialog-header';
    header.style.flexShrink = '0';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    
    const title = document.createElement('h3');
    title.textContent = `Hex Editor - ${this._filename}`;
    title.style.margin = '0';
    
    const controls = document.createElement('div');
    controls.style.display = 'flex';
    controls.style.gap = '10px';

    const widthSelect = document.createElement('select');
    widthSelect.className = 'settings-select';
    widthSelect.style.padding = '4px 8px';
    const opt16 = document.createElement('option');
    opt16.value = '16'; opt16.textContent = '16 bytes/row';
    const opt32 = document.createElement('option');
    opt32.value = '32'; opt32.textContent = '32 bytes/row';
    widthSelect.append(opt16, opt32);
    widthSelect.value = '16';
    widthSelect.addEventListener('change', () => {
      this._bytesPerRow = parseInt(widthSelect.value, 10);
      this._renderVirtual();
    });

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary';
    saveBtn.textContent = 'Apply Changes';
    saveBtn.addEventListener('click', () => {
      if (this._onSave) this._onSave(this._data);
      this.hide();
    });

    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn';
    closeBtn.textContent = '✕';
    closeBtn.title = 'Close without saving';
    closeBtn.addEventListener('click', () => {
      if (this._hasChanges) {
        if (!confirm('Discard changes?')) return;
      }
      this.hide();
    });

    controls.append(widthSelect, saveBtn, closeBtn);
    header.append(title, controls);

    // Body (Virtualized List)
    this._body = document.createElement('div');
    this._body.style.flex = '1';
    this._body.style.overflowY = 'auto';
    this._body.style.position = 'relative';
    this._body.style.fontFamily = "'JetBrains Mono', monospace";
    this._body.style.fontSize = '14px';
    this._body.style.lineHeight = `${this._rowHeight}px`;
    this._body.style.whiteSpace = 'pre';
    this._body.style.backgroundColor = 'var(--bg-secondary)';
    this._body.tabIndex = 0; // Make focusable for keyboard events
    
    this._body.addEventListener('scroll', () => {
      this._scrollTop = this._body.scrollTop;
      this._renderVirtual();
    });

    // Content container (forces scrollbar)
    this._contentHeightEl = document.createElement('div');
    this._body.appendChild(this._contentHeightEl);

    // Visible lines container
    this._linesContainer = document.createElement('div');
    this._linesContainer.style.position = 'absolute';
    this._linesContainer.style.top = '0';
    this._linesContainer.style.left = '0';
    this._linesContainer.style.right = '0';
    this._body.appendChild(this._linesContainer);

    dialog.append(header, this._body);
    this._overlay.appendChild(dialog);
    document.body.appendChild(this._overlay);

    // Keyboard navigation/editing
    this._body.addEventListener('keydown', (e) => this._handleKeydown(e));
    
    // Focus automatically
    setTimeout(() => this._body.focus(), 100);
  }

  _renderVirtual() {
    const totalRows = Math.ceil(this._data.length / this._bytesPerRow);
    this._contentHeightEl.style.height = `${Math.max(totalRows * this._rowHeight, this._rowHeight)}px`;

    const clientHeight = this._body.clientHeight || window.innerHeight * 0.7;
    const startRow = Math.max(0, Math.floor(this._scrollTop / this._rowHeight));
    const endRow = Math.min(totalRows - 1, startRow + Math.ceil(clientHeight / this._rowHeight) + 1);

    this._linesContainer.style.transform = `translateY(${startRow * this._rowHeight}px)`;
    this._linesContainer.innerHTML = '';

    const hexColor = 'var(--text-primary)';
    const offsetColor = 'var(--text-tertiary)';
    const asciiColor = 'var(--string, #40a02b)'; // green-ish

    for (let r = startRow; r <= endRow; r++) {
      const rowDiv = document.createElement('div');
      rowDiv.style.display = 'flex';
      rowDiv.style.padding = '0 10px';

      const offset = r * this._bytesPerRow;
      
      const addrSpan = document.createElement('span');
      addrSpan.style.color = offsetColor;
      addrSpan.style.width = '100px';
      addrSpan.style.userSelect = 'none';
      addrSpan.textContent = offset.toString(16).padStart(8, '0').toUpperCase() + '  ';

      const hexDiv = document.createElement('span');
      hexDiv.style.color = hexColor;
      hexDiv.style.marginRight = '20px';

      const asciiDiv = document.createElement('span');
      asciiDiv.style.color = asciiColor;

      for (let i = 0; i < this._bytesPerRow; i++) {
        const idx = offset + i;
        if (idx < this._data.length) {
          const byte = this._data[idx];
          
          // Hex span
          const hSpan = document.createElement('span');
          hSpan.textContent = byte.toString(16).padStart(2, '0').toUpperCase() + ' ';
          hSpan.style.cursor = 'text';
          hSpan.dataset.idx = idx;
          hSpan.dataset.type = 'hex';
          hSpan.addEventListener('mousedown', (e) => this._focusByte(idx, 'hex', e));
          
          if (i === this._bytesPerRow / 2 - 1) hSpan.textContent += ' '; // mid-row gap
          hexDiv.appendChild(hSpan);

          // ASCII span
          const aSpan = document.createElement('span');
          const char = (byte >= 32 && byte <= 126) ? String.fromCharCode(byte) : '.';
          aSpan.textContent = char;
          aSpan.style.cursor = 'text';
          aSpan.dataset.idx = idx;
          aSpan.dataset.type = 'ascii';
          aSpan.addEventListener('mousedown', (e) => this._focusByte(idx, 'ascii', e));
          asciiDiv.appendChild(aSpan);
        }
      }

      rowDiv.append(addrSpan, hexDiv, asciiDiv);
      this._linesContainer.appendChild(rowDiv);
    }

    this._updateHighlight();
  }

  _focusByte(idx, type, e) {
    if (e) {
      e.preventDefault();
      this._body.focus();
    }
    this._activeIdx = idx;
    this._activeType = type;
    this._hexNibble = 0; // 0 for high nibble, 1 for low nibble
    this._updateHighlight();
  }

  _updateHighlight() {
    const spans = this._linesContainer.querySelectorAll('span[data-idx]');
    spans.forEach(span => {
      span.style.backgroundColor = '';
      span.style.color = '';
    });

    if (this._activeIdx !== undefined) {
      const hexSpan = this._linesContainer.querySelector(`span[data-idx="${this._activeIdx}"][data-type="hex"]`);
      const asciiSpan = this._linesContainer.querySelector(`span[data-idx="${this._activeIdx}"][data-type="ascii"]`);
      
      const activeBg = 'var(--selection-bg, rgba(30,102,245,0.3))';
      const passiveBg = 'rgba(128,128,128,0.2)';

      if (hexSpan) hexSpan.style.backgroundColor = this._activeType === 'hex' ? activeBg : passiveBg;
      if (asciiSpan) asciiSpan.style.backgroundColor = this._activeType === 'ascii' ? activeBg : passiveBg;
    }
  }

  _handleKeydown(e) {
    if (this._activeIdx === undefined) return;
    
    // Navigation
    if (e.key === 'ArrowRight') { this._moveCursor(1); e.preventDefault(); return; }
    if (e.key === 'ArrowLeft') { this._moveCursor(-1); e.preventDefault(); return; }
    if (e.key === 'ArrowDown') { this._moveCursor(this._bytesPerRow); e.preventDefault(); return; }
    if (e.key === 'ArrowUp') { this._moveCursor(-this._bytesPerRow); e.preventDefault(); return; }

    if (e.ctrlKey || e.altKey || e.metaKey) return;

    if (this._activeType === 'hex') {
      const hexChar = e.key.toUpperCase();
      if (/^[0-9A-F]$/.test(hexChar)) {
        const val = parseInt(hexChar, 16);
        let byte = this._data[this._activeIdx];
        if (this._hexNibble === 0) {
          byte = (byte & 0x0F) | (val << 4);
          this._hexNibble = 1;
        } else {
          byte = (byte & 0xF0) | val;
          this._hexNibble = 0;
          this._moveCursor(1);
        }
        this._data[this._activeIdx] = byte;
        this._hasChanges = true;
        this._renderVirtual();
      }
    } else if (this._activeType === 'ascii') {
      if (e.key.length === 1) {
        const code = e.key.charCodeAt(0);
        if (code >= 32 && code <= 126) {
          this._data[this._activeIdx] = code;
          this._hasChanges = true;
          this._moveCursor(1);
          this._renderVirtual();
        }
      }
    }
  }

  _moveCursor(delta) {
    const nextIdx = this._activeIdx + delta;
    if (nextIdx >= 0 && nextIdx < this._data.length) {
      this._activeIdx = nextIdx;
      this._hexNibble = 0;
      
      // Auto-scroll if out of view
      const row = Math.floor(nextIdx / this._bytesPerRow);
      const rowY = row * this._rowHeight;
      if (rowY < this._body.scrollTop) {
        this._body.scrollTop = rowY;
      } else if (rowY + this._rowHeight > this._body.scrollTop + this._body.clientHeight) {
        this._body.scrollTop = rowY + this._rowHeight - this._body.clientHeight;
      }
      
      this._updateHighlight();
    }
  }
}

export const hexEditorDialog = new HexEditorDialog();
