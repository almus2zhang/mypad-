import { MergeView } from '@codemirror/merge';
import { EditorView } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { createExtensions } from './extensions.js';
import { getTheme } from './themes.js';

/**
 * Manages the side-by-side Code Comparison (Diff) view using @codemirror/merge.
 */
export class CompareManager {
  /**
   * @param {HTMLElement} containerElement - The DOM element that will host the merge view
   * @param {Function} [onClose] - Callback when the close button is clicked
   */
  constructor(containerElement, onClose = () => {}) {
    this.container = containerElement;
    this.mergeView = null;
    this.isActive = false;
    this.onClose = onClose;
    this.keyboardCompartment = new Compartment();
  }

  /**
   * Start compare mode
   * @param {string} originalContent - The left editor (usually original/base)
   * @param {string} modifiedContent - The right editor (usually modified)
   * @param {import('@codemirror/language').LanguageSupport|null} languageSupport 
   * @param {string} theme - 'light' or 'dark'
   * @param {number} fontSize 
   * @param {string} originalFileName
   * @param {string} modifiedFileName
   */
  startCompare(originalContent, modifiedContent, languageSupport, theme, fontSize, originalFileName = 'Original', modifiedFileName = 'Modified') {
    this.isActive = true;

    // Normalize line endings to \n to prevent the diff algorithm from marking unchanged lines as different
    originalContent = (originalContent || '').replace(/\r/g, '');
    modifiedContent = (modifiedContent || '').replace(/\r/g, '');

    this.container.innerHTML = '';
    this.container.style.display = 'flex'; 
    this.container.style.flexDirection = 'column';
    this.container.style.flex = '1';
    this.container.style.minHeight = '0';
    this.container.style.minWidth = '0';
    this.container.style.overflow = 'hidden';

    this.container.innerHTML = `
      <div class="compare-header" style="display: flex; justify-content: space-between; align-items: center; padding: 4px 12px; background: var(--toolbar-bg); border-bottom: 1px solid var(--toolbar-border);">
        <div style="display: flex; gap: 20px; flex: 1; min-width: 0;">
          <div style="flex: 1; text-align: left; font-family: var(--font-mono); font-size: 13px; color: var(--text-primary); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${originalFileName}">${originalFileName} (Original)</div>
          <div style="flex: 1; text-align: left; font-family: var(--font-mono); font-size: 13px; color: var(--text-primary); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${modifiedFileName}">${modifiedFileName} (Modified)</div>
        </div>
        <div style="display: flex; gap: 12px; align-items: center; flex-shrink: 0; margin-left: 12px;">
          <button id="btn-prev-diff" class="annotepad-btn" style="padding: 2px 6px; display: flex; align-items: center; gap: 4px; font-size: 13px;" title="Previous Diff">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg> Prev Diff
          </button>
          <button id="btn-next-diff" class="annotepad-btn" style="padding: 2px 6px; display: flex; align-items: center; gap: 4px; font-size: 13px;" title="Next Diff">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg> Next Diff
          </button>
          <div style="width: 1px; height: 16px; background: var(--toolbar-border); margin: 0 4px;"></div>
          <button id="btn-merge-right" class="annotepad-btn" style="padding: 2px 6px; display: flex; align-items: center; gap: 4px; font-size: 13px;" title="Merge Selection to Right">
            Merge &rarr;
          </button>
          <button id="btn-copy-all-right" class="annotepad-btn" style="padding: 2px 6px; display: flex; align-items: center; gap: 4px; font-size: 13px; color: var(--text-error);" title="Replace Local with Server (Copy All)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path><path d="M3 22v-6h6"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path></svg> Reload Server
          </button>
          <div style="width: 1px; height: 16px; background: var(--toolbar-border); margin: 0 4px;"></div>
          <button id="btn-merge-left" class="annotepad-btn" style="padding: 2px 6px; display: flex; align-items: center; gap: 4px; font-size: 13px;" title="Merge Selection to Left">
            &larr; Merge
          </button>
          <div style="width: 1px; height: 16px; background: var(--toolbar-border); margin: 0 4px;"></div>
          <label style="font-size: 13px; display: flex; align-items: center; gap: 6px; color: var(--text-secondary); cursor: pointer; margin-left: 8px;">
            <input type="checkbox" id="sync-scroll-cb" checked> Sync Scroll
          </label>
          <button id="btn-close-compare" class="annotepad-btn" style="padding: 2px 6px; display: flex; align-items: center; justify-content: center; margin-left: 8px; color: var(--text-secondary);" title="Close Compare">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>
      <div id="merge-view-wrapper" style="flex: 1; display: flex; flex-direction: column; min-height: 0; min-width: 0;"></div>
    `;

    const wrapper = this.container.querySelector('#merge-view-wrapper');

    // Base extensions for both editors
    // Note: Line wrapping is generally not recommended in side-by-side diffs
    // because it misaligns the lines, so we enforce false.
    const baseExtensions = createExtensions();
    const isKeyboardBlocked = localStorage.getItem('mypad_keyboard_enabled') === 'false';
    
    const extensions = [
      ...baseExtensions,
      getTheme(theme),
      languageSupport ? languageSupport : [],
      EditorState.tabSize.of(4),
      EditorView.theme({ "&": { fontSize: fontSize + "px" } }),
      this.keyboardCompartment.of(isKeyboardBlocked ? [EditorView.contentAttributes.of({ inputmode: 'none' })] : [])
    ];

    const normOriginal = originalContent.replace(/\r\n?/g, '\n');
    const normModified = modifiedContent.replace(/\r\n?/g, '\n');

    this.mergeView = new MergeView({
      a: {
        doc: normOriginal,
        extensions: [
          ...extensions,
        ]
      },
      b: {
        doc: normModified,
        extensions: [
          ...extensions,
        ]
      },
      parent: wrapper,
      diffConfig: { scanLimit: 50000 }
    });
    
    // Fix layout for proper scrolling
    if (this.mergeView.dom) {
      this.mergeView.dom.style.flex = '1';
      this.mergeView.dom.style.minHeight = '0';
      this.mergeView.dom.style.display = 'flex';
      this.mergeView.dom.style.flexDirection = 'column';
      
      const editorsWrap = this.mergeView.dom.querySelector('.cm-mergeViewEditors');
      if (editorsWrap) {
        editorsWrap.style.flex = '1';
        editorsWrap.style.minHeight = '0';
      }

      const editors = this.mergeView.dom.querySelectorAll('.cm-mergeViewEditor');
      editors.forEach(ed => {
        ed.style.flex = '1';
        ed.style.minHeight = '0';
        ed.style.display = 'flex';
        ed.style.flexDirection = 'column';
      });

      const btnPrev = this.container.querySelector('#btn-prev-diff');
      const btnNext = this.container.querySelector('#btn-next-diff');
      const btnMergeRight = this.container.querySelector('#btn-merge-right');
      const btnCopyAllRight = this.container.querySelector('#btn-copy-all-right');
      const btnMergeLeft = this.container.querySelector('#btn-merge-left');
      const btnClose = this.container.querySelector('#btn-close-compare');

      btnPrev.addEventListener('click', () => this.goToPrevDiff());
      btnNext.addEventListener('click', () => this.goToNextDiff());
      btnMergeRight.addEventListener('click', () => this.mergeSelection(this.mergeView.a, this.mergeView.b));
      btnCopyAllRight.addEventListener('click', () => {
        if (confirm('Are you sure you want to completely overwrite your local changes with the server version?')) {
          const content = this.mergeView.a.state.doc.toString();
          this.mergeView.b.dispatch({
            changes: { from: 0, to: this.mergeView.b.state.doc.length, insert: content }
          });
        }
      });
      btnMergeLeft.addEventListener('click', () => this.mergeSelection(this.mergeView.b, this.mergeView.a));
      btnClose.addEventListener('click', () => {
        if (typeof this.onClose === 'function') {
          this.onClose();
        }
      });

      // Synchronize scrolling
      const scrollers = this.mergeView.dom.querySelectorAll('.cm-scroller');
      if (scrollers.length === 2) {
        const [scrollerA, scrollerB] = scrollers;
        let isSyncingLeft = false;
        let isSyncingRight = false;
        const cb = this.container.querySelector('#sync-scroll-cb');

        scrollerA.addEventListener('scroll', () => {
          if (!cb.checked) return;
          if (!isSyncingLeft) {
            isSyncingRight = true;
            scrollerB.scrollTop = scrollerA.scrollTop;
            scrollerB.scrollLeft = scrollerA.scrollLeft;
          }
          isSyncingLeft = false;
        });

        scrollerB.addEventListener('scroll', () => {
          if (!cb.checked) return;
          if (!isSyncingRight) {
            isSyncingLeft = true;
            scrollerA.scrollTop = scrollerB.scrollTop;
            scrollerA.scrollLeft = scrollerB.scrollLeft;
          }
          isSyncingRight = false;
        });
      }
    }
  }

  goToNextDiff() {
    if (!this.mergeView) return;
    const viewB = this.mergeView.b;
    const currentPos = viewB.state.selection.main.head;
    
    const chunks = this.mergeView.chunks || [];
    if (chunks.length === 0) return;

    let nextChunk = chunks.find(ch => ch.fromB > currentPos);
    if (!nextChunk) nextChunk = chunks[0]; // loop to start
    
    viewB.dispatch({
      selection: { anchor: nextChunk.fromB },
      scrollIntoView: true
    });
    viewB.focus();
  }

  goToPrevDiff() {
    if (!this.mergeView) return;
    const viewB = this.mergeView.b;
    const currentPos = viewB.state.selection.main.head;
    
    const chunks = this.mergeView.chunks || [];
    if (chunks.length === 0) return;

    let prevChunk = [...chunks].reverse().find(ch => ch.fromB < currentPos);
    if (!prevChunk) prevChunk = chunks[chunks.length - 1]; // loop to end
    
    viewB.dispatch({
      selection: { anchor: prevChunk.fromB },
      scrollIntoView: true
    });
    viewB.focus();
  }

  /**
   * Merge selection from source view to target view
   * @param {EditorView} sourceView 
   * @param {EditorView} targetView 
   */
  mergeSelection(sourceView, targetView) {
    if (!sourceView || !targetView) return;
    const { state } = sourceView;
    let textToInsert = state.sliceDoc(state.selection.main.from, state.selection.main.to);
    
    // If no text is selected, grab the entire current line
    if (!textToInsert) {
      const line = state.doc.lineAt(state.selection.main.head);
      textToInsert = line.text + '\\n';
    }

    const targetPos = targetView.state.selection.main.head;
    targetView.dispatch({
      changes: { from: targetPos, insert: textToInsert },
      selection: { anchor: targetPos + textToInsert.length },
      scrollIntoView: true
    });
    targetView.focus();
  }

  /**
   * Get the content from the right-side (modified) editor
   * @returns {string}
   */
  getModifiedContent() {
    if (!this.mergeView) return '';
    return this.mergeView.b.state.doc.toString();
  }

  /**
   * Stop compare mode and clean up
   */
  stopCompare() {
    this.isActive = false;
    if (this.mergeView) {
      this.mergeView.destroy();
      this.mergeView = null;
    }
    this.container.innerHTML = '';
    this.container.style.display = 'none';
  }
}
