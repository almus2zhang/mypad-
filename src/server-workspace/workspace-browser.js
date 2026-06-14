/**
 * WorkspaceBrowser — File browser UI for Server Workspace
 * @module server-workspace/workspace-browser
 */

import { WorkspaceClient } from './workspace-client.js';

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
    await this.navigateTo(this._currentPath);
  }

  hide() {
    this._overlay.classList.remove('visible');
  }

  async navigateTo(path) {
    this._currentPath = path || '/';
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
    this._currentPath = 'Search: ' + ext;
    this._loading = true;
    
    // Custom breadcrumb for search results
    this._breadcrumbEl.innerHTML = '';
    const titleSpan = document.createElement('span');
    titleSpan.textContent = `Workspace Search: ${ext}`;
    titleSpan.style.fontWeight = 'bold';
    titleSpan.style.color = 'var(--text-primary)';
    
    const backBtn = document.createElement('button');
    backBtn.textContent = '← Back to root';
    backBtn.className = 'annotepad-btn';
    backBtn.style.padding = '2px 8px';
    backBtn.style.fontSize = '12px';
    backBtn.style.marginLeft = 'auto';
    backBtn.addEventListener('click', () => this.navigateTo('/'));

    this._breadcrumbEl.append(titleSpan, backBtn);
    this._breadcrumbEl.style.display = 'flex';
    this._breadcrumbEl.style.alignItems = 'center';

    this._fileListEl.innerHTML = '<div style="text-align:center;padding:2rem;">Searching...</div>';

    try {
      const items = await this.client.searchFiles(ext);
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

    this._fileListEl = document.createElement('div');
    this._fileListEl.className = 'webdav-file-list';
    this._fileListEl.style.flex = '1';
    this._fileListEl.style.overflowY = 'auto';

    body.append(this._breadcrumbEl, this._filterBarEl, this._fileListEl);

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
      empty.style.color = 'var(--text-tertiary)';
      empty.textContent = 'Empty directory';
      this._fileListEl.appendChild(empty);
      return;
    }

    items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'webdav-file-item';
      
      const icon = document.createElement('span');
      icon.className = 'webdav-file-icon';
      icon.textContent = item.isDirectory ? '📁' : '📄';

      const name = document.createElement('span');
      name.className = 'webdav-file-name';
      name.textContent = item.name;

      el.append(icon, name);

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

      const delBtn = document.createElement('button');
      delBtn.className = 'btn';
      delBtn.style.padding = '2px 8px';
      delBtn.style.fontSize = '12px';
      delBtn.textContent = 'Delete';
      delBtn.onclick = async (e) => {
        e.stopPropagation();
        if (confirm(`Delete ${item.name}?`)) {
          try {
            await this.client.deletePath(item.path);
            this.navigateTo(this._currentPath);
          } catch(err) {
            alert('Failed to delete: ' + err.message);
          }
        }
      };
      el.appendChild(delBtn);

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
      newFolderBtn.className = 'btn';
      newFolderBtn.textContent = 'New Folder';
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
      saveBtn.className = 'btn btn-primary';
      saveBtn.textContent = 'Save Here';
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
