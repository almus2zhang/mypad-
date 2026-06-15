import { StateField, StateEffect } from '@codemirror/state';
import { Decoration, EditorView } from '@codemirror/view';
import { lineNumbers } from '@codemirror/view';

export const toggleBookmark = StateEffect.define();

export const bookmarkField = StateField.define({
  create() {
    return [];
  },
  update(bookmarks, tr) {
    // Map lines to new positions
    let updatedBookmarks = bookmarks.map(line => {
      const pos = tr.state.doc.line(line) ? tr.state.doc.line(line).from : -1;
      if (pos === -1) return -1;
      const newLine = tr.state.doc.lineAt(tr.changes.mapPos(pos)).number;
      return newLine;
    }).filter(line => line !== -1);

    for (let e of tr.effects) {
      if (e.is(toggleBookmark)) {
        const line = e.value;
        if (updatedBookmarks.includes(line)) {
          updatedBookmarks = updatedBookmarks.filter(l => l !== line);
        } else {
          updatedBookmarks.push(line);
        }
      }
    }
    
    // Remove duplicates and sort
    return [...new Set(updatedBookmarks)].sort((a, b) => a - b);
  },
  provide: f => EditorView.decorations.from(f, bookmarks => {
    const builder = [];
    // We cannot easily map lines to ranges in `from`, so we use a dynamic decoration builder
    // but wait, `from` receives the field value. We must return a RangeSet.
    return Decoration.none; // We handle this below via a separate plugin or just mapping.
  })
});

// A separate decoration field to apply line classes based on bookmarkField
export const bookmarkDecorations = StateField.define({
  create(state) {
    return buildDecorations(state);
  },
  update(decorations, tr) {
    return buildDecorations(tr.state);
  },
  provide: f => EditorView.decorations.from(f)
});

const bookmarkLineMark = Decoration.line({ class: 'cm-bookmarked-line' });

function buildDecorations(state) {
  const bookmarks = state.field(bookmarkField, false) || [];
  const widgets = [];
  for (const lineNum of bookmarks) {
    if (lineNum <= state.doc.lines) {
      const line = state.doc.line(lineNum);
      widgets.push(bookmarkLineMark.range(line.from));
    }
  }
  return Decoration.set(widgets, true);
}

export function bookmarkedLineNumbers() {
  return [
    bookmarkField,
    bookmarkDecorations,
    lineNumbers({
      domEventHandlers: {
        dblclick(view, block, event) {
          const line = view.state.doc.lineAt(block.from).number;
          view.dispatch({
            effects: toggleBookmark.of(line)
          });
          return true; // prevent default text selection on dblclick
        }
      }
    })
  ];
}

export function getAllBookmarks(state) {
  const bookmarks = state.field(bookmarkField, false) || [];
  return bookmarks.map(lineNum => {
    if (lineNum <= state.doc.lines) {
      const line = state.doc.line(lineNum);
      return { line: lineNum, text: line.text.trim() || '(empty line)' };
    }
    return null;
  }).filter(Boolean);
}

export function getNextBookmark(state, currentLine) {
  const bookmarks = state.field(bookmarkField, false) || [];
  if (bookmarks.length === 0) return null;
  const next = bookmarks.find(line => line > currentLine);
  return next || bookmarks[0]; // Wrap around
}

export function getPrevBookmark(state, currentLine) {
  const bookmarks = state.field(bookmarkField, false) || [];
  if (bookmarks.length === 0) return null;
  const prev = [...bookmarks].reverse().find(line => line < currentLine);
  return prev || bookmarks[bookmarks.length - 1]; // Wrap around
}
