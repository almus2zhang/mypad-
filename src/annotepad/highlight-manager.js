/**
 * Highlight Manager
 * Handles only custom highlighting via CodeMirror plugins.
 */

import { Compartment, StateEffect } from '@codemirror/state';
import { EditorView, Decoration, ViewPlugin, MatchDecorator } from '@codemirror/view';
import { createHighlightPanel } from './highlight-ui.js';

export class HighlightManager {
  constructor(editorManager) {
    this.editorManager = editorManager;
    this.highlightRules = [];
    this.ui = createHighlightPanel(this);
    this.hlCompartment = new Compartment();
    this.hlCompartmentInjected = false;
  }

  get element() {
    return this.ui.element;
  }

  toggle() {
    // Inject compartment for custom highlights if not already
    if (this.editorManager.view && !this.hlCompartmentInjected) {
      this.hlCompartmentInjected = true;
      this.editorManager.view.dispatch({
        effects: StateEffect.appendConfig.of(this.hlCompartment.of([]))
      });
    }

    this.ui.show();
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
      const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapeRegExp(rule.pattern), 'g');
      
      const mark = Decoration.mark({
        attributes: { style: `background-color: ${rule.color}; color: #000; border-radius: 2px;` }
      });
      
      return new MatchDecorator({
        regexp: regex,
        decoration: mark
      });
    });

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
}
