import { MergeView } from '@codemirror/merge';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { keymap, drawSelection, highlightActiveLine, highlightActiveLineGutter, lineNumbers } from '@codemirror/view';
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching } from '@codemirror/language';
import { decode } from '../encoding/encoding-converter.js';
import { detectEncoding } from '../encoding/encoding-detector.js';
import { t } from '../i18n.js';
import { lightTheme, darkTheme } from '../editor/themes.js';
import { getLanguageByFilename } from '../editor/languages.js';

export async function showHistoryDialog(workspaceClient, currentFilePath, currentContent, themeName, onRestore) {
  // Build DOM
  const overlay = document.createElement('div');
  overlay.className = 'dialog-overlay';

  const dialog = document.createElement('div');
  dialog.className = 'history-dialog';

  // Header
  const header = document.createElement('div');
  header.className = 'history-dialog-header';
  const title = document.createElement('h3');
  title.textContent = t('Local History') + ' - ' + currentFilePath;
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '✕';
  closeBtn.className = 'dialog-close-btn';
  closeBtn.onclick = () => overlay.remove();
  header.appendChild(title);
  header.appendChild(closeBtn);

  // Content
  const content = document.createElement('div');
  content.className = 'history-dialog-content';

  // Sidebar (List)
  const sidebar = document.createElement('div');
  sidebar.className = 'history-sidebar';
  
  // Merge View Container
  const mergeContainer = document.createElement('div');
  mergeContainer.className = 'history-merge-container';

  content.appendChild(sidebar);
  content.appendChild(mergeContainer);

  // Footer
  const footer = document.createElement('div');
  footer.className = 'dialog-footer';
  const restoreBtn = document.createElement('button');
  restoreBtn.className = 'dialog-btn primary';
  restoreBtn.textContent = t('Restore Selected Version');
  restoreBtn.disabled = true;
  
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'dialog-btn';
  cancelBtn.textContent = t('Cancel');
  cancelBtn.onclick = () => overlay.remove();

  footer.appendChild(cancelBtn);
  footer.appendChild(restoreBtn);

  dialog.appendChild(header);
  dialog.appendChild(content);
  dialog.appendChild(footer);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  // Basic styling extensions
  const langSupport = await getLanguageByFilename(currentFilePath);
  const extensions = [
    lineNumbers(),
    highlightActiveLineGutter(),
    drawSelection(),
    EditorState.allowMultipleSelections.of(true),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    bracketMatching(),
    highlightActiveLine(),
    keymap.of([...defaultKeymap, ...historyKeymap]),
    themeName === 'dark' ? darkTheme : lightTheme,
    ...(langSupport ? [langSupport] : [])
  ];

  let mergeView = null;
  let selectedContent = '';

  // Load history list
  try {
    const list = await workspaceClient.historyList(currentFilePath);
    
    if (list.length === 0) {
      const emptyItem = document.createElement('div');
      emptyItem.className = 'history-item empty';
      emptyItem.textContent = t('No history available.');
      sidebar.appendChild(emptyItem);
      return;
    }

    list.sort((a, b) => b.timestamp - a.timestamp); // Newest first

    list.forEach((item, index) => {
      const el = document.createElement('div');
      el.className = 'history-item';
      
      const date = new Date(item.timestamp);
      const isToday = new Date().toDateString() === date.toDateString();
      const timeStr = isToday ? date.toLocaleTimeString() : date.toLocaleString();
      
      const sizeKB = (item.size / 1024).toFixed(1) + ' KB';
      
      el.innerHTML = `
        <div class="history-item-time">${timeStr}</div>
        <div class="history-item-size">${sizeKB}</div>
      `;
      
      el.onclick = async () => {
        // Highlight selection
        Array.from(sidebar.children).forEach(c => c.classList.remove('selected'));
        el.classList.add('selected');
        
        // Fetch content
        const buffer = await workspaceClient.historyRead(currentFilePath, item.timestamp);
        const { encoding } = detectEncoding(buffer);
        selectedContent = decode(buffer, encoding);
        
        restoreBtn.disabled = false;
        
        if (mergeView) {
          mergeView.destroy();
        }
        
        mergeView = new MergeView({
          a: {
            doc: selectedContent,
            extensions: [...extensions, EditorState.readOnly.of(true)]
          },
          b: {
            doc: currentContent,
            extensions: [...extensions, EditorState.readOnly.of(true)]
          },
          parent: mergeContainer,
          orientation: 'a-b'
        });
      };
      
      sidebar.appendChild(el);
    });

    // Auto select first item
    if (sidebar.children.length > 0) {
      sidebar.children[0].click();
    }
  } catch (e) {
    console.error(e);
    const err = document.createElement('div');
    err.textContent = t('Error loading history.');
    sidebar.appendChild(err);
  }

  restoreBtn.onclick = () => {
    if (selectedContent) {
      onRestore(selectedContent);
      overlay.remove();
    }
  };
}
