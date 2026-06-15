import { MergeView, goToNextChunk, goToPreviousChunk } from '@codemirror/merge';
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
  console.log('showHistoryDialog called with path:', currentFilePath);
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
  const mergeWrapper = document.createElement('div');
  mergeWrapper.className = 'history-merge-wrapper';
  mergeWrapper.style.display = 'flex';
  mergeWrapper.style.flexDirection = 'column';
  mergeWrapper.style.flex = '1';
  mergeWrapper.style.overflow = 'hidden';

  const mergeToolbar = document.createElement('div');
  mergeToolbar.className = 'history-merge-toolbar';

  const btnPrev = document.createElement('button');
  btnPrev.innerHTML = '↑ ' + t('Prev Diff');
  btnPrev.title = t('Previous Difference');
  
  const btnNext = document.createElement('button');
  btnNext.innerHTML = '↓ ' + t('Next Diff');
  btnNext.title = t('Next Difference');

  const btnToggle = document.createElement('button');
  let isCollapsed = false;
  btnToggle.innerHTML = t('Show Only Diffs');

  const lblSync = document.createElement('label');
  lblSync.style.fontSize = '12px';
  lblSync.style.display = 'flex';
  lblSync.style.alignItems = 'center';
  lblSync.style.gap = '6px';
  lblSync.style.color = 'var(--text-secondary)';
  lblSync.style.cursor = 'pointer';
  lblSync.style.marginLeft = 'auto'; // push to right
  lblSync.innerHTML = '<input type="checkbox" checked> Sync Scroll';
  const cbSync = lblSync.querySelector('input');

  mergeToolbar.appendChild(btnPrev);
  mergeToolbar.appendChild(btnNext);
  mergeToolbar.appendChild(btnToggle);
  mergeToolbar.appendChild(lblSync);

  const mergeContainer = document.createElement('div');
  mergeContainer.className = 'history-merge-container';

  mergeWrapper.appendChild(mergeToolbar);
  mergeWrapper.appendChild(mergeContainer);

  content.appendChild(sidebar);
  content.appendChild(mergeWrapper);

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
  console.log('Dialog DOM appended to body');

  // Trigger animation
  requestAnimationFrame(() => {
    overlay.classList.add('visible');
    dialog.classList.add('visible'); // If dialog itself needs a visible class
  });

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

  btnPrev.onclick = () => {
    if (mergeView) goToPreviousChunk(mergeView.b);
  };
  
  btnNext.onclick = () => {
    if (mergeView) goToNextChunk(mergeView.b);
  };

  btnToggle.onclick = () => {
    isCollapsed = !isCollapsed;
    btnToggle.innerHTML = isCollapsed ? t('Show Full Text') : t('Show Only Diffs');
    if (mergeView) {
      mergeView.reconfigure({
        collapseUnchanged: isCollapsed ? { margin: 3 } : undefined
      });
    }
  };

  // Load history list
  try {
    console.log('Fetching history list...');
    const list = await workspaceClient.historyList(currentFilePath);
    console.log('History list fetched:', list);
    
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
          orientation: 'a-b',
          collapseUnchanged: isCollapsed ? { margin: 3 } : undefined
        });

        // Fix layout for proper scrolling
        if (mergeView.dom) {
          mergeView.dom.style.flex = '1';
          mergeView.dom.style.minHeight = '0';
          mergeView.dom.style.display = 'flex';
          mergeView.dom.style.flexDirection = 'column';
          
          const editorsWrap = mergeView.dom.querySelector('.cm-mergeViewEditors');
          if (editorsWrap) {
            editorsWrap.style.flex = '1';
            editorsWrap.style.minHeight = '0';
          }

          const editors = mergeView.dom.querySelectorAll('.cm-mergeViewEditor');
          editors.forEach(ed => {
            ed.style.flex = '1';
            ed.style.minHeight = '0';
            ed.style.display = 'flex';
            ed.style.flexDirection = 'column';
          });

          // Synchronize scrolling
          const scrollers = mergeView.dom.querySelectorAll('.cm-scroller');
          if (scrollers.length === 2) {
            const [scrollerA, scrollerB] = scrollers;
            let isSyncingLeft = false;
            let isSyncingRight = false;

            scrollerA.addEventListener('scroll', () => {
              if (!cbSync.checked) return;
              if (!isSyncingLeft) {
                isSyncingRight = true;
                scrollerB.scrollTop = scrollerA.scrollTop;
                scrollerB.scrollLeft = scrollerA.scrollLeft;
              }
              isSyncingLeft = false;
            });

            scrollerB.addEventListener('scroll', () => {
              if (!cbSync.checked) return;
              if (!isSyncingRight) {
                isSyncingLeft = true;
                scrollerA.scrollTop = scrollerB.scrollTop;
                scrollerA.scrollLeft = scrollerB.scrollLeft;
              }
              isSyncingRight = false;
            });
          }
        }
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
