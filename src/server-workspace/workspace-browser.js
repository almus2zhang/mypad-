/**
 * WorkspaceBrowser — File browser UI for Server Workspace
 * @module server-workspace/workspace-browser
 */

import { WorkspaceClient } from './workspace-client.js';
import { t } from '../i18n.js';

export class WorkspaceBrowser {
  /**
   * @param {Object} callbacks
   * @param {function(string, ArrayBuffer, string):void} callbacks.onFileOpen
   * @param {function(string):void} [callbacks.onFileSave]
   * @param {function(string):void} [callbacks.onError]
   */
  constructor(callbacks) {
    this.client = new WorkspaceClient();
    this.callbacks = callbacks;
    this._currentPath = '/';
    this._mode = 'open';
    this._loading = false;
    this._saveFilename = null;

    this._overlay = null;
    this._dialog = null;
    this._fileListEl = null;
    this._breadcrumbEl = null;
    this._footerEl = null;

    this._buildUI();
  }

  async show(mode = 'open', saveFilename = '') {
    this._mode = mode;
    this._saveFilename = saveFilename;
    this._overlay.classList.add('visible');

    let ok = false;
    try {
      ok = await this.client.checkConnection();
    } catch (e) {
      if (e.status === 401) {
        const pwd = prompt('Remote access requires a password:');
        if (pwd === null) {
          this.hide();
          return;
        }
        this.client.setPassword(pwd);
        try {
          ok = await this.client.checkConnection();
        } catch (err2) {
          if (err2.status === 401) {
            alert('Incorrect password!');
          }
        }
      }
    }

    if (!ok) {
      alert("Failed to connect to the Server Workspace backend. Is node server.js running, or did you enter the wrong password?");
      this.hide();
      return;
    }

    this._updateFooter();
    this._loadWorkspacesForSearch();
    await this.navigateTo(this._currentPath);
  }

  hide() {
    this._overlay.classList.remove('visible');
  }

  async navigateTo(path) {
    this._currentPath = path || '/';
    
    // Intercept search pseudo-paths
    if (this._currentPath.startsWith('Search: q=')) {
      const q = this._currentPath.substring('Search: q='.length);
      return this.searchGlobal(q);
    } else if (this._currentPath.startsWith('Search: ext=')) {
      const ext = this._currentPath.substring('Search: ext='.length);
      return this.searchExtension(ext);
    }

    this._loading = true;
    this._renderBreadcrumb();
    this._fileListEl.innerHTML = '<div style="text-align:center;padding:2rem;">Loading...</div>';

    try {
      const items = await this.client.listDirectory(path);
      this._renderFileList(items);
    } catch (e) {
      this._fileListEl.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--danger);">
        <p>Failed to load directory</p>
        <p>${e.message}</p>
      </div>`;
    } finally {
      this._loading = false;
    }
  }

  async searchExtension(ext) {
    this._currentPath = 'Search: ext=' + ext;
    this._loading = true;
    
    this._breadcrumbEl.innerHTML = '';
    const titleSpan = document.createElement('span');
    titleSpan.textContent = `Search Extension: ${ext}`;
    titleSpan.style.fontWeight = 'bold';
    titleSpan.style.color = 'var(--text-primary)';
    
    const backBtn = document.createElement('button');
    backBtn.textContent = '← Back to root';
    backBtn.className = 'annotepad-btn';
    backBtn.style.padding = '2px 8px';
    backBtn.style.fontSize = '12px';
    backBtn.style.marginLeft = 'auto';
    backBtn.addEventListener('click', () => {
      this._filterBarEl.querySelector('input').value = '';
      this.navigateTo('/');
    });

    this._breadcrumbEl.append(titleSpan, backBtn);
    this._breadcrumbEl.style.display = 'flex';
    this._breadcrumbEl.style.alignItems = 'center';

    this._fileListEl.innerHTML = '<div style="text-align:center;padding:2rem;">Searching...</div>';

    try {
      const workspaces = this._getSelectedWorkspaces();
      const items = await this.client.searchFiles({ ext, workspaces });
      this._renderFileList(items);
    } catch (e) {
      this._fileListEl.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--danger);">
        <p>Failed to search</p>
        <p>${e.message}</p>
      </div>`;
    } finally {
      this._loading = false;
    }
  }

  async searchQuery(q) {
    this._currentPath = 'Search: q=' + q;
    this._loading = true;
    
    this._breadcrumbEl.innerHTML = '';
    const title = document.createElement('h2');
    title.textContent = t('Server Workspace');
    title.style.margin = '0 0 15px 0';
    title.style.fontWeight = 'bold';
    title.style.color = 'var(--text-primary)';
    
    const backBtn = document.createElement('button');
    backBtn.textContent = '← Back to root';
    backBtn.className = 'annotepad-btn';
    backBtn.style.padding = '2px 8px';
    backBtn.style.fontSize = '12px';
    backBtn.style.marginLeft = 'auto';
    backBtn.addEventListener('click', () => {
      this._filterBarEl.querySelector('input').value = '';
      this.navigateTo('/');
    });

    this._breadcrumbEl.append(title, backBtn);
    this._breadcrumbEl.style.display = 'flex';
    this._breadcrumbEl.style.alignItems = 'center';

    this._fileListEl.innerHTML = '<div style="text-align:center;padding:2rem;">Searching...</div>';

    try {
      const workspaces = this._getSelectedWorkspaces();
      const items = await this.client.searchFiles({ q, workspaces });
      this._renderFileList(items);
    } catch (e) {
      this._fileListEl.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--danger);">
        <p>Failed to search</p>
        <p>${e.message}</p>
      </div>`;
    } finally {
      this._loading = false;
    }
  }

  async _loadWorkspacesForSearch() {
    this._workspaceSelectorEl.innerHTML = '<span style="color:var(--text-tertiary);">Loading directories...</span>';
    try {
      const items = await this.client.listDirectory('/');
      this._workspaceSelectorEl.innerHTML = '<span style="color:var(--text-secondary);font-weight:bold;">Search in:</span>';
      items.forEach(item => {
        if (!item.isDirectory) return;
        const label = document.createElement('label');
        label.style.display = 'flex';
        label.style.alignItems = 'center';
        label.style.gap = '4px';
        label.style.cursor = 'pointer';
        
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = item.name;
        cb.checked = true; // Default to checked
        
        const text = document.createTextNode(item.name);
        
        label.append(cb, text);
        this._workspaceSelectorEl.append(label);
      });
    } catch (e) {
      this._workspaceSelectorEl.innerHTML = `<span style="color:var(--danger);">Failed to load dirs: ${e.message}</span>`;
    }
  }

  _getSelectedWorkspaces() {
    if (!this._workspaceSelectorEl) return '';
    const checkboxes = Array.from(this._workspaceSelectorEl.querySelectorAll('input[type="checkbox"]'));
    if (checkboxes.length === 0) return '';
    // If all checked, we don't strictly need to pass it, but passing it explicitly is fine.
    const checked = checkboxes.filter(cb => cb.checked).map(cb => cb.value);
    return checked.join(',');
  }

  // --- UI ---
  _buildUI() {
    this._overlay = document.createElement('div');
    this._overlay.className = 'dialog-overlay';

    this._dialog = document.createElement('div');
    this._dialog.className = 'dialog';
    this._dialog.style.width = '600px';
    this._dialog.style.maxWidth = '95vw';
    this._dialog.style.height = '500px';
    this._dialog.style.maxHeight = '85vh';

    const header = document.createElement('div');
    header.className = 'dialog-header';
    const title = document.createElement('span');
    title.className = 'dialog-title';
    title.textContent = 'Server Workspace';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'dialog-close';
    closeBtn.innerHTML = '×';
    closeBtn.addEventListener('click', () => this.hide());
    header.append(title, closeBtn);

    const body = document.createElement('div');
    body.className = 'dialog-body';
    body.style.padding = '0';
    body.style.display = 'flex';
    body.style.flexDirection = 'column';
    body.style.flex = '1';
    body.style.minHeight = '0';

    this._breadcrumbEl = document.createElement('div');
    this._breadcrumbEl.className = 'webdav-breadcrumb';

    this._filterBarEl = document.createElement('div');
    this._filterBarEl.style.padding = '8px 16px';
    this._filterBarEl.style.display = 'flex';
    this._filterBarEl.style.gap = '8px';
    this._filterBarEl.style.flexWrap = 'wrap';
    this._filterBarEl.style.borderBottom = '1px solid var(--border-color)';
    this._filterBarEl.style.background = 'var(--bg-secondary)';
    
    const exts = ['.c', '.h', '.cpp', '.hpp', '.py', '.js', '.json', '.yaml', '.yml', '.log', '.txt', '.md', '.html', '.css'];
    exts.forEach(ext => {
      const btn = document.createElement('button');
      btn.textContent = ext;
      btn.className = 'annotepad-btn';
      btn.style.padding = '2px 8px';
      btn.style.fontSize = '12px';
      btn.style.borderRadius = '4px';
      btn.addEventListener('click', () => {
        this.searchExtension(ext);
      });
      this._filterBarEl.append(btn);
    });

    const refreshBtn = document.createElement('button');
    refreshBtn.className = 'btn';
    refreshBtn.textContent = t('🔄 Rebuild Index');
    refreshBtn.title = 'Force rebuild server index';
    refreshBtn.style.padding = '2px 8px';
    refreshBtn.style.fontSize = '12px';
    refreshBtn.style.borderRadius = '4px';
    refreshBtn.style.marginLeft = 'auto';
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.disabled = true;
      refreshBtn.textContent = t('Rebuilding...');
      try {
        await this.client.reindex();
        // If we are currently searching, re-run the search
        if (this._currentPath.startsWith('Search: ')) {
          const params = this._currentPath.replace('Search: ', '');
          if (params.startsWith('ext=')) {
            await this.searchExtension(params.substring(4));
          } else if (params.startsWith('q=')) {
            await this.searchQuery(params.substring(2));
          }
        } else {
          await this.navigateTo(this._currentPath);
        }
      } catch (e) {
        alert('Failed to rebuild index: ' + e.message);
      } finally {
        refreshBtn.disabled = false;
        refreshBtn.textContent = t('🔄 Rebuild Index');
      }
    });

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search by name...';
    searchInput.className = 'annotepad-input';
    searchInput.style.padding = '2px 8px';
    searchInput.style.fontSize = '12px';
    searchInput.style.borderRadius = '4px';
    searchInput.style.border = '1px solid var(--border-color)';
    searchInput.style.background = 'var(--bg-primary)';
    searchInput.style.color = 'var(--text-primary)';
    searchInput.style.marginLeft = '8px';
    searchInput.style.width = '140px';

    let searchTimeout = null;
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.trim();
      clearTimeout(searchTimeout);
      if (!q) {
        if (this._currentPath.startsWith('Search: q=')) {
          this.navigateTo('/');
        }
        return;
      }
      searchTimeout = setTimeout(() => {
        this.searchQuery(q);
      }, 300);
    });

    this._filterBarEl.append(searchInput, refreshBtn);

    this._workspaceSelectorEl = document.createElement('div');
    this._workspaceSelectorEl.style.padding = '4px 16px';
    this._workspaceSelectorEl.style.display = 'flex';
    this._workspaceSelectorEl.style.gap = '12px';
    this._workspaceSelectorEl.style.flexWrap = 'wrap';
    this._workspaceSelectorEl.style.borderBottom = '1px solid var(--border-color)';
    this._workspaceSelectorEl.style.background = 'var(--bg-secondary)';
    this._workspaceSelectorEl.style.fontSize = '12px';
    this._workspaceSelectorEl.style.alignItems = 'center';

    this._fileListEl = document.createElement('div');
    this._fileListEl.className = 'webdav-file-list';
    this._fileListEl.style.flex = '1';
    this._fileListEl.style.overflowY = 'auto';

    body.append(this._breadcrumbEl, this._filterBarEl, this._workspaceSelectorEl, this._fileListEl);

    this._footerEl = document.createElement('div');
    this._footerEl.className = 'dialog-footer';

    this._dialog.append(header, body, this._footerEl);
    this._overlay.append(this._dialog);
    document.body.appendChild(this._overlay);

    this._overlay.addEventListener('click', (e) => {
      if (e.target === this._overlay) this.hide();
    });
  }

  _renderBreadcrumb() {
    this._breadcrumbEl.innerHTML = '';
    const parts = this._currentPath.split('/').filter(Boolean);
    
    const rootLink = document.createElement('span');
    rootLink.className = 'webdav-breadcrumb-item';
    rootLink.textContent = '/';
    rootLink.onclick = () => this.navigateTo('/');
    this._breadcrumbEl.appendChild(rootLink);

    let current = '';
    parts.forEach((part, i) => {
      current += '/' + part;
      const sep = document.createElement('span');
      sep.className = 'webdav-breadcrumb-separator';
      sep.textContent = '›';
      this._breadcrumbEl.appendChild(sep);

      const link = document.createElement('span');
      link.className = 'webdav-breadcrumb-item';
      link.textContent = part;
      const navPath = current;
      link.onclick = () => this.navigateTo(navPath);
      this._breadcrumbEl.appendChild(link);
    });
  }

  _renderFileList(items) {
    this._fileListEl.innerHTML = '';
    
    if (this._currentPath !== '/') {
      const upDiv = document.createElement('div');
      upDiv.className = 'webdav-file-item';
      upDiv.innerHTML = `<span class="webdav-file-icon">📁</span>
                         <span class="webdav-file-name">..</span>`;
      upDiv.onclick = () => {
        const parts = this._currentPath.split('/').filter(Boolean);
        parts.pop();
        this.navigateTo('/' + parts.join('/'));
      };
      this._fileListEl.appendChild(upDiv);
    }

    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.style.padding = '1rem';
      empty.style.textAlign = 'center';
      empty.style.padding = '10px';
      empty.textContent = t('Empty directory');
      this._fileListEl.appendChild(empty);
      return;
    }

    items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'webdav-file-item';
      
      const icon = document.createElement('span');
      icon.className = 'webdav-file-icon';
      if (item.isDirectory) {
        icon.innerHTML = '📁';
      } else {
        icon.innerHTML = _getFileIcon(item.name);
      }

      const textContainer = document.createElement('div');
      textContainer.style.overflow = 'hidden';
      textContainer.style.flex = '1';
      textContainer.style.minWidth = '0'; // allow text truncation

      const name = document.createElement('div');
      name.style.whiteSpace = 'nowrap';
      name.style.overflow = 'hidden';
      name.style.textOverflow = 'ellipsis';
      name.textContent = item.name;

      textContainer.appendChild(name);

      const pathLabel = document.createElement('div');
      pathLabel.style.fontSize = '11px';
      pathLabel.style.color = 'var(--text-tertiary)';
      pathLabel.style.whiteSpace = 'nowrap';
      pathLabel.style.overflow = 'hidden';
      pathLabel.style.textOverflow = 'ellipsis';
      pathLabel.style.marginTop = '2px';
      
      const fullPath = item.absolutePath || item.path || '';
      pathLabel.textContent = fullPath;
      
      if (fullPath && fullPath !== '/' + item.name) {
        textContainer.appendChild(pathLabel);
      }

      el.title = fullPath;
      el.append(icon, textContainer);

      el.onclick = () => {
        if (item.isDirectory) {
          this.navigateTo(item.path);
        } else {
          if (this._mode === 'open') {
            this._handleFileSelect(item);
          } else {
            const input = this._footerEl.querySelector('.webdav-save-input');
            if (input) input.value = item.name;
          }
        }
      };



      this._fileListEl.appendChild(el);
    });
  }

  async _handleFileSelect(item) {
    try {
      this._fileListEl.style.opacity = '0.5';
      const buffer = await this.client.readFile(item.path);
      this.hide();
      if (this.callbacks.onFileOpen) {
        this.callbacks.onFileOpen(item.name, buffer, item.path);
      }
    } catch (e) {
      alert('Failed to open file: ' + e.message);
    } finally {
      this._fileListEl.style.opacity = '1';
    }
  }

  _updateFooter() {
    this._footerEl.innerHTML = '';
    
    if (this._mode === 'open') {
      const btnGroup = document.createElement('div');
      btnGroup.style.display = 'flex';
      btnGroup.style.gap = '8px';
      
      const newFolderBtn = document.createElement('button');
      newFolderBtn.textContent = t('New Folder');
      newFolderBtn.style.padding = '5px 10px';
      newFolderBtn.onclick = async () => {
        const name = prompt('Folder name:');
        if (!name) return;
        try {
          const newPath = this._currentPath === '/' ? '/' + name : this._currentPath + '/' + name;
          await this.client.createDirectory(newPath);
          this.navigateTo(this._currentPath);
        } catch (e) {
          alert('Failed to create folder: ' + e.message);
        }
      };
      
      this._footerEl.appendChild(newFolderBtn);
    } else if (this._mode === 'save') {
      const wrapper = document.createElement('div');
      wrapper.style.display = 'flex';
      wrapper.style.flex = '1';
      wrapper.style.gap = 'var(--space-3)';
      wrapper.style.alignItems = 'center';

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'settings-input webdav-save-input';
      input.value = this._saveFilename || 'new_file.txt';
      input.style.flex = '1';

      const saveBtn = document.createElement('button');
      saveBtn.textContent = t('Save Here');
      saveBtn.style.padding = '5px 10px';
      saveBtn.onclick = async () => {
        const name = input.value.trim();
        if (!name) return;
        const fullPath = this._currentPath === '/' ? '/' + name : this._currentPath + '/' + name;
        this.hide();
        if (this.callbacks.onFileSave) {
          this.callbacks.onFileSave(fullPath);
        }
      };

      wrapper.append(input, saveBtn);
      this._footerEl.appendChild(wrapper);
    }
  }
}
// ---- Helpers ----

function _getFileIcon(filename) {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  const icons = {
    // Code
    py: '🐍', js: '📜', ts: '📘', html: '🌐', htm: '🌐',
    css: '🎨', json: '📋', xml: '📄', md: '📝',
    c: '⚙️', cpp: '⚙️', h: '⚙️', hpp: '⚙️',
    java: '☕', go: '🔵', rs: '🦀', php: '🐘',
    sql: '🗃️', yaml: '📑', yml: '📑', sh: '🖥️',
    txt: '📄', log: '📄', ini: '⚙️', cfg: '⚙️',
    // Media & Docs
    pdf: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -0.125em;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"></path><path d="M14 2v6h6"></path><rect x="3" y="10" width="18" height="8" rx="2" fill="var(--bg-primary, white)" stroke="currentColor" stroke-width="2"></rect><text x="12" y="16" font-size="5.5" font-family="Arial, sans-serif" font-weight="900" fill="currentColor" stroke="none" text-anchor="middle">PDF</text></svg>',
    doc: '📘', docx: '📘', xls: '📊', xlsx: '📊', ppt: '📙', pptx: '📙',
    png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🖼️', svg: '🖼️', webp: '🖼️', ico: '🖼️',
    mp4: '🎬', webm: '🎬', mkv: '🎬', avi: '🎬',
    mp3: '🎵', wav: '🎵', ogg: '🎵', flac: '🎵',
    // Archives
    zip: '📦', rar: '📦', tar: '📦', gz: '📦', '7z': '📦',
  };
  return icons[ext] || '📄';
}
