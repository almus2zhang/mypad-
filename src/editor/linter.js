/**
 * @module linter
 * @description A basic syntax linter for MyPad++ that uses CodeMirror's
 * Lezer syntax tree to identify syntax errors (like missing semicolons or
 * mismatched brackets).
 */

import { syntaxTree } from '@codemirror/language';
import { linter } from '@codemirror/lint';

/**
 * Creates a generic syntax linter based on the active language parser's syntax tree.
 * It iterates through the syntax tree and reports nodes marked as errors.
 */
export const syntaxErrorLinter = linter((view) => {
  const diagnostics = [];
  const tree = syntaxTree(view.state);

  tree.cursor().iterate(node => {
    if (node.type.isError) {
      // In Lezer, error nodes represent syntax errors
      diagnostics.push({
        from: node.from,
        to: node.to,
        severity: 'error',
        message: 'Syntax Error (unexpected token or incomplete statement)',
      });
    }
  });

  return diagnostics;
});
