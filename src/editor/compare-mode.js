import { MergeView } from '@codemirror/merge';
import { EditorView } from '@codemirror/view';
import { createExtensions } from './extensions.js';

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
    const extensions = createExtensions({
      language: languageSupport,
      theme,
      fontSize,
      wordWrap: false, 
      tabSize: 4,
    });

    this.mergeView = new MergeView({
      a: {
        doc: originalContent,
        extensions: [
          ...extensions,
          EditorView.editable.of(false), // make 'original' read-only to force merging from left to right
        ]
      },
      b: {
        doc: modifiedContent,
        extensions: [
          ...extensions,
        ]
      },
      parent: wrapper,
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

      // Diff navigation buttons
      const btnPrev = this.container.querySelector('#btn-prev-diff');
      const btnNext = this.container.querySelector('#btn-next-diff');
      const btnClose = this.container.querySelector('#btn-close-compare');

      btnPrev.addEventListener('click', () => this.goToPrevDiff());
      btnNext.addEventListener('click', () => this.goToNextDiff());
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
