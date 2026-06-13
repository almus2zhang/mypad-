/**
 * @module editor-manager
 * @description Manages a CodeMirror 6 EditorView with Compartment-based
 * dynamic reconfiguration. Provides a clean public API for creating and
 * destroying views, reading and writing content, and changing editor settings
 * (theme, language, word wrap, tab size, font size) at runtime without
 * rebuilding the entire extension stack.
 */

import { EditorView } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { getTheme } from './themes.js';

/* ------------------------------------------------------------------ */
/*  EditorManager                                                      */
/* ------------------------------------------------------------------ */

/**
 * High-level manager for a single CodeMirror 6 editor instance.
 *
 * Uses {@link Compartment}s so that theme, language, word wrap, tab size,
 * and font size can be swapped at runtime without recreating the view.
 *
 * @example
 * ```js
 * const mgr = new EditorManager(document.getElementById('editor'));
 * mgr.createView('Hello, world!', createExtensions({ theme: 'light' }));
 * mgr.setTheme('dark');
 * mgr.setFontSize(16);
 * ```
 */
export class EditorManager {
  /**
   * @param {HTMLElement} containerElement - The DOM element that will host the editor
   */
  constructor(containerElement) {
    /** @type {HTMLElement} */
    this.container = containerElement;

    /** @type {EditorView | null} */
    this.view = null;

    /* ---- Compartments for dynamic reconfiguration ---- */

    /** @type {Compartment} */
    this.themeCompartment = new Compartment();

    /** @type {Compartment} */
    this.languageCompartment = new Compartment();

    /** @type {Compartment} */
    this.wordWrapCompartment = new Compartment();

    /** @type {Compartment} */
    this.tabSizeCompartment = new Compartment();

    /** @type {Compartment} */
    this.fontSizeCompartment = new Compartment();

    /** @type {Compartment} */
    this.keyboardCompartment = new Compartment();

    /* ---- Current settings (for bookkeeping) ---- */

    /** @type {'light' | 'dark'} */
    this._currentTheme = 'light';

    /** @type {number} */
    this._currentFontSize = 14;

    /** @type {number} */
    this._currentTabSize = 4;

    /** @type {boolean} */
    this._currentWordWrap = false;
  }

  /* ================================================================ */
  /*  View lifecycle                                                   */
  /* ================================================================ */

  /**
   * Create a new EditorView inside the container.
   *
   * If a view already exists it will be destroyed first. The supplied
   * `extensions` array is augmented with compartment-wrapped extensions for
   * theme, language, word wrap, tab size, and font size so that each of
   * those dimensions can be reconfigured independently later.
   *
   * @param {string} [doc=''] - Initial document text
   * @param {import('@codemirror/state').Extension[]} [extensions=[]]
   *   Base extensions (from {@link createExtensions}). Compartment-managed
   *   extensions (theme, language, etc.) should NOT be included here — they
   *   are added automatically.
   * @param {Object} [options={}]
   * @param {'light' | 'dark'} [options.theme='light']
   * @param {import('@codemirror/language').LanguageSupport | null} [options.language=null]
   * @param {boolean} [options.wordWrap=false]
   * @param {number} [options.tabSize=4]
   * @param {number} [options.fontSize=14]
   * @returns {EditorView} The created view
   */
  createView(doc = '', extensions = [], options = {}) {
    this.destroyView();

    // Clear any existing content (e.g., empty state placeholder)
    this.container.innerHTML = '';

    const {
      theme = 'light',
      language = null,
      wordWrap = false,
      tabSize = 4,
      fontSize = 14,
    } = options;

    this._currentTheme = theme;
    this._currentFontSize = fontSize;
    this._currentTabSize = tabSize;
    this._currentWordWrap = wordWrap;
    this._currentLanguage = language;
    if (this._syntaxHighlightingEnabled === undefined) {
      this._syntaxHighlightingEnabled = true;
    }

    /* Build compartment-managed extensions */
    const compartmentExtensions = [
      this.themeCompartment.of(getTheme(theme)),
      this.languageCompartment.of((this._syntaxHighlightingEnabled && language) ? language : []),
      this.wordWrapCompartment.of(wordWrap ? EditorView.lineWrapping : []),
      this.tabSizeCompartment.of(EditorState.tabSize.of(tabSize)),
      this.fontSizeCompartment.of(this._buildFontSizeExtension(fontSize)),
      this.keyboardCompartment.of([]),
    ];

    const state = EditorState.create({
      doc,
      extensions: [...extensions, ...compartmentExtensions],
    });

    this.view = new EditorView({
      state,
      parent: this.container,
    });

    return this.view;
  }

  /**
   * Destroy the current view and remove it from the DOM.
   */
  destroyView() {
    if (this.view) {
      this.view.destroy();
      this.view = null;
    }
  }

  /* ================================================================ */
  /*  Content                                                          */
  /* ================================================================ */

  /**
   * Get the full document text.
   * @returns {string}
   */
  getContent() {
    this._assertView();
    return this.view.state.doc.toString();
  }

  /**
   * Replace the entire document content.
   * @param {string} text - New document text
   */
  setContent(text) {
    this._assertView();
    this.view.dispatch({
      changes: {
        from: 0,
        to: this.view.state.doc.length,
        insert: text,
      },
    });
  }

  /* ================================================================ */
  /*  State serialisation                                              */
  /* ================================================================ */

  /**
   * Get the current EditorState (useful for persisting scroll position,
   * cursor, selection, undo history, etc.).
   * @returns {import('@codemirror/state').EditorState}
   */
  getState() {
    this._assertView();
    return this.view.state;
  }

  /**
   * Restore a previously saved EditorState.
   * @param {import('@codemirror/state').EditorState} state
   */
  setState(state) {
    this._assertView();
    this.view.setState(state);
  }

  /* ================================================================ */
  /*  Focus                                                            */
  /* ================================================================ */

  /**
   * Move keyboard focus to the editor.
   */
  focus() {
    if (this.view) {
      this.view.focus();
    }
  }

  /* ================================================================ */
  /*  Cursor & selection                                               */
  /* ================================================================ */

  /**
   * Get the primary cursor position as a 1-based line and column.
   * @returns {{ line: number, col: number }}
   */
  getCursorPosition() {
    this._assertView();
    const pos = this.view.state.selection.main.head;
    const line = this.view.state.doc.lineAt(pos);
    return {
      line: line.number,
      col: pos - line.from + 1,
    };
  }

  /**
   * Get the currently selected text (from the primary selection).
   * @returns {string}
   */
  getSelectionText() {
    this._assertView();
    const { from, to } = this.view.state.selection.main;
    return this.view.state.sliceDoc(from, to);
  }

  /**
   * Replace the primary selection with the given text.
   * @param {string} text - Replacement text
   */
  replaceSelection(text) {
    this._assertView();
    this.view.dispatch(this.view.state.replaceSelection(text));
  }

  /* ================================================================ */
  /*  Dynamic reconfiguration                                          */
  /* ================================================================ */

  /**
   * Change the editor font size at runtime.
   * @param {number} px - Font size in pixels
   */
  setFontSize(px) {
    this._assertView();
    this._currentFontSize = px;
    this.view.dispatch({
      effects: this.fontSizeCompartment.reconfigure(
        this._buildFontSizeExtension(px)
      ),
    });
  }

  /**
   * Switch the editor theme at runtime.
   * @param {'light' | 'dark'} themeName
   */
  setTheme(themeName) {
    this._assertView();
    this._currentTheme = themeName;
    this.view.dispatch({
      effects: this.themeCompartment.reconfigure(getTheme(themeName)),
    });
  }

  /**
   * Switch the language mode at runtime.
   * @param {import('@codemirror/language').LanguageSupport | null} langSupport
   */
  setLanguage(langSupport) {
    this._assertView();
    this._currentLanguage = langSupport;
    if (this._syntaxHighlightingEnabled !== false) {
      this.view.dispatch({
        effects: this.languageCompartment.reconfigure(
          langSupport ? langSupport : []
        ),
      });
    }
  }

  /**
   * Temporarily disable or re-enable syntax parsing for the current language.
   * @param {boolean} enabled 
   */
  setSyntaxHighlightingEnabled(enabled) {
    this._assertView();
    this._syntaxHighlightingEnabled = enabled;
    this.view.dispatch({
      effects: this.languageCompartment.reconfigure(
        (enabled && this._currentLanguage) ? this._currentLanguage : []
      ),
    });
  }

  /**
   * Toggle line wrapping at runtime.
   * @param {boolean} enabled
   */
  setWordWrap(enabled) {
    this._assertView();
    this._currentWordWrap = enabled;
    this.view.dispatch({
      effects: this.wordWrapCompartment.reconfigure(
        enabled ? EditorView.lineWrapping : []
      ),
    });
  }

  /**
   * Change the tab size at runtime.
   * @param {number} size
   */
  setTabSize(size) {
    this._assertView();
    this._currentTabSize = size;
    this.view.dispatch({
      effects: this.tabSizeCompartment.reconfigure(
        EditorState.tabSize.of(size)
      ),
    });
  }

  /**
   * Toggle virtual keyboard pop-up on touch devices.
   * By setting inputmode="none", the virtual keyboard will not pop up, but the editor remains selectable.
   * @param {boolean} enabled 
   */
  setKeyboardEnabled(enabled) {
    this._assertView();
    this.view.dispatch({
      effects: this.keyboardCompartment.reconfigure(
        enabled ? [] : EditorView.contentAttributes.of({ inputmode: 'none' })
      )
    });
  }

  /**
   * Apply an arbitrary reconfiguration to the editor.
   * This is a lower-level escape hatch when the convenience methods above
   * don't cover the use case.
   *
   * @param {import('@codemirror/state').Extension[]} extensions
   *   New set of extensions to use. Note: this replaces ALL non-compartment
   *   extensions; prefer the specific setters above when possible.
   */
  reconfigure(extensions) {
    this._assertView();
    this.view.dispatch({
      effects: EditorState.reconfigure.of(extensions),
    });
  }

  /* ================================================================ */
  /*  Getters for current settings                                     */
  /* ================================================================ */

  /** @returns {'light' | 'dark'} */
  get currentTheme() {
    return this._currentTheme;
  }

  /** @returns {number} */
  get currentFontSize() {
    return this._currentFontSize;
  }

  /** @returns {number} */
  get currentTabSize() {
    return this._currentTabSize;
  }

  /** @returns {boolean} */
  get currentWordWrap() {
    return this._currentWordWrap;
  }

  /** @returns {boolean} */
  get hasView() {
    return this.view !== null;
  }

  /* ================================================================ */
  /*  Private helpers                                                  */
  /* ================================================================ */

  /**
   * Build a theme extension that sets the font size.
   * @param {number} px - Font size in pixels
   * @returns {import('@codemirror/view').Extension}
   * @private
   */
  _buildFontSizeExtension(px) {
    return EditorView.theme({
      '.cm-content': {
        fontSize: `${px}px`,
        lineHeight: '1.6',
      },
      '.cm-gutters': {
        fontSize: `${px}px`,
        lineHeight: '1.6',
      },
    });
  }

  /**
   * Assert that a view exists, throwing a helpful error if not.
   * @throws {Error} If no view is active
   * @private
   */
  _assertView() {
    if (!this.view) {
      throw new Error(
        'EditorManager: No active EditorView. Call createView() first.'
      );
    }
  }
}
