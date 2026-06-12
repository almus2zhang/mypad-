/**
 * AnNotePad Manager
 * Bridges the AnNotePad UI with EditorManager and CodeMirror 6.
 */

import { Compartment } from '@codemirror/state';
import { EditorView, Decoration, ViewPlugin, MatchDecorator } from '@codemirror/view';
import { SearchCursor, RegExpCursor } from '@codemirror/search';
import { createAnnotepadPanel } from './annotepad-ui.js';

export class AnnotepadManager {
  constructor(editorManager) {
    this.editorManager = editorManager;
    this.isActive = false;
    this.highlightRules = [];
    this.ui = createAnnotepadPanel(this);
    this.hlCompartment = new Compartment();
  }

  get element() {
    return this.ui.element;
  }

  activate() {
    if (this.isActive) return;
    this.isActive = true;
    
    // Disable syntax highlighting
    this.editorManager.setSyntaxHighlightingEnabled(false);
    
    // Inject compartment for custom highlights if not already
    if (this.editorManager.view) {
      this.editorManager.view.dispatch({
        effects: this.editorManager.view.state.update({
          effects: window.annotepadHlCompartmentInit ? [] : []
        }) // wait, we can append it directly to baseExtensions in main.js, or reconfigure via a stored extension.
      });
    }

    this.ui.show();
    this.setLayout('horizontal');
  }

  deactivate() {
    if (!this.isActive) return;
    this.isActive = false;
    
    // Re-enable syntax highlighting
    this.editorManager.setSyntaxHighlightingEnabled(true);
    
    // Clear highlights
    if (this.editorManager.view) {
      this.editorManager.view.dispatch({
        effects: this.hlCompartment.reconfigure([])
      });
    }

    this.ui.hide();
    
    // Reset layout
    const container = document.getElementById('workspace');
    if (container) container.classList.remove('annotepad-horizontal', 'annotepad-vertical');
  }

  toggle() {
    if (this.isActive) this.deactivate();
    else this.activate();
  }

  setLayout(layout) {
    const container = document.getElementById('workspace');
    if (!container) return;
    container.classList.remove('annotepad-horizontal', 'annotepad-vertical');
    container.classList.add(`annotepad-${layout}`);
  }

  getHighlightRules() {
    return this.highlightRules;
  }

  addHighlightRule(rule) {
    this.highlightRules.push(rule);
    this._applyHighlights();
  }

  updateHighlightRule(idx, rule) {
    this.highlightRules[idx] = rule;
    this._applyHighlights();
  }

  removeHighlightRule(idx) {
    this.highlightRules.splice(idx, 1);
    this._applyHighlights();
  }

  _applyHighlights() {
    if (!this.editorManager.view) return;
    
    const validRules = this.highlightRules.filter(r => r.pattern);
    
    if (validRules.length === 0) {
      this.editorManager.view.dispatch({
        effects: this.hlCompartment.reconfigure([])
      });
      return;
    }

    const decorators = validRules.map(rule => {
      // Basic escape if not treating as regex (AnNotePad treated it as literal, but let's just use regexp)
      // Actually AnNotePad used new RegExp(escapeRegExp(rule.pattern), 'g'). Let's do the same literal match.
      const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapeRegExp(rule.pattern), 'g');
      
      const mark = Decoration.mark({
        attributes: { style: `color: ${rule.color}; background: rgba(255,255,255,0.1); border-radius: 2px;` }
      });
      
      return new MatchDecorator({
        regexp: regex,
        decoration: mark
      });
    });

    const plugin = ViewPlugin.define(view => ({
      decorations: decorators.reduce((decs, d) => decs.update({add: d.createDeco(view)}), Decoration.none),
      update(u) {
        if (u.docChanged || u.viewportChanged) {
          this.decorations = decorators.reduce((decs, d) => {
            // MatchDecorator doesn't have an easy combine, we'll build a custom plugin per rule or just iterate.
            // Wait, MatchDecorator is easier used as a plugin.
          }, Decoration.none);
        }
      }
    }));
    
    // Better way using multiple ViewPlugins
    const plugins = decorators.map(decorator => 
      ViewPlugin.define(
        view => ({
          decorations: decorator.createDeco(view),
          update(u) {
            if (u.docChanged || u.viewportChanged) {
              this.decorations = decorator.updateDeco(u, this.decorations);
            }
          }
        }),
        { decorations: v => v.decorations }
      )
    );

    this.editorManager.view.dispatch({
      effects: this.hlCompartment.reconfigure(plugins)
    });
  }

  performSearch(query, opts) {
    if (!this.editorManager.view) return;
    const doc = this.editorManager.view.state.doc;
    
    this.ui.setStatus('Searching...');
    
    // Delay slightly to allow UI to render status
    setTimeout(() => {
      const results = [];
      let CursorClass = SearchCursor;
      let args = [doc, query, 0, doc.length];
      
      if (opts.isRegex) {
        CursorClass = RegExpCursor;
        args = [doc, query, {}, 0, doc.length];
      } else {
        // normal search options
        // code mirror SearchCursor normalizer (if ignoring case)
        // for simplicity, we'll use regex for case insensitivity if needed
        if (!opts.caseSensitive || opts.wholeWord) {
          CursorClass = RegExpCursor;
          const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          let rxStr = escapeRegExp(query);
          if (opts.wholeWord) rxStr = `\\b${rxStr}\\b`;
          const flags = opts.caseSensitive ? '' : 'i';
          args = [doc, rxStr, {ignoreCase: !opts.caseSensitive}, 0, doc.length];
        }
      }

      try {
        const cursor = new CursorClass(...args);
        while (!cursor.next().done) {
          const { from, to } = cursor.value;
          const line = doc.lineAt(from);
          results.push({
            lineNum: line.number,
            col: from - line.from,
            matchLen: to - from,
            text: line.text
          });
          if (results.length > 2000) break; // Limit for performance
        }
        
        let status = `Found ${results.length} results.`;
        if (results.length > 2000) status += ' (Truncated)';
        this.ui.setStatus(status);
        this.ui.renderResults(results);
      } catch (e) {
        this.ui.setStatus(`Error: ${e.message}`);
      }
    }, 10);
  }

  goToLine(lineNum, col = 0) {
    if (!this.editorManager.view) return;
    const doc = this.editorManager.view.state.doc;
    const line = doc.line(lineNum);
    const pos = line.from + col;
    
    this.editorManager.view.dispatch({
      selection: { anchor: pos, head: pos + (this.editorManager.view.state.doc.length > pos ? 1 : 0) },
      effects: EditorView.scrollIntoView(pos, {y: 'center'})
    });
  }
}
