/**
 * @module workspace-client
 * Connects to the local Express backend API
 */
export class WorkspaceClient {
  constructor() {
    this._connected = false;
    this._password = localStorage.getItem('mypad_workspace_pwd') || '';
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

  async readFile(path) {
    const url = `/api/workspace/read?path=${encodeURIComponent(path)}&${this._getCacheBuster()}`;
    const res = await fetch(url, { headers: this._getHeaders(), cache: 'no-store' });
    if (!res.ok) {
      this._handleError(res, {});
    }
    return res.arrayBuffer();
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
}
