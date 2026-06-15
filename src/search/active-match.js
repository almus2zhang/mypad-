import { StateEffect, StateField } from '@codemirror/state';
import { Decoration, EditorView } from '@codemirror/view';

export const setActiveMatchEffect = StateEffect.define();

const activeMatchMark = Decoration.mark({ class: 'cm-activeSearchMatch' });

export const activeMatchField = StateField.define({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    decorations = decorations.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(setActiveMatchEffect)) {
        const { from, to } = e.value;
        if (from === null || to === null) {
          decorations = Decoration.none;
        } else {
          decorations = Decoration.set([activeMatchMark.range(from, to)]);
        }
      }
    }
    return decorations;
  },
  provide: f => EditorView.decorations.from(f)
});
