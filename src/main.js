/**
 * MyPad++ — Main Application Bootstrap
 * Wires together all modules: editor, tabs, toolbar, statusbar, search, encoding, file handling, WebDAV
 * @module main
 */

import './index.css';
import './ui/touch-scrollbar.css';

// Editor
import { EditorManager } from './editor/editor-manager.js';
import { createExtensions } from './editor/extensions.js';
import { getLanguageByFilename, getLanguageNameByFilename, LANGUAGE_LIST } from './editor/languages.js';
import { createCustomKeymap } from './editor/keymaps.js';

// Tabs
import { TabManager } from './tabs/tab-manager.js';
import { TabBar } from './tabs/tab-bar.js';

// Encoding
import { detectEncoding } from './encoding/encoding-detector.js';
import { decode, encode } from './encoding/encoding-converter.js';
import { extractOutline } from './editor/outline.js';
import { toggleBookmark, getAllBookmarks, getNextBookmark, getPrevBookmark } from './editor/bookmarks.js';
import { getEncodingDisplayName } from './encoding/encoding-list.js';

// File handling
import { FileHandler } from './file/file-handler.js';
import { RecentFiles } from './file/recent-files.js';

// Search
import { createSearchPanel } from './search/search-panel.js';

// WebDAV
import { WebDAVClient } from './webdav/webdav-client.js';
import { WebDAVBrowser } from './webdav/webdav-browser.js';

// Server Workspace
import { WorkspaceBrowser } from './server-workspace/workspace-browser.js';

// UI
import '@fontsource/inter';
import '@fontsource/jetbrains-mono';
import { createToolbar } from './ui/toolbar.js';
import { createStatusBar } from './ui/statusbar.js';
import { createSymbolBar } from './ui/symbol-bar.js';
import { createSidebar } from './ui/sidebar.js';
import { NavigationManager } from './editor/navigation-manager.js';
import { findDefinitionInContent } from './editor/go-to-definition.js';
import { showHistoryDialog } from './ui/history-dialog.js';
import { createContextMenu, getDefaultMenuItems } from './ui/context-menu.js';
import { FileTreeSidebar } from './ui/file-tree-sidebar.js';
import { showEncodingPicker, showGoToLineDialog, showSaveConfirmDialog, showLanguagePicker, showCompareSelectorDialog, showHelpDialog, showLoading, hideLoading, updateLoadingMessage, showWorkspaceSaveAsDialog } from './ui/dialogs.js';
import { t } from './i18n.js';

// Utils
import { loadJSON, saveJSON, loadString, saveString } from './utils/storage.js';

import { undo, redo } from '@codemirror/commands';
import { nextDiagnostic } from '@codemirror/lint';
import { CompareManager } from './editor/compare-mode.js';
import { getLanguageByName } from './editor/languages.js';

// ============================================================
// Application State
// ============================================================

/** @type {string} */
let currentTheme = loadString('mypad_theme', 'light');
/** @type {number} */
let currentFontSize = parseInt(loadString('mypad_font_size', '14'), 10);
/** @type {boolean} */
let wordWrapEnabled = loadString('mypad_word_wrap', 'false') === 'true';
let globalBookmarks = loadJSON('mypad_global_bookmarks', {});

function saveGlobalBookmarks(tab) {
  const path = tab.workspacePath || tab.webdavPath || tab.filePath;
  if (!path) return;
  if (tab.bookmarks && tab.bookmarks.length > 0) {
    globalBookmarks[path] = tab.bookmarks;
  } else {
    delete globalBookmarks[path];
  }
  saveJSON('mypad_global_bookmarks', globalBookmarks);
}
/** @type {number} */
let tabSize = parseInt(loadString('mypad_tab_size', '4'), 10);
/** @type {boolean} */
let keyboardEnabled = loadString('mypad_keyboard_enabled', 'true') === 'true';

// ============================================================
// Initialize Core Services
// ============================================================

const navigationManager = new NavigationManager();

function updateNavButtons(tabId) {
  const btnBack = document.getElementById('btn-nav-back');
  const btnForward = document.getElementById('btn-nav-forward');
  if (btnBack) btnBack.disabled = !navigationManager.canGoBack(tabId);
  if (btnForward) btnForward.disabled = !navigationManager.canGoForward(tabId);
}

navigationManager.setCallback((canBack, canForward) => {
  const btnBack = document.getElementById('btn-nav-back');
  const btnForward = document.getElementById('btn-nav-forward');
  if (btnBack) btnBack.disabled = !canBack;
  if (btnForward) btnForward.disabled = !canForward;
});

const tabManager = new TabManager();
const editorManager = new EditorManager(document.getElementById('editor-container'));
const fileHandler = new FileHandler({
  onFileOpened: handleFileOpened,
  onFileSaved: handleFileSaved,
});
const recentFiles = new RecentFiles();
const webdavClient = new WebDAVClient();
const compareManager = new CompareManager(
  document.getElementById('compare-container'),
  () => toggleCompareMode()
);

// ============================================================
// Search Panel
// ============================================================

const searchPanel = createSearchPanel(editorManager);

// ============================================================
// UI Components
// ============================================================

// --- Highlight Manager ---
import { HighlightManager } from './annotepad/highlight-manager.js';
const highlightManager = new HighlightManager(editorManager);
document.getElementById('workspace').appendChild(highlightManager.element);

// ============================================================
// Toolbar & UI
// ============================================================


async function handleGoToDefinition(word, clickLine, clickCol) {
  const currentTab = tabManager.getActiveTab();
  if (!currentTab) return;

  const tabs = tabManager.getAllTabs();
  const sortedTabs = [currentTab, ...tabs.filter(t => t.id !== currentTab.id)];

  for (const tab of sortedTabs) {
    const loc = findDefinitionInContent(word, tab.content);
    if (loc) {
      if (tab.id !== currentTab.id) {
        await switchToTab(tab.id);
        // Wait for CodeMirror to initialize
        await new Promise(r => setTimeout(r, 50));
      }
      editorManager.goToLine(loc.line, loc.col);
      
      // Update nav buttons explicitly just in case
      updateNavButtons(tab.id);

      showToast(t('Found definition in') + ' ' + tab.filename, 'success');
      return;
    }
  }

  showToast(t('Definition not found in open files.'), 'warning');
}

const toolbar = createToolbar({
  onNavBack: () => { const tab = tabManager.getActiveTab(); if (tab) { const loc = navigationManager.goBack(tab.id); if (loc) editorManager.goToLine(loc.line, loc.col); } },
  onNavForward: () => { const tab = tabManager.getActiveTab(); if (tab) { const loc = navigationManager.goForward(tab.id); if (loc) editorManager.goToLine(loc.line, loc.col); } },
  onNew: () => createNewTab(),
  onOpen: () => openFile(),
  onRecent: () => {
    sidebar.updateRecentFiles(recentFiles.getAll());
    sidebar.toggle();
    const btn = document.getElementById('btn-recent');
    if (btn) {
      const isPressed = btn.getAttribute('aria-pressed') === 'true';
      btn.setAttribute('aria-pressed', String(!isPressed));
      btn.classList.toggle('toolbar-btn--active', !isPressed);
    }
  },
  onSave: () => saveFile(),
  onSaveAs: () => saveFileAs(),
  onUndo: () => { if (editorManager.view) undo(editorManager.view); },
  onRedo: () => { if (editorManager.view) redo(editorManager.view); },
  onWordWrap: () => toggleWordWrap(),
  onZoomIn: () => zoomIn(),
  onZoomOut: () => zoomOut(),
  onThemeToggle: () => toggleTheme(),
  onToggleStatusBar: () => toggleStatusBar(),
  onToggleKeyboard: () => toggleKeyboard(),
  onFullscreen: () => toggleFullscreen(),
  onFind: () => searchPanel.toggle('find'),
  onReplace: () => searchPanel.toggle('replace'),
  onNextError: () => { if (editorManager.view) nextDiagnostic(editorManager.view); },
  onHistory: () => {
    const tab = tabManager.getActiveTab();
    if (!tab) {
      showToast(t('No active file'), 'warning');
      return;
    }
    if (tab.workspacePath) {
      showHistoryDialog(
        workspaceBrowser.client,
        tab.workspacePath, 
        editorManager.getContent(),
        localStorage.getItem('mypad_theme') || 'light',
        (restoredContent) => {
          editorManager.setContent(restoredContent);
          tab.content = restoredContent;
          tab.isDirty = true;
          tabManager.updateTab(tab.id, { isDirty: true });
          updateTitle();
        }
      ).catch(e => {
        console.error(e);
        showToast('History Dialog Error: ' + e.message, 'error');
      });
    } else {
      showToast(t('Local history is only available for workspace files.'), 'warning');
    }
  },
  onCompare: () => toggleCompareMode(),
  onWebDAV: () => showWebDAV(),
  onWorkspace: () => {
    const tab = tabManager.getActiveTab();
    workspaceBrowser.show('open', tab?.filename);
  },
  onExplorer: () => fileTreeSidebar.toggle(),
  onCustomHighlights: () => highlightManager.toggle(),
  onHelp: () => showHelpDialog(),
});
document.getElementById('toolbar-container').appendChild(toolbar);

// Add app title at start of toolbar
const titleEl = document.createElement('span');
titleEl.className = 'toolbar-title';
titleEl.textContent = 'MyPad++';
toolbar.insertBefore(titleEl, toolbar.firstChild);

// --- Tab Bar ---
const tabBar = new TabBar(
  document.getElementById('tab-bar-container'),
  tabManager,
  {
    onTabSwitch: (id) => {
      switchToTab(id);
      if (!statusBarVisible) {
        statusBarVisible = true;
        saveString('mypad_status_bar', 'true');
        applyStatusBarVisibility();
      }
    },
    onTabClose: (id) => closeTab(id),
    onNewTab: () => createNewTab(),
    onTabContextMenu: (id, e) => showTabContextMenu(id, e),
  }
);

// --- Status Bar ---
const statusBar = createStatusBar();
document.getElementById('statusbar-container').appendChild(statusBar.element);



// --- Search Panel (floating overlay inside workspace) ---
const workspace = document.getElementById('workspace');
document.getElementById('editor-layout-wrapper').appendChild(searchPanel.element);

// --- Sidebar ---
const sidebar = createSidebar();
document.getElementById('sidebar-container').appendChild(sidebar.element);

sidebar.onOpenFileSelect((file) => {
  const tabs = tabManager.getAllTabs();
  const found = tabs.find(t => t.filename === file.name && (t.filePath === file.path || t.webdavPath === file.path || t.workspacePath === file.path));
  if (found) {
    switchToTab(found.id);
  }
});

sidebar.onRecentFileSelect(async (file) => {
  if (file.workspacePath) {
    let ok = false;
    try {
      ok = await workspaceBrowser.client.checkConnection();
    } catch (e) {
      if (e.status === 401) {
        const pwd = prompt('Remote access requires a password:');
        if (pwd === null) return;
        workspaceBrowser.client.setPassword(pwd);
        try {
          ok = await workspaceBrowser.client.checkConnection();
        } catch (err2) {
          if (err2.status === 401) {
            showToast(t('Incorrect password!'), 'error');
            return;
          }
        }
      }
    }

    if (!ok) {
      showToast(t('Cannot connect to Server Workspace.'), 'error');
      return;
    }
    try {
      const buffer = await workspaceBrowser.client.readFile(file.workspacePath);
      await handleWorkspaceFileOpen(file.name, buffer, file.workspacePath);
    } catch (e) {
      showToast(`${t('Failed to open recent workspace file:')} ${e.message}`, "error");
    }
  } else if (file.webdavPath) {
    showToast(t('Opening WebDAV file directly is not supported yet.'), "error");
  } else {
    showToast(t('Local files cannot be reopened automatically due to browser security.'), "error");
  }
});

// --- Context Menu ---
const contextMenu = createContextMenu();

// --- WebDAV Browser ---
const webdavBrowser = new WebDAVBrowser(webdavClient, {
  onFileOpen: handleWebDAVFileOpen,
  onFileSave: handleWebDAVFileSave,
  onError: (msg) => showToast(msg, 'error'),
});

// --- Workspace Browser ---
const workspaceBrowser = new WorkspaceBrowser({
  onFileOpen: handleWorkspaceFileOpen,
  onFileSave: handleWorkspaceFileSave,
  onError: (msg) => showToast(msg, 'error'),
});

// --- File Tree Sidebar ---
const fileTreeSidebar = new FileTreeSidebar(workspaceBrowser.client, {
  onFileSelect: (item) => {
    // Open the file in a new tab
    if (item.isDirectory) return;

    // Check if already open
    const tabs = tabManager.getAllTabs();
    const existing = tabs.find(t => 
      t.workspacePath === item.path || 
      t.filePath === item.path || 
      t.webdavPath === item.path || 
      t.path === item.path || 
      (t.filename === item.name && (t.workspacePath === item.path || !t.workspacePath))
    );

    if (existing) {
      switchToTab(existing.id);
      return;
    }

    showLoading(t('Loading...'));

    const onProgress = (loaded, total, startTime) => {
      const elapsed = (Date.now() - startTime) / 1000;
      let speed = '';
      if (elapsed > 0) {
        const bytesPerSec = loaded / elapsed;
        const kbps = (bytesPerSec / 1024).toFixed(1);
        const mbps = (bytesPerSec / 1024 / 1024).toFixed(2);
        speed = bytesPerSec > 1024 * 1024 ? `${mbps} MB/s` : `${kbps} KB/s`;
      }
      
      let msg = t('Loading...');
      if (total > 0) {
        const percent = Math.round((loaded / total) * 100);
        msg = `${t('Loading...')} ${percent}% (${speed})`;
      } else {
        const loadedKb = (loaded / 1024).toFixed(1);
        msg = `${t('Loaded')} ${loadedKb} KB (${speed})`;
      }
      updateLoadingMessage(msg);
    };

    workspaceBrowser.client.readFile(item.path, onProgress)
      .then(buffer => {
        hideLoading();
        handleWorkspaceFileOpen(item.name, buffer, item.path);
      })
      .catch(e => {
        hideLoading();
        showToast(`${t('Failed to open file:')} ${e.message}`, "error");
      });
  },
  onContextMenu: (e, item, tree) => {
    if (item.isDirectory && (item.path !== '/' || item.isPinned)) {
      contextMenu.show(e.clientX, e.clientY, [
        { label: item.isPinned ? 'Unpin from top' : 'Pin to top', action: () => tree.togglePin(item) }
      ]);
    }
  },
  onBookmarkSelect: (bm) => {
    editorManager.goToLine(bm.line, 1);
    editorManager.focus();
  },
  onOutlineSelect: (item) => {
    editorManager.goToLine(item.line, 1);
    editorManager.focus();
  }
});
const workspaceMain = document.getElementById('workspace');
const editorLayoutWrapper = document.getElementById('editor-layout-wrapper');
workspaceMain.insertBefore(fileTreeSidebar.element, editorLayoutWrapper);

// --- Highlight Manager ---
// Initialization has been moved to the top level via hoisted imports

// ============================================================
// Apply Initial Theme
// ============================================================

document.documentElement.setAttribute('data-theme', currentTheme);

// ============================================================
// Keyboard Shortcuts (via editor keymaps)
// ============================================================

const keymapCallbacks = {
  onSave: () => saveFile(),
  onSaveAs: () => saveFileAs(),
  onOpen: () => openFile(),
  onNewTab: () => createNewTab(),
  onCloseTab: () => { const tab = tabManager.getActiveTab(); if (tab) closeTab(tab.id); },
  onNextTab: () => tabManager.nextTab(),
  onPrevTab: () => tabManager.prevTab(),
  onFind: () => searchPanel.toggle('find'),
  onReplace: () => searchPanel.toggle('replace'),
  onGoToLine: () => showGoToLine(),
  onZoomIn: () => zoomIn(),
  onZoomOut: () => zoomOut(),
  onZoomReset: () => { currentFontSize = 14; applyFontSize(); },
  onToggleWordWrap: () => toggleWordWrap(),
  onToggleTheme: () => toggleTheme(),
};

// ============================================================
// Editor Management
// ============================================================

/**
 * Open/create editor for a tab
 * @param {import('./tabs/tab-manager.js').Tab} tab
 */
async function openEditorForTab(tab) {
  // Load language support
  let langSupport = null;
  try {
    langSupport = await getLanguageByFilename(tab.filename);
  } catch (e) {
    console.warn('Failed to load language for', tab.filename, e);
  }

  // Build base extensions
  const customKeymap = createCustomKeymap(keymapCallbacks);
  const baseExtensions = createExtensions({
    onUpdate: (update) => handleEditorUpdate(update, tab.id),
  });

  // Create view
  editorManager.createView(tab.content, [...baseExtensions, customKeymap], {
    theme: currentTheme,
    language: langSupport,
    wordWrap: wordWrapEnabled,
    tabSize,
    fontSize: currentFontSize,
  });

  // Restore cursor and scroll position
  if (tab.selection) {
    editorManager.view.dispatch({ selection: tab.selection });
  }
  if (tab.scrollPos) {
    editorManager.setScrollPosition(tab.scrollPos);
  }
  
  // Load from global bookmarks if not present in tab state
  if (!tab.bookmarks || tab.bookmarks.length === 0) {
    const path = tab.workspacePath || tab.webdavPath || tab.filePath;
    if (path && globalBookmarks[path]) {
      tab.bookmarks = globalBookmarks[path];
    }
  }

  if (tab.bookmarks) {
    for (const bm of tab.bookmarks) {
      editorManager.view.dispatch({ effects: toggleBookmark.of(bm.line) });
    }
  }

  editorManager.setKeyboardEnabled(keyboardEnabled);
  editorManager.focus();

  requestAnimationFrame(() => {
    if (editorManager.hasView) {
      editorManager.view.requestMeasure();
    }
  });

  updateStatusBar();
}

/**
 * Handle editor updates (cursor, selection, document changes)
 * @param {import('@codemirror/view').ViewUpdate} update
 * @param {number} tabId
 */
function handleEditorUpdate(update, tabId) {
  if (update.docChanged) {
    tabManager.markModified(tabId, true);
    const tab = tabManager.getTab(tabId);
    if (tab) {
      tab.content = update.state.doc.toString();
    }
  }

  if (update.selectionSet || update.docChanged) {
    updateStatusBar();
    
    if (update.selectionSet && highlightManager.ui.isVisible) {
      const selectedText = editorManager.getSelectionText();
      if (selectedText) {
        highlightManager.fillActiveInput(selectedText);
      }
    }
    
    if (update.selectionSet && !update.docChanged) {
      const pos = editorManager.getCursorPosition();
      if (pos) {
        navigationManager.pushState(tabId, pos.line, pos.col);
      }
    }
  }

  // Update outline and bookmarks
  if (update.docChanged || update.selectionSet) { // selectionSet might be needed if bookmarks changed
    updateSidebarPanels();
  }
}

function updateSidebarPanels() {
  const currentTab = tabManager.getActiveTab();
  if (currentTab && editorManager.hasView) {
    const state = editorManager.getState();
    const bookmarks = getAllBookmarks(state);
    const outline = extractOutline(currentTab.content, currentTab.language);
    sidebar.updateBookmarks(bookmarks);
    sidebar.updateOutline(outline);
    if (fileTreeSidebar.updateBookmarks) fileTreeSidebar.updateBookmarks(bookmarks);
    if (fileTreeSidebar.updateOutline) fileTreeSidebar.updateOutline(outline);
  } else {
    sidebar.updateBookmarks([]);
    sidebar.updateOutline([]);
    if (fileTreeSidebar.updateBookmarks) fileTreeSidebar.updateBookmarks([]);
    if (fileTreeSidebar.updateOutline) fileTreeSidebar.updateOutline([]);
  }
}

// ============================================================
// Tab Operations
// ============================================================

function createNewTab() {
  const tab = tabManager.createTab({
    content: '',
    encoding: 'utf-8',
    language: 'Plain Text',
  });
  openEditorForTab(tab);
  return tab;
}

async function switchToTab(id) {
  if (compareManager.isActive) {
    await toggleCompareMode(); // Auto-exit compare mode on tab switch
  }

  // Save current tab state
  const prevTab = tabManager.getActiveTab();
  if (prevTab && editorManager.hasView) {
    prevTab.content = editorManager.getContent();
    prevTab.selection = editorManager.getState().selection;
    prevTab.scrollPos = editorManager.getScrollPosition();
    prevTab.bookmarks = getAllBookmarks(editorManager.getState());
    saveGlobalBookmarks(prevTab);
  }

  tabManager.switchTab(id);
  const tab = tabManager.getTab(id);
  if (tab) {
    await openEditorForTab(tab);
  }
}

async function closeTab(id) {
  const tab = tabManager.getTab(id);
  if (!tab) return;

  // Save bookmarks before closing
  if (tab.id === tabManager.activeTabId && editorManager.hasView) {
    tab.bookmarks = getAllBookmarks(editorManager.getState());
  }
  saveGlobalBookmarks(tab);

  if (tab.modified) {
    showSaveConfirmDialog(
      tab.filename,
      async () => {
        // Save
        await saveFile();
        tabManager.closeTab(id);
        handleTabClosed();
      },
      () => {
        // Don't save
        tabManager.closeTab(id);
        handleTabClosed();
      },
      () => {
        // Cancel — do nothing
      }
    );
  } else {
    tabManager.closeTab(id);
    handleTabClosed();
  }
}

function handleTabClosed() {
  const activeTab = tabManager.getActiveTab();
  if (activeTab) {
    openEditorForTab(activeTab);
  } else {
    editorManager.destroyView();
    showEmptyState();
    updateStatusBar();
  }
  saveSession();
}

function showTabContextMenu(tabId, event) {
  contextMenu.show(event.clientX, event.clientY, [
    { label: 'Close', shortcut: 'Ctrl+W', action: () => closeTab(tabId) },
    { label: 'Close Others', action: () => { tabManager.closeOthers(tabId); handleTabClosed(); } },
    { label: 'Close to the Right', action: () => { tabManager.closeToRight(tabId); } },
    { type: 'separator' },
    { label: 'Close All', action: () => { tabManager.closeAll(); handleTabClosed(); } },
  ]);
}

// ============================================================
// File Operations
// ============================================================

async function openFile() {
  try {
    const fileInfo = await fileHandler.openFile();
    if (!fileInfo) return;

    // Check if already open (using file handle)
    let existing = null;
    if (fileInfo.fileHandle && fileInfo.fileHandle.isSameEntry) {
      for (const tab of tabManager.getAllTabs()) {
        if (tab.fileHandle && tab.fileHandle.isSameEntry) {
          if (await fileInfo.fileHandle.isSameEntry(tab.fileHandle)) {
            existing = tab;
            break;
          }
        }
      }
    }

    if (existing) {
      switchToTab(existing.id);
      return;
    }

    const langName = getLanguageNameByFilename(fileInfo.name);

    const tab = tabManager.createTab({
      filename: fileInfo.name,
      content: fileInfo.content,
      encoding: fileInfo.encoding,
      language: langName,
      fileHandle: fileInfo.fileHandle,
      filePath: null, // Don't use basename as path
    });
    openEditorForTab(tab);

    recentFiles.add({ name: fileInfo.name, encoding: fileInfo.encoding });
    sidebar.updateRecentFiles(recentFiles.getAll());
    saveSession();
  } catch (e) {
    console.error('Failed to open file:', e);
    showToast(`${t('Failed to open file:')} ${e.message}`, 'error');
  }
}

async function saveFile() {
  const tab = tabManager.getActiveTab();
  if (!tab) return;

  if (!editorManager.hasView) return;
  tab.content = editorManager.getContent();

  try {
    if (tab.webdavPath) {
      await saveFileToWebDAV(tab);
      return;
    }
    if (tab.workspacePath) {
      await saveFileToWorkspace(tab);
      return;
    }

    if (tab.fileHandle) {
      await fileHandler.saveFile(tab.content, tab.fileHandle);
    } else {
      // No handle, do save-as
      await saveFileAs();
      return;
    }

    tabManager.markModified(tab.id, false);
    saveSession();
    showToast(`${t('File saved:')} ${tab.filename}`, 'success');
  } catch (e) {
    console.error('Failed to save:', e);
    showToast(`${t('Error saving file:')} ${e.message}`, 'error');
  }
}

async function saveFileAs() {
  const tab = tabManager.getActiveTab();
  if (!tab || !editorManager.hasView) return;

  tab.content = editorManager.getContent();

  if (workspaceBrowser && workspaceBrowser.client && workspaceBrowser.client.isConnected()) {
    const currentPath = tab.workspacePath || tab.webdavPath || '/';
    const currentDir = currentPath.replace(/\/[^/]+$/, '') || '/';
    showWorkspaceSaveAsDialog(workspaceBrowser.client, currentDir, tab.filename, async (newPath) => {
      try {
        tab.workspacePath = newPath;
        tab.filename = newPath.split('/').pop();
        await saveFileToWorkspace(tab);
      } catch (e) {
        showToast(`${t('Error saving file:')} ${e.message}`, 'error');
      }
    });
    return;
  }

  try {
    const result = await fileHandler.saveFileAs(tab.content, tab.encoding, tab.filename);
    if (result && result.fileHandle) {
      tabManager.updateTab(tab.id, {
        fileHandle: result.fileHandle,
        filename: result.name || tab.filename,
        filePath: result.name || tab.filename,
      });
    }
    tabManager.markModified(tab.id, false);
    saveSession();
    showToast(`${t('File saved:')} ${tab.filename}`, 'success');
  } catch (e) {
    if (e.name !== 'AbortError') {
      console.error('Failed to save:', e);
      showToast(`${t('Error saving file:')} ${e.message}`, 'error');
    }
  }
}

function handleFileOpened(fileInfo) {
  // Called by FileHandler callback
}

function handleFileSaved(fileInfo) {
  // Called by FileHandler callback
}

// ============================================================
// WebDAV
// ============================================================

function showWebDAV() {
  const tab = tabManager.getActiveTab();
  webdavBrowser.show('open', tab?.filename);
}

async function handleWebDAVFileOpen(path, arrayBuffer, filename) {
  try {
    const isPDF = filename.toLowerCase().endsWith('.pdf');

    if (isPDF) {
      const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      showToast(`${t('File downloaded:')} ${filename}`, 'success');
      return;
    }

    const fileInfo = await fileHandler.openFileFromBuffer(arrayBuffer, filename);
    const langName = getLanguageNameByFilename(filename);

    const tab = tabManager.createTab({
      filename,
      content: fileInfo.content,
      encoding: fileInfo.encoding,
      language: langName,
      webdavPath: path,
    });
    openEditorForTab(tab);

    showToast(`${t('File opened:')} ${filename}`, 'success');
  } catch (e) {
    console.error('Failed to open WebDAV file:', e);
    showToast(`${t('Failed to open file:')} ${e.message}`, 'error');
  }
}

async function handleWebDAVFileSave(path) {
  const tab = tabManager.getActiveTab();
  if (!tab || !editorManager.hasView) return;

  tab.content = editorManager.getContent();
  tab.webdavPath = path;
  tab.filename = path.split('/').pop() || 'file';

  await saveFileToWebDAV(tab);
}

async function saveFileToWebDAV(tab) {
  try {
    const encoded = encode(tab.content, tab.encoding);
    await webdavClient.writeFile(tab.webdavPath, encoded);
    
    tabManager.updateTab(tab.id, {
      filename: tab.filename,
      webdavPath: tab.webdavPath,
    });
    tabManager.markModified(tab.id, false);
    showToast(`${t('File saved:')} ${tab.filename}`, 'success');
  } catch (e) {
    console.error('Failed to save to WebDAV:', e);
    showToast(`${t('Error saving file:')} ${e.message}`, 'error');
  }
}

// ============================================================
// Server Workspace
// ============================================================

async function handleWorkspaceFileOpen(filename, arrayBuffer, path) {
  try {
    const isPDF = filename.toLowerCase().endsWith('.pdf');

    if (isPDF) {
      // Direct opening/downloading logic for PDF instead of a new tab
      // Some browsers block Blob URL viewing and force download anyway, which is perfectly fine for Android.
      const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.download = filename; // Suggest downloading to avoid white screen on strict WebViews
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      showToast(`${t('File downloaded:')} ${filename}`, 'success');
      return;
    }

    const fileInfo = await fileHandler.openFileFromBuffer(arrayBuffer, filename);
    const langName = getLanguageNameByFilename(filename);

    const tab = tabManager.createTab({
      filename,
      content: fileInfo.content,
      encoding: fileInfo.encoding,
      language: langName,
      workspacePath: path,
    });
    openEditorForTab(tab);
    recentFiles.add({ name: filename, workspacePath: path, encoding: fileInfo.encoding });
    sidebar.updateRecentFiles(recentFiles.getAll());
  } catch (e) {
    showToast(`${t('Failed to open workspace file:')} ${e.message}`, 'error');
  }
}

async function handleWorkspaceFileSave(path) {
  const tab = tabManager.getActiveTab();
  if (!tab || !editorManager.hasView) return;

  tab.content = editorManager.getContent();
  tab.workspacePath = path;
  tab.filename = path.split('/').pop() || 'file';

  await saveFileToWorkspace(tab);
}

async function saveFileToWorkspace(tab) {
  try {
    const encoded = encode(tab.content, tab.encoding);
    await workspaceBrowser.client.writeFile(tab.workspacePath, encoded.buffer);

    tabManager.updateTab(tab.id, {
      filename: tab.filename,
      workspacePath: tab.workspacePath,
    });
    tabManager.markModified(tab.id, false);
    saveSession();
    showToast(`${t('File saved:')} ${tab.filename}`, 'success');
  } catch (e) {
    showToast(`${t('Workspace error:')} ${e.message}`, 'error');
  }
}

// ============================================================
// Editor Initialization
// ============================================================

// ============================================================
// View Controls
// ============================================================

function toggleTheme() {
  currentTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', currentTheme);
  saveString('mypad_theme', currentTheme);

  if (editorManager.hasView) {
    editorManager.setTheme(currentTheme);
  }

  // Update meta theme color
  const metaLight = document.querySelector('meta[name="theme-color"][media="(prefers-color-scheme: light)"]');
  const metaDark = document.querySelector('meta[name="theme-color"][media="(prefers-color-scheme: dark)"]');
  if (metaLight) metaLight.content = currentTheme === 'dark' ? '#1e1e2e' : '#f8f9fb';
  if (metaDark) metaDark.content = currentTheme === 'dark' ? '#1e1e2e' : '#f8f9fb';
}

let statusBarVisible = loadString('mypad_status_bar', 'false') === 'true';

function toggleWordWrap() {
  wordWrapEnabled = !wordWrapEnabled;
  saveString('mypad_word_wrap', String(wordWrapEnabled));
  if (editorManager.hasView) {
    editorManager.setWordWrap(wordWrapEnabled);
  }
}

function toggleStatusBar() {
  statusBarVisible = !statusBarVisible;
  saveString('mypad_status_bar', String(statusBarVisible));
  applyStatusBarVisibility();
}

function applyStatusBarVisibility() {
  const sb = document.getElementById('statusbar-container');
  if (sb) {
    sb.style.display = statusBarVisible ? 'flex' : 'none';
  }
  const btn = document.getElementById('btn-status-bar');
  if (btn) {
    btn.setAttribute('aria-pressed', String(statusBarVisible));
    btn.classList.toggle('toolbar-btn--active', statusBarVisible);
  }
}

// Call applyStatusBarVisibility at initialization
setTimeout(applyStatusBarVisibility, 100);

// Auto-hide status bar when clicking text body or other areas
document.addEventListener('click', (e) => {
  // If target was detached from DOM during event bubbling (e.g. tab re-render), ignore it
  if (!document.body.contains(e.target)) return;

  if (statusBarVisible) {
    const isTabBar = e.target.closest('.tab-bar');
    const isStatusBar = e.target.closest('.statusbar');
    const isToolbar = e.target.closest('.toolbar');
    
    if (!isTabBar && !isStatusBar && !isToolbar) {
      statusBarVisible = false;
      saveString('mypad_status_bar', 'false');
      applyStatusBarVisibility();
    }
  }
});

async function toggleCompareMode() {
  if (compareManager.isActive) {
    // Exit compare mode
    const modifiedContent = compareManager.getModifiedContent();
    const activeTab = tabManager.getActiveTab();
    if (activeTab && modifiedContent !== activeTab.content) {
      tabManager.updateTab(activeTab.id, { content: modifiedContent });
      tabManager.markModified(activeTab.id, true);
    }
    
    compareManager.stopCompare();
    document.getElementById('editor-container').style.display = 'block';
    
    if (activeTab) {
      openEditorForTab(activeTab);
    }
    
    const compareBtn = document.getElementById('btn-compare');
    if (compareBtn) {
      compareBtn.classList.remove('toolbar-btn--active');
      compareBtn.setAttribute('aria-pressed', 'false');
    }
    return;
  }

  // Enter compare mode
  const activeTab = tabManager.getActiveTab();
  if (!activeTab) {
    showToast(t('Open a file first to compare'), 'error');
    return;
  }

  const otherTabs = tabManager.getAllTabs().filter(t => t.id !== activeTab.id);
  
  showCompareSelectorDialog(otherTabs, async (selectedTabId) => {
    const targetTab = tabManager.getTab(selectedTabId);
    if (!targetTab) return;

    // We compare activeTab (right side, modified) against targetTab (left side, original)
    // Update activeTab content with current editor state before compare
    if (editorManager.hasView) {
       activeTab.content = editorManager.getContent();
    }
    
    // Get language support
    const langSupport = await getLanguageByName(activeTab.language);

    document.getElementById('editor-container').style.display = 'none';
    
    compareManager.startCompare(
      targetTab.content, // original (left)
      activeTab.content, // modified (right)
      langSupport,
      currentTheme,
      currentFontSize,
      targetTab.filename,
      activeTab.filename
    );
    
    const compareBtn = document.getElementById('btn-compare');
    if (compareBtn) {
      compareBtn.classList.add('toolbar-btn--active');
      compareBtn.setAttribute('aria-pressed', 'true');
    }
  });
}

function zoomIn() {
  currentFontSize = Math.min(currentFontSize + 2, 32);
  applyFontSize();
}

function zoomOut() {
  currentFontSize = Math.max(currentFontSize - 2, 10);
  applyFontSize();
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      showToast(`${t('Error enabling fullscreen:')} ${err.message}`, 'error');
    });
  } else {
    document.exitFullscreen();
  }
}

document.addEventListener('fullscreenchange', () => {
  const btn = document.getElementById('btn-fullscreen');
  if (btn) {
    if (document.fullscreenElement) {
      btn.classList.add('toolbar-btn--active');
    } else {
      btn.classList.remove('toolbar-btn--active');
    }
  }
});

function toggleKeyboard() {
  keyboardEnabled = !keyboardEnabled;
  saveString('mypad_keyboard_enabled', String(keyboardEnabled));
  applyKeyboardVisibility();
}

function applyKeyboardVisibility() {
  if (editorManager.hasView) {
    editorManager.setKeyboardEnabled(keyboardEnabled);
  }
  if (searchPanel && searchPanel.setKeyboardEnabled) {
    searchPanel.setKeyboardEnabled(keyboardEnabled);
  }
  if (compareManager && compareManager.isActive && typeof compareManager.setKeyboardEnabled === 'function') {
    compareManager.setKeyboardEnabled(keyboardEnabled);
  }
  
  const btn = document.getElementById('btn-keyboard');
  if (btn) {
    btn.setAttribute('aria-pressed', String(!keyboardEnabled));
    btn.classList.toggle('toolbar-btn--active', !keyboardEnabled);
  }
}

// Call applyKeyboardVisibility at initialization
setTimeout(applyKeyboardVisibility, 100);

function applyFontSize() {
  saveString('mypad_font_size', String(currentFontSize));
  if (editorManager.hasView) {
    editorManager.setFontSize(currentFontSize);
  }
  document.documentElement.style.setProperty('--search-font-size', `${currentFontSize - 1}px`);
}

function showGoToLine() {
  if (!editorManager.hasView) return;
  const maxLine = editorManager.view.state.doc.lines;
  showGoToLineDialog(maxLine, (line) => {
    if (editorManager.view) {
      const lineInfo = editorManager.view.state.doc.line(line);
      editorManager.view.dispatch({
        selection: { anchor: lineInfo.from },
        scrollIntoView: true,
      });
      editorManager.focus();
    }
  });
}

// ============================================================
// Status Bar Updates
// ============================================================

function updateStatusBar() {
  const tab = tabManager.getActiveTab();
  if (!editorManager.hasView) {
    statusBar.setCursorPosition(0, 0);
    statusBar.setSelection('', 0);
    statusBar.setEncoding('', null);
    statusBar.setLanguage('', null);
    if (tab) {
        statusBar.setFilePath(tab.workspacePath || tab.webdavPath || tab.filePath || '');
    }
    return;
  }

  const pos = editorManager.getCursorPosition();
  statusBar.setCursorPosition(pos.line, pos.col);
  statusBar.setFilePath(tab?.workspacePath || tab?.webdavPath || tab?.filePath || '');

  const selText = editorManager.getSelectionText();
  if (selText) {
    const lines = selText.split('\n').length;
    statusBar.setSelection(selText, lines);
  } else {
    statusBar.setSelection('', 0);
  }

  if (tab) {
    statusBar.setEncoding(getEncodingDisplayName(tab.encoding) || tab.encoding, () => {
      showEncodingPicker(tab.encoding, (newEnc) => {
        tabManager.updateTab(tab.id, { encoding: newEnc });
        updateStatusBar();
        showToast(`${t('Encoding changed to')} ${newEnc}`, 'info');
      });
    });

    statusBar.setLanguage(tab.language, () => {
      showLanguagePicker(tab.language, async (newLang) => {
        try {
          const langSupport = await getLanguageByName(newLang);
          if (editorManager.hasView) {
            editorManager.setLanguage(langSupport);
          }
          tabManager.updateTab(tab.id, { language: newLang });
          updateStatusBar();
          showToast(`${t('Language mode set to')} ${newLang}`, 'info');
        } catch (e) {
          console.warn('Failed to switch language:', e);
        }
      });
    });

    statusBar.setLineEnding('LF', () => {
      // Toggle line ending
    });

    statusBar.setIndentation('Spaces', tabSize, () => {
      // Cycle tab size
      tabSize = tabSize === 2 ? 4 : tabSize === 4 ? 8 : 2;
      saveString('mypad_tab_size', String(tabSize));
      if (editorManager.hasView) editorManager.setTabSize(tabSize);
      updateStatusBar();
    });

    const contentLength = tab.content?.length || 0;
    statusBar.setFileSize(contentLength);
  }
}



// ============================================================
// Empty State
// ============================================================

function showEmptyState() {
  const container = document.getElementById('editor-container');
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">📝</div>
      <div class="empty-state-title">Welcome to MyPad++</div>
      <div class="empty-state-text">A powerful code editor for Android tablets</div>
      <div class="empty-state-shortcuts">
        <div class="empty-state-shortcut"><span class="kbd">Ctrl+N</span> New File</div>
        <div class="empty-state-shortcut"><span class="kbd">Ctrl+O</span> Open File</div>
        <div class="empty-state-shortcut"><span class="kbd">Ctrl+F</span> Find</div>
      </div>
    </div>
  `;
}

// ============================================================
// Toast Notifications
// ============================================================

let toastContainer = document.getElementById('toast-container');
function showToast(message, type = 'info') {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  if (!toastContainer) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => toast.classList.add('visible'), 10);
  
  // Auto-hide
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ── Check for Language Switch Toast ───────────────────────────────────────
const langSwitched = sessionStorage.getItem('mypad_lang_toast');
if (langSwitched) {
  sessionStorage.removeItem('mypad_lang_toast');
  setTimeout(() => {
    showToast(t('Switched system language to {lang}', { lang: langSwitched }), 'success');
  }, 500);
}

// ── Application State ─────────────────────────────────────────────────────

// ============================================================
// Context Menu for Editor
// ============================================================

window.addEventListener('contextmenu', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  
  // Skip global context menu for UI elements that have their own
  const target = e.target;
  if (target.closest('.file-tree-sidebar') || target.closest('.tab-bar') || target.closest('.dialog-overlay')) {
    return; // Let the specific component handle it
  }

  try {
    e.preventDefault();
    e.stopPropagation();
    
    const x = e.clientX ?? (e.touches?.[0]?.clientX) ?? 0;
    const y = e.clientY ?? (e.touches?.[0]?.clientY) ?? 0;
    showEditorContextMenu(x, y);
  } catch (err) {
    console.error('ContextMenu Error:', err);
    showToast(`ContextMenu Error: ${err.message}`, 'error');
  }
}, true);

function showEditorContextMenu(x, y) {
  const selectedText = editorManager.getSelectionText?.() || window.getSelection().toString() || '';
  
  let menuItems = getDefaultMenuItems({
    onCut: async () => {
      const currentText = editorManager.getSelectionText?.() || window.getSelection().toString() || '';
      if (currentText) {
        try {
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(currentText);
          } else {
            fallbackCopyTextToClipboard(currentText);
          }
          if (editorManager.view) editorManager.view.dispatch(editorManager.view.state.replaceSelection(''));
          showToast(t('Cut to clipboard'), 'success');
        } catch (e) {
          showToast(t('Cannot write to clipboard. Use Ctrl+X'), 'error');
        }
      }
    },
    onCopy: async () => {
      const currentText = editorManager.getSelectionText?.() || window.getSelection().toString() || '';
      if (currentText) {
        try {
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(currentText);
          } else {
            fallbackCopyTextToClipboard(currentText);
          }
          showToast(t('Copied to clipboard'), 'success');
        } catch (e) {
          showToast(t('Cannot write to clipboard. Use Ctrl+C'), 'error');
        }
      }
    },
    onPaste: async () => {
      try {
        let text = '';
        if (navigator.clipboard && window.isSecureContext) {
          text = await navigator.clipboard.readText();
        } else {
          // Fallback paste is generally impossible via JS without permission, 
          // but we can try execCommand
          showToast(t('Cannot read clipboard. Please allow permission or use Ctrl+V'), 'error');
          return;
        }
        if (text && editorManager.view) {
          editorManager.view.dispatch(editorManager.view.state.replaceSelection(text));
        }
      } catch (e) {
        showToast(t('Cannot read clipboard. Please allow permission or use Ctrl+V'), 'error');
      }
    },
    onSelectAll: () => {
      if (editorManager.view) {
        const len = editorManager.view.state.doc.length;
        editorManager.view.dispatch({ selection: { anchor: 0, head: len } });
      }
    },
    onFind: () => searchPanel.show('find', selectedText),
    onReplace: () => searchPanel.show('replace', selectedText),
    onHighlight: () => {},
    onReference: () => {},
    onIndent: () => { if (editorManager.view) editorManager.view.dispatch({ changes: { from: 0, insert: '' } }) }, // stub for actual indent
    onOutdent: () => {},
    onToggleComment: () => {},
  });

  function fallbackCopyTextToClipboard(text) {
    var textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err);
    }
    document.body.removeChild(textArea);
  }

  if (selectedText && selectedText.length > 0 && selectedText.length < 200) {
    const hlItemIndex = menuItems.findIndex(i => i.id === 'ctx-highlight');
    if (hlItemIndex !== -1) {
      menuItems[hlItemIndex].items = [
        { label: '🟡 Yellow', action: () => highlightManager.addHighlightRule({ pattern: selectedText, color: '#f9e2af' }) },
        { label: '🟢 Green', action: () => highlightManager.addHighlightRule({ pattern: selectedText, color: '#a6e3a1' }) },
        { label: '🔵 Blue', action: () => highlightManager.addHighlightRule({ pattern: selectedText, color: '#89b4fa' }) },
        { label: '🔴 Red', action: () => highlightManager.addHighlightRule({ pattern: selectedText, color: '#f38ba8' }) }
      ];
    }
    
    const refItemIndex = menuItems.findIndex(i => i.id === 'ctx-reference');
    if (refItemIndex !== -1) {
      menuItems[refItemIndex].action = () => {
        const pos = editorManager.view.state.selection.main.head;
        searchPanel.showReference(selectedText, pos);
      };
    }
  } else {
    const hlItemIndex = menuItems.findIndex(i => i.id === 'ctx-highlight');
    if (hlItemIndex !== -1) menuItems[hlItemIndex].disabled = true;
    
    const refItemIndex = menuItems.findIndex(i => i.id === 'ctx-reference');
    if (refItemIndex !== -1) menuItems[refItemIndex].disabled = true;
  }

    contextMenu.show(x, y, menuItems);
}

// ============================================================
// Drag & Drop
// ============================================================

document.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
});

document.addEventListener('drop', async (e) => {
  e.preventDefault();
  const files = e.dataTransfer?.files;
  if (!files || files.length === 0) return;

  for (const file of files) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      const detected = detectEncoding(uint8);
      const content = decode(uint8, detected.encoding);
      const langName = getLanguageNameByFilename(file.name);

      const tab = tabManager.createTab({
        filename: file.name,
        content,
        encoding: detected.encoding,
        language: langName,
      });
      openEditorForTab(tab);

      recentFiles.add({ name: file.name, encoding: detected.encoding });
    } catch (err) {
      console.error('Failed to open dropped file:', err);
      showToast(`${t('Failed to open file:')} ${file.name}`, 'error');
    }
  }

  sidebar.updateRecentFiles(recentFiles.getAll());
});

// ============================================================
// Global Keyboard Shortcuts (for when editor doesn't have focus)
// ============================================================

// Intercept global shortcuts before CodeMirror gets them
window.addEventListener('keydown', (e) => {
  const ctrl = e.ctrlKey || e.metaKey;
  if (!ctrl) return;
  
  const key = e.key.toLowerCase();

  if (key === 'f') {
    e.preventDefault();
    e.stopPropagation();
    searchPanel.toggle('find');
  } else if (key === 'h') {
    e.preventDefault();
    e.stopPropagation();
    searchPanel.toggle('replace');
  }
}, true); // CAPTURE PHASE!

document.addEventListener('keydown', (e) => {
  if (e.key === 'F2') {
    e.preventDefault();
    if (!editorManager.hasView) return;
    const currentLine = editorManager.getCursorPosition()?.line || 1;
    let target = null;
    if (e.shiftKey) {
      target = getPrevBookmark(editorManager.getState(), currentLine);
    } else {
      target = getNextBookmark(editorManager.getState(), currentLine);
    }
    if (target) {
      editorManager.goToLine(target, 1);
      showToast(`${t('Jumped to bookmark')} Ln ${target}`);
    } else {
      showToast(t('No bookmarks found'));
    }
    return;
  }

  const ctrl = e.ctrlKey || e.metaKey;
  if (!ctrl) return;
  
  const key = e.key.toLowerCase();

  if (key === 'n') {
    e.preventDefault();
    createNewTab();
  } else if (key === 'o') {
    e.preventDefault();
    openFile();
  } else if (key === 's') {
    e.preventDefault();
    if (e.shiftKey) {
      saveFileAs();
    } else {
      saveFile();
    }
  }
});

// ============================================================
// Session Management
// ============================================================

function saveSession() {
  const activeTab = tabManager.getActiveTab();
  if (activeTab && editorManager.hasView) {
    activeTab.bookmarks = getAllBookmarks(editorManager.getState());
    saveGlobalBookmarks(activeTab);
  }
  tabManager.saveSession();
}

// Auto-save session periodically
setInterval(() => saveSession(), 30000);

// Save session before unload
window.addEventListener('beforeunload', (e) => {
  saveSession();
  if (tabManager.hasModifiedTabs()) {
    e.preventDefault();
    e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
  }
});

// ============================================================
// Tab Manager Event Listeners
// ============================================================

function mapTabsForSidebar() {
  const activeId = tabManager.activeTabId;
  return tabManager.getAllTabs().map((t) => ({
    name: t.filename,
    path: t.filePath || t.webdavPath || '',
    language: t.language || '',
    modified: t.modified,
    active: t.id === activeId,
  }));
}

tabManager.addEventListener('tabCreated', () => {
  sidebar.updateOpenFiles(mapTabsForSidebar());
});

tabManager.addEventListener('tabSwitched', () => {
  // Editor opening is done by switchToTab/createTab — just update UI
  sidebar.updateOpenFiles(mapTabsForSidebar());
  updateStatusBar();
  updateNavButtons(tabManager.activeTabId);
  updateSidebarPanels();
});

tabManager.addEventListener('tabClosed', () => {
  sidebar.updateOpenFiles(mapTabsForSidebar());
  updateSidebarPanels();
});

tabManager.addEventListener('tabUpdated', () => {
  sidebar.updateOpenFiles(mapTabsForSidebar());
  updateStatusBar();
  updateNavButtons(tabManager.activeTabId);
  updateSidebarPanels();
});

tabManager.addEventListener('tabModified', () => {
  sidebar.updateOpenFiles(mapTabsForSidebar());
  updateStatusBar();
});

// ============================================================
// Sidebar Event Integration
// ============================================================

// The sidebar provides callbacks via its update methods.
sidebar.onOpenFileSelect((file) => {
  const tab = tabManager.getAllTabs().find(t => t.path === file.path || t.filename === file.name);
  if (tab) switchToTab(tab.id);
});

sidebar.onRecentFileSelect((file) => {
  const tab = tabManager.getAllTabs().find(t => t.path === file.path);
  if (tab) {
    switchToTab(tab.id);
  } else {
    // Ideally we would open it from disk here. Since we only have recent file records,
    // we might need WebDAV or FileHandler to load it. For now, it's just a UI hook.
    showToast(t('Cannot reopen local file automatically due to browser security. Please use Open button.'), 'info');
  }
});

sidebar.onBookmarkSelect((bm) => {
  editorManager.goToLine(bm.line, 1);
  editorManager.focus();
});

sidebar.onOutlineSelect((item) => {
  editorManager.goToLine(item.line, 1);
  editorManager.focus();
});

// ============================================================
// PWA Service Worker
// ============================================================

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      console.log('Service Worker registered:', reg.scope);
    }).catch((err) => {
      console.warn('Service Worker registration failed:', err);
    });
  });
}



// ============================================================
// Initialize Application
// ============================================================

function init() {
  console.log('MyPad++ initializing...');

  // Try to restore previous session
  const restored = tabManager.restoreSession();

  if (restored.length > 0) {
    // Open editor for the active (last-switched) tab
    const activeTab = tabManager.getActiveTab();
    if (activeTab) {
      openEditorForTab(activeTab);
    }
  } else {
    // No previous session, show empty state
    showEmptyState();
  }

  // Update sidebar
  sidebar.updateRecentFiles(recentFiles.getAll());
  sidebar.updateOpenFiles(mapTabsForSidebar());
  updateSidebarPanels();
  
  // Set initial font scales
  applyFontSize();

  console.log('MyPad++ ready!');
}

// Run init
init();

window.addEventListener('mypad-goto-definition', (e) => {
  if (typeof handleGoToDefinition === 'function') {
    handleGoToDefinition(e.detail.word, e.detail.line, e.detail.col);
  }
});
