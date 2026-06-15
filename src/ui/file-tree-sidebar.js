/**
 * @module file-tree-sidebar
 * A VSCode-style resizable file tree explorer for the main workspace.
 */

import { t } from '../i18n.js';

export class FileTreeSidebar {
  /**
   * @param {Object} workspaceClient The client to fetch directories
   * @param {Object} options Options containing callbacks
   */
  constructor(workspaceClient, options = {}) {
    this.client = workspaceClient;
    this.options = options;
    
    // UI Elements
    this.element = document.createElement('div');
    this.element.className = 'file-tree-sidebar';
    this.element.style.display = 'none'; // Hidden by default
    
    // Wrapper for flex column
    this.contentWrapper = document.createElement('div');
    this.contentWrapper.style.flex = '1';
    this.contentWrapper.style.display = 'flex';
    this.contentWrapper.style.flexDirection = 'column';
    this.contentWrapper.style.overflow = 'hidden';

    // Helper to create sections
    const createSection = (titleText, isCollapsed = false, isFlex = false) => {
      const section = document.createElement('section');
      section.className = 'sidebar-section';
      if (isFlex) {
        section.style.flex = '1';
        section.style.display = 'flex';
        section.style.flexDirection = 'column';
        section.style.minHeight = '0';
      }
      if (isCollapsed) section.classList.add('sidebar-section-collapsed');

      const header = document.createElement('h3');
      header.className = 'sidebar-section-title';
      header.innerHTML = `<span class="sidebar-section-icon">${isCollapsed ? '▸' : '▾'}</span> ${titleText}`;
      
      const list = document.createElement('div');
      list.className = 'sidebar-file-list';
      if (isFlex) {
        list.style.flex = '1';
        list.style.overflowY = 'auto';
        list.style.minHeight = '0';
      } else {
        list.style.maxHeight = '300px';
        list.style.overflowY = 'auto';
      }

      header.addEventListener('click', () => {
        const collapsed = section.classList.toggle('sidebar-section-collapsed');
        const iconSpan = header.querySelector('.sidebar-section-icon');
        if (iconSpan) iconSpan.textContent = collapsed ? '▸' : '▾';
        
        if (isFlex) {
          section.style.flex = collapsed ? 'none' : '1';
        }
      });

      section.appendChild(header);
      section.appendChild(list);
      return { section, list };
    };

    // Main tree container (Workspace)
    const workspaceSection = createSection(t('Workspace / 工作区'), false, true);
    this.treeContainer = workspaceSection.list;
    this.treeContainer.className += ' file-tree-content';
    this.treeContainer.style.padding = 'var(--space-2) 0';

    // Bookmarks container
    const bookmarksSection = createSection(t('Bookmarks / 书签'), true, false);
    this.bookmarksContainer = bookmarksSection.list;

    // Outline container
    const outlineSection = createSection(t('Outline / 函数列表'), true, false);
    this.outlineContainer = outlineSection.list;

    this.contentWrapper.appendChild(workspaceSection.section);
    this.contentWrapper.appendChild(bookmarksSection.section);
    this.contentWrapper.appendChild(outlineSection.section);

    // Resizer handle
    this.resizer = document.createElement('div');
    this.resizer.className = 'file-tree-resizer';
    
    this.element.appendChild(this.contentWrapper);
    this.element.appendChild(this.resizer);
    
    // State
    this.isVisible = false;
    this.expandedFolders = new Set(['/']); // Root always expanded
    this.width = 250;
    this.element.style.width = `${this.width}px`;
    
    this._initResizer();
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  show() {
    this.isVisible = true;
    this.element.style.display = 'flex';
    if (this.treeContainer.innerHTML === '') {
      this.loadDirectory('/');
    }
  }

  hide() {
    this.isVisible = false;
    this.element.style.display = 'none';
  }

  async loadDirectory(path, containerEl = this.treeContainer, paddingLeft = 10) {
    if (path === '/') {
      this.treeContainer.innerHTML = `<div style="padding:10px;color:var(--text-tertiary);font-size:13px;">${t('Loading workspaces...')}</div>`;
    } else {
      const loader = document.createElement('div');
      loader.className = 'file-tree-item';
      loader.style.paddingLeft = `${paddingLeft}px`;
      loader.textContent = t('Loading...');
      containerEl.appendChild(loader);
    }

    try {
      let items;
      items = await this.client.listDirectory(path);

      if (path === '/') {
        const pinned = this.getPinnedFolders();
        items = [...pinned, ...items];
      }
      
      // Clear container (if root) or remove loader
      if (path === '/') {
        this.treeContainer.innerHTML = '';
      } else {
        containerEl.innerHTML = ''; // Clear children of folder
      }

      items.forEach(item => {
        const itemEl = this._createTreeItem(item, paddingLeft, path);
        if (path === '/') {
          this.treeContainer.appendChild(itemEl);
        } else {
          containerEl.appendChild(itemEl);
        }
      });
      
      if (items.length === 0 && path !== '/') {
        const empty = document.createElement('div');
        empty.className = 'file-tree-item';
        empty.style.paddingLeft = `${paddingLeft}px`;
        empty.style.color = 'var(--text-tertiary)';
        empty.style.fontStyle = 'italic';
        empty.textContent = `(${t('empty')})`;
        containerEl.appendChild(empty);
      }
    } catch (e) {
      if (path === '/') {
        this.treeContainer.innerHTML = `<div style="padding:10px;color:var(--danger);font-size:13px;">${t('Error loading workspace:')} ${e.message}</div>`;
      } else {
        containerEl.innerHTML = `<div class="file-tree-item" style="padding-left:${paddingLeft}px;color:var(--danger);">${t('Error')}: ${e.message}</div>`;
      }
    }
  }

  _createTreeItem(item, paddingLeft, parentPath) {
    const wrapper = document.createElement('div');
    wrapper.className = 'file-tree-node';
    
    const row = document.createElement('div');
    row.className = 'file-tree-item';
    row.style.paddingLeft = `${paddingLeft}px`;
    row.title = item.path;
    
    const arrow = document.createElement('span');
    arrow.className = 'file-tree-arrow';
    if (item.isDirectory) {
      arrow.textContent = this.expandedFolders.has(item.path) ? '▼' : '▶';
    } else {
      arrow.innerHTML = '&nbsp;';
    }
    
    const icon = document.createElement('span');
    icon.className = 'file-tree-icon';
    if (item.isDirectory) {
      icon.textContent = item.isPinned ? '⭐' : '📁';
    } else {
      const isPDF = item.name.toLowerCase().endsWith('.pdf');
      icon.textContent = isPDF ? '📕' : '📄';
    }
    
    const name = document.createElement('span');
    name.className = 'file-tree-name';
    name.textContent = item.name;

    const sizeEl = document.createElement('span');
    sizeEl.className = 'file-tree-size';
    if (!item.isDirectory && item.size !== undefined) {
      sizeEl.textContent = this.formatBytes(item.size);
    }

    const actions = document.createElement('div');
    actions.className = 'file-tree-actions';
    
    if (item.isDirectory && (parentPath !== '/' || item.isPinned)) {
      const pinBtn = document.createElement('span');
      pinBtn.textContent = '📌';
      pinBtn.title = item.isPinned ? t('Unpin from top') : t('Pin to top');
      pinBtn.style.cursor = 'pointer';
      pinBtn.style.fontSize = '12px';
      pinBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.togglePin(item);
      });
      actions.appendChild(pinBtn);
    }
    
    row.appendChild(arrow);
    row.appendChild(icon);
    row.appendChild(name);
    row.appendChild(sizeEl);
    row.appendChild(actions);
    wrapper.appendChild(row);
    
    const childrenContainer = document.createElement('div');
    childrenContainer.className = 'file-tree-children';
    if (item.isDirectory && !this.expandedFolders.has(item.path)) {
      childrenContainer.style.display = 'none';
    }
    wrapper.appendChild(childrenContainer);

    // Event handlers
    row.addEventListener('click', (e) => {
      e.stopPropagation();
      // Remove previous active
      const prevActive = this.treeContainer.querySelector('.file-tree-item.active');
      if (prevActive) prevActive.classList.remove('active');
      row.classList.add('active');

      if (item.isDirectory) {
        // Toggle folder
        if (this.expandedFolders.has(item.path)) {
          // Collapse
          this.expandedFolders.delete(item.path);
          arrow.textContent = '▶';
          childrenContainer.style.display = 'none';
        } else {
          // Expand
          this.expandedFolders.add(item.path);
          arrow.textContent = '▼';
          childrenContainer.style.display = 'block';
          if (childrenContainer.children.length === 0) {
            this.loadDirectory(item.path, childrenContainer, paddingLeft + 15);
          }
        }
      } else {
        // File click
        if (this.options.onFileSelect) {
          this.options.onFileSelect(item);
        }
      }
    });

    row.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (this.options.onContextMenu) {
        this.options.onContextMenu(e, item, this);
      }
    });

    // If it's a directory and already expanded (e.g. state restoration), load children
    if (item.isDirectory && this.expandedFolders.has(item.path)) {
      this.loadDirectory(item.path, childrenContainer, paddingLeft + 15);
    }

    return wrapper;
  }

  getPinnedFolders() {
    try {
      const saved = localStorage.getItem('mypad_pinned_folders');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse pinned folders', e);
    }
    return [];
  }

  togglePin(item) {
    let pinned = this.getPinnedFolders();
    const existingIndex = pinned.findIndex(p => p.path === item.path);
    
    if (existingIndex >= 0) {
      pinned.splice(existingIndex, 1);
    } else {
      pinned.push({
        name: item.name,
        path: item.path,
        isDirectory: true,
        isPinned: true
      });
    }
    localStorage.setItem('mypad_pinned_folders', JSON.stringify(pinned));
    
    // Refresh root
    if (this.isVisible) {
      this.loadDirectory('/');
    }
  }

  _initResizer() {
    let isResizing = false;
    let startX;
    let startWidth;

    const onMouseMove = (e) => {
      if (!isResizing) return;
      const dx = e.clientX - startX;
      let newWidth = startWidth + dx;
      if (newWidth < 150) newWidth = 150;
      if (newWidth > 600) newWidth = 600;
      this.width = newWidth;
      this.element.style.width = `${newWidth}px`;
    };

    const onMouseUp = () => {
      if (isResizing) {
        isResizing = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('touchend', onMouseUp);
        document.body.style.cursor = '';
      }
    };

    const onTouchMove = (e) => {
      if (e.touches.length > 0) {
        e.clientX = e.touches[0].clientX;
        onMouseMove(e);
      }
    };

    this.resizer.addEventListener('mousedown', (e) => {
      isResizing = true;
      startX = e.clientX;
      startWidth = this.width;
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'col-resize';
      e.preventDefault();
    });

    this.resizer.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        isResizing = true;
        startX = e.touches[0].clientX;
        startWidth = this.width;
        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onMouseUp);
      }
    });
  }

  formatBytes(bytes, decimals = 1) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  updateBookmarks(bookmarks) {
    this.bookmarksContainer.innerHTML = '';
    if (!bookmarks || bookmarks.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'sidebar-empty';
      empty.textContent = t('No bookmarks');
      this.bookmarksContainer.appendChild(empty);
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
        if (typeof this.options.onBookmarkSelect === 'function') this.options.onBookmarkSelect(bm);
      });
      this.bookmarksContainer.appendChild(item);
    });
  }

  updateOutline(outline) {
    this.outlineContainer.innerHTML = '';
    if (!outline || outline.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'sidebar-empty';
      empty.textContent = t('No symbols found');
      this.outlineContainer.appendChild(empty);
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
        if (typeof this.options.onOutlineSelect === 'function') this.options.onOutlineSelect(itemInfo);
      });
      this.outlineContainer.appendChild(item);
    });
  }
}
