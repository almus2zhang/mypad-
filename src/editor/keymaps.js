/**
 * @module keymaps
 * @description Custom keyboard shortcuts for MyPad++.
 * Maps common editor operations to application-provided callbacks.
 */

import { keymap } from '@codemirror/view';

/**
 * @typedef {Object} KeymapCallbacks
 * @property {() => void} [onSave]           - Save current file (Ctrl-S / Cmd-S)
 * @property {() => void} [onSaveAs]         - Save as (Ctrl-Shift-S / Cmd-Shift-S)
 * @property {() => void} [onOpen]           - Open file (Ctrl-O / Cmd-O)
 * @property {() => void} [onNewTab]         - New tab (Ctrl-N / Cmd-N)
 * @property {() => void} [onCloseTab]       - Close tab (Ctrl-W / Cmd-W)
 * @property {() => void} [onNextTab]        - Next tab (Ctrl-Tab)
 * @property {() => void} [onPrevTab]        - Previous tab (Ctrl-Shift-Tab)
 * @property {() => void} [onFind]           - Open find panel (Ctrl-F / Cmd-F)
 * @property {() => void} [onReplace]        - Open replace panel (Ctrl-H / Cmd-H)
 * @property {() => void} [onGoToLine]       - Go to line (Ctrl-G / Cmd-G)
 * @property {() => void} [onZoomIn]         - Zoom in (Ctrl-= / Cmd-=)
 * @property {() => void} [onZoomOut]        - Zoom out (Ctrl-- / Cmd--)
 * @property {() => void} [onZoomReset]      - Reset zoom (Ctrl-0 / Cmd-0)
 * @property {() => void} [onToggleWordWrap] - Toggle word wrap (Alt-Z)
 * @property {() => void} [onToggleTheme]    - Toggle light/dark theme (Ctrl-Shift-T)
 */

/**
 * Wrap a callback into a CodeMirror key command handler.
 * Prevents the default browser action and returns true to signal that
 * the key was handled.
 *
 * @param {(() => void) | undefined} callback
 * @returns {(view: import('@codemirror/view').EditorView) => boolean}
 */
function handler(callback) {
  return () => {
    if (callback) {
      callback();
      return true;
    }
    return false;
  };
}

/**
 * Create a keymap extension with custom application shortcuts.
 *
 * Each callback in the `callbacks` object is optional — if a callback is
 * not provided, the corresponding keybinding is still registered but will
 * fall through to the next handler (allowing default behavior).
 *
 * @param {KeymapCallbacks} callbacks - Object with named handler functions
 * @returns {import('@codemirror/view').Extension} A keymap extension
 */
export function createCustomKeymap(callbacks = {}) {
  const bindings = [
    /* File operations */
    {
      key: 'Mod-s',
      run: handler(callbacks.onSave),
      preventDefault: true,
    },
    {
      key: 'Mod-Shift-s',
      run: handler(callbacks.onSaveAs),
      preventDefault: true,
    },
    {
      key: 'Mod-o',
      run: handler(callbacks.onOpen),
      preventDefault: true,
    },

    /* Tab management */
    {
      key: 'Mod-n',
      run: handler(callbacks.onNewTab),
      preventDefault: true,
    },
    {
      key: 'Mod-w',
      run: handler(callbacks.onCloseTab),
      preventDefault: true,
    },
    {
      key: 'Ctrl-Tab',
      run: handler(callbacks.onNextTab),
      preventDefault: true,
    },
    {
      key: 'Ctrl-Shift-Tab',
      run: handler(callbacks.onPrevTab),
      preventDefault: true,
    },

    /* Search & navigation */
    {
      key: 'Mod-f',
      run: handler(callbacks.onFind),
      preventDefault: true,
    },
    {
      key: 'Mod-h',
      run: handler(callbacks.onReplace),
      preventDefault: true,
    },
    {
      key: 'Mod-g',
      run: handler(callbacks.onGoToLine),
      preventDefault: true,
    },

    /* Zoom */
    {
      key: 'Mod-=',
      run: handler(callbacks.onZoomIn),
      preventDefault: true,
    },
    {
      key: 'Mod-+',
      run: handler(callbacks.onZoomIn),
      preventDefault: true,
    },
    {
      key: 'Mod--',
      run: handler(callbacks.onZoomOut),
      preventDefault: true,
    },
    {
      key: 'Mod-0',
      run: handler(callbacks.onZoomReset),
      preventDefault: true,
    },

    /* Toggles */
    {
      key: 'Alt-z',
      run: handler(callbacks.onToggleWordWrap),
      preventDefault: true,
    },
    {
      key: 'Mod-Shift-t',
      run: handler(callbacks.onToggleTheme),
      preventDefault: true,
    },
  ];

  return keymap.of(bindings);
}
