/**
 * TabBar — Tab bar UI component
 * @module tabs/tab-bar
 */

export class TabBar {
  /**
   * @param {HTMLElement} container
   * @param {import('./tab-manager').TabManager} tabManager
   * @param {Object} callbacks
   * @param {function(number):void} callbacks.onTabSwitch
   * @param {function(number):void} callbacks.onTabClose
   * @param {function():void} callbacks.onNewTab
   * @param {function(number, MouseEvent):void} [callbacks.onTabContextMenu]
   */
  constructor(container, tabManager, callbacks) {
    this.container = container;
    this.tabManager = tabManager;
    this.callbacks = callbacks;

    this._bar = document.createElement('div');
    this._bar.className = 'tab-bar';
    this._bar.setAttribute('role', 'tablist');
    this.container.appendChild(this._bar);

    // Listen to tab manager events
    this.tabManager.addEventListener('tabCreated', () => this.render());
    this.tabManager.addEventListener('tabClosed', () => this.render());
    this.tabManager.addEventListener('tabSwitched', () => this.render());
    this.tabManager.addEventListener('tabUpdated', () => this.render());
    this.tabManager.addEventListener('tabModified', () => this.render());

    this.render();
  }

  /** Re-render the entire tab bar */
  render() {
    this._bar.innerHTML = '';
    const tabs = this.tabManager.getAllTabs();
    const activeId = this.tabManager.activeTabId;

    tabs.forEach((tab) => {
      const el = document.createElement('button');
      el.className = 'tab' + (tab.id === activeId ? ' active' : '');
      el.setAttribute('role', 'tab');
      el.setAttribute('aria-selected', tab.id === activeId ? 'true' : 'false');
      el.dataset.tabId = tab.id;
      el.title = tab.workspacePath || tab.webdavPath || tab.filePath || tab.filename;

      // Name and Path Container
      const nameContainer = document.createElement('div');
      nameContainer.style.display = 'flex';
      nameContainer.style.flexDirection = 'column';
      nameContainer.style.alignItems = 'flex-start';
      nameContainer.style.overflow = 'hidden';
      nameContainer.style.flex = '1';
      nameContainer.style.justifyContent = 'center';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'tab-name';
      nameSpan.style.lineHeight = '1.2';
      nameSpan.style.whiteSpace = 'nowrap';
      nameSpan.style.overflow = 'hidden';
      nameSpan.style.textOverflow = 'ellipsis';
      nameSpan.textContent = tab.filename;
      nameContainer.appendChild(nameSpan);

      const fullPath = tab.workspacePath || tab.webdavPath || tab.filePath || '';
      if (fullPath) {
        const pathSpan = document.createElement('span');
        pathSpan.style.fontSize = '9px';
        pathSpan.style.opacity = '0.7';
        pathSpan.style.lineHeight = '1.1';
        pathSpan.style.whiteSpace = 'nowrap';
        pathSpan.style.overflow = 'hidden';
        pathSpan.style.textOverflow = 'ellipsis'; // Actually we will manual truncate
        pathSpan.style.maxWidth = '100%';
        
        // Smart truncate: keep right side of path
        const maxLength = 35;
        let displayPath = fullPath;
        if (displayPath.length > maxLength) {
          displayPath = '...' + displayPath.slice(-(maxLength - 3));
        }
        pathSpan.textContent = displayPath;
        nameContainer.appendChild(pathSpan);
      }

      el.appendChild(nameContainer);

      // Modified dot
      if (tab.modified) {
        const dot = document.createElement('span');
        dot.className = 'tab-modified';
        dot.title = 'Unsaved changes';
        el.appendChild(dot);
      }

      // Close button
      const closeBtn = document.createElement('button');
      closeBtn.className = 'tab-close';
      closeBtn.innerHTML = '×';
      closeBtn.title = 'Close';
      closeBtn.setAttribute('aria-label', `Close ${tab.filename}`);
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.callbacks.onTabClose(tab.id);
      });
      el.appendChild(closeBtn);

      // Click to switch
      el.addEventListener('click', () => {
        this.callbacks.onTabSwitch(tab.id);
      });

      // Right-click context menu
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (this.callbacks.onTabContextMenu) {
          this.callbacks.onTabContextMenu(tab.id, e);
        }
      });

      this._bar.appendChild(el);
    });

    // New tab button
    const newBtn = document.createElement('button');
    newBtn.className = 'tab-new';
    newBtn.innerHTML = '+';
    newBtn.title = 'New Tab (Ctrl+N)';
    newBtn.setAttribute('aria-label', 'New Tab');
    newBtn.addEventListener('click', () => {
      this.callbacks.onNewTab();
    });
    this._bar.appendChild(newBtn);

    // Scroll active tab into view
    if (activeId !== null) {
      this.scrollToTab(activeId);
    }
  }

  /**
   * Scroll to make a tab visible
   * @param {number} id
   */
  scrollToTab(id) {
    requestAnimationFrame(() => {
      const el = this._bar.querySelector(`[data-tab-id="${id}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
    });
  }

  /**
   * Update a single tab element without full re-render
   * @param {number} id
   */
  updateTab(id) {
    // For simplicity, just re-render; the DOM is small
    this.render();
  }
}
