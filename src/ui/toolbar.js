/**
 * @module toolbar
 * Top toolbar for MyPad++ with SVG icon buttons.
 */

// ─── SVG Icon Definitions ────────────────────────────────────────────────────

import { t, i18n } from '../i18n.js';
import { showConfirmDialog } from './dialogs.js';

export const ICONS = {
  newFile: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="12" y1="18" x2="12" y2="12"/>
    <line x1="9" y1="15" x2="15" y2="15"/>
  </svg>`,

  open: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>`,

  save: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </svg>`,

  saveAs: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
    <circle cx="19" cy="5" r="4" fill="var(--toolbar-bg)" stroke="currentColor" stroke-width="1.5"/>
    <line x1="19" y1="3" x2="19" y2="7"/>
    <line x1="17" y1="5" x2="21" y2="5"/>
  </svg>`,

  undo: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="1 4 1 10 7 10"/>
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
  </svg>`,

  redo: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10"/>
  </svg>`,

  wordWrap: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="3" y1="6" x2="21" y2="6"/>
    <path d="M3 12h15a3 3 0 1 1 0 6h-4"/>
    <polyline points="16 16 14 18 16 20"/>
    <line x1="3" y1="18" x2="10" y2="18"/>
  </svg>`,

  zoomIn: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    <line x1="11" y1="8" x2="11" y2="14"/>
    <line x1="8" y1="11" x2="14" y2="11"/>
  </svg>`,

  zoomOut: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    <line x1="8" y1="11" x2="14" y2="11"/>
  </svg>`,

  fullscreen: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
  </svg>`,

  themeDark: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>`,

  themeLight: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>`,

  find: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>`,

  replace: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M8 4h6a4 4 0 0 1 0 8H8"/>
    <path d="M8 4v16"/>
    <path d="M13.5 12L18 20"/>
  </svg>`,

  explorer: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <line x1="9" y1="3" x2="9" y2="21"/>
  </svg>`,

  webdav: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
  </svg>`,

  workspace: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/>
    <rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
    <line x1="6" y1="6" x2="6.01" y2="6"/>
    <line x1="6" y1="18" x2="6.01" y2="18"/>
  </svg>`,

  highlights: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M9 11l-6 6v3h3l6-6"/>
    <path d="M11 9l4-4a2.828 2.828 0 0 1 4 4l-4 4"/>
    <path d="M15 13l-4-4"/>
    <line x1="14" y1="20" x2="21" y2="20"/>
  </svg>`,

  nextError: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>`,

  compare: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <line x1="12" y1="3" x2="12" y2="21"/>
  </svg>`,

  statusBar: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <line x1="3" y1="16" x2="21" y2="16"/>
  </svg>`,

  keyboardOff: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" ry="2"/>
    <path d="M6 8h.001"/>
    <path d="M10 8h.001"/>
    <path d="M14 8h.001"/>
    <path d="M18 8h.001"/>
    <path d="M8 12h.001"/>
    <path d="M12 12h.001"/>
    <path d="M16 12h.001"/>
    <path d="M7 16h10"/>
    <line x1="2" y1="2" x2="22" y2="22"/>
  </svg>`,

  help: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>`,

  language: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    <path d="M2 12h20"/>
    <text id="lang-icon-text" x="12" y="15" text-anchor="middle" font-size="7" font-weight="bold" fill="currentColor" stroke="none">EN</text>
  </svg>`,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Create a toolbar button element.
 * @param {object} opts
 * @param {string} opts.id
 * @param {string} opts.icon - SVG markup
 * @param {string} opts.tooltip
 * @param {Function} opts.onClick
 * @param {boolean} [opts.toggle] - If true, the button supports pressed state
 * @returns {HTMLButtonElement}
 */
function createButton({ id, icon, tooltip, onClick, toggle = false }) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'toolbar-btn';
  btn.id = id;
  btn.title = tooltip;
  btn.setAttribute('aria-label', tooltip);
  btn.innerHTML = icon;

  if (toggle) {
    btn.setAttribute('aria-pressed', 'false');
    btn.dataset.toggle = 'true';
  }

  btn.addEventListener('mousedown', (e) => {
    e.preventDefault(); // Prevent editor from losing focus and selection on touch/click
  });

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    if (toggle) {
      const pressed = btn.getAttribute('aria-pressed') === 'true';
      btn.setAttribute('aria-pressed', String(!pressed));
      btn.classList.toggle('toolbar-btn--active', !pressed);
    }
    if (typeof onClick === 'function') onClick(e);
  });

  return btn;
}

/**
 * Create a visual divider between button groups.
 * @returns {HTMLSpanElement}
 */
function createDivider() {
  const div = document.createElement('span');
  div.className = 'toolbar-divider';
  div.setAttribute('role', 'separator');
  div.setAttribute('aria-orientation', 'vertical');
  return div;
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Create the application toolbar.
 *
 * @param {object} callbacks - Click handlers for each toolbar action.
 * @param {Function} [callbacks.onNew]         - New file
 * @param {Function} [callbacks.onOpen]        - Open file
 * @param {Function} [callbacks.onSave]        - Save file
 * @param {Function} [callbacks.onSaveAs]      - Save As
 * @param {Function} [callbacks.onUndo]        - Undo
 * @param {Function} [callbacks.onRedo]        - Redo
 * @param {Function} [callbacks.onWordWrap]    - Toggle word wrap
 * @param {Function} [callbacks.onZoomIn]      - Zoom in
 * @param {Function} [callbacks.onZoomOut]     - Zoom out
 * @param {Function} [callbacks.onThemeToggle] - Toggle dark/light theme
 * @param {Function} [callbacks.onFind]        - Open find panel
 * @param {Function} [callbacks.onReplace]     - Open replace panel
 * @param {Function} [callbacks.onNextError]   - Jump to next error
 * @param {Function} [callbacks.onCompare]     - Compare tabs
 * @param {Function} [callbacks.onWebDAV]      - Open WebDAV dialog
 * @param {Function} [callbacks.onHelp]        - Open Help dialog
 * @returns {HTMLElement} The toolbar DOM element.
 */
export function createToolbar(callbacks = {}) {
  const toolbar = document.createElement('div');
  toolbar.className = 'toolbar';
  toolbar.id = 'toolbar';
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', 'Main toolbar');

  // Track theme state internally for icon swapping
  let isDark = false;
  const themeBtn = createButton({
    id: 'btn-theme-toggle',
    icon: ICONS.themeDark,
    tooltip: t('Toggle Dark Theme'),
    onClick: () => {
      isDark = !isDark;
      themeBtn.innerHTML = isDark ? ICONS.themeLight : ICONS.themeDark;
      themeBtn.title = isDark ? t('Toggle Light Theme') : t('Toggle Dark Theme');
      themeBtn.setAttribute('aria-label', themeBtn.title);
      if (typeof callbacks.onThemeToggle === 'function') callbacks.onThemeToggle(isDark);
    },
  });

  // ── File group ──────────────────────────────────────────────────────────
  const fileGroup = [
    createButton({ id: 'btn-new', icon: ICONS.newFile, tooltip: t('New File'), onClick: callbacks.onNew }),
    createButton({ id: 'btn-open', icon: ICONS.open, tooltip: t('Open'), onClick: callbacks.onOpen }),
    createButton({ id: 'btn-save', icon: ICONS.save, tooltip: t('Save'), onClick: callbacks.onSave }),
    createButton({ id: 'btn-save-as', icon: ICONS.saveAs, tooltip: t('Save As'), onClick: callbacks.onSaveAs }),
  ];

  // ── Edit group ──────────────────────────────────────────────────────────
  const editGroup = [
    createButton({ id: 'btn-undo', icon: ICONS.undo, tooltip: t('Undo'), onClick: callbacks.onUndo }),
    createButton({ id: 'btn-redo', icon: ICONS.redo, tooltip: t('Redo'), onClick: callbacks.onRedo }),
  ];

  // ── View group ──────────────────────────────────────────────────────────
  const viewGroup = [
    createButton({ id: 'btn-word-wrap', icon: ICONS.wordWrap, tooltip: t('Toggle Word Wrap'), onClick: callbacks.onWordWrap, toggle: true }),
    createButton({ id: 'btn-status-bar', icon: ICONS.statusBar, tooltip: t('Toggle Status Bar'), onClick: callbacks.onToggleStatusBar, toggle: true }),
    createButton({ id: 'btn-keyboard', icon: ICONS.keyboardOff, tooltip: t('Toggle Virtual Keyboard Block'), onClick: callbacks.onToggleKeyboard, toggle: true }),
    createButton({ id: 'btn-fullscreen', icon: ICONS.fullscreen, tooltip: t('Toggle Fullscreen'), onClick: callbacks.onFullscreen, toggle: true }),
    createButton({ id: 'btn-zoom-in', icon: ICONS.zoomIn, tooltip: t('Toggle Zoom In'), onClick: callbacks.onZoomIn }),
    createButton({ id: 'btn-zoom-out', icon: ICONS.zoomOut, tooltip: t('Toggle Zoom Out'), onClick: callbacks.onZoomOut }),
    themeBtn,
  ];

  // ── Tools group ─────────────────────────────────────────────────────────
  const toolsGroup = [
    createButton({ id: 'btn-explorer', icon: ICONS.explorer, tooltip: t('File Explorer'), onClick: callbacks.onExplorer, toggle: true }),
    createButton({ id: 'btn-find', icon: ICONS.find, tooltip: t('Find'), onClick: callbacks.onFind }),
    createButton({ id: 'btn-replace', icon: ICONS.replace, tooltip: t('Replace'), onClick: callbacks.onReplace }),
    createButton({ id: 'btn-next-error', icon: ICONS.nextError, tooltip: t('Next Error / Warning'), onClick: callbacks.onNextError }),
    createButton({ id: 'btn-compare', icon: ICONS.compare, tooltip: t('Compare with...'), onClick: callbacks.onCompare }),
    createButton({ id: 'btn-webdav', icon: ICONS.webdav, tooltip: t('WebDAV'), onClick: callbacks.onWebDAV }),
    createButton({ id: 'btn-workspace', icon: ICONS.workspace, tooltip: t('Server Workspace'), onClick: callbacks.onWorkspace }),
    createButton({ id: 'btn-highlights', icon: ICONS.highlights, tooltip: t('Toggle Highlight Mode'), onClick: callbacks.onCustomHighlights }),
    createButton({ id: 'btn-help', icon: ICONS.help, tooltip: 'Help', onClick: callbacks.onHelp }),
    createButton({
      id: 'btn-language',
      icon: ICONS.language,
      tooltip: t('Switch Language'),
      onClick: () => {
        const targetLang = i18n.lang === 'en' ? '中文' : 'English';
        showConfirmDialog(
          t('Switch Language'),
          t('Are you sure you want to switch language to {lang}? This will reload the page.', { lang: targetLang }),
          () => {
            const newLang = i18n.toggle();
            const langName = newLang === 'zh' ? '中文' : 'English';
            sessionStorage.setItem('mypad_lang_toast', langName);
            location.reload();
          }
        );
      }
    }),
  ];

  // ── Assemble ────────────────────────────────────────────────────────────
  const groups = [fileGroup, editGroup, viewGroup, toolsGroup];
  groups.forEach((group, i) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'toolbar-group';
    group.forEach((btn) => wrapper.appendChild(btn));
    toolbar.appendChild(wrapper);
    if (i < groups.length - 1) {
      toolbar.appendChild(createDivider());
    }
  });

  // ── Keyboard navigation (arrow keys within toolbar) ─────────────────────
  const focusableSelector = '.toolbar-btn';

  toolbar.addEventListener('keydown', (e) => {
    const buttons = Array.from(toolbar.querySelectorAll(focusableSelector));
    const idx = buttons.indexOf(document.activeElement);
    if (idx === -1) return;

    let next = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      next = (idx + 1) % buttons.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      next = (idx - 1 + buttons.length) % buttons.length;
    } else if (e.key === 'Home') {
      next = 0;
    } else if (e.key === 'End') {
      next = buttons.length - 1;
    }

    if (next !== -1) {
      e.preventDefault();
      buttons[next].focus();
    }
  });

  const langText = i18n.lang === 'en' ? 'CN' : 'EN';
  const textEl = toolbar.querySelector('#lang-icon-text');
  if (textEl) textEl.textContent = langText;

  return toolbar;
}
