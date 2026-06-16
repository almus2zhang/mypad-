/**
 * @module workspace-client
 * Connects to the local Express backend API
 */
export class WorkspaceClient {
  constructor() {
    this._connected = false;
    this._password = localStorage.getItem('mypad_workspace_pwd') || '';
    
    let clientId = localStorage.getItem('mypad_client_id');
    if (!clientId) {
      clientId = 'client_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('mypad_client_id', clientId);
    }
    this._clientId = clientId;
    console.log('[MyPad++] Your unique Client ID is:', this._clientId);
  }

  setPassword(pwd) {
    this._password = pwd;
    if (pwd) {
      localStorage.setItem('mypad_workspace_pwd', pwd);
    } else {
      localStorage.removeItem('mypad_workspace_pwd');
    }
  }

  _getHeaders(additionalHeaders = {}) {
    const headers = { ...additionalHeaders };
    if (this._password) {
      headers['x-workspace-password'] = this._password;
    }
    if (this._clientId) {
      headers['x-client-id'] = this._clientId;
    }
    return headers;
  }

  _getCacheBuster() {
    return `_t=${Date.now()}`;
  }

  _handleError(res, errData) {
    if (res.status === 401) {
      const err = new Error('UNAUTHORIZED');
      err.status = 401;
      throw err;
    }
    throw new Error(errData.error || `Failed request: ${res.status}`);
  }

  async checkConnection() {
    try {
      const res = await fetch(`/api/workspace/list?path=/&${this._getCacheBuster()}`, {
        headers: this._getHeaders(),
        cache: 'no-store'
      });
      if (res.ok) {
        this._connected = true;
        return true;
      }
      if (res.status === 401) {
        const err = new Error('UNAUTHORIZED');
        err.status = 401;
        throw err;
      }
    } catch (e) {
      if (e.status === 401) throw e;
      // ignore other errors
    }
    this._connected = false;
    return false;
  }

  isConnected() {
    return this._connected;
  }

  async listDirectory(path) {
    const url = `/api/workspace/list?path=${encodeURIComponent(path)}&${this._getCacheBuster()}`;
    const res = await fetch(url, { headers: this._getHeaders(), cache: 'no-store' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      this._handleError(res, err);
    }
    return res.json();
  }

  async searchFiles({ ext, q, workspaces }) {
    let url = `/api/workspace/search?${this._getCacheBuster()}`;
    if (ext) url += `&ext=${encodeURIComponent(ext)}`;
    if (q) url += `&q=${encodeURIComponent(q)}`;
    if (workspaces) url += `&workspaces=${encodeURIComponent(workspaces)}`;
    const res = await fetch(url, { headers: this._getHeaders(), cache: 'no-store' });
    if (!res.ok) {
      if (res.status === 503) {
        throw new Error('Index is still building, please try again in a few seconds.');
      }
      const err = await res.json().catch(() => ({}));
      this._handleError(res, err);
    }
    return res.json();
  }

  async reindex() {
    const url = `/api/workspace/reindex?${this._getCacheBuster()}`;
    const res = await fetch(url, { headers: this._getHeaders(), cache: 'no-store' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      this._handleError(res, err);
    }
    return res.json();
  }

  async checkFileStats(paths) {
    const url = `/api/workspace/stat?${this._getCacheBuster()}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        ...this._getHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ paths }),
      cache: 'no-store'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      this._handleError(res, err);
    }
    const data = await res.json();
    return data.results;
  }

  async readFile(path, onProgress) {
    const url = `/api/workspace/read?path=${encodeURIComponent(path)}&${this._getCacheBuster()}`;
    const res = await fetch(url, { headers: this._getHeaders(), cache: 'no-store' });
    if (!res.ok) {
      this._handleError(res, {});
    }

    if (!onProgress || !res.body) {
      return res.arrayBuffer();
    }

    const contentLength = res.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    let loaded = 0;
    
    const reader = res.body.getReader();
    const chunks = [];
    const startTime = Date.now();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        loaded += value.length;
        onProgress(loaded, total, startTime);
      }
    }

    const arrayBuffer = new Uint8Array(loaded);
    let offset = 0;
    for (const chunk of chunks) {
      arrayBuffer.set(chunk, offset);
      offset += chunk.length;
    }
    return arrayBuffer.buffer;
  }

  async writeFile(path, arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    
    // Chunked Base64 encoding to avoid call stack size limits on large files
    const chunks = [];
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      chunks.push(String.fromCharCode.apply(null, chunk));
    }
    const base64Content = btoa(chunks.join(''));

    const url = `/api/workspace/write?path=${encodeURIComponent(path)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this._getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ base64Content })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      this._handleError(res, err);
    }
  }

  async createDirectory(path) {
    const url = `/api/workspace/mkdir?path=${encodeURIComponent(path)}`;
    const res = await fetch(url, { 
      method: 'POST',
      headers: this._getHeaders()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      this._handleError(res, err);
    }
  }

  async deletePath(path) {
    const url = `/api/workspace/delete?path=${encodeURIComponent(path)}`;
    const res = await fetch(url, { 
      method: 'POST',
      headers: this._getHeaders()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      this._handleError(res, err);
    }
  }

  async historyList(path) {
    const url = `/api/workspace/history/list?path=${encodeURIComponent(path)}`;
    const res = await fetch(url, { headers: this._getHeaders(), cache: 'no-store' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      this._handleError(res, err);
    }
    return await res.json();
  }

  async historyRead(path, timestamp) {
    const url = `/api/workspace/history/read?path=${encodeURIComponent(path)}&timestamp=${timestamp}`;
    const res = await fetch(url, { headers: this._getHeaders(), cache: 'no-store' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      this._handleError(res, err);
    }
    const buffer = await res.arrayBuffer();
    return new Uint8Array(buffer);
  }
}
