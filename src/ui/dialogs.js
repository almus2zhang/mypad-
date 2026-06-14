/**
 * @module dialogs
 * Modal dialog system for MyPad++.
 */

import { LANGUAGE_LIST } from '../editor/languages.js';

// ─── Encoding data ───────────────────────────────────────────────────────────

const ENCODING_GROUPS = {
  Unicode: ['UTF-8', 'UTF-16 LE', 'UTF-16 BE', 'UTF-32 LE', 'UTF-32 BE'],
  Chinese: ['GB2312', 'GBK', 'GB18030', 'Big5', 'EUC-TW', 'HZ'],
  Japanese: ['Shift_JIS', 'EUC-JP', 'ISO-2022-JP', 'CP932'],
  Korean: ['EUC-KR', 'ISO-2022-KR', 'CP949'],
  Western: [
    'Windows-1252', 'ISO-8859-1', 'ISO-8859-15', 'Macintosh',
    'Windows-1250', 'ISO-8859-2',
    'Windows-1251', 'ISO-8859-5', 'KOI8-R', 'KOI8-U',
    'Windows-1253', 'ISO-8859-7',
    'Windows-1254', 'ISO-8859-9',
    'Windows-1255', 'ISO-8859-8',
    'Windows-1256', 'ISO-8859-6',
    'Windows-1257', 'ISO-8859-13',
    'Windows-1258',
    'ISO-8859-3', 'ISO-8859-4', 'ISO-8859-10', 'ISO-8859-14', 'ISO-8859-16',
    'TIS-620',
  ],
};

// ─── Dialog infrastructure ───────────────────────────────────────────────────

/**
 * Create the dialog backdrop + container, wire up Escape, focus trap, and animations.
 * @param {object} opts
 * @param {string} opts.className - Additional CSS class for the dialog box.
 * @param {string} [opts.ariaLabel]
 * @param {Function} [opts.onClose] - Called when dialog is dismissed.
 * @returns {{ overlay: HTMLElement, dialog: HTMLElement, close: () => void }}
 */
function createDialogBase({ className, ariaLabel, onClose }) {
  const overlay = document.createElement('div');
  overlay.className = 'dialog-overlay';

  const dialog = document.createElement('div');
  dialog.className = `dialog ${className}`;
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  if (ariaLabel) dialog.setAttribute('aria-label', ariaLabel);
  dialog.tabIndex = -1;

  overlay.appendChild(dialog);

  function close() {
    overlay.classList.add('dialog-overlay--closing');
    dialog.classList.add('dialog--closing');
    const onEnd = () => {
      overlay.remove();
      overlay.removeEventListener('animationend', onEnd);
    };
    overlay.addEventListener('animationend', onEnd);
    // Fallback
    setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 300);
    document.removeEventListener('keydown', onKeyDown);
    if (typeof onClose === 'function') onClose();
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close();
    }
    // Focus trap
    if (e.key === 'Tab') {
      const focusable = dialog.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  // Close on backdrop click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  document.addEventListener('keydown', onKeyDown);
  document.body.appendChild(overlay);

  // Trigger the appear animation on next frame
  requestAnimationFrame(() => {
    overlay.classList.add('visible');

    const firstFocusable = dialog.querySelector(
      'input:not([disabled]), button:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (firstFocusable) {
      firstFocusable.focus();
    } else {
      dialog.focus();
    }
  });

  return { overlay, dialog, close };
}

/**
 * Create a dialog header with title and close button.
 * @param {string} titleText
 * @param {Function} onClose
 * @returns {HTMLElement}
 */
function createDialogHeader(titleText, onClose) {
  const header = document.createElement('div');
  header.className = 'dialog-header';

  const title = document.createElement('h2');
  title.className = 'dialog-title';
  title.textContent = titleText;

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'dialog-close-btn';
  closeBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>`;
  closeBtn.title = 'Close';
  closeBtn.setAttribute('aria-label', 'Close dialog');
  closeBtn.addEventListener('click', onClose);

  header.appendChild(title);
  header.appendChild(closeBtn);
  return header;
}

/**
 * Create a standard footer with action buttons.
 * @param {Array<{label: string, className?: string, onClick: Function}>} buttons
 * @returns {HTMLElement}
 */
function createDialogFooter(buttons) {
  const footer = document.createElement('div');
  footer.className = 'dialog-footer';

  buttons.forEach(({ label, className, onClick }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `dialog-btn ${className || ''}`.trim();
    btn.textContent = label;
    btn.addEventListener('click', onClick);
    footer.appendChild(btn);
  });

  return footer;
}

// ─── Dialog exports ──────────────────────────────────────────────────────────

/**
 * Show a dialog to select an open tab for comparison.
 *
 * @param {Array<{id: string, filename: string}>} tabs - List of open tabs.
 * @param {(selectedId: string) => void} onSelect - Callback when a tab is selected.
 */
export function showCompareSelectorDialog(tabs, onSelect) {
  const { dialog, close } = createDialogBase({
    className: 'dialog-encoding-picker', // Reuse grid styling
    ariaLabel: 'Select Tab to Compare',
    onClose: () => {},
  });

  dialog.appendChild(createDialogHeader('Compare with...', close));

  const body = document.createElement('div');
  body.className = 'dialog-body dialog-encoding-body';

  const section = document.createElement('div');
  section.className = 'dialog-encoding-section';

  const grid = document.createElement('div');
  grid.className = 'dialog-encoding-grid';

  if (tabs.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.textContent = 'No other tabs open to compare with.';
    emptyMsg.style.padding = 'var(--space-4)';
    emptyMsg.style.color = 'var(--text-secondary)';
    section.appendChild(emptyMsg);
  } else {
    tabs.forEach((tab) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'dialog-encoding-item';
      btn.textContent = tab.webdavPath || tab.filePath || tab.filename || 'Untitled';
      btn.title = btn.textContent;
      btn.style.whiteSpace = 'nowrap';
      btn.style.overflow = 'hidden';
      btn.style.textOverflow = 'ellipsis';
      btn.addEventListener('click', () => {
        if (typeof onSelect === 'function') onSelect(tab.id);
        close();
      });
      grid.appendChild(btn);
    });
    section.appendChild(grid);
  }

  body.appendChild(section);
  dialog.appendChild(body);

  return { close };
}

/**
 * Show a language picker dialog.
 *
 * @param {string} currentLanguage - The currently active language name.
 * @param {(languageName: string) => void} onSelect - Called with the chosen language name.
 */
export function showLanguagePicker(currentLanguage, onSelect) {
  const { dialog, close } = createDialogBase({
    className: 'dialog-encoding-picker', // Reuse encoding picker styles
    ariaLabel: 'Select Language Mode',
    onClose: () => {},
  });

  dialog.appendChild(createDialogHeader('Language Mode', close));

  // Search box
  const searchWrap = document.createElement('div');
  searchWrap.className = 'dialog-search-wrap';

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'dialog-search-input';
  searchInput.placeholder = 'Search languages…';
  searchInput.setAttribute('aria-label', 'Search languages');
  searchWrap.appendChild(searchInput);
  dialog.appendChild(searchWrap);

  // Grid body
  const body = document.createElement('div');
  body.className = 'dialog-body dialog-encoding-body';

  const section = document.createElement('div');
  section.className = 'dialog-encoding-section';

  const grid = document.createElement('div');
  grid.className = 'dialog-encoding-grid';

  // Add Plain Text first
  const languages = [{ name: 'Plain Text' }, ...LANGUAGE_LIST];

  languages.forEach((lang) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dialog-encoding-item';
    if (lang.name.toUpperCase() === (currentLanguage || '').toUpperCase()) {
      btn.classList.add('dialog-encoding-item--active');
    }
    btn.textContent = lang.name;
    btn.setAttribute('aria-label', lang.name);
    btn.addEventListener('click', () => {
      if (typeof onSelect === 'function') onSelect(lang.name);
      close();
    });
    grid.appendChild(btn);
  });

  section.appendChild(grid);
  body.appendChild(section);
  dialog.appendChild(body);

  // Search filter
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase().trim();
    const items = grid.querySelectorAll('.dialog-encoding-item');
    items.forEach((btn) => {
      const match = btn.textContent.toLowerCase().includes(query);
      btn.style.display = match ? '' : 'none';
    });
  });

  return { close };
}

/**
 * Show an encoding picker dialog.
 *
 * @param {string} currentEncoding - The currently active encoding.
 * @param {(encoding: string) => void} onSelect - Called with the chosen encoding.
 */
export function showEncodingPicker(currentEncoding, onSelect) {
  const { dialog, close } = createDialogBase({
    className: 'dialog-encoding-picker',
    ariaLabel: 'Select File Encoding',
    onClose: () => {},
  });

  dialog.appendChild(createDialogHeader('File Encoding', close));

  // Search box
  const searchWrap = document.createElement('div');
  searchWrap.className = 'dialog-search-wrap';

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'dialog-search-input';
  searchInput.placeholder = 'Search encodings…';
  searchInput.setAttribute('aria-label', 'Search encodings');
  searchWrap.appendChild(searchInput);
  dialog.appendChild(searchWrap);

  // Grid body
  const body = document.createElement('div');
  body.className = 'dialog-body dialog-encoding-body';

  /** @type {Map<string, HTMLElement>} */
  const itemElements = new Map();

  Object.entries(ENCODING_GROUPS).forEach(([category, encodings]) => {
    const section = document.createElement('div');
    section.className = 'dialog-encoding-section';
    section.dataset.category = category;

    const catTitle = document.createElement('h3');
    catTitle.className = 'dialog-encoding-category';
    catTitle.textContent = category;
    section.appendChild(catTitle);

    const grid = document.createElement('div');
    grid.className = 'dialog-encoding-grid';

    encodings.forEach((enc) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'dialog-encoding-item';
      if (enc.toUpperCase() === (currentEncoding || '').toUpperCase()) {
        btn.classList.add('dialog-encoding-item--active');
      }
      btn.textContent = enc;
      btn.setAttribute('aria-label', enc);
      btn.addEventListener('click', () => {
        if (typeof onSelect === 'function') onSelect(enc);
        close();
      });
      grid.appendChild(btn);
      itemElements.set(enc.toLowerCase(), btn);
    });

    section.appendChild(grid);
    body.appendChild(section);
  });

  dialog.appendChild(body);

  // Search filter
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase().trim();
    body.querySelectorAll('.dialog-encoding-section').forEach((section) => {
      const items = section.querySelectorAll('.dialog-encoding-item');
      let anyVisible = false;
      items.forEach((btn) => {
        const match = btn.textContent.toLowerCase().includes(query);
        btn.style.display = match ? '' : 'none';
        if (match) anyVisible = true;
      });
      section.style.display = anyVisible ? '' : 'none';
    });
  });
}

/**
 * Show a Go To Line dialog.
 *
 * @param {number} maxLine - Maximum valid line number.
 * @param {(line: number) => void} onGo - Called with the target line number.
 */
export function showGoToLineDialog(maxLine, onGo) {
  const { dialog, close } = createDialogBase({
    className: 'dialog-goto-line',
    ariaLabel: 'Go to Line',
    onClose: () => {},
  });

  dialog.appendChild(createDialogHeader('Go to Line', close));

  const body = document.createElement('div');
  body.className = 'dialog-body';

  const label = document.createElement('label');
  label.className = 'dialog-label';
  label.textContent = `Enter line number (1–${maxLine}):`;

  const input = document.createElement('input');
  input.type = 'number';
  input.className = 'dialog-input';
  input.min = '1';
  input.max = String(maxLine);
  input.placeholder = 'Line number';
  input.setAttribute('aria-label', 'Line number');
  label.htmlFor = 'goto-line-input';
  input.id = 'goto-line-input';

  body.appendChild(label);
  body.appendChild(input);
  dialog.appendChild(body);

  function handleGo() {
    const val = parseInt(input.value, 10);
    if (isNaN(val) || val < 1 || val > maxLine) {
      input.classList.add('dialog-input--error');
      input.focus();
      return;
    }
    if (typeof onGo === 'function') onGo(val);
    close();
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleGo();
    }
  });

  input.addEventListener('input', () => {
    input.classList.remove('dialog-input--error');
  });

  dialog.appendChild(createDialogFooter([
    { label: 'Cancel', className: 'dialog-btn--secondary', onClick: close },
    { label: 'Go', className: 'dialog-btn--primary', onClick: handleGo },
  ]));
}

/**
 * Show a Save Confirmation dialog.
 *
 * @param {string} filename - The file being closed/switched.
 * @param {Function} onSave - Called when user clicks "Save".
 * @param {Function} onDiscard - Called when user clicks "Don't Save".
 * @param {Function} onCancel - Called when user cancels.
 */
export function showSaveConfirmDialog(filename, onSave, onDiscard, onCancel) {
  const { dialog, close } = createDialogBase({
    className: 'dialog-save-confirm',
    ariaLabel: 'Save Changes',
    onClose: () => { if (typeof onCancel === 'function') onCancel(); },
  });

  dialog.appendChild(createDialogHeader('Save Changes', close));

  const body = document.createElement('div');
  body.className = 'dialog-body';

  const icon = document.createElement('div');
  icon.className = 'dialog-save-icon';
  icon.innerHTML = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>`;

  const msg = document.createElement('p');
  msg.className = 'dialog-message';
  msg.textContent = `Do you want to save changes to "${filename}"?`;

  const hint = document.createElement('p');
  hint.className = 'dialog-message-hint';
  hint.textContent = 'Your changes will be lost if you don\'t save them.';

  body.appendChild(icon);
  body.appendChild(msg);
  body.appendChild(hint);
  dialog.appendChild(body);

  const footer = createDialogFooter([
    {
      label: 'Yes',
      className: 'dialog-btn--primary',
      onClick: () => { close(); if (typeof onSave === 'function') onSave(); },
    },
    {
      label: 'No',
      className: 'dialog-btn--danger',
      onClick: () => { close(); if (typeof onDiscard === 'function') onDiscard(); },
    },
    {
      label: 'Cancel',
      className: 'dialog-btn--secondary',
      onClick: () => { close(); if (typeof onCancel === 'function') onCancel(); },
    },
  ]);
  
  // Center the buttons for this specific dialog
  footer.style.justifyContent = 'center';
  
  dialog.appendChild(footer);
}

/**
 * Show a WebDAV Connect dialog.
 *
 * @param {(config: {url: string, username: string, password: string, remember: boolean}) => void} onConnect
 */
export function showWebDAVConnectDialog(onConnect) {
  const { dialog, close } = createDialogBase({
    className: 'dialog-webdav',
    ariaLabel: 'Connect to WebDAV',
    onClose: () => {},
  });

  dialog.appendChild(createDialogHeader('Connect to WebDAV', close));

  const body = document.createElement('div');
  body.className = 'dialog-body';

  // URL
  const urlLabel = document.createElement('label');
  urlLabel.className = 'dialog-label';
  urlLabel.textContent = 'Server URL';
  urlLabel.htmlFor = 'webdav-url';

  const urlInput = document.createElement('input');
  urlInput.type = 'url';
  urlInput.id = 'webdav-url';
  urlInput.className = 'dialog-input';
  urlInput.placeholder = 'https://example.com/dav/';
  urlInput.setAttribute('aria-label', 'WebDAV server URL');

  // Username
  const userLabel = document.createElement('label');
  userLabel.className = 'dialog-label';
  userLabel.textContent = 'Username';
  userLabel.htmlFor = 'webdav-user';

  const userInput = document.createElement('input');
  userInput.type = 'text';
  userInput.id = 'webdav-user';
  userInput.className = 'dialog-input';
  userInput.placeholder = 'Username';
  userInput.setAttribute('aria-label', 'Username');
  userInput.autocomplete = 'username';

  // Password
  const passLabel = document.createElement('label');
  passLabel.className = 'dialog-label';
  passLabel.textContent = 'Password';
  passLabel.htmlFor = 'webdav-pass';

  const passInput = document.createElement('input');
  passInput.type = 'password';
  passInput.id = 'webdav-pass';
  passInput.className = 'dialog-input';
  passInput.placeholder = 'Password';
  passInput.setAttribute('aria-label', 'Password');
  passInput.autocomplete = 'current-password';

  // Remember checkbox
  const rememberWrap = document.createElement('label');
  rememberWrap.className = 'dialog-checkbox-label';

  const rememberCheck = document.createElement('input');
  rememberCheck.type = 'checkbox';
  rememberCheck.id = 'webdav-remember';
  rememberCheck.className = 'dialog-checkbox';

  const rememberText = document.createElement('span');
  rememberText.textContent = 'Remember credentials';

  rememberWrap.appendChild(rememberCheck);
  rememberWrap.appendChild(rememberText);

  body.appendChild(urlLabel);
  body.appendChild(urlInput);
  body.appendChild(userLabel);
  body.appendChild(userInput);
  body.appendChild(passLabel);
  body.appendChild(passInput);
  body.appendChild(rememberWrap);
  dialog.appendChild(body);

  function handleConnect() {
    const url = urlInput.value.trim();
    if (!url) {
      urlInput.classList.add('dialog-input--error');
      urlInput.focus();
      return;
    }
    if (typeof onConnect === 'function') {
      onConnect({
        url,
        username: userInput.value,
        password: passInput.value,
        remember: rememberCheck.checked,
      });
    }
    close();
  }

  // Enter to submit from any input
  [urlInput, userInput, passInput].forEach((inp) => {
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleConnect();
      }
    });
    inp.addEventListener('input', () => {
      inp.classList.remove('dialog-input--error');
    });
  });

  dialog.appendChild(createDialogFooter([
    { label: 'Cancel', className: 'dialog-btn--secondary', onClick: close },
    { label: 'Connect', className: 'dialog-btn--primary', onClick: handleConnect },
  ]));
}

/**
 * Show the Settings dialog.
 *
 * @param {object} settings - Current settings values.
 * @param {number} [settings.tabSize] - Tab size (2, 4, or 8).
 * @param {number} [settings.fontSize] - Font size in px.
 * @param {boolean} [settings.wordWrap] - Word wrap enabled.
 * @param {boolean} [settings.showInvisibles] - Show invisible characters.
 * @param {boolean} [settings.autoSave] - Auto-save enabled.
 * @param {(settings: object) => void} onSave - Called with updated settings.
 */
export function showSettingsDialog(settings = {}, onSave) {
  const current = {
    tabSize: settings.tabSize ?? 4,
    fontSize: settings.fontSize ?? 14,
    wordWrap: settings.wordWrap ?? false,
    showInvisibles: settings.showInvisibles ?? false,
    autoSave: settings.autoSave ?? false,
  };

  const { dialog, close } = createDialogBase({
    className: 'dialog-settings',
    ariaLabel: 'Settings',
    onClose: () => {},
  });

  dialog.appendChild(createDialogHeader('Settings', close));

  const body = document.createElement('div');
  body.className = 'dialog-body dialog-settings-body';

  // ── Tab Size ────────────────────────────────────────────────────────────
  const tabSizeRow = createSettingRow('Tab Size');
  const tabSizeGroup = document.createElement('div');
  tabSizeGroup.className = 'dialog-btn-group';

  [2, 4, 8].forEach((size) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dialog-btn-group-item';
    if (current.tabSize === size) btn.classList.add('dialog-btn-group-item--active');
    btn.textContent = String(size);
    btn.addEventListener('click', () => {
      current.tabSize = size;
      tabSizeGroup.querySelectorAll('.dialog-btn-group-item').forEach((b) =>
        b.classList.remove('dialog-btn-group-item--active')
      );
      btn.classList.add('dialog-btn-group-item--active');
    });
    tabSizeGroup.appendChild(btn);
  });

  tabSizeRow.appendChild(tabSizeGroup);
  body.appendChild(tabSizeRow);

  // ── Font Size ───────────────────────────────────────────────────────────
  const fontSizeRow = createSettingRow('Font Size');
  const fontSizeWrap = document.createElement('div');
  fontSizeWrap.className = 'dialog-slider-wrap';

  const fontSizeSlider = document.createElement('input');
  fontSizeSlider.type = 'range';
  fontSizeSlider.className = 'dialog-slider';
  fontSizeSlider.min = '10';
  fontSizeSlider.max = '32';
  fontSizeSlider.step = '1';
  fontSizeSlider.value = String(current.fontSize);
  fontSizeSlider.setAttribute('aria-label', 'Font size');

  const fontSizeValue = document.createElement('span');
  fontSizeValue.className = 'dialog-slider-value';
  fontSizeValue.textContent = `${current.fontSize}px`;

  fontSizeSlider.addEventListener('input', () => {
    current.fontSize = parseInt(fontSizeSlider.value, 10);
    fontSizeValue.textContent = `${current.fontSize}px`;
  });

  fontSizeWrap.appendChild(fontSizeSlider);
  fontSizeWrap.appendChild(fontSizeValue);
  fontSizeRow.appendChild(fontSizeWrap);
  body.appendChild(fontSizeRow);

  // ── Toggle settings ─────────────────────────────────────────────────────
  body.appendChild(createToggleRow('Word Wrap', current.wordWrap, (val) => { current.wordWrap = val; }));
  body.appendChild(createToggleRow('Show Invisibles', current.showInvisibles, (val) => { current.showInvisibles = val; }));
  body.appendChild(createToggleRow('Auto Save', current.autoSave, (val) => { current.autoSave = val; }));

  dialog.appendChild(body);

  dialog.appendChild(createDialogFooter([
    { label: 'Cancel', className: 'dialog-btn--secondary', onClick: close },
    {
      label: 'Save',
      className: 'dialog-btn--primary',
      onClick: () => {
        if (typeof onSave === 'function') onSave({ ...current });
        close();
      },
    },
  ]));
}

// ─── Setting row helpers ─────────────────────────────────────────────────────

/**
 * Create a settings row with label.
 * @param {string} labelText
 * @returns {HTMLElement}
 */
function createSettingRow(labelText) {
  const row = document.createElement('div');
  row.className = 'dialog-setting-row';

  const label = document.createElement('label');
  label.className = 'dialog-setting-label';
  label.textContent = labelText;
  row.appendChild(label);

  return row;
}

/**
 * Create a toggle switch row.
 * @param {string} labelText
 * @param {boolean} initialValue
 * @param {(value: boolean) => void} onChange
 * @returns {HTMLElement}
 */
function createToggleRow(labelText, initialValue, onChange) {
  const row = document.createElement('div');
  row.className = 'dialog-setting-row';

  const label = document.createElement('label');
  label.className = 'dialog-setting-label';
  label.textContent = labelText;

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'dialog-toggle';
  toggle.setAttribute('role', 'switch');
  toggle.setAttribute('aria-checked', String(initialValue));
  toggle.setAttribute('aria-label', labelText);
  if (initialValue) toggle.classList.add('dialog-toggle--on');

  const knob = document.createElement('span');
  knob.className = 'dialog-toggle-knob';
  toggle.appendChild(knob);

  toggle.addEventListener('click', () => {
    const isOn = toggle.getAttribute('aria-checked') === 'true';
    toggle.setAttribute('aria-checked', String(!isOn));
    toggle.classList.toggle('dialog-toggle--on', !isOn);
    if (typeof onChange === 'function') onChange(!isOn);
  });

  row.appendChild(label);
  row.appendChild(toggle);

  return row;
}
