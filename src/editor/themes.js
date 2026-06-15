/**
 * @module themes
 * @description CodeMirror 6 themes for MyPad++.
 * Light theme inspired by Catppuccin Latte, dark theme inspired by Catppuccin Mocha.
 * Each theme consists of an EditorView.theme() for editor chrome and a
 * syntaxHighlighting() extension for syntax colors.
 */

import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

/* ------------------------------------------------------------------ */
/*  Color Palettes                                                     */
/* ------------------------------------------------------------------ */

/** @type {Record<string, string>} Catppuccin Latte–inspired light palette */
const light = {
  bg: '#ffffff',
  gutterBg: '#f8f9fb',
  fg: '#4c4f69',
  keyword: '#8839ef',
  string: '#40a02b',
  comment: '#9ca0b0',
  number: '#fe640b',
  function: '#1e66f5',
  type: '#df8e1d',
  selection: 'rgba(30, 102, 245, 0.15)',
  activeLine: '#f2f4f8',
  cursor: '#4c4f69',
  matchingBracket: 'rgba(30, 102, 245, 0.2)',
  lineNumber: '#8c8fa1',
  operator: '#04a5e5',
  variable: '#4c4f69',
  property: '#dc8a78',
  tag: '#d20f39',
  attribute: '#df8e1d',
  heading: '#1e66f5',
  link: '#1e66f5',
  invalid: '#d20f39',
};

/** @type {Record<string, string>} Catppuccin Mocha–inspired dark palette */
const dark = {
  bg: '#1e1e2e',
  gutterBg: '#181825',
  fg: '#cdd6f4',
  keyword: '#cba6f7',
  string: '#a6e3a1',
  comment: '#6c7086',
  number: '#fab387',
  function: '#89b4fa',
  type: '#f9e2af',
  selection: 'rgba(137, 180, 250, 0.3)',
  activeLine: '#28283d',
  cursor: '#f5e0dc',
  matchingBracket: 'rgba(137, 180, 250, 0.25)',
  lineNumber: '#6c7086',
  operator: '#89dceb',
  variable: '#cdd6f4',
  property: '#f5c2e7',
  tag: '#f38ba8',
  attribute: '#f9e2af',
  heading: '#89b4fa',
  link: '#89b4fa',
  invalid: '#f38ba8',
};

/* ------------------------------------------------------------------ */
/*  Editor Chrome Themes                                               */
/* ------------------------------------------------------------------ */

/**
 * Build an EditorView.theme() extension for the given palette.
 * @param {Record<string, string>} pal - Color palette
 * @param {boolean} isDark - Whether this is a dark theme
 * @returns {import('@codemirror/view').Extension}
 */
function buildEditorTheme(pal, isDark) {
  return EditorView.theme(
    {
      '&': {
        color: pal.fg,
        backgroundColor: pal.bg,
      },

      /* Content area */
      '.cm-content': {
        caretColor: pal.cursor,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      },

      /* Cursor */
      '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: pal.cursor,
        borderLeftWidth: '2px',
      },

      /* Selection */
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
        backgroundColor: pal.selection,
      },

      /* Active line */
      '.cm-activeLine': {
        backgroundColor: pal.activeLine,
      },

      /* Gutter */
      '.cm-gutters': {
        backgroundColor: pal.gutterBg,
        color: pal.lineNumber,
        border: 'none',
        borderRight: `1px solid ${isDark ? 'rgba(205, 214, 244, 0.06)' : 'rgba(76, 79, 105, 0.08)'}`,
      },
      '.cm-activeLineGutter': {
        backgroundColor: pal.activeLine,
        color: pal.fg,
      },
      '.cm-lineNumbers .cm-gutterElement': {
        padding: '0 12px 0 8px',
        minWidth: '3em',
      },

      /* Fold gutter */
      '.cm-foldGutter .cm-gutterElement': {
        padding: '0 4px',
        cursor: 'pointer',
        transition: 'color 0.15s ease',
      },
      '.cm-foldGutter .cm-gutterElement:hover': {
        color: pal.function,
      },

      /* Matching brackets */
      '&.cm-focused .cm-matchingBracket': {
        backgroundColor: pal.matchingBracket,
        outline: `1px solid ${isDark ? 'rgba(137, 180, 250, 0.4)' : 'rgba(30, 102, 245, 0.35)'}`,
        borderRadius: '2px',
      },
      '&.cm-focused .cm-nonmatchingBracket': {
        backgroundColor: isDark ? 'rgba(243, 139, 168, 0.25)' : 'rgba(210, 15, 57, 0.2)',
        outline: `1px solid ${isDark ? 'rgba(243, 139, 168, 0.4)' : 'rgba(210, 15, 57, 0.35)'}`,
        borderRadius: '2px',
      },

      /* Search match highlighting */
      '.cm-searchMatch': {
        backgroundColor: isDark ? 'rgba(249, 226, 175, 0.25)' : 'rgba(223, 142, 29, 0.2)',
        borderRadius: '2px',
      },
      '.cm-searchMatch.cm-searchMatch-selected': {
        backgroundColor: isDark ? 'rgba(250, 179, 135, 0.6)' : 'rgba(254, 100, 11, 0.4)',
        outline: `2px solid ${isDark ? '#fab387' : '#fe640b'}`,
      },

      /* Selection match highlighting */
      '.cm-selectionMatch': {
        backgroundColor: isDark ? 'rgba(137, 180, 250, 0.15)' : 'rgba(30, 102, 245, 0.1)',
        borderRadius: '2px',
      },

      /* Autocomplete */
      '.cm-tooltip': {
        backgroundColor: isDark ? '#313244' : '#ffffff',
        color: pal.fg,
        border: `1px solid ${isDark ? 'rgba(205, 214, 244, 0.1)' : 'rgba(76, 79, 105, 0.12)'}`,
        borderRadius: '8px',
        boxShadow: isDark
          ? '0 4px 16px rgba(0, 0, 0, 0.4)'
          : '0 4px 16px rgba(0, 0, 0, 0.1)',
      },
      '.cm-tooltip .cm-tooltip-arrow::before': {
        borderTopColor: isDark ? '#313244' : '#ffffff',
        borderBottomColor: isDark ? '#313244' : '#ffffff',
      },
      '.cm-tooltip-autocomplete': {
        '& > ul': {
          fontFamily: "'JetBrains Mono', monospace",
          maxHeight: '240px',
        },
        '& > ul > li': {
          padding: '4px 12px',
          borderRadius: '4px',
          margin: '1px 4px',
        },
        '& > ul > li[aria-selected]': {
          backgroundColor: isDark ? 'rgba(137, 180, 250, 0.2)' : 'rgba(30, 102, 245, 0.1)',
          color: pal.fg,
        },
      },

      /* Panels (search, etc.) */
      '.cm-panels': {
        backgroundColor: isDark ? '#181825' : '#f8f9fb',
        color: pal.fg,
        borderBottom: `1px solid ${isDark ? 'rgba(205, 214, 244, 0.06)' : 'rgba(76, 79, 105, 0.08)'}`,
      },
      '.cm-panel input, .cm-panel button': {
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '13px',
      },
      '.cm-panel input': {
        backgroundColor: isDark ? '#1e1e2e' : '#ffffff',
        color: pal.fg,
        border: `1px solid ${isDark ? 'rgba(205, 214, 244, 0.15)' : 'rgba(76, 79, 105, 0.15)'}`,
        borderRadius: '4px',
        padding: '4px 8px',
      },
      '.cm-panel button': {
        backgroundColor: isDark ? '#313244' : '#e6e9ef',
        color: pal.fg,
        border: 'none',
        borderRadius: '4px',
        padding: '4px 10px',
        cursor: 'pointer',
      },

      /* Fold placeholder */
      '.cm-foldPlaceholder': {
        backgroundColor: isDark ? 'rgba(137, 180, 250, 0.1)' : 'rgba(30, 102, 245, 0.08)',
        color: pal.function,
        border: `1px solid ${isDark ? 'rgba(137, 180, 250, 0.2)' : 'rgba(30, 102, 245, 0.15)'}`,
        borderRadius: '4px',
        padding: '0 6px',
        margin: '0 2px',
      },

      /* Scrollbar styling */
      '& .cm-scroller': {
        scrollbarWidth: 'thin',
        scrollbarColor: `${isDark ? 'rgba(205, 214, 244, 0.15)' : 'rgba(76, 79, 105, 0.15)'} transparent`,
      },
    },
    { dark: isDark }
  );
}

/* ------------------------------------------------------------------ */
/*  Syntax Highlight Styles                                            */
/* ------------------------------------------------------------------ */

/**
 * Build a HighlightStyle for the given palette.
 * @param {Record<string, string>} pal - Color palette
 * @returns {HighlightStyle}
 */
function buildHighlightStyle(pal) {
  return HighlightStyle.define([
    /* Keywords & control flow */
    { tag: tags.keyword, color: pal.keyword, fontWeight: '500' },
    { tag: tags.controlKeyword, color: pal.keyword, fontWeight: '500' },
    { tag: tags.operatorKeyword, color: pal.keyword },
    { tag: tags.definitionKeyword, color: pal.keyword },
    { tag: tags.moduleKeyword, color: pal.keyword },

    /* Operators & punctuation */
    { tag: tags.operator, color: pal.operator },
    { tag: tags.punctuation, color: pal.fg },
    { tag: tags.separator, color: pal.fg },
    { tag: tags.paren, color: pal.fg },
    { tag: tags.squareBracket, color: pal.fg },
    { tag: tags.brace, color: pal.fg },
    { tag: tags.derefOperator, color: pal.operator },

    /* Strings */
    { tag: tags.string, color: pal.string },
    { tag: tags.special(tags.string), color: pal.string },
    { tag: tags.docString, color: pal.string, fontStyle: 'italic' },
    { tag: tags.character, color: pal.string },
    { tag: tags.escape, color: pal.number },

    /* Comments */
    { tag: tags.comment, color: pal.comment, fontStyle: 'italic' },
    { tag: tags.lineComment, color: pal.comment, fontStyle: 'italic' },
    { tag: tags.blockComment, color: pal.comment, fontStyle: 'italic' },
    { tag: tags.docComment, color: pal.comment, fontStyle: 'italic' },

    /* Numbers & literals */
    { tag: tags.number, color: pal.number },
    { tag: tags.integer, color: pal.number },
    { tag: tags.float, color: pal.number },
    { tag: tags.bool, color: pal.number },
    { tag: tags.null, color: pal.number },
    { tag: tags.regexp, color: pal.number },

    /* Functions */
    { tag: tags.function(tags.variableName), color: pal.function },
    { tag: tags.function(tags.definition(tags.variableName)), color: pal.function, fontWeight: '500' },
    { tag: tags.function(tags.propertyName), color: pal.function },

    /* Types */
    { tag: tags.typeName, color: pal.type },
    { tag: tags.className, color: pal.type },
    { tag: tags.namespace, color: pal.type },
    { tag: tags.annotation, color: pal.type },

    /* Variables & properties */
    { tag: tags.variableName, color: pal.variable },
    { tag: tags.definition(tags.variableName), color: pal.variable },
    { tag: tags.propertyName, color: pal.property },
    { tag: tags.definition(tags.propertyName), color: pal.property },
    { tag: tags.special(tags.variableName), color: pal.keyword },
    { tag: tags.local(tags.variableName), color: pal.variable },
    { tag: tags.self, color: pal.keyword, fontStyle: 'italic' },

    /* HTML / XML */
    { tag: tags.tagName, color: pal.tag },
    { tag: tags.attributeName, color: pal.attribute },
    { tag: tags.attributeValue, color: pal.string },
    { tag: tags.angleBracket, color: pal.fg },
    { tag: tags.documentMeta, color: pal.comment },
    { tag: tags.processingInstruction, color: pal.comment },

    /* Markdown */
    { tag: tags.heading, color: pal.heading, fontWeight: 'bold' },
    { tag: tags.heading1, color: pal.heading, fontWeight: 'bold', fontSize: '1.3em' },
    { tag: tags.heading2, color: pal.heading, fontWeight: 'bold', fontSize: '1.2em' },
    { tag: tags.heading3, color: pal.heading, fontWeight: 'bold', fontSize: '1.1em' },
    { tag: tags.link, color: pal.link, textDecoration: 'underline' },
    { tag: tags.url, color: pal.link },
    { tag: tags.emphasis, fontStyle: 'italic' },
    { tag: tags.strong, fontWeight: 'bold' },
    { tag: tags.strikethrough, textDecoration: 'line-through' },
    { tag: tags.quote, color: pal.comment, fontStyle: 'italic' },
    { tag: tags.monospace, color: pal.string },
    { tag: tags.list, color: pal.fg },

    /* Misc */
    { tag: tags.meta, color: pal.comment },
    { tag: tags.labelName, color: pal.function },
    { tag: tags.atom, color: pal.number },
    { tag: tags.unit, color: pal.number },
    { tag: tags.invalid, color: pal.invalid, textDecoration: 'underline wavy' },
  ]);
}

/* ------------------------------------------------------------------ */
/*  Exported Themes                                                    */
/* ------------------------------------------------------------------ */

/**
 * Light theme extension (Catppuccin Latte–inspired).
 * Combines editor chrome theme and syntax highlighting.
 * @type {import('@codemirror/view').Extension}
 */
export const lightTheme = [
  buildEditorTheme(light, false),
  syntaxHighlighting(buildHighlightStyle(light)),
];

/**
 * Dark theme extension (Catppuccin Mocha–inspired).
 * Combines editor chrome theme and syntax highlighting.
 * @type {import('@codemirror/view').Extension}
 */
export const darkTheme = [
  buildEditorTheme(dark, true),
  syntaxHighlighting(buildHighlightStyle(dark)),
];

/**
 * Get a theme extension by name.
 * @param {'light' | 'dark'} name - Theme name
 * @returns {import('@codemirror/view').Extension} The theme extension array
 * @throws {Error} If the theme name is not recognized
 */
export function getTheme(name) {
  switch (name) {
    case 'light':
      return lightTheme;
    case 'dark':
      return darkTheme;
    default:
      throw new Error(`Unknown theme: "${name}". Expected "light" or "dark".`);
  }
}
