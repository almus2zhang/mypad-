/**
 * @module sidebar
 * Slide-in sidebar for MyPad++ showing open and recent files.
 */

import { t } from '../i18n.js';

// ─── Language icon mapping ───────────────────────────────────────────────────

/**
 * Minimal SVG icons for common languages/file types.
 * Returns an inline SVG string based on language name.
 * @param {string} lang
 * @returns {string} SVG markup
 */
function getLanguageIcon(lang) {
  const name = (lang || '').toLowerCase();
  const color = LANG_COLORS[name] || 'var(--sidebar-icon-default)';
  return `<svg class="sidebar-file-icon" width="16" height="16" viewBox="0 0 16 16">
    <rect x="2" y="1" width="12" height="14" rx="1.5" fill="none" stroke="${color}" stroke-width="1.2"/>
    <line x1="5" y1="5" x2="11" y2="5" stroke="${color}" stroke-width="1" stroke-linecap="round"/>
    <line x1="5" y1="8" x2="9" y2="8" stroke="${color}" stroke-width="1" stroke-linecap="round"/>
    <line x1="5" y1="11" x2="10" y2="11" stroke="${color}" stroke-width="1" stroke-linecap="round"/>
  </svg>`;
}

const LANG_COLORS = {
  javascript: '#f1e05a',
  typescript: '#3178c6',
  python: '#3572A5',
  html: '#e34c26',
  css: '#563d7c',
  json: '#a8a8a8',
  markdown: '#083fa1',
  java: '#b07219',
  c: '#555555',
  cpp: '#f34b7d',
  'c++': '#f34b7d',
  rust: '#dea584',
  go: '#00ADD8',
  ruby: '#701516',
  php: '#4F5D95',
  xml: '#0060ac',
  yaml: '#cb171e',
  sql: '#e38c00',
  shell: '#89e051',
  bash: '#89e051',
};

// ─── Close icon SVG ──────────────────────────────────────────────────────────

const CLOSE_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <line x1="18" y1="6" x2="6" y2="18"/>
  <line x1="6" y1="6" x2="18" y2="18"/>
</svg>`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extract filename from a full path.
 * @param {string} path
 * @returns {string}
 */
function basename(path) {
  if (!path) return t('Untitled');
  return path.replace(/\\/g, '/').split('/').pop() || t('Untitled');
}

/**
 * Create a file list item.
 * @param {object} file
 * @param {string} file.name
 * @param {string} [file.path]
 * @param {string} [file.language]
 * @param {boolean} [file.modified]
 * @param {boolean} [file.active]
 * @param {Function} onClick
 * @returns {HTMLElement}
 */
function createFileItem(file, onClick) {
  const item = document.createElement('button');
  item.type = 'button';
  item.className = 'sidebar-file-item';
  if (file.active) item.classList.add('sidebar-file-item--active');
  if (file.modified) item.classList.add('sidebar-file-item--modified');
  item.title = file.path || file.name;

  const iconSpan = document.createElement('span');
  iconSpan.className = 'sidebar-file-item-icon';
  iconSpan.innerHTML = getLanguageIcon(file.language);

  const nameSpan = document.createElement('span');
  nameSpan.className = 'sidebar-file-item-name';
  nameSpan.textContent = file.name;

  if (file.modified) {
    const dot = document.createElement('span');
    dot.className = 'sidebar-file-modified-dot';
    dot.textContent = '●';
    dot.title = t('Unsaved changes');
    nameSpan.appendChild(dot);
  }

  item.appendChild(iconSpan);
  item.appendChild(nameSpan);

  if (file.path) {
    const pathSpan = document.createElement('span');
    pathSpan.className = 'sidebar-file-item-path';
    pathSpan.textContent = file.path;
    item.appendChild(pathSpan);
  }

  item.addEventListener('click', () => {
    if (typeof onClick === 'function') onClick(file);
  });

  return item;
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Create the application sidebar.
 *
 * @returns {object} Sidebar controller.
 * @property {HTMLElement} element - Root element (includes overlay + panel).
 * @property {Function} show - Slide open the sidebar.
 * @property {Function} hide - Slide closed the sidebar.
 * @property {Function} toggle - Toggle open/closed.
 * @property {Function} updateOpenFiles - Update the open-files list.
 * @property {Function} updateRecentFiles - Update the recent-files list.
 */
export function createSidebar() {
  // ── Root wrapper ────────────────────────────────────────────────────────
  const root = document.createElement('div');
  root.className = 'sidebar-root';
  root.id = 'sidebar-root';

  // ── Backdrop ────────────────────────────────────────────────────────────
  const backdrop = document.createElement('div');
  backdrop.className = 'sidebar-backdrop';
  backdrop.setAttribute('aria-hidden', 'true');

  // ── Panel ───────────────────────────────────────────────────────────────
  const panel = document.createElement('aside');
  panel.className = 'sidebar-panel';
  panel.setAttribute('role', 'complementary');
  panel.setAttribute('aria-label', 'File sidebar');

  // Header
  const header = document.createElement('div');
  header.className = 'sidebar-header';

  const title = document.createElement('h2');
  title.className = 'sidebar-title';
  title.textContent = 'MyPad++';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'sidebar-close-btn';
  closeBtn.innerHTML = CLOSE_ICON;
  closeBtn.title = t('Close Sidebar');
  closeBtn.setAttribute('aria-label', t('Close Sidebar'));

  header.appendChild(title);
  header.appendChild(closeBtn);

  // ── Open Files section ──────────────────────────────────────────────────
  const openSection = document.createElement('section');
  openSection.className = 'sidebar-section';

  const openHeader = document.createElement('h3');
  openHeader.className = 'sidebar-section-title';
  openHeader.textContent = t('Open Files');

  const openList = document.createElement('div');
  openList.className = 'sidebar-file-list';
  openList.id = 'sidebar-open-files';

  const openEmpty = document.createElement('p');
  openEmpty.className = 'sidebar-empty';
  openEmpty.textContent = t('No files open');

  openList.appendChild(openEmpty);
  openSection.appendChild(openHeader);
  openSection.appendChild(openList);

  // ── Recent Files section ────────────────────────────────────────────────
  const recentSection = document.createElement('section');
  recentSection.className = 'sidebar-section';

  const recentHeader = document.createElement('h3');
  recentHeader.className = 'sidebar-section-title';
  recentHeader.textContent = t('Recent Files');

  const recentList = document.createElement('div');
  recentList.className = 'sidebar-file-list';
  recentList.id = 'sidebar-recent-files';

  const recentEmpty = document.createElement('p');
  recentEmpty.className = 'sidebar-empty';
  recentEmpty.textContent = t('No recent files');

  recentList.appendChild(recentEmpty);
  recentSection.appendChild(recentHeader);
  recentSection.appendChild(recentList);

  // ── Assemble ────────────────────────────────────────────────────────────
  panel.appendChild(header);
  panel.appendChild(openSection);
  panel.appendChild(recentSection);

  root.appendChild(backdrop);
  root.appendChild(panel);

  // ── State ───────────────────────────────────────────────────────────────
  let isOpen = false;
  /** @type {Function|null} */
  let onOpenFileClick = null;
  /** @type {Function|null} */
  let onRecentFileClick = null;

  function show() {
    isOpen = true;
    root.classList.add('sidebar-root--open');
    panel.setAttribute('aria-hidden', 'false');
    backdrop.setAttribute('aria-hidden', 'false');
    closeBtn.focus();
    document.addEventListener('keydown', onKeyDown);
  }

  function hide() {
    isOpen = false;
    root.classList.remove('sidebar-root--open');
    panel.setAttribute('aria-hidden', 'true');
    backdrop.setAttribute('aria-hidden', 'true');
    document.removeEventListener('keydown', onKeyDown);
  }

  function toggle() {
    if (isOpen) hide();
    else show();
  }

  // ── Events ──────────────────────────────────────────────────────────────
  function onKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      hide();
    }
  }

  backdrop.addEventListener('click', hide);
  closeBtn.addEventListener('click', hide);

  // ── Swipe to close (touch) ──────────────────────────────────────────────
  let touchStartX = 0;
  let touchStartY = 0;
  let isSwiping = false;

  panel.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    isSwiping = true;
  }, { passive: true });

  panel.addEventListener('touchmove', (e) => {
    if (!isSwiping) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartX;
    const dy = Math.abs(touch.clientY - touchStartY);

    // Only treat as horizontal swipe if x movement > y movement
    if (dx < -30 && dy < 50) {
      // Swiping left — animate panel follow
      const offset = Math.max(dx, -300);
      panel.style.transform = `translateX(${offset}px)`;
    }
  }, { passive: true });

  panel.addEventListener('touchend', (e) => {
    if (!isSwiping) return;
    isSwiping = false;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartX;

    if (dx < -80) {
      // Threshold met — close
      hide();
    }
    // Reset inline transform
    panel.style.transform = '';
  }, { passive: true });

  panel.addEventListener('touchcancel', () => {
    isSwiping = false;
    panel.style.transform = '';
  }, { passive: true });

  // ── Public API ──────────────────────────────────────────────────────────
  return {
    element: root,
    show,
    hide,
    toggle,

    /**
     * Register a callback for when an open-file item is clicked.
     * @param {Function} cb
     */
    onOpenFileSelect(cb) {
      onOpenFileClick = cb;
    },

    /**
     * Register a callback for when a recent-file item is clicked.
     * @param {Function} cb
     */
    onRecentFileSelect(cb) {
      onRecentFileClick = cb;
    },

    /**
     * Update the open-files list.
     * @param {Array<{name?: string, path?: string, language?: string, modified?: boolean, active?: boolean}>} tabs
     */
    updateOpenFiles(tabs) {
      openList.innerHTML = '';
      if (!tabs || tabs.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'sidebar-empty';
        empty.textContent = 'No open files';
        openList.appendChild(empty);
        return;
      }
      tabs.forEach((tab) => {
        const file = {
          name: tab.name || basename(tab.path),
          path: tab.path || '',
          language: tab.language || '',
          modified: !!tab.modified,
          active: !!tab.active,
        };
        const item = createFileItem(file, () => {
          if (typeof onOpenFileClick === 'function') onOpenFileClick(file);
          hide();
        });
        openList.appendChild(item);
      });
    },

    /**
     * Update the recent-files list.
     * @param {Array<{name?: string, path?: string, language?: string}>} files
     */
    updateRecentFiles(files) {
      recentList.innerHTML = '';
      if (!files || files.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'sidebar-empty';
        empty.textContent = 'No recent files';
        recentList.appendChild(empty);
        return;
      }
      files.forEach((f) => {
        const file = {
          ...f,
          name: f.name || basename(f.path),
          path: f.path || '',
          language: f.language || '',
          modified: false,
          active: false,
        };
        const item = createFileItem(file, () => {
          if (typeof onRecentFileClick === 'function') onRecentFileClick(file);
          hide();
        });
        recentList.appendChild(item);
      });
    },
  };
}
