/**
 * TabManager — Manages multiple open file tabs
 * @module tabs/tab-manager
 */

import { loadJSON, saveJSON } from '../utils/storage.js';

const SESSION_KEY = 'mypad_session';

/**
 * @typedef {Object} Tab
 * @property {number} id
 * @property {string} filename
 * @property {string|null} filePath
 * @property {string} content
 * @property {string} encoding
 * @property {string} language
 * @property {boolean} modified
 * @property {*} editorState
 * @property {*} fileHandle
 * @property {string|null} webdavPath
 * @property {number} createdAt
 */

export class TabManager extends EventTarget {
  constructor() {
    super();
    /** @type {Map<number, Tab>} */
    this.tabs = new Map();
    /** @type {number[]} */
    this.tabOrder = [];
    /** @type {number|null} */
    this.activeTabId = null;
    /** @type {number} */
    this._nextId = 1;
    /** @type {number} */
    this._untitledCount = 0;
  }

  /**
   * Create a new tab
   * @param {Partial<Tab>} options
   * @returns {Tab}
   */
  createTab(options = {}) {
    const id = this._nextId++;
    if (!options.filename) {
      this._untitledCount++;
      options.filename = `Untitled-${this._untitledCount}`;
    }

    /** @type {Tab} */
    const tab = {
      id,
      filename: options.filename,
      filePath: options.filePath || null,
      content: options.content || '',
      encoding: options.encoding || 'utf-8',
      language: options.language || 'Plain Text',
      modified: false,
      editorState: options.editorState || null,
      fileHandle: options.fileHandle || null,
      webdavPath: options.webdavPath || null,
      createdAt: Date.now(),
    };

    this.tabs.set(id, tab);
    this.tabOrder.push(id);

    this._emit('tabCreated', { tab });

    // Auto-switch to new tab
    this.switchTab(id);
    return tab;
  }

  /**
   * Close a tab
   * @param {number} id
   * @returns {Tab|null}
   */
  closeTab(id) {
    const tab = this.tabs.get(id);
    if (!tab) return null;

    const idx = this.tabOrder.indexOf(id);
    this.tabs.delete(id);
    this.tabOrder.splice(idx, 1);

    // If this was the active tab, switch to adjacent
    if (this.activeTabId === id) {
      if (this.tabOrder.length > 0) {
        const newIdx = Math.min(idx, this.tabOrder.length - 1);
        this.switchTab(this.tabOrder[newIdx]);
      } else {
        this.activeTabId = null;
        this._emit('tabSwitched', { tab: null });
      }
    }

    this._emit('tabClosed', { tab });
    return tab;
  }

  /**
   * Switch to a tab
   * @param {number} id
   * @returns {Tab|null}
   */
  switchTab(id) {
    const tab = this.tabs.get(id);
    if (!tab) return null;

    const prevId = this.activeTabId;
    this.activeTabId = id;
    this._emit('tabSwitched', { tab, prevTabId: prevId });
    return tab;
  }

  /** @returns {Tab|null} */
  getActiveTab() {
    if (this.activeTabId === null) return null;
    return this.tabs.get(this.activeTabId) || null;
  }

  /**
   * @param {number} id
   * @returns {Tab|null}
   */
  getTab(id) {
    return this.tabs.get(id) || null;
  }

  /** @returns {Tab[]} */
  getAllTabs() {
    return this.tabOrder.map((id) => this.tabs.get(id)).filter(Boolean);
  }

  /**
   * Update tab properties
   * @param {number} id
   * @param {Partial<Tab>} updates
   */
  updateTab(id, updates) {
    const tab = this.tabs.get(id);
    if (!tab) return;
    Object.assign(tab, updates);
    this._emit('tabUpdated', { tab });
  }

  /**
   * Mark tab as modified or unmodified
   * @param {number} id
   * @param {boolean} modified
   */
  markModified(id, modified) {
    const tab = this.tabs.get(id);
    if (!tab || tab.modified === modified) return;
    tab.modified = modified;
    this._emit('tabModified', { tab });
  }

  /** Switch to the next tab */
  nextTab() {
    if (this.tabOrder.length <= 1) return;
    const idx = this.tabOrder.indexOf(this.activeTabId);
    const nextIdx = (idx + 1) % this.tabOrder.length;
    this.switchTab(this.tabOrder[nextIdx]);
  }

  /** Switch to the previous tab */
  prevTab() {
    if (this.tabOrder.length <= 1) return;
    const idx = this.tabOrder.indexOf(this.activeTabId);
    const prevIdx = (idx - 1 + this.tabOrder.length) % this.tabOrder.length;
    this.switchTab(this.tabOrder[prevIdx]);
  }

  /**
   * Close all tabs except the given one
   * @param {number} id
   */
  closeOthers(id) {
    const toClose = this.tabOrder.filter((tid) => tid !== id);
    toClose.forEach((tid) => this.closeTab(tid));
  }

  /** Close all tabs */
  closeAll() {
    const toClose = [...this.tabOrder];
    toClose.forEach((tid) => this.closeTab(tid));
  }

  /**
   * Close all tabs to the right of the given tab
   * @param {number} id
   */
  closeToRight(id) {
    const idx = this.tabOrder.indexOf(id);
    if (idx < 0) return;
    const toClose = this.tabOrder.slice(idx + 1);
    toClose.forEach((tid) => this.closeTab(tid));
  }

  /**
   * Reorder a tab
   * @param {number} fromIndex
   * @param {number} toIndex
   */
  reorderTab(fromIndex, toIndex) {
    if (fromIndex < 0 || fromIndex >= this.tabOrder.length) return;
    if (toIndex < 0 || toIndex >= this.tabOrder.length) return;
    const [id] = this.tabOrder.splice(fromIndex, 1);
    this.tabOrder.splice(toIndex, 0, id);
    this._emit('tabUpdated', { tab: this.tabs.get(id) });
  }

  /**
   * Find a tab by its file path or WebDAV path
   * @param {string} path
   * @returns {Tab|null}
   */
  findTabByPath(path) {
    for (const tab of this.tabs.values()) {
      if (tab.filePath === path || tab.webdavPath === path) return tab;
    }
    return null;
  }

  /** @returns {number} */
  getTabCount() {
    return this.tabs.size;
  }

  /** @returns {boolean} */
  hasModifiedTabs() {
    for (const tab of this.tabs.values()) {
      if (tab.modified) return true;
    }
    return false;
  }

  /** Save current session to localStorage */
  saveSession() {
    const session = {
      tabs: this.getAllTabs().map((t) => ({
        filename: t.filename,
        content: t.content,
        encoding: t.encoding,
        language: t.language,
        filePath: t.filePath,
        webdavPath: t.webdavPath,
      })),
      activeIndex: this.activeTabId ? this.tabOrder.indexOf(this.activeTabId) : 0,
    };
    saveJSON(SESSION_KEY, session);
  }

  /**
   * Restore session from localStorage
   * @returns {Tab[]}
   */
  restoreSession() {
    const session = loadJSON(SESSION_KEY, null);
    if (!session || !session.tabs || session.tabs.length === 0) return [];

    const restored = [];
    for (const tabData of session.tabs) {
      const tab = this.createTab({
        filename: tabData.filename,
        content: tabData.content,
        encoding: tabData.encoding,
        language: tabData.language,
        filePath: tabData.filePath,
        webdavPath: tabData.webdavPath,
      });
      restored.push(tab);
    }

    // Restore active tab
    if (session.activeIndex >= 0 && session.activeIndex < this.tabOrder.length) {
      this.switchTab(this.tabOrder[session.activeIndex]);
    }

    return restored;
  }

  /**
   * Emit a custom event
   * @param {string} type
   * @param {Object} detail
   */
  _emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }
}
