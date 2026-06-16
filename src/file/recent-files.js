/**
 * @module recent-files
 * @description Manages a most-recently-used (MRU) list of opened files,
 * persisted to localStorage.  Used by the UI to show a "Recent Files" menu.
 */

import { loadJSON, saveJSON, remove as removeKey } from '../utils/storage.js';

/** localStorage key for the recent-files list */
const STORAGE_KEY = 'mypad_recent_files';

/**
 * @typedef {Object} RecentFileEntry
 * @property {string} name - Filename (basename).
 * @property {string} [path] - Full path or URL (if known).
 * @property {string} encoding - Encoding used when the file was last opened.
 * @property {number} lastOpened - Timestamp (ms since epoch) of last open.
 */

/**
 * Maintains a bounded, most-recently-used list of opened files.
 */
export class RecentFiles {
  /**
   * @param {number} [maxItems=20] Maximum entries to keep.
   */
  constructor(maxItems = 20) {
    /** @type {number} */
    this.maxItems = maxItems;

    /** @type {RecentFileEntry[]} */
    this.entries = loadJSON(STORAGE_KEY, []);

    // Defensive: ensure we loaded an array
    if (!Array.isArray(this.entries)) {
      this.entries = [];
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Persistence                                                     */
  /* ---------------------------------------------------------------- */

  /** Persist the current list to localStorage. */
  _save() {
    saveJSON(STORAGE_KEY, this.entries);
  }

  /* ---------------------------------------------------------------- */
  /*  Public API                                                      */
  /* ---------------------------------------------------------------- */

  /**
   * Add a file to the top of the recent list.
   * If the file already exists (matched by name + path) it is moved
   * to the top and its metadata is updated.
   *
   * @param {Object} fileInfo
   * @param {string} fileInfo.name - Filename.
   * @param {string} [fileInfo.path] - Optional full path or URL.
   * @param {string} fileInfo.encoding - Encoding value.
   */
  add(fileInfo) {
    const entry = {
      name: fileInfo.name,
      path: fileInfo.path || undefined,
      workspacePath: fileInfo.workspacePath || undefined,
      webdavPath: fileInfo.webdavPath || undefined,
      encoding: fileInfo.encoding,
      lastOpened: Date.now(),
    };

    // Remove any existing duplicate
    this.entries = this.entries.filter(
      (e) => !(e.name === entry.name && (e.path === entry.path && e.workspacePath === entry.workspacePath && e.webdavPath === entry.webdavPath))
    );

    // Insert at the top
    this.entries.unshift(entry);

    // Trim to max size
    if (this.entries.length > this.maxItems) {
      this.entries = this.entries.slice(0, this.maxItems);
    }

    this._save();
  }

  /**
   * Return all recent file entries, most recent first.
   * @returns {RecentFileEntry[]}
   */
  getAll() {
    return this.entries.slice();
  }

  /**
   * Remove a specific entry by filename.
   * If multiple entries share the same filename (different paths),
   * all of them are removed.
   *
   * @param {string} filename - The filename to remove.
   */
  remove(filename) {
    this.entries = this.entries.filter((e) => e.name !== filename);
    this._save();
  }

  /**
   * Clear the entire recent-files list.
   */
  clear() {
    this.entries = [];
    removeKey(STORAGE_KEY);
  }
}
