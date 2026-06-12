/**
 * @module workspace-client
 * Connects to the local Express backend API
 */
export class WorkspaceClient {
  constructor() {
    this._connected = false;
  }

  async checkConnection() {
    try {
      const res = await fetch('/api/workspace/list?path=/');
      if (res.ok) {
        this._connected = true;
        return true;
      }
    } catch (e) {
      // ignore
    }
    this._connected = false;
    return false;
  }

  isConnected() {
    return this._connected;
  }

  async listDirectory(path) {
    const url = `/api/workspace/list?path=${encodeURIComponent(path)}`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to list directory: ${res.status}`);
    }
    return res.json();
  }

  async readFile(path) {
    const url = `/api/workspace/read?path=${encodeURIComponent(path)}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to read file: ${res.status}`);
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Content })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to write file: ${res.status}`);
    }
  }

  async createDirectory(path) {
    const url = `/api/workspace/mkdir?path=${encodeURIComponent(path)}`;
    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to create directory: ${res.status}`);
    }
  }

  async deletePath(path) {
    const url = `/api/workspace/delete?path=${encodeURIComponent(path)}`;
    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to delete path: ${res.status}`);
    }
  }
}
