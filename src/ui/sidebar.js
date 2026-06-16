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

  // ── Helper to create a collapsible section ──────────────────────────────
  function createSection(titleText, listId) {
    const section = document.createElement('section');
    section.className = 'sidebar-section';

    const header = document.createElement('h3');
    header.className = 'sidebar-section-title';
    header.innerHTML = `<span class="sidebar-section-icon">▾</span> ${titleText}`;
    
    const list = document.createElement('div');
    list.className = 'sidebar-file-list';
    list.id = listId;

    // Toggle collapse on header click
    header.addEventListener('click', () => {
      const isCollapsed = section.classList.toggle('sidebar-section-collapsed');
      const iconSpan = header.querySelector('.sidebar-section-icon');
      if (iconSpan) iconSpan.textContent = isCollapsed ? '▸' : '▾';
    });

    section.appendChild(header);
    section.appendChild(list);

    return { section, list };
  }

  // ── Files section ───────────────────────────────────────────────────────
  const { section: filesSection, list: filesList } = createSection(t('Files / 资源管理器'), 'sidebar-files-list');

  // ── Bookmarks section ───────────────────────────────────────────────────
  const { section: bookmarksSection, list: bookmarksList } = createSection(t('Bookmarks / 书签'), 'sidebar-bookmarks-list');
  bookmarksSection.classList.add('sidebar-section-collapsed'); // Collapsed by default
  bookmarksSection.querySelector('.sidebar-section-icon').textContent = '▸';

  // ── Outline section ─────────────────────────────────────────────────────
  const { section: outlineSection, list: outlineList } = createSection(t('Outline / 函数列表'), 'sidebar-outline-list');
  outlineSection.classList.add('sidebar-section-collapsed'); // Collapsed by default
  outlineSection.querySelector('.sidebar-section-icon').textContent = '▸';

  // ── Assemble ────────────────────────────────────────────────────────────
  panel.appendChild(header);
  panel.appendChild(filesSection);
  panel.appendChild(bookmarksSection);
  panel.appendChild(outlineSection);

  root.appendChild(backdrop);
  root.appendChild(panel);

  // ── State ───────────────────────────────────────────────────────────────
  let isOpen = false;
  /** @type {Function|null} */
  let onOpenFileClick = null;
  /** @type {Function|null} */
  let onRecentFileClick = null;
  /** @type {Function|null} */
  let onBookmarkClick = null;
  /** @type {Function|null} */
  let onOutlineClick = null;
  
  // Cache the lists to merge Open and Recent into "Files"
  let cachedOpenTabs = [];
  let cachedRecentFiles = [];

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
     * Register a callback for when a bookmark is clicked.
     * @param {Function} cb
     */
    onBookmarkSelect(cb) {
      onBookmarkClick = cb;
    },

    /**
     * Register a callback for when an outline item is clicked.
     * @param {Function} cb
     */
    onOutlineSelect(cb) {
      onOutlineClick = cb;
    },

    /**
     * Internal: Re-render the unified Files list
     */
    _renderFilesList() {
      filesList.innerHTML = '';
      
      const openSubheader = document.createElement('div');
      openSubheader.className = 'sidebar-subheader';
      openSubheader.textContent = t('Open Files');
      filesList.appendChild(openSubheader);

      if (cachedOpenTabs.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'sidebar-empty';
        empty.textContent = t('No files open');
        filesList.appendChild(empty);
      } else {
        cachedOpenTabs.forEach((tab) => {
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
          filesList.appendChild(item);
        });
      }

      const recentSubheader = document.createElement('div');
      recentSubheader.className = 'sidebar-subheader';
      recentSubheader.textContent = t('Recent Files');
      filesList.appendChild(recentSubheader);

      if (cachedRecentFiles.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'sidebar-empty';
        empty.textContent = t('No recent files');
        filesList.appendChild(empty);
      } else {
        cachedRecentFiles.forEach((f) => {
          const file = {
            ...f,
            name: f.name || basename(f.path),
            path: f.workspacePath || f.webdavPath || f.path || '',
            language: f.language || '',
            modified: false,
          };
          const item = createFileItem(file, () => {
            if (typeof onRecentFileClick === 'function') onRecentFileClick(f);
            hide();
          });

          // Custom styling for recent files
          if (!f.workspacePath && !f.webdavPath) {
            item.style.opacity = '0.5';
            item.title = t('Local file (Cannot reopen automatically)');
          } else {
            const pathSpan = document.createElement('div');
            pathSpan.style.fontSize = '10px';
            pathSpan.style.color = 'var(--text-secondary)';
            pathSpan.style.marginTop = '2px';
            pathSpan.style.overflow = 'hidden';
            pathSpan.style.textOverflow = 'ellipsis';
            pathSpan.style.whiteSpace = 'nowrap';
            pathSpan.textContent = file.path;
            
            // Find the nameSpan and append the path
            const nameSpan = item.querySelector('.sidebar-file-item-name');
            if (nameSpan) {
              nameSpan.style.display = 'flex';
              nameSpan.style.flexDirection = 'column';
              nameSpan.style.alignItems = 'flex-start';
              nameSpan.style.lineHeight = '1.2';
              nameSpan.appendChild(pathSpan);
            }
          }

          filesList.appendChild(item);
        });
      }
    },

    /**
     * Update the open-files list.
     * @param {Array<{name?: string, path?: string, language?: string, modified?: boolean, active?: boolean}>} tabs
     */
    updateOpenFiles(tabs) {
      cachedOpenTabs = tabs || [];
      this._renderFilesList();
    },

    /**
     * Update the recent-files list.
     * @param {Array<{name?: string, path?: string, language?: string}>} files
     */
    updateRecentFiles(files) {
      cachedRecentFiles = files || [];
      this._renderFilesList();
    },

    /**
     * Update the bookmarks list.
     * @param {Array<{line: number, text: string}>} bookmarks
     */
    updateBookmarks(bookmarks) {
      bookmarksList.innerHTML = '';
      if (!bookmarks || bookmarks.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'sidebar-empty';
        empty.textContent = t('No bookmarks');
        bookmarksList.appendChild(empty);
        return;
      }
      bookmarks.forEach(bm => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'sidebar-file-item';
        
        const lineSpan = document.createElement('span');
        lineSpan.className = 'sidebar-bookmark-line';
        lineSpan.textContent = `Ln ${bm.line}`;
        
        const textSpan = document.createElement('span');
        textSpan.className = 'sidebar-file-item-name';
        textSpan.textContent = bm.text;

        item.appendChild(lineSpan);
        item.appendChild(textSpan);

        item.addEventListener('click', () => {
          if (typeof onBookmarkClick === 'function') onBookmarkClick(bm);
          hide();
        });
        bookmarksList.appendChild(item);
      });
    },

    /**
     * Update the outline list.
     * @param {Array<{name: string, type: string, line: number}>} outline
     */
    updateOutline(outline) {
      outlineList.innerHTML = '';
      if (!outline || outline.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'sidebar-empty';
        empty.textContent = t('No symbols found');
        outlineList.appendChild(empty);
        return;
      }
      outline.forEach(itemInfo => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'sidebar-file-item';
        
        const typeSpan = document.createElement('span');
        typeSpan.className = `sidebar-outline-type sidebar-outline-${itemInfo.type}`;
        typeSpan.textContent = itemInfo.type === 'class' ? 'C' : 'f()';
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'sidebar-file-item-name';
        nameSpan.textContent = itemInfo.name;

        const lineSpan = document.createElement('span');
        lineSpan.className = 'sidebar-file-item-path';
        lineSpan.textContent = `Ln ${itemInfo.line}`;

        item.appendChild(typeSpan);
        item.appendChild(nameSpan);
        item.appendChild(lineSpan);

        item.addEventListener('click', () => {
          if (typeof onOutlineClick === 'function') onOutlineClick(itemInfo);
          hide();
        });
        outlineList.appendChild(item);
      });
    }
  };
}
