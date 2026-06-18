import { t } from '../i18n.js';

/**
 * WebDAVBrowser — File browser UI for WebDAV
 * @module webdav/webdav-browser
 */

export class WebDAVBrowser {
  /**
   * @param {import('./webdav-client').WebDAVClient} client
   * @param {Object} callbacks
   * @param {function(string, ArrayBuffer, string):void} callbacks.onFileOpen
   * @param {function(string):void} [callbacks.onFileSave]
   * @param {function(string):void} [callbacks.onError]
   */
  constructor(client, callbacks) {
    this.client = client;
    this.callbacks = callbacks;
    /** @type {string} */
    this._currentPath = '/';
    /** @type {string} */
    this._mode = 'open';
    /** @type {boolean} */
    this._loading = false;
    /** @type {string|null} */
    this._saveFilename = null;

    this._overlay = null;
    this._dialog = null;
    this._fileListEl = null;
    this._breadcrumbEl = null;
    this._statusEl = null;
    this._connectBar = null;
    this._footerEl = null;

    this._buildUI();
  }

  /**
   * Show the WebDAV browser
   * @param {'open'|'save'} mode
   * @param {string} [saveFilename]
   */
  async show(mode = 'open', saveFilename = '') {
    this._mode = mode;
    this._saveFilename = saveFilename;

    this._overlay.classList.add('visible');

    // Update footer based on mode
    this._updateFooter();

    // If connected, load current directory
    if (this.client.isConnected()) {
      this._connectBar.style.display = 'none';
      await this.navigateTo(this._currentPath);
    } else {
      this._connectBar.style.display = '';
      this._showConnectionForm();
    }
  }

  /** Hide the browser dialog */
  hide() {
    this._overlay.classList.remove('visible');
  }

  /**
   * Navigate to a directory
   * @param {string} path
   */
  async navigateTo(path) {
    this._currentPath = path || '/';

    // Intercept search paths so we don't try to PROPFIND a search string
    if (this._currentPath.startsWith('Search: ')) {
      const q = this._currentPath.substring(8);
      return this.searchQuery(q);
    }

    this._loading = true;
    this._renderBreadcrumb();
    this._fileListEl.innerHTML = '<div style="text-align:center;padding:2rem;"><div class="spinner" style="margin:0 auto;"></div><p style="margin-top:1rem;color:var(--text-tertiary);">Loading...</p></div>';

    try {
      const items = await this.client.listDirectory(path);
      this._renderFileList(items);
    } catch (e) {
      this._fileListEl.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--danger);">
        <p>Failed to load directory</p>
        <p style="font-size:var(--font-size-xs);margin-top:0.5rem;">${_escapeHtml(e.message)}</p>
      </div>`;
      this.callbacks.onError?.(e.message);
    } finally {
      this._loading = false;
    }
  }

  // ---- UI Building ----

  _buildUI() {
    // Overlay
    this._overlay = document.createElement('div');
    this._overlay.className = 'dialog-overlay';

    // Dialog
    this._dialog = document.createElement('div');
    this._dialog.className = 'dialog';
    this._dialog.style.width = '600px';
    this._dialog.style.maxWidth = '95vw';
    this._dialog.style.height = '500px';
    this._dialog.style.maxHeight = '85vh';

    // Header
    const header = document.createElement('div');
    header.className = 'dialog-header';

    const title = document.createElement('h2');
    title.className = 'dialog-title';
    title.textContent = t('WebDAV Browser');
    title.style.margin = '0';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'dialog-close';
    closeBtn.innerHTML = '×';
    closeBtn.addEventListener('click', () => this.hide());

    header.append(title, closeBtn);

    // Connection bar
    this._connectBar = document.createElement('div');
    this._connectBar.style.padding = 'var(--space-4)';
    this._connectBar.style.borderBottom = '1px solid var(--dialog-border)';

    // Body
    const body = document.createElement('div');
    body.className = 'dialog-body';
    body.style.padding = '0';
    body.style.display = 'flex';
    body.style.flexDirection = 'column';
    body.style.flex = '1';
    body.style.minHeight = '0';

    // Breadcrumb
    this._breadcrumbEl = document.createElement('div');
    this._breadcrumbEl.className = 'webdav-breadcrumb';

    // Filter bar
    this._filterBarEl = document.createElement('div');
    this._filterBarEl.style.padding = '8px 16px';
    this._filterBarEl.style.display = 'flex';
    this._filterBarEl.style.gap = '8px';
    this._filterBarEl.style.flexWrap = 'wrap';
    this._filterBarEl.style.borderBottom = '1px solid var(--dialog-border)';
    this._filterBarEl.style.background = 'var(--bg-secondary)';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search by name... (Requires index daemon)';
    searchInput.className = 'input';
    searchInput.style.padding = '4px 8px';
    searchInput.style.fontSize = '12px';
    searchInput.style.flex = '1';

    const refreshBtn = document.createElement('button');
    refreshBtn.className = 'btn';
    refreshBtn.textContent = '🔄 Refresh Index';
    refreshBtn.title = 'Fetch latest index from server';
    refreshBtn.style.padding = '4px 8px';
    refreshBtn.style.fontSize = '12px';
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.disabled = true;
      try {
        await this.client.loadIndex(true);
        if (searchInput.value.trim()) {
          await this.searchQuery(searchInput.value.trim());
        }
      } catch (e) {
        alert(e.message);
      } finally {
        refreshBtn.disabled = false;
      }
    });

    let searchTimeout = null;
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.trim();
      clearTimeout(searchTimeout);
      if (!q) {
        if (this._currentPath.startsWith('Search:')) {
          this.navigateTo('/');
        }
        return;
      }
      searchTimeout = setTimeout(() => {
        this.searchQuery(q);
      }, 300);
    });

    this._filterBarEl.append(searchInput, refreshBtn);

    // File list
    this._fileListEl = document.createElement('div');
    this._fileListEl.className = 'webdav-file-list';
    this._fileListEl.style.flex = '1';
    this._fileListEl.style.overflowY = 'auto';

    body.append(this._breadcrumbEl, this._filterBarEl, this._fileListEl);

    // Footer
    this._footerEl = document.createElement('div');
    this._footerEl.className = 'dialog-footer';

    // Status
    this._statusEl = document.createElement('span');
    this._statusEl.style.flex = '1';
    this._statusEl.style.fontSize = 'var(--font-size-xs)';
    this._statusEl.style.color = 'var(--text-tertiary)';

    this._dialog.append(header, this._connectBar, body, this._footerEl);
    this._overlay.appendChild(this._dialog);
    document.getElementById('dialog-overlay')?.parentElement?.appendChild(this._overlay)
      || document.body.appendChild(this._overlay);

    // Close on overlay click
    this._overlay.addEventListener('click', (e) => {
      if (e.target === this._overlay) this.hide();
    });

    // Close on Escape
    this._overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.hide();
    });
  }

  _showConnectionForm() {
    const profiles = this.client.loadProfiles();

    this._connectBar.innerHTML = '';

    // Profile selector
    if (profiles.length > 0) {
      const profileRow = document.createElement('div');
      profileRow.style.display = 'flex';
      profileRow.style.gap = 'var(--space-3)';
      profileRow.style.marginBottom = 'var(--space-3)';
      profileRow.style.alignItems = 'center';

      const select = document.createElement('select');
      select.className = 'settings-select';
      select.style.flex = '1';
      const defaultOpt = document.createElement('option');
      defaultOpt.value = '';
      defaultOpt.textContent = t('— Select saved connection —');
      select.appendChild(defaultOpt);

      profiles.forEach((p) => {
        const opt = document.createElement('option');
        opt.value = p.name;
        opt.textContent = `${p.name} (${p.url})`;
        select.appendChild(opt);
      });

      select.addEventListener('change', () => {
        const profile = profiles.find((p) => p.name === select.value);
        if (!profile) return;
        // The inputs are defined below, but will be accessible when this event fires
        const inputs = Array.from(this._connectBar.querySelectorAll('input'));
        const getInp = (id) => inputs.find(i => i.parentElement.querySelector('label')?.textContent.includes(id));
        if (getInp('Name')) getInp('Name').value = profile.name || '';
        if (getInp('URL')) getInp('URL').value = profile.url || '';
        if (getInp('Username')) getInp('Username').value = profile.username || '';
        if (getInp('Password')) {
          getInp('Password').value = '';
          getInp('Password').placeholder = '•••••••• (unchanged)';
        }
        if (getInp('Index File Path')) getInp('Index File Path').value = profile.indexPath || '/webdav_index.json';
      });

      const connectProfileBtn = document.createElement('button');
      connectProfileBtn.className = 'btn btn-primary';
      connectProfileBtn.textContent = t('Connect');
      connectProfileBtn.addEventListener('click', async () => {
        const profile = profiles.find((p) => p.name === select.value);
        if (!profile) return;
        try {
          connectProfileBtn.disabled = true;
          connectProfileBtn.textContent = t('Connecting...');
          await this.client.connect(profile.url, profile.username, profile.password, profile.indexPath);
          this._connectBar.style.display = 'none';
          await this.navigateTo('/');
        } catch (e) {
          alert('Connection failed: ' + e.message);
        } finally {
          connectProfileBtn.disabled = false;
          connectProfileBtn.textContent = t('Connect');
        }
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn';
      deleteBtn.textContent = '🗑️';
      deleteBtn.title = 'Delete saved connection';
      deleteBtn.addEventListener('click', () => {
        if (!select.value) return;
        if (confirm(`Delete connection "${select.value}"?`)) {
          this.client.deleteProfile(select.value);
          this._showConnectionForm();
        }
      });

      profileRow.append(select, connectProfileBtn, deleteBtn);
      this._connectBar.appendChild(profileRow);
    }

    // New connection form
    const form = document.createElement('div');
    form.style.display = 'flex';
    form.style.flexDirection = 'column';
    form.style.gap = 'var(--space-3)';

    const nameInput = _createInput('Connection Name (optional)', 'e.g. My Home NAS', 'webdav-name');

    const urlInput = _createInput('WebDAV URL', 'https://dav.example.com/files', 'webdav-url');
    const userInput = _createInput('Username', 'username', 'webdav-user');
    const passInput = _createInput('Password', 'password', 'webdav-pass');
    passInput.querySelector('input').type = 'password';

    const indexInput = _createInput('Index File Path (optional)', '/webdav_index.json', 'webdav-index');

    const rememberLabel = document.createElement('label');
    rememberLabel.className = 'checkbox-label';
    const rememberCb = document.createElement('input');
    rememberCb.type = 'checkbox';
    rememberCb.checked = true;
    rememberLabel.append(rememberCb, document.createTextNode('Remember this connection'));

    const connectBtn = document.createElement('button');
    connectBtn.className = 'btn btn-primary';
    connectBtn.textContent = t('Connect');
    connectBtn.style.marginTop = '10px';

    connectBtn.addEventListener('click', async () => {
      const url = urlInput.querySelector('input').value.trim();
      const user = userInput.querySelector('input').value.trim();
      const pass = passInput.querySelector('input').value;
      let name = nameInput.querySelector('input').value.trim();
      const indexPath = indexInput.querySelector('input').value.trim() || '/webdav_index.json';

      if (!url) { alert('Please enter a WebDAV URL'); return; }

      let finalPass = pass;
      if (!finalPass) {
        const existing = this.client.loadProfiles().find(p => p.name === name || p.url === url);
        if (existing) {
          finalPass = existing.password;
        }
      }

      try {
        connectBtn.disabled = true;
        connectBtn.textContent = t('Connecting...');
        await this.client.connect(url, user, finalPass, indexPath);

        // Save profile if checked
        if (rememberCb.checked && url) {
          if (!name) {
            try { name = new URL(url).hostname; } catch { name = url; }
          }
          this.client.saveProfile({ name, url, username: user, password: finalPass, indexPath });
        }

        this._connectBar.style.display = 'none';
        await this.navigateTo('/');
      } catch (e) {
        alert('Connection failed: ' + e.message);
      } finally {
        connectBtn.disabled = false;
        connectBtn.textContent = t('Connect');
      }
    });

    form.append(nameInput, urlInput, userInput, passInput, indexInput, rememberLabel, connectBtn);
    this._connectBar.appendChild(form);

    this._fileListEl.innerHTML = `<div class="empty-state" style="padding:2rem;">
      <p style="color:var(--text-tertiary);">Connect to a WebDAV server to browse files</p>
    </div>`;
    this._breadcrumbEl.innerHTML = '';
  }

  async searchQuery(q) {
    this._currentPath = 'Search: ' + q;
    
    this._breadcrumbEl.innerHTML = '';
    const title = document.createElement('span');
    title.textContent = 'Search Results';
    title.style.fontWeight = 'bold';
    
    const backBtn = document.createElement('button');
    backBtn.textContent = '← Back to root';
    backBtn.className = 'btn';
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

    this._fileListEl.innerHTML = '<div style="padding:2rem;text-align:center;">Searching...</div>';

    try {
      const index = await this.client.loadIndex();
      const terms = q.trim().split(/\s+/).filter(Boolean);
      const regexStr = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*');
      const regex = new RegExp(regexStr, 'i');

      const matches = index.filter(p => {
        return regex.test(p);
      });
      
      const items = matches.slice(0, 100).map(p => {
        const isDir = p.endsWith('/');
        const cleanPath = p.replace(/\/$/, '');
        const name = cleanPath.split('/').pop() || '/';
        return {
          name,
          path: p.startsWith('/') ? p : '/' + cleanPath,
          isDirectory: isDir,
          size: 0,
          lastModified: ''
        };
      });

      this._renderFileList(items);
      this._statusEl.textContent = `Found ${matches.length} items (showing ${items.length})`;
    } catch (e) {
      this._fileListEl.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--danger);">
        <p>Search failed</p>
        <p style="font-size: 12px; margin-top: 10px;">${e.message}</p>
      </div>`;
      this._statusEl.textContent = 'Search failed';
    }
  }

  _renderBreadcrumb() {
    if (this._currentPath.startsWith('Search:')) return;
    this._breadcrumbEl.innerHTML = '';
    const parts = this._currentPath.split('/').filter(Boolean);

    // Root
    const rootBtn = document.createElement('button');
    rootBtn.className = 'webdav-breadcrumb-item';
    rootBtn.textContent = '🏠';
    rootBtn.addEventListener('click', () => this.navigateTo('/'));
    this._breadcrumbEl.appendChild(rootBtn);

    let accumulated = '';
    parts.forEach((part, i) => {
      const sep = document.createElement('span');
      sep.className = 'webdav-breadcrumb-separator';
      sep.textContent = '›';
      this._breadcrumbEl.appendChild(sep);

      accumulated += '/' + part;
      const pathForNav = accumulated;

      const btn = document.createElement('button');
      btn.className = 'webdav-breadcrumb-item';
      btn.textContent = part;
      if (i < parts.length - 1) {
        btn.addEventListener('click', () => this.navigateTo(pathForNav));
      } else {
        btn.style.fontWeight = '600';
        btn.style.color = 'var(--text-primary)';
      }
      this._breadcrumbEl.appendChild(btn);
    });
  }

  /**
   * @param {Array} items
   */
  _renderFileList(items) {
    this._fileListEl.innerHTML = '';

    if (items.length === 0) {
      this._fileListEl.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-tertiary);">Empty directory</div>';
      return;
    }

    items.forEach((item) => {
      const row = document.createElement('button');
      row.className = 'webdav-file-item';

      // Icon
      const icon = document.createElement('span');
      icon.className = 'webdav-file-icon';
      icon.innerHTML = item.isDirectory ? '📁' : _getFileIcon(item.name);
      row.appendChild(icon);

      // Name
      const name = document.createElement('span');
      name.className = 'webdav-file-name';
      name.textContent = item.name;
      row.appendChild(name);

      // Size
      if (!item.isDirectory) {
        const size = document.createElement('span');
        size.className = 'webdav-file-size';
        size.textContent = _formatSize(item.size);
        row.appendChild(size);
      }

      // Date
      if (item.lastModified) {
        const date = document.createElement('span');
        date.className = 'webdav-file-date';
        date.textContent = _formatDate(item.lastModified);
        row.appendChild(date);
      }

      // Click handler
      row.addEventListener('click', async () => {
        if (item.isDirectory) {
          await this.navigateTo(item.path);
        } else if (this._mode === 'open') {
          await this._openFile(item);
        } else {
          // In save mode, select filename
          const filenameInput = this._footerEl.querySelector('#webdav-save-filename');
          if (filenameInput) filenameInput.value = item.name;
        }
      });

      this._fileListEl.appendChild(row);
    });

    this._statusEl.textContent = `${items.length} items`;
  }

  /**
   * @param {Object} item
   */
  async _openFile(item) {
    try {
      this._fileListEl.style.opacity = '0.5';
      const buffer = await this.client.readFile(item.path);
      this.callbacks.onFileOpen(item.path, buffer, item.name);
      this.hide();
    } catch (e) {
      alert('Failed to open file: ' + e.message);
      this.callbacks.onError?.(e.message);
    } finally {
      this._fileListEl.style.opacity = '1';
    }
  }

  _updateFooter() {
    this._footerEl.innerHTML = '';

    this._footerEl.appendChild(this._statusEl);

    if (this._mode === 'save') {
      const filenameInput = document.createElement('input');
      filenameInput.className = 'input';
      filenameInput.id = 'webdav-save-filename';
      filenameInput.placeholder = 'Filename...';
      filenameInput.value = this._saveFilename || '';
      filenameInput.style.flex = '1';
      filenameInput.style.maxWidth = '200px';

      const saveBtn = document.createElement('button');
      saveBtn.className = 'btn btn-primary';
      saveBtn.textContent = 'Save Here';
      saveBtn.addEventListener('click', () => {
        const filename = filenameInput.value.trim();
        if (!filename) { alert('Please enter a filename'); return; }
        const savePath = this._currentPath.replace(/\/+$/, '') + '/' + filename;
        this.callbacks.onFileSave?.(savePath);
        this.hide();
      });

      this._footerEl.append(filenameInput, saveBtn);
    }

    // New folder button
    const newFolderBtn = document.createElement('button');
    newFolderBtn.className = 'btn';
    newFolderBtn.textContent = 'New Folder';
    newFolderBtn.addEventListener('click', async () => {
      const name = prompt('Folder name:');
      if (!name) return;
      try {
        const path = this._currentPath.replace(/\/+$/, '') + '/' + name;
        await this.client.createDirectory(path);
        await this.navigateTo(this._currentPath);
      } catch (e) {
        alert('Failed to create folder: ' + e.message);
      }
    });
    this._footerEl.insertBefore(newFolderBtn, this._statusEl.nextSibling);

    // Disconnect button
    const disconnectBtn = document.createElement('button');
    disconnectBtn.className = 'btn';
    disconnectBtn.textContent = t('Disconnect');
    disconnectBtn.style.marginRight = '10px';
    disconnectBtn.addEventListener('click', () => {
      this.client.disconnect();
      this._connectBar.style.display = '';
      this._showConnectionForm();
    });
    this._footerEl.appendChild(disconnectBtn);
  }
}

// ---- Helpers ----

function _createInput(label, placeholder, id) {
  const wrapper = document.createElement('div');
  const lbl = document.createElement('label');
  lbl.className = 'settings-label';
  lbl.textContent = label;
  lbl.htmlFor = id;

  const input = document.createElement('input');
  input.className = 'input';
  input.placeholder = placeholder;
  input.id = id;

  wrapper.append(lbl, input);
  return wrapper;
}

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

function _formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
}

function _formatDate(dateStr) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function _escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
