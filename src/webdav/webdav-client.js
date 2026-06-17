/**
 * WebDAVClient — Native fetch-based WebDAV client
 * No external dependencies — uses browser APIs directly
 * @module webdav/webdav-client
 */

import { loadJSON, saveJSON } from '../utils/storage.js';

const PROFILES_KEY = 'mypad_webdav_profiles';

export class WebDAVClient {
  constructor() {
    /** @type {string|null} */
    this._baseUrl = null;
    /** @type {string|null} */
    this._authHeader = null;
    /** @type {boolean} */
    this._connected = false;
  }

  /**
   * Connect to a WebDAV server
   * @param {string} url - Base URL (e.g. https://dav.example.com/files)
   * @param {string} username
   * @param {string} password
   * @returns {Promise<boolean>}
   */
  async connect(url, username, password) {
    // Normalize URL — remove trailing slash
    this._baseUrl = url.replace(/\/+$/, '');
    this._authHeader = 'Basic ' + btoa(username + ':' + password);

    try {
      // Test connection with a PROPFIND on root
      await this.listDirectory('/');
      this._connected = true;
      return true;
    } catch (e) {
      this._connected = false;
      this._baseUrl = null;
      this._authHeader = null;
      throw new Error(`Connection failed: ${e.message}`);
    }
  }

  /** Disconnect */
  disconnect() {
    this._baseUrl = null;
    this._authHeader = null;
    this._connected = false;
  }

  /** @returns {boolean} */
  isConnected() {
    return this._connected;
  }

  /**
   * List directory contents
   * @param {string} path
   * @returns {Promise<Array<{name:string, path:string, isDirectory:boolean, size:number, lastModified:string, contentType:string}>>}
   */
  async listDirectory(path) {
    const url = this._resolvePath(path);

    const response = await this._fetch(url, {
      method: 'PROPFIND',
      headers: {
        ...this._getHeaders(),
        'Depth': '1',
        'Content-Type': 'application/xml; charset=utf-8',
      },
      body: `<?xml version="1.0" encoding="UTF-8"?>
<D:propfind xmlns:D="DAV:">
  <D:prop>
    <D:displayname/>
    <D:getcontentlength/>
    <D:getlastmodified/>
    <D:getcontenttype/>
    <D:resourcetype/>
  </D:prop>
</D:propfind>`,
    });

    if (!response.ok && response.status !== 207) {
      throw new Error(`PROPFIND failed: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    return this._parsePropfindResponse(text, path);
  }

  /**
   * Read a file
   * @param {string} path
   * @returns {Promise<ArrayBuffer>}
   */
  async readFile(path, onProgress) {
    const url = this._resolvePath(path);

    const response = await this._fetch(url, {
      method: 'GET',
      headers: this._getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`GET failed: ${response.status} ${response.statusText}`);
    }

    if (!onProgress || !response.body) {
      return response.arrayBuffer();
    }

    const contentLength = response.headers.get('content-length') || response.headers.get('x-original-content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    let loaded = 0;
    
    const reader = response.body.getReader();
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

  /**
   * Write/upload a file
   * @param {string} path
   * @param {ArrayBuffer|Uint8Array|string} data
   * @returns {Promise<void>}
   */
  async writeFile(path, data) {
    const url = this._resolvePath(path);

    const response = await this._fetch(url, {
      method: 'PUT',
      headers: {
        ...this._getHeaders(),
        'Content-Type': 'application/octet-stream',
      },
      body: data,
    });

    if (!response.ok && response.status !== 201 && response.status !== 204) {
      throw new Error(`PUT failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Create a directory
   * @param {string} path
   * @returns {Promise<void>}
   */
  async createDirectory(path) {
    const url = this._resolvePath(path);

    const response = await this._fetch(url, {
      method: 'MKCOL',
      headers: this._getHeaders(),
    });

    if (!response.ok && response.status !== 201) {
      throw new Error(`MKCOL failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Delete a file or directory
   * @param {string} path
   * @returns {Promise<void>}
   */
  async deleteItem(path) {
    const url = this._resolvePath(path);

    const response = await this._fetch(url, {
      method: 'DELETE',
      headers: this._getHeaders(),
    });

    if (!response.ok && response.status !== 204) {
      throw new Error(`DELETE failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Move/rename a file or directory
   * @param {string} fromPath
   * @param {string} toPath
   * @returns {Promise<void>}
   */
  async moveItem(fromPath, toPath) {
    const url = this._resolvePath(fromPath);
    const destUrl = this._resolvePath(toPath);

    const response = await this._fetch(url, {
      method: 'MOVE',
      headers: {
        ...this._getHeaders(),
        'Destination': destUrl,
        'Overwrite': 'F',
      },
    });

    if (!response.ok && response.status !== 201 && response.status !== 204) {
      throw new Error(`MOVE failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Check if a path exists
   * @param {string} path
   * @returns {Promise<boolean>}
   */
  async exists(path) {
    const url = this._resolvePath(path);
    try {
      const response = await this._fetch(url, {
        method: 'HEAD',
        headers: this._getHeaders(),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // ---- Connection Profiles ----

  /**
   * Save a connection profile
   * @param {{ name: string, url: string, username: string, password: string }} profile
   */
  saveProfile(profile) {
    const profiles = this.loadProfiles();
    const idx = profiles.findIndex((p) => p.name === profile.name);
    const saved = {
      name: profile.name,
      url: profile.url,
      username: profile.username,
      password: btoa(profile.password), // Basic obfuscation
    };
    if (idx >= 0) {
      profiles[idx] = saved;
    } else {
      profiles.push(saved);
    }
    saveJSON(PROFILES_KEY, profiles);
  }

  /**
   * Load saved profiles
   * @returns {Array<{ name: string, url: string, username: string, password: string }>}
   */
  loadProfiles() {
    const profiles = loadJSON(PROFILES_KEY, []);
    return profiles.map((p) => {
      let pwd = '';
      if (p.password) {
        try {
          pwd = atob(p.password);
        } catch (e) {
          // Fallback if password was saved in plaintext before base64 obfuscation was added
          pwd = p.password;
        }
      }
      return {
        name: p.name,
        url: p.url,
        username: p.username,
        password: pwd,
      };
    });
  }

  /**
   * Delete a profile
   * @param {string} name
   */
  deleteProfile(name) {
    const profiles = loadJSON(PROFILES_KEY, []);
    const filtered = profiles.filter((p) => p.name !== name);
    saveJSON(PROFILES_KEY, filtered);
  }

  // ---- Internal Helpers ----

  /**
   * Resolve a path to a full URL
   * @param {string} path
   * @returns {string}
   */
  _resolvePath(path) {
    if (!this._baseUrl) throw new Error('Not connected');
    const cleanPath = path.startsWith('/') ? path : '/' + path;
    return this._baseUrl + cleanPath;
  }

  /**
   * Get common request headers
   * @returns {Object}
   */
  _getHeaders() {
    const headers = {};
    if (this._authHeader) {
      headers['Authorization'] = this._authHeader;
    }
    return headers;
  }

  /**
   * Proxy-aware fetch wrapper
   * Sends request to our NodeJS backend proxy to bypass CORS
   */
  async _fetch(url, options = {}) {
    const proxyOptions = {
      ...options,
      headers: {
        ...(options.headers || {}),
        'X-Proxy-Target': url,
      },
    };
    return fetch('/api/proxy', proxyOptions);
  }

  /**
   * Parse PROPFIND XML response
   * @param {string} xmlText
   * @param {string} requestPath
   * @returns {Array}
   */
  _parsePropfindResponse(xmlText, requestPath) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');

    const responses = doc.querySelectorAll('response');
    const items = [];

    // Normalize request path for comparison
    const normReqPath = this._normalizePath(requestPath);

    responses.forEach((resp) => {
      const href = resp.querySelector('href')?.textContent || '';
      const normHref = this._normalizePath(decodeURIComponent(href));

      // Skip the directory itself (first response is usually the requested dir)
      if (normHref === normReqPath || normHref + '/' === normReqPath || normReqPath + '/' === normHref) {
        return;
      }

      const displayName = resp.querySelector('displayname')?.textContent || '';
      const contentLength = resp.querySelector('getcontentlength')?.textContent || '0';
      const lastModified = resp.querySelector('getlastmodified')?.textContent || '';
      const contentType = resp.querySelector('getcontenttype')?.textContent || '';
      const resourceType = resp.querySelector('resourcetype');
      const isDirectory = resourceType?.querySelector('collection') !== null;

      // Extract name from href if displayname is empty
      const name = displayName || this._getNameFromPath(normHref);

      items.push({
        name,
        path: normHref,
        isDirectory,
        size: parseInt(contentLength, 10) || 0,
        lastModified,
        contentType,
      });
    });

    // Sort: directories first, then alphabetically
    items.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });

    return items;
  }

  /**
   * Normalize a path
   * @param {string} path
   * @returns {string}
   */
  _normalizePath(path) {
    // Remove base URL prefix if present
    if (this._baseUrl) {
      try {
        const baseUrlObj = new URL(this._baseUrl);
        if (path.startsWith(baseUrlObj.pathname)) {
          path = path.slice(baseUrlObj.pathname.length);
        }
      } catch {}
    }
    // Remove trailing slash, ensure leading slash
    path = path.replace(/\/+$/, '') || '/';
    if (!path.startsWith('/')) path = '/' + path;
    return path;
  }

  /**
   * Get filename from a path
   * @param {string} path
   * @returns {string}
   */
  _getNameFromPath(path) {
    const clean = path.replace(/\/+$/, '');
    const parts = clean.split('/');
    return parts[parts.length - 1] || '/';
  }
}
