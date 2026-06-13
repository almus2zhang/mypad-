/**
 * @module context-menu
 * Custom context menu for MyPad++.
 */

// ─── Default menu item definitions ───────────────────────────────────────────

/**
 * @typedef {object} MenuItem
 * @property {string} label - Display text.
 * @property {string} [id] - Unique id for the item.
 * @property {string} [shortcut] - Keyboard shortcut hint.
 * @property {Function} [action] - Click handler.
 * @property {boolean} [disabled] - If true, item is grayed out.
 * @property {"separator"} [type] - Set to "separator" for a divider.
 */

/**
 * Build the default set of context menu items.
 * @param {object} callbacks
 * @returns {MenuItem[]}
 */
export function getDefaultMenuItems(callbacks = {}) {
  return [
    { id: 'ctx-cut', label: 'Cut', shortcut: 'Ctrl+X', action: callbacks.onCut },
    { id: 'ctx-copy', label: 'Copy', shortcut: 'Ctrl+C', action: callbacks.onCopy },
    { id: 'ctx-paste', label: 'Paste', shortcut: 'Ctrl+V', action: callbacks.onPaste },
    { id: 'ctx-select-all', label: 'Select All', shortcut: 'Ctrl+A', action: callbacks.onSelectAll },
    { type: 'separator' },
    { id: 'ctx-find', label: 'Find', shortcut: 'Ctrl+F', action: callbacks.onFind },
    { id: 'ctx-replace', label: 'Replace', shortcut: 'Ctrl+H', action: callbacks.onReplace },
    { type: 'separator' },
    { id: 'ctx-highlight', label: 'Highlight', shortcut: '', action: callbacks.onHighlight },
    { id: 'ctx-reference', label: 'Reference (引用)', shortcut: '', action: callbacks.onReference },
    { type: 'separator' },
    { id: 'ctx-indent', label: 'Indent', shortcut: 'Tab', action: callbacks.onIndent },
    { id: 'ctx-outdent', label: 'Outdent', shortcut: 'Shift+Tab', action: callbacks.onOutdent },
    { type: 'separator' },
    { id: 'ctx-toggle-comment', label: 'Toggle Comment', shortcut: 'Ctrl+/', action: callbacks.onToggleComment },
  ];
}

// ─── SVG icons for menu items ────────────────────────────────────────────────

const MENU_ICONS = {
  'ctx-cut': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
    <line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/>
    <line x1="8.12" y1="8.12" x2="12" y2="12"/>
  </svg>`,
  'ctx-copy': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>`,
  'ctx-paste': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
  </svg>`,
  'ctx-select-all': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <path d="M8 8h8v8H8z" fill="currentColor" opacity="0.25"/>
  </svg>`,
  'ctx-find': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>`,
  'ctx-replace': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 4h6v6"/><path d="M20 4L10 14"/>
    <path d="M10 20H4v-6"/><path d="M4 20l10-10"/>
  </svg>`,
  'ctx-indent': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="3" y1="4" x2="21" y2="4"/><line x1="11" y1="9" x2="21" y2="9"/>
    <line x1="11" y1="14" x2="21" y2="14"/><line x1="3" y1="19" x2="21" y2="19"/>
    <polyline points="4 9 8 12 4 15"/>
  </svg>`,
  'ctx-outdent': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="3" y1="4" x2="21" y2="4"/><line x1="11" y1="9" x2="21" y2="9"/>
    <line x1="11" y1="14" x2="21" y2="14"/><line x1="3" y1="19" x2="21" y2="19"/>
    <polyline points="8 9 4 12 8 15"/>
  </svg>`,
  'ctx-highlight': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
    <line x1="8" y1="11" x2="16" y2="11"/>
    <line x1="8" y1="15" x2="16" y2="15"/>
    <line x1="8" y1="19" x2="12" y2="19"/>
  </svg>`,
  'ctx-reference': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>`,
  'ctx-toggle-comment': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="4 7 4 4 20 4 20 7"/>
    <line x1="9" y1="20" x2="15" y2="20"/>
    <line x1="12" y1="4" x2="12" y2="20"/>
  </svg>`,
};

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Create the context menu controller.
 *
 * @returns {{ show: (x: number, y: number, items: MenuItem[]) => void, hide: () => void }}
 */
export function createContextMenu() {
  /** @type {HTMLElement|null} */
  let menuEl = null;
  /** @type {number} */
  let focusedIndex = -1;
  /** @type {HTMLElement[]} */
  let actionItems = [];

  /**
   * Remove the menu from the DOM and clean up listeners.
   */
  function hide() {
    if (menuEl) {
      menuEl.classList.add('context-menu--closing');
      const el = menuEl;
      const onEnd = () => {
        el.remove();
        el.removeEventListener('animationend', onEnd);
      };
      el.addEventListener('animationend', onEnd);
      // Fallback removal
      setTimeout(() => { if (el.parentNode) el.remove(); }, 200);
      menuEl = null;
    }
    actionItems = [];
    focusedIndex = -1;
    document.removeEventListener('click', onOutsideClick, true);
    document.removeEventListener('contextmenu', onOutsideClick, true);
    document.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('resize', hide);
    window.removeEventListener('scroll', hide, true);
  }

  function onOutsideClick(e) {
    if (menuEl && !menuEl.contains(e.target)) {
      e.preventDefault();
      e.stopPropagation();
      hide();
    }
  }

  function focusItem(idx) {
    if (idx < 0 || idx >= actionItems.length) return;
    actionItems.forEach((el) => el.classList.remove('context-menu-item--focused'));
    actionItems[idx].classList.add('context-menu-item--focused');
    actionItems[idx].focus();
    focusedIndex = idx;
  }

  function onKeyDown(e) {
    if (!menuEl) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        focusItem(focusedIndex < actionItems.length - 1 ? focusedIndex + 1 : 0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        focusItem(focusedIndex > 0 ? focusedIndex - 1 : actionItems.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < actionItems.length) {
          actionItems[focusedIndex].click();
        }
        break;
      case 'Escape':
        e.preventDefault();
        hide();
        break;
      case 'Home':
        e.preventDefault();
        focusItem(0);
        break;
      case 'End':
        e.preventDefault();
        focusItem(actionItems.length - 1);
        break;
      default:
        break;
    }
  }

  /**
   * Show the context menu at the given screen coordinates.
   *
   * @param {number} x - Horizontal position (px).
   * @param {number} y - Vertical position (px).
   * @param {MenuItem[]} items - Menu items to display.
   */
  function show(x, y, items) {
    // Remove any existing menu
    hide();

    menuEl = document.createElement('div');
    menuEl.className = 'context-menu';
    menuEl.setAttribute('role', 'menu');
    menuEl.setAttribute('aria-label', 'Context menu');

    actionItems = [];
    focusedIndex = -1;

    items.forEach((item) => {
      if (item.type === 'separator') {
        const sep = document.createElement('div');
        sep.className = 'context-menu-separator';
        sep.setAttribute('role', 'separator');
        menuEl.appendChild(sep);
        return;
      }

      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'context-menu-item';
      if (item.disabled) {
        el.classList.add('context-menu-item--disabled');
        el.disabled = true;
      }
      if (item.id) el.id = item.id;
      el.setAttribute('role', 'menuitem');

      // Icon
      const iconSpan = document.createElement('span');
      iconSpan.className = 'context-menu-item-icon';
      iconSpan.innerHTML = MENU_ICONS[item.id] || '';
      el.appendChild(iconSpan);

      // Label
      const labelSpan = document.createElement('span');
      labelSpan.className = 'context-menu-item-label';
      labelSpan.textContent = item.label;
      el.appendChild(labelSpan);

      // Shortcut hint or submenu arrow
      if (item.items) {
        const arrowSpan = document.createElement('span');
        arrowSpan.className = 'context-menu-item-arrow';
        arrowSpan.innerHTML = '&#x25B6;'; // Triangle right
        arrowSpan.style.marginLeft = 'auto';
        arrowSpan.style.fontSize = '10px';
        arrowSpan.style.opacity = '0.5';
        el.appendChild(arrowSpan);
      } else if (item.shortcut) {
        const shortcutSpan = document.createElement('span');
        shortcutSpan.className = 'context-menu-item-shortcut';
        shortcutSpan.textContent = item.shortcut;
        el.appendChild(shortcutSpan);
      }

      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (item.items) {
          // Add a back button to the submenu
          const submenu = [
            { label: '⬅️ Back', action: () => show(x, y, items) },
            { type: 'separator' },
            ...item.items
          ];
          show(x, y, submenu);
        } else {
          if (typeof item.action === 'function') item.action();
          hide();
        }
      });

      // Hover → visually focus
      el.addEventListener('mouseenter', () => {
        const idx = actionItems.indexOf(el);
        if (idx !== -1) focusItem(idx);
      });

      menuEl.appendChild(el);
      if (!item.disabled) {
        actionItems.push(el);
      }
    });

    // ── Position ─────────────────────────────────────────────────────────
    document.body.appendChild(menuEl);

    // Measure and clamp to viewport
    const rect = menuEl.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = x;
    let top = y;

    if (left + rect.width > vw - 8) {
      left = vw - rect.width - 8;
    }
    if (top + rect.height > vh - 8) {
      top = vh - rect.height - 8;
    }
    left = Math.max(8, left);
    top = Math.max(8, top);

    menuEl.style.left = `${left}px`;
    menuEl.style.top = `${top}px`;

    // ── Register global listeners ────────────────────────────────────────
    // Delay so the current click/contextmenu event doesn't immediately close
    requestAnimationFrame(() => {
      document.addEventListener('click', onOutsideClick, true);
      document.addEventListener('contextmenu', onOutsideClick, true);
      document.addEventListener('keydown', onKeyDown, true);
      window.addEventListener('resize', hide);
      window.addEventListener('scroll', hide, true);
    });

    // Focus the first item
    if (actionItems.length > 0) {
      focusItem(0);
    }
  }

  return { show, hide };
}
