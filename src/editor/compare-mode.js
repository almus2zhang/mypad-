import { MergeView } from '@codemirror/merge';
import { EditorView } from '@codemirror/view';
import { createExtensions } from './extensions.js';

/**
 * Manages the side-by-side Code Comparison (Diff) view using @codemirror/merge.
 */
export class CompareManager {
  /**
   * @param {HTMLElement} containerElement - The DOM element that will host the merge view
   */
  constructor(containerElement) {
    this.container = containerElement;
    this.mergeView = null;
    this.isActive = false;
  }

  /**
   * Start compare mode
   * @param {string} originalContent - The left editor (usually original/base)
   * @param {string} modifiedContent - The right editor (usually modified)
   * @param {import('@codemirror/language').LanguageSupport|null} languageSupport 
   * @param {string} theme - 'light' or 'dark'
   * @param {number} fontSize 
   */
  startCompare(originalContent, modifiedContent, languageSupport, theme, fontSize) {
    this.isActive = true;
    this.container.innerHTML = '';
    this.container.style.display = 'flex'; 
    this.container.style.flexDirection = 'column';
    this.container.style.flex = '1';
    this.container.style.minHeight = '0';
    this.container.style.minWidth = '0';
    this.container.style.overflow = 'hidden';

    this.container.innerHTML = `
      <div class="compare-header" style="display: flex; justify-content: flex-end; padding: 4px 8px; background: var(--toolbar-bg); border-bottom: 1px solid var(--toolbar-border);">
        <label style="font-size: 13px; display: flex; align-items: center; gap: 6px; color: var(--text-secondary); cursor: pointer;">
          <input type="checkbox" id="sync-scroll-cb" checked> Sync Scroll
        </label>
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
