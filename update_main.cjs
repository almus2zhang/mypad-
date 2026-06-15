const fs = require('fs');
let code = fs.readFileSync('src/main.js', 'utf8');

// 1. Add imports
code = code.replace(
  "import { createSidebar } from './ui/sidebar.js';",
  "import { createSidebar } from './ui/sidebar.js';\nimport { NavigationManager } from './editor/navigation-manager.js';\nimport { findDefinitionInContent } from './editor/go-to-definition.js';"
);

// 2. Add instantiation
code = code.replace(
  "const tabManager = new TabManager();",
  "const navigationManager = new NavigationManager();\nconst tabManager = new TabManager();"
);

// 3. Add handleGoToDefinition
const handleGoToDef = `
function handleGoToDefinition(word) {
  const currentTab = tabManager.getActiveTab();
  if (!currentTab) return;

  const tabs = tabManager.getAllTabs();
  const sortedTabs = [currentTab, ...tabs.filter(t => t.id !== currentTab.id)];

  for (const tab of sortedTabs) {
    const loc = findDefinitionInContent(word, tab.content);
    if (loc) {
      if (tab.id !== currentTab.id) {
        switchToTab(tab.id);
      }
      editorManager.goToLine(loc.line, loc.col);
      showToast(t('Found definition in') + ' ' + tab.filename, 'success');
      return;
    }
  }

  showToast(t('Definition not found in open files.'), 'warning');
}

const toolbar = createToolbar({`;
code = code.replace("const toolbar = createToolbar({", handleGoToDef);

// 4. Add onNavBack and onNavForward
code = code.replace(
  "onNew: () => createNewTab(),",
  "onNavBack: () => { const tab = tabManager.getActiveTab(); if (tab) { const loc = navigationManager.goBack(tab.id); if (loc) editorManager.goToLine(loc.line, loc.col); } },\n  onNavForward: () => { const tab = tabManager.getActiveTab(); if (tab) { const loc = navigationManager.goForward(tab.id); if (loc) editorManager.goToLine(loc.line, loc.col); } },\n  onNew: () => createNewTab(),"
);

// 5. Remove title
code = code.replace(
  "const titleEl = document.createElement('span');\ntitleEl.className = 'toolbar-title';\ntitleEl.textContent = 'MyPad++';\ntoolbar.insertBefore(titleEl, toolbar.firstChild);",
  ""
);

// 6. Navigation tracking
const tabSwitching = `function updateNavButtons(tabId) {
  const btnBack = document.getElementById('btn-nav-back');
  const btnForward = document.getElementById('btn-nav-forward');
  if (btnBack) btnBack.disabled = !navigationManager.canGoBack(tabId);
  if (btnForward) btnForward.disabled = !navigationManager.canGoForward(tabId);
}

navigationManager.setCallback(() => {
  const activeTab = tabManager.getActiveTab();
  if (activeTab) updateNavButtons(activeTab.id);
});

tabManager.onTabChanged((tabId) => {
  const tab = tabManager.getTab(tabId);
  updateNavButtons(tabId);
  if (tab) {`;
code = code.replace("tabManager.onTabChanged((tabId) => {\n  const tab = tabManager.getTab(tabId);\n  if (tab) {", tabSwitching);

// Track on cursor change
code = code.replace(
  "const langSupport = await getLanguageByFilename(tab.filename);",
  "const pos = editorManager.getCursorPosition();\n      if (pos) navigationManager.pushState(tabId, pos.line, pos.col);\n      const langSupport = await getLanguageByFilename(tab.filename);"
);

// Track on update
code = code.replace(
  "if (update.selectionSet || update.docChanged) {\n    updateStatusBar();",
  "if (update.selectionSet || update.docChanged) {\n    updateStatusBar();\n    if (update.selectionSet && !update.docChanged) {\n      const pos = editorManager.getCursorPosition();\n      if (pos) navigationManager.pushState(tabId, pos.line, pos.col);\n    }"
);

// Track on tab open
code = code.replace(
  "editorManager.setState(tab.editorState);\n    }",
  "editorManager.setState(tab.editorState);\n    }\n    const pos = editorManager.getCursorPosition();\n    if (pos) navigationManager.pushState(tabId, pos.line, pos.col);"
);

// Delete on tab close
code = code.replace(
  "tabManager.onTabClosed((tabId) => {\n  if (!tabManager.hasTabs()) {",
  "tabManager.onTabClosed((tabId) => {\n  navigationManager.removeTab(tabId);\n  if (!tabManager.hasTabs()) {"
);

fs.writeFileSync('src/main.js', code);
