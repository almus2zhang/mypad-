/**
 * @module extensions
 * @description Assembles the base CodeMirror 6 extension stack for MyPad++.
 * Provides a single `createExtensions()` entry point that wires together
 * editor features: line numbers, history, code folding, bracket matching,
 * autocompletion, keymaps, and the document-change listener.
 *
 * NOTE: Theme, language, tabSize, wordWrap, and fontSize are NOT included
 * here — they are managed by EditorManager's Compartments for dynamic
 * reconfiguration.
 */

import {
  lineNumbers,
  highlightActiveLineGutter,
  highlightSpecialChars,
  drawSelection,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
  highlightActiveLine,
  keymap,
  EditorView,
} from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import {
  foldGutter,
  indentOnInput,
  syntaxHighlighting,
  defaultHighlightStyle,
  bracketMatching,
  foldKeymap,
} from '@codemirror/language';
import { history, historyKeymap } from '@codemirror/commands';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import {
  closeBrackets,
  autocompletion,
  closeBracketsKeymap,
  completionKeymap,
} from '@codemirror/autocomplete';
import { defaultKeymap, indentWithTab } from '@codemirror/commands';
import { lintGutter } from '@codemirror/lint';
import { syntaxErrorLinter } from './linter.js';

/**
 * @typedef {Object} ExtensionOptions
 * @property {((update: import('@codemirror/view').ViewUpdate) => void) | null} [onUpdate]
 *   Callback invoked on document or selection changes.
 */

/**
 * Create the base CodeMirror 6 extension stack.
 *
 * Does NOT include theme, language, tabSize, wordWrap, or fontSize —
 * those are handled by EditorManager's Compartments.
 *
 * @param {ExtensionOptions} [options={}]
 * @returns {import('@codemirror/state').Extension[]} Array of extensions
 */
export function createExtensions(options = {}) {
  const { onUpdate = null } = options;

  /** @type {import('@codemirror/state').Extension[]} */
  const extensions = [];

  /* ----- Core editing features ----- */
  extensions.push(
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    history(),
    foldGutter({
      openText: '▾',
      closedText: '▸',
    }),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    bracketMatching(),
    closeBrackets(),
    autocompletion(),
    rectangularSelection(),
    crosshairCursor(),
    highlightActiveLine(),
    highlightSelectionMatches({
      highlightWordAroundCursor: true,
      minSelectionLength: 2,
    }),
    lintGutter(),
    syntaxErrorLinter
  );

  /* ----- Keymaps ----- */
  extensions.push(
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...completionKeymap,
      indentWithTab,
    ])
  );

  /* ----- Update listener ----- */
  if (onUpdate) {
    extensions.push(
      EditorView.updateListener.of((update) => {
        if (update.docChanged || update.selectionSet) {
          onUpdate(update);
        }
      })
    );
  }

  return extensions;
}
